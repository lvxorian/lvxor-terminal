import { NextResponse } from 'next/server'
import { startFirmyCzScrape } from '@/lib/apify'
import { getSupabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const { query, locality, category, maxResults } = await request.json()

  if (!query && !locality && (!category || category === 'all')) {
    return NextResponse.json(
      { error: 'Zadejte alespoň vyhledávaný výraz, lokalitu/kraj nebo kategorii' },
      { status: 400 }
    )
  }

  try {
    const { runId, datasetId } = await startFirmyCzScrape({
      searchQuery: query || '',
      location: locality || '',
      category: category || 'all',
      includeDetails: false,
      maxResults: maxResults || 200,
    })

    const region = locality?.split(/,\s*/).pop()?.trim() || null
    const town = locality?.split(/,\s*/)[0]?.trim() || null

    const supabase = getSupabase()
    const { data: logEntry, error: logError } = await supabase
      .from('scrape_logs')
      .insert({
        query: query || null,
        region,
        locality: town,
        category: category !== 'all' ? category : null,
        include_details: false,
        max_results: maxResults || 200,
        run_id: runId,
      })
      .select()
      .single()

    if (logError) {
      console.error('[Scrape] Failed to create scrape_log:', logError)
    }

    return NextResponse.json({ runId, datasetId, logId: logEntry?.id ?? null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}