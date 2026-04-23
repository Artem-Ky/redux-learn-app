import {
  configureStore,
  createEntityAdapter,
  createSlice,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface User {
  id: string
  name: string
  role: string
}

const usersAdapter = createEntityAdapter<User>()

const usersSlice = createSlice({
  name: 'users',
  initialState: usersAdapter.getInitialState(),
  reducers: {
    userAdded: usersAdapter.addOne,
    userUpdated: (
      state,
      action: PayloadAction<{ id: string; changes: Partial<User> }>,
    ) => {
      usersAdapter.updateOne(state, action.payload)
    },
    userRemoved: usersAdapter.removeOne,
    reset: () => usersAdapter.getInitialState(),
  },
})

const { userAdded, userUpdated, userRemoved, reset } = usersSlice.actions

const store = configureStore({ reducer: { users: usersSlice.reducer } })

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог синхронизации ids ↔ entities',
)
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── Анимация: сравниваем prev vs next и подсвечиваем diff ──
let prevIds: string[] = []
let prevEntities: Record<string, User> = {}

const idsListEl = document.getElementById('ids-list')!
const entGridEl = document.getElementById('ent-grid')!
const idsCnt = document.getElementById('ids-cnt')!
const entCnt = document.getElementById('ent-cnt')!
const coerceNote = document.getElementById('coerce-note')!

function arrDiff(prev: string[], next: string[]): { added: string[]; removed: string[] } {
  const ps = new Set(prev)
  const ns = new Set(next)
  return {
    added: next.filter((id) => !ps.has(id)),
    removed: prev.filter((id) => !ns.has(id)),
  }
}

function escape(s: unknown): string {
  // id может быть number (после кнопки «addOne id=42») — без String() .replace упадёт
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
}

function render(): void {
  const s = store.getState().users
  const nextIds = s.ids as string[]
  const nextEnt = s.entities as Record<string, User>

  const { added, removed } = arrDiff(prevIds, nextIds)

  // обновлённые (тот же id, но другое содержимое)
  const updated: string[] = []
  for (const id of nextIds) {
    if (prevIds.includes(id) && prevEntities[id] !== nextEnt[id]) {
      updated.push(id)
    }
  }

  // ── 1) id pills ──
  idsListEl.innerHTML = ''
  for (const id of nextIds) {
    const pill = document.createElement('div')
    pill.className = 'id-pill'
    pill.textContent = id
    if (added.includes(id) || updated.includes(id)) pill.classList.add('flash')
    idsListEl.appendChild(pill)
  }
  // покажем fade-out pill'ы для удалённых
  for (const id of removed) {
    const pill = document.createElement('div')
    pill.className = 'id-pill flash-remove'
    pill.textContent = id
    idsListEl.appendChild(pill)
  }
  idsCnt.textContent = `${nextIds.length}`

  // ── 2) entity cards ──
  entGridEl.innerHTML = ''
  for (const id of nextIds) {
    const u = nextEnt[id]
    if (!u) continue
    const card = document.createElement('div')
    card.className = 'entity-card'
    card.innerHTML = `
      <div class="entity-card__key">[${escape(id)}]:</div>
      <div class="entity-card__field">name: <b>${escape(u.name)}</b></div>
      <div class="entity-card__field">role: <b>${escape(u.role)}</b></div>
    `
    if (added.includes(id) || updated.includes(id)) card.classList.add('flash')
    entGridEl.appendChild(card)
  }
  // fade-out для удалённых
  for (const id of removed) {
    const card = document.createElement('div')
    card.className = 'entity-card flash-remove'
    card.innerHTML = `<div class="entity-card__key">[${escape(id)}]:</div><div class="entity-card__field">удалён</div>`
    entGridEl.appendChild(card)
  }
  entCnt.textContent = `${nextIds.length} ключей`

  // ── 3) инвариант ──
  if (nextIds.length !== Object.keys(nextEnt).length) {
    con.error(`Инвариант нарушен! ids.length=${nextIds.length}, entities keys=${Object.keys(nextEnt).length}`)
  }

  // сохраним prev для следующей анимации
  prevIds = [...nextIds]
  prevEntities = { ...nextEnt }

  // очистим flash через 700ms
  setTimeout(() => {
    idsListEl.querySelectorAll('.flash').forEach((el) => el.classList.remove('flash'))
    entGridEl.querySelectorAll('.flash').forEach((el) => el.classList.remove('flash'))
    // удалим placeholder'ы удалённых
    idsListEl.querySelectorAll('.flash-remove').forEach((el) => el.remove())
    entGridEl.querySelectorAll('.flash-remove').forEach((el) => el.remove())
  }, 700)
}

render()
store.subscribe(render)

// ── кнопки ──────────────────────────────────────────
const roles = ['admin', 'user', 'guest', 'owner', 'qa', 'designer']
const names = ['Alice', 'Bob', 'Carol', 'Dan', 'Eve', 'Frank', 'Grace', 'Henry']
function randUser(): User {
  return {
    id: nanoid(6),
    name: names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 99),
    role: roles[Math.floor(Math.random() * roles.length)],
  }
}

document.getElementById('add-one')!.addEventListener('click', () => {
  const u = randUser()
  const a = userAdded(u)
  store.dispatch(a)
  con.action(a, 'addOne')
  con.info(`+ ids.push('${u.id}')   +  entities['${u.id}'] = {...}   ← атомарно`)
})

document.getElementById('add-numeric')!.addEventListener('click', () => {
  // сознательно добавим user c id=42 (number) — посмотрим, как оно станет строкой
  const u = { id: 42 as unknown as string, name: 'NumericId', role: 'test' }
  const a = userAdded(u)
  store.dispatch(a)
  con.action(a, 'addOne (numeric id)')
  const s = store.getState().users
  const hasStringKey = Object.prototype.hasOwnProperty.call(s.entities, '42')
  const hasNumberKeyInIds = (s.ids as unknown[]).includes(42)
  coerceNote.innerHTML = `
    <b>id был передан как number(42)</b>.
    В <code>entities</code> ключ = <b>"42"</b> (string, JS-coerce): <b>${hasStringKey}</b>.
    В <code>ids</code> значение = <b>${hasNumberKeyInIds ? '42 (number)' : typeof s.ids[s.ids.indexOf(42 as never)]}</b>.
    Поэтому <code>entities[id]</code> работает, но тип <code>Id</code> строгий — используй либо string, либо number, но не смешивай.
  `
  con.warn('entities хранит ключ как string (coerce). Не смешивай string/number id.')
})

document.getElementById('update-one')!.addEventListener('click', () => {
  const ids = store.getState().users.ids as string[]
  if (ids.length === 0) {
    con.warn('Нет юзеров для update.')
    return
  }
  const last = ids[ids.length - 1]
  const newRole = roles[Math.floor(Math.random() * roles.length)]
  const a = userUpdated({ id: last, changes: { role: newRole } })
  store.dispatch(a)
  con.action(a, 'updateOne')
  con.info(`role мутирован → карточка [${last}] flash, ids НЕ меняется.`)
})

document.getElementById('remove-one')!.addEventListener('click', () => {
  const ids = store.getState().users.ids as string[]
  if (ids.length === 0) return
  const victim = ids[Math.floor(Math.random() * ids.length)]
  const a = userRemoved(victim)
  store.dispatch(a)
  con.action(a, 'removeOne')
  con.warn(`- ids.filter   - delete entities['${victim}']   ← снова атомарно`)
})

document.getElementById('reset')!.addEventListener('click', () => {
  const a = reset()
  store.dispatch(a)
  con.action(a, 'reset')
  coerceNote.innerHTML = ''
})

// стартовые данные
store.dispatch(userAdded({ id: 'u1', name: 'Alice', role: 'admin' }))
store.dispatch(userAdded({ id: 'u2', name: 'Bob', role: 'user' }))
store.dispatch(userAdded({ id: 'u3', name: 'Carol', role: 'guest' }))

con.log('EntityState = { ids: Id[], entities: Record<Id, T> }.')
con.info('Любое CRUD-действие adapter-методом обновит оба поля атомарно.')
