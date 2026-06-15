export type LeadStatus = 'novy' | 'vytoceno' | 'zajim' | 'nezajim' | 'zavolat_zpet' | 'nevolat' | 'spatna_data'
export type LeadZdroj = 'manual' | 'firmy_cz' | 'ares'
export type VysledekVolani =
  | 'zajim'
  | 'nezajim'
  | 'zavolat_zpet'
  | 'nedostupny'
  | 'hlasova_schranka'
  | 'spatne_cislo'
  | 'uz_maji_web'
  | 'nerozhodna_osoba'
  | 'chce_info_mailem'
  | 'nevolat_znovu'

export interface Lead {
  id: string
  nazev_firmy: string
  telefon: string | null
  email: string | null
  web: string | null
  mesto: string | null
  obor: string | null
  adresa: string | null
  kontaktni_osoba: string | null
  ico: string | null
  datova_schranka: string | null
  rating: number | null
  rating_count: number | null
  zdroj: LeadZdroj
  status: LeadStatus
  poznamky: string | null
  scrapnuto_dne: string | null
  vytvoreno: string
  upraveno: string
}

export interface CallScript {
  id: string
  nazev: string
  obsah: string
  je_vychozi: boolean
  vytvoreno: string
  upraveno: string
}

export interface CallLog {
  id: string
  lead_id: string
  script_id: string | null
  vysledek: VysledekVolani
  poznamka: string | null
  delka_sekundy: number
  volano_dne: string
}

export interface FirmyCzResult {
  premiseId: string
  name: string
  telephone: string | null
  email: string | null
  webUrl: string | null
  streetAddress: string | null
  locality: string | null
  postalCode: string | null
  category: string | null
  categories: string[] | null
  ratingValue: number | null
  ratingCount: number | null
  reviewCount: number | null
  openingHours: Record<string, string> | null
  openingInfo: string | null
  description: string | null
  businessDescription: string | null
  ico: string | null
  dataBoxId: string | null
  latitude: number | null
  longitude: number | null
  detailPageUrl: string | null
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  novy: 'Nový',
  vytoceno: 'Vytočeno',
  zajim: 'Zájem',
  nezajim: 'Nezájem',
  zavolat_zpet: 'Zavolat zpět',
  nevolat: 'Nevolat',
  spatna_data: 'Špatná data',
}

export const STATUS_COLORS: Record<LeadStatus, string> = {
  novy: 'bg-blue-100 text-blue-800',
  vytoceno: 'bg-yellow-100 text-yellow-800',
  zajim: 'bg-green-100 text-green-800',
  nezajim: 'bg-red-100 text-red-800',
  zavolat_zpet: 'bg-orange-100 text-orange-800',
  nevolat: 'bg-purple-100 text-purple-800',
  spatna_data: 'bg-gray-100 text-gray-800',
}

export const VYSLEDEK_LABELS: Record<VysledekVolani, string> = {
  zajim: 'Zájem',
  nezajim: 'Nezájem',
  zavolat_zpet: 'Zavolat zpět',
  nedostupny: 'Nedostupný',
  hlasova_schranka: 'Hlasová schránka',
  spatne_cislo: 'Špatné číslo',
  uz_maji_web: 'Už mají web',
  nerozhodna_osoba: 'Nerozhodná osoba',
  chce_info_mailem: 'Chce info mailem',
  nevolat_znovu: 'Nevolat znovu (DNC)',
}

export const VYSLEDEK_COLORS: Record<VysledekVolani, string> = {
  zajim: 'bg-green-600 hover:bg-green-700',
  nezajim: 'bg-red-600 hover:bg-red-700',
  zavolat_zpet: 'bg-orange-600 hover:bg-orange-700',
  nedostupny: 'bg-gray-600 hover:bg-gray-700',
  hlasova_schranka: 'bg-slate-600 hover:bg-slate-700',
  spatne_cislo: 'bg-zinc-600 hover:bg-zinc-700',
  uz_maji_web: 'bg-cyan-600 hover:bg-cyan-700',
  nerozhodna_osoba: 'bg-amber-600 hover:bg-amber-700',
  chce_info_mailem: 'bg-teal-600 hover:bg-teal-700',
  nevolat_znovu: 'bg-purple-600 hover:bg-purple-700',
}

export const VYSLEDEK_TO_STATUS: Record<VysledekVolani, LeadStatus> = {
  zajim: 'zajim',
  nezajim: 'nezajim',
  zavolat_zpet: 'zavolat_zpet',
  nedostupny: 'vytoceno',
  hlasova_schranka: 'vytoceno',
  spatne_cislo: 'spatna_data',
  uz_maji_web: 'spatna_data',
  nerozhodna_osoba: 'vytoceno',
  chce_info_mailem: 'zajim',
  nevolat_znovu: 'nevolat',
}

export const CALL_PRIORITY_ORDER: LeadStatus[] = [
  'novy',
  'zavolat_zpet',
  'vytoceno',
]

export const FIRMY_CZ_CATEGORIES = [
  { value: 'all', label: 'Všechny obory' },
  { value: 'restauracni-sluzby', label: 'Restaurace & Gastronomie' },
  { value: 'auto-moto', label: 'Auto & Moto' },
  { value: 'elektro-mobily-pocitace', label: 'Elektro, Mobily & PC' },
  { value: 'obchody', label: 'Obchody' },
  { value: 'sluzby-a-remesla', label: 'Služby & Řemesla' },
  { value: 'dum-byt-zahrada', label: 'Dům, Byt & Zahrada' },
  { value: 'zdravotnictvi', label: 'Zdravotnictví' },
  { value: 'zdravi-krasa', label: 'Zdraví & Krása' },
  { value: 'banky-finance', label: 'Banky & Finance' },
  { value: 'cestovni-sluzby', label: 'Cestovní služby' },
  { value: 'instituce-urady', label: 'Instituce & Úřady' },
  { value: 'vse-pro-firmy', label: 'Vše pro firmy' },
  { value: 'velkoobchod-vyroba', label: 'Velkoobchod & Výroba' },
]

export const CZ_REGIONS = [
  { value: '', label: 'Celá ČR' },
  { value: 'Praha', label: 'Praha' },
  { value: 'Středočeský kraj', label: 'Středočeský kraj' },
  { value: 'Jihočeský kraj', label: 'Jihočeský kraj' },
  { value: 'Plzeňský kraj', label: 'Plzeňský kraj' },
  { value: 'Karlovarský kraj', label: 'Karlovarský kraj' },
  { value: 'Ústecký kraj', label: 'Ústecký kraj' },
  { value: 'Liberecký kraj', label: 'Liberecký kraj' },
  { value: 'Královéhradecký kraj', label: 'Královéhradecký kraj' },
  { value: 'Pardubický kraj', label: 'Pardubický kraj' },
  { value: 'Vysočina', label: 'Vysočina' },
  { value: 'Jihomoravský kraj', label: 'Jihomoravský kraj' },
  { value: 'Olomoucký kraj', label: 'Olomoucký kraj' },
  { value: 'Zlínský kraj', label: 'Zlínský kraj' },
  { value: 'Moravskoslezský kraj', label: 'Moravskoslezský kraj' },
]