// 微信云开发数据库工具

// 确保云开发已初始化
function ensureCloudInit() {
  try {
    // 尝试调用一个云API检测是否已初始化
    wx.cloud.database()
    return true
  } catch (e) {
    // 未初始化，手动初始化
    try {
      wx.cloud.init({
        env: 'cloudbase-1gvp8uog633d75e8',
        traceUser: true,
      })
      return true
    } catch (e2) {
      console.error('wx.cloud.init failed:', e2)
      return false
    }
  }
}

// 获取数据库实例
function getDB() {
  if (!ensureCloudInit()) return null
  try {
    return wx.cloud.database()
  } catch (e) {
    console.error('getDB failed:', e)
    return null
  }
}

// 获取用户ID（微信UnionID或匿名ID）
function getUserId() {
  return new Promise((resolve, reject) => {
    // 先尝试获取 UnionID（需要绑定微信开放平台）
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        resolve(res.result.openid || res.result.userInfo.openId)
      },
      fail: () => {
        // 降级：使用本地存储的匿名ID
        let anonymousId = wx.getStorageSync('anonymousId')
        if (!anonymousId) {
          anonymousId = 'user_' + Math.random().toString(36).substr(2, 17)
          wx.setStorageSync('anonymousId', anonymousId)
        }
        resolve(anonymousId)
      }
    })
  })
}

// 获取当前用户的植物列表
function getPlants() {
  return new Promise(function(resolve, reject) {
    var db = getDB()
    if (!db) return reject(new Error('cloud db not available'))
    var openid = wx.cloud.openid
    console.log('[getPlants] openid:', openid, 'hasOpenid:', !!openid)
    if (!openid) {
      console.log('[getPlants] 无openid，查全部')
      db.collection('plants')
        .orderBy('createdAt', 'desc')
        .get({
          success: function(res) { console.log('[getPlants] 返回:', res.data.length, '条'); resolve(res.data) },
          fail: function(err) { reject(err) }
        })
      return
    }
    db.collection('plants')
      .where({ _openid: openid })
      .orderBy('createdAt', 'desc')
      .get({
        success: function(res) { console.log('[getPlants] 用户记录:', res.data.length, '条'); resolve(res.data) },
        fail: function(err) { reject(err) }
      })
  })
}
// 添加植物
function addPlant(plant) {
  return new Promise((resolve, reject) => {
    const db = getDB()
    if (!db) return reject(new Error('cloud db not available'))
    db.collection('plants').add({
      data: {
        ...plant,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
        // 注意：_openid 由云数据库自动填充，不要手动传入
      },
      success: res => {
        resolve(res)
      },
      fail: err => {
        reject(err)
      }
    })
  })
}

// 更新植物
function updatePlant(id, data) {
  return new Promise((resolve, reject) => {
    const db = getDB()
    if (!db) return reject(new Error('cloud db not available'))
    db.collection('plants').doc(id).update({
      data: {
        ...data,
        updatedAt: db.serverDate()
      },
      success: res => {
        resolve(res)
      },
      fail: err => {
        reject(err)
      }
    })
  })
}

// 删除植物
function deletePlant(id) {
  return new Promise((resolve, reject) => {
    const db = getDB()
    if (!db) return reject(new Error('cloud db not available'))
    db.collection('plants').doc(id).remove({
      success: res => {
        resolve(res)
      },
      fail: err => {
        reject(err)
      }
    })
  })
}

// 批量添加用户植物
function batchAddPlants(plants) {
  return new Promise((resolve, reject) => {
    const db = getDB()
    if (!db) return reject(new Error('cloud db not available'))
    const tasks = plants.map(plant => {
      return db.collection('plants').add({
        data: {
          ...plant,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
          // _openid 由云数据库自动填充
        }
      })
    })
    Promise.all(tasks)
      .then(res => resolve(res))
      .catch(err => reject(err))
  })
}

// 获取参考植物库（只读）
function getReferencePlants() {
  return new Promise((resolve, reject) => {
    const db = getDB()
    if (!db) return reject(new Error('cloud db not available'))
    db.collection('reference_plants')
      .get({
        success: res => {
          resolve(res.data)
        },
        fail: err => {
          reject(err)
        }
      })
  })
}

// 批量添加参考植物（管理员用，不带_openid）
function batchAddReferencePlants(plants) {
  return new Promise((resolve, reject) => {
    const db = getDB()
    if (!db) return reject(new Error('cloud db not available'))
    const tasks = plants.map(plant => {
      return db.collection('reference_plants').add({
        data: {
          ...plant,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
    })
    Promise.all(tasks)
      .then(res => resolve(res))
      .catch(err => reject(err))
  })
}

module.exports = {
  getUserId,
  getPlants,
  addPlant,
  updatePlant,
  deletePlant,
  batchAddPlants,
  getReferencePlants,
  batchAddReferencePlants
}
