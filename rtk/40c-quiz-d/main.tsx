import {
  configureStore,
  createSlice,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Live mini-store (для DevToolsPanel — чтобы панель была активной) ──

interface CartItem { id: string; title: string; price: number }
interface CartState { items: CartItem[] }

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [
      { id: nanoid(), title: 'Книга по RTK', price: 590 },
      { id: nanoid(), title: 'Наклейка Redux', price: 150 },
    ],
  } as CartState,
  reducers: {
    addItem: {
      reducer(state, action: PayloadAction<CartItem>) {
        state.items.push(action.payload)
      },
      prepare(title: string, price: number) {
        return { payload: { id: nanoid(), title, price } }
      },
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((i) => i.id !== action.payload)
    },
  },
})
const store = configureStore({ reducer: { cart: cartSlice.reducer } })

// ── Recap data ──

interface RecapBlock {
  num: string
  title: string
  lead: string
  snippets: { label: string; code: string }[]
  insights?: { kind: 'key' | 'trap' | 'good'; html: string }[]
}

const recaps: RecapBlock[] = [
  {
    num: 'Уроки 28 + 29',
    title: 'createSlice базовый и auto-actions',
    lead:
      '<code>createSlice</code> объединяет actions + reducer + initialState в один объект. Для каждого ключа в <code>reducers</code> RTK генерирует action creator + type <code>`${slice.name}/${reducerKey}`</code>. В TS это <strong>литеральный</strong> тип (не просто string) — даёт точное сужение в switch и через <code>.match</code> type-guard.',
    snippets: [
      {
        label: 'authSlice.ts — полный файл',
        code:
`import { createSlice, type PayloadAction } from \'@reduxjs/toolkit\'

interface User { id: string; name: string }
interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = { user: null, loading: false, error: null }

export const authSlice = createSlice({
  name: \'auth\',                                    // ← префикс action.type
  initialState,
  reducers: {
    loginRequest:  (s)              => { s.loading = true; s.error = null },
    loginSuccess:  (s, a: PayloadAction<User>)   => {
      s.loading = false
      s.user    = a.payload
    },
    loginFailure:  (s, a: PayloadAction<string>) => {
      s.loading = false
      s.error   = a.payload
    },
    logout:        ()               => initialState,   // чистый return OK
  },
})

// Auto-generated:
//   authSlice.actions.loginRequest.type  === \'auth/loginRequest\'
//   authSlice.actions.loginSuccess.type  === \'auth/loginSuccess\'
//   authSlice.actions.loginFailure.type  === \'auth/loginFailure\'
//   authSlice.actions.logout.type        === \'auth/logout\'
//   authSlice.actions.loginSuccess.match(action) — type-guard

export const { loginRequest, loginSuccess, loginFailure, logout } = authSlice.actions
export default authSlice.reducer
`,
      },
      {
        label: 'store.ts + использование в компоненте',
        code:
`import { configureStore } from \'@reduxjs/toolkit\'
import authReducer, { loginSuccess } from \'./authSlice\'

export const store = configureStore({
  reducer: { auth: authReducer },     // ключ \'auth\' ↔ state.auth
})

export type RootState   = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// В компоненте
import { useDispatch, useSelector } from \'react-redux\'

function LoginButton() {
  const dispatch = useDispatch<AppDispatch>()
  const user = useSelector((s: RootState) => s.auth.user)
  return (
    <button onClick={() => dispatch(loginSuccess({ id: \'u1\', name: \'Alice\' }))}>
      {user ? user.name : \'Login\'}
    </button>
  )
}

// В listenerMiddleware через .match
import { createListenerMiddleware } from \'@reduxjs/toolkit\'
const listener = createListenerMiddleware()
listener.startListening({
  matcher: loginSuccess.match,        // type-guard
  effect: (action, api) => {
    // action типизирован: PayloadAction<User>
    console.log(\'Logged in as\', action.payload.name)
  },
})
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>Литеральный тип:</strong> <code>authSlice.actions.loginSuccess.type</code> в TS имеет тип <code>\'auth/loginSuccess\'</code>, а не <code>string</code>. Это даёт discriminated union в reducer и строгий type-guard через <code>.match</code>.',
      },
      {
        kind: 'trap',
        html:
          '<strong>Переименование ломает persisted state.</strong> Сменили <code>loginRequest</code> на <code>requestLogin</code> → action.type стал <code>\'auth/requestLogin\'</code>. Старые actions в localStorage/devtools будут unrecognized. Хотите сохранить старый type — используйте отдельный <code>createAction(\'auth/loginRequest\')</code> + <code>extraReducers</code>.',
      },
    ],
  },
  {
    num: 'Урок 30',
    title: '{ reducer, prepare } — кастомный payload',
    lead:
      'Если payload — это просто аргумент action creator\'а, пишите обычную функцию. Если нужна генерация <code>nanoid()</code>, несколько аргументов, <code>meta</code> / <code>error</code>, или нормализация входа — <strong>prepared reducer</strong>. <code>prepare</code> должен возвращать объект <code>{ payload, meta?, error? }</code>, а не сам payload.',
    snippets: [
      {
        label: 'todosSlice.ts — prepared reducer',
        code:
`import { createSlice, nanoid, type PayloadAction } from \'@reduxjs/toolkit\'

export interface Todo {
  id: string
  text: string
  done: boolean
  createdAt: number
}

interface TodosState { items: Todo[] }

export const todosSlice = createSlice({
  name: \'todos\',
  initialState: { items: [] } as TodosState,
  reducers: {
    // Обычный reducer — payload = аргумент (string)
    toggleTodo: (state, action: PayloadAction<string>) => {
      const t = state.items.find((x) => x.id === action.payload)
      if (t) t.done = !t.done
    },

    // Prepared — id + timestamp генерируются ОДИН раз в prepare
    addTodo: {
      reducer(state, action: PayloadAction<Todo>) {
        state.items.push(action.payload)
      },
      prepare(text: string) {
        return {
          payload: {
            id: nanoid(),             // ← НЕ в reducer\'е (тот чистый)
            text: text.trim(),
            done: false,
            createdAt: Date.now(),
          },
        }
      },
    },

    // Несколько аргументов + meta-поле
    addNote: {
      reducer(state, action: PayloadAction<Todo, string, { user: string }>) {
        state.items.push({ ...action.payload, text: \`[\${action.meta.user}] \${action.payload.text}\` })
      },
      prepare(text: string, user: string) {
        return {
          payload: { id: nanoid(), text, done: false, createdAt: Date.now() },
          meta: { user },
        }
      },
    },
  },
})

export const { toggleTodo, addTodo, addNote } = todosSlice.actions

// Использование
dispatch(addTodo(\'купить хлеб\'))         // actionCreator(text) → prepare собирает payload
dispatch(addNote(\'привет\', \'Alice\'))   // 2 аргумента разрешены благодаря prepare
`,
      },
      {
        label: 'Под капотом — эквивалент через createAction',
        code:
`import { createAction, nanoid } from \'@reduxjs/toolkit\'

// Это:
addTodo: {
  reducer(state, action) { state.items.push(action.payload) },
  prepare(text: string) {
    return { payload: { id: nanoid(), text, done: false } }
  },
}

// Эквивалентно:
const addTodoAction = createAction(
  \'todos/addTodo\',                         // type ← name + reducerKey
  (text: string) => ({
    payload: { id: nanoid(), text, done: false },
  }),
)

// Поэтому .match работает одинаково:
if (addTodo.match(action)) {
  // action.payload типизирован как Todo
}
`,
      },
    ],
    insights: [
      {
        kind: 'trap',
        html:
          '<strong>prepare возвращает объект, не payload.</strong> <code>prepare: (t) =&gt; ({ id: nanoid(), t })</code> — НЕПРАВИЛЬНО (это объект с ключами id/t, а payload undefined). Правильно: <code>prepare: (t) =&gt; ({ payload: { id: nanoid(), t } })</code>.',
      },
      {
        kind: 'trap',
        html:
          '<strong>prepare вызывается КАЖДЫЙ раз,</strong> когда dispatch\'ат action creator. Не делайте в нём <code>fetch</code>, <code>console.error</code>, мутацию DOM — только чистая трансформация входа. Side-effects — в middleware/thunks/listeners.',
      },
    ],
  },
  {
    num: 'Уроки 31 + 32 + 32a',
    title: 'extraReducers, reducer creators, buildCreateSlice',
    lead:
      '<strong>reducers</strong> — СВОИ actions (генерируются creator + type). <strong>extraReducers(builder)</strong> — ЧУЖИЕ actions: от других slice, thunks, createAction. Ничего не генерируется — только слушаем. <strong>Callback-syntax</strong> (<code>reducers: (create) =&gt; ({...})</code>) даёт <code>create.reducer</code>, <code>create.preparedReducer</code>, <code>create.asyncThunk</code> — но asyncThunk требует собрать свой <code>createAppSlice</code> через <code>buildCreateSlice</code>, иначе bundle потянет <code>createAsyncThunk</code> всем подряд.',
    snippets: [
      {
        label: 'authEvents.ts + cartSlice (extraReducers builder)',
        code:
`import { createAction, createSlice, isAnyOf } from \'@reduxjs/toolkit\'

// GLOBAL event — чистый createAction, ни к какому slice не привязан
export const userLoggedOut = createAction(\'auth/userLoggedOut\')

interface CartState { items: CartItem[]; lastError: string | null }
const initial: CartState = { items: [], lastError: null }

export const cartSlice = createSlice({
  name: \'cart\',
  initialState: initial,
  reducers: {
    // СВОИ actions
    addItem: (s, a: PayloadAction<CartItem>) => { s.items.push(a.payload) },
    removeItem: (s, a: PayloadAction<string>) => {
      s.items = s.items.filter((i) => i.id !== a.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      // addCase — точечный matcher по action creator
      .addCase(userLoggedOut, () => initial)
      // addCase можно и со строкой, если creator недоступен
      .addCase(\'app/hardReset\', () => initial)
      // addMatcher — predicate функция, ловит много actions
      .addMatcher(
        isAnyOf(userLoggedOut, /* ...любой action... */),
        (s) => { s.lastError = null },
      )
      // addDefaultCase — вызывается, если ничего не сматчилось
      .addDefaultCase((s) => s)
  },
})
`,
      },
      {
        label: 'app/createAppSlice.ts + todosSlice (callback + create.asyncThunk)',
        code:
`// app/createAppSlice.ts — ОДИН раз на проект
import { buildCreateSlice, asyncThunkCreator } from \'@reduxjs/toolkit\'

export const createAppSlice = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator },
})

// features/todos/todosSlice.ts
import { createAppSlice } from \'../../app/createAppSlice\'

interface TodosState {
  items: Todo[]
  loading: boolean
  error: string | null
}

export const todosSlice = createAppSlice({
  name: \'todos\',
  initialState: { items: [], loading: false, error: null } as TodosState,
  reducers: (create) => ({
    // 1. create.reducer — обычный reducer, просто обёрнутый
    deleteTodo: create.reducer<string>((state, action) => {
      state.items = state.items.filter((t) => t.id !== action.payload)
    }),

    // 2. create.preparedReducer — эквивалент { reducer, prepare }
    addTodo: create.preparedReducer(
      (text: string) => ({
        payload: { id: nanoid(), text, done: false, createdAt: Date.now() },
      }),
      (state, action: PayloadAction<Todo>) => {
        state.items.push(action.payload)
      },
    ),

    // 3. create.asyncThunk — thunk ПРЯМО в slice + handlers
    fetchTodos: create.asyncThunk(
      async (_arg: void, thunkApi) => {
        const r = await fetch(\'/api/todos\')
        if (!r.ok) return thunkApi.rejectWithValue(\'HTTP \' + r.status)
        return (await r.json()) as Todo[]
      },
      {
        pending:   (state)        => { state.loading = true;  state.error = null },
        fulfilled: (state, action) => { state.items = action.payload },
        rejected:  (state, action) => { state.error = action.error.message ?? \'err\' },
        settled:   (state)        => { state.loading = false },   // оба: fulfilled + rejected
      },
    ),
  }),
})

// Thunk доступен:
// todosSlice.actions.fetchTodos            — сам thunk (dispatch его)
// todosSlice.actions.fetchTodos.pending    — pending action creator
// todosSlice.actions.fetchTodos.fulfilled
// todosSlice.actions.fetchTodos.rejected
`,
      },
    ],
    insights: [
      {
        kind: 'good',
        html:
          '<strong>tree-shaking asyncThunk.</strong> Если вы НЕ вызываете <code>buildCreateSlice({ creators: { asyncThunk } })</code>, то <code>asyncThunkCreator</code> и <code>createAsyncThunk</code> не попадают в bundle. Callback-syntax с одними только <code>create.reducer</code> / <code>create.preparedReducer</code> стоит 0 байт дополнительно к object-syntax.',
      },
      {
        kind: 'trap',
        html:
          '<strong>create.asyncThunk в обычном createSlice → throw.</strong> «The version of createSlice exported from RTK will throw an error if create.asyncThunk is called.» Нужно собрать свой <code>createAppSlice</code>.',
      },
      {
        kind: 'trap',
        html:
          '<strong>extraReducers старого формата удалён.</strong> <code>extraReducers: { [type]: handler }</code> (object-form) был deprecated в RTK 1 и полностью удалён в RTK 2. Только <code>extraReducers: (builder) =&gt; builder.addCase(...)</code>.',
      },
    ],
  },
  {
    num: 'Уроки 33 + 37',
    title: 'slice.selectors + getSelectors, name vs reducerPath',
    lead:
      '<code>selectors</code> принимают <strong>state slice\'а</strong> (не root), но наружу экспортируются как селекторы от root. RTK внутри делает <code>(rootState) =&gt; sel(rootState[slice.reducerPath], ...args)</code>. Ключ — <code>reducerPath</code>, а не <code>name</code>. По умолчанию <code>reducerPath = name</code>. Различаются только в RTK Query (name внутри нельзя, reducerPath = \'api\') и в редких custom-кейсах. Если реальный путь в store отличается — <code>slice.getSelectors(stateSelector)</code>.',
    snippets: [
      {
        label: 'counterSlice.ts — slice.selectors',
        code:
`import { createSlice, createSelector, type PayloadAction } from \'@reduxjs/toolkit\'

interface CounterState {
  value: number
  history: number[]
}

export const counterSlice = createSlice({
  name: \'counter\',
  initialState: { value: 0, history: [] } as CounterState,
  reducers: {
    increment: (s) => { s.value++;  s.history.push(s.value) },
    decrement: (s) => { s.value--;  s.history.push(s.value) },
    addBy:    (s, a: PayloadAction<number>) => {
      s.value += a.payload
      s.history.push(s.value)
    },
  },
  selectors: {
    // state — тип CounterState, НЕ RootState
    selectValue:         (s) => s.value,
    selectIsEven:        (s) => s.value % 2 === 0,
    selectHistoryLength: (s) => s.history.length,
    // Селектор с аргументом
    selectHistoryAt:     (s, i: number) => s.history[i],

    // Мемоизированный — через createSelector внутри
    selectSquared: createSelector(
      [(s: CounterState) => s.value],
      (v) => v * v,
    ),
  },
})

// Использование от ROOT state — RTK сам находит rootState.counter
counterSlice.selectors.selectValue(rootState)         // rootState.counter.value
counterSlice.selectors.selectHistoryAt(rootState, 0)  // rootState.counter.history[0]

// Встроенный helper — весь state slice
counterSlice.selectSlice(rootState)                   // rootState.counter
`,
      },
      {
        label: 'reducerPath vs name — кастомный путь + getSelectors',
        code:
`// 1. name ≠ reducerPath — различие живёт в типах RTK Query
import { createSlice, combineSlices, configureStore } from \'@reduxjs/toolkit\'

const usersSlice = createSlice({
  name: \'users\',                // ← action.type = \'users/add\', \'users/remove\'
  reducerPath: \'data/users\',    // ← state[\'data/users\']
  initialState: { items: [] as User[] },
  reducers: {
    add: (s, a: PayloadAction<User>) => { s.items.push(a.payload) },
  },
  selectors: {
    selectCount: (s) => s.items.length,
  },
})

const root = combineSlices(usersSlice)
// state[\'data/users\'] — да, со слешем (не стоит так делать, но работает)

// 2. Slice под НЕСТАНДАРТНЫМ путём через combineReducers
import { combineReducers, configureStore } from \'@reduxjs/toolkit\'

export const store = configureStore({
  reducer: {
    admin: combineReducers({ users: usersSlice.reducer }),
  },
})
// Теперь rootState.admin.users — а slice.selectors ждут rootState[\'data/users\']

// ❌ сломается — usersSlice.selectors.selectCount(rootState) вернёт undefined:
//    внутри делает rootState[\'data/users\'] → undefined → .items.length → throw

// ✅ перепривязываем корень через getSelectors:
export const adminUserSelectors = usersSlice.getSelectors(
  (rootState: RootState) => rootState.admin.users,
)
adminUserSelectors.selectCount(rootState)   // работает
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>reducerPath — плоский ключ, не путь.</strong> <code>\'data/users\'</code> = <code>state[\'data/users\']</code>, а не <code>state.data.users</code>. Для вложенности используйте <code>combineReducers</code> / <code>combineSlices</code> + <code>getSelectors</code>.',
      },
      {
        kind: 'trap',
        html:
          '<strong>slice.selectors НЕ мемоизированы.</strong> Обычная стрелка <code>(s) =&gt; s.items.filter(...)</code> в <code>selectors</code> создаёт новый массив на каждый useSelector. Хотите мемо — <code>createSelector</code> внутри slice.selectors.',
      },
    ],
  },
  {
    num: 'Уроки 34 + 35 + 35a + 36',
    title: 'combineSlices, lazy injection, withLazyLoadedSlices',
    lead:
      '<code>combineSlices</code> — замена <code>combineReducers</code> в RTK 2. Принимает сами slice-объекты (не <code>.reducer</code>) и использует <code>reducerPath</code> как ключ. Возвращает reducer с <code>.inject()</code> для позднего добавления slice в runtime — это основа code-splitting state. TS-типизация lazy веток — через <code>.withLazyLoadedSlices&lt;T&gt;()</code> (делает их опциональными в <code>RootState</code>) или helper <code>WithSlice&lt;typeof slice&gt;</code>.',
    snippets: [
      {
        label: 'app/store.ts — combineSlices + withLazyLoadedSlices',
        code:
`import { combineSlices, configureStore, type WithSlice } from \'@reduxjs/toolkit\'
import { counterSlice } from \'../features/counter/counterSlice\'
import { authSlice }    from \'../features/auth/authSlice\'

// Типы lazy-slices — объявляем, что МОЖЕТ появиться
import type { chartSlice } from \'../features/chart/chartSlice\'
import type { cartSlice }  from \'../features/cart/cartSlice\'

type LazyLoadedSlices =
  & WithSlice<typeof chartSlice>     // { chart?: ChartState }
  & WithSlice<typeof cartSlice>      // { cart?:  CartState }

// Корневой reducer — core slices обязательны, lazy — опциональны
export const rootReducer = combineSlices(counterSlice, authSlice)
  .withLazyLoadedSlices<LazyLoadedSlices>()

export const store = configureStore({ reducer: rootReducer })

export type RootState   = ReturnType<typeof rootReducer>
// = {
//     counter: CounterState,
//     auth:    AuthState,
//     chart?:  ChartState,     ← опционально (lazy)
//     cart?:   CartState,      ← опционально (lazy)
//   }

export type AppDispatch = typeof store.dispatch
`,
      },
      {
        label: 'features/chart/lazySliceInjection.ts — .injectInto + React.lazy',
        code:
`// features/chart/chartSlice.ts — обычный slice, но injectInto(root)
import { createSlice, type PayloadAction } from \'@reduxjs/toolkit\'
import { rootReducer } from \'../../app/store\'

interface ChartState { points: number[] }

export const chartSlice = createSlice({
  name: \'chart\',
  initialState: { points: [] } as ChartState,
  reducers: {
    addPoint: (s, a: PayloadAction<number>) => { s.points.push(a.payload) },
  },
  selectors: {
    selectPoints: (s) => s.points,
  },
}).injectInto(rootReducer)
//  ↑ injectInto возвращает "клон" slice\'а с гарантией, что reducer подключён.
//    Повторный inject того же slice вернёт тот же объект без перезаписи state.

export const { addPoint } = chartSlice.actions

// features/chart/ChartView.tsx — компонент в lazy chunk
import { useAppDispatch, useAppSelector } from \'../../app/hooks\'
import { addPoint, chartSlice } from \'./chartSlice\'

export default function ChartView() {
  const points = useAppSelector(chartSlice.selectors.selectPoints) ?? []
  //             ↑ через слайс; благодаря .withLazyLoadedSlices — поле опциональное
  const dispatch = useAppDispatch()
  return (
    <div>
      <button onClick={() => dispatch(addPoint(Math.random()))}>add</button>
      <div>{points.join(\', \')}</div>
    </div>
  )
}

// App.tsx — подключение через React.lazy
import { lazy, Suspense } from \'react\'
const ChartView = lazy(() => import(\'./features/chart/ChartView\'))
// При первом рендере грузится chunk → в chunk есть import chartSlice →
// chartSlice.injectInto(root) → state.chart появляется → компонент рендерится.

<Suspense fallback="...">
  <ChartView />
</Suspense>
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>Два API для lazy:</strong> <code>rootReducer.inject({ reducerPath, reducer })</code> — для любого reducer; <code>slice.injectInto(rootReducer)</code> — для slice, возвращает клон с гарантией инжекта. Повторный inject одного и того же slice — no-op (не затирает state).',
      },
      {
        kind: 'good',
        html:
          '<strong>WithSlice делает поле опциональным:</strong> <code>type WithSlice&lt;S&gt; = { [K in S[\'reducerPath\']]?: ReturnType&lt;S[\'reducer\']&gt; }</code>. В селекторах обязательно проверяйте <code>if (!state.chart) return null</code> — до inject\'а оно <code>undefined</code>.',
      },
      {
        kind: 'trap',
        html:
          '<strong>Использование selector до inject.</strong> <code>chartSlice.selectors.selectPoints(state)</code> пока нет <code>state.chart</code> — внутри будет <code>state.chart.points</code> → TypeError. Решение: инжектить в модуле, который импортируется ровно тогда, когда нужен slice.',
      },
    ],
  },
  {
    num: 'Уроки 38 + 40',
    title: 'Правила Immer и current() / original()',
    lead:
      'RTK включает Immer автоматически в <code>createSlice</code> и <code>createReducer</code>. Правило: <strong>мутируй draft ИЛИ возвращай новый объект — но не оба</strong>. <code>state.x = 1; return state</code> или <code>state.x = 1; return { ...state }</code> — runtime error. Для логов — <code>current(draft)</code> (plain deep copy); для сравнения с «было» — <code>original(draft)</code>; для type-guard — <code>isDraft(value)</code>.',
    snippets: [
      {
        label: 'booksSlice.ts — ОК и НЕ ОК мутации',
        code:
`import { createSlice, current, original, isDraft, type PayloadAction }
  from \'@reduxjs/toolkit\'

interface Book { id: string; title: string; price: number }
interface BooksState { items: Book[]; avgPrice: number }

export const booksSlice = createSlice({
  name: \'books\',
  initialState: { items: [], avgPrice: 0 } as BooksState,
  reducers: {
    // ✓ мутация draft
    addBook: (s, a: PayloadAction<Book>) => { s.items.push(a.payload) },

    // ✓ delete
    removeBook: (s, a: PayloadAction<string>) => {
      s.items = s.items.filter((b) => b.id !== a.payload)   // переприсвоение массива OK
    },

    // ✓ чистый return — без мутаций
    reset: () => ({ items: [], avgPrice: 0 }),

    // ✗ НЕ ОК: мутация + return вместе
    //   Immer бросит: "An immer producer returned a new value *and* modified its draft"
    badMix: (s) => {
      s.avgPrice = 999
      return { items: [], avgPrice: 0 }    // ← throw
    },

    // ✗ НЕ ОК: replace всего draft через присваивание
    //   state — параметр, не ссылка; перезапись state = X не сработает
    badReplace: (state) => {
      state = { items: [], avgPrice: 0 }   // ← silently ignored, state не меняется
    },

    // ✓ debug через current() и original()
    recomputeAvg: (s) => {
      console.log(\'draft:   \', current(s))       // plain deep copy
      console.log(\'original:\', original(s))      // state ДО reducer\'а

      if (s.items === original(s)!.items) {
        // items не менялся с прошлого dispatch — можно пропустить
        return
      }
      s.avgPrice = s.items.length
        ? s.items.reduce((a, b) => a + b.price, 0) / s.items.length
        : 0

      console.log(\'after:   \', current(s))
    },
  },
})
`,
      },
      {
        label: 'addItemSafe — helper с isDraft',
        code:
`import { isDraft } from \'@reduxjs/toolkit\'

// Функция, которая работает и с draft, и с plain state
function addItemSafe<T>(stateOrDraft: { items: T[] }, item: T) {
  if (isDraft(stateOrDraft)) {
    // В reducer\'е — можно мутировать draft
    stateOrDraft.items.push(item)
    return stateOrDraft
  }
  // Вне reducer\'а — возвращаем новый объект
  return { ...stateOrDraft, items: [...stateOrDraft.items, item] }
}

// Использование в reducer\'е
reducers: {
  addInDraft: (state, action: PayloadAction<Book>) => {
    addItemSafe(state, action.payload)   // мутирует draft
  },
}

// Использование в тесте с plain state
const next = addItemSafe({ items: [] }, { id: \'1\', title: \'X\', price: 100 })
// next — новый объект
`,
      },
    ],
    insights: [
      {
        kind: 'trap',
        html:
          '<strong>Замена <code>state = X</code> не работает.</strong> Параметр reducer\'а — локальная переменная, перезапись не меняет внешний state. Работает либо <code>return newState</code>, либо <code>Object.assign(state, newState)</code>, либо мутация полей.',
      },
      {
        kind: 'trap',
        html:
          '<strong>console.log(state) без current = Proxy.</strong> В DevTools увидите <code>Proxy(Object) {}</code>, внутренности недоступны. Всегда: <code>console.log(current(state))</code> или <code>console.log(JSON.parse(JSON.stringify(state)))</code>.',
      },
      {
        kind: 'good',
        html:
          '<strong>original() для ранних return.</strong> <code>if (state.items === original(state)!.items) return</code> — если поле не менялось с начала reducer\'а, не пересчитываем производные. Экономит CPU в больших slice.',
      },
    ],
  },
  {
    num: 'Урок 39',
    title: 'Feature folder pattern — структура проекта',
    lead:
      'Redux Style Guide рекомендует «feature folders» + «ducks pattern»: одна фича — одна папка, в ней slice, компоненты, селекторы, тесты. НЕ группировать по типам (<code>actions/</code>, <code>reducers/</code>, <code>selectors/</code>). Дополнительно — <code>app/store.ts</code> с <code>configureStore</code>, <code>app/hooks.ts</code> с <code>useAppDispatch</code> / <code>useAppSelector</code>.',
    snippets: [
      {
        label: 'features/counter/counterSlice.ts — ducks pattern',
        code:
`// Весь модуль counter — в одном файле:
// slice + actions + selectors + reducer default-export
import { createSlice, type PayloadAction } from \'@reduxjs/toolkit\'

interface CounterState { value: number }

const initialState: CounterState = { value: 0 }

const counterSlice = createSlice({
  name: \'counter\',
  initialState,
  reducers: {
    increment: (s) => { s.value++ },
    addBy: (s, a: PayloadAction<number>) => { s.value += a.payload },
  },
  selectors: {
    selectValue:  (s) => s.value,
    selectIsEven: (s) => s.value % 2 === 0,
  },
})

// Named exports — actions, selectors. Default — reducer.
export const { increment, addBy } = counterSlice.actions
export const { selectValue, selectIsEven } = counterSlice.selectors
export default counterSlice.reducer
`,
      },
      {
        label: 'app/hooks.ts + features/counter/Counter.tsx',
        code:
`// app/hooks.ts — ОДИН раз на проект, типизированные хуки
import { useDispatch, useSelector } from \'react-redux\'
import type { RootState, AppDispatch } from \'./store\'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()

// features/counter/Counter.tsx — UI рядом со slice, короткие импорты
import { useAppDispatch, useAppSelector } from \'@/app/hooks\'
import { increment, addBy, selectValue, selectIsEven } from \'./counterSlice\'

export function Counter() {
  const value  = useAppSelector(selectValue)
  const isEven = useAppSelector(selectIsEven)
  const dispatch = useAppDispatch()

  return (
    <div>
      <span>{value} ({isEven ? \'even\' : \'odd\'})</span>
      <button onClick={() => dispatch(increment())}>+1</button>
      <button onClick={() => dispatch(addBy(5))}>+5</button>
    </div>
  )
}
`,
      },
    ],
    insights: [
      {
        kind: 'good',
        html:
          '<strong>Один файл на фичу:</strong> <code>features/todos/</code> = <code>todosSlice.ts</code> + <code>TodoList.tsx</code> + <code>TodoItem.tsx</code> + <code>api.ts</code>. Удалить фичу = удалить одну папку, а не чистить 4 папки.',
      },
      {
        kind: 'trap',
        html:
          '<strong>Не делайте папки <code>actions/</code>, <code>reducers/</code>, <code>selectors/</code>.</strong> Это legacy-подход из docs Redux 2015 года. Сейчас устарел — createSlice объединяет всё в один модуль.',
      },
    ],
  },
  {
    num: 'Интеграция',
    title: 'Полный пример — связь всего вместе',
    lead:
      'Крупный пример, где встречаются все темы секции D: <code>createAppSlice</code> с <code>create.asyncThunk</code>, <code>combineSlices</code> с core + lazy, <code>extraReducers</code> для cross-slice reset, <code>slice.selectors</code> с прокидыванием через <code>getSelectors</code>.',
    snippets: [
      {
        label: 'full app (сокращённо) — store + core slice + lazy-injected slice',
        code:
`// app/createAppSlice.ts
import { buildCreateSlice, asyncThunkCreator } from \'@reduxjs/toolkit\'
export const createAppSlice = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator },
})

// features/auth/authEvents.ts — глобальное событие
import { createAction } from \'@reduxjs/toolkit\'
export const userLoggedOut = createAction(\'auth/userLoggedOut\')

// features/cart/cartSlice.ts
import { createAppSlice } from \'../../app/createAppSlice\'
import { userLoggedOut } from \'../auth/authEvents\'

export const cartSlice = createAppSlice({
  name: \'cart\',
  initialState: { items: [] as CartItem[], loading: false, error: null as string | null },
  reducers: (create) => ({
    addItem: create.preparedReducer(
      (title: string, price: number) => ({
        payload: { id: nanoid(), title, price },
      }),
      (state, action: PayloadAction<CartItem>) => {
        state.items.push(action.payload)
      },
    ),
    removeItem: create.reducer<string>((state, action) => {
      state.items = state.items.filter((i) => i.id !== action.payload)
    }),
    fetchCart: create.asyncThunk(
      async () => (await fetch(\'/api/cart\')).json() as Promise<CartItem[]>,
      {
        pending:   (s) => { s.loading = true },
        fulfilled: (s, a) => { s.items = a.payload },
        rejected:  (s, a) => { s.error = a.error.message ?? null },
        settled:   (s) => { s.loading = false },
      },
    ),
  }),
  extraReducers: (builder) => {
    // cross-slice: на logout очищаем корзину
    builder.addCase(userLoggedOut, () => ({ items: [], loading: false, error: null }))
  },
  selectors: {
    selectItems: (s) => s.items,
    selectTotal: createSelector(
      [(s: CartState) => s.items],
      (items) => items.reduce((sum, i) => sum + i.price, 0),
    ),
  },
})

// app/store.ts
import { combineSlices, configureStore, type WithSlice } from \'@reduxjs/toolkit\'
import { cartSlice } from \'../features/cart/cartSlice\'
import type { chartSlice } from \'../features/chart/chartSlice\'    // type-only, lazy

type Lazy = WithSlice<typeof chartSlice>

export const rootReducer = combineSlices(cartSlice)
  .withLazyLoadedSlices<Lazy>()

export const store = configureStore({ reducer: rootReducer })
export type RootState = ReturnType<typeof rootReducer>

// Использование в компоненте
const items = useAppSelector(cartSlice.selectors.selectItems)
const total = useAppSelector(cartSlice.selectors.selectTotal)
dispatch(cartSlice.actions.addItem(\'Книга\', 590))
dispatch(cartSlice.actions.fetchCart())
dispatch(userLoggedOut())                     // → cart ресетится через extraReducers
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>Порядок матчеров в extraReducers:</strong> <code>addCase</code> прежде, затем <code>addMatcher</code>, затем <code>addDefaultCase</code>. Для одного action может сработать НЕСКОЛЬКО обработчиков (все подходящие addMatcher\'ы) — если нужна «одна из» логика, пользуйтесь <code>isAnyOf</code> / <code>isAllOf</code>.',
      },
      {
        kind: 'good',
        html:
          '<strong>Cross-slice reset без boilerplate:</strong> один <code>createAction(\'auth/userLoggedOut\')</code>, все N slice\'ов слушают его через <code>extraReducers</code> и сбрасываются одним <code>dispatch(userLoggedOut())</code>.',
      },
    ],
  },
]

// ── Recap rendering ──

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderRecaps(): void {
  const container = document.getElementById('recaps-container')!
  container.innerHTML = recaps
    .map((r) => {
      const snippets = r.snippets
        .map(
          (sn) => `
          <div>
            <div class="file-label">${escapeHtml(sn.label)}</div>
            <div class="code-block">${escapeHtml(sn.code)}</div>
          </div>`,
        )
        .join('')
      const insights = (r.insights ?? [])
        .map(
          (i) => `<div class="${i.kind === 'key' ? 'key-insight' : i.kind === 'trap' ? 'trap' : 'good'}">${i.html}</div>`,
        )
        .join('')
      const splitClass = r.snippets.length >= 2 ? 'recap-block__split' : ''
      return `
        <div class="recap-block">
          <div class="recap-block__header">
            <span class="recap-block__num">${r.num}</span>
            <span class="recap-block__title">${r.title}</span>
          </div>
          <p>${r.lead}</p>
          <div class="${splitClass}">${snippets}</div>
          ${insights}
        </div>
      `
    })
    .join('')
}

// ── Quiz data ──

interface QuizOption {
  text: string
  code?: string
  correct: boolean
  verdict: string
}

interface QuizQuestion {
  num: number
  title: string
  prompt: string
  options: QuizOption[]
  explain: string
}

const quiz: QuizQuestion[] = [
  {
    num: 1,
    title: 'Какие action.type сгенерирует createSlice',
    prompt:
      'Есть slice:<pre>const slice = createSlice({\n  name: \'cart\',\n  initialState: { items: [] },\n  reducers: {\n    addItem:    (s, a) =&gt; { /* ... */ },\n    removeItem: { reducer: (s, a) =&gt; {}, prepare: (id) =&gt; ({ payload: id }) },\n  },\n})</pre>Какие из утверждений про auto-генерацию верны?',
    options: [
      {
        text: 'A',
        code: `slice.actions.addItem.type === 'cart/addItem'`,
        correct: true,
        verdict:
          'Да. Формула action.type = `${name}/${reducerKey}`. name=\'cart\', reducerKey=\'addItem\'.',
      },
      {
        text: 'B',
        code: `slice.actions.removeItem.type === 'cart/removeItem'`,
        correct: true,
        verdict:
          'Да. { reducer, prepare } object-form даёт ровно тот же type, что и обычный reducer. prepare только меняет payload builder.',
      },
      {
        text: 'C',
        code: `slice.actions.addItem.match(action) — это type-guard`,
        correct: true,
        verdict:
          'Да. У каждого actionCreator, сгенерированного createSlice, есть .match — как у createAction. Сужает тип action.payload.',
      },
      {
        text: 'D',
        code: `slice.caseReducers.addItem — это обёрнутый в Immer reducer`,
        correct: false,
        verdict:
          'Нет, наоборот. slice.caseReducers — это ОРИГИНАЛЬНЫЕ функции, без Immer. Удобно для unit-тестов. Обёрнутая версия — slice.reducer.',
      },
    ],
    explain:
      '<strong>Что генерирует createSlice:</strong> <code>slice.actions.X</code> (creator + .type + .match), <code>slice.reducer</code> (обёрнутый Immer), <code>slice.caseReducers.X</code> (оригинальные функции), <code>slice.getInitialState()</code>, <code>slice.selectors</code> (если указаны) и <code>slice.selectSlice</code>.',
  },

  {
    num: 2,
    title: 'Какие reducer\'ы корректны по правилам Immer',
    prompt:
      'Какие из этих reducer\'ов в <code>createSlice</code> отработают КОРРЕКТНО без runtime-ошибки и без «silent ignore»? (initialState типа <code>{ value: number; list: string[] }</code>)',
    options: [
      {
        text: 'A — мутация поля',
        code:
`increment: (state) => {
  state.value++
  state.list.push(\'x\')
}`,
        correct: true,
        verdict:
          'Да. Прямая мутация draft через поле — идиома Immer. push, ++, = field — всё разрешено.',
      },
      {
        text: 'B — чистый return нового объекта',
        code:
`reset: () => ({ value: 0, list: [] })`,
        correct: true,
        verdict:
          'Да. Immer видит: мутаций нет, возвращён новый объект — использует его как new state.',
      },
      {
        text: 'C — мутация + return',
        code:
`badMix: (state) => {
  state.value = 10
  return { ...state, value: 0 }
}`,
        correct: false,
        verdict:
          'Нет. Immer бросает: «An immer producer returned a new value *and* modified its draft». Выберите одно.',
      },
      {
        text: 'D — замена state через параметр',
        code:
`badReplace: (state) => {
  state = { value: 0, list: [] }
}`,
        correct: false,
        verdict:
          'Не корректно. state — локальная переменная внутри функции. Присвоение её новому объекту ничего не меняет; Immer видит НЕтронутый draft → new state = original. Это silent bug.',
      },
      {
        text: 'E — переприсваивание поля-массива',
        code:
`removeDone: (state) => {
  state.list = state.list.filter((x) => x !== \'done\')
}`,
        correct: true,
        verdict:
          'Да. Присвоение state.ПОЛЕ = новое значение — мутация draft\'а. Работает корректно (в отличие от state = X, которое не работает).',
      },
    ],
    explain:
      '<strong>Правило:</strong> мутируй draft ИЛИ возвращай новый объект, но не оба. Замена самого параметра (<code>state = X</code>) — silent no-op. Замена ПОЛЯ (<code>state.field = X</code>) или мутация поля (<code>state.list.push</code>) — работает.',
  },

  {
    num: 3,
    title: 'reducers callback form — что даёт, что требует',
    prompt:
      'Про callback-синтаксис <code>reducers: (create) =&gt; ({ ... })</code> в RTK 2.x. Какие утверждения верны?',
    options: [
      {
        text: 'A — callback-syntax даёт create.reducer, create.preparedReducer, create.asyncThunk',
        correct: true,
        verdict:
          'Да. Три helper\'а в объекте create, который приходит аргументом в callback.',
      },
      {
        text: 'B — create.asyncThunk работает в обычном createSlice из @reduxjs/toolkit',
        correct: false,
        verdict:
          'Нет. Из документации: «The version of createSlice exported from RTK will throw an error if create.asyncThunk is called.» Нужен свой createAppSlice через buildCreateSlice.',
      },
      {
        text: 'C — buildCreateSlice + asyncThunkCreator нужны только если хотите create.asyncThunk',
        correct: true,
        verdict:
          'Да. Это pattern «конфигурируй и используй» — сделан ради tree-shaking. Если async thunk в slice не нужен, buildCreateSlice не требуется.',
      },
      {
        text: 'D — callback-syntax всегда увеличивает bundle по сравнению с object-syntax',
        correct: false,
        verdict:
          'Нет. Callback без create.asyncThunk стоит ~0 байт поверх object-syntax. Цена (+0.3–0.5 KB gzip) появляется ТОЛЬКО при подключении asyncThunkCreator через buildCreateSlice — потому что тогда createAsyncThunk тащится в bundle.',
      },
      {
        text: 'E — в create.asyncThunk handlers — это pending/fulfilled/rejected/settled',
        correct: true,
        verdict:
          'Да. settled — удобный helper-matcher, срабатывающий и на fulfilled, и на rejected (часто для сброса loading-flag).',
      },
    ],
    explain:
      '<strong>Зачем buildCreateSlice:</strong> в ESM нельзя синхронно условно импортировать. Если бы createSlice сам импортировал createAsyncThunk, bundle всех пользователей тянул бы его. Через <code>buildCreateSlice({ creators: { asyncThunk: asyncThunkCreator } })</code> вы САМИ подключаете async-capability — tree-shaker её видит только у тех, кто это сделал.',
  },

  {
    num: 4,
    title: 'name vs reducerPath — когда различаются',
    prompt:
      'Slice объявлен как <code>createSlice({ name: \'users\', reducerPath: \'data/users\', ... })</code>, подключён в store через <code>combineSlices(slice)</code>. Какие утверждения верны?',
    options: [
      {
        text: 'A',
        code: `slice.actions.add.type === 'users/add'`,
        correct: true,
        verdict:
          'Да. Префикс action.type = name (не reducerPath). name отвечает ТОЛЬКО за type prefix.',
      },
      {
        text: 'B',
        code:
`// state ключ
store.getState()[\'data/users\']
// vs
store.getState().users`,
        correct: true,
        verdict:
          'Правильно, ключ в state = reducerPath (\'data/users\'). state.users будет undefined.',
      },
      {
        text: 'C — reducerPath обязателен для всех slice\'ов',
        correct: false,
        verdict:
          'Нет. По умолчанию reducerPath = name. Различать их нужно только в RTK Query (reducerPath=\'api\' фиксированно) и редких custom-кейсах.',
      },
      {
        text: 'D — slice.selectors автоматически работают и берут state[reducerPath]',
        correct: true,
        verdict:
          'Да. RTK обёртка делает <code>rootState[slice.reducerPath]</code>. Здесь — rootState[\'data/users\'].',
      },
      {
        text: 'E — если положить slice через configureStore({ reducer: { myKey: slice.reducer } }), slice.selectors продолжат работать корректно',
        correct: false,
        verdict:
          'Нет. slice.selectors ждут state[reducerPath] (=\'data/users\'), а положен он будет в state.myKey. Будет undefined. Нужен slice.getSelectors((s) => s.myKey).',
      },
    ],
    explain:
      '<strong>name</strong> — префикс action.type, identifier slice. <strong>reducerPath</strong> — ключ в root state, используется <code>combineSlices</code> и auto-selectors. Разделяйте только если есть конкретная причина; по умолчанию equality = хорошая практика.',
  },

  {
    num: 5,
    title: 'extraReducers vs reducers — что где',
    prompt:
      'У вас есть <code>const userLoggedOut = createAction(\'auth/userLoggedOut\')</code> и <code>const fetchUser = createAsyncThunk(\'user/fetch\', ...)</code>. Новый <code>cartSlice</code> должен: (1) иметь свой action <code>addItem</code>, (2) чиститься на userLoggedOut, (3) показать loading на fetchUser.pending. Какие утверждения про структуру slice верны?',
    options: [
      {
        text: 'A',
        code:
`reducers: {
  addItem: (s, a) => { s.items.push(a.payload) },
  userLoggedOut: () => initial,
}`,
        correct: false,
        verdict:
          'Нет, не сработает. reducerKey \'userLoggedOut\' СГЕНЕРИРУЕТ action.type \'cart/userLoggedOut\' — это ДРУГОЙ action, чем внешний userLoggedOut из authEvents. Внешние actions слушаются ТОЛЬКО через extraReducers.',
      },
      {
        text: 'B',
        code:
`reducers: { addItem: (s, a) => { s.items.push(a.payload) } },
extraReducers: (builder) => {
  builder
    .addCase(userLoggedOut, () => initial)
    .addCase(fetchUser.pending, (s) => { s.loading = true })
}`,
        correct: true,
        verdict:
          'Правильно. Своё — в reducers, чужое — в extraReducers через builder.addCase.',
      },
      {
        text: 'C',
        code:
`extraReducers: {
  [userLoggedOut.type]: () => initial,
  [fetchUser.pending.type]: (s) => { s.loading = true },
}`,
        correct: false,
        verdict:
          'Нет. Object-form extraReducers был deprecated в RTK 1 и УДАЛЁН в RTK 2. Работает только builder-callback.',
      },
      {
        text: 'D',
        code:
`reducers: { addItem: ... },
extraReducers: (builder) => {
  builder.addMatcher(
    (action) => action.type === userLoggedOut.type,
    () => initial,
  )
}`,
        correct: true,
        verdict:
          'Сработает. addMatcher с predicate — альтернатива addCase. Для ОДНОГО action.type addCase идиоматичнее.',
      },
      {
        text: 'E — в extraReducers можно ссылаться на slice.actions.addItem, чтобы создать сложную логику',
        correct: false,
        verdict:
          'Нет. На момент выполнения extraReducers slice ЕЩЁ НЕ ПОСТРОЕН — slice.actions.addItem существует только ПОСЛЕ возврата createSlice. Ссылаться можно только на внешние actions.',
      },
    ],
    explain:
      '<strong>Правило:</strong> <code>reducers</code> = СВОИ actions (генерируются creator + type). <code>extraReducers(builder)</code> = ЧУЖИЕ actions: createAction, другой slice, createAsyncThunk. Ничего не генерируется — только слушаем. Порядок в builder: addCase → addMatcher → addDefaultCase.',
  },

  {
    num: 6,
    title: 'combineSlices vs combineReducers — что нового',
    prompt:
      'Какие утверждения про <code>combineSlices</code> из RTK 2.x верны?',
    options: [
      {
        text: 'A — принимает сам slice-объект (а не .reducer)',
        code:
`combineSlices(counterSlice, userSlice)   // ✓ RTK 2
// vs
combineReducers({
  counter: counterSlice.reducer,
  user:    userSlice.reducer,
})`,
        correct: true,
        verdict:
          'Да. Главное удобство — не надо писать .reducer у каждого, и ключ берётся из slice.reducerPath автоматически.',
      },
      {
        text: 'B — может принимать плоский объект { key: reducer } дополнительно',
        code:
`combineSlices(
  counterSlice,
  userSlice,
  { theme: themeReducer, legacy: oldReducer },
)`,
        correct: true,
        verdict:
          'Правильно. Сигнатура принимает любую смесь slice-объектов и reducer-map\'ов. Полезно для redux-persist, legacy reducers.',
      },
      {
        text: 'C — возвращает reducer с методом .inject() для lazy-loading',
        correct: true,
        verdict:
          'Да. rootReducer.inject({ reducerPath, reducer }) добавляет reducer в runtime. На следующем dispatch\'е state ветка появится.',
      },
      {
        text: 'D — использует slice.name, а не slice.reducerPath, как ключ',
        correct: false,
        verdict:
          'Нет. combineSlices использует ТОЛЬКО reducerPath. Поскольку по умолчанию reducerPath = name, разница не видна в 90% случаев — но формально это reducerPath.',
      },
      {
        text: 'E — есть метод .withLazyLoadedSlices<T>() для типизации опциональных веток state',
        correct: true,
        verdict:
          'Да. Без него RootState не «знает», какие lazy-слайсы МОГУТ появиться. Метод делает их опциональными полями типа.',
      },
    ],
    explain:
      '<strong>combineSlices — superset combineReducers.</strong> Всё, что умеет combineReducers, + принимает slice напрямую, + <code>.inject()</code>, + <code>.withLazyLoadedSlices&lt;T&gt;()</code>, + <code>.selector</code> helper. Для новых проектов на RTK 2 — выбор по умолчанию.',
  },

  {
    num: 7,
    title: 'Lazy injection — что возвращает .injectInto',
    prompt:
      'Вы пишете: <code>export const chartSlice = createSlice({ ... }).injectInto(rootReducer)</code>. Какие утверждения верны?',
    options: [
      {
        text: 'A — .injectInto(root) возвращает копию slice\'а с гарантией, что reducer подключён',
        correct: true,
        verdict:
          'Да. Это главная разница с rootReducer.inject — возвращается именно slice-объект (с actions, selectors, и т.д.), готовый к использованию.',
      },
      {
        text: 'B — на следующем dispatch\'е появится state[chartSlice.reducerPath]',
        correct: true,
        verdict:
          'Да. combineSlices после inject включает новый reducer в root reducer, тот при следующем dispatch\'е получит state[path]=undefined и вернёт initialState.',
      },
      {
        text: 'C — повторный .injectInto того же slice перезаписывает существующий reducer и сбрасывает state',
        correct: false,
        verdict:
          'Нет. Повторный inject — no-op: возвращает тот же объект, reducer сохраняется, state не обнуляется. Это важно — иначе React.lazy при двойном рендере бы сбрасывал фичу.',
      },
      {
        text: 'D — до inject\'а chartSlice.selectors.selectPoints(rootState) безопасно возвращает undefined',
        correct: false,
        verdict:
          'Нет, БРОСИТ. Внутри selector делает rootState[\'chart\'].points — rootState[\'chart\'] undefined → TypeError. Либо инжектите раньше, либо проверяйте state.chart в селекторе.',
      },
      {
        text: 'E — .withLazyLoadedSlices<LazyState>() делает ветки опциональными в RootState',
        correct: true,
        verdict:
          'Да. TS теперь знает: <code>state.chart?: ChartState | undefined</code>. В селекторах форсит проверку.',
      },
    ],
    explain:
      '<strong>Два API для lazy:</strong> <code>rootReducer.inject({ reducerPath, reducer })</code> — низкий уровень для любого reducer\'а. <code>slice.injectInto(rootReducer)</code> — высокий уровень для slice\'ов, возвращает клон slice. Повторный inject — идемпотентная операция.',
  },

  {
    num: 8,
    title: 'current() — что возвращает, когда бросает, что такое original()',
    prompt:
      'Внутри reducer\'а вы хотите залогировать draft. Какие утверждения верны?',
    options: [
      {
        text: 'A',
        code:
`console.log(current(state))   // plain deep copy`,
        correct: true,
        verdict:
          'Да. current(draft) делает полный снапшот draft\'а — plain JS объект без Proxy. Именно для логов.',
      },
      {
        text: 'B',
        code:
`console.log(state)   // тоже plain object — Immer сам раскроет`,
        correct: false,
        verdict:
          'Нет. state в reducer — Proxy от Immer. console.log выведет <code>Proxy(Object) {}</code>, внутренности нечитаемы. Всегда оборачивайте в current().',
      },
      {
        text: 'C',
        code:
`console.log(original(state))   // state ДО reducer\'а`,
        correct: true,
        verdict:
          'Да. original(draft) возвращает ссылку на исходный объект до любых мутаций текущего reducer\'а. Полезно для сравнения «было/стало».',
      },
      {
        text: 'D — current() можно вызвать на plain объекте вне reducer\'а без ошибки',
        correct: false,
        verdict:
          'Нет. current() ожидает draft. Для plain объекта кидает «current() is only called on draft state». Проверить тип — <code>isDraft(value)</code>.',
      },
      {
        text: 'E',
        code:
`if (state.items === original(state)!.items) return   // skip recompute`,
        correct: true,
        verdict:
          'Да. Если поле не меняли, его ссылка === original. Классический ранний return для ленивой пересчитки производных.',
      },
    ],
    explain:
      '<strong>current()</strong> = plain deep copy, бросает на не-draft. <strong>original()</strong> = ссылка на initial draft-state, также бросает на не-draft. <strong>isDraft(x)</strong> — type-guard для safe helper\'ов. Все три — из <code>@reduxjs/toolkit</code> (re-export из immer).',
  },

  {
    num: 9,
    title: 'Какой reducer сломает immutability check?',
    prompt:
      'RTK по умолчанию включает <code>immutableStateInvariantMiddleware</code> (в dev). Он кидает «A state mutation was detected between dispatches», если state мутируют ВНЕ reducer\'а. Какие варианты его <strong>сломают</strong>?',
    options: [
      {
        text: 'A',
        code:
`// in component:
const todos = useSelector((s: RootState) => s.todos.items)
todos.push({ id: \'x\', text: \'y\', done: false })   // мутация прямо в компоненте`,
        correct: true,
        verdict:
          'Да. state.todos.items — замороженный массив из store (RTK делает deepFreeze в dev). Push бросит «Cannot add property X to an immutable object» + immutability middleware triggered.',
      },
      {
        text: 'B',
        code:
`// listener middleware:
listener.startListening({
  matcher: someAction.match,
  effect: (action, api) => {
    const state = api.getState() as RootState
    state.cart.items.push(action.payload)   // мутация вне reducer\'а
  },
})`,
        correct: true,
        verdict:
          'Да. getState() возвращает frozen root state. Мутация в listener/thunk-e — тот же нарушение, что и в компоненте.',
      },
      {
        text: 'C',
        code:
`// in reducer:
reducers: {
  addTodo: (state, action) => {
    state.items.push(action.payload)   // мутация draft — OK
  },
}`,
        correct: false,
        verdict:
          'Не сломает. Внутри reducer\'а state — это Immer draft (Proxy), мутация разрешена и преобразуется в immutable update. Middleware знает, что внутри reducer\'а мутации OK.',
      },
      {
        text: 'D',
        code:
`// in thunk / listener:
const prev = api.getState() as RootState
api.dispatch(someAction())   // создаёт новый state
const next = api.getState() as RootState
// сравниваем prev с next`,
        correct: false,
        verdict:
          'Не сломает — просто читаем два snapshot\'а. Immutability check проверяет, что state не менялся МЕЖДУ dispatch\'ами (identity).',
      },
      {
        text: 'E',
        code:
`// в селекторе вне reducer\'а:
const selectSorted = (s: RootState) => s.items.sort()   // .sort() МУТИРУЕТ массив`,
        correct: true,
        verdict:
          'Да. .sort() мутирует на месте — в frozen state бросит ошибку + triggerит immutability middleware. Используйте <code>[...s.items].sort()</code> или <code>s.items.toSorted()</code> (ES2023).',
      },
    ],
    explain:
      '<strong>Правило:</strong> state, возвращённый из <code>store.getState()</code> или <code>useSelector</code>, <em>заморожен</em> (deepFreeze в dev). Мутировать можно ТОЛЬКО внутри reducer\'а (там Immer даёт draft). Любая мутация вне — ошибка. Для sort/reverse используйте копию или ES2023 <code>toSorted</code>/<code>toReversed</code>.',
  },

  {
    num: 10,
    title: 'slice.selectors под нестандартным путём',
    prompt:
      'Slice с <code>name: \'users\'</code> и без <code>reducerPath</code> (значит reducerPath = \'users\'). В store: <pre>configureStore({\n  reducer: {\n    admin: combineReducers({ users: usersSlice.reducer }),\n  },\n})</pre>Путь реальный: <code>rootState.admin.users</code>. Какие вызовы селектора сработают?',
    options: [
      {
        text: 'A',
        code: `usersSlice.selectors.selectCount(rootState)`,
        correct: false,
        verdict:
          'Не сработает. Обёртка внутри делает rootState[\'users\'] → undefined (нет такого ключа на верхнем уровне) → undefined.items.length → TypeError.',
      },
      {
        text: 'B',
        code:
`const sel = usersSlice.getSelectors((s: RootState) => s.admin.users)
sel.selectCount(rootState)`,
        correct: true,
        verdict:
          'Правильно. getSelectors(stateSelector) перепривязывает корень — внутри будет userSliceState = stateSelector(rootState) = rootState.admin.users.',
      },
      {
        text: 'C',
        code: `usersSlice.selectors.selectCount(rootState.admin.users)`,
        correct: false,
        verdict:
          'Не сработает. usersSlice.selectors — ОБЁРТКА, которая ВНУТРИ делает arg[\'users\']. Если передать уже-отрезанный userSliceState, она возьмёт userSliceState.users → undefined.',
      },
      {
        text: 'D',
        code:
`// Свой createSelector от root:
import { createSelector } from \'@reduxjs/toolkit\'
const selectUsersState = (s: RootState) => s.admin.users
const selectCount = createSelector([selectUsersState], (u) => u.items.length)
selectCount(rootState)`,
        correct: true,
        verdict:
          'Да. Свой селектор обходит всю логику slice.selectors. Чуть многословно, но гибко.',
      },
      {
        text: 'E — можно передать опцию stateSelector при создании slice',
        correct: false,
        verdict:
          'Нет. createSlice не принимает stateSelector. Гибкость даёт slice.getSelectors(stateSelector) ИЛИ комбинируйте через combineSlices, которая использует slice.reducerPath.',
      },
    ],
    explain:
      '<strong>Ловушка C:</strong> <code>usersSlice.selectors.selectCount</code> — это обёртка, внутри она делает <code>state[reducerPath]</code>. Если передать туда уже-выбранный userState, попытается взять <code>userState[\'users\']</code> → undefined. Единственные два решения — <code>slice.getSelectors(stateSelector)</code> ИЛИ собственный <code>createSelector</code>.',
  },
]

// ── Quiz state ──

const selected: Record<number, Set<number>> = {}
const answered: Record<number, boolean> = {}

for (const q of quiz) selected[q.num] = new Set()

function renderQuiz(): void {
  const container = document.getElementById('quiz-container')!
  container.innerHTML = quiz
    .map((q) => {
      const sel = selected[q.num]
      const isAnswered = !!answered[q.num]
      const correctCount = q.options.filter((o) => o.correct).length
      const userCorrect = isAnswered
        ? q.options.every((o, i) => o.correct === sel.has(i))
        : false
      const cardCls = isAnswered
        ? userCorrect
          ? 'answered correct'
          : 'answered wrong'
        : ''
      const opts = q.options
        .map((o, i) => {
          const picked = sel.has(i)
          let cls = 'option'
          if (picked && !isAnswered) cls += ' picked'
          if (isAnswered) {
            cls += ' locked'
            if (o.correct) cls += ' is-correct'
            else if (picked) cls += ' is-wrong-picked'
          }
          const box = isAnswered
            ? o.correct
              ? '✓'
              : picked
                ? '✗'
                : ''
            : picked
              ? '✓'
              : ''
          const code = o.code ? `<div class="option__code">${escapeHtml(o.code)}</div>` : ''
          const verdict = isAnswered
            ? `<div class="option__verdict">${o.verdict}</div>`
            : ''
          return `
            <div class="${cls}" data-q="${q.num}" data-i="${i}">
              <div class="option__box">${box}</div>
              <div class="option__body">
                ${o.text}
                ${code}
                ${verdict}
              </div>
            </div>
          `
        })
        .join('')
      const submit = isAnswered
        ? `<div class="quiz-card__global">
            <strong>${userCorrect ? '✓ Всё верно' : '✗ Не всё совпало'}</strong> —
            правильных вариантов: ${correctCount}. ${q.explain}
          </div>`
        : `<div class="quiz-card__submit">
            <button class="btn btn--accent" data-submit="${q.num}">Проверить</button>
            <span class="quiz-card__multihint">(может быть несколько правильных)</span>
          </div>`
      return `
        <div class="quiz-card ${cardCls}">
          <div class="quiz-card__head">
            <span class="quiz-card__num">Вопрос ${q.num}</span>
            <span class="quiz-card__title">${q.title}</span>
          </div>
          <div class="quiz-card__prompt">${q.prompt}</div>
          <div class="option-list">${opts}</div>
          ${submit}
        </div>
      `
    })
    .join('')

  container.querySelectorAll<HTMLElement>('.option').forEach((el) => {
    el.addEventListener('click', () => {
      const qn = Number(el.dataset.q)
      const i = Number(el.dataset.i)
      if (answered[qn]) return
      const s = selected[qn]
      if (s.has(i)) s.delete(i)
      else s.add(i)
      renderQuiz()
    })
  })
  container.querySelectorAll<HTMLButtonElement>('[data-submit]').forEach((b) => {
    b.addEventListener('click', () => {
      const qn = Number(b.dataset.submit)
      answered[qn] = true
      const q = quiz.find((x) => x.num === qn)!
      const userCorrect = q.options.every((o, i) => o.correct === selected[qn].has(i))
      if (userCorrect) con.success(`Вопрос ${qn}: ✓ правильный ответ`)
      else con.error(`Вопрос ${qn}: ✗ есть расхождения`)
      updateScore()
      renderQuiz()
    })
  })
}

function updateScore(): void {
  let correct = 0
  for (const q of quiz) {
    if (!answered[q.num]) continue
    if (q.options.every((o, i) => o.correct === selected[q.num].has(i))) correct++
  }
  const scoreEl = document.getElementById('score')!
  const barEl = document.getElementById('score-bar')!
  scoreEl.textContent = `${correct} / ${quiz.length}`
  barEl.style.width = `${(correct / quiz.length) * 100}%`
}

// ── Boot ──

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог Quiz D — createSlice глубоко',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

renderRecaps()
renderQuiz()
updateScore()

document.getElementById('reset-quiz')!.addEventListener('click', () => {
  for (const q of quiz) {
    selected[q.num].clear()
    answered[q.num] = false
  }
  con.info('Прогресс сброшен. Пройди ещё раз.')
  renderQuiz()
  updateScore()
})

con.log(
  'Итоговый квиз по секции D (уроки 28-40). Сначала recap с полным кодом (cartSlice.ts, store.ts, CartView.tsx, lazySliceInjection.ts), потом 10 задач с множественным выбором.',
)
con.info(
  'Подсказка: сомневаешься — проверь утверждение в соответствующем уроке. Ссылка на урок 40 в шапке.',
)

// Чтобы panel показывала какие-то dispatches сразу:
store.dispatch(cartSlice.actions.addItem('Тестовый item', 100))
