import { useEffect, useState } from 'react'

const navLinks = ['概览', '传感器', '图表', '告警']

interface NavbarProps {
  connected: boolean
  locationName: string
  onSaveLocation: (name: string) => void
}

export default function Navbar({ connected, locationName, onSaveLocation }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('📍')
  const [editing, setEditing] = useState(false)
  const [locValue, setLocValue] = useState(locationName)
  const [clock, setClock] = useState('--:--:--')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => { setLocValue(locationName) }, [locationName])

  const handleSave = () => {
    const trimmed = locValue.trim()
    if (trimmed) {
      onSaveLocation(trimmed)
      setEditing(false)
    }
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex justify-center pt-3 md:pt-4 px-4 transition-shadow duration-300 ${scrolled ? 'shadow-md shadow-black/10' : ''}`}
    >
      <div className="inline-flex items-center rounded-full backdrop-blur-md border border-white/10 bg-surface px-2 py-2 gap-1 max-w-full overflow-x-auto">
        {/* Logo */}
        <a href="#hero" className="group relative flex items-center justify-center w-9 h-9 shrink-0">
          <span className="absolute inset-0 rounded-full accent-gradient opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="absolute inset-[2px] rounded-full bg-bg" />
          <span className="relative z-10 font-display italic text-[13px] text-text-primary">JM</span>
        </a>

        {/* Divider */}
        <div className="w-px h-5 bg-stroke mx-1 hidden sm:block" />

        {/* Nav links */}
        {navLinks.map(link => (
          <button
            key={link}
            onClick={() => {
              setActiveSection(link)
              const ids = ['hero', 'sensors', 'chart', 'alerts']
              const idx = navLinks.indexOf(link)
              const id = idx >= 0 ? ids[idx] : 'hero'
              document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
            }}
            className={`text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap transition-colors ${
              activeSection === link
                ? 'text-text-primary bg-stroke/50'
                : 'text-muted hover:text-text-primary hover:bg-white/10'
            }`}
          >
            {link}
          </button>
        ))}

        {/* Divider */}
        <div className="w-px h-5 bg-stroke mx-1 hidden sm:block" />

        {/* Status + Clock */}
        <div className="hidden md:flex items-center gap-3 px-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#00e676] shadow-[0_0_6px_rgba(0,230,118,0.5)]' : 'bg-muted'}`} />
            <span className="text-xs text-muted">{connected ? '在线' : '离线'}</span>
          </div>
          <span className="text-xs text-muted font-mono tracking-wider">{clock}</span>
        </div>

        {/* Export CSV */}
        <div className="flex items-center px-1">
          <a
            href="/api/export/csv"
            download="manhole_data.csv"
            className="text-xs text-muted hover:text-text-primary transition-colors px-2 py-1"
            title="下载 CSV 数据"
          >
            ⬇ CSV
          </a>
        </div>
        {/* Notification */}

        {/* Location */}
        <div className="hidden lg:flex items-center gap-1.5 px-2">
          <span className="text-muted text-xs">📍</span>
          {editing ? (
            <input
              autoFocus
              value={locValue}
              onChange={e => setLocValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
              onBlur={handleSave}
              className="text-xs bg-bg text-text-primary rounded px-1.5 py-0.5 w-28 border border-stroke outline-none"
            />
          ) : (
            <button onClick={() => setEditing(true)} className="text-xs text-muted hover:text-text-primary truncate max-w-[200px]">
              {locationName}
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}




