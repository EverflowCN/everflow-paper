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

const shanghaiDay = (value: string | number | Date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value))

const dayKeys = (days: number) => {
  const result: string[] = []
  const now = new Date()
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    result.push(shanghaiDay(new Date(now.getTime() - offset * 86400000)))
  }
  return result
}

const countByDay = (keys: string[], rows: Row[], field: string, value?: (row: Row) => number) => {
  const map = new Map(keys.map(key => [key, 0]))
  for (const row of rows) {
    if (!row[field]) continue
    const key = shanghaiDay(row[field])
    if (map.has(key)) map.set(key, (map.get(key) || 0) + (value ? value(row) : 1))
  }
  return keys.map(key => map.get(key) || 0)
}

const safeError = (name: string, error: any) => {
  if (error) throw new Error(`${name}_query_failed`)
}

Deno.serve(async req => {
  const cors = corsFor(req)
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
  })
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
    const users: Row[] = []
    for (let page = 1; page <= 20; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
      safeError('users', error)
      const batch = data.users || []
      users.push(...batch)
      if (batch.length < 100) break
    }

    const since90 = new Date(Date.now() - 90 * 86400000).toISOString()
    const [profilesRes, focusRes, coursesRes, practiceRes, eventsRes, membershipsRes, membershipConfigRes, redemptionsRes, noticesRes, resourcesRes, catalogsRes, itemsRes, oxygenRunsRes, oxygenMetaRes] = await Promise.all([
      admin.from('profiles').select('user_id,created_at,last_seen_at').limit(5000),
      admin.from('focus_sessions').select('user_id,subject,duration_seconds,ended_at').gte('ended_at', since90).limit(20000),
      admin.from('course_states').select('user_id,course_id,subject,done,completed_at,updated_at').limit(30000),
      admin.from('practice_states').select('user_id,practice_id,item_id,subject,status,last_attempt_at,updated_at').limit(30000),
      admin.from('study_checkin_events').select('user_id,event_type,source_id,item_id,subject,occurred_at').gte('occurred_at', since90).limit(30000),
      admin.from('memberships').select('user_id,plan,status,source,starts_at,expires_at,updated_at').limit(5000),
      admin.from('membership_config').select('pro_free_until').eq('id', 'default').maybeSingle(),
      admin.from('membership_code_redemptions').select('user_id,code_id,redeemed_at').gte('redeemed_at', since90).limit(10000),
      admin.from('notices').select('id,title,published,pinned,updated_at').limit(1000),
      admin.from('resource_hub_items').select('id,title,enabled,status,links,updated_at').limit(2000),
      admin.from('course_catalogs').select('id,title,enabled,archived_at,updated_at').limit(1000),
      admin.from('course_catalog_items').select('catalog_id,item_id,progress_id,title,subject,enabled,archived_at').limit(10000),
      admin.from('oxygen_update_runs').select('id,status,trigger_type,started_at,finished_at,summary').order('started_at', { ascending: false }).limit(20),
      admin.from('oxygen_catalog_meta').select('updated_at,sync_status,message').eq('id', 'default').maybeSingle(),
    ])

    for (const [name, result] of Object.entries({ profilesRes, focusRes, coursesRes, practiceRes, eventsRes, membershipsRes, membershipConfigRes, redemptionsRes, noticesRes, resourcesRes, catalogsRes, itemsRes, oxygenRunsRes, oxygenMetaRes })) {
      safeError(name, (result as any).error)
    }

    const profiles = profilesRes.data || []
    const focus = focusRes.data || []
    const courses = coursesRes.data || []
    const practice = practiceRes.data || []
    const events = eventsRes.data || []
    const memberships = membershipsRes.data || []
    const notices = noticesRes.data || []
    const resources = resourcesRes.data || []
    const catalogs = catalogsRes.data || []
    const items = itemsRes.data || []
    const oxygenRuns = oxygenRunsRes.data || []
    const now = Date.now()
    const days = dayKeys(90)
    const promoUntil = membershipConfigRes.data?.pro_free_until || null
    const membershipExpiry = (row: Row) => row.expires_at || (row.source === 'promo_exam_2027' ? promoUntil : null)
    const activeMemberships = memberships.filter(row => {
      const expiry = membershipExpiry(row)
      return row.status === 'active' && (!expiry || new Date(expiry).getTime() > now)
    })
    const activePlan = new Map(activeMemberships.map(row => [row.user_id, row.plan]))
    const activeWithin = (period: number) => profiles.filter(row => row.last_seen_at && now - new Date(row.last_seen_at).getTime() <= period * 86400000).length
    const registeredWithin = (period: number) => users.filter(row => now - new Date(row.created_at).getTime() <= period * 86400000).length
    const completed7 = events.filter(row => row.occurred_at && now - new Date(row.occurred_at).getTime() <= 7 * 86400000).length
    const focusSeconds7 = focus.filter(row => row.ended_at && now - new Date(row.ended_at).getTime() <= 7 * 86400000).reduce((sum, row) => sum + Number(row.duration_seconds || 0), 0)

    const subjects = ['ds', 'co', 'os', 'cn', 'general']
    const subjectActivity = subjects.map(subject => ({
      subject,
      completions: events.filter(row => (row.subject || 'general') === subject).length,
      focusMinutes: Math.round(focus.filter(row => (row.subject || 'general') === subject).reduce((sum, row) => sum + Number(row.duration_seconds || 0), 0) / 60),
    }))

    const practiceStatus = ['todo', 'done', 'wrong', 'redo', 'mastered'].map(status => ({
      status,
      count: practice.filter(row => row.status === status).length,
    }))

    const itemMap = new Map(items.map(row => [row.progress_id || row.item_id, row]))
    const courseCounts = new Map<string, number>()
    for (const row of courses) {
      if (!row.done) continue
      courseCounts.set(row.course_id, (courseCounts.get(row.course_id) || 0) + 1)
    }
    const topCourses = [...courseCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, count]) => ({
      id,
      title: itemMap.get(id)?.title || id.replace(/^bvid:/, ''),
      subject: itemMap.get(id)?.subject || courses.find(row => row.course_id === id)?.subject || 'unknown',
      completions: count,
    }))

    const expiringSoon = activeMemberships.filter(row => {
      const expiry = membershipExpiry(row)
      return expiry && new Date(expiry).getTime() - now <= 7 * 86400000
    }).length
    const failedRuns = oxygenRuns.filter(row => ['failed', 'blocked'].includes(row.status)).length
    const alerts = [
      { id: 'oxygen', level: failedRuns ? 'danger' : 'ok', title: failedRuns ? `${failedRuns} 次 408 同步需要处理` : '408 自动更新运行正常', detail: failedRuns ? '请进入 408 更新中心查看失败任务。' : '最近没有失败或阻塞的同步任务。', target: 'oxygen' },
      { id: 'membership', level: expiringSoon ? 'warning' : 'ok', title: expiringSoon ? `${expiringSoon} 位会员将在 7 天内到期` : '近期没有会员集中到期', detail: expiringSoon ? '可在会员管理中检查是否需要延长。' : '会员有效期状态正常。', target: 'membership' },
      { id: 'content', level: notices.some(row => !row.published) || resources.some(row => !row.enabled || row.status !== 'available') ? 'warning' : 'ok', title: `${notices.filter(row => !row.published).length} 篇通知草稿 · ${resources.filter(row => !row.enabled || row.status !== 'available').length} 个资源待处理`, detail: '草稿、停用和更新中的内容不会完整展示在前台。', target: 'notices' },
      { id: 'catalog', level: catalogs.some(row => !row.enabled || row.archived_at) ? 'warning' : 'ok', title: `${catalogs.filter(row => row.enabled && !row.archived_at).length}/${catalogs.length} 套课程正在展示`, detail: `共 ${items.filter(row => row.enabled && !row.archived_at).length} 个课时可见。`, target: 'course-admin' },
    ]

    return json({
      ok: true,
      generatedAt: new Date().toISOString(),
      metrics: {
        userCount: users.length,
        newUsers7d: registeredWithin(7),
        newUsers30d: registeredWithin(30),
        active1d: activeWithin(1),
        active7d: activeWithin(7),
        active30d: activeWithin(30),
        activeMemberships: activeMemberships.length,
        proMembers: [...activePlan.values()].filter(plan => plan === 'pro').length,
        memberMembers: [...activePlan.values()].filter(plan => plan === 'member').length,
        completions7d: completed7,
        focusHours7d: Math.round(focusSeconds7 / 360) / 10,
        totalCourseCompletions: courses.filter(row => row.done).length,
        totalPracticeRecords: practice.length,
        codeRedemptions30d: (redemptionsRes.data || []).filter(row => now - new Date(row.redeemed_at).getTime() <= 30 * 86400000).length,
      },
      series: {
        days,
        registrations: countByDay(days, users, 'created_at'),
        lastActive: countByDay(days, profiles, 'last_seen_at'),
        completions: countByDay(days, events, 'occurred_at'),
        focusMinutes: countByDay(days, focus, 'ended_at', row => Math.round(Number(row.duration_seconds || 0) / 60)),
      },
      membershipDistribution: {
        pro: [...activePlan.values()].filter(plan => plan === 'pro').length,
        member: [...activePlan.values()].filter(plan => plan === 'member').length,
        free: Math.max(0, users.length - activeMemberships.length),
        expiringSoon,
      },
      subjectActivity,
      practiceStatus,
      topCourses,
      alerts,
      health: {
        oxygenStatus: oxygenMetaRes.data?.sync_status || 'unknown',
        oxygenUpdatedAt: oxygenMetaRes.data?.updated_at || null,
        latestRunStatus: oxygenRuns[0]?.status || 'unknown',
        catalogCount: catalogs.length,
        lessonCount: items.length,
        publishedNotices: notices.filter(row => row.published).length,
        enabledResources: resources.filter(row => row.enabled).length,
      },
    })
  } catch (error) {
    console.error(error)
    return json({ error: 'operation_failed' }, 500)
  }
})
