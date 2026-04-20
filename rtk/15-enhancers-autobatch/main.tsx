import {
  configureStore,
  createSlice,
  prepareAutoBatched,
  type EnhancedStore,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface State { value: number }

const sliceNoBatch = createSlice({
  name: 'noBatch',
  initialState: { value: 0 } as State,
  reducers: { tick: (s) => { s.value += 1 } },
})

const sliceBatch = createSlice({
  name: 'batch',
  initialState: { value: 0 } as State,
  reducers: {
    tick: {
      reducer: (s) => { s.value += 1 },
      prepare: prepareAutoBatched<void>(),
    },
  },
})

const storeNoBatch = configureStore({
  reducer: { noBatch: sliceNoBatch.reducer },
}) as EnhancedStore<{ noBatch: State }>

const storeBatch = configureStore({
  reducer: { batch: sliceBatch.reducer },
}) as EnhancedStore<{ batch: State }>

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог autoBatch')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(storeBatch)

let noBatchRenders = 0
let batchRenders = 0

storeNoBatch.subscribe(() => {
  noBatchRenders += 1
  document.getElementById('no-batch-renders')!.textContent = String(noBatchRenders)
})

storeBatch.subscribe(() => {
  batchRenders += 1
  document.getElementById('batch-renders')!.textContent = String(batchRenders)
})

document.getElementById('run-no-batch')!.addEventListener('click', () => {
  con.info('Запуск 100 dispatch без autoBatch...')
  const start = performance.now()
  for (let i = 0; i < 100; i++) {
    storeNoBatch.dispatch(sliceNoBatch.actions.tick())
  }
  const elapsed = (performance.now() - start).toFixed(1)
  con.success(`Готово за ${elapsed}ms. Subscriber вызван ${noBatchRenders} раз (всего, с накоплением).`)
})

document.getElementById('run-batch')!.addEventListener('click', () => {
  con.info('Запуск 100 dispatch с autoBatch (prepareAutoBatched)...')
  const before = batchRenders
  const start = performance.now()
  for (let i = 0; i < 100; i++) {
    storeBatch.dispatch(sliceBatch.actions.tick())
  }
  const elapsed = (performance.now() - start).toFixed(1)
  setTimeout(() => {
    const delta = batchRenders - before
    con.success(`Готово за ${elapsed}ms. Subscriber вызван +${delta} раз (через requestAnimationFrame).`)
    con.info('Все 100 actions попали в DevTools — autoBatch их не пропускает.')
  }, 50)
})

document.getElementById('reset-counters')!.addEventListener('click', () => {
  noBatchRenders = 0
  batchRenders = 0
  document.getElementById('no-batch-renders')!.textContent = '0'
  document.getElementById('batch-renders')!.textContent = '0'
  con.log('Счётчики сброшены.')
})

con.log('autoBatch батчит уведомления subscriber, не сами actions.')
con.warn('subscribe('+'fn) для batch-store вызывается ОДИН раз на пачку (через rAF).')
