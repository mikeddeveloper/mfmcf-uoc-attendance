const supabase = require('./supabase')

/* ── Members ─────────────────────────────────────────────── */

async function addMember({ name, phone, church_dept, school_dept, level, birthday }) {
  const year = new Date().getFullYear()

  // Find the highest existing member number for this year
  const { data: existing } = await supabase
    .from('members')
    .select('member_id')
    .like('member_id', `MFMC-${year}-%`)
    .order('member_id', { ascending: false })
    .limit(1)

  let nextNum = 1
  if (existing && existing.length > 0) {
    const lastPart = existing[0].member_id.split('-').pop()
    nextNum = parseInt(lastPart, 10) + 1
  }

  const member_id = `MFMC-${year}-${String(nextNum).padStart(4, '0')}`

  const { data, error } = await supabase
    .from('members')
    .insert({ member_id, name: name.trim(), phone, church_dept, school_dept, level, birthday })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return { member_id, name: data.name }
}

async function findMember(member_id) {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .ilike('member_id', member_id.trim())
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data || null
}

async function getAllMembers() {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('name')

  if (error) throw new Error(error.message)
  return data || []
}

async function deleteMember(member_id) {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('member_id', member_id)

  if (error) throw new Error(error.message)
}

/* ── Attendance ──────────────────────────────────────────── */

async function markAttendance(member_id, date) {
  const { error } = await supabase
    .from('attendance')
    .insert({ member_id, date, marked_at: new Date().toISOString() })

  if (error) {
    if (error.code === '23505') return false   // unique violation = already marked
    throw new Error(error.message)
  }
  return true
}

async function removeAttendance(member_id, date) {
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('member_id', member_id)
    .eq('date', date)

  if (error) throw new Error(error.message)
}

async function getAttendanceDates() {
  const { data, error } = await supabase
    .from('attendance')
    .select('date')

  if (error) throw new Error(error.message)

  // Group by date in JS (volume is small for a church)
  const counts = {}
  for (const row of data || []) {
    counts[row.date] = (counts[row.date] || 0) + 1
  }

  return Object.entries(counts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

async function getAttendanceForDate(date) {
  // Fetch all members and the attendance for that date in parallel
  const [{ data: members, error: mErr }, { data: att, error: aErr }] = await Promise.all([
    supabase.from('members').select('member_id, name, church_dept').order('name'),
    supabase.from('attendance').select('member_id, marked_at').eq('date', date),
  ])

  if (mErr) throw new Error(mErr.message)
  if (aErr) throw new Error(aErr.message)

  const attMap = {}
  for (const a of att || []) attMap[a.member_id] = a.marked_at || null

  return (members || []).map(m => ({
    ...m,
    present: m.member_id in attMap,
    marked_at: attMap[m.member_id]
      ? new Date(attMap[m.member_id]).toISOString().replace('T', ' ').slice(0, 19)
      : null,
  }))
}

module.exports = {
  addMember, findMember, getAllMembers, deleteMember,
  markAttendance, removeAttendance, getAttendanceDates, getAttendanceForDate,
}
