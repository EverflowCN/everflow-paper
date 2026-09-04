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
const allowedBanks = new Set(['zhenti', 'relax1000', 'course', 'resource', 'site', 'other'])
const allowedCategories = new Set(['stem', 'options', 'answer', 'image', 'explanation', 'link', 'other'])
const allowedStatuses = new Set(['open', 'in_progress', 'resolved', 'dismissed'])
const allowedPriorities = new Set(['low', 'normal', 'high', 'urgent'])

const corsFor = (req: Request) => {
  const origin = req.headers.get('Origin') || ''
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://evera.top',
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}
const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max)
const safeContext = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  const result: Record<string, string | number | boolean> = {}
  for (const key of ['year', 'question', 'title', 'subject', 'source', 'url', 'view']) {
    const item = source[key]
    if (['string', 'number', 'boolean'].includes(typeof item)) result[key] = typeof item === 'string' ? text(item, 240) : item as number | boolean
  }
  return result
}

Deno.serve(async req => {
  const cors = corsFor(req)
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'not_found' }, 404)
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'service_unavailable' }, 503)

  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return json({ error: 'login_required' }, 401)
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: { user }, error: userError } = await admin.auth.getUser(token)
  if (userError || !user) return json({ error: 'login_required' }, 401)

  try {
    const body = await req.json().catch(() => ({}))
    const action = text(body?.action || 'create', 30)
    if (action === 'create') {
      const bank = allowedBanks.has(body?.bank) ? body.bank : 'other'
      const category = allowedCategories.has(body?.category) ? body.category : 'other'
      const description = text(body?.description, 2000)
      const pagePath = text(body?.pagePath || '/', 500)
      const entityId = text(body?.entityId, 160)
      if (description.length < 8) return json({ error: 'description_too_short' }, 400)
      if (!pagePath.startsWith('/')) return json({ error: 'invalid_page_path' }, 400)
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count, error: countError } = await admin.from('content_feedback').select('id', { count: 'exact', head: true }).eq('reporter_user_id', user.id).gte('created_at', since)
      if (countError) throw countError
      if ((count || 0) >= 5) return json({ error: 'rate_limited' }, 429)
      const { data, error } = await admin.from('content_feedback').insert({
        reporter_user_id: user.id,
        bank,
        entity_id: entityId,
        page_path: pagePath,
        category,
        description,
        context: safeContext(body?.context),
      }).select('id,status,created_at').single()
      if (error) throw error
      return json({ ok: true, feedback: data })
    }

    if (user.app_metadata?.role !== 'owner') return json({ error: 'not_found' }, 404)
    if (action === 'update') {
      const id = text(body?.id, 80)
      if (!id) return json({ error: 'missing_id' }, 400)
      const status = allowedStatuses.has(body?.status) ? body.status : 'open'
      const priority = allowedPriorities.has(body?.priority) ? body.priority : 'normal'
      const resolutionNote = text(body?.resolutionNote, 2000)
      const row = {
        status,
        priority,
        resolution_note: resolutionNote,
        assignee_user_id: ['in_progress', 'resolved'].includes(status) ? user.id : null,
        resolved_at: ['resolved', 'dismissed'].includes(status) ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await admin.from('content_feedback').update(row).eq('id', id).select('*').single()
      if (error) throw error
      await admin.from('admin_audit').insert({ actor_user_id: user.id, action: 'content_feedback_update', detail: { feedback_id: id, status, priority } })
      return json({ ok: true, feedback: data })
    }
    return json({ error: 'invalid_action' }, 400)
  } catch (error) {
    console.error(error)
    return json({ error: 'operation_failed' }, 500)
  }
})
