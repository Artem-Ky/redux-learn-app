import { configureStore, createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Post { id: number; title: string }

// Важно: каждый запрос получает СВОЮ случайную задержку.
// Запросы «вернуться» в неправильном порядке.
function fakeSearch(query: string): Promise<Post[]> {
  const delay = 400 + Math.floor(Math.random() * 1400)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        query
          ? [
              { id: 1, title: `Результат "${query}" A (delay ${delay}ms)` },
              { id: 2, title: `Результат "${query}" B (delay ${delay}ms)` },
            ]
          : [],
      )
    }, delay)
  })
}

/* ─── Вариант 1: НАИВНЫЙ (без защиты) ─────────────────────── */
const searchNaive = createAsyncThunk<Post[], string>(
  'searchNaive',
  async (q) => fakeSearch(q),
)

interface NaiveState { query: string; results: Post[]; reqIds: { id: string; q: string; state: 'pending' | 'done' | 'stale' }[] }
const naiveSlice = createSlice({
  name: 'naive',
  initialState: { query: '', results: [], reqIds: [] } as NaiveState,
  reducers: {
    clear: () => ({ query: '', results: [], reqIds: [] }),
  },
  extraReducers: (b) => {
    b.addCase(searchNaive.pending, (s, a) => {
      s.query = a.meta.arg
      s.reqIds.push({ id: a.meta.requestId, q: a.meta.arg, state: 'pending' })
    })
    b.addCase(searchNaive.fulfilled, (s, a) => {
      // ← НИКАКОЙ проверки requestId — последний пришедший побеждает
      s.results = a.payload
      const r = s.reqIds.find(r => r.id === a.meta.requestId)
      if (r) r.state = 'done'
    })
  },
})

/* ─── Вариант 2: С ЗАЩИТОЙ currentRequestId ───────────────── */
const searchGuarded = createAsyncThunk<Post[], string>(
  'searchGuarded',
  async (q) => fakeSearch(q),
)

interface GuardedState {
  query: string
  results: Post[]
  currentRequestId: string | null
  reqIds: { id: string; q: string; state: 'pending' | 'done' | 'stale' }[]
}
const guardedSlice = createSlice({
  name: 'guarded',
  initialState: { query: '', results: [], currentRequestId: null, reqIds: [] } as GuardedState,
  reducers: {
    clear: () => ({ query: '', results: [], currentRequestId: null, reqIds: [] }),
  },
  extraReducers: (b) => {
    b.addCase(searchGuarded.pending, (s, a) => {
      s.query = a.meta.arg
      // помечаем предыдущие как stale
      s.reqIds.forEach(r => { if (r.state === 'pending') r.state = 'stale' })
      s.reqIds.push({ id: a.meta.requestId, q: a.meta.arg, state: 'pending' })
      s.currentRequestId = a.meta.requestId
    })
    b.addCase(searchGuarded.fulfilled, (s, a) => {
      if (a.meta.requestId !== s.currentRequestId) {
        // ← ключевая проверка: игнорируем устаревший fulfilled
        const r = s.reqIds.find(r => r.id === a.meta.requestId)
        if (r) r.state = 'stale'
        return
      }
      s.results = a.payload
      const r = s.reqIds.find(r => r.id === a.meta.requestId)
      if (r) r.state = 'done'
    })
    b.addCase(searchGuarded.rejected, (s, a) => {
      if (a.meta.requestId === s.currentRequestId) s.currentRequestId = null
    })
  },
})

const store = configureStore({
  reducer: {
    naive: naiveSlice.reducer,
    guarded: guardedSlice.reducer,
  },
})

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог race-condition')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// UI
const queryEl = document.getElementById('query') as HTMLInputElement
const naiveResult   = document.getElementById('naive-result')!
const guardedResult = document.getElementById('guarded-result')!
const naiveState    = document.getElementById('naive-state')!
const guardedState  = document.getElementById('guarded-state')!
const naiveReqs     = document.getElementById('naive-reqs')!
const guardedReqs   = document.getElementById('guarded-reqs')!

function renderResults(): void {
  const s = store.getState()
  naiveResult.innerHTML   = `<strong>query: ${s.naive.query || '—'}</strong><br>${s.naive.results.map(r => r.title).join('<br>') || '—'}`
  guardedResult.innerHTML = `<strong>query: ${s.guarded.query || '—'}</strong><br>${s.guarded.results.map(r => r.title).join('<br>') || '—'}`
  naiveState.textContent   = JSON.stringify(s.naive, null, 2)
  guardedState.textContent = JSON.stringify(s.guarded, null, 2)

  const reqHtml = (arr: NaiveState['reqIds'], currentId?: string | null) => arr.map(r => {
    const cls = r.state === 'stale' ? 'stale' : (r.id === currentId ? 'current' : '')
    return `<span class="rid ${cls}" title="${r.id}">${r.q || '∅'}·${r.id.slice(0, 6)}·${r.state}</span>`
  }).join(' ')

  naiveReqs.innerHTML   = reqHtml(s.naive.reqIds)
  guardedReqs.innerHTML = reqHtml(s.guarded.reqIds, s.guarded.currentRequestId)
}
renderResults()
store.subscribe(renderResults)

// Перехват dispatch — для лога и requestId
const origDispatch = store.dispatch
;(store as { dispatch: typeof origDispatch }).dispatch = ((a: unknown) => {
  const res = origDispatch(a as Parameters<typeof origDispatch>[0])
  if (typeof a !== 'function') {
    const action = a as { type?: string; meta?: { requestId?: string; arg?: string } }
    if (action.type) {
      con.action({ type: action.type })
      if (action.meta?.requestId) con.info(`  requestId=${action.meta.requestId.slice(0, 8)}…  arg="${action.meta.arg}"`)
    }
  }
  return res
}) as typeof origDispatch

queryEl.addEventListener('input', () => {
  const q = queryEl.value
  store.dispatch(searchNaive(q))
  store.dispatch(searchGuarded(q))
})

document.getElementById('clear-all')!.addEventListener('click', () => {
  store.dispatch(naiveSlice.actions.clear())
  store.dispatch(guardedSlice.actions.clear())
  queryEl.value = ''
})

document.getElementById('demo-race')!.addEventListener('click', async () => {
  store.dispatch(naiveSlice.actions.clear())
  store.dispatch(guardedSlice.actions.clear())
  queryEl.value = ''
  con.info('── Авто-демо: 3 запроса с интервалом 50ms ──')
  store.dispatch(searchNaive('a'));   store.dispatch(searchGuarded('a'))
  await new Promise(r => setTimeout(r, 50))
  store.dispatch(searchNaive('ab'));  store.dispatch(searchGuarded('ab'))
  await new Promise(r => setTimeout(r, 50))
  store.dispatch(searchNaive('abc')); store.dispatch(searchGuarded('abc'))
  con.warn('Теперь ждём, пока все 3 вернутся в хаотичном порядке…')
  setTimeout(() => {
    const s = store.getState()
    if (s.naive.query !== s.guarded.query || JSON.stringify(s.naive.results) !== JSON.stringify(s.guarded.results)) {
      con.success('✓ Левый и правый результаты РАЗНЫЕ — race condition сработал! Слева застрял старый ответ.')
    } else {
      con.info('← в этот раз порядок ответов совпал с порядком запросов. Попробуйте ещё раз.')
    }
  }, 2500)
})

con.log('Поиск: на каждый ввод — ДВА thunk-dispatch\'а (naive + guarded).')
con.log('Задержки случайные (400–1800ms) — ответы часто приходят в неправильном порядке.')
con.info('Левая колонка НЕ проверяет meta.requestId → падает жертвой «stale response»')
con.info('Правая колонка хранит currentRequestId и игнорирует устаревшие fulfilled.')
