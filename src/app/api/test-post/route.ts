import { NextResponse } from 'next/server';

export async function POST() {
  console.log('[TEST] POST /api/test-post called successfully!');
  return NextResponse.json({ success: true, message: 'POST works!' });
}
