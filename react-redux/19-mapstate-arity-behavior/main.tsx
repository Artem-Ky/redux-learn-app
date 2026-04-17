import { createRoot } from 'react-dom/client'
import { useState } from 'react'
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
  action: { type: string }
): CounterState {
  switch (action.type) {
    case 'INCREMENT':
      return { value: state.value + 1 }
    default:
      return state
  }
}

const rootReducer = combineReducers({ counter: counterReducer })
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — Arity mapStateToProps'
)

// ============================================================
// Variant 1: (state) => ... — length 1, ownProps NOT passed
// ============================================================

let v1Renders = 0

const mapStateToProps1 = (state: RootState) => {
  con.info(`[V1] mapStateToProps(state) вызвана. fn.length = ${mapStateToProps1.length}`)
  con.log(`  ownProps = undefined (fn.length === 1 → connect не передаёт ownProps)`)
  return { count: state.counter.value }
}

function Variant1Raw(props: { count: number; label?: string }) {
  v1Renders++
  return (
    <div>
      <div className="variant-card__code">
        <span style={{ color: 'var(--accent-purple)' }}>const</span>{' '}
        <span style={{ color: 'var(--accent-yellow)' }}>mapStateToProps</span> = (
        <span style={{ color: '#9cdcfe' }}>state</span>) =&gt; ...
      </div>
      <div className="arg-display">
        <div className="arg-display__label">ownProps (2-й аргумент):</div>
        <div className="arg-display__value none">не передаётся (fn.length === 1)</div>
      </div>
      <div className="arg-display" style={{ marginTop: 6 }}>
        <div className="arg-display__label">props.label (from parent):</div>
        <div className="arg-display__value">{props.label ?? 'undefined'}</div>
      </div>
      <div style={{ marginTop: 8 }}>
        count = <strong style={{ color: 'var(--accent-cyan)' }}>{props.count}</strong>
      </div>
      <div className="render-count">Рендеров: {v1Renders}</div>
    </div>
  )
}

const Variant1 = connect(mapStateToProps1)(Variant1Raw)

// ============================================================
// Variant 2: (state, ownProps) => ... — length 2, ownProps passed
// ============================================================

let v2Renders = 0

const mapStateToProps2 = (state: RootState, ownProps: { label?: string }) => {
  con.info(`[V2] mapStateToProps(state, ownProps) вызвана. fn.length = ${mapStateToProps2.length}`)
  con.log(`  ownProps = ${JSON.stringify(ownProps)}`)
  return { count: state.counter.value, resolvedLabel: ownProps.label || 'без label' }
}

function Variant2Raw(props: { count: number; resolvedLabel: string; label?: string }) {
  v2Renders++
  return (
    <div>
      <div className="variant-card__code">
        <span style={{ color: 'var(--accent-purple)' }}>const</span>{' '}
        <span style={{ color: 'var(--accent-yellow)' }}>mapStateToProps</span> = (
        <span style={{ color: '#9cdcfe' }}>state</span>,{' '}
        <span style={{ color: '#9cdcfe' }}>ownProps</span>) =&gt; ...
      </div>
      <div className="arg-display">
        <div className="arg-display__label">ownProps:</div>
        <div className="arg-display__value">
          {'{ label: "'}{props.label ?? ''}{'" }'}
        </div>
      </div>
      <div className="arg-display" style={{ marginTop: 6 }}>
        <div className="arg-display__label">resolvedLabel (из mapStateToProps):</div>
        <div className="arg-display__value">{props.resolvedLabel}</div>
      </div>
      <div style={{ marginTop: 8 }}>
        count = <strong style={{ color: 'var(--accent-cyan)' }}>{props.count}</strong>
      </div>
      <div className="render-count">Рендеров: {v2Renders}</div>
    </div>
  )
}

const Variant2 = connect(mapStateToProps2)(Variant2Raw)

// ============================================================
// Variant 3: (state, ownProps = {}) => ... — length 1 (!), ownProps NOT passed
// ============================================================

let v3Renders = 0

const mapStateToProps3 = (state: RootState, ownProps: { label?: string } = {}) => {
  con.warn(`[V3] mapStateToProps(state, ownProps = {}) вызвана. fn.length = ${mapStateToProps3.length}`)
  con.log(`  ownProps = ${JSON.stringify(ownProps)} (значение по умолчанию, т.к. не передаётся!)`)
  return { count: state.counter.value, resolvedLabel: ownProps.label || 'ownProps пуст!' }
}

function Variant3Raw(props: { count: number; resolvedLabel: string; label?: string }) {
  v3Renders++
  return (
    <div>
      <div className="variant-card__code">
        <span style={{ color: 'var(--accent-purple)' }}>const</span>{' '}
        <span style={{ color: 'var(--accent-yellow)' }}>mapStateToProps</span> = (
        <span style={{ color: '#9cdcfe' }}>state</span>,{' '}
        <span style={{ color: '#9cdcfe' }}>ownProps</span>{' '}
        <span style={{ color: 'var(--text-primary)' }}>=</span>{' '}
        <span style={{ color: 'var(--text-primary)' }}>{'{}'}</span>) =&gt; ...
      </div>
      <div className="arg-display">
        <div className="arg-display__label">ownProps (внутри функции):</div>
        <div className="arg-display__value none">
          {'{ }'} — всегда значение по умолчанию!
        </div>
      </div>
      <div className="arg-display" style={{ marginTop: 6 }}>
        <div className="arg-display__label">resolvedLabel:</div>
        <div className="arg-display__value none">{props.resolvedLabel}</div>
      </div>
      <div style={{ marginTop: 8 }}>
        count = <strong style={{ color: 'var(--accent-cyan)' }}>{props.count}</strong>
      </div>
      <div className="render-count">Рендеров: {v3Renders}</div>
    </div>
  )
}

const Variant3 = connect(mapStateToProps3)(Variant3Raw)

// ============================================================
// Parent App
// ============================================================

function App() {
  const dispatch = useDispatch()
  const [label, setLabel] = useState('метка A')

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          className="btn btn--accent"
          onClick={() => {
            con.log('')
            con.log('═══════════════════════════════════')
            con.info('📤 dispatch INCREMENT')
            dispatch({ type: 'INCREMENT' })
          }}
        >
          dispatch INCREMENT
        </button>
        <button
          className="btn"
          onClick={() => {
            const newLabel = label === 'метка A' ? 'метка B' : 'метка A'
            con.log('')
            con.log('═══════════════════════════════════')
            con.info(`📤 Изменение ownProps: label = "${newLabel}"`)
            setLabel(newLabel)
          }}
        >
          Сменить ownProps (label)
        </button>
      </div>

      <div style={{
        marginBottom: 12, padding: 8, background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-sm)', fontSize: '0.8rem',
        color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)'
      }}>
        Передаём всем: label="{label}"
      </div>

      <div className="variant-grid">
        <div className="variant-card">
          <div className="variant-card__header v1">
            (state)
            <span className="arity-badge len1">length: 1</span>
          </div>
          <div className="variant-card__body">
            <Variant1 label={label} />
          </div>
        </div>

        <div className="variant-card">
          <div className="variant-card__header v2">
            (state, ownProps)
            <span className="arity-badge len2">length: 2</span>
          </div>
          <div className="variant-card__body">
            <Variant2 label={label} />
          </div>
        </div>

        <div className="variant-card">
          <div className="variant-card__header v3">
            (state, ownProps = {'{}'})
            <span className="arity-badge len1">length: 1</span>
          </div>
          <div className="variant-card__body">
            <Variant3 label={label} />
          </div>
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

con.info('Arity — как function.length влияет на передачу ownProps')
con.log('')
con.log('Три варианта mapStateToProps:')
con.log('  V1: (state) → length=1 → ownProps НЕ передаётся')
con.log('  V2: (state, ownProps) → length=2 → ownProps ПЕРЕДАЁТСЯ')
con.log('  V3: (state, ownProps={}) → length=1 → ownProps НЕ передаётся!')
con.log('')
con.log('Нажмите «dispatch INCREMENT» и «Сменить ownProps» и следите за разницей.')
