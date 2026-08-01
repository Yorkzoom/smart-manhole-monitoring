import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const words = ['监测', '预警', '守护']

export default function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0)
  const [wordIndex, setWordIndex] = useState(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    const duration = 2700
    const frame = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      setCount(Math.round(progress * 100))

      if (progress < 1) {
        requestAnimationFrame(frame)
      }
    }
    requestAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex(prev => (prev + 1) % words.length)
    }, 900)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (count >= 100) {
      const timer = setTimeout(onComplete, 400)
      return () => clearTimeout(timer)
    }
  }, [count, onComplete])

  return (
    <div className="fixed inset-0 z-[9999] bg-bg flex flex-col">
      {/* Top-left label */}
      <div className="absolute top-8 left-8 md:top-10 md:left-10">
        <motion.span
          className="block text-xs text-muted uppercase tracking-[0.3em]"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          智能井盖
        </motion.span>
      </div>

      {/* Center rotating words */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative h-[80px] md:h-[100px] lg:h-[120px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={wordIndex}
              className="block text-4xl md:text-6xl lg:text-7xl font-display italic text-text-primary/80"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              {words[wordIndex]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom-right counter */}
      <div className="absolute bottom-10 right-10 md:bottom-12 md:right-12">
        <span className="text-6xl md:text-8xl lg:text-9xl font-display text-text-primary tabular-nums">
          {String(count).padStart(3, '0')}
        </span>
      </div>

      {/* Bottom progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-stroke/50">
        <div
          className="h-full accent-gradient transition-transform duration-100 origin-left"
          style={{
            transform: `scaleX(${count / 100})`,
            boxShadow: '0 0 8px rgba(137, 170, 204, 0.35)',
          }}
        />
      </div>
    </div>
  )
}
