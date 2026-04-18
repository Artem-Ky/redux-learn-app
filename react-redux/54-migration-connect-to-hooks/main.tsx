import { Component, memo, useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers, bindActionCreators } from 'redux'
import type { Dispatch } from 'redux'
import {
  Provider,
  connect,
  useSelector,
  useDispatch,
  type ConnectedProps,
} from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface CounterState { value: number }
interface UserState { name: string }

interface RootState {
  counter: CounterState
  user: UserState
}

type AppAction =
  | { type: 'counter/increment' }
  | { type: 'counter/decrement' }
  | { type: 'counter/reset' }

// --- Reducers ---

function counterReducer(state: CounterState = { value: 0 }, action: AppAction): CounterState {
  switch (action.type) {
    case 'counter/increment': return { value: state.value + 1 }
    case 'counter/decrement': return { value: state.value - 1 }
    case 'counter/reset':     return { value: 0 }
    default: return state
  }
}

function userReducer(state: UserState = { name: 'Alice' }): UserState {
  return state
}

const store = createStore(combineReducers({ counter: counterReducer, user: userReducer }))

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — migration step-by-step'
)

// --- Общие action creators ---

const incrementAction = () => ({ type: 'counter/increment' } as const)
const decrementAction = () => ({ type: 'counter/decrement' } as const)
const resetAction     = () => ({ type: 'counter/reset' } as const)

// ================================================
// Шаг 0: класс-компонент с connect
// ================================================

interface CounterClassProps {
  title: string
  count: number
  userName: string
  increment: () => void
  decrement: () => void
  reset: () => void
}

class CounterClassRaw extends Component<CounterClassProps> {
  render() {
    const { title, count, userName, increment, decrement, reset } = this.props
    return (
      <div className="counter-box">
        <div className="counter-box__title">{title} · user: {userName}</div>
        <div className="counter-box__val">{count}</div>
        <div className="counter-box__buttons">
          <button className="btn btn--success btn--sm" onClick={increment}>+1</button>
          <button className="btn btn--danger btn--sm" onClick={decrement}>−1</button>
          <button className="btn btn--sm" onClick={reset}>reset</button>
        </div>
      </div>
    )
  }
}

const mapState0 = (state: RootState) => ({
  count: state.counter.value,
  userName: state.user.name,
})

const mapDispatch0 = (dispatch: Dispatch<AppAction>) => bindActionCreators({
  increment: incrementAction,
  decrement: decrementAction,
  reset:     resetAction,
}, dispatch)

const CounterStep0 = connect(mapState0, mapDispatch0)(CounterClassRaw)

// ================================================
// Шаг 1: функциональный компонент, всё ещё с connect
// ================================================

function CounterFn1({ title, count, userName, increment, decrement, reset }: CounterClassProps) {
  return (
    <div className="counter-box">
      <div className="counter-box__title">{title} · user: {userName}</div>
      <div className="counter-box__val">{count}</div>
      <div className="counter-box__buttons">
        <button className="btn btn--success btn--sm" onClick={increment}>+1</button>
        <button className="btn btn--danger btn--sm" onClick={decrement}>−1</button>
        <button className="btn btn--sm" onClick={reset}>reset</button>
      </div>
    </div>
  )
}

const CounterStep1 = connect(mapState0, mapDispatch0)(CounterFn1)

// ================================================
// Шаг 2: mapStateToProps → useSelector (mapDispatchToProps ещё есть)
// ================================================

interface DispatchProps2 {
  increment: () => void
  decrement: () => void
  reset: () => void
}
interface OwnProps2 { title: string }
type Step2Props = DispatchProps2 & OwnProps2

function CounterFn2Raw({ title, increment, decrement, reset }: Step2Props) {
  const count = useSelector((state: RootState) => state.counter.value)
  const userName = useSelector((state: RootState) => state.user.name)
  return (
    <div className="counter-box">
      <div className="counter-box__title">{title} · user: {userName}</div>
      <div className="counter-box__val">{count}</div>
      <div className="counter-box__buttons">
        <button className="btn btn--success btn--sm" onClick={increment}>+1</button>
        <button className="btn btn--danger btn--sm" onClick={decrement}>−1</button>
        <button className="btn btn--sm" onClick={reset}>reset</button>
      </div>
    </div>
  )
}

const CounterStep2 = connect(null, mapDispatch0)(CounterFn2Raw)

// ================================================
// Шаг 3: + mapDispatchToProps → useDispatch + useCallback (connect ещё есть для StateProps=null, OwnProps)
// ================================================

const connectorStep3 = connect()
type Step3ConnectProps = ConnectedProps<typeof connectorStep3> & { title: string }

function CounterFn3Raw({ title }: Step3ConnectProps) {
  const count = useSelector((state: RootState) => state.counter.value)
  const userName = useSelector((state: RootState) => state.user.name)
  const dispatch = useDispatch<Dispatch<AppAction>>()

  const increment = useCallback(() => dispatch({ type: 'counter/increment' }), [dispatch])
  const decrement = useCallback(() => dispatch({ type: 'counter/decrement' }), [dispatch])
  const reset     = useCallback(() => dispatch({ type: 'counter/reset' }),     [dispatch])

  return (
    <div className="counter-box">
      <div className="counter-box__title">{title} · user: {userName}</div>
      <div className="counter-box__val">{count}</div>
      <div className="counter-box__buttons">
        <button className="btn btn--success btn--sm" onClick={increment}>+1</button>
        <button className="btn btn--danger btn--sm" onClick={decrement}>−1</button>
        <button className="btn btn--sm" onClick={reset}>reset</button>
      </div>
    </div>
  )
}

const CounterStep3 = connectorStep3(CounterFn3Raw)

// ================================================
// Шаг 4: убираем connect
// ================================================

interface Props4 { title: string }

function CounterStep4({ title }: Props4) {
  const count = useSelector((state: RootState) => state.counter.value)
  const userName = useSelector((state: RootState) => state.user.name)
  const dispatch = useDispatch<Dispatch<AppAction>>()

  const increment = useCallback(() => dispatch({ type: 'counter/increment' }), [dispatch])
  const decrement = useCallback(() => dispatch({ type: 'counter/decrement' }), [dispatch])
  const reset     = useCallback(() => dispatch({ type: 'counter/reset' }),     [dispatch])

  return (
    <div className="counter-box">
      <div className="counter-box__title">{title} · user: {userName}</div>
      <div className="counter-box__val">{count}</div>
      <div className="counter-box__buttons">
        <button className="btn btn--success btn--sm" onClick={increment}>+1</button>
        <button className="btn btn--danger btn--sm" onClick={decrement}>−1</button>
        <button className="btn btn--sm" onClick={reset}>reset</button>
      </div>
    </div>
  )
}

// ================================================
// Шаг 5: + React.memo
// ================================================

const CounterStep5 = memo(function CounterStep5({ title }: Props4) {
  const count = useSelector((state: RootState) => state.counter.value)
  const userName = useSelector((state: RootState) => state.user.name)
  const dispatch = useDispatch<Dispatch<AppAction>>()

  const increment = useCallback(() => dispatch({ type: 'counter/increment' }), [dispatch])
  const decrement = useCallback(() => dispatch({ type: 'counter/decrement' }), [dispatch])
  const reset     = useCallback(() => dispatch({ type: 'counter/reset' }),     [dispatch])

  return (
    <div className="counter-box">
      <div className="counter-box__title">{title} · user: {userName}</div>
      <div className="counter-box__val">{count}</div>
      <div className="counter-box__buttons">
        <button className="btn btn--success btn--sm" onClick={increment}>+1</button>
        <button className="btn btn--danger btn--sm" onClick={decrement}>−1</button>
        <button className="btn btn--sm" onClick={reset}>reset</button>
      </div>
    </div>
  )
})

// ================================================
// Код для показа на каждом шаге
// ================================================

const STEP_CODE: string[] = [
  `// Шаг 0: класс + connect
class Counter extends Component<Props> {
  render() {
    const { count, userName, increment, ... } = this.props
    return (...)
  }
}

const mapStateToProps = (state) => ({
  count: state.counter.value,
  userName: state.user.name,
})

const mapDispatchToProps = (dispatch) =>
  bindActionCreators({ increment, decrement, reset }, dispatch)

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Counter)`,

  `// Шаг 1: класс → функциональный (connect остаётся)
function Counter({
  title, count, userName,
  increment, decrement, reset,
}: Props) {
  return (...)
}

// mapStateToProps и mapDispatchToProps не тронуты
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Counter)`,

  `// Шаг 2: mapStateToProps → useSelector
function Counter({
  title, increment, decrement, reset,
}: OwnProps & DispatchProps) {
  const count    = useSelector((s: RootState) => s.counter.value)
  const userName = useSelector((s: RootState) => s.user.name)
  return (...)
}

// mapStateToProps больше нет — null первым аргументом
export default connect(
  null,
  mapDispatchToProps
)(Counter)`,

  `// Шаг 3: mapDispatchToProps → useDispatch + useCallback
function Counter({ title }: OwnProps) {
  const count    = useSelector((s: RootState) => s.counter.value)
  const userName = useSelector((s: RootState) => s.user.name)
  const dispatch = useDispatch()

  const increment = useCallback(() => dispatch({ type: 'counter/increment' }), [dispatch])
  const decrement = useCallback(() => dispatch({ type: 'counter/decrement' }), [dispatch])
  const reset     = useCallback(() => dispatch({ type: 'counter/reset' }),     [dispatch])

  return (...)
}

// mapDispatchToProps тоже ушёл; connect пустой —
// технически он уже не нужен, но ещё есть
export default connect()(Counter)`,

  `// Шаг 4: убираем connect
interface Props { title: string }

export function Counter({ title }: Props) {
  const count    = useSelector((s: RootState) => s.counter.value)
  const userName = useSelector((s: RootState) => s.user.name)
  const dispatch = useDispatch()

  const increment = useCallback(() => dispatch({ type: 'counter/increment' }), [dispatch])
  const decrement = useCallback(() => dispatch({ type: 'counter/decrement' }), [dispatch])
  const reset     = useCallback(() => dispatch({ type: 'counter/reset' }),     [dispatch])

  return (...)
}

// connect больше нет, StateProps / DispatchProps /
// ConnectedProps — все удалены`,

  `// Шаг 5: + React.memo (опционально)
interface Props { title: string }

export const Counter = memo(({ title }: Props) => {
  const count    = useSelector((s: RootState) => s.counter.value)
  const userName = useSelector((s: RootState) => s.user.name)
  const dispatch = useDispatch()

  const increment = useCallback(() => dispatch({ type: 'counter/increment' }), [dispatch])
  const decrement = useCallback(() => dispatch({ type: 'counter/decrement' }), [dispatch])
  const reset     = useCallback(() => dispatch({ type: 'counter/reset' }),     [dispatch])

  return (...)
})

// memo воссоздаёт поведение "не ре-рендерить при parent re-render"
// которое раньше давал connect.`,
]

const STEP_NOTES: { title: string; body: ReactNode }[] = [
  {
    title: 'Шаг 0 — отправная точка',
    body: <>Класс-компонент, <code>mapStateToProps</code> и <code>mapDispatchToProps</code>, всё
      завёрнуто в <code>connect</code>. Типовой legacy-код начала 2019.</>,
  },
  {
    title: 'Шаг 1 — класс → функциональный',
    body: <>Переписали <code>class</code> на <code>function</code>. <code>this.state</code> →
      <code>useState</code>, lifecycle → <code>useEffect</code> (у Counter их нет). Всё остальное —
      как было.</>,
  },
  {
    title: 'Шаг 2 — mapStateToProps → useSelector',
    body: <>Одну <code>mapStateToProps</code>-функцию разобрали на несколько <code>useSelector</code>
      по одному на поле. Из <code>connect</code> убрали первый аргумент (<code>null</code>).</>,
  },
  {
    title: 'Шаг 3 — mapDispatchToProps → useDispatch',
    body: <>Заменили <code>mapDispatchToProps</code> на <code>useDispatch</code>. Коллбэки собираем
      через <code>useCallback</code> — чтобы стабильные ссылки передавались в дочерние
      <code>memo</code>-компоненты.</>,
  },
  {
    title: 'Шаг 4 — убираем connect',
    body: <>Теперь <code>connect</code> ничего не делает (нет ни state, ни dispatch props). Удаляем
      его, удаляем типы <code>StateProps</code>/<code>DispatchProps</code>/<code>ConnectedProps</code>.
      Экспортируем сам компонент.</>,
  },
  {
    title: 'Шаг 5 — React.memo (опционально)',
    body: <>Добавляем <code>React.memo</code>, если профайлер показывает лишние рендеры от
      родителя. Без него — функционально идентично, просто может лишний раз перерисоваться при
      parent re-render (урок 52).</>,
  },
]

// ================================================
// App + stepper
// ================================================

function CounterForStep({ step }: { step: number }) {
  const title = `Шаг ${step}`
  switch (step) {
    case 0: return <CounterStep0 title={title} />
    case 1: return <CounterStep1 title={title} />
    case 2: return <CounterStep2 title={title} />
    case 3: return <CounterStep3 title={title} />
    case 4: return <CounterStep4 title={title} />
    case 5: return <CounterStep5 title={title} />
    default: return null
  }
}

function App() {
  const [step, setStep] = useState(0)

  const go = (s: number) => {
    if (s < 0 || s > 5) return
    setStep(s)
    con.info(`→ Переключились на шаг ${s}`)
  }

  const note = STEP_NOTES[step]

  return (
    <div>
      <div className="stepper">
        {[0, 1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            className={`stepper__btn ${s === step ? 'stepper__btn--active' : ''}`}
            onClick={() => go(s)}
          >
            <span className="stepper__btn-num">{s}</span>
            {s === 0 ? 'Исходный connect' :
              s === 1 ? 'Функц. компонент' :
              s === 2 ? 'useSelector' :
              s === 3 ? 'useDispatch' :
              s === 4 ? 'Убрать connect' :
              'React.memo'}
          </button>
        ))}
      </div>

      <div className="step-notes">
        <div className="step-notes__title">{note.title}</div>
        <div>{note.body}</div>
      </div>

      <div className="step-panel">
        <div className="step-panel__col">
          <div className="step-panel__col-title">Код шага {step}</div>
          <div className="step-panel__code">{STEP_CODE[step]}</div>
        </div>
        <div className="step-panel__col">
          <div className="step-panel__col-title">Живой превью (работает с общим store)</div>
          <div className="step-panel__preview">
            <CounterForStep step={step} />
          </div>
        </div>
      </div>

      <div className="step-nav">
        <button className="btn btn--sm" onClick={() => go(step - 1)} disabled={step === 0}>
          ← Previous step
        </button>
        <button className="btn btn--accent" onClick={() => go(step + 1)} disabled={step === 5}>
          Next step →
        </button>
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

con.info('Урок 54 — миграция с connect на hooks')
con.log('')
con.log('Шесть шагов: от класс-компонента + connect до функционального + React.memo.')
con.log('Все шаги смотрят в один и тот же store — кликая "+1" на любом шаге, вы видите')
con.log('одно и то же значение count.')
