const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { recordId } = event
  if (!recordId) {
    return { success: false, error: '缺少recordId' }
  }
  try {
    // 云函数上下文自动携带了真实的openid，数据库操作用的是真实身份
    const res = await db.collection('plants').doc(recordId).remove()
    return { success: true, ...res }
  } catch (e) {
    return { success: false, error: e.message || e.errMsg }
  }
}
