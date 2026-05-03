import { describe, it, expect } from '@jest/globals';
import { callAiRouter, callAiRouterWithRetry } from '../src/lib/ai/router';

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

    const result = await callAiRouter({ instruction: 'test' });
    expect(result.success).toBe(true);
    expect(result.response).toBe('hello');
  });

  it('callAiRouter should return error when fetch fails', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    const result = await callAiRouter({ instruction: 'test' });
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

    const result = await callAiRouterWithRetry({ instruction: 'test' }, 1);
    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
