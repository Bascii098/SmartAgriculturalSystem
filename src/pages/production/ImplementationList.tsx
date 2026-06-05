import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Statistic, Empty, Skeleton, Button } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  RightOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import { getImplementationApi } from '@/services/api'
import type { ImplementationFarmGroup } from '@/types/production'

function ImplementationList() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<ImplementationFarmGroup[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getImplementationApi()
      setGroups(data)
    } catch {
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/production')}>返回</Button>
          <h2 style={{ margin: 0 }}>种植方案实施</h2>
        </div>
      </div>

      {loading ? (
        <Row gutter={[20, 20]}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Col key={i} xs={24} sm={12} lg={8}>
              <Card style={{ height: '100%' }}>
                <Skeleton active paragraph={{ rows: 2 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : groups.length === 0 ? (
        <Card>
          <Empty description="暂无实施数据" />
        </Card>
      ) : (
        <Row gutter={[20, 20]}>
          {groups.map((group) => (
            <Col key={group.farmId} xs={24} sm={12} lg={8}>
              <Card
                hoverable
                style={{ height: '100%' }}
                actions={[
                  <Button
                    key="detail"
                    type="link"
                    onClick={() => navigate(`/production/implementation/${group.farmId}`)}
                  >
                    查看详情 <RightOutlined />
                  </Button>,
                ]}
              >
                <Card.Meta
                  title={
                    <span style={{ fontSize: 18, fontWeight: 600 }}>
                      {group.farmName}
                    </span>
                  }
                />
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col span={8}>
                    <Statistic
                      title="今日任务"
                      value={group.todayTasks}
                      prefix={<CalendarOutlined />}
                      valueStyle={{ color: '#29b6f6' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="已实施"
                      value={group.implemented}
                      prefix={<CheckCircleOutlined />}
                      valueStyle={{ color: '#4caf50' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="未实施"
                      value={group.unimplemented}
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ color: '#ff9800' }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}

export default ImplementationList
