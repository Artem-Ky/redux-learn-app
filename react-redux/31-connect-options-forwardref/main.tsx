import { createRoot } from 'react-dom/client'
import { Component, createRef, useRef, useState } from 'react'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, connect } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface InputState {
  placeholder: string
}

interface RootState {
  input: InputState
}

// --- Reducer ---

function inputReducer(
  state: InputState = { placeholder: 'Нажмите «Focus input» чтобы сфокусировать меня' },
  _action: { type: string }
): InputState {
  return state
}

const rootReducer = combineReducers({ input: inputReducer })
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — options.forwardRef'
)

// --- InputComponent — class с instance-методом focus() ---

interface InputComponentProps {
  placeholder: string
  label: string
}

class InputComponent extends Component<InputComponentProps> {
  inputRef = createRef<HTMLInputElement>()

  focus = (): void => {
    this.inputRef.current?.focus()
    this.inputRef.current?.select()
  }

  render() {
    return (
      <input
        ref={this.inputRef}
        className="ref-card__input"
        placeholder={this.props.placeholder}
        defaultValue={this.props.label}
      />
    )
  }
}

const mapStateToProps = (state: RootState) => ({
  placeholder: state.input.placeholder,
})

// Вариант 1 — без forwardRef. ref из родителя попадёт на обёртку, а не на InputComponent.
const ConnectedBroken = connect(mapStateToProps)(InputComponent)

// Вариант 2 — с forwardRef. ref из родителя будет пробошен к InputComponent.
const ConnectedWithRef = connect(
  mapStateToProps,
  null,
  null,
  { forwardRef: true }
)(InputComponent)

// --- Cards ---

function BrokenCard() {
  // Без forwardRef — ref фактически указывает на обёртку connect,
  // у которой нет метода focus(). Поэтому мы ловим ошибку и показываем её.
  const ref = useRef<InputComponent | null>(null)
  const [inspect, setInspect] = useState<string>(
    'ref ещё не установлен — нажмите «Focus input»'
  )

  const handleFocus = () => {
    con.log('')
    con.info('Попытка: ref.current.focus() на connect-HOC БЕЗ forwardRef')
    const current = ref.current as unknown
    const ctor = (current as { constructor?: { name?: string } } | null)?.constructor?.name
    const hasFocus = typeof (current as { focus?: unknown } | null)?.focus === 'function'

    setInspect(
      `ref.current: ${current === null ? 'null' : '[object]'}\n` +
      `constructor: ${ctor ?? '(нет)'}\n` +
      `typeof ref.current.focus: ${typeof (current as { focus?: unknown } | null)?.focus}\n` +
      `hasFocus: ${hasFocus}`
    )

    try {
      ;(current as { focus: () => void }).focus()
      con.success('focus() вызвался (неожиданно)')
    } catch (e) {
      con.error(`✖ ${(e as Error).message}`)
      con.log('  ref указывает на обёрточный connect-компонент,')
      con.log('  у которого нет instance-метода .focus().')
    }
  }

  return (
    <div className="ref-card ref-card--broken">
      <div className="ref-card__header">
        <div className="ref-card__title ref-card__title--broken">
          Без forwardRef
        </div>
        <div className="ref-card__badge ref-card__badge--broken">сломано</div>
      </div>
      <div className="ref-card__config">
        connect(mapStateToProps)(InputComponent)
      </div>
      <ConnectedBroken
        ref={ref as unknown as React.Ref<InputComponent>}
        label="broken"
      />
      <div className="ref-card__actions">
        <button className="btn btn--accent" onClick={handleFocus}>
          Focus input
        </button>
      </div>
      <div className="ref-card__inspect">{inspect}</div>
    </div>
  )
}

function FixedCard() {
  const ref = useRef<InputComponent | null>(null)
  const [inspect, setInspect] = useState<string>(
    'ref ещё не установлен — нажмите «Focus input»'
  )

  const handleFocus = () => {
    con.log('')
    con.info('Попытка: ref.current.focus() на connect-HOC С forwardRef: true')
    const current = ref.current
    const ctor = (current as unknown as { constructor?: { name?: string } } | null)?.constructor?.name
    const hasFocus = typeof current?.focus === 'function'

    setInspect(
      `ref.current: ${current === null ? 'null' : '[object InputComponent]'}\n` +
      `constructor: ${ctor ?? '(нет)'}\n` +
      `typeof ref.current.focus: ${typeof current?.focus}\n` +
      `hasFocus: ${hasFocus}`
    )

    if (current) {
      current.focus()
      con.success('✔ focus() выполнен — input получил фокус')
    } else {
      con.warn('ref.current = null')
    }
  }

  return (
    <div className="ref-card ref-card--fixed">
      <div className="ref-card__header">
        <div className="ref-card__title ref-card__title--fixed">
          С forwardRef: true
        </div>
        <div className="ref-card__badge ref-card__badge--fixed">работает</div>
      </div>
      <div className="ref-card__config">
        connect(mapStateToProps, null, null, {'{ forwardRef: true }'})(InputComponent)
      </div>
      <ConnectedWithRef
        ref={ref}
        label="with forwardRef"
      />
      <div className="ref-card__actions">
        <button className="btn btn--success" onClick={handleFocus}>
          Focus input
        </button>
      </div>
      <div className="ref-card__inspect">{inspect}</div>
    </div>
  )
}

// --- App ---

function App() {
  return (
    <div className="ref-layout">
      <BrokenCard />
      <FixedCard />
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

con.info('options.forwardRef — куда попадает ref, поставленный на connect-HOC')
con.log('')
con.log('InputComponent — класс с методом focus(), вызывающим .focus() на DOM-input.')
con.log('')
con.log('Слева:  connect(mapStateToProps)(InputComponent)')
con.log('        ref → обёрточный connect-компонент')
con.log('        ref.current.focus() → TypeError')
con.log('')
con.log('Справа: connect(mapStateToProps, null, null, { forwardRef: true })(InputComponent)')
con.log('        ref → реальный InputComponent')
con.log('        ref.current.focus() → работает')
