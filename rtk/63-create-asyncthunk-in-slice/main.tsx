import {
  configureStore,
  buildCreateSlice,
  asyncThunkCreator,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// 1. Подключаем asyncThunkCreator через buildCreateSlice
const createAppSlice = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator },
})

interface User { id: number; name: string; email: string }

type FetchMode = 'ok' | 'slow' | 'fail'

// Симулируем сеть (чтобы не зависеть от внешнего API)
function fakeFetchUsers(mode: FetchMode, signal: AbortSignal): Promise<User[]> {
  const delay = mode === 'slow' ? 1500 : 600
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const timer = setTimeout(() => {
      if (mode === 'fail') return reject(new Error('HTTP 500 Internal Server Error'))
      resolve([
        { id: 1, name: 'Alice',   email: 'alice@example.com' },
        { id: 2, name: 'Bob',     email: 'bob@example.com' },
        { id: 3, name: 'Charlie', email: 'charlie@example.com' },
        { id: 4, name: 'Diana',   email: 'diana@example.com' },
      ])
    }, delay)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

interface UsersState {
  loading: 'idle' | 'pending'
  list: User[]
  error: string | null
  lastRequestId: string | null
}

// Храним выбранный mode в замыкании — thunk принимает его как arg
const usersSlice = createAppSlice({
  name: 'users',
  initialState: {
    loading: 'idle',
    list: [],
    error: null,
    lastRequestId: null,
  } as UsersState,
  reducers: (create) => ({
    reset: create.reducer(() => ({
      loading: 'idle',
      list: [],
      error: null,
      lastRequestId: null,
    } as UsersState)),

    // ── ВОТ ОНО ──
    fetchAll: create.asyncThunk(
      async (mode: FetchMode, { signal }) => {
        // В реальном приложении: const res = await fetch('/api/users', { signal })
        // Здесь — setTimeout-симуляция (чтобы не зависеть от сервера)
        return await fakeFetchUsers(mode, signal)
      },
      {
        pending: (s, a) => {
          s.loading = 'pending'
          s.error = null
          s.lastRequestId = a.meta.requestId
        },
        fulfilled: (s, a) => {
          s.loading = 'idle'
          s.list = a.payload
        },
        rejected: (s, a) => {
          s.loading = 'idle'
          s.error = a.error.message ?? 'unknown'
        },
        settled: (_s, a) => {
          // settled — срабатывает и на fulfilled, и на rejected. Место для cleanup.
          // Просто выведем в консоль, state не трогаем:
          console.log(`[settled] ${a.type} — requestId=${a.meta.requestId.slice(0, 6)}`)
        },
      },
    ),
  }),
})

// ── Экспорт: slice.actions.fetchAll — это РАБОЧИЙ thunk ──
export const { reset, fetchAll } = usersSlice.actions

// Проверяем сигнатуру: fetchAll.pending/fulfilled/rejected/typePrefix — всё есть
console.log('typePrefix:',        fetchAll.typePrefix)          // "users/fetchAll"
console.log('pending.type:',      fetchAll.pending.type)        // "users/fetchAll/pending"
console.log('fulfilled.type:',    fetchAll.fulfilled.type)      // "users/fetchAll/fulfilled"
console.log('rejected.type:',     fetchAll.rejected.type)       // "users/fetchAll/rejected"

const store = configureStore({
  reducer: { users: usersSlice.reducer },
})

type RootState = ReturnType<typeof store.getState>

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог create.asyncThunk')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const usersListEl = document.getElementById('users-list')!
const statusLineEl = document.getElementById('status-line')!
const stateOut    = document.getElementById('state-out')!

function render(): void {
  const s: RootState = store.getState()
  stateOut.textContent = JSON.stringify(s, null, 2)

  if (s.users.loading === 'pending') {
    statusLineEl.textContent = '⏳ загрузка…'
    usersListEl.innerHTML = '<div class="user-card" style="opacity:.5;">Fetching…</div>'
    return
  }
  if (s.users.error) {
    statusLineEl.textContent = `✗ ошибка: ${s.users.error}`
    usersListEl.innerHTML = ''
    return
  }
  statusLineEl.textContent = s.users.list.length ? `✓ загружено: ${s.users.list.length}` : 'idle'
  usersListEl.innerHTML = s.users.list.length
    ? s.users.list.map(u => `<div class="user-card"><div class="name">${u.name}</div><div class="email">${u.email}</div></div>`).join('')
    : '— пусто —'
}
render()
store.subscribe(render)

// dispatch log
const origDispatch = store.dispatch
;(store as { dispatch: typeof origDispatch }).dispatch = ((a: unknown) => {
  const res = origDispatch(a as Parameters<typeof origDispatch>[0])
  const act = a as { type?: string; meta?: Record<string, unknown> }
  if (typeof a !== 'function' && act.type) {
    con.action({ type: act.type })
    if (act.meta?.requestId) con.info(`  requestId=${String(act.meta.requestId).slice(0, 8)}… arg=${JSON.stringify(act.meta.arg)}`)
  }
  return res
}) as typeof origDispatch

document.getElementById('fetch')!.addEventListener('click', () => {
  con.log('>>> dispatch(fetchAll("ok"))')
  store.dispatch(fetchAll('ok'))
})

document.getElementById('fetch-fail')!.addEventListener('click', () => {
  con.log('>>> dispatch(fetchAll("fail"))')
  store.dispatch(fetchAll('fail'))
})

document.getElementById('fetch-slow')!.addEventListener('click', () => {
  con.log('>>> dispatch(fetchAll("slow")) — 1.5 сек')
  store.dispatch(fetchAll('slow'))
})

document.getElementById('reset')!.addEventListener('click', () => {
  store.dispatch(reset())
})

con.log('slice = buildCreateSlice({creators:{asyncThunk: asyncThunkCreator}})({...})')
con.log('reducers: (create) => ({ fetchAll: create.asyncThunk(payloadCreator, {pending, fulfilled, rejected, settled}) })')
con.info('slice.actions.fetchAll — это ПОЛНЫЙ thunk: есть .pending/.fulfilled/.rejected/.settled/.typePrefix')
con.info(`typePrefix = ${fetchAll.typePrefix}`)
con.info(`action types: ${fetchAll.pending.type}, ${fetchAll.fulfilled.type}, ${fetchAll.rejected.type}`)
con.success('«Вся слайса» в одном месте: state machine fetchAll не размазана по двум файлам (thunk + reducer).')
