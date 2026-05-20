document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('date');
    const diaryInput = document.getElementById('diary');
    const submitBtn = document.getElementById('submit-btn');
    const loadingOverlay = document.getElementById('loading-overlay'); // ローディングオーバーレイ要素を取得

    // 1. 今日の日付を自動入力
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    // 2. 送信処理
    submitBtn.addEventListener('click', async () => {
        const date = dateInput.value;
        const content = diaryInput.value;

        if (!content.trim()) {
            alert('日記を入力してください。');
            return;
        }

        // 送信中のUI状態
        submitBtn.disabled = true;
        submitBtn.textContent = '添削中...';
        loadingOverlay.classList.add('visible'); // ローディングスピナーを表示

        try {
            // 送信先のURL（適宜書き換えてください）
            const API_URL = 'https://script.google.com/macros/s/AKfycbwZZZhJ7DlwtqTYxdO0sJMek6PZqoudFtX4JyxYa7HirFL7B4ILBBckccjLVxBzUNx5Zw/exec';
            

            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    date: date,
                    content: content
                }),
            });

            // 今回はモックとして成功を想定
            // 本来は response.ok などをチェックします
            alert('Notionへデータを送信しました！');
            
            // 入力欄をクリア（任意）
            diaryInput.value = '';

        } catch (error) {
            console.error('Error:', error);
            alert('送信に失敗しました。');
        } finally {
            // UIを元に戻す
            submitBtn.disabled = false;
            submitBtn.textContent = 'AI先生に添削してもらう';
            loadingOverlay.classList.remove('visible'); // ローディングスピナーを非表示
        }
    });
});
