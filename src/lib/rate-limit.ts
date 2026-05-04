/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Note: In serverless environments, this resets on cold starts.
 * For production, use Redis or Vercel KV.
 */

type RateLimitConfig = {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
};

type RequestRecord = {
  count: number;
  resetTime: number;
};

export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests } = config;
  const store = new Map<string, RequestRecord>();

  function getIdentifier(request: Request): string {
    // Use IP address as identifier
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    const url = new URL(request.url);
    return `${ip}:${url.pathname}`;
  }

  return async function rateLimit(request: Request): Promise<{ limited: boolean; remaining: number; resetTime: number }> {
    const identifier = getIdentifier(request);
    const now = Date.now();

    // Clean up old entries (simple cleanup)
    if (store.size > 1000) {
      const entries = [...store.entries()];
      entries.slice(0, 500).forEach(([key]) => store.delete(key));
    }

    const record = store.get(identifier) || { count: 0, resetTime: now + windowMs };

    // Reset if window expired
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    record.count++;
    store.set(identifier, record);

    const limited = record.count > maxRequests;
    const remaining = Math.max(0, maxRequests - record.count);
    
    return { limited, remaining, resetTime: record.resetTime };
  };
}

// Pre-configured limiters
export const aiRouterLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
});

export const agentInstructLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute
});

export const pdfLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 PDF generations per minute
});

export const whatsappLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 webhook requests per minute
});
