import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(
  request: Request,
  context: RouteContext
) {
  const { id } = await context.params
  const updateData = await request.json()
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('leads')
    .update({ ...updateData, upraveno: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  const { id } = await context.params
  const supabase = getSupabase()

  const { error } = await supabase.from('leads').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}