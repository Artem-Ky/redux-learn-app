import {
  configureStore,
  createAsyncThunk,
  createListenerMiddleware,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Часть 1: condition для спам-кликов ──────────────────────
interface PostsState {
  loading: 'idle' | 'pending'
  clicks: number
  fetches: number
  skipped: number
}

const postsSlice = createSlice({
  name: 'posts',
  initialState: { loading: 'idle', clicks: 0, fetches: 0, skipped: 0 } as PostsState,
  reducers: {
    clicked: (s) => {
      s.clicks++
    },
    skipped: (s) => {
      s.skipped++
    },
    reset1: (s) => {
      s.clicks = 0
      s.fetches = 0
      s.skipped = 0
      s.loading = 'idle'
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchPosts.pending, (s) => {
      s.loading = 'pending'
      s.fetches++
    })
    b.addCase(fetchPosts.fulfilled, (s) => {
      s.loading = 'idle'
    })
    b.addCase(fetchPosts.rejected, (s) => {
      s.loading = 'idle'
    })
  },
})

const fetchPosts = createAsyncThunk<
  void,
  void,
  { state: { posts: PostsState; search: SearchState } }
>(
  'posts/fetch',
  async () => {
    await new Promise((r) => setTimeout(r, 1200))
  },
  {
    condition: (_, { getState }) => getState().posts.loading !== 'pending',
  },
)

// ── Часть 2: listener + takeLatest для search ────────────────
interface SearchState {
  query: string
  keystrokes: number
  realFetches: number
  cancelled: number
  completed: number
  lastResult: string | null
}

const searchSlice = createSlice({
  name: 'search',
  initialState: {
    query: '',
    keystrokes: 0,
    realFetches: 0,
    cancelled: 0,
    completed: 0,
    lastResult: null,
  } as SearchState,
  reducers: {
    queryChanged: (s, a: PayloadAction<string>) => {
      s.query = a.payload
      s.keystrokes++
    },
    fetchStarted: (s) => {
      s.realFetches++
    },
    fetchCancelled: (s) => {
      s.cancelled++
    },
    fetchCompleted: (s, a: PayloadAction<string>) => {
      s.completed++
      s.lastResult = a.payload
    },
  },
})

const listener = createListenerMiddleware()

const store = configureStore({
  reducer: { posts: postsSlice.reducer, search: searchSlice.reducer },
  middleware: (g) => g().prepend(listener.middleware),
})

type RootState = ReturnType<typeof store.getState>

// ── listener: cancel предыдущего + debounce + fetch ──────────
listener.startListening({
  actionCreator: searchSlice.actions.queryChanged,
  effect: async (action, api) => {
    api.cancelActiveListeners() // ← убивает предыдущий эффект через abort
    try {
      await api.delay(250) // debounce
      store.dispatch(searchSlice.actions.fetchStarted())
      // симуляция сети
      await api.delay(600)
      store.dispatch(searchSlice.actions.fetchCompleted(`Result for "${action.payload}"`))
    } catch {
      // TaskAbortError — прошлый effect отменён новым keystroke
      store.dispatch(searchSlice.actions.fetchCancelled())
    }
  },
})

// ── UI ──────────────────────────────────────────────────────
const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — dedup (condition + listener takeLatest)',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

function render(): void {
  const s: RootState = store.getState()
  document.getElementById('c1-clicks')!.textContent = String(s.posts.clicks)
  document.getElementById('c1-fetches')!.textContent = String(s.posts.fetches)
  document.getElementById('c1-skipped')!.textContent = String(s.posts.skipped)

  document.getElementById('c2-keys')!.textContent = String(s.search.keystrokes)
  document.getElementById('c2-fetches')!.textContent = String(s.search.realFetches)
  document.getElementById('c2-cancelled')!.textContent = String(s.search.cancelled)
  document.getElementById('c2-completed')!.textContent = String(s.search.completed)
}
render()
store.subscribe(render)

// Часть 1
document.getElementById('btn-spam')!.addEventListener('click', async () => {
  store.dispatch(postsSlice.actions.clicked())
  const result = await store.dispatch(fetchPosts())
  if (fetchPosts.rejected.match(result) && result.meta.condition) {
    store.dispatch(postsSlice.actions.skipped())
    con.warn(`→ skipped: condition сказал false (loading уже pending)`)
  } else if (fetchPosts.fulfilled.match(result)) {
    con.success(`→ fetch завершён`)
  }
})

document.getElementById('btn-reset-1')!.addEventListener('click', () => {
  store.dispatch(postsSlice.actions.reset1())
  con.info('Reset сценария 1.')
})

// Часть 2
const searchInput = document.getElementById('search-input') as HTMLInputElement
searchInput.addEventListener('input', () => {
  store.dispatch(searchSlice.actions.queryChanged(searchInput.value))
  con.log(`keystroke "${searchInput.value}" — listener отменит предыдущий и запустит новый`)
})

con.log('Часть 1: кликайте «Fetch posts» несколько раз подряд — fetches вырастет на 1, skipped на сколько хватит спама.')
con.log('Часть 2: печатайте в search. Если печатаете быстрее 250ms — real fetch не запустится (отмена). Медленнее — дойдёт до completed.')
con.info('Cancelled ≠ completed: cancelled означает "listener отменён до/во время fetch". Completed = "дошло до конца".')
