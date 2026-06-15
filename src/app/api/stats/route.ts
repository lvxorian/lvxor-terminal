import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = getSupabase()

    const [
      totalRes,
      newRes,
      zajimRes,
      nezajimRes,
      zavolatZpetRes,
      nevolatRes,
      spatnaDataRes,
      recentRes,
      callLogsRes,
    ] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'novy'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'zajim'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'nezajim'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'zavolat_zpet'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'nevolat'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'spatna_data'),
      supabase.from('leads').select('*').order('vytvoreno', { ascending: false }).limit(5),
      supabase
        .from('call_logs')
        .select('*')
        .gte('volano_dne', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ])

    const totalLeads = totalRes.count ?? 0
    const newLeads = newRes.count ?? 0
    const zajimLeads = zajimRes.count ?? 0
    const nezajimLeads = nezajimRes.count ?? 0
    const zavolatZpet = zavolatZpetRes.count ?? 0
    const nevolatLeads = nevolatRes.count ?? 0
    const spatnaData = spatnaDataRes.count ?? 0
    const recentLeads = recentRes.data ?? []
    const callLogsToday = callLogsRes.data ?? []

    const callsToday = callLogsToday.length
    const conversionsToday = callLogsToday.filter((l) => l.vysledek === 'zajim').length

    return NextResponse.json({
      totalLeads,
      newLeads,
      zajimLeads,
      nezajimLeads,
      zavolatZpet,
      nevolatLeads,
      spatnaData,
      callsToday,
      conversionsToday,
      recentLeads,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Stats API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}