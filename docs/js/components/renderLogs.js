export function renderLogListHtml(logs, relationBadges, normalizeDateKey) {
    const latest = (logs || []).slice(0, 8);
    if (!latest.length) return `<p class="placeholder">まだ活動ログがありません。最初の1セッションを残しましょう。</p>`;

    return Object.entries(
        latest.reduce((groups, log) => {
            const key = normalizeDateKey(log.date) || "日付なし";
            groups[key] = groups[key] || [];
            groups[key].push(log);
            return groups;
        }, {})
    ).map(([date, groupedLogs]) => `
        <section class="log-date-group">
            <h3>${escapeHtml(date)}</h3>
            ${groupedLogs.map((log) => {
                const tags = Array.isArray(log.tags) ? log.tags.join(",") : log.tags;
                return `
                    <article class="log-entry">
                        <div class="log-entry-header">
                            <strong>${escapeHtml(log.area || "活動")} / ${escapeHtml(log.minutes || 0)}分 / ${escapeHtml(log.category || "未分類")} / ${escapeHtml(log.genre || "その他")}</strong>
                            <button class="item-action" type="button" data-detail-type="log" data-detail-id="${escapeHtml(log.id)}">詳細</button>
                        </div>
                        ${relationBadges(log)}
                        <p>${escapeHtml(log.memo || "メモなし")}${tags ? ` #${escapeHtml(String(tags).replaceAll(",", " #"))}` : ""}</p>
                    </article>
                `;
            }).join("")}
        </section>
    `).join("");
}

export function renderDailyReviewListHtml(reviews) {
    const latest = (reviews || []).slice(0, 5);
    if (!latest.length) return `<p class="placeholder">まだ日次レビューがありません。夜に今日を保存しましょう。</p>`;

    return latest.map((review) => `
        <article class="log-entry">
            <div class="log-entry-header">
                <strong>${escapeHtml(review.date || "日付なし")} / ${escapeHtml(review.mood || "普通")} / ${escapeHtml(review.studyMinutes || 0)}分</strong>
                <span class="status-pill">${escapeHtml((review.taskIds || []).length)} Todo / ${escapeHtml((review.learningLogIds || []).length)} Logs</span>
            </div>
            <p>${escapeHtml(review.aiSummary || review.highlights || review.reflection || "レビュー本文なし")}</p>
        </article>
    `).join("");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
