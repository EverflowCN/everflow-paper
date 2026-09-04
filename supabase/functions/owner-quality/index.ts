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
const corsFor = (req: Request) => {
  const origin = req.headers.get('Origin') || ''
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://evera.top',
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}
type Row = Record<string, any>
const fail = (name: string, error: any) => { if (error) throw new Error(`${name}_query_failed`) }
const dayMs = 86400000
const time = (value: unknown) => value ? new Date(String(value)).getTime() : 0
const maxTime = (...values: unknown[]) => Math.max(0, ...values.map(time))

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
    const action = String(body?.action || 'overview').slice(0, 40)
    const users: Row[] = []
    for (let page = 1; page <= 20; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
      fail('users', error)
      const batch = data.users || []
      users.push(...batch)
      if (batch.length < 100) break
    }
    if (action === 'repair-profiles') {
      const { data: existing, error: existingError } = await admin.from('profiles').select('user_id').limit(5000)
      fail('profiles', existingError)
      const known = new Set((existing || []).map(row => row.user_id))
      const missing = users.filter(user => !known.has(user.id)).map(user => ({
        user_id: user.id,
        display_name: String(user.user_metadata?.display_name || user.user_metadata?.name || user.email?.split('@')[0] || '').slice(0, 80) || null,
        created_at: user.created_at,
        last_seen_at: user.last_sign_in_at || user.created_at,
      }))
      if (missing.length) {
        const { error } = await admin.from('profiles').upsert(missing, { onConflict: 'user_id' })
        fail('profile_repair', error)
        await admin.from('admin_audit').insert({ actor_user_id: actor.id, action: 'data_quality_repair_profiles', detail: { repaired: missing.length } })
      }
      return json({ ok: true, repaired: missing.length })
    }
    if (action !== 'overview') return json({ error: 'invalid_action' }, 400)
    const [profilesRes, courseRes, practiceRes, eventRes, focusRes, itemRes, resourceRes, feedbackRes] = await Promise.all([
      admin.from('profiles').select('user_id,display_name,created_at,last_seen_at').limit(5000),
      admin.from('course_states').select('user_id,course_id,done,updated_at').limit(30000),
      admin.from('practice_states').select('user_id,status,last_attempt_at,updated_at').limit(30000),
      admin.from('study_checkin_events').select('user_id,event_type,source_id,item_id,occurred_at').limit(30000),
      admin.from('focus_sessions').select('user_id,ended_at').limit(20000),
      admin.from('course_catalog_items').select('catalog_id,item_id,progress_id,title,url,enabled,archived_at,updated_at').limit(10000),
      admin.from('resource_hub_items').select('id,title,enabled,status,links,updated_at').limit(2000),
      admin.from('content_feedback').select('id,reporter_user_id,bank,entity_id,page_path,category,description,context,status,priority,resolution_note,created_at,updated_at').order('created_at', { ascending: false }).limit(500),
    ])
    for (const [name, result] of Object.entries({ profilesRes, courseRes, practiceRes, eventRes, focusRes, itemRes, resourceRes, feedbackRes })) fail(name, (result as any).error)

    const profiles = profilesRes.data || [], courses = courseRes.data || [], practice = practiceRes.data || []
    const events = eventRes.data || [], focus = focusRes.data || [], items = itemRes.data || []
    const resources = resourceRes.data || [], feedback = feedbackRes.data || []
    const profileMap = new Map(profiles.map(row => [row.user_id, row]))
    const userMap = new Map(users.map(row => [row.id, row]))
    const byUser = (rows: Row[]) => {
      const map = new Map<string, Row[]>()
      for (const row of rows) map.set(row.user_id, [...(map.get(row.user_id) || []), row])
      return map
    }
    const courseMap = byUser(courses), practiceMap = byUser(practice), eventMap = byUser(events), focusMap = byUser(focus)
    const now = Date.now()
    const risks = users.map(user => {
      const profile = profileMap.get(user.id), userCourses = courseMap.get(user.id) || [], userPractice = practiceMap.get(user.id) || []
      const userEvents = eventMap.get(user.id) || [], userFocus = focusMap.get(user.id) || []
      const learningTimes = [
        ...userCourses.map(row => row.updated_at), ...userPractice.map(row => row.last_attempt_at || row.updated_at),
        ...userEvents.map(row => row.occurred_at), ...userFocus.map(row => row.ended_at),
      ]
      const learningAt = Math.max(0, ...learningTimes.map(time))
      const lastActivity = maxTime(profile?.last_seen_at, user.last_sign_in_at, learningAt ? new Date(learningAt).toISOString() : null, user.created_at)
      const daysInactive = Math.max(0, Math.floor((now - lastActivity) / dayMs))
      const ageHours = Math.max(0, (now - time(user.created_at)) / 3600000)
      const wrong = userPractice.filter(row => ['wrong', 'redo'].includes(row.status)).length
      const reasons: string[] = []
      let score = 0
      if (!learningAt && ageHours >= 48) { score += 70; reasons.push('注册超过 48 小时仍无学习记录') }
      else if (!learningAt && ageHours >= 12) { score += 30; reasons.push('注册后尚未开始学习') }
      if (daysInactive >= 14) { score += 60; reasons.push(`${daysInactive} 天未活跃`) }
      else if (daysInactive >= 7) { score += 32; reasons.push(`${daysInactive} 天未活跃`) }
      if (wrong >= 10) { score += 35; reasons.push(`${wrong} 道错题待复盘`) }
      else if (wrong >= 3) { score += 18; reasons.push(`${wrong} 道错题待复盘`) }
      return {
        userId: user.id,
        email: user.email || '',
        displayName: profile?.display_name || '',
        createdAt: user.created_at,
        lastActiveAt: lastActivity ? new Date(lastActivity).toISOString() : null,
        daysInactive,
        score: Math.min(100, score),
        level: score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low',
        reasons,
        progress: {
          courses: userCourses.length,
          doneCourses: userCourses.filter(row => row.done).length,
          practice: userPractice.length,
          practiceDone: userPractice.filter(row => ['done', 'mastered'].includes(row.status)).length,
          events: userEvents.length,
        },
      }
    }).filter(row => row.score >= 30).sort((a, b) => b.score - a.score || b.daysInactive - a.daysInactive)

    const qualityIssues: Row[] = []
    for (const user of users) if (!profileMap.has(user.id)) qualityIssues.push({ id: `profile:${user.id}`, type: 'profile', level: 'warning', title: '账号缺少资料档案', detail: user.email || user.id, target: user.id })
    const futureEvents = events.filter(row => time(row.occurred_at) > now + 300000)
    if (futureEvents.length) qualityIssues.push({ id: 'future-events', type: 'timestamp', level: 'danger', title: `${futureEvents.length} 条打卡时间来自未来`, detail: '需要检查客户端时间或写入逻辑。' })
    const duplicateKeys = new Set<string>(), duplicates = new Set<string>()
    for (const row of events) {
      const key = [row.user_id, row.event_type, row.source_id, row.item_id, row.occurred_at].join('|')
      if (duplicateKeys.has(key)) duplicates.add(key); else duplicateKeys.add(key)
    }
    if (duplicates.size) qualityIssues.push({ id: 'duplicate-events', type: 'duplicate', level: 'warning', title: `${duplicates.size} 组重复打卡`, detail: '完全相同的事件被写入多次。' })
    for (const item of items.filter(row => row.enabled && !row.archived_at && (!String(row.title || '').trim() || !String(row.url || '').trim()))) qualityIssues.push({ id: `course:${item.catalog_id}:${item.item_id}`, type: 'course', level: 'danger', title: '可见课时内容不完整', detail: item.title || item.item_id })
    for (const item of resources.filter(row => row.enabled && (!String(row.title || '').trim() || !Array.isArray(row.links) || !row.links.length))) qualityIssues.push({ id: `resource:${item.id}`, type: 'resource', level: 'danger', title: '可见资源缺少名称或链接', detail: item.title || item.id })

    const userSet = (rows: Row[]) => new Set(rows.map(row => row.user_id)).size
    const coverage = [
      { id: 'profiles', label: '资料档案', users: userSet(profiles), total: users.length },
      { id: 'courses', label: '课程进度', users: userSet(courses), total: users.length },
      { id: 'practice', label: '练习记录', users: userSet(practice), total: users.length },
      { id: 'events', label: '学习打卡', users: userSet(events), total: users.length },
      { id: 'focus', label: '专注记录', users: userSet(focus), total: users.length },
    ].map(row => ({ ...row, rate: row.total ? Math.round(row.users / row.total * 100) : 100 }))
    const feedbackStats = {
      open: feedback.filter(row => row.status === 'open').length,
      inProgress: feedback.filter(row => row.status === 'in_progress').length,
      resolved: feedback.filter(row => row.status === 'resolved').length,
      dismissed: feedback.filter(row => row.status === 'dismissed').length,
      urgent: feedback.filter(row => row.priority === 'urgent' && !['resolved', 'dismissed'].includes(row.status)).length,
    }
    const tickets = feedback.map(row => ({ ...row, reporterEmail: userMap.get(row.reporter_user_id)?.email || '' }))
    return json({
      ok: true,
      generatedAt: new Date().toISOString(),
      summary: {
        qualityIssues: qualityIssues.length,
        highRisks: risks.filter(row => row.level === 'high').length,
        mediumRisks: risks.filter(row => row.level === 'medium').length,
        openFeedback: feedbackStats.open + feedbackStats.inProgress,
      },
      coverage,
      qualityIssues,
      risks,
      feedbackStats,
      tickets,
    })
  } catch (error) {
    console.error(error)
    return json({ error: 'operation_failed' }, 500)
  }
})
