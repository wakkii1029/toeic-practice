# TOEIC Practice App

LLMを活用したTOEIC学習アプリ。問題生成・解説・解きなおし・単語帳の機能を備えています。

## セットアップ

### 1. 仮想環境の作成・有効化

```bash
# 仮想環境を作成
python -m venv venv

# 有効化（Windows コマンドプロンプト）
venv\Scripts\activate

# 有効化（Windows PowerShell）
venv\Scripts\Activate.ps1

# 有効化（Git Bash / WSL）
source venv/Scripts/activate
```

### 2. 依存パッケージのインストール

```bash
pip install -r requirements.txt
```

### 3. Ollama の準備

[Ollama](https://ollama.com/) をインストールし、モデルをダウンロードしてください。

```bash
ollama pull gemma3:12b
```

### 4. アプリの起動

```bash
python -m web.app
```

または `start.bat` をダブルクリックしてください。

ブラウザで http://localhost:8000 にアクセスすると使えます。

## 機能

| 機能 | 説明 |
|------|------|
| 問題を解く | Part 1〜7 を選択し、LLMで問題を生成。リスニング(Part 1-4)はTTSで音声再生対応 |
| 問題一覧 | 生成した問題の管理・削除 |
| 解きなおし | 間違えた問題をパート別に復習 |
| 単語帳 | 解説文からドラッグ選択で単語を追加。LLMによる自動解説＋自分のメモ |
| 設定 | LLMプロバイダー（Ollama / OpenAI互換API）、TTS音声・速度の設定 |

## 技術スタック

- **Backend**: FastAPI + Uvicorn
- **Frontend**: Jinja2 + Tailwind CSS (CDN) + Vanilla JS
- **LLM**: Ollama（ローカル）/ OpenAI互換API
- **TTS**: edge-tts
- **データ保存**: JSONファイル（`data/` ディレクトリ）
