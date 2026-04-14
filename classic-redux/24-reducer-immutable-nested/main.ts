import { legacy_createStore as createStore } from 'redux'
import { DevToolsPanel } from '../shared/devtools-panel'
import { ConsolePanel } from '../shared/console-panel'

interface Employee {
  name: string
  salary: number
}

interface Department {
  name: string
  employee: Employee
}

interface Company {
  name: string
  department: Department
}

interface OrgState {
  company: Company
}

interface OrgAction {
  type: string
  payload?: string | number
}

const initialState: OrgState = {
  company: {
    name: 'Рога и Копыта',
    department: {
      name: 'Разработка',
      employee: {
        name: 'Иван',
        salary: 120000,
      },
    },
  },
}

function orgReducer(
  state: OrgState = initialState,
  action: OrgAction
): OrgState {
  switch (action.type) {
    case 'employee/salaryUpdated':
      return {
        ...state,
        company: {
          ...state.company,
          department: {
            ...state.company.department,
            employee: {
              ...state.company.department.employee,
              salary: action.payload as number,
            },
          },
        },
      }
    case 'employee/nameUpdated':
      return {
        ...state,
        company: {
          ...state.company,
          department: {
            ...state.company.department,
            employee: {
              ...state.company.department.employee,
              name: action.payload as string,
            },
          },
        },
      }
    case 'department/nameUpdated':
      return {
        ...state,
        company: {
          ...state.company,
          department: {
            ...state.company.department,
            name: action.payload as string,
          },
        },
      }
    case 'company/nameUpdated':
      return {
        ...state,
        company: {
          ...state.company,
          name: action.payload as string,
        },
      }
    case 'org/reset':
      return {
        company: {
          ...initialState.company,
          department: {
            ...initialState.company.department,
            employee: { ...initialState.company.department.employee },
          },
        },
      }
    default:
      return state
  }
}

const store = createStore(orgReducer)

const devtools = new DevToolsPanel(document.getElementById('devtools-container')!)
devtools.connectStore(store)

const con = new ConsolePanel(document.getElementById('console-container')!, 'Проверка ссылок')

function render(): void {
  const state = store.getState()
  document.getElementById('state-display')!.textContent = JSON.stringify(state, null, 2)
}

function logRefs(before: OrgState, after: OrgState, field: string): void {
  con.info(`─── Обновлено: ${field} ───`)
  con.log(`state === newState:                  ${before === after}`)
  con.log(`company === newCompany:              ${before.company === after.company}`)
  con.log(`department === newDepartment:        ${before.company.department === after.company.department}`)
  con.log(`employee === newEmployee:            ${before.company.department.employee === after.company.department.employee}`)
  if (before !== after) {
    con.success('Все изменённые уровни получили новые ссылки')
  }
  con.log('')
}

store.subscribe(render)
render()

document.getElementById('btn-salary')!.addEventListener('click', (): void => {
  const before = store.getState()
  store.dispatch({ type: 'employee/salaryUpdated', payload: 150000 })
  logRefs(before, store.getState(), 'employee.salary')
})

document.getElementById('btn-employee-name')!.addEventListener('click', (): void => {
  const before = store.getState()
  store.dispatch({ type: 'employee/nameUpdated', payload: 'Алексей' })
  logRefs(before, store.getState(), 'employee.name')
})

document.getElementById('btn-dept-name')!.addEventListener('click', (): void => {
  const before = store.getState()
  store.dispatch({ type: 'department/nameUpdated', payload: 'Frontend' })
  logRefs(before, store.getState(), 'department.name')
})

document.getElementById('btn-company-name')!.addEventListener('click', (): void => {
  const before = store.getState()
  store.dispatch({ type: 'company/nameUpdated', payload: 'ТехноСофт' })
  logRefs(before, store.getState(), 'company.name')
})

document.getElementById('btn-reset')!.addEventListener('click', (): void => {
  store.dispatch({ type: 'org/reset' })
  con.clear()
  con.info('Оргструктура сброшена')
})

con.info('Нажимайте кнопки и наблюдайте, как изменяются ссылки на каждом уровне вложенности')
