import { motion } from 'framer-motion'
import type { SensorData } from '../types'
import { SENSOR_META } from '../constants'

interface SensorGridProps {
  data: SensorData | null
}

function getCardStatus(value: number, key: string) {
  const meta = SENSOR_META[key]
  if (!meta) return 'normal'
  if (value >= meta.thresholds.critical) return 'critical'
  if (value >= meta.thresholds.warning) return 'warning'
  return 'normal'
}

function statusColor(status: string) {
  switch (status) {
    case 'critical': return { bg: 'rgba(255,23,68,0.15)', text: '#ff1744', bar: '#ff1744' }
    case 'warning': return { bg: 'rgba(255,171,0,0.15)', text: '#ffab00', bar: '#ffab00' }
    default: return { bg: 'rgba(0,230,118,0.15)', text: '#00e676', bar: '#00e676' }
  }
}

export default function SensorGrid({ data }: SensorGridProps) {
  return (
    <section id="sensors" className="bg-bg py-16 md:py-20">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: '-100px' }}
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-px bg-stroke" />
              <span className="text-xs text-muted uppercase tracking-[0.3em]">传感器数据</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display italic text-text-primary">
              实时 <span className="text-muted">监测</span>
            </h2>
            <p className="text-sm text-muted mt-2">所有传感器数据实时更新，每 2 秒刷新一次</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e676]" />
            {data ? '实时更新中' : '等待数据'}
          </div>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
          {Object.entries(SENSOR_META).map(([key, meta], idx) => {
            const value = data ? data[key] as number : 0
            const status = data ? getCardStatus(value, key) : 'normal'
            const sc = statusColor(status)
            const pct = data ? Math.min(100, (value / meta.barMax) * 100) : 0
            const colSpan = idx < 2 ? 'md:col-span-7' : 'md:col-span-5'

            return (
              <motion.div
                key={key}
                className={`${colSpan} group relative bg-surface border border-stroke rounded-3xl overflow-hidden cursor-pointer`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                viewport={{ once: true, margin: '-50px' }}
              >
                {/* Top accent bar */}
                <div className="h-1 w-full" style={{ background: sc.bar }} />

                {/* Content */}
                <div className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted">{meta.icon} {meta.label}</span>
                    <span
                      className="text-xs rounded-full px-2.5 py-1"
                      style={{ background: sc.bg, color: sc.text }}
                    >
                      {status === 'normal' ? '正常' : status === 'warning' ? '注意' : '危险'}
                    </span>
                  </div>

                  <div className="text-3xl md:text-4xl font-mono font-semibold mb-2 transition-colors" style={{ color: sc.text }}>
                    {data ? value.toFixed(meta.decimals) : '--'}
                    <span className="text-sm font-normal text-muted ml-1">{meta.unit}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-stroke/50 rounded-full overflow-hidden mt-4">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: sc.bar }}
                    />
                  </div>

                  {/* Range info */}
                  <div className="text-[10px] text-muted/60 mt-2 tracking-wider">
                    {meta.range}
                  </div>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-bg/70 backdrop-blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="relative inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm bg-white text-bg">
                    查看详情
                    <span className="font-display italic ml-1" style={{ color: sc.bar }}>→ {meta.label}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
