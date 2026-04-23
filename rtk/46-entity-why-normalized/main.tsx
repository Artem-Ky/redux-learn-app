import {
  configureStore,
  createSlice,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── типы ────────────────────────────────────────────
interface Todo { id: string; text: string; done: boolean }

// Форма A: массив
interface ArrayState { items: Todo[] }
// Форма B: нормализованный { ids, entities }
interface MapState { ids: string[]; entities: Record<string, Todo> }

// ── два мини-store (чтобы подчеркнуть сравнение в DevTools) ──
const arraySlice = createSlice({
  name: 'arrayBench',
  initialState: { items: [] } as ArrayState,
  reducers: {
    setAll: (state, action: PayloadAction<Todo[]>) => { state.items = action.payload },
    clear: (state) => { state.items = [] },
  },
})

const mapSlice = createSlice({
  name: 'mapBench',
  initialState: { ids: [], entities: {} } as MapState,
  reducers: {
    setAll: (state, action: PayloadAction<Todo[]>) => {
      const ids: string[] = []
      const entities: Record<string, Todo> = {}
      for (const t of action.payload) {
        ids.push(t.id)
        entities[t.id] = t
      }
      state.ids = ids
      state.entities = entities
    },
    clear: (state) => { state.ids = []; state.entities = {} },
  },
})

const store = configureStore({
  reducer: {
    arrayBench: arraySlice.reducer,
    mapBench: mapSlice.reducer,
  },
})

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог бенчмарка')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── DOM ────────────────────────────────────────────
const sizeEl = document.getElementById('size') as HTMLInputElement
const barArray = document.getElementById('bar-array')!
const barMap = document.getElementById('bar-map')!
const valArray = document.getElementById('val-array')!
const valMap = document.getElementById('val-map')!
const ratioEl = document.getElementById('ratio')!
const shapeA = document.getElementById('shape-a')!
const shapeB = document.getElementById('shape-b')!

function renderShapes(): void {
  const s = store.getState()
  const head = s.arrayBench.items.slice(0, 2)
  const headIds = s.mapBench.ids.slice(0, 2)
  const headEnt: Record<string, Todo> = {}
  for (const id of headIds) headEnt[id] = s.mapBench.entities[id]

  shapeA.textContent = s.arrayBench.items.length === 0
    ? '[ ]'
    : `[ ${head.map(t => JSON.stringify({ id: t.id.slice(0, 4), text: t.text })).join(',\n  ')},\n  ...\n] (N=${s.arrayBench.items.length})`

  shapeB.textContent = s.mapBench.ids.length === 0
    ? '{ ids: [], entities: {} }'
    : `ids: [ ${headIds.map(i => `'${i.slice(0, 4)}'`).join(', ')}, ... ] (N=${s.mapBench.ids.length})
entities: {
  ${headIds.map(id => `'${id.slice(0, 4)}': {text:'${headEnt[id].text}'}`).join(',\n  ')},
  ...
}`
}

renderShapes()
store.subscribe(renderShapes)

// ── генерация ───────────────────────────────────────
function genData(n: number): Todo[] {
  const arr: Todo[] = []
  for (let i = 0; i < n; i++) {
    arr.push({ id: nanoid(), text: `todo #${i}`, done: Math.random() > 0.5 })
  }
  return arr
}

document.getElementById('gen')!.addEventListener('click', () => {
  const n = Math.max(10, Math.min(100000, parseInt(sizeEl.value, 10) || 1000))
  con.info(`Генерация ${n} todos → два shape'а параллельно`)
  const data = genData(n)

  const t0 = performance.now()
  store.dispatch(arraySlice.actions.setAll(data))
  const t1 = performance.now()
  store.dispatch(mapSlice.actions.setAll(data))
  const t2 = performance.now()

  con.log(`setAll(array): ${(t1 - t0).toFixed(2)}ms`)
  con.log(`setAll(map):   ${(t2 - t1).toFixed(2)}ms  ← нужно построить Record`)
  con.success('Данные готовы — жми "benchmark find"')
})

// ── бенчмарк ────────────────────────────────────────
document.getElementById('bench')!.addEventListener('click', () => {
  const s = store.getState()
  const data = s.arrayBench.items
  if (data.length === 0) {
    con.warn('Сначала сгенерируй данные.')
    return
  }

  const iterations = 10000
  // случайные id для поиска
  const targets: string[] = []
  for (let i = 0; i < iterations; i++) {
    targets.push(data[Math.floor(Math.random() * data.length)].id)
  }

  // Array.find
  const arr = s.arrayBench.items
  const ta = performance.now()
  let sinkA: string | undefined = ''
  for (let i = 0; i < iterations; i++) {
    const t = arr.find((x) => x.id === targets[i])
    sinkA = t?.id
  }
  const tb = performance.now()
  void sinkA

  // entities[id]
  const ent = s.mapBench.entities
  const tc = performance.now()
  let sinkB: string | undefined = ''
  for (let i = 0; i < iterations; i++) {
    const t = ent[targets[i]]
    sinkB = t?.id
  }
  const td = performance.now()
  void sinkB

  const arrayMs = (tb - ta) / iterations
  const mapMs = (td - tc) / iterations
  const ratio = mapMs === 0 ? Infinity : arrayMs / mapMs

  // визуализация (лог-шкала: 100% = самое медленное)
  const max = Math.max(arrayMs, mapMs, 0.0001)
  const pctA = (arrayMs / max) * 100
  const pctB = Math.max(1, (mapMs / max) * 100)
  barArray.style.width = `${pctA}%`
  barMap.style.width = `${pctB}%`
  barArray.textContent = `${arrayMs.toFixed(5)} ms`
  barMap.textContent = `${mapMs.toFixed(5)} ms`
  valArray.textContent = `${arrayMs.toFixed(5)} ms`
  valMap.textContent = `${mapMs.toFixed(5)} ms`
  ratioEl.textContent = `entities[id] быстрее в ${ratio.toFixed(1)}× на N=${data.length} (${iterations} итераций, среднее).`

  con.info(`Array.find:    ${arrayMs.toFixed(5)} ms / call`)
  con.info(`entities[id]:  ${mapMs.toFixed(5)} ms / call`)
  con.success(`Разница: ${ratio.toFixed(1)}× в пользу map. Это O(n) vs O(1).`)
})

document.getElementById('clear')!.addEventListener('click', () => {
  store.dispatch(arraySlice.actions.clear())
  store.dispatch(mapSlice.actions.clear())
  barArray.style.width = '0'
  barMap.style.width = '0'
  barArray.textContent = '—'
  barMap.textContent = '—'
  valArray.textContent = '— ms'
  valMap.textContent = '— ms'
  ratioEl.textContent = '—'
  con.log('очищено.')
})

con.log('Два мини-store: arrayBench и mapBench. Храним одни и те же данные в разной форме.')
con.info('Нажми generate → benchmark find. Пронаблюдай разницу O(n) vs O(1).')
