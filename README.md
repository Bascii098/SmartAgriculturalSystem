# 数字农业管理系统

## 技术栈

- 前端：React 19 + TypeScript + Vite + Ant Design 6
- 后端：Node.js + Express + MySQL2
- 地图：Leaflet + 高德卫星瓦片
- 状态管理：Redux Toolkit

## 启动项目

重启电脑后，按以下顺序启动：

### 1. 启动 MySQL

**命令行方式（管理员权限）：**

```
net start MySQL80
```

如果服务名不对，试 `net start MySQL`。

**图形界面方式：**

1. `Win + R` 输入 `services.msc` 回车
2. 找到 `MySQL` 开头的服务
3. 右键 → 启动

验证 MySQL 是否运行：

```
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -e "SELECT 1;"
```

返回 `1` 即正常。

### 2. 启动后端服务器

```bash
cd e:\农业平台\server
node index.js
```

看到 `Server running on http://localhost:3001` 表示成功。

### 3. 启动前端开发服务器

```bash
cd e:\农业平台
npm run dev
```

看到 `Local: http://localhost:5173` 表示成功。

### 4. 访问

浏览器打开 http://localhost:5173

## 数据库信息

- 主机：127.0.0.1:3306
- 用户：root（无密码）
- 数据库：agriculture_platform
- 字符集：utf8mb4
