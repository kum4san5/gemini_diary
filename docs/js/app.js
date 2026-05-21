import { setupDarkModeToggle } from './components/darkModeToggle.js';
import { setupDiaryForm } from './components/diaryForm.js';

let allDiaries = []; // 全日記データを保持する配列

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwZZZhJ7DlwtqTYxdO0sJMek6PZqoudFtX4JyxYa7HirFL7B4ILBBckccjLVxBzUNx5Zw/exec'; // ★★★ あなたのGASウェブアプリのURLに置き換えてください ★★★

async function fetchDiaries() {
    showLoadingSpinner();
    try {
        const response = await fetch(`${GAS_WEB_APP_URL}?action=getDiaries`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        allDiaries = data;
        console.log('Fetched diaries:', allDiaries);
        return allDiaries;
    } catch (error) {
        console.error('Error fetching diaries:', error);
        alert('日記データの取得中にエラーが発生しました。');
        return [];
    } finally {
        hideLoadingSpinner();
    }
}

function showLoadingSpinner() {
    document.getElementById('loading-overlay').classList.add('visible');
}

function hideLoadingSpinner() {
    document.getElementById('loading-overlay').classList.remove('visible');
}

function setupCalendar(diaries) {
    const diaryDates = diaries.map(diary => diary.date);
    
    flatpickr("#flatpickr-calendar", {
        dateFormat: "Y-m-d",
        inline: true,
        onDayCreate: (dObj, dStr, fp, dayElem) => {
            const date = dayElem.dateObj.toISOString().split('T')[0];
            if (diaryDates.includes(date)) {
                dayElem.classList.add('has-diary');
            }
        },
        onChange: (selectedDates, dateStr, instance) => {
            displayDiariesForDate(dateStr);
        }
    });
}

function displayDiariesForDate(dateStr) {
    const diaryDetailContainer = document.getElementById('diary-detail-container');
    diaryDetailContainer.innerHTML = ''; // クリア

    const diariesForSelectedDate = allDiaries.filter(diary => diary.date === dateStr);

    if (diariesForSelectedDate.length === 0) {
        diaryDetailContainer.innerHTML = '<p class="placeholder">この日の日記はありません。</p>';
        return;
    }

    diariesForSelectedDate.forEach(diary => {
        const diaryCard = `
            <div class="diary-card">
                <h3>${diary.text.substring(0, 50)}...</h3>
                <p>${diary.text}</p>
                <p class="correction">${diary.correction}</p>
            </div>
        `;
        diaryDetailContainer.innerHTML += diaryCard;
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    setupDarkModeToggle();
    // 既存の日記投稿フォームのセットアップ
    setupDiaryForm(); 

    // 日記データを取得し、カレンダーをセットアップ
    const diaries = await fetchDiaries();
    setupCalendar(diaries);
});
