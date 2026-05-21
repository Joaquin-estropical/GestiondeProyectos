// One-shot import script: creates Marketing area, Edificio sub-areas (Tropical,
// Bovinsa, Huawei, and one for Marketing), all needed projects, and 57 tasks
// from the Excel file. Run with: node scripts/import-tareas.mjs
//
// Reads credentials from .env.local at project root.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ── Load .env.local ──────────────────────────────────────────
const envText = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
const env = Object.fromEntries(
  envText.split(/\r?\n/).filter(Boolean).map(line => {
    const idx = line.indexOf('=')
    return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
  })
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY)

// ── Helpers ─────────────────────────────────────────────────
const STATUS_MAP = {
  'En proceso':  { status: 'curso', progress: 50 },
  'Finalizado':  { status: 'done',  progress: 100 },
  'Sin iniciar': { status: 'pend',  progress: 0 },
}

const TS = () => Date.now().toString(36)
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

let counter = 0
function newTaskId() {
  counter++
  return `t-${Date.now().toString(36)}-${counter.toString(36)}`
}
function newTaskCode() {
  counter++
  return `OT-${(Date.now() + counter).toString(36).slice(-5).toUpperCase()}`
}

async function fetchExisting() {
  const { data: areas }    = await supabase.from('areas').select('*')
  const { data: subareas } = await supabase.from('subareas').select('*')
  const { data: projects } = await supabase.from('projects').select('*')
  return { areas, subareas, projects }
}

async function ensureArea(name, color, icon, type = 'general') {
  const existing = (await supabase.from('areas').select('*').eq('name', name)).data
  if (existing && existing.length > 0) {
    console.log(`  ↳ Area existente: ${name} (${existing[0].id})`)
    return existing[0]
  }
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const id   = `${slug}-${TS()}`
  const { data, error } = await supabase.from('areas').insert({
    id, slug, name, color, icon, type, description: null,
  }).select().single()
  if (error) throw new Error(`createArea(${name}): ${error.message}`)
  console.log(`  ✓ Area creada: ${name} (${id})`)
  // Backfill: ensure it also has a "Generales" sub-area
  await ensureSubArea(data.id, 'Generales', color, 'Layers', 'general')
  return data
}

async function ensureSubArea(areaId, name, color, icon, type = 'general') {
  const existing = (await supabase.from('subareas').select('*').eq('area', areaId).eq('name', name)).data
  if (existing && existing.length > 0) {
    console.log(`  ↳ Sub-area existente: ${name} bajo ${areaId} (${existing[0].id})`)
    return existing[0]
  }
  const slug = `sub-${areaId}-${name.toLowerCase().replace(/\s+/g, '-')}-${TS()}`
  const { data, error } = await supabase.from('subareas').insert({
    id: slug, slug, name, area: areaId, color, icon, type, description: null,
  }).select().single()
  if (error) throw new Error(`createSubArea(${name} in ${areaId}): ${error.message}`)
  console.log(`  ✓ Sub-area creada: ${name} bajo ${areaId} (${slug})`)
  return data
}

async function ensureProject(name, areaId, subareaId) {
  // Match by name within the same sub-area
  const existing = (await supabase.from('projects').select('*').eq('subarea', subareaId).eq('name', name)).data
  if (existing && existing.length > 0) {
    console.log(`  ↳ Proyecto existente: ${name} (${existing[0].id})`)
    return existing[0]
  }
  const id = `p-${TS()}-${Math.random().toString(36).slice(2, 5)}`
  const { data, error } = await supabase.from('projects').insert({
    id, name, area: areaId, subarea: subareaId,
    due: '2099-12-31', progress: 0, count: 0,
  }).select().single()
  if (error) throw new Error(`createProject(${name}): ${error.message}`)
  console.log(`  ✓ Proyecto creado: ${name} (${id})`)
  return data
}

async function insertTask(t) {
  const id   = newTaskId()
  const code = newTaskCode()
  const { status, progress } = STATUS_MAP[t.estadoExcel] ?? { status: 'pend', progress: 0 }
  const tags = t.helper ? [`helper:${t.helper}`] : []
  const row = {
    id, code,
    title:          t.title,
    project:        t.projectId,
    area:           t.areaId,
    assignee:       t.assignee,
    due:            t.due || '2099-12-31',
    priority:       'med',
    status,
    time:           '0h',
    comments:       0,
    subtasks_done:  0,
    subtasks_total: 0,
    description:    t.description ?? null,
    start_date:     t.start ?? null,
    end_date:       t.end ?? null,
    progress,
    is_milestone:   false,
    sort_order:     0,
    tags,
  }
  const { error } = await supabase.from('tasks').insert(row)
  if (error) throw new Error(`createTask(${t.title}): ${error.message}`)
  console.log(`  ✓ Task: ${t.title.slice(0, 60)}${t.title.length > 60 ? '…' : ''}`)
  await sleep(30) // mild rate-limit politeness
}

// ── MAIN ────────────────────────────────────────────────────
async function main() {
  console.log('=== Importación de tareas Excel → app ===\n')

  // Step 0: load existing structures
  const { areas: existingAreas, subareas: existingSubAreas } = await fetchExisting()
  const findArea    = (name) => existingAreas.find(a => a.name === name)
  const findSubArea = (areaId, name) => existingSubAreas.find(sa => sa.area === areaId && sa.name === name)

  // Step 1: ensure areas
  console.log('--- 1. Áreas ---')
  const edificio  = findArea('Edificio')
  if (!edificio) throw new Error('Área Edificio no existe; abortar')
  const outlets   = findArea('Outlets')
  const sucursales = findArea('Sucursales')
  const jeronimo  = existingAreas.find(a => a.name === 'Jerónimo V.')
  const fanny     = existingAreas.find(a => a.name === 'Sra. Fanny')
  const marketing = await ensureArea('Marketing', '#A855F7', 'Megaphone', 'general')

  console.log('\n--- 2. Sub-áreas ---')
  // For Edificio: ensure Tropical, Bovinsa, Huawei (Generales already exists from backfill)
  const subEdGenerales = findSubArea(edificio.id, 'Generales') ?? await ensureSubArea(edificio.id, 'Generales', edificio.color, 'Layers')
  const subEdTropical  = await ensureSubArea(edificio.id, 'Tropical', '#14B8A6', 'Building2')
  const subEdBovinsa   = await ensureSubArea(edificio.id, 'Bovinsa',  '#06B6D4', 'Building2')
  const subEdHuawei    = await ensureSubArea(edificio.id, 'Huawei',   '#EF4444', 'Building2')

  // For Marketing: a Generales sub-area (will already exist if marketing was just created via ensureArea)
  const subMktGenerales = findSubArea(marketing.id, 'Generales')
    ?? (await supabase.from('subareas').select('*').eq('area', marketing.id).eq('name', 'Generales')).data?.[0]
    ?? await ensureSubArea(marketing.id, 'Generales', marketing.color, 'Layers')

  // Re-load existing sub-areas to pick up Generales of other areas (created by migration backfill)
  const subOutletsGen   = findSubArea(outlets.id, 'Generales')
  const subSucursalesGen = findSubArea(sucursales.id, 'Generales')
  const subJeronimoGen  = findSubArea(jeronimo.id, 'Generales')
  const subFannyGen     = findSubArea(fanny.id, 'Generales')

  if (!subOutletsGen || !subSucursalesGen || !subJeronimoGen || !subFannyGen) {
    throw new Error('Falta alguna sub-area Generales backfilleada. Reapliquemos la migración.')
  }

  console.log('\n--- 3. Proyectos ---')
  // Edificio / Tropical
  const pPiso8         = await ensureProject('Piso 8',         edificio.id, subEdTropical.id)
  const pFachadas      = await ensureProject('Fachadas',       edificio.id, subEdTropical.id)
  const pMantenimiento = await ensureProject('Mantenimiento',  edificio.id, subEdTropical.id)
  // Edificio / Generales
  const pCredistropical = await ensureProject('Estropical/Credistropical', edificio.id, subEdGenerales.id)
  const genEdificio     = (await supabase.from('projects').select('*').eq('id', 'gen-edificio')).data[0]

  // Marketing / Generales
  const pMktEventos    = await ensureProject('Eventos & Outlet móvil', marketing.id, subMktGenerales.id)
  const pMktMateriales = await ensureProject('Materiales',             marketing.id, subMktGenerales.id)

  // Sucursales / Generales (and existing gen-sucursales)
  const genSucursales = (await supabase.from('projects').select('*').eq('id', 'gen-sucursales')).data[0]
  const pCbba         = await ensureProject('Sucursal CBBA Aeropuerto', sucursales.id, subSucursalesGen.id)
  const pViru         = await ensureProject('Sucursal Viru Viru',       sucursales.id, subSucursalesGen.id)
  const pTarija       = await ensureProject('Sucursal Tarija',          sucursales.id, subSucursalesGen.id)
  const pSucre        = await ensureProject('Sucursal Sucre',           sucursales.id, subSucursalesGen.id)
  const pVentura      = await ensureProject('Ventura Sur',              sucursales.id, subSucursalesGen.id)
  const pSimonLopez   = await ensureProject('Simón López',              sucursales.id, subSucursalesGen.id)
  const pHipermaxi    = await ensureProject('Hipermaxi Sur',            sucursales.id, subSucursalesGen.id)

  // Outlets / Generales (and existing gen-outlets)
  const genOutlets   = (await supabase.from('projects').select('*').eq('id', 'gen-outlets')).data[0]
  const pOutletOruro = await ensureProject('Outlet Oruro',     outlets.id, subOutletsGen.id)
  const pOutletScz   = await ensureProject('Outlet SCZ',       outlets.id, subOutletsGen.id)
  const pOutletLpb   = await ensureProject('Outlet LPB 2026',  outlets.id, subOutletsGen.id)

  // Jerónimo V. / Generales (existing p-mp4zod4q, p-mp8lem7e shaft, p-mp5vg7ca goteras)
  const pJerGenerales = (await supabase.from('projects').select('*').eq('id', 'p-mp4zod4q')).data[0]
  const pJerShaft     = (await supabase.from('projects').select('*').eq('id', 'p-mp8lem7e')).data[0]
  const pKaraoke      = await ensureProject('Karaoke',                 jeronimo.id, subJeronimoGen.id)
  const pAppGestion   = await ensureProject('App Gestión Proyectos',   jeronimo.id, subJeronimoGen.id)

  // Sra. Fanny / Generales (existing p-mpcs82t6 Mueblería)
  const pFannyMueble = (await supabase.from('projects').select('*').eq('id', 'p-mpcs82t6')).data[0]

  console.log('\n--- 4. Tareas (57) ---')

  // Build canonical task array. Each task: { title, areaId, projectId, assignee, helper, start, end, due, estadoExcel, description }
  const tasks = [
    // # 1
    { title: 'INSONORIZACION', areaId: edificio.id, projectId: pPiso8.id, assignee: 'fab', helper: 'joa', start: '2026-04-07', end: '2026-05-16', due: '2026-05-16', estadoExcel: 'En proceso', description: 'Rodrigo propone colocar una malla para asegurar la fibra, a la espera de respuesta de repsol' },
    { title: 'COMUNICADO PARA RRHH', areaId: edificio.id, projectId: genEdificio.id, assignee: 'fab', helper: 'joa', start: '2026-05-12', end: '2026-05-12', due: '2026-05-12', estadoExcel: 'Finalizado', description: 'ENVIADO EL VIERNES 15' },
    { title: 'CERRAMIENTO PISO 8', areaId: edificio.id, projectId: pPiso8.id, assignee: 'fab', helper: null, start: '2026-05-15', end: '2026-06-06', due: '2026-06-06', estadoExcel: 'En proceso', description: 'INICIO DE OBRAS VIERNES 15 - DESGLOSE DE TRABAJOS' },
    { title: 'BAJANTE PLUVIAL', areaId: edificio.id, projectId: pPiso8.id, assignee: 'fab', helper: null, start: '2026-05-15', end: '2026-06-06', due: '2026-06-06', estadoExcel: 'En proceso', description: 'SE DARA INICIO CUANDO SE INSTALE LA FIBRA EN EL CERRAMIENTO DEL PISO 8 - COMUNICAR A TECNOFARMA' },
    { title: 'APLICACION LOVABLE', areaId: jeronimo.id, projectId: pAppGestion.id, assignee: 'joa', helper: null, start: null, end: '2026-04-30', due: '2026-04-30', estadoExcel: 'En proceso', description: 'AVANCE EN ADECUAR LA INFORMACION' },
    { title: 'AVANCES DEL CONTRATO CON BOVINSA (NUEVO CONTRATO)', areaId: edificio.id, projectId: null, assignee: 'ximena', helper: null, start: '2026-03-24', end: '2026-04-02', due: '2026-04-02', estadoExcel: 'En proceso', description: 'FIRMA DE LA SRA IBETTE', subareaKey: 'edificio-bovinsa' },
    { title: 'VIDRIOS EN FACHADA SELLADO', areaId: edificio.id, projectId: pFachadas.id, assignee: 'fab', helper: 'joa', start: '2026-03-24', end: null, due: '2099-12-31', estadoExcel: 'En proceso', description: 'EA LA ESPERA DEL ING PAZ' },
    { title: 'LISTADO DEL PERSONAL INGRESO DE OBRAS CBBA', areaId: sucursales.id, projectId: pCbba.id, assignee: 'fab', helper: 'joa', start: '2026-04-01', end: '2026-04-04', due: '2026-04-04', estadoExcel: 'Finalizado', description: 'CBBA LISTO' },
    { title: 'ELEVADORES CONTRATO REALIZADO (AUD. MANT.)', areaId: edificio.id, projectId: pMantenimiento.id, assignee: 'fab', helper: null, start: null, end: '2026-05-12', due: '2026-05-12', estadoExcel: 'En proceso', description: 'PENDIENTE DE RECEPCIÓN DE CONTRATO DE ORONA, SIGUE PENDIENTE A LA FECHA 19' },
    { title: 'FILTRACIONES EN FACHADAS VIDRIADA', areaId: edificio.id, projectId: pFachadas.id, assignee: 'joa', helper: null, start: '2026-03-31', end: null, due: '2099-12-31', estadoExcel: 'En proceso', description: 'ESPERANDO RETORNO DE INGENIERO PAZ PARA LOS PLANOS DE FACHADAS' },
    { title: 'MEDIDAS DE GARANTIA - MANTENIMIENTO DE TRANSFORMADORES ELECTRICOS', areaId: edificio.id, projectId: pMantenimiento.id, assignee: 'fab', helper: 'joa', start: '2026-03-31', end: null, due: '2099-12-31', estadoExcel: 'En proceso', description: 'COTIZACION 1 RECIBIDA, COTIZACION 2 NO HACE EL SERVICIO' },
    { title: 'MANTENIMIENTO DE GABINETES CONTRA INCENDIOS', areaId: edificio.id, projectId: pMantenimiento.id, assignee: 'fab', helper: null, start: '2026-03-31', end: null, due: '2099-12-31', estadoExcel: 'En proceso', description: 'FALA COTIZACION DE ACONTRI' },
    { title: 'SEGUIMIENTO SEMANAL DE SUCURSALES - EDIFICIO', areaId: sucursales.id, projectId: genSucursales.id, assignee: 'fab', helper: 'joa', start: '2026-04-07', end: null, due: '2099-12-31', estadoExcel: 'Finalizado', description: 'Las palmas hipermaxi sur realizadas y se realizaron adecuaciones en las oficinas 04/05/26, UNA VEZ FINALIZADO OUTLET SE DARA CONTINUIDAD' },
    { title: 'AUTORIZACION NAABOL VIRU VIRU', areaId: sucursales.id, projectId: pViru.id, assignee: 'legal', helper: null, start: '2026-04-14', end: '2026-04-21', due: '2026-04-21', estadoExcel: 'En proceso', description: 'esperando respuesta de NAABOL' },
    { title: 'DISEÑO VENTURA SUR', areaId: sucursales.id, projectId: pVentura.id, assignee: 'joa', helper: null, start: '2026-04-13', end: null, due: '2099-12-31', estadoExcel: 'En proceso', description: 'PENDIENTE DE APROBACION DEL AREA COMERCIAL' },
    { title: 'CUANTIFICACIÓN DE TAREAS', areaId: jeronimo.id, projectId: pJerGenerales.id, assignee: 'fab', helper: 'joa', start: '2026-04-28', end: '2026-04-28', due: '2026-04-28', estadoExcel: 'Finalizado', description: null },
    { title: 'CORREO A IVAN SOBRE SILLAS Y LOS ARTES', areaId: jeronimo.id, projectId: pJerGenerales.id, assignee: 'fab', helper: null, start: '2026-04-28', end: '2026-04-28', due: '2026-04-28', estadoExcel: 'Finalizado', description: null },
    { title: 'RESPUESTA A VANESA CORREO SUCURSAL TARIJA', areaId: sucursales.id, projectId: pTarija.id, assignee: 'fab', helper: null, start: '2026-04-28', end: '2026-04-28', due: '2026-04-28', estadoExcel: 'Finalizado', description: 'FALTA DE ENTREGA DE DISPENSADOR' },
    { title: 'ENVÍO DE MOBILIARIO A CBBA', areaId: sucursales.id, projectId: pCbba.id, assignee: 'fab', helper: null, start: '2026-04-28', end: '2026-04-29', due: '2026-04-29', estadoExcel: 'Finalizado', description: null },
    { title: 'ENVÍO MOBILIARIO A SUCRE', areaId: sucursales.id, projectId: pSucre.id, assignee: 'fab', helper: null, start: '2026-04-28', end: '2026-04-29', due: '2026-04-29', estadoExcel: 'Finalizado', description: 'Materiales enviados' },
    { title: 'LETRERO ESTROPICAL REVISIÓN', areaId: edificio.id, projectId: pCredistropical.id, assignee: 'fab', helper: null, start: '2026-04-28', end: '2026-05-05', due: '2026-05-05', estadoExcel: 'Finalizado', description: 'LETRERO YA ILUMINADO' },
    { title: 'DEMOLICIÓN DE MINI GOLF OFICINA JERONIMO', areaId: jeronimo.id, projectId: pJerGenerales.id, assignee: 'fab', helper: null, start: '2026-04-28', end: '2026-05-07', due: '2026-05-07', estadoExcel: 'Finalizado', description: 'Demolicion realizada, se inicia la impermeabilizacion 05/05/26' },
    { title: 'COTIZACIÓN DE REMODELACIÓNES PISO 8', areaId: edificio.id, projectId: pPiso8.id, assignee: 'fab', helper: null, start: '2026-05-28', end: '2026-05-30', due: '2026-05-30', estadoExcel: 'Finalizado', description: 'Cotizaciones realizadas, a la espera de confimacion para inicio de obras' },
    { title: 'ENVIO DE MUEBLES Y MATERIALES PARA SUCURSAL AEROPUERTO CBBA', areaId: sucursales.id, projectId: pCbba.id, assignee: 'fab', helper: null, start: '2026-04-28', end: '2026-05-29', due: '2026-05-29', estadoExcel: 'Finalizado', description: 'Items entregados' },
    { title: 'ELABORACION DE TARJETAS PERSONALES ELVIRA', areaId: marketing.id, projectId: pMktMateriales.id, assignee: 'fab', helper: null, start: '2026-04-28', end: '2026-05-04', due: '2026-05-04', estadoExcel: 'Finalizado', description: 'MKT tardo en entregar el modelo, hoy nos entregan y se envia' },
    { title: 'ELABORACION DE TARJETAS PERSONALES GUILLERMO ECHEGARAY', areaId: marketing.id, projectId: pMktMateriales.id, assignee: 'fab', helper: null, start: '2026-04-29', end: '2026-05-05', due: '2026-05-05', estadoExcel: 'Finalizado', description: '05/05/26 se entregarán (fecha inicio corregida de 2026-05-29 → 2026-04-29: typo asumido)' },
    { title: 'ENVIO DE TVS A ORURO PARA EL OUTLET', areaId: outlets.id, projectId: pOutletOruro.id, assignee: 'fab', helper: null, start: '2026-04-28', end: '2026-05-06', due: '2026-05-06', estadoExcel: 'Finalizado', description: 'TVs enviada, pendiente recoger - Ramiro Villca' },
    { title: 'ELABORACION DE FAR PARA SILVIA TORRICO - OUTLET ORURO', areaId: outlets.id, projectId: pOutletOruro.id, assignee: 'fab', helper: null, start: '2026-04-26', end: '2026-05-06', due: '2026-05-06', estadoExcel: 'Finalizado', description: 'FAR realizado, pendiente desembolso' },
    { title: 'ELABORACION DE PM PARA CORTINAS DE AREA DE BODAS', areaId: edificio.id, projectId: genEdificio.id, assignee: 'fab', helper: null, start: '2026-04-27', end: '2026-04-28', due: '2026-04-28', estadoExcel: 'Finalizado', description: 'Trabajo finalizado' },
    { title: 'REUNION CON BOVINSA PARA NUEVA OFICINA PISO 7', areaId: edificio.id, projectId: null, assignee: 'fab', helper: null, start: '2026-04-28', end: '2026-04-30', due: '2026-04-30', estadoExcel: 'En proceso', description: 'PENDIENTE EL CONTRATO - ELLOS ENVIARAN', subareaKey: 'edificio-bovinsa' },
    { title: 'ARREGLO DE LAMPARA HIPERMAXI SUR', areaId: sucursales.id, projectId: pHipermaxi.id, assignee: 'fab', helper: null, start: '2026-05-04', end: null, due: '2099-12-31', estadoExcel: 'Finalizado', description: 'TRABAJO REALIZADO. (Fecha fin del Excel inválida)' },
    { title: 'REVSION LOCAL VENTURA SUR', areaId: sucursales.id, projectId: pVentura.id, assignee: 'joa', helper: null, start: '2026-05-04', end: null, due: '2099-12-31', estadoExcel: 'Finalizado', description: 'VISITA COORDINADA PARA 13/05 CON ARQUITECTOS' },
    { title: 'COMPRA DE IMPERMEABILIZANTES PARA KARAOKE', areaId: jeronimo.id, projectId: pKaraoke.id, assignee: 'joa', helper: null, start: '2026-05-11', end: null, due: '2099-12-31', estadoExcel: 'Finalizado', description: null },
    { title: 'REVISION DE OLORES EN KARAOKE', areaId: jeronimo.id, projectId: pKaraoke.id, assignee: 'joa', helper: null, start: '2026-05-11', end: null, due: '2099-12-31', estadoExcel: 'Finalizado', description: null },
    { title: 'COMPRA DE MATERIALES PARA SHAFT', areaId: jeronimo.id, projectId: pJerShaft.id, assignee: 'joa', helper: null, start: '2026-05-12', end: null, due: '2099-12-31', estadoExcel: 'Finalizado', description: 'PENDIENTE A ENTREGA' },
    { title: 'APERTURA Y DEMOLICIÓN PARCIAL DE SHAFT', areaId: jeronimo.id, projectId: pJerShaft.id, assignee: 'joa', helper: null, start: '2026-05-12', end: null, due: '2099-12-31', estadoExcel: 'Finalizado', description: null },
    { title: 'APP DE GESTIONES DE PROYECTOS', areaId: jeronimo.id, projectId: pAppGestion.id, assignee: 'joa', helper: null, start: '2026-05-10', end: '2026-05-14', due: '2026-05-14', estadoExcel: 'En proceso', description: null },
    { title: 'COTIZAR MUEBLE PARA SRA. FANNY', areaId: fanny.id, projectId: pFannyMueble.id, assignee: 'joa', helper: null, start: '2026-05-11', end: null, due: '2099-12-31', estadoExcel: 'En proceso', description: null },
    { title: 'REUNION Y REVISION DE LOCAL VENTURA SUR', areaId: sucursales.id, projectId: pVentura.id, assignee: 'joa', helper: null, start: '2026-05-13', end: '2026-05-13', due: '2026-05-13', estadoExcel: 'Sin iniciar', description: null },
    { title: 'ENVIO DE MATERIAL OUTLET SCZ', areaId: outlets.id, projectId: pOutletScz.id, assignee: 'fab', helper: null, start: '2026-05-12', end: '2026-05-12', due: '2026-05-12', estadoExcel: 'Finalizado', description: null },
    { title: 'MONTAJE OUTLET', areaId: outlets.id, projectId: pOutletScz.id, assignee: 'fab', helper: null, start: '2026-05-12', end: '2026-05-14', due: '2026-05-14', estadoExcel: 'Finalizado', description: null },
    { title: 'MONTAJE EVENTO AGENTE 5', areaId: marketing.id, projectId: pMktEventos.id, assignee: 'fab', helper: null, start: '2026-05-14', end: '2026-05-14', due: '2026-05-14', estadoExcel: 'Finalizado', description: null },
    { title: 'DESMONTAJE EVENTO AGENTE 5', areaId: marketing.id, projectId: pMktEventos.id, assignee: 'fab', helper: null, start: '2026-05-16', end: '2026-05-16', due: '2026-05-16', estadoExcel: 'Finalizado', description: null },
    { title: 'FINALIZACION OUTLET SCZ', areaId: outlets.id, projectId: pOutletScz.id, assignee: 'fab', helper: null, start: '2026-05-17', end: '2026-05-17', due: '2026-05-17', estadoExcel: 'Finalizado', description: null },
    { title: 'DESMONTAJE OUTLET SCZ', areaId: outlets.id, projectId: pOutletScz.id, assignee: 'fab', helper: null, start: '2026-05-17', end: '2026-05-18', due: '2026-05-18', estadoExcel: 'Finalizado', description: null },
    { title: 'RECEPCION DE MATERIAL OUTLET', areaId: outlets.id, projectId: pOutletScz.id, assignee: 'fab', helper: null, start: '2026-05-18', end: '2026-05-18', due: '2026-05-18', estadoExcel: 'Finalizado', description: null },
    { title: 'CONTROL E INVENTARIO DEL MATERIAL', areaId: outlets.id, projectId: pOutletScz.id, assignee: 'fab', helper: null, start: '2026-05-19', end: null, due: '2099-12-31', estadoExcel: 'En proceso', description: null },
    { title: 'PPTO OUTLET LPB 2026', areaId: outlets.id, projectId: pOutletLpb.id, assignee: 'fab', helper: null, start: '2026-05-19', end: '2026-05-25', due: '2026-05-25', estadoExcel: 'En proceso', description: null },
    { title: 'COMPARATIVA DE PRECIOS SIMON LOPEZ', areaId: sucursales.id, projectId: pSimonLopez.id, assignee: 'fab', helper: 'joa', start: '2026-05-19', end: '2026-05-20', due: '2026-05-20', estadoExcel: 'Finalizado', description: 'CONFIRMADO INICIO DE OBRAS SIN PARTE EXTERIOR' },
    { title: 'GARAGE PARA HUAWEI', areaId: edificio.id, projectId: null, assignee: 'fab', helper: null, start: '2026-05-19', end: '2026-05-21', due: '2026-05-21', estadoExcel: 'En proceso', description: 'PARQUEO 57', subareaKey: 'edificio-huawei' },
    { title: 'SOLICITUD DE RETIRO DE TOMA DE AGUA CREDISEGUROS', areaId: edificio.id, projectId: genEdificio.id, assignee: 'fab', helper: null, start: '2026-05-19', end: '2026-05-21', due: '2026-05-21', estadoExcel: 'En proceso', description: 'PENDIENTE CONFIRMACION DE REPSOL' },
    { title: 'RESPUESTA AL CORREO DE REPSOL - NOTAS', areaId: edificio.id, projectId: genEdificio.id, assignee: 'fab', helper: null, start: '2026-05-19', end: '2026-05-20', due: '2026-05-20', estadoExcel: 'Finalizado', description: null },
    { title: 'CONTRATO DE ALQUILER DE ESTROPICAL', areaId: edificio.id, projectId: pCredistropical.id, assignee: 'fab', helper: null, start: '2026-05-19', end: null, due: '2099-12-31', estadoExcel: 'En proceso', description: null },
    { title: 'NUEVO COMEDOR ESTROPICAL', areaId: edificio.id, projectId: pCredistropical.id, assignee: 'fab', helper: 'joa', start: '2026-05-19', end: '2026-05-25', due: '2026-05-25', estadoExcel: 'En proceso', description: null },
    { title: 'REVISION DE ESTADO DE TVS OUTLETS', areaId: outlets.id, projectId: genOutlets.id, assignee: 'fab', helper: null, start: '2026-05-19', end: '2026-05-25', due: '2026-05-25', estadoExcel: 'En proceso', description: null },
    { title: 'REVISION DE ESTADO DE SOPORTES OUTLET', areaId: outlets.id, projectId: genOutlets.id, assignee: 'fab', helper: null, start: '2026-05-19', end: '2026-05-25', due: '2026-05-25', estadoExcel: 'En proceso', description: null },
    { title: 'ADHESIVOS PARA AEROPUERTO CBBA - INCLUIDA PUERTA DE CAJA', areaId: sucursales.id, projectId: pCbba.id, assignee: 'fab', helper: null, start: '2026-05-19', end: null, due: '2099-12-31', estadoExcel: 'En proceso', description: 'HUBO REUNION CON MKT SE CONSULTARA A NAABOL SI SE PUEDE COLOCAR ADHESIVO PLENOS' },
  ]

  // Resolve "subareaKey" placeholders to actual projectIds — Bovinsa/Huawei need a project to attach tasks to
  // We'll create a "Generales" project inside each of those sub-areas to hold misc tasks.
  const pBovinsaGen = await ensureProject('Generales', edificio.id, subEdBovinsa.id)
  const pHuaweiGen  = await ensureProject('Generales', edificio.id, subEdHuawei.id)

  for (const t of tasks) {
    if (t.subareaKey === 'edificio-bovinsa') t.projectId = pBovinsaGen.id
    if (t.subareaKey === 'edificio-huawei')  t.projectId = pHuaweiGen.id
  }

  if (tasks.length !== 57) {
    console.warn(`AVISO: el array tiene ${tasks.length} tareas, esperaba 57.`)
  }

  for (const t of tasks) {
    await insertTask(t)
  }

  console.log('\n=== Importación completa ===')
  console.log(`Total tareas insertadas: ${tasks.length}`)
}

main().catch(err => {
  console.error('\n❌ FALLA:', err.message)
  console.error(err.stack)
  process.exit(1)
})
