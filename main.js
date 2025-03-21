const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

try {
  require('electron-reloader')(module, {
    debug: true,
    watchRenderer: true
  });
} catch (_) { console.log('Error'); }

// 确保数据目录存在
const ensureDataDir = () => {
  const userDataPath = app.getPath('userData');
  const papersPath = path.join(userDataPath, 'papers');
  if (!fs.existsSync(papersPath)) {
    fs.mkdirSync(papersPath, { recursive: true });
  }
  return papersPath;
};

// 加载所有JSON文件
ipcMain.handle('load-all-papers', async () => {
  try {
    const papersPath = ensureDataDir();
    const files = fs.readdirSync(papersPath);
    let allPapers = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(papersPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const papers = JSON.parse(content);
        allPapers = allPapers.concat(papers);
      }
    }
    
    return allPapers;
  } catch (error) {
    console.error('读取JSON文件时出错:', error);
    return [];
  }
});

// 保存论文到JSON文件
ipcMain.handle('save-papers', async (event, { papers, searchName }) => {
  try {
    const papersPath = ensureDataDir();
    const fileName = `${searchName.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    const filePath = path.join(papersPath, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(papers, null, 2));
    
    return { success: true, newPapersCount: papers.length };
  } catch (error) {
    console.error('保存JSON文件时出错:', error);
    return { success: false, newPapersCount: 0 };
  }
});

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // 允许跨域请求
    }
  })

  win.loadFile('index.html')
  
  // 打开开发者工具
  win.webContents.openDevTools()
  
  // 在默认浏览器中打开外部链接
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
}) 