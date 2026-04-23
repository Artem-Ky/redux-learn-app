import {
  configureStore,
  createSelector,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface User { id: number; name: string; role: 'admin' | 'user' }

const usersSlice = createSlice({
  name: 'users',
  initialState: [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' },
    { id: 3, name: 'Carol', role: 'admin' },
  ] as User[],
  reducers: {
    added: (s, a: PayloadAction<User>) => {
      s.push(a.payload)
    },
  },
})

const uiSlice = createSlice({
  name: 'ui',
  initialState: { clicks: 0 },
  reducers: {
    clicked: (s) => {
      s.clicks++
    },
  },
})

const store = configureStore({
  reducer: { users: usersSlice.reducer, ui: uiSlice.reducer },
})

type RootState = ReturnType<typeof store.getState>

// ── Наивный селектор — пересчитывает КАЖДЫЙ раз ──────────────
let naiveRuns = 0
let naiveLastRuns = 0
function selectAdminsNaive(s: RootState): string[] {
  naiveRuns++
  naiveLastRuns++
  return s.users.filter((u) => u.role === 'admin').map((u) => u.name)
}

// ── Memoized селектор — createSelector ───────────────────────
let memoRuns = 0
let memoLastRuns = 0
const selectAdminsMemo = createSelector(
  [(s: RootState) => s.users],
  (users) => {
    memoRuns++
    memoLastRuns++
    return users.filter((u) => u.role === 'admin').map((u) => u.name)
  },
)

// ── UI ───────────────────────────────────────────────────────
const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — memoization real-world',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

function updateUI(): void {
  document.getElementById('naive-runs')!.textContent = String(naiveRuns)
  document.getElementById('memo-runs')!.textContent = String(memoRuns)
  document.getElementById('naive-last')!.textContent = `+${naiveLastRuns}`
  document.getElementById('memo-last')!.textContent = `+${memoLastRuns}`
}
updateUI()

function batchRead(times: number): void {
  naiveLastRuns = 0
  memoLastRuns = 0
  const state = store.getState()
  for (let i = 0; i < times; i++) {
    selectAdminsNaive(state)
    selectAdminsMemo(state)
  }
  con.log(
    `${times} пар чтений: naive вычислил ${naiveLastRuns} раз, memo — ${memoLastRuns}. ` +
      `Cache hits у memo: ${times - memoLastRuns} / ${times}`,
  )
  updateUI()
}

document.getElementById('btn-add-user')!.addEventListener('click', () => {
  const id = store.getState().users.length + 1
  const role: 'admin' | 'user' = id % 2 === 0 ? 'user' : 'admin'
  store.dispatch(usersSlice.actions.added({ id, name: `User${id}`, role }))
  con.warn(
    `users изменился — memo-кэш инвалидируется на СЛЕДУЮЩЕМ чтении. Далее нажми «Прочитать x10».`,
  )
})

document.getElementById('btn-ui')!.addEventListener('click', () => {
  store.dispatch(uiSlice.actions.clicked())
  con.info(
    `ui.clicks изменился. state.users НЕ трогали — ссылка === та же. Memo должен остаться cache-hit.`,
  )
})

document.getElementById('btn-read')!.addEventListener('click', () => {
  batchRead(10)
})

document.getElementById('btn-reset')!.addEventListener('click', () => {
  naiveRuns = 0
  memoRuns = 0
  naiveLastRuns = 0
  memoLastRuns = 0
  updateUI()
  con.info('Счётчики обнулены.')
})

con.log('Сценарий: 1) Нажми ui/clicked — users не менялся. 2) Нажми «Прочитать x10». Увидишь: naive 10, memo 1.')
con.log('Сценарий 2: 1) users/added — ссылка изменилась. 2) Прочитать x10 → memo тоже 1 (пересчитал 1 раз и закэшировал).')
con.info('Вывод: createSelector обнуляет "лишний" счёт пересчётов при стабильных inputs.')
