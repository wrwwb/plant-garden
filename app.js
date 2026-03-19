// 初始化云开发
wx.cloud.init({
  env: 'cloudbase-1gvp8uog633d75e8',
  traceUser: true,
})

App({
  globalData: {
    // 飞书配置
    feishuAppId: 'cli_a927992b19381bd7',
    feishuAppSecret: '79VZVm2cZ65o7OJT3k72OdubYfD8Xc48',
    // 表格配置
    appToken: 'MLIcbt7qraqpZis82Pwc8U44n69',
    tableId: 'tblLQ0bcAZyQeKoH',
    // 云开发环境
    cloudEnv: 'cloudbase-1gvp8uog633d75e8',
    // 访问令牌
    accessToken: null,
    tokenExpireTime: 0
  }
})
