import { NextResponse } from 'next/server';
import { createTestGraph } from '@/lib/graph';

export async function GET() {
  try {
    const graph = createTestGraph();
    const result = await graph.invoke({ input: 'Hello LangGraph' });
    
    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('LangGraph test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}