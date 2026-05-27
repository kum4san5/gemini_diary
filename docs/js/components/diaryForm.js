import { GAS_WEB_APP_URL } from '../config.js';

export function setupDiaryForm() {
    const dateInput = document.getElementById('date');
    const diaryInput = document.getElementById('diary');
    const submitBtn = document.getElementById('submit-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const resultArea = document.getElementById('result-area');
    const originalDisplay = document.getElementById('original-display');
    const correctedDisplay = document.getElementById('corrected-display');
    const feedbackDisplay = document.getElementById('feedback-display');
    const resetBtn = document.getElementById('reset-btn');

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
        resultArea.classList.add('hidden');

        try {
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                body: JSON.stringify({
                    date,
                    content,
                }),
            });

            const data = await response.json();

            if (data.status === 'success' || data.corrected_text) {
                originalDisplay.textContent = content;
                correctedDisplay.textContent = data.corrected_text || '修正文が見つかりませんでした。';
                feedbackDisplay.textContent = data.feedback || 'フィードバックはありません。';
                resultArea.classList.remove('hidden');
                diaryInput.value = '';
                resultArea.scrollIntoView({ behavior: 'smooth' });
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('送信に失敗しました。GAS側の設定やプロンプトを確認してください。');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'AI先生に添削してもらう';
            loadingOverlay.classList.remove('visible');
        }
    });

    resetBtn.addEventListener('click', () => {
        resultArea.classList.add('hidden');
        diaryInput.value = '';
        diaryInput.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
