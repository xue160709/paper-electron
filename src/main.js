const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// 获取数据存储目录
const getDataDir = () => {
  // 使用应用程序目录下的 data 文件夹
  const isPackaged = app.isPackaged;
  const basePath = isPackaged ? path.dirname(app.getPath('exe')) : process.cwd();
  return path.join(basePath, 'data', 'papers');
};

// 注册 IPC 处理程序
function registerIpcHandlers() {
  // 加载所有论文
  ipcMain.handle('load-all-papers', async () => {
    try {
      const jsonDir = getDataDir();
      try {
        await fs.access(jsonDir);
      } catch {
        await fs.mkdir(jsonDir, { recursive: true });
        return [];
      }

      const files = await fs.readdir(jsonDir);
      let allPapers = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(jsonDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const papers = JSON.parse(content);
          allPapers = [...allPapers, ...papers];
        }
      }

      return allPapers;
    } catch (error) {
      console.error('读取JSON文件时出错:', error);
      return [];
    }
  });

  // 保存论文
  ipcMain.handle('save-papers', async (event, { papers, searchName }) => {
    try {
      const jsonDir = getDataDir();
      try {
        await fs.access(jsonDir);
      } catch {
        await fs.mkdir(jsonDir, { recursive: true });
      }

      const filePath = path.join(jsonDir, `${searchName.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
      let existingPapers = [];
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        existingPapers = JSON.parse(content);
      } catch {
        // 文件不存在，使用空数组
      }

      // 去重逻辑
      const newPapers = papers.filter(newPaper => 
        !existingPapers.some(existingPaper => 
          existingPaper.link === newPaper.link
        )
      );

      if (newPapers.length > 0) {
        const updatedPapers = [...existingPapers, ...newPapers];
        await fs.writeFile(filePath, JSON.stringify(updatedPapers, null, 2));
      }

      return { newPapersCount: newPapers.length };
    } catch (error) {
      console.error('保存JSON文件时出错:', error);
      throw error;
    }
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  // 注册 IPC 处理程序
  registerIpcHandlers();
  
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
}); 