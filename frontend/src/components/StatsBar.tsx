import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { SensorData } from '../types'
import { RISK_COLORS } from '../constants'

interface StatsBarProps {
  data: SensorData | null
}

const stats = [
  { label: '传感器数量', suffix: '个', getValue: () => '6' },
  { label: '数据频率', suffix: '', getValue: () => '2秒/次' },
  { label: '数据精度', suffix: '', getValue: () => '实时' },
]

export default function StatsBar({ data }: StatsBarProps) {
  const mountedAt = useRef(Date.now())
  const [uptime, setUptime] = useState('00:00:00')

  useEffect(() => {
    const update = () => {
      const elapsed = Math.floor((Date.now() - mountedAt.current) / 1000)
      const h = Math.floor(elapsed / 3600)
      const m = Math.floor((elapsed % 3600) / 60)
      const s = elapsed % 60
      setUptime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="bg-bg py-16">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Risk score */}
          <motion.div
            className="bg-surface border border-stroke rounded-3xl p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="text-xs text-muted uppercase tracking-[0.08em] mb-2">风险评分</div>
            <div
              className="text-4xl md:text-5xl font-mono font-bold"
              style={{ color: data ? RISK_COLORS[data.risk_level]?.fg : '#888' }}
            >
              {data ? data.risk_score.toFixed(1) : '--'}
            </div>
            <div className="text-xs text-muted mt-2">
              {data ? RISK_COLORS[data.risk_level]?.label : '等待数据'}
            </div>
          </motion.div>

          {/* Stat cards */}
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="bg-surface border border-stroke rounded-3xl p-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: (i + 1) * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="text-xs text-muted uppercase tracking-[0.08em] mb-2">{stat.label}</div>
              <div className="text-3xl md:text-4xl font-mono font-bold text-text-primary">
                {stat.getValue()}
                <span className="text-sm font-normal text-muted ml-1">{stat.suffix}</span>
              </div>
            </motion.div>
          ))}

          {/* Uptime */}
          <motion.div
            className="bg-surface border border-stroke rounded-3xl p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <div className="text-xs text-muted uppercase tracking-[0.08em] mb-2">运行时长</div>
            <div className="text-3xl md:text-4xl font-mono font-bold text-text-primary">{uptime}</div>
            <div className="text-xs text-muted mt-2">累计运行</div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
