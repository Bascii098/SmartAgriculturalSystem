# 发现与决策

## 需求
- 基于原型图（page_39-47）实现农场管理模块
- 原型图页面跳转混乱，需重新设计用户流程
- 核心功能：农场 CRUD、地块 CRUD、地图展示

## 研究发现
- 农场管理页 `/farms` 目前是占位页面，只有一行标题
- 生产管理页 `/production` 也是占位页面（本次不涉及）
- 现有 PlotFeature 类型已包含地块核心字段，但缺少 farmId 关联
- 现有 GIS 页面已配好 Leaflet + 高德卫星瓦片，可复用
- 天气集成已有 Open-Meteo API 方案，可复用
- 项目使用 antd 6 + Redux Toolkit，Modal/Drawer/Steps 组件齐全

## 技术决策
| 决策 | 理由 |
|------|------|
| 农场-地块为一对多关系 | 原型图逻辑：农场包含多个地块 |
| 地块类型扩展 farmId 字段 | 建立农场与地块的关联 |
| 新增 farmSlice 管理农场状态 | 遵循项目现有 Redux 模式 |
| 地图使用 Leaflet + 高德瓦片 | 复用 GIS.tsx 已有配置 |
| 表单使用 antd Form + Modal/Drawer | 遵循项目现有 UI 模式 |

## 遇到的问题
| 问题 | 解决方案 |
|------|---------|
| 原型图页面跳转不清晰 | 与用户讨论后重新设计了流程 |

## 资源
- 原型图：`.claude/pdf_pages/page_39.png` ~ `page_47.png`
- 现有 GIS 配置：`src/pages/GIS.tsx`
- 现有类型定义：`src/types/plot.ts`, `src/types/grower.ts`
- API 层：`src/services/api.ts`
- HTTP 客户端：`src/services/http.ts`（Apifox mock server）

## 视觉/浏览器发现
- page_39: 标题页"农场管理模块 - 创建农场"
- page_40: 农场创建表单（名称、地址、经纬度、负责人）
- page_41: 农场列表（卡片展示，含面积、地块数、负责人、作物、预估收入）
- page_42: 标题页"农场管理模块 - 创建地块"
- page_43: 地块列表（左侧农场概览，右侧地块卡片）
- page_44: 地块地图（卫星视图，标注地块位置和面积）
- page_45: 地块创建表单（土质类型、名称、形状、位置 + 地图预览）
- page_46: 地块详细信息（种植信息、确权信息）
- page_47: 土壤检测 + 天气信息

---
*最后更新：2026-05-10*
