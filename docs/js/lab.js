import { setupDarkModeToggle } from "./components/darkModeToggle.js";
import { STORAGE_KEY } from "./components/state.js";
import {
    buildLearningLogFromQuest,
    buildLearningLogFromSandbox,
    createQuestSession,
    createSandboxSession,
    evaluateQuest,
    executeCommand,
    LAB_QUESTS,
    LAB_STORAGE_KEY,
    questById,
    runCodeTests,
    summarizeHistory,
} from "./components/labEngine.js";

const state = loadLabState();

document.addEventListener("DOMContentLoaded", () => {
    setupDarkModeToggle();
    setupEvents();
    render();
});

function createDefaultLabState() {
    return {
        mode: "quest",
        selectedQuestId: LAB_QUESTS[0].id,
        activeTool: "terminal",
        filters: {
            domain: "all",
            difficulty: "all",
            status: "all",
        },
        progress: {},
        questSessions: {},
        sandboxSession: createSandboxSession(),
        sandboxGenre: "セキュリティ",
        sandboxMemo: "",
        lastCodeResult: null,
    };
}

function loadLabState() {
    try {
        const stored = localStorage.getItem(LAB_STORAGE_KEY);
        return normalizeLabState(stored ? JSON.parse(stored) : createDefaultLabState());
    } catch (error) {
        console.warn("Failed to load learning lab state", error);
        return createDefaultLabState();
    }
}

function normalizeLabState(raw) {
    const fallback = createDefaultLabState();
    const normalized = {
        ...fallback,
        ...(raw || {}),
        filters: { ...fallback.filters, ...(raw?.filters || {}) },
        progress: raw?.progress || {},
        questSessions: raw?.questSessions || {},
        sandboxSession: raw?.sandboxSession || fallback.sandboxSession,
    };
    if (!LAB_QUESTS.some((quest) => quest.id === normalized.selectedQuestId)) {
        normalized.selectedQuestId = LAB_QUESTS[0].id;
    }
    if (!normalized.questSessions[normalized.selectedQuestId]) {
        normalized.questSessions[normalized.selectedQuestId] = createQuestSession(normalized.selectedQuestId);
    }
    return normalized;
}

function saveLabState() {
    localStorage.setItem(LAB_STORAGE_KEY, JSON.stringify(state));
}

function setupEvents() {
    document.addEventListener("click", (event) => {
        const modeButton = event.target.closest("[data-lab-mode]");
        if (modeButton) {
            state.mode = modeButton.dataset.labMode;
            saveLabState();
            render();
            return;
        }

        const questButton = event.target.closest("[data-lab-quest]");
        if (questButton) {
            state.mode = "quest";
            state.selectedQuestId = questButton.dataset.labQuest;
            ensureQuestSession(state.selectedQuestId);
            saveLabState();
            render();
            return;
        }

        const toolButton = event.target.closest("[data-lab-tool]");
        if (toolButton) {
            state.activeTool = toolButton.dataset.labTool;
            saveLabState();
            render();
            return;
        }

        if (event.target.closest("[data-lab-reset]")) {
            resetCurrentEnvironment();
            return;
        }

        if (event.target.closest("[data-quest-complete]")) {
            completeQuest();
            return;
        }

        if (event.target.closest("[data-sandbox-save]")) {
            saveSandboxPractice();
            return;
        }

        if (event.target.closest("[data-code-run]")) {
            runCode();
        }
    });

    document.getElementById("lab-terminal-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = document.getElementById("lab-terminal-input");
        const command = input.value.trim();
        if (!command) return;
        runTerminalCommand(command);
        input.value = "";
    });

    ["lab-domain-filter", "lab-difficulty-filter", "lab-status-filter"].forEach((id) => {
        document.getElementById(id)?.addEventListener("change", () => {
            state.filters = {
                domain: document.getElementById("lab-domain-filter").value,
                difficulty: document.getElementById("lab-difficulty-filter").value,
                status: document.getElementById("lab-status-filter").value,
            };
            saveLabState();
            renderQuestList();
        });
    });

    document.addEventListener("change", (event) => {
        if (event.target.id === "sandbox-genre") {
            state.sandboxGenre = event.target.value;
            saveLabState();
        }
    });

    document.addEventListener("input", (event) => {
        if (event.target.id === "sandbox-memo") {
            state.sandboxMemo = event.target.value;
            saveLabState();
        }
    });
}

function ensureQuestSession(questId) {
    if (!state.questSessions[questId]) state.questSessions[questId] = createQuestSession(questId);
    return state.questSessions[questId];
}

function currentSession() {
    return state.mode === "sandbox" ? state.sandboxSession : ensureQuestSession(state.selectedQuestId);
}

function setCurrentSession(session) {
    if (state.mode === "sandbox") state.sandboxSession = session;
    else state.questSessions[state.selectedQuestId] = session;
}

function render() {
    renderMode();
    renderFilters();
    renderQuestList();
    renderWorkspace();
    renderSidePanel();
}

function renderMode() {
    document.querySelectorAll("[data-lab-mode]").forEach((button) => {
        const active = button.dataset.labMode === state.mode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
    document.getElementById("lab-mode-label").textContent = state.mode === "sandbox" ? "Sandbox Mode" : "Quest Mode";
}

function renderFilters() {
    const filterMap = {
        "lab-domain-filter": state.filters.domain,
        "lab-difficulty-filter": state.filters.difficulty,
        "lab-status-filter": state.filters.status,
    };
    Object.entries(filterMap).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.value = value;
    });
}

function renderQuestList() {
    const list = document.getElementById("lab-quest-list");
    if (!list) return;
    const quests = LAB_QUESTS.filter((quest) => {
        const progress = state.progress[quest.id];
        if (state.filters.domain !== "all" && !matchesQuestDomain(quest, state.filters.domain)) return false;
        if (state.filters.difficulty !== "all" && quest.difficulty !== state.filters.difficulty) return false;
        if (state.filters.status === "completed" && !progress?.completed) return false;
        if (state.filters.status === "open" && progress?.completed) return false;
        return true;
    });
    list.innerHTML = quests.map((quest, index) => {
        const progress = state.progress[quest.id];
        const active = state.mode === "quest" && state.selectedQuestId === quest.id;
        return `
            <button class="lab-quest-card ${active ? "active" : ""}" type="button" data-lab-quest="${escapeHtml(quest.id)}">
                <span class="metric-label">Quest ${index + 1} / ${escapeHtml(quest.domain)}</span>
                <strong>${escapeHtml(quest.title)}</strong>
                <small>${escapeHtml(quest.difficulty)} / ${quest.estimatedMinutes}分${progress?.completed ? " / 完了" : ""}</small>
            </button>
        `;
    }).join("") || `<p class="placeholder">条件に合うQuestがありません。</p>`;
}

function matchesQuestDomain(quest, domain) {
    const keywords = quest.apKeywords || [];
    return quest.domain === domain
        || quest.genre === domain
        || quest.title.includes(domain)
        || keywords.some((keyword) => keyword.includes(domain) || domain.includes(keyword));
}

function renderWorkspace() {
    renderToolTabs();
    renderTerminal();
    renderCloudConsole();
    renderCodeRunner();
}

function renderToolTabs() {
    document.querySelectorAll("[data-lab-tool]").forEach((button) => {
        const active = button.dataset.labTool === state.activeTool;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-lab-tool-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.labToolPanel !== state.activeTool;
    });
}

function renderTerminal() {
    const session = currentSession();
    const output = document.getElementById("lab-terminal-output");
    if (!output) return;
    output.innerHTML = session.history.length
        ? session.history.slice(-18).map((item) => `<p class="${escapeHtml(item.type)}">${escapeHtml(item.text)}</p>`).join("")
        : `<p class="placeholder">help でコマンド一覧を表示できます。</p>`;
    output.scrollTop = output.scrollHeight;
}

function renderCloudConsole() {
    const cloud = currentSession().cloudState;
    const target = document.getElementById("lab-cloud-console");
    if (!target) return;
    target.innerHTML = `
        ${cloudCard("API Gateway", cloud.api.online ? "online" : "offline", cloud.api.secureRequiresApiKey ? "API Key required" : "public health check")}
        ${cloudCard("Function", cloud.function.broken ? "broken" : `v${cloud.function.version}`, cloud.function.deployed ? "deployed" : "not deployed")}
        ${cloudCard("Database", `${cloud.database.tables.orders.length} orders`, cloud.database.online ? "online" : "offline")}
        ${cloudCard("Storage", cloud.storage.public ? "public" : "private", cloud.storage.objects.join(", "))}
        ${cloudCard("IAM", (cloud.iam.function || []).join(", ") || "none", "function role")}
        ${cloudCard("Logs", `${cloud.logs.length} entries`, cloud.logs.slice(-1)[0]?.message || "No logs")}
    `;
}

function renderCodeRunner() {
    const source = document.getElementById("lab-code-source");
    if (source && source.value !== currentSession().codeSource) source.value = currentSession().codeSource;
    const result = document.getElementById("lab-code-result");
    if (!result) return;
    if (!state.lastCodeResult) {
        result.innerHTML = `<p class="placeholder">handler(event) を編集してテストを実行できます。</p>`;
        return;
    }
    result.innerHTML = state.lastCodeResult.results.map((item) => `
        <article class="lab-test-result ${item.pass ? "pass" : "fail"}">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${item.pass ? "PASS" : "FAIL"}</span>
            ${item.error ? `<p>${escapeHtml(item.error)}</p>` : `<p>${escapeHtml(JSON.stringify(item.actual))}</p>`}
        </article>
    `).join("");
}

function renderSidePanel() {
    const target = document.getElementById("lab-side-panel");
    if (!target) return;
    if (state.mode === "sandbox") {
        target.innerHTML = renderSandboxPanel();
        return;
    }
    const quest = questById(state.selectedQuestId);
    const session = currentSession();
    const evaluation = evaluateQuest(quest, session);
    const progress = state.progress[quest.id];
    target.innerHTML = `
        <div class="panel-header">
            <div>
                <p class="eyebrow">Quest Brief</p>
                <h2>${escapeHtml(quest.title)}</h2>
            </div>
            <span class="status-pill">${progress?.completed ? "完了" : quest.difficulty}</span>
        </div>
        <p class="ai-summary">${escapeHtml(quest.scenario)}</p>
        <section class="lab-side-block">
            <h3>達成条件</h3>
            ${renderQuestCheckList(evaluation)}
        </section>
        <section class="lab-side-block">
            <h3>${escapeHtml(quest.conceptTitle)}</h3>
            <p>${escapeHtml(quest.conceptSummary)}</p>
            <div class="lab-keywords">${quest.apKeywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")}</div>
        </section>
        <section class="lab-side-block">
            <h3>確認メモ</h3>
            <p>${escapeHtml(quest.checkQuestion)}</p>
            <textarea id="quest-note" placeholder="${escapeHtml(quest.expectedAnswer)}">${escapeHtml(progress?.note || "")}</textarea>
        </section>
        <div class="lab-actions">
            <button type="button" data-quest-complete ${evaluation.complete ? "" : "disabled"}>QuestをLearning Logへ保存</button>
            <button class="secondary-btn" type="button" data-lab-reset>環境リセット</button>
        </div>
    `;
}

function renderQuestCheckList(evaluation) {
    const passedItems = evaluation.passed.map((label) => `<p class="pass-text">OK ${escapeHtml(label)}</p>`);
    const missingItems = evaluation.missing.map((label) => `<p>TODO ${escapeHtml(label)}</p>`);
    return [...passedItems, ...missingItems].join("") || `<p>TODO まずTerminalで実行してみましょう。</p>`;
}

function renderSandboxPanel() {
    return `
        <div class="panel-header">
            <div>
                <p class="eyebrow">Free Practice</p>
                <h2>Sandbox Mode</h2>
            </div>
            <span class="status-pill">自由実践</span>
        </div>
        <p class="ai-summary">Questの達成条件に縛られず、CLI、疑似クラウド、Code Runnerを自由に触れます。</p>
        <section class="lab-side-block">
            <h3>最近の操作</h3>
            <p>${escapeHtml(summarizeHistory(state.sandboxSession.history))}</p>
        </section>
        <section class="lab-side-block">
            <h3>Learning Logへ保存</h3>
            <label>ジャンル
                <select id="sandbox-genre">
                    ${["セキュリティ", "ネットワーク", "API", "DB", "IAM", "障害対応"].map((genre) => `<option ${state.sandboxGenre === genre ? "selected" : ""}>${genre}</option>`).join("")}
                </select>
            </label>
            <label>メモ
                <textarea id="sandbox-memo" placeholder="試したこと、分かったこと">${escapeHtml(state.sandboxMemo || "")}</textarea>
            </label>
        </section>
        <div class="lab-actions">
            <button type="button" data-sandbox-save>Sandbox実践を保存</button>
            <button class="secondary-btn" type="button" data-lab-reset>環境リセット</button>
        </div>
    `;
}

function runTerminalCommand(command) {
    const { session } = executeCommand(currentSession(), command, {
        questId: state.mode === "quest" ? state.selectedQuestId : "",
    });
    setCurrentSession(session);
    markLastRun();
    saveLabState();
    render();
}

function resetCurrentEnvironment() {
    if (state.mode === "sandbox") state.sandboxSession = createSandboxSession();
    else state.questSessions[state.selectedQuestId] = createQuestSession(state.selectedQuestId);
    state.lastCodeResult = null;
    saveLabState();
    render();
    showLabToast("環境をリセットしました。");
}

function runCode() {
    const source = document.getElementById("lab-code-source").value;
    const session = currentSession();
    session.codeSource = source;
    const result = runCodeTests(source);
    pushSyntheticHistory(session, result.ok ? "Code tests passed" : "Code tests failed");
    setCurrentSession(session);
    state.lastCodeResult = result;
    saveLabState();
    render();
}

function completeQuest() {
    const quest = questById(state.selectedQuestId);
    const session = currentSession();
    const evaluation = evaluateQuest(quest, session);
    if (!evaluation.complete) {
        showLabToast("まだ達成条件が残っています。", "error");
        return;
    }
    const note = document.getElementById("quest-note")?.value.trim() || "";
    const log = buildLearningLogFromQuest(quest, session, note, elapsedMinutes(session));
    appendLearningLog(log);
    state.progress[quest.id] = {
        completed: true,
        completedAt: new Date().toISOString(),
        lastRunAt: new Date().toISOString(),
        note,
    };
    saveLabState();
    render();
    showLabToast("QuestをLearning Logへ保存しました。", "success");
}

function saveSandboxPractice() {
    const memo = document.getElementById("sandbox-memo")?.value.trim() || "";
    const genre = document.getElementById("sandbox-genre")?.value || state.sandboxGenre;
    state.sandboxMemo = memo;
    state.sandboxGenre = genre;
    const log = buildLearningLogFromSandbox(state.sandboxSession, memo, genre, elapsedMinutes(state.sandboxSession));
    appendLearningLog(log);
    saveLabState();
    render();
    showLabToast("Sandbox実践をLearning Logへ保存しました。", "success");
}

function appendLearningLog(log) {
    const dashboardState = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const logs = Array.isArray(dashboardState.logs) ? dashboardState.logs : [];
    dashboardState.logs = [log, ...logs];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboardState));
}

function markLastRun() {
    if (state.mode !== "quest") return;
    state.progress[state.selectedQuestId] = {
        ...(state.progress[state.selectedQuestId] || {}),
        lastRunAt: new Date().toISOString(),
    };
}

function elapsedMinutes(session) {
    const started = new Date(session.startedAt).getTime();
    if (!Number.isFinite(started)) return 1;
    return Math.max(1, Math.round((Date.now() - started) / 60000));
}

function pushSyntheticHistory(session, text) {
    session.history.push({ at: new Date().toISOString(), type: "output", text });
}

function cloudCard(title, value, detail) {
    return `
        <article class="lab-cloud-card">
            <span class="metric-label">${escapeHtml(title)}</span>
            <strong>${escapeHtml(value)}</strong>
            <small>${escapeHtml(detail || "")}</small>
        </article>
    `;
}

function showLabToast(message, type = "info") {
    const toast = document.getElementById("lab-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `lab-toast ${type}`;
    window.clearTimeout(showLabToast.timer);
    showLabToast.timer = window.setTimeout(() => {
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
