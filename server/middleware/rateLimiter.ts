import { Request, Response, NextFunction } from 'express';
import { CONFIG } from '../config.js';

interface RateLimitRecord {
  timestamps: number[];
}

const ipRequestMap = new Map<string, RateLimitRecord>();

// Clean up expired IP records every 5 minutes
setInterval(() => {
  const now = Date.now();
  const windowStart = now - CONFIG.RATE_LIMIT_WINDOW_MS;
  for (const [ip, record] of ipRequestMap.entries()) {
    record.timestamps = record.timestamps.filter(ts => ts > windowStart);
    if (record.timestamps.length === 0) {
      ipRequestMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  // Determine client IP
  const clientIp = 
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
    req.socket.remoteAddress || 
    '127.0.0.1';

  const now = Date.now();
  const windowStart = now - CONFIG.RATE_LIMIT_WINDOW_MS;

  let record = ipRequestMap.get(clientIp);
  if (!record) {
    record = { timestamps: [] };
    ipRequestMap.set(clientIp, record);
  }

  // Filter timestamps outside current sliding window
  record.timestamps = record.timestamps.filter(ts => ts > windowStart);

  if (record.timestamps.length >= CONFIG.RATE_LIMIT_MAX_REQUESTS) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfterSeconds = Math.ceil((oldestTimestamp + CONFIG.RATE_LIMIT_WINDOW_MS - now) / 1000);
    
    res.setHeader('Retry-After', retryAfterSeconds);
    res.status(429).json({
      error: 'Rate limit exceeded. Too many requests from this IP.',
      retryAfterSeconds,
      limit: CONFIG.RATE_LIMIT_MAX_REQUESTS,
      windowSeconds: CONFIG.RATE_LIMIT_WINDOW_MS / 1000
    });
    return;
  }

  record.timestamps.push(now);
  res.setHeader('X-RateLimit-Limit', CONFIG.RATE_LIMIT_MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', CONFIG.RATE_LIMIT_MAX_REQUESTS - record.timestamps.length);
  next();
}
