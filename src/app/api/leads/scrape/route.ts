import { NextResponse } from 'next/server'
import { searchFirmyCz } from '@/lib/apify'
import { filterDuplicates } from '@/lib/utils'

export async function POST(request: Request) {
  const { query, locality, category, includeDetails, maxResults } = await request.json()

  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  try {
    const results = await searchFirmyCz({
      searchQuery: query,
      location: locality || '',
      category: category || 'all',
      includeDetails: includeDetails ?? true,
      maxResults: maxResults || 200,
    })

    const withoutWeb = results.filter(
      (r) => !r.webUrl || r.webUrl.trim() === ''
    )

    const itemsToCheck = withoutWeb.map((r) => ({
      nazev_firmy: r.name,
      telefon: r.telephone || null,
    }))

    const { newItems, duplicates } = await filterDuplicates(itemsToCheck)

    return NextResponse.json({
      total: results.length,
      withoutWeb: withoutWeb.length,
      newCount: newItems.length,
      duplicateCount: duplicates.length,
      results: results,
      newItems,
      duplicates,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}