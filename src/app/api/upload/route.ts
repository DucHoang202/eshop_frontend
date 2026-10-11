import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function POST(request: NextRequest) {
  const { name, type } = await request.json();
  if (!name || !type?.startsWith('image/')) return NextResponse.json({ message: 'Please choose a valid image file' }, { status: 400 });
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME = 'freshmart-assets', R2_PUBLIC_DOMAIN = 'www.webcuatoi.io.vn' } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return NextResponse.json({ message: 'R2 image upload is not configured' }, { status: 503 });
  const client = new S3Client({ region: 'auto', endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY } });
  const safeName = String(name).replace(/[^a-zA-Z0-9._-]/g, '-').slice(-100);
  const key = `products/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;
  const command = new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, ContentType: type });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  return NextResponse.json({ uploadUrl, imageKey: key, imageUrl: `https://${R2_PUBLIC_DOMAIN}/${key}` });
}
