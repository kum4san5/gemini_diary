import { setupDarkModeToggle } from "./components/darkModeToggle.js";
import { STORAGE_KEY } from "./components/state.js";
import {
    AP_IMPORTED_KEY,
    AP_MANIFEST_PATH,
    AP_SECTION_A,
    AP_SECTION_B,
    AP_STORAGE_KEY,
    buildLearningLogFromPractice,
    buildPeriodKey,
    buildPeriodSummaries,
    buildPracticeStats,
    createDefaultApState,
    filterQuestions,
    normalizeApState,
    normalizeQuestions,
    parseQuestionCsv,
    recordAnswer,
    saveQuestionNote,
    selectLatestQuestionPeriod,
    toggleBookmark,
    validateQuestionBank,
} from "./components/apPracticeEngine.js";

const app = {
    manifest: null,
    questions: [],
    state: loadApState(),
    activeQuestions: [],
    loadError: "",
};

document.addEventListener("DOMContentLoaded", async () => {
    setupDarkModeToggle();
    setupEvents();
    await loadQuestionBank();
    initializeSelection();
    render();
});

function loadApState() {
    try {
        const stored = localStorage.getItem(AP_STORAGE_KEY);
        return normalizeApState(stored ? JSON.parse(stored) : createDefaultApState());
    } catch (error) {
        console.warn("Failed to load AP state", error);
        return createDefaultApState();
    }
}

function saveApState() {
    localStorage.setItem(AP_STORAGE_KEY, JSON.stringify(app.state));
}

async function loadQuestionBank() {
    try {
        const manifestResponse = await fetch(AP_MANIFEST_PATH);
        if (!manifestResponse.ok) throw new Error(`manifest load failed: ${manifestResponse.status}`);
        app.manifest = await manifestResponse.json();
        const bundledFiles = app.manifest.questionFiles || [];
        const bundledQuestions = await Promise.all(bundledFiles.map(async (path) => {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`${path} load failed: ${response.status}`);
            return response.json();
        }));
        const imported = loadImportedQuestions();
        app.questions = mergeQuestions(normalizeQuestions([...bundledQuestions.flat(), ...imported]));
        app.loadError = "";
    } catch (error) {
        console.warn("Failed to load AP question bank", error);
        app.manifest = fallbackManifest();
        app.questions = loadImportedQuestions();
        app.loadError = "同梱問題の読み込みに失敗しました。インポート済みデータだけで表示しています。";
    }
}

function loadImportedQuestions() {
    try {
        return normalizeQuestions(JSON.parse(localStorage.getItem(AP_IMPORTED_KEY) || "[]"));
    } catch (error) {
        console.warn("Failed to load imported AP questions", error);
        return [];
    }
}

function setupEvents() {
    document.addEventListener("click", (event) => {
        const modeButton = event.target.closest("[data-ap-mode]");
        if (modeButton) {
            app.state.mode = modeButton.dataset.apMode;
            if (app.state.mode === "latest") selectLatestPeriod();
            saveApState();
            render();
            return;
        }

        const periodButton = event.target.closest("[data-ap-period]");
        if (periodButton) {
            app.state.mode = "year";
            app.state.selectedPeriodKey = periodButton.dataset.apPeriod;
            app.state.selectedQuestionId = "";
            resetSession();
            saveApState();
            render();
            return;
        }

        const choiceButton = event.target.closest("[data-ap-choice]");
        if (choiceButton) {
            answerCurrentQuestion(choiceButton.dataset.apChoice);
            return;
        }

        const selfScoreButton = event.target.closest("[data-ap-self-score]");
        if (selfScoreButton) {
            answerCurrentQuestion("", selfScoreButton.dataset.apSelfScore);
            return;
        }

        if (event.target.closest("[data-ap-prev]")) {
            moveQuestion(-1);
            return;
        }

        if (event.target.closest("[data-ap-next]")) {
            moveQuestion(1);
            return;
        }

        if (event.target.closest("[data-ap-bookmark]")) {
            const question = currentQuestion();
            if (!question) return;
            app.state.progress = toggleBookmark(app.state.progress, question.id);
            saveApState();
            render();
            return;
        }

        if (event.target.closest("[data-ap-save-note]")) {
            const question = currentQuestion();
            if (!question) return;
            const note = document.getElementById("ap-question-note")?.value || "";
            app.state.progress = saveQuestionNote(app.state.progress, question.id, note);
            saveApState();
            render();
            showApToast("復習メモを保存しました。", "success");
            return;
        }

        if (event.target.closest("[data-ap-save-log]")) {
            savePracticeLog();
        }
    });

    ["ap-section-filter", "ap-domain-filter", "ap-attempt-filter"].forEach((id) => {
        document.getElementById(id)?.addEventListener("change", () => {
            app.state.filters = {
                section: document.getElementById("ap-section-filter").value,
                domain: document.getElementById("ap-domain-filter").value,
                attempt: document.getElementById("ap-attempt-filter").value,
            };
            app.state.selectedQuestionId = "";
            resetSession();
            saveApState();
            render();
        });
    });

    document.getElementById("ap-import-file")?.addEventListener("change", importQuestions);
}

function initializeSelection() {
    if (!app.state.selectedPeriodKey) selectLatestPeriod();
}

function selectLatestPeriod() {
    const latest = selectLatestQuestionPeriod(app.questions, app.manifest || {});
    app.state.selectedPeriodKey = buildPeriodKey(latest.year, latest.season);
    app.state.selectedQuestionId = "";
    resetSession();
}

function resetSession() {
    app.state.session = {
        startedAt: new Date().toISOString(),
        questionIds: [],
        currentIndex: 0,
    };
}

function render() {
    renderMode();
    renderFilters();
    syncActiveQuestions();
    renderPeriods();
    renderQuestion();
    renderSidePanel();
}

function renderMode() {
    const labels = {
        latest: "最新年度",
        year: "年度別",
        domain: "分野別",
        review: "弱点復習",
        mock: "模擬セット",
    };
    document.querySelectorAll("[data-ap-mode]").forEach((button) => {
        const active = button.dataset.apMode === app.state.mode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
    document.getElementById("ap-mode-label").textContent = labels[app.state.mode] || "年度別";
    document.getElementById("ap-bank-status").textContent = `${app.questions.length}問`;
}

function renderFilters() {
    document.getElementById("ap-section-filter").value = app.state.filters.section;
    document.getElementById("ap-attempt-filter").value = app.state.filters.attempt;
    const domainSelect = document.getElementById("ap-domain-filter");
    const domains = uniqueValues(app.questions.map((question) => question.domain));
    const current = app.state.filters.domain;
    domainSelect.innerHTML = `<option value="all">すべて</option>${domains.map((domain) => `<option value="${escapeHtml(domain)}">${escapeHtml(domain)}</option>`).join("")}`;
    domainSelect.value = domains.includes(current) ? current : "all";
    app.state.filters.domain = domainSelect.value;
}

function syncActiveQuestions() {
    app.activeQuestions = filterQuestions(app.questions, app.state, app.manifest || {});
    if (app.state.mode === "mock") app.activeQuestions = app.activeQuestions.slice(0, 80);
    if (!app.activeQuestions.some((question) => question.id === app.state.selectedQuestionId)) {
        app.state.selectedQuestionId = app.activeQuestions[0]?.id || "";
    }
    app.state.session.questionIds = app.activeQuestions.map((question) => question.id);
    app.state.session.currentIndex = Math.max(0, app.activeQuestions.findIndex((question) => question.id === app.state.selectedQuestionId));
}

function renderPeriods() {
    const list = document.getElementById("ap-period-list");
    if (!list) return;
    const summaries = buildPeriodSummaries(app.manifest || {}, app.questions, app.state.progress);
    list.innerHTML = summaries.map((period) => {
        const active = period.periodKey === app.state.selectedPeriodKey && (app.state.mode === "year" || app.state.mode === "latest" || app.state.mode === "mock");
        const expectedA = period.expectedCounts?.[AP_SECTION_A] || 0;
        const expectedB = period.expectedCounts?.[AP_SECTION_B] || 0;
        const countA = period.sectionCounts[AP_SECTION_A] || 0;
        const countB = period.sectionCounts[AP_SECTION_B] || 0;
        return `
            <button class="ap-period-card ${active ? "active" : ""} ${period.collected ? "" : "is-empty"}" type="button" data-ap-period="${escapeHtml(period.periodKey)}">
                <span class="metric-label">${escapeHtml(period.periodLabel)}</span>
                <strong>${period.collected ? `${period.totalQuestions}問収録` : "データ未追加"}</strong>
                <small>科目A ${countA}/${expectedA} / 科目B ${countB}/${expectedB}</small>
                <small>回答 ${period.answered}問 / 正答率 ${period.accuracy}%</small>
            </button>
        `;
    }).join("");
}

function renderQuestion() {
    const question = currentQuestion();
    const body = document.getElementById("ap-question-body");
    const heading = document.getElementById("ap-question-heading");
    const context = document.getElementById("ap-question-context");
    if (!body || !heading || !context) return;

    if (!question) {
        const summary = currentPeriodSummary();
        heading.textContent = "問題データ未追加";
        context.textContent = summary?.periodLabel || "Question";
        body.innerHTML = `
            <div class="ap-empty-state">
                <p class="eyebrow">Need Import</p>
                <h3>${escapeHtml(summary?.periodLabel || "選択年度")} はまだ問題データがありません。</h3>
                <p>IPA公式の過去問題を確認し、JSON/CSV化したデータを左下の「問題データを追加」から取り込めます。</p>
                <a class="action-link" href="${escapeHtml(summary?.sourceUrl || app.manifest?.officialProblemUrl || "#")}">IPA公式ページを開く</a>
            </div>
        `;
        return;
    }

    const answered = app.state.progress.answered[question.id];
    heading.textContent = `${question.periodLabel} ${question.section} 問${question.number}`;
    context.textContent = `${question.domain} / ${question.category}`;
    body.innerHTML = `
        <article class="ap-question-card">
            <div class="ap-question-meta">
                <span>${escapeHtml(question.sourceLabel)}</span>
                <span>${escapeHtml(question.keywords.join(" / "))}</span>
            </div>
            <p class="ap-question-text">${escapeHtml(question.body)}</p>
            ${question.imageRefs.map((src) => `<img class="ap-question-image" src="${escapeHtml(src)}" alt="問題図表">`).join("")}
            ${question.section === AP_SECTION_A ? renderChoices(question, answered) : renderSectionB(question, answered)}
        </article>
    `;
}

function renderChoices(question, answered) {
    return `
        <div class="ap-choice-list">
            ${question.choices.map((choice) => {
                const selected = answered?.answer?.includes(choice.key);
                const expected = question.answer.includes(choice.key);
                const className = [
                    selected ? "selected" : "",
                    answered && expected ? "correct" : "",
                    answered && selected && !expected ? "wrong" : "",
                ].filter(Boolean).join(" ");
                return `<button class="ap-choice ${className}" type="button" data-ap-choice="${escapeHtml(choice.key)}"><strong>${escapeHtml(choice.key)}</strong><span>${escapeHtml(choice.text)}</span></button>`;
            }).join("")}
        </div>
        ${answered ? `<p class="${answered.correct ? "pass-text" : "danger-text"}">${answered.correct ? "正解" : "不正解"} / 正答: ${escapeHtml(question.answer.join(", "))}</p>` : ""}
    `;
}

function renderSectionB(question, answered) {
    return `
        <div class="ap-section-b-list">
            ${(question.subQuestions || []).map((sub) => `
                <article class="ap-sub-question">
                    <h3>${escapeHtml(sub.number)}</h3>
                    <p>${escapeHtml(sub.prompt)}</p>
                    <div class="ap-choice-list compact">
                        ${sub.choices.map((choice) => `<div class="ap-choice passive"><strong>${escapeHtml(choice.key)}</strong><span>${escapeHtml(choice.text)}</span></div>`).join("")}
                    </div>
                    <p class="metric-note">確認用正答: ${escapeHtml((sub.answer || []).join(", "))}</p>
                </article>
            `).join("")}
        </div>
        <div class="ap-self-score">
            <button type="button" data-ap-self-score="correct">理解できた</button>
            <button class="secondary-btn" type="button" data-ap-self-score="wrong">復習に入れる</button>
        </div>
        ${answered ? `<p class="${answered.correct ? "pass-text" : "danger-text"}">${answered.correct ? "理解済みとして記録" : "復習キューに追加済み"}</p>` : ""}
    `;
}

function renderSidePanel() {
    const target = document.getElementById("ap-side-panel");
    if (!target) return;
    const question = currentQuestion();
    const stats = buildPracticeStats(app.activeQuestions, app.state.progress);
    const bookmarked = question && app.state.progress.bookmarks.includes(question.id);
    const note = question ? app.state.progress.notes[question.id] || "" : "";
    target.innerHTML = `
        <div class="panel-header">
            <div>
                <p class="eyebrow">Progress</p>
                <h2>${escapeHtml(currentPeriodSummary()?.periodLabel || "AP Practice")}</h2>
            </div>
            <span class="status-pill">${stats.accuracy}%</span>
        </div>
        ${app.loadError ? `<p class="danger-text">${escapeHtml(app.loadError)}</p>` : ""}
        <section class="ap-stat-grid">
            <article><span>対象</span><strong>${stats.total}</strong></article>
            <article><span>回答</span><strong>${stats.answered}</strong></article>
            <article><span>正解</span><strong>${stats.correct}</strong></article>
            <article><span>復習</span><strong>${app.state.progress.reviewQueue.length}</strong></article>
        </section>
        ${question ? `
            <section class="lab-side-block">
                <h3>解説</h3>
                <p>${escapeHtml(question.explanation || "解説は未入力です。")}</p>
                <div class="lab-keywords">${question.keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")}</div>
            </section>
            <section class="lab-side-block">
                <h3>復習メモ</h3>
                <textarea id="ap-question-note" placeholder="間違えた理由、次に見る観点">${escapeHtml(note)}</textarea>
                <div class="ap-actions">
                    <button type="button" data-ap-save-note>メモ保存</button>
                    <button class="secondary-btn" type="button" data-ap-bookmark>${bookmarked ? "解除" : "ブックマーク"}</button>
                </div>
            </section>
            <section class="lab-side-block">
                <h3>出典</h3>
                <p>${escapeHtml(question.sourceLabel)}</p>
                <a class="action-link" href="${escapeHtml(question.sourceUrl)}">公式ページ</a>
            </section>
        ` : `
            <section class="lab-side-block">
                <h3>未収録年度</h3>
                <p>左の年度一覧で「データ未追加」と出る年度は、JSON/CSVを追加すると演習できます。</p>
            </section>
        `}
        <div class="ap-actions">
            <button type="button" data-ap-save-log ${stats.answered ? "" : "disabled"}>Learning Logへ保存</button>
        </div>
    `;
}

function answerCurrentQuestion(answer, selfScore = "") {
    const question = currentQuestion();
    if (!question) return;
    const { progress, result } = recordAnswer(app.state.progress, question, answer, { selfScore });
    app.state.progress = progress;
    saveApState();
    render();
    showApToast(result.correct ? "正解として記録しました。" : "復習キューに入れました。", result.correct ? "success" : "error");
}

function moveQuestion(direction) {
    if (!app.activeQuestions.length) return;
    const currentIndex = Math.max(0, app.activeQuestions.findIndex((question) => question.id === app.state.selectedQuestionId));
    const nextIndex = Math.min(app.activeQuestions.length - 1, Math.max(0, currentIndex + direction));
    app.state.selectedQuestionId = app.activeQuestions[nextIndex].id;
    saveApState();
    render();
}

async function importQuestions(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const resultTarget = document.getElementById("ap-import-result");
    try {
        const text = await file.text();
        const parsed = file.name.endsWith(".csv") ? null : JSON.parse(text);
        const imported = file.name.endsWith(".csv")
            ? parseQuestionCsv(text)
            : normalizeQuestions(parsed.questions || parsed);
        const validation = validateQuestionBank(imported);
        const validIds = new Set(validation.rows.filter((row) => row.ok).map((row) => row.id));
        const validQuestions = imported.filter((question) => validIds.has(question.id));
        const stored = mergeQuestions([...loadImportedQuestions(), ...validQuestions]);
        localStorage.setItem(AP_IMPORTED_KEY, JSON.stringify(stored));
        await loadQuestionBank();
        initializeSelection();
        saveApState();
        render();
        resultTarget.innerHTML = `<p class="pass-text">${validQuestions.length}問を追加しました。</p>${validation.ok ? "" : `<p class="danger-text">一部の問題に不備があります。</p>`}`;
    } catch (error) {
        console.warn("AP import failed", error);
        resultTarget.innerHTML = `<p class="danger-text">取り込みに失敗しました。JSON/CSV形式を確認してください。</p>`;
    } finally {
        event.target.value = "";
    }
}

function savePracticeLog() {
    const period = currentPeriodSummary();
    const section = app.state.filters.section === AP_SECTION_B ? "科目B" : "年度別";
    const log = buildLearningLogFromPractice({
        questions: app.activeQuestions,
        progress: app.state.progress,
        periodLabel: period?.periodLabel || "応用情報",
        minutes: elapsedMinutes(app.state.session.startedAt),
        mode: section,
    });
    const dashboardState = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const logs = Array.isArray(dashboardState.logs) ? dashboardState.logs : [];
    dashboardState.logs = [log, ...logs];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboardState));
    showApToast("AP演習をLearning Logへ保存しました。", "success");
}

function currentQuestion() {
    return app.activeQuestions.find((question) => question.id === app.state.selectedQuestionId) || null;
}

function currentPeriodSummary() {
    const summaries = buildPeriodSummaries(app.manifest || {}, app.questions, app.state.progress);
    return summaries.find((period) => period.periodKey === app.state.selectedPeriodKey) || summaries[0];
}

function mergeQuestions(questions) {
    const map = new Map();
    questions.forEach((question) => map.set(question.id, question));
    return Array.from(map.values());
}

function uniqueValues(values) {
    return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "ja"));
}

function elapsedMinutes(startedAt) {
    const started = new Date(startedAt).getTime();
    if (!Number.isFinite(started)) return 1;
    return Math.max(1, Math.round((Date.now() - started) / 60000));
}

function fallbackManifest() {
    return {
        latestOfficialYear: 2025,
        latestOfficialSeason: "秋期",
        officialProblemUrl: "https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html",
        periods: [],
    };
}

function showApToast(message, type = "info") {
    const toast = document.getElementById("ap-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `lab-toast ${type}`;
    window.clearTimeout(showApToast.timer);
    showApToast.timer = window.setTimeout(() => {
        toast.textContent = "";
        toast.className = "lab-toast";
    }, 2600);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
