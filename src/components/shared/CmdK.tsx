import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Home, Sun, Calendar, Inbox, BarChart3, Settings, Folder, CheckSquare, Plus, FolderPlus, MapPin, Sparkles, OctagonAlert, FileBarChart } from 'lucide-react';
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

    const taskItems: CmdItem[] = tasks.map(t => ({
      kind: 'Tarea',
      label: t.title,
      Icon: CheckSquare,
      sub: t.code + ' · ' + (areas.find(a => a.id === t.area)?.name ?? ''),
      go: () => { openTask(t.id); onClose(); },
      k: t.title.toLowerCase(),
    }));

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
                return (
                  <div
                    key={i}
                    className={`cmdk-item ${flatIdx === idx ? 'active' : ''}`}
                    onMouseEnter={() => setIdx(flatIdx)}
                    onClick={() => { if (it.go) it.go(); }}
                  >
                    <it.Icon size={14} color="var(--text-2)" />
                    <span>{it.label}</span>
                    {it.sub && <span className="hint">{it.sub}</span>}
                    {flatIdx === idx && <span className="kbd" style={{ marginLeft: it.sub ? 8 : 'auto' }}>↵</span>}
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
