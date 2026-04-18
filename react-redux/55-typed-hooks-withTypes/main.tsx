import { useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers, applyMiddleware } from 'redux'
import { thunk } from 'redux-thunk'
import type { ThunkAction, ThunkDispatch } from 'redux-thunk'
import {
  Provider,
  useDispatch,
  useSelector,
  useStore,
  type TypedUseSelectorHook,
} from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// ================================================
// app/store.ts
// ================================================

interface CounterState { value: number }

type CounterAction =
  | { type: 'counter/increment' }
  | { type: 'counter/decrement' }
  | { type: 'counter/reset' }
  | { type: 'counter/addBy'; payload: number }

function counterReducer(state: CounterState = { value: 0 }, action: CounterAction): CounterState {
  switch (action.type) {
    case 'counter/increment': return { value: state.value + 1 }
    case 'counter/decrement': return { value: state.value - 1 }
    case 'counter/reset':     return { value: 0 }
    case 'counter/addBy':     return { value: state.value + action.payload }
    default: return state
  }
}

const rootReducer = combineReducers({ counter: counterReducer })

const store = createStore(rootReducer, applyMiddleware(thunk))

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = ThunkDispatch<RootState, undefined, CounterAction>
export type AppStore = typeof store

// ================================================
// Thunk — делает "асинхронный" +N через setTimeout
// Тип: ThunkAction<ReturnType, State, ExtraArg, Action>
// ================================================

const incrementAsync = (amount: number): ThunkAction<void, RootState, undefined, CounterAction> =>
  (dispatch) => {
    setTimeout(() => {
      dispatch({ type: 'counter/addBy', payload: amount })
    }, 500)
  }

// ================================================
// app/hooks.ts — ПОДХОД 1: TypedUseSelectorHook (pre-v9.1.0 style)
// ================================================

const useAppDispatchOld: () => AppDispatch = useDispatch
const useAppSelectorOld: TypedUseSelectorHook<RootState> = useSelector
const useAppStoreOld: () => AppStore = useStore as () => AppStore

// ================================================
// app/hooks.ts — ПОДХОД 2: .withTypes() (v9.1.0+)
// ================================================

const useAppDispatchNew = useDispatch.withTypes<AppDispatch>()
const useAppSelectorNew = useSelector.withTypes<RootState>()
const useAppStoreNew    = useStore.withTypes<AppStore>()

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — типизированные хуки: оба подхода'
)

// ================================================
// Counter через «старый» подход
// ================================================

function CounterOld() {
  const count = useAppSelectorOld(state => state.counter.value)
  const dispatch = useAppDispatchOld()
  const appStore = useAppStoreOld()

  const renders = useRef(0)
  renders.current++

  return (
    <div className="counter-box">
      <div className="counter-box__title">
        useAppSelector + TypedUseSelectorHook
      </div>
      <div className="counter-box__val">{count}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 4 }}>
        рендеров: {renders.current} · store.getState().counter.value = {appStore.getState().counter.value}
      </div>
      <div className="counter-box__buttons">
        <button className="btn btn--success btn--sm" onClick={() => {
          con.info('[old] dispatch({ type: "counter/increment" })')
          dispatch({ type: 'counter/increment' })
        }}>+1</button>
        <button className="btn btn--danger btn--sm" onClick={() => {
          con.info('[old] dispatch({ type: "counter/decrement" })')
          dispatch({ type: 'counter/decrement' })
        }}>−1</button>
        <button className="btn btn--accent btn--sm" onClick={() => {
          con.info('[old] dispatch(incrementAsync(5))  // thunk, TS OK')
          dispatch(incrementAsync(5))
        }}>+5 async</button>
        <button className="btn btn--sm" onClick={() => {
          con.info('[old] dispatch({ type: "counter/reset" })')
          dispatch({ type: 'counter/reset' })
        }}>reset</button>
      </div>
    </div>
  )
}

// ================================================
// Counter через «новый» подход
// ================================================

function CounterNew() {
  const count = useAppSelectorNew(state => state.counter.value)
  const dispatch = useAppDispatchNew()
  const appStore = useAppStoreNew()

  const renders = useRef(0)
  renders.current++

  return (
    <div className="counter-box">
      <div className="counter-box__title">
        useAppSelector + .withTypes&lt;RootState&gt;()
      </div>
      <div className="counter-box__val">{count}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 4 }}>
        рендеров: {renders.current} · store.getState().counter.value = {appStore.getState().counter.value}
      </div>
      <div className="counter-box__buttons">
        <button className="btn btn--success btn--sm" onClick={() => {
          con.success('[new] dispatch({ type: "counter/increment" })')
          dispatch({ type: 'counter/increment' })
        }}>+1</button>
        <button className="btn btn--danger btn--sm" onClick={() => {
          con.success('[new] dispatch({ type: "counter/decrement" })')
          dispatch({ type: 'counter/decrement' })
        }}>−1</button>
        <button className="btn btn--accent btn--sm" onClick={() => {
          con.success('[new] dispatch(incrementAsync(5))  // thunk, TS OK')
          dispatch(incrementAsync(5))
        }}>+5 async</button>
        <button className="btn btn--sm" onClick={() => {
          con.success('[new] dispatch({ type: "counter/reset" })')
          dispatch({ type: 'counter/reset' })
        }}>reset</button>
      </div>
    </div>
  )
}

// ================================================
// App
// ================================================

const OLD_CODE = `// app/hooks.ts
import type { TypedUseSelectorHook } from 'react-redux'
import { useDispatch, useSelector, useStore } from 'react-redux'
import type { AppDispatch, AppStore, RootState } from './store'

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
export const useAppStore:    () => AppStore = useStore

// Component:
const count    = useAppSelector(state => state.counter.value) // state: RootState
const dispatch = useAppDispatch()                              // dispatch: AppDispatch
dispatch(incrementAsync(5))  // thunk — TS OK`

const NEW_CODE = `// app/hooks.ts
import { useDispatch, useSelector, useStore } from 'react-redux'
import type { AppDispatch, AppStore, RootState } from './store'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
export const useAppStore    = useStore   .withTypes<AppStore>()

// Component:
const count    = useAppSelector(state => state.counter.value) // state: RootState
const dispatch = useAppDispatch()                              // dispatch: AppDispatch
dispatch(incrementAsync(5))  // thunk — TS OK`

function App() {
  return (
    <div className="approach-grid">
      <div className="approach-col approach-col--old">
        <span className="approach-col__tag">старый способ</span>
        <div className="approach-col__title">TypedUseSelectorHook&lt;RootState&gt;</div>
        <div className="approach-col__code">{OLD_CODE}</div>
        <div className="approach-col__preview">
          <CounterOld />
        </div>
      </div>

      <div className="approach-col approach-col--new">
        <span className="approach-col__tag">v9.1.0+</span>
        <div className="approach-col__title">useSelector.withTypes&lt;RootState&gt;()</div>
        <div className="approach-col__code">{NEW_CODE}</div>
        <div className="approach-col__preview">
          <CounterNew />
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

con.info('Урок 55 — типизированные хуки через .withTypes()')
con.log('')
con.log('Оба компонента смотрят в один и тот же store и один и тот же thunk-middleware.')
con.log('Разница — только в способе создания useAppSelector / useAppDispatch / useAppStore.')
con.log('')
con.info('Попробуйте кнопки "+5 async" в любой колонке:')
con.log('  диспатчится thunk-функция, TypeScript её принимает,')
con.log('  потому что AppDispatch = ThunkDispatch<RootState, undefined, CounterAction>.')
con.log('')
con.log('Дефолтный Dispatch из redux thunk-ов НЕ принимает — и это ровно та причина,')
con.log('почему стоит создавать типизированный useAppDispatch.')
