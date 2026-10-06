import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Clipboard, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles
} from 'lucide-react';
import { identifyPlatform, PLATFORMS_DATA } from '../utils/platforms.js';
import { PlatformId } from '../types/index.js';

interface UrlInputBarProps {
  url: string;
  onUrlChange: (newUrl: string) => void;
  onInspect: (targetUrl?: string) => void;
  isInspecting: boolean;
  errorMessage: string | null;
  onOpenSettings?: () => void;
}

export const UrlInputBar: React.FC<UrlInputBarProps> = ({
  url,
  onUrlChange,
  onInspect,
  isInspecting,
  errorMessage,
  onOpenSettings,
}) => {
  const [platformInfo, setPlatformInfo] = useState<{ platform: PlatformId; isValidPattern: boolean }>({
    platform: 'generic',
    isValidPattern: false,
  });

  useEffect(() => {
    if (url.trim()) {
      const detected = identifyPlatform(url.trim());
      setPlatformInfo(detected);
    } else {
      setPlatformInfo({ platform: 'generic', isValidPattern: false });
    }
  }, [url]);

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          onUrlChange(text.trim());
          if (text.startsWith('http://') || text.startsWith('https://')) {
            onInspect(text.trim());
          }
        }
      }
    } catch (err) {
      console.warn('Clipboard read permission denied or unavailable', err);
    }
  };

  const handleClear = () => {
    onUrlChange('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !isInspecting) {
      onInspect();
    }
  };

  const handleSampleSelect = (sampleUrl: string) => {
    onUrlChange(sampleUrl);
    onInspect(sampleUrl);
  };

  const currentPlatform = PLATFORMS_DATA[platformInfo.platform] || PLATFORMS_DATA.generic;

  return (
    <section className="w-full">
      {/* Hero Headline */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
          Social Video Downloader in{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-400">
            Pure HD
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Extract, adaptively mux separate 4K video/audio DASH streams with FFmpeg, and download pristine media from YouTube, Instagram, TikTok, X, Threads, and Pinterest.
        </p>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="relative w-full max-w-3xl mx-auto">
        <div className={`relative flex items-center rounded-2xl bg-white dark:bg-slate-900/90 border transition-all duration-200 shadow-xl p-1.5 sm:p-2 ${
          url && platformInfo.isValidPattern
            ? 'border-emerald-500 shadow-emerald-500/10'
            : errorMessage
            ? 'border-rose-500/50 shadow-rose-500/10'
            : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 shadow-slate-200 dark:shadow-black/40'
        }`}>
          {/* Platform Badge Indicator */}
          <div className="hidden sm:flex items-center pl-3 pr-2 text-xs font-medium">
            {url ? (
              <span className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 border ${currentPlatform.badgeBg} ${currentPlatform.badgeText} ${currentPlatform.borderColor}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                {currentPlatform.name}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5 text-xs">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </span>
            )}
          </div>

          {/* URL Input Field */}
          <input
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="Paste video URL from YouTube, TikTok, Instagram, X, Facebook, Threads..."
            className="flex-1 bg-transparent px-3 py-3 text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none min-w-0"
            disabled={isInspecting}
            autoFocus
          />

          {/* Clear & Paste Actions */}
          <div className="flex items-center gap-1 pr-1">
            {url ? (
              <button
                type="button"
                onClick={handleClear}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePaste}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/60 rounded-xl transition-all active:scale-95 cursor-pointer"
                title="Auto-paste URL from clipboard"
              >
                <Clipboard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Paste</span>
              </button>
            )}

            {/* Inspect / Submit Button */}
            <button
              type="submit"
              disabled={!url.trim() || isInspecting}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 shadow-md cursor-pointer ${
                !url.trim() || isInspecting
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25'
              }`}
            >
              {isInspecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Inspecting...</span>
                </>
              ) : (
                <>
                  <span>Inspect Streams</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live URL Feedback status */}
        <div className="flex items-center justify-between mt-2.5 px-2 text-xs flex-wrap gap-2">
          {errorMessage ? (
            <div className="flex items-center gap-2 text-rose-500 dark:text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
              {errorMessage.includes('bot') && onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 font-bold underline cursor-pointer"
                >
                  Configure Cookies
                </button>
              )}
            </div>
          ) : url && platformInfo.isValidPattern ? (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Recognized {currentPlatform.name} media link - ready to inspect</span>
            </div>
          ) : url ? (
            <div className="text-slate-500">
              Enter a full video or reel URL starting with https://
            </div>
          ) : (
            <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span>Supports adaptive DASH video/audio automatic FFmpeg muxing</span>
            </div>
          )}
        </div>

        {/* Quick Sample Presets Chips */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-xs">
          <span className="text-slate-500 dark:text-slate-400 mr-1">Sample test links:</span>
          <button
            type="button"
            onClick={() => handleSampleSelect('https://x.com/Sowmiyanbumani/status/2105908940072731019/video/1')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            X / Twitter
          </button>
          <button
            type="button"
            onClick={() => handleSampleSelect('https://www.facebook.com/share/v/1DgsDHgAza/')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Facebook
          </button>
          <button
            type="button"
            onClick={() => handleSampleSelect('https://www.instagram.com/reel/Dd-1gHIy0CQ/?utm_source=ig_web_copy_link&stkn=MzRlODBiNWFlZA==')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
            Instagram Reel
          </button>
          <button
            type="button"
            onClick={() => handleSampleSelect('https://pin.it/19ZmuL9bJ')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
            Pinterest
          </button>
          <button
            type="button"
            onClick={() => handleSampleSelect('https://youtube.com/shorts/ETm6rJKhbko?si=5k51x47W8ATc08A2')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            YouTube Short
          </button>
          <button
            type="button"
            onClick={() => handleSampleSelect('https://www.threads.com/@aninotunes.visuals/post/DeGpKHQD4qq?xmt=AQG0vFr15_UhRYqJlC3nMRvraqwMsdgSI62v17mP3ag8-g')}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Threads
          </button>
        </div>
      </form>
    </section>
  );
};
