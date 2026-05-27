import { setupDarkModeToggle } from './components/darkModeToggle.js';
import { setupDiaryForm } from './components/diaryForm.js';
import { fetchDiaries, setupCalendar } from './app.js';

export function updateDiaryList(diaries) {
  const diaryList = document.getElementById('diary-list');
  if (!diaryList) return;

  diaryList.innerHTML = ''; // リストをクリア

  diaries.forEach(diary => {
    const listItem = document.createElement('li');
    listItem.textContent = `${diary.date}: ${diary.title}`;
    // 他の表示要素やイベントリスナーをここに追加することもできます
    diaryList.appendChild(listItem);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
    setupDarkModeToggle();
    // 既存の日記投稿フォームのセットアップ
    setupDiaryForm(); 

    // 日記データを取得し、カレンダーをセットアップ
    const diaries = await fetchDiaries();
    setupCalendar(diaries);
});
