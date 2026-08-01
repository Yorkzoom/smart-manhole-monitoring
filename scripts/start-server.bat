@echo off
cd /d "%~dp0..\server"
echo === 智能井盖监测系统 - 网站服务器 ===
echo 启动中...
node server.js
if errorlevel 1 (
  echo 启动失败！请先运行 npm install 安装依赖
  pause
)
