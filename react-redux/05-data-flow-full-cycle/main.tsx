import { createRoot } from 'react-dom/client'
import { useRef } from 'react'
import { legacy_createStore as createStore } from 'redux'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Redux Store ---

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

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — Полный цикл данных'
)

// --- Cycle Animation State ---

const stepIds = ['cs-1', 'cs-2', 'cs-3', 'cs-4', 'cs-5', 'cs-6']
const stepLogs = [
  'Шаг 1: Пользователь кликнул кнопку → React вызвал onClick handler',
  'Шаг 2: Handler вызвал dispatch({ type: "counter/ACTION" })',
  'Шаг 3: Store вызвал reducer(currentState, action) → новый state',
  'Шаг 4: Store сохранил новый state, уведомил Subscription',
  'Шаг 5: useSelector проверяет: selector(newState) !== prevResult? → ',
  'Шаг 6: Компонент ре-рендерится с новым значением!',
]

let stepMode = false
let currentAnimStep = -1
let animResolve: (() => void) | null = null

function clearSteps(): void {
  stepIds.forEach((id) => {
    const el = document.getElementById(id)
    el?.classList.remove('active', 'done')
  })
  currentAnimStep = -1
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function animateCycle(actionType: string): Promise<void> {
  clearSteps()
  const prevValue = store.getState().value
  con.log('════════════════════════════════════')
  con.info(`Начинаем цикл: ${actionType}`)
  con.log(`Текущий state.value = ${prevValue}`)

  for (let i = 0; i < stepIds.length; i++) {
    currentAnimStep = i

    if (i > 0) {
      document.getElementById(stepIds[i - 1])?.classList.remove('active')
      document.getElementById(stepIds[i - 1])?.classList.add('done')
    }
    document.getElementById(stepIds[i])?.classList.add('active')

    let logMsg = stepLogs[i]
    if (i === 1) logMsg = `Шаг 2: dispatch({ type: "${actionType}" })`
    if (i === 2) {
      const newVal = actionType === 'counter/increment' ? prevValue + 1 : prevValue - 1
      logMsg = `Шаг 3: reducer({ value: ${prevValue} }, action) → { value: ${newVal} }`
    }
    if (i === 4) {
      const newVal = actionType === 'counter/increment' ? prevValue + 1 : prevValue - 1
      logMsg = `Шаг 5: useSelector: ${prevValue} !== ${newVal}? → ДА → RERENDER`
    }

    con.log(`  ${logMsg}`)

    if (stepMode && i < stepIds.length - 1) {
      await new Promise<void>((resolve) => {
        animResolve = resolve
      })
    } else {
      await sleep(600)
    }
  }

  document.getElementById(stepIds[stepIds.length - 1])?.classList.remove('active')
  document.getElementById(stepIds[stepIds.length - 1])?.classList.add('done')

  const newValue = store.getState().value
  con.success(`✔ Цикл завершён! state.value: ${prevValue} → ${newValue}`)

  const counterEl = document.querySelector('.live-counter')
  counterEl?.classList.add('flash')
  const valEl = document.querySelector('.live-counter__value')
  valEl?.classList.add('bump')
  setTimeout(() => {
    counterEl?.classList.remove('flash')
    valEl?.classList.remove('bump')
  }, 400)
}

// --- Step mode toggle ---

document.getElementById('step-mode')!.addEventListener('change', (e) => {
  stepMode = (e.target as HTMLInputElement).checked
  const nextBtn = document.getElementById('btn-next-step')!
  nextBtn.style.display = stepMode ? 'inline-flex' : 'none'
})

document.getElementById('btn-next-step')!.addEventListener('click', () => {
  if (animResolve) {
    animResolve()
    animResolve = null
  }
})

document.getElementById('btn-cycle-reset')!.addEventListener('click', () => {
  clearSteps()
  con.clear()
  con.info('Сброшено. Нажмите +/− для запуска цикла.')
})

// --- React Components ---

let pendingDispatch: { type: string } | null = null

function Counter() {
  const count = useSelector((state: CounterState) => state.value)
  const dispatch = useDispatch()
  const renderCount = useRef(0)
  renderCount.current++

  const handleIncrement = async () => {
    pendingDispatch = { type: 'counter/increment' }
    await animateCycle('counter/increment')
    dispatch({ type: 'counter/increment' })
    pendingDispatch = null
  }

  const handleDecrement = async () => {
    pendingDispatch = { type: 'counter/decrement' }
    await animateCycle('counter/decrement')
    dispatch({ type: 'counter/decrement' })
    pendingDispatch = null
  }

  return (
    <div className="live-counter">
      <button
        className="btn btn--accent"
        onClick={handleDecrement}
        disabled={!!pendingDispatch}
        style={{ fontSize: '1.3rem', padding: '10px 20px' }}
      >
        −
      </button>
      <div style={{ textAlign: 'center' }}>
        <div className="live-counter__value">{count}</div>
        <div className="live-counter__label">
          store.getState().value | рендеров: {renderCount.current}
        </div>
      </div>
      <button
        className="btn btn--accent"
        onClick={handleIncrement}
        disabled={!!pendingDispatch}
        style={{ fontSize: '1.3rem', padding: '10px 20px' }}
      >
        +
      </button>
    </div>
  )
}

// --- Render ---

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <Counter />
  </Provider>
)

// --- Initial log ---

con.info('Полный цикл данных React-Redux — от клика до обновления UI.')
con.log('')
con.log('Нажмите + или − и наблюдайте 6 шагов цикла:')
con.log('  1. Клик → 2. dispatch → 3. reducer → 4. store update')
con.log('  5. useSelector проверка → 6. re-render')
con.log('')
con.info('Включите «Пошаговый режим» чтобы проходить шаги вручную.')
