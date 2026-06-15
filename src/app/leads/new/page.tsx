'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function NewLeadPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)
  const [duplicate, setDuplicate] = useState<{ found: boolean; message: string } | null>(null)
  const [form, setForm] = useState({
    nazev_firmy: '',
    telefon: '',
    email: '',
    web: '',
    mesto: '',
    obor: '',
    adresa: '',
    kontaktni_osoba: '',
    ico: '',
    datova_schranka: '',
    rating: '',
    poznamky: '',
    zdroj: 'manual' as const,
  })

  async function checkDuplicate() {
    if (!form.nazev_firmy.trim() && !form.telefon.trim()) return

    setChecking(true)
    setDuplicate(null)

    const res = await fetch('/api/leads/check-duplicates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{
          nazev_firmy: form.nazev_firmy,
          telefon: form.telefon || null,
        }],
      }),
    })
    const data = await res.json()

    if (data.duplicates > 0) {
      setDuplicate({ found: true, message: `Tento lead již v databázi existuje! (${data.duplicateDetails[0]?.nazev_firmy})` })
    } else {
      setDuplicate({ found: false, message: 'Lead není v databázi – lze přidat.' })
    }
    setChecking(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nazev_firmy.trim()) return

    setSaving(true)

    const payload = {
      ...form,
      status: 'novy' as const,
      telefon: form.telefon || null,
      email: form.email || null,
      web: form.web || null,
      mesto: form.mesto || null,
      obor: form.obor || null,
      adresa: form.adresa || null,
      kontaktni_osoba: form.kontaktni_osoba || null,
      ico: form.ico || null,
      datova_schranka: form.datova_schranka || null,
      rating: form.rating ? parseFloat(form.rating) : null,
      poznamky: form.poznamky || null,
    }

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      router.push('/leads')
      router.refresh()
    } else {
      const err = await res.json()
      alert('Chyba: ' + (err.error ?? 'Neznámá chyba'))
    }
    setSaving(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/leads" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nový lead</h1>
          <p className="text-sm text-gray-500 mt-0.5">Přidat firmu ručně do databáze</p>
        </div>
      </div>

      {duplicate && (
        <div
          className={`flex items-start gap-3 p-4 rounded-lg border ${
            duplicate.found
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-green-50 border-green-200 text-green-800'
          }`}
        >
          {duplicate.found ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <p className="text-sm">{duplicate.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
<div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Název firmy *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={form.nazev_firmy}
                  onChange={(e) => setForm({ ...form, nazev_firmy: e.target.value })}
                  onBlur={checkDuplicate}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Např. Restaurace U Zlatého Kohouta"
                />
                {checking && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
              </div>
            </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Telefon
            </label>
            <input
              type="tel"
              value={form.telefon}
              onChange={(e) => setForm({ ...form, telefon: e.target.value })}
              onBlur={checkDuplicate}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="777 123 456"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="info@firma.cz"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Web stránky
            </label>
            <input
              type="url"
              value={form.web}
              onChange={(e) => setForm({ ...form, web: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="https://www.firma.cz (nechte prázdné = bez webu)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Město
            </label>
            <input
              type="text"
              value={form.mesto}
              onChange={(e) => setForm({ ...form, mesto: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Praha"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Obor
            </label>
            <input
              type="text"
              value={form.obor}
              onChange={(e) => setForm({ ...form, obor: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Restaurace, Autoservis..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Kontaktní osoba
            </label>
            <input
              type="text"
              value={form.kontaktni_osoba}
              onChange={(e) => setForm({ ...form, kontaktni_osoba: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Jan Novák"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              IČO
            </label>
            <input
              type="text"
              value={form.ico}
              onChange={(e) => setForm({ ...form, ico: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="12345678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Datová schránka
            </label>
            <input
              type="text"
              value={form.datova_schranka}
              onChange={(e) => setForm({ ...form, datova_schranka: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="x9y8z7w"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Hodnocení ⭐
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="0–5 (např. 4.6)"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Adresa
            </label>
            <input
              type="text"
              value={form.adresa}
              onChange={(e) => setForm({ ...form, adresa: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Václavské náměstí 15, Praha 1"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Poznámky
            </label>
            <textarea
              value={form.poznamky}
              onChange={(e) => setForm({ ...form, poznamky: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
              placeholder="Další informace o leadu..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <Link
            href="/leads"
            className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Zrušit
          </Link>
          <button
            type="submit"
            disabled={saving || !form.nazev_firmy.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={16} />
            {saving ? 'Ukládám...' : 'Uložit lead'}
          </button>
        </div>
      </form>
    </div>
  )
}