import { configureStore, type Reducer, type Action, type EnhancedStore } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface State { value: number; list: string[] }

const initial: State = { value: 0, list: ['init'] }

const badDirect: Reducer<State, Action> = (state = initial, action) => {
  if (action.type === 'mut/direct') {
    state.value += 1
    return state
  }
  return state
}

const badPush: Reducer<State, Action> = (state = initial, action) => {
  if (action.type === 'mut/push') {
    state.list.push('mutated-' + Date.now() % 1000)
    return state
  }
  return state
}

const okReducer: Reducer<State, Action> = (state = initial, action) => {
  if (action.type === 'mut/ok') {
    return { ...state, value: state.value + 1 }
  }
  return state
}

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог immutable check')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
const errOut = document.getElementById('err-out')!

let store: EnhancedStore<State>

function buildStore(reducer: Reducer<State, Action>): EnhancedStore<State> {
  return configureStore({
    reducer,
    middleware: (gdm) => gdm({
      immutableCheck: { warnAfter: 32 },
      serializableCheck: false,
      actionCreatorCheck: false,
      thunk: false,
    }),
  }) as EnhancedStore<State>
}

function showError(msg: string): void {
  errOut.classList.remove('empty')
  errOut.textContent = msg
}

function showOk(msg: string): void {
  errOut.classList.add('empty')
  errOut.style.color = 'var(--success)'
  errOut.textContent = msg
}

async function tryDispatch(reducer: Reducer<State, Action>, action: Action, label: string): Promise<void> {
  store = buildStore(reducer)
  dev.clear()
  dev.connectStore(store)

  try {
    store.dispatch(action)
    con.action(action, label)
    showOk(`✓ ${label}: dispatch прошёл без ошибок. State не мутирован.`)
  } catch (e) {
    const err = e as Error
    showError(`✗ ${label}: ${err.message}`)
    con.error(`${label}: ${err.message}`)
  }
}

document.querySelector('[data-mut="direct"]')!.addEventListener('click', () => {
  void tryDispatch(badDirect, { type: 'mut/direct' }, 'direct')
})

document.querySelector('[data-mut="push"]')!.addEventListener('click', () => {
  void tryDispatch(badPush, { type: 'mut/push' }, 'push')
})

document.querySelector('[data-mut="outside"]')!.addEventListener('click', () => {
  store = buildStore(okReducer)
  dev.clear()
  dev.connectStore(store)

  try {
    const s = store.getState() as State & { value: number }
    s.value = 999
    store.dispatch({ type: 'noop' })
    con.action({ type: 'noop' }, 'outside-mutation')
    showError('✗ outside: иногда middleware не успевает поймать мутацию ВНЕ reducer на той же тик. Но при следующем dispatch — увидит. Откройте DevTools.')
  } catch (e) {
    const err = e as Error
    showError(`✗ outside: ${err.message}`)
    con.error(err.message)
  }
})

document.querySelector('[data-mut="ok"]')!.addEventListener('click', () => {
  void tryDispatch(okReducer, { type: 'mut/ok' }, 'ok')
})

store = buildStore(okReducer)
dev.connectStore(store)

con.log('Каждый сценарий пересоздаёт store с соответствующим reducer.')
con.info('immutable middleware подсвечивает путь до мутированного значения в stack-trace.')
con.warn('Откройте браузерную консоль (F12) — там будет полный traceback от middleware.')
