import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Tabs,
  Card,
  Select,
  Form,
  Button,
  Table,
  Tag,
  Empty,
  message,
  Popconfirm,
  Typography,
  Space,
} from 'antd'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  initializePlotsForUser,
  createHandover,
  confirmHandover,
  rejectHandover,
} from '@/store/handoverSlice'
import { getAllUsers } from '@/store/authSlice'
import {
  getPlotsApi,
  getHandoversApi,
  createHandoverApi,
  confirmHandoverApi,
  rejectHandoverApi,
} from '@/services/api'
import type { PlotFeature } from '@/types/plot'
import type { HandoverRecord, HandoverStatus } from '@/types/grower'

const { Text } = Typography

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function StatusTag({ status }: { status: HandoverStatus }) {
  const config: Record<HandoverStatus, { color: string; text: string }> = {
    pending: { color: 'blue', text: '待确认' },
    confirmed: { color: 'green', text: '已确认' },
    rejected: { color: 'red', text: '已拒绝' },
  }
  const { color, text } = config[status]
  return <Tag color={color}>{text}</Tag>
}

function HandoverManagement() {
  const dispatch = useAppDispatch()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const username = useAppSelector((state) => state.auth.username)
  const reduxPlots = useAppSelector((state) => state.handover.plots)
  const reduxHandovers = useAppSelector((state) => state.handover.handovers)

  const [form] = Form.useForm()

  // API 数据（本地 state）
  const [plots, setPlots] = useState<PlotFeature[]>([])
  const [handoverRecords, setHandoverRecords] = useState<HandoverRecord[]>([])

  // 初始化：从 API 拿数据，同时同步到 Redux
  useEffect(() => {
    if (!isLoggedIn || !username) return
    dispatch(initializePlotsForUser(username))
    getPlotsApi()
      .then((data) => setPlots(data))
      .catch(() => {})
    getHandoversApi()
      .then((data) => setHandoverRecords(data))
      .catch(() => {})
  }, [isLoggedIn, username, dispatch])

  // 我的地块：优先用 API 数据，fallback 到 Redux
  const myPlots = useMemo(() => {
    if (plots.length > 0) return plots.filter((p) => p.owner === username)
    return reduxPlots.filter((p) => p.owner === username)
  }, [plots, reduxPlots, username])

  // 交接记录：API 数据 + Redux 去重
  const allHandovers = useMemo(() => {
    const merged = [...handoverRecords]
    reduxHandovers.forEach((rh) => {
      if (!merged.find((m) => m.id === rh.id)) merged.push(rh)
    })
    return merged
  }, [handoverRecords, reduxHandovers])

  // 待确认的交接
  const pendingHandovers = useMemo(
    () =>
      allHandovers.filter(
        (h) => h.toUser === username && h.status === 'pending',
      ),
    [allHandovers, username],
  )

  // 交接记录（当前用户发起或接收的）
  const myHandovers = useMemo(
    () =>
      [...allHandovers]
        .filter((h) => h.fromUser === username || h.toUser === username)
        .sort((a, b) => b.createdAt - a.createdAt),
    [allHandovers, username],
  )

  // 可选的接收方（其他种植户）
  const receiverOptions = useMemo(() => {
    return getAllUsers()
      .filter((u) => u.username !== username && u.identity === 'grower')
      .map((u) => ({ label: `${u.username} (种植户)`, value: u.username }))
  }, [username])

  // 可选的发起地块
  const plotOptions = useMemo(
    () =>
      myPlots.map((p) => {
        const hasPending = allHandovers.some(
          (h) => h.plotId === p.id && h.fromUser === username && h.status === 'pending',
        )
        return {
          label: hasPending ? `${p.name} (已有待确认交接)` : p.name,
          value: p.id,
          disabled: hasPending,
        }
      }),
    [myPlots, allHandovers, username],
  )

  const handleCreateHandover = async (values: {
    receiver: string
    plot: string
  }) => {
    const plot = myPlots.find((p) => p.id === values.plot)
    if (!plot) return

    const hasPending = allHandovers.some(
      (h) =>
        h.plotId === plot.id && h.fromUser === username && h.status === 'pending',
    )
    if (hasPending) {
      message.warning('该地块已有待确认的交接，不能重复发起')
      return
    }

    try {
      await createHandoverApi({
        fromUser: username as string,
        toUser: values.receiver,
        plotId: plot.id,
        plotName: plot.name,
      })
      dispatch(
        createHandover({
          fromUser: username as string,
          toUser: values.receiver,
          plotId: plot.id,
          plotName: plot.name,
        }),
      )
      message.success('交接发起成功')
      form.resetFields()
    } catch {
      message.error('发起失败')
    }
  }

  const handleConfirm = async (record: HandoverRecord) => {
    try {
      await confirmHandoverApi(record.id)
      dispatch(confirmHandover(record.id))
      message.success(`已确认接收地块「${record.plotName}」`)
    } catch {
      message.error('操作失败')
    }
  }

  const handleReject = async (record: HandoverRecord) => {
    try {
      await rejectHandoverApi(record.id)
      dispatch(rejectHandover(record.id))
      message.success(`已拒绝地块「${record.plotName}」的交接`)
    } catch {
      message.error('操作失败')
    }
  }

  // 未登录状态 — 复用 BasicInfo 中的提示风格
  if (!isLoggedIn || !username) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Space>
          <Text type="secondary">请先</Text>
          <Link to="/login">登录</Link>
          <Text type="secondary">或</Text>
          <Link to="/register">注册</Link>
          <Text type="secondary">后查看交接管理</Text>
        </Space>
      </div>
    )
  }

  const tabItems = [
    {
      key: 'my-plots',
      label: '我的地块',
      children: (
        <>
          {myPlots.length === 0 ? (
            <Empty description="暂无地块" />
          ) : (
            <div className="handover-plots-grid">
              {myPlots.map((plot) => (
                <Card key={plot.id} className="handover-plot-card" size="small">
                  <Card.Meta title={plot.name} />
                </Card>
              ))}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'create',
      label: '发起交接',
      children: (
        <div className="handover-form">
          <Form form={form} layout="vertical" onFinish={handleCreateHandover}>
            <Form.Item
              name="receiver"
              label="接收方"
              rules={[{ required: true, message: '请选择接收方' }]}
            >
              <Select
                placeholder="请选择接收方"
                options={receiverOptions}
                notFoundContent="没有可选的接收方"
              />
            </Form.Item>
            <Form.Item
              name="plot"
              label="地块"
              rules={[{ required: true, message: '请选择地块' }]}
            >
              <Select
                placeholder="请选择地块"
                options={plotOptions}
                notFoundContent={
                  myPlots.length === 0 ? '当前没有可用的地块' : '暂无匹配地块'
                }
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                disabled={myPlots.length === 0 || receiverOptions.length === 0}
              >
                发起交接
              </Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      key: 'pending',
      label: `待我确认${pendingHandovers.length > 0 ? ` (${pendingHandovers.length})` : ''}`,
      children: (
        <>
          {pendingHandovers.length === 0 ? (
            <Empty description="暂无待确认的交接" />
          ) : (
            <Table
              dataSource={pendingHandovers}
              rowKey="id"
              pagination={false}
              columns={[
                { title: '发起人', dataIndex: 'fromUser', key: 'fromUser' },
                { title: '地块名称', dataIndex: 'plotName', key: 'plotName' },
                {
                  title: '发起时间',
                  dataIndex: 'createdAt',
                  key: 'createdAt',
                  render: (v: number) => formatTime(v),
                },
                {
                  title: '操作',
                  key: 'actions',
                  render: (_: unknown, record: HandoverRecord) => (
                    <Space>
                      <Popconfirm
                        title={`确认接收地块「${record.plotName}」吗？接收后该地块将归你所有。`}
                        onConfirm={() => handleConfirm(record)}
                        okText="确认接收"
                        cancelText="取消"
                      >
                        <Button type="primary" size="small">
                          确认
                        </Button>
                      </Popconfirm>
                      <Popconfirm
                        title={`确认拒绝地块「${record.plotName}」的交接吗？`}
                        onConfirm={() => handleReject(record)}
                        okText="确认拒绝"
                        cancelText="取消"
                      >
                        <Button danger size="small">
                          拒绝
                        </Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          )}
        </>
      ),
    },
    {
      key: 'records',
      label: '交接记录',
      children: (
        <>
          {myHandovers.length === 0 ? (
            <Empty description="暂无交接记录" />
          ) : (
            <Table
              dataSource={myHandovers}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: '类型',
                  key: 'type',
                  render: (_: unknown, record: HandoverRecord) =>
                    record.fromUser === username ? '我发起的' : '我收到的',
                },
                {
                  title: '对方',
                  key: 'other',
                  render: (_: unknown, record: HandoverRecord) =>
                    record.fromUser === username ? record.toUser : record.fromUser,
                },
                { title: '地块名称', dataIndex: 'plotName', key: 'plotName' },
                {
                  title: '状态',
                  dataIndex: 'status',
                  key: 'status',
                  render: (v: HandoverStatus) => <StatusTag status={v} />,
                },
                {
                  title: '时间',
                  dataIndex: 'createdAt',
                  key: 'createdAt',
                  render: (v: number) => formatTime(v),
                },
              ]}
            />
          )}
        </>
      ),
    },
  ]

  return <Tabs items={tabItems} />
}

export default HandoverManagement
