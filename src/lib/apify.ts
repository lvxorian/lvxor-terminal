const APIFY_TOKEN = process.env.APIFY_API_TOKEN!
const ACTOR_ID = 'solidcode~firmy-search-scraper'
const APIFY_BASE = 'https://api.apify.com/v2'

interface ApifyRunResponse {
  data: {
    id: string
    defaultDatasetId: string
    status: string
  }
}

import type { FirmyCzResult } from './types'

export async function searchFirmyCz(params: {
  searchQuery: string
  location?: string
  category?: string
  includeDetails?: boolean
  maxResults?: number
}): Promise<FirmyCzResult[]> {
  const {
    searchQuery,
    location = '',
    category = 'all',
    includeDetails = true,
    maxResults = 200,
  } = params

  const startUrl = `${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`

  const response = await fetch(startUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchUrls: [],
      searchQuery,
      location,
      category,
      includeDetails,
      maxResults,
    }),
  })

  if (!response.ok) {
    throw new Error(`Apify run failed: ${response.status} ${response.statusText}`)
  }

  const runData: ApifyRunResponse = await response.json()
  const datasetId = runData.data.defaultDatasetId

  return pollDataset(datasetId)
}

async function pollDataset(
  datasetId: string,
  maxAttempts: number = 120,
  intervalMs: number = 3000
): Promise<FirmyCzResult[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const url = `${APIFY_BASE}/datasets/${datasetId}/items?token=${APIFY_TOKEN}&status=ready&clean=true`
    const response = await fetch(url)

    if (response.ok) {
      const items = await response.json()
      if (Array.isArray(items) && items.length > 0) {
        return items.map(normalizeItem)
      }
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error('Timeout waiting for Apify results')
}

function normalizeItem(item: Record<string, unknown>): FirmyCzResult {
  return {
    premiseId: String(item.premiseId ?? ''),
    name: String(item.name ?? ''),
    telephone: item.telephone ? String(item.telephone) : null,
    email: item.email ? String(item.email) : null,
    webUrl: item.webUrl ? String(item.webUrl) : null,
    streetAddress: item.streetAddress ? String(item.streetAddress) : null,
    locality: item.locality ? String(item.locality) : null,
    postalCode: item.postalCode ? String(item.postalCode) : null,
    category: (typeof item.category === 'string' ? item.category : null) ?? (Array.isArray(item.categories) && item.categories.length > 0 ? String(item.categories[0]) : null),
    categories: Array.isArray(item.categories) ? item.categories.map(String) : null,
    ratingValue: typeof item.ratingValue === 'number' ? item.ratingValue : null,
    ratingCount: typeof item.ratingCount === 'number' ? item.ratingCount : null,
    reviewCount: typeof item.reviewCount === 'number' ? item.reviewCount : null,
    openingHours: item.openingHours && typeof item.openingHours === 'object' ? item.openingHours as Record<string, string> : null,
    openingInfo: item.openingInfo ? String(item.openingInfo) : null,
    description: item.description ? String(item.description) : null,
    businessDescription: item.businessDescription ? String(item.businessDescription) : null,
    ico: item.ico ? String(item.ico) : null,
    dataBoxId: item.dataBoxId ? String(item.dataBoxId) : null,
    latitude: typeof item.latitude === 'number' ? item.latitude : null,
    longitude: typeof item.longitude === 'number' ? item.longitude : null,
    detailPageUrl: item.detailPageUrl ? String(item.detailPageUrl) : null,
  }
}