import { createRoot } from 'react-dom/client'
import { useRef } from 'react'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, connect, ConnectedProps } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface ToggleState {
  isOn: boolean
}

interface RootState {
  toggle: ToggleState
}

type Action = { type: 'TOGGLE' }

// --- Reducer ---

function toggleReducer(
  state: ToggleState = { isOn: false },
  action: Action
): ToggleState {
  return action.type === 'TOGGLE' ? { isOn: !state.isOn } : state
}

const rootReducer = combineReducers({ toggle: toggleReducer })
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — ConnectedProps vs ручная типизация'
)

// ================================================
// ВАРИАНТ 1 — Ручная типизация
// ================================================

interface ManualStateProps {
  isOn: boolean
}

interface ManualDispatchProps {
  toggleOn: () => Action
}

interface ManualOwnProps {
  backgroundColor: string
}

type ManualProps = ManualStateProps & ManualDispatchProps & ManualOwnProps

const mapStateManual = (state: RootState): ManualStateProps => ({
  isOn: state.toggle.isOn,
})

const mapDispatchManual: ManualDispatchProps = {
  toggleOn: () => ({ type: 'TOGGLE' }),
}

function ManualToggleRaw(props: ManualProps) {
  const rc = useRef(0)
  rc.current++
  return (
    <div className="ts-card ts-card--manual">
      <div className="ts-card__header">
        <div className="ts-card__title">Ручная типизация</div>
        <div className="ts-card__badge">много boilerplate</div>
      </div>
      <div
        className="ts-card__demo"
        style={{ backgroundColor: props.backgroundColor }}
      >
        isOn = {String(props.isOn)}
        <br />
        <button className="btn btn--accent" onClick={() => props.toggleOn()}>
          Toggle
        </button>
      </div>
      <div className="ts-card__code">
{`interface StateProps    { isOn: boolean }
interface DispatchProps { toggleOn: () => Action }
interface OwnProps      { backgroundColor: string }
type Props = StateProps & DispatchProps & OwnProps

const mapStateToProps = (state: RootState): StateProps => ({
  isOn: state.toggle.isOn,
})
const mapDispatchToProps: DispatchProps = {
  toggleOn: () => ({ type: 'TOGGLE' }),
}

const ManualToggle = (props: Props) => (/* ... */)

export default connect<StateProps, DispatchProps, OwnProps>(
  mapStateToProps,
  mapDispatchToProps,
)(ManualToggle)`}
      </div>
      <div className="ts-card__metric">рендеров: {rc.current}</div>
    </div>
  )
}

const ManualToggle = connect<
  ManualStateProps,
  ManualDispatchProps,
  ManualOwnProps,
  RootState
>(
  mapStateManual,
  mapDispatchManual
)(ManualToggleRaw)

// ================================================
// ВАРИАНТ 2 — ConnectedProps
// ================================================

const mapStateAuto = (state: RootState) => ({
  isOn: state.toggle.isOn,
})

const mapDispatchAuto = {
  toggleOn: () => ({ type: 'TOGGLE' as const }),
}

const connector = connect(mapStateAuto, mapDispatchAuto)

// TypeScript автоматически выведет:
//   type PropsFromRedux = { isOn: boolean; toggleOn: () => { type: 'TOGGLE' } }
type PropsFromRedux = ConnectedProps<typeof connector>

interface AutoOwnProps {
  backgroundColor: string
}

type AutoProps = PropsFromRedux & AutoOwnProps

function AutoToggleRaw(props: AutoProps) {
  const rc = useRef(0)
  rc.current++
  return (
    <div className="ts-card ts-card--auto">
      <div className="ts-card__header">
        <div className="ts-card__title">ConnectedProps (авто)</div>
        <div className="ts-card__badge">минимум кода</div>
      </div>
      <div
        className="ts-card__demo"
        style={{ backgroundColor: props.backgroundColor }}
      >
        isOn = {String(props.isOn)}
        <br />
        <button className="btn btn--success" onClick={() => props.toggleOn()}>
          Toggle
        </button>
      </div>
      <div className="ts-card__code">
{`import { connect, ConnectedProps } from 'react-redux'

const mapStateToProps = (state: RootState) => ({
  isOn: state.toggle.isOn,
})
const mapDispatchToProps = {
  toggleOn: () => ({ type: 'TOGGLE' as const }),
}

const connector = connect(mapStateToProps, mapDispatchToProps)
type PropsFromRedux = ConnectedProps<typeof connector>
// hover → { isOn: boolean; toggleOn: () => { type: 'TOGGLE' } }

interface OwnProps { backgroundColor: string }
type Props = PropsFromRedux & OwnProps

const AutoToggle = (props: Props) => (/* ... */)

export default connector(AutoToggle)`}
      </div>
      <div className="ts-card__metric">рендеров: {rc.current}</div>
    </div>
  )
}

const AutoToggle = connector(AutoToggleRaw)

// ================================================
// App
// ================================================

function App() {
  return (
    <div>
      <div style={{
        display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap',
        padding: 14, background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius)', marginBottom: 14,
      }}>
        <button
          className="btn btn--accent"
          onClick={() => {
            con.log('')
            con.info('📤 dispatch({ type: "TOGGLE" }) — обе карточки обновятся')
            store.dispatch({ type: 'TOGGLE' })
          }}
        >
          Внешний dispatch TOGGLE
        </button>
      </div>

      <div className="ts-layout">
        <ManualToggle backgroundColor="#264f78" />
        <AutoToggle backgroundColor="#2d5a2d" />
      </div>

      <div style={{
        padding: 12, background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius)', fontSize: '0.85rem', color: 'var(--text-secondary)'
      }}>
        <strong style={{ color: 'var(--accent-yellow)' }}>Наблюдение:</strong> оба компонента
        работают идентично — читают <code>state.toggle.isOn</code> и диспатчат
        <code> { "{ type: 'TOGGLE' }" }</code>. Но слева пришлось объявить четыре интерфейса/типа
        вручную и передать три дженерика в <code>connect</code>. Справа только <code>OwnProps</code>
        написан руками — всё остальное вывелось из <code>mapStateToProps</code> и
        <code> mapDispatchToProps</code> через <code>ConnectedProps&lt;typeof connector&gt;</code>.
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

con.info('ConnectedProps — утилитарный тип для автовывода props из connect')
con.log('')
con.log('Слева — ручная типизация:')
con.log('  interface StateProps    { isOn: boolean }')
con.log('  interface DispatchProps { toggleOn: () => Action }')
con.log('  interface OwnProps      { backgroundColor: string }')
con.log('  + дженерики в connect<StateProps, DispatchProps, OwnProps>(...)')
con.log('')
con.log('Справа — ConnectedProps:')
con.log('  const connector = connect(mapStateToProps, mapDispatchToProps)')
con.log('  type PropsFromRedux = ConnectedProps<typeof connector>  // автовывод')
con.log('  type Props = PropsFromRedux & OwnProps')
