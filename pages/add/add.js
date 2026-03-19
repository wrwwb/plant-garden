const clouddb = require('../../utils/clouddb.js')

// 植物库
const plantDatabase = require('../../utils/plants.js')

// 按拼音排序
function sortByPinyin(list) {
  return list.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
}

const sortedPlants = sortByPinyin(plantDatabase)

// 拼音首字母转换
const _pinyinMap = {
'绿':'l','萝':'l','吊':'d','兰':'l','虎':'h','皮':'p','龟':'g','背':'b','竹':'z',
'文':'w','芦':'l','荟':'h','发':'f','财':'c','树':'s','白':'b','掌':'z','红':'h',
'富':'f','贵':'g','仙':'x','人':'r','球':'q','多':'d','肉':'r','植':'z','物':'w',
'客':'k','来':'l','杜':'d','鹃':'j','牡':'m','丹':'d','玫':'m','瑰':'g','茉':'m',
'莉':'l','栀':'z','子':'z','桂':'g','花':'h','月':'y','季':'j','蔷':'q','薇':'w',
'向':'x','日':'r','葵':'k','荷':'h','睡':'s','莲':'l','水':'s','石':'s','蒜':'s',
'百':'b','合':'h','郁':'y','金':'j','香':'x','风':'f','信':'x','薰':'x','衣':'y',
'草':'c','薄':'b','罗':'l','勒':'l','迷':'m','迭':'d','紫':'z','藤':'t','牵':'q',
'牛':'n','雏':'c','菊':'j','大':'d','丽':'l','康':'k','乃':'n','馨':'x','满':'m',
'天':'t','星':'x','勿':'w','忘':'w','我':'w','马':'m','蹄':'t','铃':'l','彼':'b',
'岸':'a','樱':'y','桃':'t','杏':'x','梅':'m','蕉':'j','桑':'s','茶':'c','旅':'l',
'行':'x','者':'z','羽':'y','南':'n','瓜':'g','布':'b','鲁':'l','之':'z','彩':'c',
'虹':'h','梦':'m','幻':'h','海':'h','棠':'t','火':'h','焰':'y','宝':'b','落':'l',
'新':'x','娘':'n','指':'z','令':'l','箭':'j','蟹':'x','爪':'z','玛':'m','格':'g',
'特':'t','鱼':'y','报':'b','春':'c','飞':'f','燕':'y','小':'x','苍':'c','蓝':'l',
'雪':'x','银':'y','莲':'l','伯':'b','利':'l','恒':'h','安':'a','祖':'z','长':'z',
'寿':'s','枝':'z','叶':'y','龙':'l','果':'g','枝':'z','枇':'p','杷':'p','柠':'n',
'檬':'m','橘':'j','柚':'y','橙':'c','苹':'p','葡':'p','萄':'t','柿':'s','樱':'y',
'桃':'t','桑':'s','葚':'s','枣':'z','椰':'y','蕉':'j','柚':'y','杏':'x','杨':'y',
'梅':'m','芒':'m','芒':'m','火':'h','棘':'j','龙':'l','眼':'y','荔':'l','栗':'l',
'枸':'g','杞':'q','苹':'p','果':'g','竹':'z','芋':'y','大':'d','女':'n','女':'n',
'海':'h','芋':'y','苹':'p','果':'g','竹':'z','芋':'y','鹤':'h','望':'w','兰':'l',
'红':'h','运':'y','当':'d','头':'t','滴':'d','水':'s','观':'g','音':'y','龙':'l',
'血':'x','树':'s','花':'h','绿':'l','植':'z','色':'s','布':'b','鲁':'l','鲁':'l',
'伯':'b','利':'l','恒':'h','星':'x','火':'h','焰':'y','木':'m','兰':'l','令':'l',
'令':'l','箭':'j','藤':'t','本':'b','铁':'t','线':'x','蕨':'j','肾':'s','蕨':'j',
'波':'b','士':'s','顿':'d','蕨':'j','鹿':'l','角':'j','蕨':'j','鸟':'n','巢':'c',
'蕨':'j','椒':'j','铜':'t','钱':'q','碰':'p','碰':'p','香':'x','九':'j','丁':'d',
'玉':'y','兰':'l','黄':'h','朱':'z','顶':'d','红':'h','桔':'j','梗':'g','迎':'y',
'春':'c','连':'l','翘':'q','木':'m','棉':'m','紫':'z','荆':'j','李':'l','梨':'l',
'石':'s','榴':'l','芍':'s','药':'y','昙':'t','夜':'y','令':'l','运':'y','当':'d',
'头':'t','宫':'g','灯':'d','花':'h','女':'n','皇':'h','玉':'y','缀':'z','边':'b',
'花':'h','仙':'x','镜':'j','花':'h','雪':'x','球':'q','花':'h','白':'b','掌':'z',
'碰':'p','碰':'p','香':'x','薰':'x','衣':'y','草':'c','百':'b','里':'l','香':'x',
'八':'b','角':'j','金':'j','盘':'p','南':'n','洋':'y','杉':'s','滴':'d','水':'s',
'观':'g','音':'y','金':'j','针':'z','花':'h','快':'k','乐':'l','树':'s'
}

function getPinyinInitials(name) {
  if (!name) return ''
  return name.split('').map(c => {
    if (_pinyinMap[c]) return _pinyinMap[c]
    if (/[a-zA-Z]/.test(c)) return c.toLowerCase()
    return ''
  }).join('')
}


// 计算推荐浇水频率
function calcWaterFreq() {
  return new Promise((resolve) => {
    wx.getLocation({
      type: 'wgs84',
      success(res) {
        wx.request({
          url: `https://api.open-meteo.com/v1/forecast?latitude=${res.latitude}&longitude=${res.longitude}&hourly=temperature_2m,precipitation&forecast_days=3&timezone=Asia/Shanghai`,
          success(weatherRes) {
            try {
              const data = weatherRes.data || {}
              const temps = (data.hourly || {}).temperature_2m || []
              const precips = (data.hourly || {}).precipitation || []
              if (temps.length === 0) { resolve('5-6天/次'); return }
              const count = Math.min(72, temps.length)
              const avgTemp = temps.slice(0, count).reduce((a, b) => a + b, 0) / count
              const totalRain = precips.slice(0, count).reduce((a, b) => a + b, 0)
              let freq = 5
              if (avgTemp > 30) freq -= 2
              else if (avgTemp > 25) freq -= 1
              else if (avgTemp < 10) freq += 2
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
    const filtered = this.data.plantList.filter(p => {
      if (p.name.toLowerCase().includes(keyword)) return true
      const initials = getPinyinInitials(p.name)
      if (initials.includes(keyword)) return true
      return false
    })
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
      if (this.data && !this.data.dropdownScrolling) {
        this.setData({ showDropdown: false })
      }
    }, 300)
  },

  onDropdownScroll(e) {
    this.setData({ dropdownScrolling: true })
    clearTimeout(this._scrollTimer)
    this._scrollTimer = setTimeout(() => {
      this.setData({ dropdownScrolling: false })
    }, 500)
  },

  // 选择植物
  onSelectPlant(e) {
    const idx = e.currentTarget.dataset.index
    const plant = this.data.filteredList[idx]
    if (!plant) return

    // 关闭下拉框
    this.setData({ showDropdown: false })

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
