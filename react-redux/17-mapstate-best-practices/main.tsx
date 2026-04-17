import { createRoot } from 'react-dom/client'
import { useState, useRef, useCallback } from 'react'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, useSelector, useDispatch, connect } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface Todo {
  id: number
  text: string
  done: boolean
}

interface AppState {
  todos: Todo[]
  counter: number
  filter: string
}

// --- Reducer ---

const initialState: AppState = {
  todos: [
    { id: 1, text: 'Изучить Redux', done: true },
    { id: 2, text: 'Изучить React-Redux', done: false },
    { id: 3, text: 'Написать приложение', done: false },
  ],
  counter: 0,
  filter: 'all',
}

function appReducer(
  state = initialState,
  action: { type: string; payload?: unknown }
): AppState {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, counter: state.counter + 1 }
    case 'TOGGLE_TODO': {
      const id = action.payload as number
      return {
        ...state,
        todos: state.todos.map(t =>
          t.id === id ? { ...t, done: !t.done } : t
        ),
      }
    }
    case 'SET_FILTER':
      return { ...state, filter: action.payload as string }
    default:
      return state
  }
}

const store = createStore(appReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — анти-паттерны mapStateToProps'
)

// ============================================================
// Pattern 1: state => state (returns ALL state)
// ============================================================

let bad1Renders = 0
let good1Renders = 0

function Bad1Raw(props: { counter: number; todos: Todo[]; filter: string }) {
  bad1Renders++
  return (
    <div>
      <div className="render-counter-inline">
        Рендеров: <strong>{bad1Renders}</strong>
      </div>
      <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        counter = {props.counter}
      </div>
    </div>
  )
}

const Bad1 = connect((state: AppState) => {
  con.warn('[Плохой #1] mapStateToProps вызвана — возвращает ВЕСЬ state')
  return state
})(Bad1Raw)

function Good1Raw(props: { counter: number }) {
  good1Renders++
  return (
    <div>
      <div className="render-counter-inline">
        Рендеров: <strong>{good1Renders}</strong>
      </div>
      <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        counter = {props.counter}
      </div>
    </div>
  )
}

const Good1 = connect((state: AppState) => {
  con.success('[Хороший #1] mapStateToProps вызвана — возвращает { counter }')
  return { counter: state.counter }
})(Good1Raw)

// ============================================================
// Pattern 2: .map() creates new reference every time
// ============================================================

let bad2Renders = 0
let good2Renders = 0

function Bad2Raw(props: { todoTexts: string[] }) {
  bad2Renders++
  return (
    <div>
      <div className="render-counter-inline">
        Рендеров: <strong>{bad2Renders}</strong>
      </div>
      <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        {props.todoTexts.join(', ')}
      </div>
    </div>
  )
}

const Bad2 = connect((state: AppState) => {
  con.warn('[Плохой #2] mapStateToProps → todos.map() → новый массив каждый раз')
  return { todoTexts: state.todos.map(t => t.text) }
})(Bad2Raw)

function Good2Raw(props: { todos: Todo[] }) {
  good2Renders++
  return (
    <div>
      <div className="render-counter-inline">
        Рендеров: <strong>{good2Renders}</strong>
      </div>
      <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        {props.todos.map(t => t.text).join(', ')}
      </div>
    </div>
  )
}

const Good2 = connect((state: AppState) => {
  con.success('[Хороший #2] mapStateToProps → возвращает ссылку на state.todos')
  return { todos: state.todos }
})(Good2Raw)

// ============================================================
// Pattern 3: Async in mapStateToProps (shown as code only)
// ============================================================

// ============================================================
// Pattern 4: Heavy computation without memoization
// ============================================================

let bad4Renders = 0
let good4Renders = 0

function expensiveFilter(todos: Todo[], filter: string): Todo[] {
  let count = 0
  for (let i = 0; i < 1000; i++) count += i
  void count
  if (filter === 'done') return todos.filter(t => t.done)
  if (filter === 'active') return todos.filter(t => !t.done)
  return [...todos] // всегда новая ссылка — без мемоизации нет шанса избежать ре-рендера
}

let cachedFilter = ''
let cachedTodos: Todo[] = []
let cachedResult: Todo[] = []

function memoizedFilter(todos: Todo[], filter: string): Todo[] {
  if (todos === cachedTodos && filter === cachedFilter) {
    con.success('[Хороший #4] Мемоизация: кэш актуален, пропуск вычислений')
    return cachedResult
  }
  con.info('[Хороший #4] Мемоизация: пересчёт (входные данные изменились)')
  cachedTodos = todos
  cachedFilter = filter
  cachedResult = expensiveFilter(todos, filter)
  return cachedResult
}

function Bad4Raw(props: { filtered: Todo[] }) {
  bad4Renders++
  return (
    <div>
      <div className="render-counter-inline">
        Рендеров: <strong>{bad4Renders}</strong>
      </div>
      <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        Задач: {props.filtered.length}
      </div>
    </div>
  )
}

const Bad4 = connect((state: AppState) => {
  con.warn('[Плохой #4] mapStateToProps → тяжёлый фильтр БЕЗ мемоизации')
  return { filtered: expensiveFilter(state.todos, state.filter) }
})(Bad4Raw)

function Good4Raw(props: { filtered: Todo[] }) {
  good4Renders++
  return (
    <div>
      <div className="render-counter-inline">
        Рендеров: <strong>{good4Renders}</strong>
      </div>
      <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        Задач: {props.filtered.length}
      </div>
    </div>
  )
}

const Good4 = connect((state: AppState) => {
  return { filtered: memoizedFilter(state.todos, state.filter) }
})(Good4Raw)

// ============================================================
// Tab controller
// ============================================================

function App() {
  const [tab, setTab] = useState(0)
  const dispatch = useDispatch()

  const tabs = [
    'state => state',
    '.map() ссылка',
    'async запрещён',
    'Без мемоизации',
  ]

  return (
    <div>
      <div className="pattern-tabs">
        {tabs.map((label, i) => (
          <button
            key={i}
            className={`pattern-tab ${tab === i ? 'active' : ''}`}
            onClick={() => setTab(i)}
          >
            #{i + 1}: {label}
          </button>
        ))}
      </div>

      {/* Panel 1 */}
      <div className={`pattern-panel ${tab === 0 ? 'active' : ''}`}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.85rem' }}>
          <strong>Проблема:</strong> <code>state =&gt; state</code> возвращает весь state.
          Компонент перерисовывается при <em>любом</em> dispatch, даже если ему нужен только counter.
        </p>
        <div className="side-by-side">
          <div className="code-card">
            <div className="code-card__header bad">Плохо: state =&gt; state</div>
            <div className="code-card__body">
              <span className="kw">const</span> <span className="fn">mapStateToProps</span> = (<span className="prop">state</span>) =&gt; state{'\n'}
              <span className="cm">// Любой dispatch → ре-рендер</span>
            </div>
            <div style={{ padding: '12px 14px' }}><Bad1 /></div>
          </div>
          <div className="code-card">
            <div className="code-card__header good">Хорошо: извлечь нужное</div>
            <div className="code-card__body">
              <span className="kw">const</span> <span className="fn">mapStateToProps</span> = (<span className="prop">state</span>) =&gt; ({'{'}
              {'\n'}  <span className="prop">counter</span>: state.<span className="prop">counter</span>{'\n'}
              {'}'})
            </div>
            <div style={{ padding: '12px 14px' }}><Good1 /></div>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="btn btn--accent" onClick={() => {
            con.log(''); con.info('dispatch INCREMENT'); dispatch({ type: 'INCREMENT' })
          }}>dispatch INCREMENT</button>
          <button className="btn" onClick={() => {
            con.log(''); con.info('dispatch TOGGLE_TODO (id: 1)'); dispatch({ type: 'TOGGLE_TODO', payload: 1 })
          }}>dispatch TOGGLE_TODO</button>
        </div>
      </div>

      {/* Panel 2 */}
      <div className={`pattern-panel ${tab === 1 ? 'active' : ''}`}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.85rem' }}>
          <strong>Проблема:</strong> <code>todos.map(...)</code> создаёт <strong>новый массив</strong>
          при каждом вызове. Даже если данные идентичны — ссылка новая → <code>!==</code> → ре-рендер.
        </p>
        <div className="side-by-side">
          <div className="code-card">
            <div className="code-card__header bad">Плохо: .map() каждый раз</div>
            <div className="code-card__body">
              <span className="kw">const</span> <span className="fn">mapStateToProps</span> = (<span className="prop">state</span>) =&gt; ({'{'}
              {'\n'}  <span className="prop">todoTexts</span>: state.todos.<span className="fn">map</span>(t =&gt; t.text){'\n'}
              {'}'})
              {'\n'}<span className="cm">// map() → новый массив → всегда !==</span>
            </div>
            <div style={{ padding: '12px 14px' }}><Bad2 /></div>
          </div>
          <div className="code-card">
            <div className="code-card__header good">Хорошо: ссылка на оригинал</div>
            <div className="code-card__body">
              <span className="kw">const</span> <span className="fn">mapStateToProps</span> = (<span className="prop">state</span>) =&gt; ({'{'}
              {'\n'}  <span className="prop">todos</span>: state.<span className="prop">todos</span>{'\n'}
              {'}'})
              {'\n'}<span className="cm">// Та же ссылка → === → без ре-рендера</span>
            </div>
            <div style={{ padding: '12px 14px' }}><Good2 /></div>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="btn btn--accent" onClick={() => {
            con.log(''); con.info('dispatch INCREMENT (todos не меняются)'); dispatch({ type: 'INCREMENT' })
          }}>dispatch INCREMENT</button>
          <button className="btn" onClick={() => {
            con.log(''); con.info('dispatch TOGGLE_TODO (todos изменятся)'); dispatch({ type: 'TOGGLE_TODO', payload: 2 })
          }}>dispatch TOGGLE_TODO</button>
        </div>
      </div>

      {/* Panel 3 */}
      <div className={`pattern-panel ${tab === 2 ? 'active' : ''}`}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.85rem' }}>
          <strong>Проблема:</strong> асинхронные операции (fetch, setTimeout) внутри
          mapStateToProps. Функция должна быть <strong>чистой и синхронной</strong>.
        </p>
        <div className="side-by-side">
          <div className="code-card">
            <div className="code-card__header bad">Запрещено: async / fetch</div>
            <div className="code-card__body">
              <span className="cm">// НЕЛЬЗЯ! mapStateToProps должна быть синхронной</span>{'\n'}
              <span className="kw">const</span> <span className="fn">mapStateToProps</span> = <span className="kw">async</span> (<span className="prop">state</span>) =&gt; {'{'}{'\n'}
              {'  '}<span className="kw">const</span> data = <span className="kw">await</span> <span className="fn">fetch</span>(<span className="str">'/api/data'</span>){'\n'}
              {'  '}<span className="kw">return</span> {'{'} <span className="prop">data</span> {'}'}{'\n'}
              {'}'}{'\n'}
              <span className="cm">// ❌ Возвращает Promise, а не объект!</span>{'\n'}
              <span className="cm">// ❌ Побочный эффект (сетевой запрос)</span>
            </div>
          </div>
          <div className="code-card">
            <div className="code-card__header good">Правильно: чистая функция</div>
            <div className="code-card__body">
              <span className="cm">// Данные загружаются через thunk / useEffect</span>{'\n'}
              <span className="cm">// и сохраняются в store. mapStateToProps просто</span>{'\n'}
              <span className="cm">// извлекает их:</span>{'\n'}{'\n'}
              <span className="kw">const</span> <span className="fn">mapStateToProps</span> = (<span className="prop">state</span>) =&gt; ({'{'}
              {'\n'}  <span className="prop">data</span>: state.<span className="prop">data</span>,{'\n'}
              {'  '}<span className="prop">loading</span>: state.<span className="prop">loading</span>{'\n'}
              {'}'})
              {'\n'}<span className="cm">// ✔ Чистая, синхронная, без побочных эффектов</span>
            </div>
          </div>
        </div>
        <div className="warning" style={{ margin: '12px 0' }}>
          <strong>Правило:</strong> загрузка данных — ответственность middleware (thunk, saga)
          или хуков (useEffect). mapStateToProps только <strong>читает</strong> то, что уже в store.
        </div>
      </div>

      {/* Panel 4 */}
      <div className={`pattern-panel ${tab === 3 ? 'active' : ''}`}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.85rem' }}>
          <strong>Проблема:</strong> тяжёлые вычисления выполняются при каждом вызове
          mapStateToProps, даже если входные данные не изменились. Решение — мемоизация.
        </p>
        <div className="side-by-side">
          <div className="code-card">
            <div className="code-card__header bad">Плохо: каждый раз заново</div>
            <div className="code-card__body">
              <span className="kw">const</span> <span className="fn">mapStateToProps</span> = (<span className="prop">state</span>) =&gt; ({'{'}
              {'\n'}  <span className="prop">filtered</span>: <span className="fn">expensiveFilter</span>({'\n'}
              {'    '}state.todos, state.filter{'\n'}
              {'  '}){'\n'}
              {'}'})
              {'\n'}<span className="cm">// Тяжёлый фильтр при каждом dispatch</span>
            </div>
            <div style={{ padding: '12px 14px' }}><Bad4 /></div>
          </div>
          <div className="code-card">
            <div className="code-card__header good">Хорошо: мемоизация</div>
            <div className="code-card__body">
              <span className="kw">const</span> <span className="fn">mapStateToProps</span> = (<span className="prop">state</span>) =&gt; ({'{'}
              {'\n'}  <span className="prop">filtered</span>: <span className="fn">memoizedFilter</span>({'\n'}
              {'    '}state.todos, state.filter{'\n'}
              {'  '}){'\n'}
              {'}'})
              {'\n'}<span className="cm">// Пересчёт только при изменении входов</span>
            </div>
            <div style={{ padding: '12px 14px' }}><Good4 /></div>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="btn btn--accent" onClick={() => {
            con.log(''); con.info('dispatch INCREMENT (todos и filter не меняются)'); dispatch({ type: 'INCREMENT' })
          }}>dispatch INCREMENT</button>
          <button className="btn" onClick={() => {
            con.log(''); con.info('dispatch TOGGLE_TODO'); dispatch({ type: 'TOGGLE_TODO', payload: 3 })
          }}>dispatch TOGGLE_TODO</button>
        </div>
      </div>
    </div>
  )
}

// --- Render ---

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <App />
  </Provider>
)

// --- Initial log ---

con.info('4 анти-паттерна mapStateToProps с исправлениями')
con.log('')
con.log('Переключайте вкладки и нажимайте dispatch-кнопки.')
con.log('Сравнивайте счётчики рендеров между «Плохо» и «Хорошо».')
