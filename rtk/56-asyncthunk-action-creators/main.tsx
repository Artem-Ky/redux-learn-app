import {
  configureStore,
  createAsyncThunk,
  createSlice,
  isPending,
  isFulfilled,
  isRejected,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface User { id: number; name: string }
interface Post { id: number; title: string }

function fakeFetch<T>(payload: T, failRate = 0): Promise<T> {
  const delay = 400 + Math.floor(Math.random() * 600)
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < failRate) reject(new Error(`Random 500 (${delay}ms)`))
      else resolve(payload)
    }, delay)
  })
}

// Два независимых thunk'а
const fetchUsers = createAsyncThunk<User[], boolean | undefined>(
  'users/fetch',
  async (shouldFail) => fakeFetch(
    [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
    shouldFail ? 1 : 0,
  ),
)

const fetchPosts = createAsyncThunk<Post[], boolean | undefined>(
  'posts/fetch',
  async (shouldFail) => fakeFetch(
    [{ id: 11, title: 'Hello' }, { id: 12, title: 'World' }],
    shouldFail ? 1 : 0,
  ),
)

interface State {
  users: { loading: boolean; list: User[]; error: string | null }
  posts: { loading: boolean; list: Post[]; error: string | null }
  anyLoading: boolean
  matcherHits: { lastPending: string; lastSettled: string }
}

const initialState: State = {
  users: { loading: false, list: [], error: null },
  posts: { loading: false, list: [], error: null },
  anyLoading: false,
  matcherHits: { lastPending: '—', lastSettled: '—' },
}

const slice = createSlice({
  name: 'demo',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    // --- 1. addCase точечно ---
    b.addCase(fetchUsers.pending,   (s) => { s.users.loading = true;  s.users.error = null })
    b.addCase(fetchUsers.fulfilled, (s, a) => { s.users.list = a.payload })
    b.addCase(fetchUsers.rejected,  (s, a) => { s.users.error = a.error.message ?? 'err' })

    b.addCase(fetchPosts.pending,   (s) => { s.posts.loading = true;  s.posts.error = null })
    b.addCase(fetchPosts.fulfilled, (s, a) => { s.posts.list = a.payload })
    b.addCase(fetchPosts.rejected,  (s, a) => { s.posts.error = a.error.message ?? 'err' })

    // --- 2. addMatcher — isPending для нескольких thunk'ов сразу ---
    b.addMatcher(isPending(fetchUsers, fetchPosts), (s, a) => {
      s.anyLoading = true
      s.matcherHits.lastPending = a.type
    })

    // --- 3. thunk.settled — объединяет fulfilled+rejected ---
    b.addMatcher(fetchUsers.settled, (s, a) => {
      s.users.loading = false
      s.matcherHits.lastSettled = a.type
    })
    b.addMatcher(fetchPosts.settled, (s, a) => {
      s.posts.loading = false
      s.matcherHits.lastSettled = a.type
    })

    // --- 4. «любой fulfilled/rejected» — сбрасываем anyLoading ---
    b.addMatcher(
      (a) => isFulfilled(fetchUsers, fetchPosts)(a) || isRejected(fetchUsers, fetchPosts)(a),
      (s) => {
        // anyLoading становится false если оба slice'а больше не грузятся
        if (!s.users.loading && !s.posts.loading) s.anyLoading = false
      },
    )
  },
})

const store = configureStore({ reducer: slice.reducer })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог matchers')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const stateOut = document.getElementById('state-out')!

// Подсветка matcher-хитов
const mPending = document.getElementById('m-pending')!
const mSettledUsers = document.getElementById('m-settled-users')!
const mSettledPosts = document.getElementById('m-settled-posts')!
const mOk = document.getElementById('m-ok')!
const mErr = document.getElementById('m-err')!

function flash(el: Element, cls: string, ms = 600): void {
  el.classList.add(cls)
  setTimeout(() => el.classList.remove(cls), ms)
}

function render(): void {
  stateOut.textContent = JSON.stringify(store.getState(), null, 2)
}
render()
store.subscribe(render)

// Перехватываем dispatch — для лога + подсветки матчеров
const origDispatch = store.dispatch
type AnyAction = { type?: string; payload?: unknown; meta?: Record<string, unknown>; error?: unknown }
;(store as { dispatch: typeof origDispatch }).dispatch = ((a: unknown) => {
  const res = origDispatch(a as Parameters<typeof origDispatch>[0])
  const action = a as AnyAction
  if (typeof a === 'function' || !action?.type) return res

  con.action({ type: action.type, payload: action.payload })

  if (isPending(fetchUsers, fetchPosts)(action)) {
    con.info('  matcher HIT: isPending(usersThunk, postsThunk)')
    flash(mPending, 'hit', 700)
  }
  if (fetchUsers.settled(action)) {
    con.info('  matcher HIT: fetchUsers.settled')
    flash(mSettledUsers, fetchUsers.fulfilled.match(action) ? 'ok' : 'err', 700)
  }
  if (fetchPosts.settled(action)) {
    con.info('  matcher HIT: fetchPosts.settled')
    flash(mSettledPosts, fetchPosts.fulfilled.match(action) ? 'ok' : 'err', 700)
  }
  if (isFulfilled(fetchUsers, fetchPosts)(action)) {
    con.success('  matcher HIT: isFulfilled(*)')
    flash(mOk, 'ok', 700)
  }
  if (isRejected(fetchUsers, fetchPosts)(action)) {
    con.error('  matcher HIT: isRejected(*)')
    flash(mErr, 'err', 700)
  }
  return res
}) as typeof origDispatch

document.getElementById('fetch-users')!.addEventListener('click', () => {
  store.dispatch(fetchUsers(false))
})
document.getElementById('fetch-posts')!.addEventListener('click', () => {
  store.dispatch(fetchPosts(false))
})
document.getElementById('fail-users')!.addEventListener('click', () => {
  store.dispatch(fetchUsers(true))
})
document.getElementById('fail-posts')!.addEventListener('click', () => {
  store.dispatch(fetchPosts(true))
})
document.getElementById('fetch-both')!.addEventListener('click', () => {
  con.info('──── Параллельно: fetchUsers + fetchPosts ────')
  store.dispatch(fetchUsers(false))
  store.dispatch(fetchPosts(false))
})

con.log('fetchUsers.pending.type   =', fetchUsers.pending.type)
con.log('fetchUsers.fulfilled.type =', fetchUsers.fulfilled.type)
con.log('fetchUsers.rejected.type  =', fetchUsers.rejected.type)
con.log('fetchUsers.typePrefix     =', fetchUsers.typePrefix)
con.info('fetchUsers.settled = isAnyOf(fetchUsers.rejected, fetchUsers.fulfilled)')
con.success('Нажмите "Оба параллельно" — увидите 4 matcher-хита одновременно.')
