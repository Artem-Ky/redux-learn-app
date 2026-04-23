import {
  configureStore,
  createSlice,
  createSelector,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit'
import {
  Provider,
  useDispatch,
  useSelector,
  useStore,
} from 'react-redux'
import { useMemo, StrictMode, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ─────────────────────────────────────────────────────────────────
// store.ts  (в реальном проекте — отдельный файл)
// ─────────────────────────────────────────────────────────────────

interface User { id: string; name: string; active: boolean }
type UsersState = User[]

const seed = (): UsersState => [
  { id: nanoid(), name: 'Анна',   active: true  },
  { id: nanoid(), name: 'Борис',  active: false },
  { id: nanoid(), name: 'Вера',   active: true  },
  { id: nanoid(), name: 'Глеб',   active: true  },
  { id: nanoid(), name: 'Дарья',  active: false },
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
    selectAll: (state) => state,
    selectActive: createSelector(
      [(state: UsersState) => state],
      (users) => users.filter((u) => u.active),
    ),
    selectCount: (state) => state.length,
    selectActiveCount: (state) => state.filter((u) => u.active).length,
  },
})

const store = configureStore({
  reducer: { users: usersSlice.reducer },
})

type RootState = ReturnType<typeof store.getState>
type AppDispatch = typeof store.dispatch
type AppStore = typeof store

// ─────────────────────────────────────────────────────────────────
// hooks.ts
// ─────────────────────────────────────────────────────────────────

const useAppDispatch = useDispatch.withTypes<AppDispatch>()
const useAppSelector = useSelector.withTypes<RootState>()
const useAppStore = useStore.withTypes<AppStore>()

// Типизированный createSelector (опционально, для сценариев вне slice):
const createAppSelector = createSelector.withTypes<RootState>()

// Пример типизированного селектора: считаем активных + общее.
const selectSummary = createAppSelector(
  [(s) => s.users],
  (users) => ({
    total: users.length,
    active: users.filter((u) => u.active).length,
  }),
)

// ─────────────────────────────────────────────────────────────────
// React UI
// ─────────────────────────────────────────────────────────────────

function UsersView(): ReactElement {
  // ← типизировано через .withTypes, RootState выведен автоматически.
  const users = useAppSelector(usersSlice.selectors.selectAll)
  const active = useAppSelector(usersSlice.selectors.selectActive)
  const summary = useAppSelector(selectSummary)

  // Стабилизируем список активных (чтобы useMemo не пересоздавал jsx без нужды).
  const activeIds = useMemo(() => active.map((u) => u.id), [active])

  return (
    <div>
      <div className="wrap-grid">
        <div className="wrap-card">
          <h5>selectAll (slice.selectors)</h5>
          <div>length: <span className="val">{users.length}</span></div>
          <div>ref #: <span className="val">{(users as unknown as { __id?: number }).__id ?? 'n/a'}</span></div>
        </div>
        <div className="wrap-card">
          <h5>selectActive (memoized)</h5>
          <div>active.length: <span className="val">{active.length}</span></div>
          <div>ids: <span className="val" style={{ fontSize: '.7rem' }}>
            {activeIds.map((id) => id.slice(0, 4)).join(', ') || '(нет)'}
          </span></div>
        </div>
        <div className="wrap-card">
          <h5>selectSummary (createAppSelector)</h5>
          <div>total: <span className="val">{summary.total}</span></div>
          <div>active: <span className="val">{summary.active}</span></div>
        </div>
      </div>

      <table className="users-table">
        <thead>
          <tr><th>ID</th><th>Имя</th><th style={{ width: 90 }}>Статус</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={u.active ? 'active' : 'inactive'}>
              <td style={{ color: 'var(--text-muted)' }}>#{u.id.slice(0, 4)}</td>
              <td>{u.name}</td>
              <td className={u.active ? 'badge-active' : 'badge-inactive'}>
                {u.active ? '● active' : '○ inactive'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function App(): ReactElement {
  // useAppStore — тоже типизирован, даёт доступ к getState/dispatch с AppDispatch.
  const appStore = useAppStore()
  const appDispatch = useAppDispatch()

  // Демонстрируем, что .getState() возвращает RootState:
  void appStore.getState().users

  // Демонстрируем, что dispatch принимает actions:
  void appDispatch

  return <UsersView />
}

// Монтируем React в блок.
const reactRoot = document.getElementById('react-root')!
createRoot(reactRoot).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)

// ─────────────────────────────────────────────────────────────────
// File-tabs (показываем исходники трёх файлов)
// ─────────────────────────────────────────────────────────────────

const fileContents: Record<string, string> = {
  store: `// store.ts
import { configureStore } from '@reduxjs/toolkit'
import { usersSlice } from './features/users/usersSlice'

export const store = configureStore({
  reducer: { users: usersSlice.reducer },
})

// Основные 3 типа, на которых держится всё приложение:
export type RootState   = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type AppStore    = typeof store
`,

  hooks: `// hooks.ts
import { useDispatch, useSelector, useStore } from 'react-redux'
import { createSelector } from '@reduxjs/toolkit'
import type { RootState, AppDispatch, AppStore } from './store'

// Pre-typed хуки — identity functions в runtime, типизированы в TS.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
export const useAppStore    = useStore.withTypes<AppStore>()

// Типизированный createSelector — RootState выведен автоматически
// для input-selector'ов, которые работают от root state.
export const createAppSelector = createSelector.withTypes<RootState>()
`,

  slice: `// features/users/usersSlice.ts
import { createSlice, createSelector, nanoid, type PayloadAction } from '@reduxjs/toolkit'

export interface User { id: string; name: string; active: boolean }

export const usersSlice = createSlice({
  name: 'users',
  initialState: [] as User[],
  reducers: {
    toggle: (state, a: PayloadAction<string>) => {
      const u = state.find((x) => x.id === a.payload)
      if (u) u.active = !u.active
    },
    add: (state, a: PayloadAction<string>) => {
      state.push({ id: nanoid(), name: a.payload, active: true })
    },
  },
  selectors: {
    selectAll: (state) => state,
    // Первым аргументом combiner'а — slice state (User[]).
    selectActive: createSelector(
      [(state: User[]) => state],
      (users) => users.filter((u) => u.active),
    ),
    selectCount: (state) => state.length,
  },
})
`,

  app: `// App.tsx
import { useAppSelector, useAppDispatch } from './app/hooks'
import { usersSlice } from './features/users/usersSlice'

export function UsersView() {
  // Никакого :RootState! TS выводит сам.
  const users  = useAppSelector(usersSlice.selectors.selectAll)
  const active = useAppSelector(usersSlice.selectors.selectActive)

  const dispatch = useAppDispatch()

  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>
          {u.name} — {u.active ? 'active' : 'inactive'}
          <button onClick={() => dispatch(usersSlice.actions.toggle(u.id))}>
            toggle
          </button>
        </li>
      ))}
      <p>Активных: {active.length} / {users.length}</p>
    </ul>
  )
}
`,
}

let currentFile = 'store'
const fileContentEl = document.getElementById('file-content')!
const fileTabsEl = document.querySelector('.file-tabs')!

function highlightSimple(src: string): string {
  // Одна проходка: tokenizer → escape → span. Без каскадных .replace —
  // иначе последующие regex ловят "color: var(...)" и var( внутри уже
  // сгенерированных <span style="..."> и ломают HTML.
  const escape = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const token =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|\b(import|from|export|const|let|function|interface|type|return|if|else|for|new|typeof|as)\b|\b(RootState|AppDispatch|AppStore|User|UsersState|PayloadAction|ReturnType|State)\b|\b([A-Za-z_$][A-Za-z0-9_$]*)(?=\()/g

  let out = ''
  let last = 0
  for (const m of src.matchAll(token)) {
    const [full, cm, str, kw, ty, fn] = m
    const idx = m.index!
    out += escape(src.slice(last, idx))
    if (cm) out += `<span style="color: var(--accent-green)">${escape(cm)}</span>`
    else if (str) out += `<span style="color: var(--accent-orange)">${escape(str)}</span>`
    else if (kw) out += `<span style="color: var(--accent-purple)">${escape(kw)}</span>`
    else if (ty) out += `<span style="color: var(--accent-cyan)">${escape(ty)}</span>`
    else if (fn) out += `<span style="color: var(--accent-yellow)">${escape(fn)}</span>`
    last = idx + full.length
  }
  out += escape(src.slice(last))
  return out
}

function renderFile(): void {
  fileContentEl.innerHTML = highlightSimple(fileContents[currentFile])
}

fileTabsEl.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.file-tab')
  if (!btn) return
  currentFile = btn.dataset.file as string
  fileTabsEl.querySelectorAll('.file-tab').forEach((b) => b.classList.remove('active'))
  btn.classList.add('active')
  renderFile()
})
renderFile()

// ─────────────────────────────────────────────────────────────────
// DevTools + Console
// ─────────────────────────────────────────────────────────────────

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог типизации',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ─────────────────────────────────────────────────────────────────
// Buttons
// ─────────────────────────────────────────────────────────────────

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
  const a = usersSlice.actions.add(NAMES[nameIdx++ % NAMES.length])
  store.dispatch(a)
  con.action(a)
})

document.querySelector('[data-act="reset"]')!.addEventListener('click', () => {
  const a = usersSlice.actions.reset()
  store.dispatch(a)
  con.action(a)
})

const tsErrorBox = document.getElementById('ts-error-box')!
document.querySelector('[data-act="ts-error"]')!.addEventListener('click', () => {
  tsErrorBox.style.display = 'block'
  tsErrorBox.innerHTML = `
    <div class="ts-error">
<span class="file-line">App.tsx:7:30</span> - error TS2339: Property <strong>'wrongPath'</strong> does not exist on type 'RootState'.

  7 const data = useAppSelector((s) =&gt; s.<span class="squiggly">wrongPath</span>)
                                        <span class="squiggly">~~~~~~~~~</span>

<span style="color: var(--text-secondary)">Почему: useAppSelector = useSelector.withTypes&lt;RootState&gt;() — параметр <strong>s</strong>
точно типизирован как RootState = { users: UsersState }. TS знает что там нет <code>wrongPath</code>.

<span style="color: var(--success)">Исправить можно двумя способами:</span>
  1. Использовать существующий ключ: <code>s.users</code>
  2. Добавить reducer в configureStore: <code>reducer: { users, wrongPath: wrongReducer }</code>
</span></div>

    <div class="ts-error" style="border-color: var(--warning); color: var(--warning); background: #1a1407;">
<span class="file-line">App.tsx:12:3</span> - error TS2345: Argument of type '() =&gt; ThunkAction&lt;...&gt;' is not assignable to parameter of type 'UnknownAction'.

  12 dispatch(<span class="squiggly">fetchUsers()</span>)
              <span class="squiggly">~~~~~~~~~~~~</span>

<span style="color: var(--text-secondary)">Почему: если вы взяли <code>dispatch = useDispatch()</code> <strong>без</strong> <code>.withTypes&lt;AppDispatch&gt;</code>,
то TS видит только базовый <code>Dispatch&lt;UnknownAction&gt;</code>, который не принимает thunks.

<span style="color: var(--success)">Исправить:</span> <code>const dispatch = useAppDispatch()</code> (из hooks.ts).
</span></div>
  `
  con.warn('Показаны ДВЕ типичные ошибки TS — они не ломают dev-server, но видны в IDE / tsc.')
  con.info('Реальная ошибка №1 ловится TS благодаря withTypes<RootState>.')
  con.info('Реальная ошибка №2 ловится благодаря withTypes<AppDispatch> (ThunkDispatch-совместимость).')
})

con.log('Runtime: useAppSelector === useSelector (identity function).')
con.info('AppDispatch = ThunkDispatch<RootState, undefined, UnknownAction> & Dispatch<UnknownAction>.')
con.info('createAppSelector = createSelector.withTypes<RootState>() — input-selector'+'ы автоматически типизированы.')
con.success('Вся типобезопасность — compile-time. В production bundle нет ни байта доп. кода от withTypes.')
