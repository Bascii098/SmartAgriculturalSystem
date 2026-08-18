import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Button,
  Input,
  Row,
  Col,
  Modal,
  Form,
  InputNumber,
  Select,
  Empty,
  Skeleton,
  Popconfirm,
  message,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchFarms, addFarm, editFarm, removeFarm } from '@/store/farmSlice'
import { getGrowersApi } from '@/services/api'
import type { Farm, FarmFormData } from '@/types/farm'

function FarmList() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { farms, loading } = useAppSelector((state) => state.farm)

  const [searchText, setSearchText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null)
  const [managerOptions, setManagerOptions] = useState<{ label: string; value: string }[]>([])
  const [form] = Form.useForm<FarmFormData>()

  useEffect(() => {
    dispatch(fetchFarms())

    const loadManagers = async () => {
      try {
        const growers = await getGrowersApi()
        setManagerOptions(growers.map((g: { username: string }) => ({ label: g.username, value: g.username })))
      } catch {
        setManagerOptions([{ label: 'admin', value: 'admin' }])
      }
    }

    loadManagers()
  }, [dispatch])

  const filteredFarms = farms.filter((f) =>
    f.name.toLowerCase().includes(searchText.toLowerCase()),
  )

  const handleCreate = () => {
    setEditingFarm(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (farm: Farm, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingFarm(farm)
    form.setFieldsValue({
      name: farm.name,
      address: farm.address,
      longitude: farm.longitude,
      latitude: farm.latitude,
      manager: farm.manager,
    })
    setModalOpen(true)
  }

  const [submitting, setSubmitting] = useState(false)

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    await dispatch(removeFarm(id))
    await dispatch(fetchFarms())
    message.success('删除成功')
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      if (editingFarm) {
        await dispatch(editFarm({ id: editingFarm.id, data: values }))
        message.success('编辑成功')
      } else {
        await dispatch(addFarm(values))
        message.success('创建成功')
      }
      await dispatch(fetchFarms())
      setModalOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="farms-page">
      <div className="farms-header">
        <Input
          placeholder="搜索农场名称"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="farms-search-input"
          allowClear
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建农场
        </Button>
      </div>

      {loading ? (
        <Row gutter={[20, 20]}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Col key={i} xs={24} sm={12} lg={8} xl={6}>
              <Card className="farm-card">
                <Skeleton active paragraph={{ rows: 3 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : filteredFarms.length === 0 ? (
        <Empty description="暂无农场数据" className="farms-empty" />
      ) : (
        <Row gutter={[20, 20]} className="farms-grid">
          {filteredFarms.map((farm) => (
            <Col key={farm.id} xs={24} sm={12} lg={8} xl={6}>
              <Card
                hoverable
                className="farm-card"
                onClick={() => navigate(`/farms/${farm.id}`)}
                actions={[
                  <EditOutlined
                    key="edit"
                    onClick={(e) => handleEdit(farm, e)}
                  />,
                  <Popconfirm
                    key="delete"
                    title="确定删除该农场？"
                    description="删除后将同时删除所有关联地块，此操作不可撤销。"
                    onConfirm={() => handleDelete(farm.id)}
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                  >
                    <DeleteOutlined onClick={(e) => e.stopPropagation()} />
                  </Popconfirm>,
                ]}
              >
                <Card.Meta
                  title={farm.name}
                  description={
                    <div className="farm-card__info">
                      <p>
                        <EnvironmentOutlined /> {farm.address || '未设置地址'}
                      </p>
                      <p>
                        <TeamOutlined /> 负责人：{farm.managerName || farm.manager}
                      </p>
                      <div className="farm-card__stats">
                        <span>{farm.plotCount ?? 0} 个地块</span>
                        <span>{(farm.totalArea ?? 0).toFixed(0)} 亩</span>
                      </div>
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={editingFarm ? '编辑农场' : '新建农场'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="farm-modal-form">
          <Form.Item name="name" label="农场名称" rules={[{ required: true, message: '请输入农场名称' }]}>
            <Input placeholder="请输入农场名称" />
          </Form.Item>
          <Form.Item name="address" label="农场地址" rules={[{ required: true, message: '请输入农场地址' }]}>
            <Input placeholder="省/市/县/镇/村" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="longitude" label="经度" rules={[{ required: true, message: '请输入经度' }]}>
                <InputNumber className="full-width" placeholder="127.53" step={0.0001} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="latitude" label="纬度" rules={[{ required: true, message: '请输入纬度' }]}>
                <InputNumber className="full-width" placeholder="45.25" step={0.0001} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="manager" label="农场负责人" rules={[{ required: true, message: '请选择负责人' }]}>
            <Select placeholder="选择负责人" options={managerOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default FarmList
