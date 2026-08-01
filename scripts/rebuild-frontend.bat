@echo off
cd /d "%~dp0..\server\client"
echo === 重新构建前端 ===
npm run build
echo 构建完成！
pause
