import { setupDarkModeToggle } from './components/darkModeToggle.js';
import { setupDiaryForm } from './components/diaryForm.js';
import { fetchDiaries, setupCalendar } from './app.js'; // app.jsから関数をインポート

// GASウェブアプリのURLを設定
// ★★★ あなたのGASウェブアプリのURLに置き換えてください ★★★
document.addEventListener('DOMContentLoaded', async () => {
    setupDarkModeToggle();
    setupDiaryForm();

    // 日記データを取得し、カレンダーをセットアップ
    const diaries = await fetchDiaries(); // app.js内でGAS_WEB_APP_URLを使用
    setupCalendar(diaries);
});
