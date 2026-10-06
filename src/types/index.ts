export type PlatformId =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'twitter'
  | 'facebook'
  | 'threads'
  | 'pinterest'
  | 'generic';

export interface StreamFormat {
  formatId: string;
  resolution: string;
  height: number | null;
  width: number | null;
  fps: number | null;
  ext: string;
  vcodec: string;
  acodec: string;
  filesizeApprox: number | null;
  isVideoOnly: boolean;
  isAudioOnly: boolean;
  formatNote: string;
  tbr: number | null;
}

export interface VideoMetadata {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  duration: number;
  durationFormatted: string;
  author: string;
  authorUrl?: string;
  platform: PlatformId;
  formats: StreamFormat[];
  viewCount?: number;
  likeCount?: number;
  description?: string;
  timestamp?: string;
}

export type JobStatus =
  | 'queued'
  | 'downloading_video'
  | 'downloading_audio'
  | 'merging'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

export type ErrorCategory =
  | 'GEO_BLOCKED'
  | 'PRIVATE_VIDEO'
  | 'BOT_RESTRICTED'
  | 'FILE_TOO_LARGE'
  | 'DURATION_EXCEEDED'
  | 'EXTRACTION_ERROR'
  | 'UNKNOWN';

export interface DownloadJob {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  formatId: string;
  formatLabel: string;
  isAudioOnly: boolean;
  outputExt: string;
  status: JobStatus;
  progress: number;
  phaseDescription: string;
  downloadSpeed: string;
  eta: string;
  downloadedBytes: number;
  totalBytes: number;
  outputPath?: string;
  outputFilename?: string;
  fileSizeBytes?: number;
  error?: string;
  errorCategory?: ErrorCategory;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

export interface SystemHealth {
  status: string;
  engine: {
    ytDlpVersion: string;
    ffmpegVersion: string;
  };
  safeguards: {
    maxFileSizeMb: number;
    maxDurationMinutes: number;
    retentionMinutes: number;
    rateLimitWindowSeconds: number;
    maxRequestsPerWindow: number;
    cookiesConfigured: boolean;
  };
  scratchStorage: {
    path: string;
    fileCount: number;
    totalSizeMb: number;
  };
  activeJobsCount: number;
}
