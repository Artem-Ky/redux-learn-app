import { createRoot } from 'react-dom/client'
import { useState, useRef } from 'react'
import { legacy_createStore as createStore } from 'redux'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

interface AppState {
  counter: number
  lastUpdated: string
}

const initialState: AppState = {
  counter: 42,
  lastUpdated: '2025-01-01T12:00:00Z',
}

function appReducer(
  state = initialState,
  action: { type: string }
): AppState {
  switch (action.type) {
    case 'increment':
      return { ...state, counter: state.counter + 1 }
    case 'decrement':
      return { ...state, counter: state.counter - 1 }
    default:
      return state
  }
}

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — SSR Hydration'
)

type SimPhase =
  | 'idle'
  | 'server-render'
  | 'html-sent'
  | 'client-init'
  | 'hydration'
  | 'interactive'

interface StepInfo {
  phase: SimPhase
  title: string
  desc: string
}

const steps: StepInfo[] = [
  {
    phase: 'server-render',
    title: 'Сервер: создание store + renderToString()',
    desc: 'Сервер создаёт Redux store с preloadedState и рендерит React-компоненты в HTML-строку.',
  },
  {
    phase: 'html-sent',
    title: 'Сервер → Клиент: передача HTML + state',
    desc: 'HTML-разметка и сериализованный state (window.__PRELOADED_STATE__) отправляются клиенту.',
  },
  {
    phase: 'client-init',
    title: 'Клиент: создание store с preloadedState',
    desc: 'Клиент создаёт свой store с тем же preloadedState. Между этим моментом и гидрацией может произойти dispatch.',
  },
  {
    phase: 'hydration',
    title: 'Клиент: hydrateRoot() с serverState',
    desc: 'hydrateRoot подключает React к серверному HTML. Provider с serverState гарантирует, что useSelector вернёт серверное значение — HTML совпадает.',
  },
  {
    phase: 'interactive',
    title: 'Гидрация завершена — приложение интерактивно',
    desc: 'После гидрации useSelector переключается на store.getState(). Приложение полностью интерактивно.',
  },
]

function SSRSimulation() {
  const [currentStep, setCurrentStep] = useState(-1)
  const [isRunning, setIsRunning] = useState(false)
  const [useServerState, setUseServerState] = useState(true)
  const [hydrationDone, setHydrationDone] = useState(false)
  const [mismatch, setMismatch] = useState(false)

  const serverState: AppState = { counter: 42, lastUpdated: '2025-01-01T12:00:00Z' }

  const runSimulation = async () => {
    setIsRunning(true)
    setCurrentStep(-1)
    setHydrationDone(false)
    setMismatch(false)
    con.clear()
    con.info('Запуск SSR-симуляции...')
    con.log(`serverState mode: ${useServerState ? 'ON' : 'OFF'}`)
    con.log('')

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i)
      con.info(`Шаг ${i + 1}: ${steps[i].title}`)
      con.log(`  ${steps[i].desc}`)

      if (i === 2 && !useServerState) {
        con.warn('  ⚠ Между init и гидрацией кто-то вызвал dispatch!')
        con.warn('  store.getState().counter теперь 43, а серверный HTML показывает 42')
      }

      if (i === 3) {
        if (useServerState) {
          con.success('  ✔ serverState={preloadedState} → useSelector вернёт 42')
          con.success('  ✔ HTML совпадает → гидрация успешна!')
        } else {
          con.error('  ✖ Без serverState: useSelector берёт store.getState() → 43')
          con.error('  ✖ Серверный HTML: 42 ≠ Клиентский рендер: 43 → MISMATCH!')
          setMismatch(true)
        }
      }

      await sleep(1200)
    }

    setHydrationDone(true)
    setIsRunning(false)

    con.log('')
    if (useServerState) {
      con.success('════ Гидрация прошла без ошибок! ════')
    } else {
      con.error('════ Hydration mismatch detected! ════')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          className="btn btn--accent"
          onClick={runSimulation}
          disabled={isRunning}
        >
          {isRunning ? 'Симуляция...' : 'Запустить SSR-симуляцию'}
        </button>
        <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={useServerState}
            onChange={(e) => setUseServerState(e.target.checked)}
            disabled={isRunning}
          />
          Использовать serverState prop
        </label>
      </div>

      <div className="ssr-timeline">
        {steps.map((step, i) => (
          <div key={i}>
            <div className={`ssr-step${currentStep === i ? ' active' : ''}${currentStep > i ? ' done' : ''}`}>
              <div className="ssr-step__num">{i + 1}</div>
              <div className="ssr-step__info">
                <div className="ssr-step__title">{step.title}</div>
                <div className="ssr-step__desc">{step.desc}</div>
              </div>
            </div>
            {i < steps.length - 1 && <div className="ssr-connector">↓</div>}
          </div>
        ))}
      </div>

      <div className="ssr-preview">
        <div className="ssr-box ssr-box--server">
          <div className="ssr-box__header">Серверный HTML</div>
          <div className="ssr-box__body">
            <div className="ssr-html">{`<div id="root">
  <div class="counter">
    <span>Counter: 42</span>
    <button>+</button>
  </div>
</div>
<script>
  window.__PRELOADED_STATE__ =
    ${JSON.stringify(serverState)}
</script>`}</div>
            <div className="ssr-state-badge ssr-state-badge--server">
              server state: counter = 42
            </div>
          </div>
        </div>

        <div className="ssr-box ssr-box--client">
          <div className="ssr-box__header">Клиент после гидрации</div>
          <div className="ssr-box__body">
            {hydrationDone ? (
              <div>
                <div className="hydration-counter">
                  <div className="hydration-counter__value">
                    {mismatch ? '43 ≠ 42' : '42'}
                  </div>
                  <div className="hydration-counter__label">
                    {mismatch
                      ? 'store.getState() ≠ server HTML'
                      : 'serverState совпадает с HTML'
                    }
                  </div>
                </div>
                <div className={`mismatch-alert${mismatch ? ' visible' : ''}`}>
                  Hydration mismatch: серверный HTML показывает 42,
                  а React на клиенте рендерит 43.
                  Используйте <code>serverState</code> чтобы это исправить.
                </div>
                <div className={`match-alert${!mismatch ? ' visible' : ''}`}>
                  Гидрация успешна! serverState обеспечил совпадение
                  серверного HTML и клиентского первого рендера.
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                {isRunning
                  ? 'Ожидание гидрации...'
                  : 'Нажмите "Запустить SSR-симуляцию"'}
              </div>
            )}
          </div>
        </div>
      </div>

      {hydrationDone && !mismatch && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px', textAlign: 'center' }}>
            Интерактивный счётчик (после успешной гидрации)
          </div>
          <HydratedCounter />
        </div>
      )}
    </div>
  )
}

const clientStore = createStore(appReducer)

function HydratedCounter() {
  const counter = useSelector((state: AppState) => state.counter)
  const dispatch = useDispatch()

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '16px' }}>
      <button
        className="btn btn--accent"
        onClick={() => {
          dispatch({ type: 'decrement' })
          con.log('dispatch({ type: "decrement" })')
        }}
      >
        −
      </button>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, color: 'var(--accent-cyan)', minWidth: '60px', textAlign: 'center' }}>
        {counter}
      </div>
      <button
        className="btn btn--accent"
        onClick={() => {
          dispatch({ type: 'increment' })
          con.log('dispatch({ type: "increment" })')
        }}
      >
        +
      </button>
    </div>
  )
}

function App() {
  return (
    <Provider store={clientStore}>
      <SSRSimulation />
    </Provider>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)

con.info('SSR Hydration — симуляция серверного рендера и гидрации.')
con.log('')
con.log('1. Включите/выключите "serverState" чекбокс')
con.log('2. Нажмите "Запустить SSR-симуляцию"')
con.log('3. Наблюдайте разницу: с serverState vs без')
