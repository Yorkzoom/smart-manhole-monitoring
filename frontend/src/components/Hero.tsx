import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { SensorData } from '../types'
import { RISK_COLORS } from '../constants'

const roles = ['监测', '预警', '分析', '守护']

interface HeroProps {
  data: SensorData | null
}

export default function Hero({ data }: HeroProps) {
  const nameRef = useRef<HTMLHeadingElement>(null)
  const blurRefs = useRef<(HTMLDivElement | null)[]>([])
  const [roleIndex, setRoleIndex] = useState(0)

  // CSS entrance animations (handled by .hero-anim classes in className)


  // Role cycling
  useEffect(() => {
    const interval = setInterval(() => setRoleIndex(prev => (prev + 1) % roles.length), 2000)
    return () => clearInterval(interval)
  }, [])

  const riskColor = data ? RISK_COLORS[data.risk_level]?.fg || '#00e676' : '#00e676'
  const riskLabel = data ? RISK_COLORS[data.risk_level]?.label || '等待数据' : '等待数据'

  return (
    <section id="hero" className="relative h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden hero-zoom">
        <div className="absolute inset-0 bg-gradient-to-br from-surface via-bg to-[#0a0e14] animate-gradient-shift" />
        <div className="absolute inset-0 halftone-overlay opacity-30" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-bg to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center">
        {/* Eyebrow */}
        <motion.div
          ref={el => { blurRefs.current[0] = el }}
          className="text-xs text-muted uppercase tracking-[0.3em] mb-6 hero-anim hero-fade" style={{animationDelay:"0.15s"}}
        >
          智能井盖监测系统 v2.0
        </motion.div>

        {/* Title */}
        <h1
          ref={nameRef}
          className="text-5xl md:text-7xl lg:text-8xl font-display italic leading-[0.9] tracking-tight text-text-primary mb-6"
        >
          智慧城市
        </h1>

        {/* Role line */}
        <div className="text-sm md:text-base text-muted mb-2">
          让城市基础设施更
          <span key={roleIndex} className="font-display italic text-text-primary inline-block animate-role-fade-in mx-2">
            {roles[roleIndex]}
          </span>
        </div>

        {/* Description */}
        <div ref={el => { blurRefs.current[1] = el }} className="text-sm md:text-base text-muted max-w-md mb-10 mt-4 hero-anim hero-fade" style={{animationDelay:"0.55s"}}>
          实时监测井盖状态、气体浓度与环境数据，通过 AI 智能分析提前预警，守护城市安全
        </div>

        {/* Risk gauge + CTA */}
        <div ref={el => { blurRefs.current[2] = el }} className="flex flex-col items-center gap-6 hero-anim hero-fade" style={{animationDelay:"0.7s"}}>
          {/* Risk display */}
          {data && (
            <div className="flex items-center gap-4 mb-2">
              <span className="font-mono text-3xl font-bold" style={{ color: riskColor }}>
                {data.risk_score.toFixed(1)}
              </span>
              <span className="text-xs text-muted uppercase tracking-[0.1em]">风险评分</span>
              <span className="text-xs rounded-full px-3 py-1" style={{ background: `${riskColor}20`, color: riskColor }}>
                {riskLabel}
              </span>
            </div>
          )}

          {/* CTA buttons */}
          <div className="inline-flex gap-4">
            <a
              href="#sensors"
              className="rounded-full text-sm px-7 py-3.5 bg-text-primary text-bg hover:bg-bg hover:text-text-primary hover:ring-2 hover:ring-[#89aacc]/50 transition-all hover:scale-105"
            >
              查看数据
            </a>
            <a
              href="#chart"
              className="rounded-full text-sm px-7 py-3.5 border-2 border-stroke bg-bg text-text-primary hover:border-transparent hover:ring-2 hover:ring-[#89aacc]/50 transition-all hover:scale-105"
            >
              趋势分析
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <span className="text-xs text-muted uppercase tracking-[0.2em]">滚动</span>
        <div className="w-px h-10 bg-stroke relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-text-primary/40 animate-scroll-down" />
        </div>
      </div>
    </section>
  )
}


