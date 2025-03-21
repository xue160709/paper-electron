import React, { useState, useEffect } from 'react';
import { Select, Space, Button, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Option } = Select;

const SearchSelector = ({ onSearch }) => {
  const [savedSearches, setSavedSearches] = useState([]);
  const [selectedSearches, setSelectedSearches] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('savedSearches');
    if (saved) {
      const searches = JSON.parse(saved);
      setSavedSearches(searches);
      // 默认选中所有搜索条件
      setSelectedSearches(searches.map((_, index) => index.toString()));
    }
  }, []);

  // 监听savedSearches的变化
  useEffect(() => {
    if (savedSearches.length > 0) {
      handleSearch();
    }
  }, [savedSearches]);

  const handleChange = (values) => {
    setSelectedSearches(values);
    // 选择变化时立即触发搜索
    const selectedConditions = values.map(index => savedSearches[parseInt(index)]);
    onSearch(selectedConditions);
  };

  const handleSearch = () => {
    const selectedConditions = selectedSearches.map(index => savedSearches[parseInt(index)]);
    if (selectedConditions.length === 0) {
      message.warning('请至少选择一个搜索条件');
      return;
    }
    onSearch(selectedConditions);
  };

  return (
    <Space style={{ width: '100%', marginBottom: 16 }}>
      <Select
        mode="multiple"
        style={{ width: '100%' }}
        placeholder="选择要查看的搜索条件"
        value={selectedSearches}
        onChange={handleChange}
        optionLabelProp="label"
      >
        {savedSearches.map((search, index) => (
          <Option 
            key={index} 
            value={index.toString()} 
            label={search.name || `保存的搜索 ${index + 1}`}
          >
            <div>
              <div>{search.name || `保存的搜索 ${index + 1}`}</div>
              <small style={{ color: '#666' }}>
                {search.conditions.map((condition, i) => (
                  `${i > 0 ? condition.operator + ' ' : ''}${condition.type}: ${condition.term}`
                )).join(', ')}
              </small>
            </div>
          </Option>
        ))}
      </Select>
      <Button 
        type="primary" 
        icon={<SearchOutlined />} 
        onClick={handleSearch}
      >
        搜索
      </Button>
    </Space>
  );
};

export default SearchSelector; 