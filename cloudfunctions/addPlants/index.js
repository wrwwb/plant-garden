const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const plants = [
    {name:"郁金香",scientificName:"Tulipa gesneriana",family:"百合科 Liliaceae",origin:"中亚、土耳其",growthSeason:"春季开花，夏季休眠",heatResist:"30°C以上休眠",coldResist:"耐寒-15°C",soil:"疏松肥沃沙质土",location:"客厅、阳台",waterFrequency:"2-3天/次（见干见湿）",light:"4-6小时散射光",temperature:"15-20°C",fertilizer:"花后以磷钾肥为主",humidity:"微湿",toxicityLevel:"轻微刺激",toxicitySource:"鳞茎含苷类，误食引起肠胃刺激",waterInterval:3,简介:"百合科球根花卉，原产中亚土耳其。花朵杯形色彩丰富，春季开花象征美好祝福。"},
    {name:"长寿花",scientificName:"Kalanchoe blossfeldiana",family:"景天科 Crassulaceae",origin:"马达加斯加",growthSeason:"秋冬季开花",heatResist:"30°C以上减缓",coldResist:"不低于5°C",soil:"疏松透气颗粒土",location:"客厅、阳台",waterFrequency:"5-7天/次（宁干勿湿）",light:"充足散射光",temperature:"15-25°C",fertilizer:"春秋各施一次复合肥",humidity:"干燥",toxicityLevel:"中度刺激",toxicitySource:"含强心苷，误食引起心律不齐",waterInterval:6,简介:"景天科多肉，原产马达加斯加。花期超长从冬开到春，寓意健康长寿，节日花卉首选。"},
    {name:"大仙女海芋",scientificName:"Alocasia sinensis",family:"天南星科 Araceae",origin:"东南亚热带雨林",growthSeason:"夏秋生长旺季",heatResist:"35°C以下正常",coldResist:"不低于10°C",soil:"疏松排水好的腐叶土",location:"客厅散光处",waterFrequency:"3-4天/次（微湿偏干）",light:"散射光，避免直射",temperature:"18-28°C",fertilizer:"生长期每月一次通用肥",humidity:"较高湿度",toxicityLevel:"中度刺激",toxicitySource:"草酸钙针晶，接触刺痛灼烧",waterInterval:4,简介:"天南星科草本，原产东南亚热带雨林。叶形优雅大气，热带雨林风情十足。"},
    {name:"苹果竹芋",scientificName:"Calathea orbifolia",family:"竹芋科 Marantaceae",origin:"南美洲热带雨林",growthSeason:"全年生长",heatResist:"30°C以下",coldResist:"不低于12°C",soil:"疏松腐殖质微酸土",location:"客厅、卧室",waterFrequency:"2-3天/次（喜湿润）",light:"明亮散射光",temperature:"18-28°C",fertilizer:"生长期每2周一次薄肥",humidity:"较高湿度",toxicityLevel:"无刺激",toxicitySource:"基本无毒，可安全养护",waterInterval:3,简介:"竹芋科草本，原产南美热带雨林。叶片宽大银绿色条纹如青苹果，优雅清新。"},
    {name:"油画婚礼吊兰",scientificName:"Tradescantia zebrina",family:"鸭跖草科 Commelinaceae",origin:"墨西哥、中美洲",growthSeason:"春夏季生长快",heatResist:"35°C以下",coldResist:"不低于5°C",soil:"疏松排水好的营养土",location:"客厅、书房",waterFrequency:"4-5天/次（见干见湿）",light:"散射光",temperature:"15-28°C",fertilizer:"生长期每月一次",humidity:"中等湿度",toxicityLevel:"无刺激",toxicitySource:"可食用，无明显毒性",waterInterval:5,简介:"鸭跖草科蔓生植物，原产墨西哥。叶片紫绿银条纹如油画，垂吊效果惊艳。"},
    {name:"吉姆蕨",scientificName:"Nephrolepis cordifolia",family:"肾蕨科 Nephrolepidaceae",origin:"热带亚热带地区",growthSeason:"春秋季生长旺季",heatResist:"30°C以下",coldResist:"不低于5°C",soil:"疏松腐殖质酸性土",location:"卫生间、北窗台",waterFrequency:"2-3天/次（喜湿润）",light:"散射光或明亮处",temperature:"15-25°C",fertilizer:"生长期每2周一次",humidity:"高湿度",toxicityLevel:"无刺激",toxicitySource:"基本无毒，蕨类可安全养护",waterInterval:3,简介:"肾蕨科蕨类植物，叶片翠绿飘逸如瀑布。净化空气效果好，喜高湿度环境。"},
    {name:"绣球花",scientificName:"Hydrangea macrophylla",family:"绣球科 Hydrangeaceae",origin:"中国、日本",growthSeason:"春夏季开花",heatResist:"30°C以下",coldResist:"耐寒-20°C",soil:"疏松肥沃微酸性土",location:"阳台、花园",waterFrequency:"1-2天/次（喜湿润）",light:"充足散射光",temperature:"15-25°C",fertilizer:"花后以磷钾肥为主",humidity:"湿润",toxicityLevel:"轻微刺激",toxicitySource:"含氰苷化合物，误食引起轻度不适",waterInterval:2,简介:"绣球科灌木，原产中国日本。花色随土壤酸碱变化蓝粉皆美，花期从春到秋。"}
  ]

  const now = new Date()
  const results = []

  for (const p of plants) {
    try {
      const updateData = {
        scientificName: p.scientificName || '',
        family: p.family || '',
        origin: p.origin || '',
        growthSeason: p.growthSeason || '',
        heatResist: p.heatResist || '',
        coldResist: p.coldResist || '',
        soil: p.soil || '',
        location: p.location,
        waterFrequency: p.waterFrequency,
        light: p.light,
        temperature: p.temperature,
        fertilizer: p.fertilizer,
        humidity: p.humidity,
        toxicityLevel: p.toxicityLevel,
        toxicitySource: p.toxicitySource,
        waterInterval: p.waterInterval,
        简介: p.简介 || '',
        updatedAt: db.serverDate()
      }

      // 先查是否已有同名植物
      const existing = await db.collection('plants').where({ name: p.name }).get()
      
      if (existing.data.length > 0) {
        // 已有记录，更新字段
        const recordId = existing.data[0]._id
        await db.collection('plants').doc(recordId).update({ data: updateData })
        results.push({ name: p.name, action: 'updated', id: recordId })
      } else {
        // 没有记录，创建新的
        const waterMs = (p.waterInterval || 7) * 24 * 60 * 60 * 1000
        const fertMs = 14 * 24 * 60 * 60 * 1000
        const doc = {
          ...updateData,
          name: p.name,
          '浇水时间': now,
          '下次浇水时间': new Date(now.getTime() + waterMs),
          '下次施肥时间': new Date(now.getTime() + fertMs),
          createdAt: db.serverDate()
        }
        const res = await db.collection('plants').add({ data: doc })
        results.push({ name: p.name, action: 'created', id: res._id })
      }
    } catch (e) {
      results.push({ name: p.name, action: 'error', error: e.message })
    }
  }

  return { success: true, results }
}