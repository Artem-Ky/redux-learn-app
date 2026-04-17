import { createRoot } from 'react-dom/client'
import { useRef } from 'react'
import { legacy_createStore as createStore } from 'redux'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Redux Setup ---

interface AppState {
  counter: number
  unrelated: number
}

const initialState: AppState = { counter: 0, unrelated: 0 }

function rootReducer(
  state = initialState,
  action: { type: string }
): AppState {
  switch (action.type) {
    case 'counter/increment':
      return { ...state, counter: state.counter + 1 }
    case 'unrelated/change':
      return { ...state, unrelated: state.unrelated + 1 }
    default:
      return state
  }
}

const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — Архитектура React-Redux'
)

// --- Components ---

function CounterDisplay() {
  const count = useSelector((state: AppState) => state.counter)
  const renderCount = useRef(0)
  renderCount.current++

  con.info(`  <CounterDisplay> рендер #${renderCount.current}, counter = ${count}`)

  return (
    <div className="comp-node connected rerendered" style={{ borderColor: 'var(--accent-cyan)' }}>
      CounterDisplay: {count} <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>рендеров: {renderCount.current}</span>
    </div>
  )
}

function UnrelatedInfo() {
  const renderCount = useRef(0)
  renderCount.current++

  return (
    <div className="comp-node">
      UnrelatedInfo <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>рендеров: {renderCount.current}</span>
    </div>
  )
}

function Sidebar() {
  const renderCount = useRef(0)
  renderCount.current++

  return (
    <div className="comp-node">
      Sidebar <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>рендеров: {renderCount.current}</span>
    </div>
  )
}

function ActionButtons() {
  const dispatch = useDispatch()

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
      <button
        className="btn btn--accent"
        onClick={() => {
          con.log('──────────────────────────────────')
          con.warn('dispatch({ type: "counter/increment" })')
          con.log('Только CounterDisplay должен ре-рендериться:')
          dispatch({ type: 'counter/increment' })
        }}
      >
        dispatch counter/increment
      </button>
      <button
        className="btn"
        onClick={() => {
          con.log('──────────────────────────────────')
          con.warn('dispatch({ type: "unrelated/change" })')
          con.log('Никто не подписан на state.unrelated → 0 ре-рендеров:')
          dispatch({ type: 'unrelated/change' })
        }}
      >
        dispatch unrelated/change
      </button>
    </div>
  )
}

function ComponentTree() {
  return (
    <div className="comp-tree">
      <div className="comp-node" style={{ borderColor: 'var(--accent-purple)', borderWidth: '2px' }}>
        &lt;Provider store={'{store}'}&gt;
      </div>
      <div className="comp-tree__arrow">↓</div>
      <div className="comp-node">&lt;App&gt;</div>
      <div className="comp-tree__arrow">↓</div>
      <div className="comp-tree__row">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <CounterDisplay />
          <div style={{ color: 'var(--accent-cyan)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
            useSelector(s =&gt; s.counter)
          </div>
        </div>
        <Sidebar />
        <UnrelatedInfo />
      </div>
      <ActionButtons />
    </div>
  )
}

// --- Render ---

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <ComponentTree />
  </Provider>
)

// --- Architecture Diagram Animation ---

const layers = [
  'layer-store',
  'layer-provider',
  'layer-context',
  'layer-subscription',
  'layer-hooks',
  'layer-components',
]
const arrows = ['arrow-1', 'arrow-2', 'arrow-3', 'arrow-4', 'arrow-5']

function clearArch(): void {
  layers.forEach((id) => {
    const el = document.getElementById(id)
    el?.classList.remove('active', 'highlight-read', 'highlight-write')
  })
  arrows.forEach((id) => {
    document.getElementById(id)?.classList.remove('active')
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

let archAnimating = false

async function animateRead(): Promise<void> {
  if (archAnimating) return
  archAnimating = true
  clearArch()
  con.log('──────────────────────────────────')
  con.info('Анимация: ЧТЕНИЕ данных (Store → Component)')

  const readMsgs = [
    'Store хранит state = { counter: 0, unrelated: 0 }',
    'Provider получает store и кладёт в React Context + создаёт Subscription',
    'ReactReduxContext содержит ссылку на store и Subscription instance',
    'Subscription подписана на store.subscribe() — будет уведомлять при изменениях',
    'useSelector(state => state.counter) — извлекает нужный срез, подписывается',
    'Component получает данные и рендерится: counter = 0',
  ]

  for (let i = 0; i < layers.length; i++) {
    clearArch()
    document.getElementById(layers[i])?.classList.add('highlight-read')
    if (i > 0) document.getElementById(arrows[i - 1])?.classList.add('active')
    con.log(`  [${i + 1}/6] ${readMsgs[i]}`)
    await sleep(1000)
  }

  con.success('✔ Данные успешно прочитаны из store в компонент')
  archAnimating = false
}

async function animateWrite(): Promise<void> {
  if (archAnimating) return
  archAnimating = true
  clearArch()
  con.log('──────────────────────────────────')
  con.info('Анимация: ЗАПИСЬ данных (Component → Store → Component)')

  const writeMsgs = [
    'Component: пользователь кликнул кнопку → вызван onClick handler',
    'useDispatch() → dispatch({ type: "counter/increment" })',
    'Subscription уведомлена об изменении state',
    'Context передаёт уведомление подписчикам (через Subscription, НЕ через Context re-render)',
    'Provider передал обновление вниз по дереву подписок',
    'Store: reducer обработал action → новый state = { counter: 1 }',
  ]

  for (let i = layers.length - 1; i >= 0; i--) {
    clearArch()
    document.getElementById(layers[i])?.classList.add('highlight-write')
    if (i < layers.length - 1) document.getElementById(arrows[i])?.classList.add('active')
    con.log(`  [${layers.length - i}/6] ${writeMsgs[layers.length - 1 - i]}`)
    await sleep(1000)
  }

  con.success('✔ Action обработан, state обновлён, подписанные компоненты уведомлены')
  archAnimating = false
}

document.getElementById('btn-read')!.addEventListener('click', animateRead)
document.getElementById('btn-write')!.addEventListener('click', animateWrite)
document.getElementById('btn-arch-reset')!.addEventListener('click', () => {
  clearArch()
  con.clear()
  con.info('Сброшено. Нажмите кнопки анимации или dispatch.')
})

// --- Initial log ---

con.info('Архитектура React-Redux: 6 слоёв от Store до Component.')
con.log('')
con.info('Нажмите «Анимировать чтение» или «Анимировать dispatch» для визуализации.')
con.info('Нажмите «dispatch counter/increment» — посмотрите какие компоненты ре-рендерятся.')
