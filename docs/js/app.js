import { GAS_WEB_APP_URL } from './config.js';

let allDiaries = [];

function showLoadingSpinner() {
    document.getElementById('loading-overlay').classList.add('visible');
}

function hideLoadingSpinner() {
    document.getElementById('loading-overlay').classList.remove('visible');
}

export function setupCalendar(diaries) {
    const diaryDates = diaries.map((diary) => diary.date);

    flatpickr("#flatpickr-calendar", {
        dateFormat: "Y-m-d",
        inline: true,
        onDayCreate: (dObj, dStr, fp, dayElem) => {
            const date = dayElem.dateObj.toISOString().split("T")[0];
            if (diaryDates.includes(date)) {
                dayElem.classList.add("has-diary");
            }
        },
        onChange: (selectedDates, dateStr) => {
            displayDiariesForDate(dateStr);
        },
    });
}

export function displayDiariesForDate(dateStr) {
    const diaryDetailContainer = document.getElementById("diary-detail-container");
    diaryDetailContainer.innerHTML = "";

    const diariesForSelectedDate = allDiaries.filter((diary) => diary.date === dateStr);

    if (diariesForSelectedDate.length === 0) {
        diaryDetailContainer.innerHTML = `<p class="placeholder">この日の日記はまだありません。</p>`;
        return;
    }

    diariesForSelectedDate.forEach((diary) => {
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

export async function fetchDiaries() {
    showLoadingSpinner();
    try {
        const response = await fetch(`${GAS_WEB_APP_URL}?action=getDiaries`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        allDiaries = Array.isArray(data) ? data : [];
        return allDiaries;
    } catch (error) {
        console.error("Error fetching diaries:", error);
        alert("日記データの取得中にエラーが発生しました。");
        return [];
    } finally {
        hideLoadingSpinner();
    }
}
