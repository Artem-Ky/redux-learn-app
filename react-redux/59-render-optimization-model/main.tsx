import { createRoot } from 'react-dom/client'
import {
  createContext, memo, useContext, useLayoutEffect, useRef, useState,
} from 'react'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, useSelector, connect } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// ================================================
// Redux state
// ================================================

interface CounterState { value: number }
interface RootState { counter: CounterState }

type AppAction = { type: 'counter/increment' }

function counterReducer(state: CounterState = { value: 0 }, action: AppAction): CounterState {
  return action.type === 'counter/increment' ? { value: state.value + 1 } : state
}

const store = createStore(combineReducers({ counter: counterReducer }))

// ================================================
// Console
// ================================================

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — кто и когда рендерится',
)

// ================================================
// useFlash — моргает красным на каждый render
// ================================================

function useFlash() {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.classList.remove('flash')
    // force reflow, чтобы анимация перезапустилась
    void el.offsetWidth
    el.classList.add('flash')
  })
  return ref
}

// ================================================
// Leaf (универсальный UI узла)
// ================================================

interface LeafVisualProps { idx: number; value: string | number; sub: string }

function LeafVisual({ idx, value, sub }: LeafVisualProps) {
  const ref = useFlash()
  const rc = useRef(0)
  rc.current++
  return (
    <div className="ro-node" ref={ref}>
      <span className="ro-node__label">
        C{idx} <span style={{ color: 'var(--text-muted)' }}>· {sub}</span> →{' '}
        <b>{value}</b>
      </span>
      <span className="ro-node__count">×{rc.current}</span>
    </div>
  )
}

// ================================================
// КОЛОНКА 1 — Нативный React Context
// ================================================

interface NaiveCtx {
  counter: number
  stable: string
}
const NaiveContext = createContext<NaiveCtx>({ counter: 0, stable: 'x' })

function NaiveLeafCounter({ idx }: { idx: number }) {
  const { counter } = useContext(NaiveContext)
  return <LeafVisual idx={idx} value={counter} sub="counter" />
}

function NaiveLeafStable({ idx }: { idx: number }) {
  const { stable } = useContext(NaiveContext)
  return <LeafVisual idx={idx} value={stable} sub="stable" />
}

function NaiveColumn({ counter, bump }: { counter: number; bump: number }) {
  const ref = useFlash()
  // АНТИПАТТЕРН: каждый render создаёт НОВЫЙ объект
  // → Context.value меняется по ссылке → все consumers ре-рендерятся.
  const value: NaiveCtx = { counter, stable: 'stable-' + bump * 0 }
  return (
    <div className="ro-col ro-col--naive" ref={ref}>
      <div className="ro-col__header">
        <div className="ro-col__title">1. Нативный React Context</div>
        <div className="ro-col__total">&lt;Provider value=<b>{'{...}'}</b>&gt;</div>
      </div>
      <NaiveContext.Provider value={value}>
        <div className="ro-tree">
          <NaiveLeafStable  idx={1} />
          <NaiveLeafCounter idx={2} />
          <NaiveLeafStable  idx={3} />
          <NaiveLeafStable  idx={4} />
          <NaiveLeafStable  idx={5} />
        </div>
      </NaiveContext.Provider>
    </div>
  )
}

// ================================================
// КОЛОНКА 2 — connect (nested Subscription)
// ================================================

interface ConnectLeafOwnProps { idx: number }
interface ConnectLeafStateProps { counter: number }

function ConnectLeafCounterRaw(props: ConnectLeafOwnProps & ConnectLeafStateProps) {
  return <LeafVisual idx={props.idx} value={props.counter} sub="counter" />
}
const ConnectLeafCounter = connect(
  (state: RootState): ConnectLeafStateProps => ({ counter: state.counter.value }),
)(ConnectLeafCounterRaw)

function ConnectLeafStableRaw({ idx }: ConnectLeafOwnProps) {
  return <LeafVisual idx={idx} value="stable" sub="no selector" />
}
// connect без аргументов — подписка есть, но на state не смотрим,
// mapStateToProps возвращает пустой объект → не триггерит render.
// Ещё аккуратнее — null (не подписываться вовсе):
const ConnectLeafStable = connect(null)(ConnectLeafStableRaw)

function ConnectColumn({ bump }: { bump: number }) {
  const ref = useFlash()
  return (
    <div className="ro-col ro-col--connect" ref={ref}>
      <div className="ro-col__header">
        <div className="ro-col__title">2. connect() — nested Subscription</div>
        <div className="ro-col__total">
          bump: <b>{bump}</b>
        </div>
      </div>
      <div className="ro-tree">
        <ConnectLeafStable  idx={1} />
        <ConnectLeafCounter idx={2} />
        <ConnectLeafStable  idx={3} />
        <ConnectLeafStable  idx={4} />
        <ConnectLeafStable  idx={5} />
      </div>
    </div>
  )
}

// ================================================
// КОЛОНКА 3 — hooks (useSelector) + React.memo
// ================================================

const HookLeafCounter = memo(function HookLeafCounter({ idx }: { idx: number }) {
  const counter = useSelector((s: RootState) => s.counter.value)
  return <LeafVisual idx={idx} value={counter} sub="useSelector" />
})

const HookLeafStable = memo(function HookLeafStable({ idx }: { idx: number }) {
  return <LeafVisual idx={idx} value="stable" sub="без selector" />
})

function HooksColumn({ bump }: { bump: number }) {
  const ref = useFlash()
  return (
    <div className="ro-col ro-col--hooks" ref={ref}>
      <div className="ro-col__header">
        <div className="ro-col__title">3. hooks + React.memo</div>
        <div className="ro-col__total">
          bump: <b>{bump}</b>
        </div>
      </div>
      <div className="ro-tree">
        <HookLeafStable  idx={1} />
        <HookLeafCounter idx={2} />
        <HookLeafStable  idx={3} />
        <HookLeafStable  idx={4} />
        <HookLeafStable  idx={5} />
      </div>
    </div>
  )
}

// ================================================
// App
// ================================================

function App() {
  // Зеркало counter для нативной колонки — чтобы Context.value менялся.
  const [naiveCounter, setNaiveCounter] = useState(0)
  // "Искусственный" triggers for parent-re-render test.
  const [bump, setBump] = useState(0)

  return (
    <div>
      <div className="ro-controls">
        <button
          className="btn btn--accent"
          onClick={() => {
            con.info('📤 dispatch({ type: "counter/increment" })')
            con.log('  Naive:    5/5 узлов перерисуются (новый Context value)')
            con.log('  Connect:  1/5 узел перерисуется (только C2)')
            con.log('  Hooks:    1/5 узел перерисуется (только C2)')
            store.dispatch({ type: 'counter/increment' })
            setNaiveCounter(c => c + 1)
          }}
        >
          Dispatch counter/increment
        </button>
        <button
          className="btn"
          onClick={() => {
            con.warn('🔁 setBump(n+1) — родитель колонки перерисовывается, store не трогаем')
            con.log('  Naive:    5/5 узлов перерисуются (обычный React flow)')
            con.log('  Connect:  0/5 узлов — ownProps не изменились, connect skip')
            con.log('  Hooks:    0/5 узлов — React.memo skip')
            setBump(b => b + 1)
          }}
        >
          Force parent rerender
        </button>
        <button
          className="btn"
          onClick={() => {
            con.clear()
            con.info('Консоль очищена')
          }}
        >
          Clear log
        </button>
      </div>

      <div className="ro-legend" style={{ marginBottom: 10 }}>
        <span>
          <span className="ro-legend__dot" style={{ background: 'rgba(244,71,71,0.7)' }}></span>
          красное моргание = компонент отрендерился
        </span>
        <span>
          <span className="ro-legend__dot" style={{ background: 'var(--accent-cyan)' }}></span>
          значение справа — что компонент видит сейчас
        </span>
      </div>

      <div className="ro-grid">
        <NaiveColumn   counter={naiveCounter} bump={bump} />
        <ConnectColumn bump={bump} />
        <HooksColumn   bump={bump} />
      </div>

      <div style={{
        padding: 12, background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius)', fontSize: '0.85rem', color: 'var(--text-secondary)'
      }}>
        <strong style={{ color: 'var(--accent-yellow)' }}>Что происходит под капотом:</strong>
        React-Redux в <code>Context</code> кладёт стабильный объект <code>{'{ store, subscription }'}</code>
        — он не меняется. Уведомления идут через внутреннюю Subscription: linked list
        callback'ов → <code>Subscription.notify()</code> → <code>checkForUpdates</code>
        → <code>selector</code> → <code>===</code> → <code>forceRender</code> только у тех,
        у кого значение изменилось.
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <App />
  </Provider>,
)

// --- Initial log ---

con.info('Три колонки, один стор. Клик по кнопкам сравнивает поведение.')
con.log('')
con.log('Колонка 1 (native Context):')
con.log('  <Ctx.Provider value={{ counter, stable }}>')
con.log('  value — новый объект каждый render → все 5 consumers перерисуются')
con.log('')
con.log('Колонка 2 (connect):')
con.log('  C1, C3, C4, C5: connect(null) — нет подписки на state')
con.log('  C2:             connect(s => ({ counter: s.counter.value }))')
con.log('  dispatch → mapState → === → forceRender только C2')
con.log('')
con.log('Колонка 3 (hooks + memo):')
con.log('  const Leaf = memo(({ idx }) => { useSelector(...) })')
con.log('  dispatch → Subscription.notify → checkForUpdates → C2')
con.log('  parent rerender → memo блокирует C1..C5 (props не изменились)')
