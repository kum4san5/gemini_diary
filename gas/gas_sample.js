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

function getDiaries() {
  // 1. スクリプトプロパティから安全にトークンとIDを取得
  const props = PropertiesService.getScriptProperties();
  const NOTION_API_KEY = PropertiesService.getScriptProperties().getProperty('NOTION_API_KEY');;
  const DATABASE_ID    = PropertiesService.getScriptProperties().getProperty('DATABASE_ID');;

  if (!NOTION_API_KEY || !DATABASE_ID) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": "GASのスクリプトプロパティにNOTION_SECRETまたはNOTION_DATABASE_IDが設定されていません。"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. Notion APIのデータベース検索用URL
  const url = `https://api.notion.com/v1/databases/${DATABASE_ID}/query`;

  // 3. Notion APIを叩くための設定（リクエストヘッダー）
  const options = {
    "method": "post",
    "headers": {
      "Authorization": "Bearer " + NOTION_API_KEY,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json"
    },
    "muteHttpExceptions": true
  };

  try {
    // 4. Notionからデータを一括取得
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());

    if (response.getResponseCode() !== 200) {
      return ContentService.createTextOutput(JSON.stringify({
        "status": "error",
        "message": "Notion APIエラー: " + json.message
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. Notionの複雑なデータ構造を、フロント用のシンプルな配列に変換
    // ※ プロパティ名（'日付'、'内容'、'添削内容'など）は、実際のNotionの列名に合わせてください
    const diaries = json.results.map(page => {
      const props = page.properties;

      // 日付の取得 (Date型プロパティ)
      let date = "";
      if (props['日付'] && props['日付'].title && props['日付'].title.length > 0) {
        date = props['日付'].title[0].plain_text; // タイトルからテキストを抽出！
      }

      // 日記本文の取得 (Rich Text または Titleプロパティ)
      // ※ もし本文がタイトル(主キー)なら props['タイトル'].title[0]... になります
      let text = "";
      if (props['添削元文章'] && props['添削元文章'].rich_text && props['添削元文章'].rich_text.length > 0) {
        text = props['添削元文章'].rich_text[0].plain_text;
      }

      // 添削文の取得 (Rich Text型プロパティ)
      let correction = "";
      if (props['添削'] && props['添削'].rich_text && props['添削'].rich_text.length > 0) {
        correction = props['添削'].rich_text[0].plain_text;
      }

      return {
        "date": date,
        "text": text,
        "correction": correction
      };
    });

    // 日付が新しい順（降順）に並び替える（お好みで）
    diaries.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 6. フロントエンド（JavaScript）にJSONとして返却
    return ContentService.createTextOutput(JSON.stringify(diaries))
                         .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": "GASエラー: " + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}