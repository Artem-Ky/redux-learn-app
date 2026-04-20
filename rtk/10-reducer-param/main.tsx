import {
  configureStore,
  createSlice,
  combineReducers,
  type Reducer,
  type Action,
  type EnhancedStore,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface CounterState { value: number }
interface TodosState { items: string[] }

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 } as CounterState,
  reducers: { incremented: (s) => { s.value += 1 } },
})

const todosSlice = createSlice({
  name: 'todos',
  initialState: { items: [] as string[] } as TodosState,
  reducers: {
    added: (s, a: { payload: string }) => { s.items.push(a.payload) },
  },
})

type RootState = { counter: CounterState; todos: TodosState }

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог формы reducer')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)

let currentForm: 'object' | 'combine' | 'single' = 'object'
let store: EnhancedStore<RootState>

const rootReducerSingle: Reducer<RootState, Action> = (state, action) => ({
  counter: counterSlice.reducer(state?.counter, action),
  todos: todosSlice.reducer(state?.todos, action),
})

function buildStore(form: typeof currentForm): EnhancedStore<RootState> {
  switch (form) {
    case 'object':
      return configureStore({
        reducer: { counter: counterSlice.reducer, todos: todosSlice.reducer },
      }) as EnhancedStore<RootState>
    case 'combine':
      return configureStore({
        reducer: combineReducers({ counter: counterSlice.reducer, todos: todosSlice.reducer }),
      }) as EnhancedStore<RootState>
    case 'single':
      return configureStore({ reducer: rootReducerSingle }) as EnhancedStore<RootState>
  }
}

const FORMS: Record<typeof currentForm, { display: string; code: string; note: string }> = {
  object: {
    display: '{ counter, todos }',
    code: `{
  counter: counterSlice.reducer,
  todos: todosSlice.reducer,
}

// configureStore внутри сделает:
//   combineReducers({ counter, todos })`,
    note: 'Самый частый и рекомендуемый вариант. RTK сам вызовет combineReducers().',
  },
  combine: {
    display: 'combineReducers({...})',
    code: `combineReducers({
  counter: counterSlice.reducer,
  todos: todosSlice.reducer,
})

// Полный контроль над rootReducer.
// Можно обернуть для reset / hydration.`,
    note: 'Полезно если хотите явно работать с rootReducer (например, обернуть для resetState).',
  },
  single: {
    display: '(state, action) => state',
    code: `(state, action) => ({
  counter: counterSlice.reducer(state?.counter, action),
  todos: todosSlice.reducer(state?.todos, action),
})

// Вы сами решаете как собирать state.
// Без combineReducers вообще.`,
    note: 'Низкоуровневый вариант. Подходит для очень простых случаев или нестандартных rootReducer.',
  },
}

function recreate(): void {
  store = buildStore(currentForm)
  dev.clear()
  dev.connectStore(store)

  const f = FORMS[currentForm]
  document.getElementById('form-display')!.textContent = f.display
  document.getElementById('form-code')!.textContent = f.code
  document.getElementById('form-note')!.textContent = f.note
  updateShape()

  con.success(`Store пересоздан. Форма: ${currentForm}.`)
}

function updateShape(): void {
  const s = store.getState()
  document.getElementById('state-shape')!.textContent = JSON.stringify(s, null, 2)
}

document.querySelectorAll<HTMLButtonElement>('.switcher__btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.switcher__btn').forEach((b) => b.classList.remove('active'))
    btn.classList.add('active')
    currentForm = btn.dataset.form as typeof currentForm
    recreate()
  })
})

document.getElementById('dispatch-counter')!.addEventListener('click', () => {
  const a = counterSlice.actions.incremented()
  store.dispatch(a)
  con.action(a)
  updateShape()
})

document.getElementById('dispatch-todo')!.addEventListener('click', () => {
  const text = `task ${store.getState().todos.items.length + 1}`
  const a = todosSlice.actions.added(text)
  store.dispatch(a)
  con.action(a)
  updateShape()
})

document.getElementById('recreate')!.addEventListener('click', () => recreate())

recreate()
con.log('Все 3 формы дают одинаковый state shape. Кликайте кнопки и проверяйте.')
con.info('combineReducers — главный helper, без него state не объединится.')
