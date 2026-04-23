import {
  configureStore,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Live mini-store (для DevToolsPanel — чтобы страница была интерактивной) ──

interface CounterState { value: number }

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 } as CounterState,
  reducers: {
    incremented: (s) => { s.value += 1 },
    addBy: (s, a: PayloadAction<number>) => { s.value += a.payload },
    reset: (s) => { s.value = 0 },
  },
})
const store = configureStore({ reducer: { counter: counterSlice.reducer } })

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
    num: 'Уроки 08–09',
    title: 'configureStore — обёртка над legacy_createStore',
    lead:
      '<code>configureStore</code> делает всё, что вы раньше собирали руками: <strong>combineReducers</strong> из объекта-карты, <strong>applyMiddleware</strong> с набором default, <strong>composeWithDevTools</strong>, подключает <strong>autoBatchEnhancer</strong>. Возвращает <code>EnhancedStore</code> — Store + типы middleware/enhancers в дженериках. Это важно: именно из <code>store.dispatch</code> выводится <code>AppDispatch</code> со всеми thunk-overload\'ами.',
    snippets: [
      {
        label: 'legacy-store.ts (как было до RTK)',
        code:
`import { legacy_createStore as createStore, combineReducers, applyMiddleware, compose } from 'redux'
import { thunk } from 'redux-thunk'
import type { Reducer, AnyAction } from 'redux'

interface CounterState { value: number }

const counterReducer: Reducer<CounterState, AnyAction> = (state = { value: 0 }, action) => {
  switch (action.type) {
    case 'counter/incremented': return { value: state.value + 1 }
    case 'counter/reset':       return { value: 0 }
    default: return state
  }
}

// 1) combineReducers вручную
const rootReducer = combineReducers({ counter: counterReducer })

// 2) applyMiddleware вручную
const middlewareEnhancer = applyMiddleware(thunk)

// 3) DevTools — через composeWithDevTools (conditional)
const composeEnhancers =
  (window as unknown as { __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose })
    .__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?? compose

// 4) createStore
export const store = createStore(rootReducer, composeEnhancers(middlewareEnhancer))
`,
      },
      {
        label: 'rtk-store.ts (то же самое через configureStore)',
        code:
`import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface CounterState { value: number }

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 } as CounterState,
  reducers: {
    incremented: (s) => { s.value += 1 },
    addBy: (s, a: PayloadAction<number>) => { s.value += a.payload },
    reset: (s) => { s.value = 0 },
  },
})

export const store = configureStore({
  reducer: { counter: counterSlice.reducer },
})
// Всё. configureStore внутри делает:
//   + combineReducers({ counter })
//   + applyMiddleware(thunk, immutableCheck, serializableCheck, actionCreatorCheck)
//   + composeWithDevTools({ trace: false })
//   + autoBatchEnhancer()
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>EnhancedStore, не Store.</strong> В типах — <code>EnhancedStore&lt;S, A, M, E&gt;</code>: M и E держат реальные типы middleware/enhancers. Поэтому <code>typeof store.dispatch</code> знает про thunk и возвращает настоящий <code>AppDispatch</code>.',
      },
      {
        kind: 'trap',
        html:
          '<strong>Один store на приложение.</strong> <code>configureStore</code> нельзя вызывать несколько раз для одного приложения. Если нужны изолированные state — используйте <code>combineSlices</code>, <code>reducerPath</code>-ключи или несколько <code>Provider</code> с разными store.',
      },
    ],
  },
  {
    num: 'Урок 10',
    title: 'reducer-параметр: object-map vs combineReducers vs функция',
    lead:
      'Опция <code>reducer</code> принимает <strong>три формы</strong>. Самая частая — объект-карта slices: RTK сам вызовет <code>combineReducers</code>. Можно передать уже собранный <code>combineReducers({...})</code> — полезно, если нужно обернуть root reducer для reset/hydration. Или целиком функцию — низкоуровневый вариант.',
    snippets: [
      {
        label: 'store.ts — три формы reducer',
        code:
`import {
  configureStore,
  combineReducers,
  createSlice,
  type Reducer,
  type Action,
} from '@reduxjs/toolkit'

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: { incremented: (s) => { s.value += 1 } },
})
const todosSlice = createSlice({
  name: 'todos',
  initialState: { items: [] as string[] },
  reducers: { added: (s, a: { payload: string }) => { s.items.push(a.payload) } },
})

// ─── ФОРМА 1 — object-map (рекомендуется) ───
export const storeA = configureStore({
  reducer: {
    counter: counterSlice.reducer,
    todos:   todosSlice.reducer,
  },
  // configureStore сам вызовет combineReducers({ counter, todos })
})

// ─── ФОРМА 2 — combineReducers вручную ───
// полезно, если нужно обернуть rootReducer для reset-all
const rootReducer = combineReducers({
  counter: counterSlice.reducer,
  todos:   todosSlice.reducer,
})
type RootShape = ReturnType<typeof rootReducer>

const wrappedReducer: Reducer<RootShape, Action> = (state, action) => {
  if (action.type === 'app/resetAll') return rootReducer(undefined, action)
  return rootReducer(state, action)
}

export const storeB = configureStore({ reducer: wrappedReducer })

// ─── ФОРМА 3 — чистая функция ───
// вы сами комбинируете state
export const storeC = configureStore({
  reducer: (state: RootShape | undefined, action) => ({
    counter: counterSlice.reducer(state?.counter, action),
    todos:   todosSlice.reducer(state?.todos, action),
  }),
})
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>Форма 1 (object-map) покрывает 95% кейсов.</strong> Форма 2 — когда нужен обёрнутый rootReducer (reset всего state одним action, lazy injection через <code>combineSlices.inject</code>). Форма 3 — крайне редко.',
      },
      {
        kind: 'trap',
        html:
          '<strong>Без combineReducers нет ключей.</strong> Если передать голый <code>reducer: counterSlice.reducer</code> (функция), <code>store.getState()</code> вернёт <strong>только counter state</strong> — никакого объединения не произойдёт.',
      },
    ],
  },
  {
    num: 'Уроки 11–14',
    title: 'Три invariant-middleware + thunk — что включено по умолчанию',
    lead:
      'По умолчанию <code>getDefaultMiddleware()</code> возвращает <strong>Tuple</strong> из четырёх: <code>actionCreatorCheck</code> → <code>immutableCheck</code> → <code>serializableCheck</code> → <code>thunk</code>. Порядок важен: сначала проверки, потом thunk. В <strong>production</strong> три invariant-проверки автоматически вырезаются (<code>process.env.NODE_ENV === \'production\'</code>) — остаётся только thunk.',
    snippets: [
      {
        label: 'middleware-setup.ts — все три формы кастомизации',
        code:
`import { configureStore, createListenerMiddleware, type Middleware } from '@reduxjs/toolkit'
import { rootReducer } from './rootReducer'

// кастомный logger для примера
const logger: Middleware = (_store) => (next) => (action) => {
  console.log('[logger]', (action as { type: string }).type)
  return next(action)
}
const listenerMw = createListenerMiddleware()

// ─── 1. Просто добавить свой middleware к default ───
export const store1 = configureStore({
  reducer: rootReducer,
  middleware: (gdm) => gdm().concat(logger),
})

// ─── 2. listener middleware — ВСЕГДА prepend (должен быть первым) ───
export const store2 = configureStore({
  reducer: rootReducer,
  middleware: (gdm) => gdm().prepend(listenerMw.middleware),
})

// ─── 3. Отключить/настроить конкретную проверку ───
export const store3 = configureStore({
  reducer: rootReducer,
  middleware: (gdm) => gdm({
    // thunk: полностью убрать или передать extraArgument
    thunk: { extraArgument: { api: 'https://api.example.com' } },

    // immutableCheck: ignore heavy paths
    immutableCheck: {
      ignoredPaths: ['cache', /^rtkq\\./],
      warnAfter: 64,
    },

    // serializableCheck: redux-persist compat
    serializableCheck: {
      ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      ignoredPaths: ['_persist'],
    },

    // actionCreatorCheck: можно целиком отключить
    actionCreatorCheck: false,
  }),
})
`,
      },
      {
        label: 'non-serializable-examples.ts — что поймает serializableCheck',
        code:
`import { store } from './store'

// ❌ 1. Date — инстанс класса
store.dispatch({ type: 'event/set', payload: new Date() })

// ❌ 2. Map / Set
store.dispatch({ type: 'cache/set', payload: new Map([['a', 1]]) })
store.dispatch({ type: 'tags/set', payload: new Set(['x', 'y']) })

// ❌ 3. Promise — thenable
store.dispatch({ type: 'load/start', payload: Promise.resolve(1) })

// ❌ 4. Function
store.dispatch({ type: 'set/fn', payload: () => 'hi' })

// ❌ 5. class instance
class User { constructor(public name: string) {} }
store.dispatch({ type: 'user/set', payload: new User('Bob') })

// ❌ 6. DOM / FormData / Blob / File
store.dispatch({ type: 'form/set', payload: new FormData() })
store.dispatch({ type: 'el/set', payload: document.body })

// ❌ 7. nested — middleware видит и вложенные
store.dispatch({
  type: 'meta/set',
  payload: { when: new Date(), data: [1, 2, 3] },  // .when не-сериализуем
})

// ✅ Допустимо: primitive / plain object / array из примитивов
store.dispatch({ type: 'counter/add', payload: 5 })
store.dispatch({ type: 'user/set', payload: { id: 1, name: 'Bob' } })
store.dispatch({ type: 'date/set', payload: new Date().toISOString() })  // ← строка, ОК
`,
      },
      {
        label: 'action-invariant-examples.ts — что поймает actionCreatorCheck',
        code:
`import { createSlice } from '@reduxjs/toolkit'
import { store } from './store'

const slice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: { incremented: (s) => { s.value += 1 } },
})
const { incremented } = slice.actions

// ❌ забыли скобки — dispatch получает САМ actionCreator (функцию)
// actionCreatorCheck пишет console.warn; без него — reducer молча пропускает
store.dispatch(incremented as unknown as ReturnType<typeof incremented>)

// ❌ то же с thunk.fulfilled:
// store.dispatch(fetchUser.fulfilled) — без ()

// ✅ правильно
store.dispatch(incremented())
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>immutableCheck</strong> делает <em>два</em> прохода: до reducer\'а снимает snapshot через <code>trackProperties</code>, после — сравнивает <code>detectMutations</code>. Плюс второй проход <em>между</em> dispatch\'ами — ловит мутации из селекторов/компонентов.',
      },
      {
        kind: 'key',
        html:
          '<strong>serializableCheck</strong> использует <code>findNonSerializableValue</code> — рекурсивный обход с WeakMap-кешем проверенных нод. <code>ignoredPaths</code> принимает <code>string | RegExp</code>. Оба warning-only, не throw.',
      },
      {
        kind: 'trap',
        html:
          '<strong>actionCreatorCheck</strong> ловит <code>dispatch(fn)</code> где у <code>fn</code> есть <code>.type</code>-строка. Обычная функция без <code>.type</code> (например, thunk) не матчится — middleware её пропустит, и thunk middleware её выполнит.',
      },
      {
        kind: 'good',
        html:
          '<strong>В production все invariant-проверки удаляются автоматически.</strong> RTK смотрит <code>process.env.NODE_ENV</code>. Бандл становится легче, а проверки — ноль runtime-оверхеда.',
      },
    ],
  },
  {
    num: 'Урок 15',
    title: 'getDefaultEnhancers + autoBatchEnhancer',
    lead:
      'Enhancer — это обёртка над <code>createStore</code>: перехватывает <em>все</em> методы store (dispatch, subscribe, getState, replaceReducer). <code>getDefaultEnhancers()</code> возвращает Tuple: <code>[autoBatchEnhancer(), middlewareEnhancer]</code>. <code>autoBatchEnhancer</code> объединяет subscriber-уведомления для actions с <code>meta.SHOULD_AUTOBATCH === true</code> — за один тик пачка из 100 dispatch\'ей вызовет <em>один</em> re-render React.',
    snippets: [
      {
        label: 'enhancers-setup.ts',
        code:
`import { configureStore, prepareAutoBatched, createSlice } from '@reduxjs/toolkit'
import type { StoreEnhancer } from '@reduxjs/toolkit'

// свой enhancer (для примера — считает dispatch'и)
const dispatchCounterEnhancer: StoreEnhancer = (createStore) => (reducer, preload) => {
  const store = createStore(reducer, preload)
  let count = 0
  return {
    ...store,
    dispatch: (action: unknown) => {
      count++
      console.log(\`[enh] dispatch #\${count}\`, action)
      return (store.dispatch as (a: unknown) => unknown)(action)
    },
  } as typeof store
}

const slice = createSlice({
  name: 'data',
  initialState: { items: [] as number[] },
  reducers: {
    // SHOULD_AUTOBATCH через prepare — subscriber обновится 1 раз на пачку
    added: {
      reducer: (s, a: { payload: number }) => { s.items.push(a.payload) },
      prepare: prepareAutoBatched<number>(),
    },
  },
})

// ❌ НЕПРАВИЛЬНО: теряем default enhancers (autoBatch + applyMiddleware)
const broken = configureStore({
  reducer: { data: slice.reducer },
  enhancers: () => [dispatchCounterEnhancer],  // ← нет gde()!
})

// ✅ ПРАВИЛЬНО: gde() + concat
export const store = configureStore({
  reducer: { data: slice.reducer },
  enhancers: (gde) => gde().concat(dispatchCounterEnhancer),
})

// ✅ Настроить autoBatch режим (raf / tick / timer / callback)
export const storeTick = configureStore({
  reducer: { data: slice.reducer },
  enhancers: (gde) => gde({
    autoBatch: { type: 'tick' },   // Promise.resolve().then(), ~0ms
  }),
})
`,
      },
      {
        label: 'auto-batched-dispatch.ts — способы пометить action',
        code:
`import { prepareAutoBatched, createSlice } from '@reduxjs/toolkit'

// ─── Способ 1: через prepare в createSlice ───
const slice = createSlice({
  name: 'data',
  initialState: { items: [] as number[] },
  reducers: {
    added: {
      reducer: (s, a: { payload: number }) => { s.items.push(a.payload) },
      prepare: prepareAutoBatched<number>(),
      // ↑ добавляет meta.SHOULD_AUTOBATCH = true
    },
  },
})

// ─── Способ 2: вручную в meta ───
store.dispatch({
  type: 'data/bulk',
  payload: rows,
  meta: { SHOULD_AUTOBATCH: true },
})

// ─── Пример: 100 dispatch подряд ───
for (let i = 0; i < 100; i++) {
  store.dispatch(slice.actions.added(i))
}
// Все 100 actions попадают в DevTools.
// НО subscriber (и все React-подписчики) получат УВЕДОМЛЕНИЕ 1 раз.
// В DevTools видно 100 actions, в React виден 1 render.
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>enhancer ≠ middleware.</strong> Middleware перехватывает <em>только actions</em>. Enhancer оборачивает весь store — может подменить <code>dispatch</code>, <code>subscribe</code>, <code>getState</code>. <code>applyMiddleware</code> — сам один из enhancers.',
      },
      {
        kind: 'trap',
        html:
          '<strong>Опция enhancers без <code>getDefaultEnhancers()</code> убивает autoBatch и applyMiddleware.</strong> Правильно: <code>(gde) =&gt; gde().concat(myEnh)</code>. Неправильно: <code>() =&gt; [myEnh]</code> — ваш middleware перестанет работать.',
      },
      {
        kind: 'good',
        html:
          '<strong>RTK Query и createListenerMiddleware используют autoBatch.</strong> Их внутренние actions (<code>api/subscriptionsUpdated</code> и т.п.) помечены <code>SHOULD_AUTOBATCH</code>. Поэтому 50 одновременных query не вызывают 50 рендеров — всё батчится.',
      },
    ],
  },
  {
    num: 'Урок 16',
    title: 'Tuple — почему обычный массив ломает типы',
    lead:
      '<code>Tuple&lt;Items extends ReadonlyArray&lt;unknown&gt;&gt;</code> — расширение <code>Array</code>, у которого <code>concat&lt;Adds&gt;(adds): Tuple&lt;[...Items, ...Adds]&gt;</code>. Обычный <code>Array.prototype.concat</code> возвращает <code>T[]</code> — сужает типы до общего. В итоге <code>thunk</code> в массиве теряет свой <code>ThunkDispatch</code>-overload, и <code>store.dispatch(myThunk())</code> падает TS.',
    snippets: [
      {
        label: 'tuple-vs-array.ts',
        code:
`import { configureStore, Tuple, type Middleware } from '@reduxjs/toolkit'
import { thunk } from 'redux-thunk'
import { rootReducer } from './rootReducer'

const myLogger: Middleware = () => (next) => (action) => next(action)

// ❌ ОБЫЧНЫЙ МАССИВ — TS-ошибка в RTK 2.x
// Type 'Middleware[]' is missing: 'prepend' | 'concat' from Tuple<Middlewares>
const broken = configureStore({
  reducer: rootReducer,
  // @ts-expect-error — demo
  middleware: () => [thunk, myLogger],
})

// ✅ РЕШЕНИЕ 1: gdm().concat(...) — gdm уже возвращает Tuple
export const storeA = configureStore({
  reducer: rootReducer,
  middleware: (gdm) => gdm().concat(myLogger),
})

// ✅ РЕШЕНИЕ 2: new Tuple(...)
export const storeB = configureStore({
  reducer: rootReducer,
  middleware: () => new Tuple(thunk, myLogger),
})

// То же для enhancers:
export const storeC = configureStore({
  reducer: rootReducer,
  enhancers: (gde) => gde().concat(/* myEnhancer */),
})
`,
      },
      {
        label: 'why-array-breaks-dispatch.ts',
        code:
`// Представь, что у TS это работает (@ts-ignore). Что происходит с типом dispatch?

// С обычным массивом:
//   middleware: () => [thunk, myLogger]  // тип: Middleware[]
// configureStore НЕ ВИДИТ thunk-overload отдельно
//   AppDispatch = Dispatch<Action>  (НЕ ThunkDispatch)
// Тогда:
store.dispatch(fetchUsers())  // ❌ Argument of type 'ThunkAction' is not assignable to 'AnyAction'

// С Tuple:
//   middleware: (gdm) => gdm().concat(myLogger)  // тип: Tuple<[ThunkMiddleware, ..., Middleware]>
// configureStore ВИДИТ ThunkMiddleware отдельно
//   AppDispatch = ThunkDispatch & Dispatch
store.dispatch(fetchUsers())  // ✅ OK
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>Ключ — сигнатура <code>concat</code>.</strong> У <code>Tuple</code>: <code>concat&lt;Adds&gt;(adds): Tuple&lt;[...Items, ...Adds]&gt;</code> — кортежный тип сохраняется. У <code>Array</code>: <code>concat(items: T | T[]): T[]</code> — всё сводится к одному <code>T</code>.',
      },
      {
        kind: 'trap',
        html:
          '<strong><code>as const</code> не подходит.</strong> <code>[thunk, myMw] as const</code> даёт readonly tuple, но internal-код RTK вызывает <code>.concat</code>/<code>.push</code>. Поэтому был введён <code>Tuple</code>-класс — обычный mutable массив с лучшими типами.',
      },
    ],
  },
  {
    num: 'Урок 17',
    title: 'devTools: trace, predicate, actionsDenylist',
    lead:
      'Опция <code>devTools</code> передаётся в <code>composeWithDevToolsExtension(options)</code>. Полезные поля: <code>trace</code> (stack для каждого action), <code>actionsDenylist</code> / <code>actionsAllowlist</code> (regex-фильтры), <code>predicate(state, action)</code> (динамическое условие), <code>actionSanitizer</code> / <code>stateSanitizer</code> (скрыть секреты в DevTools, не трогая store). В production — <strong>обязательно</strong> <code>devTools: false</code>.',
    snippets: [
      {
        label: 'devtools-options.ts',
        code:
`import { configureStore } from '@reduxjs/toolkit'
import { rootReducer } from './rootReducer'

export const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production' && {
    name: 'MyApp',
    trace: true,               // stack-trace для каждого dispatch (~3-5ms)
    traceLimit: 25,
    maxAge: 50,                // сколько actions держать в истории

    // Фильтры
    actionsDenylist: ['^counter/tick$', '^pointer/'],   // не показывать
    actionsAllowlist: ['^user/', '^auth/'],             // показывать только эти
    predicate: (_state, action) =>
      (action as { type: string }).type !== 'noisy',    // динамика

    // Скрыть секреты
    actionSanitizer: (action: { type: string; password?: string }) =>
      action.type === 'auth/login'
        ? { ...action, password: '***' }
        : action,
    stateSanitizer: (state: unknown) => {
      const s = state as { auth?: { token?: string } }
      if (s.auth?.token) return { ...s, auth: { ...s.auth, token: '***' } }
      return s
    },
  },
})
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>denylist vs allowlist vs predicate.</strong> denylist — «пропустить эти». allowlist — «оставить только эти». predicate — функция, вызывается для каждого action: если вернула <code>false</code>, action не записывается в DevTools (но reducer его обрабатывает нормально).',
      },
      {
        kind: 'good',
        html:
          '<strong>Sanitizer — только для DevTools.</strong> В реальный store попадает оригинальный payload/state. Хорошо для PII, токенов, паролей в логах debug-сессий.',
      },
      {
        kind: 'trap',
        html:
          '<strong><code>trace: true</code> дорого.</strong> RTK делает <code>new Error().stack</code> на каждый dispatch. В проде <strong>точно false</strong>, в dev включайте только когда ищете, кто dispatch\'ит непонятный action.',
      },
    ],
  },
  {
    num: 'Урок 18',
    title: 'preloadedState — hydration из localStorage / SSR / тесты',
    lead:
      '<code>preloadedState</code> передаётся в <code>createStore</code> как начальное значение. Покрывает три сценария: <strong>localStorage hydration</strong> (сохраняем state между сессиями), <strong>SSR</strong> (сервер отрисовал state, клиент продолжает), <strong>тесты</strong> (создаём store с нужным состоянием). Если <code>preloadedState[key]</code> задан — <code>initialState</code> slice для этого куска игнорируется.',
    snippets: [
      {
        label: 'hydration.ts — localStorage pattern',
        code:
`import { configureStore, type Middleware } from '@reduxjs/toolkit'
import { rootReducer } from './rootReducer'
import type { RootState } from './store'

const STORAGE_KEY = 'app-state-v1'

// ─── 1. Загрузить state ───
function loadState(): Partial<RootState> | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { version: number; state: Partial<RootState> }
    if (parsed.version !== 1) return undefined   // примитивная миграция
    return parsed.state
  } catch {
    return undefined
  }
}

// ─── 2. Создать store с preloadedState ───
export const store = configureStore({
  reducer: rootReducer,
  preloadedState: loadState(),
})

// ─── 3. Сохранять подмножество state при изменениях ───
function throttle<T extends (...args: never[]) => unknown>(fn: T, ms: number): T {
  let last = 0
  return ((...args: never[]) => {
    const now = Date.now()
    if (now - last < ms) return
    last = now
    return fn(...args)
  }) as T
}

store.subscribe(throttle(() => {
  const { auth, theme } = store.getState()   // только нужные slices
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, state: { auth, theme } }),
    )
  } catch { /* quota / private mode */ }
}, 1000))
`,
      },
      {
        label: 'ssr-and-tests.ts',
        code:
`import { configureStore } from '@reduxjs/toolkit'
import { rootReducer } from './rootReducer'
import type { RootState } from './store'

// ─── SSR: сервер передаёт initialState в клиент ───
export function createStoreForSSR(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
  })
}

// Next.js pattern:
//   const store = useMemo(() => createStoreForSSR(pageProps.initialReduxState), [pageProps.initialReduxState])

// ─── Тесты: сразу подсовываем нужное состояние ───
import { describe, it, expect } from 'vitest'

describe('Counter', () => {
  it('increments from 5', () => {
    const store = configureStore({
      reducer: rootReducer,
      preloadedState: { counter: { value: 5 } } as Partial<RootState>,
    })
    store.dispatch({ type: 'counter/incremented' })
    expect(store.getState().counter.value).toBe(6)
  })
})
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>preloadedState побеждает initialState.</strong> Redux при первом <code>@@INIT</code> передаёт reducer <code>state = preloadedState[key]</code>. Если в preloaded есть значение — slice\'овый <code>initialState</code> не используется для этого ключа.',
      },
      {
        kind: 'trap',
        html:
          '<strong>Схема меняется — localStorage ломается.</strong> Версия 2 приложения читает v1-данные и падает на <code>undefined</code>-полях. Решение: версионирование (<code>{ version, state }</code>), миграции, или <code>try/catch + clear()</code> при ошибке. Для серьёзных случаев — <code>redux-persist</code>.',
      },
      {
        kind: 'good',
        html:
          '<strong>Частичный preloadedState — ОК.</strong> Тип — <code>Partial&lt;RootState&gt;</code>. Отсутствующие ключи инициализируются из <code>initialState</code> slice\'ов. Поэтому можно сохранять только <code>auth</code> + <code>theme</code>, а <code>cache</code> RTK Query восстановится пустым.',
      },
    ],
  },
  {
    num: 'Урок 19',
    title: 'RootState, AppDispatch, withTypes — финальная типизация',
    lead:
      'Типы всегда <strong>выводим из store</strong>, не пишем руками. Это гарантирует, что при добавлении slice или thunk-middleware типы обновляются автоматически. <code>useSelector.withTypes&lt;RootState&gt;()</code> (react-redux 9.1+) — статический каст дженериков, <strong>identity в рантайме</strong>.',
    snippets: [
      {
        label: 'app/store.ts',
        code:
`import { configureStore } from '@reduxjs/toolkit'
import { counterSlice } from '../features/counter/counterSlice'
import { todosSlice } from '../features/todos/todosSlice'

export const store = configureStore({
  reducer: {
    counter: counterSlice.reducer,
    todos:   todosSlice.reducer,
  },
})

// Выводим типы ИЗ store, не объявляем руками
export type AppStore   = typeof store
export type RootState  = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
`,
      },
      {
        label: 'app/hooks.ts',
        code:
`import { useDispatch, useSelector, useStore } from 'react-redux'
import type { RootState, AppDispatch, AppStore } from './store'

// ─── Новый способ (react-redux 9.1+): .withTypes() ───
// Identity в рантайме — только статическая типизация.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
export const useAppStore    = useStore.withTypes<AppStore>()

// ─── Старый способ (react-redux < 9.1) — для сравнения ───
// import type { TypedUseSelectorHook } from 'react-redux'
// export const useAppDispatch: () => AppDispatch = useDispatch
// export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
`,
      },
      {
        label: 'features/counter/Counter.tsx',
        code:
`import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { counterSlice } from './counterSlice'

export function Counter() {
  // value выведется как number — из RootState
  const value = useAppSelector((s) => s.counter.value)
  // dispatch знает про thunk-overload
  const dispatch = useAppDispatch()
  return (
    <button onClick={() => dispatch(counterSlice.actions.incremented())}>
      {value}
    </button>
  )
}
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>withTypes работает и у <code>createSelector</code>.</strong> <code>createSelector.withTypes&lt;RootState&gt;()</code> даёт каррированную форму, где input-селекторы уже знают свой <code>state</code>. Аналогично: <code>startListening.withTypes</code>, <code>addListener.withTypes</code>.',
      },
      {
        kind: 'trap',
        html:
          '<strong>Импорт <code>useDispatch</code> напрямую — источник багов.</strong> Без <code>useAppDispatch</code> TS не знает про thunk, и <code>dispatch(myThunk())</code> падает: «ThunkAction is not assignable to AnyAction». Экспортируйте <code>useAppDispatch</code> из <code>hooks.ts</code> и всегда импортируйте оттуда.',
      },
      {
        kind: 'good',
        html:
          '<strong><code>configureStore</code> — единственный источник правды для типов.</strong> Добавили slice — <code>RootState</code> обновился. Добавили middleware с extra — <code>AppDispatch</code> подхватил новый overload. Никаких ручных деклараций.',
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
    title: 'Какой код бросит warning от serializableCheck',
    prompt:
      'Default serializableCheck проверяет каждый action.payload и state на не-сериализуемость. Какие из этих dispatch\'ей вызовут <strong>warning</strong> в консоли?',
    options: [
      {
        text: 'Date в payload',
        code: `store.dispatch({ type: 'event/set', payload: new Date() })`,
        correct: true,
        verdict:
          'Да. <code>Date</code> — инстанс класса, не plain object. Решение: <code>new Date().toISOString()</code>.',
      },
      {
        text: 'FormData в payload',
        code: `store.dispatch({ type: 'form/set', payload: new FormData() })`,
        correct: true,
        verdict:
          'Да. <code>FormData</code> — не-plain объект, не сериализуется в JSON. В store такое класть нельзя.',
      },
      {
        text: 'plain object с вложенным массивом примитивов',
        code: `store.dispatch({ type: 'user/set', payload: { id: 1, tags: ['a','b'] } })`,
        correct: false,
        verdict:
          'Нет. Всё — примитивы и plain-структуры. Сериализуется в JSON без потерь.',
      },
      {
        text: 'nested объект с Date глубоко внутри',
        code:
`store.dispatch({
  type: 'meta/set',
  payload: { when: new Date(), data: [1, 2, 3] },
})`,
        correct: true,
        verdict:
          'Да. <code>findNonSerializableValue</code> рекурсивный — путь <code>action.payload.when</code> будет в warning. Плоский ли payload — неважно.',
      },
    ],
    explain:
      'Что считается сериализуемым: <code>null/undefined</code>, boolean/number/string/bigint, plain object (из <code>{}</code> или <code>Object.create(null)</code>), Array из сериализуемых. Всё остальное — Date, Map/Set, Promise, Function, class instance, DOM/File/Blob/FormData — <strong>warning</strong>. Middleware рекурсивно обходит весь payload и state, ловит по пути.',
  },

  {
    num: 2,
    title: 'Как правильно добавить middleware, не теряя default',
    prompt:
      'Нужно добавить свой <code>logger</code> middleware к конфигурации store. Какие варианты <strong>сохранят</strong> все default middleware (thunk + 3 invariant)?',
    options: [
      {
        text: 'A',
        code:
`middleware: (gdm) => gdm().concat(logger)`,
        correct: true,
        verdict:
          'Правильно. <code>gdm()</code> возвращает Tuple с default middleware, <code>.concat</code> добавляет свой — типы сохраняются.',
      },
      {
        text: 'B',
        code:
`middleware: (gdm) => gdm().prepend(logger)`,
        correct: true,
        verdict:
          'Тоже правильно. <code>prepend</code> ставит logger <em>перед</em> default. Используйте, если ваш middleware должен перехватить action первым (listenerMiddleware — именно так).',
      },
      {
        text: 'C',
        code:
`middleware: () => [thunk, immutableCheck, serializableCheck, actionCreatorCheck, logger]`,
        correct: false,
        verdict:
          'Нет. Ручной массив потеряет типы (не Tuple) и не применит production-оптимизации (invariant\'ы всегда будут включены, даже в prod). Плюс это повторная работа.',
      },
      {
        text: 'D',
        code:
`middleware: (gdm) => new Tuple(logger).concat(gdm())`,
        correct: true,
        verdict:
          'Работает, но необычно. Результат тот же, что <code>gdm().prepend(logger)</code>. Просто менее идиоматично.',
      },
    ],
    explain:
      '<strong>Ключевое правило:</strong> всегда начинайте с <code>gdm()</code> (или <code>new Tuple(...)</code>), чтобы сохранить Tuple-типы. Именно через Tuple проходит <code>ThunkMiddleware</code>-overload в <code>AppDispatch</code>. Обычный массив — и <code>store.dispatch(myThunk())</code> падает TS-ошибкой.',
  },

  {
    num: 3,
    title: 'Какой тип возвращает getDefaultMiddleware()',
    prompt:
      'Что такое <code>Tuple</code> и зачем он нужен вместо обычного массива? Отметьте <strong>все верные</strong> утверждения.',
    options: [
      {
        text: 'Tuple extends Array и добавляет типизированные concat / prepend, сохраняющие кортежный тип',
        correct: true,
        verdict:
          'Верно. <code>class Tuple&lt;Items&gt; extends Array</code>. У <code>concat&lt;Adds&gt;</code> возвращаемый тип — <code>Tuple&lt;[...Items, ...Adds]&gt;</code>, а у <code>Array.concat</code> — <code>T[]</code> (сужается).',
      },
      {
        text: 'Без Tuple store.dispatch теряет ThunkDispatch-overload',
        correct: true,
        verdict:
          'Верно. <code>configureStore</code> смотрит на конкретные типы middleware в массиве. Если массив сведён к <code>Middleware[]</code>, thunk-тип теряется — <code>dispatch(myThunk())</code> падает.',
      },
      {
        text: '<code>as const</code> на массиве [thunk, myMw] решает проблему',
        correct: false,
        verdict:
          'Нет. <code>as const</code> даёт readonly tuple, но internal-код RTK вызывает mutable-методы (<code>push</code>, <code>concat</code>) — поэтому был выбран класс <code>Tuple</code>, а не <code>as const</code>.',
      },
      {
        text: 'Tuple работает только для middleware; для enhancers нужно что-то другое',
        correct: false,
        verdict:
          'Нет. <code>getDefaultEnhancers()</code> возвращает <strong>тот же Tuple</strong>. <code>(gde) =&gt; gde().concat(myEnh)</code> — идентичная форма.',
      },
    ],
    explain:
      '<code>Tuple</code> — это чисто TypeScript-решение для сохранения кортежного типа через <code>concat</code>/<code>prepend</code>. Ключевая сигнатура:\n<pre>concat&lt;Adds extends ReadonlyArray&lt;unknown&gt;&gt;(adds: Adds): Tuple&lt;[...Items, ...Adds]&gt;</pre>Без неё thunk-типы теряются, и typed dispatch ломается.',
  },

  {
    num: 4,
    title: 'Что именно делает autoBatchEnhancer',
    prompt:
      'Отметьте <strong>все верные</strong> утверждения про <code>autoBatchEnhancer</code>.',
    options: [
      {
        text: 'Объединяет уведомления subscribers для actions с meta.SHOULD_AUTOBATCH === true',
        correct: true,
        verdict:
          'Да. Это его основной контракт. Actions без флага проходят как обычно.',
      },
      {
        text: 'Пропускает actions — в DevTools их меньше',
        correct: false,
        verdict:
          'Нет. <strong>Все</strong> actions попадают в DevTools и reducer. Батчатся только <em>уведомления subscribers</em> (React re-renders).',
      },
      {
        text: 'Работает в режимах raf / tick / timer / callback — настраивается через enhancers option',
        correct: true,
        verdict:
          'Да. <code>enhancers: (gde) =&gt; gde({ autoBatch: { type: \'tick\' } })</code>. Default — raf (requestAnimationFrame, ~16ms).',
      },
      {
        text: 'RTK Query и createListenerMiddleware используют его для своих внутренних actions',
        correct: true,
        verdict:
          'Да. Они помечают <code>meta.SHOULD_AUTOBATCH = true</code> на своих служебных actions — поэтому 50 одновременных query не вызывают 50 рендеров.',
      },
    ],
    explain:
      '<strong>Ключевое различие:</strong> dispatch → reducer → DevTools работают синхронно для каждого action. <em>Subscriber-уведомления</em> (вызов подписчиков через <code>store.subscribe</code>, включая react-redux) — батчатся. Пометить action можно через <code>prepareAutoBatched&lt;T&gt;()</code> в reducer prepare или руками: <code>meta: { SHOULD_AUTOBATCH: true }</code>.',
  },

  {
    num: 5,
    title: 'Как правильно добавить свой enhancer',
    prompt:
      'Нужен кастомный <code>myEnhancer</code> в дополнение к default (autoBatch + applyMiddleware). Какие варианты <strong>сохранят</strong> default enhancers?',
    options: [
      {
        text: 'A',
        code: `enhancers: (gde) => gde().concat(myEnhancer)`,
        correct: true,
        verdict:
          'Правильно. gde() возвращает Tuple с [autoBatch, applyMiddleware], concat добавляет ваш.',
      },
      {
        text: 'B',
        code: `enhancers: () => [myEnhancer]`,
        correct: false,
        verdict:
          '<strong>Убийственно</strong>. Теряются <code>autoBatchEnhancer</code> и <code>applyMiddleware</code> — ваш middleware перестаёт работать вообще. Это классический баг.',
      },
      {
        text: 'C',
        code: `enhancers: (gde) => gde({ autoBatch: { type: 'tick' } }).concat(myEnhancer)`,
        correct: true,
        verdict:
          'Правильно. <code>gde({ options })</code> возвращает тот же Tuple, но с перенастроенным autoBatch.',
      },
      {
        text: 'D',
        code: `enhancers: (gde) => gde().prepend(myEnhancer)`,
        correct: true,
        verdict:
          'Работает. Порядок enhancers влияет на composition — prepend поставит ваш перед autoBatch.',
      },
    ],
    explain:
      '<strong>Правило:</strong> любая функция <code>enhancers</code> должна начинаться с <code>gde()</code> — иначе теряются default. Симптомы: «мой thunk не работает» (нет <code>applyMiddleware</code>), «100 dispatch вызывают 100 рендеров» (нет autoBatch). Тот же принцип, что и у <code>middleware</code>.',
  },

  {
    num: 6,
    title: 'Какие варианты позволяют pre-hydrate state из localStorage',
    prompt:
      'Нужно восстановить <code>auth</code> и <code>theme</code> из localStorage при старте приложения. Какие варианты <strong>корректны</strong>?',
    options: [
      {
        text: 'A',
        code:
`const preloaded = JSON.parse(localStorage.getItem('state') || '{}')
export const store = configureStore({
  reducer: rootReducer,
  preloadedState: preloaded,   // Partial<RootState> — остальные slice'ы из initialState
})`,
        correct: true,
        verdict:
          'Правильно. <code>preloadedState</code> принимает <code>Partial&lt;RootState&gt;</code>. Отсутствующие ключи инициализируются из <code>initialState</code> slice\'ов.',
      },
      {
        text: 'B',
        code:
`// В каждом slice initialState читает из localStorage
const authSlice = createSlice({
  name: 'auth',
  initialState: JSON.parse(localStorage.getItem('auth') || 'null') ?? defaultAuth,
  reducers: { /* ... */ },
})`,
        correct: true,
        verdict:
          'Работает, но не рекомендуется. Размазывает persistence по slice-файлам вместо централизованного <code>loadState()</code>. Хрупко, если slice переиспользуются в тестах.',
      },
      {
        text: 'C',
        code:
`// Диспатчить hydrate action после создания store
export const store = configureStore({ reducer: rootReducer })
const saved = JSON.parse(localStorage.getItem('state') || '{}')
if (saved.auth) store.dispatch(authSlice.actions.setUser(saved.auth))`,
        correct: true,
        verdict:
          'Работает. Минус: первый <code>@@INIT</code> в DevTools с default state, потом dispatch — лишний шум. preloadedState решает это элегантнее.',
      },
      {
        text: 'D',
        code:
`// redux-persist с миграциями
import { persistReducer, persistStore } from 'redux-persist'
const persistedReducer = persistReducer({ key: 'root', storage, whitelist: ['auth','theme'] }, rootReducer)
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (gdm) => gdm({
    serializableCheck: { ignoredActions: ['persist/PERSIST','persist/REHYDRATE'] }
  }),
})`,
        correct: true,
        verdict:
          'Рекомендуется для продакшена. redux-persist даёт: whitelist/blacklist, throttle, миграции схемы, асинхронный storage. Не забудьте про ignoredActions — иначе serializableCheck будет кричать.',
      },
    ],
    explain:
      '<strong>Простой кейс</strong> (counter/theme/user prefs): <code>preloadedState</code> + <code>store.subscribe(throttle(save, 1000))</code>. <strong>Сложный</strong> (много slice, миграции): redux-persist. Slice-локальный способ работает, но плохо масштабируется — тестам сложно подсовывать state, initialization order становится important.',
  },

  {
    num: 7,
    title: 'preloadedState vs initialState — кто побеждает',
    prompt:
      'Есть slice с <code>initialState: { value: 0 }</code>. В configureStore передан <code>preloadedState: { counter: { value: 5 } }</code>. Что окажется в <code>store.getState().counter</code> сразу после создания?',
    options: [
      {
        text: '{ value: 5 } — preloadedState побеждает',
        correct: true,
        verdict:
          'Верно. При первом <code>@@INIT</code> reducer получает <code>state = preloadedState.counter</code>, то есть <code>{ value: 5 }</code>. Default <code>initialState</code> используется только когда <code>state === undefined</code>.',
      },
      {
        text: '{ value: 0 } — initialState slice приоритетнее',
        correct: false,
        verdict:
          'Нет. initialState используется <em>только</em> если reducer получил <code>undefined</code>. С preloadedState[key] он получит то, что вы передали.',
      },
      {
        text: '{ value: 5 } потому что reducer выполнится с preloaded значением и не трогает его при @@INIT',
        correct: true,
        verdict:
          'Точнее: на @@INIT reducer вызывается, но большинство ваших обработчиков не матчат этот action (там default case возвращает state как есть). Итог — 5.',
      },
      {
        text: 'Merge: { value: 5 } потом перезатирается default\'ом до { value: 0 }',
        correct: false,
        verdict:
          'Нет. Redux не делает merge — reducer получает ваш preloaded как начальное значение и всё.',
      },
    ],
    explain:
      '<strong>Механика:</strong> Redux при создании store делает <code>dispatch({ type: \'@@INIT\' })</code>. reducer для counter получает <code>state = preloadedState.counter</code> (не undefined!) и action с неизвестным type → default branch → return state как есть. Результат: <code>{ value: 5 }</code>. Если <code>preloadedState.counter</code> не задан — reducer получает <code>undefined</code>, и тогда берётся <code>initialState</code> slice.',
  },

  {
    num: 8,
    title: 'Dispatch без скобок — что произойдёт',
    prompt:
      'У вас <code>const { incremented } = counterSlice.actions</code>. Разработчик пишет <code>dispatch(incremented)</code> (без <code>()</code>). Что случится при default конфигурации RTK 2.x?',
    options: [
      {
        text: 'actionCreatorCheck middleware пишет console.warn с текстом «Detected an action creator being dispatched...»',
        correct: true,
        verdict:
          'Да. <code>actionCreatorInvariantMiddleware</code> проверяет <code>typeof action === \'function\' && \'type\' in action</code>. incremented — именно такой.',
      },
      {
        text: 'Redux кидает Error «Actions must be plain objects»',
        correct: false,
        verdict:
          'Нет — в <strong>ванильном</strong> redux было бы так. Но в RTK thunk middleware обрабатывает функции: если у неё нет специальной сигнатуры, просто не делает ничего. Error не бросается.',
      },
      {
        text: 'thunk middleware видит функцию и выполняет её — incremented вызывается с (dispatch, getState), возвращает action object, который... никуда не попадает',
        correct: true,
        verdict:
          'Да. thunk: <code>typeof action === \'function\' ? action(dispatch, getState) : next(action)</code>. incremented выполнится, вернёт <code>{ type: \'counter/incremented\' }</code>, но thunk не диспатчит результат обратно.',
      },
      {
        text: 'State изменится, как если бы написали dispatch(incremented())',
        correct: false,
        verdict:
          'Нет. Без actionCreatorCheck + без явного <code>dispatch()</code>-вызова ваш reducer не увидит action. State не изменится. Это и есть коварство бага — молчаливый no-op.',
      },
    ],
    explain:
      '<strong>Именно поэтому ввели actionCreatorInvariantMiddleware.</strong> До него этот баг был немым: «я нажал кнопку, ничего не происходит». Проверка делается через <code>isActionCreator</code>: <code>typeof action === \'function\' && \'type\' in action && typeof action.type === \'string\'</code>. Thunks сюда не попадают (у самого thunk\'а нет <code>.type</code>), только actionCreators из createAction/createSlice.',
  },

  {
    num: 9,
    title: 'Что возьмёт TS из store при правильной типизации',
    prompt:
      'После <code>export const store = configureStore({...})</code> и <code>export type AppDispatch = typeof store.dispatch</code>. Какие операции будут <strong>корректны</strong> по типам?',
    options: [
      {
        text: 'A',
        code:
`const dispatch: AppDispatch = useDispatch()
dispatch(counterSlice.actions.incremented())`,
        correct: true,
        verdict:
          'Правильно. Обычный action object — базовый dispatch.',
      },
      {
        text: 'B',
        code:
`const dispatch: AppDispatch = useDispatch()
const user = await dispatch(fetchUser(42)).unwrap()
// fetchUser = createAsyncThunk(...)`,
        correct: true,
        verdict:
          'Правильно. AppDispatch из configureStore включает <code>ThunkDispatch</code>-overload, который возвращает promise для thunk-actions, поддерживающих .unwrap().',
      },
      {
        text: 'C',
        code:
`const value = useAppSelector((s) => s.counter.value)
// value типизирован как number автоматически`,
        correct: true,
        verdict:
          'Правильно. <code>useAppSelector</code> через <code>useSelector.withTypes&lt;RootState&gt;()</code> знает тип state — возврат селектора выводится точно.',
      },
      {
        text: 'D',
        code:
`// useDispatch БЕЗ useAppDispatch
import { useDispatch } from 'react-redux'
const dispatch = useDispatch()
await dispatch(fetchUser(42)).unwrap()`,
        correct: false,
        verdict:
          'TS-ошибка. Без <code>useAppDispatch</code> тип — базовый <code>Dispatch&lt;AnyAction&gt;</code>, thunk-возврат теряется, <code>.unwrap()</code> не найдётся. Это самый частый баг при добавлении Redux в новый проект.',
      },
    ],
    explain:
      '<strong>Правило:</strong> всегда экспортируйте <code>useAppDispatch</code>/<code>useAppSelector</code> из <code>app/hooks.ts</code> и импортируйте их, а не голые хуки из <code>react-redux</code>. Типы хранятся ровно в одном месте (<code>store.ts</code>), всё приложение ими пользуется единообразно.',
  },

  {
    num: 10,
    title: 'Когда отключать конкретный default middleware',
    prompt:
      'В каких случаях <strong>оправдано</strong> отключить/настроить default middleware через <code>getDefaultMiddleware({...})</code>?',
    options: [
      {
        text: 'Интеграция с redux-persist: ignoredActions для persist/PERSIST, persist/REHYDRATE',
        code: `serializableCheck: { ignoredActions: [PERSIST, REHYDRATE, FLUSH, PURGE, REGISTER, PAUSE] }`,
        correct: true,
        verdict:
          'Оправдано. Persist actions содержат функции-callback, без настройки middleware бесконечно кричит warning.',
      },
      {
        text: 'Тяжёлый нормализованный кеш RTK Query: immutableCheck слишком медленный на больших state',
        code: `immutableCheck: { ignoredPaths: [/^rtkq\\./], warnAfter: 128 }`,
        correct: true,
        verdict:
          'Оправдано. immutable/serializable обходят весь state рекурсивно. Для 10k+ entities это несколько ms на dispatch — <code>ignoredPaths</code> или <code>warnAfter</code>.',
      },
      {
        text: 'Чтобы включить thunk — он не входит в default',
        correct: false,
        verdict:
          'Нет. thunk <strong>входит</strong> в default в любом NODE_ENV. Выключать имеет смысл только если вы осознанно используете redux-saga/redux-observable вместо thunk.',
      },
      {
        text: 'Передать extraArgument в thunk (api-клиент, navigation service)',
        code: `thunk: { extraArgument: { api, navigation } }`,
        correct: true,
        verdict:
          'Оправдано. Классический способ DI: в thunk-handler приходит <code>(dispatch, getState, { api, navigation })</code> — без импортов, удобно для тестов.',
      },
    ],
    explain:
      '<strong>Правила хорошего тона:</strong> отключайте <strong>настройкой</strong>, не полностью. <code>immutableCheck: false</code> проще, но вы теряете всю защиту. <code>{ ignoredPaths: [...] }</code> точечно — best. В production все invariants отключены автоматически — не настраивайте вручную «для ускорения prod», только для dev-опыта.',
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
  'Лог Quiz B — configureStore',
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
  'Итоговый квиз по секции B (уроки 08–19). Сначала пробеги по recap\'у, потом квиз: 10 вопросов, многие с несколькими правильными вариантами.',
)
con.info(
  'Подсказка: если сомневаешься, сверься с соответствующим уроком — ссылки через «Все уроки» в шапке.',
)
