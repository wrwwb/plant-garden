const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const OPENID = wxContext.OPENID

  console.log('用户:', OPENID)

  try {
    // 获取该用户所有植物记录（分页）
    const allRecords = []
    const MAX = 100
    let page = 0
    while (true) {
      const res = await db.collection('plants')
        .where({ _openid: OPENID })
        .orderBy('createdAt', 'desc')
        .skip(page * MAX)
        .limit(MAX)
        .get()
      allRecords.push(...res.data)
      if (res.data.length < MAX) break
      page++
    }

    console.log('总记录数:', allRecords.length)

    if (allRecords.length <= 1) {
      return { success: true, message: '无需去重', total: allRecords.length }
    }

    // 按花名分组
    const groups = {}
    allRecords.forEach(r => {
      const f = r.fields || r
      const name = f['花名'] || f['name'] || '-'
      if (!groups[name]) groups[name] = []
      groups[name].push(r)
    })

    // 找出需要删除的重复记录
    let keepCount = 0
    const toDelete = []
    for (const [name, records] of Object.entries(groups)) {
      if (records.length <= 1) {
        keepCount++
        continue
      }
      keepCount++
      // 按 createdAt 降序，保留最新的那条
      records.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      })
      // 跳过第一条（保留），其余删除
      for (let i = 1; i < records.length; i++) {
        toDelete.push({ _id: records[i]._id, name })
      }
    }

    console.log('保留:', keepCount, '种，待删除:', toDelete.length, '条')
    toDelete.forEach(d => console.log('  删除:', d._id, d.name))

    // 批量删除（逐条）
    let deleted = 0
    let errors = []
    for (const item of toDelete) {
      try {
        await db.collection('plants').doc(item._id).remove()
        deleted++
      } catch (e) {
        console.error('删除失败:', item._id, e.message)
        errors.push({ id: item._id, error: e.message })
      }
    }

    return {
      success: true,
      total: allRecords.length,
      unique: keepCount,
      deleted,
      errors: errors.length
    }
  } catch (e) {
    console.error('去重异常:', e)
    return { success: false, error: e.message }
  }
}
