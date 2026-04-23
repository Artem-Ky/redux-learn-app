import {
  configureStore,
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Post {
  id: string
  title: string
  author: string
}

type LoadingStatus = 'idle' | 'pending' | 'fulfilled' | 'rejected'

const postsAdapter = createEntityAdapter<Post>()

// Preloaded posts
const initialPosts: Post[] = [
  { id: 'p1', title: 'Первый пост (preloaded)', author: 'Alice' },
  { id: 'p2', title: 'Второй пост (preloaded)', author: 'Bob' },
]

// Плоский initial state: EntityState + { loading, error }
const postsSlice = createSlice({
  name: 'posts',
  initialState: postsAdapter.getInitialState(
    {
      loading: 'idle' as LoadingStatus,
      error: null as string | null,
      lastFetchAt: null as number | null,
    },
    initialPosts,
  ),
  reducers: {
    fetchPending: (state) => {
      state.loading = 'pending'
      state.error = null
    },
    fetchFulfilled: (state, action: PayloadAction<Post[]>) => {
      state.loading = 'fulfilled'
      state.error = null
      state.lastFetchAt = Date.now()
      postsAdapter.setAll(state, action.payload)
    },
    fetchRejected: (state, action: PayloadAction<string>) => {
      state.loading = 'rejected'
      state.error = action.payload
    },
    reset: () =>
      postsAdapter.getInitialState(
        { loading: 'idle' as LoadingStatus, error: null, lastFetchAt: null },
        initialPosts,
      ),
  },
})

const { fetchPending, fetchFulfilled, fetchRejected, reset } = postsSlice.actions
const store = configureStore({ reducer: { posts: postsSlice.reducer } })

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог fetch lifecycle',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// Селекторы
const postsSelectors = postsAdapter.getSelectors<ReturnType<typeof store.getState>>(
  (s) => s.posts,
)
const selectLoading = (s: ReturnType<typeof store.getState>) => s.posts.loading
const selectError = (s: ReturnType<typeof store.getState>) => s.posts.error

// ── DOM ────────────────────────────────────────────
const statusBadge = document.getElementById('status-badge')!
const errorMsg = document.getElementById('error-msg')!
const postList = document.getElementById('post-list')!
const stateOut = document.getElementById('state-out')!

function escape(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
}

function render(): void {
  const state = store.getState()
  const loading = selectLoading(state)
  const error = selectError(state)
  const posts = postsSelectors.selectAll(state)

  // status badge
  statusBadge.textContent = loading
  statusBadge.className =
    'status-badge ' +
    (loading === 'idle'
      ? 'status-idle'
      : loading === 'pending'
      ? 'status-pending'
      : loading === 'fulfilled'
      ? 'status-fulfilled'
      : 'status-rejected')

  errorMsg.textContent = error ? `error: ${error}` : '—'

  // post list
  postList.innerHTML = ''
  if (loading === 'pending') {
    postList.innerHTML =
      '<div style="padding: 20px; text-align: center; color: var(--text-muted);">⏳ загрузка...</div>'
  } else if (posts.length === 0) {
    postList.innerHTML =
      '<div style="padding: 20px; text-align: center; color: var(--text-muted);">— пусто —</div>'
  } else {
    for (const p of posts) {
      const row = document.createElement('div')
      row.className = 'post-row'
      row.innerHTML = `
        <div class="post-row__id">#${escape(p.id)}</div>
        <div class="post-row__title">${escape(p.title)}</div>
        <div class="post-row__author">${escape(p.author)}</div>
      `
      postList.appendChild(row)
    }
  }

  // raw state
  stateOut.textContent = JSON.stringify(state.posts, null, 2)
}

render()
store.subscribe(render)

// ── async fetch simulation ─────────────────────────
function simulateFetch(fail: boolean): void {
  store.dispatch(fetchPending())
  con.info('dispatch(fetchPending) → state.loading = "pending", error = null')

  setTimeout(() => {
    if (fail) {
      const a = fetchRejected('Network error 500')
      store.dispatch(a)
      con.action(a, 'fetchRejected')
      con.error('state.loading = "rejected", error = "Network error 500". entities не тронуты.')
    } else {
      const fresh: Post[] = [
        { id: 'p10', title: 'Свежий из API #1', author: 'Server' },
        { id: 'p11', title: 'Свежий из API #2', author: 'Server' },
        { id: 'p12', title: 'Свежий из API #3', author: 'Server' },
        { id: 'p13', title: 'Свежий из API #4', author: 'Server' },
      ]
      const a = fetchFulfilled(fresh)
      store.dispatch(a)
      con.action(a, 'fetchFulfilled')
      con.success('state.loading = "fulfilled". adapter.setAll ВНУТРИ reducer перезаписал entities.')
    }
  }, 800)
}

document.getElementById('fetch-ok')!.addEventListener('click', () => {
  simulateFetch(false)
})
document.getElementById('fetch-fail')!.addEventListener('click', () => {
  simulateFetch(true)
})
document.getElementById('reset')!.addEventListener('click', () => {
  store.dispatch(reset())
  con.log('reset: state возвращён к {idle, null, preloaded posts}')
})

con.log('postsAdapter.getInitialState(additionalState, initialPosts)')
con.info('Результат: { ids: [p1, p2], entities: {…}, loading: "idle", error: null, lastFetchAt: null }')
con.success('Нажми "Simulate fetch" — увидишь idle → pending → fulfilled/rejected.')
