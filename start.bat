@echo off
cd /d "%~dp0"

if not exist venv\Scripts\activate.bat (
    echo 仮想環境が見つかりません。作成します...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

echo Starting TOEIC Practice App...
echo http://localhost:8000 でアクセスしてください
python -m web.app
pause
