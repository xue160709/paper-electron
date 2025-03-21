const { ipcRenderer } = require('electron');

// 添加新的搜索条件
document.getElementById('addCondition').addEventListener('click', () => {
    const conditionTemplate = `
        <div class="search-condition row g-3">
            <div class="col-md-2">
                <select class="form-select operator" required>
                    <option value="AND" selected>AND</option>
                    <option value="OR">OR</option>
                    <option value="NOT">NOT</option>
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-select search-type">
                    <option value="ti">标题</option>
                    <option value="au">作者</option>
                    <option value="abs">摘要</option>
                    <option value="cat">分类</option>
                    <option value="all">全部</option>
                </select>
            </div>
            <div class="col-md-6">
                <input type="text" class="form-control search-term" placeholder="输入搜索关键词">
            </div>
            <div class="col-md-1">
                <span class="btn btn-outline-danger remove-condition">&times;</span>
            </div>
        </div>
    `;
    document.getElementById('searchConditions').insertAdjacentHTML('beforeend', conditionTemplate);
});

// 删除搜索条件
document.getElementById('searchConditions').addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-condition')) {
        const conditions = document.querySelectorAll('.search-condition');
        if (conditions.length > 1) {
            e.target.closest('.search-condition').remove();
        } else {
            alert('至少需要保留一个搜索条件');
        }
    }
});

// 构建搜索查询字符串
function buildSearchQuery() {
    const conditions = document.querySelectorAll('.search-condition');
    let queryParts = [];

    conditions.forEach((condition, index) => {
        const searchType = condition.querySelector('.search-type').value;
        const searchTerm = condition.querySelector('.search-term').value.trim();

        if (searchTerm) {
            let queryPart = searchType === 'all' ? searchTerm : `${searchType}:${searchTerm}`;
            // 只有后续的条件才需要添加运算符
            if (index > 0) {
                const operator = condition.querySelector('.operator').value;
                queryPart = `${operator} ${queryPart}`;
            }
            queryParts.push(queryPart);
        }
    });

    return queryParts.join(' ');
}

// 处理表单提交
document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const searchQuery = buildSearchQuery();
        if (!searchQuery) {
            alert('请至少输入一个搜索条件');
            return;
        }

        const sortBy = document.getElementById('sortBy').value;
        const sortOrder = document.getElementById('sortOrder').value;
        const maxResults = document.getElementById('maxResults').value;

        const apiUrl = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&sortBy=${sortBy}&sortOrder=${sortOrder}&start=0&max_results=${maxResults}`;
        
        const response = await fetch(apiUrl);
        const xmlText = await response.text();
        
        // 解析XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const entries = xmlDoc.getElementsByTagName('entry');
        
        const tableBody = document.getElementById('papersTableBody');
        tableBody.innerHTML = '';
        
        if (entries.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" class="text-center">未找到相关论文</td>';
            tableBody.appendChild(row);
            return;
        }
        
        Array.from(entries).forEach(entry => {
            const title = entry.getElementsByTagName('title')[0]?.textContent || '';
            const authors = Array.from(entry.getElementsByTagName('author'))
                .map(author => author.getElementsByTagName('name')[0]?.textContent || '')
                .join(', ');
            const published = entry.getElementsByTagName('published')[0]?.textContent || '';
            const summary = entry.getElementsByTagName('summary')[0]?.textContent || '';
            const link = entry.getElementsByTagName('id')[0]?.textContent || '';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${title}</td>
                <td>${authors}</td>
                <td>${new Date(published).toLocaleDateString('zh-CN')}</td>
                <td>${summary.substring(0, 200)}...</td>
                <td><a href="${link}" target="_blank">查看</a></td>
            `;
            
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('获取论文数据时出错:', error);
        alert('获取论文数据时出错，请查看控制台了解详情。');
    }
}); 