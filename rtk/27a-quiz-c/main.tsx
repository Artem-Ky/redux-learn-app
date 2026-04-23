import {
  configureStore,
  createAction,
  createReducer,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── Live mini-store (для DevToolsPanel — чтобы страница была интерактивной) ──

interface Todo { id: string; text: string; done: boolean }

const addTodo = createAction('todos/add', (text: string) => ({
  payload: { id: nanoid(), text, done: false } as Todo,
}))
const toggleTodo = createAction<string>('todos/toggle')
const clearAll = createAction('todos/clearAll')

const liveReducer = createReducer<{ items: Todo[] }>(
  { items: [{ id: nanoid(), text: 'Прочитать урок 27', done: true }] },
  (b) => {
    b.addCase(addTodo, (s, a) => { s.items.push(a.payload) })
     .addCase(toggleTodo, (s, a: PayloadAction<string>) => {
       const t = s.items.find((x) => x.id === a.payload)
       if (t) t.done = !t.done
     })
     .addCase(clearAll, () => ({ items: [] }))
  },
)
const store = configureStore({ reducer: liveReducer })

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
    num: 'Урок 20',
    title: 'createAction — фабрика action creator\'ов',
    lead:
      'createAction возвращает функцию-creator. На этой функции живут три полезных свойства: <code>.type</code> (строка), <code>.match(action)</code> (type-guard boolean) и <code>.toString()</code> = type. В template literals <code>`${myAction}`</code> автоматически превращается в строку type — удобно для switch-case в старом коде.',
    snippets: [
      {
        label: 'counterSlice.ts (создание action и reducer)',
        code:
`import { configureStore, createAction, createReducer } from '@reduxjs/toolkit'

// action creator БЕЗ payload
export const tick = createAction('timer/tick')

// Что на нём лежит:
tick.type        // 'timer/tick'
tick.toString()  // 'timer/tick'
\`\${tick}\`        // 'timer/tick'  (шаблонка = toString)
tick.match       // (a) => a.type === 'timer/tick'
tick()           // { type: 'timer/tick', payload: undefined }

// reducer на builder
export const reducer = createReducer({ count: 0 }, (builder) => {
  builder.addCase(tick, (state) => { state.count += 1 })
})
`,
      },
      {
        label: 'store.ts + App.tsx (подключение)',
        code:
`import { configureStore } from '@reduxjs/toolkit'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { reducer, tick } from './counterSlice'

export const store = configureStore({ reducer: { timer: reducer } })
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

function Counter() {
  const count = useSelector((s: RootState) => s.timer.count)
  const dispatch = useDispatch<AppDispatch>()
  return (
    <div>
      <span>{count}</span>
      <button onClick={() => dispatch(tick())}>+1</button>
    </div>
  )
}

export function App() {
  return <Provider store={store}><Counter /></Provider>
}
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>.match — главная фича в TS:</strong> <code>if (tick.match(a)) { /* a: PayloadAction&lt;...&gt; */ }</code>. Разгрузка switch-case на type-guards — проще и типобезопаснее.',
      },
      {
        kind: 'trap',
        html:
          '<strong>Не путайте creator и action.</strong> <code>tick</code> — это ФУНКЦИЯ. <code>tick()</code> — это ОБЪЕКТ <code>{type, payload}</code>. <code>store.dispatch(tick)</code> — ошибка; <code>store.dispatch(tick())</code> — правильно.',
      },
    ],
  },
  {
    num: 'Урок 21',
    title: 'createAction с payload generic',
    lead:
      '<code>createAction&lt;Payload&gt;(type)</code> — generic задаёт тип payload. Без prepare payload = единственный аргумент creator\'а. <code>PayloadAction&lt;T&gt;</code> — встроенный тип для action.',
    snippets: [
      {
        label: 'actions.ts',
        code:
`import { createAction, type PayloadAction } from '@reduxjs/toolkit'

interface User { id: number; name: string }

export const increment = createAction('counter/increment')               // payload: undefined
export const addBy     = createAction<number>('counter/addBy')           // payload: number
export const setUser   = createAction<User>('user/set')                  // payload: User
export const tagged    = createAction<string[], 'tag/set'>('tag/set')    // payload + type literal

// Вызовы:
addBy(5)                           // { type: 'counter/addBy', payload: 5 }
setUser({ id: 1, name: 'Alice' })  // { type: 'user/set',      payload: {...} }
`,
      },
      {
        label: 'reducer.ts (типизированный обработчик)',
        code:
`import { createReducer, type PayloadAction } from '@reduxjs/toolkit'
import { increment, addBy, setUser, tagged } from './actions'

interface State {
  counter: number
  user: { id: number; name: string } | null
  tags: string[]
}

export const reducer = createReducer<State>(
  { counter: 0, user: null, tags: [] },
  (builder) => {
    builder
      .addCase(increment, (s) => { s.counter += 1 })
      .addCase(addBy,     (s, a: PayloadAction<number>) => { s.counter += a.payload })
      .addCase(setUser,   (s, a: PayloadAction<{ id: number; name: string }>) => { s.user = a.payload })
      .addCase(tagged,    (s, a: PayloadAction<string[], 'tag/set'>) => { s.tags = a.payload })
  },
)
`,
      },
      {
        label: 'Controls.tsx',
        code:
`import { useDispatch } from 'react-redux'
import { addBy, setUser } from './actions'

export function Controls() {
  const dispatch = useDispatch()
  return (
    <>
      <button onClick={() => dispatch(addBy(5))}>+5</button>
      <button onClick={() => dispatch(setUser({ id: 1, name: 'Alice' }))}>
        set Alice
      </button>
    </>
  )
}
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong><code>PayloadAction&lt;T, Type, Meta, Error&gt;</code></strong> — 4 параметра. Обычно нужен только первый. Тип action\'а в reducer определяется из creator\'а автоматически, но явная аннотация облегчает чтение.',
      },
    ],
  },
  {
    num: 'Урок 22',
    title: 'prepare callback — кастомизация payload/meta/error',
    lead:
      '<code>createAction(type, prepare)</code>: prepare получает аргументы creator\'а и возвращает объект <code>{ payload, meta?, error? }</code>. Идеальное место для <code>nanoid()</code> — reducer остаётся чистым (без side-effects), но id генерируется <em>до</em> попадания в store (видно в DevTools).',
    snippets: [
      {
        label: 'todosActions.ts',
        code:
`import { createAction, nanoid } from '@reduxjs/toolkit'

interface Todo { id: string; text: string; done: boolean }

// prepare: нормализация входа — из строки делаем полный Todo
export const addTodo = createAction('todos/add', (text: string) => ({
  payload: { id: nanoid(), text, done: false } as Todo,
}))

// prepare: несколько аргументов creator-а → один payload
export const addUser = createAction('users/add', (name: string, age: number) => ({
  payload: { id: nanoid(), name, age },
}))

// prepare: вычисляемая meta (timestamp, source)
export const logged = createAction('event/logged', (message: string) => ({
  payload: message,
  meta:    { timestamp: Date.now(), source: 'user-action' },
}))

// prepare: flag error: true + meta из Error instance
export const failed = createAction('fetch/failed', (err: Error) => ({
  payload: err.message,
  error:   true,
  meta:    { name: err.name, stack: err.stack },
}))
`,
      },
      {
        label: 'todosReducer.ts + store.ts',
        code:
`import { configureStore, createReducer } from '@reduxjs/toolkit'
import { addTodo, addUser, logged, failed } from './todosActions'

interface State {
  todos:  { id: string; text: string; done: boolean }[]
  users:  { id: string; name: string; age: number }[]
  events: { message: string; meta: unknown }[]
  errors: { payload: string; meta: unknown }[]
}

export const reducer = createReducer<State>(
  { todos: [], users: [], events: [], errors: [] },
  (b) => {
    b.addCase(addTodo, (s, a) => { s.todos.push(a.payload) })
     .addCase(addUser, (s, a) => { s.users.push(a.payload) })
     .addCase(logged,  (s, a) => { s.events.push({ message: a.payload, meta: a.meta }) })
     .addCase(failed,  (s, a) => { s.errors.push({ payload: a.payload, meta: a.meta }) })
  },
)

export const store = configureStore({ reducer: { main: reducer } })
`,
      },
    ],
    insights: [
      {
        kind: 'good',
        html:
          '<strong>Почему nanoid ВНУТРИ prepare, а не в reducer\'е:</strong> reducer должен быть чистым (pure) и детерминированным. <code>nanoid()</code> использует <code>crypto.getRandomValues</code> → это side-effect. В prepare он вызывается до попадания в store → reducer получает уже готовый payload с id.',
      },
      {
        kind: 'trap',
        html:
          '<strong>prepare ОБЯЗАН вернуть объект с ключом <code>payload</code>.</strong> Остальное опционально. Если просто вернёшь <code>{ x: 1 }</code> — RTK в dev-режиме выкинет warning, в проде payload будет undefined.',
      },
    ],
  },
  {
    num: 'Урок 23 + 23a',
    title: 'matchers — isAnyOf, isAllOf, свои type-predicates',
    lead:
      'Matcher — функция <code>(action) =&gt; boolean</code>. Используется в <code>addMatcher</code> и в <code>listenerMiddleware</code>. <code>isAnyOf(...creators)</code> = OR-комбинация <code>.match</code>-ей. <code>isAllOf(...)</code> = AND. Кастомный matcher лучше писать как TS type-predicate <code>(a): a is X</code> — это даёт narrowing внутри handler\'а.',
    snippets: [
      {
        label: 'actions.ts + matchers.ts',
        code:
`import { createAction, isAnyOf, isAllOf, type Action } from '@reduxjs/toolkit'

// actions
export const userLoggedIn  = createAction<{ id: string }>('user/loggedIn')
export const userLoggedOut = createAction('user/loggedOut')
export const userUpdated   = createAction<{ name: string }>('user/updated')

// (1) isAnyOf — OR через список creator-ов (использует их .match)
export const isUserAction = isAnyOf(userLoggedIn, userLoggedOut, userUpdated)

// (2) кастомный type-predicate — matcher по namespace 'analytics/'
export const isAnalyticsAction = (a: unknown): a is Action => {
  return !!a
    && typeof (a as Action).type === 'string'
    && (a as Action).type.startsWith('analytics/')
}

// (3) matcher по форме payload — meta.notify есть
interface NotifyMeta { notify: { kind: 'success' | 'error' | 'info'; message: string } }
type NotifyAction = Action & { meta: NotifyMeta }
export const isNotifyAction = (a: unknown): a is NotifyAction => {
  const x = a as { meta?: { notify?: unknown } }
  return !!x?.meta
    && typeof x.meta.notify === 'object'
    && x.meta.notify !== null
    && 'kind' in x.meta.notify
}

// (4) isAllOf — AND-комбинация
export const isUserNotify = isAllOf(isUserAction, isNotifyAction)
// попадёт под него action, у которого И startsWith('user/'), И meta.notify
`,
      },
      {
        label: 'reducer.ts (toast + analytics паттерн)',
        code:
`import { createReducer, nanoid } from '@reduxjs/toolkit'
import { isNotifyAction, isAnalyticsAction, isUserAction } from './matchers'

interface Notification { id: string; kind: 'success' | 'error' | 'info'; message: string }
interface State {
  notifications:     Notification[]
  analytics:         { id: string; type: string; data: unknown; at: number }[]
  lastUserActivity:  number | null
}

export const reducer = createReducer<State>(
  { notifications: [], analytics: [], lastUserActivity: null },
  (b) => {
    b
      // (1) Любой action с meta.notify → push toast.
      // TS знает про a.meta.notify благодаря type-predicate.
      .addMatcher(isNotifyAction, (s, a) => {
        s.notifications.push({
          id: nanoid(6),
          kind:    a.meta.notify.kind,
          message: a.meta.notify.message,
        })
      })
      // (2) Любой 'analytics/*' → лог в analytics array
      .addMatcher(isAnalyticsAction, (s, a) => {
        s.analytics.push({
          id: nanoid(6),
          type: a.type,
          data: (a as { payload?: unknown }).payload,
          at: Date.now(),
        })
      })
      // (3) Любой 'user/*' → обновить lastActivity
      .addMatcher(isUserAction, (s) => { s.lastUserActivity = Date.now() })
  },
)
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>nanoid() по умолчанию — 21 символ, URL-safe.</strong> Можно сократить: <code>nanoid(6)</code>, <code>nanoid(10)</code>. Внутри использует <code>crypto.getRandomValues</code>. Коллизии на 100k id практически невозможны.',
      },
      {
        kind: 'good',
        html:
          '<strong>Паттерн: один matcher для сквозных вещей.</strong> Вместо того чтобы в каждом slice\'е писать логику «покажи toast» — поднимаем её на уровень matcher\'а и reducer\'а. Один источник правды.',
      },
      {
        kind: 'trap',
        html:
          '<strong>matcher без type-predicate работает, но теряет narrowing.</strong> <code>(a) =&gt; a.type.startsWith(\'...\')</code> — это <code>(a: unknown) =&gt; boolean</code>. Внутри handler\'а <code>a</code> будет <code>AnyAction</code>, без уточнения. С type-predicate (<code>a is X</code>) TS сразу сужает.',
      },
    ],
  },
  {
    num: 'Урок 24',
    title: 'createReducer + builder API',
    lead:
      '<code>createReducer(initialState, builderCallback)</code> — основной способ. builder.addCase принимает creator-а (или строку type) и handler. Handler может МУТИРОВАТЬ draft (это Immer) ИЛИ вернуть новое значение — но не оба. Цепочка <code>b.addCase().addCase()</code> — fluent API.',
    snippets: [
      {
        label: 'todosSlice.ts (actions + reducer + store)',
        code:
`import { configureStore, createAction, createReducer, nanoid, type PayloadAction } from '@reduxjs/toolkit'

interface Todo { id: string; text: string; done: boolean }

// actions (см. уроки 20-22)
const addTodo    = createAction('todos/add', (text: string) => ({
  payload: { id: nanoid(), text, done: false } as Todo,
}))
const toggleTodo = createAction<string>('todos/toggle')
const removeTodo = createAction<string>('todos/remove')
const clearAll   = createAction('todos/clearAll')

// reducer через builder
const todosReducer = createReducer<Todo[]>([], (builder) => {
  builder
    .addCase(addTodo, (state, action) => {
      state.push(action.payload)                            // мутация draft
    })
    .addCase(toggleTodo, (state, action: PayloadAction<string>) => {
      const t = state.find((x) => x.id === action.payload)
      if (t) t.done = !t.done
    })
    .addCase(removeTodo, (state, action: PayloadAction<string>) => {
      return state.filter((x) => x.id !== action.payload)   // return нового state
    })
    .addCase(clearAll, () => [])                            // замена всего
})

export const store = configureStore({ reducer: { todos: todosReducer } })
export { addTodo, toggleTodo, removeTodo, clearAll }
`,
      },
      {
        label: 'TodoList.tsx',
        code:
`import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './store'
import { addTodo, toggleTodo, removeTodo, clearAll } from './todosSlice'

export function TodoList() {
  const todos = useSelector((s: RootState) => s.todos)
  const dispatch = useDispatch<AppDispatch>()
  return (
    <>
      <button onClick={() => dispatch(addTodo('new task'))}>+ add</button>
      <button onClick={() => dispatch(clearAll())}>clear</button>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>
            <input type="checkbox" checked={t.done}
                   onChange={() => dispatch(toggleTodo(t.id))} />
            {t.text}
            <button onClick={() => dispatch(removeTodo(t.id))}>×</button>
          </li>
        ))}
      </ul>
    </>
  )
}
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>Два стиля в одном builder.</strong> В примере выше <code>addTodo</code> и <code>toggleTodo</code> мутируют draft (push, assign), а <code>removeTodo</code> и <code>clearAll</code> возвращают новый массив. Оба валидны. Главное — <em>не смешивать</em> в ОДНОМ handler\'е.',
      },
      {
        kind: 'trap',
        html:
          '<strong>Старая (устаревшая) форма <code>createReducer(initial, { [type]: handler })</code>.</strong> Работает, но без TS-инференса. Используйте builder-форму.',
      },
    ],
  },
  {
    num: 'Урок 25',
    title: 'addCase → addMatcher → addDefaultCase: порядок и поведение',
    lead:
      '<strong>Строгий порядок в builder:</strong> сначала ВСЕ <code>addCase</code>, потом ВСЕ <code>addMatcher</code>, и только в конце ОДИН <code>addDefaultCase</code>. На dispatch action-а: ищется <strong>один</strong> addCase с точным type → потом вызываются <strong>ВСЕ</strong> addMatcher-ы с <code>matcher(action) === true</code> → addDefaultCase срабатывает только если <strong>ни один</strong> addCase/addMatcher не совпал.',
    snippets: [
      {
        label: 'reducer.ts (все три уровня в одном)',
        code:
`import { configureStore, createAction, createReducer, isAnyOf } from '@reduxjs/toolkit'

const userLoggedIn       = createAction<{ id: number }>('user/loggedIn')
const userLoggedOut      = createAction('user/loggedOut')
const userFetchRejected  = createAction('user/fetch', (msg: string) => ({
  payload: msg, error: true, meta: { requestStatus: 'rejected' },
}))
const randomAction       = createAction<string>('random/thing')

const isUserAction = isAnyOf(userLoggedIn, userLoggedOut, userFetchRejected)
const isRejected   = (a: { type?: string; error?: unknown }): boolean =>
  a.error === true || String(a.type ?? '').endsWith('/rejected')

interface State { events: string[] }

const reducer = createReducer<State>({ events: [] }, (builder) => {
  builder
    // точные addCase — по одному на creator
    .addCase(userLoggedIn,  (s) => { s.events.push('#1 addCase(userLoggedIn)')  })
    .addCase(userLoggedOut, (s) => { s.events.push('#2 addCase(userLoggedOut)') })

    // matcher-ы — ПОСЛЕ всех addCase
    .addMatcher(isUserAction, (s) => { s.events.push('#3 addMatcher(isUserAction)') })
    .addMatcher(isRejected,   (s) => { s.events.push('#4 addMatcher(isRejected)')   })

    // default — в самом конце, ОДИН раз
    .addDefaultCase((s, a) => { s.events.push(\`#5 defaultCase для "\${a.type}"\`) })
})

const store = configureStore({ reducer: { main: reducer } })

// dispatch(userLoggedIn({ id: 1 })) → events += #1 И #3  (addCase + все matchers, default пропущен)
// dispatch({ type: 'posts/fetch', error: true }) → только #4 (matcher сработал)
// dispatch(randomAction('hi'))     → только #5 (ни addCase, ни matcher не совпали)
`,
      },
      {
        label: 'ERROR: неверный порядок',
        code:
`// ❌ РЕНТАЙМ-ОШИБКА при создании reducer-а:
createReducer(initial, (b) => {
  b.addCase(foo, h1)
   .addMatcher(isBar, h2)   // matcher
   .addCase(baz, h3)        // ← addCase после addMatcher: EXCEPTION
})
// "\`builder.addCase\` cannot be called after \`builder.addMatcher\`"

// ❌ Два addDefaultCase:
createReducer(initial, (b) => {
  b.addDefaultCase(h1).addDefaultCase(h2)  // EXCEPTION
})

// ❌ addCase/addMatcher после addDefaultCase:
createReducer(initial, (b) => {
  b.addDefaultCase(hd).addCase(foo, h1)    // EXCEPTION
})
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>Для одного action могут выполниться НЕСКОЛЬКО handler-ов.</strong> <code>userLoggedIn</code> попадает и под addCase(userLoggedIn), и под все matcher-ы с predicate true. Все они выполняются последовательно, каждый мутирует <em>один и тот же</em> draft.',
      },
      {
        kind: 'trap',
        html:
          '<strong>addDefaultCase не вызывается, если сработал хоть один matcher.</strong> Даже если addCase был только один (не совпал) — достаточно одного addMatcher, чтобы default не выполнился.',
      },
    ],
  },
  {
    num: 'Урок 26',
    title: 'Immer внутри createReducer — produce + draft',
    lead:
      'RTK использует Immer под капотом. <code>createReducer</code> оборачивает каждый handler в <code>produce(state, handler)</code>. Вместо реального state в handler передаётся <strong>draft</strong> — Proxy, на котором фиксируются все «мутации». Immer применяет их к новому объекту через <em>structural sharing</em>: ветки, которые не трогал, остаются с той же ссылкой.',
    snippets: [
      {
        label: 'Упрощённая модель того, что делает createReducer',
        code:
`import { produce } from 'immer'

// Грубая модель:
function createReducer(initial, setup) {
  const cases: Record<string, Function> = {}
  setup({
    addCase(type, handler) { cases[type.type ?? type] = handler },
    addMatcher() { /* ... */ },
    addDefaultCase() { /* ... */ },
  })
  return (state = initial, action) => {
    const handler = cases[action.type]
    if (!handler) return state
    // produce: даёт draft, ловит мутации, возвращает новый объект
    return produce(state, (draft) => {
      const result = handler(draft, action)
      if (result !== undefined) return result   // handler вернул → это новый state
    })
  }
}
`,
      },
      {
        label: 'structuralSharingDemo.ts — ссылки после мутации',
        code:
`import { configureStore, createAction, createReducer } from '@reduxjs/toolkit'

interface State {
  counter: { value: number }
  user:    { name: string; age: number }
  tags:    string[]
}

const initial: State = {
  counter: { value: 0 },
  user:    { name: 'Alice', age: 30 },
  tags:    ['a', 'b'],
}

const inc     = createAction('inc')
const pushTag = createAction('pushTag')

const reducer = createReducer<State>(initial, (b) => {
  b.addCase(inc,     (s) => { s.counter.value += 1 })
   .addCase(pushTag, (s) => { s.tags.push('c') })
})

const store = configureStore({ reducer })

const before = store.getState()
store.dispatch(inc())
const after = store.getState()

// Root — НОВЫЙ объект (ссылка поменялась)
console.log(before === after)                 // false
// Ветка trogar-и — counter — новая ссылка
console.log(before.counter === after.counter) // false
// Ветки, которые не трогали — user, tags — ТА ЖЕ ссылка
console.log(before.user  === after.user)      // true
console.log(before.tags  === after.tags)      // true
`,
      },
    ],
    insights: [
      {
        kind: 'key',
        html:
          '<strong>Structural sharing = производительность селекторов.</strong> <code>useSelector(s =&gt; s.user)</code> не вызовет ререндер при <code>inc()</code> — <code>s.user</code> === old reference, <code>===</code>-компаратор useSelector срабатывает как HIT.',
      },
      {
        kind: 'good',
        html:
          '<strong>Если handler НЕ мутирует и НЕ возвращает</strong> — Immer отдаёт <em>ту же</em> ссылку. Это корректно и оптимально (никакой перестройки).',
      },
    ],
  },
  {
    num: 'Урок 27',
    title: 'Immer pitfalls — return + mutate, current, original, isDraft',
    lead:
      'Главное правило Immer: ИЛИ мутируй draft, ИЛИ верни новое значение — но не оба. Дополнительно: draft — Proxy с коротким lifecycle (нельзя сохранять вне reducer\'а), <code>current(draft)</code> даёт plain snapshot для логов, <code>original(draft)</code> — ссылку на исходный объект до мутаций, <code>isDraft(x)</code> проверяет Proxy.',
    snippets: [
      {
        label: '6 граблей в одном reducer\'е',
        code:
`import { createAction, createReducer, current, original, isDraft } from '@reduxjs/toolkit'

interface State { value: number; count: number; items: number[] }
const initial: State = { value: 0, count: 0, items: [] }

const mixAct         = createAction('demo/mix')
const savedDraftAct  = createAction('demo/save')
const nullReturnAct  = createAction('demo/nullReturn')
const currOrigAct    = createAction('demo/currOrig')
const logAct         = createAction('demo/log')

let savedDraft: unknown = null

const reducer = createReducer<State>(initial, (b) => {
  // ❌ 1. return + mutate = ERROR: "returned a new value *and* modified its draft"
  b.addCase(mixAct, (state) => {
    state.value += 1                                         // mutate
    return { ...state, value: state.value + 100 } as State   // + return — ошибка!
  })

  // ❌ 2. сохранить draft вне reducer-а → Proxy revoked на следующем чтении
  .addCase(savedDraftAct, (state) => { savedDraft = state })

  // ❌ 3. return null: Immer сочтёт valid return, мутация поверх — ошибка
  .addCase(nullReturnAct, (state) => {
    state.value = 999
    return null as unknown as State
  })

  // ✅ 4. current() vs original()
  .addCase(currOrigAct, (state) => {
    state.count = 10
    const cur1  = current(state.count)    // 10   (plain snapshot СЕЙЧАС)
    const orig1 = original(state.count)   // 0    (всегда до всех мутаций)
    state.count = 20
    const cur2  = current(state.count)    // 20
    const orig2 = original(state.count)   // 0    (тот же original)
    console.log({ cur1, orig1, cur2, orig2 })
  })

  // ✅ 5. console.log — используй current() для читаемого snapshot-а
  .addCase(logAct, (state) => {
    state.value += 1
    console.log('state:',  state)                         // покажет Proxy {...}
    console.log('state:',  current(state))                // plain object — читаемо
    console.log('isDraft:', isDraft(state))               // true внутри reducer-а
  })
})
`,
      },
      {
        label: 'Правильные формы handler-а',
        code:
`// ✅ ТОЛЬКО мутация — handler не возвращает ничего (undefined)
(s) => { s.value += 1 }

// ✅ ТОЛЬКО return — handler возвращает НОВЫЙ объект, draft НЕ трогается
(s) => ({ ...s, value: s.value + 1 })

// ✅ ТОЛЬКО return — для примитивов (мутировать нечего)
createReducer<number>(0, (b) => {
  b.addCase(inc, (s) => s + 1)   // returning number, not mutating
})

// ✅ current() для логов и snapshot-ов
(s) => {
  s.items.push(42)
  console.log('после push:', current(s))  // вместо console.log(s) — который покажет Proxy
}

// ✅ isDraft — проверить внутри helper-а
import { isDraft } from '@reduxjs/toolkit'
function addItem(state: State, item: Item) {
  const target = isDraft(state) ? state : structuredClone(state)
  target.items.push(item)
  return target
}
`,
      },
    ],
    insights: [
      {
        kind: 'trap',
        html:
          '<strong>return null — не то же самое, что return undefined.</strong> Immer воспринимает <code>null</code> как <em>«новое значение state»</em>. Если заодно мутировал draft — это запрещённая комбинация → exception.',
      },
      {
        kind: 'trap',
        html:
          '<strong>console.log(state) покажет <code>Proxy {...}</code>, а не данные.</strong> Используй <code>console.log(current(state))</code> для читаемого snapshot-а.',
      },
      {
        kind: 'key',
        html:
          '<strong>current vs original.</strong> <code>current(draft)</code> = plain snapshot того, что в драфте СЕЙЧАС. <code>original(draft)</code> = ссылка на исходный объект ДО reducer-а (через все последующие мутации остаётся тем же).',
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
    title: 'Что лежит на функции, возвращённой createAction',
    prompt:
      'Объявили <code>const tick = createAction(\'timer/tick\')</code>. Какие выражения верны?',
    options: [
      {
        text: 'A',
        code: `tick.type === 'timer/tick'`,
        correct: true,
        verdict:
          'Да. <code>.type</code> — строка, которую передали в createAction.',
      },
      {
        text: 'B',
        code: `tick.toString() === 'timer/tick'`,
        correct: true,
        verdict:
          'Да. <code>toString</code> переопределён — возвращает type. Отсюда работа template literal: `${tick}` = \'timer/tick\'.',
      },
      {
        text: 'C',
        code: `tick.match({ type: 'timer/tick' }) === true`,
        correct: true,
        verdict:
          'Да. <code>.match</code> — type-guard: <code>(a) =&gt; a.type === tick.type</code>.',
      },
      {
        text: 'D',
        code: `tick === { type: 'timer/tick', payload: undefined }`,
        correct: false,
        verdict:
          'Нет. <code>tick</code> — ФУНКЦИЯ-creator, а не action. Action получится после вызова: <code>tick()</code>.',
      },
    ],
    explain:
      '<strong>Запомни:</strong> <code>createAction(type)</code> возвращает функцию. На функции живут три полезных свойства: <code>.type</code> (строка), <code>.toString()</code> (= type), <code>.match(action)</code> (type-guard boolean). Сам action получается только после вызова creator-а: <code>tick()</code>.',
  },

  {
    num: 2,
    title: 'Одинаковый ли action.type получится?',
    prompt:
      'Есть два определения:<pre>const raw = createAction(\'todo/add\')\nconst slice = createSlice({\n  name: \'todo\',\n  initialState: [],\n  reducers: { add: (s, a) =&gt; { s.push(a.payload) } },\n})</pre>Какие утверждения верны?',
    options: [
      {
        text: 'raw().type === slice.actions.add().type (оба \'todo/add\')',
        correct: true,
        verdict:
          'Верно. <code>createSlice</code> собирает type как <code>`${name}/${reducerKey}`</code>. name=\'todo\', key=\'add\' → \'todo/add\'. Совпадает с <code>raw</code>.',
      },
      {
        text: 'slice.actions.add.match(raw()) === true',
        correct: true,
        verdict:
          'Да. <code>.match</code> сравнивает только <code>action.type</code>, а типы идентичные.',
      },
      {
        text: 'raw === slice.actions.add (это одна и та же функция)',
        correct: false,
        verdict:
          'Нет. Это две разные функции, просто со <em>одинаковым</em> type. Ссылочно — разные объекты.',
      },
      {
        text: 'store.dispatch(raw()) попадёт в обработчик slice.reducers.add',
        correct: true,
        verdict:
          'Попадёт — slice-reducer подписан на type \'todo/add\', а <code>raw()</code> имеет тот же type. Это частая причина «загадочных» совпадений: reducer matches по type, не по ссылке.',
      },
    ],
    explain:
      '<strong>Правило type:</strong> <code>createSlice</code> генерирует action.type как <code>name + \'/\' + reducerKey</code>. Если вручную через createAction использовать ту же строку — это тот же type; reducer-ы matches по type, не по ссылке. Мощно (можно переиспользовать), но опасно (случайные коллизии имён).',
  },

  {
    num: 3,
    title: 'prepare callback — какая подпись корректна',
    prompt:
      'Отметьте все корректные определения <code>prepare</code> в <code>createAction(type, prepare)</code>.',
    options: [
      {
        text: 'A — возвращает { payload }',
        code:
`createAction('todos/add', (text: string) => ({
  payload: { id: nanoid(), text, done: false },
}))`,
        correct: true,
        verdict:
          'Корректно. Минимум — ключ <code>payload</code>. Ничего больше не требуется.',
      },
      {
        text: 'B — возвращает { payload, meta }',
        code:
`createAction('event/logged', (msg: string) => ({
  payload: msg,
  meta:    { timestamp: Date.now(), source: 'user' },
}))`,
        correct: true,
        verdict:
          'Корректно. <code>meta</code> — служебное поле, пройдёт в action. Классика для timestamp.',
      },
      {
        text: 'C — возвращает { payload, error, meta }',
        code:
`createAction('fetch/failed', (err: Error) => ({
  payload: err.message,
  error:   true,
  meta:    { stack: err.stack },
}))`,
        correct: true,
        verdict:
          'Корректно. Флаг <code>error: true</code> — FSA-стандарт для «это ошибка». Handler получит полный action.',
      },
      {
        text: 'D — возвращает просто { id, text } (без ключа payload)',
        code:
`createAction('todos/add', (text: string) => ({
  id:   nanoid(),
  text,
}))`,
        correct: false,
        verdict:
          'Неверно. prepare ОБЯЗАН вернуть объект с ключом <code>payload</code>. RTK в dev-режиме warning/error, в prod payload будет undefined.',
      },
      {
        text: 'E — возвращает payload напрямую (примитив)',
        code: `createAction('x', (n: number) => n * 2)`,
        correct: false,
        verdict:
          'Неверно. prepare возвращает <strong>объект</strong>, не голый payload. Правильно: <code>(n) =&gt; ({ payload: n * 2 })</code>.',
      },
    ],
    explain:
      '<strong>Форма возврата prepare:</strong> всегда объект с обязательным <code>payload</code> и опциональными <code>meta</code>, <code>error</code>. Если prepare возвращает что-то другое — dev-warning; в проде просто потеряешь payload.',
  },

  {
    num: 4,
    title: 'nanoid — свойства и где использовать',
    prompt: 'Какие утверждения про <code>nanoid</code> из RTK верны?',
    options: [
      {
        text: 'nanoid() по умолчанию возвращает строку длиной 21 символ, URL-safe алфавит',
        correct: true,
        verdict:
          'Да. 21 символ из алфавита [A-Za-z0-9_-]. ~149 млрд id нужно, чтобы получить 1% вероятности коллизии.',
      },
      {
        text: 'nanoid() использует crypto.getRandomValues (криптографически случайный)',
        correct: true,
        verdict:
          'Да. В браузере — <code>crypto.getRandomValues</code>, в Node.js — <code>crypto.randomFillSync</code>. Но это НЕ secure-grade (не для паролей/ключей).',
      },
      {
        text: 'nanoid() лучше вызывать в reducer\'е — там одно место для генерации',
        correct: false,
        verdict:
          'Наоборот! Reducer должен быть ЧИСТЫМ (pure) и детерминированным. <code>nanoid()</code> — side-effect. Правильное место — в <code>prepare</code> callback: id появится ДО store, DevTools его увидит.',
      },
      {
        text: 'nanoid(n) — можно задать длину',
        correct: true,
        verdict:
          'Да. <code>nanoid(10)</code>, <code>nanoid(6)</code>. При уменьшении длины растёт вероятность коллизий.',
      },
    ],
    explain:
      '<strong>Паттерн:</strong> <code>nanoid()</code> внутри <code>prepare</code> — чистый reducer остаётся чистым, id виден в DevTools в момент dispatch-а (до reducer-а). В reducer-е — только детерминированные операции.',
  },

  {
    num: 5,
    title: 'isAnyOf и .match — эквивалентны ли?',
    prompt:
      'Есть три actions: <code>loggedIn</code>, <code>loggedOut</code>, <code>updated</code>. Хотим matcher «любой из трёх». Какие варианты дадут одинаковое поведение?',
    options: [
      {
        text: 'A — isAnyOf',
        code: `const isUser = isAnyOf(loggedIn, loggedOut, updated)`,
        correct: true,
        verdict:
          'Да. Это ровно то, для чего <code>isAnyOf</code> и существует. Внутри вызывает <code>.match</code> каждого creator-а через OR.',
      },
      {
        text: 'B — ручная OR-композиция через .match',
        code:
`const isUser = (a: unknown) =>
  loggedIn.match(a) || loggedOut.match(a) || updated.match(a)`,
        correct: true,
        verdict:
          'Эквивалентно по поведению. Минус — теряется type-narrowing: <code>isAnyOf</code> возвращает type-predicate <code>a is ReturnType&lt;...&gt;</code>, а ручная версия — просто <code>boolean</code>.',
      },
      {
        text: 'C — проверка по строке type',
        code:
`const isUser = (a: { type?: string }) =>
  a.type === 'user/loggedIn' || a.type === 'user/loggedOut' || a.type === 'user/updated'`,
        correct: true,
        verdict:
          'По поведению эквивалентно. Но строки легко разъехаться с реальностью (опечатка, переименование). isAnyOf лучше — type связан с creator-ом.',
      },
      {
        text: 'D — isAllOf (AND вместо OR)',
        code: `const isUser = isAllOf(loggedIn, loggedOut, updated)`,
        correct: false,
        verdict:
          'Нет! <code>isAllOf</code> = AND. Сработает только если action подходит под ВСЕ три creator-а одновременно — невозможно (у action один type).',
      },
    ],
    explain:
      '<strong>isAnyOf = OR, isAllOf = AND.</strong> OR — для «любой из этих action-ов». AND — для композиции условий (например, «user-namespace И имеет error flag»). Строчная проверка работает, но типо-небезопасна.',
  },

  {
    num: 6,
    title: 'addCase / addMatcher / addDefaultCase — допустимые порядки',
    prompt:
      'Какие builder-конфигурации валидны (не выкинут runtime-ошибку при создании reducer\'а)?',
    options: [
      {
        text: 'A',
        code:
`builder
  .addCase(foo, h1)
  .addCase(bar, h2)
  .addMatcher(isBaz, h3)
  .addDefaultCase(hd)`,
        correct: true,
        verdict:
          'Канонический порядок: addCase → addMatcher → addDefaultCase. Всё валидно.',
      },
      {
        text: 'B',
        code:
`builder
  .addCase(foo, h1)
  .addMatcher(isBar, h2)
  .addCase(baz, h3)   // addCase ПОСЛЕ addMatcher
  .addDefaultCase(hd)`,
        correct: false,
        verdict:
          'Невалидно! RTK выкинет: «`builder.addCase` cannot be called after `builder.addMatcher`». Все addCase должны идти раньше любого addMatcher.',
      },
      {
        text: 'C',
        code:
`builder
  .addCase(foo, h1)
  .addMatcher(isBar, h2)`,
        correct: true,
        verdict:
          'Валидно. addDefaultCase необязателен.',
      },
      {
        text: 'D',
        code:
`builder
  .addDefaultCase(hd)
  .addCase(foo, h1)`,
        correct: false,
        verdict:
          'Невалидно. <code>addDefaultCase</code> должен быть ПОСЛЕДНИМ. После него вызывать addCase/addMatcher нельзя.',
      },
      {
        text: 'E',
        code:
`builder
  .addMatcher(isA, h1)
  .addMatcher(isB, h2)
  .addDefaultCase(hd)`,
        correct: true,
        verdict:
          'Валидно. Можно вообще без addCase — только matcher-ы и default. Или только matcher-ы.',
      },
    ],
    explain:
      '<strong>Правило порядка:</strong> сначала ВСЕ <code>addCase</code>, потом ВСЕ <code>addMatcher</code>, и максимум ОДИН <code>addDefaultCase</code> в самом конце. Нарушишь — <em>runtime exception</em> при создании reducer-а, ещё до первого dispatch-а.',
  },

  {
    num: 7,
    title: 'Какие reducer\'ы сработают правильно (Immer)',
    prompt:
      'Для <code>createReducer</code> какие handler-ы корректны и не выкинут ошибку Immer?',
    options: [
      {
        text: 'A — только мутация draft',
        code: `(state) => { state.count += 1 }`,
        correct: true,
        verdict:
          'Корректно. Handler ничего не возвращает (<code>undefined</code>) — Immer применит мутации к draft и вернёт новый объект.',
      },
      {
        text: 'B — только return нового state',
        code: `(state) => ({ ...state, count: state.count + 1 })`,
        correct: true,
        verdict:
          'Корректно. Draft не трогаем, возвращаем новое значение — Immer использует его как результат.',
      },
      {
        text: 'C — мутация draft + return нового state',
        code:
`(state) => {
  state.count += 1
  return { ...state, extra: 42 }
}`,
        correct: false,
        verdict:
          'ОШИБКА: «An immer producer returned a new value *and* modified its draft». ИЛИ мутируй, ИЛИ верни — не оба.',
      },
      {
        text: 'D — мутация + явный return undefined',
        code:
`(state) => {
  state.count += 1
  return undefined
}`,
        correct: true,
        verdict:
          'Корректно. <code>return undefined</code> ≡ отсутствие return. Immer принимает draft с мутациями как результат.',
      },
      {
        text: 'E — мутация + return null',
        code:
`(state) => {
  state.count += 1
  return null
}`,
        correct: false,
        verdict:
          'ОШИБКА. <code>null</code> — это не undefined. Immer сочтёт его <em>новым значением state</em>, а мутация сверху → ошибка «returned a new value *and* modified its draft».',
      },
    ],
    explain:
      '<strong>Правило номер один в Immer:</strong> <em>либо</em> мутируешь draft (handler возвращает <code>undefined</code>), <em>либо</em> возвращаешь новое значение (draft не трогаешь). Путают обычно на <code>return null</code> — это валидное «новое значение», а не «ничего».',
  },

  {
    num: 8,
    title: 'current() vs original() — что вернут',
    prompt:
      'initial = <code>{ count: 0 }</code>. В reducer-е:<pre>(state) =&gt; {\n  state.count = 10\n  const a = current(state.count)   // ?\n  const b = original(state.count)  // ?\n  state.count = 20\n  const c = current(state.count)   // ?\n  const d = original(state.count)  // ?\n}</pre>',
    options: [
      {
        text: 'a=10, b=0, c=20, d=0',
        correct: true,
        verdict:
          'Правильно. <code>current(draft)</code> = plain snapshot СЕЙЧАС. <code>original(draft)</code> = ссылка на объект ДО reducer-а, через все мутации остаётся той же.',
      },
      {
        text: 'a=0, b=0, c=0, d=0 (Immer ничего не видит)',
        correct: false,
        verdict:
          'Нет. Immer отлично видит мутации — draft их записывает.',
      },
      {
        text: 'a=10, b=10, c=20, d=20 (оба возвращают актуальное значение)',
        correct: false,
        verdict:
          'Нет. Это <code>current</code> делает. <code>original</code> всегда показывает исходный объект.',
      },
      {
        text: 'a=10, b=0, c=20, d=20 (original тоже обновляется)',
        correct: false,
        verdict:
          'Нет. <code>original</code> — ссылка на объект ДО reducer-а, мутации его не затрагивают.',
      },
    ],
    explain:
      '<strong>Мнемоника:</strong> <code>current</code> — «как СЕЙЧАС» (plain copy в момент вызова). <code>original</code> — «как БЫЛО до reducer-а» (референс на исходник). current удобен для логов и snapshot-ов, original — чтобы сравнить «было/стало».',
  },

  {
    num: 9,
    title: 'Несколько matcher\'ов совпали — что выполнится',
    prompt:
      'Reducer:<pre>b.addCase(userLoggedIn, h1)\n .addMatcher(isUserAction,  h2)   // isAnyOf(loggedIn, loggedOut)\n .addMatcher(isAnalytics,   h3)   // startsWith(\'analytics/\')\n .addDefaultCase(hd)</pre>dispatch(<code>userLoggedIn({ id: 1 })</code>). Какие утверждения верны?',
    options: [
      {
        text: 'Выполнятся и h1, и h2 — оба мутируют ОДИН draft последовательно',
        correct: true,
        verdict:
          'Правильно. h1 срабатывает по точному type, h2 — потому что <code>isUserAction(action) === true</code>. Все совпавшие handler-ы отработают подряд на одном draft.',
      },
      {
        text: 'Выполнится только h1 (addCase блокирует дальнейшее)',
        correct: false,
        verdict:
          'Нет. addCase НЕ останавливает цепочку. После него всё равно проверяются все matcher-ы.',
      },
      {
        text: 'h3 не сработает, потому что type не начинается с \'analytics/\'',
        correct: true,
        verdict:
          'Верно — h3 пропущен, его predicate вернул false.',
      },
      {
        text: 'hd (defaultCase) не сработает',
        correct: true,
        verdict:
          'Верно. Default срабатывает ТОЛЬКО когда ни addCase, ни matcher не совпали. Здесь совпало → default пропущен.',
      },
      {
        text: 'Выполнятся h1 + h2 + h3 + hd (всё подряд)',
        correct: false,
        verdict:
          'Нет. h3 не совпал; hd не срабатывает, если был хоть один match.',
      },
    ],
    explain:
      '<strong>Модель:</strong> для action выполняется (0 или 1) addCase + ВСЕ подошедшие matcher-ы, ИЛИ defaultCase (если ни один не совпал). Все совпавшие handler-ы мутируют ОДИН draft по очереди.',
  },

  {
    num: 10,
    title: 'Жизнь draft\'а заканчивается с reducer\'ом',
    prompt:
      'Что произойдёт с кодом?<pre>let saved: any = null\nconst reducer = createReducer({ value: 0 }, (b) =&gt; {\n  b.addCase(act, (state) =&gt; {\n    state.value = 10\n    saved = state\n  })\n})\n// позже (после dispatch):\nconsole.log(saved.value)\nsaved.value = 99</pre>',
    options: [
      {
        text: 'console.log(saved.value) выведет 10',
        correct: false,
        verdict:
          'Нет. <code>saved</code> — это draft-Proxy, и после завершения reducer-а он revoked. Обращение: <code>TypeError: Cannot perform \'get\' on a proxy that has been revoked</code>.',
      },
      {
        text: 'saved.value = 99 выкинет TypeError про revoked proxy',
        correct: true,
        verdict:
          'Да. Proxy revoked → любая операция на нём бросает. Это защитный механизм Immer: draft живёт только до конца produce.',
      },
      {
        text: 'isDraft(saved) === true даже после reducer-а',
        correct: false,
        verdict:
          'Нет. <code>isDraft</code> на revoked-Proxy либо вернёт false, либо бросит. В любом случае не «true».',
      },
      {
        text: 'Внутри reducer-а state.value = 10 записалось в store',
        correct: true,
        verdict:
          'Внутри reducer-а мутация draft фиксируется — новый state = <code>{ value: 10 }</code>. А вот попытка использовать draft ПОСЛЕ — ошибка.',
      },
      {
        text: 'Чтобы сохранить значение — надо `saved = current(state)`',
        correct: true,
        verdict:
          'Правильно. <code>current(draft)</code> возвращает plain snapshot, который живёт вне Proxy. Это безопасно.',
      },
    ],
    explain:
      '<strong>Жизненный цикл draft:</strong> создаётся в начале <code>produce()</code>, revoked в конце. Сохранять ссылку снаружи нельзя. Если нужен snapshot — используй <code>current(draft)</code> (plain copy) или <code>structuredClone(current(draft))</code>.',
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
  'Лог Quiz C — createAction / createReducer',
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
  'Итоговый квиз по секции C (уроки 20–27). Сначала пробеги по recap-у, потом квиз: 10 вопросов, многие с несколькими правильными вариантами.',
)
con.info(
  'Подсказка: если сомневаешься, проверь утверждение в соответствующем уроке (20/21/22/23/23a/24/25/26/27).',
)

// Kick off live store (для DevToolsPanel интерактив)
store.dispatch(addTodo('Пройти Quiz C'))
const firstId = store.getState().items[0]?.id
if (firstId) store.dispatch(toggleTodo(firstId))
