import { useState } from 'react';
import { Play, Pause, Plus } from 'lucide-react';
import { useTasks, useProjects } from '@/hooks/useSupabase';
import { fmtDate, dueColor } from '@/lib/mock-data';
import { AreaPill, PriorityPill } from '@/components/shared/Badges';
import { PageHead } from '@/components/shared/PageHead';
import { useAppStore } from '@/stores/app';
import type { Task } from '@/types';

export default function MyDay() {
  const { openTask, openNewTask, currentUser } = useAppStore();
  const today = new Date().toISOString().slice(0, 10);

  const { data: allTasks = [] } = useTasks({ assigneeId: currentUser.id });
  const { data: projects = [] } = useProjects();
  const [timing, setTiming]     = useState<string | null>(null);

  const todayTasks = allTasks.filter(t => t.status !== 'done' && t.due <= today);
  const upcoming   = allTasks.filter(t => t.status !== 'done' && t.due > today);
  const review     = allTasks.filter(t => t.status === 'rev');

  const grouped = (list: Task[]) => {
    const map: Record<string, Task[]> = {};
    list.forEach(t => { (map[t.project] = map[t.project] || []).push(t); });
    return map;
  };

  function TaskRow({ t }: { t: Task }) {
    const isTiming = timing === t.id;
    return (
      <div
        style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        onClick={() => openTask(t.id)}
      >
        <span className="check"></span>
        <span style={{ flex: 1, fontSize: 13.5 }}>{t.title}</span>
        <PriorityPill priority={t.priority} iconOnly />
        <span className="mono" style={{ fontSize: 12, color: dueColor(t.due), minWidth: 60, textAlign: 'right' }}>{fmtDate(t.due)}</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={e => { e.stopPropagation(); setTiming(isTiming ? null : t.id); }}
          style={isTiming ? { color: 'var(--teal)' } : {}}
        >
          {isTiming ? <Pause size={12} /> : <Play size={12} />}
          <span className="mono">{t.time}</span>
        </button>
      </div>
    );
  }

  const firstName = currentUser.name.split(' ')[0];

  return (
    <>
      <PageHead
        title={`Mi día · ${firstName}`}
        subtitle={`${allTasks.filter(t => t.status !== 'done').length} tareas asignadas`}
        right={
          <button className="btn btn-primary btn-md" onClick={() => openNewTask()}>
            <Plus size={14} /> Nueva tarea
          </button>
        }
      />
      <div className="page-body" style={{ maxWidth: 980 }}>
        <div className="card mb-16">
          <div className="card-head">
            <span className="title">Para hoy</span>
            <span className="micro" style={{ marginLeft: 'auto' }}>{todayTasks.length} tareas</span>
          </div>
          <div style={{ padding: '0 18px 8px' }}>
            {Object.entries(grouped(todayTasks)).map(([pid, list]) => {
              const p = projects.find(x => x.id === pid);
              if (!p) return null;
              return (
                <div key={pid} style={{ marginTop: 14 }}>
                  <div className="row gap-8 items-center mb-8">
                    <AreaPill areaId={p.area} mini />
                    <span className="micro">{p.name}</span>
                  </div>
                  {list.map(t => <TaskRow key={t.id} t={t} />)}
                </div>
              );
            })}
            {todayTasks.length === 0 && (
              <div style={{ padding: '18px 0', color: 'var(--text-3)', fontSize: 13 }}>
                {allTasks.length === 0 ? `No hay tareas asignadas a ${firstName} todavía.` : 'Sin tareas para hoy. ¡Todo al día!'}
              </div>
            )}
          </div>
        </div>

        <div className="card mb-16">
          <div className="card-head">
            <span className="title">En revisión</span>
            <span className="micro" style={{ marginLeft: 'auto' }}>{review.length}</span>
          </div>
          <div style={{ padding: '0 18px 8px' }}>
            {review.length === 0 && (
              <div style={{ padding: '18px 0', color: 'var(--text-3)', fontSize: 13 }}>Nada en revisión.</div>
            )}
            {review.map(t => <TaskRow key={t.id} t={t} />)}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="title">Próximas</span>
            <span className="micro" style={{ marginLeft: 'auto' }}>{upcoming.length}</span>
          </div>
          <div style={{ padding: '0 18px 8px' }}>
            {upcoming.length === 0 && (
              <div style={{ padding: '18px 0', color: 'var(--text-3)', fontSize: 13 }}>Sin tareas próximas.</div>
            )}
            {upcoming.map(t => <TaskRow key={t.id} t={t} />)}
          </div>
        </div>
      </div>
    </>
  );
}
