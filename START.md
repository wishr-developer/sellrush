# SELL RUSH - 起動ガイド

## 各プロジェクトの起動方法

現在のディレクトリ: `/Users/kutsuzawareo/Desktop/LP test/Xiora/DA`

### 1. 公式サイト (localhost:3000)

```bash
cd "sell-rush-lp"
npm install
npm run dev
```

### 2. インフルエンサー管理画面 (localhost:3001)

**新しいターミナルウィンドウで実行:**

```bash
cd "sell-rush-lp/sell-rush-influencer"
npm install
npm run dev
```

### 3. 企業管理画面 (localhost:3002)

**新しいターミナルウィンドウで実行:**

```bash
cd "sell-rush-lp/sell-rush-company"
npm install
npm run dev
```

### 4. 運営管理画面 (localhost:3003)

**新しいターミナルウィンドウで実行:**

```bash
cd "sell-rush-lp/sell-rush-admin"
npm install
npm run dev
```

## 一括起動スクリプト（オプション）

4つのターミナルを開いて、それぞれで上記のコマンドを実行してください。

または、`tmux`や`screen`を使用して複数のセッションを管理することもできます。

## 注意事項

- 各プロジェクトは**別々のターミナル**で起動してください
- すべてのプロジェクトで同じSupabase環境変数を使用します
- 初回起動時は各プロジェクトで`npm install`を実行してください

