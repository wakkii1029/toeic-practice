@echo off
cd /d "%~dp0"
echo Starting TOEIC Practice App...
echo http://localhost:8000 でアクセスしてください
python -m web.app
pause
