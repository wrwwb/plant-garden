const clouddb = require('../../utils/clouddb.js')

Page({
  data: {
    localWeather: '获取天气中...',
    weatherIcon: '🌤️',
    recommendedWaterFreq: '',
    plants: [],
    needWaterCount: 0,
    needFertilizerCount: 0,
    loading: true,
    error: '',
     currentUserId: '',
    cityName: ''
  },

  // 定时检查：每天首次打开时更新所有植物的下次浇水时间
  checkAndUpdateWatering() {
    const lastCheck = wx.getStorageSync('lastWaterCheck') || 0
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    
    // 每天只检查一次
    if (now - lastCheck < oneDay) return
    
    wx.setStorageSync('lastWaterCheck', now)
    
    // 获取最新天气并更新所有植物的浇水时间
    this.getLocalWeatherForUpdate()
  },

  // 获取天气用于更新浇水计划
  getLocalWeatherForUpdate() {
    const savedAddr = wx.getStorageSync('userAddress')
    if (!savedAddr) return
    wx.request({
      url: `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(savedAddr)}&count=1&language=zh`,
      success: (geoRes) => {
        const results = (geoRes.data || {}).results || []
        if (results.length === 0) return
        const loc = results[0]
        wx.request({
          url: `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&hourly=temperature_2m,relative_humidity_2m,precipitation&forecast_days=3&timezone=Asia/Shanghai`,
          success: (weatherRes) => {
            try {
              const data = weatherRes.data || {}
              const waterFreq = this.calculateWaterFreq(data)
              this.setData({ recommendedWaterFreq: waterFreq })
            } catch(e) {}
          }
        })
      }
    })
  },

  onLoad() {
    this.loadPlants()
    this.getLocalWeather()
    this.checkAndUpdateWatering()
    // 获取或创建用户ID（优先用微信openid）
    this.initUserId()
  },

  initUserId() {
    const userId = wx.getStorageSync('userId')
    if (userId) {
      this.setData({ currentUserId: userId })
    } else {
      const newId = 'user_' + Date.now()
      wx.setStorageSync('userId', newId)
      this.setData({ currentUserId: newId })
    }
  },

  onShow() {
    this.loadPlants()
    this.getLocalWeather()
  },

  calculateWaterFreq(weatherData) {
    try {
      // Open-Meteo 格式: hourly.temperature_2m, relative_humidity_2m, precipitation
      const hourly = weatherData.hourly || {}
      const temps = hourly.temperature_2m || []
      const humidities = hourly.relative_humidity_2m || []
      const precip = hourly.precipitation || []

      if (temps.length === 0) return '5-6天/次'

      // 取未来 72 小时（3天）的数据
      let totalRain = 0
      let avgTemp = 0
      let avgHumidity = 0
      const count = Math.min(72, temps.length)

      for (let i = 0; i < count; i++) {
        avgTemp += temps[i]
        avgHumidity += humidities[i]
        totalRain += precip[i]
      }
      avgTemp /= count
      avgHumidity /= count

      // 计算推荐浇水频率
      let freq = 5
      if (avgTemp > 30) freq -= 2
      else if (avgTemp > 25) freq -= 1
      else if (avgTemp < 10) freq += 2
      if (avgHumidity > 80) freq += 1
      else if (avgHumidity < 30) freq -= 1
      if (totalRain > 10) freq += 1
      if (totalRain > 30) freq += 1
      freq = Math.max(1, Math.min(15, freq))
      return `${freq}-${freq + 1}天/次`
    } catch (e) {
      return '5-6天/次'
    }
  },

  // 设置用户ID
  setUserId() {
    wx.showModal({
      title: '设置用户',
      placeholderText: '请输入你的名字',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          wx.setStorageSync('userId', res.content)
          this.setData({ currentUserId: res.content })
          wx.showToast({ title: '设置成功！' })
          this.loadPlants()
        }
      }
    })
  },
  // 手动输入地址
  editAddress() {
    const that = this
    const current = wx.getStorageSync('userAddress') || ''
    wx.showModal({
      title: '📍 设置地址',
      editable: true,
      placeholderText: '请输入城市名，如 上海',
      content: current,
      success(res) {
        if (res.confirm && res.content && res.content.trim()) {
          const addr = res.content.trim()
          wx.setStorageSync('userAddress', addr)
          that.setData({ cityName: addr })
          that.fetchWeatherByAddress(addr)
        }
      }
    })
  },

  // 通过地址获取天气（geocoding → weather）
  fetchWeatherByAddress(address) {
    const that = this
    that.setData({ localWeather: '获取天气中...' })
    // 并行：1）用 Open-Meteo 算浇水频率，2）用 wttr.in 获取当前天气
    const weatherTask = new Promise((resolve) => {
      wx.request({
        url: `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(address)}&count=1&language=zh`,
        success(geoRes) {
          const results = (geoRes.data || {}).results || []
          if (results.length === 0) { resolve({ data: null }); return }
          const loc = results[0]
          wx.request({
            url: `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code&forecast_days=3&timezone=Asia/Shanghai`,
            success(r) { resolve(r) },
            fail() { resolve({ data: null }) }
          })
        },
        fail() { resolve({ data: null }) }
      })
    })

    const currentTask = new Promise((resolve) => {
      wx.request({
        url: `https://wttr.in/${encodeURIComponent(address)}?format=%C+%t+%h&m`,
        success(r) {
          const text = (r.data || '').trim()
          // 解析格式: "Sunny +15°C 44%"
          const parts = text.match(/^(.+?)\s+([+-]\d+°C)\s+(\d+)%/)
          if (parts) {
            resolve({
              condition: parts[1].trim(),
              temp: parts[2].trim(),
              humidity: parts[3].trim() + '%'
            })
          } else {
            resolve(null)
          }
        },
        fail() { resolve(null) }
      })
    })

    Promise.all([weatherTask, currentTask]).then(([weatherRes, current]) => {
      // 设置当前天气（用 wttr.in 更准确）
      if (current) {
        const iconMap = {
          'Sunny': '☀️', 'Clear': '☀️', 'Partly cloudy': '⛅', 'Cloudy': '☁️',
          'Overcast': '☁️', 'Mist': '🌫️', 'Fog': '🌫️', 'Rain': '🌧️',
          'Light rain': '🌦️', 'Heavy rain': '🌧️', 'Snow': '❄️',
          'Light snow': '🌨️', 'Thunderstorm': '⛈️', 'Blowing snow': '🌨️'
        }
        const icon = iconMap[current.condition] || '🌤️'
        that.setData({
          localWeather: `${current.temp} · ${current.condition} · 湿度${current.humidity}`,
          weatherIcon: icon,
          cityName: address || ''
        })
      }

      // 用 Open-Meteo 算浇水频率
      const data = (weatherRes || {}).data
      if (!data) {
        that.setData({ recommendedWaterFreq: '5-6天/次' })
        return
      }
      try {
        const waterFreq = that.calculateWaterFreq(data)
        that.setData({ recommendedWaterFreq: waterFreq })
      } catch(e) {
        that.setData({ recommendedWaterFreq: '5-6天/次' })
      }
    })
  },

  getLocalWeather() {
    const savedAddr = wx.getStorageSync('userAddress')
    if (savedAddr) {
      this.fetchWeatherByAddress(savedAddr)
    } else {
      this.setData({ localWeather: '点击📍设置地址获取天气', cityName: '' })
    }
  },

  _parseWeather(data, cityName) {
    if (!data) { this.setData({ localWeather: '天气获取失败', recommendedWaterFreq: '5-6天/次' }); return }
    const hourly = data.hourly || {}
    const temps = hourly.temperature_2m || []
    const humidities = hourly.relative_humidity_2m || []
    const codes = hourly.weather_code || []
    const now = new Date()
    const hourStr = String(now.getHours()).padStart(2, '0') + ':00'
    let idx = hourly.time ? hourly.time.indexOf(hourStr) : -1
    if (idx < 0) idx = 0
    const temp = temps[idx] || '--'
    const humidity = humidities[idx] || '--'
    const code = codes[idx] || 0
    const weatherText = this._weatherCodeToText(code)
    const waterFreq = this.calculateWaterFreq(data)
    let icon = '☀️'
    if (code >= 51 && code < 70) icon = '🌧️'
    else if (code >= 71 && code < 80) icon = '❄️'
    else if (code >= 80 && code < 90) icon = '🌦️'
    else if (code >= 95) icon = '⛈️'
    else if (code >= 3) icon = '☁️'
    this.setData({
      localWeather: `${Math.round(temp)}°C · ${weatherText} · 湿度${Math.round(humidity)}%`,
      weatherIcon: icon,
      recommendedWaterFreq: waterFreq,
      cityName: cityName || ''
    })
  },

  _weatherCodeToText(code) {
    const map = {
      0: '晴', 1: '晴间多云', 2: '多云', 3: '阴',
      45: '雾', 48: '冻雾',
      51: '小毛毛雨', 53: '毛毛雨', 55: '大毛毛雨',
      61: '小雨', 63: '中雨', 65: '大雨',
      71: '小雪', 73: '中雪', 75: '大雪',
      77: '雪粒',
      80: '小阵雨', 81: '中阵雨', 82: '大阵雨',
      85: '小阵雪', 86: '大阵雪',
      95: '雷阵雨', 96: '雷暴冰雹', 99: '雷暴大冰雹'
    }
    return map[code] || '未知'
  },

  // 点击植物总数弹出所有植物名字列表
  showAllPlants() {
    const plants = this.data.plants || []
    if (plants.length === 0) {
      wx.showToast({ title: '还没有植物', icon: 'none' })
      return
    }
    const names = plants.map((p, i) => `${i + 1}. ${p.name}`).join('\n')
    wx.showModal({
      title: `🌿 我的植物们（${plants.length}株）`,
      content: names,
      showCancel: false,
      confirmText: '好的'
    })
  },

  showNeedsWater() {
    const plants = this.data.plants || []
    const needs = plants.filter(p => p.needWater)
    if (needs.length === 0) {
      wx.showToast({ title: '太棒了！没有需要浇水的植物 🎉', icon: 'none' })
      return
    }
    const names = needs.map((p, i) => `${i + 1}. ${p.name}`).join('\n')
    wx.showModal({
      title: `💧 待浇水（${needs.length}株）`,
      content: names,
      showCancel: false,
      confirmText: '好的'
    })
  },

  scrollToTop() {
    wx.pageScrollTo({ scrollTop: 0, duration: 300 })
  },

  scrollToPlant(e) {
    const index = e.currentTarget.dataset.index
    wx.createSelectorQuery().select('#plant-' + index).boundingClientRect(res => {
      if (res) {
        wx.pageScrollTo({ scrollTop: res.top, duration: 300 })
      }
    }).exec()
  },

  showNeedsFertilizer() {
    const plants = this.data.plants || []
    const needs = plants.filter(p => p.needFertilizer)
    if (needs.length === 0) {
      wx.showToast({ title: '太棒了！没有需要施肥的植物 🎉', icon: 'none' })
      return
    }
    const names = needs.map((p, i) => `${i + 1}. ${p.name}`).join('\n')
    wx.showModal({
      title: `🌱 待施肥（${needs.length}株）`,
      content: names,
      showCancel: false,
      confirmText: '好的'
    })
  },



  editLastWater(e) {
    const { index, id } = e.currentTarget.dataset
    const plants = this.data.plants
    if (!plants || index >= plants.length) return
    const current = plants[index]
    // date picker 返回格式：YYYY-MM-DD
    const newDate = e.detail.value
    const date = new Date(newDate)
    const nextWaterDate = new Date(date.getTime() + (current.waterInterval || 7) * 24 * 60 * 60 * 1000)
    wx.showLoading({ title: '更新中...' })
    wx.cloud.callFunction({
      name: 'updatePlant',
      data: {
        recordId: id,
        data: {
          '浇水时间': date,
          '下次浇水时间': nextWaterDate
        }
      },
      success: () => {
        wx.hideLoading()
        wx.showToast({ title: '已更新' })
        this.loadPlants()
      },
      fail: (err) => {
        wx.hideLoading()
        wx.showToast({ title: '更新失败', icon: 'none' })
        console.error('更新上次浇水失败:', err)
      }
    })
  },

  loadPlants() {
    this.setData({ loading: true, error: '' })
    
    clouddb.getPlants().then(rawPlants => {
      if (rawPlants.length === 0) {
        const plants = this.getMockData()
        this.setData({
          plants,
          needWaterCount: plants.filter(p => p.needWater).length,
          needFertilizerCount: plants.filter(p => p.needFertilizer).length,
          loading: false
        })
        return
      }
      const plants = this.processRecords(rawPlants)
      this.setData({
        plants,
        needWaterCount: plants.filter(p => p.needWater).length,
        needFertilizerCount: plants.filter(p => p.needFertilizer).length,
        loading: false
      })
    }).catch(err => {
      console.error('加载植物失败:', err)
      this.setData({
        loading: false,
        error: '数据加载失败'
      })
    })
  },

  processRecords(records) {
    const cardColors = [
      'rgba(232,245,233,0.6)', // 浅绿
      'rgba(255,243,224,0.6)', // 浅橙
      'rgba(227,242,253,0.6)', // 浅蓝
      'rgba(255,235,238,0.6)', // 浅粉
      'rgba(243,229,245,0.6)', // 浅紫
      'rgba(225,245,254,0.6)', // 浅青
      'rgba(255,248,225,0.6)', // 浅黄
      'rgba(232,234,246,0.6)', // 浅靛
    ]
    if (!records || records.length === 0) return []

    const now = Date.now()
    const today = new Date(now)

    return records.map(r => {
      const f = r.fields || r

      // 兼容中英文字段名
      const name = f['name'] || f['花名'] || '-'
      const location = f['location'] || f['推荐摆放位置'] || '-'
      const waterFrequency = f['waterFrequency'] || f['waterFreq'] || f['浇水频率'] || '-'
      const light = f['light'] || f['光照要求'] || '-'
      const temperature = f['temperature'] || f['温度要求'] || '-'
      const fertilizer = f['fertilizer'] || f['施肥'] || '-'
      const humidity = f['humidity'] || f['湿度/特殊注意事项'] || '-'
      const toxicityLevel = f['toxicityLevel'] || f['毒性安全等级'] || '无刺激'
      const toxicitySource = f['toxicitySource'] || f['备注'] || ''
      const plantDesc = f['简介'] || ''

      // 日期字段（云数据库返回的可能是字符串或时间戳）
      const parseDate = (val) => {
        if (!val) return null
        if (val instanceof Date) return val
        const d = new Date(val)
        return isNaN(d.getTime()) ? null : d
      }

      const lastWaterTime = parseDate(f['浇水时间']) || new Date(now - 7 * 24 * 60 * 60 * 1000)
      const nextWaterTime = parseDate(f['下次浇水时间']) || new Date(now + 7 * 24 * 60 * 60 * 1000)
      const nextFertilizerTime = parseDate(f['下次施肥时间']) || new Date(now + 30 * 24 * 60 * 60 * 1000)

      const needWater = nextWaterTime <= today
      const needFertilizer = nextFertilizerTime <= today

      const waterInterval = f['waterInterval'] || 7

      const colorIdx = (r._id || '').length > 0 ? (r._id.charCodeAt(0) + (r._id.charCodeAt(1) || 0)) % cardColors.length : 0

      return {
        recordId: r._id || r.recordId || '',
        name,
        location,
        waterFrequency,
        fertilizer,
        light,
        temperature,
        humidity,
        toxicityLevel,
        toxicitySource,
        plantDesc,
        scientificName: f['scientificName'] || '',
        family: f['family'] || '',
        origin: f['origin'] || '',
        growthSeason: f['growthSeason'] || '',
        heatResist: f['heatResist'] || '',
        coldResist: f['coldResist'] || '',
        soil: f['soil'] || '',
        lastWaterTime: this.formatDate(lastWaterTime),
        lastWaterDate: lastWaterTime instanceof Date ? lastWaterTime.toISOString().slice(0, 10) : new Date(lastWaterTime).toISOString().slice(0, 10),
        nextWaterTime: this.formatDate(nextWaterTime),
        lastFertilizerTime: this.formatDate(parseDate(f['施肥时间']) || new Date(now - 30 * 24 * 60 * 60 * 1000)),
        nextFertilizerTime: this.formatDate(nextFertilizerTime),
        needWater,
        needFertilizer,
        cardColor: cardColors[colorIdx]
      }
    })
  },

  formatDate(date) {
    if (!date || isNaN(date.getTime())) return '-'
    return `${date.getMonth() + 1}月${date.getDate()}日`
  },

  // 跳转到添加页面
  goToAdd() {
    wx.navigateTo({
      url: '/pages/add/add'
    })
  },

  goToInit() {
    wx.navigateTo({
      url: '/pages/init/init'
    })
  },

  waterPlant(e) {
    const { id, name } = e.currentTarget.dataset
    wx.showModal({
      title: '💧 确认浇水',
      content: `确定给「${name}」浇水吗？`,
      success: (res) => {
        if (res.confirm) {
          this.updateWaterTime(id, name)
        }
      }
    })
  },

  fertilizePlant(e) {
    const { id, name } = e.currentTarget.dataset
    wx.showModal({
      title: '🌱 确认施肥',
      content: `确定给「${name}」施肥吗？`,
      success: (res) => {
        if (res.confirm) {
          this.updateFertilizerTime(id, name)
        }
      }
    })
  },

  updateWaterTime(recordId, name) {
    wx.showLoading({ title: '更新中...' })
    const that = this
    const plant = (this.data.plants || []).find(p => p.recordId === recordId)
    const baseDays = plant ? (plant.waterInterval || 7) : 7

    // 先获取天气，再计算动态间隔
    const savedAddr = wx.getStorageSync('userAddress')
    if (!savedAddr) { that._doUpdateWater(recordId, name, baseDays); return }
    wx.request({
      url: `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(savedAddr)}&count=1&language=zh`,
      success(geoRes) {
        const results = (geoRes.data || {}).results || []
        if (results.length === 0) { that._doUpdateWater(recordId, name, baseDays); return }
        const loc = results[0]
        wx.request({
          url: `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&hourly=temperature_2m,relative_humidity_2m,precipitation&forecast_days=3&timezone=Asia/Shanghai`,
          success(weatherRes) {
            let days = baseDays
            try {
              const data = weatherRes.data || {}
              const waterFreq = that.calculateWaterFreq(data)
              const match = waterFreq.match(/(\d+)/)
              days = match ? parseInt(match[1]) : baseDays
            } catch (e) { days = baseDays }
            that._doUpdateWater(recordId, name, days)
          },
          fail() { that._doUpdateWater(recordId, name, baseDays) }
        })
      },
      fail() { that._doUpdateWater(recordId, name, baseDays) }
    })
  },

  _doUpdateWater(recordId, name, days) {
    const nextWaterTime = Date.now() + days * 24 * 60 * 60 * 1000
    wx.cloud.callFunction({
      name: 'updatePlant',
      data: { recordId, data: { '浇水时间': new Date(), '下次浇水时间': new Date(nextWaterTime), waterInterval: days } },
      success: () => {
        wx.hideLoading()
        wx.showToast({ title: `💧 ${name} 浇水成功！` })
        this.loadPlants()
      },
      fail: (err) => {
        wx.hideLoading()
        wx.showToast({ title: '更新失败', icon: 'none' })
        console.error('更新失败:', err)
      }
    })
  },

  updateFertilizerTime(recordId, name) {
    wx.showLoading({ title: '更新中...' })
    const that = this
    // 施肥周期也根据天气微调
    const savedAddr = wx.getStorageSync('userAddress')
    if (!savedAddr) { that._doUpdateFertilizer(recordId, name, 14); return }
    wx.request({
      url: `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(savedAddr)}&count=1&language=zh`,
      success(geoRes) {
        const results = (geoRes.data || {}).results || []
        if (results.length === 0) { that._doUpdateFertilizer(recordId, name, 14); return }
        const loc = results[0]
        wx.request({
          url: `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&hourly=temperature_2m&forecast_days=3&timezone=Asia/Shanghai`,
          success(weatherRes) {
            let days = 14
            try {
              const temps = (weatherRes.data || {}).hourly || {}
              const t = temps.temperature_2m || []
              if (t.length > 0) {
                const avgTemp = t.slice(0, 72).reduce((a, b) => a + b, 0) / Math.min(72, t.length)
                if (avgTemp > 25) days = 10
                else if (avgTemp < 10) days = 30
              }
            } catch (e) {}
            that._doUpdateFertilizer(recordId, name, days)
          },
          fail() { that._doUpdateFertilizer(recordId, name, 14) }
        })
      },
      fail() { that._doUpdateFertilizer(recordId, name, 14) }
    })
  },

  _doUpdateFertilizer(recordId, name, days) {
    const nextFertilizerTime = Date.now() + days * 24 * 60 * 60 * 1000
    wx.cloud.callFunction({
      name: 'updatePlant',
      data: { recordId, data: { '下次施肥时间': new Date(nextFertilizerTime) } },
      success: () => {
        wx.hideLoading()
        wx.showToast({ title: `🌱 ${name} 施肥成功！` })
        this.loadPlants()
      },
      fail: (err) => {
        wx.hideLoading()
        wx.showToast({ title: '更新失败', icon: 'none' })
        console.error('施肥更新失败:', err)
      }
    })
  },

  getMockData() {
    return [
      {
        recordId: 'mock1',
        name: '郁金香',
        location: '客厅、阳台',
        waterFrequency: '2-3天/次',
        fertilizer: '花后以磷钾肥为主',
        light: '4-6小时散射光',
        temperature: '15-20℃',
        humidity: '微湿',
        toxicityLevel: '轻微刺激',
        toxicitySource: '鳞茎含苷类，误食引起肠胃刺激',
        plantDesc: '百合科球根花卉，原产中亚土耳其。花朵杯形色彩丰富，春季开花象征美好祝福。',
        lastWaterTime: '3月10日',
        nextWaterTime: '4月3日',
        nextFertilizerTime: '4月14日',
        needWater: false,
        needFertilizer: false
      }
    ]
  },





  // 删除植物
  deletePlant(e) {
    const recordId = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${name}」吗？`,
      confirmText: '删除',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          this.doDeletePlant(recordId, name)
        }
      }
    })
  },

  doDeletePlant(recordId, name) {
    wx.showLoading({ title: '删除中...' })
    console.log('删除植物:', recordId, name)
    
    wx.cloud.callFunction({
      name: 'deletePlant',
      data: { recordId },
      success: (res) => {
        wx.hideLoading()
        console.log('删除结果:', JSON.stringify(res))
        if (res.result && res.result.success) {
          wx.showToast({ title: '已删除' })
          // 从本地数据直接移除，不用重新读数据库
          const plants = this.data.plants.filter(p => p.recordId !== recordId)
          this.setData({
            plants,
            needWaterCount: plants.filter(p => p.needWater).length,
            needFertilizerCount: plants.filter(p => p.needFertilizer).length,
          })
        } else {
          wx.showToast({ title: '删除失败: ' + (res.result ? JSON.stringify(res.result) : '未知'), icon: 'none', duration: 3000 })
          console.error('删除失败 full result:', JSON.stringify(res.result))
        }
      },
      fail: (err) => {
        wx.hideLoading()
        wx.showToast({ title: '删除失败', icon: 'none' })
        console.error('删除失败:', err)
      }
    })
  },
})
