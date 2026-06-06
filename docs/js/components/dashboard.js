import { GAS_WEB_APP_URL } from "../config.js";

const STORAGE_KEY = "lifeDashboardState";

const apCategories = ["過去問道場", "模擬試験", "苦手復習", "知識整理", "動画", "読書", "調査", "その他"];
const apGenres = ["セキュリティ", "ネットワーク", "データベース", "マネジメント", "ストラテジ", "システム開発", "アルゴリズム", "その他"];

const categoryByArea = {
    "学習": apCategories,
    "応用情報": apCategories,
    "プログラミング": ["開発", "調査", "実装", "設計", "テスト", "リファクタ", "その他"],
    "開発": ["開発", "調査", "実装", "設計", "テスト", "リファクタ", "その他"],
    "英語": ["日記", "リスニング", "スピーキング", "読解", "単語", "その他"],
    "読書": ["技術書", "ビジネス", "自己理解", "小説", "英語", "メモ", "その他"],
    "創作": ["アイデア", "執筆", "制作", "公開", "その他"],
    "生活": ["家事", "買い物", "予定", "整理", "手続き", "その他"],
    "お金": ["収入", "支出", "確認", "調査", "その他"],
    "健康": ["運動", "睡眠", "食事", "通院", "その他"],
    "その他": ["記録", "調査", "その他"],
};

const genreByArea = {
    "学習": apGenres,
    "応用情報": apGenres,
    "プログラミング": ["フロントエンド", "バックエンド", "GAS", "Notion", "DB", "UI", "テスト", "設計", "その他"],
    "開発": ["フロントエンド", "バックエンド", "GAS", "Notion", "DB", "UI", "テスト", "設計", "その他"],
    "英語": ["語彙", "文法", "発音", "リスニング", "スピーキング", "ライティング", "読解", "その他"],
    "読書": ["技術", "ビジネス", "自己理解", "小説", "学習", "メモ", "その他"],
    "創作": ["文章", "デザイン", "アイデア", "構成", "公開", "その他"],
    "生活": ["家事", "買い物", "予定", "健康", "整理", "手続き", "その他"],
    "お金": ["収入", "支出", "投資", "固定費", "調査", "その他"],
    "健康": ["運動", "睡眠", "食事", "メンタル", "通院", "その他"],
    "その他": ["その他"],
};

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
    notes: [],
    shortcuts: [
        { title: "過去問道場", category: "応用情報", url: "https://www.ap-siken.com/apkakomon.php" },
        { title: "Notion", category: "Knowledge", url: "https://www.notion.so/" },
        { title: "IPA 試験情報", category: "Official", url: "https://www.ipa.go.jp/shiken/" },
        { title: "TED", category: "English", url: "https://www.ted.com/" },
    ],
    syncStatus: "local",
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
    const [tasks, logs, notes, shortcuts] = await Promise.all([
        apiGet("getTasks"),
        apiGet("getLearningLogs"),
        apiGet("getKnowledgeNotes"),
        apiGet("getShortcuts"),
    ]);

    return {
        tasks: Array.isArray(tasks) ? tasks : [],
        logs: Array.isArray(logs) ? logs : [],
        notes: Array.isArray(notes) ? notes : [],
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

function setSelectOptions(select, options, selectedValue) {
    select.innerHTML = options.map((option) => `<option>${option}</option>`).join("");
    if (selectedValue && options.includes(selectedValue)) select.value = selectedValue;
}

function updateAreaOptions(areaSelect, categorySelect, genreSelect, preferredCategory, preferredGenre) {
    const area = areaSelect.value || "その他";
    setSelectOptions(categorySelect, categoryByArea[area] || categoryByArea["その他"], preferredCategory);
    setSelectOptions(genreSelect, genreByArea[area] || genreByArea["その他"], preferredGenre);
}

function updateGenreOptions(areaSelect, genreSelect, preferredGenre) {
    const area = areaSelect.value || "その他";
    setSelectOptions(genreSelect, genreByArea[area] || genreByArea["その他"], preferredGenre);
}

function inferArea(text) {
    if (/応用情報|過去問|午前|午後|試験|学習|勉強|復習/.test(text)) return "学習";
    if (/英語|単語|リスニング|スピーキング|日記|ted/i.test(text)) return "英語";
    if (/読書|本|書籍|要約|学び/.test(text)) return "読書";
    if (/開発|実装|コード|github|api|css|javascript|gas|notion|ui|テスト/i.test(text)) return "開発";
    if (/運動|睡眠|食事|健康|通院/.test(text)) return "健康";
    if (/支出|収入|家計|お金|投資|固定費/.test(text)) return "お金";
    if (/創作|執筆|制作|記事|アイデア/.test(text)) return "創作";
    if (/掃除|買い物|生活|家事|手続き|予定/.test(text)) return "生活";
    return "学習";
}

function inferCategory(text, area) {
    if (area === "開発" || area === "プログラミング") {
        if (/調査|確認/.test(text)) return "調査";
        if (/設計/.test(text)) return "設計";
        if (/テスト|spec|jest/i.test(text)) return "テスト";
        if (/リファクタ/.test(text)) return "リファクタ";
        return "実装";
    }
    if (area === "英語") {
        if (/単語/.test(text)) return "単語";
        if (/リスニング/.test(text)) return "リスニング";
        if (/スピーキング/.test(text)) return "スピーキング";
        if (/読解/.test(text)) return "読解";
        return "日記";
    }
    if (area === "読書") {
        if (/技術|プログラミング|IT|設計/.test(text)) return "技術書";
        if (/ビジネス|仕事/.test(text)) return "ビジネス";
        if (/自己理解|自己啓発|習慣/.test(text)) return "自己理解";
        return "メモ";
    }
    if (area === "生活") {
        if (/買い物/.test(text)) return "買い物";
        if (/掃除|洗濯|家事/.test(text)) return "家事";
        if (/手続き/.test(text)) return "手続き";
        return "予定";
    }
    if (/模擬|試験/.test(text)) return "模擬試験";
    if (/苦手|復習/.test(text)) return "苦手復習";
    if (/整理|まとめ|知識/.test(text)) return "知識整理";
    if (/動画/.test(text)) return "動画";
    if (/読書|本/.test(text)) return "読書";
    return "過去問道場";
}

function inferKnowledgeCategory(text) {
    if (/問題|解説|過去問/.test(text)) return "問題解説";
    if (/調査|比較|確認/.test(text)) return "調査";
    if (/アイデア|企画|思いつき/.test(text)) return "アイデア";
    if (/反省|失敗|改善/.test(text)) return "反省";
    return "知識整理";
}

function inferGenre(text, area) {
    const normalized = text.toLowerCase();
    if (area === "開発" || area === "プログラミング") {
        if (/front|html|css|ui|画面|docs/.test(normalized)) return "フロントエンド";
        if (/back|api|gas|server|backend/.test(normalized)) return "バックエンド";
        if (/notion/.test(normalized)) return "Notion";
        if (/db|database|データベース/.test(normalized)) return "DB";
        if (/test|jest|テスト/.test(normalized)) return "テスト";
        return "設計";
    }
    if (area === "英語") {
        if (/単語|語彙/.test(text)) return "語彙";
        if (/文法/.test(text)) return "文法";
        if (/発音/.test(text)) return "発音";
        if (/リスニング/.test(text)) return "リスニング";
        if (/スピーキング/.test(text)) return "スピーキング";
        return "ライティング";
    }
    if (area === "読書") {
        if (/技術|IT|プログラミング/.test(text)) return "技術";
        if (/ビジネス/.test(text)) return "ビジネス";
        if (/自己理解|習慣/.test(text)) return "自己理解";
        return "メモ";
    }

    const rules = [
        ["セキュリティ", /セキュリティ|暗号|認証|脆弱|攻撃/],
        ["ネットワーク", /ネットワーク|tcp|ip|dns|サブネット|ルータ/],
        ["データベース", /データベース|sql|正規化|db/],
        ["マネジメント", /マネジメント|品質|進捗|リスク|プロジェクト/],
        ["ストラテジ", /ストラテジ|経営|会計|法務/],
        ["システム開発", /設計|テスト|開発|要件/],
        ["アルゴリズム", /アルゴリズム|計算|探索|ソート/],
    ];
    const match = rules.find(([, pattern]) => pattern.test(normalized));
    return match ? match[0] : (genreByArea[area] || genreByArea["その他"])[0];
}

function normalizeKnowledgeArea(area) {
    if (area === "学習") return "応用情報";
    if (area === "プログラミング") return "開発";
    if (area === "読書") return "その他";
    return area;
}

function statusLabel(task) {
    if (task.completed) return "完了";
    return task.status || "未着手";
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

function renderTasks(state) {
    const list = document.getElementById("task-list");
    if (!list) return;

    list.innerHTML = state.tasks.length
        ? state.tasks.map((task) => `
            <article class="task-item">
                <div class="task-main">
                    <input type="checkbox" data-task-toggle="${task.id}" ${task.completed ? "checked" : ""} aria-label="${task.title}を完了">
                    <p class="task-title ${task.completed ? "done" : ""}">${task.title}</p>
                    <button class="item-action danger-text" type="button" data-task-archive="${task.id}">アーカイブ</button>
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
        `).join("")
        : `<p class="placeholder">Todoはまだありません。今日の最初の一手を追加しましょう。</p>`;
}

function renderShortcuts(state) {
    const list = document.getElementById("shortcut-list");
    if (!list) return;
    list.innerHTML = state.shortcuts.map((shortcut) => `
        <a class="shortcut-card" href="${shortcut.url}" target="_blank" rel="noopener noreferrer">
            <strong>${shortcut.title}</strong>
            <span>${shortcut.category || "Shortcut"}</span>
        </a>
    `).join("");
}

function renderLogs(state) {
    const list = document.getElementById("learning-log-list");
    if (!list) return;

    const latest = state.logs.slice(0, 8);
    list.innerHTML = latest.length
        ? latest.map((log) => {
            const tags = Array.isArray(log.tags) ? log.tags.join(",") : log.tags;
            return `
                <article class="log-entry">
                    <div class="log-entry-header">
                        <strong>${log.area || "活動"} / ${log.minutes || 0}分 / ${log.category || "未分類"} / ${log.genre || "その他"}</strong>
                        <button class="item-action danger-text" type="button" data-log-archive="${log.id}">アーカイブ</button>
                    </div>
                    <p>${log.memo || "メモなし"}${tags ? ` #${String(tags).replaceAll(",", " #")}` : ""}</p>
                </article>
            `;
        }).join("")
        : `<p class="placeholder">まだ活動ログがありません。最初の1セッションを残しましょう。</p>`;
}

function renderNotes(state) {
    const list = document.getElementById("knowledge-list");
    if (!list) return;

    const search = document.getElementById("knowledge-search")?.value.trim().toLowerCase() || "";
    const areaFilter = document.getElementById("knowledge-area-filter")?.value || "";
    const actionFilter = document.getElementById("knowledge-action-filter")?.value || "";
    const filtered = state.notes.filter((note) => {
        const tags = Array.isArray(note.tags) ? note.tags.join(",") : note.tags || "";
        const haystack = [
            note.title,
            note.area,
            note.category,
            note.genre,
            tags,
            note.summary,
            note.body,
            note.actionText,
        ].join(" ").toLowerCase();

        if (search && !haystack.includes(search)) return false;
        if (areaFilter && note.area !== areaFilter) return false;
        if (actionFilter === "actionable" && !note.actionable) return false;
        if (actionFilter === "normal" && note.actionable) return false;
        return true;
    });
    const latest = filtered.slice(0, 12);
    list.innerHTML = latest.length
        ? latest.map((note) => {
            const tags = Array.isArray(note.tags) ? note.tags.join(",") : note.tags;
            const url = note.sourceUrl ? `<a href="${note.sourceUrl}" target="_blank" rel="noopener noreferrer">参照</a>` : "";
            return `
                <article class="note-entry">
                    <div class="log-entry-header">
                        <strong>${note.title || "Untitled Note"}</strong>
                        <button class="item-action danger-text" type="button" data-note-archive="${note.id}">アーカイブ</button>
                    </div>
                    <div class="task-meta">
                        <span class="status-pill">${note.area || "応用情報"}</span>
                        <span class="status-pill">${note.category || "知識整理"}</span>
                        <span class="status-pill">${note.genre || "その他"}</span>
                        ${note.actionable ? `<span class="priority-pill">実行候補</span>` : ""}
                    </div>
                    <p>${note.summary || note.body || "本文なし"}${tags ? ` #${String(tags).replaceAll(",", " #")}` : ""} ${url}</p>
                </article>
            `;
        }).join("")
        : `<p class="placeholder">条件に合うナレッジがありません。検索条件を変えるか、新しいメモを残しましょう。</p>`;
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
        summary.textContent = "今日はまだ活動ログがありません。5分だけ進めると、起動のハードルが一気に下がります。";
    } else {
        summary.textContent = `今日は${metrics.todayMinutes}分積み上がっています。次は苦手ジャンルか、未完了Todoを1つだけ動かすのがよさそうです。`;
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
    renderNotes(state);
    renderMetrics(state);
    renderSyncStatus(state);
}

async function refreshFromNotion(state) {
    const remoteState = await loadRemoteState();
    Object.assign(state, remoteState);
    saveLocalState(state);
    render(state);
}

async function saveTaskToNotion(state, task) {
    const result = await apiPost({ action: "saveTask", ...task });
    if (result.task) {
        const index = state.tasks.findIndex((item) => item.id === task.id);
        if (index !== -1) state.tasks[index] = result.task;
        state.syncStatus = "notion";
        saveLocalState(state);
        render(state);
    }
    return result.task;
}

function setupTaskForm(state) {
    const form = document.getElementById("task-form");
    if (!form) return;

    const titleInput = document.getElementById("task-title");
    const areaInput = document.getElementById("task-area");
    const categoryInput = document.getElementById("task-category");
    const genreInput = document.getElementById("task-genre");

    updateAreaOptions(areaInput, categoryInput, genreInput, "過去問道場", "セキュリティ");

    function updateTaskInferences() {
        const inferredArea = inferArea(titleInput.value);
        if (titleInput.value.trim()) areaInput.value = inferredArea;
        updateAreaOptions(areaInput, categoryInput, genreInput, inferCategory(titleInput.value, areaInput.value), inferGenre(titleInput.value, areaInput.value));
    }

    titleInput.addEventListener("input", updateTaskInferences);
    areaInput.addEventListener("change", () => updateAreaOptions(areaInput, categoryInput, genreInput));

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
        updateAreaOptions(areaInput, categoryInput, genreInput, "過去問道場", "セキュリティ");
        saveLocalState(state);
        render(state);

        try {
            await saveTaskToNotion(state, task);
        } catch (error) {
            console.warn("saveTask fallback to localStorage", error);
            state.syncStatus = "local";
            render(state);
        }
    });
}

function setupTaskList(state) {
    const list = document.getElementById("task-list");
    if (!list) return;

    list.addEventListener("change", async (event) => {
        const taskId = event.target.dataset.taskToggle;
        if (!taskId) return;

        const task = state.tasks.find((item) => item.id === taskId);
        if (!task) return;

        task.completed = event.target.checked;
        task.status = task.completed ? "完了" : "準備中";
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

    list.addEventListener("click", async (event) => {
        const taskId = event.target.dataset.taskArchive;
        if (!taskId) return;
        if (!confirm("このTodoをNotion側でもアーカイブしますか？")) return;

        state.tasks = state.tasks.filter((task) => task.id !== taskId);
        saveLocalState(state);
        render(state);

        try {
            await apiPost({ action: "archiveTask", pageId: taskId });
            state.syncStatus = "notion";
            saveLocalState(state);
            render(state);
        } catch (error) {
            console.warn("archiveTask failed", error);
            state.syncStatus = "local";
            render(state);
            alert("Notion側のアーカイブに失敗しました。ローカル表示からは外しました。");
        }
    });
}

function setupLearningLogForm(state) {
    const form = document.getElementById("learning-log-form");
    if (!form) return;

    const areaInput = document.getElementById("log-area");
    const categoryInput = document.getElementById("log-category");
    const genreInput = document.getElementById("log-genre");
    const memoInput = document.getElementById("log-memo");

    updateAreaOptions(areaInput, categoryInput, genreInput, "過去問道場", "セキュリティ");

    areaInput.addEventListener("change", () => updateAreaOptions(areaInput, categoryInput, genreInput));
    memoInput.addEventListener("input", () => {
        const area = inferArea(memoInput.value);
        areaInput.value = area === "学習" ? "応用情報" : area === "開発" ? "プログラミング" : area;
        updateAreaOptions(areaInput, categoryInput, genreInput, inferCategory(memoInput.value, areaInput.value), inferGenre(memoInput.value, areaInput.value));
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const minutes = Number(document.getElementById("log-minutes").value);
        if (!minutes) return;

        const log = {
            id: `log-${Date.now()}`,
            date: todayKey(),
            minutes,
            area: areaInput.value,
            category: categoryInput.value,
            genre: genreInput.value,
            understanding: document.getElementById("log-understanding").value,
            energy: document.getElementById("log-energy").value,
            tags: document.getElementById("log-tags").value.trim(),
            memo: memoInput.value.trim(),
        };

        state.logs.unshift(log);
        form.reset();
        updateAreaOptions(areaInput, categoryInput, genreInput, "過去問道場", "セキュリティ");
        saveLocalState(state);
        render(state);

        try {
            const result = await apiPost({ action: "saveLearningLog", ...log });
            if (result.learningLog) state.logs[0] = result.learningLog;
            state.syncStatus = "notion";
            saveLocalState(state);
            render(state);
        } catch (error) {
            console.warn("saveLearningLog fallback to localStorage", error);
            state.syncStatus = "local";
            render(state);
        }
    });
}

function setupLearningLogList(state) {
    const list = document.getElementById("learning-log-list");
    if (!list) return;

    list.addEventListener("click", async (event) => {
        const logId = event.target.dataset.logArchive;
        if (!logId) return;
        if (!confirm("この活動ログをNotion側でもアーカイブしますか？")) return;

        state.logs = state.logs.filter((log) => log.id !== logId);
        saveLocalState(state);
        render(state);

        try {
            await apiPost({ action: "archiveLearningLog", pageId: logId });
            state.syncStatus = "notion";
            saveLocalState(state);
            render(state);
        } catch (error) {
            console.warn("archiveLearningLog failed", error);
            state.syncStatus = "local";
            render(state);
            alert("Notion側のアーカイブに失敗しました。ローカル表示からは外しました。");
        }
    });
}

function setupKnowledgeForm(state) {
    const form = document.getElementById("knowledge-form");
    if (!form) return;

    const titleInput = document.getElementById("knowledge-title");
    const areaInput = document.getElementById("knowledge-area");
    const categoryInput = document.getElementById("knowledge-category");
    const genreInput = document.getElementById("knowledge-genre");
    const summaryInput = document.getElementById("knowledge-summary");
    const bodyInput = document.getElementById("knowledge-body");
    const actionableInput = document.getElementById("knowledge-actionable");
    const actionTextInput = document.getElementById("knowledge-action-text");

    updateGenreOptions(areaInput, genreInput, "セキュリティ");

    function updateKnowledgeInferences() {
        const text = `${titleInput.value} ${summaryInput.value} ${bodyInput.value}`;
        const inferredArea = normalizeKnowledgeArea(inferArea(text));
        if (text.trim()) areaInput.value = inferredArea;
        categoryInput.value = inferKnowledgeCategory(text);
        updateGenreOptions(areaInput, genreInput, inferGenre(text, inferredArea));
        if (actionableInput.checked && !actionTextInput.value.trim()) {
            actionTextInput.value = titleInput.value.trim();
        }
    }

    areaInput.addEventListener("change", () => updateGenreOptions(areaInput, genreInput));
    [titleInput, summaryInput, bodyInput].forEach((input) => input.addEventListener("input", updateKnowledgeInferences));
    actionableInput.addEventListener("change", () => {
        if (actionableInput.checked && !actionTextInput.value.trim()) actionTextInput.value = titleInput.value.trim();
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const title = titleInput.value.trim();
        const body = bodyInput.value.trim();
        const summary = summaryInput.value.trim();
        if (!title && !body && !summary) return;

        const note = {
            id: `note-${Date.now()}`,
            title: title || summary.slice(0, 40) || "Untitled Note",
            area: areaInput.value,
            category: categoryInput.value,
            genre: genreInput.value,
            tags: document.getElementById("knowledge-tags").value.trim(),
            sourceUrl: document.getElementById("knowledge-source-url").value.trim(),
            summary,
            body,
            actionable: actionableInput.checked,
            actionText: actionTextInput.value.trim(),
        };

        state.notes.unshift(note);
        saveLocalState(state);
        render(state);

        try {
            const result = await apiPost({ action: "saveKnowledgeNote", ...note });
            if (result.knowledgeNote) state.notes[0] = result.knowledgeNote;

            state.syncStatus = "notion";
            form.reset();
            updateGenreOptions(areaInput, genreInput, "セキュリティ");
            saveLocalState(state);
            render(state);
        } catch (error) {
            console.warn("saveKnowledgeNote fallback to localStorage", error);
            state.syncStatus = "local";
            render(state);
        }
    });
}

function setupKnowledgeList(state) {
    const list = document.getElementById("knowledge-list");
    if (!list) return;

    list.addEventListener("click", async (event) => {
        const noteId = event.target.dataset.noteArchive;
        if (!noteId) return;
        if (!confirm("このナレッジをNotion側でもアーカイブしますか？")) return;

        state.notes = state.notes.filter((note) => note.id !== noteId);
        saveLocalState(state);
        render(state);

        try {
            await apiPost({ action: "archiveKnowledgeNote", pageId: noteId });
            state.syncStatus = "notion";
            saveLocalState(state);
            render(state);
        } catch (error) {
            console.warn("archiveKnowledgeNote failed", error);
            state.syncStatus = "local";
            render(state);
            alert("Notion側のアーカイブに失敗しました。ローカル表示からは外しました。");
        }
    });
}

function setupKnowledgeFilters(state) {
    [
        document.getElementById("knowledge-search"),
        document.getElementById("knowledge-area-filter"),
        document.getElementById("knowledge-action-filter"),
    ].forEach((input) => {
        input?.addEventListener("input", () => renderNotes(state));
        input?.addEventListener("change", () => renderNotes(state));
    });
}

function setupSettings(state) {
    const refreshButton = document.getElementById("refresh-dashboard-btn");
    const clearCacheButton = document.getElementById("clear-local-cache-btn");

    refreshButton?.addEventListener("click", async () => {
        refreshButton.disabled = true;
        refreshButton.textContent = "読み込み中...";
        try {
            await refreshFromNotion(state);
        } catch (error) {
            console.warn("refresh failed", error);
            alert("Notionからの再読み込みに失敗しました。");
        } finally {
            refreshButton.disabled = false;
            refreshButton.textContent = "Notionから再読み込み";
        }
    });

    clearCacheButton?.addEventListener("click", () => {
        if (!confirm("ブラウザ内の表示キャッシュをクリアしますか？Notionのデータは消えません。")) return;
        localStorage.removeItem(STORAGE_KEY);
        Object.assign(state, cloneDefaultState());
        render(state);
    });
}

export async function setupDashboard() {
    const state = loadLocalState();
    render(state);
    setupTaskForm(state);
    setupTaskList(state);
    setupLearningLogForm(state);
    setupLearningLogList(state);
    setupKnowledgeForm(state);
    setupKnowledgeList(state);
    setupKnowledgeFilters(state);
    setupSettings(state);

    try {
        await refreshFromNotion(state);
    } catch (error) {
        console.warn("Dashboard uses localStorage fallback", error);
        state.syncStatus = "local";
        render(state);
    }
}
