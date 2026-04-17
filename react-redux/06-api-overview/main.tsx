import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { legacy_createStore as createStore } from 'redux'
import { Provider, useSelector, useDispatch, useStore } from 'react-redux'
import { ConsolePanel } from '../shared/console-panel'

const con = new ConsolePanel(
  document.getElementById('console-container')!,
  'Лог — Обзор API'
)

interface ApiItem {
  name: string
  desc: string
  tag: 'recommended' | 'legacy' | 'core'
  tagLabel: string
  code: string
}

const apiData: Record<string, ApiItem[]> = {
  provider: [
    {
      name: '<Provider>',
      desc: 'Компонент-обёртка, делает Redux store доступным всему дереву компонентов через React Context.',
      tag: 'core',
      tagLabel: 'core',
      code: `import { Provider } from 'react-redux'
import { createStore } from 'redux'

const store = createStore(rootReducer)

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>
)`,
    },
  ],
  hooks: [
    {
      name: 'useSelector(selector, equalityFn?)',
      desc: 'Читает значение из store state. Подписывается на обновления через Subscription (linked list → checkForUpdates → selector === comparison → forceRender).',
      tag: 'recommended',
      tagLabel: 'recommended',
      code: `import { useSelector } from 'react-redux'

function Counter() {
  // selector извлекает нужное значение из state
  const count = useSelector(state => state.counter.value)
  // При каждом dispatch: selector(newState) !== prevResult? → rerender

  return <div>Count: {count}</div>
}`,
    },
    {
      name: 'useDispatch()',
      desc: 'Возвращает функцию store.dispatch для отправки actions в Redux store.',
      tag: 'recommended',
      tagLabel: 'recommended',
      code: `import { useDispatch } from 'react-redux'

function IncrementButton() {
  const dispatch = useDispatch()

  return (
    <button onClick={() => dispatch({ type: 'counter/increment' })}>
      +1
    </button>
  )
}`,
    },
    {
      name: 'useStore()',
      desc: 'Возвращает ссылку на Redux store объект. Используется редко — только для store.getState() или store.replaceReducer().',
      tag: 'recommended',
      tagLabel: 'rare use',
      code: `import { useStore } from 'react-redux'

function StoreInfo() {
  const store = useStore()

  // Прямой доступ к store — НЕ подписывается на обновления!
  const currentState = store.getState()

  return <pre>{JSON.stringify(currentState, null, 2)}</pre>
}`,
    },
  ],
  connect: [
    {
      name: 'connect(mapStateToProps?, mapDispatchToProps?, mergeProps?, options?)',
      desc: 'HOC (Higher-Order Component) — оборачивает компонент и передаёт ему props из Redux store. Классический API, поддерживается, но для нового кода рекомендуется Hooks.',
      tag: 'legacy',
      tagLabel: 'legacy',
      code: `import { connect } from 'react-redux'

function Counter({ count, increment }) {
  return (
    <div>
      <span>{count}</span>
      <button onClick={increment}>+1</button>
    </div>
  )
}

const mapStateToProps = (state) => ({
  count: state.counter.value
})

const mapDispatchToProps = (dispatch) => ({
  increment: () => dispatch({ type: 'counter/increment' })
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Counter)`,
    },
  ],
}

const tabNames: Record<string, string> = {
  provider: 'Provider',
  hooks: 'Hooks API',
  connect: 'Connect API',
}

function ApiExplorer() {
  const [activeTab, setActiveTab] = useState('provider')
  const [selectedItem, setSelectedItem] = useState<string | null>(apiData.provider[0].name)

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setSelectedItem(apiData[tab][0].name)
    con.info(`Раздел: ${tabNames[tab]}`)
  }

  const handleItemClick = (item: ApiItem) => {
    setSelectedItem(item.name)
    con.log(`Выбрано: ${item.name}`)
  }

  const currentItems = apiData[activeTab]
  const selected = currentItems.find((i) => i.name === selectedItem) || currentItems[0]

  return (
    <div>
      <div className="api-tabs">
        {Object.keys(apiData).map((tab) => (
          <button
            key={tab}
            className={`api-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => handleTabChange(tab)}
          >
            {tabNames[tab]}
          </button>
        ))}
      </div>

      <div className="api-cards">
        {currentItems.map((item) => (
          <div
            key={item.name}
            className={`api-card${selectedItem === item.name ? ' selected' : ''}`}
            onClick={() => handleItemClick(item)}
          >
            <div className="api-card__name">{item.name}</div>
            <div className="api-card__desc">{item.desc}</div>
            <span className={`api-card__tag api-card__tag--${item.tag}`}>
              {item.tagLabel}
            </span>
          </div>
        ))}
      </div>

      {selected && (
        <div className="code-preview">
          <div className="code-preview__title">Пример использования: {selected.name}</div>
          {selected.code}
        </div>
      )}
    </div>
  )
}

const dummyReducer = (state = { value: 0 }) => state
const store = createStore(dummyReducer)

const root = createRoot(document.getElementById('root')!)
root.render(
  <Provider store={store}>
    <ApiExplorer />
  </Provider>
)

con.info('Обзор API React-Redux — кликайте на карточки для просмотра примеров кода.')
con.log('')
con.log('API состоит из 3 групп:')
con.log('  1. Provider — подключение store к React')
con.log('  2. Hooks — useSelector, useDispatch, useStore')
con.log('  3. Connect — connect(mapStateToProps, mapDispatchToProps, mergeProps, options)')
