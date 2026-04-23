import {
  configureStore,
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

interface User {
  id: number
  name: string
  profile: { name: string; age: number }
  tags?: string[]
}

const usersAdapter = createEntityAdapter<User>()

const INITIAL: User[] = [
  { id: 1, name: 'Alice', profile: { name: 'Alice', age: 30 }, tags: ['admin'] },
]

const usersSlice = createSlice({
  name: 'users',
  initialState: usersAdapter.getInitialState(undefined, INITIAL),
  reducers: {
    // ❌ bad: передаём changes.profile — это shallow заменит весь profile
    badUpdate: (state, action: PayloadAction<{ id: number; profile: Partial<User['profile']> }>) => {
      usersAdapter.updateOne(state, {
        id: action.payload.id,
        changes: { profile: action.payload.profile as User['profile'] },
      })
    },

    // ✅ good: «ручная склейка» старого profile + changes
    goodUpdate: (state, action: PayloadAction<{ id: number; name: string }>) => {
      const existing = state.entities[action.payload.id]
      if (!existing) return
      usersAdapter.updateOne(state, {
        id: action.payload.id,
        changes: {
          profile: { ...existing.profile, name: action.payload.name },
        },
      })
    },

    // 💪 custom reducer: Immer позволяет прямую мутацию nested
    nameChangedImmer: (state, action: PayloadAction<{ id: number; name: string }>) => {
      const u = state.entities[action.payload.id]
      if (u) u.profile.name = action.payload.name
    },

    // 🔄 смена id через updateOne
    idChanged: (state, action: PayloadAction<{ oldId: number; newId: number }>) => {
      usersAdapter.updateOne(state, {
        id: action.payload.oldId,
        changes: { id: action.payload.newId },
      })
    },

    // 🎯 updateMany: два update для одного id (last wins per key)
    batchMulti: (state, action: PayloadAction<{ id: number }>) => {
      usersAdapter.updateMany(state, [
        { id: action.payload.id, changes: { name: 'From-first', tags: ['first'] } },
        { id: action.payload.id, changes: { name: 'From-second' } }, // только name перезапишет
      ])
    },

    reset: () => usersAdapter.getInitialState(undefined, INITIAL),
  },
})

const { badUpdate, goodUpdate, nameChangedImmer, idChanged, batchMulti, reset } =
  usersSlice.actions

const store = configureStore({ reducer: { users: usersSlice.reducer } })
const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог updateOne')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── DOM ────────────────────────────────────────────
const paneBefore = document.getElementById('pane-before')!
const paneAfter = document.getElementById('pane-after')!
const explainEl = document.getElementById('explain')!

let beforeSnap: Record<number, User> | null = null

function snapshotBefore(): void {
  const s = store.getState().users
  beforeSnap = JSON.parse(JSON.stringify(s.entities)) as Record<number, User>
}

function render(): void {
  const s = store.getState().users
  if (beforeSnap === null) {
    paneBefore.textContent = '— клик по кнопке покажет ДО —'
    paneAfter.textContent = JSON.stringify(s.entities, null, 2)
    return
  }

  paneBefore.textContent = JSON.stringify(beforeSnap, null, 2)

  // diff render in AFTER
  const afterEnt = s.entities as Record<string, User>
  const html: string[] = []
  html.push('{')
  for (const idKey of Object.keys(afterEnt)) {
    const before = beforeSnap[Number(idKey) as keyof typeof beforeSnap]
    const after = afterEnt[idKey]
    html.push(`  "${idKey}": {`)

    // top-level diff
    const topKeys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
    for (const k of topKeys) {
      const vBefore = (before as unknown as Record<string, unknown>)?.[k]
      const vAfter = (after as unknown as Record<string, unknown>)?.[k]
      if (k === 'profile') {
        // deep render with per-key classes
        html.push(`    "profile": {`)
        const pKeys = new Set([...Object.keys((vBefore ?? {}) as object), ...Object.keys((vAfter ?? {}) as object)])
        for (const pk of pKeys) {
          const pv1 = (vBefore as Record<string, unknown>)?.[pk]
          const pv2 = (vAfter as Record<string, unknown>)?.[pk]
          if (pv1 !== undefined && pv2 === undefined) {
            html.push(`      <span class="lost">"${pk}": (БЫЛО ${JSON.stringify(pv1)} → ТЕПЕРЬ нет)</span>,`)
          } else if (pv1 === undefined && pv2 !== undefined) {
            html.push(`      <span class="added">"${pk}": ${JSON.stringify(pv2)}</span>,`)
          } else if (JSON.stringify(pv1) !== JSON.stringify(pv2)) {
            html.push(`      <span class="added">"${pk}": ${JSON.stringify(pv2)}</span>,`)
          } else {
            html.push(`      <span class="kept">"${pk}": ${JSON.stringify(pv2)}</span>,`)
          }
        }
        html.push(`    },`)
      } else {
        if (vBefore !== undefined && vAfter === undefined) {
          html.push(`    <span class="lost">"${k}": (БЫЛО ${JSON.stringify(vBefore)} → ТЕПЕРЬ нет)</span>,`)
        } else if (vBefore === undefined && vAfter !== undefined) {
          html.push(`    <span class="added">"${k}": ${JSON.stringify(vAfter)}</span>,`)
        } else if (JSON.stringify(vBefore) !== JSON.stringify(vAfter)) {
          html.push(`    <span class="added">"${k}": ${JSON.stringify(vAfter)}</span>,`)
        } else {
          html.push(`    "${k}": ${JSON.stringify(vAfter)},`)
        }
      }
    }
    html.push(`  },`)
  }
  // удалённые ключи (смена id)
  for (const oldKey of Object.keys(beforeSnap)) {
    if (!(oldKey in afterEnt)) {
      html.push(`  <span class="lost">"${oldKey}": УДАЛЁН (смена id)</span>,`)
    }
  }
  html.push('}')
  paneAfter.innerHTML = html.join('\n')
}
render()
store.subscribe(render)

// ── handlers ───────────────────────────────────────
document.getElementById('bad')!.addEventListener('click', () => {
  snapshotBefore()
  const a = badUpdate({ id: 1, profile: { name: 'Bob' } as User['profile'] })
  store.dispatch(a)
  con.action(a)
  con.error('profile: { age: 30 } пропало! changes.profile заменил весь объект.')
  explainEl.innerHTML =
    'changes.profile = { name:"Bob" } → Object.assign(entity, changes) → entity.profile = { name:"Bob" }. <span class="lost">age потеряли</span>.'
})

document.getElementById('good')!.addEventListener('click', () => {
  snapshotBefore()
  const a = goodUpdate({ id: 1, name: 'Bob' })
  store.dispatch(a)
  con.action(a)
  con.success('Правильно: собрали profile = { ...old, name: "Bob" } ДО updateOne.')
  explainEl.innerHTML =
    'В reducer'+'е: selectById → spread → updateOne. age сохранён.'
})

document.getElementById('custom-immer')!.addEventListener('click', () => {
  snapshotBefore()
  const a = nameChangedImmer({ id: 1, name: 'Bob-immer' })
  store.dispatch(a)
  con.action(a)
  con.success('Immer-мутация u.profile.name — patch по одному полю, age цел.')
  explainEl.innerHTML =
    'state.entities[id].profile.name = "Bob-immer" — Immer делает structural sharing, остальные поля на месте.'
})

document.getElementById('change-id')!.addEventListener('click', () => {
  snapshotBefore()
  const s = store.getState().users
  const currentIds = s.ids as number[]
  if (currentIds.length === 0) return
  const oldId = currentIds[0]
  const newId = oldId + 100
  const a = idChanged({ oldId, newId })
  store.dispatch(a)
  con.action(a)
  con.warn(`takeNewKey сработал: удалил entities[${oldId}] и записал под entities[${newId}]. ids пересобран.`)
  explainEl.innerHTML =
    `changes.id = ${newId} → selectId(updated) ≠ update.id → <code>delete entities[${oldId}]</code> + <code>entities[${newId}] = …</code> + пересборка ids.`
})

document.getElementById('batch-multi')!.addEventListener('click', () => {
  snapshotBefore()
  const s = store.getState().users
  const ids = s.ids as number[]
  if (ids.length === 0) return
  const a = batchMulti({ id: ids[0] })
  store.dispatch(a)
  con.action(a)
  con.info('updateMany: { name:"From-first", tags:["first"] } + { name:"From-second" } → { name:"From-second", tags:["first"] }')
  explainEl.innerHTML =
    'Два update на id=${ids[0]} слились через <code>{ ...a.changes, ...b.changes }</code>. name: последний выиграл. tags: добавились (не было во втором).'
})

document.getElementById('reset')!.addEventListener('click', () => {
  beforeSnap = null
  store.dispatch(reset())
  explainEl.innerHTML = ''
  con.log('reset: state вернулся к INITIAL')
})

con.log("Старт: user.profile = { name:'Alice', age: 30 }. Все кнопки меняют имя, но по-разному.")
con.info("Нажми BAD → увидишь 'age потерян'. GOOD → всё на месте.")
