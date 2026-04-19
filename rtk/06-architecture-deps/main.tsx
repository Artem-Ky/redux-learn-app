import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог зависимостей'
)

interface DepInfo {
  title: string
  role: string
  quote: string
  quoteRu: string
  quoteSource: string
  example: string
}

const DEPS: Record<string, DepInfo> = {
  redux: {
    title: 'redux ^5.0',
    role: 'Базовый слой store. RTK не переписывает Redux — он его оборачивает в более удобный API.',
    quote: 'Redux is a predictable state container for JavaScript apps... It helps you write applications that behave consistently, run in different environments, and are easy to test.',
    quoteRu: 'Redux — это предсказуемый контейнер для state JavaScript-приложений… Он помогает писать приложения, которые ведут себя консистентно, работают в разных окружениях и легко тестируются.',
    quoteSource: 'redux.js.org',
    example: `// configureStore внутри (упрощённо)
import { createStore, combineReducers, applyMiddleware, compose } from 'redux'

export function configureStore(options) {
  const reducer = typeof options.reducer === 'function'
    ? options.reducer
    : combineReducers(options.reducer)

  const middlewareEnhancer = applyMiddleware(...middleware)
  const composer = devToolsCompose || compose

  return createStore(
    reducer,
    options.preloadedState,
    composer(middlewareEnhancer, ...enhancers)
  )
}`,
  },
  immer: {
    title: 'immer ^10.0',
    role: 'Позволяет писать "мутабельный" reducer-код, который Immer превращает в иммутабельное обновление через структурный sharing и Proxy.',
    quote: '"Mutate" your state by simply modifying it while keeping all benefits of immutable data. Immer (German for: always) is a tiny package that allows you to work with immutable state in a more convenient way.',
    quoteRu: '«Мутируйте» state, просто изменяя его, и сохраняйте при этом все преимущества иммутабельных данных. Immer (с немецкого — «всегда») — крошечный пакет, позволяющий работать с иммутабельным state удобнее.',
    quoteSource: 'immerjs.github.io',
    example: `// createReducer внутри использует produce
import { produce } from 'immer'

const reducer = (state = initialState, action) => {
  return produce(state, draft => {
    if (action.type === 'todo/added') {
      draft.todos.push(action.payload)  // ← "мутация"
    }
    if (action.type === 'todo/toggled') {
      const todo = draft.todos.find(t => t.id === action.payload)
      if (todo) todo.done = !todo.done
    }
  })
}

// produce() возвращает новый объект,
// если draft был изменён,
// или ссылку на старый, если нет.`,
  },
  reselect: {
    title: 'reselect ^5.1',
    role: 'Создаёт мемоизированные селекторы. Если входы селектора не изменились (по ===) — возвращает кешированный результат, не пересчитывая.',
    quote: 'Reselect provides a function createSelector for creating memoized selectors. createSelector accepts one or more "input selectors"... and an "output selector" that receives the input selectors\' results as positional arguments.',
    quoteRu: 'Reselect предоставляет функцию createSelector для создания мемоизированных селекторов. createSelector принимает один или несколько «input-селекторов»… и «output-селектор», который получает результаты input-селекторов как позиционные аргументы.',
    quoteSource: 'reselect.js.org',
    example: `import { createSelector } from '@reduxjs/toolkit'
// (реэкспорт из reselect)

const selectTodos = (state) => state.todos.items
const selectFilter = (state) => state.filter

const selectVisibleTodos = createSelector(
  [selectTodos, selectFilter],
  (todos, filter) => {
    console.log('пересчёт!')  // только если todos или filter поменялись
    return todos.filter(t =>
      filter === 'done' ? t.done : !t.done
    )
  }
)

// reselect 5.x: weakMapMemoize по умолчанию,
// поддерживает аргументированные селекторы.`,
  },
  thunk: {
    title: 'redux-thunk ^3.1',
    role: 'Middleware, который позволяет dispatch функцию вместо action. Функция получает (dispatch, getState) и может делать async-логику.',
    quote: 'Thunk middleware for Redux. It allows writing functions with logic inside that can interact with a Redux store\'s dispatch and getState methods.',
    quoteRu: 'Thunk middleware для Redux. Позволяет писать функции с логикой внутри, которые могут обращаться к методам dispatch и getState Redux store.',
    quoteSource: 'github.com/reduxjs/redux-thunk',
    example: `// thunk middleware (исходник)
const createThunkMiddleware = (extraArg) =>
  ({ dispatch, getState }) => (next) => (action) => {
    if (typeof action === 'function') {
      return action(dispatch, getState, extraArg)
    }
    return next(action)
  }

// Использование:
const fetchUser = (id) => async (dispatch, getState) => {
  dispatch({ type: 'user/loading' })
  const user = await api.getUser(id)
  dispatch({ type: 'user/loaded', payload: user })
}

store.dispatch(fetchUser(42))  // ← можно функцию
// thunk включён в RTK по умолчанию.`,
  },
}

const detail = document.getElementById('dep-detail')!

function showDep(key: string): void {
  const d = DEPS[key]
  detail.innerHTML = `
    <div class="detail-pane__title">${escape(d.title)}</div>
    <div class="detail-pane__role">${escape(d.role)}</div>
    <div class="detail-pane__quote">«${escape(d.quote)}» — ${escape(d.quoteSource)}</div>
    <div class="detail-pane__quote detail-pane__quote--ru"><span class="ru-tag">RU</span> «${escape(d.quoteRu)}»</div>
    <div class="detail-pane__example">${escape(d.example)}</div>
  `
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

document.querySelectorAll<HTMLElement>('[data-dep]').forEach((box) => {
  box.addEventListener('click', () => {
    document.querySelectorAll('.arch-box').forEach((b) => b.classList.remove('active'))
    box.classList.add('active')
    const dep = box.dataset.dep!
    showDep(dep)
    con.info(`Открыта зависимость: ${dep}`)
  })
})

con.log('RTK = redux + immer + reselect + redux-thunk + полезные хелперы.')
con.info('Каждая из 4 зависимостей решает одну конкретную задачу.')
con.warn('Не ставьте immer/reselect/thunk отдельно — будут конфликты версий.')
