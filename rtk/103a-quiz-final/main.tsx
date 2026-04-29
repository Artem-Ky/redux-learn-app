import { StrictMode, useMemo, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'

interface Question {
  id: number
  type: 'theory' | 'code'
  section: string
  topic: string
  question: string
  code?: string
  answers: [string, string, string, string]
  correct: 0 | 1 | 2 | 3
  explanation: string
  link?: string
}

// ────────────────────────────────────────────────────────────────────
// 100 вопросов — 50 теория + 50 кода
// ────────────────────────────────────────────────────────────────────
const QUESTIONS: Question[] = [
  // ════ THEORY · A. configureStore (5) ════
  { id: 1, type: 'theory', section: 'A · configureStore', topic: 'configureStore',
    question: 'Что делает configureStore "из коробки"?',
    answers: [
      'Только wrap createStore в Promise',
      'combineReducers + thunk + 3 dev-проверки + DevTools setup + autoBatchEnhancer',
      'Создаёт N stores для каждого slice',
      'Только createStore без middleware',
    ],
    correct: 1,
    explanation: 'configureStore вызывает Redux core createStore, но добавляет: combineReducers если передан объект-карта, thunk middleware, immutability/serializability/actionCreator проверки в dev, DevTools, и с RTK 2.0 — autoBatchEnhancer.',
    link: '../09-configure-vs-create-store/',
  },
  { id: 2, type: 'theory', section: 'A · configureStore', topic: 'getDefaultMiddleware',
    question: 'Какие 3 проверки добавляются по умолчанию в development?',
    answers: [
      'immutability, serializability, actionCreator',
      'typeCheck, propValidation, lint',
      'dispatchHistory, statePersistence, lint',
      'Только serializability',
    ],
    correct: 0,
    explanation: 'immutableStateInvariantMiddleware ловит мутации state, serializableStateInvariantMiddleware — non-serializable значения, actionCreatorInvariantMiddleware — попытку dispatch функции вместо action.',
    link: '../11-default-middleware/',
  },
  { id: 3, type: 'theory', section: 'A · configureStore', topic: 'autoBatchEnhancer',
    question: 'autoBatchEnhancer входит в default enhancers с какой версии?',
    answers: [
      'Не входит вообще',
      'Только с middleware',
      'С RTK 2.0 — да, включён по умолчанию',
      'С RTK 1.0',
    ],
    correct: 2,
    explanation: 'С RTK 2.0 autoBatchEnhancer добавлен в getDefaultEnhancers(). Он батчит subscriber notifications для actions с meta[SHOULD_AUTOBATCH], экономит ререндеры.',
    link: '../15-enhancers-autobatch/',
  },
  { id: 4, type: 'theory', section: 'A · configureStore', topic: 'preloadedState',
    question: 'Зачем нужен preloadedState?',
    answers: [
      'Изначальное состояние store — для SSR / rehydrate из localStorage',
      'Состояние перед dispatch',
      'Состояние reducer\'а в pending',
      'Состояние после resetApiState',
    ],
    correct: 0,
    explanation: 'preloadedState — стартовое состояние, которое передаётся в createStore. Используется для server-side rendering и для восстановления из localStorage (rehydrate).',
    link: '../18-preloaded-state/',
  },
  { id: 5, type: 'theory', section: 'A · configureStore', topic: 'devTools',
    question: 'Как отключить serializableCheck без отключения остальных проверок?',
    answers: [
      'Нельзя выключить отдельно',
      'middleware: gdm => gdm({ serializableCheck: false })',
      'Только через NODE_ENV=production',
      'Через configureStore({ devTools: false })',
    ],
    correct: 1,
    explanation: 'getDefaultMiddleware() принимает объект опций для каждой из 3 проверок: { immutableCheck, serializableCheck, actionCreatorCheck } — каждую можно отключить или передать конфиг.',
    link: '../13-serializable-middleware/',
  },

  // ════ THEORY · B. createSlice / actions (8) ════
  { id: 6, type: 'theory', section: 'B · createSlice', topic: 'action types',
    question: 'createSlice автогенерирует action.type как...',
    answers: [
      'sliceName/reducerName',
      'reducerName/sliceName',
      'Случайный uuid',
      'Только sliceName',
    ],
    correct: 0,
    explanation: 'Шаблон ${name}/${reducerKey}. Например, slice name "counter" + reducer "increment" → "counter/increment". Это действующий action.type, его и видишь в DevTools.',
    link: '../29-create-slice-types/',
  },
  { id: 7, type: 'theory', section: 'B · createSlice', topic: 'возвращаемый объект',
    question: 'Что возвращает createSlice?',
    answers: [
      'Только reducer',
      '{ name, reducer, actions, getInitialState, selectors, ... }',
      '{ actionCreators, dispatch, store }',
      '{ middleware, enhancer }',
    ],
    correct: 1,
    explanation: 'Объект с reducer (для combineReducers), actions (action creators по ключам reducers), name, getInitialState (новый объект каждый вызов), selectors (если задал), и др. Хелпер.',
    link: '../28-create-slice-basic/',
  },
  { id: 8, type: 'theory', section: 'B · createSlice', topic: 'extraReducers',
    question: 'extraReducers нужен когда:',
    answers: [
      'Никогда — всё через reducers',
      'Slice должен реагировать на actions ИЗ ДРУГИХ мест (asyncThunk, чужая slice)',
      'Только для optimistic updates',
      'Для performance',
    ],
    correct: 1,
    explanation: 'reducers секция генерирует свои action types. extraReducers — для подписки на actions, которых slice не создавала: createAsyncThunk.fulfilled, action из другой slice (auth/loggedOut → reset).',
    link: '../31-extra-reducers/',
  },
  { id: 9, type: 'theory', section: 'B · createSlice', topic: 'prepare',
    question: 'Зачем нужен prepare callback?',
    answers: [
      'Откатить mutation',
      'Сгенерировать payload (id через nanoid, timestamp, нормализация args) до reducer\'а',
      'Side effects',
      'Прочитать state',
    ],
    correct: 1,
    explanation: 'reducer должен быть pure — нельзя генерировать id или timestamp внутри него (ломает time-travel). prepare запускается ДО reducer и формирует action.payload через чистую функцию.',
    link: '../22-prepare-callback/',
  },
  { id: 10, type: 'theory', section: 'B · createSlice', topic: 'slice.selectors',
    question: 'Главное преимущество slice.selectors:',
    answers: [
      'Авто-знают свой reducerPath — переезд slice не ломает их',
      'Обязательно мемоизированные через reselect',
      'Только для async',
      'Тип состояния',
    ],
    correct: 0,
    explanation: 'slice.selectors.X(rootState) автоматически достаёт из правильного места state. Если переключаешь reducerPath, selector подстраивается. Можно пере-настроить через slice.getSelectors(s => s.someplace).',
    link: '../33-create-slice-selectors/',
  },
  { id: 11, type: 'theory', section: 'B · createSlice', topic: 'combineSlices',
    question: 'Чем combineSlices отличается от combineReducers?',
    answers: [
      'Только синтаксис — функционально идентично',
      'Принимает slice объекты напрямую (без .reducer) и поддерживает lazy injection',
      'Не поддерживает TS',
      'Не имеет middleware',
    ],
    correct: 1,
    explanation: 'combineSlices(sliceA, sliceB) сам берёт reducers и reducerPath из slice объектов. Плюс есть .inject() для динамической подгрузки (code splitting).',
    link: '../34-combineslices-basic/',
  },
  { id: 12, type: 'theory', section: 'B · createSlice', topic: 'getInitialState',
    question: 'Что возвращает slice.getInitialState()?',
    answers: [
      'Текущий state',
      'Тот initialState, что передали в createSlice (новый объект каждый вызов)',
      'Пустой объект',
      'Reducer',
    ],
    correct: 1,
    explanation: 'Полезно для тестов и для адаптеров: adapter.getInitialState({ loading: "idle" }) возвращает свежий { ids: [], entities: {}, loading: "idle" }.',
    link: '../53-entity-with-loading-state/',
  },
  { id: 13, type: 'theory', section: 'B · createSlice', topic: 'name vs reducerPath',
    question: 'name vs reducerPath в createSlice — какая разница?',
    answers: [
      'Это синонимы',
      'name → префикс action types; reducerPath → ключ в combineSlices/state',
      'name только в DevTools',
      'reducerPath игнорируется',
    ],
    correct: 1,
    explanation: 'createSlice({ name: "counter", reducerPath: "cnt" }) → action.type будет "counter/inc", но selectors будут искать в state.cnt. По дефолту reducerPath = name.',
    link: '../37-create-slice-reducerpath-rename/',
  },

  // ════ THEORY · C. Immer / pitfalls (5) ════
  { id: 14, type: 'theory', section: 'C · Immer', topic: 'produce',
    question: 'Как Immer работает в createReducer / createSlice?',
    answers: [
      'Через WeakMap',
      'Каждый reducer обёрнут в produce(state, draft => caseReducer(draft, action)) — мутируешь draft, на выходе immutable',
      'Заменяет state.spread',
      'Без Immer вообще',
    ],
    correct: 1,
    explanation: 'Immer создаёт Proxy-draft, отслеживает мутации, возвращает новый объект где изменилось — а где не менялось, ссылки те же (structural sharing).',
    link: '../26-immer-inside/',
  },
  { id: 15, type: 'theory', section: 'C · Immer', topic: 'правила',
    question: 'Можно ли в reducer одновременно мутировать draft И возвращать значение?',
    answers: [
      'Да, оба разрешены',
      'Нет — либо мутируешь и не возвращаешь, либо возвращаешь новый state без мутаций',
      'Только при extraReducers',
      'Только для async',
    ],
    correct: 1,
    explanation: 'Если оба — Immer бросает ошибку: "you can either mutate the draft OR return a new value, not both". Один из путей.',
    link: '../27-immer-pitfalls/',
  },
  { id: 16, type: 'theory', section: 'C · Immer', topic: 'current vs original',
    question: 'current(state) vs original(state) — в чём разница?',
    answers: [
      'Идентичны',
      'current — снимок draft с твоими мутациями; original — состояние ДО мутаций',
      'current сериализован, original нет',
      'original асинхронный',
    ],
    correct: 1,
    explanation: 'console.log(state) даст Proxy. current(state) — обычный JS-объект на момент вызова (после уже сделанных мутаций). original(state) — то, что было в state перед заходом в этот reducer.',
    link: '../40-original-current/',
  },
  { id: 17, type: 'theory', section: 'C · Immer', topic: 'замена корня',
    question: 'Работает ли (state) => { state = newValue } для замены корня state?',
    answers: [
      'Да, всегда',
      'Нет — это присваивание локальной переменной; нужно `return newValue`',
      'Только для primitives',
      'Только в extraReducers',
    ],
    correct: 1,
    explanation: 'state — параметр, ссылка на draft. Переприсваивание меняет только локальный binding, не draft. Чтобы заменить корень — return newValue.',
    link: '../27-immer-pitfalls/',
  },
  { id: 18, type: 'theory', section: 'C · Immer', topic: 'serializable',
    question: 'Почему важна сериализуемость state?',
    answers: [
      'Только эстетика',
      'Time-travel в DevTools, persistence (localStorage), сравнение state — всё полагается на serializability; non-plain объекты ломают',
      'Прирост скорости',
      'Из-за TypeScript',
    ],
    correct: 1,
    explanation: 'Date, Map, class instance — нельзя нормально сериализовать в JSON и восстановить. Time-travel в DevTools перестанет работать. Храни ISO-строки или числа.',
    link: '../13-serializable-middleware/',
  },

  // ════ THEORY · D. createAsyncThunk (6) ════
  { id: 19, type: 'theory', section: 'D · createAsyncThunk', topic: 'lifecycle actions',
    question: 'Сколько action creators генерирует createAsyncThunk?',
    answers: [
      '1',
      '3 — pending, fulfilled, rejected',
      '5',
      'Зависит от условий',
    ],
    correct: 1,
    explanation: 'Trio: thunk.pending, thunk.fulfilled, thunk.rejected. typePrefix виден через thunk.typePrefix. matchers — thunk.fulfilled.match(action) и т.д.',
    link: '../56-asyncthunk-actions-types/',
  },
  { id: 20, type: 'theory', section: 'D · createAsyncThunk', topic: 'thunkAPI',
    question: 'Что доступно в thunkAPI (втором аргументе payloadCreator)?',
    answers: [
      'Только dispatch',
      'dispatch, getState, extra, signal, requestId, rejectWithValue, fulfillWithValue',
      'Только Promise',
      'cache',
    ],
    correct: 1,
    explanation: 'Полный API. signal — AbortSignal для отмены. requestId — id текущей попытки. extra — то, что передал в configureStore через middleware.thunk.extraArgument.',
    link: '../58-asyncthunk-thunkapi/',
  },
  { id: 21, type: 'theory', section: 'D · createAsyncThunk', topic: 'condition',
    question: 'Зачем нужен condition callback?',
    answers: [
      'Логика после fetch',
      'Решить ДО запуска thunk: запускать или скипать (например, если уже идёт запрос)',
      'Cache options',
      'TS типизация',
    ],
    correct: 1,
    explanation: 'condition: (arg, { getState }) => boolean. Если false — thunk даже pending не задиспатчит. Удобно против дубликатов запросов.',
    link: '../60-asyncthunk-condition/',
  },
  { id: 22, type: 'theory', section: 'D · createAsyncThunk', topic: 'rejectWithValue',
    question: 'Куда попадает payload из rejectWithValue(value)?',
    answers: [
      'action.error',
      'action.payload в rejected action — это типизированная ошибка',
      'Игнорируется',
      'throw',
    ],
    correct: 1,
    explanation: 'rejectWithValue превращает ошибку в payload. В extraReducers: addCase(thunk.rejected, (s, a) => s.error = a.payload). Если просто throw — попадёт в action.error через miniSerializeError.',
    link: '../59-asyncthunk-rejectwithvalue/',
  },
  { id: 23, type: 'theory', section: 'D · createAsyncThunk', topic: 'signal',
    question: 'Что такое signal в thunkAPI?',
    answers: [
      'Symbol-маркер',
      'AbortSignal — прокидываешь в fetch, получаешь отменяемый запрос',
      'Promise resolve',
      'Logger',
    ],
    correct: 1,
    explanation: 'AbortController.signal. await fetch(url, { signal }). Когда thunk отменён через promise.abort(), signal.aborted становится true, fetch бросает AbortError.',
    link: '../61-asyncthunk-cancellation/',
  },
  { id: 24, type: 'theory', section: 'D · createAsyncThunk', topic: 'thrown errors',
    question: 'Что произойдёт если thunk бросит ошибку (не rejectWithValue)?',
    answers: [
      'Crash приложения',
      'rejected action с action.error = serialized error через miniSerializeError; promise.unwrap() бросает',
      'Тихо игнорируется',
      'Только лог',
    ],
    correct: 1,
    explanation: 'rejected action диспатчится с action.error (не payload). action.error — { name, message, code, stack } через miniSerializeError. Если await promise.unwrap() — он бросит ошибку.',
    link: '../59-asyncthunk-rejectwithvalue/',
  },

  // ════ THEORY · E. createEntityAdapter (5) ════
  { id: 25, type: 'theory', section: 'E · entityAdapter', topic: 'EntityState shape',
    question: 'Какая форма EntityState<T> по умолчанию?',
    answers: [
      '{ items: T[] }',
      '{ ids: EntityId[], entities: { [id]: T } }',
      'Map<id, T>',
      'T[]',
    ],
    correct: 1,
    explanation: 'ids[] хранит порядок (для list rendering). entities — словарь для O(1) lookup по id. Это стандартный normalized form.',
    link: '../48-entity-state-shape/',
  },
  { id: 26, type: 'theory', section: 'E · entityAdapter', topic: 'CRUD',
    question: 'addOne vs setOne vs upsertOne — отличия?',
    answers: [
      'Все одинаковы',
      'addOne — добавить, NOOP если есть; setOne — заменить полностью (создать если нет); upsertOne — shallow merge',
      'addOne всегда дубликат',
      'setOne всегда удаляет',
    ],
    correct: 1,
    explanation: 'addOne не пересохранит существующий entity. setOne — { ...newValue }, перезаписывает целиком. upsertOne — { ...existing, ...changes } — shallow merge (только верхние поля).',
    link: '../49-entity-crud-add-set-upsert/',
  },
  { id: 27, type: 'theory', section: 'E · entityAdapter', topic: 'updateOne',
    question: 'updateOne({ id, changes: { profile: { name: \'X\' } } }) для nested:',
    answers: [
      'Глубокий merge',
      'Shallow merge: profile перезаписывается целиком, age (если был) теряется',
      'Создаёт новый',
      'Игнорирует',
    ],
    correct: 1,
    explanation: 'updateOne делает Object.assign(entity, changes) на уровне changes. profile — это одно из полей changes, оно полностью заменит существующий profile.',
    link: '../50-entity-update-shallow/',
  },
  { id: 28, type: 'theory', section: 'E · entityAdapter', topic: 'selectId',
    question: 'Когда нужен кастомный selectId?',
    answers: [
      'Никогда',
      'Когда id-поле сущности называется не "id" (например bookId, _id, uuid)',
      'Только для TS',
      'Для sortComparer',
    ],
    correct: 1,
    explanation: 'createEntityAdapter<Book>({ selectId: (b) => b.bookId }). По умолчанию ищется entity.id. Если у тебя другое поле — указывай явно.',
    link: '../51-entity-selectid-sortcomparer/',
  },
  { id: 29, type: 'theory', section: 'E · entityAdapter', topic: 'sortComparer',
    question: 'Когда срабатывает sortComparer?',
    answers: [
      'На каждый useSelector',
      'Только при CRUD-операциях адаптера (addOne / setAll / upsertMany)',
      'На каждый getState',
      'Раз в секунду',
    ],
    correct: 1,
    explanation: 'sortComparer пересортирует ids[] при insert/update. Не на чтение. Это значит: если изменишь поле, по которому сорт — отдельный updateOne нужен чтобы пересортировать.',
    link: '../51-entity-selectid-sortcomparer/',
  },

  // ════ THEORY · F. listenerMiddleware / autoBatch (4) ════
  { id: 30, type: 'theory', section: 'F · listenerMiddleware', topic: 'аналоги',
    question: 'listenerMiddleware — это альтернатива чему?',
    answers: [
      'createSlice',
      'redux-saga / redux-observable / thunk-like side effects, но без yield генераторов',
      'Reducer',
      'RTK Query',
    ],
    correct: 1,
    explanation: 'Похоже на saga по концепции (effects на actions), но проще: обычные async функции, без необходимости знать concept generators.',
    link: '../64-listener-why/',
  },
  { id: 31, type: 'theory', section: 'F · listenerMiddleware', topic: 'startListening',
    question: 'startListening принимает критерий по...',
    answers: [
      'Только action.type строкой',
      'actionCreator | type | matcher | predicate (один из)',
      'Только matcher',
      'Через addEventListener',
    ],
    correct: 1,
    explanation: 'Один из 4 способов: actionCreator: increment, type: "x/y", matcher: isAnyOf(...), predicate: (action, currState, prevState) => boolean.',
    link: '../66-listener-startlistening/',
  },
  { id: 32, type: 'theory', section: 'F · listenerMiddleware', topic: 'listenerApi',
    question: 'Какие методы для backpressure / асинхронности есть в listenerApi?',
    answers: [
      'Только getState',
      'take, fork, condition, cancelActiveListeners, pause, delay, unsubscribe',
      'Только setTimeout',
      'Только dispatch',
    ],
    correct: 1,
    explanation: 'Богатый API. take — ждать конкретного action. condition — ждать предиката над state. fork — child task. cancelActiveListeners — отменить предыдущие effect-ы (для debounce/takeLatest).',
    link: '../67-listener-effect-api/',
  },
  { id: 33, type: 'theory', section: 'F · autoBatch', topic: 'что батчит',
    question: 'Что именно батчит autoBatchEnhancer?',
    answers: [
      'Network requests',
      'Subscriber notifications для actions с meta[SHOULD_AUTOBATCH]=true — экономит ререндеры',
      'Reducer вызовы',
      'Promise',
    ],
    correct: 1,
    explanation: 'Reducer всё равно запускается на каждый action. Но subscribers (включая react-redux useSelector) уведомляются батчем через queueMicrotask. RTK Query сам помечает свои actions флагом.',
    link: '../15-enhancers-autobatch/',
  },

  // ════ THEORY · G. createSelector / reselect (3) ════
  { id: 34, type: 'theory', section: 'G · createSelector', topic: 'memoization',
    question: 'createSelector мемоизирует на основе чего?',
    answers: [
      'Хешей всех аргументов',
      'Reference equality (===) input-селекторов; пересчёт если хоть один поменял ссылку',
      'JSON.stringify',
      'Структурного сравнения',
    ],
    correct: 1,
    explanation: 'Если все input-selectors вернули те же ссылки что и в прошлый раз — output не пересчитывается, возвращается кешированный. Default cache size = 1.',
    link: '../41-createselector-from-rtk/',
  },
  { id: 35, type: 'theory', section: 'G · createSelector', topic: 'createDraftSafeSelector',
    question: 'Когда нужен createDraftSafeSelector?',
    answers: [
      'Никогда',
      'Селектор вызывается ВНУТРИ reducer\'а на Immer draft — обычный селектор сломает мемоизацию',
      'Только для async',
      'Только для arrays',
    ],
    correct: 1,
    explanation: 'Immer draft — Proxy. Каждое чтение даёт новый объект-Proxy → reference сравнение в createSelector ломается, бесконечный пересчёт. createDraftSafeSelector умеет с draft.',
    link: '../42-createdraftsafeselector/',
  },
  { id: 36, type: 'theory', section: 'G · createSelector', topic: 'weakMapMemoize',
    question: 'Чем weakMapMemoize отличается от обычной мемоизации?',
    answers: [
      'Не отличается',
      'Кеш на основе WeakMap — для селекторов с разными аргументами (id) кеш per-id, не cache size 1',
      'Быстрее всегда',
      'Не работает в браузере',
    ],
    correct: 1,
    explanation: 'Стандартный createSelector с cache=1 ломается при `selectById(state, 1); selectById(state, 2); selectById(state, 1)`. weakMapMemoize держит результат для каждого id.',
    link: '../43-weakmap-memoize/',
  },

  // ════ THEORY · H. RTK Query basics (6) ════
  { id: 37, type: 'theory', section: 'H · RTKQ basics', topic: 'createApi',
    question: 'Что возвращает createApi?',
    answers: [
      'Promise',
      'Объект: reducer, middleware, endpoints, util, reducerPath + автогенерированные хуки',
      'Только reducer',
      'createStore',
    ],
    correct: 1,
    explanation: 'Полный API slice: reducer для combineReducers, middleware для configureStore, endpoints.X.{select, initiate, matchPending,...}, util.{updateQueryData, prefetch,...}, и use*Query/use*Mutation хуки.',
    link: '../80-rtkq-create-api-basic/',
  },
  { id: 38, type: 'theory', section: 'H · RTKQ basics', topic: 'baseQuery',
    question: 'Что такое baseQuery?',
    answers: [
      'Объект с config',
      'Функция (args, api, extraOpts) => Promise<{data} | {error}>',
      'Reducer',
      'URL string',
    ],
    correct: 1,
    explanation: 'BaseQueryFn. fetchBaseQuery — встроенная реализация над fetch. Но это просто функция: можно сделать axios, graphql-request, custom transport.',
    link: '../98-rtkq-base-query-custom/',
  },
  { id: 39, type: 'theory', section: 'H · RTKQ basics', topic: 'fetchBaseQuery',
    question: 'fetchBaseQuery — это для чего?',
    answers: [
      'WebSocket',
      'fetch API с baseUrl, prepareHeaders, paramsSerializer, validateStatus, timeout',
      'axios (под капотом)',
      'GraphQL',
    ],
    correct: 1,
    explanation: 'Лёгкая обёртка над window.fetch. Не зависит от axios. Поддерживает все стандартные опции HTTP.',
    link: '../85-rtkq-fetchbasequery/',
  },
  { id: 40, type: 'theory', section: 'H · RTKQ basics', topic: 'providesTags',
    question: 'Когда читается providesTags?',
    answers: [
      'На pending',
      'На fulfilled — RTKQ записывает связь tag → cacheKey в state.api.provided',
      'На любом этапе',
      'На uninitialized',
    ],
    correct: 1,
    explanation: 'Это callback (result, error, arg). Пока result нет — нечего вычислять. После fulfilled запускается, результат кладётся в provided.tags.',
    link: '../87-rtkq-tags-invalidation/',
  },
  { id: 41, type: 'theory', section: 'H · RTKQ basics', topic: 'invalidatesTags',
    question: 'Когда срабатывает invalidatesTags?',
    answers: [
      'На любой этап',
      'На fulfilled mutation — вызывает refetch для всех cacheKey, что provides эти теги',
      'На pending',
      'На rejected',
    ],
    correct: 1,
    explanation: 'Только после успеха mutation. Middleware смотрит state.api.provided.tags[tagType][id], собирает Set cacheKey, для каждого dispatches forceRefetch (если есть subscribers).',
    link: '../87-rtkq-tags-invalidation/',
  },
  { id: 42, type: 'theory', section: 'H · RTKQ basics', topic: 'middleware',
    question: 'Зачем нужен api.middleware в configureStore?',
    answers: [
      'Только для TS',
      'Lifecycle: cache cleanup timers, polling, focus refetch, optimistic, invalidation. Без него половина работать не будет',
      'Не нужен',
      'Только для DevTools',
    ],
    correct: 1,
    explanation: 'reducer работает только над state. Все side effects RTKQ (timers, refetches, listeners) — в middleware. Забыл middleware — keepUnusedDataFor не работает, refetchOnFocus тоже.',
    link: '../81-rtkq-store-setup/',
  },

  // ════ THEORY · I. RTK Query cache (8) ════
  { id: 43, type: 'theory', section: 'I · RTKQ cache', topic: 'cacheKey',
    question: 'Как формируется cacheKey?',
    answers: [
      'Только endpointName',
      '`${endpointName}(${JSON.stringify(args с отсортированными ключами)})`',
      'Случайный uuid',
      'По requestId',
    ],
    correct: 1,
    explanation: 'defaultSerializeQueryArgs использует JSON.stringify с reviver, который сортирует ключи plain-объекта. Поэтому {a:1,b:2} и {b:2,a:1} дают один cacheKey.',
    link: '../83-rtkq-cache-key/',
  },
  { id: 44, type: 'theory', section: 'I · RTKQ cache', topic: 'keepUnusedDataFor',
    question: 'keepUnusedDataFor — это ЧТО?',
    answers: [
      'TTL свежести данных',
      'Сколько cache entry живёт ПОСЛЕ refCount=0 (последний подписчик отвалился) — default 60s',
      'Polling interval',
      'Cache size limit',
    ],
    correct: 1,
    explanation: 'Это НЕ "срок годности данных". Пока хоть один useQuery смотрит — entry живёт. Когда последний отписался → setTimeout(removeQueryResult, keepUnusedDataFor*1000).',
    link: '../92-rtkq-keepunuseddatafor-cleanup/',
  },
  { id: 45, type: 'theory', section: 'I · RTKQ cache', topic: 'refetchOnMountOrArgChange',
    question: 'Что значит refetchOnMountOrArgChange: 30?',
    answers: [
      '30 секунд между fetch',
      'Если entry старше 30s от fulfilledTimeStamp — рефетчим на mount; иначе кеш',
      'Polling 30s',
      'Timeout 30s',
    ],
    correct: 1,
    explanation: 'Boolean — всегда/никогда. Number — TTL-like staleness. Это единственное встроенное "stale-while-revalidate" в RTKQ.',
    link: '../91-rtkq-skip-options/',
  },
  { id: 46, type: 'theory', section: 'I · RTKQ cache', topic: 'дедупликация',
    question: 'Как работает дедупликация запросов в RTKQ?',
    answers: [
      'Не работает',
      'Если запрос с тем же cacheKey уже pending — новый useQuery просто подписывается, baseQuery не вызывается',
      'Только для GET',
      'Через JSON.stringify response',
    ],
    correct: 1,
    explanation: 'buildInitiate проверяет state.queries[cacheKey].status. Если pending — возвращается существующий promise. Только увеличивается refCount.',
    link: '../101-rtkq-query-lifecycle-internals/',
  },
  { id: 47, type: 'theory', section: 'I · RTKQ cache', topic: 'setupListeners',
    question: 'Зачем нужен setupListeners(store.dispatch)?',
    answers: [
      'Любой RTKQ — обязательно',
      'Только refetchOnFocus и refetchOnReconnect — без него молча не работают',
      'Cache cleanup',
      'TypeScript',
    ],
    correct: 1,
    explanation: 'setupListeners навешивает window.addEventListener("focus") и ("online"). При срабатывании dispatches api/onFocus и api/onOnline action, middleware ловит → refetch для подписок с флагом.',
    link: '../91-rtkq-skip-options/',
  },
  { id: 48, type: 'theory', section: 'I · RTKQ cache', topic: 'selectFromResult',
    question: 'Что оптимизирует selectFromResult?',
    answers: [
      'Network calls',
      'Renders — компонент ререндерится только когда выбранный кусок (по shallowEqual) поменялся',
      'Bundle size',
      'Cache size',
    ],
    correct: 1,
    explanation: 'Используется reselect под капотом. Возвращаемый объект сравнивается shallow-eq на каждый redux update. Сетевых запросов это не сокращает — подписка всё равно создаётся.',
    link: '../90-rtkq-selectFromResult/',
  },
  { id: 49, type: 'theory', section: 'I · RTKQ cache', topic: 'data vs currentData',
    question: 'data vs currentData — в чём разница?',
    answers: [
      'Идентичны',
      'data — последний fulfilled любого arg; currentData — для ЭТОГО arg (undefined пока fetch после смены arg)',
      'data — для UI, currentData — для тестов',
      'currentData sync, data async',
    ],
    correct: 1,
    explanation: 'При смене arg (например page=1→2) data всё ещё держит page1 ("призрак"), currentData=undefined. UX: data + opacity = плавно; currentData + skeleton = чисто.',
    link: '../96-rtkq-conditional-fetching/',
  },
  { id: 50, type: 'theory', section: 'I · RTKQ cache', topic: 'onCacheEntryAdded',
    question: 'Для чего полезен onCacheEntryAdded?',
    answers: [
      'Optimistic updates',
      'Long-lived connections (WebSocket, SSE) — открыть в начале, закрыть через cacheEntryRemoved',
      'Любой mutation',
      'Только для логов',
    ],
    correct: 1,
    explanation: 'cacheDataLoaded и cacheEntryRemoved — два promise, привязанные к жизни entry. WS открывается, в updateCachedData кидаются сообщения, cacheEntryRemoved → ws.close().',
    link: '../94-rtkq-onCacheEntryAdded-streaming/',
  },

  // ════ CODE · J. configureStore (4) ════
  { id: 51, type: 'code', section: 'J · configureStore code', topic: 'reducer single',
    question: 'Что произойдёт при таком configureStore?',
    code: `const store = configureStore({
  reducer: counterReducer,
})`,
    answers: [
      'Ошибка — нужен обязательно объект-карта',
      'Создаст store с counterReducer как корневым; thunk + 3 dev-проверки + autoBatch включены',
      'TS не скомпилит',
      'Только createStore без middleware',
    ],
    correct: 1,
    explanation: 'reducer может быть как функцией (1 reducer), так и объектом-картой { key: reducer } — тогда внутри combineReducers. Default middleware и enhancers всегда включены.',
    link: '../10-reducer-param/',
  },
  { id: 52, type: 'code', section: 'J · configureStore code', topic: 'concat middleware',
    question: 'Что делает middleware колбэк?',
    code: `configureStore({
  reducer: { counter, todos },
  middleware: (gdm) => gdm().concat(myMiddleware),
})`,
    answers: [
      'Заменяет default middleware',
      'Добавляет myMiddleware после default — default остаётся (concat)',
      'Удаляет thunk',
      'Делает store readonly',
    ],
    correct: 1,
    explanation: 'gdm() возвращает Tuple с default middleware (thunk + 3 проверки). .concat() создаёт новый Tuple. Если бы хотел заменить — вернул бы свой массив через new Tuple().',
    link: '../11-default-middleware/',
  },
  { id: 53, type: 'code', section: 'J · configureStore code', topic: 'отключение проверки',
    question: 'Что отключилось?',
    code: `configureStore({
  reducer,
  middleware: (gdm) => gdm({ serializableCheck: false }),
})`,
    answers: [
      'Все middleware',
      'Только serializableStateInvariantMiddleware',
      'thunk',
      'autoBatch',
    ],
    correct: 1,
    explanation: 'gdm() принимает объект с тремя ключами для трёх dev-проверок. immutableCheck, serializableCheck, actionCreatorCheck — каждое можно false или объект-конфиг.',
    link: '../13-serializable-middleware/',
  },
  { id: 54, type: 'code', section: 'J · configureStore code', topic: 'enhancers',
    question: 'Как корректно добавить кастомный enhancer?',
    code: `configureStore({
  reducer,
  enhancers: (getDefault) => getDefault().concat(myEnhancer),
})`,
    answers: [
      'Так нельзя — enhancers нет в configureStore',
      'Корректно: getDefault() даёт автobatch, .concat добавляет myEnhancer',
      'Перезатёрт autoBatch',
      'TypeError',
    ],
    correct: 1,
    explanation: 'enhancers тоже принимает callback с getDefaultEnhancers(). Чтобы сохранить autoBatch — concat. Чтобы заменить — return new Tuple(myEnhancer).',
    link: '../15-enhancers-autobatch/',
  },

  // ════ CODE · K. createSlice (8) ════
  { id: 55, type: 'code', section: 'K · createSlice code', topic: 'action.type',
    question: 'Что вернёт counterSlice.actions.increment.type?',
    code: `const counterSlice = createSlice({
  name: 'counter',
  initialState: 0,
  reducers: {
    increment: (state) => state + 1,
  },
})`,
    answers: [
      "'counter'",
      "'counter/increment'",
      "'increment'",
      "'increment/counter'",
    ],
    correct: 1,
    explanation: 'Шаблон: ${name}/${reducerKey}. name="counter", key="increment" → "counter/increment". Это и есть тип action, который dispatchится.',
    link: '../29-create-slice-types/',
  },
  { id: 56, type: 'code', section: 'K · createSlice code', topic: 'prepare callback',
    question: 'Что окажется в action.payload после dispatch(addTodo(\'Buy milk\'))?',
    code: `addTodo: {
  reducer: (state, action) => { state.push(action.payload) },
  prepare: (text) => ({ payload: { id: nanoid(), text, done: false } }),
}`,
    answers: [
      "'Buy milk' (только string)",
      '{ id: \'<nanoid>\', text: \'Buy milk\', done: false }',
      'undefined',
      'Error',
    ],
    correct: 1,
    explanation: 'prepare запускается ПЕРЕД reducer. Тот аргумент, что передал в actionCreator (text), приходит в prepare. prepare формирует action.payload, это дальше попадает в reducer.',
    link: '../22-prepare-callback/',
  },
  { id: 57, type: 'code', section: 'K · createSlice code', topic: 'extraReducers',
    question: 'Что произойдёт при dispatch(otherSlice.actions.reset())?',
    code: `const auth = createSlice({
  name: 'auth',
  initialState: { user: null },
  reducers: {},
  extraReducers: (b) =>
    b.addCase(otherSlice.actions.reset, () => ({ user: null })),
})`,
    answers: [
      'Ничего — extraReducers не срабатывает на чужие slices',
      'Срабатывает: state.auth = { user: null }',
      'Crash',
      'Удалит state',
    ],
    correct: 1,
    explanation: 'extraReducers НА ТО И extra — для actions ИЗ ВНЕ slice. addCase ловит конкретный actionCreator (или type). Это canonical way для cross-slice reactivity.',
    link: '../31-extra-reducers/',
  },
  { id: 58, type: 'code', section: 'K · createSlice code', topic: 'возврат draft',
    question: 'Что не так с этим reducer?',
    code: `set: (state, action) => {
  state.x = action.payload
  return state    // 👀
},`,
    answers: [
      'Всё ОК',
      'И мутируешь, и возвращаешь — Immer бросит ошибку. Либо без return, либо `return {...state, x:...}`',
      'action.payload undefined',
      'TS error',
    ],
    correct: 1,
    explanation: 'Правило Immer: одно из двух. Возврат draft особенно бесполезен — это просто верни текущий draft. Удали return.',
    link: '../27-immer-pitfalls/',
  },
  { id: 59, type: 'code', section: 'K · createSlice code', topic: 'slice.selectors',
    question: 'Что нужно чтобы slice.selectors.visibleItems(rootState) работало?',
    code: `const slice = createSlice({
  name: 'list',
  initialState: { items: [], filter: '' },
  reducers: { /* ... */ },
  selectors: {
    visibleItems: (state) =>
      state.items.filter(i => i.includes(state.filter)),
  },
})`,
    answers: [
      'Ничего — будет работать сразу',
      'Slice должен быть в combineSlices или его reducer лежит в state по ключу name (default reducerPath)',
      'Только TypeScript',
      'Невозможно',
    ],
    correct: 1,
    explanation: 'slice.selectors — селекторы, которые работают с ROOT state. Они достают свой подslice по reducerPath (по умолчанию = name). Если slice не подключён — селектор вернёт undefined.field.',
    link: '../33-create-slice-selectors/',
  },
  { id: 60, type: 'code', section: 'K · createSlice code', topic: 'name vs reducerPath',
    question: 'Какой будет action.type для inc?',
    code: `const slice = createSlice({
  name: 'counter',
  reducerPath: 'cnt',
  initialState: 0,
  reducers: { inc: (s) => s + 1 },
})`,
    answers: [
      "'cnt/inc'",
      "'counter/inc' (name → action types, reducerPath → state path)",
      "'cnt-counter/inc'",
      'Error',
    ],
    correct: 1,
    explanation: 'name влияет ТОЛЬКО на префикс action types. reducerPath — куда reducer попадёт в combineSlices/state. Это позволяет переименовывать ключи в state, не меняя actions.',
    link: '../37-create-slice-reducerpath-rename/',
  },
  { id: 61, type: 'code', section: 'K · createSlice code', topic: 'dispatch без скобок',
    question: 'Что произойдёт?',
    code: `dispatch(slice.actions.incBy)   // 👀 без скобок!`,
    answers: [
      'count увеличится на 1',
      'actionCreatorInvariantMiddleware варнит в dev (передаём функцию вместо action); в prod — тихо ничего не происходит',
      'Crash',
      'count = NaN',
    ],
    correct: 1,
    explanation: 'incBy — это actionCreator (функция). Без вызова () — dispatch получает функцию вместо {type, payload}. Reducer ничего не понимает, state не обновляется. В dev есть проверка.',
    link: '../14-action-invariant-middleware/',
  },
  { id: 62, type: 'code', section: 'K · createSlice code', topic: 'addCase string',
    question: 'Что не так с типизацией?',
    code: `extraReducers: (b) => {
  b.addCase('OTHER_TYPE', (s, a) => { s.value = a.payload })
}`,
    answers: [
      'Всё ОК',
      'addCase со строкой даёт слабую типизацию action — рекомендация: actionCreator или matcher',
      'addCase не существует',
      'Runtime error',
    ],
    correct: 1,
    explanation: 'Работать будет, но action.payload в TS — unknown. Лучше передавать actionCreator: addCase(otherSlice.actions.something) — TS выведет правильный тип payload.',
    link: '../31-extra-reducers/',
  },

  // ════ CODE · L. Immer (4) ════
  { id: 63, type: 'code', section: 'L · Immer code', topic: 'console.log Proxy',
    question: 'Что выведет console.log(state.items) внутри reducer?',
    code: `import { current } from '@reduxjs/toolkit'
add: (state, a) => {
  console.log(state.items)              // ?
  console.log(current(state.items))     // ?
  state.items.push(a.payload)
}`,
    answers: [
      'Обычный массив в обоих случаях',
      'Первый — Immer Proxy с длинной нотацией; второй — обычный массив (current — для дебага)',
      'undefined',
      'Ошибка',
    ],
    correct: 1,
    explanation: 'state.items — Proxy от Immer. Console.log Proxy показывает странную форму. current(...) даёт plain JS объект на момент вызова.',
    link: '../40-original-current/',
  },
  { id: 64, type: 'code', section: 'L · Immer code', topic: 'переприсваивание',
    question: 'Что произойдёт после dispatch(reset())?',
    code: `reset: (state) => {
  state = { value: 100 }   // 👀
}`,
    answers: [
      'state.value = 100',
      'state.value = 0 — присваивание локальной переменной не меняет draft. Нужно мутировать поля или return',
      'Crash',
      'undefined',
    ],
    correct: 1,
    explanation: 'state — параметр, ссылка на draft. state = {} меняет только локальную переменную. Правильно: state.value = 100 (мутация поля), либо return { value: 100 }.',
    link: '../27-immer-pitfalls/',
  },
  { id: 65, type: 'code', section: 'L · Immer code', topic: 'find + мутация',
    question: 'Это валидный код?',
    code: `rename: (state, a) => {
  const i = state.items.find(x => x.id === a.payload.id)
  if (i) i.name = a.payload.name
}`,
    answers: [
      'Нет — нельзя мутировать find результат',
      'Да — Immer корректно отслеживает мутацию через Proxy. items[index] получит новый объект',
      'Только в strict mode',
      'Падает в prod',
    ],
    correct: 1,
    explanation: 'find возвращает ссылку на element draft (тоже Proxy). Любая мутация через i.name=... ловится Immer и применяется к immutable копии в финале.',
    link: '../26-immer-inside/',
  },
  { id: 66, type: 'code', section: 'L · Immer code', topic: 'original',
    question: 'Что выведет console.log(before, state.value)?',
    code: `import { original } from '@reduxjs/toolkit'
reducer: (state, action) => {
  const before = original(state.value)
  state.value = action.payload
  console.log(before, state.value)
}`,
    answers: [
      'Идентичные значения',
      'before — состояние ДО мутаций в этом reducer; state.value — после мутации',
      'Оба undefined',
      'Crash',
    ],
    correct: 1,
    explanation: 'original() даёт snapshot состояния как оно было перед заходом в reducer. state.value — текущий draft. Полезно для логики "если было X, теперь стало Y → ...".',
    link: '../40-original-current/',
  },

  // ════ CODE · M. createAsyncThunk (6) ════
  { id: 67, type: 'code', section: 'M · createAsyncThunk code', topic: 'auto-generated types',
    question: 'Какие 3 action.type будут сгенерированы?',
    code: `const fetchUser = createAsyncThunk(
  'users/fetchById',
  async (id: number) => fetch(\`/api/users/\${id}\`).then(r => r.json())
)`,
    answers: [
      'fetchUser/start, fetchUser/end, fetchUser/error',
      'users/fetchById/pending, users/fetchById/fulfilled, users/fetchById/rejected',
      'users/pending, users/fulfilled, users/rejected',
      'fetchUser/0, fetchUser/1, fetchUser/2',
    ],
    correct: 1,
    explanation: 'typePrefix передан как первый аргумент. Три суффикса: pending/fulfilled/rejected. Видны через fetchUser.pending.type, fetchUser.fulfilled.type и т.д.',
    link: '../56-asyncthunk-actions-types/',
  },
  { id: 68, type: 'code', section: 'M · createAsyncThunk code', topic: 'rejectWithValue payload',
    question: 'Куда попадёт {code: 500, msg: ...}?',
    code: `async (_, { rejectWithValue }) => {
  try { return await fetch('/posts').then(r => r.json()) }
  catch (e) {
    return rejectWithValue({ code: 500, msg: String(e) })
  }
}
// в reducer:
.addCase(fetchPosts.rejected, (state, action) => {
  state.error = action.???
})`,
    answers: [
      'action.error',
      'action.payload — потому что использовали rejectWithValue',
      'action.meta.arg',
      'action.payload.error',
    ],
    correct: 1,
    explanation: 'rejectWithValue — typed error path. Он кладёт переданное значение в action.payload (НЕ в action.error). Если бы был throw — попало бы в action.error через miniSerializeError.',
    link: '../59-asyncthunk-rejectwithvalue/',
  },
  { id: 69, type: 'code', section: 'M · createAsyncThunk code', topic: 'condition',
    question: 'Что делает condition?',
    code: `createAsyncThunk(
  'users/fetchOnce',
  async (id) => fetch(\`/users/\${id}\`).then(r => r.json()),
  {
    condition: (id, { getState }) => {
      const s = getState() as RootState
      return s.users[id]?.status !== 'loading'
    },
  }
)`,
    answers: [
      'Не запускает thunk если status==="loading" — предотвращает дубликаты',
      'Логгер',
      'Тип проверка',
      'Cache TTL',
    ],
    correct: 0,
    explanation: 'condition: arg, thunkAPI → boolean. Если false — thunk даже pending не задиспатчит. Идеально для "нажал кнопку 5 раз — реально один запрос".',
    link: '../60-asyncthunk-condition/',
  },
  { id: 70, type: 'code', section: 'M · createAsyncThunk code', topic: 'abort',
    question: 'Что произойдёт при promise.abort()?',
    code: `const promise = dispatch(fetchUser(5))
promise.abort()`,
    answers: [
      'Ничего',
      'AbortController шлёт сигнал в thunkAPI.signal; если payloadCreator передаёт signal в fetch — fetch отменится → rejected с error.name="AbortError"',
      'Promise висит',
      'Crash',
    ],
    correct: 1,
    explanation: 'createAsyncThunk встроенно поддерживает AbortController. promise.abort() триггерит signal. payloadCreator должен явно прокинуть signal в fetch чтобы реально отменить.',
    link: '../61-asyncthunk-cancellation/',
  },
  { id: 71, type: 'code', section: 'M · createAsyncThunk code', topic: 'addMatcher',
    question: 'Это валидно?',
    code: `const fetchA = createAsyncThunk('a/fetch', async () => {})
const fetchB = createAsyncThunk('b/fetch', async () => {})

reducer.addMatcher(isAnyOf(fetchA.pending, fetchB.pending), (state) => {
  state.loading = true
})`,
    answers: [
      'Нет — пересечение типов',
      'Да — addMatcher с isAnyOf ловит pending из обоих thunks; единое место для loading',
      'Только если они в одном slice',
      'Только в TS',
    ],
    correct: 1,
    explanation: 'isAnyOf создаёт matcher, который true если action удовлетворяет хотя бы одному из переданных. Идеально для "any pending → loading=true".',
    link: '../25-add-matcher-default/',
  },
  { id: 72, type: 'code', section: 'M · createAsyncThunk code', topic: 'isRejected matcher',
    question: 'Когда сработает этот matcher?',
    code: `extraReducers: (b) => {
  b.addMatcher(isRejected, (state, action) => {
    state.error = action.error.message
  })
}`,
    answers: [
      'На любую rejected action — любой thunk в приложении',
      'Только specific thunk',
      'Никогда',
      'Только pending',
    ],
    correct: 0,
    explanation: 'isRejected (без аргументов) — это глобальный matcher. Любой createAsyncThunk.rejected пройдёт через него. Иногда полезно для централизованной error handling, но осторожно — поймает все.',
    link: '../23-matchers-utilities/',
  },

  // ════ CODE · N. createEntityAdapter (4) ════
  { id: 73, type: 'code', section: 'N · entityAdapter code', topic: 'sortComparer',
    question: 'Какой будет state.ids после двух addOne?',
    code: `const adapter = createEntityAdapter<Book>({
  selectId: (b) => b.bookId,
  sortComparer: (a, b) => a.title.localeCompare(b.title),
})

dispatch(adapter.addOne({ bookId: 'b1', title: 'Zoo' }))
dispatch(adapter.addOne({ bookId: 'a1', title: 'Apple' }))`,
    answers: [
      "['b1', 'a1']",
      "['a1', 'b1'] — sortComparer сортирует по title после каждой CRUD",
      "[]",
      "['a1']",
    ],
    correct: 1,
    explanation: 'sortComparer пересортирует ids[] на каждой операции CRUD. "Apple" < "Zoo" → bookId="a1" впереди.',
    link: '../51-entity-selectid-sortcomparer/',
  },
  { id: 74, type: 'code', section: 'N · entityAdapter code', topic: 'shallow update',
    question: 'Что в state.entities[1] после updateOne?',
    code: `// до: state.entities[1] = { id:1, profile:{ name:'A', age:30 } }
dispatch(adapter.updateOne({
  id: 1,
  changes: { profile: { name: 'X' } }
}))`,
    answers: [
      "{ id:1, profile:{ name:'X', age:30 } }",
      "{ id:1, profile:{ name:'X' } } — shallow merge, age потерян",
      'Глубокий merge',
      'Crash',
    ],
    correct: 1,
    explanation: 'updateOne делает Object.assign на уровне changes. profile в changes — это целый объект, который ПЕРЕЗАПИШЕТ старый profile. age не перенесётся.',
    link: '../50-entity-update-shallow/',
  },
  { id: 75, type: 'code', section: 'N · entityAdapter code', topic: 'selectById type',
    question: 'Какой тип у post?',
    code: `const selectors = adapter.getSelectors((s: RootState) => s.posts)
const post = selectors.selectById(rootState, 5)`,
    answers: [
      'Post',
      'Post | undefined (entry может не существовать)',
      'EntityState<Post>',
      'number',
    ],
    correct: 1,
    explanation: 'selectById не гарантирует наличие — id может не быть в entities. TS правильно типизирует как Post | undefined.',
    link: '../52-entity-selectors/',
  },
  { id: 76, type: 'code', section: 'N · entityAdapter code', topic: 'getInitialState extra',
    question: 'Какой shape у initialState?',
    code: `const initialState = adapter.getInitialState({ loading: 'idle' })`,
    answers: [
      "{ loading: 'idle' }",
      "{ ids: [], entities: {}, loading: 'idle' } — extra поля мерджатся к стандартному EntityState",
      "{ ids: ['idle'] }",
      'Error',
    ],
    correct: 1,
    explanation: 'getInitialState(extraState) создаёт стандартный EntityState и спред extraState. Удобно для добавления loading/error/filters рядом с normalized данными.',
    link: '../53-entity-with-loading-state/',
  },

  // ════ CODE · O. listenerMiddleware (3) ════
  { id: 77, type: 'code', section: 'O · listener code', topic: 'delay',
    question: 'Что делает api.delay(500)?',
    code: `listener.startListening({
  actionCreator: counterSlice.actions.incremented,
  effect: async (action, api) => {
    await api.delay(500)
    if (api.getState().counter > 10) {
      api.dispatch(counterSlice.actions.warned())
    }
  }
})`,
    answers: [
      'Простой setTimeout без cancel',
      'Cancellable delay; если effect отменён через cancelActiveListeners → delay бросает cancellation error',
      'Spinner',
      'Pause всего store',
    ],
    correct: 1,
    explanation: 'listenerApi.delay интегрирован с lifecycle effect. Если listener был отменён — delay отбросит promise. Это правильный способ дебаунсить (cancel предыдущий + delay).',
    link: '../69-listener-debounce-throttle/',
  },
  { id: 78, type: 'code', section: 'O · listener code', topic: 'predicate',
    question: 'Когда сработает effect?',
    code: `listener.startListening({
  predicate: (action, currentState, prevState) => {
    return currentState.counter !== prevState.counter
  },
  effect: (action, api) => { console.log('counter changed') },
})`,
    answers: [
      'На каждый dispatch',
      'Только когда counter ИЗМЕНИЛСЯ этим dispatch (state-based predicate)',
      'Никогда',
      'Только на increment',
    ],
    correct: 1,
    explanation: 'predicate получает (action, currentState, prevState). Возвращаешь boolean. true → effect запускается. Идеально для "реагируй когда поле X изменилось", независимо от типа action.',
    link: '../66-listener-startlistening/',
  },
  { id: 79, type: 'code', section: 'O · listener code', topic: 'prepend',
    question: 'Почему prepend, а не concat для listener?',
    code: `configureStore({
  reducer: rootReducer,
  middleware: (gdm) => gdm()
    .prepend(listener.middleware)
    .concat(api.middleware),
})`,
    answers: [
      'Случайно',
      'Listener должен видеть actions ДО default middleware (на сырые actions); prepend ставит впереди очереди',
      'Только синтаксис',
      'Перформанс',
    ],
    correct: 1,
    explanation: 'middleware chain выполняется в порядке: первый prepend → ... → последний concat → reducer. Listener prepend = первый в очереди, видит все actions до того, как они изменят что-либо.',
    link: '../65-listener-setup/',
  },

  // ════ CODE · P. createSelector (3) ════
  { id: 80, type: 'code', section: 'P · selector code', topic: 'recompute trigger',
    question: 'Когда происходит пересчёт filter?',
    code: `const selectVisibleTodos = createSelector(
  [(s) => s.todos, (s) => s.filter],
  (todos, filter) => todos.filter(t => t.text.includes(filter))
)`,
    answers: [
      'На каждый useSelector',
      'Только когда state.todos ИЛИ state.filter (по reference) поменялись',
      'Один раз навсегда',
      'По таймеру',
    ],
    correct: 1,
    explanation: 'createSelector кеширует результат. input-selectors сравниваются по ===. Если оба те же — return из cache. Если хоть один поменял ссылку — пересчёт.',
    link: '../41-createselector-from-rtk/',
  },
  { id: 81, type: 'code', section: 'P · selector code', topic: 'cache size 1',
    question: 'В чём проблема?',
    code: `const selectByIdMemo = createSelector(
  [(s) => s.users, (_, id) => id],
  (users, id) => users.find(u => u.id === id)
)
// в компоненте:
const u5 = useSelector(s => selectByIdMemo(s, 5))
const u7 = useSelector(s => selectByIdMemo(s, 7))`,
    answers: [
      'Всё хорошо',
      'cache size = 1; чередующиеся вызовы с разными id ломают мемоизацию (cache miss каждый раз). Нужен weakMapMemoize',
      'Не работает',
      'TS error',
    ],
    correct: 1,
    explanation: 'Default cache=1. selectByIdMemo(s, 5) → cache=[5]. Затем selectByIdMemo(s, 7) → cache miss, пересчёт, cache=[7]. Потом снова 5 → cache miss. Все рендеры — пересчёт.',
    link: '../43-weakmap-memoize/',
  },
  { id: 82, type: 'code', section: 'P · selector code', topic: 'createSelector в slice',
    question: 'Это работает?',
    code: `const slice = createSlice({
  name: 'a',
  initialState: { items: [] },
  reducers: { /* ... */ },
  selectors: {
    selectFiltered: createSelector(
      [(state) => state.items],
      (items) => items.filter(i => i.done)
    )
  }
})

slice.selectors.selectFiltered(rootState)`,
    answers: [
      'Нет — нельзя в slice.selectors',
      'Да — createSelector внутри slice.selectors поддерживается, мемоизация работает',
      'Только без createSelector',
      'Только для async',
    ],
    correct: 1,
    explanation: 'slice.selectors поддерживает любые селекторы, включая memoized из createSelector. RTK сам оборачивает их так, что они автоматически достают свой sub-state.',
    link: '../44-slice-selectors-with-createselector/',
  },

  // ════ CODE · Q. RTK Query createApi (5) ════
  { id: 83, type: 'code', section: 'Q · RTKQ createApi code', topic: 'auto hooks',
    question: 'Откуда взялся useGetPostsQuery?',
    code: `const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  endpoints: (build) => ({
    getPosts: build.query<Post[], void>({ query: () => 'posts' }),
  }),
})
const { useGetPostsQuery } = api`,
    answers: [
      'Импорт',
      'Авто-генерация: для каждого endpoint — use${PascalCase}Query (или Mutation)',
      'Не существует',
      'Через generic',
    ],
    correct: 1,
    explanation: 'createApi из @reduxjs/toolkit/query/react автоматически генерирует хуки для каждого endpoint. Для query — useXQuery, для mutation — useXMutation. Имя — pascalCase от ключа endpoint.',
    link: '../80-rtkq-create-api-basic/',
  },
  { id: 84, type: 'code', section: 'Q · RTKQ createApi code', topic: 'prepareHeaders',
    question: 'Когда вызывается prepareHeaders?',
    code: `fetchBaseQuery({
  baseUrl: '/api/',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token
    if (token) headers.set('Authorization', \`Bearer \${token}\`)
    return headers
  },
})`,
    answers: [
      'На init',
      'На КАЖДЫЙ fetch — берёт текущий token из store',
      'Раз в час',
      'Только на mutation',
    ],
    correct: 1,
    explanation: 'fetchBaseQuery вызывает prepareHeaders перед каждым реальным запросом. Это гарантирует: token обновился в store → следующий запрос использует новый token.',
    link: '../85-rtkq-fetchbasequery/',
  },
  { id: 85, type: 'code', section: 'Q · RTKQ createApi code', topic: 'cacheKey order',
    question: 'Сколько cache entries будет?',
    code: `useGetPostsQuery({ page: 1, sort: 'date' })
useGetPostsQuery({ sort: 'date', page: 1 })`,
    answers: [
      '2 — разный порядок аргументов',
      '1 — defaultSerializeQueryArgs сортирует ключи объекта',
      '0',
      'Зависит от тегов',
    ],
    correct: 1,
    explanation: 'JSON.stringify с reviver сортирует Object.keys() рекурсивно. Поэтому {a,b} и {b,a} превращаются в одну строку → один cacheKey → один реальный запрос.',
    link: '../83-rtkq-cache-key/',
  },
  { id: 86, type: 'code', section: 'Q · RTKQ createApi code', topic: 'mutation dedup',
    question: 'Сколько запросов уйдёт?',
    code: `const [trigger] = api.useAddPostMutation()
trigger({ title: 'hi' })
trigger({ title: 'hi' })`,
    answers: [
      '1 — дедупликация как у queries',
      '2 — mutations НЕ дедуплицируются; каждый trigger = новый запрос',
      '0',
      'Зависит от cacheKey',
    ],
    correct: 1,
    explanation: 'queries — read, идемпотентные → дедуплицируются. mutations — write, могут иметь side effects → каждый вызов отдельный запрос. Если хочешь "один в момент времени" — fixedCacheKey + бизнес-логика.',
    link: '../86-rtkq-mutations/',
  },
  { id: 87, type: 'code', section: 'Q · RTKQ createApi code', topic: 'transformResponse',
    question: 'Что попадёт в state.api.queries[key].data?',
    code: `build.query<Post[], void>({
  query: () => 'posts',
  transformResponse: (raw: { items: Post[] }) => raw.items,
})`,
    answers: [
      'raw envelope { items: ... }',
      'Только массив raw.items — после transformResponse результат сохраняется в cache',
      'undefined',
      'Promise',
    ],
    correct: 1,
    explanation: 'transformResponse — последний шаг перед записью в cache. Тип build.query<TResult,TArg> описывает РЕЗУЛЬТАТ ПОСЛЕ transform. data в хуке — это уже массив items.',
    link: '../89-rtkq-transformResponse/',
  },

  // ════ CODE · R. RTK Query hooks (4) ════
  { id: 88, type: 'code', section: 'R · RTKQ hooks code', topic: 'isFetching после invalidate',
    question: 'isLoading и isFetching после invalidate?',
    code: `// первый mount fulfilled, потом:
dispatch(api.util.invalidateTags(['Post']))
// что увидит компонент?`,
    answers: [
      'isLoading=true, isFetching=true',
      'isLoading=false (уже был успех ранее), isFetching=true (background refetch идёт)',
      'Оба false',
      'Оба true',
    ],
    correct: 1,
    explanation: 'isLoading=true только когда data === undefined И status=pending (первая загрузка). После invalidate data сохраняется (старая), идёт refetch → isFetching=true, isLoading=false.',
    link: '../96-rtkq-conditional-fetching/',
  },
  { id: 89, type: 'code', section: 'R · RTKQ hooks code', topic: 'selectFromResult',
    question: 'Что произойдёт при mutation, обновляющей post#5?',
    code: `function PostRow({ id }) {
  const { post } = useGetPostsQuery(undefined, {
    selectFromResult: ({ data }) => ({
      post: data?.find(p => p.id === id),
    }),
  })
  return <div>{post?.title}</div>
}
// 100 PostRow в дереве, optimistic patch меняет post#5`,
    answers: [
      'Все 100 ререндерятся',
      'Только PostRow(5) — selectFromResult вернул новый ref для post#5; для остальных post — same ref → shallow-eq → no rerender',
      'Никто не ререндерится',
      'Crash',
    ],
    correct: 1,
    explanation: 'Структурное разделение Immer: data[5] получил новый ref (потому что мутация), data[0..4,6..99] — те же refs. shallowEqual возвращаемого { post } сравнивает поле post по ===.',
    link: '../90-rtkq-selectFromResult/',
  },
  { id: 90, type: 'code', section: 'R · RTKQ hooks code', topic: 'skip',
    question: 'Что будет при skipQuery=true?',
    code: `const skipQuery = !userId
const { data } = useGetUserQuery(userId, { skip: skipQuery })`,
    answers: [
      'Запрос идёт всё равно',
      'Запроса нет, data=undefined, isUninitialized=true; cacheKey даже не создаётся',
      'data=null',
      'Crash',
    ],
    correct: 1,
    explanation: 'skip:true пропускает initiate целиком: ни fetch, ни subscription, ни cache entry. data — undefined. Если был раньше успех с другим arg, data берётся из той entry если cacheKey совпал.',
    link: '../91-rtkq-skip-options/',
  },
  { id: 91, type: 'code', section: 'R · RTKQ hooks code', topic: 'prefetch ifOlderThan',
    question: 'Что делает ifOlderThan: 30?',
    code: `const prefetch = api.usePrefetch('getPost')
<Link onMouseEnter={() => prefetch(5, { ifOlderThan: 30 })} />`,
    answers: [
      'Ждёт 30s',
      'Если cache entry получена менее 30s назад — НЕ fetch; иначе fetch',
      'TTL хранения',
      'Polling interval',
    ],
    correct: 1,
    explanation: 'ifOlderThan позволяет не дёргать сеть, если кеш свежий. force: true игнорирует кеш всегда. Без обоих — берётся из кеша если есть, иначе fetch.',
    link: '../95-rtkq-manual-cache/',
  },

  // ════ CODE · S. RTK Query tags / cache (5) ════
  { id: 92, type: 'code', section: 'S · RTKQ tags code', topic: 'LIST tag',
    question: 'Что рефетчится после addPost?',
    code: `getPosts: build.query<Post[], void>({
  providesTags: (r) => r
    ? [...r.map(p => ({type:'Post' as const, id:p.id})), {type:'Post' as const, id:'LIST'}]
    : [{type:'Post' as const, id:'LIST'}],
}),
addPost: build.mutation({
  invalidatesTags: [{ type:'Post', id:'LIST' }],
}),
// + 5 detail-кэшей getPost(1..5)`,
    answers: [
      'Ничего',
      'Только getPosts (единственный, кто provides LIST); 5 detail-кэшей не трогаются',
      'getPosts + все getPost',
      'resetApiState',
    ],
    correct: 1,
    explanation: 'addPost инвалидирует {Post, id:"LIST"}. getPost(N) provides {Post, id:N} — это другие buckets. Только getPosts провайдит LIST → только он рефетчится.',
    link: '../88-rtkq-tags-granular/',
  },
  { id: 93, type: 'code', section: 'S · RTKQ tags code', topic: 'item tag',
    question: 'Что рефетчится после updatePost({id:5})?',
    code: `getPosts: { providesTags: per-item + LIST }
getPost: { providesTags: (_,_,id) => [{ type:'Post', id }] }
updatePost: { invalidatesTags: (_,_,arg) => [{type:'Post', id:arg.id}] }
// dispatch updatePost({id:5, patch:{title:'new'}})`,
    answers: [
      'Только getPost(5)',
      'getPost(5) + getPosts (он тоже provides {Post,id:5}); другие detail НЕ трогаются',
      'Все 100 getPost',
      'Ничего',
    ],
    correct: 1,
    explanation: 'updatePost инвалидирует {Post,id:5}. Этот тег провайдят: getPost(5) (через id) + getPosts (он провайдит ВСЕ item-теги в массиве). Ни один другой getPost(N).',
    link: '../88-rtkq-tags-granular/',
  },
  { id: 94, type: 'code', section: 'S · RTKQ tags code', topic: 'updateQueryData без entry',
    question: 'Это работает если getPosts entry НЕ существует?',
    code: `dispatch(api.util.updateQueryData('getPosts', undefined, (draft) => {
  const p = draft.find(x => x.id === 5)
  if (p) p.title = 'new'
}))`,
    answers: [
      'Да, создаст entry',
      'Нет — noop. updateQueryData применяется только к существующей entry. Для создания используй upsertQueryData',
      'Crash',
      'Только для mutations',
    ],
    correct: 1,
    explanation: 'Это самая частая ошибка optimistic updates. Если компонент с useGetPostsQuery не смонтирован — нет entry — нет patches. Проверка через api.endpoints.getPosts.select()(state).status==="fulfilled" или upsert.',
    link: '../95-rtkq-manual-cache/',
  },
  { id: 95, type: 'code', section: 'S · RTKQ tags code', topic: 'patchResult.undo',
    question: 'Что делает r.undo()?',
    code: `const r = dispatch(api.util.updateQueryData('getPosts', undefined, draft => {
  const p = draft.find(x => x.id === 5)
  if (p) p.title = 'new'
}))
// потом:
r.undo()`,
    answers: [
      'Заново отправляет запрос',
      'Применяет inversePatches как новый patch — откатывает только это изменение (другие изменения после остаются)',
      'resetApiState',
      'Ничего',
    ],
    correct: 1,
    explanation: 'undo не "вернуть в прошлое". Он применяет обратные patches. Если между patch и undo прошёл refetch — undo откатит ТОЛЬКО твою мутацию поверх нового состояния.',
    link: '../93-rtkq-onQueryStarted-optimistic/',
  },
  { id: 96, type: 'code', section: 'S · RTKQ tags code', topic: 'optimistic with rollback',
    question: 'Что произойдёт при ошибке сервера?',
    code: `async onQueryStarted({ id, body }, { dispatch, queryFulfilled }) {
  const r = dispatch(api.util.updateQueryData('getPosts', undefined, (draft) => {
    const t = draft.find(x => x.id === id)
    if (t) Object.assign(t, body)
  }))
  try { await queryFulfilled }
  catch { r.undo() }
}`,
    answers: [
      'Optimistic update остаётся',
      'queryFulfilled бросит rejection → catch → r.undo() → cache откатывается к состоянию ДО patch',
      'Crash',
      'data=null',
    ],
    correct: 1,
    explanation: 'queryFulfilled — Promise<{data}>. При ошибке он rejects. catch ловит, undo применяет inversePatches. UX: пользователь увидит мгновенное обновление, потом откат на rollback.',
    link: '../93-rtkq-onQueryStarted-optimistic/',
  },

  // ════ CODE · T. RTK Query advanced (4) ════
  { id: 97, type: 'code', section: 'T · RTKQ advanced code', topic: 'cacheEntryRemoved',
    question: 'Когда вызовется ws.close()?',
    code: `async onCacheEntryAdded(arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
  const ws = new WebSocket(\`wss://api/chat/\${arg}\`)
  try {
    await cacheDataLoaded
    ws.addEventListener('message', e => {
      updateCachedData(d => { d.push(JSON.parse(e.data)) })
    })
  } catch {}
  await cacheEntryRemoved
  ws.close()
}`,
    answers: [
      'Сразу после mount',
      'Когда cacheEntryRemoved promise resolved — то есть после refCount=0 и истёк keepUnusedDataFor таймер',
      'Никогда',
      'На любую mutation',
    ],
    correct: 1,
    explanation: 'cacheEntryRemoved — Promise<void>, который resolves когда RTKQ удаляет entry из state. Это происходит после: все unsubscribe → refCount=0 → setTimeout(removeQueryResult, keepUnusedDataFor*1000) → таймер догорел.',
    link: '../94-rtkq-onCacheEntryAdded-streaming/',
  },
  { id: 98, type: 'code', section: 'T · RTKQ advanced code', topic: 'infinite pattern',
    question: 'Что это за паттерн?',
    code: `build.query<Item[], void>({
  query: () => 'items',
  serializeQueryArgs: ({ endpointName }) => endpointName,
  merge: (current, incoming) => { current.push(...incoming) },
  forceRefetch: ({ currentArg, previousArg }) => currentArg !== previousArg,
})`,
    answers: [
      'Optimistic update',
      'Infinite/cumulative cache — все вызовы под одним cacheKey, новые данные мерджатся в существующий массив',
      'Polling',
      'Code split',
    ],
    correct: 1,
    explanation: 'Это ручная реализация infinite query (до v2 build.infiniteQuery). serializeQueryArgs возвращает константу → один cacheKey. merge добавляет новую страницу. forceRefetch триггерит fetch при смене pageParam.',
    link: '../100-rtkq-infinite-queries/',
  },
  { id: 99, type: 'code', section: 'T · RTKQ advanced code', topic: 'retry maxRetries',
    question: 'Сколько попыток максимум?',
    code: `const baseQueryWithRetry = retry(
  fetchBaseQuery({ ... }),
  { maxRetries: 3 }
)`,
    answers: [
      '3',
      '4 — первый запрос + 3 retry',
      'Бесконечно',
      '1',
    ],
    correct: 1,
    explanation: 'maxRetries — количество retry POSLE первой неудачи. Итого: 1 первая попытка + 3 ретрая = 4 attempt максимум, прежде чем endpoint reject\'нет.',
    link: '../97-rtkq-error-handling/',
  },
  { id: 100, type: 'code', section: 'T · RTKQ advanced code', topic: 'reauth pattern',
    question: 'Что эта функция делает?',
    code: `const baseQueryWithReauth = async (args, api, extra) => {
  let result = await rawBaseQuery(args, api, extra)
  if (result.error?.status === 401) {
    const refresh = await rawBaseQuery(
      { url: '/refresh', method: 'POST' }, api, extra
    )
    if (refresh.data) {
      api.dispatch(setToken(refresh.data.token))
      result = await rawBaseQuery(args, api, extra)
    } else {
      api.dispatch(logout())
    }
  }
  return result
}`,
    answers: [
      'Кеширует ответ',
      'Custom baseQuery с авто-reauth: на 401 → /refresh → повторяет оригинальный запрос с новым токеном',
      'Polling',
      'Optimistic update',
    ],
    correct: 1,
    explanation: 'Канонический паттерн для refresh-token. Промежуточная обёртка между endpoints и реальным fetchBaseQuery. В реальном prod добавляют mutex (async-mutex) от параллельных refresh.',
    link: '../98-rtkq-base-query-custom/',
  },
]

// ────────────────────────────────────────────────────────────────────
// UI компонент
// ────────────────────────────────────────────────────────────────────

type FilterMode = 'all' | 'theory' | 'code'

function QuestionCard({ q, answer, onAnswer }: {
  q: Question
  answer: number | undefined
  onAnswer: (i: number) => void
}): ReactElement {
  const answered = answer !== undefined
  return (
    <div className="question">
      <div className="question__head">
        <span className="question__n">№{q.id}</span>
        <span className={`question__type question__type--${q.type}`}>
          {q.type === 'theory' ? 'теория' : 'код'}
        </span>
        <span className="question__topic">· {q.topic}</span>
      </div>
      <div className="question__text">{q.question}</div>
      {q.code && <pre className="question__code">{q.code}</pre>}
      <div>
        {q.answers.map((a, i) => {
          const letter = String.fromCharCode(65 + i)
          let className = 'answer'
          if (answered) {
            if (i === q.correct) className += answer === q.correct ? ' correct' : ' unselected-correct'
            else if (i === answer) className += ' wrong'
          }
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              className={className}
              onClick={() => onAnswer(i)}
            >
              <span className="answer__letter">{letter}</span>
              <span style={{ flex: 1 }}>{a}</span>
            </button>
          )
        })}
      </div>
      {answered && (
        <div className="explanation">
          <strong>{answer === q.correct ? '✔ Верно' : '✖ Не совсем'} —</strong> {q.explanation}
          {q.link && (
            <>
              {' · '}
              <a href={q.link} style={{ color: 'var(--accent-cyan)' }}>→ к уроку</a>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function App(): ReactElement {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [filter, setFilter] = useState<FilterMode>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return QUESTIONS
    return QUESTIONS.filter(q => q.type === filter)
  }, [filter])

  const stats = useMemo(() => {
    const total = QUESTIONS.length
    const answered = Object.keys(answers).length
    const correct = QUESTIONS.filter(q => answers[q.id] === q.correct).length
    const wrong = answered - correct
    return { total, answered, correct, wrong, pct: total > 0 ? (answered / total) * 100 : 0 }
  }, [answers])

  // группировка по section
  const sections = useMemo(() => {
    const groups: Record<string, Question[]> = {}
    for (const q of filtered) {
      if (!groups[q.section]) groups[q.section] = []
      groups[q.section].push(q)
    }
    return groups
  }, [filtered])

  const onAnswer = (qid: number, idx: number): void => {
    setAnswers(prev => ({ ...prev, [qid]: idx }))
  }
  const reset = (): void => {
    if (window.confirm('Сбросить все ответы?')) setAnswers({})
  }

  const verdict = (correct: number): { label: string; color: string } => {
    if (correct >= 90) return { label: '🏆 Эксперт — иди проектируй архитектуру', color: 'var(--success)' }
    if (correct >= 70) return { label: '✓ Хороший рабочий уровень', color: 'var(--success)' }
    if (correct >= 50) return { label: '~ Middle — повтори слабые темы', color: 'var(--warning)' }
    return { label: '× Стоит пройти курс снова', color: 'var(--accent-red)' }
  }

  return (
    <div>
      <div className="quiz-stats">
        <div className="quiz-stats__row">
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>прогресс: </span>
            <span className="quiz-stats__num">{stats.answered}/{stats.total}</span>
          </div>
          <div>
            <span className="quiz-stats__correct">✔ {stats.correct}</span>
          </div>
          <div>
            <span className="quiz-stats__wrong">✖ {stats.wrong}</span>
          </div>
          <div>
            <button className="btn" onClick={reset}>↻ сброс</button>
          </div>
        </div>
        <div className="quiz-stats__bar">
          <div className="quiz-stats__bar-fill" style={{ width: `${stats.pct}%` }} />
        </div>
      </div>

      <div className="quiz-filter">
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '.78rem' }}>фильтр:</span>
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>все 100</button>
        <button className={filter === 'theory' ? 'active' : ''} onClick={() => setFilter('theory')}>теория (50)</button>
        <button className={filter === 'code' ? 'active' : ''} onClick={() => setFilter('code')}>код (50)</button>
      </div>

      {Object.entries(sections).map(([section, qs]) => (
        <div key={section}>
          <div className="qsection">
            <h3>{section}</h3>
            <p>{qs.length} вопросов</p>
          </div>
          {qs.map(q => (
            <QuestionCard key={q.id} q={q} answer={answers[q.id]} onAnswer={(i) => onAnswer(q.id, i)} />
          ))}
        </div>
      ))}

      {stats.answered === stats.total && stats.total > 0 && (
        <div className="final-card">
          <div className="final-card__score">{stats.correct}/100</div>
          <div className="final-card__verdict" style={{ color: verdict(stats.correct).color }}>
            {verdict(stats.correct).label}
          </div>
          <div className="final-card__hint">
            Ошибки: пройдись по «→ к уроку» в пояснениях. Можешь сбросить и пройти заново.
          </div>
          <div className="reset-btn">
            <button className="btn btn--accent" onClick={reset}>↻ Заново</button>
          </div>
        </div>
      )}
    </div>
  )
}

const host = document.getElementById('react-root')!
createRoot(host).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
