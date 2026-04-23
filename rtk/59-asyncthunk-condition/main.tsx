import { configureStore, createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface Post { id: number; title: string }
interface PostsState {
  loading: 'idle' | 'pending'
  list: Post[]
  clicks: number            // сколько раз нажали
  fetches: number           // сколько раз реально пошли в сеть
  skipped: number           // сколько раз condition отказал
  lastCondition: boolean | null
}

const initial: PostsState = {
  loading: 'idle',
  list: [],
  clicks: 0,
  fetches: 0,
  skipped: 0,
  lastCondition: null,
}

// Флаг — динамически меняем dispatchConditionRejection без пересоздания store
let dispatchConditionRejection = false
let realFetchCount = 0

function fakeFetchPosts(): Promise<Post[]> {
  realFetchCount++
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, title: `Post batch #${realFetchCount}` },
        { id: 2, title: 'Lorem ipsum' },
      ])
    }, 1200)
  })
}

// Используем options-object, но condition читает динамический флаг — мы пересоздадим thunk.
// Проще: зафиксировать condition, а dispatchConditionRejection обновлять — это невозможно
// без пересоздания. Самое простое — пересоздавать thunk при каждом click.
// Лучший вариант: обернуть — создаём thunk один раз, options.dispatchConditionRejection
// берём из функции-константы, а RTK читает её один раз при создании.
//
// Решение: держим ДВА thunk'а — с флагом и без — и выбираем по чекбоксу.

function mkThunk(withDcr: boolean) {
  return createAsyncThunk<
    Post[],
    void,
    { state: { posts: PostsState } }
  >(
    withDcr ? 'posts/fetchDCR' : 'posts/fetch',
    async () => fakeFetchPosts(),
    {
      condition: (_arg, { getState }) => {
        const s = getState().posts
        // Если уже идёт запрос — пропускаем
        return s.loading !== 'pending'
      },
      dispatchConditionRejection: withDcr,
    },
  )
}

const fetchPosts = mkThunk(false)
const fetchPostsDCR = mkThunk(true)

const postsSlice = createSlice({
  name: 'posts',
  initialState: initial,
  reducers: {
    reset: () => initial,
    click: (s) => { s.clicks++ },
    markSkipped: (s) => { s.skipped++ },
  },
  extraReducers: (b) => {
    const addTrio = (t: typeof fetchPosts) => {
      b.addCase(t.pending,   (s) => {
        s.loading = 'pending'
        s.fetches++
        s.lastCondition = null  // pending ⇒ condition сработал true (или не было)
      })
      b.addCase(t.fulfilled, (s, a) => {
        s.loading = 'idle'
        s.list = a.payload
      })
      b.addCase(t.rejected,  (s, a) => {
        s.loading = 'idle'
        s.lastCondition = a.meta.condition
      })
    }
    addTrio(fetchPosts)
    addTrio(fetchPostsDCR)
  },
})

const store = configureStore({
  reducer: { posts: postsSlice.reducer },
})

type RootState = ReturnType<typeof store.getState>
type AppDispatch = typeof store.dispatch

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог condition')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// UI elements
const cntClicks   = document.getElementById('cnt-clicks')!
const cntFetches  = document.getElementById('cnt-fetches')!
const cntSkipped  = document.getElementById('cnt-skipped')!
const stateOut    = document.getElementById('state-out')!
const toggleDcr   = document.getElementById('toggle-dcr') as HTMLInputElement

function render(): void {
  const s: RootState = store.getState()
  cntClicks.textContent = String(s.posts.clicks)
  cntFetches.textContent = String(s.posts.fetches)
  cntSkipped.textContent = String(s.posts.skipped)
  stateOut.textContent = JSON.stringify(s, null, 2)
}
render()
store.subscribe(render)

// Логирование dispatch
const origDispatch = store.dispatch
;(store as { dispatch: AppDispatch }).dispatch = ((a: unknown) => {
  const res = origDispatch(a as Parameters<AppDispatch>[0])
  if (typeof a !== 'function') {
    const action = a as { type?: string; meta?: { condition?: boolean } }
    if (action.type) {
      con.action({ type: action.type })
      if (action.meta?.condition) con.warn(`  meta.condition === true — rejected БЫЛ задиспатчен (dispatchConditionRejection=true)`)
    }
  }
  return res
}) as AppDispatch

toggleDcr.addEventListener('change', () => {
  dispatchConditionRejection = toggleDcr.checked
  con.info(`dispatchConditionRejection → ${dispatchConditionRejection}. Следующие клики используют ${dispatchConditionRejection ? 'posts/fetchDCR' : 'posts/fetch'} thunk.`)
})

document.getElementById('fetch-spam')!.addEventListener('click', async () => {
  store.dispatch(postsSlice.actions.click())
  const thunk = dispatchConditionRejection ? fetchPostsDCR : fetchPosts
  const result = await store.dispatch(thunk())
  // Проверяем, был ли запрос пропущен condition'ом
  if (thunk.rejected.match(result) && result.meta.condition) {
    store.dispatch(postsSlice.actions.markSkipped())
    con.warn(`→ condition вернул false. pending НЕ был задиспатчен. ConditionError: "${result.error.message ?? ''}"`)
  } else if (thunk.fulfilled.match(result)) {
    con.success(`→ fetch завершён: ${result.payload.length} posts.`)
  }
})

document.getElementById('reset')!.addEventListener('click', () => {
  store.dispatch(postsSlice.actions.reset())
  realFetchCount = 0
  con.log('— Сброс —')
})

con.log('Задача: спамьте "Fetch posts" — condition не пустит второй запрос, пока идёт первый.')
con.info('condition: (arg, {getState}) => getState().posts.loading !== "pending"')
con.info('По умолчанию dispatchConditionRejection=false → rejected НЕ диспатчится (меньше мусора).')
con.info('Включите чекбокс — rejected появится с meta.condition=true.')
