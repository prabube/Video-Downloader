import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CONFIG } from '../config.js';
import { DownloadJob, DownloadRequest, VideoMetadata } from '../types.js';
import { executeDownloadJob, cancelJobProcess } from './worker.js';

class JobQueue {
  private jobs = new Map<string, DownloadJob>();
  private activeCount = 0;
  private sseClients = new Map<string, Set<Response>>();

  constructor() {
    this.startCleanupTimer();
  }

  public createJob(meta: VideoMetadata, req: DownloadRequest): DownloadJob {
    const id = crypto.randomUUID();
    const isAudio = Boolean(req.isAudioOnly || req.formatId === 'bestaudio_mp3');

    // Find format label
    let formatLabel = isAudio ? 'Audio Only (MP3)' : 'Best HD Video (MP4)';
    if (req.formatId) {
      const matchFormat = meta.formats.find(f => f.formatId === req.formatId);
      if (matchFormat) {
        formatLabel = `${matchFormat.resolution} (${matchFormat.ext.toUpperCase()})`;
      }
    }

    const job: DownloadJob = {
      id,
      url: meta.url,
      title: meta.title,
      thumbnail: meta.thumbnail,
      formatId: req.formatId || (isAudio ? 'bestaudio_mp3' : 'best'),
      formatLabel,
      isAudioOnly: isAudio,
      outputExt: isAudio ? 'mp3' : 'mp4',
      status: 'queued',
      progress: 0,
      phaseDescription: 'Added to download queue...',
      downloadSpeed: '',
      eta: '',
      downloadedBytes: 0,
      totalBytes: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + CONFIG.RETENTION_MS,
    };

    this.jobs.set(id, job);
    this.processNext();
    return job;
  }

  public getJob(id: string): DownloadJob | undefined {
    return this.jobs.get(id);
  }

  public getAllJobs(): DownloadJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    if (job.status === 'downloading_video' || job.status === 'downloading_audio' || job.status === 'merging') {
      cancelJobProcess(id);
    }

    job.status = 'cancelled';
    job.phaseDescription = 'Download cancelled by user';
    job.updatedAt = Date.now();
    this.broadcast(job);

    // If file was already saved, remove it
    if (job.outputPath && fs.existsSync(job.outputPath)) {
      try {
        fs.unlinkSync(job.outputPath);
      } catch (err) {
        // ignore
      }
    }

    this.processNext();
    return true;
  }

  public subscribeSSE(jobId: string, res: Response): () => void {
    let clients = this.sseClients.get(jobId);
    if (!clients) {
      clients = new Set();
      this.sseClients.set(jobId, clients);
    }
    clients.add(res);

    // Send initial snapshot
    const job = this.jobs.get(jobId);
    if (job) {
      res.write(`data: ${JSON.stringify(job)}\n\n`);
    }

    return () => {
      const set = this.sseClients.get(jobId);
      if (set) {
        set.delete(res);
        if (set.size === 0) {
          this.sseClients.delete(jobId);
        }
      }
    };
  }

  private broadcast(job: DownloadJob) {
    const clients = this.sseClients.get(job.id);
    if (clients) {
      const payload = `data: ${JSON.stringify(job)}\n\n`;
      for (const res of clients) {
        try {
          res.write(payload);
        } catch {
          clients.delete(res);
        }
      }
    }
  }

  private async processNext() {
    if (this.activeCount >= CONFIG.MAX_CONCURRENT_JOBS) {
      return;
    }

    // Find next queued job
    const queuedJob = Array.from(this.jobs.values()).find(j => j.status === 'queued');
    if (!queuedJob) {
      return;
    }

    this.activeCount++;

    try {
      await executeDownloadJob(queuedJob, (updated) => {
        this.broadcast(updated);
      });
    } catch (err: any) {
      queuedJob.status = 'failed';
      queuedJob.error = err.message || 'Worker exception';
      queuedJob.phaseDescription = 'Worker failed to execute task.';
      this.broadcast(queuedJob);
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }

  private startCleanupTimer() {
    // Run cleanup every 60 seconds
    setInterval(() => {
      const now = Date.now();

      // 1. Clean expired scratch disk files
      try {
        if (fs.existsSync(CONFIG.SCRATCH_DIR)) {
          const files = fs.readdirSync(CONFIG.SCRATCH_DIR);
          for (const file of files) {
            const filePath = path.join(CONFIG.SCRATCH_DIR, file);
            const stats = fs.statSync(filePath);
            const ageMs = now - stats.mtimeMs;

            if (ageMs > CONFIG.RETENTION_MS) {
              fs.unlinkSync(filePath);
              console.log(`[AutoCleanup] Removed expired scratch file: ${file}`);
            }
          }
        }
      } catch (e) {
        console.error('[AutoCleanup Error]', e);
      }

      // 2. Mark expired jobs
      for (const [id, job] of this.jobs.entries()) {
        if (job.status === 'completed' && now > job.expiresAt) {
          job.status = 'expired';
          job.phaseDescription = 'Download expired and purged from scratch disk.';
          this.broadcast(job);
        }

        // Purge records older than 2 hours from memory
        if (now - job.createdAt > 2 * 60 * 60 * 1000) {
          this.jobs.delete(id);
          this.sseClients.delete(id);
        }
      }
    }, 60 * 1000);
  }
}

export const queueManager = new JobQueue();
