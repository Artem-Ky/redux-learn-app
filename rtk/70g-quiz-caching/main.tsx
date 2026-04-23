import {
  configureStore,
  createEntityAdapter,
  createSlice,
  nanoid,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Mini-store (чтобы в DevTools было что посмотреть) ──────

interface Product {
  id: string
  title: string
  price: number
  fetchedAt: number
}

const productsAdapter = createEntityAdapter<Product>()

const productsSlice = createSlice({
  name: 'products',
  initialState: productsAdapter.getInitialState({ lastFetchedAt: 0 }, [
    { id: nanoid(), title: 'Cache welcome', price: 0, fetchedAt: Date.now() },
  ]),
  reducers: {
    productAdded: productsAdapter.addOne,
  },
})

const store = configureStore({ reducer: { products: productsSlice.reducer } })

// ── Recaps ─────────────────────────────────────────────────

interface RecapBlock {
  num: string
  title: string
  lead: string
  snippets: { label: string; code: string }[]
  insights?: { kind: 'key' | 'trap' | 'good'; html: string }[]
}

const recaps: RecapBlock[] = [
  {
    num: 'Урок 70a',
    title: 'Пять слоёв кэша и оптимизаций в RTK',
    lead:
      'RTK даёт <strong>пять независимых слоёв</strong> кэширования, которые работают вместе. Layer 1 — <strong>structural sharing</strong> (Immer держит ссылки на нетронутые подграфы). Layer 2 — <strong>memoized selectors</strong> (<code>createSelector</code> не пересчитывает derive, если входы те же). Layer 3 — <strong>EntityAdapter</strong> (<code>{ids, entities}</code> превращает state в хеш-карту с O(1) lookup). Layer 4 — <strong>request dedup</strong> (<code>condition</code> + listener <code>cancelActiveListeners</code>). Layer 5 — <strong>TTL + invalidation</strong> (<code>fetchedAt</code> в entity + condition по свежести). Все пять — это то, что RTKQ в дальнейшем объединяет в один декларативный API.',
    snippets: [
      {
        label: 'условный стек — ментальная модель',
        code:
`// ── Layer 5: TTL cache
condition: (id, { getState }) => {
  const cached = getState().products.entities[id]
  return !cached || Date.now() - cached.fetchedAt > 10_000
}
// ── Layer 4: in-flight dedup (по id)
condition: (_, { getState }) => !getState().products.inflight[id]
// ── Layer 3: EntityAdapter — O(1) точка входа
const adapter = createEntityAdapter<Product>()
// ── Layer 2: memoized selector
const selectVisible = createSelector([selectAll, selectFilter], ...)
// ── Layer 1: structural sharing (Immer автоматом)
reducers: { toggled: (s, a) => { s.items[a.payload].done = !s.items[a.payload].done } }
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>Все пять слоёв работают вместе.</strong> Убери любой — увидишь симптом. Убери L2 → компоненты перерендериваются. Убери L3 → <code>find</code> по id из 10k-массива. Убери L4 → сеть бьётся N раз. Убери L5 → переход туда-обратно каждый раз fetch. RTKQ закрывает L4, L5 и часть L3 автоматически, L1 — бесплатно через Immer, L2 — остаётся на разработчике.',
      },
    ],
  },

  {
    num: 'Урок 70b',
    title: 'Structural sharing: Immer и reference equality',
    lead:
      'Immer под капотом в <code>createSlice</code> возвращает <strong>новую ссылку только на ту часть state, которая реально изменилась</strong>. Если reducer не тронул draft (например, <code>return</code> без мутации), Immer вернёт <strong>тот же объект</strong>. Это бесплатный L1-кэш: <code>useSelector(s =&gt; s.users)</code> не триггерит re-render, если <code>users</code> не менялся — даже когда другой slice обновился. Но есть ловушки: возврат <strong>новой ссылки вручную</strong> (<code>state.items = [...state.items]</code>) или <strong>мутация после чистого чтения</strong> ломает это.',
    snippets: [
      {
        label: 'что делает Immer с тремя reducers',
        code:
`// Действие todoAdded → меняется ТОЛЬКО todos-поддерево
//   state.todos    → новая ссылка
//   state.users    → ТА ЖЕ ссылка (не трогали)
//   state.ui       → ТА ЖЕ ссылка

// useSelector(s => s.users) — компонент НЕ перерисуется,
// потому что === сравнение даёт true.

// ❌ сломает L1
reducers: {
  noopBad: (s) => {
    s.items = [...s.items]   // перезапись той же логики → НОВАЯ ссылка на items
  }
}

// ✅ корректно
reducers: {
  noopGood: () => {
    // просто ничего не делаем — Immer вернёт ту же ссылку
  }
}
`,
      },
    ],
    insights: [
      {
        kind: 'trap',
        html:
          '<strong>Immer ≠ deep structural sharing.</strong> Он держит ссылку только для <em>нетронутых</em> подграфов. Как только вы добавили <code>s.items.push()</code>, <code>s.items</code> получает новую ссылку, даже если другие entries не менялись. Для устойчивой мемоизации списка используйте L2 (<code>createSelector</code>).',
      },
    ],
  },

  {
    num: 'Урок 70c',
    title: 'createSelector: мемоизация производных',
    lead:
      '<code>createSelector(inputs, compute)</code> запоминает <strong>последний</strong> результат + входы. Повторный вызов с <strong>теми же ссылками</strong> на входы — возвращает кэшированное значение без compute. Это L2: уровень view-derive. Применяется для фильтрации, сортировки, мапов, <code>join</code> данных между слайсами. Две важные детали. <strong>Default memo size = 1</strong>: в списке компонентов с разными id (<code>selectById(state, id)</code>) — промах почти всегда, нужен <code>weakMapMemoize</code>. <strong>Inputs должны возвращать стабильные ссылки</strong>: если вход — это <code>{ ...state.filter }</code>, то каждый call даёт новую ссылку и мемо никогда не срабатывает.',
    snippets: [
      {
        label: 'правильный createSelector',
        code:
`import { createSelector } from '@reduxjs/toolkit'

const selectUsers = (s: RootState) => s.users.entities
const selectFilter = (s: RootState) => s.ui.filter

const selectAdmins = createSelector(
  [selectUsers, selectFilter],
  (users, filter) => Object.values(users).filter(u =>
    u.role === 'admin' && u.name.includes(filter)
  )
)

// Вход 1 раз: compute работает.
// Вход 2 раз с теми же ссылками: compute НЕ работает, кэш.
// Когда users добавит пользователя → ссылка на entities изменится
// → компонент пересчитает список.
`,
      },
      {
        label: 'lruMemoize vs weakMapMemoize',
        code:
`// ❌ default lruMemoize size 1 — ломается на параметризованном селекторе
const selectUserById = createSelector(
  [(s: RootState) => s.users.entities, (_: RootState, id: string) => id],
  (users, id) => users[id]
)
// Список из 100 компонентов с разными id → cache hit в 1 из 100.

// ✅ weakMapMemoize — кэш на ключ по id
import { weakMapMemoize } from 'reselect'

const selectUserById = createSelector(
  [(s: RootState) => s.users.entities, (_: RootState, id: string) => id],
  (users, id) => users[id],
  { memoize: weakMapMemoize, argsMemoize: weakMapMemoize }
)
`,
      },
    ],
    insights: [
      {
        kind: 'trap',
        html:
          '<strong>Самая частая ошибка:</strong> input-селектор возвращает новый объект на каждый вызов (<code>s =&gt; ({ ...s.user })</code> или <code>s =&gt; s.items.filter(...)</code>). Тогда equality по ссылке всегда false, мемо бесполезно. Inputs должны быть «лёгкие лазерные указатели»: берут готовую ссылку из state.',
      },
    ],
  },

  {
    num: 'Урок 70d',
    title: 'EntityAdapter: O(1) доступ как cache-таблица',
    lead:
      'Adapter превращает data-slice в <strong>плоскую хеш-таблицу</strong>. Поиск по id — <code>entities[id]</code>, O(1). Замена — O(1). Удаление — O(1) для entities + O(n) на <code>ids.filter</code>. Это L3. На 10k записей разница с <code>Array.find</code> — десятки раз. Ключевые операции: <code>addOne</code> (тихий no-op при дубле), <code>setOne</code> (replace целиком), <code>upsertOne</code> (shallow merge — «пришёл ответ сервера → обновить запись»). <code>getSelectors()</code> даёт <code>selectById</code>, <code>selectAll</code>, <code>selectTotal</code> — всё сразу типизированное.',
    snippets: [
      {
        label: 'addOne vs setOne vs upsertOne',
        code:
`// Старт: entities.p1 = { id: 'p1', title: 'Old', price: 10 }

addOne({ id: 'p1', title: 'New' })
// → no-op (p1 уже есть). title НЕ меняется.

setOne({ id: 'p1', title: 'New' })
// → entities.p1 = { id:'p1', title:'New' }   (price ПОТЕРЯН!)

upsertOne({ id: 'p1', title: 'New' })
// → entities.p1 = { id:'p1', title:'New', price: 10 }  (shallow merge)

updateOne({ id: 'p1', changes: { price: 20 } })
// → Object.assign(entity, changes) — shallow
// если в changes nested объект, он заменит прежний nested целиком
`,
      },
    ],
    insights: [
      {
        kind: 'good',
        html:
          '<strong>Сцепка L3 + L2:</strong> <code>adapter.getSelectors().selectById</code> — это default <code>lruMemoize size 1</code>. На списке компонентов с разными id даст промах. Используйте <code>weakMapMemoize</code>, чтобы L3 и L2 работали вместе.',
      },
      {
        kind: 'trap',
        html:
          '<strong>upsertOne ≠ deep merge.</strong> Если в payload есть <code>meta: {...}</code>, старый meta заменяется целиком. Для глубокого merge — ручной spread в reducer\'е или плоская модель данных.',
      },
    ],
  },

  {
    num: 'Урок 70e',
    title: 'Request dedup: condition vs listener cancel',
    lead:
      '<strong>Два разных типа дубликатов</strong> — два разных решения. <strong>① Идемпотентные</strong> (кнопка дважды нажата, оба fetchPosts() без аргумента) — <code>condition: (_, { getState }) =&gt; getState().posts.loading !== \'pending\'</code>. Второй dispatch вернёт rejected action с <code>meta.condition=true</code>, <strong>без pending</strong>. <strong>② Последовательно-разные</strong> (search-as-you-type, каждый keystroke — другой query) — listener с <code>api.cancelActiveListeners()</code> перед <code>api.delay(250)</code>. Старый effect получит <code>TaskAbortError</code>, выкинется в catch, до сервера дойдёт только последний. Параметризованный dedup (fetch по id, но параллельно разные id) — не condition по <code>loading</code> (он отсечёт всё), а <strong>inflight per id</strong>: <code>Record&lt;id, boolean&gt;</code>.',
    snippets: [
      {
        label: 'condition — против спам-клика',
        code:
`const fetchPosts = createAsyncThunk<void, void, { state: RootState }>(
  'posts/fetch',
  async () => { await api.getPosts() },
  {
    condition: (_, { getState }) =>
      getState().posts.loading !== 'pending',
  },
)

// dispatch спамим — только первый долетит до pending.
// Остальные: rejected, meta.condition === true, сети НЕТ.
`,
      },
      {
        label: 'listener + cancelActiveListeners — search',
        code:
`listener.startListening({
  actionCreator: queryChanged,
  effect: async (action, api) => {
    api.cancelActiveListeners()   // убивает предыдущий эффект
    await api.delay(250)          // debounce
    try {
      const result = await api.dispatch(fetchSearch(action.payload)).unwrap()
      api.dispatch(searchReceived(result))
    } catch {
      // TaskAbortError — отменены новым keystroke
    }
  },
})
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>Condition по loading:"pending" ломает параллельность.</strong> Если вы вызываете <code>fetchProduct(1)</code> и тут же <code>fetchProduct(2)</code>, общий флаг loading=pending отсечёт второй. Правильно — per-id inflight: <code>Record&lt;id, boolean&gt;</code>, а condition проверяет <code>!inflight[id]</code>.',
      },
    ],
  },

  {
    num: 'Урок 70f',
    title: 'TTL + invalidation: самый простой «expiring cache»',
    lead:
      'Храним <code>fetchedAt: Date.now()</code> прямо в entity. В condition проверяем <code>Date.now() - fetchedAt &lt; TTL</code>: если свежо — skip (cache hit), если протухло — fetch. <strong>Invalidation</strong> — reducer, который сбрасывает <code>fetchedAt = 0</code> (следующий condition скажет stale) или удаляет запись целиком (<code>removeOne/removeAll</code>). Полезный паттерн — <strong>три уровня свежести</strong>: fresh (не fetch), stale (показать старое + fetch в фоне), expired (ждать fetch, старое не показывать). <strong>Нельзя класть</strong> в state: setTimeout id, Promise, AbortController, Date-объект — только скаляры.',
    snippets: [
      {
        label: 'TTL cache через condition + fetchedAt',
        code:
`interface Product { id: number; title: string; fetchedAt: number }

const TTL_MS = 10_000

const fetchProduct = createAsyncThunk<Product, number, { state: RootState }>(
  'products/fetch',
  async (id) => ({ ...(await api.getProduct(id)), fetchedAt: Date.now() }),
  {
    condition: (id, { getState }) => {
      const cached = getState().products.entities[id]
      if (!cached) return true                          // miss
      return Date.now() - cached.fetchedAt > TTL_MS     // stale?
    },
  },
)
`,
      },
      {
        label: 'стратегии invalidation',
        code:
`reducers: {
  invalidateOne: (s, a: PayloadAction<number>) => {
    const e = s.entities[a.payload]
    if (e) e.fetchedAt = 0          // следующий condition = stale
  },
  invalidateAll: (s) => {
    for (const id of s.ids) s.entities[id as number]!.fetchedAt = 0
  },
  hardReset: (s) => {
    productsAdapter.removeAll(s)    // совсем очищаем кэш
  },
}
`,
      },
    ],
    insights: [
      {
        kind: 'good',
        html:
          '<strong>RTKQ-аналоги:</strong> <code>keepUnusedDataFor</code> (60s по умолчанию) — сколько держать данные после отписки. <code>refetchOnMountOrArgChange</code> / <code>refetchOnFocus</code> / <code>refetchOnReconnect</code> — триггеры свежести. <code>tagTypes + providesTags + invalidatesTags</code> — декларативная group-инвалидация. Всё то же, что мы собираем руками — но из коробки.',
      },
    ],
  },
]

// ── Quiz ──────────────────────────────────────────────────

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
    title: 'Layer 1 — structural sharing и reference equality',
    prompt:
      'После <code>dispatch(todoAdded(...))</code> изменился только <code>state.todos</code>. У вас есть селекторы <code>sUsers = s =&gt; s.users</code>, <code>sTodos = s =&gt; s.todos</code>, <code>sAll = s =&gt; s</code>. Какие утверждения верны?',
    options: [
      {
        text: 'sUsers(prev) === sUsers(next) — true',
        correct: true,
        verdict:
          'Верно. Users не трогали, Immer вернёт ту же ссылку. useSelector(sUsers) не перерисуется.',
      },
      {
        text: 'sTodos(prev) === sTodos(next) — true',
        correct: false,
        verdict:
          'Нет. Todos изменился — это новая ссылка. useSelector(sTodos) перерисуется.',
      },
      {
        text: 'sAll(prev) === sAll(next) — true',
        correct: false,
        verdict:
          'Нет. Root меняется всегда, когда меняется любой slice. Поэтому sAll — антипаттерн, он принуждает к re-render на любой dispatch.',
      },
      {
        text: 'Если бы reducer делал <code>s.users = { ...s.users }</code> без изменений — sUsers(prev) === sUsers(next) был бы true',
        correct: false,
        verdict:
          'Нет. Spread создаёт новую ссылку — L1 сломан. Immer бесплатен ТОЛЬКО когда вы не трогаете draft.',
      },
    ],
    explain:
      '<strong>Structural sharing = "не тронул → та же ссылка".</strong> Работает автоматически в Immer. Ломается ручным spread даже тогда, когда данные не менялись. Селекторы типа <code>s =&gt; s</code> — антипаттерн, т.к. root всегда новый.',
  },

  {
    num: 2,
    title: 'createSelector: input-селектор возвращает новый объект',
    prompt:
      'Вы написали:<pre>const selectFilter = (s: RootState) =&gt;\n  ({ role: s.ui.role, search: s.ui.search })\n\nconst selectMatching = createSelector(\n  [selectUsers, selectFilter],\n  (users, f) =&gt; users.filter(u =&gt; u.role === f.role)\n)</pre>Какие утверждения верны?',
    options: [
      {
        text: 'Мемоизация работает нормально, так как inputs явно заданы',
        correct: false,
        verdict:
          'Нет. selectFilter каждый раз возвращает НОВЫЙ объект → shallow equality false → compute запускается на каждый call.',
      },
      {
        text: 'Compute-функция запускается на КАЖДЫЙ вызов — мемо бесполезно',
        correct: true,
        verdict:
          'Верно. Это самая частая ошибка. Lint-rule "no-create-object-in-selector" специально про это.',
      },
      {
        text: 'Фикс — разбить на два input-селектора: <code>s =&gt; s.ui.role</code> и <code>s =&gt; s.ui.search</code>',
        correct: true,
        verdict:
          'Да. Теперь каждый input возвращает примитив/ту же ссылку, мемо работает.',
      },
      {
        text: 'Фикс — добавить <code>{ memoize: weakMapMemoize }</code>',
        correct: false,
        verdict:
          'Нет. weakMapMemoize нужен для параметризованных селекторов с разными id. Проблема здесь — нестабильный input, а не размер кэша. weakMapMemoize тоже сравнивает по ссылке.',
      },
    ],
    explain:
      '<strong>Input-селектор = лёгкий указатель в state.</strong> Никогда не создавайте объекты внутри input — они ломают equality. Мемо компонента (compute) занимается трансформацией.',
  },

  {
    num: 3,
    title: 'EntityAdapter: upsertOne и nested объекты',
    prompt:
      '<code>entities.p1 = { id:"p1", title:"Old", meta:{ tags:["js"], views: 100 } }</code>. Диспатчим <code>upsertOne({ id:"p1", meta:{ tags:["go"] } })</code>. Что получится?',
    options: [
      {
        text: '{ id:"p1", title:"Old", meta:{ tags:["go"], views:100 } } — deep merge',
        correct: false,
        verdict:
          'Нет. upsertOne — SHALLOW. Deep merge он никогда не делает.',
      },
      {
        text: '{ id:"p1", title:"Old", meta:{ tags:["go"] } } — views потерян',
        correct: true,
        verdict:
          'Правильно. meta в payload полностью заменил прежний meta. title сохранился — он на верхнем уровне.',
      },
      {
        text: 'title тоже потерян, потому что setOne',
        correct: false,
        verdict:
          'Нет. Это поведение setOne. upsertOne = shallow merge верхнего уровня → title цел.',
      },
      {
        text: 'Чтобы сохранить views — держите entity плоской: <code>{ id, title, tags, views }</code>',
        correct: true,
        verdict:
          'Да. Нормализация лучше работает с плоскими entity. Nested объекты всегда чреваты shallow-merge-сюрпризами.',
      },
    ],
    explain:
      '<strong>upsertOne = <code>Object.assign({}, old, payload)</code>.</strong> Верхний уровень мерджится, вложенные объекты заменяются целиком. То же касается updateOne.',
  },

  {
    num: 4,
    title: 'Request dedup: параллельные fetch разных id',
    prompt:
      'Вы написали:<pre>const fetchProduct = createAsyncThunk&lt;Product, number, { state: RootState }&gt;(\n  "products/fetch", fetchFn,\n  { condition: (_, { getState }) =&gt; getState().products.loading !== "pending" }\n)</pre>Дальше: <code>dispatch(fetchProduct(1)); dispatch(fetchProduct(2));</code>. Что произойдёт?',
    options: [
      {
        text: 'Оба запроса пойдут параллельно — разные id',
        correct: false,
        verdict:
          'Нет. condition смотрит на ОБЩИЙ флаг loading. Пока первый pending — второй отсекается, даже с другим id.',
      },
      {
        text: 'Только fetchProduct(1) улетит, fetchProduct(2) отсечётся condition → rejected с meta.condition',
        correct: true,
        verdict:
          'Верно. Флаг loading = глобальный для всех id. Это баг такого подхода.',
      },
      {
        text: 'Правильный фикс — <code>inflight: Record&lt;number, boolean&gt;</code> + <code>condition: (id, { getState }) =&gt; !getState().products.inflight[id]</code>',
        correct: true,
        verdict:
          'Да. Per-id флаг inflight — стандартное решение. Каждый id независим.',
      },
      {
        text: 'Лучше использовать listener с cancelActiveListeners вместо condition',
        correct: false,
        verdict:
          'Не в этом кейсе. cancelActiveListeners отменяет ПРЕДЫДУЩИЙ эффект — т.е. fetch(1) был бы отменён fetch(2). Это поведение search-as-you-type (отмена старого), а нужна была параллельная работа.',
      },
    ],
    explain:
      '<strong>Condition по глобальному флагу = dedup только без параметров.</strong> Параметризованный dedup требует per-key inflight. RTKQ делает это автоматически по cacheKey.',
  },

  {
    num: 5,
    title: 'TTL cache: что возвращает dispatch при hit',
    prompt:
      '<code>condition</code> проверяет свежесть и возвращает <code>false</code> (данные в кэше). Что приходит обратно из <code>await store.dispatch(fetchProduct(1))</code>?',
    options: [
      {
        text: 'fulfilled action с кэшированным payload',
        correct: false,
        verdict:
          'Нет. Payload-creator не запускался — RTK не знает, что кэшировать. Fulfilled НЕ диспатчится.',
      },
      {
        text: 'rejected action, у которого <code>meta.condition === true</code> и payload отсутствует',
        correct: true,
        verdict:
          'Верно. Это отличает "условное пропускание" от реальной ошибки сети. Payload нет, есть только meta.',
      },
      {
        text: 'pending action тоже НЕ диспатчится',
        correct: true,
        verdict:
          'Да. Одно из отличий condition: pending пропускается. Loading-индикатор не зажжётся.',
      },
      {
        text: '<code>.unwrap()</code> на такой результат — выкинет ошибку ConditionError',
        correct: true,
        verdict:
          'Да. unwrap выбрасывает для любого rejected, в т.ч. condition-rejected. Если для вас condition — не ошибка, проверяйте <code>meta.condition</code> без unwrap.',
      },
    ],
    explain:
      '<strong>condition=false → rejected без pending.</strong> В UI проверяйте <code>if (rejected.match(r) && r.meta.condition) { /* cache hit, это нормально */ }</code>.',
  },

  {
    num: 6,
    title: 'weakMapMemoize vs lruMemoize',
    prompt:
      'У вас список из 100 <code>&lt;User /&gt;</code>, каждый зовёт <code>useSelector(s =&gt; selectUserById(s, id))</code>. Селектор создан через <code>createSelector</code> с дефолтными опциями. Что происходит?',
    options: [
      {
        text: 'Cache size = 1. При пробеге цикла по 100 id все 100 — промахи',
        correct: true,
        verdict:
          'Верно. lruMemoize size 1 кэширует только ПОСЛЕДНЕГО. При id=5 после id=4 — промах.',
      },
      {
        text: 'createSelector автоматически увеличивает size под количество id',
        correct: false,
        verdict:
          'Нет. Default size — 1. Увеличение требует явного <code>{ memoize: lruMemoize, memoizeOptions: { maxSize: 100 } }</code>.',
      },
      {
        text: 'Фикс — <code>{ memoize: weakMapMemoize, argsMemoize: weakMapMemoize }</code>',
        correct: true,
        verdict:
          'Да. weakMapMemoize хранит кэш по цепочке ключей — размер ограничен только GC. Идеально для параметризованных селекторов.',
      },
      {
        text: 'Если использовать <code>adapter.getSelectors()</code>, проблема решается сама',
        correct: false,
        verdict:
          'Нет. selectById от getSelectors — тоже lruMemoize size 1. RTK об этом предупреждает в docs.',
      },
    ],
    explain:
      '<strong>Default cache size 1 = ловушка для списков.</strong> Параметризованный селектор всегда требует либо lruMemoize с большим maxSize, либо weakMapMemoize.',
  },

  {
    num: 7,
    title: 'Invalidation: какой reducer правильно пишется',
    prompt:
      'Нужно инвалидировать ОДНУ запись так, чтобы следующий <code>fetchProduct(id)</code> прошёл через condition и сходил в сеть. Какие варианты сработают?',
    options: [
      {
        text: '<pre>invalidateOne: (s, a) =&gt; {\n  const e = s.entities[a.payload]\n  if (e) e.fetchedAt = 0\n}</pre>',
        correct: true,
        verdict:
          'Да. fetchedAt=0 → condition увидит <code>Date.now() - 0 &gt; TTL</code> = true → fetch.',
      },
      {
        text: '<pre>invalidateOne: (s, a) =&gt; {\n  adapter.removeOne(s, a.payload)\n}</pre>',
        correct: true,
        verdict:
          'Да. Нет записи → condition "cached === undefined → true" → fetch. Минус: UI не покажет старое во время fetch.',
      },
      {
        text: '<pre>invalidateOne: (s, a) =&gt; {\n  clearTimeout(s.entities[a.payload].timer)\n}</pre>',
        correct: false,
        verdict:
          'Нет. Таймер нельзя держать в state (не сериализуется). И даже если бы можно — это не влияет на condition.',
      },
      {
        text: '<pre>invalidateOne: (s, a) =&gt; {\n  adapter.updateOne(s, { id: a.payload, changes: { fetchedAt: 0 } })\n}</pre>',
        correct: true,
        verdict:
          'Да. Вариант через updateOne — эквивалентен прямой мутации. Удобен если предпочитаете adapter-API.',
      },
    ],
    explain:
      '<strong>Две техники invalidation:</strong> сбросить <code>fetchedAt=0</code> (stale-while-revalidate: UI видит старое) или удалить запись (фиолетовый экран до ответа). Выбор — по UX.',
  },

  {
    num: 8,
    title: 'Layer stack — что RTKQ делает сам',
    prompt:
      'Отметьте всё, что RTK Query берёт на себя автоматически (без единой строки кода от вас).',
    options: [
      {
        text: 'Dedup параллельных запросов одного endpoint с тем же аргументом',
        correct: true,
        verdict:
          'Да. RTKQ кэширует по <code>endpoint + serializedArg</code>, два одновременных useQuery → одна сеть.',
      },
      {
        text: 'Мемоизация селекторов для производных значений',
        correct: false,
        verdict:
          'Нет. RTKQ даёт useQuery с кэшем, но любые derivative (фильтр/сорт/join) — ваши через createSelector.',
      },
      {
        text: 'Отмена предыдущего запроса при смене аргумента (unmount/argChange)',
        correct: true,
        verdict:
          'Да. AbortController встроен, при смене arg старый fetch отменяется.',
      },
      {
        text: 'Structural sharing (Immer) в reducer\'ах api-slice',
        correct: true,
        verdict:
          'Да. Api-slice — обычный slice под капотом. Immer работает бесплатно.',
      },
      {
        text: 'TTL / refetch-триггеры (on-mount, on-focus, on-reconnect)',
        correct: true,
        verdict:
          'Да. <code>refetchOnMountOrArgChange</code>, <code>refetchOnFocus</code>, <code>refetchOnReconnect</code>, <code>keepUnusedDataFor</code>.',
      },
      {
        text: 'Group-invalidation по тегам',
        correct: true,
        verdict:
          'Да. <code>tagTypes + providesTags + invalidatesTags</code> — декларативная замена ручному <code>invalidateAll</code>.',
      },
    ],
    explain:
      '<strong>RTKQ автоматизирует L1 (бесплатно), L3 (частично — по cacheKey), L4 и L5.</strong> L2 (мемоизация селекторов) остаётся на вас — применяется ПОВЕРХ useQuery-данных.',
  },

  {
    num: 9,
    title: 'Пять слоёв: какой симптом от какого слоя',
    prompt:
      'Баг: «при печати в search каждый keystroke дёргает сеть, 15 запросов в секунду, последний бьёт поверх восьмого, данные пляшут». Что сработает?',
    options: [
      {
        text: 'createSelector для выведенного списка результатов',
        correct: false,
        verdict:
          'Нет. Это L2, мемо derive. Она не убирает лишние сетевые запросы. Баг — на уровне L4.',
      },
      {
        text: 'listener middleware с <code>cancelActiveListeners</code> + <code>delay(250)</code>',
        correct: true,
        verdict:
          'Да. Каждый keystroke отменяет предыдущий effect, delay(250) даёт debounce. До сервера дойдёт только последний.',
      },
      {
        text: 'condition по <code>loading !== "pending"</code>',
        correct: false,
        verdict:
          'Нет. Condition отсечёт новый keystroke, пока первый в полёте, — но это значит, что пользователь печатает, а запрашивается всё ещё первая буква. Здесь нужна ОТМЕНА старого, а не пропуск нового.',
      },
      {
        text: 'EntityAdapter для списка результатов',
        correct: false,
        verdict:
          'Нет. L3 — хранилище. Оно не решает проблему "слишком частые запросы".',
      },
    ],
    explain:
      '<strong>Search-as-you-type = takeLatest-паттерн.</strong> Нужна отмена, а не пропуск. Condition подходит только для идемпотентных дубликатов (кнопка дважды нажата).',
  },

  {
    num: 10,
    title: 'Cache-миграция: как перевести slice с массива на adapter',
    prompt:
      'У вас slice с <code>items: Product[]</code>. Операции: <code>find(x =&gt; x.id === id)</code> массово, список не сортируется. Хотите O(1). Что делаете?',
    options: [
      {
        text: 'Заменить shape: <code>items: Product[]</code> → <code>adapter.getInitialState()</code>',
        correct: true,
        verdict:
          'Да. Shape меняется на <code>{ ids, entities }</code>. Селекторы переезжают на <code>selectById/selectAll</code>.',
      },
      {
        text: 'Все <code>s.items.find(x =&gt; x.id === id)</code> → <code>s.entities[id]</code>',
        correct: true,
        verdict:
          'Да. Это прямая замена O(n) на O(1).',
      },
      {
        text: 'Все <code>s.items.push(newItem)</code> → <code>adapter.addOne(s, newItem)</code>',
        correct: true,
        verdict:
          'Да. Adapter-методы поддерживают оба поля (ids и entities) синхронными. Руками лучше не трогать.',
      },
      {
        text: 'Добавить <code>sortComparer</code>, чтобы <code>selectAll</code> возвращал отсортированный список',
        correct: false,
        verdict:
          'В задаче сказано "список не сортируется". sortComparer — опционален, добавляйте только если реально нужна сортировка. Пересчёт на каждый add/update — стоимость, не плата за ничто.',
      },
      {
        text: 'Переписать все <code>items.filter</code> через <code>Object.values(entities).filter</code> без мемоизации',
        correct: false,
        verdict:
          'Object.values(entities) даёт НОВЫЙ массив на каждый вызов → ломает L2 у потребителей. Правильно: <code>selectAll</code> (мемоизирован) или createSelector поверх.',
      },
    ],
    explain:
      '<strong>Миграция к adapter:</strong> shape → adapter-методы для мутаций → <code>getSelectors()</code> для чтения. Все <code>find</code> по id становятся O(1). Не добавляйте sortComparer впрок — только если реально сортируете.',
  },
]

// ── Render recaps ─────────────────────────────────────────

function renderRecaps(): void {
  const container = document.getElementById('recaps-container')!
  container.innerHTML = recaps
    .map((r) => {
      const snippets = r.snippets
        .map(
          (s) => `
            <div>
              <div class="file-label">${s.label}</div>
              <div class="code-block">${escapeHtml(s.code)}</div>
            </div>
          `,
        )
        .join('')
      const insights = (r.insights ?? [])
        .map(
          (ins) => `
            <div class="${ins.kind === 'key' ? 'key-insight' : ins.kind === 'trap' ? 'trap' : 'good'}">${ins.html}</div>
          `,
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ── Quiz state ────────────────────────────────────────────

const selected: Record<number, Set<number>> = {}
const answered: Record<number, boolean> = {}
for (const q of quiz) {
  selected[q.num] = new Set()
  answered[q.num] = false
}

function renderQuiz(): void {
  const container = document.getElementById('quiz-container')!
  container.innerHTML = quiz
    .map((q) => {
      const isAnswered = answered[q.num]
      const picks = selected[q.num]
      const isCorrect =
        isAnswered && q.options.every((o, i) => o.correct === picks.has(i))
      const statusClass = isAnswered
        ? isCorrect
          ? 'answered correct'
          : 'answered wrong'
        : ''
      const options = q.options
        .map((o, i) => {
          const picked = picks.has(i)
          let cls = 'option'
          if (isAnswered) {
            cls += ' locked'
            if (o.correct) cls += ' is-correct'
            else if (picked) cls += ' is-wrong-picked'
          } else if (picked) cls += ' picked'
          const code = o.code ? `<span class="option__code">${escapeHtml(o.code)}</span>` : ''
          const verdict = isAnswered
            ? `<div class="option__verdict">${o.verdict}</div>`
            : ''
          const mark = picked ? '✓' : ''
          return `
            <div class="${cls}" data-q="${q.num}" data-i="${i}">
              <div class="option__box">${mark}</div>
              <div class="option__body">${o.text}${code}${verdict}</div>
            </div>
          `
        })
        .join('')
      const submit = !isAnswered
        ? `<div class="quiz-card__submit"><button class="btn btn--accent" data-submit="${q.num}">Проверить</button><span style="color:var(--text-muted); font-size:.78rem;">выбрано: ${picks.size}</span></div>`
        : `<div class="quiz-card__global"><strong>Разбор.</strong> ${q.explain}</div>`
      return `
        <div class="quiz-card ${statusClass}">
          <div class="quiz-card__head">
            <span class="quiz-card__num">Q${q.num}</span>
            <span class="quiz-card__title">${q.title}</span>
          </div>
          <div class="quiz-card__prompt">${q.prompt}</div>
          <div class="quiz-card__multihint">Может быть несколько правильных ответов.</div>
          <div class="option-list">${options}</div>
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

// ── Boot ──────────────────────────────────────────────────

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог Quiz Caching — итог уроков 70a–70f',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

store.dispatch(
  productsSlice.actions.productAdded({
    id: nanoid(),
    title: 'Quiz Caching welcome',
    price: 0,
    fetchedAt: Date.now(),
  }),
)

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
  'Итоговый квиз по блоку кэширования (уроки 70a–70f). Сначала пробеги по recap, потом квиз: 10 вопросов, многие с несколькими правильными вариантами.',
)
con.info(
  'Mini-store использует createEntityAdapter — в DevTools видно {ids, entities, lastFetchedAt}.',
)
