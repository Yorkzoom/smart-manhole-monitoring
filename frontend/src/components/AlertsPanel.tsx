import { motion } from 'framer-motion'
import type { Alert } from '../types'

interface AlertsPanelProps {
  alerts: Alert[]
}

const levelColors: Record<number, string> = {
  0: '#00e676',
  1: '#ffab00',
  2: '#ff6d00',
  3: '#ff1744',
}

export default function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <section id="alerts" className="bg-bg py-16 md:py-20">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: '-100px' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted uppercase tracking-[0.3em]">告警日志</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl md:text-4xl font-display italic text-text-primary">
                安全 <span className="text-muted">告警</span>
              </h2>
              <p className="text-sm text-muted mt-2">系统自动记录的异常事件与告警信息</p>
            </div>
            <span className="text-xs rounded-full px-3 py-1 bg-surface border border-stroke text-muted">
              {alerts.length} 条记录
            </span>
          </div>
        </motion.div>

        <motion.div
          className="bg-surface border border-stroke rounded-3xl p-4 md:p-6 space-y-2 max-h-[300px] overflow-y-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: '-50px' }}
        >
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-muted text-sm">暂无告警记录</div>
          ) : (
            alerts.slice(0, 30).map((alert, i) => (
              <motion.div
                key={`${alert.time}-${i}`}
                className="flex items-center gap-4 p-3 rounded-2xl bg-bg/30 border border-stroke"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: levelColors[alert.level] || '#888' }}
                />
                <span className="font-mono text-xs text-muted shrink-0">{alert.time}</span>
                <span className="text-sm text-text-primary truncate">{alert.text}</span>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </section>
  )
}
