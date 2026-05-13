import { useNavigate } from 'react-router-dom'
import { Row, Col } from 'antd'
import {
  FileTextOutlined,
  ToolOutlined,
  SettingOutlined,
  CheckSquareOutlined,
  RightOutlined,
} from '@ant-design/icons'

const entryCards = [
  {
    key: 'plans',
    title: '种植计划管理',
    desc: '制定和管理各农场的种植计划',
    icon: <FileTextOutlined />,
    iconClass: 'production-card__icon--green',
    path: '/production/plans',
  },
  {
    key: 'tasks',
    title: '任务管理',
    desc: '查看和管理所有农事任务的执行状态',
    icon: <CheckSquareOutlined />,
    iconClass: 'production-card__icon--blue',
    path: '/production/tasks',
  },
  {
    key: 'implementation',
    title: '种植方案实施',
    desc: '记录和跟踪农事操作实施情况',
    icon: <ToolOutlined />,
    iconClass: 'production-card__icon--gold',
    path: '/production/implementation',
  },
  {
    key: 'config',
    title: '任务配置',
    desc: '配置各农事环节的字段与规则',
    icon: <SettingOutlined />,
    iconClass: 'production-card__icon--gold',
    path: '/production/config',
  },
]

function Production() {
  const navigate = useNavigate()

  return (
    <div className="production-page">
      <div className="production-page__header">
        <h2 className="production-page__title">生产管理</h2>
        <p className="production-page__subtitle">种植计划、任务管理、实施跟踪与配置</p>
      </div>
      <Row gutter={[20, 20]}>
        {entryCards.map((card) => (
          <Col key={card.key} xs={24} sm={12} lg={8}>
            <div
              className="production-card"
              onClick={() => navigate(card.path)}
            >
              <div className={`production-card__icon ${card.iconClass}`}>
                {card.icon}
              </div>
              <div className="production-card__content">
                <div className="production-card__title">{card.title}</div>
                <div className="production-card__desc">{card.desc}</div>
              </div>
              <RightOutlined className="production-card__arrow" />
            </div>
          </Col>
        ))}
      </Row>
    </div>
  )
}

export default Production
