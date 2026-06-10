@echo off
chcp 65001 >nul

net session >nul 2>&1
if not "%errorlevel%"=="0" (
  powershell.exe -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

netsh advfirewall firewall delete rule name="中汇黄金行情端口3001" >nul 2>&1
netsh advfirewall firewall add rule name="中汇黄金行情端口3001" dir=in action=allow protocol=TCP localport=3001 profile=private >nul

if errorlevel 1 (
  echo.
  echo 防火墙规则添加失败，请联系电脑管理员。
  echo.
  pause
  exit /b 1
)

echo.
echo 已允许同一局域网设备访问中汇黄金行情网站。
echo 此脚本每台门店电脑只需要运行一次。
echo.
pause
