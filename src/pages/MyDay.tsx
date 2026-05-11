import { useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { TASKS, getProject, fmtDate, dueColor } from '@/lib/mock-data';
import { AreaPill } from '@/components/shared/Badges';
import { PriorityPill } from '@/components/shared/Badges';
import { PageHead } from '@/components/shared/PageHead';
import { useAppStore } from '@/stores/app';
import type { Task } from '@/types';

export default function MyDay() {
  const { openTask } = useAppStore();
  const mine = TASKS.filter(t => t.assignee === 'joa');
  const todayTasks = mine.filter(t => t.status !== 'done' && new Date(t.due + 'T00:00:00') <= new Date('2026-03-11T00:00:00'));
  const upcoming = mine.filter(t => t.status !== 'done' && new Date(t.due + 'T00:00:00') > new Date('2026-03-11T00:00:00'));
  const review = mine.filter(t => t.status === 'rev');
  const [timing, setTiming] = useState<string | null>(null);

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

  return (
    <>
      <PageHead title="Mi día" subtitle="Martes 10 de marzo · 6 tareas asignadas" />
      <div className="page-body" style={{ maxWidth: 980 }}>
        <div className="card mb-16">
          <div className="card-head">
            <span className="title">Hoy</span>
            <span className="micro" style={{ marginLeft: 'auto' }}>{todayTasks.length} tareas</span>
          </div>
          <div style={{ padding: '0 18px 8px' }}>
            {Object.entries(grouped(todayTasks)).map(([pid, list]) => {
              const p = getProject(pid)!;
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
            {upcoming.map(t => <TaskRow key={t.id} t={t} />)}
          </div>
        </div>
      </div>
    </>
  );
}
