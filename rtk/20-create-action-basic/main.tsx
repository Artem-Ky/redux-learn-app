import { configureStore, createAction, createReducer } from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

const tick = createAction('timer/tick')

const reducer = createReducer({ count: 0 }, (builder) => {
  builder.addCase(tick, (state) => { state.count += 1 })
})

const store = configureStore({ reducer: { timer: reducer } })

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог createAction')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

const action = tick()
const other = { type: 'something/else' }

document.getElementById('info-typeof')!.textContent = typeof tick
document.getElementById('info-type')!.textContent = `"${tick.type}"`
document.getElementById('info-tostring')!.textContent = `"${tick.toString()}"`
document.getElementById('info-template')!.textContent = `"${`${tick}`}"`
document.getElementById('info-match-type')!.textContent = typeof tick.match

document.getElementById('info-action')!.textContent = JSON.stringify(action)
document.getElementById('info-action-type')!.textContent = `"${action.type}"`
document.getElementById('info-action-payload')!.textContent = String(action.payload)
document.getElementById('info-match-true')!.textContent = String(tick.match(action))
document.getElementById('info-match-false')!.textContent = String(tick.match(other))

document.getElementById('dispatch-tick')!.addEventListener('click', () => {
  const a = tick()
  store.dispatch(a)
  con.action(a)
  con.info(`tick.match(action) = ${tick.match(a)}`)
})

document.getElementById('dispatch-other')!.addEventListener('click', () => {
  const a = { type: 'other' }
  store.dispatch(a)
  con.action(a)
  con.warn(`tick.match(action) = ${tick.match(a)} — reducer его не обработал, state не изменился`)
})

con.log('createAction создаёт функцию + 3 полезных свойства на ней: .type, .toString, .match.')
con.info('.match работает как type-guard — сужает TS-тип action.')
con.success('Кликайте кнопки и смотрите вкладку Action/Diff в DevTools.')
