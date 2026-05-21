// ==========================================================
// ⚙️ 設定エリア（ここをご自身の情報に書き換えてください！）
// ==========================================================
const NOTION_API_KEY = PropertiesService.getScriptProperties().getProperty('NOTION_API_KEY');;
const DATABASE_ID    = PropertiesService.getScriptProperties().getProperty('DATABASE_ID');;

// ==========================================================
// 🚀 お友達からデータを受け取ったときに動く処理
// ==========================================================
function doGet(e) {
    const action = e.parameter.action;

    if (action === 'getDiaries') {
        return getDiaries();
    } else {
        return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' })).setMimeType(ContentService.MimeType.JSON);
    }
}

function getDiaries() {
    const notionEndpoint = `https://api.notion.com/v1/databases/${DATABASE_ID}/query`;
    const headers = {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
    };

    const options = {
        'method': 'post',
        'headers': headers,
        'payload': JSON.stringify({ sort: [{ property: "名前", direction: "descending" }] }), // 日付でソート
        'muteHttpExceptions': true
    };

    const response = UrlFetchApp.fetch(notionEndpoint, options);
    const jsonResponse = JSON.parse(response.getContentText());

    const diaries = jsonResponse.results.map(page => {
        const dateProperty = page.properties["名前"].title[0]?.text?.content; // '名前'列から日付を取得
        const textProperty = page.properties["添削元文章"].rich_text[0]?.text?.content; // '添削元文章'列から日記テキストを取得
        const correctionProperty = page.properties["添削"].rich_text[0]?.text?.content; // '添削'列から添削内容を取得

        return {
            date: dateProperty || "",
            text: textProperty || "",
            correction: correctionProperty || ""
        };
    });
    return ContentService.createTextOutput(JSON.stringify(diaries)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    // 1. お友達のブラウザから届いた日記の文字を取り出す
    const data = JSON.parse(e.postData.contents);
    const diaryDate = data.date || "日付未設定";
    const diaryText = data.content || "未入力";

    // 🤖 別ファイル（gemini.gs）に書いた関数を「そのまま」呼び出す！
    const geminiResult = callGeminiAPI(diaryText);
    const aiData = JSON.parse(geminiResult);
    // 2. Notionに送るためのデータ形式（パッケージ）を作る
    const url = 'https://api.notion.com/v1/pages';
    
    // Notionの「PROPERTY_NAME」で指定した列に、日記の本文を流し込む設定
    const notionData = {
      parent: { database_id: DATABASE_ID },
      properties: {
        "名前": { title: [{ text: { content: diaryDate } }] },
        "添削元文章": { rich_text: [{ text: { content: diaryText } }] },
        "添削": { rich_text: [{ text: { content: aiData.answer} }] }
      }
    };
    
    // 3. GoogleからNotionへデータを送信する設定
    const options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + NOTION_API_KEY,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      payload: JSON.stringify(notionData),
      muteHttpExceptions: true
    };

    // 4. 実際にNotionへ送信！
    const response = UrlFetchApp.fetch(url, options);

    // 5. お友達のブラウザに「成功したよ」と返事をする
    return ContentService.createTextOutput(geminiResult) // GeminiのJSONをそのまま入れる
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // もし途中で失敗したら、エラー内容を返事する
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
