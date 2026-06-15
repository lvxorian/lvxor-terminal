import { NextResponse } from 'next/server'
import { getRunStatus, getFirmyCzResults } from '@/lib/apify'
import { filterDuplicates } from '@/lib/utils'
import { getSupabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const runId = searchParams.get('runId')
  const datasetId = searchParams.get('datasetId')
  const logId = searchParams.get('logId')

  if (!runId || !datasetId) {
    return NextResponse.json(
      { status: 'error', error: 'runId and datasetId are required' },
      { status: 400 }
    )
  }

  try {
    const { status } = await getRunStatus(runId)

    if (status === 'RUNNING' || status === 'READY') {
      return NextResponse.json({ status: 'running' })
    }

    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT' || status === 'TIMING-OUT') {
      return NextResponse.json({ status: 'failed', error: `Scraper skončil se stavem: ${status}` })
    }

    if (status !== 'SUCCEEDED') {
      return NextResponse.json({ status: 'failed', error: `Neočekávaný stav scraperu: ${status}` })
    }

    const results = await getFirmyCzResults(datasetId)

    const withoutWeb = results.filter(
      (r) => !r.webUrl || r.webUrl.trim() === ''
    )

    const itemsToCheck = withoutWeb.map((r) => ({
      nazev_firmy: r.name,
      telefon: r.telephone || null,
    }))

    const { newItems, duplicates } = await filterDuplicates(itemsToCheck)

    console.log('[Scrape Status] Results:', results.length, 'withoutWeb:', withoutWeb.length, 'new:', newItems.length, 'dupes:', duplicates.length)

    if (logId) {
      const supabase = getSupabase()
      const { error: updateError } = await supabase
        .from('scrape_logs')
        .update({
          total_found: results.length,
          without_web: withoutWeb.length,
          new_leads: newItems.length,
          duplicates: duplicates.length,
        })
        .eq('id', logId)

      if (updateError) {
        console.error('[Scrape Status] Failed to update scrape_log:', updateError)
      }
    }

    return NextResponse.json({
      status: 'done',
      total: results.length,
      withoutWeb: withoutWeb.length,
      newCount: newItems.length,
      duplicateCount: duplicates.length,
      results,
      newItems,
      duplicates,
      logId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Scrape Status] Error:', message)
    return NextResponse.json({ status: 'error', error: message }, { status: 500 })
  }
}