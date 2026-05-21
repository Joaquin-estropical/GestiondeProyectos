// reorganize-edificio.mjs
// Idempotent reorganization script:
// 1. Clear subarea=NULL for all non-edificio projects
// 2. Delete subareas of non-edificio areas
// 3. Create new edificio sub-areas: Estropical, Tecnofarma, Repsol, Abbott
// 4. Create project "Marketing" inside Estropical
// 5. Move marketing area tasks → Edificio/Estropical/Marketing
// 6. Move Tropical sub-area tasks → Edificio/Generales project (gen-edificio)
// 7. Delete Tropical projects (Piso 8, Fachadas, Mantenimiento) and sub-area
// 8. Move Estropical/Credistropical project tasks → gen-edificio, delete that project
// 9. Delete marketing area projects and area itself
//
// Run with: node scripts/reorganize-edificio.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const envText = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
const env = Object.fromEntries(
  envText.split(/\r?\n/).filter(Boolean).map(line => {
    const idx = line.indexOf('=')
    return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
  })
)

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY)

function log(msg) { console.log('[reorganize]', msg) }
function err(msg, e) { console.error('[ERROR]', msg, e?.message ?? e) }

async function run() {
  // ── Current state from DB ───────────────────────────────────
  const { data: allAreas }    = await sb.from('areas').select('*')
  const { data: allSubareas } = await sb.from('subareas').select('*')
  const { data: allProjects } = await sb.from('projects').select('*')

  const byId = (arr, id) => arr?.find(x => x.id === id)
  const byName = (arr, name) => arr?.find(x => x.name?.toLowerCase() === name.toLowerCase())

  // Known IDs from previous DB inspection
  const EDIFICIO_ID    = 'edificio'
  const GEN_EDIFICIO   = 'sub-edificio-generales'   // Generales sub-area of edificio
  const TROPICAL_SUB   = allSubareas?.find(s => s.area === EDIFICIO_ID && s.name === 'Tropical')?.id
  const MARKETING_AREA = allAreas?.find(a => a.name === 'Marketing')?.id

  log(`Tropical sub-area id: ${TROPICAL_SUB}`)
  log(`Marketing area id:    ${MARKETING_AREA}`)

  // ── STEP 1: Clear subarea for non-edificio projects ─────────
  log('Step 1: Clear subarea=NULL for non-edificio projects...')
  const { error: e1 } = await sb.from('projects').update({ subarea: null }).neq('area', EDIFICIO_ID)
  if (e1) { err('Step 1', e1); process.exit(1) }
  log('Step 1 done.')

  // ── STEP 2: Delete non-edificio subareas ────────────────────
  log('Step 2: Delete subareas of non-edificio areas...')
  const { error: e2 } = await sb.from('subareas').delete().neq('area', EDIFICIO_ID)
  if (e2) { err('Step 2', e2); process.exit(1) }
  log('Step 2 done.')

  // ── STEP 3: Create new Edificio sub-areas ───────────────────
  log('Step 3: Create new sub-areas in Edificio...')
  const newSubAreas = [
    { id: 'sub-edificio-estropical', name: 'Estropical', area: EDIFICIO_ID, color: '#10B981', icon: 'building-2', slug: 'sub-edificio-estropical', type: 'general', description: null },
    { id: 'sub-edificio-tecnofarma', name: 'Tecnofarma', area: EDIFICIO_ID, color: '#8B5CF6', icon: 'building-2', slug: 'sub-edificio-tecnofarma', type: 'general', description: null },
    { id: 'sub-edificio-repsol',     name: 'Repsol',     area: EDIFICIO_ID, color: '#F97316', icon: 'building-2', slug: 'sub-edificio-repsol',     type: 'general', description: null },
    { id: 'sub-edificio-abbott',     name: 'Abbott',     area: EDIFICIO_ID, color: '#0EA5E9', icon: 'building-2', slug: 'sub-edificio-abbott',     type: 'general', description: null },
  ]
  for (const sa of newSubAreas) {
    const exists = allSubareas?.find(x => x.id === sa.id)
    if (exists) { log(`  Sub-area "${sa.name}" already exists, skipping.`); continue }
    const { error } = await sb.from('subareas').insert(sa)
    if (error) { err(`  Creating ${sa.name}`, error) } else { log(`  Created sub-area: ${sa.name}`) }
  }
  log('Step 3 done.')

  // ── STEP 4: Create project "Marketing" inside Estropical ────
  log('Step 4: Create project Marketing inside Estropical...')
  let marketingProjectId = allProjects?.find(p => p.name === 'Marketing' && p.area === EDIFICIO_ID && p.subarea === 'sub-edificio-estropical')?.id
  if (marketingProjectId) {
    log(`  Project "Marketing" already exists (id=${marketingProjectId}), skipping creation.`)
  } else {
    const newId = 'p-mkt-' + Date.now().toString(36)
    const { data, error } = await sb.from('projects').insert({
      id: newId, name: 'Marketing', area: EDIFICIO_ID,
      subarea: 'sub-edificio-estropical', due: '2099-12-31', progress: 0, count: 0,
    }).select().single()
    if (error) { err('Step 4', error); process.exit(1) }
    marketingProjectId = data.id
    log(`  Created project "Marketing" id=${marketingProjectId}`)
  }
  log('Step 4 done.')

  // ── STEP 5: Move marketing area tasks → Edificio/Estropical/Marketing ──
  if (MARKETING_AREA) {
    log('Step 5: Move marketing tasks to Edificio/Estropical/Marketing...')
    const { data: mktTasks } = await sb.from('tasks').select('id,title').eq('area', MARKETING_AREA)
    log(`  Found ${mktTasks?.length ?? 0} tasks in marketing area.`)
    if (mktTasks && mktTasks.length > 0) {
      const { error: e5 } = await sb.from('tasks')
        .update({ area: EDIFICIO_ID, project: marketingProjectId })
        .eq('area', MARKETING_AREA)
      if (e5) { err('Step 5', e5) } else { log(`  Moved ${mktTasks.length} tasks.`) }
    }
    log('Step 5 done.')
  } else {
    log('Step 5: Marketing area not found, skipping.')
  }

  // ── STEP 6: Move Tropical sub-area tasks → gen-edificio ─────
  if (TROPICAL_SUB) {
    log('Step 6: Move tasks from Tropical sub-area projects → gen-edificio...')
    const tropProjects = allProjects?.filter(p => p.subarea === TROPICAL_SUB)
    log(`  Tropical projects: ${tropProjects?.map(p => p.name).join(', ')}`)
    if (tropProjects && tropProjects.length > 0) {
      const tropProjIds = tropProjects.map(p => p.id)
      const { data: tropTasks } = await sb.from('tasks').select('id,title').in('project', tropProjIds)
      log(`  Found ${tropTasks?.length ?? 0} tasks in Tropical projects.`)
      if (tropTasks && tropTasks.length > 0) {
        const { error: e6 } = await sb.from('tasks')
          .update({ project: 'gen-edificio' })
          .in('project', tropProjIds)
        if (e6) { err('Step 6 tasks update', e6) } else { log(`  Moved ${tropTasks.length} tasks to gen-edificio.`) }
      }
    }
    log('Step 6 done.')
  } else {
    log('Step 6: Tropical sub-area not found, skipping.')
  }

  // ── STEP 7: Delete Tropical projects and sub-area ───────────
  if (TROPICAL_SUB) {
    log('Step 7: Delete Tropical projects and sub-area...')
    const tropProjects = allProjects?.filter(p => p.subarea === TROPICAL_SUB)
    if (tropProjects && tropProjects.length > 0) {
      for (const p of tropProjects) {
        const { error } = await sb.from('projects').delete().eq('id', p.id)
        if (error) { err(`  Deleting project ${p.name}`, error) } else { log(`  Deleted project: ${p.name} (${p.id})`) }
      }
    }
    const { error: e7sub } = await sb.from('subareas').delete().eq('id', TROPICAL_SUB)
    if (e7sub) { err('Deleting Tropical sub-area', e7sub) } else { log(`  Deleted sub-area Tropical (${TROPICAL_SUB})`) }
    log('Step 7 done.')
  } else {
    log('Step 7: Tropical sub-area not found, skipping.')
  }

  // ── STEP 8: Move Estropical/Credistropical tasks → gen-edificio ──
  log('Step 8: Move Estropical/Credistropical project tasks → gen-edificio...')
  // Refresh projects after step 7 deletions
  const { data: freshProjects } = await sb.from('projects').select('*').eq('area', EDIFICIO_ID)
  const credProj = freshProjects?.find(p =>
    p.name.toLowerCase().includes('estropical') || p.name.toLowerCase().includes('credistropical')
  )
  if (credProj) {
    log(`  Found project: "${credProj.name}" (${credProj.id})`)
    const { data: credTasks } = await sb.from('tasks').select('id,title').eq('project', credProj.id)
    log(`  Tasks to move: ${credTasks?.length ?? 0}`)
    if (credTasks && credTasks.length > 0) {
      const { error: e8 } = await sb.from('tasks').update({ project: 'gen-edificio' }).eq('project', credProj.id)
      if (e8) { err('Step 8 tasks', e8) } else { log(`  Moved ${credTasks.length} tasks to gen-edificio.`) }
    }
    const { error: e8del } = await sb.from('projects').delete().eq('id', credProj.id)
    if (e8del) { err('Step 8 delete project', e8del) } else { log(`  Deleted project "${credProj.name}"`) }
  } else {
    log('  Estropical/Credistropical project not found (already deleted?), skipping.')
  }
  log('Step 8 done.')

  // ── STEP 9: Delete marketing area projects and area ─────────
  if (MARKETING_AREA) {
    log('Step 9: Delete marketing area empty projects and area...')
    const mktProjects = allProjects?.filter(p => p.area === MARKETING_AREA)
    for (const p of (mktProjects ?? [])) {
      const { data: remaining } = await sb.from('tasks').select('id').eq('project', p.id).limit(1)
      if (!remaining || remaining.length === 0) {
        const { error } = await sb.from('projects').delete().eq('id', p.id)
        if (error) { err(`  Deleting marketing project ${p.name}`, error) } else { log(`  Deleted project: ${p.name}`) }
      } else {
        log(`  Project ${p.name} still has tasks, skipping delete.`)
      }
    }
    const { error: e9area } = await sb.from('areas').delete().eq('id', MARKETING_AREA)
    if (e9area) { err('Step 9 delete area', e9area) } else { log(`  Deleted area Marketing (${MARKETING_AREA})`) }
    log('Step 9 done.')
  } else {
    log('Step 9: Marketing area not found, skipping.')
  }

  // ── VERIFICATION ────────────────────────────────────────────
  log('\n── Verification ──────────────────────────────────────')
  const { data: vAreas }    = await sb.from('areas').select('id,name').order('name')
  const { data: vSubs }     = await sb.from('subareas').select('id,name,area').order('name')
  const { data: vProjs }    = await sb.from('projects').select('id,name,area,subarea').order('area,name')
  const { count: mktTasks } = await sb.from('tasks').select('id', { count: 'exact', head: true }).eq('area', MARKETING_AREA ?? '__none__')
  const { data: genEdTasks} = await sb.from('tasks').select('id', { count: 'exact', head: true }).eq('project', 'gen-edificio')

  log('Areas: ' + vAreas?.map(a => a.name).join(', '))
  log('Sub-areas of edificio: ' + vSubs?.filter(s => s.area === EDIFICIO_ID).map(s => s.name).join(', '))
  log('Projects in edificio:')
  vProjs?.filter(p => p.area === EDIFICIO_ID).forEach(p => log(`  ${p.name} | sub=${p.subarea}`))
  log('Marketing tasks remaining: ' + (mktTasks ?? 0))
  log('Tasks in gen-edificio project: (check in app)')
  log('\n✓ Reorganization complete.')
}

run().catch(e => { console.error('Fatal:', e); process.exit(1) })
