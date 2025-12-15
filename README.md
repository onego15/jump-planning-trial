# 🍄 Plumber's Path Planner

**AIエージェントの計画能力をデモンストレーションする、マリオ風3Dアクションゲーム**

![Game Screenshot](./ゲーム画面イメージ.png)

## 概要

Plumber's Path Plannerは、AIエージェントが事前に立てた**一度きりの完璧な行動計画**に基づいて、自動でコースを攻略する3Dアクションゲームです。プレイヤーは直接操作を行わず、AIの計画能力を観察します。

### 特徴

- 🎮 **マリオ風のビジュアル**: ローポリゴン＋トゥーンシェーディングで描かれた、明るくポップな世界
- 🤖 **AIプランニング**: OpenAI APIを使用してゴールまでの最適な経路を計画
- 🎯 **物理演算**: リアルな重力、ジャンプ、衝突判定
- 🌟 **ランダムマップ生成**: 毎回異なるステージが自動生成される
- ⏱️ **チャレンジモード**: 30秒以内にゴールのスターを取得

## 技術スタック

- **Three.js**: 3Dグラフィックスレンダリング
- **Vite**: 高速な開発サーバーとビルドツール
- **OpenAI API**: AIプランニング（オプション）
- **JavaScript (ES6+)**: モダンなJavaScript

## セットアップ

### 必要な環境

- Node.js (v16以上)
- npm または yarn

### インストール

```bash
# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:5173` を開いてください。

### ビルド

```bash
# 本番用ビルド
npm run build

# ビルド結果をプレビュー
npm run preview
```

## 使い方

### デモモード（OpenAI APIなし）

1. ブラウザでゲームを開く
2. **START GAME** ボタンをクリック
3. AIが簡単なデモプランに従って自動でプレイします

### OpenAI APIを使用する場合

`src/main.js` の `startBtn` イベントリスナー内で、APIキーを設定してください：

```javascript
startBtn.addEventListener('click', () => {
    const apiKey = 'your-openai-api-key-here';
    this.gameManager.startGame(apiKey);
});
```

または、環境変数 `VITE_OPENAI_API_KEY` を設定します：

```bash
# .env.local ファイルを作成
echo "VITE_OPENAI_API_KEY=your-api-key" > .env.local
```

そして `src/main.js` を修正：

```javascript
startBtn.addEventListener('click', () => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    this.gameManager.startGame(apiKey);
});
```

## ゲームの仕組み

### クラス構成

#### 1. **LevelGenerator**
- ランダムにブロック（足場）を配置してコースを生成
- スタート地点の土管とゴールのスターを配置
- 高低差のあるパズル要素を自動生成

#### 2. **PlumberAgent**
- マリオ風の2-3頭身キャラクター
- 物理演算（重力、慣性、ジャンプ）
- アクション: 前進、回転、ジャンプ、勝利ポーズ、やられモーション

#### 3. **GameManager**
- ゲーム全体の進行管理
- OpenAI APIとの連携
- プランの実行とタイマー管理

### AIプランニング

AIは以下の情報を受け取り、行動計画を立てます：

```json
{
  "start": {"x": 0, "y": 0, "z": 0},
  "goal": {"x": 8, "y": 5, "z": 4},
  "blocks": [
    {"id": 1, "x": 0, "y": 0, "z": 0, "type": "ground"},
    {"id": 2, "x": 2, "y": 0, "z": 1, "type": "brick"}
  ],
  "constraints": {
    "maxJumpHeight": 1.5,
    "maxJumpDistance": 2.0
  }
}
```

AIの出力（行動計画）：

```json
{
  "plan": [
    "MOVE_FORWARD",
    "MOVE_FORWARD",
    "JUMP",
    "MOVE_FORWARD",
    "TURN_RIGHT",
    "JUMP"
  ]
}
```

### 利用可能なアクション

- `MOVE_FORWARD`: 前進
- `TURN_RIGHT`: 右に90度回転
- `TURN_LEFT`: 左に90度回転
- `JUMP`: ジャンプ（移動中も可能）

## カスタマイズ

### マップサイズの変更

`src/LevelGenerator.js` の `gridSize` パラメータを変更：

```javascript
const levelGenerator = new LevelGenerator(scene, 15); // デフォルトは12
```

### キャラクターの物理パラメータ

`src/PlumberAgent.js` の物理定数を調整：

```javascript
this.gravity = -0.03;        // 重力
this.jumpForce = 0.4;        // ジャンプ力
this.moveSpeed = 0.1;        // 移動速度
this.maxJumpHeight = 1.5;    // 最大ジャンプ高さ
this.maxJumpDistance = 2.0;  // 最大ジャンプ距離
```

### 制限時間の変更

`src/GameManager.js` の `timeRemaining` を変更：

```javascript
this.timeRemaining = 30; // 秒単位
```

## ファイル構成

```
plumbers-path-planner/
├── index.html              # メインHTMLファイル
├── package.json            # プロジェクト設定
├── src/
│   ├── main.js            # メインアプリケーション
│   ├── LevelGenerator.js  # マップ生成クラス
│   ├── PlumberAgent.js    # キャラクタークラス
│   └── GameManager.js     # ゲーム管理クラス
├── 仕様.md                # 仕様書
└── README.md              # このファイル
```

## トラブルシューティング

### ゲームが起動しない

- ブラウザのコンソールでエラーを確認
- Node.jsとnpmのバージョンを確認
- `npm install` を再実行

### キャラクターが動かない

- START GAMEボタンを押したか確認
- ブラウザのコンソールでエラーを確認
- デモモードで動作するか確認

### OpenAI APIエラー

- APIキーが正しいか確認
- APIの利用制限を確認
- ネットワーク接続を確認

## ライセンス

MIT License

## 作者

AI Coding Demo Project

## 謝辞

- Three.js コミュニティ
- マリオシリーズにインスパイアされたビジュアルデザイン
