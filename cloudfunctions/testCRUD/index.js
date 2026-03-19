const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const results = { steps: [] }
  
  try {
    // Step 1: 查询当前有多少植物
    const existing = await db.collection('plants').get()
    results.steps.push({ step: '查询', count: existing.data.length, records: existing.data.map(d => ({ id: d._id, name: d.name })) })

    // Step 2: 添加10个测试植物
    const testPlants = []
    for (let i = 1; i <= 10; i++) {
      const now = new Date()
      const plant = {
        name: `测试植物${i}`,
        location: '测试位置',
        waterFrequency: '3-4天/次',
        light: '散射光',
        temperature: '15-25℃',
        fertilizer: '测试施肥',
        humidity: '中等',
        toxicityLevel: '无刺激',
        waterInterval: 4,
        '浇水时间': now,
        '下次浇水时间': new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        '下次施肥时间': new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
      try {
        const res = await db.collection('plants').add({ data: plant })
        testPlants.push({ id: res._id, name: plant.name, success: true })
      } catch (e) {
        testPlants.push({ name: plant.name, success: false, error: e.message })
      }
    }
    results.steps.push({ step: '添加10个', success: testPlants.filter(t => t.success).length, fail: testPlants.filter(t => !t.success).length, details: testPlants })

    // Step 3: 再次查询
    const afterAdd = await db.collection('plants').get()
    results.steps.push({ step: '添加后查询', count: afterAdd.data.length })

    // Step 4: 删除这10个测试植物
    const deleteResults = []
    for (const p of testPlants) {
      if (!p.success) continue
      try {
        await db.collection('plants').doc(p.id).remove()
        deleteResults.push({ id: p.id, name: p.name, success: true })
      } catch (e) {
        deleteResults.push({ id: p.id, name: p.name, success: false, error: e.message || e.errMsg })
      }
    }
    results.steps.push({ step: '删除10个', success: deleteResults.filter(t => t.success).length, fail: deleteResults.filter(t => !t.success).length, details: deleteResults })

    // Step 5: 最终查询
    const final = await db.collection('plants').get()
    results.steps.push({ step: '最终查询', count: final.data.length })

    results.success = true
    return results
  } catch (e) {
    results.success = false
    results.error = e.message || e.errMsg
    return results
  }
}
