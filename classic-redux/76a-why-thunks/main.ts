import { legacy_createStore as createStore, applyMiddleware } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(document.getElementById('console-container')!, 'Сравнение трёх подходов')

interface AppState {
  status: 'idle' | 'loading' | 'loaded' | 'error'
  data: string[]
  error: string | null
  approach: string
}

const initialState: AppState = { status: 'idle', data: [], error: null, approach: '' }

function reducer(state: AppState = initialState, action: any): AppState {
  switch (action.type) {
    case 'data/loading':
      return { ...state, status: 'loading', approach: action.approach ?? '' }
    case 'data/loaded':
      return { ...state, status: 'loaded', data: action.payload, error: null }
    case 'data/error':
      return { ...state, status: 'error', error: action.payload, data: [] }
    case 'data/reset':
      return initialState
    default:
      return state
  }
}

function fakeServerFetch(): Promise<string[]> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(['Задача 1', 'Задача 2', 'Задача 3'])
    }, 1000)
  })
}

const thunkMiddleware = (storeAPI: any) => (next: any) => (action: any) => {
  if (typeof action === 'function') {
    return action(storeAPI.dispatch, storeAPI.getState)
  }
  return next(action)
}

const store = createStore(reducer, applyMiddleware(thunkMiddleware))

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

// ─── Подход 1: async в reducer ───

document.getElementById('btn-approach1')!.addEventListener('click', () => {
  con.error('─── ПОДХОД 1: Async в reducer ───')
  con.error('Пытаемся сделать fetch внутри reducer...')

  const resultEl = document.getElementById('result-1')!

  try {
    con.error('reducer не может быть асинхронным!')
    con.error('fetch() внутри reducer — побочный эффект, нарушающий чистоту.')
    con.error('Даже если технически «сработает», state НЕ обновится синхронно.')
    con.log('')
    con.warn('Reducer ОБЯЗАН вернуть новый state СИНХРОННО.')
    con.warn('Promise/fetch/setTimeout — всё это побочные эффекты.')
    con.log('')

    resultEl.textContent = '❌ ЗАПРЕЩЕНО. Reducer = чистая функция. Никаких side effects!'
    resultEl.style.color = 'var(--error)'
  } catch (e) {
    resultEl.textContent = `❌ Ошибка: ${e}`
  }
})

// ─── Подход 2: async снаружи ───

document.getElementById('btn-approach2')!.addEventListener('click', async () => {
  con.warn('─── ПОДХОД 2: Async снаружи (ad-hoc) ───')
  con.log('Делаем fetch ВНЕ Redux, потом dispatch результата...')

  const resultEl = document.getElementById('result-2')!
  resultEl.textContent = '⏳ Загрузка...'
  resultEl.style.color = 'var(--warning)'

  store.dispatch({ type: 'data/loading', approach: 'external' })

  const data = await fakeServerFetch()

  store.dispatch({ type: 'data/loaded', payload: data })

  con.success(`Данные загружены: ${JSON.stringify(data)}`)
  con.warn('Работает! Но проблемы:')
  con.warn('  1. store — глобальная переменная, жёсткая привязка')
  con.warn('  2. Нельзя переиспользовать (другой store? SSR? тесты?)')
  con.warn('  3. Логика размазана по UI-коду')
  con.warn('  4. Нет единого «action creator» паттерна')
  con.log('')

  resultEl.textContent = `⚠ Работает, но хрупко: ${JSON.stringify(data)}`
  resultEl.style.color = 'var(--warning)'
})

// ─── Подход 3: thunk ───

const fetchDataThunk = () => async (dispatch: any, getState: any) => {
  const currentState = getState()
  con.info(`  getState().status = "${currentState.status}"`)

  dispatch({ type: 'data/loading', approach: 'thunk' })

  const data = await fakeServerFetch()

  dispatch({ type: 'data/loaded', payload: data })

  return data
}

document.getElementById('btn-approach3')!.addEventListener('click', async () => {
  con.success('─── ПОДХОД 3: Thunk ───')
  con.log('Dispatch функции вместо объекта...')
  con.log('store.dispatch(fetchDataThunk())')

  const resultEl = document.getElementById('result-3')!
  resultEl.textContent = '⏳ Загрузка через thunk...'
  resultEl.style.color = 'var(--accent-cyan)'

  const result = await store.dispatch(fetchDataThunk() as any)

  con.success(`Данные загружены: ${JSON.stringify(result)}`)
  con.success('Преимущества:')
  con.success('  ✅ Не привязан к конкретному store')
  con.success('  ✅ Переиспользуемый action creator')
  con.success('  ✅ Может читать getState()')
  con.success('  ✅ Можно await результат dispatch')
  con.success('  ✅ Легко тестировать')
  con.log('')

  resultEl.textContent = `✅ Thunk: ${JSON.stringify(result)}`
  resultEl.style.color = 'var(--success)'
})

// ─── Reset ───

document.getElementById('btn-reset')!.addEventListener('click', () => {
  store.dispatch({ type: 'data/reset' })
  document.getElementById('result-1')!.textContent = '—'
  document.getElementById('result-2')!.textContent = '—'
  document.getElementById('result-3')!.textContent = '—'
  document.getElementById('result-1')!.style.color = 'var(--error)'
  document.getElementById('result-2')!.style.color = 'var(--text-primary)'
  document.getElementById('result-3')!.style.color = 'var(--success)'
  con.clear()
  con.info('State сброшен. Попробуйте все три подхода.')
})

con.info('Попробуйте все три подхода и сравните.')
con.log('Подход 1 — запрещён. Подход 2 — работает, но хрупко. Подход 3 (thunk) — правильный.')
