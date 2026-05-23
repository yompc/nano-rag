import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Database } from '@cloudflare/workers-types';

export const dynamic = 'force-dynamic';

interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
}

export async function GET() {
  const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };
  
  if (!env.DB) {
    return NextResponse.json({ 
      error: 'D1 not bound',
      hint: 'Make sure wrangler.toml has [[d1_databases]] with binding="DB"'
    }, { status: 500 });
  }
  
  try {
    const result = await env.DB.prepare('SELECT 1 as test').first();
    
    const tables = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all<{ name: string }>();
    
    return NextResponse.json({ 
      status: 'connected',
      environment: env.ENVIRONMENT || 'development',
      testQuery: result,
      tables: tables.results.map(t => t.name)
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'D1 query failed', 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
