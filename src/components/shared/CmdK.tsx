import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Home, Sun, Calendar, Inbox, BarChart3, Settings, Folder, CheckSquare, Plus, FolderPlus, MapPin, Sparkles, OctagonAlert, FileBarChart, ArrowRight } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
import { useProjects, useTasks, useAreas } from '@/hooks/useSupabase';
import { useAppStore } from '@/stores/app';
import { supabase } from '@/lib/supabase';

interface CmdKProps {
  onClose: () => void;
}

interface CmdItem {
  kind: string;
  label: string;
  Icon: ComponentType<LucideProps>;
  sub?: string;
  go?: () => void;
  k: string;
}

export function CmdK({ onClose }: CmdKProps) {
  const navigate = useNavigate();
  const { openTask, openNewTask, openNewProject, openNewArea } = useAppStore();
  const [q, setQ] = useState('');
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from('members').select('id,name').then(({ data }) => { if (data) setMembers(data); });
  }, []);

  const { data: projects = [] } = useProjects();
  const { data: tasks    = [] } = useTasks();
  const { data: areas    = [] } = useAreas();

  const nav = (path: string) => { navigate(path); onClose(); };

  const sections = useMemo<Record<string, CmdItem[]>>(() => {
    const Q = q.toLowerCase().trim();

    const navItems: CmdItem[] = [
      { kind: 'Ir a', label: 'Inicio',            Icon: Home,         go: () => nav('/'),               k: 'inicio' },
      { kind: 'Ir a', label: 'Mi día',            Icon: Sun,          go: () => nav('/mi-dia'),         k: 'mi dia' },
      { kind: 'Ir a', label: 'Calendario global', Icon: Calendar,     go: () => nav('/calendario'),     k: 'calendario' },
      { kind: 'Ir a', label: 'Bandeja IA',        Icon: Inbox,        go: () => nav('/bandeja-ia'),     k: 'bandeja ia' },
      { kind: 'Ir a', label: 'Reportes',          Icon: BarChart3,    go: () => nav('/reportes'),       k: 'reportes' },
      { kind: 'Ir a', label: 'Configuración',     Icon: Settings,     go: () => nav('/configuracion'),  k: 'config' },
    ];

    const proj: CmdItem[] = projects.map(p => ({
      kind: 'Proyecto',
      label: p.name,
      Icon: Folder,
      sub: areas.find(a => a.id === p.area)?.name ?? '',
      go: () => nav(`/proyecto/${p.id}`),
      k: p.name.toLowerCase(),
    }));

    const memberItems: CmdItem[] = members.map(m => ({
      kind: 'Persona',
      label: m.name,
      Icon: CheckSquare,
      k: m.name.toLowerCase(),
    }));

    const taskItems: CmdItem[] = tasks.map(t => {
      const proj = projects.find(p => p.id === t.project);
      const area = areas.find(a => a.id === t.area);
      const crumb = [area?.name, proj?.name].filter(Boolean).join(' › ');
      return {
        kind: 'Tarea',
        label: t.title,
        Icon: CheckSquare,
        sub: crumb || t.code,
        go: () => {
          // Navigate to the project that contains this task, then open the task detail
          if (proj) {
            navigate(`/proyecto/${proj.id}`);
          }
          openTask(t.id);
          onClose();
        },
        k: (t.title + ' ' + t.code + ' ' + crumb).toLowerCase(),
      };
    });

    const actions: CmdItem[] = [
      { kind: 'Crear', label: 'Nueva tarea',             Icon: Plus,         go: () => { openNewTask(); onClose(); },    k: 'nueva tarea' },
      { kind: 'Crear', label: 'Nuevo proyecto',          Icon: FolderPlus,   go: () => { openNewProject(); onClose(); }, k: 'nuevo proyecto' },
      { kind: 'Crear', label: 'Nueva área',              Icon: MapPin,       go: () => { openNewArea(); onClose(); },    k: 'nueva area' },
      { kind: 'IA',    label: 'Resumen del día',         Icon: Sparkles,     k: 'resumen ia' },
      { kind: 'IA',    label: 'Detector de bloqueos',    Icon: OctagonAlert, k: 'bloqueos' },
      { kind: 'IA',    label: 'Generar reporte semanal', Icon: FileBarChart, k: 'reporte ia' },
    ];

    const all = [...navItems, ...proj, ...taskItems, ...memberItems, ...actions];
    const filtered = Q ? all.filter(x => x.k.includes(Q) || x.label.toLowerCase().includes(Q)) : all;

    const byKind: Record<string, CmdItem[]> = {};
    filtered.forEach(it => { (byKind[it.kind] = byKind[it.kind] || []).push(it); });
    return byKind;
  }, [q, projects, tasks, areas]);

  const flat = Object.values(sections).flat();
  const [idx, setIdx] = useState(0);

  useEffect(() => { setIdx(0); }, [q]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, flat.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
      if (e.key === 'Enter') { const it = flat[idx]; if (it?.go) it.go(); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [flat, idx, onClose]);

  return (
    <>
      <div className="cmdk-bd" onClick={onClose}></div>
      <div className="cmdk">
        <div className="cmdk-search">
          <Search size={14} color="var(--text-2)" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar o ejecutar comandos..."
          />
          <span className="kbd">ESC</span>
        </div>
        <div className="cmdk-list">
          {flat.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              Sin resultados para "{q}"
            </div>
          )}
          {Object.entries(sections).map(([sec, items]) => (
            <div key={sec}>
              <div className="cmdk-sec">{sec}</div>
              {items.map((it, i) => {
                const flatIdx = flat.indexOf(it);
                const isActive = flatIdx === idx;
                return (
                  <div
                    key={i}
                    className={`cmdk-item ${isActive ? 'active' : ''}`}
                    onMouseEnter={() => setIdx(flatIdx)}
                    onClick={() => { if (it.go) it.go(); }}
                  >
                    <it.Icon size={14} color={isActive ? 'var(--teal)' : 'var(--text-3)'} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
                    {it.sub && <span className="hint" style={{ flexShrink: 0, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.sub}</span>}
                    {isActive && it.go && <ArrowRight size={12} color="var(--teal)" style={{ flexShrink: 0, marginLeft: 4 }} />}
                    {isActive && <span className="kbd" style={{ flexShrink: 0, marginLeft: 4 }}>↵</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="cmdk-foot">
          <span><span className="kbd">↑↓</span> Navegar</span>
          <span><span className="kbd">↵</span> Ejecutar</span>
          <span><span className="kbd">ESC</span> Cerrar</span>
          <span style={{ marginLeft: 'auto' }}>Operaciones Tropical · Cmd+K</span>
        </div>
      </div>
    </>
  );
}
