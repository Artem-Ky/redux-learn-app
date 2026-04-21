import {
  configureStore,
  createSlice,
  buildCreateSlice,
  asyncThunkCreator,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

/* ════════════════════════════════════════════════════════════════════
   Демо-слайсы — три варианта одного и того же слайса "todos"
   ════════════════════════════════════════════════════════════════════ */

interface Todo { id: string; text: string; done: boolean }
interface TodosState { items: Todo[] }
const initialTodos: TodosState = { items: [] }

// ── A. object-syntax ──
const todosObjectSlice = createSlice({
  name: 'todosA',
  initialState: initialTodos,
  reducers: {
    addTodo: {
      prepare: (text: string) => ({ payload: { id: nanoid(), text, done: false } as Todo }),
      reducer: (state, action: PayloadAction<Todo>) => { state.items.push(action.payload) },
    },
    deleteTodo: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((t) => t.id !== action.payload)
    },
  },
})

// ── B. callback-syntax без asyncThunk ──
const todosCallbackSlice = createSlice({
  name: 'todosB',
  initialState: initialTodos,
  reducers: (create) => ({
    addTodo: create.preparedReducer(
      (text: string) => ({ payload: { id: nanoid(), text, done: false } as Todo }),
      (state, action) => { state.items.push(action.payload) },
    ),
    deleteTodo: create.reducer<string>((state, action) => {
      state.items = state.items.filter((t) => t.id !== action.payload)
    }),
  }),
})

// ── C. createAppSlice + asyncThunkCreator ──
const createAppSlice = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator },
})
const todosAppSlice = createAppSlice({
  name: 'todosC',
  initialState: initialTodos,
  reducers: (create) => ({
    addTodo: create.preparedReducer(
      (text: string) => ({ payload: { id: nanoid(), text, done: false } as Todo }),
      (state, action) => { state.items.push(action.payload) },
    ),
    deleteTodo: create.reducer<string>((state, action) => {
      state.items = state.items.filter((t) => t.id !== action.payload)
    }),
    // Эту возможность и "оплачиваем" в bundle:
    fetchTodos: create.asyncThunk(
      async () => {
        await new Promise((r) => setTimeout(r, 100))
        return [{ id: nanoid(), text: 'from server', done: false }] as Todo[]
      },
      {
        fulfilled: (state, action) => { state.items = action.payload },
      },
    ),
  }),
})

/* ════════════════════════════════════════════════════════════════════
   graphSlice — состояние интерактивного dependency-graph
   ════════════════════════════════════════════════════════════════════ */

type Mode = 'A' | 'B' | 'C'

interface GraphState {
  mode: Mode
}

const graphSlice = createSlice({
  name: 'graph',
  initialState: { mode: 'A' } as GraphState,
  reducers: {
    setMode: (state, action: PayloadAction<Mode>) => { state.mode = action.payload },
  },
})
const { setMode } = graphSlice.actions

/* ════════════════════════════════════════════════════════════════════
   Store
   ════════════════════════════════════════════════════════════════════ */

const store = configureStore({
  reducer: {
    graph: graphSlice.reducer,
    todosA: todosObjectSlice.reducer,
    todosB: todosCallbackSlice.reducer,
    todosC: todosAppSlice.reducer,
  },
})

type RootState = ReturnType<typeof store.getState>

/* ════════════════════════════════════════════════════════════════════
   Dependency-graph описание
   ════════════════════════════════════════════════════════════════════ */

interface DepNode {
  id: string
  name: string
  size: string         // иллюстративный вес в min+gzip
  inModes: Mode[]      // в каких режимах узел попадает в bundle
}

const NODES: DepNode[] = [
  { id: 'createSlice',      name: 'createSlice',      size: '~3 KB',   inModes: ['A', 'B', 'C'] },
  { id: 'createReducer',    name: 'createReducer',    size: '<1 KB',   inModes: ['A', 'B', 'C'] },
  { id: 'createAction',     name: 'createAction',     size: '<1 KB',   inModes: ['A', 'B', 'C'] },
  { id: 'immer',            name: 'immer',            size: '~3 KB',   inModes: ['A', 'B', 'C'] },
  { id: 'redux-thunk',      name: 'redux-thunk',      size: '<1 KB',   inModes: ['A', 'B', 'C'] /* default middleware configureStore */ },
  { id: 'reselect',         name: 'reselect',         size: '<1 KB',   inModes: [] /* не используется в демо */ },
  { id: 'asyncThunkCreator',name: 'asyncThunkCreator',size: '<1 KB',   inModes: ['C'] },
  { id: 'createAsyncThunk', name: 'createAsyncThunk', size: '~1–2 KB', inModes: ['C'] },
]

const MODE_META: Record<Mode, { title: string; size: string; desc: string }> = {
  A: { title: 'A · createSlice + object-syntax',                 size: '~9 KB',          desc: 'Базовое ядро RTK (configureStore + createSlice + immer + thunk middleware).' },
  B: { title: 'B · createSlice + callback (без asyncThunk)',     size: '~9 KB',          desc: 'Тот же базовый набор. Callback-обёртки компилируются в тот же код.' },
  C: { title: 'C · createAppSlice + asyncThunkCreator',          size: '~10–11 KB (+1–2)', desc: 'Вы явно подключили asyncThunkCreator → в бандле появился createAsyncThunk.' },
}

/* ════════════════════════════════════════════════════════════════════
   UI rendering
   ════════════════════════════════════════════════════════════════════ */

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог 32a — object vs callback')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const graphEl = document.getElementById('graph')!
const titleEl = document.getElementById('graph-title')!
const sizeEl  = document.getElementById('graph-size')!
const tabsEl  = document.getElementById('mode-tabs')!

function renderGraph(): void {
  const { mode } = (store.getState() as RootState).graph

  titleEl.textContent = MODE_META[mode].title
  sizeEl.textContent  = MODE_META[mode].size

  // active-tab
  tabsEl.querySelectorAll<HTMLButtonElement>('.mode-tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === mode)
  })

  // graph rebuild
  graphEl.innerHTML = ''

  // root node
  const root = document.createElement('div')
  root.className = 'graph__node graph__node--root'
  root.innerHTML = '@reduxjs/toolkit · entry'
  graphEl.appendChild(root)

  for (const n of NODES) {
    const isIn = n.inModes.includes(mode)

    const nodeLeft = document.createElement('div')
    nodeLeft.className = `graph__node ${isIn ? 'graph__node--in' : 'graph__node--out'}`
    nodeLeft.innerHTML = `
      <span class="graph__name">${n.name}</span>
      <span class="graph__size">${n.size}</span>
    `
    graphEl.appendChild(nodeLeft)

    const arrow = document.createElement('div')
    arrow.className = `graph__arrow ${isIn ? 'graph__arrow--on' : 'graph__arrow--off'}`
    arrow.textContent = isIn ? '→' : '⋯'
    graphEl.appendChild(arrow)

    const nodeRight = document.createElement('div')
    nodeRight.className = `graph__node ${isIn ? 'graph__node--in' : 'graph__node--out'}`
    nodeRight.innerHTML = `
      <span class="graph__status ${isIn ? 'graph__status--in' : 'graph__status--out'}">
        ${isIn ? 'in bundle' : 'tree-shaken'}
      </span>
    `
    graphEl.appendChild(nodeRight)
  }
}

function logModeChange(prev: Mode, next: Mode): void {
  const prevSet = new Set(NODES.filter((n) => n.inModes.includes(prev)).map((n) => n.id))
  const nextSet = new Set(NODES.filter((n) => n.inModes.includes(next)).map((n) => n.id))
  const added   = [...nextSet].filter((id) => !prevSet.has(id))
  const removed = [...prevSet].filter((id) => !nextSet.has(id))

  con.info(`режим: ${prev} → ${next} · ${MODE_META[next].desc}`)
  if (added.length)   con.success(`+ добавилось в bundle: ${added.join(', ')}`)
  if (removed.length) con.warn(`− выкинул tree-shaker: ${removed.join(', ')}`)
  if (!added.length && !removed.length) con.log('граф зависимостей не изменился')
}

/* ── Инициализация UI ── */
renderGraph()
store.subscribe(renderGraph)

tabsEl.querySelectorAll<HTMLButtonElement>('.mode-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    const prev = (store.getState() as RootState).graph.mode
    const next = btn.dataset.mode as Mode
    if (prev === next) return
    const a = setMode(next)
    store.dispatch(a)
    con.action(a)
    logModeChange(prev, next)
  })
})

/* ── Кнопка: dispatch addTodo в слайс активного режима ── */
document.getElementById('btn-dispatch')!.addEventListener('click', () => {
  const mode = (store.getState() as RootState).graph.mode
  const map = {
    A: { slice: todosObjectSlice,   label: 'object'   },
    B: { slice: todosCallbackSlice, label: 'callback' },
    C: { slice: todosAppSlice,      label: 'app'      },
  } as const
  const { slice, label } = map[mode]
  const action = slice.actions.addTodo(`todo в режиме ${mode}`)
  store.dispatch(action)
  con.action(action, label)
})

/* ── Кнопка: демонстрация ошибки create.asyncThunk в обычном createSlice ── */
document.getElementById('btn-try-error')!.addEventListener('click', () => {
  con.info('пробуем create.asyncThunk в обычном createSlice (без buildCreateSlice)…')
  try {
    createSlice({
      name: 'broken',
      initialState: {},
      reducers: (create) => ({
        badThunk: create.asyncThunk(async () => 42, {}),
      }),
    })
    con.error('???  — ошибки не было, это неожиданно')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    con.error(`✖ RTK бросил: ${msg}`)
    con.info('именно поэтому существует buildCreateSlice — включает asyncThunk creator явно')
  }
})

/* ── Startup message ── */
con.log('Урок 32a — object-syntax vs callback-syntax, bundle size.')
con.info('Переключай A / B / C — увидишь, что появляется и уходит из bundle.')
con.info('Узлы с "in bundle" — накапливают размер; "tree-shaken" — bundler их удалил.')
con.success('Ключ: сам callback-синтаксис ничего не стоит. Стоит подключение asyncThunkCreator.')
