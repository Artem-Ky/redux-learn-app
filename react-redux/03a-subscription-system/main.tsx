import { createRoot } from 'react-dom/client'
import { useRef } from 'react'
import { legacy_createStore as createStore } from 'redux'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Redux Setup ---

interface AppState {
  counter: number
  theme: string
}

const initialState: AppState = { counter: 0, theme: 'dark' }

function rootReducer(
  state = initialState,
  action: { type: string }
): AppState {
  switch (action.type) {
    case 'counter/increment':
      return { ...state, counter: state.counter + 1 }
    case 'theme/toggle':
      return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' }
    default:
      return state
  }
}

const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — Subscription System в действии'
)

// --- Subscription Diagram Animation ---

let counterVal = 0
let themeVal = 'dark'

function clearDiagram(): void {
  const ids = ['sl-store', 'sl-root-sub', 'sl-counter', 'sl-theme']
  ids.forEach((id) => {
    const el = document.getElementById(id)
    el?.classList.remove('active', 'fire', 'skip')
  })
  document.getElementById('badge-root')!.style.display = 'none'
  document.getElementById('badge-counter')!.style.display = 'none'
  document.getElementById('badge-theme')!.style.display = 'none'
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

let animating = false

async function animateDispatch(actionType: string): Promise<void> {
  if (animating) return
  animating = true
  clearDiagram()

  const isCounter = actionType === 'counter/increment'
  const prevCounter = counterVal
  const prevTheme = themeVal

  con.log('════════════════════════════════════════════')
  con.info(`dispatch({ type: "${actionType}" })`)
  con.log('')

  // Step 1: Store updates
  document.getElementById('sl-store')!.classList.add('active')
  if (isCounter) {
    counterVal++
    con.log('1. Store: reducer обработал action')
    con.log(`   state.counter: ${prevCounter} → ${counterVal}`)
    con.log(`   state.theme: "${themeVal}" (не изменился)`)
  } else {
    themeVal = themeVal === 'dark' ? 'light' : 'dark'
    con.log('1. Store: reducer обработал action')
    con.log(`   state.counter: ${counterVal} (не изменился)`)
    con.log(`   state.theme: "${prevTheme}" → "${themeVal}"`)
  }
  document.getElementById('sv-counter')!.textContent = String(counterVal)
  document.getElementById('sv-theme')!.textContent = themeVal
  await sleep(1200)

  // Step 2: Root Subscription gets notified
  document.getElementById('sl-store')!.classList.remove('active')
  document.getElementById('sl-root-sub')!.classList.add('fire')
  const badge = document.getElementById('badge-root')!
  badge.textContent = 'уведомлён'
  badge.style.display = 'inline-block'
  con.log('')
  con.log('2. store.subscribe() вызывает callback')
  con.log('   → Root Subscription (от Provider) получает уведомление')
  con.log('   → вызывает notifyNestedSubs() — проходит по linked list слушателей')
  await sleep(1200)

  // Step 3: Each listener gets checked
  document.getElementById('sl-root-sub')!.classList.remove('fire')
  document.getElementById('sl-root-sub')!.classList.add('active')

  // Counter component check
  const newCounterVal = counterVal
  const counterChanged = newCounterVal !== prevCounter
  document.getElementById('sl-counter-prev')!.textContent = String(prevCounter)
  document.getElementById('sl-counter-new')!.textContent = String(newCounterVal)
  con.log('')
  con.log('3. Проверяем <Counter />:')
  con.log(`   selector(newState) → state.counter → ${newCounterVal}`)
  con.log(`   prevValue = ${prevCounter}`)
  con.log(`   ${prevCounter} !== ${newCounterVal} ? → ${counterChanged}`)

  if (counterChanged) {
    document.getElementById('sl-counter')!.classList.add('fire')
    document.getElementById('badge-counter')!.textContent = 'RERENDER!'
    document.getElementById('badge-counter')!.style.display = 'inline-block'
    con.warn(`   → РЕЗУЛЬТАТ: значение изменилось → вызываем forceRender() → РЕ-РЕНДЕР!`)
  } else {
    document.getElementById('sl-counter')!.classList.add('skip')
    document.getElementById('badge-counter')!.textContent = 'SKIP'
    document.getElementById('badge-counter')!.style.display = 'inline-block'
    con.success(`   → РЕЗУЛЬТАТ: значение НЕ изменилось → пропускаем, компонент спит`)
  }
  await sleep(1200)

  // Theme component check
  const newThemeVal = themeVal
  const themeChanged = newThemeVal !== prevTheme
  document.getElementById('sl-theme-prev')!.textContent = prevTheme
  document.getElementById('sl-theme-new')!.textContent = newThemeVal
  con.log('')
  con.log('4. Проверяем <ThemeDisplay />:')
  con.log(`   selector(newState) → state.theme → "${newThemeVal}"`)
  con.log(`   prevValue = "${prevTheme}"`)
  con.log(`   "${prevTheme}" !== "${newThemeVal}" ? → ${themeChanged}`)

  if (themeChanged) {
    document.getElementById('sl-theme')!.classList.add('fire')
    document.getElementById('badge-theme')!.textContent = 'RERENDER!'
    document.getElementById('badge-theme')!.style.display = 'inline-block'
    con.warn(`   → РЕЗУЛЬТАТ: значение изменилось → вызываем forceRender() → РЕ-РЕНДЕР!`)
  } else {
    document.getElementById('sl-theme')!.classList.add('skip')
    document.getElementById('badge-theme')!.textContent = 'SKIP'
    document.getElementById('badge-theme')!.style.display = 'inline-block'
    con.success(`   → РЕЗУЛЬТАТ: значение НЕ изменилось → пропускаем, компонент спит`)
  }
  await sleep(800)

  // Dispatch real action
  store.dispatch({ type: actionType } as { type: string })

  con.log('')
  con.success(`✔ Subscription обработала dispatch: ${counterChanged ? 1 : 0} + ${themeChanged ? 1 : 0} = ${(counterChanged ? 1 : 0) + (themeChanged ? 1 : 0)} компонент(ов) ре-рендерились из 2`)
  con.log('')

  animating = false
}

document.getElementById('btn-inc')!.addEventListener('click', () => {
  animateDispatch('counter/increment')
})
document.getElementById('btn-theme')!.addEventListener('click', () => {
  animateDispatch('theme/toggle')
})
document.getElementById('btn-sub-reset')!.addEventListener('click', () => {
  clearDiagram()
  counterVal = 0
  themeVal = 'dark'
  document.getElementById('sv-counter')!.textContent = '0'
  document.getElementById('sv-theme')!.textContent = 'dark'
  document.getElementById('sl-counter-prev')!.textContent = '0'
  document.getElementById('sl-counter-new')!.textContent = '?'
  document.getElementById('sl-theme-prev')!.textContent = 'dark'
  document.getElementById('sl-theme-new')!.textContent = '?'

  // Reset store
  while (store.getState().counter > 0) store.dispatch({ type: 'counter/decrement' } as { type: string })
  if (store.getState().theme !== 'dark') store.dispatch({ type: 'theme/toggle' } as { type: string })

  con.clear()
  con.info('Сброшено. Нажмите кнопки dispatch.')
})

// --- React Components (live) ---

function Counter() {
  const count = useSelector((s: AppState) => s.counter)
  const dispatch = useDispatch()
  const renders = useRef(0)
  renders.current++

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 16px', background: 'var(--bg-panel)',
      border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    }}>
      <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
        &lt;Counter /&gt;
      </span>
      <button className="btn btn--sm" onClick={() => dispatch({ type: 'counter/increment' })}>+</button>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '1.2rem' }}>
        {count}
      </span>
      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
        рендеров: {renders.current}
      </span>
    </div>
  )
}

function ThemeDisplay() {
  const theme = useSelector((s: AppState) => s.theme)
  const dispatch = useDispatch()
  const renders = useRef(0)
  renders.current++

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 16px', background: 'var(--bg-panel)',
      border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
      marginTop: '8px',
    }}>
      <span style={{ color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
        &lt;ThemeDisplay /&gt;
      </span>
      <button className="btn btn--sm" onClick={() => dispatch({ type: 'theme/toggle' })}>toggle</button>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-orange)', fontWeight: 700, fontSize: '1rem' }}>
        "{theme}"
      </span>
      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
        рендеров: {renders.current}
      </span>
    </div>
  )
}

function App() {
  return (
    <>
      <Counter />
      <ThemeDisplay />
    </>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <App />
  </Provider>
)

// --- Initial log ---

con.info('Урок 03a: Система подписок (Subscription) React-Redux')
con.log('')
con.log('Два компонента подписаны на РАЗНЫЕ срезы state:')
con.log('  <Counter />      → useSelector(s => s.counter)')
con.log('  <ThemeDisplay />  → useSelector(s => s.theme)')
con.log('')
con.info('Нажмите "dispatch counter/increment" — увидите:')
con.log('  Counter      → selector вернул новое значение → RERENDER')
con.log('  ThemeDisplay → selector вернул то же значение → SKIP')
con.log('')
con.info('Нажмите "dispatch theme/toggle" — увидите обратное.')
