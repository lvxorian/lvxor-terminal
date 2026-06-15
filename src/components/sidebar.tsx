'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Phone,
  Search,
  Plus,
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

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gray-900 text-white flex flex-col z-40">
      <div className="px-6 py-5 border-b border-gray-800">
        <h1 className="text-lg font-bold tracking-wider">
          LVXOR<span className="text-indigo-400"> DESIGN</span>
        </h1>
        <p className="text-xs text-gray-500 mt-0.5 tracking-wide">TERMINAL</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href)
          const isCallMode = href === '/call' && isActive
          return (
            <Link
              key={href}
              href={href}
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
  )
}