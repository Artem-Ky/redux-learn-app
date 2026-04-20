import { configureStore, createSlice, type EnhancedStore } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface State { last: unknown; cache: { complex?: unknown } }

const slice = createSlice({
  name: 'data',
  initialState: { last: null, cache: {} } as State,
  reducers: {
    setLast: (s, a: { payload: unknown }) => { s.last = a.payload },
    setCache: (s, a: { payload: unknown }) => { s.cache.complex = a.payload },
  },
})

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог serializable check')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
const errOut = document.getElementById('err-out')!

let opts: {
  ignoredActions?: string[]
  ignoredPaths?: string[]
} = {}

let store: EnhancedStore<{ data: State }>

function recreate(): void {
  store = configureStore({
    reducer: { data: slice.reducer },
    middleware: (gdm) => gdm({
      serializableCheck: { ...opts },
      immutableCheck: false,
      actionCreatorCheck: false,
      thunk: false,
    }),
  }) as EnhancedStore<{ data: State }>

  dev.clear()
  dev.connectStore(store)
}

function showResult(level: 'warn' | 'ok', msg: string): void {
  errOut.classList.remove('warn', 'ok')
  errOut.classList.add(level)
  errOut.textContent = msg
}

const origWarn = console.warn.bind(console)
let lastWarning = ''
console.warn = (...args: unknown[]) => {
  lastWarning = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')
  origWarn(...args)
}

function dispatchAndCheck(action: { type: string; payload: unknown }, label: string): void {
  lastWarning = ''
  recreate()
  store.dispatch(slice.actions.setLast(action.payload))
  con.action({ type: 'data/setLast', payload: action.payload }, label)

  setTimeout(() => {
    if (lastWarning) {
      showResult('warn', `⚠ middleware поймал:\n${lastWarning}`)
      con.warn(`${label}: ${lastWarning.slice(0, 120)}…`)
    } else {
      showResult('ok', `✓ ${label}: всё сериализуемо, warning не сгенерирован.`)
      con.success(`${label}: ok`)
    }
  }, 50)
}

class User { constructor(public name = 'Alice') {} }

const TESTS: Record<string, () => void> = {
  date:    () => dispatchAndCheck({ type: 'set/date',    payload: new Date() }, 'date'),
  map:     () => dispatchAndCheck({ type: 'set/map',     payload: new Map([['a', 1]]) }, 'map'),
  promise: () => dispatchAndCheck({ type: 'set/promise', payload: Promise.resolve(1) }, 'promise'),
  fn:      () => dispatchAndCheck({ type: 'set/fn',      payload: () => 'hi' }, 'function'),
  class:   () => dispatchAndCheck({ type: 'set/class',   payload: new User() }, 'class instance'),
  plain:   () => dispatchAndCheck({ type: 'set/plain',   payload: { a: 1, b: [2, 3], nested: { c: 'ok' } } }, 'plain'),
}

document.querySelectorAll<HTMLButtonElement>('[data-test]').forEach((btn) => {
  btn.addEventListener('click', () => TESTS[btn.dataset.test!]())
})

document.getElementById('ignore-action')!.addEventListener('click', () => {
  opts = { ignoredActions: ['data/setLast'] }
  recreate()
  con.info('Применено: ignoredActions: ["data/setLast"] — все следующие dispatch будут проигнорированы.')
  showResult('ok', 'Опция применена. Теперь dispatch с Date / Map не вызовет warning.')
})

document.getElementById('ignore-path')!.addEventListener('click', () => {
  opts = { ignoredPaths: ['data.cache'] }
  recreate()
  store.dispatch(slice.actions.setCache(new Map([['k', 'v']])))
  con.info('Применено: ignoredPaths: ["data.cache"] — Map в data.cache не вызвал warning.')
  setTimeout(() => {
    showResult(lastWarning ? 'warn' : 'ok', lastWarning || '✓ Map записан в data.cache, путь игнорируется.')
  }, 50)
})

document.getElementById('reset-options')!.addEventListener('click', () => {
  opts = {}
  recreate()
  con.info('Опции сброшены к default.')
  showResult('ok', 'Опции сброшены. Теперь все dispatch проверяются строго.')
})

recreate()
con.log('Кликайте сценарии — middleware покажет warning или пропустит.')
con.warn('Это middleware пишет console.warn (не throw). Откройте F12 для полного traceback.')
