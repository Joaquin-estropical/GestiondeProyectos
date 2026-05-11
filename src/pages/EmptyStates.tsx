import { Inbox, ListTodo, Kanban, CalendarX2, SearchX, Sparkles, Users, BarChart3, GanttChart, Plus } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
import { PageHead } from '@/components/shared/PageHead';

interface EmptyItem {
  Ill: ComponentType<LucideProps>;
  t: string;
  d: string;
  cta: string;
  primary?: boolean;
}

const items: EmptyItem[] = [
  { Ill: Inbox,      t: 'Sin tareas pendientes',    d: 'No tenés nada asignado para hoy. ¿Revisar mañana?',                cta: 'Ver mañana' },
  { Ill: ListTodo,   t: 'Lista vacía',               d: 'Este proyecto todavía no tiene tareas.',                           cta: 'Crear primera tarea', primary: true },
  { Ill: Kanban,     t: 'Tablero vacío',             d: 'Empezá moviendo tareas a En curso.',                              cta: 'Crear tarea', primary: true },
  { Ill: CalendarX2, t: 'Calendario vacío',          d: 'No hay eventos ni tareas con fecha en este mes.',                  cta: 'Crear tarea', primary: true },
  { Ill: SearchX,    t: 'Sin resultados',            d: 'Probá con otro término o limpiá los filtros activos.',             cta: 'Limpiar filtros' },
  { Ill: Sparkles,   t: 'IA sin contexto',           d: 'Agregá un proyecto para que la IA pueda ayudarte.',               cta: 'Ver proyectos' },
  { Ill: Users,      t: 'Sin miembros',              d: 'Invitá a tu equipo para empezar a colaborar.',                    cta: 'Invitar', primary: true },
  { Ill: BarChart3,  t: 'Sin datos para graficar',   d: 'Los reportes aparecerán cuando haya actividad.',                   cta: 'Volver al dashboard' },
  { Ill: GanttChart, t: 'Sin tareas para Gantt',     d: 'Asigná fechas a tus tareas para verlas en línea de tiempo.',       cta: 'Ir a Lista' },
];

export default function EmptyStates() {
  return (
    <>
      <PageHead title="Empty states" subtitle="Galería de estados vacíos · misma rejilla para todas las vistas" />
      <div className="page-body">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {items.map((it, i) => (
            <div key={i} className="card">
              <div className="empty">
                <div className="ill"><it.Ill size={26} /></div>
                <p className="t">{it.t}</p>
                <p className="d">{it.d}</p>
                <button className={`btn ${it.primary ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
                  {it.primary && <Plus size={13} />} {it.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
