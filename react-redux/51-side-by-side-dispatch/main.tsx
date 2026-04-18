import { useRef, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import type { Dispatch } from 'redux'
import { Provider, connect, useSelector, useDispatch, type ConnectedProps } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState { value: number }
interface RootState { counter: CounterState }

type AppAction =
  | { type: 'counter/increment' }
  | { type: 'counter/decrement' }
  | { type: 'counter/reset' }

// --- Reducer + Store ---

function counterReducer(state: CounterState = { value: 0 }, action: AppAction): CounterState {
  switch (action.type) {
    case 'counter/increment': return { value: state.value + 1 }
    case 'counter/decrement': return { value: state.value - 1 }
    case 'counter/reset':     return { value: 0 }
    default: return state
  }
}

const store = createStore(combineReducers({ counter: counterReducer }))

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — dispatch: 3 способа'
)

// --- Action creators (объявлены один раз, переиспользуются) ---

const increment = () => ({ type: 'counter/increment' } as const)
const decrement = () => ({ type: 'counter/decrement' } as const)
const reset     = () => ({ type: 'counter/reset' } as const)

// --- Ref-tracking утилита: регистрируем ссылку и показываем, меняется ли она ---

type RefRecord = { last: unknown; changes: number; total: number }
const refRecords: Record<string, RefRecord> = {}

function trackRef(label: string, value: unknown): RefRecord {
  const rec = refRecords[label] ?? (refRecords[label] = { last: undefined, changes: 0, total: 0 })
  rec.total++
  if (rec.last !== value) {
    if (rec.total > 1) rec.changes++
    rec.last = value
  }
  return rec
}

// ================================================
// Вариант 1: mapDispatchToProps как функция
// ================================================

interface StatePropsV1 { count: number }
interface DispatchPropsV1 {
  increment: () => void
  decrement: () => void
  reset: () => void
}

const mapStateToPropsV1 = (state: RootState): StatePropsV1 => ({ count: state.counter.value })

const mapDispatchToPropsV1 = (dispatch: Dispatch<AppAction>): DispatchPropsV1 => ({
  increment: () => dispatch({ type: 'counter/increment' }),
  decrement: () => dispatch({ type: 'counter/decrement' }),
  reset:     () => dispatch({ type: 'counter/reset' }),
})

function CounterFnRaw({ count, increment, decrement, reset }: StatePropsV1 & DispatchPropsV1) {
  const renders = useRef(0)
  renders.current++
  const incRef = trackRef('fn:increment', increment)
  con.info(`[fn]   рендер #${renders.current} · count=${count} · increment стабилен: ${incRef.changes === 0 ? 'ДА' : 'НЕТ'}`)

  return (
    <div className="sbs-card sbs-card--fn">
      <div className="sbs-card__header">
        <div className="sbs-card__title">mapDispatchToProps (функция)</div>
        <div className="sbs-card__renders">рендеров: {renders.current}</div>
      </div>
      <div className="sbs-card__count">
        <div className="sbs-card__count-val">{count}</div>
      </div>
      <div className="sbs-card__buttons">
        <button className="btn btn--success btn--sm" onClick={increment}>+1</button>
        <button className="btn btn--danger btn--sm" onClick={decrement}>−1</button>
        <button className="btn btn--sm" onClick={reset}>reset</button>
      </div>
      <div className="sbs-card__code">{`const mapDispatchToProps = (dispatch) => ({
  increment: () => dispatch({ type: 'counter/increment' }),
  decrement: () => dispatch({ type: 'counter/decrement' }),
  reset:     () => dispatch({ type: 'counter/reset' }),
})
connect(mapStateToProps, mapDispatchToProps)(Counter)`}</div>
    </div>
  )
}

const CounterFn = connect(mapStateToPropsV1, mapDispatchToPropsV1)(CounterFnRaw)

// ================================================
// Вариант 2: mapDispatchToProps как объект (shorthand)
// ================================================

const mapStateToPropsV2 = (state: RootState) => ({ count: state.counter.value })
const mapDispatchToPropsV2 = { increment, decrement, reset }

const connectorV2 = connect(mapStateToPropsV2, mapDispatchToPropsV2)
type ConnectV2Props = ConnectedProps<typeof connectorV2>

function CounterObjRaw({ count, increment, decrement, reset }: ConnectV2Props) {
  const renders = useRef(0)
  renders.current++
  const incRef = trackRef('obj:increment', increment)
  con.log(`[obj]  рендер #${renders.current} · count=${count} · increment стабилен: ${incRef.changes === 0 ? 'ДА' : 'НЕТ'}`)

  return (
    <div className="sbs-card sbs-card--obj">
      <div className="sbs-card__header">
        <div className="sbs-card__title">mapDispatchToProps (объект)</div>
        <div className="sbs-card__renders">рендеров: {renders.current}</div>
      </div>
      <div className="sbs-card__count">
        <div className="sbs-card__count-val">{count}</div>
      </div>
      <div className="sbs-card__buttons">
        <button className="btn btn--success btn--sm" onClick={() => increment()}>+1</button>
        <button className="btn btn--danger btn--sm" onClick={() => decrement()}>−1</button>
        <button className="btn btn--sm" onClick={() => reset()}>reset</button>
      </div>
      <div className="sbs-card__code">{`connect(
  mapStateToProps,
  { increment, decrement, reset }
)(Counter)`}</div>
    </div>
  )
}

const CounterObj = connectorV2(CounterObjRaw)

// ================================================
// Вариант 3: useDispatch
// ================================================

function CounterHook() {
  const count = useSelector((state: RootState) => state.counter.value)
  const dispatch = useDispatch<Dispatch<AppAction>>()

  const inc = useCallback(() => dispatch({ type: 'counter/increment' }), [dispatch])
  const dec = useCallback(() => dispatch({ type: 'counter/decrement' }), [dispatch])
  const rst = useCallback(() => dispatch({ type: 'counter/reset' }),     [dispatch])

  const renders = useRef(0)
  renders.current++
  const incRef = trackRef('hook:increment', inc)
  con.warn(`[hook] рендер #${renders.current} · count=${count} · increment стабилен: ${incRef.changes === 0 ? 'ДА' : 'НЕТ'}`)

  return (
    <div className="sbs-card sbs-card--hook">
      <div className="sbs-card__header">
        <div className="sbs-card__title">useDispatch + useCallback</div>
        <div className="sbs-card__renders">рендеров: {renders.current}</div>
      </div>
      <div className="sbs-card__count">
        <div className="sbs-card__count-val">{count}</div>
      </div>
      <div className="sbs-card__buttons">
        <button className="btn btn--success btn--sm" onClick={inc}>+1</button>
        <button className="btn btn--danger btn--sm" onClick={dec}>−1</button>
        <button className="btn btn--sm" onClick={rst}>reset</button>
      </div>
      <div className="sbs-card__code">{`const dispatch = useDispatch()
const inc = useCallback(
  () => dispatch({ type: 'counter/increment' }),
  [dispatch]
)`}</div>
    </div>
  )
}

// ================================================
// App + панель стабильности ссылок
// ================================================

function RefsPanel() {
  const fn   = refRecords['fn:increment']
  const obj  = refRecords['obj:increment']
  const hook = refRecords['hook:increment']

  return (
    <div className="ref-panel">
      <div className="ref-panel__item">
        <span className="ref-panel__label">Стабильность ссылок increment:</span>
      </div>
      <div className="ref-panel__item">
        <span className="ref-panel__label">fn:</span>
        <span className="ref-panel__val">
          {fn ? `${fn.changes} смен из ${fn.total} рендеров` : '—'}
        </span>
      </div>
      <div className="ref-panel__item">
        <span className="ref-panel__label">obj:</span>
        <span className="ref-panel__val">
          {obj ? `${obj.changes} смен из ${obj.total} рендеров` : '—'}
        </span>
      </div>
      <div className="ref-panel__item">
        <span className="ref-panel__label">hook:</span>
        <span className="ref-panel__val">
          {hook ? `${hook.changes} смен из ${hook.total} рендеров` : '—'}
        </span>
      </div>
    </div>
  )
}

function App() {
  return (
    <div>
      <RefsPanel />
      <div className="sbs-grid">
        <CounterFn />
        <CounterObj />
        <CounterHook />
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

con.info('Урок 51 — сравнение: отправка actions')
con.log('')
con.log('Три способа отправить одно и то же action:')
con.log('  1. mapDispatchToProps (функция)  — ручная обёртка')
con.log('  2. mapDispatchToProps (объект)   — рекомендованная краткая форма')
con.log('  3. useDispatch + useCallback     — hooks-вариант')
con.log('')
con.log('Кликайте по кнопкам любой карточки — обновляется общий count.')
con.log('Все три карточки ре-рендерятся одинаково, потому что все три подписаны на state.counter.value.')
