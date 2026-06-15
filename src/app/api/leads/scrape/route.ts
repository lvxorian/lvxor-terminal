import { NextResponse } from 'next/server'
import { searchFirmyCz } from '@/lib/apify'
import { filterDuplicates } from '@/lib/utils'

export async function POST(request: Request) {
  const { query, locality, maxItems } = await request.json()

  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  try {
    const results = await searchFirmyCz(query, locality || '', maxItems || 100)

    const withoutWeb = results.filter(
      (r) => !r.website || r.website.trim() === ''
    )

    const itemsToCheck = withoutWeb.map((r) => ({
      nazev_firmy: r.name,
      telefon: r.phone,
      email: r.email || null,
      web: r.website || null,
      mesto: r.city || null,
      obor: r.category || null,
      adresa: [r.street, r.postalCode, r.city].filter(Boolean).join(', ') || null,
      zdroj: 'firmy_cz' as const,
      status: 'novy' as const,
      scrapnuto_dne: new Date().toISOString(),
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