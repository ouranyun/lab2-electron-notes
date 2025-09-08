const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// 启用调试日志
console.log('应用程序启动');

// 确保只有一个实例运行
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('已有实例在运行，退出当前实例');
  // 强制退出，确保进程终止
  app.exit(0);
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('检测到第二个实例启动');
    // 当运行第二个实例时，聚焦到主窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // 保持对窗口对象的全局引用，避免被垃圾回收
  let mainWindow;

  function createWindow() {
    console.log('开始创建窗口');
    try {
      // 检查index.html文件是否存在
      const indexPath = path.join(__dirname, 'index.html');
      if (fs.existsSync(indexPath)) {
        console.log(`找到index.html文件: ${indexPath}`);
      } else {
        console.error(`未找到index.html文件: ${indexPath}`);
      }

      // 创建浏览器窗口
      mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 600,
        minHeight: 400,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          nodeIntegration: true,
          contextIsolation: false,
          devTools: true, // 确保开发者工具可用
        },
        // 如果没有图标文件，可以注释掉这一行
        // icon: path.join(__dirname, 'icon.ico'),
      });

      // 加载应用的index.html
      mainWindow.loadFile(indexPath)
        .then(() => {
          console.log('成功加载index.html');
        })
        .catch(err => {
          console.error('加载index.html失败:', err);
        });

      // 打开开发者工具
      mainWindow.webContents.openDevTools();

      // 窗口关闭时触发
      mainWindow.on('closed', () => {
        console.log('窗口已关闭');
        // 取消引用窗口对象
        mainWindow = null;
      });

      // 监听渲染进程错误
      mainWindow.webContents.on('render-process-gone', (event, details) => {
        console.error('渲染进程崩溃:', details);
      });

      // 监听网页加载错误
      mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        console.error(`网页加载失败: ${errorDescription} (代码: ${errorCode})`);
      });
    } catch (err) {
      console.error('创建窗口时发生错误:', err);
    }
  }

  // 当Electron完成初始化并准备创建浏览器窗口时调用
  app.on('ready', () => {
    console.log('Electron初始化完成，准备创建窗口');
    createWindow();
  });

  // 当所有窗口都关闭时退出
  app.on('window-all-closed', () => {
    console.log('所有窗口已关闭');
    // 在macOS上，应用及其菜单栏通常保持活动状态，直到用户使用Cmd+Q明确退出
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    console.log('应用被激活');
    // 在macOS上，当点击dock图标且没有其他窗口打开时，通常会重新创建一个窗口
    if (mainWindow === null) {
      createWindow();
    }
  });

  // 监听应用退出
  app.on('will-quit', () => {
    console.log('应用即将退出');
  });

  // 监听未捕获的异常
  process.on('uncaughtException', (err) => {
    console.error('未捕获的异常:', err);
  });
}

// 可以在这里添加应用程序的其他事件监听器和功能