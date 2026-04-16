import { produce } from 'immer'
import { ConsolePanel } from '../shared/console-panel'

// ─── Interfaces ───

interface Member {
  name: string
  role: string
  salary: number
}

interface Team {
  name: string
  members: Member[]
}

interface Department {
  name: string
  teams: Team[]
}

interface CompanyState {
  company: string
  departments: Department[]
}

function createInitialState(): CompanyState {
  return {
    company: 'ТехноКорп',
    departments: [
      {
        name: 'Разработка',
        teams: [
          {
            name: 'Frontend',
            members: [
              { name: 'Алиса', role: 'Senior', salary: 80000 },
              { name: 'Борис', role: 'Middle', salary: 60000 }
            ]
          },
          {
            name: 'Backend',
            members: [
              { name: 'Виктор', role: 'Lead', salary: 90000 },
              { name: 'Галина', role: 'Junior', salary: 40000 }
            ]
          }
        ]
      },
      {
        name: 'Дизайн',
        teams: [
          {
            name: 'UX',
            members: [
              { name: 'Дмитрий', role: 'Senior', salary: 70000 }
            ]
          }
        ]
      }
    ]
  }
}

let currentState: CompanyState = createInitialState()

// ─── UI ───

const consolePanel = new ConsolePanel(document.getElementById('console-container')!)
const stateDisplay = document.getElementById('state-display')!

const btnSpread = document.getElementById('btn-spread')!
const btnImmer = document.getElementById('btn-immer')!
const btnAddMember = document.getElementById('btn-add-member')!
const btnRenameTeam = document.getElementById('btn-rename-team')!
const btnImmutability = document.getElementById('btn-immutability')!
const btnReset = document.getElementById('btn-reset')!

function render(): void {
  stateDisplay.textContent = JSON.stringify(currentState, null, 2)
}

render()

consolePanel.info('Immer для глубоко вложенных обновлений')
consolePanel.log('')
consolePanel.log('Структура: company → departments[] → teams[] → members[]')
consolePanel.log('Нажимайте кнопки, чтобы увидеть разницу подходов.')
consolePanel.log('')

// ─── 1. Spread approach ───

btnSpread.addEventListener('click', (): void => {
  const prevState = currentState

  const newState: CompanyState = {
    ...prevState,
    departments: prevState.departments.map((dep, di) =>
      di !== 0 ? dep : {
        ...dep,
        teams: dep.teams.map((team, ti) =>
          ti !== 1 ? team : {
            ...team,
            members: team.members.map((m, mi) =>
              mi !== 0 ? m : { ...m, salary: 100000 }
            )
          }
        )
      }
    )
  }

  consolePanel.warn('━━━ Без Immer (каскад spread) ━━━')
  consolePanel.log('Задача: departments[0].teams[1].members[0].salary = 100000')
  consolePanel.log('')
  consolePanel.log('Код: 12+ строк вложенных map + spread')
  consolePanel.log('')

  const member = newState.departments[0].teams[1].members[0]
  consolePanel.success(`Результат: ${member.name} — salary ${member.salary}`)
  consolePanel.info(`prevState === newState? ${prevState === newState}`)
  consolePanel.log('')

  currentState = newState
  render()
})

// ─── 2. Immer approach ───

btnImmer.addEventListener('click', (): void => {
  const prevState = currentState

  const newState = produce(prevState, draft => {
    draft.departments[0].teams[1].members[0].salary = 100000
  })

  consolePanel.warn('━━━ С Immer (1 строка) ━━━')
  consolePanel.log('Задача: departments[0].teams[1].members[0].salary = 100000')
  consolePanel.log('')
  consolePanel.log('Код: draft.departments[0].teams[1].members[0].salary = 100000')
  consolePanel.log('')

  const member = newState.departments[0].teams[1].members[0]
  consolePanel.success(`Результат: ${member.name} — salary ${member.salary}`)
  consolePanel.info(`prevState === newState? ${prevState === newState}`)
  consolePanel.log('')

  currentState = newState
  render()
})

// ─── 3. Add member via Immer ───

btnAddMember.addEventListener('click', (): void => {
  const prevState = currentState

  const newState = produce(prevState, draft => {
    draft.departments[0].teams[0].members.push({
      name: 'Новичок',
      role: 'Intern',
      salary: 30000
    })
  })

  consolePanel.warn('━━━ Добавить сотрудника (push) ━━━')
  consolePanel.log('Код: draft.departments[0].teams[0].members.push(newMember)')
  consolePanel.log('')

  const team = newState.departments[0].teams[0]
  consolePanel.success(`Команда "${team.name}": ${team.members.length} сотрудников`)
  consolePanel.info(`Последний: ${team.members[team.members.length - 1].name}`)
  consolePanel.log('')

  currentState = newState
  render()
})

// ─── 4. Rename team via Immer ───

btnRenameTeam.addEventListener('click', (): void => {
  const prevState = currentState

  const newState = produce(prevState, draft => {
    draft.departments[0].teams[0].name = 'Frontend Elite'
  })

  consolePanel.warn('━━━ Переименовать команду ━━━')
  consolePanel.log('Код: draft.departments[0].teams[0].name = "Frontend Elite"')
  consolePanel.log('')
  consolePanel.success(`Было: "${prevState.departments[0].teams[0].name}" → Стало: "${newState.departments[0].teams[0].name}"`)
  consolePanel.log('')

  currentState = newState
  render()
})

// ─── 5. Immutability check ───

btnImmutability.addEventListener('click', (): void => {
  const prevState = currentState

  const newState = produce(prevState, draft => {
    draft.departments[0].teams[1].members[0].salary = 120000
  })

  consolePanel.warn('━━━ Проверка иммутабельности (structural sharing) ━━━')
  consolePanel.log('')

  const checks: { label: string; same: boolean }[] = [
    { label: 'root', same: prevState === newState },
    { label: 'departments[0]', same: prevState.departments[0] === newState.departments[0] },
    { label: 'departments[0].teams[0]', same: prevState.departments[0].teams[0] === newState.departments[0].teams[0] },
    { label: 'departments[0].teams[0].members', same: prevState.departments[0].teams[0].members === newState.departments[0].teams[0].members },
    { label: 'departments[0].teams[1]', same: prevState.departments[0].teams[1] === newState.departments[0].teams[1] },
    { label: 'departments[0].teams[1].members[0]', same: prevState.departments[0].teams[1].members[0] === newState.departments[0].teams[1].members[0] },
    { label: 'departments[1]', same: prevState.departments[1] === newState.departments[1] },
    { label: 'departments[1].teams[0]', same: prevState.departments[1].teams[0] === newState.departments[1].teams[0] },
  ]

  for (const { label, same } of checks) {
    if (same) {
      consolePanel.success(`  prev.${label} === new.${label} → TRUE (переиспользован)`)
    } else {
      consolePanel.error(`  prev.${label} === new.${label} → false (новый объект)`)
    }
  }

  consolePanel.log('')
  consolePanel.info('Только путь к изменённому полю (teams[1].members[0]) создал новые объекты.')
  consolePanel.info('Всё остальное (teams[0], departments[1]) — та же ссылка!')
  consolePanel.log('')

  currentState = newState
  render()
})

// ─── Reset ───

btnReset.addEventListener('click', (): void => {
  currentState = createInitialState()
  render()
  consolePanel.clear()
  consolePanel.info('Состояние сброшено')
  consolePanel.log('')
})
