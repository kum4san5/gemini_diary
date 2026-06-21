export function renderSchemaCheckResultHtml(result) {
    const rows = Array.isArray(result?.results) ? result.results : [];
    if (!rows.length) return `<p class="placeholder">チェック結果がありません。</p>`;

    const missingRows = rows.filter((row) => row.missingDatabaseId || (row.missingProperties || []).length);
    const okCount = rows.length - missingRows.length;
    return `
        ${renderMissingPropertySummary(rows)}
        <div class="schema-check-grid">
            ${missingRows.length ? missingRows.map((row) => {
                const missing = row.missingProperties || [];
                return `
                    <article class="schema-check-item missing">
                        <div class="schema-check-heading">
                            <strong>${escapeHtml(row.name || row.key)}</strong>
                            <span class="status-pill">${row.missingDatabaseId ? "DB ID未設定" : `${missing.length}件不足`}</span>
                        </div>
                        <p>${escapeHtml(row.key || "")}</p>
                        ${row.missingDatabaseId
                            ? `<p class="danger-text">Script Propertiesに ${escapeHtml(row.key)} を追加してください。</p>`
                            : `<ul class="schema-missing-list">${missing.map((property) => `<li>${escapeHtml(property)}</li>`).join("")}</ul>`
                        }
                    </article>
                `;
            }).join("") : `
                <article class="schema-check-item ok">
                    <strong>All OK</strong>
                    <p>Notion DBの必須プロパティは揃っています。</p>
                </article>
            `}
            ${okCount ? `
                <details class="schema-ok-details">
                    <summary>OKのDB ${okCount}件</summary>
                    <div class="schema-ok-list">
                        ${rows.filter((row) => !row.missingDatabaseId && !(row.missingProperties || []).length)
                            .map((row) => `<span class="status-pill">${escapeHtml(row.name || row.key)}</span>`)
                            .join("")}
                    </div>
                </details>
            ` : ""}
        </div>
    `;
}

export function renderMissingPropertySummary(rows) {
    const missingRows = rows.filter((row) => row.missingDatabaseId || (row.missingProperties || []).length);
    if (!missingRows.length) {
        return `
            <section class="schema-missing-summary ok">
                <strong>Notion DB整合性はOKです。</strong>
                <p>不足プロパティはありません。</p>
            </section>
        `;
    }

    const copyText = missingRows.map((row) => {
        if (row.missingDatabaseId) return `${row.name || row.key}\nMissing DB ID: ${row.key}`;
        return `${row.name || row.key}\nMissing: ${(row.missingProperties || []).join(", ")}`;
    }).join("\n\n");

    return `
        <section class="schema-missing-summary">
            <strong>Notion側で直す項目: ${missingRows.length} DB</strong>
            <p>不足しているDB IDまたはプロパティだけを表示しています。以下を見ながらNotion DBを修正してください。</p>
            <textarea readonly aria-label="不足プロパティのコピー用テキスト">${escapeHtml(copyText)}</textarea>
        </section>
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
