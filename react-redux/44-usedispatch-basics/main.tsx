import { createRoot } from 'react-dom/client'
import { useEffect, useRef, useState } from 'react'
import { legacy_createStore as createStore } from 'redux'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState { value: number }

type AppAction =
  | { type: 'counter/increment' }
  | { type: 'counter/decrement' }
  | { type: 'counter/reset' }
  | { type: 'counter/incrementBy'; payload: number }

function counterReducer(state: CounterState = { value: 0 }, action: AppAction): CounterState {
  switch (action.type) {
    case 'counter/increment': return { value: state.value + 1 }
    case 'counter/decrement': return { value: state.value - 1 }
    case 'counter/reset':     return { value: 0 }
    case 'counter/incrementBy': return { value: state.value + action.payload }
    default: return state
  }
}

const store = createStore(counterReducer)
type RootState = ReturnType<typeof store.getState>

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — useDispatch'
)

// --- Counter ---

function Counter() {
  const count = useSelector((state: RootState) => state.value)
  const dispatch = useDispatch()
  return (
    <div className="ud-card ud-card--counter">
      <span className="ud-card__tag">useDispatch</span>
      <div className="ud-card__title">Счётчик — dispatch actions</div>
      <div className="ud-code">{`const count = useSelector(s => s.value)
const dispatch = useDispatch()

<button onClick={() => dispatch({ type: 'counter/decrement' })}>−</button>
<span>{count}</span>
<button onClick={() => dispatch({ type: 'counter/increment' })}>+</button>`}</div>
      <div className="ud-counter">
        <button
          className="ud-counter__btn"
          onClick={() => {
            con.info('📤 dispatch({ type: "counter/decrement" })')
            dispatch({ type: 'counter/decrement' })
          }}
        >−</button>
        <div className="ud-counter__val">{count}</div>
        <button
          className="ud-counter__btn"
          onClick={() => {
            con.info('📤 dispatch({ type: "counter/increment" })')
            dispatch({ type: 'counter/increment' })
          }}
        >+</button>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          className="ud-counter__reset"
          onClick={() => {
            con.info('📤 dispatch({ type: "counter/incrementBy", payload: 5 })')
            dispatch({ type: 'counter/incrementBy', payload: 5 })
          }}
        >+5</button>
        <button
          className="ud-counter__reset"
          onClick={() => {
            con.info('📤 dispatch({ type: "counter/incrementBy", payload: 10 })')
            dispatch({ type: 'counter/incrementBy', payload: 10 })
          }}
        >+10</button>
        <button
          className="ud-counter__reset"
          onClick={() => {
            con.info('📤 dispatch({ type: "counter/reset" })')
            dispatch({ type: 'counter/reset' })
          }}
        >reset</button>
      </div>
    </div>
  )
}

// --- Stability tracker ---

function DispatchStability() {
  const dispatch = useDispatch()
  const prevDispatchRef = useRef<typeof dispatch | null>(null)
  const renderRef = useRef(0)
  const uniqueRefs = useRef(0)
  const changed = useRef(0)
  const effectRunsRef = useRef(0)

  renderRef.current++

  if (prevDispatchRef.current === null) {
    uniqueRefs.current = 1
    con.success(`[stability] рендер #${renderRef.current}: первая ссылка на dispatch зарегистрирована`)
  } else if (prevDispatchRef.current !== dispatch) {
    uniqueRefs.current++
    changed.current++
    con.error(`[stability] рендер #${renderRef.current}: dispatch ИЗМЕНИЛСЯ! (новая ссылка)`)
  } else {
    con.log(`[stability] рендер #${renderRef.current}: dispatch === prev (стабилен)`)
  }
  prevDispatchRef.current = dispatch

  useEffect(() => {
    effectRunsRef.current++
    con.warn(`[stability] useEffect[dispatch] запустился (run #${effectRunsRef.current})`)
    con.log('             (если dispatch стабилен — запусков будет всего 1 — на mount)')
  }, [dispatch])

  const count = useSelector((state: RootState) => state.value)

  return (
    <div className="ud-card ud-card--stability">
      <span className="ud-card__tag">stability</span>
      <div className="ud-card__title">Проверка стабильности dispatch</div>
      <div className="ud-code">{`const dispatch = useDispatch()
const prev = useRef(null)

if (prev.current !== dispatch) {
  // никогда не должно случиться
  // при обычном одном store
  log('dispatch changed!')
}
prev.current = dispatch

useEffect(() => {
  log('effect[dispatch] run')
}, [dispatch])`}</div>
      <div className="ud-stats">
        <div className="ud-stat">
          <div className="ud-stat__label">рендеров</div>
          <div className="ud-stat__val">{renderRef.current}</div>
        </div>
        <div className="ud-stat">
          <div className="ud-stat__label">читает count</div>
          <div className="ud-stat__val">{count}</div>
        </div>
        <div className="ud-stat">
          <div className="ud-stat__label">уникальных ссылок dispatch</div>
          <div className={`ud-stat__val ${uniqueRefs.current === 1 ? 'ud-stat__val--green' : 'ud-stat__val--red'}`}>
            {uniqueRefs.current}
          </div>
        </div>
        <div className="ud-stat">
          <div className="ud-stat__label">изменений dispatch</div>
          <div className={`ud-stat__val ${changed.current === 0 ? 'ud-stat__val--green' : 'ud-stat__val--red'}`}>
            {changed.current}
          </div>
        </div>
        <div className="ud-stat">
          <div className="ud-stat__label">useEffect[dispatch] запусков</div>
          <div className="ud-stat__val ud-stat__val--green">{effectRunsRef.current}</div>
        </div>
        <div className="ud-stat">
          <div className="ud-stat__label">ожидаемо запусков</div>
          <div className="ud-stat__val">1</div>
        </div>
      </div>
      <div className="ud-hint">
        <strong>dispatch === предыдущий dispatch</strong> — стабильная ссылка, можно класть в deps.
      </div>
    </div>
  )
}

function Parent() {
  const [tick, setTick] = useState(0)
  return (
    <div>
      <div className="global-controls">
        <button
          className="btn btn--danger"
          onClick={() => {
            con.log('')
            con.warn('🔄 setState на локальном tick — оба компонента ре-рендерятся')
            setTick(n => n + 1)
          }}
        >render parent (tick = {tick})</button>
      </div>

      <div className="ud-grid">
        <Counter />
        <DispatchStability />
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

con.info('useDispatch — возвращает ссылку на store.dispatch')
con.log('')
con.log('Ожидания:')
con.log('  • dispatch одна и та же ссылка на всех рендерах (уникальных ссылок: 1)')
con.log('  • useEffect с [dispatch] запускается ровно один раз — на mount')
con.log('  • Нажмите "render parent" или кнопки счётчика — уникальных ссылок останется 1')
con.log('')
con.log('Если бы dispatch менялся — линт бы был прав требовать его в deps.')
con.log('Он стабилен, но положить в deps всё равно правильно (формальная корректность).')
