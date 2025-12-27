import React, { useMemo, useState, useCallback } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import type { TaskListHeaderProps, TaskListTableProps } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { useUIStore } from "@/stores/ui.store";
import type { TaskDetailed } from "@/types";

// ============================================
// COMPONENTES VACÍOS PARA OCULTAR SIDEBAR
// ============================================

const EmptyTaskListHeader = (_props: TaskListHeaderProps) => null;
const EmptyTaskListTable = (_props: TaskListTableProps) => null;

// ============================================
// TIPOS
// ============================================

interface GanttViewProps {
  projectId: string;
  tasks: TaskDetailed[];
  onTasksChange: (tasks: TaskDetailed[]) => void;
}

// ============================================
// COLORES POR STATUS (Egremy Theme)
// ============================================

const STATUS_COLORS: Record<string, { bar: string; progress: string }> = {
  // Workflow n8n
  discovery: { bar: "#8b5cf6", progress: "#a78bfa" },     // Violet
  design: { bar: "#6366f1", progress: "#818cf8" },        // Indigo
  build: { bar: "#3b82f6", progress: "#60a5fa" },         // Blue
  qa: { bar: "#06b6d4", progress: "#22d3ee" },            // Cyan
  deploy: { bar: "#14b8a6", progress: "#2dd4bf" },        // Teal
  live: { bar: "#22f2c4", progress: "#34d399" },          // Egremy Green
  optimization: { bar: "#10b981", progress: "#34d399" },  // Emerald
  
  // Estados especiales
  blocked: { bar: "#ef4444", progress: "#f87171" },       // Red
  bug: { bar: "#dc2626", progress: "#ef4444" },           // Red darker
  hotfix: { bar: "#f97316", progress: "#fb923c" },        // Orange
  needs_client_approval: { bar: "#f59e0b", progress: "#fbbf24" }, // Amber
  
  // Default
  default: { bar: "#6366f1", progress: "#818cf8" },
};

function getStatusColors(status?: string | null) {
  return STATUS_COLORS[status || "default"] || STATUS_COLORS.default;
}

// ============================================
// UTILIDADES DE FECHA
// ============================================

function parseDateSafe(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
}

// ============================================
// TOOLTIP COMPONENT
// ============================================

interface TooltipContentProps {
  task: Task;
  fontSize: string;
  fontFamily: string;
}

const TooltipContent: React.FC<TooltipContentProps> = ({ task }) => {
  const startDate = task.start.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const endDate = task.end.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="eg-gantt-tooltip">
      <div className="eg-gantt-tooltip-title">{task.name}</div>
      <div className="eg-gantt-tooltip-dates">
        <span>{startDate}</span>
        <span className="eg-gantt-tooltip-arrow">→</span>
        <span>{endDate}</span>
      </div>
      {task.progress > 0 && (
        <div className="eg-gantt-tooltip-progress">
          Progreso: {task.progress}%
        </div>
      )}
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function GanttView({ tasks, onTasksChange }: GanttViewProps) {
  const { openTaskDrawer } = useUIStore();
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);

  // Mapa de tareas por ID para búsqueda rápida
  const taskById = useMemo(() => {
    const m = new Map<string, TaskDetailed>();
    tasks.forEach((t) => m.set(t.id, t));
    return m;
  }, [tasks]);

  // Convertir TaskDetailed[] a Task[] de gantt-task-react
  const ganttTasks: Task[] = useMemo(() => {
    const validTasks = (tasks || []).filter(
      (t) => !!(t.due_date || t.start_date || t.created_at)
    );

    if (validTasks.length === 0) return [];

    return validTasks.map((t) => {
      // Determinar fechas
      const baseStart =
        parseDateSafe(t.start_date) ??
        parseDateSafe(t.created_at) ??
        parseDateSafe(t.due_date) ??
        new Date();

      const baseEnd =
        parseDateSafe(t.due_date) ??
        new Date(baseStart.getTime() + 24 * 60 * 60 * 1000);

      let start = startOfDay(baseStart);
      let end = endOfDay(baseEnd);

      // Asegurar que end > start (mínimo 1 día)
      if (end <= start) {
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      }

      // Colores según status
      const colors = getStatusColors(t.status);

      // Progreso basado en status
      let progress = 0;
      if (t.status === "live" || t.status === "optimization") {
        progress = 100;
      } else if (t.status === "deploy") {
        progress = 80;
      } else if (t.status === "qa") {
        progress = 60;
      } else if (t.status === "build") {
        progress = 40;
      } else if (t.status === "design") {
        progress = 20;
      } else if (t.status === "discovery") {
        progress = 10;
      }

      return {
        id: t.id,
        name: t.title || "Tarea sin título",
        start,
        end,
        progress,
        type: "task" as const,
        isDisabled: false,
        styles: {
          backgroundColor: colors.bar,
          backgroundSelectedColor: colors.progress,
          progressColor: colors.progress,
          progressSelectedColor: colors.bar,
        },
      };
    });
  }, [tasks]);

  // CLAVE: viewDate enfoca donde están las tareas (evita "pantalla negra/vacía")
  const viewDate = useMemo(() => {
    if (!ganttTasks.length) return new Date();
    
    let minStart = ganttTasks[0].start;
    for (const gt of ganttTasks) {
      if (gt.start < minStart) {
        minStart = gt.start;
      }
    }
    return minStart;
  }, [ganttTasks]);

  // Handler: select en tarea (evento principal de gantt-task-react)
  const handleTaskSelect = useCallback(
    (task: Task, isSelected: boolean) => {
      if (!isSelected) return;
      
      const fullTask = taskById.get(task.id);
      if (fullTask) {
        openTaskDrawer(fullTask);
      }
    },
    [taskById, openTaskDrawer]
  );

  // Handler: doble click (fallback)
  const handleDoubleClick = useCallback(
    (task: Task) => {
      const fullTask = taskById.get(task.id);
      if (fullTask) {
        openTaskDrawer(fullTask);
      }
    },
    [taskById, openTaskDrawer]
  );

  // Handler: cambio de fechas (drag & drop)
  const handleDateChange = useCallback(
    (task: Task) => {
      const updatedTasks = tasks.map((t) => {
        if (t.id === task.id) {
          return {
            ...t,
            start_date: task.start.toISOString(),
            due_date: task.end.toISOString(),
          };
        }
        return t;
      });
      onTasksChange(updatedTasks);
    },
    [tasks, onTasksChange]
  );

  // Handler: cambio de progreso
  const handleProgressChange = useCallback(
    (task: Task) => {
      console.log("Progress changed:", task.id, task.progress);
      // Aquí podrías actualizar el progreso en la BD si lo necesitas
    },
    []
  );

  // Configuración de columnas según vista (ajustado para mejor visualización)
  const columnWidth = useMemo(() => {
    switch (viewMode) {
      case ViewMode.Day:
        return 52;
      case ViewMode.Week:
        return 180;
      case ViewMode.Month:
        return 320;
      default:
        return 180;
    }
  }, [viewMode]);

  // Empty state
  if (ganttTasks.length === 0) {
    return (
      <div className="eg-gantt-wrap">
        <div className="eg-gantt-toolbar">
          <div className="eg-gantt-toolbar-left">
            <ViewModeButtons viewMode={viewMode} setViewMode={setViewMode} />
          </div>
        </div>
        <div className="eg-gantt-empty">
          <div className="eg-gantt-empty-icon">📅</div>
          <p className="eg-gantt-empty-title">Sin tareas para visualizar</p>
          <p className="eg-gantt-empty-subtitle">
            Agrega fechas de inicio o entrega a tus tareas para verlas en el Gantt
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="eg-gantt-wrap">
      {/* Toolbar */}
      <div className="eg-gantt-toolbar">
        <div className="eg-gantt-toolbar-left">
          <ViewModeButtons viewMode={viewMode} setViewMode={setViewMode} />
        </div>
        <div className="eg-gantt-toolbar-right">
          <div className="eg-gantt-legend">
            <LegendItem variant="live" label="Live" />
            <LegendItem variant="build" label="Build" />
            <LegendItem variant="approval" label="Aprobación" />
            <LegendItem variant="blocked" label="Blocked" />
          </div>
        </div>
      </div>

      {/* Gantt Chart - Sin sidebar izquierdo */}
      <Gantt
        tasks={ganttTasks}
        viewMode={viewMode}
        viewDate={viewDate}
        onSelect={handleTaskSelect}
        onDoubleClick={handleDoubleClick}
        onDateChange={handleDateChange}
        onProgressChange={handleProgressChange}
        TaskListHeader={EmptyTaskListHeader}
        TaskListTable={EmptyTaskListTable}
        listCellWidth="0px"
        columnWidth={columnWidth}
        rowHeight={46}
        headerHeight={56}
        barCornerRadius={10}
        barFill={70}
        ganttHeight={420}
        todayColor="rgba(34, 242, 196, 0.22)"
        TooltipContent={TooltipContent}
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="13px"
        arrowColor="rgba(255, 255, 255, 0.25)"
        arrowIndent={20}
        handleWidth={10}
      />
    </div>
  );
}

// ============================================
// SUBCOMPONENTES
// ============================================

interface ViewModeButtonsProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

function ViewModeButtons({ viewMode, setViewMode }: ViewModeButtonsProps) {
  return (
    <>
      <button
        className={`eg-gantt-pill ${viewMode === ViewMode.Day ? "is-active" : ""}`}
        onClick={() => setViewMode(ViewMode.Day)}
      >
        Día
      </button>
      <button
        className={`eg-gantt-pill ${viewMode === ViewMode.Week ? "is-active" : ""}`}
        onClick={() => setViewMode(ViewMode.Week)}
      >
        Semana
      </button>
      <button
        className={`eg-gantt-pill ${viewMode === ViewMode.Month ? "is-active" : ""}`}
        onClick={() => setViewMode(ViewMode.Month)}
      >
        Mes
      </button>
    </>
  );
}

interface LegendItemProps {
  variant: 'live' | 'build' | 'approval' | 'blocked';
  label: string;
}

function LegendItem({ variant, label }: LegendItemProps) {
  return (
    <span className="eg-gantt-legend-item">
      <span className={`eg-gantt-legend-dot eg-gantt-legend-dot--${variant}`} />
      {label}
    </span>
  );
}
