import React, { useState } from 'react';
import { ShieldAlert, RotateCw, LogOut, Mail, User, CheckCircle2 } from 'lucide-react';
import { DEFAULT_ADMIN_EMAIL } from '../firebase/config.js';

interface AccessPendingViewProps {
  userEmail: string;
  userDisplayName?: string | null;
  photoURL?: string | null;
  onRefresh: () => void;
  onSignOut: () => Promise<void>;
}

export const AccessPendingView: React.FC<AccessPendingViewProps> = ({
  userEmail,
  userDisplayName,
  photoURL,
  onRefresh,
  onSignOut,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-6 selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:text-emerald-300">
      <div className="w-full max-w-lg mx-auto">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-8 sm:p-10 text-center space-y-6">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Access Approval Pending
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Your Google account is signed in, but has not yet been granted access to OmniStream by the administrator.
            </p>
          </div>

          {/* User Account Pill */}
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3 text-left">
            {photoURL ? (
              <img
                src={photoURL}
                alt="Avatar"
                className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-300 dark:border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                <User className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                {userDisplayName || 'Google User'}
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block truncate">
                {userEmail}
              </span>
            </div>
          </div>

          {/* Explanation */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-xs text-left text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-200">
              <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>How to get access:</span>
            </div>
            <p>
              Please notify the default administrator to add your Gmail address (<code>{userEmail}</code>) to the authorized whitelist:
            </p>
            <div className="font-mono text-[11px] p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 font-bold">
              {DEFAULT_ADMIN_EMAIL}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Checking Access...' : 'Check Approval Status'}</span>
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
