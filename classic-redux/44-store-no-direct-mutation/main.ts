import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

interface IncrementAction {
  type: 'counter/increment'
}

type CounterAction = IncrementAction | { type: string }

function counterReducer(state: CounterState = { value: 0 }, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/increment':
      return { value: state.value + 1 }
    default:
      return state
  }
}

const store = createStore(counterReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)
consolePanel.info('Store создан. Попробуйте dispatch vs прямую мутацию.')
consolePanel.log('store.getState() →', store.getState())

let subscriberCallCount = 0

function render(): void {
  subscriberCallCount++
  const state = store.getState() as CounterState
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
  consolePanel.log(`[subscriber #${subscriberCallCount}] UI обновлён → ${JSON.stringify(state)}`)
}

store.subscribe(render)
render()

document.getElementById('btn-dispatch')!.addEventListener('click', (): void => {
  consolePanel.success('✅ dispatch({ type: "counter/increment" })')
  store.dispatch({ type: 'counter/increment' })
  consolePanel.log('  → reducer вызван, subscribers уведомлены, UI обновлён')

  document.getElementById('mutation-warning')!.style.display = 'none'
})

document.getElementById('btn-mutate')!.addEventListener('click', (): void => {
  const stateBefore = JSON.stringify(store.getState())

  const state = store.getState() as CounterState
  state.value = 999

  const stateAfter = JSON.stringify(store.getState())

  consolePanel.error('❌ store.getState().value = 999')
  consolePanel.warn(`  Память ДО:   ${stateBefore}`)
  consolePanel.warn(`  Память ПОСЛЕ: ${stateAfter}`)
  consolePanel.error('  → Subscribers НЕ вызваны!')
  consolePanel.error('  → UI НЕ обновился!')
  consolePanel.error('  → DevTools НЕ увидели изменения!')

  document.getElementById('mutation-warning')!.style.display = 'block'
})

document.getElementById('btn-check')!.addEventListener('click', (): void => {
  const realState = store.getState() as CounterState
  const displayedState = document.getElementById('state-display')!.textContent

  consolePanel.info('🔍 Проверка:')
  consolePanel.log(`  Реальный state в памяти: ${JSON.stringify(realState)}`)
  consolePanel.log(`  UI показывает: ${displayedState}`)

  document.getElementById('real-state')!.textContent = JSON.stringify(realState, null, 2)

  if (JSON.stringify(realState) !== displayedState?.trim()) {
    consolePanel.error('  ⚠️ РАССИНХРОН! UI и реальный state различаются!')
  } else {
    consolePanel.success('  ✓ Всё синхронно')
  }
})
