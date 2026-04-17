import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, useSelector, useDispatch, connect } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface UserState {
  name: string
  age: number
}

interface RootState {
  user: UserState
}

// --- Reducer ---

const initialUser: UserState = { name: 'Alice', age: 25 }

function userReducer(
  state = initialUser,
  action: { type: string; payload?: string | number }
): UserState {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.payload as string }
    case 'INCREMENT_AGE':
      return { ...state, age: state.age + 1 }
    default:
      return state
  }
}

const rootReducer = combineReducers({ user: userReducer })
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — shallow equality check'
)

// --- Shallow equality visualizer ---

let prevResult: Record<string, unknown> | null = null

function logShallowCheck(newResult: Record<string, unknown>): void {
  if (!prevResult) {
    con.info('Первый рендер — сравнивать не с чем')
    prevResult = { ...newResult }
    return
  }

  con.log('─── shallow equality check ───')
  let allSame = true
  for (const key of Object.keys(newResult)) {
    const same = prevResult[key] === newResult[key]
    if (!same) allSame = false
    const icon = same ? '✔ ===' : '✖ !=='
    const color = same ? 'success' : 'warn'
    con[color](
      `  prev.${key} (${JSON.stringify(prevResult[key])}) ${icon} next.${key} (${JSON.stringify(newResult[key])})`
    )
  }

  if (allSame) {
    con.success('→ Все поля совпадают → ПРОПУСТИТЬ ре-рендер')
  } else {
    con.error('→ Есть различия → ПЕРЕРИСОВАТЬ компонент')
  }

  prevResult = { ...newResult }
}

// --- Connected Component ---

let renderCount = 0

interface UserNameProps {
  name: string
  dispatch: (action: { type: string; payload?: string | number }) => void
}

const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']
let nameIndex = 0

function UserCardRaw({ name, dispatch }: UserNameProps) {
  renderCount++
  const age = store.getState().user.age

  con.info(`🔄 Рендер #${renderCount} — props.name = "${name}"`)

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div style={{
        display: 'flex', gap: 14, flexDirection: 'column'
      }}>
        <div className="field-card" id="field-name">
          <span className="field-card__label">props.name</span>
          <span className="field-card__value">"{name}"</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--accent-green)' }}>
            ← из mapStateToProps
          </span>
        </div>
        <div className="field-card" id="field-age">
          <span className="field-card__label">store.age</span>
          <span className="field-card__value">{age}</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            НЕ в mapStateToProps
          </span>
        </div>
      </div>

      <div className="render-badge">
        Рендеров компонента: <strong>{renderCount}</strong>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <button
          className="btn btn--accent"
          onClick={() => {
            nameIndex = (nameIndex + 1) % names.length
            const newName = names[nameIndex]
            con.log('')
            con.info(`📤 dispatch SET_NAME → "${newName}"`)
            dispatch({ type: 'SET_NAME', payload: newName })
          }}
        >
          Сменить name
        </button>
        <button
          className="btn"
          onClick={() => {
            con.log('')
            con.info('📤 dispatch INCREMENT_AGE')
            dispatch({ type: 'INCREMENT_AGE' })
          }}
        >
          Увеличить age (+1)
        </button>
        <button
          className="btn"
          onClick={() => {
            con.log('')
            con.info(`📤 dispatch SET_NAME → "${name}" (то же значение!)`)
            dispatch({ type: 'SET_NAME', payload: name })
          }}
        >
          Установить то же name
        </button>
      </div>

      <div style={{
        marginTop: 16, padding: 12, background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-secondary)'
      }}>
        <div style={{ color: 'var(--accent-yellow)', fontWeight: 600, marginBottom: 6 }}>
          mapStateToProps:
        </div>
        <code style={{ fontSize: '0.82rem' }}>
          (state) =&gt; {'{'} name: state.user.name {'}'}
        </code>
        <div style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          Возвращает только name. Поле age не включено → изменение age не вызывает ре-рендер.
        </div>
      </div>
    </div>
  )
}

const mapStateToProps = (state: RootState) => {
  const result = { name: state.user.name }
  logShallowCheck(result)
  return result
}

const UserCard = connect(mapStateToProps)(UserCardRaw)

// --- Render ---

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <UserCard />
  </Provider>
)

// --- Initial log ---

con.info('mapStateToProps возвращает { name }. Поле age НЕ включено.')
con.log('')
con.log('Попробуйте:')
con.log('  1. «Сменить name» → ре-рендер (name изменился)')
con.log('  2. «Увеличить age» → НЕТ ре-рендера (name не изменился)')
con.log('  3. «Установить то же name» → НЕТ ре-рендера (name === name)')
