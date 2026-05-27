# Data Model Draft

## Task

```json
{
  "id": "task_001",
  "title": "応用情報 午前問題を解く",
  "parentId": null,
  "priority": "high",
  "category": "応用情報",
  "actualMinutes": 30,
  "memo": "セキュリティ分野を中心に復習",
  "links": [
    {
      "label": "教材サイト",
      "url": "https://example.com"
    }
  ],
  "status": "todo",
  "createdAt": "2026-05-27T00:00:00+09:00",
  "completedAt": null
}
```

## Learning Session

```json
{
  "id": "session_001",
  "genre": "応用情報",
  "tags": ["セキュリティ", "午前問題"],
  "startedAt": "2026-05-27T08:00:00+09:00",
  "endedAt": "2026-05-27T08:30:00+09:00",
  "actualMinutes": 30,
  "memo": "暗号化方式の整理。公開鍵暗号と共通鍵暗号の使い分けを復習した。",
  "relatedTaskIds": ["task_001"]
}
```

## Shortcut

```json
{
  "id": "shortcut_001",
  "title": "応用情報 教材",
  "category": "応用情報",
  "url": "https://example.com",
  "memo": "朝学習で使う教材"
}
```

## Customization

```json
{
  "theme": "light",
  "visibleWidgets": ["todo", "learningProgress", "shortcuts", "quickLog", "aiSecretary"],
  "widgetOrder": ["todo", "learningProgress", "quickLog", "shortcuts", "aiSecretary"],
  "genres": ["応用情報"],
  "tags": ["午前問題", "午後問題", "セキュリティ", "ネットワーク"]
}
```

