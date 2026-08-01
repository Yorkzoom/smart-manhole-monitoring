import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import * as echarts from 'echarts'
import type { SensorData } from '../types'

interface ChartSectionProps {
  history: SensorData[]
}

const chartKeys = ['temperature', 'humidity', 'tilt_angle', 'mq2', 'mq4', 'light'] as const
const chartColors = ['#ff6b6b', '#4dabf7', '#69db7c', '#ffd43b', '#ff922b', '#da77f2']
const chartNames = ['温度', '湿度', '倾斜角度', '可燃气体', '甲烷', '光照强度']

export default function ChartSection({ history }: ChartSectionProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return
    const chart = echarts.init(chartRef.current, undefined, { renderer: 'canvas' })
    instanceRef.current = chart

    chart.setOption({
      tooltip: {
        trigger: 'axis',
        textStyle: { color: '#aaa' },
        backgroundColor: 'rgba(8,8,8,0.9)',
        borderColor: 'rgba(255,255,255,0.08)',
      },
      legend: {
        textStyle: { color: '#888' },
        top: 0,
        right: 0,
      },
      grid: { left: 40, right: 10, top: 35, bottom: 25 },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#333' } },
        axisLabel: { color: '#666', fontSize: 10 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#1a1a1a', type: 'dashed' } },
        axisLabel: { color: '#666', fontSize: 10 },
      },
      series: chartKeys.map((_key, i) => ({
        name: chartNames[i],
        type: 'line',
        data: [] as [number, number][],
        smooth: true,
        lineStyle: { width: 2, color: chartColors[i] },
        itemStyle: { color: chartColors[i] },
        symbol: 'none',
      })),
    })

    const resize = () => chart.resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      chart.dispose()
    }
  }, [])

  useEffect(() => {
    const chart = instanceRef.current
    if (!chart || history.length === 0) return
    const series = chartKeys.map(key => ({
      data: history.map(d => [d._time as number, d[key] as number] as [number, number]),
    }))
    chart.setOption({ series })
  }, [history])

  return (
    <section id="chart" className="bg-bg py-16 md:py-20">
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
            <span className="text-xs text-muted uppercase tracking-[0.3em]">数据趋势</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl md:text-4xl font-display italic text-text-primary">
                实时 <span className="text-muted">趋势</span>
              </h2>
              <p className="text-sm text-muted mt-2">过去 6 分 40 秒的传感器数据变化趋势</p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-muted">
              {chartKeys.map((key, i) => (
                <span key={key} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: chartColors[i] }} />
                  {chartNames[i]}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-surface border border-stroke rounded-3xl p-4 md:p-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: '-50px' }}
        >
          <div ref={chartRef} className="w-full" style={{ height: '380px' }} />
        </motion.div>
      </div>
    </section>
  )
}
