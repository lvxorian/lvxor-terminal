'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  Download,
  XCircle,
  Phone,
  MapPin,
  Filter,
  Map,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { type FirmyCzResult, FIRMY_CZ_CATEGORIES, CZ_REGIONS } from '@/lib/types'
import { formatPhone } from '@/lib/utils'

type ScrapePhase = 'idle' | 'starting' | 'running' | 'done' | 'error'

export default function ScrapePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('')
  const [locality, setLocality] = useState('')
  const [category, setCategory] = useState('all')
  const [includeDetails, setIncludeDetails] = useState(true)
  const [maxResults, setMaxResults] = useState(200)
  const [phase, setPhase] = useState<ScrapePhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [results, setResults] = useState<FirmyCzResult[]>([])
  const [withoutWeb, setWithoutWeb] = useState<FirmyCzResult[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    total: number
    withoutWeb: number
    newCount: number
    duplicateCount: number
  } | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const MAX_POLL_SECONDS = 600

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()

    const canSearch = !!(query.trim() || region || locality || (category && category !== 'all'))
    if (!canSearch) return

    setPhase('starting')
    setError(null)
    setImportResult(null)
    setResults([])
    setWithoutWeb([])
    setSelected(new Set())
    setElapsed(0)

    const locationValue = region && locality
      ? `${locality}, ${region}`
      : region || locality || ''

    let runId = ''
    let datasetId = ''

    try {
      const res = await fetch('/api/leads/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query || '',
          locality: locationValue,
          category,
          includeDetails,
          maxResults,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setPhase('error')
        setError(data.error ?? `Chyba serveru (${res.status})`)
        return
      }

      runId = data.runId
      datasetId = data.datasetId

      if (!runId || !datasetId) {
        setPhase('error')
        setError('Scraper nevrátil platné ID. Zkuste to prosím znovu.')
        return
      }

      setPhase('running')

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1
          if (next >= MAX_POLL_SECONDS) {
            clearTimers()
            setPhase('error')
            setError('Scraper běží příliš dlouho (více než 10 minut). Zkuste menší počet výsledků.')
          }
          return next
        })
      }, 1000)

      let pollFailCount = 0

      const poll = async () => {
        try {
          const statusRes = await fetch(`/api/leads/scrape/status?runId=${encodeURIComponent(runId)}&datasetId=${encodeURIComponent(datasetId)}`)

          if (!statusRes.ok) {
            pollFailCount++
            if (pollFailCount >= 5) {
              clearTimers()
              setPhase('error')
              setError(`Status check selhal (${statusRes.status}). Zkuste to prosím znovu.`)
            }
            return
          }

          const statusData = await statusDataSafe(statusRes)
          if (!statusData) {
            pollFailCount++
            if (pollFailCount >= 5) {
              clearTimers()
              setPhase('error')
              setError('Nepodařilo se přečíst odpověď ze serveru.')
            }
            return
          }

          pollFailCount = 0

          if (statusData.status === 'running') return

          clearTimers()

          if (statusData.status === 'failed') {
            setPhase('error')
            setError(statusData.error ?? 'Scraper selhal')
            return
          }

          if (statusData.status === 'error') {
            setPhase('error')
            setError(statusData.error ?? 'Neočekávaná chyba')
            return
          }

          if (statusData.status !== 'done') {
            setPhase('error')
            setError(`Neočekávaný stav: ${statusData.status}`)
            return
          }

          const fetchedResults = statusData.results ?? []
          const noWeb = fetchedResults.filter(
            (r: FirmyCzResult) => !r.webUrl || r.webUrl.trim() === ''
          )
          setResults(fetchedResults)
          setWithoutWeb(noWeb)
          setSelected(new Set(noWeb.map((r: FirmyCzResult) => r.premiseId)))
          setImportResult({
            total: statusData.total ?? fetchedResults.length,
            withoutWeb: statusData.withoutWeb ?? noWeb.length,
            newCount: statusData.newCount ?? 0,
            duplicateCount: statusData.duplicateCount ?? 0,
          })
          setPhase('done')
        } catch (err) {
          pollFailCount++
          if (pollFailCount >= 5) {
            clearTimers()
            setPhase('error')
            setError(err instanceof Error ? err.message : 'Chyba při dotazování na výsledky')
          }
        }
      }

      pollRef.current = setInterval(poll, 3000)
      poll()
    } catch (err) {
      setPhase('error')
      setError(err instanceof Error ? err.message : 'Neznámá chyba')
    }
  }

  async function statusDataSafe(res: Response) {
    try {
      return await res.json()
    } catch {
      return null
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(withoutWeb.map((r) => r.premiseId)))
  }

  function deselectAll() {
    setSelected(new Set())
  }

  async function handleImport() {
    if (selected.size === 0) return

    setImporting(true)
    try {
      const itemsToImport = withoutWeb
        .filter((r) => selected.has(r.premiseId))
        .map((r) => ({
          nazev_firmy: r.name,
          telefon: r.telephone || null,
          email: r.email || null,
          web: r.webUrl || null,
          mesto: r.locality || null,
          obor: r.category || (r.categories && r.categories.length > 0 ? r.categories[0] : null) || null,
          adresa: [r.streetAddress, r.postalCode, r.locality].filter(Boolean).join(', ') || null,
          ico: r.ico || null,
          datova_schranka: r.dataBoxId || null,
          rating: r.ratingValue ?? null,
          rating_count: r.ratingCount ?? null,
          zdroj: 'firmy_cz' as const,
          status: 'novy' as const,
          scrapnuto_dne: new Date().toISOString(),
        }))

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemsToImport),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Chyba při importu')
        return
      }

      router.push('/leads')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba')
    } finally {
      setImporting(false)
    }
  }

  function resetSearch() {
    clearTimers()
    setPhase('idle')
    setError(null)
    setResults([])
    setWithoutWeb([])
    setSelected(new Set())
    setImportResult(null)
    setElapsed(0)
  }

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const canSearch = !!(query.trim() || region || locality || (category && category !== 'all'))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/leads" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hledat na Firmy.cz</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Najdi firmy bez webu a přidej je jako leady
          </p>
        </div>
      </div>

      {(phase === 'idle' || phase === 'error') && (
        <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Hledaný výraz
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Klíčové slovo (např. instalatér, zubař...)"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Nechte prázdné pro vyhledání pouze podle kategorie/kraje</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Kraj
              </label>
              <div className="relative">
                <Map size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                >
                  {CZ_REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Město / Lokalita
              </label>
              <input
                type="text"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Konkrétní město (např. Brno, Ostrava)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Kategorie oboru
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {FIRMY_CZ_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Max:</label>
                <select
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDetails}
                  onChange={(e) => setIncludeDetails(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">IČO, email, DS</span>
              </label>
            </div>
            <button
              type="submit"
              disabled={!canSearch}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Search size={16} />
              Hledat na Firmy.cz
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Používá Apify scraper ($4 za 1 000 výsledků). Vyhledávání běží asynchronně — stránka se aktualizuje automaticky.
          </p>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 mt-4">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Chyba</p>
                <p className="text-sm mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </form>
      )}

      {phase === 'starting' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Loader2 size={48} className="mx-auto text-indigo-600 animate-spin mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Spouštím scraper...</h2>
          <p className="text-sm text-gray-500">Odesílám požadavek na Apify</p>
        </div>
      )}

      {phase === 'running' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Loader2 size={48} className="mx-auto text-indigo-600 animate-spin mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Prohledávám Firmy.cz...
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {maxResults <= 100
              ? 'Stahuji výsledky, chvíli to potrvá...'
              : maxResults <= 200
                ? 'Stahuji výsledky, může to trvat 1–3 minuty...'
                : 'Stahuji větší objem dat, může to trvat 3–5 minut...'}
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-gray-400 mb-4">
            <Clock size={14} />
            Uplynulo: {formatElapsed(elapsed)}
          </div>
          <div>
            <button
              onClick={resetSearch}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Zrušit
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && importResult && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{importResult.total}</p>
              <p className="text-xs text-gray-500 mt-1">Celkem nalezeno</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{importResult.withoutWeb}</p>
              <p className="text-xs text-gray-500 mt-1">Bez webu</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{importResult.newCount}</p>
              <p className="text-xs text-gray-500 mt-1">Nové leady</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{importResult.duplicateCount}</p>
              <p className="text-xs text-gray-500 mt-1">Duplicity odfiltrovány</p>
            </div>
          </div>

          {withoutWeb.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">
                    Firmy bez webu ({withoutWeb.length})
                  </span>
                  <span className="text-xs text-gray-500">
                    Vybrané: {selected.size}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Vybrat vše
                  </button>
                  <button
                    onClick={deselectAll}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Zrušit výběr
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {withoutWeb.map((result) => (
                  <label
                    key={result.premiseId}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selected.has(result.premiseId) ? 'bg-indigo-50/50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(result.premiseId)}
                      onChange={() => toggleSelect(result.premiseId)}
                      className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {result.name}
                        </p>
                        <XCircle size={14} className="text-red-500 shrink-0" />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        {result.telephone && (
                          <span className="flex items-center gap-1">
                            <Phone size={11} /> {formatPhone(result.telephone)}
                          </span>
                        )}
                        {result.locality && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} /> {result.locality}
                          </span>
                        )}
                        {result.category && <span>{result.category}</span>}
                        {result.ico && <span>IČO: {result.ico}</span>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {selected.size} vybraných leadů k importu
                </p>
                <button
                  onClick={handleImport}
                  disabled={importing || selected.size === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download size={16} />
                  {importing ? 'Importuji...' : `Importovat ${selected.size} leadů`}
                </button>
              </div>
            </div>
          )}

          {results.length > 0 && withoutWeb.length === 0 && (
            <div className="text-center py-8 bg-green-50 rounded-xl border border-green-200">
              <CheckCircle size={32} className="mx-auto text-green-600 mb-2" />
              <p className="text-sm text-green-700">
                Všechny nalezené firmy ({results.length}) již mají webové stránky. Žádné leady k přidání.
              </p>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={resetSearch}
              className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <RefreshCw size={14} />
              Nové vyhledávání
            </button>
          </div>
        </>
      )}
    </div>
  )
}