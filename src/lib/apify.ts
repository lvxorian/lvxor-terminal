const APIFY_TOKEN = process.env.APIFY_API_TOKEN!
const ACTOR_ID = 'solidcode~firmy-search-scraper'
const APIFY_BASE = 'https://api.apify.com/v2'

import type { FirmyCzResult } from './types'

type ApifyRunStatus = 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTED' | 'TIMED-OUT' | 'TIMING-OUT'

interface ApifyRunResponse {
  data: {
    id: string
    defaultDatasetId: string
    status: ApifyRunStatus
  }
}

export async function startFirmyCzScrape(params: {
  searchQuery?: string
  location?: string
  category?: string
  includeDetails?: boolean
  maxResults?: number
}): Promise<{ runId: string; datasetId: string }> {
  const {
    searchQuery = '',
    location = '',
    category = 'all',
    includeDetails = false,
    maxResults = 200,
  } = params

  if (!searchQuery && !location && category === 'all') {
    throw new Error('Zadejte alespoň vyhledávaný výraz, lokalitu nebo kategorii')
  }

  if (!APIFY_TOKEN) {
    throw new Error('APIFY_API_TOKEN není nastaven v environment variables')
  }

  const startUrl = `${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`

  const payload = {
    searchUrls: [],
    searchQuery,
    location,
    category,
    includeDetails,
    maxResults,
  }

  console.log('[Apify] Starting scrape with payload:', JSON.stringify(payload))

  const response = await fetch(startUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[Apify] Start failed:', response.status, text)
    throw new Error(`Apify run failed: ${response.status} ${response.statusText} — ${text}`)
  }

  const runData: ApifyRunResponse = await response.json()
  console.log('[Apify] Run started:', runData.data.id, 'datasetId:', runData.data.defaultDatasetId, 'status:', runData.data.status)

  return {
    runId: runData.data.id,
    datasetId: runData.data.defaultDatasetId,
  }
}

export async function getRunStatus(runId: string): Promise<{ status: ApifyRunStatus; stats?: { itemsCount: number } }> {
  if (!APIFY_TOKEN) {
    throw new Error('APIFY_API_TOKEN není nastaven')
  }

  const url = `${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`
  console.log('[Apify] Checking status for run:', runId)

  const response = await fetch(url)

  if (!response.ok) {
    const text = await response.text()
    console.error('[Apify] Status check failed:', response.status, text)
    throw new Error(`Failed to check run status: ${response.status}`)
  }

  const data = await response.json()
  const status = data?.data?.status
  const itemsCount = data?.data?.stats?.inputBodyLen ?? 0

  if (!status) {
    console.error('[Apify] Unexpected status response:', JSON.stringify(data).slice(0, 500))
    throw new Error('Neočekávaná odpověď z Apify API')
  }

  console.log('[Apify] Run status:', status)

  return {
    status: status as ApifyRunStatus,
    stats: { itemsCount },
  }
}

export async function getFirmyCzResults(datasetId: string): Promise<FirmyCzResult[]> {
  if (!APIFY_TOKEN) {
    throw new Error('APIFY_API_TOKEN není nastaven')
  }

  const url = `${APIFY_BASE}/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true&limit=10000`
  console.log('[Apify] Fetching results from dataset:', datasetId)

  const response = await fetch(url)

  if (!response.ok) {
    const text = await response.text()
    console.error('[Apify] Dataset fetch failed:', response.status, text)
    throw new Error(`Failed to fetch dataset: ${response.status}`)
  }

  const items = await response.json()
  if (!Array.isArray(items)) {
    console.error('[Apify] Unexpected dataset response:', typeof items, JSON.stringify(items).slice(0, 200))
    return []
  }

  console.log('[Apify] Fetched', items.length, 'items from dataset')
  return items.map(normalizeItem)
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