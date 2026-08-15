@echo off
setlocal
cd /d "%~dp0.."
call npm run memory:sync
exit /b %errorlevel%
