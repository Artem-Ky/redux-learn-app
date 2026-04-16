import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(document.getElementById('console-container')!, 'Thunk middleware — пошагово')

interface AppState {
  value: number
  lastAction: string
}

const initialState: AppState = { value: 0, lastAction: '@@INIT' }

function reducer(state: AppState = initialState, action: any): AppState {
  switch (action.type) {
    case 'counter/incremented':
      return { value: state.value + 1, lastAction: action.type }
    case 'counter/set':
      return { value: action.payload, lastAction: action.type }
    case 'status/updated':
      return { ...state, lastAction: action.type + ': ' + action.payload }
    default:
      return state
  }
}

const thunkMiddleware = (storeAPI: any) => (next: any) => (action: any) => {
  if (typeof action === 'function') {
    highlightStep('ps-thunk', 'thunk-hit')
    highlightStep('ps-yes', 'thunk-hit')
    con.info('  🔍 typeof action === "function" → TRUE')
    con.info('  ↳ Вызываем: action(dispatch, getState)')
    return action(storeAPI.dispatch, storeAPI.getState)
  }
  highlightStep('ps-thunk', 'active')
  highlightStep('ps-no', 'active')
  con.log('  🔍 typeof action === "object" → передаём next(action)')
  return next(action)
}

const store = createStore(reducer, applyMiddleware(thunkMiddleware))

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

function render(): void {
  const state = store.getState()
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
}

store.subscribe(() => {
  render()
  highlightStep('ps-reducer', 'active')
  highlightStep('ps-subscribers', 'active')
})

render()

function clearPipeline(): void {
  const ids = ['ps-dispatch', 'ps-thunk', 'ps-yes', 'ps-no', 'ps-reducer', 'ps-subscribers']
  ids.forEach(id => {
    const el = document.getElementById(id)!
    el.classList.remove('active', 'thunk-hit')
    if (id === 'ps-yes' || id === 'ps-no') el.style.display = 'none'
  })
}

function highlightStep(id: string, cls: string): void {
  const el = document.getElementById(id)!
  el.style.display = 'block'
  el.classList.add(cls)
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ─── Dispatch plain object ───

document.getElementById('btn-plain')!.addEventListener('click', () => {
  clearPipeline()
  con.log('─── Dispatch объект { type: "counter/incremented" } ───')
  highlightStep('ps-dispatch', 'active')
  con.log('  → store.dispatch({ type: "counter/incremented" })')
  store.dispatch({ type: 'counter/incremented' })
  con.success('  ✔ Объект прошёл через thunk middleware → next() → reducer → done')
  con.log('')
})

// ─── Dispatch sync thunk ───

document.getElementById('btn-thunk-sync')!.addEventListener('click', () => {
  clearPipeline()
  con.warn('─── Dispatch SYNC thunk ───')
  highlightStep('ps-dispatch', 'active')
  con.log('  → store.dispatch(function) — передаём функцию!')

  const syncThunk = (dispatch: any, _getState: any) => {
    con.info('  📦 Внутри thunk-функции')
    con.info('  Вызываем dispatch({ type: "counter/incremented" }) изнутри thunk')
    dispatch({ type: 'counter/incremented' })
    con.info('  Thunk завершён синхронно')
    return 'sync-result'
  }

  const result = store.dispatch(syncThunk as any)
  con.success(`  ✔ dispatch(thunk) вернул: "${result}"`)
  con.log('')
})

// ─── Dispatch async thunk ───

document.getElementById('btn-thunk-async')!.addEventListener('click', async () => {
  clearPipeline()
  con.warn('─── Dispatch ASYNC thunk ───')
  highlightStep('ps-dispatch', 'active')
  con.log('  → store.dispatch(async function) — асинхронный thunk!')

  const asyncThunk = async (dispatch: any, _getState: any) => {
    con.info('  📦 Внутри async thunk')
    dispatch({ type: 'status/updated', payload: 'loading...' })

    con.info('  ⏳ Ждём 1 секунду (имитация fetch)...')
    await sleep(1000)

    dispatch({ type: 'counter/set', payload: 42 })
    con.info('  Данные «загружены», dispatch завершён')
    return 'async-result'
  }

  const result = await (store.dispatch(asyncThunk as any) as Promise<string>)
  con.success(`  ✔ await dispatch(thunk) вернул: "${result}"`)
  con.log('')
})

// ─── Thunk с getState ───

document.getElementById('btn-thunk-getstate')!.addEventListener('click', () => {
  clearPipeline()
  con.warn('─── Thunk с getState() ───')
  highlightStep('ps-dispatch', 'active')

  const thunkWithState = (dispatch: any, getState: any) => {
    const state = getState()
    con.info(`  📖 getState() = ${JSON.stringify(state)}`)
    con.info(`  Текущее value: ${state.value}`)

    if (state.value >= 10) {
      con.warn(`  value >= 10 → НЕ инкрементируем (лимит)`)
      return 'skipped'
    }

    dispatch({ type: 'counter/incremented' })
    const newState = getState()
    con.info(`  После dispatch: value = ${newState.value}`)
    return 'incremented'
  }

  const result = store.dispatch(thunkWithState as any)
  con.success(`  Результат: "${result}"`)
  con.log('')
})

// ─── Условный thunk ───

document.getElementById('btn-thunk-conditional')!.addEventListener('click', () => {
  clearPipeline()
  con.error('─── Условный thunk (incrementIfOdd) ───')
  highlightStep('ps-dispatch', 'active')

  const incrementIfOdd = (dispatch: any, getState: any) => {
    const { value } = getState()
    con.info(`  Текущее value: ${value}`)

    if (value % 2 === 0) {
      con.error(`  ${value} — чётное. Пропускаем! Dispatch НЕ вызван.`)
      return false
    }

    con.success(`  ${value} — нечётное. Инкрементируем!`)
    dispatch({ type: 'counter/incremented' })
    return true
  }

  const did = store.dispatch(incrementIfOdd as any)
  con.log(`  Результат: ${did ? 'инкрементировали' : 'пропустили'}`)
  con.log('')
})

con.info('Нажимайте кнопки и следите за pipeline и консолью.')
con.log('Обратите внимание на разницу: объект → next() → reducer, функция → вызов с (dispatch, getState)')
