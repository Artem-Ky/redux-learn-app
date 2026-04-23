import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface User { id: number; name: string }

const usersSlice = createSlice({
  name: 'users',
  initialState: [{ id: 1, name: 'Alice' }] as User[],
  reducers: {
    added: (s, a: PayloadAction<User>) => {
      s.push(a.payload)
    },
    noop: () => {
      // Immer увидит, что draft не менялся → вернёт оригинальный state
    },
  },
})

const todosSlice = createSlice({
  name: 'todos',
  initialState: [{ id: 1, done: false, text: 'Read docs' }],
  reducers: {
    toggled: (s, a: PayloadAction<number>) => {
      const t = s.find((x) => x.id === a.payload)
      if (t) t.done = !t.done
    },
  },
})

const uiSlice = createSlice({
  name: 'ui',
  initialState: { theme: 'dark' as 'dark' | 'light' },
  reducers: {
    themeChanged: (s) => {
      s.theme = s.theme === 'dark' ? 'light' : 'dark'
    },
  },
})

const store = configureStore({
  reducer: {
    users: usersSlice.reducer,
    todos: todosSlice.reducer,
    ui: uiSlice.reducer,
  },
})

type RootState = ReturnType<typeof store.getState>

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — structural sharing, === и рендеры',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── Simulate React useSelector re-runs ───────────────────────
const trackers = {
  users: { ref: store.getState().users, version: 1, renders: 0 },
  todos: { ref: store.getState().todos, version: 1, renders: 0 },
  ui: { ref: store.getState().ui, version: 1, renders: 0 },
}

function selectSlice<K extends keyof RootState>(key: K): void {
  const current = store.getState()[key]
  const t = trackers[key]
  if (t.ref !== current) {
    t.ref = current
    t.version++
    t.renders++
    setBadge(key, 'new')
    con.warn(`${key}: ref изменилась (ref#${t.version}) → useSelector вернёт новое значение → компонент ререндерит`)
  } else {
    setBadge(key, 'same')
  }
}

function setBadge(key: keyof RootState, kind: 'same' | 'new'): void {
  const card = document.getElementById(`card-${key}`)!
  const bd = document.getElementById(`bd-${key}`)!
  card.classList.remove('changed', 'unchanged')
  bd.classList.remove('badge--same', 'badge--new')
  if (kind === 'same') {
    card.classList.add('unchanged')
    bd.classList.add('badge--same')
    bd.textContent = 'same'
  } else {
    card.classList.add('changed')
    bd.classList.add('badge--new')
    bd.textContent = 'new'
  }
}

function render(): void {
  for (const k of ['users', 'todos', 'ui'] as const) {
    document.getElementById(`ref-${k}`)!.textContent = String(trackers[k].version)
    document.getElementById(`r-${k}`)!.textContent = String(trackers[k].renders)
  }
}

store.subscribe(() => {
  selectSlice('users')
  selectSlice('todos')
  selectSlice('ui')
  render()
})

// Initial render
render()

// ── Buttons ──────────────────────────────────────────────────
document.getElementById('btn-users')!.addEventListener('click', () => {
  const id = store.getState().users.length + 1
  con.log(`>>> dispatch(users/added) — должна измениться ТОЛЬКО users`)
  store.dispatch(usersSlice.actions.added({ id, name: `User ${id}` }))
})

document.getElementById('btn-todos')!.addEventListener('click', () => {
  con.log(`>>> dispatch(todos/toggled) — должна измениться ТОЛЬКО todos`)
  store.dispatch(todosSlice.actions.toggled(1))
})

document.getElementById('btn-ui')!.addEventListener('click', () => {
  con.log(`>>> dispatch(ui/themeChanged) — должна измениться ТОЛЬКО ui`)
  store.dispatch(uiSlice.actions.themeChanged())
})

document.getElementById('btn-noop')!.addEventListener('click', () => {
  con.log(`>>> dispatch(users/noop) — reducer не трогает draft. Ожидаем: НИ ОДНА ссылка не изменится.`)
  const beforeUsers = store.getState().users
  store.dispatch(usersSlice.actions.noop())
  const afterUsers = store.getState().users
  if (beforeUsers === afterUsers) {
    con.success(
      `Immer вернул тот же объект users (${beforeUsers === afterUsers}). useSelector не ререндерит.`,
    )
  } else {
    con.error(`Неожиданно: ссылка users изменилась`)
  }
})

document.getElementById('btn-reset')!.addEventListener('click', () => {
  for (const k of ['users', 'todos', 'ui'] as const) {
    trackers[k].renders = 0
    setBadge(k, 'same')
  }
  render()
  con.info('Счётчики ререндеров сброшены.')
})

con.info('Попробуйте users/added → users растёт на 1, todos и ui — в 0.')
con.info('Потом users/noop → НИ ОДИН счётчик не вырастет. Immer вернёт оригинал.')
con.log('Откройте DevTools (справа) — увидите action diff: меняется только затронутая slice.')
