import { supabase, supabaseWriter } from './supabase'
import type {
  ChecklistTemplate, TemplateItem, EventChecklist, ChecklistItem,
} from '@/types'

// ── helpers ───────────────────────────────────────────────────────────────────
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

// ── CHECKLIST TEMPLATES ───────────────────────────────────────────────────────
export async function fetchChecklistTemplates(): Promise<ChecklistTemplate[]> {
  const { data, error } = await supabase
    .from('checklist_templates')
    .select('*')
    .order('name')
  if (error) throw error
  return data as ChecklistTemplate[]
}

export async function createChecklistTemplate(input: {
  name: string; category?: string
}): Promise<ChecklistTemplate> {
  const { data, error } = await supabaseWriter
    .from('checklist_templates')
    .insert({ name: input.name, category: input.category ?? null })
    .select()
    .single()
  if (error) throw error
  return data as ChecklistTemplate
}

export async function updateChecklistTemplate(
  id: string,
  patch: Partial<Pick<ChecklistTemplate, 'name' | 'category'>>
): Promise<void> {
  const { error } = await supabaseWriter
    .from('checklist_templates')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteChecklistTemplate(id: string): Promise<void> {
  const { error } = await supabaseWriter
    .from('checklist_templates')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function duplicateChecklistTemplate(id: string): Promise<ChecklistTemplate> {
  const { data: tpl, error: e1 } = await supabase
    .from('checklist_templates').select('*').eq('id', id).single()
  if (e1 || !tpl) throw e1 ?? new Error('Template not found')

  const { data: newTpl, error: e2 } = await supabaseWriter
    .from('checklist_templates')
    .insert({ name: (tpl as ChecklistTemplate).name + ' (copia)', category: (tpl as ChecklistTemplate).category })
    .select().single()
  if (e2 || !newTpl) throw e2 ?? new Error('Failed to duplicate')

  const { data: items } = await supabase
    .from('template_items').select('*').eq('template_id', id).order('sort_order')

  if (items && items.length > 0) {
    const copies = (items as TemplateItem[]).map(({ id: _id, template_id: _tid, created_at: _ca, ...rest }) => ({
      ...rest,
      template_id: (newTpl as ChecklistTemplate).id,
    }))
    await supabaseWriter.from('template_items').insert(copies)
  }

  return newTpl as ChecklistTemplate
}

// ── TEMPLATE ITEMS ────────────────────────────────────────────────────────────
export async function fetchTemplateItems(templateId: string): Promise<TemplateItem[]> {
  const { data, error } = await supabase
    .from('template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order')
  if (error) throw error
  return data as TemplateItem[]
}

export async function createTemplateItem(input: {
  template_id: string; name: string; category?: string; default_qty?: number; sort_order?: number
}): Promise<TemplateItem> {
  const { data, error } = await supabaseWriter
    .from('template_items')
    .insert({
      template_id: input.template_id,
      name:        input.name,
      category:    input.category    ?? null,
      default_qty: input.default_qty ?? 1,
      sort_order:  input.sort_order  ?? 0,
    })
    .select()
    .single()
  if (error) throw error
  return data as TemplateItem
}

export async function updateTemplateItem(
  id: string,
  patch: Partial<Pick<TemplateItem, 'name' | 'category' | 'default_qty' | 'sort_order'>>
): Promise<void> {
  const { error } = await supabaseWriter.from('template_items').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteTemplateItem(id: string): Promise<void> {
  const { error } = await supabaseWriter.from('template_items').delete().eq('id', id)
  if (error) throw error
}

// ── EVENT CHECKLISTS ──────────────────────────────────────────────────────────
export async function fetchEventChecklists(eventId: string): Promise<EventChecklist[]> {
  const { data, error } = await supabase
    .from('event_checklists')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at')
  if (error) throw error
  return data as EventChecklist[]
}

export async function createEventChecklist(input: {
  event_id: string; type: 'reception' | 'delivery'; template_id?: string
}): Promise<EventChecklist> {
  const { data, error } = await supabaseWriter
    .from('event_checklists')
    .insert({
      event_id:    input.event_id,
      type:        input.type,
      status:      'pending',
      template_id: input.template_id ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as EventChecklist
}

export async function updateChecklistStatus(
  id: string,
  status: 'pending' | 'in_progress' | 'completed'
): Promise<void> {
  const patch: Record<string, unknown> = { status }
  if (status === 'completed') patch.completed_at = new Date().toISOString()
  const { error } = await supabaseWriter.from('event_checklists').update(patch).eq('id', id)
  if (error) throw error
}

// ── CHECKLIST ITEMS ───────────────────────────────────────────────────────────
export async function fetchChecklistItems(checklistId: string): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('checklist_id', checklistId)
    .order('sort_order')
  if (error) throw error
  return (data ?? []).map(row => ({
    ...row,
    photos: row.photos ?? [],
  })) as ChecklistItem[]
}

export async function createChecklistItem(input: {
  checklist_id: string; name: string; category?: string; qty?: number; sort_order?: number
}): Promise<ChecklistItem> {
  const { data, error } = await supabaseWriter
    .from('checklist_items')
    .insert({
      checklist_id: input.checklist_id,
      name:         input.name,
      category:     input.category  ?? null,
      qty:          input.qty       ?? 1,
      sort_order:   input.sort_order ?? 0,
      photos:       [],
    })
    .select()
    .single()
  if (error) throw error
  return { ...data, photos: data.photos ?? [] } as ChecklistItem
}

export async function updateChecklistItem(
  id: string,
  patch: Partial<Pick<ChecklistItem, 'name' | 'category' | 'qty' | 'condition_in' | 'condition_out' | 'notes' | 'photos' | 'sort_order'>>
): Promise<void> {
  const { error } = await supabaseWriter.from('checklist_items').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const { error } = await supabaseWriter.from('checklist_items').delete().eq('id', id)
  if (error) throw error
}

// ── FLUJO: crear planilla desde plantilla ────────────────────────────────────
export async function createReceptionFromTemplate(
  eventId: string, templateId: string
): Promise<{ checklist: EventChecklist; items: ChecklistItem[] }> {
  const checklist = await createEventChecklist({ event_id: eventId, type: 'reception', template_id: templateId })
  const tplItems  = await fetchTemplateItems(templateId)

  let items: ChecklistItem[] = []
  if (tplItems.length > 0) {
    const rows = tplItems.map(ti => ({
      checklist_id: checklist.id,
      name:         ti.name,
      category:     ti.category,
      qty:          ti.default_qty,
      sort_order:   ti.sort_order,
      photos:       [],
    }))
    const { data, error } = await supabaseWriter.from('checklist_items').insert(rows).select()
    if (error) throw error
    items = (data ?? []).map(r => ({ ...r, photos: r.photos ?? [] })) as ChecklistItem[]
  }

  return { checklist, items }
}

// ── FLUJO: crear planilla de entrega copiando desde recepción ────────────────
export async function createDeliveryFromReception(
  receptionChecklistId: string, eventId: string
): Promise<{ checklist: EventChecklist; items: ChecklistItem[] }> {
  const receptionItems = await fetchChecklistItems(receptionChecklistId)
  const checklist      = await createEventChecklist({ event_id: eventId, type: 'delivery' })

  let items: ChecklistItem[] = []
  if (receptionItems.length > 0) {
    const rows = receptionItems.map(ri => ({
      checklist_id:  checklist.id,
      name:          ri.name,
      category:      ri.category,
      qty:           ri.qty,
      condition_in:  ri.condition_in,  // referencia al estado inicial
      condition_out: null,             // por llenar en entrega
      notes:         null,
      sort_order:    ri.sort_order,
      photos:        [],
    }))
    const { data, error } = await supabaseWriter.from('checklist_items').insert(rows).select()
    if (error) throw error
    items = (data ?? []).map(r => ({ ...r, photos: r.photos ?? [] })) as ChecklistItem[]
  }

  return { checklist, items }
}

// ── STORAGE: subir foto ───────────────────────────────────────────────────────
export async function uploadItemPhoto(
  eventId: string, checklistId: string, itemId: string, file: File
): Promise<string> {
  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${eventId}/${checklistId}/${itemId}/${genId()}.${ext}`

  const { error } = await supabaseWriter.storage
    .from('event-photos')
    .upload(path, file, { upsert: false })
  if (error) throw error

  const { data } = supabase.storage.from('event-photos').getPublicUrl(path)
  return data.publicUrl
}

// ── DELTA ─────────────────────────────────────────────────────────────────────
const CONDITION_ORDER: Record<string, number> = { good: 2, fair: 1, poor: 0 }

export function calcDelta(item: ChecklistItem): 'improved' | 'same' | 'worsened' | 'not_reviewed' {
  if (!item.condition_out) return 'not_reviewed'
  if (!item.condition_in)  return 'not_reviewed'
  const diff = CONDITION_ORDER[item.condition_out] - CONDITION_ORDER[item.condition_in]
  if (diff > 0)  return 'improved'
  if (diff < 0)  return 'worsened'
  return 'same'
}
