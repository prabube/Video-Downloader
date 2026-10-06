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
  resolution: string; // e.g., '2160p (4K)', '1080p (FHD)', '720p (HD)', 'Audio Only'
  height: number | null;
  width: number | null;
  fps: number | null;
  ext: string;
  vcodec: string;
  acodec: string;
  filesizeApprox: number | null; // bytes
  isVideoOnly: boolean;
  isAudioOnly: boolean;
  formatNote: string;
  tbr: number | null; // total bitrate kbps
}

export interface VideoMetadata {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  duration: number; // in seconds
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
  progress: number; // 0 to 100
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
  expiresAt: number; // scratch cleanup timestamp
}

export interface InspectRequest {
  url: string;
}

export interface DownloadRequest {
  url: string;
  formatId?: string; // e.g. 'best_hd', 'best_1080p', 'best_720p', 'best_480p', 'audio_mp3', or exact yt-dlp format_id
  isAudioOnly?: boolean;
  metadata?: Partial<VideoMetadata>;
}
