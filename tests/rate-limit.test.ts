import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createRateLimiter, aiRouterLimiter, agentInstructLimiter } from '../src/lib/rate-limit';

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Clear the internal store
    jest.resetModules();
  });

  it('should allow requests within limit', async () => {
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 3 });
    
    const mockReq1 = new Request('http://localhost/api/test', { 
      headers: { 'x-forwarded-for': '127.0.0.1' } 
    });
    const res1 = await limiter(mockReq1);
    expect(res1.limited).toBe(false);
    expect(res1.remaining).toBe(2);
    
    const mockReq2 = new Request('http://localhost/api/test', { 
      headers: { 'x-forwarded-for': '127.0.0.1' } 
    });
    const res2 = await limiter(mockReq2);
    expect(res2.limited).toBe(false);
    expect(res2.remaining).toBe(1);
  });

  it('should block requests over limit', async () => {
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 2 });
    
    await limiter(new Request('http://localhost/api/test', { 
      headers: { 'x-forwarded-for': '127.0.0.1' } 
    }));
    await limiter(new Request('http://localhost/api/test', { 
      headers: { 'x-forwarded-for': '127.0.0.1' } 
    }));
    
    const res3 = await limiter(new Request('http://localhost/api/test', { 
      headers: { 'x-forwarded-for': '127.0.0.1' } 
    }));
    expect(res3.limited).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it('should reset after window expires', async () => {
    const limiter = createRateLimiter({ windowMs: 100, maxRequests: 1 });
    
    const req1 = new Request('http://localhost/api/test', { 
      headers: { 'x-forwarded-for': '127.0.0.1' } 
    });
    const res1 = await limiter(req1);
    expect(res1.limited).toBe(false);
    
    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const req2 = new Request('http://localhost/api/test', { 
      headers: { 'x-forwarded-for': '127.0.0.1' } 
    });
    const res2 = await limiter(req2);
    expect(res2.limited).toBe(false);
    expect(res2.remaining).toBe(0);
  });

  it('should use IP as identifier', async () => {
    const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 1 });
    
    const req1 = new Request('http://localhost/api/test', { 
      headers: { 'x-forwarded-for': '192.168.1.1' } 
    });
    await limiter(req1);
    
    // Different IP should have separate limit
    const req2 = new Request('http://localhost/api/test', { 
      headers: { 'x-forwarded-for': '192.168.1.2' } 
    });
    const res2 = await limiter(req2);
    expect(res2.limited).toBe(false);
  });

  it('pre-configured limiters should work', () => {
    expect(typeof aiRouterLimiter).toBe('function');
    expect(typeof agentInstructLimiter).toBe('function');
  });
});
