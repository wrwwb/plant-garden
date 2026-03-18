const clouddb = require('../../utils/clouddb.js')
const refData = require('../../utils/plants.js')

Page({
  data: {
    status: '准备就绪',
    logs: [],
    total: 0,
    done: 0
  },

  onLoad() {
    this.log(`共有 ${refData.length} 种参考植物`)
    this.setData({ total: refData.length })
  },

  log(msg) {
    const logs = this.data.logs
    logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`)
    this.setData({ logs })
  },

  async uploadBatch() {
    this.log('开始上传...')
    const batchSize = 10
    let done = 0
    
    for (let i = 0; i < refData.length; i += batchSize) {
      const batch = refData.slice(i, i + batchSize)
      const plants = batch.map(p => ({
        name: p.name,
        location: p.location,
        waterFrequency: p.waterFreq,
        light: p.light,
        temperature: p.temperature,
        fertilizer: p.fertilizer,
        humidity: p.humidity,
        toxicityLevel: p.toxicityLevel,
        toxicitySource: p.toxicitySource
      }))
      
      try {
        await clouddb.batchAddReferencePlants(plants)
        done += batch.length
        this.setData({ done, status: `已完成 ${done}/${this.data.total}` })
        this.log(`✓ 第${i/batchSize + 1}批 (${batch.length}条) 上传成功`)
      } catch (e) {
        this.log(`✗ 第${i/batchSize + 1}批失败: ${e.message || e.errMsg || e}`)
        done += batch.length
        this.setData({ done, status: `已完成 ${done}/${this.data.total}` })
      }
      
      await new Promise(r => setTimeout(r, 1000))
    }
    
    this.log('全部完成！')
    this.setData({ status: '完成！' })
  },

  async checkRef() {
    this.log('查询中...')
    try {
      const plants = await clouddb.getReferencePlants()
      this.log(`共 ${plants.length} 种参考植物`)
    } catch (e) {
      this.log(`查询失败: ${e.message || e.errMsg}`)
    }
  }
})
