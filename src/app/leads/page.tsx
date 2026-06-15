'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Filter,
  Phone,
  Globe,
  MapPin,
  ChevronDown,
  Trash2,
  Users,
} from 'lucide-react'
import { type Lead, type LeadStatus, STATUS_LABELS, STATUS_COLORS } from '@/lib/types'
import { formatPhone } from '@/lib/utils'

const statuses: LeadStatus[] = ['novy', 'vytoceno', 'zajim', 'nezajim', 'zavolat_zpet', 'nevolat', 'spatna_data']

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('')
  const [showFilter, setShowFilter] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const loadLeads = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (search) params.set('search', search)

    try {
      const res = await fetch(`/api/leads?${params.toString()}`, { signal: controller.signal })
      const data = await res.json()
      if (!controller.signal.aborted) {
        setLeads(data.leads ?? [])
        setLoading(false)
      }
    } catch {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    loadLeads() // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadLeads])

  async function deleteLead(id: string) {
    if (!confirm('Opravdu chcete smazat tento lead?')) return
    await fetch(`/api/leads/${encodeURIComponent(id)}`, { method: 'DELETE' })
    setLeads((prev) => prev.filter((l) => l.id !== id))
  }

  async function updateStatus(id: string, status: LeadStatus) {
    await fetch(`/api/leads/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leady</h1>
          <p className="text-sm text-gray-500 mt-1">
            Celkem {leads.length} leadů
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/leads/scrape"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Search size={16} />
            Hledat na Firmy.cz
          </Link>
          <Link
            href="/leads/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={16} />
            Přidat lead
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Hledat podle názvu, telefonu, města..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Filter size={16} />
            {statusFilter ? STATUS_LABELS[statusFilter] : 'Všechny stavy'}
            <ChevronDown size={14} />
          </button>
          {showFilter && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              <button
                onClick={() => { setStatusFilter(''); setShowFilter(false) }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Všechny stavy
              </button>
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setShowFilter(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className={`w-2 h-2 rounded-full ${
                    s === 'novy' ? 'bg-blue-500' :
                    s === 'vytoceno' ? 'bg-yellow-500' :
                    s === 'zajim' ? 'bg-green-500' :
                    s === 'nezajim' ? 'bg-red-500' :
                    s === 'zavolat_zpet' ? 'bg-orange-500' :
                    s === 'nevolat' ? 'bg-purple-500' :
                    'bg-gray-500'
                  }`} />
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Žádné leady k zobrazení</p>
          <Link
            href="/leads/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
          >
            <Plus size={16} /> Přidat první lead
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Firma
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Telefon
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Město
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Web
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Zdroj
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Akce
                  </th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-gray-900">
                        {lead.nazev_firmy}
                      </div>
                      {lead.obor && (
                        <div className="text-xs text-gray-500 mt-0.5">{lead.obor}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.telefon ? (
                        <a
                          href={`tel:${lead.telefon.replace(/\s/g, '')}`}
                          className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                          <Phone size={13} />
                          {formatPhone(lead.telefon)}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        {lead.mesto ? <><MapPin size={13} />{lead.mesto}</> : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.web ? (
                        <a
                          href={lead.web.startsWith('http') ? lead.web : `https://${lead.web}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                        >
                          <Globe size={13} />
                          {new URL(lead.web.startsWith('http') ? lead.web : `https://${lead.web}`).hostname}
                        </a>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-medium">
                          Bez webu
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {lead.zdroj === 'firmy_cz' ? 'Firmy.cz' : lead.zdroj === 'ares' ? 'ARES' : 'Ruční'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[lead.status]}`}
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/call?lead=${lead.id}`}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                          title="Volat"
                        >
                          <Phone size={15} />
                        </Link>
                        <button
                          onClick={() => deleteLead(lead.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                          title="Smazat"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}