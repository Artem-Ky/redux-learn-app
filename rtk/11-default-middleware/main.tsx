import { configureStore, createSlice, type EnhancedStore } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface State { value: number; logs: string[] }

const slice = createSlice({
  name: 'demo',
  initialState: { value: 0, logs: [] } as State,
  reducers: {
    incremented: (s) => { s.value += 1 },
    logged: (s, a: { payload: string }) => { s.logs.push(a.payload) },
  },
})

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог middleware-конфигурации')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)

const flags = {
  thunk: true,
  immutableCheck: true,
  serializableCheck: true,
  actionCreatorCheck: true,
}

let store: EnhancedStore<{ demo: State }>

function recreate(): void {
  store = configureStore({
    reducer: { demo: slice.reducer },
    middleware: (getDefault) => getDefault({
      thunk: flags.thunk,
      immutableCheck: flags.immutableCheck,
      serializableCheck: flags.serializableCheck,
      actionCreatorCheck: flags.actionCreatorCheck,
    }),
  }) as EnhancedStore<{ demo: State }>

  dev.clear()
  dev.connectStore(store)
  updateConfigDisplay()
  con.success(`Store пересоздан. Активно middleware: ${countActive()}/4.`)
}

function countActive(): number {
  return Object.values(flags).filter(Boolean).length
}

function updateConfigDisplay(): void {
  const lines: string[] = []
  lines.push(`<span class="fn">configureStore</span>({`)
  lines.push(`  reducer: { demo: slice.reducer },`)
  lines.push(`  middleware: (getDefaultMiddleware) =&gt; <span class="fn">getDefaultMiddleware</span>({`)
  for (const [k, v] of Object.entries(flags)) {
    lines.push(`    ${k}: <span class="kw">${v}</span>,`)
  }
  lines.push(`  }),`)
  lines.push(`})`)

  document.getElementById('config-display')!.innerHTML = lines.join('\n')
}

document.querySelectorAll<HTMLButtonElement>('.mw-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.mw as keyof typeof flags
    flags[key] = !flags[key]
    btn.classList.toggle('on', flags[key])
    btn.classList.toggle('off', !flags[key])
    btn.textContent = flags[key] ? 'on' : 'off'
    updateConfigDisplay()
    con.info(`${key}: ${flags[key] ? 'включено' : 'отключено'}. Нажмите «пересоздать» чтобы применить.`)
  })
})

document.getElementById('recreate')!.addEventListener('click', () => recreate())

document.getElementById('dispatch')!.addEventListener('click', () => {
  const a = slice.actions.incremented()
  store.dispatch(a)
  con.action(a)
})

document.getElementById('dispatch-async')!.addEventListener('click', () => {
  if (!flags.thunk) {
    con.error('thunk отключён — нельзя dispatch'+'нуть функцию. Включите thunk и пересоздайте store.')
    return
  }
  con.info('Запущен async thunk: ждём 600ms, потом dispatch logged.')
  store.dispatch(((dispatch) => {
    setTimeout(() => {
      const a = slice.actions.logged(`async ok ${Date.now() % 1000}`)
      dispatch(a)
      con.action(a, 'thunk')
    }, 600)
  }) as Parameters<typeof store.dispatch>[0])
})

recreate()
con.log('По умолчанию все 4 middleware включены. Выключайте чекбоксы и пересоздавайте store.')
con.warn('В production immutable/serializable/actionCreator выключены автоматически — это нормально.')
