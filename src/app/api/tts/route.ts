import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text');

  if (!text || !text.trim()) {
    return new NextResponse('Missing text parameter', { status: 400 });
  }

  // Return status 204 (No Content) indicating client-side synthesis is primary
  return new NextResponse(null, { status: 204 });
}
