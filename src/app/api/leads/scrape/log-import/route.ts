import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const { logId, imported } = await request.json()

  if (!logId || typeof imported !== 'number') {
    return NextResponse.json({ error: 'logId and imported are required' }, { status: 400 })
  }

  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('scrape_logs')
      .update({ imported })
      .eq('id', logId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}