import { setupDarkModeToggle } from './components/darkModeToggle.js';
import { setupDiaryForm } from './components/diaryForm.js';
import { fetchDiaries, setupCalendar } from './app.js';

document.addEventListener("DOMContentLoaded", async () => {
    setupDarkModeToggle();
    // 既存の日記投稿フォームのセットアップ
    setupDiaryForm(); 

    // 日記データを取得し、カレンダーをセットアップ
    const diaries = await fetchDiaries();
    setupCalendar(diaries);
});