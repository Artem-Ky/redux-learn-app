import { configureStore, createAction, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

const userLoggedOut = createAction('auth/userLoggedOut')

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] as string[] },
  reducers: {
    addItem: (s, a: PayloadAction<string>) => { s.items.push(a.payload) },
  },
  extraReducers: (b) => {
    b.addCase(userLoggedOut, (s) => { s.items = []; events.push(`[cart] reset on userLoggedOut`) })
  },
})

const profileSlice = createSlice({
  name: 'profile',
  initialState: { name: '', avatar: '' },
  reducers: {
    setName:   (s, a: PayloadAction<string>) => { s.name = a.payload },
    setAvatar: (s, a: PayloadAction<string>) => { s.avatar = a.payload },
  },
  extraReducers: (b) => {
    b.addCase(userLoggedOut, () => { events.push(`[profile] reset on userLoggedOut`); return { name: '', avatar: '' } })
  },
})

const prefsSlice = createSlice({
  name: 'preferences',
  initialState: { theme: 'light', lang: 'ru' },
  reducers: {
    setTheme: (s, a: PayloadAction<string>) => { s.theme = a.payload },
  },
  extraReducers: (b) => {
    b.addCase(userLoggedOut, () => { events.push(`[preferences] reset on userLoggedOut`); return { theme: 'light', lang: 'ru' } })
  },
})

const events: string[] = []

const store = configureStore({
  reducer: {
    cart: cartSlice.reducer,
    profile: profileSlice.reducer,
    preferences: prefsSlice.reducer,
  },
})

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог extraReducers')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const cartEl = document.getElementById('cart-state')!
const profileEl = document.getElementById('profile-state')!
const prefsEl = document.getElementById('prefs-state')!
const logEl = document.getElementById('event-log')!

function render(): void {
  const s = store.getState()
  cartEl.textContent = JSON.stringify(s.cart, null, 2)
  profileEl.textContent = JSON.stringify(s.profile, null, 2)
  prefsEl.textContent = JSON.stringify(s.preferences, null, 2)
  logEl.textContent = events.length ? events.join('\n') : '— ещё нет событий —'
}
render()
store.subscribe(render)

document.getElementById('add-item')!.addEventListener('click', () => {
  const a = cartSlice.actions.addItem('Apple')
  store.dispatch(a)
  events.push(`[cart] addItem("Apple")`)
  con.action(a)
})

document.getElementById('set-name')!.addEventListener('click', () => {
  const a = profileSlice.actions.setName('Alice')
  store.dispatch(a)
  events.push(`[profile] setName("Alice")`)
  con.action(a)
})

document.getElementById('set-theme')!.addEventListener('click', () => {
  const a = prefsSlice.actions.setTheme('dark')
  store.dispatch(a)
  events.push(`[preferences] setTheme("dark")`)
  con.action(a)
})

document.getElementById('logout')!.addEventListener('click', () => {
  events.push(`>>> dispatch(userLoggedOut())`)
  const a = userLoggedOut()
  store.dispatch(a)
  con.action(a)
  con.warn('Один dispatch — три slice сбросились через extraReducers')
})

con.log('Заполните slice'+'ы → нажмите userLoggedOut → все 3 сбросятся.')
con.info('cart, profile, preferences — каждый имеет свой extraReducers.addCase(userLoggedOut, reset).')
