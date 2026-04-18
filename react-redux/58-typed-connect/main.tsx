import { createRoot } from 'react-dom/client'
import { useRef } from 'react'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, connect } from 'react-redux'
import type { ConnectedProps } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// ================================================
// State
// ================================================

interface ToggleState { isOn: boolean }
interface RootState   { toggle: ToggleState }

type ToggleAction = { type: 'TOGGLE_IS_ON' }

function toggleReducer(
  state: ToggleState = { isOn: false },
  action: ToggleAction,
): ToggleState {
  return action.type === 'TOGGLE_IS_ON' ? { isOn: !state.isOn } : state
}

const store = createStore(combineReducers({ toggle: toggleReducer }))

// ================================================
// Console
// ================================================

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — ручная типизация vs ConnectedProps',
)

// ================================================
// ВАРИАНТ 1 — РУЧНАЯ ТИПИЗАЦИЯ
// ================================================

interface ManualStateProps {
  isOn: boolean
}

interface ManualDispatchProps {
  toggleOn: () => ToggleAction
}

interface ManualOwnProps {
  backgroundColor: string
}

type ManualProps = ManualStateProps & ManualDispatchProps & ManualOwnProps

const mapStateManual = (state: RootState): ManualStateProps => ({
  isOn: state.toggle.isOn,
})

const mapDispatchManual: ManualDispatchProps = {
  toggleOn: () => ({ type: 'TOGGLE_IS_ON' }),
}

function ToggleButtonManualRaw(props: ManualProps) {
  const rc = useRef(0)
  rc.current++
  return (
    <div className="ts-card ts-card--manual">
      <div className="ts-card__header">
        <div className="ts-card__title">Ручная типизация</div>
        <div className="ts-card__badge">4 типа + 3 дженерика</div>
      </div>
      <div
        className="ts-card__demo"
        style={{ backgroundColor: props.backgroundColor }}
      >
        isOn = <b>{String(props.isOn)}</b>
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
  toggleOn: () => ({ type: 'TOGGLE_IS_ON' }),
}

const ToggleButton = (props: Props) => (/* ... */)

export default connect<StateProps, DispatchProps, OwnProps>(
  mapStateToProps,
  mapDispatchToProps,
)(ToggleButton)`}
      </div>
      <div className="ts-card__metric">рендеров: {rc.current}</div>
    </div>
  )
}

const ToggleButtonManual = connect<
  ManualStateProps,
  ManualDispatchProps,
  ManualOwnProps,
  RootState
>(
  mapStateManual,
  mapDispatchManual,
)(ToggleButtonManualRaw)

// ================================================
// ВАРИАНТ 2 — ConnectedProps (двухэтапный connect)
// ================================================

const mapStateAuto = (state: RootState) => ({
  isOn: state.toggle.isOn,
})

const mapDispatchAuto = {
  toggleOn: () => ({ type: 'TOGGLE_IS_ON' as const }),
}

const connector = connect(mapStateAuto, mapDispatchAuto)

// TS выведет:
// type PropsFromRedux = {
//   isOn: boolean
//   toggleOn: () => void   (bound action creator)
// }
type PropsFromRedux = ConnectedProps<typeof connector>

interface AutoOwnProps { backgroundColor: string }
type AutoProps = PropsFromRedux & AutoOwnProps

function ToggleButtonAutoRaw(props: AutoProps) {
  const rc = useRef(0)
  rc.current++
  return (
    <div className="ts-card ts-card--auto">
      <div className="ts-card__header">
        <div className="ts-card__title">ConnectedProps — автовывод</div>
        <div className="ts-card__badge">2 типа</div>
      </div>
      <div
        className="ts-card__demo"
        style={{ backgroundColor: props.backgroundColor }}
      >
        isOn = <b>{String(props.isOn)}</b>
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
  toggleOn: () => ({ type: 'TOGGLE_IS_ON' as const }),
}

const connector = connect(mapStateToProps, mapDispatchToProps)
type PropsFromRedux = ConnectedProps<typeof connector>
// hover → { isOn: boolean; toggleOn: () => void }

interface OwnProps { backgroundColor: string }
type Props = PropsFromRedux & OwnProps

const ToggleButton = (props: Props) => (/* ... */)
export default connector(ToggleButton)`}
      </div>
      <div className="ts-card__metric">рендеров: {rc.current}</div>
    </div>
  )
}

const ToggleButtonAuto = connector(ToggleButtonAutoRaw)

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
            con.info('📤 store.dispatch({ type: "TOGGLE_IS_ON" }) — обе карточки обновятся')
            store.dispatch({ type: 'TOGGLE_IS_ON' })
          }}
        >
          Внешний dispatch TOGGLE_IS_ON
        </button>
      </div>

      <div className="ts-layout">
        <ToggleButtonManual backgroundColor="#4a3020" />
        <ToggleButtonAuto   backgroundColor="#24432a" />
      </div>

      <div style={{
        padding: 12, background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius)', fontSize: '0.85rem', color: 'var(--text-secondary)'
      }}>
        <strong style={{ color: 'var(--accent-yellow)' }}>Наблюдение:</strong> обе кнопки
        читают <code>state.toggle.isOn</code> и диспатчат одинаковый экшен. Но слева пришлось
        объявить четыре типа вручную и передать три дженерика в <code>connect</code>. Справа
        только <code>OwnProps</code> написан руками — <code>isOn</code> и <code>toggleOn</code>
        вывелись автоматически через <code>ConnectedProps&lt;typeof connector&gt;</code>.
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <App />
  </Provider>,
)

// --- Initial log ---

con.info('Рендерим два connected-компонента бок о бок')
con.log('')
con.log('Слева — ручная типизация:')
con.log('  4 объявления типов: StateProps, DispatchProps, OwnProps, Props')
con.log('  3 дженерика: connect<StateProps, DispatchProps, OwnProps>(...)')
con.log('')
con.log('Справа — ConnectedProps:')
con.log('  const connector = connect(mapStateToProps, mapDispatchToProps)')
con.log('  type PropsFromRedux = ConnectedProps<typeof connector>')
con.log('  type Props = PropsFromRedux & OwnProps')
con.log('')
con.log('В рантайме оба компонента ведут себя идентично:')
con.log('  dispatch → Subscription.notify() → checkForUpdates')
con.log('         → mapStateToProps → === → forceRender')
