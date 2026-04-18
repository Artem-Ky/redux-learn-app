import { createContext, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore } from 'redux'
import {
  Provider,
  createStoreHook,
  createDispatchHook,
  createSelectorHook,
} from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Custom contexts ---

const UserContext    = createContext<any>(null)
const ProductContext = createContext<any>(null)

const useUserStore    = createStoreHook(UserContext)
const useUserDispatch = createDispatchHook(UserContext)
const useUserSelector = createSelectorHook(UserContext)

const useProductStore    = createStoreHook(ProductContext)
const useProductDispatch = createDispatchHook(ProductContext)
const useProductSelector = createSelectorHook(ProductContext)

// --- User store ---

interface UserState {
  name: string
  email: string
  loggedIn: boolean
}

type UserAction =
  | { type: 'user/login' }
  | { type: 'user/logout' }
  | { type: 'user/rename'; payload: string }
  | { type: 'user/setEmail'; payload: string }

const userInitial: UserState = {
  name: 'Алексей',
  email: 'alexey@example.com',
  loggedIn: true,
}

function userReducer(state: UserState = userInitial, action: UserAction): UserState {
  switch (action.type) {
    case 'user/login':    return { ...state, loggedIn: true }
    case 'user/logout':   return { ...state, loggedIn: false }
    case 'user/rename':   return { ...state, name: action.payload }
    case 'user/setEmail': return { ...state, email: action.payload }
    default: return state
  }
}

const userStore = createStore(userReducer)

// --- Product store ---

interface Product { id: number; name: string; price: number }
interface ProductState {
  items: Product[]
  selectedId: number | null
}

type ProductAction =
  | { type: 'product/add' }
  | { type: 'product/select'; payload: number }
  | { type: 'product/priceUp'; payload: number }

const productInitial: ProductState = {
  items: [
    { id: 1, name: 'React',      price: 100 },
    { id: 2, name: 'Redux',      price: 150 },
    { id: 3, name: 'TypeScript', price: 200 },
  ],
  selectedId: null,
}

function productReducer(state: ProductState = productInitial, action: ProductAction): ProductState {
  switch (action.type) {
    case 'product/add': {
      const nextId = state.items.length > 0 ? Math.max(...state.items.map(i => i.id)) + 1 : 1
      return { ...state, items: [...state.items, { id: nextId, name: `Product #${nextId}`, price: 50 + nextId * 10 }] }
    }
    case 'product/select':
      return { ...state, selectedId: action.payload }
    case 'product/priceUp':
      return {
        ...state,
        items: state.items.map(i => i.id === action.payload ? { ...i, price: i.price + 10 } : i),
      }
    default: return state
  }
}

const productStore = createStore(productReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — кастомный контекст'
)

// ================================================
// UserProfile — только UserContext
// ================================================

function UserProfile() {
  const { name, email, loggedIn } = useUserSelector((s: UserState) => s)
  const dispatch = useUserDispatch()
  const store    = useUserStore<UserState>()

  const renders = useRef(0)
  renders.current++
  con.info(`[UserProfile] рендер #${renders.current} · name="${name}", email="${email}", loggedIn=${loggedIn}`)

  return (
    <div className="ctx-card ctx-card--user">
      <div className="ctx-card__header">
        <div className="ctx-card__title">&lt;UserProfile /&gt;</div>
        <div className="ctx-card__tag">UserContext</div>
        <div className="ctx-card__renders">рендеров: {renders.current}</div>
      </div>
      <div className="ctx-card__value">
        name: <strong>"{name}"</strong>
      </div>
      <div className="ctx-card__value">
        email: <strong>"{email}"</strong>
      </div>
      <div className="ctx-card__value">
        loggedIn: <strong style={{ color: loggedIn ? 'var(--success)' : 'var(--accent-red)' }}>{String(loggedIn)}</strong>
      </div>
      <div className="ctx-card__buttons">
        <button className="btn btn--sm btn--accent" onClick={() => {
          const names = ['Мария', 'Дмитрий', 'Анна', 'Сергей', 'Алексей']
          const next = names[Math.floor(Math.random() * names.length)]
          con.log(''); con.warn(`userStore.dispatch({ type: "user/rename", payload: "${next}" })`)
          dispatch({ type: 'user/rename', payload: next })
        }}>Сменить имя</button>
        <button className="btn btn--sm" onClick={() => {
          const next = loggedIn ? { type: 'user/logout' as const } : { type: 'user/login' as const }
          con.log(''); con.warn(`userStore.dispatch(${JSON.stringify(next)})`)
          dispatch(next)
        }}>{loggedIn ? 'Выйти' : 'Войти'}</button>
        <button className="btn btn--sm" onClick={() => {
          const snapshot = store.getState()
          con.log(''); con.info(`useUserStore().getState() → ${JSON.stringify(snapshot)}`)
        }}>getState() snapshot</button>
      </div>
    </div>
  )
}

// ================================================
// ProductCatalog — только ProductContext
// ================================================

function ProductCatalog() {
  const items      = useProductSelector((s: ProductState) => s.items)
  const selectedId = useProductSelector((s: ProductState) => s.selectedId)
  const dispatch   = useProductDispatch()
  const store      = useProductStore<ProductState>()

  const renders = useRef(0)
  renders.current++
  con.info(`[ProductCatalog] рендер #${renders.current} · items=${items.length}, selected=${selectedId}`)

  return (
    <div className="ctx-card ctx-card--product">
      <div className="ctx-card__header">
        <div className="ctx-card__title">&lt;ProductCatalog /&gt;</div>
        <div className="ctx-card__tag">ProductContext</div>
        <div className="ctx-card__renders">рендеров: {renders.current}</div>
      </div>
      <ul className="ctx-card__list">
        {items.map(p => (
          <li key={p.id} className={selectedId === p.id ? 'selected' : ''}>
            #{p.id} {p.name} — {p.price}₽
          </li>
        ))}
      </ul>
      <div className="ctx-card__buttons">
        <button className="btn btn--sm" style={{ borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }} onClick={() => {
          con.log(''); con.warn('productStore.dispatch({ type: "product/add" })')
          dispatch({ type: 'product/add' })
        }}>+ товар</button>
        <button className="btn btn--sm" style={{ borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }} onClick={() => {
          const id = items[Math.floor(Math.random() * items.length)]?.id
          if (id == null) return
          con.log(''); con.warn(`productStore.dispatch({ type: "product/select", payload: ${id} })`)
          dispatch({ type: 'product/select', payload: id })
        }}>Выбрать</button>
        <button className="btn btn--sm" style={{ borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }} onClick={() => {
          const id = items[0]?.id
          if (id == null) return
          con.log(''); con.warn(`productStore.dispatch({ type: "product/priceUp", payload: ${id} })`)
          dispatch({ type: 'product/priceUp', payload: id })
        }}>Цена первому +10</button>
        <button className="btn btn--sm" style={{ borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }} onClick={() => {
          const snapshot = store.getState()
          con.log(''); con.info(`useProductStore().getState() → ${JSON.stringify(snapshot)}`)
        }}>getState() snapshot</button>
      </div>
    </div>
  )
}

// ================================================
// CombinedInfo — использует оба контекста одновременно
// ================================================

function CombinedInfo() {
  const userName   = useUserSelector((s: UserState) => s.name)
  const itemsCount = useProductSelector((s: ProductState) => s.items.length)
  const renders = useRef(0)
  renders.current++
  con.log(`[CombinedInfo] рендер #${renders.current} · user="${userName}", items=${itemsCount}`)

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px dashed var(--border-light)',
      borderRadius: 'var(--radius)',
      padding: '10px 14px',
      marginBottom: '12px',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.82rem',
      color: 'var(--text-secondary)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div>
        <span style={{ color: 'var(--accent)' }}>user.name</span> = "{userName}"{' '}
        <span style={{ color: 'var(--text-muted)' }}>·</span>{' '}
        <span style={{ color: 'var(--accent-purple)' }}>products.length</span> = {itemsCount}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
        подписан на ОБА контекста · рендеров: <strong style={{ color: 'var(--accent-cyan)' }}>{renders.current}</strong>
      </div>
    </div>
  )
}

// ================================================
// App
// ================================================

function App() {
  return (
    <div>
      <div className="provider-tree">
{`<Provider store={userStore} context={UserContext}>
  <Provider store={productStore} context={ProductContext}>
    <UserProfile />       → useUserSelector / useUserDispatch / useUserStore
    <ProductCatalog />    → useProductSelector / useProductDispatch / useProductStore
    <CombinedInfo />      → использует оба контекста
  </Provider>
</Provider>`}
      </div>
      <CombinedInfo />
      <div className="ctx-grid">
        <UserProfile />
        <ProductCatalog />
      </div>
    </div>
  )
}

// --- Render ---

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={userStore} context={UserContext}>
    <Provider store={productStore} context={ProductContext}>
      <App />
    </Provider>
  </Provider>
)

// --- Initial log ---

con.info('Урок 47 — кастомный контекст + createHook-функции')
con.log('')
con.log('UserContext    → userStore    → useUserSelector / useUserDispatch / useUserStore')
con.log('ProductContext → productStore → useProductSelector / useProductDispatch / useProductStore')
con.log('')
con.info('Каждый <Provider> поднимает собственный Subscription.')
con.log('Dispatch в userStore НЕ трогает компоненты, подписанные на ProductContext — и наоборот.')
con.log('')
con.log('Нажмите любую кнопку — смотрите, какие компоненты ре-рендерятся.')
