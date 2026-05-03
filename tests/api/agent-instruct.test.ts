import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextResponse } from 'next/server';
import { POST as agentInstructPOST } from '../src/app/api/agent-instruct/route';

// Mock dependencies
jest.mock('../src/lib/ai/router', () => ({
  callAiRouterWithRetry: jest.fn(),
}));

jest.mock('../src/lib/supabase-server', () => ({
  createServerSupabaseClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: {
        company_id: 'company-1',
        role: 'admin',
      },
    }),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
  })),
}));

describe('Agent Instruct API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 for unauthorized user', async () => {
    const { createServerSupabaseClient } = require('../src/lib/supabase-server');
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const req = new Request('http://localhost/api/agent-instruct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction: 'test', target_agent: 'german_agent' }),
    });

    const res = await agentInstructPOST(req);
    expect(res.status).toBe(401);
  });

  it('should return 400 for missing instruction or target_agent', async () => {
    const req = new Request('http://localhost/api/agent-instruct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ }),
    });

    const res = await agentInstructPOST(req);
    expect(res.status).toBe(400);
  });

  it('should return 404 for missing agents', async () => {
    const { createServerSupabaseClient } = require('../src/lib/supabase-server');
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
    });

    const req = new Request('http://localhost/api/agent-instruct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction: 'test', target_agent: 'nonexistent' }),
    });

    const res = await agentInstructPOST(req);
    expect(res.status).toBe(404);
  });

  it('should succeed with valid data', async () => {
    const { callAiRouterWithRetry } = require('../src/lib/ai/router');
    (callAiRouterWithRetry as jest.Mock).mockResolvedValueOnce({
      success: true,
      model: 'claude-3-haiku-20240307',
    });

    const req = new Request('http://localhost/api/agent-instruct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction: 'test', target_agent: 'german_agent' }),
    });

    const res = await agentInstructPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
