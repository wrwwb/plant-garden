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
    scrollIntoView: ''
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
    wx.getLocation({
      type: 'wgs84',
      success: (res) => {
        wx.request({
          url: `https://wttr.in/${res.latitude},${res.longitude}?format=j1`,
          success: (weatherRes) => {
            const data = weatherRes.data || {}
            // 计算推荐浇水间隔
            let totalRain = 0, avgTemp = 0, avgHumidity = 0, days = 0
            try {
              const forecast = data.weather || []
              for (let i = 0; i < Math.min(3, forecast.length); i++) {
                const day = forecast[i]
                if (day.hourly) {
                  for (let h = 0; h < day.hourly.length; h++) {
                    const hour = day.hourly[h]
                    totalRain += parseFloat(hour.precipMM || '0')
                    avgTemp += parseFloat(hour.temp_C || '20')
                    avgHumidity += parseInt(hour.humidity || '50')
                    days++
                  }
                }
              }
              if (days > 0) {
                avgTemp = avgTemp / days
                avgHumidity = avgHumidity / days
              }
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
    const that = this
    wx.login({
      success(res) {
        // 通过 wx.login 获取 openid（需要后台配合）
        // 这里先用本地存储，如果已有用户ID就用已有的
        const userId = wx.getStorageSync('userId')
        if (!userId) {
          // 生成随机ID（实际项目应该通过后台获取openid）
          const newId = 'user_' + Date.now()
          wx.setStorageSync('userId', newId)
          that.setData({ currentUserId: newId })
        } else {
          that.setData({ currentUserId: userId })
        }
      }
    })
  },

  onShow() {
    this.loadPlants()
  },

  // 根据天气计算推荐浇水频率
  calculateWaterFreq(weatherData) {
    try {
      const forecast = weatherData.weather || []
      let totalRain = 0
      let avgTemp = 0
      let avgHumidity = 0
      let days = 0
      
      for (let i = 0; i < Math.min(3, forecast.length); i++) {
        const day = forecast[i]
        if (day.hourly) {
          for (let h = 0; h < day.hourly.length; h++) {
            const hour = day.hourly[h]
            const precip = parseFloat(hour.precipMM || '0')
            totalRain += precip
            avgTemp += parseFloat(hour.temp_C || '20')
            avgHumidity += parseInt(hour.humidity || '50')
            days++
          }
        }
      }
      
      if (days > 0) {
        avgTemp = avgTemp / days
        avgHumidity = avgHumidity / days
      }
      
      // 计算推荐浇水频率
      let freq = 5 // 默认5天
      
      // 温度调整
      if (avgTemp > 30) freq -= 2
      else if (avgTemp > 25) freq -= 1
      else if (avgTemp < 10) freq += 2
      
      // 湿度调整
      if (avgHumidity > 80) freq += 1
      else if (avgHumidity < 30) freq -= 1
      
      // 降雨调整
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
          wx.showToast({ title: '设置成功！' })
          this.loadPlants()
        }
      }
    })
  },
  getLocalWeather() {
    const that = this
    
    // 获取位置
    wx.getLocation({
      type: 'wgs84',
      success(res) {
        // 使用免费天气API获取预报
        wx.request({
          url: `https://wttr.in/${res.latitude},${res.longitude}?format=j1`,
          success(weatherRes) {
            const data = weatherRes.data || {}
            const current = (data.current_condition || [])[0] || {}
            const temp = current.temp_C || '--'
            const humidity = current.humidity || '--'
            const weather = (current.weatherDesc || [])[0] || {}
            const weatherText = weather.value || '未知'
            // 获取城市名
            const area = (data.nearest_area || [])[0] || {}
            const city = area.areaName ? area.areaName[0].value : (area.region ? area.region[0].value : '未知')
            
            // 计算推荐浇水频率
            const waterFreq = that.calculateWaterFreq(weatherRes.data)
            
            let icon = '☀️'
            if (weatherText.includes('rain') || weatherText.includes('雨')) icon = '🌧️'
            else if (weatherText.includes('cloud') || weatherText.includes('云')) icon = '☁️'
            else if (weatherText.includes('snow') || weatherText.includes('雪')) icon = '❄️'
            else if (weatherText.includes('fog') || weatherText.includes('雾')) icon = '🌫️'
            else if (weatherText.includes('sun') || weatherText.includes('晴')) icon = '☀️'
            
            that.setData({
              localWeather: `${city} ${temp}°C · ${weatherText} · 湿度${humidity}%`,
              weatherIcon: icon,
              recommendedWaterFreq: waterFreq
            })
          },
          fail() {
            that.setData({ 
              localWeather: '天气获取失败',
              recommendedWaterFreq: '5-6天/次'
            })
          }
        })
      },
      fail() {
        // 如果获取位置失败，使用IP定位
        wx.request({
          url: 'https://wttr.in/?format=j1',
          success(res) {
            const w = (res.data || {}).current_condition || []
            const current = w[0] || {}
            const temp = Array.isArray(current.temp_C) ? current.temp_C[0] : (current.temp_C || '--')
            const weather = Array.isArray(current.weatherDesc) ? (current.weatherDesc[0] || {}).value : (current.weatherDesc || '--')
            const weatherText = Array.isArray(weather) ? weather[0] : weather
            const waterFreq = that.calculateWaterFreq(res.data || {})
            that.setData({
              localWeather: `${temp}°C · ${weatherText}`,
              recommendedWaterFreq: waterFreq
            })
          },
          fail() {
            that.setData({ localWeather: '天气获取失败' })
          }
        })
      }
    })
  },

  loadPlants() {
    this.setData({ loading: true, error: '' })
    
    clouddb.getPlants().then(plants => {
      if (plants.length === 0) {
        plants = this.getMockData()
      }
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
    if (!records || records.length === 0) return []

    const now = Date.now()
    const today = new Date(now)

    return records.map(r => {
      const f = r.fields || r

      // 兼容中英文字段名
      const name = f['name'] || f['花名'] || '-'
      const location = f['location'] || f['推荐摆放位置'] || '-'
      const waterFrequency = f['waterFrequency'] || f['浇水频率'] || '-'
      const light = f['light'] || f['光照要求'] || '-'
      const temperature = f['temperature'] || f['温度要求'] || '-'
      const fertilizer = f['fertilizer'] || f['施肥'] || '-'
      const humidity = f['humidity'] || f['湿度/特殊注意事项'] || '-'
      const toxicityLevel = f['toxicityLevel'] || f['毒性安全等级'] || '无刺激'
      const toxicitySource = f['toxicitySource'] || f['备注'] || ''

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
        lastWaterTime: this.formatDate(lastWaterTime),
        nextWaterTime: this.formatDate(nextWaterTime),
        nextFertilizerTime: this.formatDate(nextFertilizerTime),
        needWater,
        needFertilizer
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
    const plant = (this.data.plants || []).find(p => p.id === recordId)
    const baseDays = plant ? (plant.waterInterval || 7) : 7

    // 先获取天气，再计算动态间隔
    wx.getLocation({
      type: 'wgs84',
      success(loc) {
        wx.request({
          url: `https://wttr.in/${loc.latitude},${loc.longitude}?format=j1`,
          success(weatherRes) {
            let days = baseDays
            try {
              const forecast = (weatherRes.data || {}).weather || []
              let totalRain = 0, avgTemp = 0, avgHumidity = 0, d = 0
              for (let i = 0; i < Math.min(3, forecast.length); i++) {
                const day = forecast[i]
                if (day.hourly) {
                  for (let h = 0; h < day.hourly.length; h++) {
                    const hour = day.hourly[h]
                    totalRain += parseFloat(hour.precipMM || '0')
                    avgTemp += parseFloat(hour.temp_C || '20')
                    avgHumidity += parseInt(hour.humidity || '50')
                    d++
                  }
                }
              }
              if (d > 0) { avgTemp /= d; avgHumidity /= d }
              // 根据天气微调间隔
              if (avgTemp > 30) days -= 2
              else if (avgTemp > 25) days -= 1
              else if (avgTemp < 10) days += 2
              if (avgHumidity > 80) days += 1
              else if (avgHumidity < 30) days -= 1
              if (totalRain > 10) days += 1
              if (totalRain > 30) days += 1
              days = Math.max(1, Math.min(15, days))
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
    clouddb.updatePlant(recordId, {
      '浇水时间': new Date(),
      '下次浇水时间': new Date(nextWaterTime),
      waterInterval: days
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: `💧 ${name} 浇水成功！` })
      this.loadPlants()
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: '更新失败', icon: 'none' })
      console.error('更新失败:', err)
    })
  },

  updateFertilizerTime(recordId, name) {
    wx.showLoading({ title: '更新中...' })
    const that = this
    // 施肥周期也根据天气微调
    wx.getLocation({
      type: 'wgs84',
      success(loc) {
        wx.request({
          url: `https://wttr.in/${loc.latitude},${loc.longitude}?format=j1`,
          success(weatherRes) {
            let days = 14 // 默认2周
            try {
              const forecast = (weatherRes.data || {}).weather || []
              let avgTemp = 0, d = 0
              for (let i = 0; i < Math.min(3, forecast.length); i++) {
                const day = forecast[i]
                if (day.hourly) {
                  for (let h = 0; h < day.hourly.length; h++) {
                    avgTemp += parseFloat(day.hourly[h].temp_C || '20')
                    d++
                  }
                }
              }
              if (d > 0) avgTemp /= d
              // 生长期（温暖）施肥更频繁
              if (avgTemp > 25) days = 10
              else if (avgTemp < 10) days = 30
              else days = 14
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
    clouddb.updatePlant(recordId, {
      '下次施肥时间': new Date(nextFertilizerTime)
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: `🌱 ${name} 施肥成功！` })
      this.loadPlants()
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: '更新失败', icon: 'none' })
      console.error('施肥更新失败:', err)
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
        lastWaterTime: '3月10日',
        nextWaterTime: '4月3日',
        nextFertilizerTime: '4月14日',
        needWater: false,
        needFertilizer: false
      }
    ]
  },

  // 触摸开始
  touchStart(e) {
    this.setData({ startX: e.touches[0].clientX })
  },

  // 触摸移动
  touchMove(e) {
    const currentX = e.touches[0].clientX
    const diff = this.data.startX - currentX
    const index = e.currentTarget.dataset.index
    
    if (diff > 50) {
      // 向左滑动，显示删除按钮
      const plants = this.data.plants
      plants[index].isSwiping = true
      this.setData({ plants })
    } else if (diff < -50) {
      // 向右滑动，隐藏删除按钮
      const plants = this.data.plants
      plants[index].isSwiping = false
      this.setData({ plants })
    }
  },

  // 滚动到待浇水植物
  scrollToWater() {
    const idx = this.data.plants.findIndex(p => p.needWater)
    if (idx >= 0) {
      this.setData({ scrollIntoView: 'plant-' + idx })
      setTimeout(() => this.setData({ scrollIntoView: '' }), 500)
    }
  },

  // 滚动到待施肥植物
  scrollToFertilizer() {
    const idx = this.data.plants.findIndex(p => p.needFertilizer)
    if (idx >= 0) {
      this.setData({ scrollIntoView: 'plant-' + idx })
      setTimeout(() => this.setData({ scrollIntoView: '' }), 500)
    }
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
          wx.showToast({ title: '删除失败: ' + (res.result ? res.result.error : '未知'), icon: 'none' })
          console.error('删除失败:', res)
        }
      },
      fail: (err) => {
        wx.hideLoading()
        wx.showToast({ title: '删除失败', icon: 'none' })
        console.error('删除失败:', err)
      }
    })
  }
  goToTest() {
    wx.navigateTo({ url: "/pages/test/test" })
  },

})
