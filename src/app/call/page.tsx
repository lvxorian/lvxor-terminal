'use client'

import { useEffect, useState, Suspense, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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
  AlertCircle,
  Mail,
  Voicemail,
  Ban,
  GlobeLock,
  UserX,
  PartyPopper,
} from 'lucide-react'
import { formatPhone, phoneForTel, formatRating } from '@/lib/utils'
import {
  type Lead,
  type CallScript,
  type VysledekVolani,
  type LeadStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  VYSLEDEK_LABELS,
  VYSLEDEK_COLORS,
  VYSLEDEK_TO_STATUS,
  CALL_PRIORITY_ORDER,
} from '@/lib/types'

const VYSLEDEK_ICONS: Record<VysledekVolani, React.ReactNode> = {
  zajim: <CheckCircle size={16} />,
  nezajim: <XCircle size={16} />,
  zavolat_zpet: <RotateCcw size={16} />,
  nedostupny: <PhoneOff size={16} />,
  hlasova_schranka: <Voicemail size={16} />,
  spatne_cislo: <XCircle size={16} />,
  uz_maji_web: <GlobeLock size={16} />,
  nerozhodna_osoba: <UserX size={16} />,
  chce_info_mailem: <Mail size={16} />,
  nevolat_znovu: <Ban size={16} />,
}

const CONFETTI_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']

function useConfettiPieces() {
  const [pieces] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
      rotate: Math.random() * 360,
      isCircle: Math.random() > 0.5,
    }))
  )
  return pieces
}

function Confetti() {
  const pieces = useConfettiPieces()

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            top: '-20px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}

function CallModePage() {
  const searchParams = useSearchParams()
  const leadIdParam = searchParams.get('lead')
  const router = useRouter()

  const [allLeads, setAllLeads] = useState<Lead[]>([])
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
  const [selectedVysledek, setSelectedVysledek] = useState<VysledekVolani | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>('novy')
  const [showConfetti, setShowConfetti] = useState(false)

  const loadController = useRef<AbortController | null>(null)

  const loadData = useCallback(async () => {
    loadController.current?.abort()
    const controller = new AbortController()
    loadController.current = controller

    try {
      const [leadsRes, scriptsRes] = await Promise.all([
        fetch('/api/leads', { signal: controller.signal }),
        fetch('/api/scripts', { signal: controller.signal }),
      ])
      const leadsData = await leadsRes.json()
      const scriptsData = await scriptsRes.json()

      if (!controller.signal.aborted) {
        const all = (leadsData.leads ?? []) as Lead[]
        setAllLeads(all)
        setScripts(scriptsData ?? [])

        const defaultScript = (scriptsData ?? []).find((s: CallScript) => s.je_vychozi)
        if (defaultScript) {
          setActiveScript(defaultScript)
          setEditedContent(defaultScript.obsah)
        }

        if (leadIdParam) {
          const idx = all.findIndex((l: Lead) => l.id === leadIdParam)
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

  const callQueue = allLeads
    .filter((l) => CALL_PRIORITY_ORDER.includes(l.status as LeadStatus))
    .sort((a, b) => {
      const prioA = CALL_PRIORITY_ORDER.indexOf(a.status as LeadStatus)
      const prioB = CALL_PRIORITY_ORDER.indexOf(b.status as LeadStatus)
      if (prioA !== prioB) return prioA - prioB
      return new Date(a.vytvoreno).getTime() - new Date(b.vytvoreno).getTime()
    })

  const currentLead = leadIdParam
    ? allLeads.find((l) => l.id === leadIdParam)
    : (callQueue[currentIndex] as Lead | undefined)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (callActive && callStartTime) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [callActive, callStartTime])

  function startCall() {
    setCallActive(true)
    setCallStartTime(Date.now())
    setCallDuration(0)
    setNote('')
    setSelectedVysledek(null)
    setSelectedStatus('novy')
    setShowResult(true)
  }

  function selectVysledek(v: VysledekVolani) {
    setSelectedVysledek(v)
    setSelectedStatus(VYSLEDEK_TO_STATUS[v])
  }

  async function saveAndNext() {
    if (!currentLead || !selectedVysledek) return

    const duration = callDuration

    await fetch('/api/call-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: currentLead.id,
        script_id: activeScript?.id ?? null,
        vysledek: selectedVysledek,
        poznamka: note || null,
        delka_sekundy: duration,
      }),
    })

    await fetch(`/api/leads/${encodeURIComponent(currentLead.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: selectedStatus }),
    })

    setAllLeads((prev) => prev.map((l) => (l.id === currentLead.id ? { ...l, status: selectedStatus } : l)))

    resetCallState()

    if (leadIdParam) {
      router.push('/call')
      return
    }

    const nextIdx = currentIndex + 1
    if (nextIdx >= callQueue.length) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 6000)
    } else {
      setCurrentIndex(nextIdx)
    }
  }

  function goToPrev() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      resetCallState()
    }
  }

  function goToNext() {
    if (currentIndex < callQueue.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      resetCallState()
    }
  }

  function resetCallState() {
    setCallActive(false)
    setCallStartTime(null)
    setCallDuration(0)
    setShowResult(false)
    setNote('')
    setSelectedVysledek(null)
    setSelectedStatus('novy')
  }

  async function saveScript() {
    if (!activeScript) return
    const res = await fetch('/api/scripts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: activeScript.id,
        nazev: activeScript.nazev,
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  if (callQueue.length === 0) {
    return (
      <div className="text-center py-20">
        {showConfetti && <Confetti />}
        <PartyPopper size={48} className="mx-auto text-indigo-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {allLeads.length > 0 ? 'Gratulujeme! Obvolali jste všechny leady!' : 'Žádné leady k volání'}
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {allLeads.length > 0
            ? 'Všechny dostupné leady byly obvolány. Můžete přidat nové nebo se vrátit později.'
            : 'Nejsou žádné nové leady nebo leady k navázání kontaktu.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/leads/scrape"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            Hledat leady na Firmy.cz
          </Link>
          <Link
            href="/leads"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
          >
            Zobrazit všechny leady
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showConfetti && <Confetti />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Mode</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Lead {currentIndex + 1} z {callQueue.length}
            {currentLead && (
              <span className="ml-2 text-xs">
                ({STATUS_LABELS[currentLead.status]})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Předchozí lead"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex >= callQueue.length - 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Další lead"
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
                    <div className="flex items-center gap-2">
                      {currentLead.obor && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Building2 size={12} />
                          {currentLead.obor}
                        </span>
                      )}
                      {currentLead.rating !== null && currentLead.rating !== undefined && (
                        <span className="text-xs text-gray-500">
                          {formatRating(currentLead.rating, currentLead.rating_count)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[currentLead.status]}`}>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Telefon</p>
                    {currentLead.telefon ? (
                      <a
                        href={`tel:${phoneForTel(currentLead.telefon)}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 whitespace-nowrap"
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

                  {currentLead.ico && (
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">IČO</p>
                      <p className="text-sm text-gray-900">{currentLead.ico}</p>
                    </div>
                  )}

                  {currentLead.datova_schranka && (
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Datová schránka</p>
                      <p className="text-sm text-gray-900">{currentLead.datova_schranka}</p>
                    </div>
                  )}
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
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-base"
                  >
                    <Phone size={18} />
                    Zahájit hovor
                  </button>
                </div>
              ) : (
                <div className="px-5 py-4 border-t border-gray-100 space-y-5">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                      1. Jak dopadl hovor?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(VYSLEDEK_LABELS) as [VysledekVolani, string][]).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => selectVysledek(key)}
                          className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-white ${
                            selectedVysledek === key ? 'ring-2 ring-offset-2 ring-indigo-500' : ''
                          } ${VYSLEDEK_COLORS[key]}`}
                        >
                          {VYSLEDEK_ICONS[key]}
                          <span className="truncate">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedVysledek && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                        2. Nový status leadu
                      </p>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as LeadStatus)}
                        className={`w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${STATUS_COLORS[selectedStatus]}`}
                      >
                        {(Object.entries(STATUS_LABELS) as [LeadStatus, string][]).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-400 mt-1">
                        Předvyplněno podle výsledku hovoru, můžete změnit
                      </p>
                    </div>
                  )}

                  {selectedVysledek && (
                    <button
                      onClick={saveAndNext}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-base"
                    >
                      <CheckCircle size={18} />
                      Uložit a pokračovat
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-20 lg:top-6">
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