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
    increment: (state) => { state.value += 1 },
    decrement: (state) => { state.value -= 1 },
    addBy: (state, action: PayloadAction<number>) => { state.value += action.payload },
    reset: (state) => { state.value = 0 },
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
    num: 'Уроки 01-02',
    title: 'Что такое RTK и три боли классики, которые он решает',
    lead:
      '<strong>Redux Toolkit</strong> (@reduxjs/toolkit) — официальный, opinionated, batteries-included набор инструментов над Redux. Дословно из доки: RTK создан, чтобы решить три жалобы на классику — <strong>"Configuring a Redux store is too complicated"</strong>, <strong>"I have to add a lot of packages"</strong>, <strong>"Redux requires too much boilerplate code"</strong>. RTK не отменяет идею Redux (<code>action → dispatch → reducer → store → subscribers</code>), это обёртка над теми же концепциями.',
    snippets: [
      {
        label: 'classic-counter/store.ts — БОЛЬ',
        code:
`import { createStore, combineReducers, applyMiddleware, compose } from 'redux'
import thunk from 'redux-thunk'

// 1) action types — константы вручную
const INCREMENT = 'counter/incremented'
const DECREMENT = 'counter/decremented'

// 2) action creators — фабрики вручную
const increment = () => ({ type: INCREMENT })
const decrement = () => ({ type: DECREMENT })

// 3) reducer — switch + spread copy
interface CounterState { value: number }
function counterReducer(
  state: CounterState = { value: 0 },
  action: { type: string },
): CounterState {
  switch (action.type) {
    case INCREMENT: return { ...state, value: state.value + 1 }
    case DECREMENT: return { ...state, value: state.value - 1 }
    default: return state
  }
}

// 4) store — ручная композиция enhancer'ов
const rootReducer = combineReducers({ counter: counterReducer })
const composeEnhancers =
  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose
const store = createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(thunk)),
)

export { store, increment, decrement }
// итого ~25 строк, 2 пакета, 3 зоны ответственности
`,
      },
      {
        label: 'rtk-counter/counterSlice.ts — ЛЕКАРСТВО',
        code:
`import { configureStore, createSlice } from '@reduxjs/toolkit'

// Всё в одном — action types, creators, reducer генерируются автоматически
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value++ },   // Immer позволяет "мутировать"
    decrement: (state) => { state.value-- },
  },
})

export const { increment, decrement } = counterSlice.actions

// configureStore: combineReducers + thunk + dev-checks + DevTools — автоматически
export const store = configureStore({
  reducer: { counter: counterSlice.reducer },
})
// итого ~14 строк, 1 пакет
// action.type === 'counter/increment' (сгенерирован как \`\${name}/\${key}\`)
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>RTK — это standard way to write Redux logic.</strong> Учить отдельно classic Redux в 2024+ не нужно. Новички начинают сразу с RTK; существующие проекты мигрируют инкрементально.',
      },
      {
        kind: 'good',
        html:
          '<strong>Метрики урока 02:</strong> store setup 28 → 9 строк (−68%), todos slice 52 → 22 (−58%), пакетов 6 → 1, action types вручную 3 → 0. Это не маркетинг — это факт для того же counter/todos.',
      },
    ],
  },
  {
    num: 'Урок 03',
    title: 'Что входит в @reduxjs/toolkit — полный список API',
    lead:
      'Дословно из <a href="https://redux-toolkit.js.org/introduction/getting-started#whats-included" target="_blank">доки</a>: <em>"Redux Toolkit includes these APIs: configureStore, createReducer, createAction, createSlice, combineSlices, createAsyncThunk, createEntityAdapter, and the createSelector utility from Reselect, re-exported for ease of use."</em> Плюс селекторы, listener middleware, matchers, nanoid и RTK Query в отдельных entry.',
    snippets: [
      {
        label: 'api-catalog.ts — все главные имена',
        code:
`import {
  // ── Store setup ──
  configureStore,         // уроки 08-19, секция B
  combineSlices,          // урок 34-36 — замена combineReducers + lazy inject
  autoBatchEnhancer,      // урок 71 — группировка subscriber-уведомлений

  // ── Reducers & actions ──
  createSlice,            // уроки 28-40, секция D — главная фабрика
  createReducer,          // уроки 24-25 — builder API без switch
  createAction,           // уроки 20-23 — action creator c .match() и prepare

  // ── Async & side effects ──
  createAsyncThunk,           // уроки 54-63, секция G — pending/fulfilled/rejected
  createListenerMiddleware,   // уроки 64-70, секция H — alternative saga/observable

  // ── Normalized state ──
  createEntityAdapter,    // уроки 46-53, секция F — { ids, entities }

  // ── Selectors (re-export из reselect) ──
  createSelector,
  createDraftSafeSelector,
  createSelectorCreator,
  weakMapMemoize,
  lruMemoize,

  // ── Utilities ──
  nanoid,                 // генератор id
  isAnyOf, isAllOf,       // matchers для builder.addMatcher
  isPending, isFulfilled, isRejected,
  miniSerializeError,
  Tuple,                  // typed массив для middleware

  type PayloadAction,
} from '@reduxjs/toolkit'
`,
      },
      {
        label: 'api-catalog-query.ts — RTK Query (отдельные entry)',
        code:
`// Core RTK Query без React
import {
  createApi,
  fetchBaseQuery,
  setupListeners,
  retry,
} from '@reduxjs/toolkit/query'

// То же + auto-generated React hooks
import {
  createApi as createApiReact,  // тот же createApi, но с reactHooksModule
  fetchBaseQuery as fbqReact,
  ApiProvider,
} from '@reduxjs/toolkit/query/react'

// Пример — createApi из /query/react генерирует use*Query / use*Mutation
const api = createApiReact({
  baseQuery: fbqReact({ baseUrl: '/api' }),
  endpoints: (build) => ({
    getPosts: build.query<unknown, void>({ query: () => 'posts' }),
    addPost:  build.mutation<unknown, unknown>({
      query: (b) => ({ url: 'posts', method: 'POST', body: b }),
    }),
  }),
})
// → api.useGetPostsQuery()
// → api.useAddPostMutation()
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>createSelector в RTK = re-export из reselect.</strong> Не новая реализация, а чистый re-export для удобства — чтобы не ставить reselect отдельно.',
      },
    ],
  },
  {
    num: 'Урок 04',
    title: 'Три точки входа пакета и почему их три',
    lead:
      'Один npm-пакет <code>@reduxjs/toolkit</code> экспортирует через <strong>три "exports"</strong> в package.json. Разделены, чтобы RTK можно было использовать в Node/Svelte/Vue без обязательной peer-зависимости <code>react</code>. Экспорты не смешиваются — если хотите <code>useGetPostsQuery</code>-хуки, импортируйте createApi именно из <code>/query/react</code>.',
    snippets: [
      {
        label: 'entry-core.ts — @reduxjs/toolkit',
        code:
`// Core: всё кроме createApi
import {
  configureStore,
  createSlice,
  createReducer,
  createAction,
  createAsyncThunk,
  createEntityAdapter,
  combineSlices,
  createSelector,
  createListenerMiddleware,
  nanoid,
  isAnyOf,
  Tuple,
  autoBatchEnhancer,
  prepareAutoBatched,
} from '@reduxjs/toolkit'

// ✗ этого здесь нет — createApi живёт отдельно
// import { createApi } from '@reduxjs/toolkit'  // undefined
`,
      },
      {
        label: 'entry-query.ts — @reduxjs/toolkit/query',
        code:
`// RTK Query БЕЗ React — для Node / Svelte / Vue / vanilla
import {
  createApi,
  fetchBaseQuery,
  setupListeners,
  retry,
  buildCreateApi,   // advanced
  coreModule,       // advanced
} from '@reduxjs/toolkit/query'

// Здесь createApi НЕ генерирует React-хуки.
// Доступны только: api.endpoints.X.initiate(arg), api.endpoints.X.select(arg), api.middleware
// ✗ useGetPostsQuery здесь нет
`,
      },
      {
        label: 'entry-query-react.ts — @reduxjs/toolkit/query/react',
        code:
`// RTK Query С React — автогенерация хуков
import {
  createApi,        // тот же, но с reactHooksModule внутри
  fetchBaseQuery,
  setupListeners,
  retry,
  ApiProvider,      // standalone Provider, если нет своего store
} from '@reduxjs/toolkit/query/react'

// Правила имён хуков:
//   build.query    ключ 'getPosts'     → useGetPostsQuery
//   build.mutation ключ 'addPost'      → useAddPostMutation
//   build.infiniteQuery ключ 'getMsgs' → useGetMsgsInfiniteQuery
`,
      },
    ],
    insights: [
      {
        kind: 'trap',
        html:
          '<strong>Не смешивайте два createApi.</strong> Если в одном проекте импортировать createApi из <code>/query</code> и из <code>/query/react</code> — это две разных фабрики с разными reactHooksModule. Используйте один entry.',
      },
      {
        kind: 'good',
        html:
          '<strong>Для React-приложения с RTK Query</strong> обычный рецепт — импортировать core-функции из <code>@reduxjs/toolkit</code>, а createApi — из <code>@reduxjs/toolkit/query/react</code>.',
      },
    ],
  },
  {
    num: 'Урок 05',
    title: 'Установка, peer deps и bundle size',
    lead:
      'Пакет ставится одной командой. Внутри уже лежат <code>redux</code>, <code>immer</code>, <code>reselect</code>, <code>redux-thunk</code>. <strong>peerDependencies</strong>: <code>react</code> и <code>react-redux</code> — их ставить отдельно, RTK не тянет React сам (чтобы работал в Node/Svelte/Vue).',
    snippets: [
      {
        label: 'install.sh — команды',
        code:
`# React + RTK + RTK Query — типичный кейс
npm install @reduxjs/toolkit react-redux

# Не-React проект (Node CLI, Vue, Svelte) — без react-redux
npm install @reduxjs/toolkit

# Готовый Vite-шаблон с TypeScript
npx degit reduxjs/redux-templates/packages/vite-template-redux my-app

# Next.js
npx create-next-app --example with-redux my-app
`,
      },
      {
        label: 'package.json — что попадает в node_modules',
        code:
`{
  "dependencies": {
    "@reduxjs/toolkit": "^2.5.0",
    "react-redux": "^9.2.0"
  }
}

// Внутри @reduxjs/toolkit уже есть:
//   • redux         ^5.0.1   — dependency
//   • immer         ^10.0.3  — dependency
//   • reselect      ^5.1.0   — dependency
//   • redux-thunk   ^3.1.0   — dependency
// А react и react-redux — peerDependencies (их ставит приложение)
//
// Bundle size (min+gzip, bundlephobia v2.x):
//   @reduxjs/toolkit (core):           ~17 kB
//   + @reduxjs/toolkit/query:          ~26 kB
//   + @reduxjs/toolkit/query/react:    ~28 kB
//
//   Classic стек для сравнения:
//   redux + react-redux + thunk + reselect + immer ≈ 22.5 kB
`,
      },
    ],
    insights: [
      {
        kind: 'trap',
        html:
          '<strong>Никогда не ставьте immer/reselect/redux-thunk отдельно</strong> рядом с RTK. Два инстанса immer в node_modules → <code>isDraft(x)</code> из одной копии возвращает false для draft из другой. Проверьте: <code>npm ls immer</code>.',
      },
      {
        kind: 'key',
        html:
          '<strong>Tree-shaking работает.</strong> Если не используете RTK Query — его ~9 kB не попадут в бандл. Если не используете entityAdapter — он тоже выпадет.',
      },
    ],
  },
  {
    num: 'Урок 06',
    title: 'Архитектура: redux · immer · reselect · redux-thunk',
    lead:
      'RTK — это <em>зонтичный</em> пакет, который склеивает 4 давно зарекомендованных библиотеки: <code>redux</code> (core store), <code>immer</code> (мутирующий синтаксис → immutable update), <code>reselect</code> (мемоизация селекторов), <code>redux-thunk</code> (middleware для функций-actions). Ключевые имена из каждой <strong>реэкспортируются</strong> напрямую — можно импортировать всё из <code>@reduxjs/toolkit</code>.',
    snippets: [
      {
        label: 'reexports.ts — что реэкспортирует RTK',
        code:
`// Всё это доступно прямо из @reduxjs/toolkit — ставить отдельно НЕ надо

// из redux:
import {
  compose, bindActionCreators, createStore,
  combineReducers, applyMiddleware,
  type Action, type Reducer,
} from '@reduxjs/toolkit'

// из immer:
import {
  produce, current, original, isDraft, freeze,
} from '@reduxjs/toolkit'

// из reselect:
import {
  createSelector, createSelectorCreator,
  weakMapMemoize, lruMemoize,
} from '@reduxjs/toolkit'

// из redux-thunk:
import {
  thunk, withExtraArgument,
  type ThunkAction, type ThunkDispatch,
} from '@reduxjs/toolkit'
`,
      },
      {
        label: 'package.json @reduxjs/toolkit — дословно',
        code:
`{
  "name": "@reduxjs/toolkit",
  "version": "2.5.0",

  "dependencies": {
    "immer":        "^10.0.3",
    "redux":        "^5.0.1",
    "redux-thunk":  "^3.1.0",
    "reselect":     "^5.1.0"
  },

  "peerDependencies": {
    "react":       "^16.9.0 || ^17 || ^18 || ^19",
    "react-redux": "^7.2.1 || ^8.1.3 || ^9.0.0"
  },

  "exports": {
    ".":             { "import": "./dist/redux-toolkit.modern.mjs" },
    "./query":       { "import": "./dist/query/rtk-query.modern.mjs" },
    "./query/react": { "import": "./dist/query/react/rtk-query-react.modern.mjs" }
  }
}
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>Зачем зонтик:</strong> версии 4 библиотек согласуются командой Redux. Вы получаете гарантию, что immer совместим с текущим RTK, reselect v5 совместим, redux 5 совместим. Руками эти версии собирать — ручная боль.',
      },
      {
        kind: 'trap',
        html:
          '<strong>react-redux НЕ реэкспортируется</strong> из <code>@reduxjs/toolkit</code>. Для <code>useSelector</code> / <code>useDispatch</code> / <code>Provider</code> импортируйте напрямую: <code>import { useSelector } from \'react-redux\'</code>.',
      },
    ],
  },
  {
    num: 'Урок 07',
    title: 'Counter side-by-side: classic + react-redux vs RTK',
    lead:
      'Один и тот же counter (inc / dec / addBy / reset) на двух подходах. Поведение идентичное, но classic занимает ~52 строки, RTK — ~20. RTK убирает 7 вещей: action types, action creators, switch, spread-copy, <code>combineReducers</code> вручную, <code>applyMiddleware(thunk)</code>, DevTools setup. Общее тоже остаётся: <code>store.dispatch(action)</code>, <code>store.subscribe()</code>, <code>&lt;Provider&gt;</code>, <code>useSelector</code>, <code>useDispatch</code>.',
    snippets: [
      {
        label: 'classic/counter.ts — 52 строки',
        code:
`import { createStore, combineReducers, applyMiddleware,
         type Reducer } from 'redux'
import thunk from 'redux-thunk'
import { Provider, useSelector, useDispatch } from 'react-redux'

// 1) action types
const INCREMENT = 'counter/INCREMENT'
const DECREMENT = 'counter/DECREMENT'
const ADD_BY    = 'counter/ADD_BY'
const RESET     = 'counter/RESET'

// 2) action creators
interface ClassicAction { type: string; payload?: number }
const incrementAC = (): ClassicAction => ({ type: INCREMENT })
const decrementAC = (): ClassicAction => ({ type: DECREMENT })
const addByAC     = (n: number): ClassicAction => ({ type: ADD_BY, payload: n })
const resetAC     = (): ClassicAction => ({ type: RESET })

// 3) reducer
interface CounterState { value: number }
const counterReducer: Reducer<CounterState, ClassicAction> = (
  state = { value: 0 },
  action,
) => {
  switch (action.type) {
    case INCREMENT: return { ...state, value: state.value + 1 }
    case DECREMENT: return { ...state, value: state.value - 1 }
    case ADD_BY:    return { ...state, value: state.value + (action.payload ?? 0) }
    case RESET:     return { ...state, value: 0 }
    default:        return state
  }
}

// 4) store
const store = createStore(
  combineReducers({ counter: counterReducer }),
  applyMiddleware(thunk),
)

// 5) React
function Counter() {
  const value = useSelector((s: { counter: CounterState }) => s.counter.value)
  const dispatch = useDispatch()
  return (
    <>
      <div>{value}</div>
      <button onClick={() => dispatch(incrementAC())}>+1</button>
      <button onClick={() => dispatch(addByAC(5))}>+5</button>
    </>
  )
}

function App() {
  return <Provider store={store}><Counter /></Provider>
}
`,
      },
      {
        label: 'rtk/counter.ts — 20 строк',
        code:
`import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { Provider, useSelector, useDispatch } from 'react-redux'

// 1) slice — всё в одном: name, initialState, reducers (мутирующий стиль через Immer)
interface CounterState { value: number }
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 } as CounterState,
  reducers: {
    increment: (s) => { s.value += 1 },
    decrement: (s) => { s.value -= 1 },
    addBy:     (s, a: PayloadAction<number>) => { s.value += a.payload },
    reset:     (s) => { s.value = 0 },
  },
})
export const { increment, decrement, addBy, reset } = counterSlice.actions

// 2) store — combineReducers/thunk/DevTools автоматически
const store = configureStore({ reducer: { counter: counterSlice.reducer } })
export type RootState = ReturnType<typeof store.getState>

// 3) React — такой же, как в classic
function Counter() {
  const value = useSelector((s: RootState) => s.counter.value)
  const dispatch = useDispatch()
  return (
    <>
      <div>{value}</div>
      <button onClick={() => dispatch(increment())}>+1</button>
      <button onClick={() => dispatch(addBy(5))}>+5</button>
    </>
  )
}

function App() {
  return <Provider store={store}><Counter /></Provider>
}
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>В DevTools action.type отличается:</strong> classic — <code>counter/INCREMENT</code> (как вы назвали), RTK — <code>counter/increment</code> (RTK склеивает <code>${name}/${key}</code> из createSlice). Структура state одинаковая.',
      },
      {
        kind: 'good',
        html:
          '<strong>Что осталось одинаковым:</strong> <code>store.dispatch(action)</code>, <code>store.subscribe()</code>, React-интеграция через <code>&lt;Provider store&gt;</code>, <code>useSelector</code>, <code>useDispatch</code>. RTK — это обёртка, не новый паттерн.',
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
    title: 'Три боли классики — что именно решает RTK',
    prompt:
      'Дословно из доки RTK был создан, чтобы решить три типичные жалобы на classic Redux. Какие из утверждений ниже <strong>действительно</strong> входят в этот официальный список?',
    options: [
      {
        text: '"Configuring a Redux store is too complicated" — слишком сложная настройка store',
        correct: true,
        verdict:
          'Да. Это первая из трёх официальных болей. Решение — <code>configureStore</code>, который берёт на себя combineReducers / applyMiddleware / compose / DevTools.',
      },
      {
        text: '"I have to add a lot of packages to get Redux to do anything useful" — зоопарк пакетов',
        correct: true,
        verdict:
          'Да. Вторая официальная боль. Решение — один <code>@reduxjs/toolkit</code>, внутри уже redux/immer/reselect/thunk.',
      },
      {
        text: '"Redux requires too much boilerplate code" — много шаблонного кода',
        correct: true,
        verdict:
          'Да. Третья официальная боль. Решение — <code>createSlice</code>: генерирует action types/creators/reducer из одного объекта.',
      },
      {
        text: '"Redux is too slow and needs to be rewritten for performance" — производительность',
        correct: false,
        verdict:
          'Ловушка. Производительности НЕТ в списке официальных болей. Classic Redux был производителен, проблема была в DX (developer experience), а не в скорости.',
      },
      {
        text: '"Redux is incompatible with TypeScript" — несовместимость с TS',
        correct: false,
        verdict:
          'Нет. Classic Redux работал с TS (с ручной типизацией). RTK улучшает TS-инференс, но это бонус, не одна из трёх жалоб из getting-started.',
      },
    ],
    explain:
      '<strong>Запомните дословно 3 боли:</strong> <em>store setup</em>, <em>package sprawl</em>, <em>boilerplate</em>. Это рамка, в которой появилось всё API RTK: <code>configureStore</code> → setup, <code>@reduxjs/toolkit</code> как single package → packages, <code>createSlice</code> + Immer → boilerplate.',
  },

  {
    num: 2,
    title: 'Какие импорты из @reduxjs/toolkit сработают',
    prompt:
      'Разработчик пишет core-логику приложения (store + slice + thunk + entity). Какие из этих импортов <strong>действительно сработают</strong> в TypeScript без ошибок?',
    options: [
      {
        text: 'A',
        code: `import { configureStore, createSlice } from '@reduxjs/toolkit'`,
        correct: true,
        verdict:
          'Да. Оба имени экспортируются из корневого entry — это Core RTK.',
      },
      {
        text: 'B',
        code: `import { createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit'`,
        correct: true,
        verdict:
          'Да. Оба — часть Core. Тут же живут createListenerMiddleware, combineSlices, createSelector.',
      },
      {
        text: 'C',
        code: `import { createApi, fetchBaseQuery } from '@reduxjs/toolkit'`,
        correct: false,
        verdict:
          'Нет. createApi и fetchBaseQuery живут в <code>@reduxjs/toolkit/query</code> или <code>@reduxjs/toolkit/query/react</code>, не в корне. Из корня получите <code>undefined</code>.',
      },
      {
        text: 'D',
        code: `import { createSelector, createDraftSafeSelector, nanoid } from '@reduxjs/toolkit'`,
        correct: true,
        verdict:
          'Да. createSelector — re-export из reselect, createDraftSafeSelector — обёртка RTK, nanoid — bundled utility. Все из корня.',
      },
      {
        text: 'E',
        code: `import { useSelector, useDispatch } from '@reduxjs/toolkit'`,
        correct: false,
        verdict:
          'Нет. useSelector/useDispatch живут в <code>react-redux</code>. RTK их напрямую НЕ реэкспортирует из корня (только <code>/query/react</code> их re-export\'ит, и то как удобство).',
      },
    ],
    explain:
      '<strong>Правило:</strong> Core API — всё, что не createApi — в корне <code>@reduxjs/toolkit</code>. createApi/fetchBaseQuery/setupListeners — в <code>/query</code> или <code>/query/react</code>. useSelector/useDispatch — в <code>react-redux</code>, это отдельный peer-пакет.',
  },

  {
    num: 3,
    title: 'Три точки входа — выберите правильный entry для задачи',
    prompt:
      'Для каждого сценария нужно выбрать entry. Какие утверждения <strong>верны</strong>?',
    options: [
      {
        text: 'React-SPA с RTK Query и автогенерацией useXQuery-хуков → импортировать createApi из @reduxjs/toolkit/query/react',
        correct: true,
        verdict:
          'Правильно. Именно этот entry подключает reactHooksModule и генерирует <code>useGetPostsQuery</code> / <code>useAddPostMutation</code> для каждого endpoint.',
      },
      {
        text: 'Node.js CLI-утилита с RTK Query без React → импортировать createApi из @reduxjs/toolkit/query',
        correct: true,
        verdict:
          'Правильно. Вариант без React-хуков. Доступны <code>api.endpoints.X.initiate(arg)</code> для ручного dispatch и селекторы.',
      },
      {
        text: 'React-SPA только со store + slice, БЕЗ RTK Query → хватит @reduxjs/toolkit, entry /query не нужен',
        correct: true,
        verdict:
          'Правильно. /query опциональный. Ставить сам пакет всё равно надо (RTK внутри него), но импортировать из /query — нет, если createApi не нужен.',
      },
      {
        text: 'Можно свободно смешивать createApi из /query и /query/react в одном проекте — это один и тот же createApi',
        correct: false,
        verdict:
          'Нет. Это две разные фабрики: у /query/react под капотом reactHooksModule, у /query — только core. Смешивать — получить два набора middleware и путаницу.',
      },
    ],
    explain:
      '<strong>Почему три entry:</strong> если бы React-хуки лежали в корне <code>@reduxjs/toolkit</code>, то react стал бы обязательной peer-зависимостью. А RTK должен работать в Node/Svelte/Vue. Поэтому React-специфичное вынесли в <code>/query/react</code>, которое загружает react только при использовании.',
  },

  {
    num: 4,
    title: 'Что точно есть внутри @reduxjs/toolkit как dependency',
    prompt:
      'Какие пакеты <strong>действительно</strong> объявлены в <code>dependencies</code> <code>@reduxjs/toolkit</code> (то есть ставятся автоматически при <code>npm install @reduxjs/toolkit</code>)?',
    options: [
      {
        text: 'redux',
        correct: true,
        verdict:
          'Да. Версия ^5.0.1 (на момент RTK 2.x). RTK использует его <code>createStore</code>, <code>combineReducers</code>, <code>compose</code> внутри <code>configureStore</code>.',
      },
      {
        text: 'immer',
        correct: true,
        verdict:
          'Да. Версия ^10.0.3. Нужен для мутирующего синтаксиса в reducer\'ах createSlice/createReducer.',
      },
      {
        text: 'reselect',
        correct: true,
        verdict:
          'Да. Версия ^5.1.0. <code>createSelector</code> из RTK — re-export из него.',
      },
      {
        text: 'redux-thunk',
        correct: true,
        verdict:
          'Да. Версия ^3.1.0. Включён по умолчанию в middleware, возвращаемый из <code>getDefaultMiddleware</code>.',
      },
      {
        text: 'react-redux',
        correct: false,
        verdict:
          'Нет! react-redux — это <strong>peerDependency</strong>, его ставит приложение, не RTK. Так RTK может жить без React.',
      },
      {
        text: 'redux-saga',
        correct: false,
        verdict:
          'Нет. Saga — отдельная библиотека, не входит в RTK. Альтернатива — createListenerMiddleware внутри RTK.',
      },
    ],
    explain:
      '<strong>Шпаргалка:</strong> 4 dependencies (redux / immer / reselect / redux-thunk) + 2 peerDependencies (react / react-redux). Саги, обсерваблы, persist, форм — <em>не</em> в RTK, ставятся отдельно.',
  },

  {
    num: 5,
    title: 'peerDependency: что это значит',
    prompt:
      'Разработчик устанавливает только <code>@reduxjs/toolkit</code> без <code>react-redux</code> и пишет React-приложение. Что произойдёт?',
    options: [
      {
        text: 'npm/yarn/pnpm предупредит о missing peerDependency',
        correct: true,
        verdict:
          'Да. Package manager печатает warning, потому что RTK объявил react-redux как peer. Поведение менеджеров отличается (npm 7+ автоматически ставит peer, pnpm — по умолчанию нет), но warning будет.',
      },
      {
        text: 'useSelector / useDispatch вернут undefined в runtime',
        correct: true,
        verdict:
          'Да, если peer не установлен. Импорт <code>import { useSelector } from \'react-redux\'</code> упадёт с "Cannot find module". Хуки живут в react-redux, не в RTK.',
      },
      {
        text: 'RTK сам установит react-redux "за кулисами"',
        correct: false,
        verdict:
          'Нет. peerDependency — противоположность: RTK ЖДЁТ, что приложение само поставит react-redux. Это нужно чтобы версия React была под контролем приложения, а не RTK.',
      },
      {
        text: 'configureStore откажется работать без react-redux',
        correct: false,
        verdict:
          'Нет. configureStore сам по себе не зависит от react-redux. Без react-redux не получится ТОЛЬКО связать store с React-компонентами, но сам store будет работать — например в Node/CLI.',
      },
    ],
    explain:
      '<strong>peerDependency</strong> = "мне нужна эта библиотека, но её версию контролирует приложение, а не я". Так RTK может жить без React (Node, Svelte, Vue). Для React-проектов всегда ставьте оба: <code>npm install @reduxjs/toolkit react-redux</code>.',
  },

  {
    num: 6,
    title: 'Bundle size — что попадёт в production бандл',
    prompt:
      'Проект использует только <code>configureStore</code> + <code>createSlice</code> (без RTK Query, без entityAdapter). Какие утверждения о финальном бандле <strong>верны</strong>?',
    options: [
      {
        text: 'RTK Query (~9 kB) НЕ попадёт в бандл — tree-shaking по ESM',
        correct: true,
        verdict:
          'Да. createApi импортируется из <code>@reduxjs/toolkit/query</code>, это отдельный entry point. Если ничего оттуда не импортируете — Vite/webpack не положат его в бандл.',
      },
      {
        text: 'immer попадёт в бандл, потому что createSlice требует его для Immer-reducer\'ов',
        correct: true,
        verdict:
          'Да. immer — core зависимость, без него мутирующий синтаксис не работает. Это ~14 kB min+gzip.',
      },
      {
        text: 'redux-thunk выпадет, если приложение не использует thunks',
        correct: true,
        verdict:
          'Технически да — bundler может tree-shake\'нуть middleware, если оно не используется (зависит от версии и настроек). По умолчанию getDefaultMiddleware включает thunk, но без его вызова dispatch код может быть удалён.',
      },
      {
        text: 'Полный classic-стек (redux + react-redux + thunk + reselect + immer) весит существенно больше чем RTK',
        correct: false,
        verdict:
          'Сюрприз — НЕ существенно больше. Classic стек ~22.5 kB, RTK core ~17 kB. Разница всего 5-6 kB, а код в 2-3 раза короче. RTK собран единым ESM-бандлом и terser-сжат.',
      },
    ],
    explain:
      '<strong>Правило bundle:</strong> tree-shaking работает, потому что RTK — чистый ESM. Если не импортируете createApi — его 9 kB не будет. Если не импортируете entityAdapter — его ~2 kB не будет. Итог зависит от того, что вы реально используете.',
  },

  {
    num: 7,
    title: 'Что convert\'ит RTK из classic-кода',
    prompt:
      'Посмотрите на классический counter. Какие его части <strong>полностью исчезают</strong> при переписывании на RTK через <code>createSlice</code>?<pre>const INCREMENT = \'counter/INCREMENT\'\nconst DECREMENT = \'counter/DECREMENT\'\nconst increment = () =&gt; ({ type: INCREMENT })\nconst decrement = () =&gt; ({ type: DECREMENT })\nfunction counterReducer(state = { value: 0 }, action) {\n  switch (action.type) {\n    case INCREMENT: return { ...state, value: state.value + 1 }\n    case DECREMENT: return { ...state, value: state.value - 1 }\n    default: return state\n  }\n}</pre>',
    options: [
      {
        text: 'Константы action types (INCREMENT / DECREMENT) — createSlice генерирует их автоматически как "${name}/${key}"',
        correct: true,
        verdict:
          'Да. Именно так. Для <code>createSlice({ name: \'counter\', reducers: { increment } })</code> action.type будет <code>\'counter/increment\'</code>.',
      },
      {
        text: 'Action creators (increment, decrement) — доступны через slice.actions автоматически',
        correct: true,
        verdict:
          'Да. <code>const { increment, decrement } = counterSlice.actions</code>. RTK генерирует их на основе ключей reducers.',
      },
      {
        text: 'Switch-statement в reducer\'е — каждый ключ reducers: { ... } = один case',
        correct: true,
        verdict:
          'Да. Внутри createSlice RTK делает то же самое через <code>createReducer</code> (builder API) — но это скрыто от вас.',
      },
      {
        text: 'Spread-copy для иммутабельности — можно писать мутирующий код, Immer сконвертирует',
        correct: true,
        verdict:
          'Да. Внутри case-reducer\'а можно писать <code>state.value++</code>. Immer внутри createSlice оборачивает reducer в <code>produce</code>, который превращает мутации draft в immutable update.',
      },
      {
        text: 'default case в switch — нужно всё равно писать return state',
        correct: false,
        verdict:
          'Нет. createSlice / createReducer ведут себя так: если action не совпал ни с одним case — state возвращается без изменений. Писать "default" не нужно.',
      },
    ],
    explain:
      '<strong>Сухой итог:</strong> createSlice убирает 4 слоя boilerplate — (1) action type constants, (2) action creator functions, (3) switch-case, (4) spread-copy через Immer. Это не магия — RTK под капотом делает то же самое, просто пишет code-gen за вас.',
  },

  {
    num: 8,
    title: 'Что НЕ меняется при переходе на RTK',
    prompt:
      'RTK — обёртка, не замена Redux. Какие концепции/API остаются <strong>идентичными</strong>?',
    options: [
      {
        text: 'Однонаправленный поток: action → dispatch → reducer → store → subscribers',
        correct: true,
        verdict:
          'Да. RTK не меняет парадигму. <code>store.dispatch(action)</code> вызывает reducer, тот возвращает новый state, subscribers уведомляются.',
      },
      {
        text: 'Три принципа Redux (SSOT, State is Read-Only, Changes via Pure Functions)',
        correct: true,
        verdict:
          'Да. Все три остаются. Read-only state обеспечивается Immer (вы "мутируете" draft, результат immutable). Pure reducer — как было, так и есть.',
      },
      {
        text: 'API вроде store.dispatch, store.getState, store.subscribe',
        correct: true,
        verdict:
          'Да. configureStore возвращает EnhancedStore, который всё ещё имеет dispatch/getState/subscribe/replaceReducer от классического Redux store.',
      },
      {
        text: '<Provider store={store}>, useSelector, useDispatch из react-redux',
        correct: true,
        verdict:
          'Да. React-интеграция использует те же самые хуки из react-redux. RTK их НЕ переизобретает. useSelector сравнивает результат по === как раньше.',
      },
      {
        text: 'Action объект всё ещё { type: string, payload?: any } — plain serializable object',
        correct: true,
        verdict:
          'Да. RTK только генерирует эти объекты, а формат тот же. Благодаря serializableStateInvariantMiddleware RTK даже в dev ругается, если вы кладёте в payload несериализуемое (например Date или class).',
      },
    ],
    explain:
      '<strong>Главная мысль:</strong> RTK = те же идеи + меньше кода. Учить Redux-концепции всё равно нужно (action, reducer, store, middleware, selector). RTK просто избавляет от ручного написания 70% повторяющегося кода вокруг этих концепций.',
  },

  {
    num: 9,
    title: 'Действия configureStore против ручного createStore',
    prompt:
      'Разработчик переписал <code>createStore + combineReducers + applyMiddleware(thunk) + composeEnhancers</code> на одну строку <code>configureStore({ reducer: { counter: counterSlice.reducer } })</code>. Какие из перечисленных вещей <strong>произошли автоматически</strong>?',
    options: [
      {
        text: 'Объект reducer-ов обёрнут в combineReducers → rootReducer',
        correct: true,
        verdict:
          'Да. Если в reducer передан объект (map), configureStore вызовет combineReducers сам. Если передан готовый reducer-функция — применит как есть.',
      },
      {
        text: 'Подключён redux-thunk middleware (можно dispatch\'ить функции)',
        correct: true,
        verdict:
          'Да. thunk включён по умолчанию в <code>getDefaultMiddleware</code>. Плюс immutability/serializability/actionCreator invariant checks (только dev).',
      },
      {
        text: 'Подключены three dev-checks: immutable / serializable / actionCreator invariant',
        correct: true,
        verdict:
          'Да. В dev-режиме configureStore добавляет три middleware, которые в runtime ловят типичные ошибки: мутацию state, несериализуемый payload, dispatch самого actionCreator\'а вместо вызова.',
      },
      {
        text: 'Подключён Redux DevTools Extension (если установлен в браузере)',
        correct: true,
        verdict:
          'Да. configureStore автоматически делает то же, что ручной <code>composeWithDevTools</code>. В production DevTools не подключаются — опция devTools по умолчанию <code>process.env.NODE_ENV !== \'production\'</code>.',
      },
      {
        text: 'Подключён autoBatchEnhancer для группировки subscriber-уведомлений',
        correct: true,
        verdict:
          'Да. Он включён в default enhancers. Actions с <code>meta[SHOULD_AUTOBATCH]</code> (например от RTK Query) будут группировать уведомления.',
      },
      {
        text: 'Автоматически сгенерированы action creators для всех reducers',
        correct: false,
        verdict:
          'Нет. Action creators генерирует <code>createSlice</code>, а не configureStore. configureStore занимается только store setup.',
      },
    ],
    explain:
      '<strong>5 вещей, которые configureStore сделал за вас:</strong> (1) combineReducers из объекта, (2) thunk middleware, (3) три invariant checks в dev, (4) Redux DevTools, (5) autoBatchEnhancer. Вручную это было бы 20-30 строк — теперь одна.',
  },

  {
    num: 10,
    title: 'package.json проекта — правильная минимальная конфигурация',
    prompt:
      'Новый React-SPA с RTK (core + slice + thunk, <em>без</em> RTK Query). Какие из этих <code>dependencies</code>-конфигураций <strong>корректны и достаточны</strong>?',
    options: [
      {
        text: 'A',
        code:
`{
  "dependencies": {
    "@reduxjs/toolkit": "^2.5.0",
    "react-redux": "^9.2.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}`,
        correct: true,
        verdict:
          'Правильно. Минимум для React + RTK: сам RTK, react-redux (для useSelector/useDispatch/Provider), react/react-dom. redux/immer/reselect/thunk внутри RTK — ставить отдельно не надо.',
      },
      {
        text: 'B',
        code:
`{
  "dependencies": {
    "@reduxjs/toolkit": "^2.5.0",
    "react-redux": "^9.2.0",
    "redux": "^5.0.1",
    "immer": "^10.0.3",
    "reselect": "^5.1.0",
    "redux-thunk": "^3.1.0"
  }
}`,
        correct: false,
        verdict:
          'Антипаттерн. redux/immer/reselect/redux-thunk уже есть внутри RTK как dependencies. Если добавить свою копию — может получиться две копии immer в node_modules и сломанный <code>isDraft</code>. Проверка: <code>npm ls immer</code>.',
      },
      {
        text: 'C',
        code:
`{
  "dependencies": {
    "@reduxjs/toolkit": "^2.5.0"
  }
}`,
        correct: false,
        verdict:
          'Недостаточно для React-приложения. react-redux — peer dependency RTK, но ставит её именно приложение. Без неё не получится Provider/useSelector. (Для Node-проекта без React — было бы ок.)',
      },
      {
        text: 'D',
        code:
`{
  "dependencies": {
    "@reduxjs/toolkit": "^2.5.0",
    "react-redux": "^9.2.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "redux-devtools-extension": "^2.13.9"
  }
}`,
        correct: false,
        verdict:
          'Лишнее. <code>redux-devtools-extension</code> — это npm-пакет-обёртка, он <strong>deprecated</strong>. configureStore подключает DevTools автоматически, если browser extension установлен. Ставить npm-пакет не нужно и даже вредно.',
      },
    ],
    explain:
      '<strong>Правильный минимум React+RTK:</strong> <code>@reduxjs/toolkit</code> + <code>react-redux</code> + <code>react</code> + <code>react-dom</code>. Всё остальное (redux, immer, reselect, thunk) — уже внутри RTK. DevTools extension — это browser-плагин, npm-обёртка deprecated.',
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
  'Лог Quiz A — Введение и мотивация',
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
  'Итоговый квиз по секции A (уроки 01–07). Сначала пробеги по recap\'у с полным кодом, потом квиз: 10 вопросов, многие с несколькими правильными вариантами.',
)
con.info(
  'Mini-store counter подключён к DevToolsPanel снизу — можешь dispatch\'ить actions из консоли для наглядности, хотя это не обязательно для прохождения.',
)
