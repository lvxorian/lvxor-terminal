'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import type { FirmyCzResult } from '@/lib/types'
import { formatPhone } from '@/lib/utils'

export default function ScrapePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [locality, setLocality] = useState('')
  const [maxItems, setMaxItems] = useState(100)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<FirmyCzResult[]>([])
  const [withoutWeb, setWithoutWeb] = useState<FirmyCzResult[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{
    total: number
    withoutWeb: number
    newCount: number
    duplicateCount: number
  } | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setImportResult(null)
    setResults([])
    setWithoutWeb([])
    setSelected(new Set())

    try {
      const res = await fetch('/api/leads/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, locality, maxItems }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Chyba při vyhledávání na Firmy.cz')
        return
      }

      setResults(data.results ?? [])
      const noWeb = (data.results ?? []).filter(
        (r: FirmyCzResult) => !r.website || r.website.trim() === ''
      )
      setWithoutWeb(noWeb)
      setSelected(new Set(noWeb.map((r: FirmyCzResult) => r.id)))

      setImportResult({
        total: data.total,
        withoutWeb: data.withoutWeb,
        newCount: data.newCount,
        duplicateCount: data.duplicateCount,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba')
    } finally {
      setLoading(false)
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
    setSelected(new Set(withoutWeb.map((r) => r.id)))
  }

  function deselectAll() {
    setSelected(new Set())
  }

  async function handleImport() {
    if (selected.size === 0) return

    setImporting(true)
    try {
      const itemsToImport = withoutWeb
        .filter((r) => selected.has(r.id))
        .map((r) => ({
          nazev_firmy: r.name,
          telefon: r.phone || null,
          email: r.email || null,
          web: r.website || null,
          mesto: r.city || null,
          obor: r.category || null,
          adresa: [r.street, r.postalCode, r.city].filter(Boolean).join(', ') || null,
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

      <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Hledaný výraz *
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Zadejte klíčové slovo (např. restaurace, autoservis, zubař)"
              />
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
              placeholder="Praha, Brno... (volitelné)"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Max. výsledků:</label>
            <select
              value={maxItems}
              onChange={(e) => setMaxItems(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? 'Vyhledávám...' : 'Hledat na Firmy.cz'}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Používá Apify scraper pro Firmy.cz (bovi/firmy-cz-scraper). Cena: $2 za 1 000 výsledků.
        </p>
      </form>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertCircle size={20} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {importResult && (
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
      )}

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
                key={result.id}
                className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selected.has(result.id) ? 'bg-indigo-50/50' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(result.id)}
                  onChange={() => toggleSelect(result.id)}
                  className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {result.name}
                    </p>
                    <XCircle size={14} className="text-red-500 shrink-0" />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {result.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={11} /> {formatPhone(result.phone)}
                      </span>
                    )}
                    {result.city && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {result.city}
                      </span>
                    )}
                    {result.category && <span>{result.category}</span>}
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

      {results.length > 0 && withoutWeb.length === 0 && !loading && (
        <div className="text-center py-8 bg-green-50 rounded-xl border border-green-200">
          <CheckCircle size={32} className="mx-auto text-green-600 mb-2" />
          <p className="text-sm text-green-700">
            Všechny nalezené firmy již mají webové stránky. Žádné leady k přidání.
          </p>
        </div>
      )}
    </div>
  )
}