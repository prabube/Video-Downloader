import { spawn } from 'child_process';
import { CONFIG } from '../config.js';
import { PlatformId, StreamFormat, VideoMetadata, ErrorCategory } from '../types.js';

export function detectPlatform(url: string): PlatformId {
  const lowercase = url.toLowerCase();
  if (lowercase.includes('youtube.com') || lowercase.includes('youtu.be')) return 'youtube';
  if (lowercase.includes('tiktok.com')) return 'tiktok';
  if (lowercase.includes('instagram.com')) return 'instagram';
  if (lowercase.includes('twitter.com') || lowercase.includes('x.com')) return 'twitter';
  if (lowercase.includes('facebook.com') || lowercase.includes('fb.watch')) return 'facebook';
  if (lowercase.includes('threads.net')) return 'threads';
  if (lowercase.includes('pinterest.com') || lowercase.includes('pin.it')) return 'pinterest';
  return 'generic';
}

export function categorizeError(stderr: string): { category: ErrorCategory; message: string } {
  // Strip out harmless deprecation notices
  const cleanedStderr = stderr
    .split('\n')
    .filter(line => !line.toLowerCase().includes('deprecated feature') && !line.toLowerCase().includes('support for python version'))
    .join('\n')
    .trim();

  const lower = cleanedStderr.toLowerCase();
  if (lower.includes('private') || lower.includes('this video is private')) {
    return {
      category: 'PRIVATE_VIDEO',
      message: 'This video is private or requires authentication to view.'
    };
  }
  if (lower.includes('geo') || lower.includes('not made this video available in your country')) {
    return {
      category: 'GEO_BLOCKED',
      message: 'This video is geo-restricted and not available in this server region.'
    };
  }
  if (lower.includes('sign in to confirm') || lower.includes('bot') || lower.includes('captcha') || lower.includes('challenge')) {
    return {
      category: 'BOT_RESTRICTED',
      message: 'The platform challenged the server with a bot detection checkpoint. Using platform cookies or rotational proxies is recommended.'
    };
  }
  if (lower.includes('age') || lower.includes('age-restricted') || lower.includes('requires login')) {
    return {
      category: 'PRIVATE_VIDEO',
      message: 'This media is age-restricted or requires account verification.'
    };
  }
  if (lower.includes('unsupported url') || lower.includes('no video formats found') || lower.includes('not a valid')) {
    return {
      category: 'EXTRACTION_ERROR',
      message: 'Unable to extract stream from this URL. Please verify the URL is a direct public post or reel.'
    };
  }
  return {
    category: 'UNKNOWN',
    message: cleanedStderr || stderr.trim() || 'Failed to inspect media stream.'
  };
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export async function inspectUrl(url: string, retryLevel = 0): Promise<VideoMetadata> {
  const platform = detectPlatform(url);
  const isYouTube = platform === 'youtube';
  const userAgent = CONFIG.getRandomUserAgent();

  const args = [
    '--dump-single-json',
    '--no-warnings',
    '--no-playlist',
    '--no-check-certificates',
    '--socket-timeout', '25',
  ];

  const cookiesPath = CONFIG.getCookiesPath();
  if (cookiesPath) {
    args.push('--cookies', cookiesPath);
  }

  if (isYouTube) {
    // Multi-tier client strategy to bypass bot checkpoints on datacenter IPs
    if (retryLevel === 0) {
      args.push('--extractor-args', 'youtube:player_client=ios,android,mweb,web');
    } else if (retryLevel === 1) {
      args.push('--extractor-args', 'youtube:player_client=android_vr,tv_embedded,web_safari');
    } else {
      args.push('--extractor-args', 'youtube:player_skip=configs,webpage;player_client=android,ios');
    }
  } else {
    args.push('--user-agent', userAgent);
  }

  args.push(url);

  return new Promise((resolve, reject) => {
    const proc = spawn(CONFIG.YT_DLP_PATH, args);
    let stdoutData = '';
    let stderrData = '';

    proc.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    proc.on('close', async (code) => {
      if (code !== 0) {
        // Automatic retry with alternate mobile/TV clients if challenged by bot detection
        if (isYouTube && retryLevel < 2 && (stderrData.includes('bot') || stderrData.includes('Sign in to confirm'))) {
          try {
            // Attempt auto-refreshing guest cookies before retry
            if (retryLevel === 0) {
              CONFIG.refreshGuestCookies();
            }
            const retried = await inspectUrl(url, retryLevel + 1);
            return resolve(retried);
          } catch {
            // Fall through to error handler
          }
        }

        const parsedError = categorizeError(stderrData);
        const err = new Error(parsedError.message);
        (err as any).category = parsedError.category;
        (err as any).stderr = stderrData;
        return reject(err);
      }

      try {
        const raw = JSON.parse(stdoutData);
        
        // Duration guard
        const duration = Math.round(raw.duration || 0);
        if (duration > CONFIG.MAX_DURATION_SECONDS) {
          const err = new Error(`Video duration (${formatDuration(duration)}) exceeds the maximum allowed limit of ${formatDuration(CONFIG.MAX_DURATION_SECONDS)}.`);
          (err as any).category = 'DURATION_EXCEEDED';
          return reject(err);
        }

        const rawFormats: any[] = raw.formats || [];
        const formats: StreamFormat[] = [];
        const seenResolutions = new Set<string>();

        // Sort formats by resolution / quality descending
        const sortedFormats = [...rawFormats].sort((a, b) => {
          const hA = a.height || 0;
          const hB = b.height || 0;
          if (hB !== hA) return hB - hA;
          return (b.tbr || 0) - (a.tbr || 0);
        });

        // 1. Process Video Formats (both progressive and video-only adaptive)
        for (const f of sortedFormats) {
          if (f.has_drm) continue;

          const height = f.height || 0;
          const isVideoOnly = f.vcodec !== 'none' && (f.acodec === 'none' || !f.acodec);
          const isAudioOnly = (f.vcodec === 'none' || !f.vcodec) && f.acodec !== 'none';
          const isProgressive = f.vcodec !== 'none' && f.acodec && f.acodec !== 'none';

          if (isAudioOnly) continue;
          if (height <= 0) continue;

          // Categorize resolution label
          let resLabel = `${height}p`;
          if (height >= 2160) resLabel = '2160p (4K)';
          else if (height >= 1440) resLabel = '1440p (2K)';
          else if (height >= 1080) resLabel = '1080p (Full HD)';
          else if (height >= 720) resLabel = '720p (HD)';
          else if (height >= 480) resLabel = '480p (SD)';
          else resLabel = `${height}p`;

          // Deduplicate resolutions while picking best bitrate/codec
          if (!seenResolutions.has(resLabel)) {
            seenResolutions.add(resLabel);
            formats.push({
              formatId: f.format_id,
              resolution: resLabel,
              height: f.height || null,
              width: f.width || null,
              fps: f.fps || null,
              ext: f.ext || 'mp4',
              vcodec: f.vcodec || 'unknown',
              acodec: f.acodec || (isVideoOnly ? 'none (muxed with bestaudio)' : 'aac'),
              filesizeApprox: f.filesize || f.filesize_approx || null,
              isVideoOnly,
              isAudioOnly: false,
              formatNote: f.format_note || (isProgressive ? 'Direct MP4' : 'HD Stream (Auto-muxed)'),
              tbr: f.tbr || null
            });
          }
        }

        // Add standard predefined quick targets if available
        if (formats.length === 0 && raw.url) {
          // Direct fallback if single format
          formats.push({
            formatId: 'best',
            resolution: 'Original HD',
            height: raw.height || null,
            width: raw.width || null,
            fps: raw.fps || null,
            ext: raw.ext || 'mp4',
            vcodec: raw.vcodec || 'avc1',
            acodec: raw.acodec || 'aac',
            filesizeApprox: raw.filesize || raw.filesize_approx || null,
            isVideoOnly: false,
            isAudioOnly: false,
            formatNote: 'Default Video Stream',
            tbr: raw.tbr || null
          });
        }

        // 2. Audio Only option
        formats.push({
          formatId: 'bestaudio_mp3',
          resolution: 'Audio Only (MP3)',
          height: null,
          width: null,
          fps: null,
          ext: 'mp3',
          vcodec: 'none',
          acodec: 'mp3 (320 kbps)',
          filesizeApprox: duration > 0 ? Math.round(duration * 40 * 1024) : null, // ~320kbps estimate
          isVideoOnly: false,
          isAudioOnly: true,
          formatNote: 'High Quality Audio Mux',
          tbr: 320
        });

        const videoMetadata: VideoMetadata = {
          id: raw.id || String(Date.now()),
          url,
          title: raw.title || 'Untitled Social Video',
          thumbnail: raw.thumbnail || (raw.thumbnails && raw.thumbnails[0]?.url) || '',
          duration,
          durationFormatted: formatDuration(duration),
          author: raw.uploader || raw.channel || raw.creator || 'Creator',
          authorUrl: raw.uploader_url || raw.channel_url || '',
          platform,
          formats,
          viewCount: raw.view_count,
          likeCount: raw.like_count,
          description: raw.description ? raw.description.slice(0, 300) : '',
          timestamp: new Date().toISOString()
        };

        resolve(videoMetadata);
      } catch (e: any) {
        reject(new Error(`Failed to parse stream metadata: ${e.message}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`yt-dlp process spawn error: ${err.message}`));
    });
  });
}
