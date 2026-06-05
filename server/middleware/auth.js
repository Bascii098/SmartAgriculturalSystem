const jwt = require('jsonwebtoken')

// 密钥，生产环境应使用环境变量
const SECRET = 'jingzhe-agri-secret-2024'

/**
 * JWT 验证中间件
 * 从 Authorization: Bearer <token> 中提取并验证 token
 * 验证通过后将用户信息挂载到 req.user
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 1, message: '未登录', data: null })
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, SECRET)
    req.user = { username: payload.sub, identity: payload.identity }
    next()
  } catch (err) {
    return res.status(401).json({ code: 1, message: 'Token 无效或已过期', data: null })
  }
}

module.exports = { authMiddleware, SECRET }
