/* ════════════════════════════════════════════════════════════════════
   analytics-feature.ts — "тяжёлая" lazy feature

   Имитирует реальную feature-модуль продакшена:
   - createSelector из reselect (мемоизация)
   - Большой inline моковый датасет (~10 KB JSON) — представьте, что
     это preloaded mock для графиков / эвентов
   - Несколько трансформаций (aggregate, sort, top-N)

   Всё это — в отдельном chunk'е, который грузится ТОЛЬКО когда юзер
   реально нажал "Analytics". В main-бандле этого нет.
   ════════════════════════════════════════════════════════════════════ */

import {
  createSlice,
  createSelector,
  type PayloadAction,
} from '@reduxjs/toolkit'
import type { Store } from 'redux'
import type { ConsolePanel } from '../../shared/console-panel'

interface Event {
  ts: number
  category: 'click' | 'view' | 'purchase' | 'error'
  value: number
}

interface AnalyticsState {
  events: Event[]
  filter: Event['category'] | 'all'
}

/* ── Имитация "heavy preloaded data" — 120 событий, ~ 8 KB JSON ── */
const MOCK_EVENTS: Event[] = Array.from({ length: 120 }, (_, i) => {
  const cats: Event['category'][] = ['click', 'view', 'purchase', 'error']
  return {
    ts: Date.now() - (120 - i) * 60_000,
    category: cats[i % 4],
    value: Math.floor(Math.random() * 100) + 1,
  }
})

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: { events: MOCK_EVENTS, filter: 'all' } as AnalyticsState,
  reducers: {
    setFilter: (s, a: PayloadAction<AnalyticsState['filter']>) => {
      s.filter = a.payload
    },
    pushEvent: (s, a: PayloadAction<Event>) => {
      s.events.push(a.payload)
    },
  },
})

/* ── Мемоизированный селектор (reselect) ── */
const selectEvents = (state: { analytics?: AnalyticsState }) => state.analytics?.events ?? []
const selectFilter = (state: { analytics?: AnalyticsState }) => state.analytics?.filter ?? 'all'

const selectFiltered = createSelector(
  [selectEvents, selectFilter],
  (events, filter) => (filter === 'all' ? events : events.filter((e) => e.category === filter)),
)

const selectAggregate = createSelector([selectFiltered], (events) => {
  const byCat: Record<string, { count: number; sum: number }> = {}
  for (const e of events) {
    if (!byCat[e.category]) byCat[e.category] = { count: 0, sum: 0 }
    byCat[e.category].count += 1
    byCat[e.category].sum += e.value
  }
  return byCat
})

export function register(
  rootReducer: Parameters<typeof analyticsSlice.injectInto>[0],
  store: Store,
  host: HTMLElement,
  con: ConsolePanel,
): void {
  const injected = analyticsSlice.injectInto(rootReducer)
  store.dispatch({ type: '@@INIT_INJECTED/analytics' })
  con.success(`analytics slice injected · ${MOCK_EVENTS.length} событий загружено в state`)

  host.innerHTML = `
    <div class="feature-ui">
      <div class="feature-ui__title">Analytics · heavy chunk (reselect + mock data)</div>
      <div class="feature-ui__btns" data-filters>
        <button class="btn btn--tiny" data-f="all">all</button>
        <button class="btn btn--tiny" data-f="click">click</button>
        <button class="btn btn--tiny" data-f="view">view</button>
        <button class="btn btn--tiny" data-f="purchase">purchase</button>
        <button class="btn btn--tiny" data-f="error">error</button>
      </div>
      <div class="feature-ui__aggregate" data-agg></div>
    </div>
  `
  const aggEl = host.querySelector<HTMLElement>('[data-agg]')!

  const update = (): void => {
    const state = store.getState()
    const agg = selectAggregate(state as { analytics?: AnalyticsState })
    const rows = Object.entries(agg).map(
      ([cat, { count, sum }]) => `
        <div class="agg-row">
          <span class="agg-row__cat">${cat}</span>
          <span class="agg-row__count">${count} ev.</span>
          <span class="agg-row__sum">Σ ${sum}</span>
        </div>
      `,
    )
    aggEl.innerHTML = rows.join('') || '<span class="feature-ui__empty">— пусто —</span>'

    const filter = selectFilter(state as { analytics?: AnalyticsState })
    host.querySelectorAll<HTMLButtonElement>('[data-f]').forEach((b) => {
      b.classList.toggle('btn--active', b.dataset.f === filter)
    })
  }
  store.subscribe(update)
  update()

  host.querySelectorAll<HTMLButtonElement>('[data-f]').forEach((b) => {
    b.addEventListener('click', () => {
      const a = injected.actions.setFilter(b.dataset.f as AnalyticsState['filter'])
      store.dispatch(a)
      con.action(a, 'analytics')
    })
  })
}
