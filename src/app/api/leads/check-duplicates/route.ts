import { NextResponse } from 'next/server'
import { filterDuplicates } from '@/lib/utils'

export async function POST(request: Request) {
  const { items } = await request.json()

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'items must be an array' }, { status: 400 })
  }

  const { newItems, duplicates } = await filterDuplicates(items)

  return NextResponse.json({
    newItems: newItems.length,
    duplicates: duplicates.length,
    duplicateDetails: duplicates,
  })
}