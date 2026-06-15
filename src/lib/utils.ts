import { supabase } from './supabase'
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
  const newItems: typeof items = []
  const duplicates: typeof items = []

  for (const item of items) {
    const existing = await findDuplicate(item.nazev_firmy, item.telefon)
    if (existing) {
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