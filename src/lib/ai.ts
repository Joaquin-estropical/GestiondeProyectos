import Anthropic from '@anthropic-ai/sdk'
import type { Area, Project, Task, Member } from '@/types'

// Client-side key usage is acceptable for this internal tool (3 users, no public access).
// Key is stored in VITE_ANTHROPIC_API_KEY env var.
function getClient() {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined
  if (!key) throw new Error('VITE_ANTHROPIC_API_KEY no está configurado. Agrega la variable de entorno.')
  return new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true })
}

export interface AppContext {
  areas:    Area[]
  projects: Project[]
  tasks:    Task[]
  members:  Member[]
  currentUserName: string
}

function buildSystemPrompt(ctx: AppContext): string {
  const today = new Date().toISOString().slice(0, 10)

  const areasSummary = ctx.areas.map(a => {
    const aProjects = ctx.projects.filter(p => p.area === a.id)
    const aTasks    = ctx.tasks.filter(t => t.area === a.id)
    const open      = aTasks.filter(t => t.status !== 'done').length
    const done      = aTasks.filter(t => t.status === 'done').length
    const overdue   = aTasks.filter(t => t.status !== 'done' && t.due < today).length
    const blocked   = aTasks.filter(t => t.status === 'block').length
    return `- ${a.name}: ${aProjects.length} proyectos, ${open} tareas abiertas, ${done} completadas, ${overdue} vencidas, ${blocked} bloqueadas`
  }).join('\n')

  const membersSummary = ctx.members.map(m => {
    const mTasks  = ctx.tasks.filter(t => t.assignee === m.id)
    const open    = mTasks.filter(t => t.status !== 'done').length
    const done    = mTasks.filter(t => t.status === 'done').length
    const overdue = mTasks.filter(t => t.status !== 'done' && t.due < today).length
    const blocked = mTasks.filter(t => t.status === 'block').length
    return `- ${m.name} (${m.role}): ${open} abiertas, ${done} completadas, ${overdue} vencidas, ${blocked} bloqueadas`
  }).join('\n')

  const projectsSummary = ctx.projects.slice(0, 20).map(p => {
    const area = ctx.areas.find(a => a.id === p.area)
    const pTasks = ctx.tasks.filter(t => t.project === p.id)
    const open   = pTasks.filter(t => t.status !== 'done').length
    return `- [${area?.name ?? p.area}] ${p.name}: ${p.progress}% completado, vence ${p.due}, ${open} tareas abiertas`
  }).join('\n')

  const recentOverdue = ctx.tasks
    .filter(t => t.status !== 'done' && t.due < today)
    .slice(0, 10)
    .map(t => {
      const m    = ctx.members.find(x => x.id === t.assignee)
      const area = ctx.areas.find(a => a.id === t.area)
      return `- [${area?.name ?? t.area}] "${t.title}" · asignada a ${m?.name ?? t.assignee} · vencía ${t.due}`
    }).join('\n')

  const blockedTasks = ctx.tasks
    .filter(t => t.status === 'block')
    .slice(0, 10)
    .map(t => {
      const m    = ctx.members.find(x => x.id === t.assignee)
      const area = ctx.areas.find(a => a.id === t.area)
      return `- [${area?.name ?? t.area}] "${t.title}" · asignada a ${m?.name ?? t.assignee}`
    }).join('\n')

  return `Eres el asistente operativo de "Operaciones Tropical", una empresa boliviana de retail. Tu nombre es OT-AI.

Fecha actual: ${today}
Usuario actual: ${ctx.currentUserName}

=== RESUMEN DE DATOS EN TIEMPO REAL ===

ÁREAS (${ctx.areas.length}):
${areasSummary || '(sin áreas)'}

PROYECTOS (${ctx.projects.length}):
${projectsSummary || '(sin proyectos)'}

EQUIPO (${ctx.members.length}):
${membersSummary || '(sin miembros)'}

TOTALES:
- Total tareas: ${ctx.tasks.length}
- Tareas abiertas: ${ctx.tasks.filter(t => t.status !== 'done').length}
- Completadas: ${ctx.tasks.filter(t => t.status === 'done').length}
- Vencidas: ${ctx.tasks.filter(t => t.status !== 'done' && t.due < today).length}
- Bloqueadas: ${ctx.tasks.filter(t => t.status === 'block').length}

${recentOverdue ? `TAREAS VENCIDAS:\n${recentOverdue}` : 'SIN TAREAS VENCIDAS'}

${blockedTasks ? `TAREAS BLOQUEADAS:\n${blockedTasks}` : 'SIN TAREAS BLOQUEADAS'}

=== INSTRUCCIONES ===
- Responde siempre en español (Argentina/Bolivia), tono profesional pero cercano.
- Usa los datos reales del sistema para responder consultas. Sé analítico y específico.
- Si no hay datos suficientes para responder, dilo claramente.
- Cuando hagas recomendaciones, sé concreto: nombra personas, proyectos y fechas reales.
- Puedes responder en markdown básico (negritas, listas, etc).
- Mantén respuestas concisas — máximo 4-6 párrafos salvo que el usuario pida un reporte extenso.`
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function sendMessage(
  history: ChatMessage[],
  userMessage: string,
  ctx: AppContext,
): Promise<string> {
  const client = getClient()

  const messages = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: userMessage },
  ]

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    system: buildSystemPrompt(ctx),
    messages,
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Respuesta inesperada del modelo')
  return block.text
}

// Quick one-shot prompts for agent buttons
export async function runQuickAction(action: string, ctx: AppContext): Promise<string> {
  const prompts: Record<string, string> = {
    'resumen':    'Genera un resumen ejecutivo del estado actual de todos los proyectos y áreas. Incluye alertas críticas y recomendaciones prioritarias.',
    'bloqueos':   'Analiza todas las tareas bloqueadas y vencidas. Identifica patrones, riesgos y propone acciones concretas para desatascar cada una.',
    'reporte':    'Genera un reporte semanal completo: progreso por área, carga por persona, tareas críticas y tendencias. Formato estructurado con secciones.',
    'priorizar':  `Para ${ctx.currentUserName}: analiza su carga de trabajo actual y ordena las tareas por impacto y urgencia. Da una recomendación de qué hacer primero hoy.`,
  }
  const prompt = prompts[action] ?? action
  return sendMessage([], prompt, ctx)
}
