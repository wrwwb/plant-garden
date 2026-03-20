// 云开发数据初始化页面
const clouddb = require('../../utils/clouddb.js')

// 内置数据
const myPlants = [
  {"name":"郁金香","location":"客厅、阳台","waterFrequency":"2-3天/次（见干见湿）","light":"4-6小时散射光","temperature":"15-20℃","fertilizer":"花后以磷钾肥为主","humidity":"微湿","toxicityLevel":"轻微刺激","toxicitySource":"鳞茎含苷类，误食引起肠胃刺激","waterInterval":3,"nextWater":"2026-03-26","nextFertilizer":"2026-04-14","简介":"百合科球根花卉，原产中亚土耳其。花朵杯形色彩丰富，春季开花象征美好祝福。"},
  {"name":"长寿花","location":"客厅、阳台","waterFrequency":"5-7天/次（宁干勿湿）","light":"充足散射光","temperature":"15-25℃","fertilizer":"春秋各施一次复合肥","humidity":"干燥","toxicityLevel":"中度刺激","toxicitySource":"含强心苷，误食引起心律不齐","waterInterval":6,"nextWater":"2026-03-26","nextFertilizer":"2026-04-09","简介":"景天科多肉，原产马达加斯加。花期超长从冬开到春，寓意健康长寿，节日花卉首选。"},
  {"name":"大仙女海芋","location":"客厅散光处","waterFrequency":"3-4天/次（微湿偏干）","light":"散射光，避免直射","temperature":"18-28℃","fertilizer":"生长期每月一次通用肥","humidity":"较高湿度","toxicityLevel":"中度刺激","toxicitySource":"草酸钙针晶，接触刺痛灼烧","waterInterval":4,"nextWater":"2026-03-20","nextFertilizer":"2026-04-09","简介":"天南星科草本，原产东南亚热带雨林。叶形优雅大气，热带雨林风情十足。"},
  {"name":"苹果竹芋","location":"客厅、卧室","waterFrequency":"2-3天/次（喜湿润）","light":"明亮散射光","temperature":"18-28℃","fertilizer":"生长期每2周一次薄肥","humidity":"较高湿度","toxicityLevel":"无刺激","toxicitySource":"基本无毒，可安全养护","waterInterval":3,"nextWater":"2026-03-19","nextFertilizer":"2026-04-09","简介":"竹芋科草本，原产南美热带雨林。叶片宽大银绿色条纹如青苹果，优雅清新。"},
  {"name":"油画婚礼吊兰","location":"客厅、书房","waterFrequency":"4-5天/次（见干见湿）","light":"散射光","temperature":"15-28℃","fertilizer":"生长期每月一次","humidity":"中等湿度","toxicityLevel":"无刺激","toxicitySource":"可食用，无明显毒性","waterInterval":5,"nextWater":"2026-03-23","nextFertilizer":"2026-04-07","简介":"鸭跖草科蔓生植物，原产墨西哥。叶片紫绿银条纹如油画，垂吊效果惊艳。"},
  {"name":"吉姆蕨","location":"卫生间、北窗台","waterFrequency":"2-3天/次（喜湿润）","light":"散射光或明亮处","temperature":"15-25℃","fertilizer":"生长期每2周一次","humidity":"高湿度","toxicityLevel":"无刺激","toxicitySource":"基本无毒，蕨类可安全养护","waterInterval":3,"nextWater":"2026-03-19","nextFertilizer":"2026-04-24","简介":"肾蕨科蕨类，叶片翠绿飘逸如瀑布。净化空气效果好，喜高湿度环境。"},
  {"name":"绣球花","location":"阳台、花园","waterFrequency":"1-2天/次（喜湿润）","light":"充足散射光","temperature":"15-25℃","fertilizer":"花后以磷钾肥为主","humidity":"湿润","toxicityLevel":"轻微刺激","toxicitySource":"含氰苷化合物，误食引起轻度不适","waterInterval":2,"nextWater":"2026-03-18","nextFertilizer":"2026-03-25","简介":"绣球科灌木，原产中国日本。花色随土壤酸碱变化蓝粉皆美，花期从春到秋。"}
]

function parseDate(str) {
  if (!str) return new Date()
  const parts = str.split('-')
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
}

Page({
  data: {
    status: '准备就绪',
    logs: [],
    uploading: false
  },

  onLoad() {
    this.log('初始化页面已加载（不会自动上传）')
  },

  log(msg) {
    const logs = this.data.logs || []
    logs.push('[' + new Date().toLocaleTimeString() + '] ' + msg)
    this.setData({ logs, status: msg })
    console.log(msg)
  },

  // 上传我的植物（逐条上传）
  async uploadMyPlants() {
    this.log('开始上传/更新我的植物...')
    const db = wx.cloud.database()
    for (let i = 0; i < myPlants.length; i++) {
      const p = myPlants[i]
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
        // 先查当前用户是否已有同名植物
        const myOpenid = wx.cloud.openid
        var query = myOpenid ? { name: p.name, _openid: myOpenid } : { name: p.name }
        const existing = await db.collection('plants').where(query).get()
        if (existing.data.length > 0) {
          const recordId = existing.data[0]._id
          await clouddb.updatePlant(recordId, updateData)
          this.log('✓ ' + p.name + ' 更新成功')
        } else {
          const plant = {
            ...updateData,
            name: p.name,
            '浇水时间': new Date(),
            '下次浇水时间': p.nextWater ? parseDate(p.nextWater) : new Date(),
            '下次施肥时间': p.nextFertilizer ? parseDate(p.nextFertilizer) : new Date()
          }
          await clouddb.addPlant(plant)
          this.log('✓ ' + p.name + ' 新建成功')
        }
      } catch (e) {
        this.log('✗ ' + p.name + ' 失败: ' + (e.message || e.errMsg || JSON.stringify(e)))
      }
      await new Promise(r => setTimeout(r, 500))
    }
    this.log('上传完成！')
  },

  // 云函数批量上传
  cloudUpload() {
    this.log('☁️ 正在通过云函数批量上传...')
    wx.cloud.callFunction({
      name: 'addPlants',
      success: (res) => {
        this.log('✅ 上传结果: ' + JSON.stringify(res.result))
      },
      fail: (err) => {
        this.log('❌ 上传失败: ' + JSON.stringify(err))
      }
    })
  },

  // 补全植物简介
  fillDescriptions() {
    this.log('📝 正在补全植物简介...')
    wx.cloud.callFunction({
      name: 'updatePlantDescriptions',
      success: (res) => {
        if (res.result && res.result.success) {
          this.log('✅ 补全完成！共更新 ' + res.result.updated + ' 条记录')
        } else {
          this.log('❌ 补全失败: ' + JSON.stringify(res.result))
        }
      },
      fail: (err) => {
        this.log('❌ 补全失败: ' + JSON.stringify(err))
      }
    })
  },

  // 客户端去重：每种植物只保留最新一条记录
  async dedupMyPlants() {
    this.log('🧹 开始去重...')
    try {
      const db = wx.cloud.database()
      // 先调login云函数拿openid
      const loginRes = await new Promise(function(resolve, reject) {
        wx.cloud.callFunction({ name: 'login', success: resolve, fail: reject })
      })
      const openid = loginRes.result && loginRes.result.openid
      this.log('openid: ' + (openid || '未获取到'))
      if (!openid) { this.log('❌ 无法获取openid，请检查login云函数部署'); return }
      // 按openid过滤
      const res = await db.collection('plants').where({ _openid: openid }).get()
      const all = res.data
      this.log('你的记录: ' + all.length + ' 条')
      if (all.length <= 1) { this.log('无需去重'); return }
      // 按 name 分组
      const groups = {}
      all.forEach(r => {
        const n = r.name || r['花名'] || '-'
        if (!groups[n]) groups[n] = []
        groups[n].push(r)
      })
      // 找出需要删除的（只删自己的）
      const toDelete = []
      for (const [name, records] of Object.entries(groups)) {
        if (records.length <= 1) { this.log('✓ ' + name + ' 只有1条，跳过'); continue }
        this.log('⚠️ ' + name + ' 有' + records.length + '条重复')
        records.sort(function(a, b) {
          var ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
          var tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return tb - ta
        })
        for (var i = 1; i < records.length; i++) {
          toDelete.push(records[i]._id)
        }
      }
      if (!toDelete.length) { this.log('✅ 没有需要删除的重复记录'); return }
      this.log('需要删除 ' + toDelete.length + ' 条重复记录')
      var deleted = 0
      for (var j = 0; j < toDelete.length; j++) {
        try {
          await db.collection('plants').doc(toDelete[j]).remove()
          deleted++
          this.log('🗑️ 删除: ' + toDelete[j])
        } catch (e) {
          this.log('❌ 删除失败: ' + toDelete[j] + ' ' + (e.message || e.errMsg))
        }
        await new Promise(function(r) { setTimeout(r, 300) })
      }
      this.log('✅ 去重完成！删除了 ' + deleted + ' 条重复记录')
    } catch (e) {
      this.log('❌ 去重失败: ' + (e.message || e.errMsg))
    }
  },

  // 查询我的植物
  async checkMyPlants() {
    this.log('查询中...')
    try {
      const plants = await clouddb.getPlants()
      this.log('共 ' + plants.length + ' 株植物')
      plants.forEach(p => {
        this.log('- ' + p.name + ' (' + p.toxicityLevel + ')')
      })
    } catch (e) {
      this.log('查询失败: ' + (e.message || e.errMsg))
    }
  }
})
