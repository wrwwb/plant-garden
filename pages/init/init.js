// 云开发数据初始化页面
const clouddb = require('../../utils/clouddb.js')

// 内置数据
const myPlants = [
  {"name":"郁金香","location":"客厅、阳台","waterFrequency":"2-3天/次（见干见湿）","light":"4-6小时散射光","temperature":"15-20℃","fertilizer":"花后以磷钾肥为主","humidity":"微湿","toxicityLevel":"轻微刺激","toxicitySource":"鳞茎含苷类，误食引起肠胃刺激","waterInterval":3,"nextWater":"2026-03-26","nextFertilizer":"2026-04-14"},
  {"name":"长寿花","location":"客厅、阳台","waterFrequency":"5-7天/次（宁干勿湿）","light":"充足散射光","temperature":"15-25℃","fertilizer":"春秋各施一次复合肥","humidity":"干燥","toxicityLevel":"中度刺激","toxicitySource":"含强心苷，误食引起心律不齐","waterInterval":6,"nextWater":"2026-03-26","nextFertilizer":"2026-04-09"},
  {"name":"大仙女海芋","location":"客厅散光处","waterFrequency":"3-4天/次（微湿偏干）","light":"散射光，避免直射","temperature":"18-28℃","fertilizer":"生长期每月一次通用肥","humidity":"较高湿度","toxicityLevel":"中度刺激","toxicitySource":"草酸钙针晶，接触刺痛灼烧","waterInterval":4,"nextWater":"2026-03-20","nextFertilizer":"2026-04-09"},
  {"name":"苹果竹芋","location":"客厅、卧室","waterFrequency":"2-3天/次（喜湿润）","light":"明亮散射光","temperature":"18-28℃","fertilizer":"生长期每2周一次薄肥","humidity":"较高湿度","toxicityLevel":"无刺激","toxicitySource":"基本无毒，可安全养护","waterInterval":3,"nextWater":"2026-03-19","nextFertilizer":"2026-04-09"},
  {"name":"油画婚礼吊兰","location":"客厅、书房","waterFrequency":"4-5天/次（见干见湿）","light":"散射光","temperature":"15-28℃","fertilizer":"生长期每月一次","humidity":"中等湿度","toxicityLevel":"无刺激","toxicitySource":"可食用，无明显毒性","waterInterval":5,"nextWater":"2026-03-23","nextFertilizer":"2026-04-07"},
  {"name":"吉姆蕨","location":"卫生间、北窗台","waterFrequency":"2-3天/次（喜湿润）","light":"散射光或明亮处","temperature":"15-25℃","fertilizer":"生长期每2周一次","humidity":"高湿度","toxicityLevel":"无刺激","toxicitySource":"基本无毒，蕨类可安全养护","waterInterval":3,"nextWater":"2026-03-19","nextFertilizer":"2026-04-24"},
  {"name":"绣球花","location":"阳台、花园","waterFrequency":"1-2天/次（喜湿润）","light":"充足散射光","temperature":"15-25℃","fertilizer":"花后以磷钾肥为主","humidity":"湿润","toxicityLevel":"轻微刺激","toxicitySource":"含氰苷化合物，误食引起轻度不适","waterInterval":2,"nextWater":"2026-03-18","nextFertilizer":"2026-03-25"}
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
    this.log('初始化开始...')
    // 延迟自动触发云函数批量上传
    this.setData({ uploading: true })
    setTimeout(() => {
      this.log('正在通过云函数上传植物数据...')
      wx.cloud.callFunction({
        name: 'addPlants',
        success: (res) => {
          this.setData({ uploading: false })
          this.log('✅ 上传成功! 结果: ' + JSON.stringify(res.result))
          wx.showToast({ title: '上传成功', icon: 'success' })
        },
        fail: (err) => {
          this.setData({ uploading: false })
          this.log('❌ 上传失败: ' + JSON.stringify(err))
          wx.showToast({ title: '上传失败', icon: 'none' })
        }
      })
    }, 1000)
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
          updatedAt: db.serverDate()
        }
        // 先查是否已有同名植物
        const existing = await db.collection('plants').where({ name: p.name }).get()
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
