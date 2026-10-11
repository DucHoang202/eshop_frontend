import { NextRequest, NextResponse } from 'next/server';

const API = process.env.FOOD_HOME_API_URL || 'http://45.124.84.85:4000';

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!['login', 'register'].includes(action)) return NextResponse.json({ message: 'Invalid action' }, { status: 404 });
  try {
    const response = await fetch(`${API}/api/auth/${action}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: await request.text(), cache: 'no-store' });
    return new NextResponse(await response.text(), { status: response.status, headers: { 'content-type': response.headers.get('content-type') || 'application/json' } });
  } catch {
    return NextResponse.json({ message: 'Could not connect to the account service' }, { status: 502 });
  }
}
