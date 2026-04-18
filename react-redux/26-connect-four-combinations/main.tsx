import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, connect, useSelector } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState {
  value: number
}

interface OtherState {
  ticks: number
}

interface RootState {
  counter: CounterState
  other: OtherState
}

type CounterAction =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'RESET' }
  | { type: 'TICK' }

// --- Reducers ---

function counterReducer(
  state: CounterState = { value: 0 },
  action: CounterAction
): CounterState {
  switch (action.type) {
    case 'INCREMENT': return { value: state.value + 1 }
    case 'DECREMENT': return { value: state.value - 1 }
    case 'RESET':     return { value: 0 }
    default: return state
  }
}

function otherReducer(
  state: OtherState = { ticks: 0 },
  action: CounterAction
): OtherState {
  switch (action.type) {
    case 'TICK': return { ticks: state.ticks + 1 }
    default: return state
  }
}

const rootReducer = combineReducers({
  counter: counterReducer,
  other: otherReducer,
})
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — 4 варианта connect'
)

// --- Render counters per variant ---

const renderCounts = { v1: 0, v2: 0, v3: 0, v4: 0 }

// --- Action creators (для вариантов 3 и 4) ---

const increment = () => ({ type: 'INCREMENT' as const })
const decrement = () => ({ type: 'DECREMENT' as const })
const reset     = () => ({ type: 'RESET' as const })

const mapDispatchToProps = { increment, decrement, reset }

// --- mapStateToProps (для вариантов 2 и 4) ---

const mapStateToProps = (state: RootState) => ({
  count: state.counter.value,
})

// --- Компонент-счётчик (universal) ---

interface CounterProps {
  variant: 1 | 2 | 3 | 4
  count?: number
  dispatch?: (action: CounterAction) => void
  increment?: () => CounterAction
  decrement?: () => CounterAction
  reset?: () => CounterAction
}

function CounterRaw(props: CounterProps) {
  const key = `v${props.variant}` as keyof typeof renderCounts
  renderCounts[key]++
  const rc = renderCounts[key]

  // Для вариантов 1 и 3 читаем count напрямую через useSelector
  // только для ОТОБРАЖЕНИЯ — это не влияет на подписку connect.
  // НО: чтобы показать что варианты 1 и 3 НЕ подписаны через connect,
  // мы специально НЕ читаем state в них — показываем «—».
  const hasSubscription = props.variant === 2 || props.variant === 4

  const propsKeys = Object.keys(props).filter(k => k !== 'variant')

  const badgeClass = hasSubscription
    ? 'combo-card__badge combo-card__badge--sub'
    : 'combo-card__badge combo-card__badge--nosub'

  const handleDispatch = () => {
    con.log('')
    if (props.variant === 1) {
      con.info('📤 Вариант 1: props.dispatch({ type: "INCREMENT" })')
      props.dispatch!({ type: 'INCREMENT' })
    } else if (props.variant === 2) {
      con.info('📤 Вариант 2: props.dispatch({ type: "INCREMENT" })')
      props.dispatch!({ type: 'INCREMENT' })
    } else if (props.variant === 3) {
      con.info('📤 Вариант 3: props.increment()')
      props.increment!()
    } else {
      con.info('📤 Вариант 4: props.increment()')
      props.increment!()
    }
  }

  const codeByVariant: Record<1 | 2 | 3 | 4, string> = {
    1: 'connect()(Counter)',
    2: 'connect(mapStateToProps)(Counter)',
    3: 'connect(null, mapDispatchToProps)(Counter)',
    4: 'connect(mapStateToProps, mapDispatchToProps)(Counter)',
  }

  const titleByVariant: Record<1 | 2 | 3 | 4, string> = {
    1: 'Вариант 1',
    2: 'Вариант 2',
    3: 'Вариант 3',
    4: 'Вариант 4',
  }

  return (
    <div className="combo-card">
      <div className="combo-card__header">
        <div>
          <div className="combo-card__num">{titleByVariant[props.variant]}</div>
          <div className="combo-card__title">{codeByVariant[props.variant]}</div>
        </div>
        <span className={badgeClass}>
          {hasSubscription ? 'subscribed' : 'not subscribed'}
        </span>
      </div>

      <div className="combo-card__counter">
        <div>
          <div className="combo-card__counter-label">props.count</div>
          <div className="combo-card__counter-value">
            {props.count !== undefined ? props.count : '—'}
          </div>
        </div>
        <div>
          <div className="combo-card__counter-label">рендеров</div>
          <div className="combo-card__counter-value">{rc}</div>
        </div>
      </div>

      <div className="combo-card__props">
        <div className="combo-card__props-title">Object.keys(props):</div>
        {propsKeys.length === 0
          ? <span style={{ color: 'var(--text-muted)' }}>(пусто)</span>
          : propsKeys.map((k, i) => (
              <span key={k}>
                <span className="combo-card__props-key">{k}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {': '}
                  {typeof (props as any)[k] === 'function'
                    ? <span className="combo-card__props-type">ƒ</span>
                    : JSON.stringify((props as any)[k])}
                </span>
                {i < propsKeys.length - 1 ? <span style={{ color: 'var(--text-muted)' }}>, </span> : null}
              </span>
            ))
        }
      </div>

      <button className="btn btn--accent btn--sm" onClick={handleDispatch}>
        dispatch INCREMENT
      </button>
    </div>
  )
}

// --- Четыре connect-обёртки ---

const CounterV1 = connect()(CounterRaw)
const CounterV2 = connect(mapStateToProps)(CounterRaw)
const CounterV3 = connect(null, mapDispatchToProps)(CounterRaw)
const CounterV4 = connect(mapStateToProps, mapDispatchToProps)(CounterRaw)

// --- Top-level App ---

function StateDisplay() {
  const value = useSelector((s: RootState) => s.counter.value)
  const ticks = useSelector((s: RootState) => s.other.ticks)
  return (
    <div className="state-display">
      <div style={{ display: 'flex', gap: 40, justifyContent: 'center' }}>
        <div>
          <div className="state-display__value">{value}</div>
          <div className="state-display__label">state.counter.value</div>
        </div>
        <div>
          <div className="state-display__value">{ticks}</div>
          <div className="state-display__label">state.other.ticks</div>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <div>
      <StateDisplay />
      <div className="global-controls">
        <button
          className="btn btn--success"
          onClick={() => {
            con.log('')
            con.info('🌐 store.dispatch({ type: "INCREMENT" }) — меняет counter')
            store.dispatch({ type: 'INCREMENT' })
          }}
        >
          counter +1
        </button>
        <button
          className="btn"
          onClick={() => {
            con.log('')
            con.info('🌐 store.dispatch({ type: "DECREMENT" }) — меняет counter')
            store.dispatch({ type: 'DECREMENT' })
          }}
        >
          counter −1
        </button>
        <button
          className="btn"
          onClick={() => {
            con.log('')
            con.info('🌐 store.dispatch({ type: "TICK" }) — меняет state.other, counter НЕ трогает')
            store.dispatch({ type: 'TICK' })
          }}
        >
          tick (другой срез)
        </button>
        <button
          className="btn btn--danger"
          onClick={() => {
            con.log('')
            con.info('🌐 store.dispatch({ type: "RESET" })')
            store.dispatch({ type: 'RESET' })
          }}
        >
          reset
        </button>
      </div>

      <div className="combo-grid">
        <CounterV1 variant={1} />
        <CounterV2 variant={2} />
        <CounterV3 variant={3} />
        <CounterV4 variant={4} />
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

con.info('Четыре комбинации connect — одна страница')
con.log('')
con.log('Вариант 1: connect()(Counter)                            — props = { dispatch }')
con.log('Вариант 2: connect(mapStateToProps)(Counter)             — props = { count, dispatch }')
con.log('Вариант 3: connect(null, mapDispatchToProps)(Counter)    — props = { increment, decrement, reset }')
con.log('Вариант 4: connect(mapStateToProps, mapDispatchToProps)  — props = { count, increment, decrement, reset }')
con.log('')
con.log('Нажмите "counter +1" — вы увидите, что только варианты 2 и 4 (с mapStateToProps)')
con.log('ре-рендерятся. Варианты 1 и 3 не подписаны на store → счётчик рендеров не растёт.')
con.log('')
con.log('Нажмите "tick" — он меняет state.other.ticks, не counter. Вариант 4 тоже НЕ ре-рендерится,')
con.log('потому что mapStateToProps возвращает { count: state.counter.value } — счётчик не изменился.')
