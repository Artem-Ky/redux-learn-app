/* ════════════════════════════════════════════════════════════════════
   LazyReactDemo.tsx — React.lazy + Suspense + ErrorBoundary

   Это "лёгкий shell" — в main chunk попадает только он.
   AnalyticsView подгружается через React.lazy → отдельный chunk.
   ════════════════════════════════════════════════════════════════════ */

import { Component, Suspense, lazy, useState, type JSX, type ReactNode } from 'react'

/* добавляем искусственную задержку — чтобы Suspense fallback был заметен */
const AnalyticsView = lazy(() =>
  Promise.all([
    import('./AnalyticsView'),
    new Promise<void>((resolve) => setTimeout(resolve, 700)),
  ]).then(([mod]) => mod),
)

class LazyErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean; msg: string }
> {
  state = { hasError: false, msg: '' }

  static getDerivedStateFromError(e: Error) {
    return { hasError: true, msg: e.message }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="react-demo__error">
          <strong>⚠ Chunk load failed</strong>
          <div style={{ fontSize: '.75rem', opacity: 0.7 }}>{this.state.msg}</div>
        </div>
      )
    }
    return this.props.children
  }
}

export function LazyReactDemo(): JSX.Element {
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState(0)

  return (
    <div className="react-demo">
      <div className="react-demo__controls">
        <button className="btn" onClick={() => setOpen((o) => !o)}>
          {open ? 'Скрыть AnalyticsView' : '▶ Открыть AnalyticsView (lazy)'}
        </button>
        {open && (
          <button
            className="btn btn--secondary"
            onClick={() => setKey((k) => k + 1)}
            title="перемонтировать — но chunk уже в browser-кеше, второй load будет мгновенным"
          >
            ⟳ перемонтировать
          </button>
        )}
      </div>

      {open && (
        <LazyErrorBoundary
          fallback={<div>Ошибка загрузки</div>}
        >
          <Suspense
            fallback={
              <div className="react-demo__loading">
                <div className="react-demo__spinner" />
                <span>Загружаю AnalyticsView chunk…</span>
              </div>
            }
          >
            <AnalyticsView key={key} />
          </Suspense>
        </LazyErrorBoundary>
      )}

      {!open && (
        <div className="react-demo__hint">
          До первого клика chunk <code>AnalyticsView-*.js</code> НЕ загружен —
          проверьте DevTools → Network. После клика Suspense покажет fallback,
          затем отрендерит компонент.
        </div>
      )}
    </div>
  )
}
