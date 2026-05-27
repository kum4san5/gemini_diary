import { fetchDiaries, setupCalendar } from './app.js';
import { setupDashboard } from './components/dashboard.js';
import { setupDarkModeToggle } from './components/darkModeToggle.js';
import { setupDiaryForm } from './components/diaryForm.js';

document.addEventListener("DOMContentLoaded", async () => {
    setupDarkModeToggle();
    setupDashboard();
    setupDiaryForm();

    const diaries = await fetchDiaries();
    setupCalendar(diaries);
});
