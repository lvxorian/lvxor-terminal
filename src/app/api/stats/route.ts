import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const [
    { count: totalLeads },
    { count: newLeads },
    { count: zajimLeads },
    { count: nezajimLeads },
    { count: zavolatZpet },
    { data: recentLeads },
    { data: callLogsToday },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'novy'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'zajim'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'nezajim'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'zavolat_zpet'),
    supabase.from('leads').select('*').order('vytvoreno', { ascending: false }).limit(5),
    supabase
      .from('call_logs')
      .select('*')
      .gte('volano_dne', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
  ])

  const callsToday = callLogsToday?.length ?? 0
  const conversionsToday =
    callLogsToday?.filter((l) => l.vysledek === 'zajim').length ?? 0

  return NextResponse.json({
    totalLeads: totalLeads ?? 0,
    newLeads: newLeads ?? 0,
    zajimLeads: zajimLeads ?? 0,
    nezajimLeads: nezajimLeads ?? 0,
    zavolatZpet: zavolatZpet ?? 0,
    callsToday,
    conversionsToday,
    recentLeads: recentLeads ?? [],
  })
}