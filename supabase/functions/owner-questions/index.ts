import { createClient } from 'npm:@supabase/supabase-js@2.111.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY = (() => {
  try {
    const modern = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
    if (modern?.default) return String(modern.default)
  } catch {}
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
})()
const allowedOrigins = new Set(['https://evera.top', 'https://www.evera.top'])
const allowedBanks = new Set(['zhenti', 'relax1000'])
const imageTypes = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
])

const corsFor = (req: Request) => {
  const origin = req.headers.get('Origin') || ''
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://evera.top',
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}
const string = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max)
const safeEntity = (bank: string, value: unknown) => {
  const id = string(value, 160)
  const valid = bank === 'zhenti'
    ? /^(?:20(?:0[9]|1\d|2[0-6]))-(?:[1-9]|[1-3]\d|4[0-7])$/.test(id)
    : /^[a-z]{2,4}-\d{1,3}-\d{1,4}$/.test(id)
  return valid ? id : ''
}
const safeImage = (value: unknown) => {
  const src = string(value, 1000)
  if (/^\/?(?:data\/|question-images\/|explanations\/|assets\/)/.test(src)) return src
  if (SUPABASE_URL && src.startsWith(`${SUPABASE_URL}/storage/v1/object/public/question-assets/`)) return src
  return ''
}
const safeImages = (value: unknown) => Array.isArray(value)
  ? [...new Set(value.map(safeImage).filter(Boolean))].slice(0, 16)
  : []
const safeOptions = (bank: string, value: unknown) => {
  if (bank === 'relax1000') {
    if (!Array.isArray(value)) return undefined
    const rows = value.map((item, index) => ({
      key: string(item?.key || 'ABCD'[index] || '', 1).toUpperCase(),
      text: string(item?.text, 8000),
    })).filter(item => /^[A-D]$/.test(item.key) && item.text)
    return rows.slice(0, 4)
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const rows: Record<string, string> = {}
  for (const key of ['A', 'B', 'C', 'D']) {
    const item = string((value as Record<string, unknown>)[key], 8000)
    if (item) rows[key] = item
  }
  return rows
}
const safeFigures = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value.slice(0, 16).map(item => {
    const source = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    const src = safeImage(source.src)
    if (!src) return null
    const figure: Record<string, string> = { src }
    const alt = string(source.alt, 240), caption = string(source.caption, 500), option = string(source.option, 1).toUpperCase()
    if (alt) figure.alt = alt
    if (caption) figure.caption = caption
    if (/^[A-D]$/.test(option)) figure.option = option
    return figure
  }).filter(Boolean)
}
const sanitizePatch = (bank: string, value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>, patch: Record<string, unknown> = {}
  for (const key of ['stem', 'answer']) if (Object.hasOwn(source, key)) patch[key] = string(source[key], key === 'stem' ? 20000 : 12000)
  const options = safeOptions(bank, source.options)
  if (options) patch.options = options
  if (bank === 'relax1000') {
    if (Object.hasOwn(source, 'explanation')) patch.explanation = string(source.explanation, 30000)
    if (Object.hasOwn(source, 'questionImages')) patch.questionImages = safeImages(source.questionImages)
    if (Object.hasOwn(source, 'explanationImages')) patch.explanationImages = safeImages(source.explanationImages)
  } else {
    if (Object.hasOwn(source, 'analysis')) patch.analysis = string(source.analysis, 30000)
    if (Object.hasOwn(source, 'figures')) patch.figures = safeFigures(source.figures)
    if (['ds', 'co', 'os', 'cn'].includes(String(source.subject))) patch.subject = String(source.subject)
    if (['single', 'comprehensive'].includes(String(source.type))) patch.type = String(source.type)
  }
  return patch
}
const validatePatch = (bank: string, patch: Record<string, unknown>) => {
  const errors: string[] = []
  if (!string(patch.stem, 20000)) errors.push('question_stem_required')
  if (!string(patch.answer, 12000)) errors.push('question_answer_required')
  const options = safeOptions(bank, patch.options)
  const optionKeys = bank === 'relax1000'
    ? (Array.isArray(options) ? options.map(item => item.key) : [])
    : Object.keys(options || {})
  const expectsOptions = bank === 'relax1000' || patch.type !== 'comprehensive'
  if (expectsOptions && optionKeys.length < 2) errors.push('question_options_incomplete')
  const answer = string(patch.answer, 12000).toUpperCase()
  if (optionKeys.length >= 2 && /^[A-D]+$/.test(answer) && [...new Set(answer)].some(key => !optionKeys.includes(key))) errors.push('question_answer_option_mismatch')
  return errors
}

Deno.serve(async req => {
  const cors = corsFor(req)
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'not_found' }, 404)
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'service_unavailable' }, 503)
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return json({ error: 'not_found' }, 404)
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: { user: actor }, error: actorError } = await admin.auth.getUser(token)
  if (actorError || !actor || actor.app_metadata?.role !== 'owner') return json({ error: 'not_found' }, 404)

  try {
    const body = await req.json().catch(() => ({}))
    const action = string(body?.action || 'list', 30)
    if (action === 'list') {
      const { data, error } = await admin.from('question_overrides').select('id,bank,entity_id,patch,enabled,revision,created_at,updated_at').order('updated_at', { ascending: false }).limit(5000)
      if (error) throw error
      return json({ ok: true, overrides: data || [] })
    }

    const bank = allowedBanks.has(body?.bank) ? String(body.bank) : ''
    const entityId = safeEntity(bank, body?.entityId)
    if (!bank || !entityId) return json({ error: 'invalid_question_id' }, 400)

    if (action === 'history') {
      const { data, error } = await admin.from('question_override_revisions').select('id,bank,entity_id,revision,action,patch,created_at').eq('bank', bank).eq('entity_id', entityId).order('created_at', { ascending: false }).limit(50)
      if (error) throw error
      return json({ ok: true, history: data || [] })
    }

    if (action === 'save') {
      const patch = sanitizePatch(bank, body?.patch)
      if (!Object.keys(patch).length) return json({ error: 'empty_question_patch' }, 400)
      const validationErrors = validatePatch(bank, patch)
      if (validationErrors.length) return json({ error: 'invalid_question_patch', details: validationErrors }, 400)
      const { data: existing, error: existingError } = await admin.from('question_overrides').select('id,revision').eq('bank', bank).eq('entity_id', entityId).maybeSingle()
      if (existingError) throw existingError
      const expectedRevision = Math.max(0, Math.floor(Number(body?.expectedRevision) || 0))
      if (expectedRevision > 0 && Number(existing?.revision || 0) !== expectedRevision) return json({ error: 'stale_question_revision', currentRevision: Number(existing?.revision || 0) }, 409)
      const revision = Number(existing?.revision || 0) + 1
      const now = new Date().toISOString()
      const row = { bank, entity_id: entityId, patch, enabled: true, revision, updated_at: now }
      const mutation = existing
        ? admin.from('question_overrides').update(row).eq('id', existing.id).eq('revision', existing.revision)
        : admin.from('question_overrides').insert(row)
      const { data, error } = await mutation.select('id,bank,entity_id,patch,enabled,revision,created_at,updated_at').maybeSingle()
      if (error) throw error
      if (!data) return json({ error: 'stale_question_revision' }, 409)
      const { error: historyError } = await admin.from('question_override_revisions').insert({ override_id: data.id, bank, entity_id: entityId, revision, action: 'save', patch, actor_user_id: actor.id })
      if (historyError) throw historyError
      await admin.from('admin_audit').insert({ actor_user_id: actor.id, action: 'question_override_save', detail: { bank, entity_id: entityId, revision, fields: Object.keys(patch) } })
      return json({ ok: true, override: data })
    }

    if (action === 'restore') {
      const { data: existing, error: existingError } = await admin.from('question_overrides').select('id,patch,revision').eq('bank', bank).eq('entity_id', entityId).maybeSingle()
      if (existingError) throw existingError
      if (!existing) return json({ ok: true, restored: false })
      const expectedRevision = Math.max(0, Math.floor(Number(body?.expectedRevision) || 0))
      if (expectedRevision > 0 && Number(existing.revision || 0) !== expectedRevision) return json({ error: 'stale_question_revision', currentRevision: Number(existing.revision || 0) }, 409)
      const revision = Number(existing.revision || 0) + 1
      const { data, error } = await admin.from('question_overrides').update({ enabled: false, revision, updated_at: new Date().toISOString() }).eq('id', existing.id).eq('revision', existing.revision).select('id,bank,entity_id,patch,enabled,revision,created_at,updated_at').maybeSingle()
      if (error) throw error
      if (!data) return json({ error: 'stale_question_revision' }, 409)
      const { error: historyError } = await admin.from('question_override_revisions').insert({ override_id: existing.id, bank, entity_id: entityId, revision, action: 'restore', patch: existing.patch || {}, actor_user_id: actor.id })
      if (historyError) throw historyError
      await admin.from('admin_audit').insert({ actor_user_id: actor.id, action: 'question_override_restore', detail: { bank, entity_id: entityId, revision } })
      return json({ ok: true, override: data, restored: true })
    }

    if (action === 'restore-version') {
      const requestedRevision = Math.max(1, Math.floor(Number(body?.revision) || 0))
      const { data: historical, error: historyReadError } = await admin.from('question_override_revisions').select('revision,action,patch').eq('bank', bank).eq('entity_id', entityId).eq('revision', requestedRevision).maybeSingle()
      if (historyReadError) throw historyReadError
      if (!historical || historical.action !== 'save') return json({ error: 'question_revision_not_found' }, 404)
      const patch = sanitizePatch(bank, historical.patch)
      const validationErrors = validatePatch(bank, patch)
      if (validationErrors.length) return json({ error: 'invalid_question_patch', details: validationErrors }, 400)
      const { data: existing, error: existingError } = await admin.from('question_overrides').select('id,revision').eq('bank', bank).eq('entity_id', entityId).maybeSingle()
      if (existingError) throw existingError
      const expectedRevision = Math.max(0, Math.floor(Number(body?.expectedRevision) || 0))
      if (expectedRevision > 0 && Number(existing?.revision || 0) !== expectedRevision) return json({ error: 'stale_question_revision', currentRevision: Number(existing?.revision || 0) }, 409)
      const revision = Number(existing?.revision || 0) + 1
      const now = new Date().toISOString()
      const row = { bank, entity_id: entityId, patch, enabled: true, revision, updated_at: now }
      const mutation = existing
        ? admin.from('question_overrides').update(row).eq('id', existing.id).eq('revision', existing.revision)
        : admin.from('question_overrides').insert(row)
      const { data, error } = await mutation.select('id,bank,entity_id,patch,enabled,revision,created_at,updated_at').maybeSingle()
      if (error) throw error
      if (!data) return json({ error: 'stale_question_revision' }, 409)
      const { error: historyError } = await admin.from('question_override_revisions').insert({ override_id: data.id, bank, entity_id: entityId, revision, action: 'save', patch, actor_user_id: actor.id })
      if (historyError) throw historyError
      await admin.from('admin_audit').insert({ actor_user_id: actor.id, action: 'question_override_restore_version', detail: { bank, entity_id: entityId, revision, source_revision: requestedRevision } })
      return json({ ok: true, override: data, restoredFrom: requestedRevision })
    }

    if (action === 'upload-image') {
      const contentType = string(body?.contentType, 80).toLowerCase()
      const extension = imageTypes.get(contentType)
      const encoded = string(body?.base64, 6000000).replace(/^data:[^;]+;base64,/, '')
      if (!extension || !encoded || encoded.length > 5600000) return json({ error: 'invalid_image' }, 400)
      let bytes: Uint8Array
      try {
        const binary = atob(encoded)
        bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
      } catch {
        return json({ error: 'invalid_image' }, 400)
      }
      if (!bytes.length || bytes.length > 4194304) return json({ error: 'image_too_large' }, 400)
      const safeId = entityId.replace(/[^a-zA-Z0-9-]/g, '-')
      const path = `${bank}/${safeId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`
      const { error } = await admin.storage.from('question-assets').upload(path, bytes, { contentType, cacheControl: '31536000', upsert: false })
      if (error) throw error
      const { data } = admin.storage.from('question-assets').getPublicUrl(path)
      await admin.from('admin_audit').insert({ actor_user_id: actor.id, action: 'question_asset_upload', detail: { bank, entity_id: entityId, path, bytes: bytes.length } })
      return json({ ok: true, url: data.publicUrl, path })
    }

    return json({ error: 'invalid_action' }, 400)
  } catch (error) {
    console.error(error)
    return json({ error: 'operation_failed' }, 500)
  }
})
