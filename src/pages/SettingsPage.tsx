import { useState } from 'react';
import { Plus, MoreHorizontal, UserPlus, Settings } from 'lucide-react';
import { AREAS, TEAM, PROJECTS, TASKS } from '@/lib/mock-data';
import { Avatar } from '@/components/shared/Avatar';
import { PageHead } from '@/components/shared/PageHead';

const TABS = [
  { id: 'areas',   label: 'Áreas' },
  { id: 'members', label: 'Miembros' },
  { id: 'roles',   label: 'Roles' },
  { id: 'integr',  label: 'Integraciones' },
  { id: 'billing', label: 'Facturación' },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('areas');

  return (
    <>
      <PageHead title="Configuración" subtitle="Áreas, miembros y permisos del workspace" />
      <div style={{ padding: '0 32px', borderBottom: '1px solid var(--border)' }}>
        <div className="tabs" style={{ background: 'transparent', border: 0, padding: 0 }}>
          {TABS.map(t => (
            <span
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              style={{ borderRadius: 0, borderBottom: tab === t.id ? '2px solid var(--teal)' : '2px solid transparent', padding: '10px 12px', background: 'transparent' }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>

      <div className="page-body" style={{ maxWidth: 920 }}>
        {tab === 'areas' && (
          <>
            <div className="row between items-center mb-16">
              <div>
                <div className="fw-6">Áreas del workspace</div>
                <div className="f-xs text-2 mt-4">Cada área tiene un color único y agrupa sus proyectos.</div>
              </div>
              <button className="btn btn-primary btn-sm"><Plus size={14} /> Nueva área</button>
            </div>
            <div className="card">
              {AREAS.map((a, i) => (
                <div
                  key={a.id}
                  style={{ padding: '14px 18px', borderBottom: i < AREAS.length - 1 ? '1px solid var(--border)' : '', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <span style={{ width: 32, height: 32, borderRadius: 6, background: a.color, display: 'grid', placeItems: 'center', color: '#0A0A0B', fontWeight: 700, fontSize: 12 }}>
                    {a.name.slice(0, 1)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="fw-5" style={{ fontSize: 13.5 }}>{a.name}</div>
                    <div className="f-xs text-2 mt-4">
                      {PROJECTS.filter(p => p.area === a.id).length} proyectos · {TASKS.filter(t => t.area === a.id).length} tareas
                    </div>
                  </div>
                  <span className="avatar-stack avatar-stack-bordered">
                    {TEAM.slice(0, 3).map(m => <Avatar key={m.id} name={m.name} size={22} />)}
                  </span>
                  <button className="btn btn-ghost btn-sm btn-icon"><MoreHorizontal size={14} /></button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'members' && (
          <>
            <div className="row between items-center mb-16">
              <div>
                <div className="fw-6">Miembros</div>
                <div className="f-xs text-2 mt-4">5 miembros activos · 2 invitaciones pendientes.</div>
              </div>
              <button className="btn btn-primary btn-sm"><UserPlus size={14} /> Invitar</button>
            </div>
            <div className="card">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Áreas</th>
                    <th style={{ width: 120 }}>Permiso</th>
                    <th style={{ width: 60 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {TEAM.map(m => (
                    <tr key={m.id}>
                      <td>
                        <div className="row gap-10 items-center">
                          <Avatar name={m.name} size={28} />
                          <div>
                            <div className="fw-5">{m.name}</div>
                            <div className="f-xs text-2 mt-4">{m.name.toLowerCase().replace(/ /g, '.')}@tropical.co</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="f-xs text-2">{m.role}</span></td>
                      <td>
                        <div className="row gap-4">
                          {AREAS.slice(0, 3).map(a => (
                            <span key={a.id} style={{ width: 12, height: 12, borderRadius: 3, background: a.color }}></span>
                          ))}
                        </div>
                      </td>
                      <td><span className="pill">{m.id === 'joa' ? 'Admin' : 'Editor'}</span></td>
                      <td><button className="btn btn-ghost btn-sm btn-icon"><MoreHorizontal size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab !== 'areas' && tab !== 'members' && (
          <div className="empty">
            <div className="ill"><Settings size={26} /></div>
            <p className="t">Próximamente</p>
            <p className="d">Esta sección estará disponible en la próxima versión.</p>
          </div>
        )}
      </div>
    </>
  );
}
