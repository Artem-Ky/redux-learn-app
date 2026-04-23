import {
  configureStore,
  createAction,
  createAsyncThunk,
  createReducer,
  isAllOf,
  isAnyOf,
  isAsyncThunkAction,
  isFulfilled,
  isPending,
  isRejected,
  isRejectedWithValue,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── thunks ─────────────────────────────────────────────────────────

interface Fetched { id: number; source: 'A' | 'B'; userId: number }

const fetchA = createAsyncThunk<
  Fetched,
  { ok: boolean; throwOrReject?: 'throw' | 'reject' },
  { rejectValue: { reason: string; code: string } }
>(
  'matchers/fetchA',
  async ({ ok, throwOrReject }, { rejectWithValue }) => {
    await new Promise((r) => setTimeout(r, 250))
    if (!ok) {
      if (throwOrReject === 'reject') {
        return rejectWithValue({ reason: 'A rejected with value', code: 'A_REJ' })
      }
      throw new Error('A: network down')
    }
    return { id: 1, source: 'A' as const, userId: 42 }
  },
)

const fetchB = createAsyncThunk<Fetched, void>(
  'matchers/fetchB',
  async () => {
    await new Promise((r) => setTimeout(r, 180))
    return { id: 2, source: 'B' as const, userId: 7 }
  },
)

// Plain action creators
const inc = createAction('matchers/inc')
const dec = createAction('matchers/dec')
const reset = createAction('matchers/reset')

// ── state ──────────────────────────────────────────────────────────
interface S {
  loading: boolean
  lastError: string | null
  fulfilledCount: number
  incDecCounter: number
  thunkActions: number
  hits: {
    isPending: number
    isFulfilled: number
    isRejected: number
    isRejectedWithValue: number
    isAsyncThunkAction: number
    isAnyOf: number
    isAllOf: number
  }
}
const initial: S = {
  loading: false,
  lastError: null,
  fulfilledCount: 0,
  incDecCounter: 0,
  thunkActions: 0,
  hits: {
    isPending: 0,
    isFulfilled: 0,
    isRejected: 0,
    isRejectedWithValue: 0,
    isAsyncThunkAction: 0,
    isAnyOf: 0,
    isAllOf: 0,
  },
}

// ── Reducer через createReducer (builder с addMatcher в явном виде) ──
const reducer = createReducer<S>(initial, (builder) => {
  builder
    // Конкретные plain actions
    .addCase(inc, (s) => { s.incDecCounter += 1 })
    .addCase(dec, (s) => { s.incDecCounter -= 1 })
    .addCase(reset, () => initial)
    // 1) glob loading
    .addMatcher(isPending(fetchA, fetchB), (s) => {
      s.loading = true
      s.lastError = null
      s.hits.isPending += 1
    })
    // 2) glob success counter
    .addMatcher(isFulfilled(fetchA, fetchB), (s) => {
      s.loading = false
      s.fulfilledCount += 1
      s.hits.isFulfilled += 1
    })
    // 3) glob error — ловит и throw, и rejectWithValue
    .addMatcher(isRejected(fetchA, fetchB), (s, action) => {
      s.loading = false
      const payload = action.payload as { reason?: string } | undefined
      s.lastError = payload?.reason ?? action.error.message ?? 'unknown'
      s.hits.isRejected += 1
    })
    // 4) только rejectWithValue (action.meta.rejectedWithValue === true)
    .addMatcher(isRejectedWithValue(fetchA, fetchB), (s) => {
      s.hits.isRejectedWithValue += 1
    })
    // 5) любой thunk-action (pending|fulfilled|rejected)
    .addMatcher(isAsyncThunkAction(fetchA, fetchB), (s) => {
      s.thunkActions += 1
      s.hits.isAsyncThunkAction += 1
    })
    // 6) any of plain actions
    .addMatcher(isAnyOf(inc, dec), (s) => {
      s.hits.isAnyOf += 1
    })
    // 7) isAllOf — пример ортогональных предикатов:
    //    успешный thunk + payload.userId присутствует.
    //    fetchA (userId:42) и fetchB (userId:7) оба подойдут.
    .addMatcher(
      isAllOf(
        isFulfilled(fetchA, fetchB),
        (a: unknown): a is PayloadAction<Fetched> =>
          !!a && typeof a === 'object' && 'payload' in a &&
          !!(a as { payload?: { userId?: number } }).payload?.userId,
      ),
      (s) => {
        s.hits.isAllOf += 1
      },
    )
})

const store = configureStore({ reducer: { matchers: reducer } })

// ── DOM ────────────────────────────────────────────────────────────
const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог matchers sweep')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const statusBar = {
  loading: document.getElementById('p-loading')!,
  err: document.getElementById('p-err')!,
  ok: document.getElementById('p-ok')!,
  cnt: document.getElementById('p-cnt')!,
  thunk: document.getElementById('p-thunk')!,
}

const hitEls: Record<keyof S['hits'], HTMLElement> = {
  isPending: document.getElementById('h-isPending')!,
  isFulfilled: document.getElementById('h-isFulfilled')!,
  isRejected: document.getElementById('h-isRejected')!,
  isRejectedWithValue: document.getElementById('h-isRejectedWithValue')!,
  isAsyncThunkAction: document.getElementById('h-isAsyncThunkAction')!,
  isAnyOf: document.getElementById('h-isAnyOf')!,
  isAllOf: document.getElementById('h-isAllOf')!,
}

function render(): void {
  const s = store.getState().matchers
  statusBar.loading.textContent = `loading: ${s.loading}`
  statusBar.loading.classList.toggle('loading', s.loading)
  statusBar.err.textContent = `lastError: ${s.lastError ?? '—'}`
  statusBar.err.classList.toggle('err', !!s.lastError)
  statusBar.ok.textContent = `fulfilled total: ${s.fulfilledCount}`
  statusBar.ok.classList.toggle('ok', s.fulfilledCount > 0)
  statusBar.cnt.textContent = `inc/dec counter: ${s.incDecCounter}`
  statusBar.thunk.textContent = `thunk actions total: ${s.thunkActions}`

  ;(Object.keys(hitEls) as Array<keyof S['hits']>).forEach((k) => {
    hitEls[k].textContent = String(s.hits[k])
  })
}
render()
store.subscribe(render)

// Подсветим карточку matcher'а при каждом попадании — сравним снапшоты
let prevSnapshot: S['hits'] = structuredClone(initial.hits)
store.subscribe(() => {
  const next = store.getState().matchers.hits
  ;(Object.keys(next) as Array<keyof S['hits']>).forEach((k) => {
    if (next[k] !== prevSnapshot[k]) {
      const card = document.querySelector(`.hit-card[data-m="${k}"]`)
      if (card) {
        card.classList.add('flash')
        setTimeout(() => card.classList.remove('flash'), 300)
      }
    }
  })
  prevSnapshot = structuredClone(next)
})

// ── buttons ────────────────────────────────────────────────────────

document.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const act = btn.getAttribute('data-act')!
    switch (act) {
      case 'fetchA-ok':
        con.info('→ fetchA (ok)')
        void store.dispatch(fetchA({ ok: true }))
        break
      case 'fetchA-fail':
        con.warn('→ fetchA — throw new Error (rejected без value)')
        void store.dispatch(fetchA({ ok: false, throwOrReject: 'throw' }))
        break
      case 'fetchA-reject':
        con.warn('→ fetchA — rejectWithValue (rejected с value и флагом)')
        void store.dispatch(fetchA({ ok: false, throwOrReject: 'reject' }))
        break
      case 'fetchB-ok':
        con.info('→ fetchB (ok)')
        void store.dispatch(fetchB())
        break
      case 'inc':
        store.dispatch(inc())
        con.action(inc())
        break
      case 'dec':
        store.dispatch(dec())
        con.action(dec())
        break
      case 'reset':
        store.dispatch(reset())
        con.success('reset')
        break
    }
  })
})

con.log('Нажми Fetch A (ok) — сработают isPending → isFulfilled → isAsyncThunkAction → isAllOf (userId=42)')
con.log('Fetch A (throw) — isPending → isRejected → isAsyncThunkAction. isRejectedWithValue пропустит.')
con.log('Fetch A (rejectWithValue) — isPending → isRejected → isRejectedWithValue → isAsyncThunkAction.')
con.log('inc / dec — isAnyOf(inc, dec) сработает, ни один thunk-matcher не тронется.')
con.info('isAllOf = isFulfilled() + payload.userId. fetchB тоже fulfilled, у него userId=7 → тоже +1.')
