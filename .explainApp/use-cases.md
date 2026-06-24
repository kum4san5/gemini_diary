# ユースケース

このアプリは「何を記録するか」より先に、「どうやって動き始めるか」を助けます。

## 1. 朝の開始

```mermaid
sequenceDiagram
    participant U as User
    participant T as Today
    participant S as Start Console
    participant R as Resource
    U->>T: アプリを開く
    T->>S: 今日の一手を表示
    U->>S: 5分だけ始める
    S->>R: 関連Resourceを開く
    U->>S: 記録する
```

成功状態:
- 最初に見るものが1つに絞られている
- 5分だけなら始められる
- 終了後にLearning Logが残る

## 2. 学習開始

例: 応用情報のネットワークを進めたい。

1. Todayを開く。
2. Start Consoleに「過去問道場 ネットワーク」が出る。
3. 「開くもの」から過去問道場を開く。
4. 15分集中する。
5. 終了後にログを保存する。

得られるもの:
- 学習時間
- 関連Goal
- 関連Resource
- 苦手ジャンルの履歴

## 3. 開発作業開始

例: Life DashboardのUIを直したい。

```mermaid
flowchart LR
    A[Task: UI改善] --> B[GitHub / Local Path / Notion]
    B --> C[5分開始]
    C --> D[実装]
    D --> E[Learning Log]
    E --> F[Project進捗]
```

ポイント:
- 開発環境やIssueを探す時間を減らす
- TaskにResourceを紐づけるとStart Consoleに出る
- 完了できなくても「着手した」ことが実績になる

## 4. Cloud Questで学習する

例: 認証エラー、DB権限、疑似障害対応を実践したい。

1. ヘッダーのLearning Labを開く。
2. Quest一覧から好きなQuestを選ぶ。ロックはないので、気になるものから始める。
3. Terminalで `help` を実行し、CLIコマンドを確認する。
4. Cloud ConsoleでAPI、Function、DB、IAM、Logsの状態を見る。
5. 達成条件を満たしたらLearning Logへ保存する。

```mermaid
flowchart LR
    A[Learning Lab] --> B[Questを選ぶ]
    B --> C[Terminal / Cloud Console / Code Runner]
    C --> D{達成条件OK?}
    D -->|Yes| E[Learning Logへ保存]
    D -->|No| C
    E --> F[TodayやLogsに反映]
```

Sandbox Mode:
- Questとは別の自由実践環境
- 失敗や寄り道も学習ログにできる
- CLI、疑似クラウド、JS handlerを好きに触れる

## 5. 応用情報を年度別に解く

例: 直近年度から本番形式で弱点を見つけたい。

1. ヘッダーのAP Practiceを開く。
2. 初期表示の最新年度を1問ずつ解く。
3. 間違えた問題は自動で弱点復習に入る。
4. 年度別で2025年度、2024年度などに切り替える。
5. 未収録年度は公式IPAページを確認し、JSON/CSVで追加する。
6. 演習結果をLearning Logへ保存する。

```mermaid
flowchart LR
    A[AP Practice] --> B[最新年度]
    A --> C[年度別]
    A --> D[分野別]
    B --> E[採点]
    C --> E
    D --> E
    E --> F[弱点復習]
    E --> G[Learning Log]
```

## 6. SNSやゲームに流れそうな時の復帰

1. Todayを開く。
2. Reminderで「15分後」を押す。
3. 「5分だけ始める」を押す。
4. Resourceを1つだけ開く。
5. 5分後に「今日はここまで」でもよい。
6. 15分後の通知で、必要ならもう一度Todayへ戻る。

狙い:
- 罪悪感ではなく、復帰の導線を作る
- 長時間の集中ではなく、最初の摩擦を下げる
- サイトを開いている間だけ、静かに戻るきっかけを作る

```mermaid
flowchart LR
    A[脱線しそう] --> B[Todayを開く]
    B --> C[15分後Reminder]
    B --> D[5分だけ開始]
    D --> E[記録 or 今日はここまで]
    C --> B
```

## 7. 夜の振り返り

1. Logsタブを開く。
2. 日次レビューに気分、エネルギー、よかったこと、明日の一手を入れる。
3. 今日のLearning LogとTodoが関連づく。

```mermaid
flowchart TD
    A[Learning Logs] --> C[Daily Review]
    B[Completed Tasks] --> C
    C --> D[Tomorrow Action]
    D --> E[翌日のStart Console]
```

## 8. 予定が多い日の時間設計

1. TodayのDay Plannerを開く。
2. 固定勤務がない日は「固定勤務を使う」を外す。
3. 仕事、遊び、移動、家事、休息などの予定ブロックを追加する。
4. 月〜日のタブを切り替えながら、残った自由時間にTodoを割り当てる。
5. Quick Logや集中セッションを記録すると、週間/月間実績チャートに積み上がる。

```mermaid
flowchart LR
    A[現実の予定] --> B[予定ブロック]
    B --> C[残りの自由時間]
    C --> D[Todoを割り当て]
    D --> E[曜日ごとのタイムチャート]
    E --> F[記録後に週/月実績]
```

## 9. 週次レビュー

週次では、細かい入力を増やさず、以下だけ見る。

- どのGoalが進んだか
- どの領域が偏ったか
- 次の週に減らすもの
- 次の週に1つ増やすもの

## 10. 資産形成の月次確認

目的は家計簿ではなく、人生の選択肢が増えている感覚を得ること。

1. 月末にLife Balanceの「月次資産 / 学習テーマ」を開く。
2. 現金、投資、負債、貯蓄率、自由月数を入れる。
3. 来月の小さな改善を1つ決める。

```mermaid
flowchart LR
    A[FinanceSnapshot] --> B[自由月数]
    B --> C[安心感]
    C --> D[挑戦余力]
    D --> E[次の小さな行動]
```
