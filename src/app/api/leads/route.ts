import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import type { LeadStatus } from '@/lib/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as LeadStatus | null
  const search = searchParams.get('search')

  const supabase = getSupabase()
  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('vytvoreno', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.or(`nazev_firmy.ilike.%${search}%,telefon.ilike.%${search}%,mesto.ilike.%${search}%,obor.ilike.%${search}%`)
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ leads: data, count })
}

export async function POST(request: Request) {
  const body = await request.json()

  const items = Array.isArray(body) ? body : [body]

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('leads')
    .insert(items)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}