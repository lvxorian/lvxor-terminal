import { getSupabase } from './supabase'
import type { Lead } from './types'

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null
  return phone.replace(/[\s\u00a0\-()]/g, '').replace(/^\+420/, '').replace(/^\+/, '')
}

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s\u00a0]+/g, ' ')
    .replace(/[.,\-–—]/g, '')
    .trim()
}

export async function findDuplicate(
  nazev_firmy: string,
  telefon: string | null
): Promise<Lead | null> {
  const supabase = getSupabase()
  if (telefon) {
    const normalized = normalizePhone(telefon)
    if (normalized && normalized.length >= 7) {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .ilike('telefon', `%${normalized.slice(-9)}%`)
        .limit(1)
      if (data && data.length > 0) return data[0] as Lead
    }
  }

  const normalizedName = normalizeCompanyName(nazev_firmy)
  if (normalizedName.length >= 3) {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .ilike('nazev_firmy', `%${normalizedName}%`)
      .limit(1)
    if (data && data.length > 0) return data[0] as Lead
  }

  return null
}

export async function filterDuplicates(
  items: { nazev_firmy: string; telefon: string | null }[]
): Promise<{ newItems: typeof items; duplicates: typeof items }> {
  if (items.length === 0) {
    return { newItems: [], duplicates: [] }
  }

  const supabase = getSupabase()

  const phones = items
    .map((item) => normalizePhone(item.telefon))
    .filter((p): p is string => p !== null && p.length >= 7)
    .map((p) => p.slice(-9))

  const names = items
    .map((item) => normalizeCompanyName(item.nazev_firmy))
    .filter((n) => n.length >= 3)

  const orConditions: string[] = []

  if (phones.length > 0) {
    orConditions.push(phones.map((p) => `telefon.ilike.%${p}%`).join(','))
  }
  if (names.length > 0) {
    orConditions.push(names.map((n) => `nazev_firmy.ilike.%${n}%`).join(','))
  }

  let existingLeads: Lead[] = []

  if (orConditions.length > 0) {
    const batchSize = 50
    for (let i = 0; i < phones.length; i += batchSize) {
      const phoneBatch = phones.slice(i, i + batchSize)
      const phoneFilter = phoneBatch.map((p) => `telefon.ilike.%${p}%`).join(',')
      const namesBatch = names.slice(i, i + batchSize)
      const nameFilter = namesBatch.map((n) => `nazev_firmy.ilike.%${n}%`).join(',')

      const orParts: string[] = []
      if (phoneFilter) orParts.push(phoneFilter)
      if (nameFilter) orParts.push(nameFilter)

      const { data } = await supabase
        .from('leads')
        .select('*')
        .or(orParts.join(','))

      if (data) existingLeads.push(...data)
    }
  }

  const isDuplicate = (item: { nazev_firmy: string; telefon: string | null }): boolean => {
    const normPhone = normalizePhone(item.telefon)
    const normName = normalizeCompanyName(item.nazev_firmy)

    return existingLeads.some((lead) => {
      if (normPhone && normPhone.length >= 7) {
        const leadPhone = normalizePhone(lead.telefon)
        if (leadPhone && leadPhone.includes(normPhone.slice(-9))) return true
      }
      if (normName.length >= 3) {
        const leadName = normalizeCompanyName(lead.nazev_firmy)
        if (leadName.includes(normName) || normName.includes(leadName)) return true
      }
      return false
    })
  }

  const newItems: typeof items = []
  const duplicates: typeof items = []

  for (const item of items) {
    if (isDuplicate(item)) {
      duplicates.push(item)
    } else {
      newItems.push(item)
    }
  }

  return { newItems, duplicates }
}

export function formatPhone(phone: string | null): string {
  if (!phone) return '—'
  const digits = phone.replace(/[\s\u00a0\-()]/g, '')
  if (digits.startsWith('+420') && digits.length === 12) {
    const n = digits.slice(3)
    return `+420 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  return phone
}

export function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}