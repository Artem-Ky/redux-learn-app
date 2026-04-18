import { createRoot } from 'react-dom/client'
import { useRef } from 'react'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, connect } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface Todo { id: number; text: string }

interface EntitiesState {
  todos: Record<number, Todo>
  todosIds: number[]
}

interface MetaState {
  ticks: number
  sessionId: string
}

interface RootState {
  entities: EntitiesState
  meta: MetaState
}

type Action =
  | { type: 'todos/add'; payload: Todo }
  | { type: 'todos/rename'; payload: { id: number; text: string } }
  | { type: 'meta/tick' }
  | { type: 'meta/session' }

// --- Reducers ---

const entitiesInitial: EntitiesState = {
  todos: {
    1: { id: 1, text: 'Понять reselect' },
    2: { id: 2, text: 'Настроить areStatesEqual' },
  },
  todosIds: [1, 2],
}

function entitiesReducer(state = entitiesInitial, action: Action): EntitiesState {
  switch (action.type) {
    case 'todos/add': {
      const t = action.payload
      return {
        todos: { ...state.todos, [t.id]: t },
        todosIds: [...state.todosIds, t.id],
      }
    }
    case 'todos/rename': {
      const { id, text } = action.payload
      const prev = state.todos[id]
      if (!prev) return state
      return { ...state, todos: { ...state.todos, [id]: { ...prev, text } } }
    }
    default: return state
  }
}

function metaReducer(
  state: MetaState = { ticks: 0, sessionId: 's-1' },
  action: Action
): MetaState {
  switch (action.type) {
    case 'meta/tick':    return { ...state, ticks: state.ticks + 1 }
    case 'meta/session': return { ...state, sessionId: 's-' + (parseInt(state.sessionId.slice(2)) + 1) }
    default: return state
  }
}

const rootReducer = combineReducers({
  entities: entitiesReducer,
  meta: metaReducer,
})
const store = createStore(rootReducer)

// --- Counters (shared metrics) ---

const metrics = {
  defaultMapCalls: 0,
  defaultRenders: 0,
  customMapCalls: 0,
  customRenders: 0,
}

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — areStatesEqual'
)

// --- Heavy mapStateToProps (имитация дорогого вычисления) ---

function buildHeavyView(state: RootState) {
  const list = state.entities.todosIds
    .map(id => state.entities.todos[id])
    .map(t => ({ id: t.id, label: `#${t.id}: ${t.text.toUpperCase()}` }))
  return list
}

// ================================================
// DEFAULT — без кастомного areStatesEqual
// ================================================

interface ViewProps {
  view: { id: number; label: string }[]
  mapCalls: number
  renders: number
  variant: 'default' | 'custom'
}

function ViewRaw({ view, mapCalls, renders, variant }: ViewProps) {
  const rc = useRef(0)
  rc.current++
  const title = variant === 'default'
    ? 'connect(mapStateToProps)(Comp) — дефолт'
    : 'connect(mapStateToProps, null, null, { areStatesEqual })'
  const headerClass = 'eq-card__title ' + (variant === 'default' ? 'eq-card__title--default' : 'eq-card__title--custom')
  const cardClass   = 'eq-card ' + (variant === 'default' ? 'eq-card--default' : 'eq-card--custom')

  return (
    <div className={cardClass}>
      <div className="eq-card__header">
        <div className={headerClass}>{title}</div>
      </div>
      <div className="metric-grid">
        <div className="metric">
          <div className="metric__label">Вызовов mapStateToProps</div>
          <div className="metric__value" style={{ color: variant === 'custom' ? 'var(--success)' : 'var(--accent-red)' }}>
            {mapCalls}
          </div>
        </div>
        <div className="metric">
          <div className="metric__label">Ре-рендеров компонента</div>
          <div className="metric__value">{renders}</div>
        </div>
      </div>
      <div style={{
        background: '#0d0d0d', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', padding: 10,
        fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)'
      }}>
        {view.map(v => <div key={v.id}>{v.label}</div>)}
      </div>
    </div>
  )
}

// Default variant
const mapStateDefault = (state: RootState) => {
  metrics.defaultMapCalls++
  return {
    view: buildHeavyView(state),
    mapCalls: metrics.defaultMapCalls,
    renders: metrics.defaultRenders + 1,
    variant: 'default' as const,
  }
}

function ViewDefaultWrapper(props: ViewProps) {
  metrics.defaultRenders++
  return <ViewRaw {...props} renders={metrics.defaultRenders} />
}

const ViewDefault = connect(mapStateDefault)(ViewDefaultWrapper)

// Custom variant — с areStatesEqual
const mapStateCustom = (state: RootState) => {
  metrics.customMapCalls++
  return {
    view: buildHeavyView(state),
    mapCalls: metrics.customMapCalls,
    renders: metrics.customRenders + 1,
    variant: 'custom' as const,
  }
}

function ViewCustomWrapper(props: ViewProps) {
  metrics.customRenders++
  return <ViewRaw {...props} renders={metrics.customRenders} />
}

const areStatesEqual = (next: RootState, prev: RootState) =>
  next.entities.todos === prev.entities.todos

const ViewCustom = connect(
  mapStateCustom,
  null,
  null,
  { areStatesEqual }
)(ViewCustomWrapper)

// ================================================
// App
// ================================================

let nextTodoId = 3

function App() {
  return (
    <div>
      <div className="controls">
        <button
          className="btn btn--accent"
          onClick={() => {
            con.log('')
            con.info('📤 dispatch({ type: "meta/tick" }) — меняет state.meta.ticks, не todos')
            store.dispatch({ type: 'meta/tick' })
          }}
        >
          meta/tick
          <br />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            не затрагивает entities.todos
          </span>
        </button>
        <button
          className="btn"
          onClick={() => {
            con.log('')
            con.info('📤 dispatch({ type: "meta/session" }) — меняет state.meta.sessionId')
            store.dispatch({ type: 'meta/session' })
          }}
        >
          meta/session
          <br />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            тоже не трогает todos
          </span>
        </button>
        <button
          className="btn btn--success"
          onClick={() => {
            const id = nextTodoId++
            con.log('')
            con.info(`📤 dispatch({ type: "todos/add", payload: { id: ${id}, ... } })`)
            store.dispatch({
              type: 'todos/add',
              payload: { id, text: 'Задача #' + id },
            })
          }}
        >
          todos/add
          <br />
          <span style={{ fontSize: '0.72rem', color: '#fff' }}>меняет entities.todos</span>
        </button>
        <button
          className="btn btn--success"
          onClick={() => {
            const state = store.getState()
            const firstId = state.entities.todosIds[0]
            if (firstId == null) return
            con.log('')
            con.info(`📤 dispatch({ type: "todos/rename", id: ${firstId} })`)
            store.dispatch({
              type: 'todos/rename',
              payload: { id: firstId, text: 'Изменено @ ' + new Date().toLocaleTimeString('ru-RU') },
            })
          }}
        >
          todos/rename
          <br />
          <span style={{ fontSize: '0.72rem', color: '#fff' }}>меняет entities.todos</span>
        </button>
      </div>

      <div className="eq-layout">
        <ViewDefault />
        <ViewCustom />
      </div>

      <div style={{
        padding: 12, background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius)', fontSize: '0.85rem', color: 'var(--text-secondary)'
      }}>
        <strong style={{ color: 'var(--accent-yellow)' }}>Наблюдение:</strong> жмите «meta/tick» —
        слева счётчик <em>вызовов mapStateToProps</em> растёт (дефолтный <code>===</code> на state
        всегда не совпадает, потому что <code>combineReducers</code> создаёт новый root при любом
        dispatch). Справа — не растёт: custom <code>areStatesEqual</code> сравнивает только срез
        <code>entities.todos</code> и видит, что он <strong>той же самой ссылки</strong> → пропускает
        вызов. Нажмите «todos/add» — оба счётчика растут синхронно: срез <code>entities.todos</code>
        изменился, mapStateToProps действительно надо запустить.
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <App />
  </Provider>
)

// --- Initial log ---

con.info('areStatesEqual — пропустить mapStateToProps, если срез state не изменился')
con.log('')
con.log('Default:  connect(mapStateToProps)(Comp)')
con.log('          areStatesEqual = (next, prev) => next === prev  // всегда !== после dispatch')
con.log('          → mapStateToProps вызывается при каждом dispatch')
con.log('')
con.log('Custom:   connect(mapStateToProps, null, null, { areStatesEqual })(Comp)')
con.log('          areStatesEqual = (next, prev) => next.entities.todos === prev.entities.todos')
con.log('          → mapStateToProps вызывается только когда изменился entities.todos')
con.log('')
con.log('Жмите "meta/tick" — справа mapStateToProps НЕ вызывается. Жмите "todos/add" — оба вызывают.')
