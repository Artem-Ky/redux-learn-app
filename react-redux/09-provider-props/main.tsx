import { createRoot } from 'react-dom/client'
import { useState, useRef } from 'react'
import { legacy_createStore as createStore } from 'redux'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

const initialState: CounterState = { value: 0 }

function counterReducer(
  state = initialState,
  action: { type: string }
): CounterState {
  switch (action.type) {
    case 'counter/increment':
      return { value: state.value + 1 }
    case 'counter/decrement':
      return { value: state.value - 1 }
    default:
      return state
  }
}

const store = createStore(counterReducer)

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — Provider props'
)

interface PropInfo {
  name: string
  type: string
  required: boolean
  description: string
  example: string
}

const providerProps: PropInfo[] = [
  {
    name: 'store',
    type: 'Store<S, A>',
    required: true,
    description:
      'Redux store, созданный через createStore() или configureStore(). Provider помещает его в React Context и создаёт корневую Subscription.',
    example: `const store = createStore(rootReducer)

<Provider store={store}>
  <App />
</Provider>`,
  },
  {
    name: 'context',
    type: 'React.Context<ReactReduxContextValue>',
    required: false,
    description:
      'Пользовательский React Context. Позволяет изолировать несколько Redux store в одном приложении. useSelector и connect тоже должны получить этот context.',
    example: `const MyContext = React.createContext(null)

<Provider store={storeA} context={MyContext}>
  <App />
</Provider>

// Внутри компонента:
const val = useSelector(selector, { context: MyContext })`,
  },
  {
    name: 'serverState',
    type: 'S (тип state)',
    required: false,
    description:
      'Серверное состояние для SSR-гидрации. Используется с hydrateRoot, чтобы useSelector на клиенте вернул серверное значение до первого dispatch — это предотвращает hydration mismatch.',
    example: `// На клиенте при SSR-гидрации:
hydrateRoot(
  document.getElementById('root'),
  <Provider
    store={store}
    serverState={window.__PRELOADED_STATE__}
  >
    <App />
  </Provider>
)`,
  },
  {
    name: 'stabilityCheck',
    type: "'never' | 'once' | 'always'",
    required: false,
    description:
      'Контроль проверки стабильности selector-функций в dev-режиме. React-Redux вызывает selector дважды с одним state и предупреждает, если результаты !== (нестабильный selector). По умолчанию: "once".',
    example: `// Отключить проверку (не рекомендуется):
<Provider store={store} stabilityCheck="never">
  <App />
</Provider>

// Проверять при каждом вызове:
<Provider store={store} stabilityCheck="always">
  <App />
</Provider>`,
  },
]

function PropsExplorer() {
  const [activeIndex, setActiveIndex] = useState(0)

  const toggleProp = (index: number) => {
    const newIndex = activeIndex === index ? -1 : index
    setActiveIndex(newIndex)
    if (newIndex >= 0) {
      const prop = providerProps[newIndex]
      con.info(`Prop: ${prop.name} (${prop.required ? 'обязательный' : 'опциональный'})`)
      con.log(`  Тип: ${prop.type}`)
    }
  }

  return (
    <div>
      <div className="props-list">
        {providerProps.map((prop, i) => (
          <div
            key={prop.name}
            className={`prop-card${activeIndex === i ? ' active' : ''}`}
          >
            <div className="prop-card__header" onClick={() => toggleProp(i)}>
              <div className="prop-card__name">{prop.name}</div>
              <div className="prop-card__meta">
                <span
                  className={`prop-card__required prop-card__required--${
                    prop.required ? 'yes' : 'no'
                  }`}
                >
                  {prop.required ? 'required' : 'optional'}
                </span>
                <span className="prop-card__toggle">▼</span>
              </div>
            </div>
            <div className="prop-card__body">
              <div className="prop-card__type">{prop.type}</div>
              <div className="prop-card__desc">{prop.description}</div>
              <div
                className="ts-interface"
                style={{ marginTop: '12px', fontSize: '0.8rem' }}
              >
                {prop.example}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px' }}>
        <div
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            marginBottom: '8px',
            textAlign: 'center',
          }}
        >
          Рабочий пример: Provider с prop store
        </div>
        <LiveCounter />
      </div>
    </div>
  )
}

function LiveCounter() {
  const count = useSelector((state: CounterState) => state.value)
  const dispatch = useDispatch()
  const renderCount = useRef(0)
  renderCount.current++

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
        }}
      >
        <button
          className="btn btn--accent"
          onClick={() => {
            dispatch({ type: 'counter/decrement' })
            con.log('dispatch({ type: "counter/decrement" })')
          }}
        >
          −
        </button>
        <div className="demo-value">{count}</div>
        <button
          className="btn btn--accent"
          onClick={() => {
            dispatch({ type: 'counter/increment' })
            con.log('dispatch({ type: "counter/increment" })')
          }}
        >
          +
        </button>
      </div>
      <div className="demo-info">renders: {renderCount.current}</div>
    </div>
  )
}

function App() {
  return (
    <Provider store={store}>
      <PropsExplorer />
    </Provider>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)

con.info('Provider props — кликайте на каждый prop для подробностей.')
con.log('')
con.log('Props: store (required), context, serverState, stabilityCheck')
con.log('Внизу — рабочий счётчик с Provider store={store}')
