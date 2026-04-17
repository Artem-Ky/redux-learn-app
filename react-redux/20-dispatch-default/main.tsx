import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, useSelector, useDispatch, connect } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState {
  value: number
}

interface RootState {
  counter: CounterState
}

// --- Reducer ---

function counterReducer(
  state: CounterState = { value: 0 },
  action: { type: string; payload?: number }
): CounterState {
  switch (action.type) {
    case 'INCREMENT':
      return { value: state.value + 1 }
    case 'DECREMENT':
      return { value: state.value - 1 }
    case 'ADD':
      return { value: state.value + (action.payload ?? 0) }
    case 'RESET':
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
  'Лог — dispatch по умолчанию'
)

// --- Connected Counter (NO mapDispatchToProps) ---

let renderCount = 0

interface CounterProps {
  count: number
  dispatch: (action: { type: string; payload?: number }) => void
}

function CounterRaw(props: CounterProps) {
  renderCount++

  con.info(`🔄 Рендер #${renderCount}`)
  con.log(`  props = ${JSON.stringify({ count: props.count, dispatch: 'ƒ dispatch()' })}`)

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div className="counter-display">
        <button
          className="btn btn--accent"
          onClick={() => {
            con.log('')
            con.info('📤 props.dispatch({ type: "DECREMENT" })')
            props.dispatch({ type: 'DECREMENT' })
          }}
          style={{ fontSize: '1.3rem', padding: '10px 20px' }}
        >
          −
        </button>
        <div style={{ textAlign: 'center' }}>
          <div className="counter-display__value">{props.count}</div>
          <div className="counter-display__label">
            props.count | рендеров: {renderCount}
          </div>
        </div>
        <button
          className="btn btn--accent"
          onClick={() => {
            con.log('')
            con.info('📤 props.dispatch({ type: "INCREMENT" })')
            props.dispatch({ type: 'INCREMENT' })
          }}
          style={{ fontSize: '1.3rem', padding: '10px 20px' }}
        >
          +
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          className="btn"
          onClick={() => {
            con.log('')
            con.info('📤 props.dispatch({ type: "ADD", payload: 5 })')
            props.dispatch({ type: 'ADD', payload: 5 })
          }}
        >
          +5
        </button>
        <button
          className="btn"
          onClick={() => {
            con.log('')
            con.info('📤 props.dispatch({ type: "ADD", payload: -5 })')
            props.dispatch({ type: 'ADD', payload: -5 })
          }}
        >
          −5
        </button>
        <button
          className="btn btn--danger"
          onClick={() => {
            con.log('')
            con.info('📤 props.dispatch({ type: "RESET" })')
            props.dispatch({ type: 'RESET' })
          }}
        >
          Сброс
        </button>
      </div>

      {/* Props viewer */}
      <div className="props-viewer">
        <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontSize: '0.72rem', textTransform: 'uppercase' }}>
          Все props компонента:
        </div>
        {'{\n'}
        {'  '}<span className="props-viewer__key">count</span>:{' '}
        <span className="props-viewer__val">{props.count}</span>
        {',\n'}
        {'  '}<span className="props-viewer__key">dispatch</span>:{' '}
        <span className="props-viewer__type">ƒ dispatch(action)</span>
        {' ← автоматически!\n'}
        {'}'}
      </div>

      {/* Three equivalent forms */}
      <div style={{
        marginTop: 16, padding: 12, background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-secondary)'
      }}>
        <div style={{ color: 'var(--accent-yellow)', fontWeight: 600, marginBottom: 8 }}>
          Три эквивалентные формы (все дают dispatch в props):
        </div>
        <div className="equivalent-forms">
          <div className="equiv-card">
            <div className="equiv-card__code">connect()(Comp)</div>
            <div className="equiv-card__note">без аргументов</div>
            <div className="equiv-card__eq">≡</div>
          </div>
          <div className="equiv-card">
            <div className="equiv-card__code">connect(null, null)(Comp)</div>
            <div className="equiv-card__note">null, null</div>
            <div className="equiv-card__eq">≡</div>
          </div>
          <div className="equiv-card">
            <div className="equiv-card__code">connect(mapState)(Comp)</div>
            <div className="equiv-card__note">только mapStateToProps</div>
            <div className="equiv-card__eq">✔</div>
          </div>
        </div>
      </div>

      {/* Code example */}
      <div style={{
        marginTop: 14, padding: 12, background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-sm)', fontSize: '0.78rem',
        fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)'
      }}>
        <div style={{ color: 'var(--accent-yellow)', fontWeight: 600, marginBottom: 4 }}>
          Код этого компонента:
        </div>
        <span style={{ color: 'var(--accent-purple)' }}>const</span>{' '}
        <span style={{ color: 'var(--accent-yellow)' }}>mapStateToProps</span> = (
        <span style={{ color: '#9cdcfe' }}>state</span>) =&gt; ({'{'}
        {'\n  '}<span style={{ color: '#9cdcfe' }}>count</span>: state.counter.value
        {'\n})\n\n'}
        <span style={{ color: 'var(--accent-green)' }}>// mapDispatchToProps НЕ указан</span>
        {'\n'}
        <span style={{ color: 'var(--accent-purple)' }}>export default</span>{' '}
        <span style={{ color: 'var(--accent-yellow)' }}>connect</span>(mapStateToProps)(Counter)
      </div>
    </div>
  )
}

const mapStateToProps = (state: RootState) => ({
  count: state.counter.value,
})

const Counter = connect(mapStateToProps)(CounterRaw)

// --- Render ---

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <Counter />
  </Provider>
)

// --- Initial log ---

con.info('dispatch по умолчанию — без mapDispatchToProps')
con.log('')
con.log('connect(mapStateToProps)(Counter) — mapDispatchToProps не указан.')
con.log('Компонент получает props.dispatch автоматически.')
con.log('')
con.log('Все кнопки используют props.dispatch({ type: "..." }) напрямую.')
