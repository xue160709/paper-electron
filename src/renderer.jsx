import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Layout, Card, Form, Select, Input, Button, Table, Space, 
  InputNumber, Typography, message, Modal, Tabs, Input as AntInput 
} from 'antd';
import { 
  PlusOutlined, MinusCircleOutlined, SearchOutlined,
  SortAscendingOutlined, SortDescendingOutlined,
  SaveOutlined, SettingOutlined
} from '@ant-design/icons';
import Settings from './components/Settings';
import SearchSelector from './components/SearchSelector';
import { loadAllJsonFiles, savePapersToJson } from './utils/fileUtils';
import 'antd/dist/reset.css';

const { Header, Content } = Layout;
const { Title } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const ArxivSearch = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState([]);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const [allPapers, setAllPapers] = useState([]);

  const columns = [
    {
      title: '搜索条件',
      dataIndex: 'searchName',
      key: 'searchName',
      width: 150,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '作者',
      dataIndex: 'authors',
      key: 'authors',
      ellipsis: true,
    },
    {
      title: '发布日期',
      dataIndex: 'published',
      key: 'published',
      width: 120,
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="link" href={record.link} target="_blank">
          查看
        </Button>
      ),
    },
  ];

  const buildSearchQuery = (values) => {
    return values.conditions
      .filter(condition => condition?.term?.trim())
      .map((condition, index) => {
        const { type, term, operator } = condition;
        const queryPart = type === 'all' ? term : `${type}:${term}`;
        return index === 0 ? queryPart : `${operator} ${queryPart}`;
      })
      .join(' ');
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      const searchQuery = buildSearchQuery(values);
      
      if (!searchQuery) {
        message.warning('请至少输入一个搜索条件');
        return;
      }

      const apiUrl = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&sortBy=${values.sortBy}&sortOrder=${values.sortOrder}&start=0&max_results=${values.maxResults}`;
      
      const response = await fetch(apiUrl);
      const xmlText = await response.text();
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const entries = xmlDoc.getElementsByTagName('entry');
      
      if (entries.length === 0) {
        message.info('未找到相关论文');
        return;
      }
      
      const paperData = Array.from(entries).map((entry, index) => ({
        key: `temp-${Date.now()}-${index}`,
        title: entry.getElementsByTagName('title')[0]?.textContent || '',
        authors: Array.from(entry.getElementsByTagName('author'))
          .map(author => author.getElementsByTagName('name')[0]?.textContent || '')
          .join(', '),
        published: new Date(entry.getElementsByTagName('published')[0]?.textContent || '').toLocaleDateString('zh-CN'),
        publishedTimestamp: new Date(entry.getElementsByTagName('published')[0]?.textContent || '').getTime(),
        summary: entry.getElementsByTagName('summary')[0]?.textContent || '',
        link: entry.getElementsByTagName('id')[0]?.textContent || '',
        searchName: '临时搜索'
      }));
      
      // 保留现有的搜索结果，只添加新的临时搜索结果
      const existingTempPapers = allPapers.filter(paper => !paper.searchName.startsWith('临时搜索'));
      const combinedPapers = [...existingTempPapers, ...paperData];
      const sortedPapers = combinedPapers.sort((a, b) => b.publishedTimestamp - a.publishedTimestamp);
      
      setAllPapers(sortedPapers);
      setPapers(sortedPapers);
      message.success(`找到 ${paperData.length} 篇相关论文`);
    } catch (error) {
      console.error('获取论文数据时出错:', error);
      message.error('获取论文数据时出错，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSearch = () => {
    const values = form.getFieldsValue();
    if (!values.conditions?.some(c => c?.term?.trim())) {
      message.warning('请至少输入一个搜索条件');
      return;
    }
    setSaveModalVisible(true);
  };

  const handleSaveConfirm = () => {
    const values = form.getFieldsValue();
    const savedSearches = JSON.parse(localStorage.getItem('savedSearches') || '[]');
    const newSearch = {
      name: searchName || `保存的搜索 ${savedSearches.length + 1}`,
      ...values
    };
    savedSearches.push(newSearch);
    localStorage.setItem('savedSearches', JSON.stringify(savedSearches));
    setSaveModalVisible(false);
    setSearchName('');
    message.success('搜索条件已保存');
  };

  const handleApplySearch = (search) => {
    form.setFieldsValue(search);
    setActiveTab('search');
  };

  const handleMultiSearch = async (selectedSearches) => {
    try {
      setLoading(true);
      
      // 首先加载所有已存在的论文
      const existingPapers = await loadAllJsonFiles();
      setAllPapers(existingPapers);
      setPapers(existingPapers);
      
      for (const search of selectedSearches) {
        const searchQuery = buildSearchQuery(search);
        if (!searchQuery) continue;

        const apiUrl = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&sortBy=${search.sortBy}&sortOrder=${search.sortOrder}&start=0&max_results=${search.maxResults}`;
        
        const response = await fetch(apiUrl);
        const xmlText = await response.text();
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const entries = xmlDoc.getElementsByTagName('entry');
        
        const paperData = Array.from(entries).map((entry, index) => ({
          key: `${search.name}-${Date.now()}-${index}`,
          title: entry.getElementsByTagName('title')[0]?.textContent || '',
          authors: Array.from(entry.getElementsByTagName('author'))
            .map(author => author.getElementsByTagName('name')[0]?.textContent || '')
            .join(', '),
          published: new Date(entry.getElementsByTagName('published')[0]?.textContent || '').toLocaleDateString('zh-CN'),
          publishedTimestamp: new Date(entry.getElementsByTagName('published')[0]?.textContent || '').getTime(),
          summary: entry.getElementsByTagName('summary')[0]?.textContent || '',
          link: entry.getElementsByTagName('id')[0]?.textContent || '',
          searchName: search.name || `保存的搜索 ${selectedSearches.indexOf(search) + 1}`
        }));
        
        // 保存新的论文到对应的JSON文件
        const searchNameForFile = search.name || `保存的搜索_${selectedSearches.indexOf(search) + 1}`;
        await savePapersToJson(paperData, searchNameForFile);
      }
      
      // 重新加载所有论文并更新显示
      const allPapers = await loadAllJsonFiles();
      const sortedPapers = allPapers.sort((a, b) => b.publishedTimestamp - a.publishedTimestamp);
      
      setAllPapers(sortedPapers);
      setPapers(sortedPapers);
      
    } catch (error) {
      console.error('获取论文数据时出错:', error);
      message.error('获取论文数据时出错，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        // 页面加载时先加载所有已保存的论文
        const existingPapers = await loadAllJsonFiles();
        const sortedPapers = existingPapers.sort((a, b) => b.publishedTimestamp - a.publishedTimestamp);
        setAllPapers(sortedPapers);
        setPapers(sortedPapers);

        // 然后自动执行所有保存的搜索
        const saved = localStorage.getItem('savedSearches');
        if (saved) {
          const searches = JSON.parse(saved);
          if (searches.length > 0) {
            await handleMultiSearch(searches);
          }
        }
      } catch (error) {
        console.error('初始化数据时出错:', error);
        message.error('加载已保存的论文时出错');
      }
    };

    initializeData();
  }, []);

  const tabItems = [
    {
      key: 'search',
      label: '搜索',
      children: (
        <>
          <Card>
            <Form
              form={form}
              onFinish={onFinish}
              initialValues={{
                conditions: [{ operator: 'AND', type: 'ti' }],
                sortBy: 'submittedDate',
                sortOrder: 'descending',
                maxResults: 30
              }}
            >
              <Form.List name="conditions">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, index) => (
                      <Space key={field.name} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        {index > 0 && (
                          <Form.Item
                            {...field}
                            name={[field.name, 'operator']}
                          >
                            <Select style={{ width: 100 }}>
                              <Option value="AND">AND</Option>
                              <Option value="OR">OR</Option>
                              <Option value="NOT">NOT</Option>
                            </Select>
                          </Form.Item>
                        )}
                        <Form.Item
                          {...field}
                          name={[field.name, 'type']}
                        >
                          <Select style={{ width: 120 }}>
                            <Option value="ti">标题</Option>
                            <Option value="au">作者</Option>
                            <Option value="abs">摘要</Option>
                            <Option value="cat">分类</Option>
                            <Option value="all">全部</Option>
                          </Select>
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, 'term']}
                          rules={[{ required: true, message: '请输入搜索关键词' }]}
                        >
                          <Input placeholder="输入搜索关键词" style={{ width: 300 }} />
                        </Form.Item>
                        {fields.length > 1 && (
                          <MinusCircleOutlined onClick={() => remove(field.name)} />
                        )}
                      </Space>
                    ))}
                    <Form.Item>
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        icon={<PlusOutlined />}
                      >
                        添加搜索条件
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>

              <Space size="large">
                <Form.Item
                  name="sortBy"
                  label="排序方式"
                >
                  <Select style={{ width: 160 }}>
                    <Option value="submittedDate">提交日期</Option>
                    <Option value="relevance">相关度</Option>
                    <Option value="lastUpdatedDate">最后更新日期</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="sortOrder"
                  label="排序顺序"
                >
                  <Select style={{ width: 160 }}>
                    <Option value="descending">降序</Option>
                    <Option value="ascending">升序</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="maxResults"
                  label="结果数量"
                >
                  <InputNumber min={1} max={100} />
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={loading} icon={<SearchOutlined />}>
                      搜索论文
                    </Button>
                    <Button 
                      onClick={handleSaveSearch}
                      icon={<SaveOutlined />}
                    >
                      保存搜索
                    </Button>
                  </Space>
                </Form.Item>
              </Space>
            </Form>
          </Card>

          <Card style={{ marginTop: 16 }}>
            <Table
              columns={columns}
              dataSource={papers}
              loading={loading}
              pagination={{ 
                pageSize: 30,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ['10', '30', '50', '100']
              }}
            />
          </Card>
        </>
      )
    },
    {
      key: 'settings',
      label: '设置',
      children: <Settings onApplySearch={handleApplySearch} activeTab={activeTab} />
    }
  ];

  return (
    <Layout className="layout" style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px' }}>
        <Title level={2} style={{ margin: '16px 0' }}>ArXiv论文搜索</Title>
      </Header>
      <Content style={{ padding: '24px' }}>
        <SearchSelector onSearch={handleMultiSearch} />
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        
        <Modal
          title="保存搜索条件"
          open={saveModalVisible}
          onOk={handleSaveConfirm}
          onCancel={() => {
            setSaveModalVisible(false);
            setSearchName('');
          }}
          okText="保存"
          cancelText="取消"
        >
          <AntInput
            placeholder="输入搜索条件名称（可选）"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </Modal>
      </Content>
    </Layout>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<ArxivSearch />); 