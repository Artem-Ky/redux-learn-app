import { configureStore, combineReducers, type EnhancedStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
import { ConsolePanel } from '../shared/console-panel'
import { DevToolsPanel } from '../shared/devtools-panel'

// ── mock fetchFn (shared между всеми store-вариантами) ────────────
interface PokemonDto { id: number; name: string }
async function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === 'string' ? input : (input as Request).url ?? String(input)
  await new Promise((r) => setTimeout(r, 300))
  const name = url.split('pokemon/')[1]?.split('?')[0]?.split('/')[0] ?? ''
  if (name === 'pikachu') {
    return new Response(JSON.stringify({ id: 25, name: 'pikachu' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }
  return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
}

// ── Создаём свежий pokeApi для каждого варианта store (иначе middleware флаг
//    middlewareRegistered повиснет на первом варианте и последующие вычисления
//    станут неверными). ─────────────────────────────────────────────
function makeApi(): ReturnType<typeof createApi> {
  return createApi({
    reducerPath: 'pokeApi',
    baseQuery: fetchBaseQuery({
      baseUrl: 'https://pokeapi.co/api/v2/',
      fetchFn: mockFetch as typeof fetch,
    }),
    endpoints: (build) => ({
      getPokemonByName: build.query<PokemonDto, string>({
        query: (name) => `pokemon/${name}`,
      }),
    }),
  }) as ReturnType<typeof createApi>
}

// ── 4 варианта сборки store ──────────────────────────────────────
interface Variant {
  id: string
  title: string
  tagText: string
  tagClass: 'ok' | 'bad'
  desc: string
  build: () => { store: EnhancedStore; api: ReturnType<typeof createApi> }
}

const variants: Variant[] = [
  {
    id: 'both',
    title: 'reducer + middleware (правильно)',
    tagText: 'works',
    tagClass: 'ok',
    desc: 'api.reducer в reducer-map + .concat(api.middleware). Canonical setup.',
    build: () => {
      const api = makeApi()
      const store = configureStore({
        reducer: { [api.reducerPath]: api.reducer },
        middleware: (gdm) => gdm().concat(api.middleware),
      })
      return { store, api }
    },
  },
  {
    id: 'no-middleware',
    title: 'reducer ЕСТЬ, middleware НЕТ',
    tagText: 'silent bug',
    tagClass: 'bad',
    desc: 'state.pokeApi есть, но initiate() не запускает fetch — query навсегда зависает.',
    build: () => {
      const api = makeApi()
      const store = configureStore({
        reducer: { [api.reducerPath]: api.reducer },
        // middleware НЕ подключён
      })
      return { store, api }
    },
  },
  {
    id: 'no-reducer',
    title: 'middleware ЕСТЬ, reducer НЕТ',
    tagText: 'throws in dev',
    tagClass: 'bad',
    desc: 'RTK кидает: Unable to determine reducerPath. state.pokeApi = undefined.',
    build: () => {
      const api = makeApi()
      const store = configureStore({
        reducer: combineReducers({ _placeholder: (s: number = 0) => s }),
        middleware: (gdm) => gdm().concat(api.middleware),
      })
      return { store, api }
    },
  },
  {
    id: 'prepend',
    title: 'prepend вместо concat',
    tagText: 'subtle',
    tagClass: 'bad',
    desc: 'Работает, но RTKQ стоит перед serializability/thunk — сериализационные проверки видят internal payload.',
    build: () => {
      const api = makeApi()
      const store = configureStore({
        reducer: { [api.reducerPath]: api.reducer },
        middleware: (gdm) => gdm().prepend(api.middleware),
      })
      return { store, api }
    },
  },
]

// ── state / panels ───────────────────────────────────────────────
const $variants = document.getElementById('variants')!
const $stateInit = document.getElementById('state-after-init')!
const $stateRun = document.getElementById('state-after-run')!
const $pill = document.getElementById('run-result')!

let current: { store: EnhancedStore; api: ReturnType<typeof createApi>; id: string } | null = null

const con = new ConsolePanel(document.getElementById('console-container')!, 'Лог вариантов store')
const dev = new DevToolsPanel(document.getElementById('devtools-container')!)

// ── render cards ─────────────────────────────────────────────────
variants.forEach((v) => {
  const el = document.createElement('div')
  el.className = 'variant-card'
  el.dataset.id = v.id
  el.innerHTML = `
    <div class="variant-card__title">${v.title}<span class="variant-card__tag ${v.tagClass}">${v.tagText}</span></div>
    <div class="variant-card__desc">${v.desc}</div>
  `
  el.addEventListener('click', () => selectVariant(v.id))
  $variants.appendChild(el)
})

function formatState(s: unknown): string {
  return JSON.stringify(s, null, 2) || '—'
}

function selectVariant(id: string): void {
  const variant = variants.find((v) => v.id === id)!
  document.querySelectorAll<HTMLElement>('.variant-card').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === id && variant.tagClass === 'ok')
    el.classList.toggle('broken', el.dataset.id === id && variant.tagClass === 'bad')
  })

  try {
    const built = variant.build()
    current = { ...built, id }
    dev.connectStore(built.store)
    const slice = (built.store.getState() as Record<string, unknown>)[built.api.reducerPath]
    $stateInit.textContent = formatState(slice) || 'undefined'
    $stateRun.textContent = '—'
    $pill.className = 'result-pill'
    $pill.textContent = '—'
    con.clear()
    con.info(`[variant=${id}] store rebuilt. reducerPath="${built.api.reducerPath}".`)
    if (slice === undefined) con.warn('state.pokeApi === undefined — reducer не подключён.')
  } catch (err) {
    current = null
    $stateInit.textContent = `THROWN: ${(err as Error).message}`
    $stateRun.textContent = '—'
    con.error(`[variant=${id}] throw: ${(err as Error).message}`)
  }
}

// ── run query ───────────────────────────────────────────────────
document.getElementById('run-query')!.addEventListener('click', async () => {
  if (!current) { con.warn('Выбери вариант store.'); return }
  const { store, api, id } = current
  con.info(`[${id}] dispatch initiate('pikachu')...`)
  $pill.className = 'result-pill'
  $pill.textContent = 'running...'

  // Таймаут — вариант "no-middleware" зависнет; показываем это явно.
  const timeoutPromise = new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), 1200))

  try {
    const endpoint = (api.endpoints as Record<string, { initiate: (arg: string) => { unwrap: () => Promise<unknown>; unsubscribe: () => void } }>).getPokemonByName
    const sub = store.dispatch(endpoint.initiate('pikachu') as never) as unknown as {
      unwrap: () => Promise<unknown>
      unsubscribe: () => void
    }
    const race = await Promise.race([sub.unwrap(), timeoutPromise])
    if (race === 'timeout') {
      con.error(`[${id}] 1.2s прошло, а fulfilled не пришёл → middleware не подключён (silent bug).`)
      $pill.className = 'result-pill bad'
      $pill.textContent = 'stuck · no-middleware'
    } else {
      con.success(`[${id}] fulfilled: ${JSON.stringify(race)}`)
      $pill.className = 'result-pill ok'
      $pill.textContent = 'OK'
    }
    try { sub.unsubscribe() } catch { /* ok */ }
  } catch (err) {
    const msg = (err as { data?: { error?: string }; status?: number })?.data?.error ?? (err as Error).message
    con.error(`[${id}] rejected: ${msg}`)
    $pill.className = 'result-pill bad'
    $pill.textContent = `rejected · ${msg}`
  }

  const sliceAfter = (store.getState() as Record<string, unknown>)[api.reducerPath]
  $stateRun.textContent = formatState(sliceAfter) || 'undefined'
})

document.getElementById('reset')!.addEventListener('click', () => {
  current = null
  document.querySelectorAll<HTMLElement>('.variant-card').forEach((el) => {
    el.classList.remove('active', 'broken')
  })
  $stateInit.textContent = '—'
  $stateRun.textContent = '—'
  $pill.className = 'result-pill'
  $pill.textContent = '—'
  con.clear()
  con.info('Выбери вариант и нажми «dispatch getPokemon».')
})

// стартовый — правильный
selectVariant('both')
con.info('Кликай по карточкам → разные варианты сборки store. Затем «dispatch» — запускаем initiate().')
con.info('Обрати внимание на вариант 2 (no-middleware): query висит, никаких ошибок — самый коварный баг.')
