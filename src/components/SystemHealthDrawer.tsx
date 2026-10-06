import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cpu, 
  HardDrive, 
  ShieldAlert, 
  RotateCw, 
  Terminal,
  Cookie,
  CheckCircle2,
  Save,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { SystemHealth } from '../types/index.js';

interface SystemHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemHealth: SystemHealth | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export const SystemHealthModal: React.FC<SystemHealthModalProps> = ({
  isOpen,
  onClose,
  systemHealth,
  onRefresh,
  isLoading,
}) => {
  const [cookieStatus, setCookieStatus] = useState<{
    isConfigured: boolean;
    type: 'custom_user' | 'auto_session' | 'none';
    sizeBytes: number;
  }>({ isConfigured: false, type: 'none', sizeBytes: 0 });

  const [isCookieSaving, setIsCookieSaving] = useState(false);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);
  const [cookiesText, setCookiesText] = useState('');
  const [showCookieInput, setShowCookieInput] = useState(false);
  const [cookieFeedback, setCookieFeedback] = useState<string | null>(null);

  const fetchCookieStatus = async () => {
    try {
      const res = await fetch('/api/settings/cookies');
      if (res.ok) {
        const data = await res.json();
        setCookieStatus(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCookieStatus();
    }
  }, [isOpen]);

  const handleRefreshSession = async () => {
    setIsRefreshingSession(true);
    setCookieFeedback(null);
    try {
      const res = await fetch('/api/settings/cookies/refresh', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setCookieFeedback('Successfully refreshed YouTube session tokens!');
        fetchCookieStatus();
      } else {
        setCookieFeedback(data.error || 'Failed to refresh session');
      }
    } catch (err: any) {
      setCookieFeedback(err.message || 'Network error');
    } finally {
      setIsRefreshingSession(false);
    }
  };

  const handleSaveCustomCookies = async () => {
    if (!cookiesText.trim()) return;
    setIsCookieSaving(true);
    setCookieFeedback(null);
    try {
      const res = await fetch('/api/settings/cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookiesContent: cookiesText.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setCookieFeedback('Custom YouTube cookies saved! Bot checks bypassed.');
        setCookiesText('');
        setShowCookieInput(false);
        fetchCookieStatus();
      } else {
        setCookieFeedback(data.error || 'Failed to save cookies');
      }
    } catch (err: any) {
      setCookieFeedback(err.message || 'Network error');
    } finally {
      setIsCookieSaving(false);
    }
  };

  const handleClearCookies = async () => {
    try {
      await fetch('/api/settings/cookies', { method: 'DELETE' });
      setCookieFeedback('Reset to automated session cookies.');
      fetchCookieStatus();
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">System & Engine Diagnostics</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Underlying yt-dlp, FFmpeg, and anti-bot configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh diagnostics"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
          {/* Anti-Bot & Cookies Mitigation Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Cookie className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">YouTube Anti-Bot Checkpoint Mitigation</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    Automatic mobile client spoofing (iOS/Android) and authenticated session cookies.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  cookieStatus.isConfigured
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                }`}>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>
                    {cookieStatus.type === 'custom_user'
                      ? 'Custom Cookies'
                      : cookieStatus.isConfigured
                      ? 'Live Session Active'
                      : 'Standard Mode'}
                  </span>
                </span>
              </div>
            </div>

            {/* Quick Cookie Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleRefreshSession}
                disabled={isRefreshingSession}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshingSession ? 'animate-spin' : ''}`} />
                <span>{isRefreshingSession ? 'Refreshing...' : 'Refresh YouTube Session'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCookieInput(!showCookieInput)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors font-medium cursor-pointer"
              >
                <span>{showCookieInput ? 'Hide Cookie Input' : 'Paste Custom Cookies'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showCookieInput ? 'rotate-180' : ''}`} />
              </button>

              {cookieStatus.type === 'custom_user' && (
                <button
                  type="button"
                  onClick={handleClearCookies}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title="Reset custom cookies"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {cookieFeedback && (
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 pt-1">
                {cookieFeedback}
              </p>
            )}

            {/* Expandable Custom Cookie Textarea */}
            {showCookieInput && (
              <div className="pt-2 space-y-2 border-t border-emerald-200/60 dark:border-emerald-800/40 animate-in fade-in duration-200">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Export cookies from your browser via the free <span className="font-semibold text-slate-700 dark:text-slate-200">"Get cookies.txt LOCALLY"</span> extension on Chrome/Firefox and paste the text below:
                </p>
                <textarea
                  value={cookiesText}
                  onChange={(e) => setCookiesText(e.target.value)}
                  placeholder="# Netscape HTTP Cookie File&#10;.youtube.com&#9;TRUE&#9;/&#9;TRUE&#9;...&#10;Paste your cookies here..."
                  rows={4}
                  className="w-full p-2.5 rounded-xl font-mono text-[11px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSaveCustomCookies}
                  disabled={!cookiesText.trim() || isCookieSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isCookieSaving ? 'Saving...' : 'Save Custom Cookies'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Engine Status Grid */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Core Extraction Engines</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900 dark:text-white">yt-dlp Engine</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                    Operational
                  </span>
                </div>
                <p className="font-mono text-slate-500 dark:text-slate-400 text-[11px] truncate">
                  {systemHealth?.engine?.ytDlpVersion || 'yt-dlp v2026.08.19'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900 dark:text-white">FFmpeg Multiplexer</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                    Operational
                  </span>
                </div>
                <p className="font-mono text-slate-500 dark:text-slate-400 text-[11px] truncate">
                  {systemHealth?.engine?.ffmpegVersion || 'ffmpeg installed'}
                </p>
              </div>
            </div>
          </div>

          {/* Scratch Disk Storage Status */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Scratch Disk & Automated Cleanup</span>
            </h4>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Scratch Directory:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{systemHealth?.scratchStorage?.path || './downloads_scratch'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Temporary Media Files:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{systemHealth?.scratchStorage?.fileCount ?? 0} files</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Current Disk Usage:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{systemHealth?.scratchStorage?.totalSizeMb ?? 0} MB</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">Cron Cleanup Retention:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Purges automatically every {systemHealth?.safeguards?.retentionMinutes || 40} minutes
                </span>
              </div>
            </div>
          </div>

          {/* Operational Safeguards & Limits */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>Operational Safeguards</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                <span className="text-slate-500 block mb-0.5">Max File Size:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {systemHealth?.safeguards?.maxFileSizeMb || 1024} MB
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                <span className="text-slate-500 block mb-0.5">Max Duration:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {systemHealth?.safeguards?.maxDurationMinutes || 350} mins
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                <span className="text-slate-500 block mb-0.5">IP Rate Limit:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {systemHealth?.safeguards?.maxRequestsPerWindow || 40} req / min
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
