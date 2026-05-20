export function setupDiaryForm() {
    const dateInput = document.getElementById('date');
    const diaryInput = document.getElementById('diary');
    const submitBtn = document.getElementById('submit-btn');
    const loadingOverlay = document.getElementById('loading-overlay');

    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    submitBtn.addEventListener('click', async () => {
        const date = dateInput.value;
        const content = diaryInput.value;

        if (!content.trim()) {
            alert('日記を入力してください。');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '添削中...';
        loadingOverlay.classList.add('visible');

        try {
            const API_URL = 'https://script.google.com/macros/s/AKfycbwZZZhJ7DlwtqTYxdO0sJMek6PZqoudFtX4JyxYa7HirFL7B4ILBBckccjLVxBzUNx5Zw/exec';
            
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    date: date,
                    content: content
                }),
            });

            alert('Notionへデータを送信しました！');
            
            diaryInput.value = '';

        } catch (error) {
            console.error('Error:', error);
            alert('送信に失敗しました。');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'AI先生に添削してもらう';
            loadingOverlay.classList.remove('visible');
        }
    });
}
