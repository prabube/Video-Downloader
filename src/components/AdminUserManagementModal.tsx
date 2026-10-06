import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  Users, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Crown,
  Mail,
  Clock
} from 'lucide-react';
import { AllowedUserRecord } from '../firebase/authContext.js';
import { DEFAULT_ADMIN_EMAIL } from '../firebase/config.js';

interface AdminUserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  allowedUsers: AllowedUserRecord[];
  onAddUser: (email: string, role: 'admin' | 'user') => Promise<void>;
  onRemoveUser: (email: string) => Promise<void>;
}

export const AdminUserManagementModal: React.FC<AdminUserManagementModalProps> = ({
  isOpen,
  onClose,
  allowedUsers,
  onAddUser,
  onRemoveUser,
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [isAdding, setIsAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    const emailToSubmit = newEmail.trim().toLowerCase();
    if (!emailToSubmit || !emailToSubmit.includes('@')) {
      setActionError('Please enter a valid Gmail / email address.');
      return;
    }

    setIsAdding(true);
    try {
      await onAddUser(emailToSubmit, newRole);
      setActionSuccess(`Successfully authorized ${emailToSubmit} as ${newRole.toUpperCase()}!`);
      setNewEmail('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to authorize user.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (email: string) => {
    if (email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
      alert('The primary default administrator cannot be removed.');
      return;
    }

    if (!confirm(`Are you sure you want to revoke access for ${email}?`)) {
      return;
    }

    try {
      await onRemoveUser(email);
      setActionSuccess(`Revoked access for ${email}.`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove user.');
    }
  };

  const filteredUsers = allowedUsers.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Admin Access Management</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                  Whitelisted Access
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grant Gmail accounts permission to log in and use OmniStream
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Add New User Card */}
          <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Add New User to Whitelist</h4>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-7">
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Gmail / Google Email Address:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="e.g. colleague@gmail.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Permission Role:
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="user">User (Standard)</option>
                    <option value="admin">Admin (Can add users)</option>
                  </select>
                </div>

                <div className="sm:col-span-2 flex items-end">
                  <button
                    type="submit"
                    disabled={isAdding || !newEmail.trim()}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isAdding ? 'Adding...' : 'Add User'}
                  </button>
                </div>
              </div>

              {actionError && (
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-xs pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {actionSuccess && (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}
            </form>
          </div>

          {/* Whitelisted Users Directory */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <span>Authorized Users</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono font-bold">
                  {allowedUsers.length}
                </span>
              </h4>

              {/* Search */}
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by email..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* List */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  No users found matching your search.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isPrimary = u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();

                  return (
                    <div
                      key={u.email}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isPrimary
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                            : u.role === 'admin'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {isPrimary ? (
                            <Crown className="w-4 h-4" />
                          ) : (
                            <ShieldCheck className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                              {u.email}
                            </span>
                            {isPrimary && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] border border-amber-500/20">
                                Primary Admin
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span>Role: <strong className="text-slate-700 dark:text-slate-300 capitalize">{u.role}</strong></span>
                            <span>·</span>
                            <span>Added by: {u.addedBy}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isPrimary ? (
                          <span className="text-[11px] text-slate-400 font-medium px-2 py-1">
                            Permanent
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRemove(u.email)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title={`Revoke access for ${u.email}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Default Super Admin: <code className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{DEFAULT_ADMIN_EMAIL}</code>
          </span>
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
