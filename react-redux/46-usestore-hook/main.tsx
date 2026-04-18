import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers, type Reducer } from 'redux'
import { Provider, useSelector, useDispatch, useStore } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState { value: number }
interface EditorState { draft: string }

interface RootState {
  counter: CounterState
  editor: EditorState
  // Опционально после replaceReducer появится extra:
  extra?: string
}

type AppAction =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'SET_DRAFT'; payload: string }
  | { type: 'RESET' }

// --- Reducers ---

function counterReducer(state: CounterState = { value: 0 }, action: AppAction): CounterState {
  switch (action.type) {
    case 'INCREMENT': return { value: state.value + 1 }
    case 'DECREMENT': return { value: state.value - 1 }
    case 'RESET':     return { value: 0 }
    default: return state
  }
}

function editorReducer(state: EditorState = { draft: 'Черновик заметки...' }, action: AppAction): EditorState {
  switch (action.type) {
    case 'SET_DRAFT': return { draft: action.payload }
    case 'RESET':     return { draft: '' }
    default: return state
  }
}

const originalRootReducer = combineReducers({
  counter: counterReducer,
  editor: editorReducer,
})

const store = createStore(originalRootReducer as Reducer<RootState, AppAction>)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — useStore'
)

// ================================================
// 1. BadCounter — читает через useStore().getState() В РЕНДЕРЕ
// ================================================

function BadCounter() {
  const store = useStore<RootState>()
  const renders = useRef(0)
  renders.current++
  const value = store.getState().counter.value
  con.error(`[❌ BadCounter] рендер #${renders.current} · store.getState().counter.value = ${value} (НЕ подписан)`)

  return (
    <div className="store-card store-card--bad">
      <span className="store-card__tag">❌ Bad — не обновляется</span>
      <div className="store-card__title">useStore().getState() в рендере</div>
      <div className="store-card__code">{`const store = useStore<RootState>()
return <div>{store.getState().counter.value}</div>
// Компонент НЕ подписан на изменения`}</div>
      <div className="store-card__value store-card__value--red">{value}</div>
      <div className="store-card__stat stat-stale">
        <span>Рендеров компонента:</span>
        <strong>{renders.current}</strong>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Значение заморожено. Нажмите «+» справа — здесь число не изменится.
      </div>
    </div>
  )
}

// ================================================
// 2. GoodCounter — useSelector (подписан)
// ================================================

function GoodCounter() {
  const value = useSelector((state: RootState) => state.counter.value)
  const renders = useRef(0)
  renders.current++
  con.success(`[✔ GoodCounter] рендер #${renders.current} · useSelector → ${value} (подписан)`)

  return (
    <div className="store-card store-card--good">
      <span className="store-card__tag">✔ Good — подписан</span>
      <div className="store-card__title">useSelector</div>
      <div className="store-card__code">{`const value = useSelector(
  (state: RootState) => state.counter.value
)
return <div>{value}</div>
// Компонент подписан → ре-рендер на изменение`}</div>
      <div className="store-card__value">{value}</div>
      <div className="store-card__stat">
        <span>Рендеров компонента:</span>
        <strong>{renders.current}</strong>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Число синхронизировано с store — ре-рендер на каждом dispatch.
      </div>
    </div>
  )
}

// ================================================
// 3. ExportButton — useStore в обработчике (правильный use case)
// ================================================

function ExportButton() {
  const store = useStore<RootState>()
  const renders = useRef(0)
  renders.current++
  const [lastExport, setLastExport] = useState<string | null>(null)

  const onExport = () => {
    const state = store.getState()
    const json = JSON.stringify(state, null, 2)
    con.log('')
    con.info('📤 ExportButton: store.getState() (снимок в момент клика)')
    con.log(json)
    setLastExport(json)
  }

  return (
    <div className="replace-panel">
      <div className="replace-panel__title">Сценарий 1 — снимок state в обработчике</div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0 0 8px' }}>
        Кнопка читает полный state только при клике. Компонент не подписан — рендеров:{' '}
        <strong style={{ color: 'var(--accent-cyan)' }}>{renders.current}</strong>.
        Dispatch'и счётчика или редактора этот компонент не трогают.
      </p>
      <div className="replace-panel__buttons">
        <button className="btn btn--accent" onClick={onExport}>Export state as JSON</button>
      </div>
      {lastExport && (
        <div className="json-block" style={{ marginTop: 10 }}>{lastExport}</div>
      )}
    </div>
  )
}

// ================================================
// 4. ReplaceReducerPanel — useStore.replaceReducer
// ================================================

function ReplaceReducerPanel() {
  const store = useStore<RootState>()
  const [replaced, setReplaced] = useState(false)

  const onReplace = () => {
    const newReducer: Reducer<RootState, AppAction> = (state, action) => {
      const base = state ?? { counter: { value: 0 }, editor: { draft: '' } }
      const next = originalRootReducer(base, action) as RootState
      return { ...next, extra: `reducer заменён в ${new Date().toLocaleTimeString('ru-RU')}` }
    }
    con.log('')
    con.warn('⚙ store.replaceReducer(newReducer)')
    store.replaceReducer(newReducer)
    store.dispatch({ type: 'INCREMENT' })
    setReplaced(true)
  }

  const onRestore = () => {
    con.log('')
    con.warn('⚙ store.replaceReducer(originalRootReducer)')
    store.replaceReducer(originalRootReducer as Reducer<RootState, AppAction>)
    store.dispatch({ type: 'INCREMENT' })
    setReplaced(false)
  }

  return (
    <div className="replace-panel">
      <div className="replace-panel__title">Сценарий 2 — замена reducer'а (code splitting)</div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0 0 8px' }}>
        Стандартный пример из документации: динамическая подгрузка фичи с её reducer'ом.
        После замены появляется поле <code>state.extra</code>, которое до этого не существовало.
      </p>
      <div className="replace-panel__buttons">
        {!replaced
          ? <button className="btn btn--success" onClick={onReplace}>replaceReducer → добавить state.extra</button>
          : <button className="btn" onClick={onRestore}>Вернуть исходный reducer</button>
        }
      </div>
    </div>
  )
}

// ================================================
// 5. SaveDraftButton — useStore + useDispatch (draft в обработчике)
// ================================================

function SaveDraftButton() {
  const store = useStore<RootState>()
  const dispatch = useDispatch()
  const renders = useRef(0)
  renders.current++

  const onSave = () => {
    const draft = store.getState().editor.draft
    con.log('')
    con.info(`💾 SaveDraftButton: snapshot draft = "${draft}"`)
    con.info(`   dispatch({ type: "SET_DRAFT", payload: "[сохранено ${new Date().toLocaleTimeString('ru-RU')}] " + draft })`)
    dispatch({ type: 'SET_DRAFT', payload: `[сохранено ${new Date().toLocaleTimeString('ru-RU')}] ${draft}` })
  }

  return (
    <div className="replace-panel">
      <div className="replace-panel__title">Сценарий 3 — useStore + useDispatch (без подписки на draft)</div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0 0 8px' }}>
        Читаем <code>draft</code> из store <em>в момент клика</em> и диспатчим — без ре-рендера при
        каждом изменении draft. Рендеров компонента:{' '}
        <strong style={{ color: 'var(--accent-cyan)' }}>{renders.current}</strong>.
      </p>
      <div className="replace-panel__buttons">
        <button className="btn btn--success" onClick={onSave}>Сохранить черновик</button>
      </div>
    </div>
  )
}

// ================================================
// DraftInput — обычная форма (подписан через useSelector)
// ================================================

function DraftInput() {
  const draft = useSelector((state: RootState) => state.editor.draft)
  const dispatch = useDispatch()
  return (
    <div className="replace-panel">
      <div className="replace-panel__title">Редактор черновика (useSelector + useDispatch)</div>
      <input
        type="text"
        value={draft}
        onChange={e => dispatch({ type: 'SET_DRAFT', payload: e.target.value })}
        style={{ width: '100%' }}
      />
    </div>
  )
}

// ================================================
// ExtraDisplay — если после replaceReducer появилось state.extra
// ================================================

function ExtraDisplay() {
  const extra = useSelector((state: RootState) => state.extra)
  if (!extra) return null
  return (
    <div style={{
      background: 'rgba(76, 175, 80, 0.1)',
      border: '1px solid var(--success)',
      borderRadius: 'var(--radius)',
      padding: '10px 12px',
      marginBottom: '12px',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.82rem',
      color: 'var(--success)',
    }}>
      state.extra = "{extra}"
    </div>
  )
}

// ================================================
// App
// ================================================

function App() {
  const dispatchAndLog = (action: AppAction, label: string) => {
    con.log('')
    con.info(`📤 store.dispatch(${label})`)
    store.dispatch(action)
  }

  return (
    <div>
      <div className="global-controls">
        <button className="btn btn--success" onClick={() => dispatchAndLog({ type: 'INCREMENT' }, '{ type: "INCREMENT" }')}>
          counter + 1
        </button>
        <button className="btn" onClick={() => dispatchAndLog({ type: 'DECREMENT' }, '{ type: "DECREMENT" }')}>
          counter − 1
        </button>
        <button className="btn btn--danger" onClick={() => dispatchAndLog({ type: 'RESET' }, '{ type: "RESET" }')}>
          reset
        </button>
      </div>

      <div className="store-grid">
        <BadCounter />
        <GoodCounter />
      </div>

      <ExtraDisplay />
      <DraftInput />
      <SaveDraftButton />
      <ExportButton />
      <ReplaceReducerPanel />
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

con.info('Урок 46 — useStore: прямой доступ к объекту store')
con.log('')
con.log('useStore() возвращает тот же store, что был передан в Provider.')
con.log('НЕ подписывает компонент — ре-рендера при dispatch не будет.')
con.log('')
con.log('Слева (BadCounter): значение через store.getState() в рендере — заморожено.')
con.log('Справа (GoodCounter): useSelector — подписан, обновляется.')
con.log('')
con.log('Нажмите «counter + 1» — BadCounter не изменится, GoodCounter обновится.')
