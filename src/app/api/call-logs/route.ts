import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const body = await request.json()
  const supabase = getSupabase()

  if (!body.lead_id || !body.vysledek) {
    return NextResponse.json(
      { error: 'lead_id and vysledek are required' },
      { status: 400 }
    )
  }

  const validVysledky = [
    'zajim', 'nezajim', 'zavolat_zpet', 'nedostupny',
    'hlasova_schranka', 'spatne_cislo', 'uz_maji_web',
    'nerozhodna_osoba', 'chce_info_mailem', 'nevolat_znovu'
  ]

  if (!validVysledky.includes(body.vysledek)) {
    return NextResponse.json(
      { error: `vysledek must be one of: ${validVysledky.join(', ')}` },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('call_logs')
    .insert({
      lead_id: body.lead_id,
      script_id: body.script_id || null,
      vysledek: body.vysledek,
      poznamka: body.poznamka || null,
      delka_sekundy: body.delka_sekundy || 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}