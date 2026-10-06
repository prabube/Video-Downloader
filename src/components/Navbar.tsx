import React from 'react';
import { Film, Clock, Cpu, Sun, Moon, Users, LogOut, ShieldCheck } from 'lucide-react';
import { SystemHealth } from '../types/index.js';
import { UserProfile } from '../firebase/authContext.js';

interface NavbarProps {
  systemHealth: SystemHealth | null;
  recentCount: number;
  activeCount: number;
  theme: 'dark' | 'light';
  profile: UserProfile | null;
  userEmail?: string | null;
  userPhoto?: string | null;
  isAdmin: boolean;
  onToggleTheme: () => void;
  onOpenSystemHealth: () => void;
  onOpenHistory: () => void;
  onOpenAdminUsers: () => void;
  onSignOut: () => Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({
  systemHealth,
  recentCount,
  activeCount,
  theme,
  profile,
  userEmail,
  userPhoto,
  isAdmin,
  onToggleTheme,
  onOpenSystemHealth,
  onOpenHistory,
  onOpenAdminUsers,
  onSignOut,
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
              {isAdmin && (
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  Admin
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">yt-dlp & FFmpeg media extraction engine</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Active Jobs Pill */}
          {activeCount > 0 && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{activeCount} active</span>
            </div>
          )}

          {/* Admin: Manage Users button */}
          {isAdmin && (
            <button
              onClick={onOpenAdminUsers}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer shadow-sm"
              title="Manage authorized users and add new accounts"
            >
              <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Manage Users</span>
            </button>
          )}

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

          {/* Dark / Light Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-emerald-600" />
            )}
          </button>

          {/* User Profile Pill & Sign Out */}
          {userEmail && (
            <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-800 ml-1">
              <div 
                className="flex items-center gap-2 p-1 pl-1.5 rounded-xl text-xs" 
                title={`Signed in as ${userEmail} (${profile?.role || 'user'})`}
              >
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt="User Avatar"
                    className="w-7 h-7 rounded-lg object-cover border border-slate-300 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                    {userEmail[0].toUpperCase()}
                  </div>
                )}
                <span className="font-semibold text-slate-800 dark:text-slate-200 hidden lg:inline max-w-[120px] truncate">
                  {profile?.displayName || userEmail.split('@')[0]}
                </span>
              </div>

              <button
                onClick={onSignOut}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Sign out of account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
