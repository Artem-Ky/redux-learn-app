import {
  configureStore,
  createListenerMiddleware,
  createSlice,
  TaskAbortError,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── slice ────────────────────────────────────────────────────────────
interface SearchState {
  term: string
  results: string[]
  completed: number
  cancelled: number
}
const initial: SearchState = { term: '', results: [], completed: 0, cancelled: 0 }

const slice = createSlice({
  name: 'search',
  initialState: initial,
  reducers: {
    searchTermChanged: (s, a: PayloadAction<string>) => { s.term = a.payload },
    searchResults: (s, a: PayloadAction<{ term: string; hits: string[] }>) => {
      s.results = a.payload.hits
      s.completed += 1
    },
    searchCancelled: (s) => { s.cancelled += 1 },
    reset: () => initial,
  },
})
const { searchTermChanged, searchResults, searchCancelled, reset } = slice.actions

// Fake data для "api"
const DATA = [
  'redux-toolkit', 'redux-saga', 'redux-observable', 'redux-thunk',
  'react', 'react-query', 'react-router', 'zustand', 'jotai', 'mobx',
  'rxjs', 'recoil', 'effector', 'valtio', 'xstate', 'immer',
]

async function fakeFetch(term: string, signal: AbortSignal): Promise<string[]> {
  // Имитация сети ~450мс
  return new Promise<string[]>((resolve, reject) => {
    const t = setTimeout(() => {
      const q = term.toLowerCase().trim()
      resolve(q ? DATA.filter((x) => x.includes(q)) : [])
    }, 450)
    // Подписываемся на abort — прерываем «запрос» и кидаем как настоящий fetch
    signal.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('aborted', 'AbortError'))
    }, { once: true })
  })
}

// ── listener middleware ──────────────────────────────────────────────
const listenerMiddleware = createListenerMiddleware()

const store = configureStore({
  reducer: { search: slice.reducer },
  middleware: (g) => g().prepend(listenerMiddleware.middleware),
})
type RootState = ReturnType<typeof store.getState>

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог cancellation (takeLatest)')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

let runCounter = 0

// ── THE listener: debounce + takeLatest + abortable fetch ────────────
listenerMiddleware.startListening({
  actionCreator: searchTermChanged,
  effect: async (action, api) => {
    const id = ++runCounter
    const term = action.payload
    con.log(`[#${id}] start term="${term}"`)

    // Шаг 1: takeLatest — отменяем другие активные инстансы
    api.cancelActiveListeners()

    // Шаг 2: debounce 300мс
    try {
      await api.delay(300)
    } catch (e) {
      // Только TaskAbortError — это ОК, просто отменили
      if (e instanceof TaskAbortError) {
        con.warn(`[#${id}] cancelled во время debounce (${e.message})`)
        api.dispatch(searchCancelled())
        return
      }
      throw e
    }

    // Шаг 3: fetch с abort signal'ом
    try {
      con.info(`[#${id}] fetch("${term}") …`)
      const hits = await fakeFetch(term, api.signal)
      api.dispatch(searchResults({ term, hits }))
      con.success(`[#${id}] completed — ${hits.length} hits`)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // fetch прерван через signal → это cancellation
        con.warn(`[#${id}] fetch aborted (abort signal)`)
        api.dispatch(searchCancelled())
        return
      }
      if (e instanceof TaskAbortError) {
        con.warn(`[#${id}] TaskAbortError: ${e.message}`)
        api.dispatch(searchCancelled())
        return
      }
      throw e
    }
  },
})

// ── render ───────────────────────────────────────────────────────────
const resultsEl = document.getElementById('results')!
const mOk = document.getElementById('m-ok')!
const mCancel = document.getElementById('m-cancel')!
const mTerm = document.getElementById('m-term')!

function render(): void {
  const s = (store.getState() as RootState).search
  mOk.textContent = String(s.completed)
  mCancel.textContent = String(s.cancelled)
  mTerm.textContent = s.term || '—'
  if (s.term.trim() === '') {
    resultsEl.textContent = 'Результаты появятся здесь после 300мс паузы в вводе…'
    return
  }
  if (s.results.length === 0) {
    resultsEl.innerHTML = `term=<b>${escapeHtml(s.term)}</b> · 0 results`
    return
  }
  resultsEl.innerHTML =
    `term=<b>${escapeHtml(s.term)}</b> · ${s.results.length} results:\n` +
    s.results.map((r) => '· ' + escapeHtml(r)).join('\n')
}
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
render()
store.subscribe(render)

// ── input ────────────────────────────────────────────────────────────
const input = document.getElementById('q') as HTMLInputElement
input.addEventListener('input', () => {
  const a = searchTermChanged(input.value)
  store.dispatch(a)
  con.action(a)
})

document.getElementById('reset')!.addEventListener('click', () => {
  input.value = ''
  const a = reset(); store.dispatch(a); con.action(a)
})

con.log('Печатайте быстро — увидите cancelled. Сделайте паузу > 300мс — completed.')
con.info('fakeFetch подписан на api.signal — настоящий network-abort моделируется DOMException(AbortError).')
con.warn('Используется try/finally-подобный flow: TaskAbortError не проглочен, state обновляется только при completed.')
