// 飞书 API 封装
const app = getApp()

const API_HOST = 'https://open.feishu.cn/open-apis'

// 获取 access_token
function getAccessToken() {
  return new Promise((resolve, reject) => {
    if (app.globalData.accessToken && Date.now() < app.globalData.tokenExpireTime) {
      resolve(app.globalData.accessToken)
      return
    }

    wx.request({
      url: `${API_HOST}/auth/v3/app_access_token/internal`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        app_id: app.globalData.feishuAppId,
        app_secret: app.globalData.feishuAppSecret
      },
      success(res) {
        if (res.data.code === 0) {
          app.globalData.accessToken = res.data.app_access_token
          app.globalData.tokenExpireTime = Date.now() + (res.data.expire - 300) * 1000
          resolve(res.data.app_access_token)
        } else {
          reject(new Error(res.data.msg))
        }
      },
      fail(err) {
        reject(err)
      }
    })
  })
}

// 获取表格记录
function getRecords() {
  return new Promise(async (resolve, reject) => {
    try {
      const token = await getAccessToken()
      wx.request({
        url: `${API_HOST}/bitable/v1/apps/${app.globalData.appToken}/tables/${app.globalData.tableId}/records`,
        method: 'GET',
        header: { 'Authorization': `Bearer ${token}` },
        success(res) {
          if (res.data.code === 0) {
            resolve(res.data.data.items)
          } else {
            reject(new Error(res.data.msg))
          }
        },
        fail(err) {
          reject(err)
        }
      })
    } catch (err) {
      reject(err)
    }
  })
}

// 更新记录
function updateRecord(recordId, fields) {
  return new Promise(async (resolve, reject) => {
    try {
      const token = await getAccessToken()
      wx.request({
        url: `${API_HOST}/bitable/v1/apps/${app.globalData.appToken}/tables/${app.globalData.tableId}/records/${recordId}`,
        method: 'PUT',
        header: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        data: { fields },
        success(res) {
          if (res.data.code === 0) {
            resolve(res.data.data)
          } else {
            reject(new Error(res.data.msg))
          }
        },
        fail(err) {
          reject(err)
        }
      })
    } catch (err) {
      reject(err)
    }
  })
}

// 创建记录
function createRecord(fields) {
  return new Promise(async (resolve, reject) => {
    try {
      const token = await getAccessToken()
      wx.request({
        url: `${API_HOST}/bitable/v1/apps/${app.globalData.appToken}/tables/${app.globalData.tableId}/records`,
        method: 'POST',
        header: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        data: { fields },
        success(res) {
          if (res.data.code === 0) {
            resolve(res.data.data)
          } else {
            reject(new Error(res.data.msg))
          }
        },
        fail(err) {
          reject(err)
        }
      })
    } catch (err) {
      reject(err)
    }
  })
}

// 删除记录
function deleteRecord(recordId) {
  return new Promise(async (resolve, reject) => {
    try {
      const token = await getAccessToken()
      wx.request({
        url: `${API_HOST}/bitable/v1/apps/${app.globalData.appToken}/tables/${app.globalData.tableId}/records/${recordId}`,
        method: 'DELETE',
        header: { 'Authorization': `Bearer ${token}` },
        success(res) {
          if (res.data.code === 0) {
            resolve(res.data.data)
          } else {
            reject(new Error(res.data.msg))
          }
        },
        fail(err) {
          reject(err)
        }
      })
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = {
  getAccessToken,
  getRecords,
  updateRecord,
  createRecord,
  deleteRecord
}
