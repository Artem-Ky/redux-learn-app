/* ════════════════════════════════════════════════════════════════════
   35a — Lazy loading slices в реальном приложении

   В main.tsx статически импортированы ТОЛЬКО core-зависимости:
     - RTK core + coreSlice
     - UI-хост и обработчики кнопок
     - React + LazyReactDemo (shell, сам AnalyticsView лениво)

   Модули ./features/*  и ./react-demo/AnalyticsView НЕ импортированы
   статически — они попадут в отдельные chunks.
   ════════════════════════════════════════════════════════════════════ */

import {
  configureStore,
  createSlice,
  combineSlices,
} from '@reduxjs/toolkit'
import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'

import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

import { LazyReactDemo } from './react-demo/LazyReactDemo'

/* ── Типы lazy-стейта (урок 36 — про это детальнее) ── */
type LazyChartState = { points: number[] }
type LazyCartState = {
  ids: string[]
  entities: Record<string, { id: string; name: string; qty: number }>
}
type LazyAnalyticsState = {
  events: { ts: number; category: string; value: number }[]
  filter: string
}

interface LazyState {
  chart?: LazyChartState
  cart?: LazyCartState
  analytics?: LazyAnalyticsState
}

/* ── Core slice — всегда в main bundle ── */
const coreSlice = createSlice({
  name: 'core',
  initialState: { count: 0 },
  reducers: {
    increment: (s) => {
      s.count += 1
    },
  },
})

const rootReducer = combineSlices(coreSlice).withLazyLoadedSlices<LazyState>()

const store = configureStore({ reducer: rootReducer })

/* ── UI панели ── */
const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог 35a — dynamic import + injectInto',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

/* ════════════════════════════════════════════════════════════════════
   Feature loader — обёртка над dynamic import
   ════════════════════════════════════════════════════════════════════ */

type FeatureName = 'chart' | 'cart' | 'analytics'

interface LoadedFeature {
  name: FeatureName
  durationMs: number
  url: string
}

const loaded: Partial<Record<FeatureName, LoadedFeature>> = {}
const inflight: Partial<Record<FeatureName, Promise<unknown>>> = {}

async function loadFeature(name: FeatureName): Promise<void> {
  const card = document.querySelector<HTMLElement>(`[data-feature="${name}"]`)!
  const status = card.querySelector<HTMLElement>('.feature-card__status')!
  const host = card.querySelector<HTMLElement>('.feature-card__host')!

  if (loaded[name]) {
    con.warn(`${name}: уже загружена — повторная загрузка не происходит`)
    return
  }
  if (inflight[name]) {
    con.warn(`${name}: загрузка уже в процессе, ждём существующий Promise`)
    await inflight[name]
    return
  }

  status.textContent = 'loading…'
  status.className = 'feature-card__status feature-card__status--loading'
  con.info(`начинаю import ./features/${name}-feature…`)

  const t0 = performance.now()

  /* ───── Ключевая строка: dynamic import() ─────
     Vite увидит это и вынесет модуль в отдельный chunk.  */
  const p =
    name === 'chart'
      ? import('./features/chart-feature')
      : name === 'cart'
        ? import('./features/cart-feature')
        : import('./features/analytics-feature')

  inflight[name] = p

  try {
    const mod = await p
    const dt = Math.round(performance.now() - t0)

    mod.register(rootReducer, store, host, con)

    loaded[name] = { name, durationMs: dt, url: `${name}-feature.*.js` }
    status.textContent = 'loaded & injected'
    status.className = 'feature-card__status feature-card__status--loaded'

    con.success(`${name} chunk загружен за ${dt} ms, slice injected`)
    renderNetworkPanel()
  } catch (e) {
    status.textContent = 'failed ✖'
    status.className = 'feature-card__status feature-card__status--failed'
    con.error(`${name}: ${(e as Error).message}`)
  } finally {
    delete inflight[name]
  }
}

/* ════════════════════════════════════════════════════════════════════
   Mini-Network panel (визуализируем что загружено)
   ════════════════════════════════════════════════════════════════════ */

const netEl = document.getElementById('network-panel')!

function renderNetworkPanel(): void {
  const rows = Object.values(loaded)
  if (rows.length === 0) {
    netEl.innerHTML =
      '<div class="network-panel__empty">— пока ни один feature chunk не загружен —</div>'
    return
  }
  netEl.innerHTML = rows
    .map(
      (r) => `
        <div class="network-row">
          <span class="network-row__name">${r.url}</span>
          <span class="network-row__time">${r.durationMs} ms</span>
          <span class="network-row__ok">✓ loaded</span>
        </div>
      `,
    )
    .join('')
}
renderNetworkPanel()

/* ════════════════════════════════════════════════════════════════════
   Bindings
   ════════════════════════════════════════════════════════════════════ */

document.querySelectorAll<HTMLButtonElement>('[data-load]').forEach((btn) => {
  btn.addEventListener('click', () => {
    void loadFeature(btn.dataset.load as FeatureName)
  })
})

/* Preload on hover — паттерн для критичных фич.
   ВАЖНО: prefetch НЕ пишет в inflight[], иначе последующий клик увидит
   резолвнутый промис и ранний-return'нится без register().
   Браузер сам де-дуплицирует повторный import() по module URL. */
document.querySelectorAll<HTMLButtonElement>('[data-load]').forEach((btn) => {
  btn.addEventListener('mouseenter', () => {
    const name = btn.dataset.load as FeatureName
    if (loaded[name] || inflight[name]) return
    const p =
      name === 'chart'
        ? import('./features/chart-feature')
        : name === 'cart'
          ? import('./features/cart-feature')
          : import('./features/analytics-feature')
    p.catch(() => {
      /* тихо — клик нажмёт реальный loadFeature и покажет ошибку */
    })
  }, { once: true })
})

/* Demo 2 — загрузить chart дважды */
document.getElementById('btn-race')!.addEventListener('click', async () => {
  con.info('запускаю Promise.all([import(chart), import(chart)])…')
  const t0 = performance.now()
  await Promise.all([
    import('./features/chart-feature'),
    import('./features/chart-feature'),
  ])
  con.success(
    `оба промиса резолвнулись за ${Math.round(
      performance.now() - t0,
    )} ms — браузер подгрузил chunk ОДИН раз (module caching)`,
  )
})

/* Demo 3 — broken import */
document.getElementById('btn-broken')!.addEventListener('click', async () => {
  con.info('пробуем import несуществующего модуля…')
  try {
    const missingPath = `${location.origin}/assets/this-chunk-does-not-exist-${Date.now()}.js`
    await import(/* @vite-ignore */ missingPath)
    con.error('???  — ошибки не было')
  } catch (e) {
    con.error(`chunk load failed: ${(e as Error).message}`)
    con.info('в проде: показать "Не удалось загрузить. Попробовать снова?" + retry')
  }
})

/* core increment — чтобы видеть, что core работает независимо */
document.getElementById('btn-core-inc')!.addEventListener('click', () => {
  const a = coreSlice.actions.increment()
  store.dispatch(a)
  con.action(a, 'core')
})

/* ════════════════════════════════════════════════════════════════════
   React-demo mount
   ════════════════════════════════════════════════════════════════════ */

const reactRoot = document.getElementById('react-demo-root')
if (reactRoot) {
  createRoot(reactRoot).render(
    <StrictMode>
      <LazyReactDemo />
    </StrictMode>,
  )
}

/* ════════════════════════════════════════════════════════════════════
   Startup
   ════════════════════════════════════════════════════════════════════ */

con.log('Урок 35a · lazy loading на практике.')
con.info(
  'Откройте DevTools → Network (filter JS). Нажмите "Загрузить" — увидите отдельный chunk для каждой feature.',
)
con.info(
  'hover на кнопку предзагружает chunk заранее (паттерн prefetch-on-hover).',
)
