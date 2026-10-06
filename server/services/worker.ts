import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '../config.js';
import { DownloadJob, StreamFormat } from '../types.js';
import { categorizeError } from './ytdlp.js';

// Map of running processes for cancellation
const activeProcesses = new Map<string, ChildProcess>();

export function cancelJobProcess(jobId: string): boolean {
  const proc = activeProcesses.get(jobId);
  if (proc) {
    proc.kill('SIGTERM');
    activeProcesses.delete(jobId);
    return true;
  }
  return false;
}

export async function executeDownloadJob(
  job: DownloadJob,
  onProgress: (updatedJob: DownloadJob) => void
): Promise<DownloadJob> {
  const outputTemplate = path.join(CONFIG.SCRATCH_DIR, `${job.id}_%(title).60s.%(ext)s`);
  const isYouTube = /youtube\.com|youtu\.be/i.test(job.url);
  const userAgent = CONFIG.getRandomUserAgent();

  const args: string[] = [
    '--no-playlist',
    '--no-warnings',
    '--no-check-certificates',
    '--socket-timeout', '35',
    '--ffmpeg-location', CONFIG.FFMPEG_LOCATION,
    '--max-filesize', `${CONFIG.MAX_FILE_SIZE_MB}M`,
    '-o', outputTemplate,
  ];

  if (isYouTube) {
    args.push('--extractor-args', 'youtube:player_client=ios,android,mweb,web');
  } else {
    args.push('--user-agent', userAgent);
  }

  const cookiesPath = CONFIG.getCookiesPath();
  if (cookiesPath) {
    args.push('--cookies', cookiesPath);
  }

  // Configure format & merging
  if (job.isAudioOnly) {
    args.push(
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '-f', 'bestaudio/best'
    );
  } else {
    // If formatId is a specific numeric ID or preset
    if (job.formatId && job.formatId !== 'best' && job.formatId !== 'original') {
      // Best video for that format ID + best audio, or fallback to format itself, or best video+audio
      args.push('-f', `${job.formatId}+bestaudio/${job.formatId}/bestvideo+bestaudio/best`);
    } else {
      // Default to best video + best audio muxed into mp4
      args.push('-f', 'bestvideo+bestaudio/best');
    }
    args.push('--merge-output-format', 'mp4');
  }

  args.push(job.url);

  return new Promise((resolve) => {
    job.status = 'downloading_video';
    job.phaseDescription = 'Initializing stream download...';
    job.progress = 5;
    job.updatedAt = Date.now();
    onProgress(job);

    const proc = spawn(CONFIG.YT_DLP_PATH, args);
    activeProcesses.set(job.id, proc);

    let stderrBuffer = '';

    const handleOutput = (data: Buffer) => {
      const line = data.toString();

      // Check if ffmpeg is muxing or fixing container
      if (line.includes('[Merger]') || line.includes('Merging formats') || line.includes('[Fixup')) {
        job.status = 'merging';
        job.phaseDescription = 'Merging HD video & audio streams with FFmpeg...';
        job.progress = 92;
        job.updatedAt = Date.now();
        onProgress(job);
        return;
      }

      if (line.includes('[ExtractAudio]')) {
        job.status = 'merging';
        job.phaseDescription = 'Converting to 320kbps MP3 audio container...';
        job.progress = 90;
        job.updatedAt = Date.now();
        onProgress(job);
        return;
      }

      // Detect stream phase switch (e.g. Downloading audio stream after video)
      if (line.includes('[download] Destination:') && line.match(/\.(m4a|webm|opus|mp3)/i)) {
        job.status = 'downloading_audio';
        job.phaseDescription = 'Downloading audio track for high-definition mux...';
        job.updatedAt = Date.now();
        onProgress(job);
      }

      // Regex to parse yt-dlp download progress:
      // [download]  42.5% of  20.00MiB at  3.50MiB/s ETA 00:03
      const percentMatch = line.match(/(\d+\.?\d*)%/);
      if (percentMatch) {
        const percent = parseFloat(percentMatch[1]);
        if (!isNaN(percent)) {
          // Normalize progress so 100% download leaves room for ffmpeg merge
          const scaledProgress = Math.min(88, Math.max(5, Math.round(percent * 0.88)));
          job.progress = scaledProgress;
        }
      }

      const speedMatch = line.match(/at\s+([0-9.]+[KMG]?i?B\/s)/i);
      if (speedMatch) {
        job.downloadSpeed = speedMatch[1];
      }

      const etaMatch = line.match(/ETA\s+([0-9:]+)/i);
      if (etaMatch) {
        job.eta = etaMatch[1];
      }

      const sizeMatch = line.match(/of\s+~?([0-9.]+[KMG]?i?B)/i);
      if (sizeMatch) {
        job.phaseDescription = `Downloading stream (${sizeMatch[1]} @ ${job.downloadSpeed || 'fast'})...`;
      }

      job.updatedAt = Date.now();
      onProgress(job);
    };

    proc.stdout.on('data', handleOutput);
    proc.stderr.on('data', (data) => {
      const str = data.toString();
      stderrBuffer += str;
      handleOutput(data);
    });

    proc.on('close', (code) => {
      activeProcesses.delete(job.id);
      job.updatedAt = Date.now();

      if (code !== 0) {
        // If aborted or killed
        if (job.status === 'cancelled') {
          resolve(job);
          return;
        }

        const categorized = categorizeError(stderrBuffer);
        job.status = 'failed';
        job.error = categorized.message;
        job.errorCategory = categorized.category;
        job.phaseDescription = `Download failed: ${categorized.message}`;
        onProgress(job);
        return resolve(job);
      }

      // Locate output file in scratch directory
      try {
        const files = fs.readdirSync(CONFIG.SCRATCH_DIR);
        const matchedFile = files.find(f => f.startsWith(`${job.id}_`));

        if (matchedFile) {
          const fullPath = path.join(CONFIG.SCRATCH_DIR, matchedFile);
          const stats = fs.statSync(fullPath);

          job.status = 'completed';
          job.progress = 100;
          job.phaseDescription = 'Ready for direct download';
          job.outputPath = fullPath;
          job.outputFilename = matchedFile.replace(`${job.id}_`, '');
          job.fileSizeBytes = stats.size;
          job.outputExt = path.extname(matchedFile).replace('.', '') || (job.isAudioOnly ? 'mp3' : 'mp4');
          job.expiresAt = Date.now() + CONFIG.RETENTION_MS;
        } else {
          job.status = 'failed';
          job.error = 'Processed file could not be located on disk.';
          job.phaseDescription = 'File output verification error.';
        }
      } catch (err: any) {
        job.status = 'failed';
        job.error = err.message;
      }

      onProgress(job);
      resolve(job);
    });

    proc.on('error', (err) => {
      activeProcesses.delete(job.id);
      job.status = 'failed';
      job.error = `Process error: ${err.message}`;
      job.updatedAt = Date.now();
      onProgress(job);
      resolve(job);
    });
  });
}
