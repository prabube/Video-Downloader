import React from 'react';
import { Film, Clock, Cpu, Sun, Moon } from 'lucide-react';
import { SystemHealth } from '../types/index.js';

interface NavbarProps {
  systemHealth: SystemHealth | null;
  recentCount: number;
  activeCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenSystemHealth: () => void;
  onOpenHistory: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  systemHealth,
  recentCount,
  activeCount,
  theme,
  onToggleTheme,
  onOpenSystemHealth,
  onOpenHistory,
}) => {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">OmniStream</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono font-bold">HD</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">yt-dlp & FFmpeg media extraction engine</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Jobs Pill */}
          {activeCount > 0 && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{activeCount} active</span>
            </div>
          )}

          {/* Dark / Light Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Recent downloads history"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">History</span>
            {recentCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-bold">
                {recentCount}
              </span>
            )}
          </button>

          {/* System Health / Engine Status */}
          <button
            onClick={onOpenSystemHealth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Inspect system engines and scratch disk status"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Engine</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </button>
        </div>
      </div>
    </header>
  );
};
