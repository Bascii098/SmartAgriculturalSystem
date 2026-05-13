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
  const { name, address, longitude, latitude, manager, region } = req.body
  const id = uuidv4()
  try {
    await pool.query(
      'INSERT INTO farms (id, name, address, longitude, latitude, manager, region) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, address, longitude, latitude, manager, region || ''],
    )
    res.json(ok({ id }))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.put('/api/farms/:id', async (req, res) => {
  const { name, address, longitude, latitude, manager, region } = req.body
  try {
    await pool.query(
      'UPDATE farms SET name=?, address=?, longitude=?, latitude=?, manager=?, region=? WHERE id=?',
      [name, address, longitude, latitude, manager, region || '', req.params.id],
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
        land_cert_area=?, land_cert_start=?, land_cert_end=?, color=COALESCE(?, color)
       WHERE id=?`,
      [d.name, d.area, d.soilType, d.plotShape, d.landNature, d.irrigationFacility || false,
        d.address, d.planter, d.plantingDate, d.landCertNumber, d.landCertArea,
        d.landCertStart, d.landCertEnd, d.color || null, req.params.id],
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
  try {
    const [rows] = await pool.query(
      'SELECT temperature, `condition`, humidity, wind_speed FROM weather_data WHERE record_date = CURDATE() LIMIT 1'
    )
    if (rows.length === 0) {
      // 如果当天没有数据，返回最近一条
      const [latest] = await pool.query(
        'SELECT temperature, `condition`, humidity, wind_speed FROM weather_data ORDER BY record_date DESC LIMIT 1'
      )
      if (latest.length === 0) return res.json(ok({ temperature: 0, condition: '未知', humidity: 0, windSpeed: '0级' }))
      const r = latest[0]
      return res.json(ok({
        temperature: Number(r.temperature),
        condition: r.condition,
        humidity: r.humidity,
        windSpeed: r.wind_speed,
      }))
    }
    const r = rows[0]
    res.json(ok({
      temperature: Number(r.temperature),
      condition: r.condition,
      humidity: r.humidity,
      windSpeed: r.wind_speed,
    }))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

// ==================== Production ====================

// --- Task Config ---

app.get('/api/task-config', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM task_field_configs ORDER BY stage, sort_order')
    // 按 stage 分组
    const grouped = {}
    for (const row of rows) {
      const stage = row.stage
      if (!grouped[stage]) grouped[stage] = []
      grouped[stage].push({
        id: row.id,
        stage: row.stage,
        fieldKey: row.field_key,
        fieldLabel: row.field_label,
        fieldType: row.field_type,
        options: row.options ? (typeof row.options === 'string' ? JSON.parse(row.options) : row.options) : null,
        required: !!row.required,
        sortOrder: row.sort_order,
      })
    }
    res.json(ok(grouped))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.get('/api/task-config/:stage', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM task_field_configs WHERE stage = ? ORDER BY sort_order',
      [req.params.stage]
    )
    const result = rows.map((row) => ({
      id: row.id,
      stage: row.stage,
      fieldKey: row.field_key,
      fieldLabel: row.field_label,
      fieldType: row.field_type,
      options: row.options ? (typeof row.options === 'string' ? JSON.parse(row.options) : row.options) : null,
      required: !!row.required,
      sortOrder: row.sort_order,
    }))
    res.json(ok(result))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.put('/api/task-config/:stage', async (req, res) => {
  try {
    const { fields } = req.body
    if (!Array.isArray(fields)) return res.json(fail('fields 必须是数组'))
    // 先删后插
    await pool.query('DELETE FROM task_field_configs WHERE stage = ?', [req.params.stage])
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i]
      await pool.query(
        'INSERT INTO task_field_configs (stage, field_key, field_label, field_type, options, required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.params.stage, f.fieldKey, f.fieldLabel, f.fieldType, f.options ? JSON.stringify(f.options) : null, f.required ? 1 : 0, f.sortOrder ?? i]
      )
    }
    res.json(ok(null))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

// --- Weather Extended ---

app.get('/api/weather/extended', async (req, res) => {
  try {
    const [weatherRows] = await pool.query(
      'SELECT * FROM weather_data WHERE record_date = CURDATE() LIMIT 1'
    )
    let weather = null
    if (weatherRows.length > 0) {
      const w = weatherRows[0]
      weather = {
        recordDate: w.record_date,
        temperature: Number(w.temperature),
        temperatureHigh: Number(w.temperature_high),
        temperatureLow: Number(w.temperature_low),
        condition: w.condition,
        humidity: w.humidity,
        windSpeed: w.wind_speed,
        rainfall: Number(w.rainfall),
        sunshineHours: Number(w.sunshine_hours),
        soilMoisture: w.soil_moisture,
      }
    }
    // 如果当天没有数据，取最近一条
    if (!weather) {
      const [latest] = await pool.query('SELECT * FROM weather_data ORDER BY record_date DESC LIMIT 1')
      if (latest.length > 0) {
        const w = latest[0]
        weather = {
          recordDate: w.record_date,
          temperature: Number(w.temperature),
          temperatureHigh: Number(w.temperature_high),
          temperatureLow: Number(w.temperature_low),
          condition: w.condition,
          humidity: w.humidity,
          windSpeed: w.wind_speed,
          rainfall: Number(w.rainfall),
          sunshineHours: Number(w.sunshine_hours),
          soilMoisture: w.soil_moisture,
        }
      }
    }
    const [warnings] = await pool.query(
      "SELECT * FROM disaster_warnings WHERE status = '生效中' ORDER BY created_at DESC"
    )
    const warningList = warnings.map((w) => ({
      id: w.id,
      warningType: w.warning_type,
      warningLevel: w.warning_level,
      description: w.description,
      startTime: w.start_time,
      endTime: w.end_time,
      status: w.status,
    }))
    res.json(ok({ weather, warnings: warningList }))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.get('/api/weather/warnings', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM disaster_warnings WHERE status = '生效中' ORDER BY created_at DESC"
    )
    const result = rows.map((w) => ({
      id: w.id,
      warningType: w.warning_type,
      warningLevel: w.warning_level,
      description: w.description,
      startTime: w.start_time,
      endTime: w.end_time,
      status: w.status,
    }))
    res.json(ok(result))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

// --- Planting Plans ---

app.get('/api/plans', async (req, res) => {
  try {
    let sql = `SELECT pp.*, f.name AS farmName, p.name AS plotName
      FROM planting_plans pp
      LEFT JOIN farms f ON pp.farm_id = f.id
      LEFT JOIN plots p ON pp.plot_id = p.id`
    const params = []
    if (req.query.farmId) {
      sql += ' WHERE pp.farm_id = ?'
      params.push(req.query.farmId)
    }
    sql += ' ORDER BY pp.created_at DESC'
    const [rows] = await pool.query(sql, params)
    res.json(ok(rows.map(convertRowToCamel)))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.get('/api/plans/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pp.*, f.name AS farmName, p.name AS plotName
       FROM planting_plans pp
       LEFT JOIN farms f ON pp.farm_id = f.id
       LEFT JOIN plots p ON pp.plot_id = p.id
       WHERE pp.id = ?`,
      [req.params.id]
    )
    if (rows.length === 0) return res.json(fail('计划不存在'))
    const plan = convertRowToCamel(rows[0])
    const [tasks] = await pool.query(
      'SELECT * FROM plan_tasks WHERE plan_id = ? ORDER BY stage',
      [req.params.id]
    )
    res.json(ok({ ...plan, tasks: tasks.map(convertRowToCamel) }))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.post('/api/plans', async (req, res) => {
  const { farmId, plotId, cropType, seedVariety, area } = req.body
  try {
    // 作物代码映射
    const cropCodeMap = { '玉米': 'YM', '大豆': 'DD', '水稻': 'SD', '小麦': 'XM' }
    const cropCode = cropCodeMap[cropType] || 'QT'

    // 查询当前作物最大序号
    const [maxRows] = await pool.query(
      "SELECT plan_no FROM planting_plans WHERE crop_type = ? ORDER BY id DESC LIMIT 1",
      [cropType]
    )
    let seq = 1
    if (maxRows.length > 0) {
      const lastNo = maxRows[0].plan_no
      const match = lastNo.match(/(\d{4})$/)
      if (match) seq = parseInt(match[1], 10) + 1
    }
    const planNo = `ZZ-${cropCode}-${String(seq).padStart(4, '0')}`

    // 插入种植计划
    const [result] = await pool.query(
      `INSERT INTO planting_plans (plan_no, farm_id, plot_id, crop_type, seed_variety, area)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [planNo, farmId, plotId, cropType, seedVariety, area]
    )
    const planId = result.insertId

    // 自动生成5条 plan_tasks
    const stages = ['整地', '播种', '施肥', '植保', '收获']
    for (const stage of stages) {
      await pool.query(
        'INSERT INTO plan_tasks (plan_id, stage, status) VALUES (?, ?, ?)',
        [planId, stage, '待执行']
      )
    }

    // 返回创建的计划
    const [newPlan] = await pool.query(
      `SELECT pp.*, f.name AS farmName, p.name AS plotName
       FROM planting_plans pp
       LEFT JOIN farms f ON pp.farm_id = f.id
       LEFT JOIN plots p ON pp.plot_id = p.id
       WHERE pp.id = ?`,
      [planId]
    )
    res.json(ok(newPlan[0]))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.post('/api/plans/:id/delete', async (req, res) => {
  try {
    const planId = req.params.id
    // 删除关联的实施记录
    await pool.query(
      'DELETE FROM implementation_records WHERE task_id IN (SELECT id FROM plan_tasks WHERE plan_id = ?)',
      [planId]
    )
    // 删除关联的任务
    await pool.query('DELETE FROM plan_tasks WHERE plan_id = ?', [planId])
    // 删除计划
    await pool.query('DELETE FROM planting_plans WHERE id = ?', [planId])
    res.json(ok(null))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

// --- Plan Tasks ---

app.get('/api/plans/:id/tasks', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM plan_tasks WHERE plan_id = ? ORDER BY FIELD(stage, '整地','播种','施肥','植保','收获')",
      [req.params.id]
    )
    res.json(ok(rows.map(convertRowToCamel)))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { configData, plannedDate, status } = req.body
    const taskId = req.params.id

    // 获取当前任务
    const [existing] = await pool.query('SELECT * FROM plan_tasks WHERE id = ?', [taskId])
    if (existing.length === 0) return res.json(fail('任务不存在'))

    // 构建更新
    const updates = []
    const params = []
    if (configData !== undefined) { updates.push('config_data = ?'); params.push(JSON.stringify(configData)) }
    if (plannedDate !== undefined) { updates.push('planned_date = ?'); params.push(plannedDate) }
    if (status !== undefined) { updates.push('status = ?'); params.push(status) }
    if (updates.length === 0) return res.json(ok(null))

    params.push(taskId)
    await pool.query(`UPDATE plan_tasks SET ${updates.join(', ')} WHERE id = ?`, params)

    // 检查该计划下所有任务状态
    const planId = existing[0].plan_id
    const [allTasks] = await pool.query('SELECT status FROM plan_tasks WHERE plan_id = ?', [planId])
    const allCompleted = allTasks.every(t => t.status === '已完成')
    if (allCompleted) {
      await pool.query("UPDATE planting_plans SET status = '已完成' WHERE id = ?", [planId])
    }

    res.json(ok(null))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

// --- Implementation ---

app.get('/api/implementation', async (req, res) => {
  try {
    // 查询所有有计划的农场
    const [farms] = await pool.query(
      'SELECT DISTINCT f.id AS farmId, f.name AS farmName FROM farms f INNER JOIN planting_plans pp ON f.id = pp.farm_id'
    )
    const result = []
    for (const farm of farms) {
      // 查询该农场所有任务数
      const [tasks] = await pool.query(
        `SELECT pt.id FROM plan_tasks pt
         INNER JOIN planting_plans pp ON pt.plan_id = pp.id
         WHERE pp.farm_id = ?`,
        [farm.farmId]
      )
      const totalTasks = tasks.length
      // 查询已实施数
      let implemented = 0
      if (totalTasks > 0) {
        const taskIds = tasks.map(t => t.id)
        const [implRows] = await pool.query(
          `SELECT COUNT(DISTINCT task_id) AS cnt FROM implementation_records WHERE task_id IN (${taskIds.map(() => '?').join(',')})`,
          taskIds
        )
        implemented = implRows[0].cnt
      }
      result.push({
        farmId: farm.farmId,
        farmName: farm.farmName,
        todayTasks: totalTasks,
        implemented,
        unimplemented: totalTasks - implemented,
      })
    }
    res.json(ok(result))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.get('/api/implementation/:farmId', async (req, res) => {
  try {
    const farmId = req.params.farmId
    const [rows] = await pool.query(
      `SELECT pt.*, pp.plan_no, pp.crop_type, pp.plot_id, p.name AS plotName
       FROM plan_tasks pt
       INNER JOIN planting_plans pp ON pt.plan_id = pp.id
       LEFT JOIN plots p ON pp.plot_id = p.id
       WHERE pp.farm_id = ?
       ORDER BY pt.planned_date DESC`,
      [farmId]
    )

    const unimplemented = []
    const implemented = []
    for (const task of rows) {
      const camelTask = convertRowToCamel(task)
      const [impl] = await pool.query(
        'SELECT * FROM implementation_records WHERE task_id = ? LIMIT 1',
        [task.id]
      )
      const item = { planTask: camelTask, plan: { planNo: task.plan_no, cropType: task.crop_type }, plot: { id: task.plot_id, name: task.plotName } }
      if (impl.length > 0) {
        item.implementation = convertRowToCamel(impl[0])
        implemented.push(item)
      } else {
        unimplemented.push(item)
      }
    }
    res.json(ok({ unimplemented, implemented }))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.post('/api/implementation/report', async (req, res) => {
  const { taskId, plotId, implementDate, method, seedUsed, inputAmount, equipment, remark } = req.body
  try {
    // 插入实施记录
    await pool.query(
      `INSERT INTO implementation_records (task_id, plot_id, implement_date, method, seed_used, input_amount, equipment, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskId, plotId, implementDate, method, seedUsed, inputAmount, equipment, remark]
    )

    // 更新任务状态
    await pool.query("UPDATE plan_tasks SET status = '已完成' WHERE id = ?", [taskId])

    // 检查同计划下所有任务
    const [taskRow] = await pool.query('SELECT plan_id FROM plan_tasks WHERE id = ?', [taskId])
    if (taskRow.length > 0) {
      const planId = taskRow[0].plan_id
      const [allTasks] = await pool.query('SELECT status FROM plan_tasks WHERE plan_id = ?', [planId])
      const allCompleted = allTasks.every(t => t.status === '已完成')
      if (allCompleted) {
        await pool.query("UPDATE planting_plans SET status = '已完成' WHERE id = ?", [planId])
      }
    }

    res.json(ok(null))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

// --- Tasks ---

app.get('/api/tasks', async (req, res) => {
  try {
    let sql = `SELECT pt.*, pp.plan_no, pp.crop_type, pp.farm_id, pp.plot_id,
      f.name AS farmName, p.name AS plotName
      FROM plan_tasks pt
      INNER JOIN planting_plans pp ON pt.plan_id = pp.id
      LEFT JOIN farms f ON pp.farm_id = f.id
      LEFT JOIN plots p ON pp.plot_id = p.id`
    const conditions = []
    const params = []
    if (req.query.farmId) { conditions.push('pp.farm_id = ?'); params.push(req.query.farmId) }
    if (req.query.stage) { conditions.push('pt.stage = ?'); params.push(req.query.stage) }
    if (req.query.status) { conditions.push('pt.status = ?'); params.push(req.query.status) }
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
    sql += ' ORDER BY pt.planned_date DESC, pt.created_at DESC'
    const [rows] = await pool.query(sql, params)
    res.json(ok(rows.map(convertRowToCamel)))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.get('/api/tasks/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pt.*, pp.plan_no, pp.crop_type, pp.seed_variety, pp.farm_id, pp.plot_id,
        f.name AS farmName, p.name AS plotName
       FROM plan_tasks pt
       INNER JOIN planting_plans pp ON pt.plan_id = pp.id
       LEFT JOIN farms f ON pp.farm_id = f.id
       LEFT JOIN plots p ON pp.plot_id = p.id
       WHERE pt.id = ?`,
      [req.params.id]
    )
    if (rows.length === 0) return res.json(fail('任务不存在'))
    res.json(ok(convertRowToCamel(rows[0])))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

app.get('/api/tasks/:id/implementation', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM implementation_records WHERE task_id = ? LIMIT 1',
      [req.params.id]
    )
    if (rows.length === 0) return res.json(ok(null))
    const r = rows[0]
    res.json(ok({
      id: r.id,
      taskId: r.task_id,
      plotId: r.plot_id,
      implementDate: r.implement_date,
      method: r.method,
      seedUsed: r.seed_used,
      inputAmount: r.input_amount,
      equipment: r.equipment,
      remark: r.remark,
      geoMarker: r.geo_marker,
      createdAt: r.created_at,
    }))
  } catch (e) {
    res.status(500).json(fail(e.message))
  }
})

// ==================== Database Init ====================

async function initDatabase() {
  // 1. 任务字段配置表
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS task_field_configs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      stage ENUM('整地','播种','施肥','植保','收获') NOT NULL,
      field_key VARCHAR(50) NOT NULL,
      field_label VARCHAR(100) NOT NULL,
      field_type ENUM('text','number','select','date','file') NOT NULL DEFAULT 'text',
      options JSON DEFAULT NULL,
      required TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_stage_key (stage, field_key)
    )
  `)

  // 2. 扩展气象数据表
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS weather_data (
      id INT PRIMARY KEY AUTO_INCREMENT,
      record_date DATE NOT NULL UNIQUE,
      temperature DECIMAL(5,1),
      temperature_high DECIMAL(5,1),
      temperature_low DECIMAL(5,1),
      \`condition\` VARCHAR(20),
      humidity INT,
      wind_speed VARCHAR(10),
      rainfall DECIMAL(8,1),
      sunshine_hours DECIMAL(4,1),
      soil_moisture INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 3. 灾害预警表
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS disaster_warnings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      warning_type ENUM('暴雨','干旱','冰雹','大风','霜冻') NOT NULL,
      warning_level ENUM('蓝色','黄色','橙色','红色') NOT NULL,
      description VARCHAR(500) NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status ENUM('生效中','已解除') NOT NULL DEFAULT '生效中',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 4. 种植计划表
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS planting_plans (
      id INT PRIMARY KEY AUTO_INCREMENT,
      plan_no VARCHAR(30) NOT NULL UNIQUE,
      farm_id VARCHAR(50) NOT NULL,
      plot_id VARCHAR(50) NOT NULL,
      crop_type VARCHAR(50) NOT NULL,
      seed_variety VARCHAR(100),
      area DECIMAL(10,2),
      status ENUM('待执行','进行中','已完成','已逾期') NOT NULL DEFAULT '待执行',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  // 5. 计划任务表
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS plan_tasks (
      id INT PRIMARY KEY AUTO_INCREMENT,
      plan_id INT NOT NULL,
      stage ENUM('整地','播种','施肥','植保','收获') NOT NULL,
      config_data JSON,
      planned_date DATE,
      status ENUM('待执行','进行中','已完成','已逾期') NOT NULL DEFAULT '待执行',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  // 6. 实施记录表
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS implementation_records (
      id INT PRIMARY KEY AUTO_INCREMENT,
      task_id INT NOT NULL,
      plot_id VARCHAR(50) NOT NULL,
      implement_date DATE NOT NULL,
      method VARCHAR(100),
      seed_used VARCHAR(100),
      input_amount VARCHAR(50),
      equipment VARCHAR(200),
      remark TEXT,
      geo_marker JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 7. farms表添加region字段（兼容已有表）
  try {
    await pool.execute(`
      ALTER TABLE farms ADD COLUMN region VARCHAR(50) DEFAULT '' COMMENT '所属地区'
    `)
    console.log('Added region column to farms table')
  } catch (e) {
    // 列已存在时忽略错误
  }

  // 给已有farms记录补充region值
  const [farmsRows] = await pool.query('SELECT id, name FROM farms WHERE region = "" OR region IS NULL')
  for (const farm of farmsRows) {
    let region = ''
    if (farm.name.includes('林口')) region = '牡丹江'
    else if (farm.name.includes('青岗')) region = '绥化'
    else if (farm.name.includes('北安')) region = '黑河'
    else if (farm.name.includes('富锦')) region = '佳木斯'
    if (region) {
      await pool.query('UPDATE farms SET region = ? WHERE id = ?', [region, farm.id])
    }
  }

  console.log('Database tables initialized (IF NOT EXISTS)')

  // ===== Seed Data =====

  // task_field_configs 种子数据（检查是否已有数据）
  const [cfgCount] = await pool.query('SELECT COUNT(*) AS cnt FROM task_field_configs')
  if (cfgCount[0].cnt === 0) {
    const configs = [
      // 整地
      { stage: '整地', field_key: 'method', field_label: '整地方式', field_type: 'select', options: JSON.stringify(['旋耕', '深翻', '免耕']), required: 1, sort_order: 0 },
      { stage: '整地', field_key: 'depth', field_label: '整地深度cm', field_type: 'number', options: null, required: 1, sort_order: 1 },
      { stage: '整地', field_key: 'planDate', field_label: '计划日期', field_type: 'date', options: null, required: 1, sort_order: 2 },
      { stage: '整地', field_key: 'remark', field_label: '备注', field_type: 'text', options: null, required: 0, sort_order: 3 },
      // 播种
      { stage: '播种', field_key: 'method', field_label: '播种方式', field_type: 'select', options: JSON.stringify(['条播', '点播', '撒播']), required: 1, sort_order: 0 },
      { stage: '播种', field_key: 'seedVariety', field_label: '种子品种', field_type: 'text', options: null, required: 1, sort_order: 1 },
      { stage: '播种', field_key: 'seedAmount', field_label: '播种量斤/亩', field_type: 'number', options: null, required: 1, sort_order: 2 },
      { stage: '播种', field_key: 'rowSpacing', field_label: '行距cm', field_type: 'number', options: null, required: 1, sort_order: 3 },
      { stage: '播种', field_key: 'planDate', field_label: '计划日期', field_type: 'date', options: null, required: 1, sort_order: 4 },
      { stage: '播种', field_key: 'remark', field_label: '备注', field_type: 'text', options: null, required: 0, sort_order: 5 },
      // 施肥
      { stage: '施肥', field_key: 'method', field_label: '施肥方式', field_type: 'select', options: JSON.stringify(['底肥', '追肥', '叶面肥']), required: 1, sort_order: 0 },
      { stage: '施肥', field_key: 'fertilizerType', field_label: '肥料类型', field_type: 'text', options: null, required: 1, sort_order: 1 },
      { stage: '施肥', field_key: 'amount', field_label: '施肥量kg/亩', field_type: 'number', options: null, required: 1, sort_order: 2 },
      { stage: '施肥', field_key: 'planDate', field_label: '计划日期', field_type: 'date', options: null, required: 1, sort_order: 3 },
      { stage: '施肥', field_key: 'remark', field_label: '备注', field_type: 'text', options: null, required: 0, sort_order: 4 },
      // 植保
      { stage: '植保', field_key: 'target', field_label: '防治对象', field_type: 'text', options: null, required: 1, sort_order: 0 },
      { stage: '植保', field_key: 'pesticide', field_label: '药剂名称', field_type: 'text', options: null, required: 1, sort_order: 1 },
      { stage: '植保', field_key: 'dosage', field_label: '用药量ml/亩', field_type: 'number', options: null, required: 1, sort_order: 2 },
      { stage: '植保', field_key: 'method', field_label: '防治方式', field_type: 'select', options: JSON.stringify(['喷雾', '撒施', '灌根']), required: 1, sort_order: 3 },
      { stage: '植保', field_key: 'planDate', field_label: '计划日期', field_type: 'date', options: null, required: 1, sort_order: 4 },
      { stage: '植保', field_key: 'remark', field_label: '备注', field_type: 'text', options: null, required: 0, sort_order: 5 },
      // 收获
      { stage: '收获', field_key: 'method', field_label: '收获方式', field_type: 'select', options: JSON.stringify(['人工', '机械']), required: 1, sort_order: 0 },
      { stage: '收获', field_key: 'expectedYield', field_label: '预计产量kg/亩', field_type: 'number', options: null, required: 1, sort_order: 1 },
      { stage: '收获', field_key: 'planDate', field_label: '计划日期', field_type: 'date', options: null, required: 1, sort_order: 2 },
      { stage: '收获', field_key: 'remark', field_label: '备注', field_type: 'text', options: null, required: 0, sort_order: 3 },
    ]
    for (const c of configs) {
      await pool.query(
        'INSERT INTO task_field_configs (stage, field_key, field_label, field_type, options, required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [c.stage, c.field_key, c.field_label, c.field_type, c.options, c.required, c.sort_order]
      )
    }
    console.log('Seeded task_field_configs (24 rows)')
  }

  // weather_data 种子数据（检查是否已有数据）
  const [wxCount] = await pool.query('SELECT COUNT(*) AS cnt FROM weather_data')
  if (wxCount[0].cnt === 0) {
    const today = new Date()
    const weatherSeed = [
      { offset: -6, temp: 16.2, high: 21.0, low: 12.5, cond: '多云', hum: 62, wind: '2级', rain: 0.0, sun: 6.5, soil: 58 },
      { offset: -5, temp: 17.8, high: 22.5, low: 13.1, cond: '晴', hum: 55, wind: '1级', rain: 0.0, sun: 8.2, soil: 55 },
      { offset: -4, temp: 15.3, high: 18.0, low: 11.8, cond: '小雨', hum: 78, wind: '3级', rain: 12.5, sun: 2.1, soil: 72 },
      { offset: -3, temp: 14.0, high: 16.5, low: 10.2, cond: '中雨', hum: 85, wind: '4级', rain: 28.3, sun: 0.5, soil: 81 },
      { offset: -2, temp: 18.5, high: 23.0, low: 14.0, cond: '晴', hum: 48, wind: '2级', rain: 0.0, sun: 9.0, soil: 60 },
      { offset: -1, temp: 19.2, high: 24.1, low: 14.8, cond: '晴转多云', hum: 52, wind: '2级', rain: 0.0, sun: 7.8, soil: 56 },
      { offset: 0, temp: 20.5, high: 25.0, low: 15.2, cond: '晴', hum: 45, wind: '3级', rain: 0.0, sun: 8.5, soil: 52 },
    ]
    for (const w of weatherSeed) {
      const d = new Date(today)
      d.setDate(d.getDate() + w.offset)
      const dateStr = d.toISOString().slice(0, 10)
      await pool.query(
        'INSERT INTO weather_data (record_date, temperature, temperature_high, temperature_low, `condition`, humidity, wind_speed, rainfall, sunshine_hours, soil_moisture) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [dateStr, w.temp, w.high, w.low, w.cond, w.hum, w.wind, w.rain, w.sun, w.soil]
      )
    }
    console.log('Seeded weather_data (7 rows)')
  }

  // disaster_warnings 种子数据（检查是否已有数据）
  const [warnCount] = await pool.query('SELECT COUNT(*) AS cnt FROM disaster_warnings')
  if (warnCount[0].cnt === 0) {
    const now = new Date()
    const end1 = new Date(now); end1.setHours(end1.getHours() + 6)
    const end2 = new Date(now); end2.setHours(end2.getHours() + 12)
    await pool.query(
      "INSERT INTO disaster_warnings (warning_type, warning_level, description, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?)",
      ['暴雨', '橙色', '预计未来6小时降雨量将达50mm以上，局部可能超过80mm，请做好排水防涝准备。', now.toISOString().slice(0, 19).replace('T', ' '), end1.toISOString().slice(0, 19).replace('T', ' '), '生效中']
    )
    await pool.query(
      "INSERT INTO disaster_warnings (warning_type, warning_level, description, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?)",
      ['大风', '蓝色', '预计未来12小时内将出现6-7级阵风，注意加固设施农业。', now.toISOString().slice(0, 19).replace('T', ' '), end2.toISOString().slice(0, 19).replace('T', ' '), '生效中']
    )
    console.log('Seeded disaster_warnings (2 rows)')
  }

  // planting_plans & plan_tasks & implementation_records 种子数据（每次启动重新生成）
  await pool.query('DELETE FROM implementation_records')
  await pool.query('DELETE FROM plan_tasks')
  await pool.query('DELETE FROM planting_plans')
  console.log('Cleared production seed data for re-seeding')

  const [existingFarms] = await pool.query('SELECT id, name FROM farms LIMIT 3')
  const [existingPlots] = await pool.query('SELECT id, farm_id, name, area FROM plots')
  if (existingFarms.length > 0 && existingPlots.length > 0) {
    // 按farm_id分组plots
    const plotsByFarm = {}
    for (const p of existingPlots) {
      if (!plotsByFarm[p.farm_id]) plotsByFarm[p.farm_id] = []
      plotsByFarm[p.farm_id].push(p)
    }

    const cropTypes = ['玉米', '大豆', '水稻']
    const seedVarieties = ['迪卡159', '中黄35号', '龙粳31']
    const stages = ['整地', '播种', '施肥', '植保', '收获']
    const cropCodeMap = { '玉米': 'YM', '大豆': 'DD', '水稻': 'SD' }

    // 各环节的示例config_data
    const stageConfigs = {
      '整地': { method: '旋耕', depth: 25, remark: '深松整地' },
      '播种': { method: '条播', seedVariety: '', seedAmount: 8, rowSpacing: 60, remark: '' },
      '施肥': { method: '底肥', fertilizerType: '复合肥', amount: 25, remark: '' },
      '植保': { target: '玉米螟', pesticide: '高效氯氟氰菊酯', dosage: 30, method: '喷雾', remark: '' },
      '收获': { method: '机械', expectedYield: 600, remark: '' },
    }

    // 各环节实施记录示例数据
    const implData = {
      '整地': { method: '旋耕深松', input_amount: '', equipment: '大型旋耕机', remark: '整地质量合格' },
      '播种': { method: '机械条播', input_amount: '8斤/亩', equipment: '精量播种机', remark: '播种均匀' },
      '施肥': { method: '机械施肥', input_amount: '25kg/亩', equipment: '施肥机', remark: '施肥均匀' },
      '植保': { method: '无人机喷雾', input_amount: '30ml/亩', equipment: '植保无人机', remark: '防治效果良好' },
      '收获': { method: '机械收获', input_amount: '', equipment: '联合收割机', remark: '产量达标' },
    }

    // 计划模板：状态组合
    const planTemplates = [
      { cropIndex: 0, status: '已完成', taskStatuses: ['已完成', '已完成', '已完成', '已完成', '已完成'] },
      { cropIndex: 1, status: '进行中', taskStatuses: ['已完成', '已完成', '进行中', '待执行', '待执行'] },
      { cropIndex: 2, status: '待执行', taskStatuses: ['待执行', '待执行', '待执行', '待执行', '待执行'] },
    ]

    let planSeq = 1
    let farmIndex = 0
    const today = new Date()

    for (const farm of existingFarms) {
      farmIndex++
      const farmPlots = plotsByFarm[farm.id] || []
      if (farmPlots.length === 0) continue

      // 每个farm创建2-3个计划（取farm有的plots数量和模板数量的较小值）
      const count = Math.min(farmPlots.length, planTemplates.length)
      for (let pi = 0; pi < count; pi++) {
        const plot = farmPlots[pi]
        const template = planTemplates[pi]
        const cropType = cropTypes[template.cropIndex]
        const seedVariety = seedVarieties[template.cropIndex]
        const planNo = `ZZ-${cropCodeMap[cropType] || 'QT'}-${String(planSeq).padStart(4, '0')}`
        planSeq++

        const [result] = await pool.query(
          `INSERT INTO planting_plans (plan_no, farm_id, plot_id, crop_type, seed_variety, area, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [planNo, farm.id, plot.id, cropType, seedVariety, plot.area || 0, template.status]
        )
        const planId = result.insertId

        // 为每个plan创建5条task
        for (let si = 0; si < stages.length; si++) {
          const stage = stages[si]
          const cfg = { ...stageConfigs[stage] }
          if (stage === '播种') cfg.seedVariety = seedVariety
          // 日期：每个plan从不同偏移开始，间隔3天，确保多个农场都有近期任务
          const baseOffset = (farmIndex * 2) + (pi * 3) - 3
          const taskDate = new Date(today)
          taskDate.setDate(taskDate.getDate() + baseOffset + si * 3)
          const dateStr = taskDate.toISOString().slice(0, 10)
          cfg.planDate = dateStr

          const [taskResult] = await pool.query(
            'INSERT INTO plan_tasks (plan_id, stage, config_data, planned_date, status) VALUES (?, ?, ?, ?, ?)',
            [planId, stage, JSON.stringify(cfg), dateStr, template.taskStatuses[si]]
          )

          // 为已完成的任务创建实施记录
          if (template.taskStatuses[si] === '已完成') {
            const impl = implData[stage]
            await pool.query(
              `INSERT INTO implementation_records (task_id, plot_id, implement_date, method, seed_used, input_amount, equipment, remark)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [taskResult.insertId, plot.id, dateStr, impl.method,
                stage === '播种' ? seedVariety : (stage === '植保' ? '高效氯氟氰菊酯' : ''),
                impl.input_amount, impl.equipment, impl.remark]
            )
          }
        }
      }
    }

    const [finalPlanCount] = await pool.query('SELECT COUNT(*) AS cnt FROM planting_plans')
    const [finalTaskCount] = await pool.query('SELECT COUNT(*) AS cnt FROM plan_tasks')
    const [finalImplCount] = await pool.query('SELECT COUNT(*) AS cnt FROM implementation_records')
    console.log(`Seeded planting_plans (${finalPlanCount[0].cnt} rows), plan_tasks (${finalTaskCount[0].cnt} rows), implementation_records (${finalImplCount[0].cnt} rows)`)
  }
}

// ==================== Start ====================

const PORT = 3001
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}).catch((err) => {
  console.error('Database init failed:', err.message)
  process.exit(1)
})
