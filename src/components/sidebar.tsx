'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Phone,
  Search,
  Plus,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leady', icon: Users },
  { href: '/leads/new', label: 'Nový lead', icon: Plus },
  { href: '/leads/scrape', label: 'Hledat na Firmy.cz', icon: Search },
  { href: '/call', label: 'Call Mode', icon: Phone },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-gray-900 text-white flex items-center justify-between px-4 z-50">
        <h1 className="text-sm font-bold tracking-wider">
          LVXOR<span className="text-indigo-400"> DESIGN</span>
        </h1>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -mr-2 text-gray-400 hover:text-white"
          aria-label="Otevřít menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-gray-900 text-white flex flex-col z-50 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-wider">
              LVXOR<span className="text-indigo-400"> DESIGN</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 tracking-wide">TERMINAL</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 -mr-2 text-gray-400 hover:text-white"
            aria-label="Zavřít menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/' ? pathname === '/' : pathname.startsWith(href)
            const isCallMode = href === '/call' && isActive
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isCallMode
                    ? 'bg-green-500/10 text-green-400 border-2 border-green-500'
                    : isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-6 py-4 border-t border-gray-800">
          <p className="text-xs text-gray-600">v1.0.0</p>
        </div>
      </aside>
    </>
  )
}