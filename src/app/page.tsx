'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  UserPlus,
  Phone,
  Star,
  XCircle,
  RotateCcw,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { STATUS_LABELS, type Lead } from '@/lib/types'
import { formatPhone } from '@/lib/utils'

interface Stats {
  totalLeads: number
  newLeads: number
  zajimLeads: number
  nezajimLeads: number
  zavolatZpet: number
  callsToday: number
  conversionsToday: number
  recentLeads: Lead[]
}

const statCards = [
  { key: 'newLeads' as const, label: 'Nové leady', icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'callsToday' as const, label: 'Hovory dnes', icon: Phone, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { key: 'conversionsToday' as const, label: 'Zájmy dnes', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  { key: 'zavolatZpet' as const, label: 'Zavolat zpět', icon: RotateCcw, color: 'text-orange-600', bg: 'bg-orange-50' },
  { key: 'zajimLeads' as const, label: 'Celkem zájem', icon: Star, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'nezajimLeads' as const, label: 'Celkem nezájem', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return <div className="text-red-600">Chyba při načítání statistik.</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Přehled LVXOR DESIGN Terminal</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/leads/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <UserPlus size={16} />
            Přidat lead
          </Link>
          <Link
            href="/call"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Phone size={16} />
            Call Mode
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(({ key, label, icon: Icon, color, bg }) => (
          <div
            key={key}
            className={`${bg} rounded-xl p-5 border border-gray-100`}
          >
            <div className="flex items-center justify-between mb-3">
              <Icon size={20} className={color} />
              <span className={`text-2xl font-bold ${color}`}>
                {(stats[key as keyof Stats] as number) ?? 0}
              </span>
            </div>
            <p className="text-sm text-gray-600 font-medium">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Poslední leady</h2>
            <Link
              href="/leads"
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Všechny <ArrowRight size={14} />
            </Link>
          </div>
          {stats.recentLeads.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Zatím žádné leady</p>
          ) : (
            <div className="space-y-3">
              {stats.recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {lead.nazev_firmy}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatPhone(lead.telefon)}
                      {lead.mesto && <span> · {lead.mesto}</span>}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      lead.status === 'novy'
                        ? 'bg-blue-100 text-blue-800'
                        : lead.status === 'zajim'
                        ? 'bg-green-100 text-green-800'
                        : lead.status === 'nezajim'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {STATUS_LABELS[lead.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Rychlé akce</h2>
          <div className="space-y-3">
            <Link
              href="/leads/scrape"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
            >
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Users size={18} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Hledat na Firmy.cz</p>
                <p className="text-xs text-gray-500">Najdi firmy bez webu</p>
              </div>
            </Link>
            <Link
              href="/leads/new"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50/50 transition-colors"
            >
              <div className="p-2 bg-green-100 rounded-lg">
                <UserPlus size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Přidat lead ručně</p>
                <p className="text-xs text-gray-500">Zadej informace o firmě</p>
              </div>
            </Link>
            <Link
              href="/call"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 transition-colors"
            >
              <div className="p-2 bg-orange-100 rounded-lg">
                <Phone size={18} className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Začít volat</p>
                <p className="text-xs text-gray-500">Otevři Call Mode</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}