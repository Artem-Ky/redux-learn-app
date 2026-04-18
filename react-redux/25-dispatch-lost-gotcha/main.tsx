import { createRoot } from 'react-dom/client'
import { Component, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { legacy_createStore as createStore, combineReducers, bindActionCreators } from 'redux'
import type { Dispatch } from 'redux'
import { Provider, connect } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState {
  value: number
}

interface RootState {
  counter: CounterState
}

const increment = () => ({ type: 'counter/increment' as const })
const decrement = () => ({ type: 'counter/decrement' as const })
const reset = () => ({ type: 'counter/reset' as const })

type CounterAction =
  | ReturnType<typeof increment>
  | ReturnType<typeof decrement>
  | ReturnType<typeof reset>

// --- Reducer ---

function counterReducer(
  state: CounterState = { value: 0 },
  action: CounterAction | { type: string }
): CounterState {
  switch (action.type) {
    case 'counter/increment':
      return { value: state.value + 1 }
    case 'counter/decrement':
      return { value: state.value - 1 }
    case 'counter/reset':
      return { value: 0 }
    default:
      return state
  }
}

const rootReducer = combineReducers({ counter: counterReducer })
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — пропавший dispatch'
)

// ============================================================
// Error boundary
// ============================================================

interface ErrorBoundaryProps {
  resetKey: unknown
  children: ReactNode
  fallback: (err: Error, reset: () => void) => ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    con.error(`✖ ErrorBoundary поймал: ${error.name}: ${error.message}`)
    if (info.componentStack) {
      con.log(`  componentStack (первая строка): ${info.componentStack.split('\n')[1]?.trim() ?? ''}`)
    }
  }

  componentDidUpdate(prev: ErrorBoundaryProps): void {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback(this.state.error, () => this.setState({ error: null }))
    }
    return this.props.children
  }
}

// ============================================================
// LEFT — props.dispatch есть
// ============================================================

interface LeftProps {
  count: number
  dispatch: Dispatch<CounterAction>
}

function LeftRaw(props: LeftProps) {
  return (
    <>
      <div className="card__counter">{props.count}</div>
      <div className="card__buttons">
        <button
          className="btn btn--sm btn--success"
          onClick={() => {
            con.success('[LEFT] props.dispatch({ type: "counter/increment" }) ✓')
            props.dispatch({ type: 'counter/increment' })
          }}
        >
          + (dispatch)
        </button>
        <button
          className="btn btn--sm"
          onClick={() => {
            con.success('[LEFT] props.dispatch({ type: "counter/decrement" }) ✓')
            props.dispatch({ type: 'counter/decrement' })
          }}
        >
          − (dispatch)
        </button>
        <button
          className="btn btn--sm btn--danger"
          onClick={() => {
            con.success('[LEFT] props.dispatch({ type: "counter/reset" }) ✓')
            props.dispatch({ type: 'counter/reset' })
          }}
        >
          reset (dispatch)
        </button>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          padding: 6,
        }}
      >
        typeof props.dispatch ={' '}
        <span style={{ color: 'var(--accent-green)' }}>"{typeof props.dispatch}"</span>
      </div>
    </>
  )
}

const mapStateToPropsLeft = (state: RootState) => ({
  count: state.counter.value,
})

const LeftCounter = connect(mapStateToPropsLeft)(LeftRaw)

// ============================================================
// RIGHT — mapDispatchToProps передан, props.dispatch отсутствует
// ============================================================

interface RightProps {
  count: number
  increment: () => void
  decrement: () => void
  // dispatch отсутствует — тут и ловушка
  dispatch?: Dispatch<CounterAction>
}

function RightRaw(props: RightProps) {
  return (
    <>
      <div className="card__counter">{props.count}</div>
      <div className="card__buttons">
        <button
          className="btn btn--sm btn--success"
          onClick={() => {
            con.log('[RIGHT] props.increment() ✓')
            props.increment()
          }}
        >
          + (increment)
        </button>
        <button
          className="btn btn--sm"
          onClick={() => {
            con.log('[RIGHT] props.decrement() ✓')
            props.decrement()
          }}
        >
          − (decrement)
        </button>
        <button
          className="btn btn--sm btn--danger"
          onClick={() => {
            con.warn('[RIGHT] попытка вызвать props.dispatch(...) — dispatch отсутствует!')
            // @ts-expect-error: специально вызываем — покажем TypeError
            props.dispatch({ type: 'counter/reset' })
          }}
        >
          ручной dispatch (упадёт)
        </button>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          padding: 6,
        }}
      >
        typeof props.dispatch ={' '}
        <span style={{ color: 'var(--error)' }}>"{typeof props.dispatch}"</span>
      </div>
    </>
  )
}

const mapStateToPropsRight = (state: RootState) => ({
  count: state.counter.value,
})

const mapDispatchToProps = (dispatch: Dispatch<CounterAction>) => ({
  increment: () => dispatch(increment()),
  decrement: () => dispatch(decrement()),
})

const RightCounter = connect(mapStateToPropsRight, mapDispatchToProps)(RightRaw)

// ============================================================
// FIX — mapDispatchToProps, который возвращает dispatch явно
// ============================================================

interface FixProps {
  count: number
  increment: () => void
  decrement: () => void
  dispatch: Dispatch<CounterAction>
}

function FixRaw(props: FixProps) {
  return (
    <>
      <div className="card__counter">{props.count}</div>
      <div className="card__buttons">
        <button
          className="btn btn--sm btn--success"
          onClick={() => {
            con.success('[FIX] props.increment() ✓')
            props.increment()
          }}
        >
          + (increment)
        </button>
        <button
          className="btn btn--sm"
          onClick={() => {
            con.success('[FIX] props.decrement() ✓')
            props.decrement()
          }}
        >
          − (decrement)
        </button>
        <button
          className="btn btn--sm btn--danger"
          onClick={() => {
            con.success('[FIX] props.dispatch({ type: "counter/reset" }) ✓ (dispatch явно возвращён)')
            props.dispatch({ type: 'counter/reset' })
          }}
        >
          ручной dispatch
        </button>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          padding: 6,
        }}
      >
        typeof props.dispatch ={' '}
        <span style={{ color: 'var(--accent-green)' }}>"{typeof props.dispatch}"</span>{' '}
        <span style={{ color: 'var(--text-muted)' }}>(вернули руками)</span>
      </div>
    </>
  )
}

const mapDispatchWithDispatch = (dispatch: Dispatch<CounterAction>) => ({
  ...bindActionCreators({ increment, decrement }, dispatch),
  dispatch,
})

const FixCounter = connect(mapStateToPropsRight, mapDispatchWithDispatch)(FixRaw)

// ============================================================
// App
// ============================================================

function App() {
  const [resetKey, setResetKey] = useState(0)

  return (
    <div>
      <div className="two-col">
        <div className="card card--ok">
          <div className="card__title">
            connect(mapStateToProps)(Counter) <span className="card__status">dispatch ✓</span>
          </div>
          <div className="card__snippet">
{`// mapDispatchToProps НЕ передан
connect(mapStateToProps)(Counter)

// props = { count, dispatch }`}
          </div>
          <LeftCounter />
        </div>

        <div className="card card--bad">
          <div className="card__title">
            connect(mapStateToProps, mapDispatchToProps)(Counter){' '}
            <span className="card__status">dispatch ✖</span>
          </div>
          <div className="card__snippet">
{`const mapDispatchToProps = dispatch => ({
  increment: () => dispatch(increment()),
  decrement: () => dispatch(decrement()),
})
connect(mapStateToProps, mapDispatchToProps)(Counter)

// props = { count, increment, decrement }
//   ← dispatch отсутствует!`}
          </div>
          <ErrorBoundary
            resetKey={resetKey}
            fallback={(err, reset) => (
              <div>
                <div className="error-box">
                  <strong>{err.name}:</strong> {err.message}
                  {'\n\n'}
                  Причина: <code>mapDispatchToProps</code> передан → <code>props.dispatch</code> не инжектится,
                  а кнопка «ручной dispatch» вызывает именно его.
                </div>
                <button
                  className="btn btn--sm"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    reset()
                    setResetKey(k => k + 1)
                    con.info('ErrorBoundary сброшен, компонент перемонтирован')
                  }}
                >
                  Сбросить ошибку
                </button>
              </div>
            )}
          >
            <RightCounter />
          </ErrorBoundary>
        </div>
      </div>

      <div className="fix-card">
        <div className="fix-card__title">
          Способ вернуть dispatch обратно — явно включить его в mapDispatchToProps
        </div>
        <div className="card__snippet" style={{ marginBottom: 10 }}>
{`const mapDispatchToProps = (dispatch) => ({
  ...bindActionCreators({ increment, decrement }, dispatch),
  dispatch,   // ← руками возвращаем
})
connect(mapStateToProps, mapDispatchToProps)(Counter)

// props = { count, increment, decrement, dispatch }`}
        </div>
        <FixCounter />
      </div>

      <div
        style={{
          marginTop: 14,
          padding: 12,
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ color: 'var(--accent-yellow)', fontWeight: 600, marginBottom: 4 }}>
          Что проверить в демо:
        </div>
        <div>1. Левая карточка — все три кнопки работают (есть props.dispatch).</div>
        <div>2. Средняя — «+» и «−» работают, но «ручной dispatch» падает с TypeError.</div>
        <div>3. Нижняя — та же mapDispatchToProps, но с явно возвращённым dispatch: всё работает.</div>
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

con.info('Почему пропадает dispatch?')
con.log('')
con.log('Левая карточка:  connect(mapStateToProps)(Counter)')
con.log('  → props = { count, dispatch }       — dispatch ЕСТЬ')
con.log('')
con.log('Правая карточка: connect(mapStateToProps, mapDispatchToProps)(Counter)')
con.log('  → props = { count, increment, decrement } — dispatch ОТСУТСТВУЕТ')
con.log('')
con.log('Нажмите красную кнопку справа — ErrorBoundary поймает TypeError.')
