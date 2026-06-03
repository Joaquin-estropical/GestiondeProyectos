import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchProjectForms, deleteProjectForm } from '@/lib/projectForms';
import { useMembers } from '@/hooks/useSupabase';
import type { ProjectForm } from '@/types';
import {
  FormCard, CreateFormView, RunFormView, ReadFormView,
} from '@/components/forms/FormViews';

// ── Types ─────────────────────────────────────────────────
interface Props {
  projectId:       string;
  projectArea:     string;
  currentUserId:   string;
  currentUserName: string;
  onOpenTask:      (id: string) => void;
}

// ── Componente principal ──────────────────────────────────
export function ProjectFormsView({ projectId, projectArea, currentUserId, currentUserName, onOpenTask }: Props) {
  const { data: members = [] } = useMembers();

  const [forms,    setForms]    = useState<ProjectForm[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchProjectForms(projectId);
      setForms(data);
    } catch (e) {
      console.error('[ProjectFormsView] fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime: escuchar cambios locales al project_forms de este proyecto
  useEffect(() => {
    const channel = supabase
      .channel(`project-forms-${projectId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'project_forms',
        filter: `project_id=eq.${projectId}`,
      }, () => { refresh(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, refresh]);

  const activeForm = forms.find(f => f.id === activeId) ?? null;

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-3)', fontSize: 13, gap: 10 }}>
        <Loader2 size={20} style={{ animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (creating) {
    return (
      <CreateFormView
        projectId={projectId}
        currentUserId={currentUserId}
        onDone={(form) => { setCreating(false); setActiveId(form.id); refresh(); }}
        onCancel={() => setCreating(false)}
      />
    );
  }

  if (activeId && activeForm) {
    if (activeForm.status === 'completed') {
      return (
        <ReadFormView
          form={activeForm}
          onBack={() => setActiveId(null)}
          onOpenTask={onOpenTask}
        />
      );
    }
    return (
      <RunFormView
        form={activeForm}
        projectId={projectId}
        projectArea={projectArea}
        currentUserName={currentUserName}
        members={members}
        onBack={() => setActiveId(null)}
        onDone={() => { setActiveId(null); refresh(); }}
      />
    );
  }

  // ── Modo lista (default) ──
  const active    = forms.filter(f => f.status === 'in_progress');
  const completed = forms.filter(f => f.status === 'completed');

  return (
    <div style={{ padding: '24px 32px', maxWidth: 760, overflowY: 'auto', height: '100%' }}>

      {/* En curso */}
      {active.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', marginBottom: 10 }}>En curso</div>
          {active.map(f => (
            <FormCard key={f.id} form={f} onOpen={() => setActiveId(f.id)} onDelete={() => deleteProjectForm(f.id).then(refresh)} />
          ))}
        </div>
      )}

      {/* Botón nuevo */}
      <button
        onClick={() => setCreating(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '14px 18px', borderRadius: 10,
          border: '2px dashed var(--border)', background: 'transparent',
          color: 'var(--text-2)', fontSize: 14, cursor: 'pointer',
          transition: 'border-color .15s, color .15s', marginBottom: 28,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.color = 'var(--teal)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
      >
        <Plus size={16} /> Nuevo formulario
      </button>

      {/* Historial */}
      {completed.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', marginBottom: 10 }}>
            Historial · {completed.length}
          </div>
          {completed.map(f => (
            <FormCard key={f.id} form={f} onOpen={() => setActiveId(f.id)} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {forms.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
          <ClipboardList size={32} style={{ display: 'block', margin: '0 auto 12px', opacity: .5 }} />
          <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 6 }}>Sin formularios todavía</div>
          <div style={{ fontSize: 13 }}>Creá uno para registrar revisiones y generar tareas a partir de las fallas.</div>
        </div>
      )}
    </div>
  );
}
