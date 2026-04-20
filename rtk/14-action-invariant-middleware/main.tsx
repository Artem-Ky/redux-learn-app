import { configureStore, createSlice, type EnhancedStore } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

const slice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: { increment: (s) => { s.value += 1 } },
})

const { increment } = slice.actions

const store = configureStore({
  reducer: { counter: slice.reducer },
}) as EnhancedStore<{ counter: { value: number } }>

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог action invariant')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const errOut = document.getElementById('err-out')!

const origWarn = console.warn.bind(console)
let lastWarning = ''
console.warn = (...args: unknown[]) => {
  lastWarning = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')
  origWarn(...args)
}

function show(level: 'warn' | 'ok', msg: string): void {
  errOut.classList.remove('warn', 'ok')
  errOut.classList.add(level)
  errOut.textContent = msg
}

document.querySelector('[data-mode="forgot"]')!.addEventListener('click', () => {
  lastWarning = ''
  con.warn('dispatch(increment) — БЕЗ скобок. Передаём саму функцию.')
  try {
    store.dispatch(increment as unknown as ReturnType<typeof increment>)
  } catch (e) {
    con.error((e as Error).message)
  }

  setTimeout(() => {
    if (lastWarning) {
      show('warn', `⚠ middleware заметил:\n${lastWarning.slice(0, 400)}`)
    } else {
      show('warn', '⚠ Без middleware вы бы ничего не увидели — state не изменился, action.type === undefined.')
    }
    con.info(`value сейчас = ${store.getState().counter.value} (мог бы измениться, если бы action прошёл)`)
  }, 50)
})

document.querySelector('[data-mode="ok"]')!.addEventListener('click', () => {
  lastWarning = ''
  const a = increment()
  con.info(`dispatch(increment()) — со () — получили action: ${JSON.stringify(a)}`)
  store.dispatch(a)
  con.action(a)
  setTimeout(() => {
    show('ok', `✓ ok: action прошёл, value стал ${store.getState().counter.value}.`)
  }, 50)
})

document.querySelector('[data-mode="connect"]')!.addEventListener('click', () => {
  lastWarning = ''
  con.warn('Имитация connect: mapDispatchToProps = { increment } — без bindActionCreators.')
  con.info('При вызове из props.increment — это будет dispatch(increment) без вызова. Воспроизведём:')
  const mapDispatchProps = { increment }
  store.dispatch(mapDispatchProps.increment as unknown as ReturnType<typeof increment>)

  setTimeout(() => {
    show('warn', `⚠ ${lastWarning ? lastWarning.slice(0, 400) : 'middleware поймал dispatch функции вместо action.'}`)
    con.info('Решение: используйте bindActionCreators({ increment }, dispatch), либо ручную обёртку.')
  }, 50)
})

document.querySelector('[data-mode="tostring"]')!.addEventListener('click', () => {
  const t = String(increment)
  con.success(`increment.type = "${increment.type}"`)
  con.success(`String(increment) = "${t}" (вызывает увидеть .toString → возвращает type)`)
  show('ok', `Утилита toString:
increment.type   → "${increment.type}"
String(increment) → "${t}"
[increment.type]: handler   ✓
[increment]: handler        ✓ (использует toString автоматически)`)
})

con.log('Кликайте сценарии — middleware покажет warning или пропустит.')
con.info('Это middleware не throw, а console.warn — action всё равно проходит дальше.')
