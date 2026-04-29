import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── simulation "store" — отражает счётчики наивного и RTKQ-подходов ──
interface SimState {
  naiveCalls: number
  rtkqCalls: number
  subscribers: number
  cacheEntries: number
  lastDemo: string | null
}
const initial: SimState = { naiveCalls: 0, rtkqCalls: 0, subscribers: 0, cacheEntries: 0, lastDemo: null }

const simSlice = createSlice({
  name: 'sim',
  initialState: initial,
  reducers: {
    naiveHit: (s) => { s.naiveCalls += 1 },
    rtkqHit:  (s) => { s.rtkqCalls += 1 },
    subscribe:   (s) => { s.subscribers += 1 },
    unsubscribe: (s) => { s.subscribers = Math.max(0, s.subscribers - 1) },
    cacheSet:    (s, a: PayloadAction<number>) => { s.cacheEntries = a.payload },
    demoStarted: (s, a: PayloadAction<string>) => { s.lastDemo = a.payload },
    reset: () => initial,
  },
})
const { naiveHit, rtkqHit, subscribe, unsubscribe, cacheSet, demoStarted, reset } = simSlice.actions

const store = configureStore({ reducer: { sim: simSlice.reducer } })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог симуляций фич RTKQ')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── tile rendering ─────────────────────────────────────────────────
const $naive = document.getElementById('stat-naive')!
const $rtkq  = document.getElementById('stat-rtkq')!
const $subs  = document.getElementById('stat-subs')!
const $cache = document.getElementById('stat-cache')!
function renderTiles(): void {
  const s = store.getState().sim
  $naive.textContent = String(s.naiveCalls)
  $rtkq.textContent  = String(s.rtkqCalls)
  $subs.textContent  = String(s.subscribers)
  $cache.textContent = String(s.cacheEntries)
}
renderTiles()
store.subscribe(renderTiles)

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

// ── features ──────────────────────────────────────────────────────
interface Feature {
  id: string
  icon: string
  title: string
  problem: string
  solution: string
  run: () => Promise<void>
}

const features: Feature[] = [
  {
    id: 'loading-state',
    icon: '1',
    title: 'Loading / error / success — авто',
    problem: 'Руками: 3 флага в slice + try/catch в thunk + setLoading(true/false) вокруг каждого fetch',
    solution: 'useGetXQuery возвращает { data, error, isLoading, isFetching, isSuccess, isError } — сам RTKQ переводит состояние',
    run: async () => {
      con.info('[1] loading/error/success. Делаем 1 fetch и смотрим фазы.')
      con.log('   naive: setLoading(true) → fetch → setData/setError → setLoading(false) — 4 диспатча руками')
      store.dispatch(naiveHit())
      await sleep(150)
      con.log('   RTKQ: dispatch(endpoint.initiate()) → middleware всё сделает сам')
      store.dispatch(rtkqHit())
      con.success('   hook выдал isLoading=false, data=…, никаких руками флагов.')
    },
  },
  {
    id: 'dedup',
    icon: '2',
    title: 'Request deduplication',
    problem: 'Два компонента одновременно просят getUser(1) → 2 запроса в сеть',
    solution: 'RTKQ сверяет cacheKey; второй подписчик получает тот же промис, network call = 1',
    run: async () => {
      con.info('[2] dedup. 3 компонента монтятся одновременно и хотят getUser(1).')
      // naive — 3 запроса
      for (let i = 0; i < 3; i += 1) {
        store.dispatch(naiveHit())
        con.log(`   naive → fetch /user/1 (#${i + 1})`)
      }
      // RTKQ — 1 запрос, 3 подписки
      store.dispatch(rtkqHit())
      store.dispatch(cacheSet(1))
      for (let i = 0; i < 3; i += 1) store.dispatch(subscribe())
      con.log('   RTKQ → fetch /user/1 (только #1), подписчики +3 на один cacheEntry')
      await sleep(200)
      for (let i = 0; i < 3; i += 1) store.dispatch(unsubscribe())
      con.success('   3 запроса → 1 запрос: minus 2 network roundtrip')
    },
  },
  {
    id: 'cache-ttl',
    icon: '3',
    title: 'Cache + TTL',
    problem: 'После unmount нужен новый fetch? У тебя нет «вспомнить, что было»',
    solution: 'keepUnusedDataFor (default 60s): после последнего unsubscribe данные живут ещё N секунд',
    run: async () => {
      con.info('[3] keepUnusedDataFor. Монтируем компонент, отписываемся, снова монтируем.')
      con.log('   naive: после unmount — данные потеряны, при remount → новый fetch')
      store.dispatch(naiveHit())
      await sleep(150)
      store.dispatch(naiveHit())
      con.log('   RTKQ: отписка → данные живут 60s в state.api.queries; remount → cache HIT, network call = 0')
      store.dispatch(rtkqHit())
      store.dispatch(cacheSet(1))
      store.dispatch(subscribe())
      await sleep(100)
      store.dispatch(unsubscribe())
      con.warn('   подписок = 0, но cache остался (remount в пределах TTL = HIT)')
      await sleep(200)
      store.dispatch(subscribe())
      con.success('   remount → cache HIT, никакого fetch')
      await sleep(50)
      store.dispatch(unsubscribe())
    },
  },
  {
    id: 'refetch-focus',
    icon: '4',
    title: 'refetchOnFocus / Reconnect',
    problem: 'Юзер открыл вкладку через час — данные устарели, но ты не знаешь',
    solution: 'setupListeners(store.dispatch) + refetchOnFocus: true → focus event → tagged queries рефетчатся',
    run: async () => {
      con.info('[4] refetchOnFocus. Юзер переключил таб и вернулся.')
      con.log('   naive: данные в state — те же, stale; нужна ручная логика window.focus')
      store.dispatch(naiveHit())
      con.log('   RTKQ: setupListeners + refetchOnFocus. Focus event → RTKQ сам диспатчит refetch')
      store.dispatch(rtkqHit())
      await sleep(100)
      con.success('   fresh data без единой строки кода в компоненте')
    },
  },
  {
    id: 'polling',
    icon: '5',
    title: 'Polling',
    problem: 'Хочешь обновлять раз в 30с — пишешь useEffect + setInterval + cleanup',
    solution: 'useGetXQuery(arg, { pollingInterval: 30000 }) — одна опция',
    run: async () => {
      con.info('[5] polling каждые 50мс (условно — 30с в проде).')
      con.log('   naive: useEffect(() => setInterval(fetch, 30_000), []) + cleanup...')
      store.dispatch(naiveHit())
      con.log('   RTKQ: одна опция pollingInterval. Авто-stop при unmount.')
      for (let i = 0; i < 3; i += 1) {
        await sleep(60)
        store.dispatch(rtkqHit())
        con.log(`   poll tick #${i + 1} → refetch`)
      }
      con.success('   RTKQ сам очистит таймер при unmount последнего подписчика')
    },
  },
  {
    id: 'optimistic',
    icon: '6',
    title: 'Optimistic updates',
    problem: 'Toggle like — ждать 500ms роунд-трипа = плохой UX',
    solution: 'onQueryStarted: dispatch(api.util.updateQueryData(...)) → UI обновился мгновенно, в catch — patch.undo()',
    run: async () => {
      con.info('[6] optimistic like. UI меняется ДО ответа сервера.')
      con.log('   naive: ждёшь 500ms → потом обновляешь state')
      store.dispatch(naiveHit())
      await sleep(80)
      con.log('   RTKQ: updateQueryData(\"getPost\", id, draft => { draft.likes += 1 })')
      store.dispatch(rtkqHit())
      con.success('   UI мгновенно + откат через patch.undo() при fail')
    },
  },
  {
    id: 'lifecycle',
    icon: '7',
    title: 'Lifecycle hooks (onCacheEntryAdded)',
    problem: 'Websocket для live-обновлений чата — открыть / слушать / закрыть на unmount',
    solution: 'onCacheEntryAdded(arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) — всё в endpoint',
    run: async () => {
      con.info('[7] lifecycle. Endpoint сам держит websocket.')
      con.log('   naive: открыть ws в useEffect, cleanup в return, merge с state — boilerplate')
      store.dispatch(naiveHit())
      await sleep(80)
      con.log('   RTKQ: ws.open() в cacheDataLoaded, ws.close() в cacheEntryRemoved')
      store.dispatch(rtkqHit())
      store.dispatch(subscribe())
      await sleep(100)
      store.dispatch(unsubscribe())
      con.success('   подробнее — урок 94 (Streaming)')
    },
  },
]

// ── render cards ──────────────────────────────────────────────────
const grid = document.getElementById('feature-grid')!
features.forEach((f) => {
  const card = document.createElement('div')
  card.className = 'feature-card'
  card.innerHTML = `
    <div class="feature-card__title">
      <span class="feature-card__icon">#${f.icon}</span>
      ${f.title}
    </div>
    <div class="feature-card__problem">naive: ${f.problem}</div>
    <div class="feature-card__solution">RTKQ: ${f.solution}</div>
    <button class="btn btn--accent feature-card__run">▶ Показать в консоли</button>
  `
  const btn = card.querySelector('button')!
  btn.addEventListener('click', async () => {
    btn.setAttribute('disabled', 'true')
    store.dispatch(demoStarted(f.id))
    con.clear()
    await f.run()
    btn.removeAttribute('disabled')
  })
  grid.appendChild(card)
})

// ── reset button ──────────────────────────────────────────────────
document.getElementById('reset-all')!.addEventListener('click', () => {
  store.dispatch(reset())
  con.clear()
  con.info('Счётчики сброшены.')
})

con.info('Клик «Показать» на любой карточке — симуляция в логе + инкремент naive/rtkq счётчиков.')
con.info('RTKQ — это cache layer поверх твоего REST/GraphQL API. Уроки 80–88 — как это настраивается.')
