const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const plants = [
    { name: '郁金香', location: '客厅、阳台', waterFrequency: '2-3天/次（见干见湿）', light: '4-6小时散射光', temperature: '15-20℃', fertilizer: '花后以磷钾肥为主', humidity: '微湿', toxicityLevel: '轻微刺激', toxicitySource: '鳞茎含苷类，误食引起肠胃刺激', waterInterval: 3, '浇水时间': new Date(), '下次浇水时间': new Date(Date.now() + 7*86400000), '下次施肥时间': new Date(Date.now() + 26*86400000) },
    { name: '长寿花', location: '客厅、阳台', waterFrequency: '5-7天/次（宁干勿湿）', light: '充足散射光', temperature: '15-25℃', fertilizer: '春秋各施一次复合肥', humidity: '干燥', toxicityLevel: '中度刺激', toxicitySource: '含强心苷，误食引起心律不齐', waterInterval: 6, '浇水时间': new Date(), '下次浇水时间': new Date(Date.now() + 7*86400000), '下次施肥时间': new Date(Date.now() + 21*86400000) },
    { name: '大仙女海芋', location: '客厅散光处', waterFrequency: '3-4天/次（微湿偏干）', light: '散射光，避免直射', temperature: '18-28℃', fertilizer: '生长期每月一次通用肥', humidity: '较高湿度', toxicityLevel: '中度刺激', toxicitySource: '草酸钙针晶，接触刺痛灼烧', waterInterval: 4, '浇水时间': new Date(), '下次浇水时间': new Date(Date.now() + 1*86400000), '下次施肥时间': new Date(Date.now() + 21*86400000) },
    { name: '苹果竹芋', location: '客厅、卧室', waterFrequency: '2-3天/次（喜湿润）', light: '明亮散射光', temperature: '18-28℃', fertilizer: '生长期每2周一次薄肥', humidity: '较高湿度', toxicityLevel: '无刺激', toxicitySource: '基本无毒，可安全养护', waterInterval: 3, '浇水时间': new Date(), '下次浇水时间': new Date(Date.now() + 0*86400000), '下次施肥时间': new Date(Date.now() + 21*86400000) },
    { name: '油画婚礼吊兰', location: '客厅、书房', waterFrequency: '4-5天/次（见干见湿）', light: '散射光', temperature: '15-28℃', fertilizer: '生长期每月一次', humidity: '中等湿度', toxicityLevel: '无刺激', toxicitySource: '可食用，无明显毒性', waterInterval: 5, '浇水时间': new Date(), '下次浇水时间': new Date(Date.now() + 5*86400000), '下次施肥时间': new Date(Date.now() + 19*86400000) },
    { name: '吉姆蕨', location: '卫生间、北窗台', waterFrequency: '2-3天/次（喜湿润）', light: '散射光或明亮处', temperature: '15-25℃', fertilizer: '生长期每2周一次', humidity: '高湿度', toxicityLevel: '无刺激', toxicitySource: '基本无毒，蕨类可安全养护', waterInterval: 3, '浇水时间': new Date(), '下次浇水时间': new Date(Date.now() + 0*86400000), '下次施肥时间': new Date(Date.now() + 36*86400000) },
    { name: '绣球花', location: '阳台、花园', waterFrequency: '1-2天/次（喜湿润）', light: '充足散射光', temperature: '15-25℃', fertilizer: '花后以磷钾肥为主', humidity: '湿润', toxicityLevel: '轻微刺激', toxicitySource: '含氰苷化合物，误食引起轻度不适', waterInterval: 2, '浇水时间': new Date(), '下次浇水时间': new Date(Date.now() - 1*86400000), '下次施肥时间': new Date(Date.now() + 6*86400000) }
  ]
  const results = []
  for (const p of plants) {
    try {
      const res = await db.collection('plants').add({ data: { ...p, createdAt: db.serverDate(), updatedAt: db.serverDate() } })
      results.push({ name: p.name, success: true })
    } catch (e) {
      results.push({ name: p.name, success: false, error: e.message })
    }
  }
  return { success: true, count: results.filter(r => r.success).length, total: results.length }
}
