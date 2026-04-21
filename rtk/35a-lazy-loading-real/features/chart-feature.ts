/* ════════════════════════════════════════════════════════════════════
   chart-feature.ts — lazy feature module

   Этот файл НИКОГДА не импортируется статически. Он подгружается
   через `await import('./features/chart-feature')` и попадает в
   отдельный chunk `chart-feature-XXXX.js`.
   ════════════════════════════════════════════════════════════════════ */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Store } from 'redux'
import type { ConsolePanel } from '../../shared/console-panel'

interface ChartState {
  points: number[]
}

const chartSlice = createSlice({
  name: 'chart',
  initialState: { points: [] } as ChartState,
  reducers: {
    addPoint: (s, a: PayloadAction<number>) => {
      s.points.push(a.payload)
      if (s.points.length > 20) s.points.shift()
    },
    clearPoints: (s) => {
      s.points = []
    },
  },
})

export function register(
  rootReducer: Parameters<typeof chartSlice.injectInto>[0],
  store: Store,
  host: HTMLElement,
  con: ConsolePanel,
): void {
  const injected = chartSlice.injectInto(rootReducer)
  store.dispatch({ type: '@@INIT_INJECTED/chart' })
  con.success('chart slice injected → state.chart появился')

  host.innerHTML = `
    <div class="feature-ui">
      <div class="feature-ui__title">Chart · массив точек</div>
      <div class="feature-ui__bars" data-bars></div>
      <div class="feature-ui__btns">
        <button class="btn btn--tiny" data-act="add">+ addPoint</button>
        <button class="btn btn--tiny btn--secondary" data-act="clear">clear</button>
      </div>
    </div>
  `
  const barsEl = host.querySelector<HTMLElement>('[data-bars]')!

  const update = (): void => {
    const state = store.getState() as { chart?: ChartState }
    const points = state.chart?.points ?? []
    barsEl.innerHTML = points
      .map((p) => `<div class="bar" style="height:${Math.max(4, p)}px" title="${p}"></div>`)
      .join('') || '<span class="feature-ui__empty">пусто — нажмите addPoint</span>'
  }
  store.subscribe(update)
  update()

  host.querySelector('[data-act="add"]')!.addEventListener('click', () => {
    const a = injected.actions.addPoint(Math.floor(Math.random() * 80) + 10)
    store.dispatch(a)
    con.action(a, 'chart')
  })
  host.querySelector('[data-act="clear"]')!.addEventListener('click', () => {
    const a = injected.actions.clearPoints()
    store.dispatch(a)
    con.action(a, 'chart')
  })
}
