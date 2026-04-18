import { useRef, useState, useEffect, memo, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, connect, useSelector, type ConnectedProps } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface Todo { id: number; text: string; done: boolean }
interface TodosState { byId: Record<number, Todo>; ids: number[] }
interface NoiseState { tick: number }

interface RootState {
  todos: TodosState
  noise: NoiseState
}

type AppAction =
  | { type: 'TOGGLE_TODO'; payload: number }
  | { type: 'NOISE_TICK' }

// --- Initial state: 100 todos ---

const ITEM_COUNT = 100

function makeInitialTodos(): TodosState {
  const byId: Record<number, Todo> = {}
  const ids: number[] = []
  for (let i = 0; i < ITEM_COUNT; i++) {
    byId[i] = { id: i, text: `Item ${i}`, done: false }
    ids.push(i)
  }
  return { byId, ids }
}

// --- Reducers ---

function todosReducer(state: TodosState = makeInitialTodos(), action: AppAction): TodosState {
  switch (action.type) {
    case 'TOGGLE_TODO': {
      const id = action.payload
      const t = state.byId[id]
      if (!t) return state
      return {
        ...state,
        byId: { ...state.byId, [id]: { ...t, done: !t.done } },
      }
    }
    default: return state
  }
}

function noiseReducer(state: NoiseState = { tick: 0 }, action: AppAction): NoiseState {
  switch (action.type) {
    case 'NOISE_TICK': return { tick: state.tick + 1 }
    default: return state
  }
}

const store = createStore(combineReducers({ todos: todosReducer, noise: noiseReducer }))

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — 100 items × 3 реализации'
)

// --- Render counters (module-level, обновляются детьми) ---

const renderCounters = { connect: 0, hook: 0, memo: 0 }

const renderStatsListeners = new Set<() => void>()
function subscribeRenderStats(onStoreChange: () => void) {
  renderStatsListeners.add(onStoreChange)
  return () => renderStatsListeners.delete(onStoreChange)
}
function notifyRenderStats() {
  for (const cb of renderStatsListeners) cb()
}

function RenderCounterStat({ field }: { field: 'connect' | 'hook' | 'memo' }) {
  const n = useSyncExternalStore(
    subscribeRenderStats,
    () => renderCounters[field],
    () => renderCounters[field]
  )
  return <span className="perf-col__stat-val">{n}</span>
}

// --- Общие стили клетки + flash-эффект ---

function Cell({ id, done, highlight, label }: { id: number; done: boolean; highlight: boolean; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.animate(
      [
        { backgroundColor: 'rgba(244, 71, 71, 0.75)' },
        { backgroundColor: done ? 'rgba(76, 175, 80, 0.15)' : '#2a2a2a' },
      ],
      { duration: 500, easing: 'ease-out', fill: 'forwards' }
    )
  })
  return (
    <div
      ref={ref}
      className={`perf-cell ${done ? 'perf-cell--done' : ''} ${highlight ? 'perf-cell--highlight' : ''}`}
      title={label}
    >
      {id}
    </div>
  )
}

// ================================================
// Вариант 1: connect
// ================================================

interface ItemOwnProps { id: number; highlight: boolean }

const mapStateToPropsItem = (state: RootState, ownProps: ItemOwnProps) => ({
  todo: state.todos.byId[ownProps.id],
})

const itemConnector = connect(mapStateToPropsItem)
type ConnectItemProps = ConnectedProps<typeof itemConnector> & ItemOwnProps

function TodoItemConnectRaw({ id, highlight, todo }: ConnectItemProps) {
  renderCounters.connect++
  return <Cell id={id} done={!!todo?.done} highlight={highlight} label={`connect · ${id}`} />
}
const TodoItemConnect = itemConnector(TodoItemConnectRaw)

function ListConnect({ highlightId }: { highlightId: number }) {
  const ids = useSelector((state: RootState) => state.todos.ids)
  return (
    <div className="perf-heatmap">
      {ids.map(id => <TodoItemConnect key={id} id={id} highlight={id === highlightId} />)}
    </div>
  )
}

// ================================================
// Вариант 2: hooks БЕЗ memo
// ================================================

function TodoItemHook({ id, highlight }: ItemOwnProps) {
  const todo = useSelector((state: RootState) => state.todos.byId[id])
  renderCounters.hook++
  return <Cell id={id} done={!!todo?.done} highlight={highlight} label={`hook · ${id}`} />
}

function ListHook({ highlightId }: { highlightId: number }) {
  const ids = useSelector((state: RootState) => state.todos.ids)
  return (
    <div className="perf-heatmap">
      {ids.map(id => <TodoItemHook key={id} id={id} highlight={id === highlightId} />)}
    </div>
  )
}

// ================================================
// Вариант 3: hooks + React.memo
// ================================================

const TodoItemMemo = memo(function TodoItemMemoRaw({ id, highlight }: ItemOwnProps) {
  const todo = useSelector((state: RootState) => state.todos.byId[id])
  renderCounters.memo++
  return <Cell id={id} done={!!todo?.done} highlight={highlight} label={`memo · ${id}`} />
})

function ListMemo({ highlightId }: { highlightId: number }) {
  const ids = useSelector((state: RootState) => state.todos.ids)
  return (
    <div className="perf-heatmap">
      {ids.map(id => <TodoItemMemo key={id} id={id} highlight={id === highlightId} />)}
    </div>
  )
}

// ================================================
// Parent + общие контролы
// ================================================

const HIGHLIGHT_ID = 42

/** Не держать noise в App — иначе NOISE_TICK ре-рендерит предка над списками → 100× хук без memo. */
function NoiseTickReadout() {
  const tick = useSelector((state: RootState) => state.noise.tick)
  return <span className="parent-panel__val">{tick}</span>
}

function App() {
  const [parentTick, setParentTick] = useState(0)

  useEffect(() => {
    notifyRenderStats()
  }, [])

  const dispatchAndLog = (action: AppAction, label: string) => {
    con.log('')
    con.info(`📤 dispatch(${label})`)
    const before = { ...renderCounters }
    store.dispatch(action)
    queueMicrotask(() => {
      const diffC = renderCounters.connect - before.connect
      const diffH = renderCounters.hook - before.hook
      const diffM = renderCounters.memo - before.memo
      con.log(`   Δ renders: connect=${diffC}, hook=${diffH}, memo=${diffM}`)
      if (diffC + diffH + diffM > 0) notifyRenderStats()
    })
  }

  const onForceParent = () => {
    con.log('')
    con.warn(`setParentTick(${parentTick + 1}) — родитель перерисуется, state Redux НЕ меняется`)
    const before = { ...renderCounters }
    setParentTick(t => t + 1)
    queueMicrotask(() => {
      const diffC = renderCounters.connect - before.connect
      const diffH = renderCounters.hook - before.hook
      const diffM = renderCounters.memo - before.memo
      con.log(`   Δ renders от parent re-render: connect=${diffC}, hook=${diffH}, memo=${diffM}`)
      notifyRenderStats()
    })
  }

  return (
    <div>
      <div className="global-controls">
        <button className="btn btn--success" onClick={() => dispatchAndLog({ type: 'TOGGLE_TODO', payload: HIGHLIGHT_ID }, `TOGGLE_TODO · id=${HIGHLIGHT_ID}`)}>
          Toggle item {HIGHLIGHT_ID}
        </button>
        <button className="btn btn--accent" onClick={onForceParent}>
          Force parent rerender
        </button>
        <button className="btn btn--danger" onClick={() => dispatchAndLog({ type: 'NOISE_TICK' }, 'NOISE_TICK (unrelated)')}>
          Dispatch unrelated (noise)
        </button>
      </div>

      <div className="parent-panel">
        parentTick: <span className="parent-panel__val">{parentTick}</span> ·
        noise.tick: <NoiseTickReadout />
      </div>

      <div className="perf-grid">
        <div className="perf-col perf-col--connect">
          <div className="perf-col__title">connect (shouldComponentUpdate)</div>
          <div className="perf-col__stat">
            <span className="perf-col__stat-label">total renders across items:</span>
            <RenderCounterStat field="connect" />
          </div>
          <ListConnect highlightId={HIGHLIGHT_ID} />
        </div>

        <div className="perf-col perf-col--hook">
          <div className="perf-col__title">hooks (БЕЗ React.memo)</div>
          <div className="perf-col__stat">
            <span className="perf-col__stat-label">total renders across items:</span>
            <RenderCounterStat field="hook" />
          </div>
          <ListHook highlightId={HIGHLIGHT_ID} />
        </div>

        <div className="perf-col perf-col--memo">
          <div className="perf-col__title">hooks + React.memo</div>
          <div className="perf-col__stat">
            <span className="perf-col__stat-label">total renders across items:</span>
            <RenderCounterStat field="memo" />
          </div>
          <ListMemo highlightId={HIGHLIGHT_ID} />
        </div>
      </div>
    </div>
  )
}

// --- Render ---

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <App />
  </Provider>
)

// --- Initial log ---

con.info('Урок 52 — производительность: connect vs hooks')
con.log('')
con.log('Три колонки × 100 компонентов TodoItem.')
con.log('Клетка мигает красным → этот компонент только что перерисовался.')
con.log('')
con.info('Ожидаемое поведение:')
con.log('  1. Toggle item 42        → 1 компонент во всех трёх вариантах')
con.log('  2. Force parent rerender → connect: 0, hook: 100 (!), memo: 0')
con.log('  3. Dispatch unrelated    → 0 во всех трёх (noise только в NoiseTickReadout; без лишнего forceUpdate над списками)')
