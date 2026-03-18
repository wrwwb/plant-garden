// 微信云开发数据库工具
const db = wx.cloud.database()

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
  return new Promise((resolve, reject) => {
    getUserId().then(userId => {
      db.collection('plants')
        .where({
          _openid: userId
        })
        .orderBy('createdAt', 'desc')
        .get({
          success: res => {
            resolve(res.data)
          },
          fail: err => {
            reject(err)
          }
        })
    })
  })
}

// 添加植物
function addPlant(plant) {
  return new Promise((resolve, reject) => {
    getUserId().then(userId => {
      db.collection('plants').add({
        data: {
          ...plant,
          _openid: userId,
          createdAt: db.serverDate(),
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
  })
}

// 更新植物
function updatePlant(id, data) {
  return new Promise((resolve, reject) => {
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

// 批量添加参考植物（管理员用，不带_openid）
function batchAddReferencePlants(plants) {
  return new Promise((resolve, reject) => {
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
function batchAddPlants(plants) {
  return new Promise((resolve, reject) => {
    getUserId().then(userId => {
      const tasks = plants.map(plant => {
        return db.collection('plants').add({
          data: {
            ...plant,
            _openid: userId,
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
        })
      })
      Promise.all(tasks)
        .then(res => resolve(res))
        .catch(err => reject(err))
    })
  })
}

// 获取参考植物库（只读）
function getReferencePlants() {
  return new Promise((resolve, reject) => {
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
