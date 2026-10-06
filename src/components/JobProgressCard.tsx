import React, { useState, useEffect } from 'react';
import { 
  Download, 
  X, 
  FileVideo, 
  Clock, 
  AlertCircle,
  Eye
} from 'lucide-react';
import { DownloadJob } from '../types/index.js';
import { formatBytes } from '../utils/platforms.js';

interface JobProgressCardProps {
  job: DownloadJob;
  onCancel: (jobId: string) => void;
  onUpdateJob: (job: DownloadJob) => void;
}

export const JobProgressCard: React.FC<JobProgressCardProps> = ({
  job,
  onCancel,
  onUpdateJob,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleSaveFile = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setDownloadError(null);
    const filename = job.outputFilename || `${job.title}.${job.outputExt || 'mp4'}`;
    const downloadUrl = `/api/file/${job.id}`;

    try {
      // 1. Fetch as Blob for guaranteed in-iframe client saving
      const res = await fetch(downloadUrl);
      if (!res.ok) {
        let errDetail = `Server returned HTTP ${res.status}`;
        try {
          const json = await res.json();
          if (json.error) errDetail = json.error;
        } catch {
          // ignore
        }
        throw new Error(errDetail);
      }

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
      console.error('File save failed:', err);
      setDownloadError(err.message || 'File download failed.');
    } finally {
      setIsSaving(false);
    }
  };

  // Subscribe to real-time Server-Sent Events (SSE)
  useEffect(() => {
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled' || job.status === 'expired') {
      return;
    }

    const eventSource = new EventSource(`/api/status/${job.id}/events`);

    eventSource.onmessage = (event) => {
      try {
        const updated = JSON.parse(event.data);
        if (updated && updated.id === job.id) {
          onUpdateJob(updated);
        }
      } catch (err) {
        console.error('Failed to parse SSE payload:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/status/${job.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.job) onUpdateJob(data.job);
          }
        } catch {
          // ignore
        }
      }, 2000);
      return () => clearTimeout(timer);
    };

    return () => {
      eventSource.close();
    };
  }, [job.id, job.status, onUpdateJob]);

  // Phase badge styles with green theme
  const getStatusBadge = () => {
    switch (job.status) {
      case 'queued':
        return {
          label: 'Queued',
          color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          pulse: false,
        };
      case 'downloading_video':
        return {
          label: 'Downloading Video',
          color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
          pulse: true,
        };
      case 'downloading_audio':
        return {
          label: 'Downloading Audio',
          color: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30',
          pulse: true,
        };
      case 'merging':
        return {
          label: 'FFmpeg Muxing',
          color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          pulse: true,
        };
      case 'completed':
        return {
          label: 'Ready to Save',
          color: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40',
          pulse: false,
        };
      case 'failed':
        return {
          label: 'Failed',
          color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
          pulse: false,
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          color: 'bg-slate-500/10 text-slate-500 border-slate-400/30',
          pulse: false,
        };
      case 'expired':
        return {
          label: 'Expired',
          color: 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700',
          pulse: false,
        };
      default:
        return {
          label: 'Processing',
          color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          pulse: true,
        };
    }
  };

  const statusInfo = getStatusBadge();
  const isFinished = job.status === 'completed';
  const isFailed = job.status === 'failed';
  const downloadUrl = `/api/file/${job.id}`;

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-lg transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        {/* Left: Thumbnail & Title */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative w-16 h-12 rounded-xl bg-slate-100 dark:bg-slate-950 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
            {job.thumbnail ? (
              <img
                src={job.thumbnail}
                alt={job.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <FileVideo className="w-6 h-6" />
              </div>
            )}
            {job.isAudioOnly && (
              <div className="absolute inset-0 bg-emerald-950/80 flex items-center justify-center text-[10px] font-bold text-emerald-300">
                MP3
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-md" title={job.title}>
              {job.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="font-medium text-emerald-700 dark:text-emerald-400">{job.formatLabel}</span>
              {job.fileSizeBytes && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span>{formatBytes(job.fileSizeBytes)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Status badge & Cancel */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${statusInfo.color}`}>
            {statusInfo.pulse && (
              <span className="w-2 h-2 rounded-full bg-current animate-ping"></span>
            )}
            {statusInfo.label}
          </span>

          {!isFinished && !isFailed && job.status !== 'cancelled' && job.status !== 'expired' && (
            <button
              onClick={() => onCancel(job.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cancel download"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {!isFailed && job.status !== 'cancelled' && job.status !== 'expired' && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              {job.phaseDescription || 'Processing...'}
            </span>
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{job.progress}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-950 overflow-hidden border border-slate-200 dark:border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                isFinished
                  ? 'bg-emerald-600'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
              style={{ width: `${job.progress}%` }}
            />
          </div>

          {/* Speed & ETA stats */}
          {!isFinished && (
            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
              <span>{job.downloadSpeed ? `Speed: ${job.downloadSpeed}` : 'Allocating buffer...'}</span>
              <span>{job.eta ? `ETA: ${job.eta}` : 'Calculating time...'}</span>
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {isFailed && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-1 mb-4">
          <div className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Download Error: {job.errorCategory || 'Failure'}</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 pl-5">{job.error || 'The video download process encountered an issue.'}</p>
        </div>
      )}

      {/* Ready Actions */}
      {isFinished && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Primary Browser Download Link */}
            <button
              type="button"
              onClick={handleSaveFile}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-70 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Saving to Device...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download File ({job.outputExt.toUpperCase()})</span>
                </>
              )}
            </button>

            {/* Preview player modal trigger */}
            <button
              onClick={() => setIsPreviewOpen(!isPreviewOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium text-xs text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isPreviewOpen ? 'Hide Preview' : 'Preview Media'}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Scratch file auto-purges in 20 mins</span>
          </div>
        </div>
      )}

      {/* Download Error Banner */}
      {downloadError && (
        <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Inline Preview Player */}
      {isPreviewOpen && isFinished && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80 animate-in fade-in duration-200">
          <div className="rounded-xl overflow-hidden bg-black border border-slate-300 dark:border-slate-800 max-h-80 flex items-center justify-center">
            {job.isAudioOnly ? (
              <div className="w-full p-4 flex flex-col items-center gap-2">
                <audio controls src={downloadUrl} className="w-full max-w-md" />
              </div>
            ) : (
              <video
                controls
                src={downloadUrl}
                className="w-full max-h-72 object-contain"
                playsInline
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
