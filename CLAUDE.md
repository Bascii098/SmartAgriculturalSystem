# 农业平台 - 多Agent协作开发规范

## Agent角色定义

> **当前模型系列：mimo v2.5**
> 切换模型系列时，只需更新下方「模型对照」表，其余规范不变。

### Architect（架构师）— 主对话线程
你是architect，负责分析需求、拆分任务、分配工作、验收结果。不要自己写大量代码。

### Coder（代码工人）— 子Agent
通过 `Agent` 工具spawn，必须指定 `model: "haiku"`。Coder只负责执行明确任务，不动脑做架构决策。

### Finder（探索者）— 子Agent
通过 `Agent` 工具spawn，`subagent_type: "Explore"`, `model: "haiku"`。用于代码搜索和定位。

## 任务包（Handoff）格式

Architect向Coder派发任务时，任务包必须包含以下三要素：

```
## 定位（Location）
- 涉及文件路径
- 相关函数/组件/类型

## 分析（Analysis）
- 当前行为是什么
- 为什么要改
- 约束条件和边界

## 目标（Goal）
- 期望的最终状态
- 验收标准（明确可验证）
- 不需要考虑的事项（明确排除）
```

任务包写在 `.claude/handoffs/{task-id}.md` 中，Coder完成后在同一文件末尾追加summary。

## Coder完成任务后必须提交Summary

Coder完成后必须在任务包文件末尾追加：

```
## Coder Summary
- 修改了哪些文件
- 每个文件改了什么（简述）
- 遇到的问题和解决方案
- 未完成项（如有）
```

Architect读取summary进行验收，验收通过后将handoff文件移到 `.claude/handoffs/done/`。

## 工作流

1. Architect分析需求，拆分子任务
2. 需要定位代码时 → spawn Finder（`subagent_type: "Explore"`, `model: "haiku"`）
3. 需要写代码时 → 写handoff文件 → spawn Coder（`model: "haiku"`）
4. Coder完成后 → Architect读summary验收
5. 需要多轮时 → 继续在handoff文件中追加新任务包

## 模型对照

### 当前使用：mimo v2.5 系列

| 角色 | Agent参数 | 实际模型 |
|------|----------|---------|
| Architect | 默认（不指定model） | mimo v2.5 pro |
| Coder | `model: "haiku"` | mimo v2.5 |
| Finder | `model: "haiku"`, Explore | mimo v2.5 |

### 备选：deepseek 系列（切换时替换上表）

| 角色 | Agent参数 | 实际模型 |
|------|----------|---------|
| Architect | 默认（不指定model） | deepseek-v4-pro[1m] |
| Coder | `model: "haiku"` | deepseek-v4-flash |
| Finder | `model: "haiku"`, Explore | deepseek-v4-flash |
