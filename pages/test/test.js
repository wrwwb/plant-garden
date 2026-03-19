Page({
  data: { logs: '' },
  onLoad() {
    this.setData({ logs: '页面加载，点击"运行测试"开始...\n' })
  },
  log(msg) {
    const now = new Date()
    const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0')
    this.setData({ logs: this.data.logs + '[' + time + '] ' + msg + '\n' })
    console.log(msg)
  },
  runTest() {
    this.log('开始调用 testCRUD 云函数...')
    wx.cloud.callFunction({
      name: 'testCRUD',
      success: (res) => {
        this.log('云函数返回: ' + JSON.stringify(res.result, null, 2))
        wx.showToast({ title: '测试完成', icon: 'success' })
      },
      fail: (err) => {
        this.log('调用失败: ' + JSON.stringify(err))
        wx.showToast({ title: '测试失败', icon: 'none' })
      }
    })
  }
})
