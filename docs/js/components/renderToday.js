export function renderLifeBalanceSummary(balance) {
    const dimensions = balance.dimensions || [];
    return `
        <div class="life-balance-score">
            <strong>${balance.average || 0}</strong>
            <span>Life Balance</span>
        </div>
        <div class="life-balance-bars">
            ${dimensions.map((item) => `
                <div class="life-axis">
                    <div class="bar-label"><span>${escapeHtml(item.label)}</span><span>${item.value}/5</span></div>
                    <div class="bar-track"><span style="width:${Math.min(100, Math.max(0, item.value * 20))}%"></span></div>
                </div>
            `).join("")}
        </div>
        <div class="life-balance-context">
            <p>${balance.latestMood ? `気分 ${escapeHtml(balance.latestMood.mood || "普通")} / エネルギー ${escapeHtml(balance.latestMood.energy || "普通")}` : "今日の気分はまだ未記録です。"}</p>
            <p>${balance.latestFinance ? `自由月数 ${escapeHtml(balance.latestFinance.freeMonths || "未設定")} / 貯蓄率 ${escapeHtml(balance.latestFinance.savingRate || "未設定")}%` : "資産スナップショットは月1で十分です。"}</p>
            <p>${balance.activeLearningTopic ? `学習テーマ: ${escapeHtml(balance.activeLearningTopic.title || "Untitled")} / 次: ${escapeHtml(balance.activeLearningTopic.nextOutput || "小さなアウトプット")}` : "学習テーマを1つ置くと、次の一手につながります。"}</p>
        </div>
    `;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
