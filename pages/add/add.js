const clouddb = require('../../utils/clouddb.js')

// 植物库
const plantDatabase = require('../../utils/plants.js')

// 按拼音排序
function sortByPinyin(list) {
  return list.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
}

const sortedPlants = sortByPinyin(plantDatabase)

// 计算推荐浇水频率
function calcWaterFreq() {
  return new Promise((resolve) => {
    wx.getLocation({
      type: 'wgs84',
      success(res) {
        wx.request({
          url: `https://wttr.in/${res.latitude},${res.longitude}?format=j1`,
          success(weatherRes) {
            const data = weatherRes.data
            try {
              let totalRain = 0, avgTemp = 0, avgHumidity = 0, days = 0
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
              let freq = 5
              if (avgTemp > 30) freq -= 2
              else if (avgTemp > 25) freq -= 1
              else if (avgTemp < 10) freq += 2
              if (avgHumidity > 80) freq += 1
              else if (avgHumidity < 30) freq -= 1
              if (totalRain > 10) freq += 1
              if (totalRain > 30) freq += 1
              freq = Math.max(1, Math.min(15, freq))
              resolve(`${freq}-${freq + 1}天/次`)
            } catch (e) {
              resolve('5-6天/次')
            }
          },
          fail: () => resolve('5-6天/次（默认）')
        })
      },
      fail: () => resolve('5-6天/次（默认）')
    })
  })
}

// 获取用户ID
function getUserId() {
  return new Promise((resolve) => {
    wx.getStorage({
      key: 'userId',
      success(res) {
        resolve(res.data)
      },
      fail() {
        // 没有ID，生成一个随机ID
        const id = 'user_' + Date.now()
        wx.setStorage({ key: 'userId', data: id })
        resolve(id)
      }
    })
  })
}

Page({
  data: {
    photoPath: '',
    name: '',
    location: '',
    light: '',
    temperature: '',
    fertilizer: '',
    humidity: '',
    toxicityLevel: '无刺激',
    searchText: '',
    selectedIndex: 0,
    showDropdown: false,
    recommendedWaterFreq: '获取中...',
    waterFreqList: ['2-3天/次', '3-4天/次', '4-5天/次', '5-6天/次', '6-7天/次', '7-8天/次', '8-10天/次', '10-12天/次', '12-15天/次'],
    waterFreqIndex: 4,
    plantList: sortedPlants,
    filteredList: sortedPlants
  },

  async onLoad() {
    console.log('植物数量:', this.data.plantList.length)
    // 获取推荐浇水频率并自动选中
    const recommended = await calcWaterFreq()
    const freqNum = recommended.split('-')[0].replace('天/次', '')
    // 找到匹配的频率选项
    let freqIndex = 4 // 默认
    for (let i = 0; i < this.data.waterFreqList.length; i++) {
      if (this.data.waterFreqList[i].includes(freqNum + '天')) {
        freqIndex = i
        break
      }
    }
    this.setData({ 
      recommendedWaterFreq: recommended,
      waterFreqIndex: freqIndex
    })
  },

  // 搜索过滤
  onSearchInput(e) {
    const keyword = e.detail.value.toLowerCase()
    if (!keyword) {
      this.setData({ 
        filteredList: this.data.plantList, 
        searchText: '',
        selectedIndex: 0,
        showDropdown: true
      })
      return
    }
    const filtered = this.data.plantList.filter(p => 
      p.name.toLowerCase().includes(keyword)
    )
    this.setData({ 
      filteredList: filtered, 
      searchText: e.detail.value,
      selectedIndex: 0,
      showDropdown: true
    })
  },

  // 显示下拉框
  onSearchFocus() {
    this.setData({ showDropdown: true })
  },

  // 隐藏下拉框
  onSearchBlur() {
    setTimeout(() => {
      this.setData({ showDropdown: false })
    }, 200)
  },

  // 选择植物
  onSelectPlant(e) {
    const idx = e.currentTarget.dataset.index
    const plant = this.data.filteredList[idx]
    if (!plant) return
    
    // 匹配浇水频率
    let freqIndex = 0
    const plantFreq = plant.waterFreq.replace('（视温度湿度调整）', '')
    for (let i = 0; i < this.data.waterFreqList.length; i++) {
      if (this.data.waterFreqList[i].includes(plantFreq.replace('天/次', ''))) {
        freqIndex = i
        break
      }
    }
    
    this.setData({
      name: plant.name,
      location: plant.location,
      light: plant.light,
      temperature: plant.temperature,
      fertilizer: plant.fertilizer,
      humidity: plant.humidity,
      toxicityLevel: plant.toxicityLevel || '无刺激',
      waterFreqIndex: freqIndex,
      selectedIndex: idx,
      searchText: plant.name,
      showDropdown: false
    })
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        this.setData({ photoPath: res.tempFiles[0].tempFilePath })
      }
    })
  },

  onNameInput(e) { this.setData({ name: e.detail.value }) },
  onLocationInput(e) { this.setData({ location: e.detail.value }) },
  onLightInput(e) { this.setData({ light: e.detail.value }) },
  onTempInput(e) { this.setData({ temperature: e.detail.value }) },
  onFertilizerInput(e) { this.setData({ fertilizer: e.detail.value }) },
  onHumidityInput(e) { this.setData({ humidity: e.detail.value }) },
  onWaterFreqChange(e) { this.setData({ waterFreqIndex: e.detail.value }) },

  goBack() {
    wx.navigateBack()
  },

  savePlant() {
    if (!this.data.name) {
      wx.showToast({ title: '请填写花名', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })
    const now = Date.now()

    const freqText = this.data.waterFreqList[this.data.waterFreqIndex]
    // 从 "5-6天/次" 中提取数字
    const freqMatch = freqText.match(/(\d+)/)
    const waterInterval = freqMatch ? parseInt(freqMatch[1]) : 5

    const plant = {
      name: this.data.name,
      location: this.data.location || '-',
      waterFrequency: freqText,
      light: this.data.light || '-',
      temperature: this.data.temperature || '-',
      fertilizer: this.data.fertilizer || '-',
      humidity: this.data.humidity || '-',
      toxicityLevel: this.data.toxicityLevel || '无刺激',
      waterInterval: waterInterval,
      '浇水时间': new Date(now),
      '下次浇水时间': new Date(now + waterInterval * 24 * 60 * 60 * 1000),
      '下次施肥时间': new Date(now + 30 * 24 * 60 * 60 * 1000)
    }

    clouddb.addPlant(plant).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '添加成功！🎉' })
      setTimeout(() => wx.navigateBack(), 1500)
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: '保存失败: ' + (err.message || '未知错误'), icon: 'none' })
      console.error('保存失败:', err)
    })
  }
})
