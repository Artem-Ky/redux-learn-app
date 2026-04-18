import { createRoot } from 'react-dom/client'
import { useMemo } from 'react'
import { legacy_createStore as createStore, combineReducers } from 'redux'
import { Provider, useSelector, shallowEqual } from 'react-redux'
import { createSelector } from 'reselect'
import { ConsolePanel } from '../shared/console-panel'

// --- Types ---

interface WordsState { list: string[] }
interface OtherState { tick: number }

interface RootState {
  words: WordsState
  other: OtherState
}

type AppAction =
  | { type: 'ADD_WORD'; payload: string }
  | { type: 'REMOVE_LAST' }
  | { type: 'TICK' }
  | { type: 'RESET' }

const initialWords: string[] = [
  'Apple', 'Apricot', 'Avocado',
  'Banana', 'Blueberry',
  'Cherry', 'Coconut',
  'Date',
  'Elderberry',
  'Fig',
  'Grape', 'Guava',
  'Honeydew',
  'Jackfruit',
]

function wordsReducer(state: WordsState = { list: initialWords }, action: AppAction): WordsState {
  switch (action.type) {
    case 'ADD_WORD':   return { list: [...state.list, action.payload] }
    case 'REMOVE_LAST': return { list: state.list.slice(0, -1) }
    case 'RESET':      return { list: initialWords }
    default:           return state
  }
}

function otherReducer(state: OtherState = { tick: 0 }, action: AppAction): OtherState {
  switch (action.type) {
    case 'TICK':   return { tick: state.tick + 1 }
    case 'RESET':  return { tick: 0 }
    default:       return state
  }
}

const rootReducer = combineReducers({ words: wordsReducer, other: otherReducer })
const store = createStore(rootReducer)

// --- Console ---

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — shared selector vs per-instance selector'
)

// --- 10 инстансов, каждый фильтрует слова по своей букве ---

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J'] as const
type Letter = typeof LETTERS[number]

// --- Счётчики ---
// calls — сколько раз реально выполнилась output-функция (фильтрация = "кеш-промах").
// renders.shared[letter] / renders.perInstance[letter] — рендеры соответствующего инстанса.

const calls = { shared: 0, perInstance: 0 }
const renders = {
  shared:      Object.fromEntries(LETTERS.map(l => [l, 0])) as Record<Letter, number>,
  perInstance: Object.fromEntries(LETTERS.map(l => [l, 0])) as Record<Letter, number>,
}

// =================================================
// SHARED selector (один на всех инстансов)
// =================================================

const selectByLetterShared = createSelector(
  (state: RootState) => state.words.list,
  (_state: RootState, letter: Letter) => letter,
  (list, letter): string[] => {
    calls.shared++
    return list.filter(w => w[0] === letter)
  }
)

function SharedInstance({ letter }: { letter: Letter }) {
  const words = useSelector((state: RootState) => selectByLetterShared(state, letter))
  renders.shared[letter]++
  return (
    <div className="pi-row pi-row--bad">
      <div className="pi-row__letter">{letter}</div>
      <div className="pi-row__words">
        {words.length ? words.join(', ') : <span className="pi-row__empty">— пусто —</span>}
      </div>
      <div className="pi-row__meta">
        <span>рендеров: <strong>{renders.shared[letter]}</strong></span>
      </div>
    </div>
  )
}

// =================================================
// PER-INSTANCE selector — фабрика + useMemo + shallowEqual
// =================================================
//
// makeSelectByLetter() — ФАБРИКА: возвращает НОВЫЙ createSelector на каждый вызов.
// Каждый инстанс хранит свой selector в useMemo(..., []) → у каждого собственный кэш.
// shallowEqual в useSelector отсекает ре-рендер, когда filter вернул массив
// с теми же элементами (content-equal) — ре-рендерится только та строка,
// чьё содержимое реально поменялось.

const makeSelectByLetter = () => createSelector(
  (state: RootState) => state.words.list,
  (_state: RootState, letter: Letter) => letter,
  (list, letter): string[] => {
    calls.perInstance++
    return list.filter(w => w[0] === letter)
  }
)

function PerInstance({ letter }: { letter: Letter }) {
  const selectByLetter = useMemo(makeSelectByLetter, [])
  const words = useSelector(
    (state: RootState) => selectByLetter(state, letter),
    shallowEqual
  )
  renders.perInstance[letter]++
  return (
    <div className="pi-row pi-row--good">
      <div className="pi-row__letter">{letter}</div>
      <div className="pi-row__words">
        {words.length ? words.join(', ') : <span className="pi-row__empty">— пусто —</span>}
      </div>
      <div className="pi-row__meta">
        <span>рендеров: <strong>{renders.perInstance[letter]}</strong></span>
      </div>
    </div>
  )
}

// =================================================
// Cards
// =================================================

function SharedCard() {
  const totalRenders = LETTERS.reduce((s, l) => s + renders.shared[l], 0)
  return (
    <div className="pi-card pi-card--bad">
      <span className="pi-card__tag">❌ Общий selector</span>
      <div className="pi-card__title">ONE createSelector на всех</div>
      <div className="pi-card__code">{`const selectByLetter = createSelector(
  state => state.words.list,
  (_, letter) => letter,
  (list, letter) =>
    list.filter(w => w[0] === letter)
)

useSelector(state => selectByLetter(state, letter))`}</div>
      <div className="pi-card__rows">
        {LETTERS.map(l => <SharedInstance key={l} letter={l} />)}
      </div>
      <div className="pi-card__stats">
        <div className="pi-card__stat">
          <div className="pi-card__stat-label">filter вызовов (output-фн)</div>
          <div className="pi-card__stat-val pi-card__stat-val--red">{calls.shared}</div>
        </div>
        <div className="pi-card__stat">
          <div className="pi-card__stat-label">ре-рендеров всего</div>
          <div className="pi-card__stat-val pi-card__stat-val--red">{totalRenders}</div>
        </div>
      </div>
    </div>
  )
}

function PerInstanceCard() {
  const totalRenders = LETTERS.reduce((s, l) => s + renders.perInstance[l], 0)
  return (
    <div className="pi-card pi-card--good">
      <span className="pi-card__tag">✔ Фабрика + memo + shallowEqual</span>
      <div className="pi-card__title">makeSelectByLetter() через useMemo + shallowEqual</div>
      <div className="pi-card__code">{`const makeSelectByLetter = () => createSelector(
  state => state.words.list,
  (_, letter) => letter,
  (list, letter) =>
    list.filter(w => w[0] === letter)
)

const selectByLetter = useMemo(makeSelectByLetter, [])
useSelector(
  state => selectByLetter(state, letter),
  shallowEqual    // content-equal → без ре-рендера
)`}</div>
      <div className="pi-card__rows">
        {LETTERS.map(l => <PerInstance key={l} letter={l} />)}
      </div>
      <div className="pi-card__stats">
        <div className="pi-card__stat">
          <div className="pi-card__stat-label">filter вызовов (output-фн)</div>
          <div className="pi-card__stat-val pi-card__stat-val--green">{calls.perInstance}</div>
        </div>
        <div className="pi-card__stat">
          <div className="pi-card__stat-label">ре-рендеров всего</div>
          <div className="pi-card__stat-val pi-card__stat-val--green">{totalRenders}</div>
        </div>
      </div>
    </div>
  )
}

// =================================================
// App
// =================================================

function App() {
  const dispatchAndLog = (action: AppAction, label: string) => {
    const before = {
      shared: calls.shared,
      perInstance: calls.perInstance,
      rShared: LETTERS.reduce((s, l) => s + renders.shared[l], 0),
      rPerInstance: LETTERS.reduce((s, l) => s + renders.perInstance[l], 0),
    }
    con.log('')
    con.info(`📤 store.dispatch(${label})`)
    store.dispatch(action)
    // React батчит рендеры — читаем дельты после микротаска.
    Promise.resolve().then(() => {
      const after = {
        shared: calls.shared,
        perInstance: calls.perInstance,
        rShared: LETTERS.reduce((s, l) => s + renders.shared[l], 0),
        rPerInstance: LETTERS.reduce((s, l) => s + renders.perInstance[l], 0),
      }
      con.warn(`  [shared]       +${after.shared - before.shared} filter · +${after.rShared - before.rShared} render (итого filter=${after.shared}, render=${after.rShared})`)
      con.success(`  [per-instance] +${after.perInstance - before.perInstance} filter · +${after.rPerInstance - before.rPerInstance} render (итого filter=${after.perInstance}, render=${after.rPerInstance})`)
    })
  }

  return (
    <div>
      <div className="pi-legend">
        <span><span className="pi-legend__swatch pi-legend__swatch--false"></span>общий selector</span>
        <span><span className="pi-legend__swatch pi-legend__swatch--true"></span>per-instance selector</span>
        <span style={{ color: 'var(--text-muted)' }}>{LETTERS.length} инстансов, каждый со своей буквой {LETTERS.join(', ')}</span>
      </div>

      <div className="global-controls">
        <button className="btn btn--success" onClick={() => {
          const letters = ['A','B','C','D','E','F','G','H','I','J','K']
          const word = letters[Math.floor(Math.random() * letters.length)] + 'ew-' + (store.getState().words.list.length + 1)
          dispatchAndLog(
            { type: 'ADD_WORD', payload: word },
            `{ type: "ADD_WORD", payload: "${word}" }`
          )
        }}>add word (меняет words.list)</button>

        <button className="btn" onClick={() => dispatchAndLog(
          { type: 'REMOVE_LAST' },
          '{ type: "REMOVE_LAST" } (меняет words.list)'
        )}>remove last</button>

        <button className="btn btn--accent" onClick={() => dispatchAndLog(
          { type: 'TICK' },
          '{ type: "TICK" } — unrelated slice'
        )}>tick (unrelated — words.list не меняется)</button>

        <button className="btn btn--danger" onClick={() => dispatchAndLog(
          { type: 'RESET' },
          '{ type: "RESET" }'
        )}>reset</button>
      </div>

      <div className="pi-grid">
        <SharedCard />
        <PerInstanceCard />
      </div>
    </div>
  )
}

// --- Render ---

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <App />
  </Provider>
)

// --- Initial log ---

con.info(`${LETTERS.length} инстансов, каждый фильтрует слова по своей первой букве: ${LETTERS.join(', ')}`)
con.log('')
con.log('[shared]       ONE createSelector на всех — кэш размера 1 перетирается соседями.')
con.log('[per-instance] makeSelectByLetter() → useMemo(..., []) — у каждого свой кэш,')
con.log('               + shallowEqual в useSelector — ре-рендер только при реальном изменении содержимого.')
con.log('')
con.log('Нажмите "tick (unrelated)" — words.list НЕ меняется, но state-ссылка новая:')
con.log(`  shared:       ${LETTERS.length} filter-вызовов (каждый инстанс миссует кеш),`)
con.log(`                + ${LETTERS.length} ре-рендеров (filter возвращает новый массив)`)
con.log('  per-instance: 0 filter-вызовов (у каждого свой кэш, words.list та же ссылка),')
con.log('                0 ре-рендеров (selector вернул ту же ссылку)')
con.log('')
con.log('Нажмите "add word" — words.list получает новую ссылку:')
con.log(`  shared:       ${LETTERS.length} filter · ${LETTERS.length} ре-рендеров (все строки).`)
con.log(`  per-instance: ${LETTERS.length} filter (каждый кэш миссует — list новая ссылка),`)
con.log('                но РЕ-РЕНДЕР ТОЛЬКО 1 — у той буквы, чьё содержимое реально поменялось.')
con.log('                У остальных shallowEqual видит тот же набор слов → rerender пропущен.')
