import React from 'react';
import { 
  X, 
  Trash2, 
  Download, 
  FileVideo, 
  Clock, 
  AlertCircle
} from 'lucide-react';
import { DownloadJob } from '../types/index.js';
import { formatBytes } from '../utils/platforms.js';

interface RecentDownloadsHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: DownloadJob[];
  onClearHistory: () => void;
  onRemoveJob: (jobId: string) => void;
}

export const RecentDownloadsHistory: React.FC<RecentDownloadsHistoryProps> = ({
  isOpen,
  onClose,
  jobs,
  onClearHistory,
  onRemoveJob,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Downloads & History</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{jobs.length} items recorded</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {jobs.length > 0 && (
              <button
                onClick={onClearHistory}
                className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
                title="Clear history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List of items */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {jobs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
              <FileVideo className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium">No download history yet.</p>
              <p className="text-xs">Paste any video URL to start your first HD download.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const isFinished = job.status === 'completed';
                const isFailed = job.status === 'failed';

                return (
                  <div
                    key={job.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-14 h-10 rounded-lg bg-slate-200 dark:bg-slate-900 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
                        {job.thumbnail ? (
                          <img
                            src={job.thumbnail}
                            alt={job.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <FileVideo className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-md" title={job.title}>
                          {job.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">{job.formatLabel}</span>
                          {job.fileSizeBytes && (
                            <>
                              <span>·</span>
                              <span>{formatBytes(job.fileSizeBytes)}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {isFinished && (
                        <button
                          type="button"
                          onClick={async () => {
                            const filename = job.outputFilename || `${job.title}.${job.outputExt || 'mp4'}`;
                            const downloadUrl = `/api/file/${job.id}`;
                            try {
                              const res = await fetch(downloadUrl);
                              if (!res.ok) throw new Error(`HTTP ${res.status}`);
                              const blob = await res.blob();
                              const blobUrl = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = blobUrl;
                              a.download = filename;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);
                            } catch (err: any) {
                              console.error('Download error:', err);
                              alert('Download error: ' + (err.message || 'File not ready or expired'));
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Save {job.outputExt.toUpperCase()}</span>
                        </button>
                      )}

                      {isFailed && (
                        <span className="text-xs text-rose-500 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      )}

                      <button
                        onClick={() => onRemoveJob(job.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Remove from list"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
