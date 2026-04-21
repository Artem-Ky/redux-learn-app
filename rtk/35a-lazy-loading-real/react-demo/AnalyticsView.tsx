/* ════════════════════════════════════════════════════════════════════
   AnalyticsView.tsx — "лениво загружаемый" React-компонент

   Импортируется только через React.lazy(() => import('./AnalyticsView')).
   Выносится Vite в отдельный chunk → не попадает в main main.js.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState, type JSX } from 'react'

const DATA = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  value: Math.floor(20 + Math.sin(i / 3) * 20 + Math.random() * 20),
}))

export default function AnalyticsView(): JSX.Element {
  const [tick, setTick] = useState(0)
  const [highlighted, setHighlighted] = useState<number | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1500)
    return () => window.clearInterval(id)
  }, [])

  const max = Math.max(...DATA.map((d) => d.value))

  return (
    <div className="react-demo__view">
      <div className="react-demo__header">
        <strong>AnalyticsView</strong>
        <span className="react-demo__sub">React-компонент из lazy chunk · tick #{tick}</span>
      </div>
      <div className="react-demo__chart">
        {DATA.map((d) => (
          <div
            key={d.hour}
            className={'react-demo__bar' + (highlighted === d.hour ? ' react-demo__bar--active' : '')}
            style={{ height: `${(d.value / max) * 100}%` }}
            title={`${d.hour}:00 → ${d.value}`}
            onMouseEnter={() => setHighlighted(d.hour)}
            onMouseLeave={() => setHighlighted(null)}
          />
        ))}
      </div>
      <div className="react-demo__caption">
        {highlighted !== null
          ? `${highlighted}:00 — value ${DATA[highlighted].value}`
          : 'наведите на столбец чтобы увидеть значение'}
      </div>
    </div>
  )
}
