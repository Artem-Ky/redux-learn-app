import React, { useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore } from 'redux'
import { Provider, createSelectorHook, createDispatchHook } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

// --- Custom Contexts ---

const UserContext = React.createContext<any>(null)
const ProductContext = React.createContext<any>(null)

const useUserSelector = createSelectorHook(UserContext)
const useUserDispatch = createDispatchHook(UserContext)
const useProductSelector = createSelectorHook(ProductContext)
const useProductDispatch = createDispatchHook(ProductContext)

// --- User Store ---

interface UserState {
  name: string
  loggedIn: boolean
}

const userInitial: UserState = { name: 'Алексей', loggedIn: true }

function userReducer(state = userInitial, action: { type: string; payload?: string }): UserState {
  switch (action.type) {
    case 'user/login':
      return { ...state, loggedIn: true }
    case 'user/logout':
      return { ...state, loggedIn: false }
    case 'user/rename':
      return { ...state, name: action.payload ?? state.name }
    default:
      return state
  }
}

const userStore = createStore(userReducer)

// --- Product Store ---

interface ProductState {
  items: string[]
  selectedIndex: number
}

const productInitial: ProductState = {
  items: ['React', 'Redux', 'TypeScript', 'Vite'],
  selectedIndex: -1,
}

function productReducer(
  state = productInitial,
  action: { type: string; payload?: number }
): ProductState {
  switch (action.type) {
    case 'product/select':
      return { ...state, selectedIndex: action.payload ?? -1 }
    case 'product/add':
      return { ...state, items: [...state.items, `Item #${state.items.length + 1}`] }
    default:
      return state
  }
}

const productStore = createStore(productReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — Множественные store'
)

// --- Components ---

function UserProfile() {
  const { name, loggedIn } = useUserSelector((s: UserState) => s)
  const dispatch = useUserDispatch()
  const renders = useRef(0)
  renders.current++

  con.info(`<UserProfile> рендер #${renders.current} — name="${name}", loggedIn=${loggedIn}`)

  return (
    <div style={{
      background: 'var(--bg-panel)', border: '2px solid var(--accent)',
      borderRadius: 'var(--radius)', padding: '16px', marginBottom: '12px',
    }}>
      <div style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>&lt;UserProfile /&gt;</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(86,156,214,0.15)', border: '1px solid var(--accent)' }}>
          UserContext
        </span>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', marginLeft: 'auto' }}>
          рендеров: {renders.current}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
        name: <span style={{ color: 'var(--accent-cyan)' }}>"{name}"</span>,
        loggedIn: <span style={{ color: loggedIn ? 'var(--success)' : 'var(--error)' }}>{String(loggedIn)}</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button className="btn btn--sm btn--accent" onClick={() => {
          con.log('────────────────────────────')
          con.warn('userStore.dispatch({ type: "user/logout" })')
          dispatch({ type: 'user/logout' })
        }}>Выйти</button>
        <button className="btn btn--sm" onClick={() => {
          con.log('────────────────────────────')
          con.warn('userStore.dispatch({ type: "user/login" })')
          dispatch({ type: 'user/login' })
        }}>Войти</button>
        <button className="btn btn--sm" onClick={() => {
          const names = ['Мария', 'Дмитрий', 'Анна', 'Сергей', 'Алексей']
          const newName = names[Math.floor(Math.random() * names.length)]
          con.log('────────────────────────────')
          con.warn(`userStore.dispatch({ type: "user/rename", payload: "${newName}" })`)
          dispatch({ type: 'user/rename', payload: newName })
        }}>Сменить имя</button>
      </div>
    </div>
  )
}

function ProductCatalog() {
  const { items, selectedIndex } = useProductSelector((s: ProductState) => s)
  const dispatch = useProductDispatch()
  const renders = useRef(0)
  renders.current++

  con.info(`<ProductCatalog> рендер #${renders.current} — items=${items.length}, selected=${selectedIndex}`)

  return (
    <div style={{
      background: 'var(--bg-panel)', border: '2px solid var(--accent-purple)',
      borderRadius: 'var(--radius)', padding: '16px',
    }}>
      <div style={{ color: 'var(--accent-purple)', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>&lt;ProductCatalog /&gt;</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(197,134,192,0.15)', border: '1px solid var(--accent-purple)' }}>
          ProductContext
        </span>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', marginLeft: 'auto' }}>
          рендеров: {renders.current}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {items.map((item, i) => (
          <button
            key={i}
            className="btn btn--sm"
            style={{
              borderColor: selectedIndex === i ? 'var(--accent-purple)' : undefined,
              color: selectedIndex === i ? 'var(--accent-purple)' : undefined,
              background: selectedIndex === i ? 'rgba(197,134,192,0.1)' : undefined,
            }}
            onClick={() => {
              con.log('────────────────────────────')
              con.warn(`productStore.dispatch({ type: "product/select", payload: ${i} })`)
              dispatch({ type: 'product/select', payload: i })
            }}
          >
            {item}
          </button>
        ))}
      </div>
      <button className="btn btn--sm" style={{ borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }} onClick={() => {
        con.log('────────────────────────────')
        con.warn('productStore.dispatch({ type: "product/add" })')
        dispatch({ type: 'product/add' })
      }}>
        + Добавить товар
      </button>
    </div>
  )
}

function App() {
  return (
    <div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '0.85rem' }}>
        Dispatch в один store не вызывает ре-рендер компонентов другого store.
        Следите за счётчиком рендеров!
      </p>
      <UserProfile />
      <ProductCatalog />
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

con.info('Урок 11: Множественные Provider и кастомные контексты')
con.log('')
con.log('Два независимых store:')
con.log('  userStore    → UserContext    → <UserProfile />')
con.log('  productStore → ProductContext → <ProductCatalog />')
con.log('')
con.info('Dispatch в один store НЕ затрагивает другой.')
con.log('Попробуйте нажать кнопки — следите за счётчиком рендеров.')
