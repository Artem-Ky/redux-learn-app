import {
  configureStore,
  createSlice,
  createSelector,
  combineReducers,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Types ─────────────────────────────────────────────────────────

interface User { id: string; name: string; active: boolean }
type UsersState = User[]

// ── Мемоизированный combiner с глобальным счётчиком ──────────────

let combinerCallsA = 0 // для slice.selectors
let combinerCallsB = 0 // для getSelectors(custom)

const activeCombinerA = (users: UsersState): User[] => {
  combinerCallsA += 1
  return users.filter((u) => u.active)
}

const activeCombinerB = (users: UsersState): User[] => {
  combinerCallsB += 1
  return users.filter((u) => u.active)
}

// ── Slice ────────────────────────────────────────────────────────

const seed = (): UsersState => [
  { id: nanoid(), name: 'Анна',    active: true  },
  { id: nanoid(), name: 'Борис',   active: false },
  { id: nanoid(), name: 'Вера',    active: true  },
  { id: nanoid(), name: 'Глеб',    active: true  },
  { id: nanoid(), name: 'Дарья',   active: false },
]

const usersSlice = createSlice({
  name: 'users',
  initialState: seed() as UsersState,
  reducers: {
    toggle: (state, a: PayloadAction<string>) => {
      const u = state.find((x) => x.id === a.payload)
      if (u) u.active = !u.active
    },
    add: (state, a: PayloadAction<string>) => {
      state.push({ id: nanoid(), name: a.payload, active: true })
    },
    reset: () => seed(),
  },
  selectors: {
    // Мемоизированный селектор ВНУТРИ slice.selectors.
    // Первый аргумент combiner'а — state slice, не root!
    selectActive: createSelector(
      [(state: UsersState) => state],
      activeCombinerA,
    ),
    selectCount: (state) => state.length,
    selectActiveCount: (state) => state.filter((u) => u.active).length,
  },
})

// ── Store ────────────────────────────────────────────────────────

// Кейс 1: привязка по reducerPath = 'users' (совпадает с name).
// Кейс 2: то же самое состояние ещё раз положим под state.admin.users — для getSelectors.
const adminReducer = combineReducers({ users: usersSlice.reducer })

const store = configureStore({
  reducer: {
    users: usersSlice.reducer, // кейс 1: slice.selectors работают
    admin: adminReducer,        // кейс 2: нужно getSelectors(s => s.admin.users)
  },
})

type RootState = ReturnType<typeof store.getState>

// Кейс 2: создаём отдельные селекторы с кастомным selectState.
// Для чистоты эксперимента создаём новый createSelector, чтобы демонстрировать combinerCallsB.
const adminUsersSelectors = {
  selectActive: createSelector(
    [(state: RootState) => state.admin.users],
    activeCombinerB,
  ),
}

// ── UI ────────────────────────────────────────────────────────────

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог slice.selectors + createSelector',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const userListEl = document.getElementById('user-list')!
const sc1Out = document.getElementById('sc1-out')!
const sc2Out = document.getElementById('sc2-out')!
const sc3Out = document.getElementById('sc3-out')!
const sc1Calls = document.getElementById('sc1-calls')!
const sc2Calls = document.getElementById('sc2-calls')!

function render(): void {
  const state = store.getState()
  userListEl.innerHTML = state.users
    .map(
      (u) => `<div class="user-row ${u.active ? 'active' : 'inactive'}">
        <span class="user-row__name">${u.name}</span>
        <span class="user-row__tag ${u.active ? 'active' : 'inactive'}">
          ${u.active ? 'ACTIVE' : 'inactive'}
        </span>
        <span style="color: var(--text-muted); font-size:.7rem;">#${u.id.slice(0, 4)}</span>
      </div>`,
    )
    .join('')
  sc1Calls.textContent = String(combinerCallsA)
  sc2Calls.textContent = String(combinerCallsB)
}
render()
store.subscribe(render)

// ── Actions ───────────────────────────────────────────────────────

document.querySelector('[data-act="toggle-random"]')!.addEventListener('click', () => {
  const users = store.getState().users
  if (users.length === 0) return
  const target = users[Math.floor(Math.random() * users.length)]
  const a = usersSlice.actions.toggle(target.id)
  store.dispatch(a)
  con.action(a)
})

const NAMES = ['Егор', 'Женя', 'Зина', 'Ирина', 'Костя', 'Лена']
let nameIdx = 0
document.querySelector('[data-act="add"]')!.addEventListener('click', () => {
  const name = NAMES[nameIdx++ % NAMES.length]
  const a = usersSlice.actions.add(name)
  store.dispatch(a)
  con.action(a)
})

document.querySelector('[data-act="reset"]')!.addEventListener('click', () => {
  const a = usersSlice.actions.reset()
  store.dispatch(a)
  con.action(a)
  combinerCallsA = 0
  combinerCallsB = 0
  render()
})

// ── Сценарии ──────────────────────────────────────────────────────

document.querySelector('[data-sc="1"]')!.addEventListener('click', () => {
  const state = store.getState()
  // slice.selectors.selectActive автопривязано через selectSlice → state.users
  const before = combinerCallsA
  const result = usersSlice.selectors.selectActive(state)
  const wasHit = combinerCallsA === before

  sc1Out.classList.remove('error')
  sc1Out.textContent = JSON.stringify(
    {
      mode: 'slice.selectors.selectActive(rootState)',
      reducerPath: usersSlice.reducerPath,
      selectState: `rootState.${usersSlice.reducerPath}`,
      cache: wasHit ? 'HIT (combiner не вызван)' : 'MISS (combiner пересчитал)',
      result,
    },
    null,
    2,
  )
  con.success(
    `Кейс 1: slice.selectors работает, привязка = state.${usersSlice.reducerPath}. ${
      wasHit ? 'Cache HIT.' : 'Cache MISS (данные менялись).'
    }`,
  )
  render()
})

document.querySelector('[data-sc="2"]')!.addEventListener('click', () => {
  const state = store.getState()
  const before = combinerCallsB
  const result = adminUsersSelectors.selectActive(state)
  const wasHit = combinerCallsB === before

  sc2Out.classList.remove('error')
  sc2Out.textContent = JSON.stringify(
    {
      mode: 'createSelector([s => s.admin.users], combiner)',
      selectState: 's => s.admin.users',
      cache: wasHit ? 'HIT' : 'MISS',
      result,
    },
    null,
    2,
  )
  con.success(
    `Кейс 2: getSelectors аналог — кастомный selectState = s.admin.users. ${
      wasHit ? 'HIT.' : 'MISS.'
    }`,
  )
  render()
})

document.querySelector('[data-sc="3"]')!.addEventListener('click', () => {
  // Сценарий: используем slice.getSelectors с путём, где state undefined.
  const brokenSelectors = usersSlice.getSelectors(
    (s: RootState) => (s as unknown as { wrongPath?: UsersState }).wrongPath as UsersState,
  )
  try {
    const state = store.getState()
    const result = brokenSelectors.selectActive(state)
    // До выброса ошибки (если prod) — покажем undefined
    sc3Out.classList.add('error')
    sc3Out.textContent = `⚠ dev режим должен был бросить ошибку, но вернул:\n${JSON.stringify(result)}`
  } catch (e) {
    sc3Out.classList.add('error')
    const err = e as Error
    sc3Out.textContent =
      `✖ Error thrown:\n\n${err.name}: ${err.message}\n\n` +
      `[source] createSlice.ts, функция selectSlice:\n` +
      `if (typeof sliceState === 'undefined') {\n` +
      `  if (process.env.NODE_ENV !== 'production') {\n` +
      `    throw new Error('selectSlice returned undefined for an uninjected slice reducer')\n` +
      `  }\n` +
      `}`
    con.error(`Кейс 3 — ${err.message}`)
    con.warn(
      'В production эта проверка выпиливается минификатором → selectState вернёт undefined → ' +
        'combiner упадёт позже на .filter(undefined).',
    )
    return
  }
})

con.log('slice.selectors — getter, возвращает результат getSelectors(selectSlice), кешированный по selectState.')
con.info('slice.getSelectors(fn) — возвращает ТОТ ЖЕ объект при повторном вызове с тем же fn (WeakMap кеш).')
con.success('Мемоизация создаётся только если сам селектор — createSelector. Инлайн-стрелка не мемоизируется.')
