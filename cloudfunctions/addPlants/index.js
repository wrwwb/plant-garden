const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const plants = [
    { name: '郁金香', location: '阳台/窗台', waterFrequency: '2-3天/次（见干见湿）', light: '散光充足，冬季全日照', temperature: '15-25°C', fertilizer: '花后追肥，保持土壤微润', humidity: '喜湿，忌盆内积水', toxicityLevel: '无刺激', toxicitySource: '', waterInterval: 3 },
    { name: '长寿花', location: '阳台/窗台', waterFrequency: '5-7天/次', light: '全日照到半阴', temperature: '15-25°C', fertilizer: '花后追肥，保持土壤微润', humidity: '喜湿，忌盆内积水', toxicityLevel: '无刺激', toxicitySource: '', waterInterval: 6 },
    { name: '大仙女海芋', location: '室内/窗台', waterFrequency: '3-4天/次', light: '散光充足，冬季全日照', temperature: '18-28°C', fertilizer: '3-4周追肥', humidity: '热带湿润，忌干燥', toxicityLevel: '无刺激', toxicitySource: '', waterInterval: 4 },
    { name: '苹果竹芋', location: '室内/窗台', waterFrequency: '2-3天/次', light: '散光充足，冬季全日照', temperature: '15-25°C', fertilizer: '3-4周追肥', humidity: '喜湿，忌盆内积水', toxicityLevel: '无刺激', toxicitySource: '', waterInterval: 3 },
    { name: '油画婚礼吊兰', location: '室内/窗台', waterFrequency: '5-7天/次', light: '全日照到半阴', temperature: '18-28°C', fertilizer: '3-4周追肥', humidity: '湿润环境', toxicityLevel: '无刺激', toxicitySource: '', waterInterval: 6 },
    { name: '吉姆蕨', location: '室内/窗台', waterFrequency: '2-3天/次', light: '半阴散光', temperature: '15-25°C', fertilizer: '3-4周追肥', humidity: '喜湿润，忌干燥', toxicityLevel: '无刺激', toxicitySource: '', waterInterval: 3 },
    { name: '绣球花', location: '阳台/窗台', waterFrequency: '4-5天/次', light: '半阴为主', temperature: '15-25°C', fertilizer: '花期前后各追一次', humidity: '湿润环境', toxicityLevel: '无刺激', toxicitySource: '', waterInterval: 5 }
  ]

  const now = new Date()
  const results = []
  
  for (const p of plants) {
    try {
      const waterMs = (p.waterInterval || 7) * 24 * 60 * 60 * 1000
      const fertMs = 14 * 24 * 60 * 60 * 1000
      const doc = {
        name: p.name,
        location: p.location,
        waterFrequency: p.waterFrequency,
        light: p.light,
        temperature: p.temperature,
        fertilizer: p.fertilizer,
        humidity: p.humidity,
        toxicityLevel: p.toxicityLevel,
        toxicitySource: p.toxicitySource,
        waterInterval: p.waterInterval,
        '浇水时间': now,
        '下次浇水时间': new Date(now.getTime() + waterMs),
        '下次施肥时间': new Date(now.getTime() + fertMs),
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
      const res = await db.collection('plants').add({ data: doc })
      results.push({ name: p.name, success: true, id: res._id })
    } catch (e) {
      results.push({ name: p.name, success: false, error: e.message })
    }
  }

  return { success: true, results }
}
