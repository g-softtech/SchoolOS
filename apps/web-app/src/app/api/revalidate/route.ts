import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify the REVALIDATION_SECRET to prevent unauthorized DoS purging
    const secret = req.headers.get('x-revalidation-secret');
    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse the payload to get the domain
    const body = await req.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json({ message: 'Domain is required' }, { status: 400 });
    }

    // 3. Invalidate the edge cache tag for this specific website domain
    const cacheTag = `website-${domain}`;
    revalidateTag(cacheTag);

    return NextResponse.json({ 
      revalidated: true, 
      now: Date.now(), 
      message: `Successfully revalidated tag: ${cacheTag}` 
    });

  } catch (err: any) {
    console.error('Revalidation error:', err);
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}
