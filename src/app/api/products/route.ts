import { NextRequest, NextResponse } from 'next/server';

const API = process.env.FOOD_HOME_API_URL || 'http://45.124.84.85:4000';

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path') || '/api/products';
  if (!path.startsWith('/api/products')) return NextResponse.json({ message: 'Invalid path' }, { status: 400 });
  const query = new URL(request.url).searchParams;
  query.delete('path');
  try {
    const response = await fetch(`${API}${path}${query.size ? `?${query}` : ''}`, { cache: 'no-store' });
    return new NextResponse(await response.text(), { status: response.status, headers: { 'content-type': response.headers.get('content-type') || 'application/json' } });
  } catch {
    return NextResponse.json({ message: 'Could not connect to the products API' }, { status: 502 });
  }
}

export async function POST(request: NextRequest) { return forward(request, 'POST'); }
export async function PUT(request: NextRequest) { return forward(request, 'PUT'); }
export async function PATCH(request: NextRequest) { return forward(request, 'PATCH'); }
export async function DELETE(request: NextRequest) { return forward(request, 'DELETE'); }

async function forward(request: NextRequest, method: string) {
  const path = request.nextUrl.searchParams.get('path') || '/api/products';
  if (!path.startsWith('/api/products')) return NextResponse.json({ message: 'Invalid path' }, { status: 400 });
  const headers: HeadersInit = { 'content-type': 'application/json' };
  const auth = request.headers.get('authorization');
  if (auth) headers.authorization = auth;
  try {
    const response = await fetch(`${API}${path}`, { method, headers, body: method === 'DELETE' ? undefined : await request.text(), cache: 'no-store' });
    return new NextResponse(await response.text(), { status: response.status, headers: { 'content-type': response.headers.get('content-type') || 'application/json' } });
  } catch {
    return NextResponse.json({ message: 'Could not connect to the products API' }, { status: 502 });
  }
}
