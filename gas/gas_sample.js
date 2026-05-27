function doGet(e) {
    const action = e.parameter.action;

    if (action === 'getDiaries') {
        return getDiaries();
    } else {
        return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' })).setMimeType(ContentService.MimeType.JSON);
    }
}

function getDiaries() {
    // Notionデータベースからデータを取得するロジックをここに実装します。
    // 例としてダミーデータを返します。
    const dummyDiaries = [
        { "date": "2026-05-21", "text": "お昼の日記", "correction": "お昼の添削" },
        { "date": "2026-05-21", "text": "夜の日記", "correction": "夜の添削" },
        { "date": "2026-05-20", "text": "昨日の日記", "correction": "昨日の添削" },
        { "date": "2026-05-18", "text": "一昨日の日記", "correction": "一昨日の添削" }
    ];

    // 実際にはNotion APIからデータをフェッチし、上記の形式に整形する
    // Notion APIとの連携については、別途Notion APIのドキュメントを参照してください。
    // 例: Database Query - https://developers.notion.com/reference/post-database-query

    return ContentService.createTextOutput(JSON.stringify(dummyDiaries)).setMimeType(ContentService.MimeType.JSON);
}