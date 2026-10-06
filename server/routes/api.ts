import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { CONFIG } from '../config.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { inspectUrl, detectPlatform } from '../services/ytdlp.js';
import { queueManager } from '../services/queue.js';
import { DownloadRequest, InspectRequest } from '../types.js';

export const apiRouter = Router();

// Apply rate limiting to inspect and download routes
apiRouter.use(['/inspect', '/download'], rateLimiter);

/**
 * URL Stream Inspector
 * Queries yt-dlp in non-download mode (--dump-single-json)
 */
apiRouter.post('/inspect', async (req: Request<{}, {}, InspectRequest>, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'A valid video URL is required.' });
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'URL must start with http:// or https://' });
    }

    const metadata = await inspectUrl(trimmedUrl);
    return res.json({ success: true, data: metadata });
  } catch (err: any) {
    const status = err.category === 'DURATION_EXCEEDED' ? 400 : 422;
    return res.status(status).json({
      error: err.message || 'Failed to inspect stream.',
      category: err.category || 'EXTRACTION_ERROR'
    });
  }
});

/**
 * Start Asynchronous HD Download Job
 */
apiRouter.post('/download', async (req: Request<{}, {}, DownloadRequest>, res: Response) => {
  try {
    const { url, formatId, isAudioOnly, metadata: clientMeta } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'A valid video URL is required.' });
    }

    const trimmedUrl = url.trim();

    // Use client metadata if available, otherwise inspect
    const metadata = (clientMeta && clientMeta.title && Array.isArray(clientMeta.formats))
      ? (clientMeta as VideoMetadata)
      : await inspectUrl(trimmedUrl);

    // Create job in asynchronous queue
    const job = queueManager.createJob(metadata, {
      url: trimmedUrl,
      formatId,
      isAudioOnly,
      metadata
    });

    return res.status(202).json({
      success: true,
      message: 'Download job queued successfully.',
      jobId: job.id,
      job
    });
  } catch (err: any) {
    return res.status(422).json({
      error: err.message || 'Failed to initialize download job.',
      category: err.category || 'EXTRACTION_ERROR'
    });
  }
});

/**
 * Get Job Status (Polling fallback)
 */
apiRouter.get('/status/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const job = queueManager.getJob(id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found or expired.' });
  }

  return res.json({ success: true, job });
});

/**
 * Server-Sent Events (SSE) Real-time Progress Stream
 */
apiRouter.get('/status/:id/events', (req: Request, res: Response) => {
  const { id } = req.params;
  const job = queueManager.getJob(id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const unsubscribe = queueManager.subscribeSSE(id, res);

  req.on('close', () => {
    unsubscribe();
  });
});

/**
 * Direct Browser Download Delivery
 * Delivers with Content-Disposition, proper MIME types, and Range support
 */
apiRouter.get('/file/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const job = queueManager.getJob(id);

  let filePath = job?.outputPath;
  let outputFilename = job?.outputFilename || '';
  let title = job?.title || 'media';
  let ext = (job?.outputExt || '').toLowerCase();

  // If not found in memory, search scratch disk for matching file
  if (!filePath || !fs.existsSync(filePath)) {
    try {
      if (fs.existsSync(CONFIG.SCRATCH_DIR)) {
        const files = fs.readdirSync(CONFIG.SCRATCH_DIR);
        const matched = files.find(f => f.startsWith(`${id}_`) || f.startsWith(`${id}.`));
        if (matched) {
          filePath = path.join(CONFIG.SCRATCH_DIR, matched);
          outputFilename = matched.replace(new RegExp(`^${id}[_.]`), '');
          ext = path.extname(matched).replace('.', '').toLowerCase();
        }
      }
    } catch {
      // ignore
    }
  }

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found or has been purged from scratch disk.' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (!ext) {
    ext = path.extname(filePath).replace('.', '').toLowerCase();
  }

  // Determine MIME type
  let contentType = 'application/octet-stream';
  if (ext === 'mp4') contentType = 'video/mp4';
  else if (ext === 'webm') contentType = 'video/webm';
  else if (ext === 'mp3') contentType = 'audio/mpeg';
  else if (ext === 'm4a') contentType = 'audio/mp4';

  const cleanFilename = (outputFilename || `${title}.${ext || 'mp4'}`).replace(/["\r\n]/g, '').trim();
  // Safe ASCII-only fallback strictly conforming to HTTP header RFC specifications (prevents Node.js ERR_INVALID_CHAR)
  const safeAsciiFilename = cleanFilename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '').trim() || `media.${ext || 'mp4'}`;
  const encodedFilename = encodeURIComponent(cleanFilename);

  // Support Range Requests for browser player streaming
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedFilename}`,
    });
    fileStream.pipe(res);
  } else {
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedFilename}`);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
});

/**
 * Cancel or Delete Job
 */
apiRouter.delete('/jobs/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const success = queueManager.cancelJob(id);
  if (!success) {
    return res.status(404).json({ error: 'Job not found.' });
  }
  return res.json({ success: true, message: 'Job cancelled successfully.' });
});

/**
 * Get all current jobs
 */
apiRouter.get('/jobs', (_req: Request, res: Response) => {
  const jobs = queueManager.getAllJobs();
  return res.json({ success: true, jobs });
});

/**
 * System Operational Health & Engine Diagnostics
 */
apiRouter.get('/health', (_req: Request, res: Response) => {
  let ytDlpVersion = 'unknown';
  let ffmpegVersion = 'unknown';

  try {
    ytDlpVersion = execSync(`${CONFIG.YT_DLP_PATH} --version`).toString().trim();
  } catch (e: any) {
    ytDlpVersion = `Error: ${e.message}`;
  }

  try {
    const ffmpegOut = execSync(`${CONFIG.FFMPEG_PATH} -version`).toString();
    ffmpegVersion = ffmpegOut.split('\n')[0] || 'installed';
  } catch (e: any) {
    ffmpegVersion = `Error: ${e.message}`;
  }

  let scratchFileCount = 0;
  let scratchSizeBytes = 0;

  try {
    if (fs.existsSync(CONFIG.SCRATCH_DIR)) {
      const files = fs.readdirSync(CONFIG.SCRATCH_DIR);
      scratchFileCount = files.length;
      for (const file of files) {
        const stats = fs.statSync(path.join(CONFIG.SCRATCH_DIR, file));
        scratchSizeBytes += stats.size;
      }
    }
  } catch {
    // ignore
  }

  return res.json({
    status: 'healthy',
    engine: {
      ytDlpVersion,
      ffmpegVersion,
    },
    safeguards: {
      maxFileSizeMb: CONFIG.MAX_FILE_SIZE_MB,
      maxDurationMinutes: CONFIG.MAX_DURATION_SECONDS / 60,
      retentionMinutes: CONFIG.RETENTION_MS / (60 * 1000),
      rateLimitWindowSeconds: CONFIG.RATE_LIMIT_WINDOW_MS / 1000,
      maxRequestsPerWindow: CONFIG.RATE_LIMIT_MAX_REQUESTS,
      cookiesConfigured: Boolean(CONFIG.COOKIES_FILE && fs.existsSync(CONFIG.COOKIES_FILE)),
    },
    scratchStorage: {
      path: CONFIG.SCRATCH_DIR,
      fileCount: scratchFileCount,
      totalSizeMb: Math.round((scratchSizeBytes / (1024 * 1024)) * 10) / 10,
    },
    activeJobsCount: queueManager.getAllJobs().length,
  });
});

/**
 * Demo Presets for Quick Testing Across Platforms
 */
apiRouter.get('/demo-urls', (_req: Request, res: Response) => {
  return res.json({
    demos: [
      {
        platform: 'youtube',
        name: 'Rick Astley (4K Remaster)',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        type: 'Standard 4K Music Video'
      },
      {
        platform: 'youtube',
        name: 'YouTube Shorts Sample',
        url: 'https://www.youtube.com/shorts/50_4c5P4p5c',
        type: 'Vertical Short Form Video'
      },
      {
        platform: 'tiktok',
        name: 'TikTok Video Format',
        url: 'https://www.tiktok.com/@tiktok/video/7106594312292453678',
        type: 'TikTok Viral Stream'
      },
      {
        platform: 'instagram',
        name: 'Instagram Reel Format',
        url: 'https://www.instagram.com/reel/C3bJ0t6r6M6/',
        type: 'Public Instagram Reel'
      },
      {
        platform: 'twitter',
        name: 'X (Twitter) Video Post',
        url: 'https://twitter.com/NASA/status/1678783456891392000',
        type: 'Public Twitter Video Clip'
      },
      {
        platform: 'pinterest',
        name: 'Pinterest Video Pin',
        url: 'https://www.pinterest.com/pin/123456789012345678/',
        type: 'Video Pin'
      }
    ]
  });
});

/**
 * Cookie Status and Anti-Bot Configuration
 */
apiRouter.get('/settings/cookies', (_req: Request, res: Response) => {
  const cookiePath = CONFIG.getCookiesPath();
  const exists = Boolean(cookiePath && fs.existsSync(cookiePath));
  let size = 0;
  let isCustom = false;

  if (exists) {
    try {
      size = fs.statSync(cookiePath).size;
      const content = fs.readFileSync(cookiePath, 'utf8');
      isCustom = content.includes('SAPISID') || content.includes('SSID') || content.includes('LOGIN_INFO');
    } catch {
      // ignore
    }
  }

  return res.json({
    success: true,
    isConfigured: exists,
    sizeBytes: size,
    type: isCustom ? 'custom_user' : exists ? 'auto_session' : 'none',
    path: exists ? path.basename(cookiePath) : null
  });
});

/**
 * Save user custom cookies
 */
apiRouter.post('/settings/cookies', (req: Request, res: Response) => {
  const { cookiesContent } = req.body;
  if (!cookiesContent || typeof cookiesContent !== 'string' || cookiesContent.trim().length < 10) {
    return res.status(400).json({ error: 'Please provide valid Netscape or text cookie contents.' });
  }

  try {
    const targetPath = path.resolve(CONFIG.SCRATCH_DIR, 'cookies.txt');
    fs.writeFileSync(targetPath, cookiesContent.trim(), 'utf8');
    CONFIG.COOKIES_FILE = targetPath;
    return res.json({
      success: true,
      message: 'Custom YouTube cookies saved successfully. Anti-bot checkpoint bypassed.',
      sizeBytes: fs.statSync(targetPath).size
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Failed to save cookies: ${err.message}` });
  }
});

/**
 * Refresh automated guest session cookies
 */
apiRouter.post('/settings/cookies/refresh', (_req: Request, res: Response) => {
  try {
    const fresh = CONFIG.refreshGuestCookies();
    return res.json({
      success: true,
      message: 'Refreshed automated YouTube session tokens.',
      configured: Boolean(fresh)
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Refresh failed: ${err.message}` });
  }
});

/**
 * Clear custom cookies
 */
apiRouter.delete('/settings/cookies', (_req: Request, res: Response) => {
  try {
    const targetPath = path.resolve(CONFIG.SCRATCH_DIR, 'cookies.txt');
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    // Re-bootstrap guest cookies
    CONFIG.refreshGuestCookies();
    return res.json({ success: true, message: 'Reset cookies to automated session.' });
  } catch (err: any) {
    return res.status(500).json({ error: `Clear failed: ${err.message}` });
  }
});
