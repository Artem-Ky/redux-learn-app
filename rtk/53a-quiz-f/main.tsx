import {
  configureStore,
  createEntityAdapter,
  createSlice,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Live mini-store (с createEntityAdapter — чтобы в DevTools виден shape {ids, entities}) ──

interface Book {
  id: string
  title: string
  price: number
}

const booksAdapter = createEntityAdapter<Book>()

const booksSlice = createSlice({
  name: 'books',
  initialState: booksAdapter.getInitialState(
    { loading: 'idle' as 'idle' | 'pending' | 'fulfilled' | 'rejected', error: null as string | null },
    [
      { id: nanoid(), title: 'Clean Code', price: 35 },
      { id: nanoid(), title: 'Refactoring', price: 40 },
    ],
  ),
  reducers: {
    bookAdded: booksAdapter.addOne,
  },
})

const store = configureStore({ reducer: { books: booksSlice.reducer } })

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
    num: 'Уроки 46 + 48',
    title: 'Зачем нормализация и какой shape у EntityState',
    lead:
      'Урок 46: массив <code>items: Todo[]</code> даёт <code>Array.find(x =&gt; x.id === target)</code> = <strong>O(n)</strong>. Нормализованный <code>{ ids, entities }</code> даёт <code>entities[id]</code> = <strong>O(1)</strong>. На N=10k разница — десятки раз. Урок 48: <strong>EntityState&lt;T, Id&gt; = { ids: Id[]; entities: Record&lt;Id, T&gt; }</strong>. <code>ids</code> хранит порядок (массив сортируется при sortComparer), <code>entities</code> — lookup по ключу. RTK использует именно <strong>Record</strong> (plain object), а не Map — потому что Redux требует <em>serializable</em> state, а Map не сериализуется.',
    snippets: [
      {
        label: 'shape сравнение — до и после',
        code:
`// ❌ Форма A (денормализовано): массив, O(n) на поиск
interface TodosState {
  items: Todo[]     // [{id:'a',...}, {id:'b',...}, ...]
}
const todo = state.items.find(t => t.id === \'a\')   // O(n)

// ✅ Форма B (нормализовано): {ids, entities}, O(1)
interface TodosState {
  ids: string[]                      // [\'a\', \'b\', ...]
  entities: Record<string, Todo>     // {a: {...}, b: {...}}
}
const todo = state.entities[\'a\']    // O(1)

// ids сохраняет ПОРЯДОК, entities даёт lookup.
// Оба поля ВСЕГДА синхронны после adapter-метода.
`,
      },
      {
        label: 'EntityState<T, Id> — официальный тип',
        code:
`import type { EntityState } from \'@reduxjs/toolkit\'

// Id = string по умолчанию
interface Book { id: string; title: string }
type BooksState = EntityState<Book, string>
//   = { ids: string[]; entities: Record<string, Book> }

// Кастомный Id (number)
interface User { uid: number; name: string }
type UsersState = EntityState<User, number>
//   = { ids: number[]; entities: Record<number, User> }
//   ⚠ в entities ключ всё равно coerce-ится в string (JS object key)
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>Инвариант:</strong> <code>ids.length === Object.keys(entities).length</code> всегда. Adapter-методы гарантируют это. Если руками мутировать entities мимо adapter — инвариант можно сломать.',
      },
      {
        kind: 'trap',
        html:
          '<strong>Record, не Map.</strong> Redux DevTools, <code>serializableCheck</code> и <code>redux-persist</code> ожидают plain object. Map в state — ловушка. Поэтому даже числовые id внутри <code>entities</code> хранятся как string-ключи.',
      },
    ],
  },
  {
    num: 'Уроки 47 + 49',
    title: 'Adapter: CRUD и разница add / set / upsert',
    lead:
      'Урок 47: <code>createEntityAdapter&lt;T&gt;()</code> возвращает объект с reducer-методами: addOne, addMany, setOne, setAll, setMany, updateOne, updateMany, upsertOne, upsertMany, removeOne, removeMany, removeAll. Все они принимают (state, action) — можно подсунуть прямо в slice.reducers. Урок 49: три похожих по имени, но разных по поведению:',
    snippets: [
      {
        label: 'booksSlice.ts — весь adapter в одном файле',
        code:
`import {
  createEntityAdapter,
  createSlice,
  nanoid,
  type PayloadAction,
} from \'@reduxjs/toolkit\'

export interface Book {
  id: string
  title: string
  price: number
  author: string
}

export const booksAdapter = createEntityAdapter<Book>()
//   selectId = (b) => b.id       (default)
//   sortComparer = false         (default — insertion order)

export const booksSlice = createSlice({
  name: \'books\',
  initialState: booksAdapter.getInitialState(),
  //   = { ids: [], entities: {} }
  reducers: {
    // ① adapter-методы сами — готовые reducers
    bookAdded:        booksAdapter.addOne,
    booksAddedMany:   booksAdapter.addMany,
    bookSet:          booksAdapter.setOne,
    booksSetAll:      booksAdapter.setAll,
    bookRemoved:      booksAdapter.removeOne,
    booksRemovedAll:  booksAdapter.removeAll,
    bookUpserted:     booksAdapter.upsertOne,

    // ② кастомный reducer с prepare — можно вызывать adapter внутри
    bookAddedWithPrepare: {
      reducer: (state, action: PayloadAction<Book>) => {
        booksAdapter.addOne(state, action.payload)
      },
      prepare: (title: string, price: number, author: string) => ({
        payload: { id: nanoid(), title, price, author } as Book,
      }),
    },
  },
})

export const {
  bookAdded, booksAddedMany, bookSet, booksSetAll,
  bookRemoved, booksRemovedAll, bookUpserted,
  bookAddedWithPrepare,
} = booksSlice.actions
`,
      },
      {
        label: 'add vs set vs upsert — три сценария',
        code:
`// Старт: entities.a = { id:\'a\', title:\'A\', price:10, author:\'Knuth\' }
// Payload во всех трёх: { id:\'a\', price:20 }

// ① addOne — NO-OP: id уже есть, ничего не меняется
dispatch(bookAdded({ id: \'a\', price: 20 }))
// → entities.a = { id:\'a\', title:\'A\', price:10, author:\'Knuth\' }  (без изменений)

// ② setOne — ПОЛНАЯ ЗАМЕНА: поля, которых нет в payload, ПОТЕРЯНЫ
dispatch(bookSet({ id: \'a\', price: 20 }))
// → entities.a = { id:\'a\', price:20 }
//   title и author — undefined! payload → новая запись целиком

// ③ upsertOne — SHALLOW MERGE: Object.assign({}, old, new)
dispatch(bookUpserted({ id: \'a\', price: 20 }))
// → entities.a = { id:\'a\', title:\'A\', price:20, author:\'Knuth\' }
//   остальные поля сохранены, price перезаписан

// Правило: upsert если хочешь \"добавить ИЛИ дополнить\",
// set если хочешь \"заменить целиком\",
// add если хочешь \"добавить И только если нет\".
`,
      },
      {
        label: 'store.ts',
        code:
`import { configureStore } from \'@reduxjs/toolkit\'
import { booksSlice } from \'./booksSlice\'

export const store = configureStore({
  reducer: { books: booksSlice.reducer },
})
export type RootState   = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
`,
      },
      {
        label: 'BookList.tsx — useSelector с selectAll',
        code:
`import { useSelector } from \'react-redux\'
import type { RootState } from \'./store\'
import { booksAdapter } from \'./booksSlice\'

const booksSelectors = booksAdapter.getSelectors<RootState>(s => s.books)

export function BookList() {
  // selectAll: вернёт Book[] в том порядке, что в ids.
  // Если был sortComparer — уже отсортирован.
  const books = useSelector(booksSelectors.selectAll)
  return (
    <ul>
      {books.map(b => (
        <li key={b.id}>
          {b.title} — \${b.price} ({b.author})
        </li>
      ))}
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
          '<strong>addOne — молча игнорирует дубликат.</strong> Никакого warning\'а, никакого throw. Проверяйте <code>entities[id]</code> перед вызовом, если логика зависит от «добавилось/нет».',
      },
      {
        kind: 'good',
        html:
          '<strong>setAll заменяет всё</strong> — идеально для <code>fetchFulfilled(list)</code>: старые записи удаляются, приходят новые. <code>upsertMany</code> — для инкрементальной синхронизации (WS-апдейты).',
      },
    ],
  },
  {
    num: 'Урок 50',
    title: 'updateOne — shallow merge, nested объекты страдают',
    lead:
      'Внутри <code>updateOne</code> буквально делает <code>Object.assign(entity, changes)</code>. Это <strong>shallow</strong>: если в changes есть поле <code>profile</code> — то <code>entity.profile</code> ЦЕЛИКОМ заменится на то, что в changes. Все поля старого <code>profile</code>, не перечисленные в changes.profile, — ПОТЕРЯНЫ. Решение — собирать nested вручную или мутировать через Immer.',
    snippets: [
      {
        label: 'BAD: теряем age после updateOne с nested',
        code:
`interface User {
  id: number
  name: string
  profile: { name: string; age: number }
}

// Старт: users.entities[1] = {
//   id: 1,
//   name: \'Alice\',
//   profile: { name: \'Alice\', age: 30 }
// }

// ❌ BAD — передаём весь profile как changes
dispatch(userUpdated({
  id: 1,
  changes: { profile: { name: \'Bob\' } },
  //                   ↑ age не указан
}))

// После:
//   entities[1] = {
//     id: 1,
//     name: \'Alice\',
//     profile: { name: \'Bob\' }   // age ПРОПАЛ!
//   }
// Потому что Object.assign(entity, changes) — shallow.
// entity.profile ← { name:\'Bob\' } полностью.
`,
      },
      {
        label: 'GOOD: собираем nested руками в reducer\'е',
        code:
`userNameChanged: (
  state,
  action: PayloadAction<{ id: number; name: string }>,
) => {
  const existing = state.entities[action.payload.id]
  if (!existing) return
  usersAdapter.updateOne(state, {
    id: action.payload.id,
    changes: {
      profile: {
        ...existing.profile,               // spread старый nested
        name: action.payload.name,         // перезапишем только name
      },
    },
  })
}
// age сохранён. Можно также использовать Immer-мутацию:
//   state.entities[id].profile.name = payload.name
// ↑ Immer сам структурально разделит без shallow-проблемы.
`,
      },
      {
        label: 'updateMany — последний побеждает per key',
        code:
`usersAdapter.updateMany(state, [
  { id: 1, changes: { name: \'From-first\',  tags: [\'first\'] } },
  { id: 1, changes: { name: \'From-second\' } },
])
// RTK внутри: { ...a.changes, ...b.changes } для id=1
// Результат: { name: \'From-second\', tags: [\'first\'] }
// - name перезаписан вторым
// - tags только в первом, сохранились
`,
      },
    ],
    insights: [
      {
        kind: 'trap',
        html:
          '<strong>updateOne не делает deep merge никогда.</strong> Даже если вы привыкли к <code>setState(prev =&gt; ({ ...prev, nested: { ...prev.nested, x: 1 }}))</code> в React — в RTK этого нет. Или собирайте nested сами, или используйте Immer-мутацию в custom reducer.',
      },
      {
        kind: 'good',
        html:
          '<strong>Смена id через updateOne.</strong> Если <code>changes.id ≠ update.id</code>, адаптер <code>delete entities[oldId]</code> и <code>entities[newId] = ...</code>, <code>ids</code> пересобирается. Это задокументированное поведение.',
      },
    ],
  },
  {
    num: 'Урок 51',
    title: 'selectId и sortComparer — кастомизация adapter',
    lead:
      'Два опциональных параметра <code>createEntityAdapter</code>: <strong>selectId</strong> — функция, которая выбирает id из entity (default <code>e =&gt; e.id</code>), и <strong>sortComparer</strong> — compare-fn (как у <code>Array.sort</code>), определяет порядок <code>ids</code>. Если задан sortComparer, адаптер пересортирует <code>ids</code> при <strong>каждом</strong> add/update/upsert — через бинарный поиск точки вставки.',
    snippets: [
      {
        label: 'adapter с кастомным id и сортировкой',
        code:
`import { createEntityAdapter } from \'@reduxjs/toolkit\'

interface Book {
  isbn: string   // ← id поле называется НЕ \'id\'
  title: string
  author: string
  price: number
}

const booksAdapter = createEntityAdapter<Book, string>({
  // Без этого RTK взял бы b.id, а его нет — runtime error.
  selectId: (b) => b.isbn,

  // Compare-fn как у Array.sort: <0 / 0 / >0
  sortComparer: (a, b) =>
    a.title.localeCompare(b.title, \'en\', { sensitivity: \'base\' }),
})

// ids теперь хранит isbn-строки И отсортирован по title
// selectAll вернёт книги в алфавитном порядке
`,
      },
      {
        label: 'Когда sortComparer пересчитывается',
        code:
`// sortComparer вызывается при КАЖДОМ add/update/upsert,
// чтобы поддержать ids отсортированным.
// RTK использует бинарный поиск → O(log n) на одну вставку.

addOne(state, book)      // ← находит позицию в ids, insert
addMany(state, batch)    // ← N вставок, каждая с сортировкой
updateOne(state, {
  id, changes: { title: \'Zz new title\' }
})                        // ← если title изменился, ids пересобирается
upsertOne(state, book)   // ← аналогично add/update
setAll(state, list)      // ← один большой sort по новому массиву
removeOne(state, id)     // ← sortComparer НЕ нужен: удаление не меняет порядок
`,
      },
      {
        label: 'Если selectId не указать — дефолт',
        code:
`// Без опций: selectId = (e) => e.id
const plainAdapter = createEntityAdapter<Book>()
plainAdapter.addOne(state, { id: \'x\', title: \'...\' })  // ok

// Но если в типе нет id...
interface Book { isbn: string; title: string }    // нет id!
const bad = createEntityAdapter<Book>()
// TypeScript НЕ поймает. Runtime: entities[undefined] = book
// → всё сломается. ВСЕГДА указывайте selectId для не-\'id\' полей.
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>sortComparer: false</strong> (default) = порядок вставки, <code>ids.push</code>. <strong>sortComparer: fn</strong> = сортировка при каждом apply. Если сортируете редко и на клиенте — может быть дешевле без sortComparer, а <code>[...books].sort()</code> в <code>createSelector</code>.',
      },
      {
        kind: 'trap',
        html:
          '<strong>Смена sortComparer требует пересборки.</strong> После <code>setAll</code> или ручного reset\'а — <code>ids</code> пересортируется. Если просто обновляете существующие — старый порядок останется, пока не будет update/upsert.',
      },
    ],
  },
  {
    num: 'Урок 52',
    title: 'getSelectors — global vs local',
    lead:
      '<code>adapter.getSelectors()</code> возвращает набор готовых селекторов: <code>selectAll, selectById, selectIds, selectEntities, selectTotal</code>. Есть два способа вызова — принципиально разные:',
    snippets: [
      {
        label: 'local vs globalized',
        code:
`import { booksAdapter } from \'./booksSlice\'
import type { RootState } from \'./store\'

// ① LOCAL — без аргумента. Селекторы принимают EntityState.
const localSel = booksAdapter.getSelectors()
localSel.selectAll(state.books)          // Book[]
localSel.selectById(state.books, \'b1\')   // Book | undefined
localSel.selectTotal(state.books)        // ids.length

// ② GLOBALIZED — передали stateSelector. Принимают RootState.
const globSel = booksAdapter.getSelectors<RootState>(s => s.books)
globSel.selectAll(rootState)             // сам лезет в .books
globSel.selectById(rootState, \'b1\')
globSel.selectTotal(rootState)

// Local удобен внутри reducer\'а (там у вас sub-state на руках).
// Globalized — в компонентах (там RootState).
`,
      },
      {
        label: 'пять селекторов, что возвращают',
        code:
`const sel = booksAdapter.getSelectors<RootState>(s => s.books)

sel.selectIds(state)        // string[] — массив id (в порядке ids)
sel.selectEntities(state)   // Record<string, Book> — raw map
sel.selectAll(state)        // Book[] — values в порядке ids
sel.selectTotal(state)      // number — ids.length
sel.selectById(state, id)   // Book | undefined
// Все мемоизированы через createDraftSafeSelector.
// Это значит:
//   - безопасны внутри reducer\'а (unwrap draft)
//   - selectById имеет cache size 1 (lruMemoize) — ловушка в цикле
`,
      },
      {
        label: 'BookList + BookById — два подхода',
        code:
`import { useSelector } from \'react-redux\'
import { booksAdapter } from \'./booksSlice\'
import type { RootState } from \'./store\'

const sel = booksAdapter.getSelectors<RootState>(s => s.books)

export function BookList() {
  const books = useSelector(sel.selectAll)
  return <ul>{books.map(b => <li key={b.id}>{b.title}</li>)}</ul>
}

export function BookById({ id }: { id: string }) {
  // selectById cache size=1: для ОДНОГО компонента с ОДНИМ id — ок.
  // Для списка из 100 BookById ставьте свой createSelector с weakMapMemoize.
  const book = useSelector((s: RootState) => sel.selectById(s, id))
  return <>{book?.title}</>
}
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>Slice под вложенным путём.</strong> Если <code>state.admin.library.books</code> — просто передайте соответствующий stateSelector: <code>adapter.getSelectors&lt;RootState&gt;(s =&gt; s.admin.library.books)</code>. Local-форма не знает про путь, но её можно комбинировать с <code>slice.getSelectors</code>.',
      },
      {
        kind: 'trap',
        html:
          '<strong>selectById в цикле.</strong> Адаптер использует <code>lruMemoize</code> с size 1. Три вызова <code>selectById(state, \'a\'), selectById(state, \'b\'), selectById(state, \'a\')</code> = 3 miss. Если нужен параметризованный кеш — делайте свой селектор с <code>weakMapMemoize</code>.',
      },
    ],
  },
  {
    num: 'Урок 53',
    title: 'getInitialState + extra state (loading, error)',
    lead:
      '<code>adapter.getInitialState(additionalState?, entities?)</code>. <strong>Первый аргумент</strong> — объект с extra-полями (loading, error, lastFetchAt, filter). Они ложатся на ВЕРХНИЙ уровень state, рядом с <code>ids</code>/<code>entities</code> — получается <em>плоская</em> структура. <strong>Второй аргумент</strong> (RTK 2.x) — массив entities для seed начального состояния.',
    snippets: [
      {
        label: 'postsSlice с loading/error + seed',
        code:
`import {
  createEntityAdapter, createSlice, type PayloadAction,
} from \'@reduxjs/toolkit\'

interface Post { id: string; title: string; author: string }
type LoadingStatus = \'idle\' | \'pending\' | \'fulfilled\' | \'rejected\'

const postsAdapter = createEntityAdapter<Post>()

const seedPosts: Post[] = [
  { id: \'p1\', title: \'Preloaded #1\', author: \'Alice\' },
  { id: \'p2\', title: \'Preloaded #2\', author: \'Bob\' },
]

export const postsSlice = createSlice({
  name: \'posts\',
  initialState: postsAdapter.getInitialState(
    // ① extra state — ляжет на верхний уровень
    {
      loading: \'idle\' as LoadingStatus,
      error: null as string | null,
      lastFetchAt: null as number | null,
    },
    // ② entities seed (RTK 2.x)
    seedPosts,
  ),
  reducers: {
    fetchPending: (state) => {
      state.loading = \'pending\'
      state.error = null
    },
    fetchFulfilled: (state, action: PayloadAction<Post[]>) => {
      state.loading = \'fulfilled\'
      state.lastFetchAt = Date.now()
      postsAdapter.setAll(state, action.payload)
      //         ↑ adapter-метод внутри custom reducer\'а
    },
    fetchRejected: (state, action: PayloadAction<string>) => {
      state.loading = \'rejected\'
      state.error = action.payload
    },
  },
})
`,
      },
      {
        label: 'итоговый shape state.posts',
        code:
`// После getInitialState({loading, error, lastFetchAt}, seed):
state.posts = {
  // от adapter:
  ids: [\'p1\', \'p2\'],
  entities: {
    p1: { id: \'p1\', title: \'Preloaded #1\', author: \'Alice\' },
    p2: { id: \'p2\', title: \'Preloaded #2\', author: \'Bob\' },
  },
  // extra state — ПЛОСКО, на верхнем уровне:
  loading: \'idle\',
  error: null,
  lastFetchAt: null,
}

// Это ВАЖНО: loading НЕ лежит в entities.
// Внутри reducer\'а: state.loading — обычное поле, мутируйте через Immer.
`,
      },
    ],
    insights: [
      {
        kind: 'good',
        html:
          '<strong>Плоская структура — фича.</strong> Селекторы loading/error становятся тривиальными: <code>s =&gt; s.posts.loading</code>. Никакой вложенности вроде <code>s.posts.meta.loading</code> — адаптер сам это организует.',
      },
      {
        kind: 'key',
        html:
          '<strong>Второй аргумент (seed) — новинка RTK 2.x.</strong> До 2.0 приходилось делать <code>adapter.setAll(adapter.getInitialState(extra), seed)</code>. Теперь — одной строкой. Аналогично <code>getInitialState(undefined, seed)</code>, если extra-полей нет.',
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
    title: 'updateOne с nested — что случится с age?',
    prompt:
      'Старт: <code>state.entities[\'a\'] = { id:\'a\', profile: { name:\'Alice\', age: 30 } }</code>.<pre>dispatch(userUpdated({\n  id: \'a\',\n  changes: { profile: { name: \'Bob\' } },\n}))</pre>Что будет в <code>state.entities[\'a\']</code> после этого вызова?',
    options: [
      {
        text: 'A — profile = { name:"Bob", age: 30 } (deep merge)',
        correct: false,
        verdict:
          'Нет. updateOne делает <code>Object.assign(entity, changes)</code> — это SHALLOW. Deep merge он не делает никогда.',
      },
      {
        text: 'B — profile = { name:"Bob" } (age ПОТЕРЯН)',
        correct: true,
        verdict:
          'Правильно. changes.profile полностью заменяет entity.profile. Поле age (которое было в старом profile) — удалено.',
      },
      {
        text: 'C — TypeError, потому что profile должен быть полным',
        correct: false,
        verdict:
          'Нет. TypeScript при <code>Partial&lt;User&gt;</code> разрешит неполный profile. Runtime спокойно заменит объект.',
      },
      {
        text: 'D — age останется, если сначала достать старое значение и собрать <code>{ ...old.profile, name:"Bob" }</code>',
        correct: true,
        verdict:
          'Верно. Это стандартный fix: в custom reducer\'е читаем <code>state.entities[id].profile</code>, spread\'им, передаём в changes. Альтернатива — Immer-мутация <code>state.entities[id].profile.name = \'Bob\'</code>.',
      },
    ],
    explain:
      '<strong>updateOne = shallow merge только верхнего уровня.</strong> Любое вложенное поле, перечисленное в changes, заменяется ЦЕЛИКОМ. Решения: ручной spread в reducer\'е, прямая Immer-мутация, либо плоская модель данных без nested.',
  },

  {
    num: 2,
    title: 'addOne с существующим id',
    prompt:
      'У вас в state уже есть <code>entities[\'a\'] = { id:\'a\', title:\'Old\' }</code>. Диспатчим:<pre>dispatch(bookAdded({ id: \'a\', title: \'New\' }))</pre>Что произойдёт?',
    options: [
      {
        text: 'Заменится на новое значение (title:"New")',
        correct: false,
        verdict:
          'Нет. Это было бы поведение <code>setOne</code>.',
      },
      {
        text: 'No-op — state не меняется',
        correct: true,
        verdict:
          'Верно. <code>addOne</code> тихо игнорирует запись, если <code>entities[id]</code> уже существует. Без warning\'а, без throw.',
      },
      {
        text: 'Merge старого и нового (title:"New", остальное из старого)',
        correct: false,
        verdict:
          'Нет. Это поведение <code>upsertOne</code>.',
      },
      {
        text: 'Бросается ошибка "duplicate id"',
        correct: false,
        verdict:
          'Нет. RTK не throw\'ит — дубликат просто игнорируется. Если нужна валидация, проверяйте в своём коде до dispatch.',
      },
    ],
    explain:
      '<strong>addOne(existing) = silent no-op.</strong> Это отличает его от setOne (replace) и upsertOne (merge). Если вы полагаетесь на "записалось ли" — проверьте <code>entities[id]</code> сами.',
  },

  {
    num: 3,
    title: 'setOne(existingId) — что с полями, не указанными в payload?',
    prompt:
      '<code>entities[\'a\'] = { id:\'a\', title:\'Old\', price: 10, author:\'Knuth\' }</code>. Диспатчим <code>bookSet({ id:\'a\', price: 20 })</code>. Что будет в <code>entities[\'a\']</code>?',
    options: [
      {
        text: '{ id:"a", title:"Old", price: 20, author:"Knuth" } — merge',
        correct: false,
        verdict:
          'Нет. Это поведение <code>upsertOne</code>.',
      },
      {
        text: '{ id:"a", price: 20 } — title и author пропали',
        correct: true,
        verdict:
          'Правильно. <code>setOne</code> — REPLACE: entity заменяется на payload целиком. Всё, чего нет в payload, исчезает.',
      },
      {
        text: 'No-op, потому что id уже существует',
        correct: false,
        verdict:
          'Нет. Это поведение <code>addOne</code>.',
      },
      {
        text: 'TypeScript не пропустит: Book требует title/author',
        correct: false,
        verdict:
          'В <code>createEntityAdapter&lt;Book&gt;()</code> сигнатура <code>setOne</code> принимает <code>Book</code> целиком. Но в примере выше автор приводил <code>Partial&lt;Book&gt; &amp; {id}</code> через <code>as Book</code> — runtime пройдёт, TypeScript заглушен.',
      },
    ],
    explain:
      '<strong>setOne = "мой payload теперь ЕСТЬ entity".</strong> Используйте когда у вас свежий объект из API и вы хотите заменить запись, а не дополнить.',
  },

  {
    num: 4,
    title: 'upsertOne с nested объектом',
    prompt:
      '<code>entities[\'a\'] = { id:\'a\', title:\'Old\', meta: { tags:[\'js\',\'ts\'], views: 100 } }</code>. Диспатчим <code>bookUpserted({ id:\'a\', meta: { tags:[\'go\'] } })</code>. Что получится?',
    options: [
      {
        text: '{ id:"a", title:"Old", meta: { tags:["go"], views: 100 } } — deep merge',
        correct: false,
        verdict:
          'Нет. upsertOne — SHALLOW merge. Nested объекты не мерджатся глубоко.',
      },
      {
        text: '{ id:"a", title:"Old", meta: { tags:["go"] } } — views потерян',
        correct: true,
        verdict:
          'Правильно. upsertOne = <code>Object.assign({}, old, payload)</code>. Верхний уровень мерджится, но meta целиком заменяется тем, что в payload.meta.',
      },
      {
        text: '{ id:"a", meta: { tags:["go"] } } — title тоже пропал',
        correct: false,
        verdict:
          'Нет. title НЕ трогался в payload → остаётся на верхнем уровне (shallow merge).',
      },
      {
        text: 'Поведение upsertOne для nested полей совпадает с updateOne',
        correct: true,
        verdict:
          'Верно. И upsertOne, и updateOne страдают от одной и той же shallow-merge-проблемы на вложенных объектах.',
      },
    ],
    explain:
      '<strong>Upsert и update — shallow merge.</strong> Правило универсальное: если данные нормализованы, держите entity <em>плоскими</em>, либо мерджьте nested вручную.',
  },

  {
    num: 5,
    title: 'sortComparer: кто задаёт порядок в selectAll',
    prompt:
      'В адаптере задан <code>sortComparer: (a, b) =&gt; a.title.localeCompare(b.title)</code>. Компонент вызывает <code>selectAll(state)</code>. Какие утверждения верны?',
    options: [
      {
        text: 'selectAll возвращает books в порядке вставки (push), игнорируя sortComparer',
        correct: false,
        verdict:
          'Нет. Когда sortComparer задан, <code>ids</code> хранится уже отсортированным — selectAll возвращает в этом порядке.',
      },
      {
        text: 'Порядок определяется массивом ids; sortComparer пересчитывается при add/update/upsert',
        correct: true,
        verdict:
          'Верно. Адаптер поддерживает <code>ids</code> отсортированным при КАЖДОЙ мутации через бинарный поиск точки вставки. selectAll просто идёт по ids и собирает entities.',
      },
      {
        text: 'Если updateOne меняет поле title — ids пересортируется',
        correct: true,
        verdict:
          'Да. Любое изменение entity прогоняет compare-fn → если позиция изменилась, ids обновляется.',
      },
      {
        text: 'removeOne тоже вызывает sortComparer',
        correct: false,
        verdict:
          'Нет. Удаление не нарушает относительного порядка оставшихся — compare-fn не нужен. Просто filter по ids.',
      },
    ],
    explain:
      '<strong>sortComparer работает \"лениво на запись\".</strong> Не \"лениво на чтение\" — не в selectAll. Запись платит <code>O(log n)</code> за позицию, чтение <code>selectAll</code> — <code>O(n)</code> просто для сбора массива.',
  },

  {
    num: 6,
    title: 'getSelectors: global vs local — когда какой',
    prompt:
      'У нас есть <code>booksAdapter</code>. Какие из этих вариантов корректно получат список книг?',
    options: [
      {
        text: 'A',
        code:
`const sel = booksAdapter.getSelectors()
// в компоненте:
const books = useSelector((s: RootState) => sel.selectAll(s.books))`,
        correct: true,
        verdict:
          'Работает. LOCAL-форма: без stateSelector, принимает EntityState напрямую — передали <code>s.books</code>.',
      },
      {
        text: 'B',
        code:
`const sel = booksAdapter.getSelectors<RootState>(s => s.books)
const books = useSelector(sel.selectAll)`,
        correct: true,
        verdict:
          'Работает. GLOBALIZED-форма: stateSelector передан. selectAll теперь принимает RootState целиком.',
      },
      {
        text: 'C',
        code:
`const sel = booksAdapter.getSelectors()
const books = useSelector(sel.selectAll)`,
        correct: false,
        verdict:
          'Не работает. LOCAL-форма ожидает <code>EntityState</code>, а useSelector передаёт <code>RootState</code>. <code>state.ids</code> будет undefined.',
      },
      {
        text: 'D',
        code:
`const sel = booksAdapter.getSelectors<RootState>(s => s.books)
const books = useSelector((s: RootState) => sel.selectAll(s.books))`,
        correct: false,
        verdict:
          'Двойной заход. sel.selectAll уже ЖДЁТ RootState (stateSelector внутри сам достанет .books). Передавая <code>s.books</code>, вы даёте EntityState — selectAll попробует <code>state.books.ids</code> → undefined.',
      },
    ],
    explain:
      '<strong>Правило:</strong> либо <code>getSelectors()</code> + ручной <code>s.books</code> в useSelector, либо <code>getSelectors(s =&gt; s.books)</code> + прямой <code>useSelector(sel.selectAll)</code>. Смешивать — ошибка.',
  },

  {
    num: 7,
    title: 'getInitialState({loading}) — куда ложится loading',
    prompt:
      '<code>adapter.getInitialState({ loading: \'idle\', error: null })</code>. Какой shape получится?',
    options: [
      {
        text:
          '{ ids: [], entities: {}, loading: "idle", error: null } — плоско на верхнем уровне',
        correct: true,
        verdict:
          'Правильно. extra state ложится РЯДОМ с ids/entities, не вложенно. Плоская структура.',
      },
      {
        text: '{ ids: [], entities: {}, meta: { loading: "idle", error: null } }',
        correct: false,
        verdict:
          'Нет. Адаптер не оборачивает extra в <code>meta</code>. Поля идут на верхний уровень.',
      },
      {
        text: '{ ids: [], entities: { loading: "idle", error: null } }',
        correct: false,
        verdict:
          'Нет. <code>entities</code> — строго lookup для entities, никакие extra-поля туда не попадают.',
      },
      {
        text: 'loading доступен как <code>state.posts.loading</code> в селекторе',
        correct: true,
        verdict:
          'Да. Плоскую структуру удобно читать: <code>(s: RootState) =&gt; s.posts.loading</code>.',
      },
    ],
    explain:
      '<strong>Плоско = удобно.</strong> Поэтому в <code>createSlice</code> reducers можно просто <code>state.loading = \'pending\'</code> (Immer мутирует поле верхнего уровня).',
  },

  {
    num: 8,
    title: 'Импорт createEntityAdapter',
    prompt:
      'Откуда импортируется <code>createEntityAdapter</code>?',
    options: [
      {
        text: "from '@reduxjs/toolkit'",
        correct: true,
        verdict:
          'Верно. Основной вход пакета — всё в одном import\'е: createSlice, createEntityAdapter, configureStore, nanoid и пр.',
      },
      {
        text: "from '@reduxjs/toolkit/query'",
        correct: false,
        verdict:
          'Нет. Это для RTK Query (createApi, fetchBaseQuery). createEntityAdapter — базовый RTK.',
      },
      {
        text: "from 'reselect'",
        correct: false,
        verdict:
          'Нет. reselect — только createSelector и memoizers.',
      },
      {
        text: "from 'redux'",
        correct: false,
        verdict:
          'Нет. Classic redux не знает про adapters — это RTK-уровень абстракции.',
      },
    ],
    explain:
      '<strong>Один пакет:</strong> <code>@reduxjs/toolkit</code> ре-экспортирует reselect, immer, redux-thunk и собственные createSlice/createEntityAdapter/configureStore. Один import покрывает 95% нужд.',
  },

  {
    num: 9,
    title: 'EntityState<Book> — какой shape',
    prompt:
      'Что истинно про тип <code>EntityState&lt;Book, string&gt;</code>?',
    options: [
      {
        text: 'Имеет поле ids: string[]',
        correct: true,
        verdict:
          'Да. Массив id\'шек, который хранит порядок (и сортируется при sortComparer).',
      },
      {
        text: 'Имеет поле entities: Record<string, Book>',
        correct: true,
        verdict:
          'Да. Plain object (не Map) — ключ string, значение — Book. Если Book отсутствует по id, вернётся undefined.',
      },
      {
        text: 'Имеет поле total: number',
        correct: false,
        verdict:
          'Нет. <code>total</code> не хранится — он вычисляется через <code>selectTotal</code> как <code>ids.length</code>.',
      },
      {
        text: 'Array.isArray(state.ids) === true',
        correct: true,
        verdict:
          'Да. ids — обычный массив. Соответственно <code>map/filter/.length</code> работают напрямую.',
      },
      {
        text: 'entities — это Map объект',
        correct: false,
        verdict:
          'Нет. Record = plain object. Map не используется, потому что Redux требует serializable state.',
      },
    ],
    explain:
      '<strong>Запомните shape:</strong> <code>{ ids: Id[], entities: Record&lt;Id, T&gt; }</code>. Оба поля — обычные JS-структуры, идеально serializable. Никаких Map, Set, классов.',
  },

  {
    num: 10,
    title: 'createEntityAdapter — какие методы есть',
    prompt:
      'Что возвращает вызов <code>createEntityAdapter&lt;Book&gt;({ selectId, sortComparer })</code>? Отметьте все методы/поля, которые у него есть.',
    options: [
      {
        text: 'addOne, addMany, setOne, setAll, setMany',
        correct: true,
        verdict:
          'Есть. Это CRUD-методы adapter\'а — все принимают (state, action) и сами обновляют ids/entities.',
      },
      {
        text: 'updateOne, updateMany, upsertOne, upsertMany, removeOne, removeMany, removeAll',
        correct: true,
        verdict:
          'Есть. Полный набор mutations через adapter.',
      },
      {
        text: 'getInitialState (с опциональными extra и seed entities)',
        correct: true,
        verdict:
          'Есть. <code>getInitialState(additionalState?, entities?)</code>. Второй аргумент (seed) появился в RTK 2.x.',
      },
      {
        text: 'getSelectors (в обеих формах: без и со stateSelector)',
        correct: true,
        verdict:
          'Есть. Возвращает <code>selectAll/selectById/selectIds/selectEntities/selectTotal</code>.',
      },
      {
        text: 'sortComparer и selectId — доступны как свойства adapter\'а',
        correct: true,
        verdict:
          'Да. <code>adapter.sortComparer</code> и <code>adapter.selectId</code> — те самые функции, что передавались в опциях (или default).',
      },
      {
        text: 'createAsyncThunk',
        correct: false,
        verdict:
          'Нет. createAsyncThunk — это отдельная функция из @reduxjs/toolkit. Адаптер к thunk\'ам отношения не имеет.',
      },
      {
        text: 'fetch, connect, subscribe',
        correct: false,
        verdict:
          'Нет. Это вообще не из RTK-адаптера.',
      },
    ],
    explain:
      '<strong>Все методы adapter\'а — чистые reducers.</strong> Их можно сунуть прямо в <code>slice.reducers</code> (<code>bookAdded: booksAdapter.addOne</code>) или вызвать внутри custom reducer\'а (<code>booksAdapter.setAll(state, payload)</code>).',
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
  'Лог Quiz F — createEntityAdapter',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// Dispatch чтобы в DevTools сразу был action + можно было увидеть shape {ids, entities}
store.dispatch(
  booksSlice.actions.bookAdded({ id: nanoid(), title: 'Quiz F welcome', price: 0 }),
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
  'Итоговый квиз по секции F (уроки 46–53). Сначала пробеги по recap\'у, потом квиз: 10 вопросов, многие с несколькими правильными вариантами.',
)
con.info(
  'Mini-store использует createEntityAdapter — в DevTools видно {ids, entities, loading, error}. Открой панель справа и посмотри на shape.',
)
