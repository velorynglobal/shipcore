import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { callAiRouter, callAiRouterWithRetry } from '@/lib/ai/router';

jest.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { company_id: 'company-1' } }),
      insert: jest.fn().mockResolvedValue({}),
    })),
  })),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('AI Router', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('callAiRouter should return success when fetch succeeds', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, model: 'test', response: 'hello' }),
    });

    const result = await callAiRouter({ instruction: 'success-test' });
    expect(result.success).toBe(true);
    expect(result.response).toBe('hello');
  });

  it('callAiRouter should return error when fetch fails', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    const result = await callAiRouter({ instruction: 'error-test' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('callAiRouterWithRetry should retry on failure', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limited' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, model: 'test', response: 'success after retry' }),
      });

    const result = await callAiRouterWithRetry({ instruction: 'retry-test' }, 1);
    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
