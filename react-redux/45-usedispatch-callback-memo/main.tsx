import { createRoot } from 'react-dom/client'
import { memo, useCallback, useState } from 'react'
import { legacy_createStore as createStore } from 'redux'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState { value: number }

type AppAction =
  | { type: 'counter/increment' }
  | { type: 'counter/decrement' }
  | { type: 'counter/reset' }

function counterReducer(state: CounterState = { value: 0 }, action: AppAction): CounterState {
  switch (action.type) {
    case 'counter/increment': return { value: state.value + 1 }
    case 'counter/decrement': return { value: state.value - 1 }
    case 'counter/reset':     return { value: 0 }
    default: return state
  }
}

const store = createStore(counterReducer)
type RootState = ReturnType<typeof store.getState>

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — inline callback vs useCallback'
)

// --- Render counters ---

const renders = { parent: 0, inlineChild: 0, memoChild: 0 }

// --- Memoized child components ---

interface ChildProps { onClick: () => void; label: string }

const InlineChild = memo(function InlineChild({ onClick, label }: ChildProps) {
  renders.inlineChild++
  con.error(`  [inline child]   рендер #${renders.inlineChild} (новая ссылка onClick → memo не спас)`)
  return (
    <div className="cb-child">
      <div className="cb-child__label">React.memo · props.onClick = inline () =&gt; dispatch(...)</div>
      <button className="cb-child__btn" onClick={onClick}>{label}</button>
      <div className="cb-child__label">рендеров ребёнка: <strong>{renders.inlineChild}</strong> · ре-рендерится всякий раз, когда ре-рендерится Parent</div>
    </div>
  )
})

const MemoChild = memo(function MemoChild({ onClick, label }: ChildProps) {
  renders.memoChild++
  con.success(`  [memo child]     рендер #${renders.memoChild} (ссылка onClick стабильна → memo скипнул)`)
  return (
    <div className="cb-child">
      <div className="cb-child__label">React.memo · props.onClick = useCallback(..., [dispatch])</div>
      <button className="cb-child__btn" onClick={onClick}>{label}</button>
      <div className="cb-child__label">рендеров ребёнка: <strong>{renders.memoChild}</strong> · НЕ ре-рендерится, если props не поменялись</div>
    </div>
  )
})

// --- Cards ---

function InlineCard({ onClick }: { onClick: () => void }) {
  const count = useSelector((state: RootState) => state.value)
  return (
    <div className="cb-card cb-card--bad">
      <span className="cb-card__tag">❌ Без useCallback</span>
      <div className="cb-card__title">inline () =&gt; dispatch(...)</div>
      <div className="cb-card__code">{`// Parent (inline):
const onClick = () => dispatch({ type: 'counter/increment' })
<InlineChild onClick={onClick} />

const InlineChild = memo(({ onClick }) => (
  <button onClick={onClick}>+</button>
))`}</div>
      <InlineChild onClick={onClick} label={`+ (count = ${count})`} />
      <div className="cb-stats">
        <div className="cb-stat">
          <div className="cb-stat__label">ссылка onClick</div>
          <div className="cb-stat__val cb-stat__val--red">новая каждый раз</div>
        </div>
        <div className="cb-stat">
          <div className="cb-stat__label">memo прошёл?</div>
          <div className="cb-stat__val cb-stat__val--red">нет — props.onClick !== prev</div>
        </div>
      </div>
    </div>
  )
}

function CallbackCard({ onClick }: { onClick: () => void }) {
  const count = useSelector((state: RootState) => state.value)
  return (
    <div className="cb-card cb-card--good">
      <span className="cb-card__tag">✔ useCallback</span>
      <div className="cb-card__title">useCallback(..., [dispatch])</div>
      <div className="cb-card__code">{`// Parent (memoized):
const onClick = useCallback(
  () => dispatch({ type: 'counter/increment' }),
  [dispatch]
)
<MemoChild onClick={onClick} />

const MemoChild = memo(({ onClick }) => (
  <button onClick={onClick}>+</button>
))`}</div>
      <MemoChild onClick={onClick} label={`+ (count = ${count})`} />
      <div className="cb-stats">
        <div className="cb-stat">
          <div className="cb-stat__label">ссылка onClick</div>
          <div className="cb-stat__val cb-stat__val--green">стабильна</div>
        </div>
        <div className="cb-stat">
          <div className="cb-stat__label">memo прошёл?</div>
          <div className="cb-stat__val cb-stat__val--green">да (если label не поменялся)</div>
        </div>
      </div>
    </div>
  )
}

// --- Parent ---

function Parent() {
  renders.parent++
  const [tick, setTick] = useState(0)
  const dispatch = useDispatch()
  const count = useSelector((state: RootState) => state.value)

  const onClickInline = () => {
    con.info('📤 inline dispatch({ type: "counter/increment" })')
    dispatch({ type: 'counter/increment' })
  }

  const onClickMemo = useCallback(() => {
    con.info('📤 memo dispatch({ type: "counter/increment" })')
    dispatch({ type: 'counter/increment' })
  }, [dispatch])

  con.log(`[Parent] рендер #${renders.parent} · tick=${tick}`)

  return (
    <div>
      <div className="parent-panel">
        <div className="parent-panel__row">
          Parent рендер #<span className="parent-panel__val">{renders.parent}</span>
          {'  ·  '}
          Parent local tick: <span className="parent-panel__val">{tick}</span>
        </div>
        <div className="parent-panel__row" style={{ color: 'var(--text-muted)' }}>
          count в store: <span className="parent-panel__val">{count}</span>
        </div>
      </div>

      <div className="global-controls">
        <button
          className="btn btn--danger"
          onClick={() => {
            con.log('')
            con.warn(`🔄 setTick(${tick + 1}) — только local state, store не трогаем`)
            con.log('   inline child → ре-рендерится (новая ссылка onClick)')
            con.log('   memo child   → НЕ ре-рендерится (ссылка onClick та же)')
            setTick(n => n + 1)
          }}
        >render parent (local setState)</button>
        <button
          className="btn btn--accent"
          onClick={() => {
            con.log('')
            con.info('📤 dispatch({ type: "counter/reset" })')
            dispatch({ type: 'counter/reset' })
          }}
        >dispatch reset (counter меняется — оба ре-рендерятся, раз count в props)</button>
      </div>

      <div className="cb-grid">
        <InlineCard onClick={onClickInline} />
        <CallbackCard onClick={onClickMemo} />
      </div>
    </div>
  )
}

// --- Render ---

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <Parent />
  </Provider>
)

// --- Initial log ---

con.info('useDispatch + useCallback + React.memo')
con.log('')
con.log('Оба child обёрнуты в React.memo. Разница — как передаётся onClick:')
con.log('  inline:    () => dispatch(...)           — новая функция каждый рендер Parent')
con.log('  memoized:  useCallback(..., [dispatch])  — та же ссылка, пока dispatch жив')
con.log('')
con.log('Нажмите "render parent":')
con.log('  inline child  → рендер # растёт (memo не спасает)')
con.log('  memo child    → рендер # стоит на месте (props.onClick === prev)')
con.log('')
con.log('Нажмите "+" в любом child или "dispatch reset":')
con.log('  counter в store меняется → count в props обоих child меняется → оба ре-рендерятся.')
