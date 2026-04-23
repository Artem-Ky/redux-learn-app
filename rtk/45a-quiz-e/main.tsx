import {
  configureStore,
  createSlice,
  createSelector,
  createDraftSafeSelector,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Live mini-store (для DevToolsPanel — чтобы страница была интерактивной) ──

interface Todo { id: string; title: string; done: boolean }
const todoSlice = createSlice({
  name: 'todos',
  initialState: {
    items: [
      { id: nanoid(), title: 'Прочитать урок 41', done: true },
      { id: nanoid(), title: 'Прочитать урок 45', done: false },
    ] as Todo[],
  },
  reducers: {
    toggle: (s, a: PayloadAction<string>) => {
      const t = s.items.find((x) => x.id === a.payload)
      if (t) t.done = !t.done
    },
  },
})
const store = configureStore({ reducer: todoSlice.reducer })

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
    num: 'Урок 41',
    title: 'createSelector из RTK — re-export reselect',
    lead:
      'Термины: <strong>input selectors</strong> — функции из массива (первый аргумент createSelector), достают куски state. <strong>combiner</strong> (он же result function) — последняя функция, которая получает значения из input selectors и считает результат. createSelector мемоизирует по ссылкам входов: два вызова с теми же ссылками = cache HIT, combiner не вызывается. Любая новая ссылка на входе = MISS → combiner пересчитывает.',
    snippets: [
      {
        label: 'todosSlice.ts',
        code:
`import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'

export interface Todo { id: string; title: string; done: boolean }
interface TodosState { items: Todo[]; filter: 'all' | 'active' | 'done' }

const initialState: TodosState = {
  items: [
    { id: nanoid(), title: 'Купить молоко', done: false },
    { id: nanoid(), title: 'Сдать отчёт',  done: true  },
  ],
  filter: 'all',
}

export const todosSlice = createSlice({
  name: 'todos',
  initialState,
  reducers: {
    add: (s, a: PayloadAction<string>) => {
      s.items.push({ id: nanoid(), title: a.payload, done: false })
    },
    toggle: (s, a: PayloadAction<string>) => {
      const t = s.items.find(x => x.id === a.payload)
      if (t) t.done = !t.done
    },
    setFilter: (s, a: PayloadAction<TodosState['filter']>) => {
      s.filter = a.payload
    },
  },
})
export const { add, toggle, setFilter } = todosSlice.actions
`,
      },
      {
        label: 'selectors.ts',
        code:
`import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from './store'

// input selectors — простые, НЕ создают новых ссылок
const selectItems  = (s: RootState) => s.todos.items
const selectFilter = (s: RootState) => s.todos.filter

// memoized selector — вызов .filter() в combiner'е, не в input
export const selectVisibleTodos = createSelector(
  [selectItems, selectFilter],
  (items, filter) => {
    if (filter === 'all')    return items
    if (filter === 'active') return items.filter(t => !t.done)
    return items.filter(t => t.done)
  },
)
`,
      },
      {
        label: 'TodoList.tsx',
        code:
`import { useSelector } from 'react-redux'
import type { RootState } from './store'
import { selectVisibleTodos } from './selectors'

export function TodoList() {
  // useSelector === компаратор (ссылочное равенство).
  // Селектор memoized → при unrelated dispatch вернёт ТУ ЖЕ ссылку → useSelector не триггерит рендер.
  const todos = useSelector(selectVisibleTodos)
  return (
    <ul>
      {todos.map(t => <li key={t.id}>{t.done ? '✔' : '○'} {t.title}</li>)}
    </ul>
  )
}
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>Мемоизация = кеш по ссылке.</strong> <code>items.filter(...)</code> внутри combiner\'а возвращает новый массив — но это ОК: ссылка возвращается ОДНА И ТА ЖЕ, пока входы (items, filter) не поменялись.',
      },
      {
        kind: 'trap',
        html:
          '<strong>Анти-паттерн:</strong> <code>useSelector(s =&gt; s.todos.items.filter(t =&gt; !t.done))</code> — инлайн-селектор без мемо. При любом dispatch — новый массив → useSelector видит новую ссылку → рендер. Выносите в <code>createSelector</code>.',
      },
    ],
  },
  {
    num: 'Урок 42',
    title: 'createDraftSafeSelector — когда селектор зовут из reducer\'а',
    lead:
      'Если вызвать createSelector внутри reducer\'а, ему приходит draft (Proxy от Immer). Ссылка proxy стабильна → cache HIT → selector вернёт STALE значение после мутации. createDraftSafeSelector внутри делает current(draft) → plain snapshot → всегда пересчёт.',
    snippets: [
      {
        label: 'fragments из @reduxjs/toolkit/src/createDraftSafeSelector.ts',
        code:
`import { current, isDraft } from './immerImports'
import { createSelectorCreator, weakMapMemoize } from './reselectImports'

export const createDraftSafeSelectorCreator = (...args) => {
  const createSelector = createSelectorCreator(...args)
  const wrapped = (value, ...rest) =>
    selector(isDraft(value) ? current(value) : value, ...rest)
  //        ──────────────────────────────────────────
  //        ↑ вот она, вся суть — unwrap draft каждый вызов
  return wrapped
}
export const createDraftSafeSelector = createDraftSafeSelectorCreator(weakMapMemoize)
`,
      },
      {
        label: 'booksSlice.ts (антипаттерн и fix)',
        code:
`import { createSelector, createDraftSafeSelector, createSlice } from '@reduxjs/toolkit'

const selectItems = (s: BooksState) => s.items
const avgFn = (items: Book[]) =>
  items.length ? items.reduce((a,b) => a + b.price, 0) / items.length : 0

// ❌ плохо — обычный селектор, в reducer увидит draft
export const selectAvgUnsafe = createSelector([selectItems], avgFn)

// ✅ хорошо — draft-safe
export const selectAvgSafe   = createDraftSafeSelector([selectItems], avgFn)

export const booksSlice = createSlice({
  name: 'books',
  initialState: { items: [/*...*/], avg: 0 } as BooksState,
  reducers: {
    // ВНУТРИ reducer'а вызываем селектор, потом мутируем, потом снова вызываем.
    recomputeAfterPriceBump: (state) => {
      const a = selectAvgSafe(state)    // fresh — current(state)
      state.items.forEach(b => b.price += 100)
      const b = selectAvgSafe(state)    // fresh — current(state) опять
      state.avg = b
      console.log('before/after:', a, b)
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
          '<strong>Ссылка draft stable:</strong> <code>state.items === state.items</code> всегда true внутри одного reducer\'а, даже после мутаций элементов. Поэтому обычный кеш выдаст первое значение.',
      },
      {
        kind: 'trap',
        html:
          '<strong>Селекторы в reducer\'е — редкость.</strong> Обычно считайте производные значения <em>не</em> в reducer, а через <code>useSelector(createSelector(...))</code> в компоненте. createDraftSafeSelector нужен только если без вызова в reducer никак.',
      },
      {
        kind: 'good',
        html:
          '<strong>Где уже стоит:</strong> <code>entityAdapter.getSelectors()</code> внутри использует именно <code>createDraftSafeSelector</code> — поэтому <code>adapter.selectAll(state)</code> безопасно вызывать и внутри reducer.',
      },
    ],
  },
  {
    num: 'Урок 43',
    title: 'weakMapMemoize — кеш для параметризованных селекторов',
    lead:
      'Дефолт reselect v5 уже weakMapMemoize (до v5 было lruMemoize(1)). Для selectById/selectByCategory это критично: каждый id получает свою ветку в дереве WeakMap. lruMemoize(1) на рендер листа — постоянный miss.',
    snippets: [
      {
        label: 'selectTodoById.ts — правильно и неправильно',
        code:
`import { createSelector, createSelectorCreator, lruMemoize, weakMapMemoize } from '@reduxjs/toolkit'

// ❌ размер кеша 1 — в рендере списка из 50 строк 50 пересчётов подряд
const createLruSelector = createSelectorCreator(lruMemoize)
export const selectByIdLru = createLruSelector(
  [(s: RootState) => s.todos.items, (_: RootState, id: string) => id],
  (items, id) => items.find(t => t.id === id),
)

// ✅ reselect v5 default = weakMapMemoize → кеш по каждому id
export const selectByIdDefault = createSelector(
  [(s: RootState) => s.todos.items, (_: RootState, id: string) => id],
  (items, id) => items.find(t => t.id === id),
)

// ✅ можно явно передать (для ясности в code review)
export const selectByIdExplicit = createSelector(
  [(s: RootState) => s.todos.items, (_: RootState, id: string) => id],
  (items, id) => items.find(t => t.id === id),
  { memoize: weakMapMemoize, argsMemoize: weakMapMemoize },
)
`,
      },
      {
        label: 'TodoItem.tsx — зачем это в компоненте',
        code:
`import { useSelector } from 'react-redux'
import { selectByIdDefault } from './selectors'

// Получаем один todo по id → useSelector сравнивает === → если объект не менялся,
// рендер пропустится даже при toggle соседнего todo.
export function TodoItem({ id }: { id: string }) {
  const todo = useSelector((s: RootState) => selectByIdDefault(s, id))
  if (!todo) return null
  return <li>{todo.done ? '✔' : '○'} {todo.title}</li>
}
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>weakMapMemoize</strong> строит дерево WeakMap по идентичности аргументов. Примитивные аргументы (id как строка) идут в обычный Map-запасной — но кеш всё равно не имеет фиксированного размера.',
      },
      {
        kind: 'trap',
        html:
          '<strong>Не путайте reselect v4 и v5.</strong> Где-нибудь в старом коде <code>createSelector</code> = <code>lruMemoize(1)</code>. RTK 2.x тянет reselect 5 → default weakMap. Если мигрируете — проверьте вызовы с меняющимися id.',
      },
    ],
  },
  {
    num: 'Урок 44',
    title: 'slice.selectors и slice.getSelectors(stateSelector)',
    lead:
      'createSlice поддерживает поле selectors. RTK авто-подставляет входной selector <code>s =&gt; s[reducerPath ?? name]</code>. Если реальный путь в store отличается — используйте <code>getSelectors</code>.',
    snippets: [
      {
        label: 'usersSlice.ts — с полем selectors',
        code:
`import { createSlice, createSelector } from '@reduxjs/toolkit'

interface UsersState { items: User[]; filter: string }

export const usersSlice = createSlice({
  name: 'users',
  initialState: { items: [], filter: '' } as UsersState,
  reducers: {
    /* ... */
  },
  selectors: {
    // ПРОСТАЯ функция — НЕ мемоизирована. Вызывается на каждый useSelector().
    selectCount: (s) => s.items.length,

    // Чтобы мемоизировать — createSelector внутри
    selectActive: createSelector(
      [(s: UsersState) => s.items],
      items => items.filter(u => u.active),
    ),
  },
})

// Если в store usersSlice под ключом 'users' — работает автоматически:
usersSlice.selectors.selectCount(rootState)   // ← это s => s.users, затем selectCount
usersSlice.selectors.selectActive(rootState)
`,
      },
      {
        label: 'store.ts и кастомный путь',
        code:
`// Случай 1 — обычный store
export const store = configureStore({
  reducer: { users: usersSlice.reducer },
})
// usersSlice.selectors работают напрямую с RootState.

// Случай 2 — slice под вложенным путём
export const store = configureStore({
  reducer: {
    admin: combineReducers({ users: usersSlice.reducer }),
  },
})
// .selectors НЕ знают про путь 'admin.users' → надо перепривязать:
export const adminUserSelectors = usersSlice.getSelectors(
  (s: RootState) => s.admin.users
)
adminUserSelectors.selectActive(rootState)   // ✓ работает
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>name vs reducerPath.</strong> RTK использует <code>reducerPath ?? name</code> как ключ. Если создаёшь slice с <code>name: \'users\'</code> и кладёшь его под ключом <code>admin.users</code> в <code>configureStore</code> — auto-selectors сломаются, нужен <code>getSelectors</code>.',
      },
    ],
  },
  {
    num: 'Урок 45',
    title: 'withTypes — типизированные хуки и селекторы',
    lead:
      'withTypes — это identity-функция в рантайме и generic-обёртка в TS. Используется, чтобы не писать RootState/AppDispatch каждый раз.',
    snippets: [
      {
        label: 'store.ts',
        code:
`import { configureStore } from '@reduxjs/toolkit'
import { usersSlice } from './usersSlice'

export const store = configureStore({
  reducer: { users: usersSlice.reducer },
})

export type RootState   = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
`,
      },
      {
        label: 'hooks.ts',
        code:
`import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './store'

// .withTypes — статический каст дженериков (identity в runtime)
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
`,
      },
      {
        label: 'UserList.tsx',
        code:
`import { useAppSelector, useAppDispatch } from './hooks'
import { usersSlice } from './usersSlice'

export function UserList() {
  // state типизирован как RootState, без явного generic
  const users = useAppSelector(usersSlice.selectors.selectActive)
  const dispatch = useAppDispatch()
  return <>{users.map(u => (
    <button key={u.id} onClick={() => dispatch(usersSlice.actions.deactivate(u.id))}>
      {u.name}
    </button>
  ))}</>
}
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>withTypes существует и у <code>createSelector</code>:</strong> <code>createSelector.withTypes&lt;RootState&gt;()</code> даёт каррированную форму, где input-selector уже знает свой state. Удобно для файла с пачкой селекторов.',
      },
      {
        kind: 'trap',
        html:
          '<strong>RUNTIME ничего не меняется.</strong> Можно вызвать <code>useSelector(wrongState =&gt; ...)</code> — TypeScript ругнётся, но в рантайме обёртки нет.',
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
    title: 'Один todo ререндерится, не весь список',
    prompt:
      'Есть список из 50 todos. При toggle одного хочется, чтобы <strong>перерисовался ТОЛЬКО этот item</strong>, а не весь список. В TodoItem приходит <code>id</code>. Какие варианты селектора/хука дадут это поведение?',
    options: [
      {
        text: 'Вариант A — передаём весь todo через props из родителя',
        code:
`// родитель:
const todos = useSelector((s: RootState) => s.todos.items)
return todos.map(t => <TodoItem key={t.id} todo={t} />)`,
        correct: false,
        verdict:
          'Перерисовка ВСЕГО списка. Toggle меняет массив items → useSelector в родителе отдаёт новую ссылку → все дети reconciled.',
      },
      {
        text: 'Вариант B — селектор по id с weakMapMemoize (default в RTK 2.x)',
        code:
`const selectById = createSelector(
  [(s: RootState) => s.todos.items, (_: RootState, id: string) => id],
  (items, id) => items.find(t => t.id === id),
)
function TodoItem({ id }: { id: string }) {
  const t = useSelector((s: RootState) => selectById(s, id))
  return <li>{t?.done ? '✔' : '○'} {t?.title}</li>
}`,
        correct: true,
        verdict:
          'Правильно. useSelector возвращает ссылку объекта todo. Toggle меняет только этот объект → остальные ссылки стабильны → только один рендер.',
      },
      {
        text: 'Вариант C — инлайн функция без мемо, возвращает поле done',
        code:
`function TodoItem({ id }: { id: string }) {
  const done = useSelector((s: RootState) =>
    s.todos.items.find(t => t.id === id)?.done
  )
  return <li>{done ? '✔' : '○'}</li>
}`,
        correct: true,
        verdict:
          'Тоже работает! Примитив (boolean) сравнивается по значению через ===. Мемо не нужен — сам результат стабилен.',
      },
      {
        text: 'Вариант D — инлайн, возвращает объект с полями',
        code:
`function TodoItem({ id }: { id: string }) {
  const { done, title } = useSelector((s: RootState) => {
    const t = s.todos.items.find(t => t.id === id)
    return { done: t?.done, title: t?.title }   // ← новый объект каждый вызов
  })
  return <li>{done ? '✔' : '○'} {title}</li>
}`,
        correct: false,
        verdict:
          'Рендер при ЛЮБОМ dispatch. Возвращается новый объект → === всегда false → useSelector считает, что что-то изменилось.',
      },
    ],
    explain:
      '<strong>Правило:</strong> useSelector сравнивает результат <code>===</code>. Возвращайте <em>стабильную ссылку</em> (мемоизированный объект) либо <em>примитив</em> (boolean/number/string). Новый объект без мемо = ререндер на каждый dispatch.',
  },

  {
    num: 2,
    title: 'Почему этот мемоизированный селектор всё равно пересчитывается',
    prompt:
      'Разработчик хочет кешировать список опубликованных постов. Делает такой селектор:<pre>const selectPublished = createSelector(\n  [(s: RootState) =&gt; s.posts.items.filter(p =&gt; p.published)],\n  items =&gt; items,\n)</pre>Замеряет: combiner вызывается на <strong>каждый</strong> dispatch (даже когда <code>s.posts.items</code> не трогали — например, dispatch toggle темы). В чём причина?',
    options: [
      {
        text: 'Input selector возвращает каждый раз новый массив — cache всегда miss',
        code:
`// input selector = (s) => s.posts.items.filter(...)
// .filter() возвращает НОВЫЙ массив каждый вызов
// createSelector сравнивает ссылки: новая ссылка → MISS → combiner бежит`,
        correct: true,
        verdict:
          'Да. Input selector (функция в массиве первого аргумента) вызывается на каждый запрос. <code>.filter()</code> всегда создаёт новый массив → новая ссылка → кеш никогда не hit\'ает.',
      },
      {
        text: 'Нужно было использовать createDraftSafeSelector',
        correct: false,
        verdict:
          'Нет. draft-safe нужен только когда селектор вызывают ВНУТРИ reducer\'а (там приходит Immer draft). В компоненте state уже plain — обычный createSelector ОК.',
      },
      {
        text: 'Размер LRU-кеша слишком маленький',
        correct: false,
        verdict:
          'Нет. В reselect v5 default memoizer = weakMapMemoize, а не lruMemoize. Кеш эффективно бесконечный. Проблема не в размере, а в том, что ключ (ссылка) каждый раз разный — никакой кеш не поможет.',
      },
      {
        text: 'Combiner возвращает новую ссылку — это и есть причина miss',
        correct: false,
        verdict:
          'Обратная логика. Combiner вызывается только ПРИ miss, и тогда конечно его результат новый. Но miss случается из-за ИНПУТОВ (input selectors), не из-за выхода.',
      },
    ],
    explain:
      '<strong>Fix:</strong> input selector должен возвращать <em>сырой</em> кусок state (ссылка на массив/объект из store стабильна), а фильтрация — в combiner\'е.<pre>const selectItems = (s: RootState) =&gt; s.posts.items   // стабильная ссылка\nconst selectPublished = createSelector(\n  [selectItems],\n  items =&gt; items.filter(p =&gt; p.published),\n)</pre>При dispatch, не меняющем items, input отдаст ту же ссылку → HIT → combiner не запустится.',
  },

  {
    num: 3,
    title: 'Селектор внутри reducer\'а — что увидит createSelector?',
    prompt:
      'Рассмотрите код. В reducer\'е вызывается <code>selectAvg(state)</code>, затем мутируются цены (<code>+=100</code>), затем снова <code>selectAvg(state)</code>. Что вернут два варианта селектора?<pre>const selectAvg = createSelector([(s: S) =&gt; s.items], items =&gt; avg(items))\nconst selectAvgSafe = createDraftSafeSelector([(s: S) =&gt; s.items], items =&gt; avg(items))</pre>Начальный avg = 500, после мутации truthAvg = 600.',
    options: [
      {
        text: 'createSelector: 500 → 500 (stale) | createDraftSafeSelector: 500 → 600',
        correct: true,
        verdict:
          'Да. draft-proxy state.items имеет стабильную ссылку → вторая запрос попадает в кеш. draftSafe делает current() → каждый раз новый plain объект → всегда MISS → всегда пересчёт.',
      },
      {
        text: 'createSelector: 500 → 600 | createDraftSafeSelector: 500 → 600',
        correct: false,
        verdict:
          'Нет. Обычный createSelector не видит мутацию — ссылка на Proxy не менялась.',
      },
      {
        text: 'createSelector: 500 → 500 | createDraftSafeSelector: 500 → 500',
        correct: false,
        verdict:
          'Нет. draftSafe делает current() — это свежий snapshot, где цены уже обновлены.',
      },
      {
        text: 'Оба выдадут ошибку "Immer detected attempted mutation"',
        correct: false,
        verdict:
          'Нет. Селекторы только ЧИТАЮТ state — никаких мутаций через них не происходит. Ошибка Immer была бы про другое.',
      },
    ],
    explain:
      '<strong>Почему proxy стабилен:</strong> Immer создаёт один Proxy на ветку draft-state в начале reducer\'а. <code>state.items === state.items</code> всё время true. Значит input-селектор при втором вызове возвращает ту же ссылку → cache hit → combiner не вызывается → возвращается старый результат.',
  },

  {
    num: 4,
    title: 'Параметризованный селектор в цикле',
    prompt:
      'Компонент в лупе вызывает <code>selectById(state, id)</code> для 100 id. Измерили — combiner вызывается 100 раз за один рендер. Какая версия reselect и какой memoizer это даёт?',
    options: [
      {
        text: 'reselect v4 без опций (default lruMemoize size 1)',
        correct: true,
        verdict:
          'Да. До v5 дефолт был LRU-1. Каждый новый id выбивал предыдущий → постоянный miss.',
      },
      {
        text: 'reselect v5 без опций (default weakMapMemoize)',
        correct: false,
        verdict:
          'Нет. v5 держит кеш для каждого id. 100 вызовов = 100 misses на первом рендере, но на втором — 100 HIT.',
      },
      {
        text: 'reselect v5 с { memoize: lruMemoize } без size',
        correct: true,
        verdict:
          'Тоже да. lruMemoize без явного size по умолчанию = 1 → та же беда. Лечится <code>{ memoize: lruMemoize, memoizeOptions: { maxSize: 100 } }</code> ИЛИ оставить default weakMap.',
      },
      {
        text: 'Fix через weakMapMemoize явно',
        code: `{ memoize: weakMapMemoize, argsMemoize: weakMapMemoize }`,
        correct: false,
        verdict:
          'Это не "причина", а fix. Вопрос был "какая конфигурация даёт такой плохой результат".',
      },
    ],
    explain:
      '<strong>Правило:</strong> если селектор принимает аргументы из props (id, category), нужен либо <code>weakMapMemoize</code> (default в RTK 2.x), либо <code>lruMemoize({ maxSize: N })</code> с N ≥ числа уникальных аргументов. Иначе кеш — шкаф для одного предмета.',
  },

  {
    num: 5,
    title: 'Куда положить createSelector в slice?',
    prompt:
      '<code>slice.selectors</code> — это объект. Какие из этих записей действительно мемоизированы?',
    options: [
      {
        text: 'A',
        code:
`selectors: {
  selectCount: (s) => s.items.length,
}`,
        correct: false,
        verdict:
          'Обычная функция. При каждом <code>useSelector(selectCount)</code> она выполняется. Для count от массива это дёшево, но НЕ "мемоизация".',
      },
      {
        text: 'B',
        code:
`selectors: {
  selectActive: createSelector(
    [(s: State) => s.items],
    items => items.filter(u => u.active),
  ),
}`,
        correct: true,
        verdict:
          'Настоящий мемоизированный селектор. items не менялся → та же ссылка → combiner не вызывается.',
      },
      {
        text: 'C',
        code:
`// Вне slice'а, потом используется в компоненте:
const selectActive = createSelector(
  [(s: RootState) => s.users.items],
  items => items.filter(u => u.active),
)
usersSlice.selectors = { selectActive }`,
        correct: false,
        verdict:
          'slice.selectors это read-only: заданы в <code>createSlice({ selectors: {...} })</code>. Присваивание после создания не даст auto-prefix <code>s =&gt; s[reducerPath]</code>. И это нарушает API.',
      },
      {
        text: 'D',
        code:
`selectors: {
  selectActive: (s) => s.items.filter(u => u.active),  // просто стрелка
}`,
        correct: false,
        verdict:
          'Не мемоизировано. <code>.filter()</code> возвращает новый массив на каждом useSelector. Это <strong>хуже</strong> чем отсутствие createSelector — каждый раз полный пересчёт И новая ссылка.',
      },
    ],
    explain:
      '<strong>Запомните:</strong> <code>selectors: { foo: fn }</code> — это просто объект с функциями. RTK только ОБОРАЧИВАЕТ их, чтобы автоподставить <code>s =&gt; s[reducerPath]</code>. Мемоизацию делает либо <code>createSelector</code>, либо вы вручную.',
  },

  {
    num: 6,
    title: 'Slice под вложенным путём',
    prompt:
      'Slice <code>usersSlice</code> с <code>name: \'users\'</code>. Кладём в store под путь <code>admin.users</code>. Какие вызовы селектора сработают корректно?<pre>configureStore({\n  reducer: {\n    admin: combineReducers({ users: usersSlice.reducer }),\n  },\n})</pre>',
    options: [
      {
        text: 'A',
        code: `usersSlice.selectors.selectCount(rootState)`,
        correct: false,
        verdict:
          'Не сработает. Авто-prefix = <code>s =&gt; s.users</code>, но в rootState ключ "users" нет на верхнем уровне — там <code>admin.users</code>. Получит <code>undefined</code>.',
      },
      {
        text: 'B',
        code:
`const sel = usersSlice.getSelectors((s: RootState) => s.admin.users)
sel.selectCount(rootState)`,
        correct: true,
        verdict:
          'Правильно. <code>getSelectors(stateSelector)</code> перепривязывает корень.',
      },
      {
        text: 'C',
        code: `usersSlice.selectors.selectCount(rootState.admin.users)`,
        correct: false,
        verdict:
          'Ловушка. <code>usersSlice.selectors.selectCount</code> это обёртка, внутри делает <code>state[reducerPath]</code>. Если передать туда уже отрезанный usersState — попытка взять <code>state.users</code> внутри него → <code>undefined</code>.',
      },
      {
        text: 'D',
        code:
`const local = (s: RootState) => s.admin.users
const selectCount = createSelector([local], u => u.items.length)
selectCount(rootState)`,
        correct: true,
        verdict:
          'Работает. Свой createSelector без помощи slice.selectors.',
      },
    ],
    explain:
      'Вариант C — <strong>ловушка</strong>. <code>usersSlice.selectors.selectCount</code> это обёртка, которая ВНУТРИ делает <code>state[reducerPath]</code>. Если передать <code>state.admin.users</code>, она попытается взять <code>state.admin.users.users</code> → undefined. Единственный способ работать с slice.selectors при вложенном пути — <code>getSelectors</code>.',
  },

  {
    num: 7,
    title: 'useSelector + объект в возврате = боль',
    prompt:
      'Компонент возвращает из useSelector объект <code>{ count, active }</code>. Рендерится при каждом dispatch. Какие починки сработают?',
    options: [
      {
        text: 'Вынести в createSelector',
        code:
`const selectSummary = createSelector(
  [(s: RootState) => s.todos.items],
  items => ({ count: items.length, active: items.filter(t => !t.done).length }),
)
// in component
const { count, active } = useSelector(selectSummary)`,
        correct: true,
        verdict:
          'Работает. Пока items не менялся, createSelector возвращает ТУ ЖЕ ссылку объекта → useSelector видит === → нет рендера.',
      },
      {
        text: 'Два отдельных useSelector для примитивов',
        code:
`const count  = useSelector((s: RootState) => s.todos.items.length)
const active = useSelector((s: RootState) => s.todos.items.filter(t => !t.done).length)`,
        correct: true,
        verdict:
          'Работает. Каждый useSelector возвращает число → сравнение по значению → нет рендера при неменявшемся number.',
      },
      {
        text: 'useSelector + shallowEqual из react-redux',
        code:
`import { useSelector, shallowEqual } from 'react-redux'
const { count, active } = useSelector(
  (s: RootState) => ({ count: s.todos.items.length, active: s.todos.items.filter(t=>!t.done).length }),
  shallowEqual,
)`,
        correct: true,
        verdict:
          'Работает. shallowEqual сравнивает поля объекта по === . Объект пересоздаётся, но поля равны → no render.',
      },
      {
        text: 'useSelector с deepEqual из lodash',
        code:
`import { useSelector } from 'react-redux'
import isEqual from 'lodash/isEqual'
const { count, active } = useSelector(selectInline, isEqual)`,
        correct: true,
        verdict:
          'Работает, но <strong>дорого</strong> для больших структур. shallowEqual или memoized selector почти всегда лучше.',
      },
    ],
    explain:
      '<strong>Сравнение в useSelector.</strong> По умолчанию — strict equality (===). Если возвращаете объект — либо мемоизируйте (createSelector), либо дайте второй аргумент (shallowEqual), либо разбейте на примитивные селекторы. Все три подхода рабочие.',
  },

  {
    num: 8,
    title: 'withTypes — что это в рантайме?',
    prompt:
      'Что происходит при вызове <code>useSelector.withTypes&lt;RootState&gt;()</code>?',
    options: [
      {
        text: 'Возвращает новую функцию, идентичную useSelector (identity wrapper)',
        correct: true,
        verdict:
          'Верно. В рантайме <code>withTypes</code> это <code>() =&gt; fn</code> без магии. Только для TS.',
      },
      {
        text: 'Добавляет runtime-валидацию state',
        correct: false,
        verdict:
          'Нет. Никаких проверок типов — TS стирает generic.',
      },
      {
        text: 'Позволяет TS-инференсу использовать RootState как тип параметра',
        correct: true,
        verdict:
          'Да. Это основная цель — убрать <code>useSelector&lt;RootState, T&gt;</code> в каждом вызове.',
      },
      {
        text: 'Мемоизирует результат селектора',
        correct: false,
        verdict:
          'Нет. Мемоизация — это createSelector. withTypes об этом ничего не знает.',
      },
    ],
    explain:
      '<code>withTypes</code> существует у <code>useSelector</code>, <code>useDispatch</code>, <code>useStore</code>, <code>createSelector</code>, <code>startListening</code>, <code>addListener</code>. Везде — identity в рантайме + точка расширения TS-дженериков.',
  },

  {
    num: 9,
    title: 'Два селектора в slice — когда хит/мисс',
    prompt:
      'У slice есть два селектора. В компоненте вызываем оба. Между dispatch\'ами какие счётчики пересчётов увеличатся?<pre>selectors: {\n  selectItems:   (s: UsersState) =&gt; s.items,\n  selectActive:  createSelector([(s: UsersState) =&gt; s.items], items =&gt; items.filter(u =&gt; u.active)),\n}\n// dispatch: usersSlice.actions.setFilter(\'new\')  // меняет s.filter, items НЕ трогает</pre>',
    options: [
      {
        text: 'selectItems — вызовется (это просто функция), selectActive — miss и пересчёт',
        correct: false,
        verdict:
          'Нет. selectActive мемоизирован по ссылке items — items не менялся → HIT, без пересчёта.',
      },
      {
        text: 'selectItems — вызовется, selectActive — HIT (cached)',
        correct: true,
        verdict:
          'Правильно. selectItems — просто функция, вызов у неё — это вычитывание, без мемо. selectActive смотрит ссылку items, она стабильна → кеш.',
      },
      {
        text: 'Оба мемоизированы',
        correct: false,
        verdict:
          'Нет — селектор без <code>createSelector</code> — обычная функция, никакой мемо.',
      },
      {
        text: 'Оба сработают с нуля, потому что state изменился',
        correct: false,
        verdict:
          'selectActive смотрит ТОЛЬКО на items. То, что изменилось s.filter, ему безразлично.',
      },
    ],
    explain:
      '<strong>Важное различие:</strong> селекторы в slice.selectors — это просто объект функций. Мемоизация — это ОПЦИЯ (через createSelector), а не фича самого slice. Обычная стрелка считается каждый раз; createSelector — только при смене input-ссылок.',
  },

  {
    num: 10,
    title: 'Какие памяти для ссылок у memoizers',
    prompt:
      'Какие утверждения про <code>lruMemoize</code> и <code>weakMapMemoize</code> верны?',
    options: [
      {
        text: 'lruMemoize хранит последние N результатов; WeakMap хранит дерево кешей по аргументам',
        correct: true,
        verdict:
          'Да. lruMemoize это классический LRU с bounded size. weakMapMemoize строит вложенные WeakMap\'ы по каждому object-аргументу.',
      },
      {
        text: 'weakMapMemoize автоматически очищает кеш при garbage collection аргумента',
        correct: true,
        verdict:
          'Да — WeakMap не держит strong reference. Когда объект-аргумент GC\'ится, ветка кеша тоже уходит.',
      },
      {
        text: 'weakMapMemoize не может работать с примитивными аргументами (string/number)',
        correct: false,
        verdict:
          'Ложь. Для примитивов внутри используется обычный <code>Map</code>. Память освобождается хуже, но селектор работает.',
      },
      {
        text: 'createDraftSafeSelector по умолчанию использует lruMemoize',
        correct: false,
        verdict:
          'Нет. В текущей RTK <code>createDraftSafeSelectorCreator(weakMapMemoize)</code> — тот же weakMap, что и у <code>createSelector</code> в reselect v5. Разница — wrapper с <code>current(isDraft(x))</code>.',
      },
    ],
    explain:
      '<strong>Шпаргалка:</strong> если аргументы меняются часто (id, category) — weakMap. Если аргументов мало и нужна предсказуемость — lruMemoize({maxSize:N}). Если хотите свой алгоритм — <code>createSelectorCreator(myMemoize)</code>.',
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
  'Лог Quiz E — Селекторы',
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
  'Итоговый квиз по секции E (уроки 41–45). Сначала пробеги по recap\'у, потом квиз: 10 вопросов, многие с несколькими правильными вариантами.',
)
con.info(
  'Подсказка: если сомневаешься, проверь утверждение в соответствующем уроке — ссылки на 41/42/43/44/45 в шапке.',
)
