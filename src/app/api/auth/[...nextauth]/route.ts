import { NextResponse } from 'next/server';

function retired() {
  return NextResponse.json(
    { error: 'This authentication endpoint has been retired. Use Supabase authentication.' },
    { status: 410 },
  );
}

export const GET = retired;
export const POST = retired;
