import { NextResponse } from 'next/server'
import { startFirmyCzScrape } from '@/lib/apify'

export async function POST(request: Request) {
  const { query, locality, category, includeDetails, maxResults } = await request.json()

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
      includeDetails: includeDetails ?? true,
      maxResults: maxResults || 200,
    })

    return NextResponse.json({ runId, datasetId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}