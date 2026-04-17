import { createRoot } from 'react-dom/client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { legacy_createStore as createStore } from 'redux'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Redux Setup ---
// State содержит объект counter и отдельное поле other.
// Ключевое: counter — это ОБЪЕКТ { value: N }, не примитив.
// При ручном подключении каждый вызов getState().counter возвращает
// тот же объект-ссылку (если counter не менялся), НО мы всё равно
// делаем setState → React ре-рендерит (потому что мы передаём новый
// объект-обёртку { count, label } каждый раз).

interface AppState {
  counter: { value: number }
  other: { timestamp: number }
}

type AppAction =
  | { type: 'counter/increment' }
  | { type: 'counter/decrement' }
  | { type: 'other/update' }

const initialState: AppState = {
  counter: { value: 0 },
  other: { timestamp: 0 },
}

function rootReducer(state = initialState, action: AppAction): AppState {
  switch (action.type) {
    case 'counter/increment':
      return { ...state, counter: { value: state.counter.value + 1 } }
    case 'counter/decrement':
      return { ...state, counter: { value: state.counter.value - 1 } }
    case 'other/update':
      return { ...state, other: { timestamp: Date.now() } }
    default:
      return state
  }
}

const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — Ручное подключение vs React-Redux'
)

// --- Manual Counter ---
// Проблема: subscribe вызывается при КАЖДОМ dispatch (даже unrelated).
// Мы извлекаем объект { value, label } — это новый объект каждый раз,
// поэтому React перерисовывает компонент.

let manualSubscribeCalls = 0

function ManualCounter() {
  const [data, setData] = useState(() => {
    const s = store.getState()
    return { count: s.counter.value, label: `Значение: ${s.counter.value}` }
  })
  const renderCount = useRef(0)
  renderCount.current++

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      manualSubscribeCalls++
      const s = store.getState()
      // Каждый раз создаём НОВЫЙ объект → React видит новую ссылку → ре-рендер
      setData({ count: s.counter.value, label: `Значение: ${s.counter.value}` })
      con.warn(`[Ручной] subscribe #${manualSubscribeCalls} — создан новый объект → setState`)
    })
    return unsubscribe
  }, [])

  return (
    <div className="comparison__side comparison__side--bad">
      <div className="comparison__label comparison__label--bad">
        ✖ Ручное подключение (store.subscribe)
      </div>
      <div className="counter-widget">
        <button
          className="btn btn--sm"
          onClick={() => store.dispatch({ type: 'counter/decrement' })}
        >−</button>
        <div className="counter-widget__value">{data.count}</div>
        <button
          className="btn btn--sm"
          onClick={() => store.dispatch({ type: 'counter/increment' })}
        >+</button>
      </div>
      <div className="render-counter">
        Рендеров: <span>{renderCount.current}</span>
      </div>
      <div className="render-counter" style={{ marginTop: '4px' }}>
        subscribe вызовов: <span>{manualSubscribeCalls}</span>
      </div>
      <p style={{ color: 'var(--error)', fontSize: '0.78rem', marginTop: '8px' }}>
        ⚠ subscribe вызывается при КАЖДОМ dispatch, создаёт новый объект → лишний рендер
      </p>
    </div>
  )
}

// --- React-Redux Counter ---

let reduxSelectorCalls = 0

function ReactReduxCounter() {
  const count = useSelector((state: AppState) => {
    reduxSelectorCalls++
    return state.counter.value
  })
  const dispatch = useDispatch()
  const renderCount = useRef(0)
  renderCount.current++

  const handleInc = useCallback(() => dispatch({ type: 'counter/increment' }), [dispatch])
  const handleDec = useCallback(() => dispatch({ type: 'counter/decrement' }), [dispatch])

  return (
    <div className="comparison__side comparison__side--good">
      <div className="comparison__label comparison__label--good">
        ✔ React-Redux (useSelector + useDispatch)
      </div>
      <div className="counter-widget">
        <button className="btn btn--sm" onClick={handleDec}>−</button>
        <div className="counter-widget__value">{count}</div>
        <button className="btn btn--sm" onClick={handleInc}>+</button>
      </div>
      <div className="render-counter">
        Рендеров: <span>{renderCount.current}</span>
      </div>
      <div className="render-counter" style={{ marginTop: '4px' }}>
        selector вызовов: <span>{reduxSelectorCalls}</span>
      </div>
      <p style={{ color: 'var(--success)', fontSize: '0.78rem', marginTop: '8px' }}>
        ✔ useSelector сравнивает результат ===. Если counter.value не изменился → нет рендера
      </p>
    </div>
  )
}

// --- App ---

function App() {
  return (
    <div className="comparison">
      <ManualCounter />
      <ReactReduxCounter />
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

// --- Dispatch unrelated action button ---

document.getElementById('btn-dispatch-unrelated')!.addEventListener('click', () => {
  const ts = new Date().toLocaleTimeString('ru-RU', { hour12: false })
  con.log('══════════════════════════════════════')
  con.warn(`Dispatch несвязанного действия: other/update (${ts})`)
  con.warn('Изменяется ТОЛЬКО state.other, НЕ state.counter!')
  con.log('')
  con.log('Ожидание:')
  con.log('  [Ручной]       subscribe сработает → создаст новый объект → ЛИШНИЙ рендер')
  con.log('  [React-Redux]  selector вернёт то же значение → БЕЗ рендера')
  con.log('')

  store.dispatch({ type: 'other/update' })

  setTimeout(() => {
    con.log('Результат:')
    con.error(`  [Ручной]       subscribe вызовов: ${manualSubscribeCalls} (лишняя работа!)`)
    con.success(`  [React-Redux]  selector вызовов: ${reduxSelectorCalls} (selector вызван, но рендера НЕ было)`)
  }, 50)
})

// --- Initial log ---
con.info('Два счётчика подключены к одному Redux store.')
con.log('')
con.log('[Ручной подход]:')
con.log('  store.subscribe(() => setData({ count: ..., label: ... }))')
con.log('  Проблема: subscribe вызывается при КАЖДОМ dispatch.')
con.log('  Каждый раз создаётся новый объект → React видит новую ссылку → рендер.')
con.log('')
con.log('[React-Redux]:')
con.log('  useSelector(state => state.counter.value)')
con.log('  Возвращает примитив (число). При dispatch other/update:')
con.log('  selector возвращает то же число → === true → нет рендера.')
con.log('')
con.info('Попробуйте: нажмите «Dispatch несвязанного действия» несколько раз!')
con.info('Следите за «Рендеров» и «subscribe вызовов» — увидите разницу.')
