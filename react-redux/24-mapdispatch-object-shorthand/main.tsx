import { createRoot } from 'react-dom/client'
import { useEffect, useRef, useState } from 'react'
import { legacy_createStore as createStore, combineReducers, bindActionCreators } from 'redux'
import type { Dispatch } from 'redux'
import { Provider, connect } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState {
  value: number
}

interface RootState {
  counter: CounterState
}

// --- Action creators ---

const increment = () => ({ type: 'counter/increment' as const })
const decrement = () => ({ type: 'counter/decrement' as const })
const reset = () => ({ type: 'counter/reset' as const })

type CounterAction =
  | ReturnType<typeof increment>
  | ReturnType<typeof decrement>
  | ReturnType<typeof reset>

// --- Reducer ---

function counterReducer(
  state: CounterState = { value: 0 },
  action: CounterAction | { type: string }
): CounterState {
  switch (action.type) {
    case 'counter/increment':
      return { value: state.value + 1 }
    case 'counter/decrement':
      return { value: state.value - 1 }
    case 'counter/reset':
      return { value: 0 }
    default:
      return state
  }
}

const rootReducer = combineReducers({ counter: counterReducer })
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — эволюция mapDispatchToProps'
)

// Snapshot для сравнения props
interface PropsSnapshot {
  hasCount: boolean
  hasIncrement: boolean
  hasDecrement: boolean
  hasReset: boolean
  hasDispatch: boolean
  keys: string[]
}

const [snapA, snapB, snapC] = [
  { current: null as PropsSnapshot | null },
  { current: null as PropsSnapshot | null },
  { current: null as PropsSnapshot | null },
]

function snapshotOf(props: Record<string, unknown>): PropsSnapshot {
  return {
    hasCount: 'count' in props,
    hasIncrement: typeof props.increment === 'function',
    hasDecrement: typeof props.decrement === 'function',
    hasReset: typeof props.reset === 'function',
    hasDispatch: typeof props.dispatch === 'function',
    keys: Object.keys(props).sort(),
  }
}

// ============================================================
// Shared counter UI
// ============================================================

interface CounterUIProps {
  count: number
  onIncrement: () => void
  onDecrement: () => void
  onReset: () => void
}

function CounterUI(props: CounterUIProps) {
  return (
    <>
      <div className="stage__counter">{props.count}</div>
      <div className="stage__buttons">
        <button className="btn btn--sm" onClick={props.onDecrement}>−</button>
        <button className="btn btn--sm btn--success" onClick={props.onIncrement}>+</button>
        <button className="btn btn--sm btn--danger" onClick={props.onReset}>reset</button>
      </div>
    </>
  )
}

const mapStateToProps = (state: RootState) => ({
  count: state.counter.value,
})

// ============================================================
// Stage A — функция руками
// ============================================================

interface StageProps {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

function StageARaw(props: StageProps) {
  useEffect(() => {
    snapA.current = snapshotOf(props as unknown as Record<string, unknown>)
  })
  return (
    <CounterUI
      count={props.count}
      onIncrement={() => {
        con.log('[A функция]            props.increment()')
        props.increment()
      }}
      onDecrement={() => {
        con.log('[A функция]            props.decrement()')
        props.decrement()
      }}
      onReset={() => {
        con.log('[A функция]            props.reset()')
        props.reset()
      }}
    />
  )
}

const mapDispatchA = (dispatch: Dispatch<CounterAction>) => ({
  increment: () => dispatch(increment()),
  decrement: () => dispatch(decrement()),
  reset: () => dispatch(reset()),
})

const StageA = connect(mapStateToProps, mapDispatchA)(StageARaw)

// ============================================================
// Stage B — bindActionCreators
// ============================================================

function StageBRaw(props: StageProps) {
  useEffect(() => {
    snapB.current = snapshotOf(props as unknown as Record<string, unknown>)
  })
  return (
    <CounterUI
      count={props.count}
      onIncrement={() => {
        con.log('[B bindActionCreators] props.increment()')
        props.increment()
      }}
      onDecrement={() => {
        con.log('[B bindActionCreators] props.decrement()')
        props.decrement()
      }}
      onReset={() => {
        con.log('[B bindActionCreators] props.reset()')
        props.reset()
      }}
    />
  )
}

const mapDispatchB = (dispatch: Dispatch<CounterAction>) =>
  bindActionCreators({ increment, decrement, reset }, dispatch)

const StageB = connect(mapStateToProps, mapDispatchB)(StageBRaw)

// ============================================================
// Stage C — object shorthand (рекомендуется)
// ============================================================

function StageCRaw(props: StageProps) {
  useEffect(() => {
    snapC.current = snapshotOf(props as unknown as Record<string, unknown>)
  })
  return (
    <CounterUI
      count={props.count}
      onIncrement={() => {
        con.success('[C object shorthand]   props.increment()  (react-redux внутри вызвал bindActionCreators)')
        props.increment()
      }}
      onDecrement={() => {
        con.success('[C object shorthand]   props.decrement()')
        props.decrement()
      }}
      onReset={() => {
        con.success('[C object shorthand]   props.reset()')
        props.reset()
      }}
    />
  )
}

const StageC = connect(mapStateToProps, { increment, decrement, reset })(StageCRaw)

// ============================================================
// App
// ============================================================

function PropsTable() {
  const [, forceRender] = useState(0)
  const tickRef = useRef<number | null>(null)

  useEffect(() => {
    tickRef.current = window.setInterval(() => forceRender(n => n + 1), 400)
    return () => {
      if (tickRef.current !== null) window.clearInterval(tickRef.current)
    }
  }, [])

  const rows: Array<[string, PropsSnapshot | null]> = [
    ['A  функция', snapA.current],
    ['B  bindActionCreators', snapB.current],
    ['C  object shorthand', snapC.current],
  ]

  return (
    <table className="props-table">
      <thead>
        <tr>
          <th>вариант</th>
          <th>count</th>
          <th>increment</th>
          <th>decrement</th>
          <th>reset</th>
          <th>dispatch</th>
          <th>keys</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, s]) => (
          <tr key={label}>
            <td>{label}</td>
            <td className={s?.hasCount ? 'same' : ''}>{s?.hasCount ? 'number' : '—'}</td>
            <td className={s?.hasIncrement ? 'same' : ''}>{s?.hasIncrement ? 'ƒ ()' : '—'}</td>
            <td className={s?.hasDecrement ? 'same' : ''}>{s?.hasDecrement ? 'ƒ ()' : '—'}</td>
            <td className={s?.hasReset ? 'same' : ''}>{s?.hasReset ? 'ƒ ()' : '—'}</td>
            <td style={{ color: s?.hasDispatch ? 'var(--accent-orange)' : 'var(--text-muted)' }}>
              {s?.hasDispatch ? 'ƒ ()' : '— (нет)'}
            </td>
            <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {s ? `{ ${s.keys.join(', ')} }` : '…'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function App() {
  return (
    <div>
      <div className="evolution">
        <div className="stage stage--a">
          <div className="stage__label">A — функция руками</div>
          <div className="stage__code">
{`const mapDispatchToProps =
  (dispatch) => ({
    increment: () =>
      dispatch(increment()),
    decrement: () =>
      dispatch(decrement()),
    reset: () =>
      dispatch(reset()),
  })

connect(
  mapStateToProps,
  mapDispatchToProps
)(Counter)`}
          </div>
          <StageA />
        </div>

        <div className="stage stage--b">
          <div className="stage__label">B — bindActionCreators</div>
          <div className="stage__code">
{`import { bindActionCreators }
  from 'redux'

const mapDispatchToProps =
  (dispatch) =>
    bindActionCreators(
      { increment,
        decrement,
        reset },
      dispatch
    )`}
          </div>
          <StageB />
        </div>

        <div className="stage stage--c">
          <div className="stage__label">
            C — object shorthand ★ рекомендуется
          </div>
          <div className="stage__code">
{`// просто объект:
connect(
  mapStateToProps,
  { increment,
    decrement,
    reset }
)(Counter)

// react-redux вызовет
// bindActionCreators
// автоматически`}
          </div>
          <StageC />
        </div>
      </div>

      <div
        style={{
          padding: 12,
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div
          style={{
            color: 'var(--accent-yellow)',
            fontWeight: 600,
            marginBottom: 4,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem',
          }}
        >
          Props компонентов — доказательство, что все три варианта эквивалентны:
        </div>
        <PropsTable />
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
          Во всех трёх случаях набор ключей одинаковый, <code>dispatch</code> отсутствует.
          Значит — выбор между стилями это вопрос краткости кода, а не поведения.
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

con.info('Object shorthand — рекомендуемая форма mapDispatchToProps')
con.log('')
con.log('A, B, C — три варианта записи, но в runtime поведение одинаковое.')
con.log('Смотрите таблицу props ниже — там видно, что keys совпадают.')
con.log('')
con.log('Идиоматичный стиль: connect(mapStateToProps, { actionA, actionB })(Component)')
