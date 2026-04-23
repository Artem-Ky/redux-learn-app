import {
  autoBatchEnhancer,
  configureStore,
  createSlice,
  prepareAutoBatched,
  type Action,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

type QueueType = 'raf' | 'tick' | 'timer' | 'callback'

interface CounterState { counter: number }
const initial: CounterState = { counter: 0 }

const slice = createSlice({
  name: 'demo',
  initialState: initial,
  reducers: {
    // Обычный экшен — без SHOULD_AUTOBATCH: каждый dispatch → уведомление
    tickNormal: (s, a: PayloadAction<number>) => { s.counter += a.payload },
    // Batched: prepare проставляет meta[RTK_autoBatch] = true
    tickBatched: {
      reducer: (s, a: PayloadAction<number>) => { s.counter += a.payload },
      prepare: (amount: number) => {
        const base = prepareAutoBatched<number>()(amount)
        return { ...base, meta: { ...(base.meta as object), requested: true } }
      },
    },
    resetCounter: () => initial,
  },
})
const { tickNormal, tickBatched, resetCounter } = slice.actions

// Строим store динамически — при смене типа очереди пересоздаём.
// Нам нужен autoBatchEnhancer с выбранным type; default getDefaultEnhancers
// даёт 'raf' — для остальных типов подменяем enhancer вручную.

function buildStore(queueType: QueueType) {
  return configureStore({
    reducer: { demo: slice.reducer },
    enhancers: (getDefault) => {
      if (queueType === 'raf') {
        return getDefault() // дефолтный autoBatch({ type: 'raf' })
      }
      if (queueType === 'callback') {
        // Очередь с ручной функцией — сделаем microtask через Promise.resolve
        return getDefault({
          autoBatch: {
            type: 'callback',
            queueNotification: (notify) => {
              Promise.resolve().then(notify)
            },
          },
        })
      }
      if (queueType === 'timer') {
        return getDefault({ autoBatch: { type: 'timer', timeout: 0 } })
      }
      // tick
      return getDefault({ autoBatch: { type: 'tick' } })
    },
  })
}

// ── DOM ─────────────────────────────────────────────────────────────
const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог autoBatch')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)

const mDispatches = document.getElementById('m-dispatches')!
const mSubs = document.getElementById('m-subs')!
const mRatio = document.getElementById('m-ratio')!
const mState = document.getElementById('m-state')!
const queueSelect = document.getElementById('queue-select')!

let dispatches = 0
let notifications = 0
let queueType: QueueType = 'raf'
let store = buildStore(queueType)
let unsubSnapshot: (() => void) | null = null

function wireSubscriber(s: ReturnType<typeof buildStore>): void {
  const unsub = s.subscribe(() => {
    notifications += 1
    flashAndRender()
  })
  unsubSnapshot = unsub
}

function flashAndRender(): void {
  mSubs.textContent = String(notifications)
  mDispatches.textContent = String(dispatches)
  const ratio = notifications === 0
    ? '—'
    : (dispatches / notifications).toFixed(1) + '×'
  mRatio.textContent = ratio
  mState.textContent = String(store.getState().demo.counter)

  mSubs.classList.remove('flash-count')
  void mSubs.offsetWidth
  mSubs.classList.add('flash-count')
}

function rebuildStore(newType: QueueType): void {
  queueType = newType
  if (unsubSnapshot) unsubSnapshot()
  dispatches = 0
  notifications = 0
  store = buildStore(newType)
  wireSubscriber(store)
  dev.connectStore(store)
  flashAndRender()
  con.info(`Пересобрал store с queue type = ${newType}`)
  highlightActive()
}

function highlightActive(): void {
  queueSelect.querySelectorAll('label').forEach((lb) => {
    const t = lb.getAttribute('data-type')
    lb.classList.toggle('active', t === queueType)
  })
}

wireSubscriber(store)
dev.connectStore(store)
highlightActive()
flashAndRender()

queueSelect.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement
  if (target.name === 'queue') {
    rebuildStore(target.value as QueueType)
  }
})

// ── BUTTONS ─────────────────────────────────────────────────────────

document.getElementById('btn-normal')!.addEventListener('click', () => {
  con.warn('Диспатчу 100 обычных actions — ожидаю ~100 notifications')
  const before = notifications
  for (let i = 0; i < 100; i += 1) {
    const a: Action = tickNormal(1)
    store.dispatch(a)
    dispatches += 1
  }
  // Логируем через небольшой timeout, чтобы дать возможным отложенным
  // уведомлениям (если такие есть) долететь.
  setTimeout(() => {
    con.log(`После 100 normal dispatch: notifications += ${notifications - before}`)
  }, 50)
})

document.getElementById('btn-batched')!.addEventListener('click', () => {
  con.success('Диспатчу 100 auto-batched actions — ожидаю 1 notification')
  const before = notifications
  for (let i = 0; i < 100; i += 1) {
    const a = tickBatched(1)
    store.dispatch(a)
    dispatches += 1
  }
  // Для raf уведомление придёт в следующем кадре, для tick — в микро-задаче, для timer — через 0ms.
  const waitMs = queueType === 'raf' ? 40 : 10
  setTimeout(() => {
    con.log(`После 100 batched dispatch: notifications += ${notifications - before} (ожидалось 1)`)
  }, waitMs)
})

document.getElementById('btn-mixed')!.addEventListener('click', () => {
  con.info('50 batched → затем 1 normal (flush!)')
  const before = notifications
  for (let i = 0; i < 50; i += 1) {
    store.dispatch(tickBatched(1))
    dispatches += 1
  }
  // Микрозадача/raf ещё не успела выстрелить.
  // Следующий обычный dispatch должен СИНХРОННО flush'ить накопленное.
  const notifBeforeNormal = notifications
  store.dispatch(tickNormal(100))
  dispatches += 1
  const notifAfterNormal = notifications

  con.log(
    `после 50 batched: notif = ${notifBeforeNormal - before}, ` +
    `после следующего normal: notif = ${notifAfterNormal - before} ` +
    `(синхронный flush: +${notifAfterNormal - notifBeforeNormal})`,
  )
  // Доп. задержка — убедиться, что scheduled notifyListeners стал no-op
  const waitMs = queueType === 'raf' ? 40 : 10
  setTimeout(() => {
    con.log(`Через ${waitMs}мс: notifications total = ${notifications - before}`)
  }, waitMs)
})

document.getElementById('btn-reset')!.addEventListener('click', () => {
  store.dispatch(resetCounter())
  dispatches = 0
  notifications = 0
  flashAndRender()
  con.info('reset metrics & counter')
})

con.log('Попробуй: 1) 100 normal — увидишь 100 notifications. 2) 100 batched — 1 notification.')
con.log('3) mixed — накопленное уведомление flush\'ится синхронно прямо перед обычным экшеном.')
con.info('Поменяй тип очереди в radio: raf (16ms) vs tick (microtask) vs timer (0 macrotask) vs callback (custom)')

// Мы используем autoBatchEnhancer напрямую (type-reference)
// чтобы TS не выкинул unused import:
void autoBatchEnhancer
