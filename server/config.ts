import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  
  // Scratch directory for temp downloads
  SCRATCH_DIR: process.env.SCRATCH_DIR 
    ? path.resolve(process.env.SCRATCH_DIR) 
    : path.resolve(process.cwd(), 'downloads_scratch'),
  
  // Retention time before scratch disk automatic deletion (default: 40 minutes)
  RETENTION_MS: (process.env.RETENTION_MINUTES ? parseInt(process.env.RETENTION_MINUTES, 10) : 40) * 60 * 1000,
  
  // Safeguards: maximum download file size in MB
  MAX_FILE_SIZE_MB: process.env.MAX_FILE_SIZE_MB ? parseInt(process.env.MAX_FILE_SIZE_MB, 10) : 1024,
  
  // Safeguards: maximum duration in seconds (default: 350 minutes)
  MAX_DURATION_SECONDS: process.env.MAX_DURATION_MINUTES ? parseInt(process.env.MAX_DURATION_MINUTES, 10) * 60 : 21000,
  
  // Rate limiting (sliding window per IP)
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 40,     // 40 requests per window
  
  // Maximum concurrent downloading jobs
  MAX_CONCURRENT_JOBS: process.env.MAX_CONCURRENT_JOBS ? parseInt(process.env.MAX_CONCURRENT_JOBS, 10) : 3,
  
  // Binary paths
  YT_DLP_PATH: fs.existsSync(path.resolve(process.cwd(), 'bin/yt-dlp'))
    ? path.resolve(process.cwd(), 'bin/yt-dlp')
    : (fs.existsSync('/usr/local/bin/yt-dlp') ? '/usr/local/bin/yt-dlp' : 'yt-dlp'),
  FFMPEG_PATH: process.env.FFMPEG_PATH || 'ffmpeg',
  FFMPEG_LOCATION: process.env.FFMPEG_LOCATION || (fs.existsSync('/usr/bin/ffmpeg') ? '/usr/bin' : 'ffmpeg'),
  
  // Optional cookies file path for bot mitigation
  COOKIES_FILE: process.env.COOKIES_FILE || '',
  
  // Rotational desktop user agents
  USER_AGENTS: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0'
  ],
  
  getRandomUserAgent(): string {
    return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
  },

  /**
   * Resilient cookies resolver:
   * Checks explicit env var, then default scratch file, or bootstraps a guest session
   */
  getCookiesPath(): string {
    if (this.COOKIES_FILE && fs.existsSync(this.COOKIES_FILE)) {
      return this.COOKIES_FILE;
    }
    const defaultCookies = path.resolve(this.SCRATCH_DIR, 'cookies.txt');
    if (fs.existsSync(defaultCookies) && fs.statSync(defaultCookies).size > 10) {
      return defaultCookies;
    }
    return '';
  },

  /**
   * Generates or refreshes automated YouTube guest cookies
   */
  refreshGuestCookies(): string {
    const targetFile = path.resolve(this.SCRATCH_DIR, 'cookies.txt');
    try {
      execSync(`curl -c "${targetFile}" -s "https://www.youtube.com" > /dev/null`, { timeout: 10000 });
      if (fs.existsSync(targetFile) && fs.statSync(targetFile).size > 50) {
        return targetFile;
      }
    } catch (err) {
      console.warn('Failed to refresh guest cookies via curl:', err);
    }
    return '';
  }
};

// Ensure scratch directory exists
if (!fs.existsSync(CONFIG.SCRATCH_DIR)) {
  fs.mkdirSync(CONFIG.SCRATCH_DIR, { recursive: true });
}

// Bootstrap guest cookies on initial startup if not already present
if (!CONFIG.getCookiesPath()) {
  try {
    CONFIG.refreshGuestCookies();
  } catch {
    // ignore
  }
}
