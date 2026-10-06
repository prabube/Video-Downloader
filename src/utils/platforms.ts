import { PlatformId } from '../types/index.js';

export interface PlatformInfo {
  id: PlatformId;
  name: string;
  tagline: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  supportedTypes: string[];
  sampleUrl: string;
}

export const PLATFORMS_DATA: Record<PlatformId, PlatformInfo> = {
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    tagline: 'Standard Videos & Shorts up to 4K 60fps',
    badgeBg: 'bg-red-500/10',
    badgeText: 'text-red-400',
    borderColor: 'border-red-500/30',
    supportedTypes: ['Standard Videos', 'YouTube Shorts', '4K / 1080p DASH', 'Audio Only (MP3)'],
    sampleUrl: 'https://youtube.com/shorts/ETm6rJKhbko?si=5k51x47W8ATc08A2'
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    tagline: 'HD Videos without Watermark',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    supportedTypes: ['TikTok Videos', 'Shorts', 'Audio Soundtracks'],
    sampleUrl: 'https://www.tiktok.com/@tiktok/video/7106594312292453678'
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    tagline: 'Public Reels, Stories & Feed Videos',
    badgeBg: 'bg-pink-500/10',
    badgeText: 'text-pink-400',
    borderColor: 'border-pink-500/30',
    supportedTypes: ['Reels', 'Feed Posts', 'IGTV'],
    sampleUrl: 'https://www.instagram.com/reel/Dd-1gHIy0CQ/?utm_source=ig_web_copy_link&stkn=MzRlODBiNWFlZA=='
  },
  twitter: {
    id: 'twitter',
    name: 'X (Twitter)',
    tagline: 'High Bitrate MP4 Video Clips',
    badgeBg: 'bg-slate-500/10',
    badgeText: 'text-slate-300',
    borderColor: 'border-slate-500/30',
    supportedTypes: ['Video Tweets', 'X Media Clips', 'Spaces Recordings'],
    sampleUrl: 'https://x.com/Sowmiyanbumani/status/2105908940072731019/video/1'
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    tagline: 'Public Reels & Watch Videos',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    supportedTypes: ['Public Reels', 'Facebook Watch', 'Live Replays'],
    sampleUrl: 'https://www.facebook.com/share/v/1DgsDHgAza/'
  },
  threads: {
    id: 'threads',
    name: 'Threads',
    tagline: 'Meta Threads Video Posts',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    supportedTypes: ['Threads Media', 'Video Clips'],
    sampleUrl: 'https://www.threads.com/@aninotunes.visuals/post/DeGpKHQD4qq?xmt=AQG0vFr15_UhRYqJlC3nMRvraqwMsdgSI62v17mP3ag8-g'
  },
  pinterest: {
    id: 'pinterest',
    name: 'Pinterest',
    tagline: 'Video Pins & Idea Pins',
    badgeBg: 'bg-red-600/10',
    badgeText: 'text-red-300',
    borderColor: 'border-red-600/30',
    supportedTypes: ['Video Pins', 'Idea Pins'],
    sampleUrl: 'https://pin.it/19ZmuL9bJ'
  },
  generic: {
    id: 'generic',
    name: 'Direct Media',
    tagline: 'Direct Stream or Universal Embed',
    badgeBg: 'bg-indigo-500/10',
    badgeText: 'text-indigo-400',
    borderColor: 'border-indigo-500/30',
    supportedTypes: ['Direct Video Streams', 'Vimeo', 'Twitch Clips'],
    sampleUrl: ''
  }
};

export const PLATFORM_REGEXES: Record<PlatformId, RegExp[]> = {
  youtube: [
    /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?.*v=|shorts\/|embed\/|v\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/i
  ],
  tiktok: [
    /^(https?:\/\/)?(www\.|vm\.|vt\.)?tiktok\.com\/(@[\w.-]+\/video\/\d+|\w+)/i
  ],
  instagram: [
    /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+/i
  ],
  twitter: [
    /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/[\w.]+\/status\/\d+/i
  ],
  facebook: [
    /^(https?:\/\/)?(www\.|m\.|web\.)?(facebook\.com|fb\.watch)\/(watch\/?\?v=\d+|reel\/\d+|[\w.]+\/videos\/\d+|\w+)/i
  ],
  threads: [
    /^(https?:\/\/)?(www\.)?threads\.(net|com)\/@[\w.]+\/post\/[\w-]+/i
  ],
  pinterest: [
    /^(https?:\/\/)?([a-z]{2}\.)?(pinterest\.(com|[a-z]{2})|pin\.it)\/(pin\/\d+|[\w-]+)/i
  ],
  generic: [
    /^https?:\/\/.+/i
  ]
};

export function identifyPlatform(url: string): { platform: PlatformId; isValidPattern: boolean } {
  if (!url || typeof url !== 'string') {
    return { platform: 'generic', isValidPattern: false };
  }

  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { platform: 'generic', isValidPattern: false };
  }

  // Check specific platforms in sequence
  const platformOrder: PlatformId[] = ['youtube', 'tiktok', 'instagram', 'twitter', 'facebook', 'threads', 'pinterest'];
  for (const pid of platformOrder) {
    const regexes = PLATFORM_REGEXES[pid];
    for (const reg of regexes) {
      if (reg.test(trimmed)) {
        return { platform: pid, isValidPattern: true };
      }
    }
  }

  // Fallback domain inspection
  const lower = trimmed.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return { platform: 'youtube', isValidPattern: true };
  if (lower.includes('tiktok.com')) return { platform: 'tiktok', isValidPattern: true };
  if (lower.includes('instagram.com')) return { platform: 'instagram', isValidPattern: true };
  if (lower.includes('twitter.com') || lower.includes('x.com')) return { platform: 'twitter', isValidPattern: true };
  if (lower.includes('facebook.com') || lower.includes('fb.watch')) return { platform: 'facebook', isValidPattern: true };
  if (lower.includes('threads.net')) return { platform: 'threads', isValidPattern: true };
  if (lower.includes('pinterest.com') || lower.includes('pin.it')) return { platform: 'pinterest', isValidPattern: true };

  return { platform: 'generic', isValidPattern: true };
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return 'Estimate upon download';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
