import React, { useEffect, useState } from 'react';
import { 
  Table, Button, Modal, Form, Input, Select, 
  Tag, message, Card, Statistic, Row, Col 
} from 'antd';
import { client } from '../api/client'; 

const { Option } = Select;

const Admin: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [isDeviceModalVisible, setIsDeviceModalVisible] = useState(false);
  const [selectedUserTgId, setSelectedUserTgId] = useState<string>('');
  
  const [form] = Form.useForm();
  const [deviceForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Используем твою структуру объекта admin
      const usersData = await client.admin.getUsers();
      const devicesData = await client.admin.getAllDevices();
      
      setUsers(Array.isArray(usersData) ? usersData : []);
      setDevices(Array.isArray(devicesData) ? devicesData : []);
    } catch (error) {
      console.error(error);
      message.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUserSubmit = async (values: any) => {
    try {
      await client.admin.createUser(values);
      message.success('Пользователь создан');
      setIsUserModalVisible(false);
      form.resetFields();
      fetchData(); 
    } catch (error: any) {
      message.error('Ошибка создания пользователя');
    }
  };

  const handleDeviceSubmit = async (values: any) => {
    try {
      await client.admin.createDevice({
        ...values,
        tgId: selectedUserTgId,
      });
      message.success('Устройство добавлено');
      setIsDeviceModalVisible(false);
      deviceForm.resetFields();
      fetchData(); 
    } catch (error: any) {
      message.error('Ошибка создания устройства');
    }
  };

  // Колонки таблиц (остаются такими же, как в прошлом ответе)
  const userColumns = [
    { title: 'Telegram ID', dataIndex: 'telegramId', key: 'telegramId', render: (id: any) => <b>{id?.toString()}</b> },
    { title: 'Баланс', dataIndex: 'balance', key: 'balance', render: (b: number) => `${b} ₽` },
    {
      title: 'Действие',
      key: 'action',
      render: (_: any, record: any) => (
        <Button type="primary" size="small" onClick={() => {
          setSelectedUserTgId(record.telegramId.toString());
          setIsDeviceModalVisible(true);
        }}>
          + Добавить VPN
        </Button>
      ),
    },
  ];

  const deviceColumns = [
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Название', dataIndex: 'name', key: 'name' },
    { title: 'Тип', dataIndex: 'type', key: 'type', render: (t: string) => <Tag color="blue">{t?.toUpperCase()}</Tag> },
    { title: 'Статус', dataIndex: 'isActive', key: 'isActive', render: (a: boolean) => a ? <Tag color="green">ONLINE</Tag> : <Tag color="red">OFFLINE</Tag> },
  ];

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={8}><Card><Statistic title="Пользователи" value={users.length} /></Card></Col>
        <Col span={8}><Card><Statistic title="Устройства" value={devices.length} /></Card></Col>
        <Col span={8}>
          <Button type="primary" size="large" block onClick={() => setIsUserModalVisible(true)} style={{ height: '100%' }}>
            Создать пользователя
          </Button>
        </Col>
      </Row>

      <Card title="Пользователи" loading={loading} style={{ marginBottom: '24px' }}>
        <Table dataSource={users} columns={userColumns} rowKey="id" />
      </Card>

      <Card title="Устройства (VPN)" loading={loading}>
        <Table dataSource={devices} columns={deviceColumns} rowKey="id" />
      </Card>

      {/* Модалки (User и Device) точно такие же, как были выше */}
      <Modal title="Новый пользователь" open={isUserModalVisible} onOk={() => form.submit()} onCancel={() => setIsUserModalVisible(false)} destroyOnClose>
        <Form form={form} onFinish={handleUserSubmit} layout="vertical">
          <Form.Item name="telegramId" label="Telegram ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="balance" label="Баланс" initialValue={0}><Input type="number" /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`Добавить устройство (TG: ${selectedUserTgId})`} open={isDeviceModalVisible} onOk={() => deviceForm.submit()} onCancel={() => setIsDeviceModalVisible(false)} destroyOnClose>
        <Form form={deviceForm} onFinish={handleDeviceSubmit} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="ОС" rules={[{ required: true }]}>
            <Select>
              <Option value="apple">iOS</Option>
              <Option value="android">Android</Option>
              <Option value="desktop">PC</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Admin;