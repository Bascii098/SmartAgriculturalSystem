const express = require('express')
const cors = require('cors')
const mysql = require('mysql2/promise')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcryptjs')

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// MySQL 连接池
const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'agriculture_platform',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
})

// 通用响应
const ok = (data) => ({ code: 0, message: 'success', data })
const fail = (msg) => ({ code: 1, message: msg, data: null })

// snake_case ↔ camelCase 转换
const snakeToCamel = (str) => str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
const camelToSnake = (str) => str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

function convertRowToCamel(row) {
  if (!row) return row
  const result = {}
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamel(key)] = value
  }
  return result
}

function convertCamelToSnake(data) {
  const result = {}
  for (const [key, value] of Object.entries(data)) {
    result[camelToSnake(key)] = value
  }
  return result
}

// ==================== Auth ====================

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body
  try {
    const [rows] = await pool.query(
      'SELECT username, password, identity FROM users WHERE username = ?',
      [username],
    )
    if (rows.length === 0) return res.json(fail('用户名或密码错误'))
    const user = rows[0]
    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.json(fail('用户名或密码错误'))
    const token = Buffer.from(JSON.stringify({ sub: user.username, identity: user.identity, exp: Date.now() + 86400000 })).toString('base64')
    res.json(ok({ token, identity: user.identity, username: user.username }))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.post('/api/auth/register', async (req, res) => {
  const { username, password, identity } = req.body
  try {
    const hashed = await bcrypt.hash(password, 10)
    await pool.query('INSERT INTO users (username, password, identity) VALUES (?, ?, ?)', [username, hashed, identity])
    if (identity === 'grower') {
      await pool.query('INSERT INTO growers (username) VALUES (?)', [username])
    } else {
      await pool.query('INSERT INTO cooperatives (username) VALUES (?)', [username])
    }
    res.json(ok({ username, identity }))
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.json(fail('用户名已存在'))
    res.status(500).json(fail(e.message))
  }
})

// ==================== Change Password ====================

app.put('/api/auth/password', async (req, res) => {
  const { username, oldPassword, newPassword } = req.body
  if (!username || !oldPassword || !newPassword) {
    return res.json(fail('参数不完整'))
  }
  try {
    const [rows] = await pool.query(
      'SELECT password FROM users WHERE username = ?',
      [username],
    )
    if (rows.length === 0) return res.json(fail('用户不存在'))
    const match = await bcrypt.compare(oldPassword, rows[0].password)
    if (!match) return res.json(fail('旧密码错误'))
    const hashed = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password = ? WHERE username = ?', [hashed, username])
    res.json(ok(null))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

// ==================== Growers ====================

app.get('/api/growers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT username, identity FROM users')
    res.json(ok(rows))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.get('/api/growers/:username', async (req, res) => {
  try {
    const { username } = req.params
    const [users] = await pool.query('SELECT identity FROM users WHERE username = ?', [username])
    if (users.length === 0) return res.json(fail('用户不存在'))
    const identity = users[0].identity
    const table = identity === 'grower' ? 'growers' : 'cooperatives'
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE username = ?`, [username])
    if (rows.length === 0) return res.json(ok({ username, identity }))
    res.json(ok({ ...convertRowToCamel(rows[0]), identity }))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.put('/api/growers/:username', async (req, res) => {
  try {
    const { username } = req.params
    const data = convertCamelToSnake(req.body)
    const [users] = await pool.query('SELECT identity FROM users WHERE username = ?', [username])
    if (users.length === 0) return res.json(fail('用户不存在'))
    const identity = users[0].identity
    const table = identity === 'grower' ? 'growers' : 'cooperatives'

    const fields = Object.keys(data).filter((k) => k !== 'username' && k !== 'identity' && k !== 'password')
    if (fields.length === 0) return res.json(ok(null))

    const setClauses = fields.map((f) => `${f} = ?`).join(', ')
    const values = fields.map((f) => data[f])
    await pool.query(`UPDATE ${table} SET ${setClauses} WHERE username = ?`, [...values, username])
    res.json(ok(null))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

// ==================== Farms ====================

app.get('/api/farms', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT f.*,
        (SELECT COUNT(*) FROM plots WHERE farm_id = f.id) AS plotCount,
        (SELECT COALESCE(SUM(area), 0) FROM plots WHERE farm_id = f.id) AS totalArea,
        u.username AS managerName
      FROM farms f
      LEFT JOIN users u ON f.manager = u.username
      ORDER BY f.created_at DESC
    `)
    res.json(ok(rows.map(convertRowToCamel)))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.get('/api/farms/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT f.*,
        (SELECT COUNT(*) FROM plots WHERE farm_id = f.id) AS plotCount,
        (SELECT COALESCE(SUM(area), 0) FROM plots WHERE farm_id = f.id) AS totalArea
      FROM farms f WHERE f.id = ?
    `, [req.params.id])
    if (rows.length === 0) return res.json(fail('农场不存在'))
    res.json(ok(convertRowToCamel(rows[0])))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.post('/api/farms', async (req, res) => {
  const { name, address, longitude, latitude, manager } = req.body
  const id = uuidv4()
  try {
    await pool.query(
      'INSERT INTO farms (id, name, address, longitude, latitude, manager) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, address, longitude, latitude, manager],
    )
    res.json(ok({ id }))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.put('/api/farms/:id', async (req, res) => {
  const { name, address, longitude, latitude, manager } = req.body
  try {
    await pool.query(
      'UPDATE farms SET name=?, address=?, longitude=?, latitude=?, manager=? WHERE id=?',
      [name, address, longitude, latitude, manager, req.params.id],
    )
    res.json(ok(null))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.post('/api/farms/:id/delete', async (req, res) => {
  try {
    await pool.query('DELETE FROM farms WHERE id = ?', [req.params.id])
    res.json(ok(null))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

// ==================== Plots ====================

async function getPlotFull(plotId) {
  const [plots] = await pool.query('SELECT * FROM plots WHERE id = ?', [plotId])
  if (plots.length === 0) return null
  const plot = plots[0]

  const [crops] = await pool.query('SELECT name, area FROM plot_crops WHERE plot_id = ?', [plotId])
  const [coords] = await pool.query('SELECT lat, lng FROM plot_coordinates WHERE plot_id = ? ORDER BY sort_order', [plotId])

  const coordinates = coords.map((c) => [c.lat, c.lng])
  let center = [0, 0]
  if (coordinates.length > 0) {
    const latSum = coordinates.reduce((s, c) => s + c[0], 0)
    const lngSum = coordinates.reduce((s, c) => s + c[1], 0)
    center = [latSum / coordinates.length, lngSum / coordinates.length]
  }

  return {
    id: plot.id,
    name: plot.name,
    area: plot.area,
    owner: plot.owner,
    farmId: plot.farm_id,
    soilType: plot.soil_type,
    plotShape: plot.plot_shape,
    landNature: plot.land_nature,
    irrigationFacility: !!plot.irrigation_facility,
    address: plot.address,
    planter: plot.planter,
    plantingDate: plot.planting_date,
    landCertNumber: plot.land_cert_number,
    landCertArea: plot.land_cert_area,
    landCertStart: plot.land_cert_start,
    landCertEnd: plot.land_cert_end,
    soilTest: plot.soil_test_unit ? {
      unit: plot.soil_test_unit,
      date: plot.soil_test_date,
      result: plot.soil_test_result,
    } : undefined,
    crops,
    coordinates,
    center,
    color: plot.color,
  }
}

app.get('/api/farms/:farmId/plots', async (req, res) => {
  try {
    const [plots] = await pool.query('SELECT id FROM plots WHERE farm_id = ?', [req.params.farmId])
    const result = []
    for (const p of plots) {
      const full = await getPlotFull(p.id)
      if (full) result.push(full)
    }
    res.json(ok(result))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.get('/api/plots', async (req, res) => {
  try {
    const [plots] = await pool.query('SELECT id FROM plots')
    const result = []
    for (const p of plots) {
      const full = await getPlotFull(p.id)
      if (full) result.push(full)
    }
    res.json(ok(result))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.get('/api/plots/:id', async (req, res) => {
  try {
    const full = await getPlotFull(req.params.id)
    if (!full) return res.json(fail('地块不存在'))
    res.json(ok(full))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.post('/api/farms/:farmId/plots', async (req, res) => {
  const id = uuidv4()
  const d = req.body
  try {
    await pool.query(
      `INSERT INTO plots (id, farm_id, name, area, owner, soil_type, plot_shape, land_nature,
        irrigation_facility, address, planter, planting_date, land_cert_number, land_cert_area,
        land_cert_start, land_cert_end, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.farmId, d.name, d.area || 0, d.owner || 'admin', d.soilType, d.plotShape,
        d.landNature, d.irrigationFacility || false, d.address, d.planter, d.plantingDate,
        d.landCertNumber, d.landCertArea, d.landCertStart, d.landCertEnd, d.color || '#4caf50'],
    )

    // 保存作物
    if (d.crops && d.crops.length > 0) {
      for (const crop of d.crops) {
        await pool.query('INSERT INTO plot_crops (plot_id, name, area) VALUES (?, ?, ?)', [id, crop.name, crop.area])
      }
    }

    // 保存坐标
    if (d.coordinates && d.coordinates.length > 0) {
      for (let i = 0; i < d.coordinates.length; i++) {
        await pool.query('INSERT INTO plot_coordinates (plot_id, lat, lng, sort_order) VALUES (?, ?, ?, ?)',
          [id, d.coordinates[i][0], d.coordinates[i][1], i])
      }
    }

    res.json(ok({ id }))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.put('/api/plots/:id', async (req, res) => {
  const d = req.body
  try {
    await pool.query(
      `UPDATE plots SET name=?, area=?, soil_type=?, plot_shape=?, land_nature=?,
        irrigation_facility=?, address=?, planter=?, planting_date=?, land_cert_number=?,
        land_cert_area=?, land_cert_start=?, land_cert_end=?, color=?
       WHERE id=?`,
      [d.name, d.area, d.soilType, d.plotShape, d.landNature, d.irrigationFacility || false,
        d.address, d.planter, d.plantingDate, d.landCertNumber, d.landCertArea,
        d.landCertStart, d.landCertEnd, d.color, req.params.id],
    )

    // 更新作物：先删后插
    if (d.crops) {
      await pool.query('DELETE FROM plot_crops WHERE plot_id = ?', [req.params.id])
      for (const crop of d.crops) {
        await pool.query('INSERT INTO plot_crops (plot_id, name, area) VALUES (?, ?, ?)', [req.params.id, crop.name, crop.area])
      }
    }

    // 更新坐标：先删后插
    if (d.coordinates) {
      await pool.query('DELETE FROM plot_coordinates WHERE plot_id = ?', [req.params.id])
      for (let i = 0; i < d.coordinates.length; i++) {
        await pool.query('INSERT INTO plot_coordinates (plot_id, lat, lng, sort_order) VALUES (?, ?, ?, ?)',
          [req.params.id, d.coordinates[i][0], d.coordinates[i][1], i])
      }
    }

    res.json(ok(null))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.post('/api/plots/:id/delete', async (req, res) => {
  try {
    await pool.query('DELETE FROM plots WHERE id = ?', [req.params.id])
    res.json(ok(null))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

// ==================== Handovers ====================

app.get('/api/handovers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM handovers ORDER BY created_at DESC')
    res.json(ok(rows.map((r) => ({
      id: r.id,
      fromUser: r.from_user,
      toUser: r.to_user,
      plotId: r.plot_id,
      plotName: r.plot_name,
      status: r.status,
      createdAt: new Date(r.created_at).getTime(),
    }))))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.post('/api/handovers', async (req, res) => {
  const { fromUser, toUser, plotId, plotName } = req.body
  const id = uuidv4()
  try {
    await pool.query(
      'INSERT INTO handovers (id, from_user, to_user, plot_id, plot_name) VALUES (?, ?, ?, ?, ?)',
      [id, fromUser, toUser, plotId, plotName],
    )
    res.json(ok({ id }))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.post('/api/handovers/:id/confirm', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM handovers WHERE id = ?', [req.params.id])
    if (rows.length === 0) return res.json(fail('交接记录不存在'))
    const handover = rows[0]
    await pool.query('UPDATE handovers SET status = ? WHERE id = ?', ['confirmed', req.params.id])
    await pool.query('UPDATE plots SET owner = ? WHERE id = ?', [handover.to_user, handover.plot_id])
    res.json(ok(null))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.post('/api/handovers/:id/reject', async (req, res) => {
  try {
    await pool.query('UPDATE handovers SET status = ? WHERE id = ?', ['rejected', req.params.id])
    res.json(ok(null))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

// ==================== Weather ====================

app.get('/api/weather', async (req, res) => {
  res.json(ok({
    temperature: 18,
    condition: '晴',
    humidity: 45,
    windSpeed: '3级',
  }))
})

// ==================== Start ====================

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
