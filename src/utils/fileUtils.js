const { ipcRenderer } = window.require('electron');

// 加载所有JSON文件
const loadAllJsonFiles = async () => {
  try {
    const papers = await ipcRenderer.invoke('load-all-papers');
    return papers;
  } catch (error) {
    console.error('读取JSON文件时出错:', error);
    return [];
  }
};

// 保存论文到JSON文件
const savePapersToJson = async (papers, searchName) => {
  try {
    const result = await ipcRenderer.invoke('save-papers', { papers, searchName });
    return result.newPapersCount;
  } catch (error) {
    console.error('保存JSON文件时出错:', error);
    return 0;
  }
};

export { loadAllJsonFiles, savePapersToJson }; 