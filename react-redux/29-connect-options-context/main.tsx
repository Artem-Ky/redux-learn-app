import React, { useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore } from 'redux'
import { Provider, connect, ReactReduxContextValue } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Custom contexts ---

const UserContext    = React.createContext<ReactReduxContextValue | null>(null)
const ProductContext = React.createContext<ReactReduxContextValue | null>(null)

// --- User store ---

interface UserState {
  name: string
  loggedIn: boolean
  loginCount: number
}

type UserAction =
  | { type: 'user/login' }
  | { type: 'user/logout' }
  | { type: 'user/rename'; payload: string }

function userReducer(
  state: UserState = { name: 'Алексей', loggedIn: false, loginCount: 0 },
  action: UserAction
): UserState {
  switch (action.type) {
    case 'user/login':
      return { ...state, loggedIn: true, loginCount: state.loginCount + 1 }
    case 'user/logout':
      return { ...state, loggedIn: false }
    case 'user/rename':
      return { ...state, name: action.payload }
    default:
      return state
  }
}

const userStore = createStore(userReducer)

// --- Product store ---

interface ProductState {
  items: string[]
  inCart: number
}

type ProductAction =
  | { type: 'product/add'; payload: string }
  | { type: 'product/clear' }
  | { type: 'product/cart-inc' }

function productReducer(
  state: ProductState = { items: ['Книга', 'Клавиатура'], inCart: 0 },
  action: ProductAction
): ProductState {
  switch (action.type) {
    case 'product/add':
      return { ...state, items: [...state.items, action.payload] }
    case 'product/clear':
      return { ...state, items: [] }
    case 'product/cart-inc':
      return { ...state, inCart: state.inCart + 1 }
    default:
      return state
  }
}

const productStore = createStore(productReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — два store через options.context'
)

// ================================================
// UserInfo — подключён к UserContext
// ================================================

interface UserInfoProps {
  name: string
  loggedIn: boolean
  loginCount: number
  dispatch: (a: UserAction) => void
}

function UserInfoRaw({ name, loggedIn, loginCount, dispatch }: UserInfoProps) {
  const rc = useRef(0)
  rc.current++
  return (
    <div className="store-card store-card--user">
      <div className="store-card__header">
        <div className="store-card__title store-card__title--user">UserInfo</div>
        <div className="store-card__ctx">context: UserContext</div>
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        рендеров: <strong style={{ color: 'var(--accent-cyan)' }}>{rc.current}</strong>
      </div>
      <div className="store-card__state">
{JSON.stringify({ name, loggedIn, loginCount }, null, 2)}
      </div>
      <div className="store-card__actions">
        <button
          className="btn btn--sm btn--success"
          onClick={() => {
            con.log('')
            con.info('📤 userStore.dispatch({ type: "user/login" })')
            dispatch({ type: 'user/login' })
          }}
        >
          login
        </button>
        <button
          className="btn btn--sm"
          onClick={() => {
            con.log('')
            con.info('📤 userStore.dispatch({ type: "user/logout" })')
            dispatch({ type: 'user/logout' })
          }}
        >
          logout
        </button>
        <button
          className="btn btn--sm"
          onClick={() => {
            const newName = name === 'Алексей' ? 'Мария' : 'Алексей'
            con.log('')
            con.info(`📤 userStore.dispatch({ type: "user/rename", payload: "${newName}" })`)
            dispatch({ type: 'user/rename', payload: newName })
          }}
        >
          rename
        </button>
      </div>
    </div>
  )
}

const UserInfo = connect(
  (state: UserState) => ({
    name: state.name,
    loggedIn: state.loggedIn,
    loginCount: state.loginCount,
  }),
  null,
  null,
  { context: UserContext as unknown as React.Context<ReactReduxContextValue> }
)(UserInfoRaw as any) as React.ComponentType

// ================================================
// ProductList — подключён к ProductContext
// ================================================

interface ProductListProps {
  items: string[]
  inCart: number
  dispatch: (a: ProductAction) => void
}

function ProductListRaw({ items, inCart, dispatch }: ProductListProps) {
  const rc = useRef(0)
  rc.current++
  return (
    <div className="store-card store-card--product">
      <div className="store-card__header">
        <div className="store-card__title store-card__title--product">ProductList</div>
        <div className="store-card__ctx">context: ProductContext</div>
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        рендеров: <strong style={{ color: 'var(--accent-orange)' }}>{rc.current}</strong>
      </div>
      <div className="store-card__state">
{JSON.stringify({ items, inCart }, null, 2)}
      </div>
      <div className="store-card__actions">
        <button
          className="btn btn--sm btn--success"
          onClick={() => {
            const name = 'Товар #' + (items.length + 1)
            con.log('')
            con.info(`📤 productStore.dispatch({ type: "product/add", payload: "${name}" })`)
            dispatch({ type: 'product/add', payload: name })
          }}
        >
          add item
        </button>
        <button
          className="btn btn--sm"
          onClick={() => {
            con.log('')
            con.info('📤 productStore.dispatch({ type: "product/cart-inc" })')
            dispatch({ type: 'product/cart-inc' })
          }}
        >
          to cart
        </button>
        <button
          className="btn btn--sm btn--danger"
          onClick={() => {
            con.log('')
            con.info('📤 productStore.dispatch({ type: "product/clear" })')
            dispatch({ type: 'product/clear' })
          }}
        >
          clear
        </button>
      </div>
    </div>
  )
}

const ProductList = connect(
  (state: ProductState) => ({
    items: state.items,
    inCart: state.inCart,
  }),
  null,
  null,
  { context: ProductContext as unknown as React.Context<ReactReduxContextValue> }
)(ProductListRaw as any) as React.ComponentType

// ================================================
// App
// ================================================

function App() {
  return (
    <div>
      <div className="context-visual">
        <div className="context-tree">
          &lt;<span className="ctx-user">Provider store={'{userStore}'} context={'{UserContext}'}</span>&gt;<br />
          {'  '}&lt;<span className="ctx-product">Provider store={'{productStore}'} context={'{ProductContext}'}</span>&gt;<br />
          {'    '}&lt;<span className="ctx-comp">UserInfo</span>    /&gt; <span style={{ color: 'var(--text-muted)' }}>// connect(..., { 'context: UserContext' })</span><br />
          {'    '}&lt;<span className="ctx-comp">ProductList</span> /&gt; <span style={{ color: 'var(--text-muted)' }}>// connect(..., { 'context: ProductContext' })</span><br />
          {'  '}&lt;/<span className="ctx-product">Provider</span>&gt;<br />
          &lt;/<span className="ctx-user">Provider</span>&gt;
        </div>
      </div>

      <div className="stores-grid">
        <UserInfo />
        <ProductList />
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={userStore} context={UserContext as any}>
    <Provider store={productStore} context={ProductContext as any}>
      <App />
    </Provider>
  </Provider>
)

// --- Initial log ---

con.info('Два store через options.context')
con.log('')
con.log('UserContext    = React.createContext(null)')
con.log('ProductContext = React.createContext(null)')
con.log('')
con.log('<Provider store={userStore}    context={UserContext}>')
con.log('  <Provider store={productStore} context={ProductContext}>')
con.log('    <UserInfo />    // connect(..., { context: UserContext })')
con.log('    <ProductList /> // connect(..., { context: ProductContext })')
con.log('')
con.log('Dispatch в userStore → ре-рендерится только UserInfo.')
con.log('Dispatch в productStore → ре-рендерится только ProductList.')
con.log('Два независимых Subscription в двух разных контекстах.')
