import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { POST } from '@/app/api/agent-trigger/route';

const messageInsert = jest.fn();
const profileSingle = jest.fn();

jest.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: jest.fn(() => {
    const profileQuery: Record<string, jest.Mock> = {};
    profileQuery.select = jest.fn(() => profileQuery);
    profileQuery.eq = jest.fn(() => profileQuery);
    profileQuery.single = profileSingle;

    return {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
        getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'user-token' } } }),
      },
      from: jest.fn((table: string) => table === 'users'
        ? profileQuery
        : { insert: messageInsert }),
    };
  }),
}));

describe('Agent Trigger API', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    profileSingle.mockResolvedValue({ data: { company_id: 'company-1', role: 'admin' } });
    messageInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
    jest.restoreAllMocks();
  });

  it('rejects agent keys outside the server allowlist', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const response = await POST(new Request('http://localhost/api/agent-trigger', {
      method: 'POST',
      body: JSON.stringify({ agent_key: 'unknown_agent', url: 'http://127.0.0.1/admin' }),
    }));

    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uses the configured function URL and forwards the user token', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ success: true, agent: 'Tesla' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));

    const response = await POST(new Request('http://localhost/api/agent-trigger', {
      method: 'POST',
      body: JSON.stringify({ agent_key: 'tesla_agent', url: 'http://127.0.0.1/admin' }),
    }));

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://project.supabase.co/functions/v1/tesla-agent',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer user-token', apikey: 'anon-key' }),
      }),
    );
    expect(messageInsert).toHaveBeenCalledWith(expect.objectContaining({ status: 'processed' }));
  });

  it('returns 502 and records failure when the agent fails', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ error: 'Agent execution failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    ));

    const response = await POST(new Request('http://localhost/api/agent-trigger', {
      method: 'POST',
      body: JSON.stringify({ agent_key: 'tesla_agent' }),
    }));

    expect(response.status).toBe(502);
    expect(messageInsert).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });
});
