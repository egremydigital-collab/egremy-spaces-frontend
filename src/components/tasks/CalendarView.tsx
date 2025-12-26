import * as React from 'react'
import { Card } from '@/components/ui'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { TaskDetailed } from '@/types'

// ============================================
// Tipos
// ============================================
interface CalendarViewProps {
  tasks: TaskDetailed[]
  onTaskClick: (task: TaskDetailed) => void
}

interface DayInfo {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  tasks: TaskDetailed[]
}

// ============================================
// Utilidades
// ============================================
const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

function getCalendarDays(year: number, month: number, tasks: TaskDetailed[]): DayInfo[] {
  const days: DayInfo[] = []
  const today = new Date()
  
  // Primer día del mes
  const firstDay = new Date(year, month, 1)
  // Último día del mes
  const lastDay = new Date(year, month + 1, 0)
  
  // Días del mes anterior para completar la primera semana
  const startDayOfWeek = firstDay.getDay()
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    days.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      tasks: getTasksForDate(tasks, date),
    })
  }
  
  // Días del mes actual
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    days.push({
      date,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      tasks: getTasksForDate(tasks, date),
    })
  }
  
  // Días del mes siguiente para completar la última semana
  const remainingDays = 42 - days.length // 6 semanas * 7 días
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i)
    days.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      tasks: getTasksForDate(tasks, date),
    })
  }
  
  return days
}

// ============================================
// FIX TIMEZONE: Parsear fecha sin conversión UTC
// ============================================
function getTasksForDate(tasks: TaskDetailed[], date: Date): TaskDetailed[] {
  return tasks.filter((task) => {
    if (!task.due_date) return false
    // Parsear la fecha sin zona horaria (YYYY-MM-DD)
    // Esto evita que UTC se convierta a local y mueva la fecha un día
    const [year, month, day] = task.due_date.split('T')[0].split('-').map(Number)
    const taskDate = new Date(year, month - 1, day)
    return isSameDay(taskDate, date)
  })
}

// ============================================
// Componente Principal
// ============================================
export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth())
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = React.useState<Date>(today)
  
  // Calcular días del calendario
  const calendarDays = React.useMemo(
    () => getCalendarDays(currentYear, currentMonth, tasks),
    [currentYear, currentMonth, tasks]
  )
  
  // Tareas del día seleccionado
  const selectedDayTasks = React.useMemo(
    () => getTasksForDate(tasks, selectedDate),
    [tasks, selectedDate]
  )
  
  // Navegación
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }
  
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }
  
  const goToToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setSelectedDate(today)
  }
  
  return (
    <div className="space-y-4">
      {/* Calendario */}
      <Card className="p-4">
        {/* Header del calendario */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-text-primary">
              {MONTHS[currentMonth]} {currentYear}
            </h3>
            <button
              onClick={goToToday}
              className="px-2 py-1 text-xs bg-accent-primary/20 text-accent-primary rounded-lg hover:bg-accent-primary/30 transition-colors"
            >
              Hoy
            </button>
          </div>
          
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-text-secondary py-2"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dayInfo, index) => (
            <button
              key={index}
              onClick={() => setSelectedDate(dayInfo.date)}
              className={cn(
                'relative p-2 rounded-lg text-sm transition-all min-h-[44px] flex flex-col items-center justify-start',
                // Colores base
                dayInfo.isCurrentMonth
                  ? 'text-text-primary'
                  : 'text-text-secondary/50',
                // Hover
                'hover:bg-bg-tertiary',
                // Día seleccionado
                isSameDay(dayInfo.date, selectedDate) && 'bg-accent-primary/20 ring-2 ring-accent-primary',
                // Hoy
                dayInfo.isToday && !isSameDay(dayInfo.date, selectedDate) && 'bg-bg-tertiary font-bold'
              )}
            >
              <span className={cn(
                'w-7 h-7 flex items-center justify-center rounded-full',
                dayInfo.isToday && 'bg-accent-primary text-white'
              )}>
                {dayInfo.date.getDate()}
              </span>
              
              {/* Indicador de tareas */}
              {dayInfo.tasks.length > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {dayInfo.tasks.slice(0, 3).map((task, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        task.priority === 'urgent' ? 'bg-red-500' :
                        task.priority === 'high' ? 'bg-orange-500' :
                        'bg-accent-primary'
                      )}
                    />
                  ))}
                  {dayInfo.tasks.length > 3 && (
                    <span className="text-[10px] text-text-secondary ml-0.5">
                      +{dayInfo.tasks.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      </Card>
      
      {/* Lista de tareas del día seleccionado */}
      <Card className="p-4">
        <h4 className="text-sm font-medium text-text-secondary mb-3">
          {isSameDay(selectedDate, today) ? 'Hoy' : selectedDate.toLocaleDateString('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          })}
          {selectedDayTasks.length > 0 && (
            <span className="ml-2 text-text-primary">
              ({selectedDayTasks.length} {selectedDayTasks.length === 1 ? 'tarea' : 'tareas'})
            </span>
          )}
        </h4>
        
        {selectedDayTasks.length === 0 ? (
          <p className="text-sm text-text-secondary/50 text-center py-6">
            No hay tareas para este día
          </p>
        ) : (
          <div className="space-y-2">
            {selectedDayTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="w-full text-left p-3 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full mt-1.5 shrink-0',
                      task.priority === 'urgent' ? 'bg-red-500' :
                      task.priority === 'high' ? 'bg-orange-500' :
                      task.priority === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-text-secondary truncate">
                      {(task.project as any)?.name || 'Sin proyecto'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default CalendarView
