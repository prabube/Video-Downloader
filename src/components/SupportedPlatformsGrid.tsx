import React from 'react';
import { 
  Check, 
  Zap, 
  Layers, 
  ShieldCheck, 
  ArrowUpRight 
} from 'lucide-react';
import { PLATFORMS_DATA } from '../utils/platforms.js';

interface SupportedPlatformsGridProps {
  onSelectSample: (sampleUrl: string) => void;
}

export const SupportedPlatformsGrid: React.FC<SupportedPlatformsGridProps> = ({
  onSelectSample,
}) => {
  const platforms = [
    PLATFORMS_DATA.youtube,
    PLATFORMS_DATA.tiktok,
    PLATFORMS_DATA.instagram,
    PLATFORMS_DATA.twitter,
    PLATFORMS_DATA.facebook,
    PLATFORMS_DATA.threads,
    PLATFORMS_DATA.pinterest,
  ];

  return (
    <section className="w-full max-w-5xl mx-auto mt-16 pt-12 border-t border-slate-200 dark:border-slate-800/80">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Supported Social Media Platforms
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Engineered with deep format extraction for video, audio, and adaptive DASH streams.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
          <Zap className="w-4 h-4" />
          <span>Automated FFmpeg Remuxing Engine</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {platforms.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 hover:border-emerald-300 dark:hover:border-slate-700 shadow-sm dark:shadow-none transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${p.badgeBg} ${p.badgeText} ${p.borderColor}`}>
                  {p.name}
                </span>
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 uppercase">
                  Direct Stream
                </span>
              </div>

              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                {p.tagline}
              </h3>

              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 mb-4">
                {p.supportedTypes.map((type, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{type}</span>
                  </li>
                ))}
              </ul>
            </div>

            {p.sampleUrl && (
              <button
                type="button"
                onClick={() => onSelectSample(p.sampleUrl)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white text-xs font-medium border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer"
              >
                <span>Test with {p.name}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Technical Architecture Safeguards Card */}
      <div className="mt-8 p-6 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs shadow-sm dark:shadow-none">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Adaptive DASH/HLS Muxing</h4>
            <p className="text-slate-600 dark:text-slate-400">
              Downloads distinct 4K/1080p video & hi-fi audio tracks, executing a lossless FFmpeg container merge into standard .mp4.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Resource Safeguards</h4>
            <p className="text-slate-600 dark:text-slate-400">
              IP sliding-window rate limiting, maximum 500 MB file caps, 20-minute video duration ceiling, and concurrent worker queue.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Scratch Disk Auto-Purge</h4>
            <p className="text-slate-600 dark:text-slate-400">
              Processed media files automatically expire and get scrubbed by the background cron after 20 minutes to prevent disk bloat.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
