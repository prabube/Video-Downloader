import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.js';
import { UrlInputBar } from './components/UrlInputBar.js';
import { MediaInspectorCard } from './components/MediaInspectorCard.js';
import { JobProgressCard } from './components/JobProgressCard.js';
import { SupportedPlatformsGrid } from './components/SupportedPlatformsGrid.js';
import { SystemHealthModal } from './components/SystemHealthDrawer.js';
import { RecentDownloadsHistory } from './components/RecentDownloadsHistory.js';
import { VideoMetadata, DownloadJob, SystemHealth } from './types/index.js';
import { Film, Layers, Sparkles } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'omnistream_jobs_history';
const THEME_STORAGE_KEY = 'omnistream_theme_mode';

export default function App() {
  // Theme state: dark / light
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'dark';
    }
  });

  // Apply theme class to documentElement
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {
      // ignore
    }
  }, [theme]);

  const [url, setUrl] = useState('');
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  const [activeJobs, setActiveJobs] = useState<DownloadJob[]>([]);
  const [jobHistory, setJobHistory] = useState<DownloadJob[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isSystemHealthLoading, setIsSystemHealthLoading] = useState(false);
  const [isSystemHealthOpen, setIsSystemHealthOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isStartingJob, setIsStartingJob] = useState(false);

  // Sync history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(jobHistory.slice(0, 30)));
    } catch {
      // ignore
    }
  }, [jobHistory]);

  // Fetch system health on mount
  const fetchHealth = useCallback(async () => {
    setIsSystemHealthLoading(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
      }
    } catch (err) {
      console.warn('Failed to fetch engine diagnostics:', err);
    } finally {
      setIsSystemHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Inspect live stream URL
  const handleInspect = async (targetUrl?: string) => {
    const urlToInspect = (targetUrl || url).trim();
    if (!urlToInspect) return;

    setIsInspecting(true);
    setInspectError(null);

    try {
      const res = await fetch('/api/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToInspect }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to inspect media stream.');
      }

      setMetadata(data.data);
    } catch (err: any) {
      setInspectError(err.message || 'Stream inspection failed.');
    } finally {
      setIsInspecting(false);
    }
  };

  // Start download job
  const handleStartDownload = async (formatId: string, isAudioOnly: boolean) => {
    if (!metadata) return;

    setIsStartingJob(true);
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: metadata.url,
          formatId,
          isAudioOnly,
          metadata,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start download job.');
      }

      const newJob: DownloadJob = data.job;

      // Add to active jobs and history
      setActiveJobs((prev) => [newJob, ...prev.filter((j) => j.id !== newJob.id)]);
      setJobHistory((prev) => [newJob, ...prev.filter((j) => j.id !== newJob.id)]);
    } catch (err: any) {
      alert(`Could not start download: ${err.message}`);
    } finally {
      setIsStartingJob(false);
    }
  };

  // Update job from SSE or polling
  const handleUpdateJob = useCallback((updatedJob: DownloadJob) => {
    setActiveJobs((prev) =>
      prev.map((j) => (j.id === updatedJob.id ? updatedJob : j))
    );
    setJobHistory((prev) =>
      prev.map((j) => (j.id === updatedJob.id ? updatedJob : j))
    );
  }, []);

  // Cancel job
  const handleCancelJob = async (jobId: string) => {
    try {
      await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    setActiveJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, status: 'cancelled', phaseDescription: 'Cancelled by user' }
          : j
      )
    );
  };

  // Remove job from local history
  const handleRemoveHistoryJob = (jobId: string) => {
    setJobHistory((prev) => prev.filter((j) => j.id !== jobId));
    setActiveJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  const handleClearHistory = () => {
    setJobHistory([]);
  };

  const runningJobsCount = activeJobs.filter(
    (j) =>
      j.status === 'queued' ||
      j.status === 'downloading_video' ||
      j.status === 'downloading_audio' ||
      j.status === 'merging'
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:text-emerald-300">
      {/* Top Navbar with Theme Toggle */}
      <Navbar
        systemHealth={systemHealth}
        recentCount={jobHistory.length}
        activeCount={runningJobsCount}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onOpenSystemHealth={() => setIsSystemHealthOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col gap-8">
        {/* Hero & URL Input */}
        <UrlInputBar
          url={url}
          onUrlChange={setUrl}
          onInspect={handleInspect}
          isInspecting={isInspecting}
          errorMessage={inspectError}
          onOpenSettings={() => setIsSystemHealthOpen(true)}
        />

        {/* Media Stream Inspector Card (Visible when metadata is ready) */}
        {metadata && (
          <section className="w-full">
            <div className="max-w-4xl mx-auto mb-2 px-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Extracted Stream Formats</span>
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                {metadata.formats.length} formats available
              </span>
            </div>

            <MediaInspectorCard
              metadata={metadata}
              onStartDownload={handleStartDownload}
              isStartingJob={isStartingJob}
            />
          </section>
        )}

        {/* Active & Live Download Progress Cards */}
        {activeJobs.length > 0 && (
          <section className="w-full max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Download & Muxing Tasks</span>
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {activeJobs.length} {activeJobs.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>

            <div className="space-y-3">
              {activeJobs.map((job) => (
                <JobProgressCard
                  key={job.id}
                  job={job}
                  onCancel={handleCancelJob}
                  onUpdateJob={handleUpdateJob}
                />
              ))}
            </div>
          </section>
        )}

        {/* Supported Platforms & Technical Capabilities Matrix */}
        <SupportedPlatformsGrid
          onSelectSample={(sampleUrl) => {
            setUrl(sampleUrl);
            handleInspect(sampleUrl);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </main>

      {/* Diagnostics Modal */}
      <SystemHealthModal
        isOpen={isSystemHealthOpen}
        onClose={() => setIsSystemHealthOpen(false)}
        systemHealth={systemHealth}
        onRefresh={fetchHealth}
        isLoading={isSystemHealthLoading}
      />

      {/* History Drawer Modal */}
      <RecentDownloadsHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        jobs={jobHistory}
        onClearHistory={handleClearHistory}
        onRemoveJob={handleRemoveHistoryJob}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950/80 py-8 text-center text-xs text-slate-500 dark:text-slate-500 transition-colors">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Film className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-slate-900 dark:text-slate-300">OmniStream Media Engine</span>
            <span>·</span>
            <span>yt-dlp & FFmpeg container multiplexer</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <span>Supports 4K UHD DASH</span>
            <span>·</span>
            <span>320kbps MP3 Audio</span>
            <span>·</span>
            <span>Non-blocking queue</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
