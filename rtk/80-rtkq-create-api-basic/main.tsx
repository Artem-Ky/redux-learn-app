import { configureStore, type Action, type UnknownAction } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── mock network ──────────────────────────────────────────────────
interface PokemonDto {
  id: number
  name: string
  height: number
  weight: number
  types: string[]
}
const POKEDEX: Record<string, PokemonDto> = {
  pikachu:   { id: 25, name: 'pikachu',   height: 4, weight: 60,  types: ['electric'] },
  charizard: { id: 6,  name: 'charizard', height: 17, weight: 905, types: ['fire', 'flying'] },
  bulbasaur: { id: 1,  name: 'bulbasaur', height: 7, weight: 69,  types: ['grass', 'poison'] },
}

async function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url ?? String(input)
  await new Promise((r) => setTimeout(r, 400))
  const name = url.split('pokemon/')[1]?.split('?')[0]?.split('/')[0] ?? ''
  if (!POKEDEX[name]) {
    return new Response(JSON.stringify({ error: 'Not found', name }), {
      status: 404, headers: { 'content-type': 'application/json' },
    })
  }
  return new Response(JSON.stringify(POKEDEX[name]), {
    status: 200, headers: { 'content-type': 'application/json' },
  })
}

// ── createApi ─────────────────────────────────────────────────────
const pokeApi = createApi({
  reducerPath: 'pokeApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://pokeapi.co/api/v2/',
    fetchFn: mockFetch as typeof fetch,
  }),
  endpoints: (build) => ({
    getPokemonByName: build.query<PokemonDto, string>({
      query: (name) => `pokemon/${name.toLowerCase()}`,
    }),
  }),
})

// ── store ─────────────────────────────────────────────────────────
const store = configureStore({
  reducer: { [pokeApi.reducerPath]: pokeApi.reducer },
  middleware: (gdm) => gdm().concat(pokeApi.middleware),
})
type RootState = ReturnType<typeof store.getState>

// ── panels ────────────────────────────────────────────────────────
const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог pokeApi — actions + query lifecycle')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)
dev.connectStore(store)

// ── status / poke render ──────────────────────────────────────────
const $name     = document.getElementById('q-name')!
const $loading  = document.getElementById('q-loading')!
const $fetching = document.getElementById('q-fetching')!
const $success  = document.getElementById('q-success')!
const $error    = document.getElementById('q-error')!
const $poke     = document.getElementById('poke-container')!
const $shape    = document.getElementById('action-shape')!

function setFlag(el: HTMLElement, on: boolean, err = false): void {
  el.className = `flag ${on ? (err ? 'flag--err' : 'flag--on') : 'flag--off'}`
}

interface QueryView {
  name: string
  isLoading: boolean
  isFetching: boolean
  isSuccess: boolean
  isError: boolean
  data: PokemonDto | null
  error: string | null
}
const view: QueryView = {
  name: '—', isLoading: false, isFetching: false, isSuccess: false, isError: false,
  data: null, error: null,
}
function renderView(): void {
  $name.textContent = view.name
  setFlag($loading,  view.isLoading)
  setFlag($fetching, view.isFetching)
  setFlag($success,  view.isSuccess)
  setFlag($error,    view.isError, true)

  if (view.isError) {
    $poke.innerHTML = `
      <div class="poke-card" style="border-left-color: var(--accent-red);">
        <div class="poke-card__avatar" style="color: var(--accent-red);">?</div>
        <div>
          <div class="poke-card__name" style="color: var(--accent-red);">${view.name}</div>
          <div style="font-size: .82rem; color: var(--text-muted); font-family: var(--font-mono);">
            error: ${view.error ?? 'unknown'}
          </div>
        </div>
      </div>`
    return
  }
  if (view.isLoading) {
    $poke.innerHTML = `
      <div class="poke-card">
        <div class="poke-card__avatar">…</div>
        <div>
          <div class="poke-card__name" style="color: var(--text-muted);">loading ${view.name}</div>
          <div style="font-size: .8rem; color: var(--text-muted);">mock-сеть 400мс</div>
        </div>
      </div>`
    return
  }
  if (view.data) {
    const d = view.data
    const letter = d.name[0]?.toUpperCase() ?? '?'
    $poke.innerHTML = `
      <div class="poke-card">
        <div class="poke-card__avatar">${letter}</div>
        <div>
          <div class="poke-card__name">#${d.id} · ${d.name}</div>
          <div class="poke-card__stats">
            <span>height: <b>${d.height}</b></span>
            <span>weight: <b>${d.weight}</b></span>
          </div>
          <div class="poke-card__types">
            ${d.types.map((t) => `<span>${t}</span>`).join('')}
          </div>
        </div>
      </div>`
    return
  }
  $poke.innerHTML = ''
}
renderView()

// ── dispatch queries via initiate() ───────────────────────────────
function formatActionShape(action: Action): string {
  const a = action as UnknownAction & { payload?: unknown; meta?: Record<string, unknown>; error?: unknown }
  const meta = a.meta ?? {}
  const out = {
    type: a.type,
    ...(a.payload !== undefined ? { payload: a.payload } : {}),
    ...(a.error !== undefined ? { error: a.error } : {}),
    meta,
  }
  return JSON.stringify(out, null, 2)
}

let activeSub: { unsubscribe: () => void } | null = null

async function runQuery(name: string): Promise<void> {
  if (activeSub) { activeSub.unsubscribe(); activeSub = null }
  view.name = name
  view.isLoading = true
  view.isFetching = true
  view.isSuccess = false
  view.isError = false
  view.data = null
  view.error = null
  renderView()
  con.info(`dispatch pokeApi.endpoints.getPokemonByName.initiate('${name}')`)

  const sub = store.dispatch(pokeApi.endpoints.getPokemonByName.initiate(name))
  activeSub = sub
  try {
    const result = await sub.unwrap()
    view.isLoading = false
    view.isFetching = false
    view.isSuccess = true
    view.data = result
    renderView()
    con.success(`fulfilled → ${JSON.stringify(result)}`)
  } catch (err) {
    view.isLoading = false
    view.isFetching = false
    view.isError = true
    const e = err as { status?: number; data?: { error?: string } }
    view.error = `${e?.status ?? '?'} · ${e?.data?.error ?? 'rejected'}`
    renderView()
    con.error(`rejected → status=${e?.status} payload=${JSON.stringify(e?.data)}`)
  } finally {
    setTimeout(() => { sub.unsubscribe() }, 0)
  }
}

// ── middleware-tap для отображения "последнего action" ────────────
// Подписка через store.subscribe недостаточна (она получает state, не action).
// Поэтому патчим dispatch один раз: оборачиваем в прокси и логим actions pokeApi/*.
const origDispatch = store.dispatch
;(store as unknown as { dispatch: typeof origDispatch }).dispatch = ((action: Action) => {
  const result = origDispatch(action as never)
  if (typeof action?.type === 'string' && action.type.startsWith('pokeApi/')) {
    $shape.textContent = formatActionShape(action)
    con.action(action, 'pokeApi')
  }
  return result
}) as typeof origDispatch

// ── buttons ──────────────────────────────────────────────────────
document.querySelectorAll<HTMLButtonElement>('button[data-name]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const name = btn.getAttribute('data-name')!
    void runQuery(name)
  })
})
document.getElementById('clear')!.addEventListener('click', () => {
  $shape.textContent = '—'
  con.clear()
  con.info('Вид обнулён. Cache в state.pokeApi остался — смотри DevTools.')
})

con.info('Клик по имени → dispatch initiate() → DevTools покажет pending/fulfilled/rejected actions.')
con.info('Mock-сеть: 400мс задержка. missingno всегда 404.')
con.info(`RootState keys: ${Object.keys(store.getState() as RootState).join(', ')} — видишь pokeApi как обычный slice.`)
