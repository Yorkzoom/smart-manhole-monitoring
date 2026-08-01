import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export default function Footer() {
  const marqueeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!marqueeRef.current) return
    const el = marqueeRef.current
    const ctx = gsap.context(() => {
      gsap.to(el, {
        xPercent: -50,
        duration: 40,
        ease: 'none',
        repeat: -1,
      })
    })
    return () => ctx.revert()
  }, [])

  return (
    <footer className="bg-bg pt-16 md:pt-20 pb-8 md:pb-12 overflow-hidden relative">
      {/* Background video area - dark gradient instead */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg via-surface/50 to-bg" />

      {/* Marquee */}
      <div className="relative overflow-hidden mb-12 py-4 border-y border-stroke">
        <div ref={marqueeRef} className="flex whitespace-nowrap">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="text-4xl md:text-5xl font-display italic text-text-primary/10 mx-4">
              守护城市安全 • 
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="relative z-10 text-center mb-12">
        <h3 className="text-2xl md:text-3xl font-display italic text-text-primary mb-6">
          让城市更安全
        </h3>
        <a
          href="mailto:admin@example.com"
          className="inline-flex items-center gap-2 rounded-full text-sm px-7 py-3.5 border-2 border-stroke bg-bg text-text-primary hover:border-transparent hover:ring-2 hover:ring-[#89aacc]/50 transition-all hover:scale-105"
        >
          联系我们 ↗
        </a>
      </div>

      {/* Footer bar */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-stroke">
          <div className="flex items-center gap-6">
            <span className="text-xs text-muted">智能井盖监测系统</span>
            <span className="text-xs text-muted">v2.0</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] shadow-[0_0_6px_rgba(0,230,118,0.5)] animate-pulse" />
              <span className="text-xs text-muted">系统运行中</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
