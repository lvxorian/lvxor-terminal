CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nazev_firmy TEXT NOT NULL,
  telefon TEXT,
  email TEXT,
  web TEXT,
  mesto TEXT,
  obor TEXT,
  adresa TEXT,
  kontaktni_osoba TEXT,
  ico TEXT,
  datova_schranka TEXT,
  zdroj TEXT NOT NULL DEFAULT 'manual' CHECK (zdroj IN ('manual', 'firmy_cz', 'ares')),
  status TEXT NOT NULL DEFAULT 'novy' CHECK (status IN ('novy', 'vytoceno', 'zajim', 'nezajim', 'zavolat_zpet', 'nevolat', 'spatna_data')),
  poznamky TEXT,
  scrapnuto_dne TIMESTAMPTZ,
  vytvoreno TIMESTAMPTZ DEFAULT NOW(),
  upraveno TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_telefon ON leads (telefon);
CREATE INDEX IF NOT EXISTS idx_leads_nazev_firmy ON leads (nazev_firmy);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_zdroj ON leads (zdroj);
CREATE INDEX IF NOT EXISTS idx_leads_web ON leads (web);
CREATE INDEX IF NOT EXISTS idx_leads_ico ON leads (ico);

CREATE TABLE IF NOT EXISTS call_scripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nazev TEXT NOT NULL,
  obsah TEXT NOT NULL,
  je_vychozi BOOLEAN DEFAULT FALSE,
  vytvoreno TIMESTAMPTZ DEFAULT NOW(),
  upraveno TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  script_id UUID REFERENCES call_scripts(id) ON DELETE SET NULL,
  vysledek TEXT NOT NULL DEFAULT 'nedostupny' CHECK (vysledek IN ('zajim', 'nezajim', 'zavolat_zpet', 'nedostupny', 'hlasova_schranka', 'spatne_cislo', 'uz_maji_web', 'nerozhodna_osoba', 'chce_info_mailem', 'nevolat_znovu')),
  poznamka TEXT,
  delka_sekundy INTEGER DEFAULT 0,
  volano_dne TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id ON call_logs (lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_volano_dne ON call_logs (volano_dne);

INSERT INTO call_scripts (nazev, obsah, je_vychozi) VALUES (
  'Výchozí cold call script',
  E'Dobrý den, volám z LVXOR DESIGN.\n\nVidím, že vaše firma nemá webové stránky. V dnešní době je to obrovská příležitost, kterou necháváte přejít konkurenci.\n\nRád bych vám ukázal, jak bychom vám mohli pomoci – vytvoříme vám kompletní webové stránky včetně loga.\n\nMěli byste pár minut, abych vám to představil?',
  TRUE
);