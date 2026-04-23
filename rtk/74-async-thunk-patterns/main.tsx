import {
  configureStore,
  createAsyncThunk,
  createSlice,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Универсальный fake-fetch thunk с настраиваемой задержкой/исходом ─

interface FakeArg { id: number; ms: number; fail?: boolean; label?: string }
interface FakeResult { id: number; label: string; ms: number }

const fakeFetch = createAsyncThunk<FakeResult, FakeArg>(
  'demo/fakeFetch',
  async ({ id, ms, fail, label }, { signal }) => {
    // Abort-aware sleep
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, ms)
      signal.addEventListener('abort', () => {
        clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      })
    })
    if (fail) throw new Error(`fakeFetch#${id} failed after ${ms}ms`)
    return { id, label: label ?? `item#${id}`, ms }
  },
)

// ── slice — просто для DevTools лог (никакой логики) ─────────────

const slice = createSlice({
  name: 'log',
  initialState: { lastMode: '' as string, history: [] as string[], lastFetchedId: 0 },
  reducers: {
    modeStart: (s, a: { type: string; payload: string }) => {
      s.lastMode = a.payload
      s.history.push(a.payload)
    },
  },
  // Подключаем thunk к slice — иначе TS не выведет ThunkDispatch в store.dispatch.
  extraReducers: (b) => {
    b.addCase(fakeFetch.fulfilled, (s, a) => {
      s.lastFetchedId = a.payload.id
    })
  },
})
const { modeStart } = slice.actions
const store = configureStore({ reducer: { log: slice.reducer } })

// ── DOM ────────────────────────────────────────────────────────────
const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог thunk patterns')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const timers = {
  seq: document.getElementById('t-seq')!,
  par: document.getElementById('t-par')!,
  race: document.getElementById('t-race')!,
  allset: document.getElementById('t-allset')!,
}
const taskLists = {
  seq: document.getElementById('tasks-seq')!,
  par: document.getElementById('tasks-par')!,
  race: document.getElementById('tasks-race')!,
  allset: document.getElementById('tasks-allset')!,
}
const lastResult = document.getElementById('last-result')!

type Mode = 'seq' | 'par' | 'race' | 'allset'
type Status = 'pending' | 'fulfilled' | 'rejected' | 'zombie'

// ── UI helpers ─────────────────────────────────────────────────────

function resetMode(mode: Mode): void {
  taskLists[mode].innerHTML = ''
  timers[mode].textContent = '—'
  timers[mode].className = 'mode-card__timer'
}

function addTask(mode: Mode, id: string, label: string): HTMLElement {
  const row = document.createElement('div')
  row.className = 'task task--pending'
  row.dataset.taskId = id
  row.innerHTML = `
    <span class="task__dot"></span>
    <span class="task__label">${label}</span>
    <span class="task__time" data-role="time">…</span>
  `
  taskLists[mode].appendChild(row)
  return row
}

function updateTask(mode: Mode, id: string, status: Status, note: string): void {
  const row = taskLists[mode].querySelector<HTMLElement>(`[data-task-id="${id}"]`)
  if (!row) return
  row.classList.remove('task--pending', 'task--fulfilled', 'task--rejected', 'task--zombie')
  row.classList.add(`task--${status}`)
  const timeEl = row.querySelector<HTMLElement>('[data-role="time"]')
  if (timeEl) timeEl.textContent = note
}

function startTimer(mode: Mode): () => void {
  const start = performance.now()
  timers[mode].classList.add('running')
  timers[mode].classList.remove('done')
  const iv = setInterval(() => {
    timers[mode].textContent = `${Math.round(performance.now() - start)} ms`
  }, 16)
  return () => {
    clearInterval(iv)
    const elapsed = Math.round(performance.now() - start)
    timers[mode].textContent = `${elapsed} ms`
    timers[mode].classList.remove('running')
    timers[mode].classList.add('done')
  }
}

// Тип «промиса, возвращённого dispatch(thunk())». У него есть .unwrap, .abort, .requestId.
// Прямо описываем нужный shape, чтобы не бороться с перегрузками ThunkDispatch.
interface DispatchedThunkPromise extends Promise<unknown> {
  unwrap(): Promise<FakeResult>
  abort(reason?: string): void
  requestId: string
}

async function trackPromise(
  mode: Mode,
  id: string,
  promise: DispatchedThunkPromise,
  onEnd?: (outcome: 'fulfilled' | 'rejected', note: string) => void,
): Promise<FakeResult | null> {
  const startedAt = performance.now()
  try {
    const result = await promise.unwrap()
    const dur = Math.round(performance.now() - startedAt)
    updateTask(mode, id, 'fulfilled', `ok · ${dur}ms`)
    onEnd?.('fulfilled', `${dur}ms`)
    return result
  } catch (e) {
    const dur = Math.round(performance.now() - startedAt)
    const msg = (e as Error)?.message ?? String(e)
    updateTask(mode, id, 'rejected', `err · ${dur}ms · ${msg}`)
    onEnd?.('rejected', msg)
    throw e
  }
}

// Helper: dispatch + narrow type for tracking
function dispatchFake(arg: FakeArg): DispatchedThunkPromise {
  return store.dispatch(fakeFetch(arg)) as unknown as DispatchedThunkPromise
}

// ── Режимы ─────────────────────────────────────────────────────────

async function runSequential(): Promise<void> {
  store.dispatch(modeStart('sequential'))
  resetMode('seq')
  const stop = startTimer('seq')
  con.info('Sequential: fetchUser(300) → fetchPosts(350)')
  addTask('seq', 's1', 'fetchUser (300ms)')
  addTask('seq', 's2', 'fetchPosts (350ms)')
  try {
    const user = await trackPromise('seq', 's1', dispatchFake({ id: 1, ms: 300, label: 'user' }))
    con.success(`step 1 done: ${JSON.stringify(user)}`)
    const posts = await trackPromise('seq', 's2', dispatchFake({ id: 2, ms: 350, label: 'posts' }))
    con.success(`step 2 done: ${JSON.stringify(posts)}`)
    lastResult.textContent = `Sequential OK · ${JSON.stringify({ user, posts })}`
  } catch (e) {
    con.error(`sequential aborted: ${(e as Error).message}`)
    lastResult.textContent = `Sequential FAIL · ${(e as Error).message}`
  } finally {
    stop()
  }
}

async function runParallel(): Promise<void> {
  store.dispatch(modeStart('parallel'))
  resetMode('par')
  const stop = startTimer('par')
  con.info('Parallel: Promise.all([A(200), B(350), C(250)])')
  addTask('par', 'p1', 'fetchA (200ms)')
  addTask('par', 'p2', 'fetchB (350ms)')
  addTask('par', 'p3', 'fetchC (250ms)')
  try {
    const results = await Promise.all([
      trackPromise('par', 'p1', dispatchFake({ id: 1, ms: 200, label: 'A' })),
      trackPromise('par', 'p2', dispatchFake({ id: 2, ms: 350, label: 'B' })),
      trackPromise('par', 'p3', dispatchFake({ id: 3, ms: 250, label: 'C' })),
    ])
    con.success(`parallel done: ${JSON.stringify(results)}`)
    lastResult.textContent = `Parallel OK (≈ max) · ${JSON.stringify(results.map((r) => r?.label))}`
  } catch (e) {
    con.error(`parallel failed: ${(e as Error).message}`)
    lastResult.textContent = `Parallel FAIL · ${(e as Error).message}`
  } finally {
    stop()
  }
}

async function runRace(): Promise<void> {
  store.dispatch(modeStart('race'))
  resetMode('race')
  const stop = startTimer('race')
  con.info('Race: fast (150ms) vs slow (500ms) — зомби покажет, что медленный идёт в фоне')
  addTask('race', 'fast', 'fastFetch (150ms)')
  addTask('race', 'slow', 'slowFetch (500ms) — медленный')

  const fastAction = dispatchFake({ id: 1, ms: 150, label: 'fast' })
  const slowAction = dispatchFake({ id: 2, ms: 500, label: 'slow' })

  // Параллельно отслеживаем — для UI
  const fastTracked = trackPromise('race', 'fast', fastAction)
  const slowTracked = trackPromise('race', 'slow', slowAction).catch(() => null)

  try {
    const winner = await Promise.race([fastTracked, slowTracked])
    con.success(`race winner: ${JSON.stringify(winner)}`)
    lastResult.textContent = `Race winner · ${JSON.stringify(winner)}`
    // Но медленный ещё идёт! Помечаем как zombie
    if (winner && winner.label === 'fast') {
      updateTask('race', 'slow', 'zombie', 'ещё работает в фоне…')
      con.warn('Медленный thunk НЕ отменён — он продолжает делать запрос и диспатчит fulfilled.')
      con.warn('В реальном коде здесь нужно slowAction.abort() — см. урок 60.')
      // Дождёмся финала медленного, чтобы обновить UI
      slowTracked.then(() => {
        con.log('медленный thunk всё-таки завершился (фантомный dispatch прошёл)')
      })
    }
  } catch (e) {
    con.error(`race failed: ${(e as Error).message}`)
    lastResult.textContent = `Race FAIL · ${(e as Error).message}`
  } finally {
    stop()
  }
}

async function runAllSettled(): Promise<void> {
  store.dispatch(modeStart('allSettled'))
  resetMode('allset')
  const stop = startTimer('allset')
  con.info('AllSettled: A(ok 200) · B(ok 350) · FAIL(250)')
  addTask('allset', 'a', 'fetchA (200ms, ok)')
  addTask('allset', 'b', 'fetchB (350ms, ok)')
  addTask('allset', 'fail', 'failingFetch (250ms, THROW)')

  const results = await Promise.allSettled([
    trackPromise('allset', 'a', dispatchFake({ id: 1, ms: 200, label: 'A' })),
    trackPromise('allset', 'b', dispatchFake({ id: 2, ms: 350, label: 'B' })),
    trackPromise('allset', 'fail', dispatchFake({ id: 3, ms: 250, label: 'FAIL', fail: true })),
  ])

  const summary = results.map((r, i) =>
    r.status === 'fulfilled'
      ? `#${i}: ok → ${r.value?.label}`
      : `#${i}: fail → ${(r.reason as Error)?.message}`,
  )
  con.log(`allSettled summary: ${summary.join(' · ')}`)
  lastResult.textContent = `AllSettled · ${summary.join(' · ')}`
  stop()
}

// ── Wire buttons ───────────────────────────────────────────────────

document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const mode = btn.getAttribute('data-mode') as Mode
    if (mode === 'seq') void runSequential()
    if (mode === 'par') void runParallel()
    if (mode === 'race') void runRace()
    if (mode === 'allset') void runAllSettled()
  })
})

con.log('Нажми кнопку в любой карточке. Смотри таймер и статус каждой задачи.')
con.log('Sequential — сумма. Parallel — max. Race — min (+ zombie). AllSettled — max, сводка.')
con.info('В race обрати внимание: медленный продолжает идти даже после объявления winner\'а.')
