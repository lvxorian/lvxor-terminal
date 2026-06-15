'use client'

import { useEffect, useState, Suspense, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Phone,
  PhoneOff,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  X,
  Save,
  RotateCcw,
  Globe,
  MapPin,
  Building2,
  MessageSquare,
  SkipForward,
  AlertCircle,
} from 'lucide-react'
import { formatPhone } from '@/lib/utils'
import { type Lead, type CallScript, type VysledekVolani, STATUS_LABELS } from '@/lib/types'

function CallModePage() {
  const searchParams = useSearchParams()
  const leadIdParam = searchParams.get('lead')

  const [leads, setLeads] = useState<Lead[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [scripts, setScripts] = useState<CallScript[]>([])
  const [activeScript, setActiveScript] = useState<CallScript | null>(null)
  const [editingScript, setEditingScript] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [callActive, setCallActive] = useState(false)
  const [callStartTime, setCallStartTime] = useState<number | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [note, setNote] = useState('')
  const [showResult, setShowResult] = useState(false)

  const loadController = useRef<AbortController | null>(null)

  const loadData = useCallback(async () => {
    loadController.current?.abort()
    const controller = new AbortController()
    loadController.current = controller

    try {
      const [leadsRes, scriptsRes] = await Promise.all([
        fetch(`/api/leads?status=novy`, { signal: controller.signal }),
        fetch('/api/scripts', { signal: controller.signal }),
      ])
      const leadsData = await leadsRes.json()
      const scriptsData = await scriptsRes.json()

      if (!controller.signal.aborted) {
        const novyLeads = (leadsData.leads ?? []).filter(
          (l: Lead) => l.status === 'novy' || l.status === 'zavolat_zpet'
        )
        setLeads(novyLeads)
        setScripts(scriptsData ?? [])

        const defaultScript = (scriptsData ?? []).find((s: CallScript) => s.je_vychozi)
        if (defaultScript) {
          setActiveScript(defaultScript)
          setEditedContent(defaultScript.obsah)
        }

        if (leadIdParam && novyLeads.length > 0) {
          const idx = novyLeads.findIndex((l: Lead) => l.id === leadIdParam)
          if (idx >= 0) setCurrentIndex(idx)
        }

        setLoading(false)
      }
    } catch {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [leadIdParam])

  useEffect(() => {
    void loadData() // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadData])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (callActive && callStartTime) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [callActive, callStartTime])

  const currentLead = leads[currentIndex] as Lead | undefined

  function startCall() {
    setCallActive(true)
    setCallStartTime(Date.now())
    setCallDuration(0)
    setNote('')
    setShowResult(true)
  }

  async function recordCallResult(vysledek: VysledekVolani) {
    if (!currentLead) return

    const duration = callActive ? Math.floor((Date.now() - (callStartTime ?? Date.now())) / 1000) : 0

    let newStatus: Lead['status']
    switch (vysledek) {
      case 'zajim': newStatus = 'zajim'; break
      case 'nezajim': newStatus = 'nezajim'; break
      case 'zavolat_zpet': newStatus = 'zavolat_zpet'; break
      case 'nedostupny': newStatus = 'vytoceno'; break
    }

    await fetch('/api/call-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: currentLead.id,
        script_id: activeScript?.id ?? null,
        vysledek,
        poznamka: note || null,
        delka_sekundy: duration,
      }),
    })

    await fetch(`/api/leads/${encodeURIComponent(currentLead.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    setCallActive(false)
    setCallStartTime(null)
    setCallDuration(0)
    setShowResult(false)
    setNote('')

    setLeads((prev) => prev.filter((_, i) => i !== currentIndex))
    if (currentIndex >= leads.length - 1) setCurrentIndex(0)
  }

  function skipLead() {
    const nextIdx = currentIndex + 1 < leads.length ? currentIndex + 1 : 0
    setCurrentIndex(nextIdx)
    resetCallState()
  }

  function prevLead() {
    const prevIdx = currentIndex > 0 ? currentIndex - 1 : leads.length - 1
    setCurrentIndex(prevIdx)
    resetCallState()
  }

  function resetCallState() {
    setCallActive(false)
    setCallStartTime(null)
    setCallDuration(0)
    setShowResult(false)
    setNote('')
  }

  async function saveScript() {
    if (!activeScript) return
    const res = await fetch('/api/scripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...activeScript,
        obsah: editedContent,
      }),
    })
    const updated = await res.json()
    setActiveScript(updated)
    setEditingScript(false)
    await loadData()
  }

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-64 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-20">
        <PhoneOff size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Žádné leady k volání</h2>
        <p className="text-gray-500 text-sm mb-6">
          Nejsou žádné nové leady nebo leady se statusem &quot;Zavolat zpět&quot;.
        </p>
        <a
          href="/leads/scrape"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          Hledat leady na Firmy.cz
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Mode</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Lead {currentIndex + 1} z {leads.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevLead}
            disabled={currentIndex === 0}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={skipLead}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <SkipForward size={14} />
            Přeskočit
          </button>
          <button
            onClick={skipLead}
            disabled={currentIndex >= leads.length - 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-4">
          {currentLead && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {currentLead.nazev_firmy}
                    </h2>
                    {currentLead.obor && (
                      <span className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Building2 size={12} />
                        {currentLead.obor}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      currentLead.status === 'novy' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {STATUS_LABELS[currentLead.status]}
                    </span>
                    {!currentLead.web && (
                      <span className="text-xs px-2.5 py-1 bg-red-50 text-red-700 rounded-full font-medium flex items-center gap-1">
                        <AlertCircle size={12} /> Bez webu
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Telefon</p>
                    {currentLead.telefon ? (
                      <a
                        href={`tel:${currentLead.telefon.replace(/\s/g, '')}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5"
                      >
                        <Phone size={14} />
                        {formatPhone(currentLead.telefon)}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-400">—</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Email</p>
                    <p className="text-sm text-gray-900">{currentLead.email ?? '—'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Město</p>
                    <p className="text-sm text-gray-900 flex items-center gap-1">
                      <MapPin size={13} className="text-gray-400" />
                      {currentLead.mesto ?? '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Web</p>
                    {currentLead.web ? (
                      <a
                        href={currentLead.web.startsWith('http') ? currentLead.web : `https://${currentLead.web}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                      >
                        <Globe size={13} />
                        {currentLead.web}
                      </a>
                    ) : (
                      <span className="text-sm text-red-600 font-medium">Nemá web</span>
                    )}
                  </div>
                </div>

                {currentLead.adresa && (
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Adresa</p>
                    <p className="text-sm text-gray-700">{currentLead.adresa}</p>
                  </div>
                )}

                {currentLead.kontaktni_osoba && (
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Kontaktní osoba</p>
                    <p className="text-sm text-gray-900">{currentLead.kontaktni_osoba}</p>
                  </div>
                )}

                {currentLead.poznamky && (
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Poznámky</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{currentLead.poznamky}</p>
                  </div>
                )}
              </div>

              {!showResult ? (
                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
                  <button
                    onClick={startCall}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Phone size={18} />
                    Zahájit hovor
                  </button>
                </div>
              ) : (
                <div className="px-5 py-4 border-t border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${callActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                      <span className="text-sm font-medium text-gray-700">
                        {callActive ? 'Hovor probíhá' : 'Hovor ukončen'}
                      </span>
                    </div>
                    <span className="text-lg font-mono font-bold text-gray-900">
                      {formatDuration(callDuration)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Poznámka k hovoru</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      placeholder="Poznámka z hovoru..."
                    />
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2">Výsledek hovoru</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => recordCallResult('zajim')}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle size={16} /> Zájem
                      </button>
                      <button
                        onClick={() => recordCallResult('nezajim')}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <XCircle size={16} /> Nezájem
                      </button>
                      <button
                        onClick={() => recordCallResult('zavolat_zpet')}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        <RotateCcw size={16} /> Zavolat zpět
                      </button>
                      <button
                        onClick={() => recordCallResult('nedostupny')}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <PhoneOff size={16} /> Nedostupný
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-6">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-indigo-600" />
                <h3 className="text-sm font-semibold text-gray-900">Call script</h3>
              </div>
              <button
                onClick={() => {
                  if (editingScript) {
                    setEditedContent(activeScript?.obsah ?? '')
                    setEditingScript(false)
                  } else {
                    setEditingScript(true)
                  }
                }}
                className="p-1.5 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                title={editingScript ? 'Zrušit úpravy' : 'Upravit script'}
              >
                {editingScript ? <X size={14} /> : <Pencil size={14} />}
              </button>
            </div>

            <div className="p-4">
              {editingScript ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Název scriptu</label>
                    <input
                      type="text"
                      value={activeScript?.nazev ?? ''}
                      onChange={(e) => setActiveScript(prev => prev ? { ...prev, nazev: e.target.value } : prev)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Obsah scriptu</label>
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      rows={12}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-mono"
                    />
                  </div>
                  <button
                    onClick={saveScript}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Save size={14} /> Uložit script
                  </button>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  {(activeScript?.obsah ?? '').split('\n').map((line, i) => (
                    <p key={i} className="text-sm text-gray-700 leading-relaxed mb-2">
                      {line || '\u00A0'}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {scripts.length > 1 && !editingScript && (
              <div className="px-4 pb-4">
                <label className="block text-xs text-gray-500 mb-1.5">Zvolit script</label>
                <select
                  value={activeScript?.id ?? ''}
                  onChange={(e) => {
                    const s = scripts.find((s) => s.id === e.target.value)
                    if (s) {
                      setActiveScript(s)
                      setEditedContent(s.obsah)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {scripts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nazev} {s.je_vychozi ? '(výchozí)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CallModePageWrapper() {
  return (
    <Suspense fallback={<div className="animate-pulse space-y-6"><div className="h-8 bg-gray-200 rounded w-48" /><div className="grid grid-cols-3 gap-6"><div className="col-span-2 h-64 bg-gray-200 rounded-xl" /><div className="h-64 bg-gray-200 rounded-xl" /></div></div>}>
      <CallModePage />
    </Suspense>
  )
}