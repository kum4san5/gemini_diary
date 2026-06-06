import { GAS_WEB_APP_URL } from "../config.js";

const STORAGE_KEY = "lifeDashboardState";

const defaultState = {
    tasks: [
        {
            id: "task-1",
            title: "応用情報 過去問道場 セキュリティ 30問",
            priority: "今日中",
            area: "学習",
            category: "過去問道場",
            genre: "セキュリティ",
            estimatedMinutes: 30,
            memo: "",
            link: "",
            status: "準備中",
            completed: false,
        },
    ],
    logs: [],
    shortcuts: [
        { title: "過去問道場", category: "応用情報", url: "https://www.ap-siken.com/apkakomon.php" },
        { title: "Notion", category: "Knowledge", url: "https://www.notion.so/" },
        { title: "IPA 試験情報", category: "Official", url: "https://www.ipa.go.jp/shiken/" },
        { title: "TED", category: "English", url: "https://www.ted.com/" },
    ],
    syncStatus: "local",
};

const categoryByArea = {
    "学習": ["過去問道場", "模擬試験", "苦手復習", "知識整理", "動画", "読書", "その他"],
    "開発": ["開発", "調査", "実装", "設計", "テスト", "リファクタ", "その他"],
    "英語": ["日記", "リスニング", "スピーキング", "読解", "単語", "その他"],
    "創作": ["アイデア", "執筆", "制作", "公開", "その他"],
    "生活": ["家事", "予定", "買い物", "整理", "その他"],
    "お金": ["収入", "支出", "確認", "調査", "その他"],
    "健康": ["運動", "睡眠", "食事", "通院", "その他"],
    "その他": ["記録", "調査", "その他"],
};

function cloneDefaultState() {
    return JSON.parse(JSON.stringify(defaultState));
}

function loadLocalState() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return cloneDefaultState();
        return { ...cloneDefaultState(), ...JSON.parse(stored) };
    } catch (error) {
        console.warn("Failed to load dashboard state", error);
        return cloneDefaultState();
    }
}

function saveLocalState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function apiGet(action) {
    const response = await fetch(`${GAS_WEB_APP_URL}?action=${encodeURIComponent(action)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data && data.status === "error") throw new Error(data.message);
    return data;
}

async function apiPost(payload) {
    const response = await fetch(GAS_WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data && data.status === "error") throw new Error(data.message);
    return data;
}

async function loadRemoteState() {
    const [tasks, logs, shortcuts] = await Promise.all([
        apiGet("getTasks"),
        apiGet("getLearningLogs"),
        apiGet("getShortcuts"),
    ]);

    return {
        tasks: Array.isArray(tasks) ? tasks : [],
        logs: Array.isArray(logs) ? logs : [],
        shortcuts: Array.isArray(shortcuts) && shortcuts.length ? shortcuts : defaultState.shortcuts,
        syncStatus: "notion",
    };
}

function todayKey() {
    return new Date().toISOString().split("T")[0];
}

function normalizeDateKey(value) {
    return value ? String(value).split("T")[0] : "";
}

function statusLabel(task) {
    if (task.completed) return "完了";
    return task.status || "未着手";
}

function inferArea(text) {
    if (/英語|単語|リスニング|スピーキング|日記/.test(text)) return "英語";
    if (/開発|実装|コード|github|api|css|javascript|gas/i.test(text)) return "開発";
    if (/運動|睡眠|食事|健康/.test(text)) return "健康";
    if (/支出|収入|家計|お金/.test(text)) return "お金";
    if (/創作|執筆|制作|記事/.test(text)) return "創作";
    if (/掃除|買い物|生活|家事/.test(text)) return "生活";
    return "学習";
}

function inferCategory(text, area) {
    if (area === "開発") return /調査|確認/.test(text) ? "調査" : "開発";
    if (area === "英語") return /単語/.test(text) ? "単語" : "日記";
    if (area === "生活") return /買い物/.test(text) ? "買い物" : "予定";
    if (/模擬|試験/.test(text)) return "模擬試験";
    if (/苦手|復習/.test(text)) return "苦手復習";
    if (/整理|まとめ|知識/.test(text)) return "知識整理";
    if (/読書|本/.test(text)) return "読書";
    return "過去問道場";
}

function inferGenre(text) {
    const normalized = text.toLowerCase();
    const rules = [
        ["セキュリティ", /セキュリティ|暗号|認証|脆弱|攻撃/],
        ["ネットワーク", /ネットワーク|tcp|ip|dns|サブネット|ルータ/],
        ["データベース", /データベース|sql|正規化|db/],
        ["マネジメント", /マネジメント|品質|進捗|リスク|プロジェクト/],
        ["ストラテジ", /ストラテジ|経営|会計|法務/],
        ["システム開発", /設計|テスト|開発|要件/],
        ["アルゴリズム", /アルゴリズム|計算量|探索|ソート/],
    ];
    const match = rules.find(([, pattern]) => pattern.test(normalized));
    return match ? match[0] : "その他";
}

function calculateStreak(logs) {
    const dates = new Set(logs.map((log) => normalizeDateKey(log.date)));
    let streak = 0;
    const cursor = new Date();

    while (dates.has(cursor.toISOString().split("T")[0])) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
}

function calculateMetrics(state) {
    const today = todayKey();
    const todayLogs = state.logs.filter((log) => normalizeDateKey(log.date) === today);
    const todayMinutes = todayLogs.reduce((sum, log) => sum + Number(log.minutes || 0), 0);
    const completedCount = state.tasks.filter((task) => task.completed).length;
    const streak = calculateStreak(state.logs);
    const score = Math.min(todayMinutes, 180) + Math.min(streak * 5, 50) + completedCount * 5;

    return { todayMinutes, completedCount, streak, score };
}

function setSelectOptions(select, options, selectedValue) {
    select.innerHTML = options.map((option) => `<option>${option}</option>`).join("");
    if (selectedValue && options.includes(selectedValue)) {
        select.value = selectedValue;
    }
}

function renderTasks(state) {
    const list = document.getElementById("task-list");
    if (!list) return;

    list.innerHTML = state.tasks.length
        ? state.tasks
            .map((task) => `
                <article class="task-item">
                    <div class="task-main">
                        <input type="checkbox" data-task-toggle="${task.id}" ${task.completed ? "checked" : ""} aria-label="${task.title}を完了">
                        <p class="task-title ${task.completed ? "done" : ""}">${task.title}</p>
                    </div>
                    <div class="task-meta">
                        <span class="priority-pill">${task.priority || "今日中"}</span>
                        <span class="state-pill">${statusLabel(task)}</span>
                        <span class="status-pill">${task.area || "学習"}</span>
                        <span class="status-pill">${task.category || "未分類"}</span>
                        <span class="status-pill">${task.genre || "その他"}</span>
                        ${task.estimatedMinutes ? `<span class="status-pill">見積 ${task.estimatedMinutes}分</span>` : ""}
                    </div>
                    ${task.memo ? `<p class="task-memo">${task.memo}</p>` : ""}
                </article>
            `)
            .join("")
        : `<p class="placeholder">Todoはまだありません。今日の最初の一手を追加しましょう。</p>`;
}

function renderShortcuts(state) {
    const list = document.getElementById("shortcut-list");
    if (!list) return;

    list.innerHTML = state.shortcuts
        .map((shortcut) => `
            <a class="shortcut-card" href="${shortcut.url}" target="_blank" rel="noopener noreferrer">
                <strong>${shortcut.title}</strong>
                <span>${shortcut.category || "Shortcut"}</span>
            </a>
        `)
        .join("");
}

function renderLogs(state) {
    const list = document.getElementById("learning-log-list");
    if (!list) return;

    const latest = state.logs.slice(0, 4);
    list.innerHTML = latest.length
        ? latest
            .map((log) => {
                const tags = Array.isArray(log.tags) ? log.tags.join(",") : log.tags;
                return `
                    <article class="log-entry">
                        <strong>${log.minutes || 0}分 / ${log.category || "未分類"} / ${log.genre || "その他"}</strong>
                        <p>${log.memo || "メモなし"}${tags ? ` #${String(tags).replaceAll(",", " #")}` : ""}</p>
                    </article>
                `;
            })
            .join("")
        : `<p class="placeholder">まだ学習ログがありません。最初の1セッションを残しましょう。</p>`;
}

function renderMetrics(state) {
    const metrics = calculateMetrics(state);
    const minutesPercent = Math.min((metrics.todayMinutes / 180) * 100, 100);
    const streakPercent = Math.min((metrics.streak / 14) * 100, 100);
    const scoreAngle = Math.min((metrics.score / 250) * 360, 360);

    document.getElementById("today-minutes").textContent = `${metrics.todayMinutes}分`;
    document.getElementById("streak-days").textContent = `${metrics.streak}日`;
    document.getElementById("completed-count").textContent = `${metrics.completedCount}件`;
    document.getElementById("effort-score").textContent = metrics.score;
    document.getElementById("score-ring-value").textContent = metrics.score;
    document.getElementById("minutes-bar-label").textContent = `${metrics.todayMinutes} / 180`;
    document.getElementById("streak-bar-label").textContent = `${metrics.streak} / 14`;
    document.getElementById("minutes-bar").style.width = `${minutesPercent}%`;
    document.getElementById("streak-bar").style.width = `${streakPercent}%`;
    document.querySelector(".progress-ring").style.setProperty("--score-angle", `${scoreAngle}deg`);

    const summary = document.getElementById("ai-summary");
    if (metrics.todayMinutes === 0) {
        summary.textContent = "今日はまだ学習ログがありません。15分だけ進めると、起動が軽くなります。";
    } else {
        summary.textContent = `今日は${metrics.todayMinutes}分積み上がっています。次は苦手ジャンルを1つだけ復習すると、記録の質が上がります。`;
    }
}

function renderSyncStatus(state) {
    const pill = document.querySelector("#todo-board .panel-header > .status-pill");
    if (!pill) return;
    pill.textContent = state.syncStatus === "notion" ? "Notion同期" : "ローカル保存";
}

function render(state) {
    renderTasks(state);
    renderShortcuts(state);
    renderLogs(state);
    renderMetrics(state);
    renderSyncStatus(state);
}

function setupTaskForm(state) {
    const form = document.getElementById("task-form");
    if (!form) return;

    const titleInput = document.getElementById("task-title");
    const areaInput = document.getElementById("task-area");
    const categoryInput = document.getElementById("task-category");
    const genreInput = document.getElementById("task-genre");

    function updateTaskInferences() {
        const area = areaInput.value || inferArea(titleInput.value);
        const category = inferCategory(titleInput.value, area);
        setSelectOptions(categoryInput, categoryByArea[area] || categoryByArea["その他"], category);
        genreInput.value = inferGenre(titleInput.value);
    }

    titleInput.addEventListener("input", updateTaskInferences);
    areaInput.addEventListener("change", updateTaskInferences);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const title = titleInput.value.trim();
        if (!title) return;

        const task = {
            id: `task-${Date.now()}`,
            title,
            priority: document.getElementById("task-priority").value,
            area: areaInput.value,
            category: categoryInput.value,
            genre: genreInput.value,
            estimatedMinutes: Number(document.getElementById("task-estimated-minutes").value || 0),
            memo: document.getElementById("task-memo").value.trim(),
            link: document.getElementById("task-link").value.trim(),
            status: "準備中",
            completed: false,
        };

        state.tasks.unshift(task);
        form.reset();
        setSelectOptions(categoryInput, categoryByArea["学習"], "過去問道場");
        saveLocalState(state);
        render(state);

        try {
            const result = await apiPost({ action: "saveTask", ...task });
            if (result.task) {
                state.tasks[0] = result.task;
                state.syncStatus = "notion";
                saveLocalState(state);
                render(state);
            }
        } catch (error) {
            console.warn("saveTask fallback to localStorage", error);
            state.syncStatus = "local";
            render(state);
        }
    });
}

function setupTaskToggle(state) {
    const list = document.getElementById("task-list");
    if (!list) return;

    list.addEventListener("change", async (event) => {
        const taskId = event.target.dataset.taskToggle;
        if (!taskId) return;

        const task = state.tasks.find((item) => item.id === taskId);
        if (!task) return;

        task.completed = event.target.checked;
        task.status = task.completed ? "完了" : "未着手";
        task.completedAt = task.completed ? new Date().toISOString() : "";
        saveLocalState(state);
        render(state);

        try {
            const result = await apiPost({
                action: "updateTask",
                pageId: task.id,
                completed: task.completed,
                status: task.status,
                completedAt: task.completedAt,
            });
            if (result.task) Object.assign(task, result.task);
            state.syncStatus = "notion";
            saveLocalState(state);
            render(state);
        } catch (error) {
            console.warn("updateTask fallback to localStorage", error);
            state.syncStatus = "local";
            render(state);
        }
    });
}

function setupLearningLogForm(state) {
    const form = document.getElementById("learning-log-form");
    if (!form) return;

    const memoInput = document.getElementById("log-memo");
    memoInput.addEventListener("input", () => {
        const memo = memoInput.value;
        document.getElementById("log-category").value = inferCategory(memo, "学習");
        document.getElementById("log-genre").value = inferGenre(memo);
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const minutes = Number(document.getElementById("log-minutes").value);
        if (!minutes) return;

        const log = {
            id: `log-${Date.now()}`,
            date: todayKey(),
            minutes,
            area: "応用情報",
            category: document.getElementById("log-category").value,
            genre: document.getElementById("log-genre").value,
            understanding: document.getElementById("log-understanding").value,
            energy: document.getElementById("log-energy").value,
            tags: document.getElementById("log-tags").value.trim(),
            memo: memoInput.value.trim(),
        };

        state.logs.unshift(log);
        form.reset();
        saveLocalState(state);
        render(state);

        try {
            const result = await apiPost({ action: "saveLearningLog", ...log });
            if (result.learningLog) {
                state.logs[0] = result.learningLog;
                state.syncStatus = "notion";
                saveLocalState(state);
                render(state);
            }
        } catch (error) {
            console.warn("saveLearningLog fallback to localStorage", error);
            state.syncStatus = "local";
            render(state);
        }
    });
}

export async function setupDashboard() {
    const state = loadLocalState();
    render(state);
    setupTaskForm(state);
    setupTaskToggle(state);
    setupLearningLogForm(state);

    try {
        const remoteState = await loadRemoteState();
        Object.assign(state, remoteState);
        saveLocalState(state);
        render(state);
    } catch (error) {
        console.warn("Dashboard uses localStorage fallback", error);
        state.syncStatus = "local";
        render(state);
    }
}
