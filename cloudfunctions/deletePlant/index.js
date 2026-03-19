const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { recordId } = event
  const wxContext = cloud.getWXContext()
  
  console.log('deletePlant 收到 recordId:', JSON.stringify(recordId), '类型:', typeof recordId)
  console.log('用户 openid:', wxContext.OPENID)
  
  if (!recordId) {
    return { success: false, error: '缺少recordId', received: event }
  }
  
  try {
    // 先查询记录是否存在
    const doc = await db.collection('plants').doc(recordId).get()
    console.log('查到记录 openid:', doc.data._openid)
    
    // 删除
    const res = await db.collection('plants').doc(recordId).remove()
    console.log('删除结果:', JSON.stringify(res))
    return { success: true, ...res }
  } catch (e) {
    console.error('删除异常:', e.message || e.errMsg)
    return { success: false, error: e.message || e.errMsg, code: e.errCode }
  }
}
