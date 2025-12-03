# Phase 13: 判断結果を前提にした「次回トーナメント最適化フェーズ」ガイド

最終更新: 2025-01-30

このドキュメントは、Phase 13 の実施手順を説明するガイドです。

---

## 📋 目的

- 判断結果（GO/IMPROVE/SCALE）を前提に、次回トーナメントを最適化する
- 選ばれなかった選択肢は一切考慮しない
- 「もう迷わず次の1週間の動きに入れる状態」を作る

---

## 前提条件

- `docs/PHASE12_DECISION.md` が記入済み
- GO / IMPROVE / SCALE のいずれかが選択されている
- 本フェーズでは「選ばれなかった選択肢」は一切考慮しない

---

## Step A: 判断結果の読み取り

### A-1. `docs/PHASE12_DECISION.md` を読み取る

以下の情報を明確にする:

1. **選択された判断**: [GO / IMPROVE / SCALE]
2. **A問題（致命）**: [存在するか？ / 存在しない]
3. **B問題（改善）**: [上位3つをリストアップ]
4. **C問題（今回は無視）**: [何を意図的にやらないか？]

### A-2. 判断の検証

**重要**: A が1つでも残っている場合は、IMPROVE 以外を選ばない

- [ ] A が存在する場合、選択された判断が IMPROVE であることを確認
- [ ] A が存在しない場合、選択された判断が適切であることを確認

---

## Step B: フェーズ分岐（どれか1つだけ実行）

### Case 1: GO が選ばれた場合

**実施内容**:
1. `docs/PHASE13_GO_RUNBOOK.md` を参照
2. #02 実施の準備を行う
3. Creator 案内文を更新

**成果物**:
- `docs/PHASE13_GO_RUNBOOK.md` が完成している

---

### Case 2: IMPROVE が選ばれた場合

**実施内容**:
1. `docs/PHASE13_IMPROVE_TASKS.md` を参照
2. B問題を影響度 × 工数で並び替え
3. 上位3つだけを改善対象に選定
4. 改善タスクを実装（最大3タスク、各半日以内）

**成果物**:
- `docs/PHASE13_IMPROVE_TASKS.md` が完成している
- 改善タスクが実装完了している

---

### Case 3: SCALE が選ばれた場合

**実施内容**:
1. `docs/PHASE13_SCALE_BLUEPRINT.md` を参照
2. 現在「人がやっている作業」をすべて洗い出す
3. 自動化必須 / 半自動でOK / そもそも不要に分類
4. 優先順位を決定

**成果物**:
- `docs/PHASE13_SCALE_BLUEPRINT.md` が完成している
- 自動化対象が分類されている

---

## Step C: 次フェーズの開始条件を明文化

### C-1. Phase 13 の完了条件

**Case 1 (GO) の場合**:
- [ ] `docs/PHASE13_GO_RUNBOOK.md` が作成されている
- [ ] #02 実施の準備が整っている
- [ ] Creator 案内文が更新されている

**Case 2 (IMPROVE) の場合**:
- [ ] `docs/PHASE13_IMPROVE_TASKS.md` が作成されている
- [ ] 改善タスクが3つ以内に絞られている
- [ ] 各タスクの実装手順が明確になっている
- [ ] 改善タスクが実装完了している

**Case 3 (SCALE) の場合**:
- [ ] `docs/PHASE13_SCALE_BLUEPRINT.md` が作成されている
- [ ] 自動化対象が分類されている
- [ ] 優先順位が決定されている

---

### C-2. 次に進んで良い状態とは何か

**Case 1 (GO) の場合**:
- #02 を実施する準備が整っている
- 運用手順が明確になっている
- Creator への案内が準備できている

**Case 2 (IMPROVE) の場合**:
- 改善タスクの実装が完了している
- 改善内容がテストされている
- #02 を実施する準備が整っている

**Case 3 (SCALE) の場合**:
- 自動化設計が完了している
- 優先順位が決定されている
- Phase 14（自動化実装）に進む準備が整っている

---

### C-3. 判断を覆す条件があるか？

**判断を覆す条件**:
- A問題が新たに発見された場合 → IMPROVE に変更
- Creator からの反応が大きく変わった場合 → 判断を見直し
- 運用上の重大な問題が発見された場合 → 判断を見直し

---

## 完了条件

### 共通
- [ ] `docs/PHASE12_DECISION.md` が読み取られている
- [ ] 選択された判断（GO/IMPROVE/SCALE）が明確になっている
- [ ] A/B/C 問題が分類されている

### Case 1 (GO) の場合
- [ ] `docs/PHASE13_GO_RUNBOOK.md` が作成されている
- [ ] #02 実施の準備が整っている

### Case 2 (IMPROVE) の場合
- [ ] `docs/PHASE13_IMPROVE_TASKS.md` が作成されている
- [ ] 改善タスクが3つ以内に絞られている
- [ ] 改善タスクが実装完了している

### Case 3 (SCALE) の場合
- [ ] `docs/PHASE13_SCALE_BLUEPRINT.md` が作成されている
- [ ] 自動化対象が分類されている

---

## 重要な注意事項

### このフェーズでやらないこと
- ❌ 選ばれなかった選択肢の検討
- ❌ 新機能の実装（IMPROVE の場合を除く）
- ❌ 大規模なリファクタリング

### このフェーズでやること
- ✅ 選択された判断に基づく最適化
- ✅ 次フェーズへの明確な準備
- ✅ 「迷わず次の1週間の動きに入れる状態」の作成

---

## 関連ドキュメント

- [docs/PHASE12_DECISION.md](docs/PHASE12_DECISION.md): 判断ドキュメント
- [docs/PHASE13_GO_RUNBOOK.md](docs/PHASE13_GO_RUNBOOK.md): #02 実施用 Runbook
- [docs/PHASE13_IMPROVE_TASKS.md](docs/PHASE13_IMPROVE_TASKS.md): 改善タスク一覧
- [docs/PHASE13_SCALE_BLUEPRINT.md](docs/PHASE13_SCALE_BLUEPRINT.md): 自動化設計書
- [docs/PHASE11_LIVE_OPERATION.md](docs/PHASE11_LIVE_OPERATION.md): 本番運用実施手順書

