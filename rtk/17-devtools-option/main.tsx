import { configureStore, createSlice, type Middleware } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

const slice = createSlice({
  name: 'demo',
  initialState: { tickCount: 0, noisy: 0, savedUsers: 0 },
  reducers: {
    'tick': (s) => { s.tickCount += 1 },
    'noisy': (s) => { s.noisy += 1 },
    'save': (s) => { s.savedUsers += 1 },
  },
})

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог devTools-фильтра')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)

let denyRegex: RegExp | null = null

const denylistMiddleware: Middleware = () => (next) => (action) => {
  const result = next(action)
  return result
}

const store = configureStore({
  reducer: { demo: slice.reducer },
  middleware: (gdm) => gdm().concat(denylistMiddleware),
})

const origAddSnapshot = dev.addSnapshot.bind(dev)
dev.addSnapshot = (action, before, after) => {
  const t = String((action as { type: unknown }).type)
  if (denyRegex && denyRegex.test(t)) {
    con.warn(`[devTools filter] ${t} отфильтрован regex'ом ${denyRegex}`)
    return
  }
  origAddSnapshot(action, before, after)
}

dev.connectStore(store)

document.getElementById('apply-deny')!.addEventListener('click', () => {
  const text = (document.getElementById('denylist') as HTMLInputElement).value.trim()
  if (!text) {
    denyRegex = null
    con.info('Фильтр сброшен. Все actions показываются.')
    return
  }
  try {
    denyRegex = new RegExp(text)
    con.success(`Фильтр применён: actionsDenylist = /${text}/`)
  } catch (e) {
    con.error(`Невалидный regex: ${(e as Error).message}`)
    denyRegex = null
  }
})

document.getElementById('dispatch-tick')!.addEventListener('click', () => {
  store.dispatch({ type: 'counter/tick' })
  con.action({ type: 'counter/tick' })
})
document.getElementById('dispatch-noisy')!.addEventListener('click', () => {
  store.dispatch({ type: 'debug/noisy' })
  con.action({ type: 'debug/noisy' })
})
document.getElementById('dispatch-import')!.addEventListener('click', () => {
  store.dispatch({ type: 'user/save', payload: { id: 1, name: 'Alice' } })
  con.action({ type: 'user/save', payload: { id: 1, name: 'Alice' } })
})
document.getElementById('clear-dev')!.addEventListener('click', () => {
  dev.clear()
  con.log('DevTools-история очищена.')
})

con.log('Введите regex (например, ^counter/tick$) и нажмите «применить фильтр».')
con.info('Затем кликайте dispatch-кнопки — отфильтрованные actions не попадут в DevTools-панель.')
con.warn('Это эмулирует поведение опции actionsDenylist реального Redux DevTools Extension.')
