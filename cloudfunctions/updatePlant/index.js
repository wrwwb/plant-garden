const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { recordId, data } = event
  if (!recordId || !data) return { success: false, error: '缺少参数' }
  try {
    const res = await db.collection('plants').doc(recordId).update({
      data: { ...data, updatedAt: db.serverDate() }
    })
    return { success: true, ...res }
  } catch (e) {
    return { success: false, error: e.message || e.errMsg }
  }
}
