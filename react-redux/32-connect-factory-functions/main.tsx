import { createRoot } from 'react-dom/client'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, connect } from 'react-redux'
import { createSelector } from 'reselect'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface Item {
  id: number
  name: string
  price: number
}

interface ItemsState {
  list: Item[]
}

interface MetaState {
  tick: number
}

interface RootState {
  items: ItemsState
  meta: MetaState
}

type Action =
  | { type: 'meta/tick' }
  | { type: 'items/bump'; payload: { id: number } }

// --- Reducers ---

const ITEM_COUNT = 20

const itemsInitial: ItemsState = {
  list: Array.from({ length: ITEM_COUNT }, (_, i) => ({
    id: i + 1,
    name: 'Item ' + (i + 1),
    price: 100 + i * 10,
  })),
}

function itemsReducer(state = itemsInitial, action: Action): ItemsState {
  switch (action.type) {
    case 'items/bump': {
      const id = action.payload.id
      return {
        list: state.list.map(it =>
          it.id === id ? { ...it, price: it.price + 1 } : it
        ),
      }
    }
    default:
      return state
  }
}

function metaReducer(state: MetaState = { tick: 0 }, action: Action): MetaState {
  return action.type === 'meta/tick' ? { tick: state.tick + 1 } : state
}

const rootReducer = combineReducers({
  items: itemsReducer,
  meta: metaReducer,
})
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — Factory Functions'
)

// --- Per-card metrics: hit/miss для каждого itemId ---

interface CardStats {
  hits: number
  misses: number
  selectorRuns: number
}

const makeStats = (): CardStats => ({ hits: 0, misses: 0, selectorRuns: 0 })

const sharedStats: Record<number, CardStats> = {}
const factoryStats: Record<number, CardStats> = {}
for (let i = 1; i <= ITEM_COUNT; i++) {
  sharedStats[i] = makeStats()
  factoryStats[i] = makeStats()
}

const totals = {
  sharedMiss: 0,
  sharedHit: 0,
  factoryMiss: 0,
  factoryHit: 0,
}

// --- Общий (плохой) memoized selector — на всех инстансов один ---

const selectItemById_SHARED = createSelector(
  (state: RootState) => state.items.list,
  (_: RootState, itemId: number) => itemId,
  (list, itemId) => {
    // Имитируем «дорогое» вычисление, чтобы cache miss был виден.
    return list.find(i => i.id === itemId) ?? null
  }
)

// Обёртка: считаем hit/miss относительно последнего вызова.
let sharedLastItemId: number | null = null
function runSharedSelector(state: RootState, itemId: number): Item | null {
  const s = sharedStats[itemId]
  s.selectorRuns++
  if (sharedLastItemId === itemId) {
    s.hits++
    totals.sharedHit++
  } else {
    s.misses++
    totals.sharedMiss++
  }
  sharedLastItemId = itemId
  return selectItemById_SHARED(state, itemId)
}

interface ItemDetailProps {
  itemId: number
  item: Item | null
  hits: number
  misses: number
  selectorRuns: number
  variant: 'shared' | 'factory'
}

function ItemDetailRaw(props: ItemDetailProps) {
  const ok = props.misses === 0 || props.hits >= props.misses
  const missClass = props.misses > 0 ? 'item-row__miss' : 'item-row__hit'
  return (
    <div className="item-row">
      <span>
        <span className="item-row__label">#{props.itemId}</span>{' '}
        {props.item ? props.item.name + ' — ' + props.item.price + '₽' : '(нет)'}
      </span>
      <span className={ok ? 'item-row__hit' : missClass}>
        hit {props.hits} / miss {props.misses}
      </span>
    </div>
  )
}

// --- Вариант 1: общий selector ---

const mapStateShared = (state: RootState, ownProps: { itemId: number }) => {
  const item = runSharedSelector(state, ownProps.itemId)
  const s = sharedStats[ownProps.itemId]
  return {
    itemId: ownProps.itemId,
    item,
    hits: s.hits,
    misses: s.misses,
    selectorRuns: s.selectorRuns,
    variant: 'shared' as const,
  }
}

const ItemDetailShared = connect(mapStateShared)(ItemDetailRaw)

// --- Вариант 2: factory — per-instance selector ---

const makeMapStateFactory = () => {
  const selectItemByIdForThisInstance = createSelector(
    (state: RootState) => state.items.list,
    (_: RootState, itemId: number) => itemId,
    (list, itemId) => list.find(i => i.id === itemId) ?? null
  )

  // В factory-замыкании живут собственные last-аргументы для подсчёта hit/miss.
  let lastState: ItemsState['list'] | null = null
  let lastItemId: number | null = null

  return (state: RootState, ownProps: { itemId: number }) => {
    const s = factoryStats[ownProps.itemId]
    s.selectorRuns++
    if (lastState === state.items.list && lastItemId === ownProps.itemId) {
      s.hits++
      totals.factoryHit++
    } else {
      s.misses++
      totals.factoryMiss++
    }
    lastState = state.items.list
    lastItemId = ownProps.itemId

    const item = selectItemByIdForThisInstance(state, ownProps.itemId)

    return {
      itemId: ownProps.itemId,
      item,
      hits: s.hits,
      misses: s.misses,
      selectorRuns: s.selectorRuns,
      variant: 'factory' as const,
    }
  }
}

const ItemDetailFactory = connect(makeMapStateFactory)(ItemDetailRaw)

// --- Aggregate card ---

interface TotalsProps {
  total: number
  totalLabel: string
}

function TotalsRaw({ totals: t, variant }: { totals: { hit: number; miss: number }; variant: 'shared' | 'factory' }) {
  const missClass = 'metric__value ' + (variant === 'shared' ? 'metric__value--bad' : 'metric__value--good')
  const hitClass = 'metric__value metric__value--good'
  return (
    <div className="factory-card__totals">
      <div className="metric">
        <div className="metric__label">Всего cache miss</div>
        <div className={missClass}>{t.miss}</div>
      </div>
      <div className="metric">
        <div className="metric__label">Всего cache hit</div>
        <div className={hitClass}>{t.hit}</div>
      </div>
    </div>
  )
}

// Totals не подключены к store — перерисовываем вручную при dispatch.
function _unused(_: TotalsProps) { return null }
void _unused

// --- App ---

function SharedList() {
  return (
    <div className="factory-card__list">
      {Array.from({ length: ITEM_COUNT }, (_, i) => (
        <ItemDetailShared key={i + 1} itemId={i + 1} />
      ))}
    </div>
  )
}

function FactoryList() {
  return (
    <div className="factory-card__list">
      {Array.from({ length: ITEM_COUNT }, (_, i) => (
        <ItemDetailFactory key={i + 1} itemId={i + 1} />
      ))}
    </div>
  )
}

function App() {
  const sharedTotals = { hit: totals.sharedHit, miss: totals.sharedMiss }
  const factoryTotals = { hit: totals.factoryHit, miss: totals.factoryMiss }

  return (
    <div>
      <div className="controls">
        <button
          className="btn btn--accent"
          onClick={() => {
            con.log('')
            con.info('📤 dispatch({ type: "meta/tick" }) — меняет только state.meta.tick')
            store.dispatch({ type: 'meta/tick' })
          }}
        >
          meta/tick
        </button>
        <button
          className="btn btn--success"
          onClick={() => {
            const id = Math.ceil(Math.random() * ITEM_COUNT)
            con.log('')
            con.info('📤 dispatch({ type: "items/bump", id: ' + id + ' })')
            store.dispatch({ type: 'items/bump', payload: { id } })
          }}
        >
          items/bump (random)
        </button>
        <button
          className="btn"
          onClick={() => {
            // «Сброс» totals и per-card stats
            totals.sharedHit = 0
            totals.sharedMiss = 0
            totals.factoryHit = 0
            totals.factoryMiss = 0
            for (let i = 1; i <= ITEM_COUNT; i++) {
              sharedStats[i] = makeStats()
              factoryStats[i] = makeStats()
            }
            con.log('')
            con.info('Счётчики сброшены')
            store.dispatch({ type: 'meta/tick' })
          }}
        >
          Сброс счётчиков
        </button>
      </div>

      <div className="factory-layout">
        <div className="factory-card factory-card--bad">
          <div className="factory-card__header">
            <div className="factory-card__title factory-card__title--bad">
              Без factory (один selector на всех)
            </div>
            <div className="factory-card__badge factory-card__badge--bad">плохо</div>
          </div>
          <div className="factory-card__config">
            connect(mapStateToProps)(ItemDetail)
          </div>
          <TotalsRaw totals={sharedTotals} variant="shared" />
          <SharedList />
        </div>

        <div className="factory-card factory-card--good">
          <div className="factory-card__header">
            <div className="factory-card__title factory-card__title--good">
              С factory (per-instance selector)
            </div>
            <div className="factory-card__badge factory-card__badge--good">хорошо</div>
          </div>
          <div className="factory-card__config">
            connect(makeMapStateToProps)(ItemDetail)
          </div>
          <TotalsRaw totals={factoryTotals} variant="factory" />
          <FactoryList />
        </div>
      </div>

      <div style={{
        padding: 12, background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius)', fontSize: '0.85rem', color: 'var(--text-secondary)'
      }}>
        <strong style={{ color: 'var(--accent-yellow)' }}>Наблюдение:</strong> после каждого
        dispatch Subscription дёргает всех 20 инстансов слева и всех 20 справа. Слева общий
        <code> createSelector</code> обслуживает 20 разных <code>itemId</code> — последний вызов
        всегда оставляет кэш, подходящий только ему, поэтому 19 из 20 получают cache miss.
        Справа у каждого инстанса — свой замкнутый selector, с id-шником, который у него
        единственный. Пока <code>items.list</code> не изменился, все 20 отдают cache hit.
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <App />
  </Provider>
)

// --- Initial log ---

con.info('Factory Functions — per-instance memoized selectors')
con.log('')
con.log('Слева:  connect(mapStateToProps)(ItemDetail)')
con.log('        selectItemById — один createSelector на всех 20 инстансов')
con.log('        cache size=1 → последний itemId перезаписывает кэш')
con.log('        → cache miss у 19 из 20 при любом dispatch')
con.log('')
con.log('Справа: connect(makeMapStateToProps)(ItemDetail)')
con.log('        makeMapStateToProps() вызывается 1 раз на инстанс при mount')
con.log('        внутри — свой createSelector в замыкании')
con.log('        → cache hit у всех 20, пока items.list не изменился')
