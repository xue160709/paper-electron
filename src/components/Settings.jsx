import React, { useState, useEffect } from 'react';
import { Card, List, Button, Typography, Popconfirm, message } from 'antd';
import { DeleteOutlined, ExportOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Settings = ({ onApplySearch, activeTab }) => {
  const [savedSearches, setSavedSearches] = useState([]);

  useEffect(() => {
    if (activeTab === 'settings') {
      const saved = localStorage.getItem('savedSearches');
      if (saved) {
        setSavedSearches(JSON.parse(saved));
      }
    }
  }, [activeTab]);

  const handleDelete = (index) => {
    const newSearches = savedSearches.filter((_, i) => i !== index);
    setSavedSearches(newSearches);
    localStorage.setItem('savedSearches', JSON.stringify(newSearches));
    message.success('搜索条件已删除');
  };

  const handleApply = (search) => {
    onApplySearch(search);
    message.success('搜索条件已应用');
  };

  return (
    <Card>
      <Title level={3}>已保存的搜索条件</Title>
      <List
        dataSource={savedSearches}
        renderItem={(item, index) => (
          <List.Item
            actions={[
              <Button 
                type="primary" 
                icon={<ExportOutlined />}
                onClick={() => handleApply(item)}
              >
                应用
              </Button>,
              <Popconfirm
                title="确定要删除这个搜索条件吗？"
                onConfirm={() => handleDelete(index)}
                okText="确定"
                cancelText="取消"
              >
                <Button 
                  type="text" 
                  danger 
                  icon={<DeleteOutlined />}
                >
                  删除
                </Button>
              </Popconfirm>
            ]}
          >
            <List.Item.Meta
              title={item.name || `保存的搜索 ${index + 1}`}
              description={
                <div>
                  {item.conditions.map((condition, i) => (
                    <div key={i}>
                      {i > 0 ? condition.operator + ' ' : ''}
                      {condition.type}: {condition.term}
                    </div>
                  ))}
                </div>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default Settings; 