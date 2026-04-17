import { createRoot } from 'react-dom/client'
import { Component, useRef } from 'react'
import { legacy_createStore as createStore } from 'redux'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

interface CounterState {
  value: number
}

const initialState: CounterState = { value: 0 }

function counterReducer(
  state = initialState,
  action: { type: string }
): CounterState {
  switch (action.type) {
    case 'counter/increment':
      return { value: state.value + 1 }
    case 'counter/decrement':
      return { value: state.value - 1 }
    default:
      return state
  }
}

const store = createStore(counterReducer)

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — Provider basics'
)

interface ErrorBoundaryProps {
  children: React.ReactNode
  onError: (error: Error) => void
}

interface ErrorBoundaryState {
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    this.props.onError(error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-display">
          <div className="error-display__title">Error caught by ErrorBoundary</div>
          <div>{this.state.error.message}</div>
        </div>
      )
    }
    return this.props.children
  }
}

function CounterComponent() {
  const count = useSelector((state: CounterState) => state.value)
  const dispatch = useDispatch()
  const renderCount = useRef(0)
  renderCount.current++

  return (
    <div>
      <div className="working-counter">
        <button
          className="btn btn--accent"
          onClick={() => {
            dispatch({ type: 'counter/decrement' })
            con.log('dispatch({ type: "counter/decrement" })')
          }}
        >
          −
        </button>
        <div className="working-counter__value">{count}</div>
        <button
          className="btn btn--accent"
          onClick={() => {
            dispatch({ type: 'counter/increment' })
            con.log('dispatch({ type: "counter/increment" })')
          }}
        >
          +
        </button>
      </div>
      <div className="render-badge">renders: {renderCount.current}</div>
    </div>
  )
}

function App() {
  return (
    <div className="scenario-grid">
      <div className="scenario scenario--error">
        <div className="scenario__header">Без &lt;Provider&gt;</div>
        <div className="scenario__body">
          <ErrorBoundary onError={(err) => con.error(`Без Provider: ${err.message}`)}>
            <CounterComponent />
          </ErrorBoundary>
        </div>
      </div>

      <div className="scenario scenario--success">
        <div className="scenario__header">С &lt;Provider store={'{store}'}&gt;</div>
        <div className="scenario__body">
          <Provider store={store}>
            <CounterComponent />
          </Provider>
        </div>
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)

con.info('Provider basics — два сценария бок о бок.')
con.log('')
con.log('Слева: useSelector/useDispatch БЕЗ Provider → ошибка')
con.log('Справа: те же хуки ВНУТРИ <Provider> → работает')
