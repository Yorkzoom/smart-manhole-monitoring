import { motion } from 'framer-motion'
import type { AiAnalysis } from '../types'
import { AI_RISK_MAP } from '../constants'

interface AiAnalysisPanelProps {
  analysis: AiAnalysis | null
}

export default function AiAnalysisPanel({ analysis }: AiAnalysisPanelProps) {
  return (
    <section id="ai-analysis" className="bg-bg py-16 md:py-20">
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
            <span className="text-xs text-muted uppercase tracking-[0.3em]">AI 分析</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl md:text-4xl font-display italic text-text-primary">
                智能 <span className="text-muted">分析</span>
              </h2>
              <p className="text-sm text-muted mt-2">基于 DeepSeek 的实时 AI 数据解读与风险评估</p>
            </div>
            <span className="text-xs rounded-full px-3 py-1 bg-surface border border-stroke text-muted">
              {analysis ? '已就绪' : '等待中'}
            </span>
          </div>
        </motion.div>

        <motion.div
          className="bg-surface border border-stroke rounded-3xl p-6 md:p-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: '-50px' }}
        >
          {!analysis ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 mx-auto mb-4 border-2 border-stroke border-t-text-primary rounded-full animate-spin" />
              <p className="text-muted text-sm">数据收集中，首次 AI 分析将在 30 秒后进行...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Risk badge + summary */}
              <div className="flex items-center gap-4 flex-wrap">
                <span
                  className="font-mono text-xs font-semibold px-4 py-1.5 rounded-full border"
                  style={{
                    background: `${AI_RISK_MAP[analysis.risk_level]?.color}20` || '#88820',
                    color: AI_RISK_MAP[analysis.risk_level]?.color || '#888',
                    borderColor: `${AI_RISK_MAP[analysis.risk_level]?.color}40` || '#88840',
                  }}
                >
                  {AI_RISK_MAP[analysis.risk_level]?.label || analysis.risk_level}
                </span>
                <span className="text-lg font-display italic text-text-primary">{analysis.summary}</span>
              </div>

              {/* Trend */}
              <div className="bg-bg/30 rounded-2xl p-4 text-sm text-text-secondary leading-relaxed">
                {analysis.trend_analysis}
              </div>

              {/* Anomalies */}
              {analysis.anomalies.length > 0 && (
                <div>
                  <h4 className="text-xs text-muted uppercase tracking-[0.06em] mb-3">异常检测</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.anomalies.map((a, i) => (
                      <span
                        key={i}
                        className="text-xs rounded-lg px-3 py-1.5 border"
                        style={{
                          background: 'rgba(255,107,107,0.1)',
                          color: '#ff6b6b',
                          borderColor: 'rgba(255,107,107,0.2)',
                        }}
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {analysis.suggestions.length > 0 && (
                <div>
                  <h4 className="text-xs text-muted uppercase tracking-[0.06em] mb-3">建议措施</h4>
                  <div className="space-y-2">
                    {analysis.suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4e85bf] mt-1.5 shrink-0" />
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="pt-4 border-t border-stroke">
                <span className="font-mono text-xs text-muted">
                  分析时间: {new Date(analysis.analyzed_at).toLocaleTimeString('zh-CN', { hour12: false })}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
