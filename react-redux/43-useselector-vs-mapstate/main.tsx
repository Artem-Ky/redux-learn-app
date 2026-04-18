import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { legacy_createStore as createStore, combineReducers, Dispatch } from 'redux'
import { Provider, connect, useSelector } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState { value: number }
interface MessageState { text: string }

interface RootState {
  counter: CounterState
  message: MessageState
}

type AppAction =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'SET_MESSAGE'; payload: string }

function counterReducer(state: CounterState = { value: 1 }, action: AppAction): CounterState {
  switch (action.type) {
    case 'INCREMENT': return { value: state.value + 1 }
    case 'DECREMENT': return { value: state.value - 1 }
    default: return state
  }
}

function messageReducer(state: MessageState = { text: 'привет' }, action: AppAction): MessageState {
  switch (action.type) {
    case 'SET_MESSAGE': return { text: action.payload }
    default: return state
  }
}

const rootReducer = combineReducers({ counter: counterReducer, message: messageReducer })
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — connect vs hooks'
)

// --- Render counters ---

const renders = { parent: 0, connect: 0, hooks: 0 }

// --- connect вариант ---

interface OwnProps { multiplier: number }
interface StateProps { count: number; scaled: number }
interface DispatchProps { dispatch: Dispatch<AppAction> }
type ConnectedCardProps = OwnProps & StateProps & DispatchProps

function ConnectedCardImpl({ count, scaled, multiplier }: ConnectedCardProps) {
  renders.connect++
  con.log(`  [connect] рендер #${renders.connect} · count=${count} · multiplier=${multiplier} · scaled=${scaled}`)
  return (
    <div className="vs-card vs-card--connect">
      <span className="vs-card__tag">connect</span>
      <div className="vs-card__title">mapStateToProps(state, ownProps)</div>
      <div className="vs-card__code">{`const mapStateToProps = (state, ownProps) => ({
  count: state.counter.value,
  scaled: state.counter.value * ownProps.multiplier
})

connect(mapStateToProps)(Card)`}</div>
      <div className="vs-card__display">
        <div className="vs-card__display-val">{scaled}</div>
        <div className="vs-card__display-eq">
          count={count} × multiplier={multiplier}
        </div>
      </div>
      <div className="vs-card__stats">
        <div className="vs-card__stat">
          <div className="vs-card__stat-label">рендеров этого компонента</div>
          <div className="vs-card__stat-val">{renders.connect}</div>
        </div>
      </div>
    </div>
  )
}

const mapStateToProps = (state: RootState, ownProps: OwnProps): StateProps => ({
  count: state.counter.value,
  scaled: state.counter.value * ownProps.multiplier,
})

const ConnectedCard = connect(mapStateToProps)(ConnectedCardImpl)

// --- hooks вариант ---

function HooksCard({ multiplier }: OwnProps) {
  const count = useSelector((state: RootState) => state.counter.value)
  const scaled = count * multiplier
  renders.hooks++
  con.log(`  [hooks]   рендер #${renders.hooks} · count=${count} · multiplier=${multiplier} · scaled=${scaled}`)
  return (
    <div className="vs-card vs-card--hooks">
      <span className="vs-card__tag">hooks</span>
      <div className="vs-card__title">useSelector + closure ownProps</div>
      <div className="vs-card__code">{`function Card({ multiplier }) {
  const count = useSelector(
    state => state.counter.value
  )
  return <div>{count * multiplier}</div>
}`}</div>
      <div className="vs-card__display">
        <div className="vs-card__display-val">{scaled}</div>
        <div className="vs-card__display-eq">
          count={count} × multiplier={multiplier}
        </div>
      </div>
      <div className="vs-card__stats">
        <div className="vs-card__stat">
          <div className="vs-card__stat-label">рендеров этого компонента</div>
          <div className="vs-card__stat-val">{renders.hooks}</div>
        </div>
      </div>
    </div>
  )
}

// --- Parent ---

function Parent() {
  const [multiplier, setMultiplier] = useState(2)
  const [tick, setTick] = useState(0)
  renders.parent++
  con.log(`[Parent] рендер #${renders.parent} · tick=${tick} · multiplier=${multiplier}`)

  const dispatchAndLog = (action: AppAction, label: string) => {
    con.log('')
    con.info(`📤 store.dispatch(${label})`)
    store.dispatch(action)
  }

  return (
    <div>
      <div className="parent-panel">
        <div className="parent-panel__row">
          <span className="parent-panel__label">Parent render count:</span>
          <span className="parent-panel__val">{renders.parent}</span>
          <span className="parent-panel__label">Parent local tick:</span>
          <span className="parent-panel__val">{tick}</span>
        </div>
        <div className="parent-panel__row">
          <span className="parent-panel__label">multiplier (ownProps):</span>
          <input
            type="range"
            min="1"
            max="10"
            value={multiplier}
            onChange={e => setMultiplier(Number(e.target.value))}
          />
          <span className="parent-panel__val">{multiplier}</span>
        </div>
      </div>

      <div className="global-controls">
        <button
          className="btn btn--success"
          onClick={() => dispatchAndLog({ type: 'INCREMENT' }, '{ type: "INCREMENT" }')}
        >counter +1 (оба ре-рендерятся)</button>
        <button
          className="btn"
          onClick={() => dispatchAndLog({ type: 'DECREMENT' }, '{ type: "DECREMENT" }')}
        >counter −1</button>
        <button
          className="btn btn--accent"
          onClick={() => {
            const next = store.getState().message.text === 'привет' ? 'пока' : 'привет'
            dispatchAndLog(
              { type: 'SET_MESSAGE', payload: next },
              `{ type: "SET_MESSAGE", payload: "${next}" } — unrelated slice`
            )
          }}
        >set message (unrelated)</button>
        <button
          className="btn btn--danger"
          onClick={() => {
            con.log('')
            con.warn('🔄 setTick — только локальное состояние родителя')
            setTick(n => n + 1)
          }}
        >render parent (local state)</button>
      </div>

      <div className="vs-grid">
        <ConnectedCard multiplier={multiplier} />
        <HooksCard multiplier={multiplier} />
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

con.info('connect vs useSelector — одинаковый UI, разный рантайм')
con.log('')
con.log('counter +1 / counter −1:  store.counter меняется → оба ре-рендерятся')
con.log('set message:              store.message меняется, counter — нет → оба НЕ ре-рендерятся')
con.log('render parent:            Parent делает setState на local state, store не трогается')
con.log('                          → connect-ребёнок НЕ ре-рендерится (shouldComponentUpdate)')
con.log('                          → hooks-ребёнок ре-рендерится вместе с родителем')
con.log('                          → hooks + React.memo повёл бы себя как connect')
con.log('multiplier slider:        ownProps ребёнка меняется → оба ре-рендерятся,')
con.log('                          connect передаёт ownProps в mapStateToProps, hooks — через closure')
