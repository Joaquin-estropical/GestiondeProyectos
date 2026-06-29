import { supabase, supabaseWriter } from './supabase'
import type { ProjectForm, ProjectFormItem, ProjectFormStatus, ProjectFormItemStatus } from '@/types'

// ═══════════════════════════════════════════════════════════
// PROJECT FORMS (checklists OK/X dentro de un proyecto)
// ═══════════════════════════════════════════════════════════

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export async function fetchProjectForms(projectId: string): Promise<ProjectForm[]> {
  const { data, error } = await supabase
    .from('project_forms')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as ProjectForm[]
}

export async function fetchProjectForm(id: string): Promise<ProjectForm | null> {
  const { data, error } = await supabase
    .from('project_forms')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as ProjectForm | null
}

export async function createProjectForm(input: {
  project_id:  string
  title:       string
  template_id?: string | null
  created_by?:  string | null
}): Promise<ProjectForm> {
  const row = {
    id:          genId('pf'),
    project_id:  input.project_id,
    title:       input.title,
    template_id: input.template_id ?? null,
    created_by:  input.created_by  ?? null,
    status:      'in_progress' as ProjectFormStatus,
  }
  const { data, error } = await supabaseWriter
    .from('project_forms').insert(row).select().single()
  if (error) throw error
  return data as ProjectForm
}

export async function updateProjectForm(id: string, patch: Partial<ProjectForm>): Promise<void> {
  const { error } = await supabaseWriter.from('project_forms').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteProjectForm(id: string): Promise<void> {
  const { error } = await supabaseWriter.from('project_forms').delete().eq('id', id)
  if (error) throw error
}

export async function completeForm(formId: string): Promise<void> {
  const { error } = await supabaseWriter
    .from('project_forms')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', formId)
  if (error) throw error
}

// ── Items ─────────────────────────────────────────────────

export async function fetchFormItems(formId: string): Promise<ProjectFormItem[]> {
  const { data, error } = await supabase
    .from('project_form_items')
    .select('*')
    .eq('form_id', formId)
    .order('sort_order')
  if (error) throw error
  return data as ProjectFormItem[]
}

export async function createFormItem(input: {
  form_id:     string
  title:       string
  category?:   string | null
  sort_order?: number
}): Promise<ProjectFormItem> {
  const row = {
    id:         genId('pfi'),
    form_id:    input.form_id,
    title:      input.title,
    category:   input.category   ?? null,
    sort_order: input.sort_order ?? 0,
    status:     'pending' as ProjectFormItemStatus,
  }
  const { data, error } = await supabaseWriter
    .from('project_form_items').insert(row).select().single()
  if (error) throw error
  return data as ProjectFormItem
}

export async function updateFormItem(id: string, patch: Partial<ProjectFormItem>): Promise<void> {
  const { error } = await supabaseWriter.from('project_form_items').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteFormItem(id: string): Promise<void> {
  const { error } = await supabaseWriter.from('project_form_items').delete().eq('id', id)
  if (error) throw error
}

export async function reorderFormItems(
  updates: Array<{ id: string; sort_order: number }>,
): Promise<void> {
  if (updates.length === 0) return
  await Promise.all(
    updates.map(u =>
      supabaseWriter.from('project_form_items').update({ sort_order: u.sort_order }).eq('id', u.id),
    ),
  )
}

export async function bulkCreateFormItems(
  formId: string,
  items:  Array<{ title: string; category?: string | null; sort_order: number }>,
): Promise<ProjectFormItem[]> {
  if (items.length === 0) return []
  const rows = items.map(it => ({
    id:         genId('pfi'),
    form_id:    formId,
    title:      it.title,
    category:   it.category ?? null,
    sort_order: it.sort_order,
    status:     'pending' as ProjectFormItemStatus,
  }))
  const { data, error } = await supabaseWriter
    .from('project_form_items').insert(rows).select()
  if (error) throw error
  return data as ProjectFormItem[]
}
