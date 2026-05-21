import { setupDarkModeToggle } from './components/darkModeToggle.js';
import { setupDiaryForm } from './components/diaryForm.js';
import { fetchDiaries, setupCalendar } from './app.js'; // app.jsから関数をインポート

// GASウェブアプリのURLを設定
// ★★★ あなたのGASウェブアプリのURLに置き換えてください ★★★
const GAS_WEB_APP_URL = 'YOUR_GAS_WEB_APP_URL_HERE'; 

document.addEventListener('DOMContentLoaded', async () => {
    setupDarkModeToggle();
    setupDiaryForm();

    // 日記データを取得し、カレンダーをセットアップ
    const diaries = await fetchDiaries(GAS_WEB_APP_URL);
    setupCalendar(diaries);
});
