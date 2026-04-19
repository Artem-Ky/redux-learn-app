import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог изучения API'
)

interface ApiEntry {
  name: string
  category: 'core' | 'util' | 'query'
  short: string
  signature: string
  description: string
  quote?: { text: string; href: string }
  lesson: { title: string; href: string }
}

const API: ApiEntry[] = [
  {
    name: 'configureStore',
    category: 'core',
    short: 'Создаёт store с хорошими defaults: thunk, dev-checks, autoBatch, DevTools.',
    signature: `configureStore({
  reducer,        // Reducer | Map<string, Reducer>
  middleware?,    // (gdm) => Tuple
  enhancers?,     // (gde) => Tuple
  preloadedState?,
  devTools?,
}): EnhancedStore`,
    description:
      'Стандартная функция создания Redux store. Внутри использует createStore + combineReducers + applyMiddleware ' +
      '+ compose. Автоматически добавляет thunk middleware, three dev-checks (immutability, serializability, actionCreator), ' +
      'autoBatchEnhancer и подключает Redux DevTools Extension.',
    quote: {
      text: 'It uses the low-level Redux core createStore method internally, but wraps that to provide good defaults to the store setup.',
      href: 'https://redux-toolkit.js.org/api/configureStore',
    },
    lesson: { title: 'Уроки 08-19 — секция B', href: '../08-configurestore-basic/' },
  },
  {
    name: 'createSlice',
    category: 'core',
    short: 'Главная функция RTK: name + initialState + reducers → готовый slice с actions.',
    signature: `createSlice({
  name: string,
  initialState: State,
  reducers: { [key]: (state, action) => void },
  extraReducers?: builder => void,
  selectors?: { [key]: (state, ...args) => any },
  reducerPath?: string,
}): Slice`,
    description:
      'Универсальная фабрика slice. Из объекта reducers генерирует action creators (доступны как slice.actions.X) ' +
      'и action types вида "${name}/${key}". Reducer\'ы оборачиваются в Immer, поэтому можно "мутировать" state.',
    quote: {
      text: 'A function that accepts an initial state, an object of reducer functions, and a "slice name", and automatically generates action creators and action types.',
      href: 'https://redux-toolkit.js.org/api/createSlice',
    },
    lesson: { title: 'Уроки 28-40 — секция D', href: '../28-createslice-basic/' },
  },
  {
    name: 'createReducer',
    category: 'core',
    short: 'Builder API для reducer без switch. Используется внутри createSlice.',
    signature: `createReducer(initialState, builder => {
  builder
    .addCase(actionCreator, (state, action) => { ... })
    .addMatcher(matcher, (state, action) => { ... })
    .addDefaultCase((state, action) => { ... })
})`,
    description:
      'Альтернатива switch-statement reducer\'ам. Builder API даёт type-safe доступ к каждому case. ' +
      'Внутри слайса используется автоматически — этот API нужен в редких случаях, когда нужен reducer без slice.',
    quote: {
      text: 'A utility that lets you supply a lookup table of action types to case reducer functions, rather than writing switch statements. In addition, it automatically uses the immer library.',
      href: 'https://redux-toolkit.js.org/api/createReducer',
    },
    lesson: { title: 'Уроки 24-25', href: '../24-createreducer-builder/' },
  },
  {
    name: 'createAction',
    category: 'core',
    short: 'Генерирует action creator с type, .match() и опциональным prepare.',
    signature: `const inc = createAction<number>('counter/inc')
inc(5)         // { type: 'counter/inc', payload: 5 }
inc.type       // 'counter/inc'
inc.match(a)   // type-guard`,
    description:
      'Простая фабрика action creator. Используется для shared actions между несколькими slice (через extraReducers) ' +
      'или когда нужен action отдельно от slice. Поддерживает prepare callback для трансформации payload.',
    quote: {
      text: 'A helper function for defining a Redux action type and creator.',
      href: 'https://redux-toolkit.js.org/api/createAction',
    },
    lesson: { title: 'Уроки 20-23', href: '../20-createaction-basics/' },
  },
  {
    name: 'createAsyncThunk',
    category: 'core',
    short: 'Async-функция → 3 actions: pending / fulfilled / rejected.',
    signature: `const fetchUser = createAsyncThunk(
  'users/fetchById',
  async (id, thunkAPI) => {
    const res = await fetch(...)
    return res.json()
  }
)
// fetchUser.pending / .fulfilled / .rejected`,
    description:
      'Стандартный паттерн loading state в виде функции. Принимает type prefix + async payload creator. ' +
      'Возвращает thunk action creator с тремя life-cycle action creators. Поддерживает condition, rejectWithValue, ' +
      'AbortSignal, requestId.',
    quote: {
      text: 'Accepts an action type string and a function that returns a promise, and generates a thunk that dispatches pending/fulfilled/rejected action types based on that promise.',
      href: 'https://redux-toolkit.js.org/api/createAsyncThunk',
    },
    lesson: { title: 'Уроки 54-63 — секция G', href: '../55-createasyncthunk-basic/' },
  },
  {
    name: 'createEntityAdapter',
    category: 'core',
    short: 'Нормализованный CRUD: { ids: [], entities: {} } + готовые reducers и selectors.',
    signature: `const adapter = createEntityAdapter<Book>({
  selectId: (b) => b.bookId,
  sortComparer: (a, b) => a.title.localeCompare(b.title),
})
adapter.getInitialState()       // { ids: [], entities: {} }
adapter.addOne, adapter.upsertMany, ...`,
    description:
      'Generates pre-built reducers (addOne/setOne/upsertOne/updateOne/removeOne/setAll и Many-варианты) и ' +
      'selectors (selectAll/selectIds/selectById/selectTotal/selectEntities) для нормализованного хранения. ' +
      'state.ids[] для порядка, state.entities{} для O(1) lookup. Selectors мемоизированы через createSelector.',
    quote: {
      text: 'A function that generates a set of prebuilt reducers and selectors for performing CRUD operations on a normalized state structure.',
      href: 'https://redux-toolkit.js.org/api/createEntityAdapter',
    },
    lesson: { title: 'Уроки 46-53 — секция F', href: '../46-entity-why/' },
  },
  {
    name: 'combineSlices',
    category: 'core',
    short: 'Альтернатива combineReducers + lazy injection слайсов.',
    signature: `const rootReducer = combineSlices(
  authSlice, todosSlice, usersSlice
).inject(settingsSlice)`,
    description:
      'Современная замена combineReducers. Принимает массив slice-объектов, использует slice.reducerPath ' +
      'для ключа в state. Поддерживает lazy-injection через .inject() — для code-splitting features.',
    quote: {
      text: 'Combines multiple slices into a single reducer, and allows "lazy loading" of slices after initialisation.',
      href: 'https://redux-toolkit.js.org/api/combineSlices',
    },
    lesson: { title: 'Уроки 34-36', href: '../34-combineslices-basics/' },
  },
  {
    name: 'createListenerMiddleware',
    category: 'core',
    short: 'Side-effects middleware: реакция на actions + getState/dispatch/fork/take/condition.',
    signature: `const listener = createListenerMiddleware()
listener.startListening({
  actionCreator: increment,
  effect: async (action, api) => {
    await api.delay(500)
    api.dispatch(saveToServer())
  },
})`,
    description:
      'Альтернатива redux-saga / redux-observable. Слушает actions по actionCreator/type/matcher/predicate. ' +
      'Effect получает богатый API: dispatch, getState, fork, cancel, take, condition, delay, signal.',
    quote: {
      text: 'A Redux middleware that lets you define "listener" entries that contain logic that should run in response to dispatched actions or state changes.',
      href: 'https://redux-toolkit.js.org/api/createListenerMiddleware',
    },
    lesson: { title: 'Уроки 64-70 — секция H', href: '../64-listener-why/' },
  },
  {
    name: 'createSelector',
    category: 'util',
    short: 'Re-export из reselect — мемоизированные селекторы.',
    signature: `const selectCompletedCount = createSelector(
  [(s: RootState) => s.todos],
  (todos) => todos.filter(t => t.done).length
)`,
    description:
      'Не написана в RTK — это re-export из библиотеки reselect для удобства. См. ' +
      'packages/toolkit/src/index.ts. Также есть createDraftSafeSelector — версия безопасная при ' +
      'вызове внутри Immer-reducer на draft state.',
    quote: {
      text: 'The createSelector utility from the Reselect library, re-exported for ease of use.',
      href: 'https://redux-toolkit.js.org/api/createSelector',
    },
    lesson: { title: 'Уроки 41-45 — секция E', href: '../41-createselector-from-rtk/' },
  },
  {
    name: 'autoBatchEnhancer',
    category: 'util',
    short: 'Группирует subscriber-уведомления для low-priority actions. По умолчанию включён.',
    signature: `const store = configureStore({
  reducer,
  enhancers: gde => gde({
    autoBatch: { type: 'raf' },  // или 'tick' / 'timer'
  }),
})`,
    description:
      'Store enhancer, который откладывает уведомление подписчиков для actions, помеченных action.meta[SHOULD_AUTOBATCH]. ' +
      'Если в течение одного tick дispatch\'нуто 100 batched actions — subscribers будут уведомлены 1 раз. ' +
      'Используется внутри RTK Query для оптимизации.',
    quote: {
      text: 'A Redux store enhancer that looks for one or more "low-priority" dispatched actions in a row, and queues a callback to run subscriber notifications on a delay.',
      href: 'https://redux-toolkit.js.org/api/autoBatchEnhancer',
    },
    lesson: { title: 'Урок 71', href: '../15-default-enhancers-autobatch/' },
  },
  {
    name: 'nanoid / matchers / Tuple',
    category: 'util',
    short: 'Утилиты: nanoid (id), isAnyOf/isAllOf/isPending (matchers), Tuple (типизация).',
    signature: `import { nanoid, isAnyOf, isPending, Tuple } from '@reduxjs/toolkit'

nanoid()                          // "V1StGXR8_Z5jdHi6B-myT"
isAnyOf(addTodo, removeTodo)      // matcher
new Tuple(mw1, mw2)               // type-safe array`,
    description:
      'Набор маленьких утилит. nanoid — генератор уникальных id. isAnyOf/isAllOf/isPending/isFulfilled/isRejected — ' +
      'matchers для builder.addMatcher и listener middleware. Tuple — типизированный wrapper массива для middleware/enhancers.',
    quote: {
      text: 'TypeScript users are required to use a Tuple instance, for better inference.',
      href: 'https://redux-toolkit.js.org/api/configureStore#middleware',
    },
    lesson: { title: 'Уроки 23, 73, 16', href: '../23-nanoid-isallof-utils/' },
  },
  {
    name: 'createApi (RTK Query)',
    category: 'query',
    short: 'Декларативный API-слой: endpoints + auto-generated hooks.',
    signature: `const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Post'],
  endpoints: (build) => ({
    getPosts: build.query<Post[], void>({ query: () => 'posts' }),
    addPost: build.mutation<Post, NewPost>({ query: (b) => ({ url: 'posts', method: 'POST', body: b }) }),
  }),
})
export const { useGetPostsQuery, useAddPostMutation } = api`,
    description:
      'Сердце RTK Query. Декларация endpoints (queries / mutations / infiniteQueries). Генерирует ' +
      'reducer, middleware и React hooks. Автоматическая дедупликация запросов, кэширование, инвалидация по тегам, ' +
      'optimistic updates, polling, refetch on focus/reconnect.',
    quote: {
      text: 'createApi() is the core of RTK Query\'s functionality. It allows you to define a set of endpoints and describe how to retrieve data.',
      href: 'https://redux-toolkit.js.org/rtk-query/api/createApi',
    },
    lesson: { title: 'Уроки 79-103 — секции K и L', href: '../79-rtkq-what/' },
  },
  {
    name: 'fetchBaseQuery',
    category: 'query',
    short: 'Лёгкая обёртка над fetch для baseQuery в createApi.',
    signature: `const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (h, { getState }) => {
    const token = (getState() as RootState).auth.token
    if (token) h.set('Authorization', \`Bearer \${token}\`)
    return h
  },
})`,
    description:
      'Минимальный wrapper вокруг fetch с поддержкой baseUrl, prepareHeaders, paramsSerializer, validateStatus, ' +
      'responseHandler, timeout. Если не подходит — можно написать custom baseQuery (например с axios).',
    quote: {
      text: 'A small wrapper around fetch that aims to simplify requests. Intended as the recommended baseQuery.',
      href: 'https://redux-toolkit.js.org/rtk-query/api/fetchBaseQuery',
    },
    lesson: { title: 'Уроки 85, 98', href: '../85-rtkq-fetchbasequery/' },
  },
  {
    name: 'setupListeners',
    category: 'query',
    short: 'Подписывает RTK Query на window-events для refetchOnFocus / refetchOnReconnect.',
    signature: `import { setupListeners } from '@reduxjs/toolkit/query'

setupListeners(store.dispatch)`,
    description:
      'Минимальная утилита: вызовите её один раз после создания store. Подписывает API на window focus и online events, ' +
      'чтобы опции refetchOnFocus / refetchOnReconnect работали.',
    quote: {
      text: 'A utility used to enable refetchOnMount and refetchOnReconnect behaviors.',
      href: 'https://redux-toolkit.js.org/rtk-query/api/setupListeners',
    },
    lesson: { title: 'Урок 91', href: '../91-rtkq-skip-options/' },
  },
  {
    name: 'ApiProvider',
    category: 'query',
    short: 'Standalone Provider для RTK Query без своего Redux store.',
    signature: `<ApiProvider api={api}>
  <App />
</ApiProvider>`,
    description:
      'Если в проекте нет своего Redux store — ApiProvider создаст внутренний store только для RTK Query. ' +
      'Не подходит если есть глобальный state — для этого используйте обычный Provider от react-redux.',
    quote: {
      text: 'Can be used as a Provider if you do not already have a Redux store.',
      href: 'https://redux-toolkit.js.org/rtk-query/api/ApiProvider',
    },
    lesson: { title: 'Урок 81', href: '../81-rtkq-store-setup/' },
  },
]

const grid = document.getElementById('api-grid')!
const detail = document.getElementById('detail-pane')!

function renderCard(entry: ApiEntry, idx: number): string {
  const catLabel = entry.category === 'core' ? 'Core' : entry.category === 'util' ? 'Utility' : 'Query'
  return `
    <div class="api-card" data-idx="${idx}">
      <div class="api-card__name">${entry.name}</div>
      <span class="api-card__cat api-card__cat--${entry.category}">${catLabel}</span>
      <div class="api-card__short">${entry.short}</div>
    </div>
  `
}

grid.innerHTML = API.map(renderCard).join('')

const cards = grid.querySelectorAll<HTMLElement>('.api-card')

function showDetail(entry: ApiEntry): void {
  const quoteHtml = entry.quote
    ? `<div class="detail-pane__quote">«${entry.quote.text}»<br>— <a href="${entry.quote.href}" target="_blank">источник</a></div>`
    : ''
  detail.innerHTML = `
    <div class="detail-pane__name">${entry.name}</div>
    <div class="detail-pane__desc">${entry.description}</div>
    <pre class="detail-pane__sig">${entry.signature}</pre>
    ${quoteHtml}
    <div class="detail-pane__lesson">📚 Подробно: <a href="${entry.lesson.href}">${entry.lesson.title}</a></div>
  `
  con.info(`Открыто: ${entry.name}`)
}

cards.forEach((card) => {
  card.addEventListener('click', () => {
    const idx = parseInt(card.dataset.idx!, 10)
    cards.forEach((c) => c.classList.remove('api-card--active'))
    card.classList.add('api-card--active')
    showDetail(API[idx])
  })
})

con.log(`В RTK ${API.length} основных API. Кликайте карточки чтобы изучать.`)
con.info('Цвета карточек: синий — core, оранжевый — utility, фиолетовый — RTK Query.')
