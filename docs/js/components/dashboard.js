const STORAGE_KEY = "lifeDashboardState";

const defaultState = {
    tasks: [
        {
            id: "task-1",
            title: "応用情報 過去問道場 セキュリティ 30問",
            priority: "today",
            category: "過去問道場",
            genre: "セキュリティ",
            status: "preparing",
            completed: false,
        },
        {
            id: "task-2",
            title: "模擬試験の復習メモを整理",
            priority: "soon",
            category: "模擬試験",
            genre: "その他",
            status: "todo",
            completed: false,
        },
    ],
    logs: [],
    shortcuts: [
        { title: "過去問道場", category: "応用情報", url: "https://www.ap-siken.com/apkakomon.php" },
        { title: "Notion 学習DB", category: "Knowledge", url: "https://www.notion.so/" },
        { title: "IPA 試験情報", category: "Official", url: "https://www.ipa.go.jp/shiken/" },
        { title: "TED", category: "English", url: "https://www.ted.com/" },
    ],
};

function cloneDefaultState() {
    return JSON.parse(JSON.stringify(defaultState));
}

function loadState() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return cloneDefaultState();
        return { ...cloneDefaultState(), ...JSON.parse(stored) };
    } catch (error) {
        console.warn("Failed to load dashboard state", error);
        return cloneDefaultState();
    }
}

function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayKey() {
    return new Date().toISOString().split("T")[0];
}

function priorityLabel(priority) {
    const labels = {
        today: "今日中",
        soon: "なるべく早く",
        later: "余裕があれば",
    };
    return labels[priority] || priority;
}

function statusLabel(task) {
    if (task.completed) return "完了";
    const labels = {
        preparing: "準備中",
        todo: "未着手",
        doing: "進行中",
        paused: "保留",
        skipped: "スキップ",
    };
    return labels[task.status] || "未着手";
}

function inferCategory(text) {
    if (/模擬|試験/.test(text)) return "模擬試験";
    if (/苦手|復習/.test(text)) return "苦手復習";
    if (/整理|まとめ|知識/.test(text)) return "知識整理";
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
    const dates = new Set(logs.map((log) => log.date));
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
    const todayLogs = state.logs.filter((log) => log.date === today);
    const todayMinutes = todayLogs.reduce((sum, log) => sum + Number(log.minutes || 0), 0);
    const completedCount = state.tasks.filter((task) => task.completed).length;
    const streak = calculateStreak(state.logs);
    const score = Math.min(todayMinutes, 180) + Math.min(streak * 5, 50) + completedCount * 5;

    return { todayMinutes, completedCount, streak, score };
}

function renderTasks(state) {
    const list = document.getElementById("task-list");
    if (!list) return;

    list.innerHTML = state.tasks
        .map((task) => `
            <article class="task-item">
                <div class="task-main">
                    <input type="checkbox" data-task-toggle="${task.id}" ${task.completed ? "checked" : ""} aria-label="${task.title}を完了">
                    <p class="task-title ${task.completed ? "done" : ""}">${task.title}</p>
                </div>
                <div class="task-meta">
                    <span class="priority-pill">${priorityLabel(task.priority)}</span>
                    <span class="state-pill">${statusLabel(task)}</span>
                    <span class="status-pill">${task.category}</span>
                    <span class="status-pill">${task.genre}</span>
                </div>
            </article>
        `)
        .join("");
}

function renderShortcuts(state) {
    const list = document.getElementById("shortcut-list");
    if (!list) return;

    list.innerHTML = state.shortcuts
        .map((shortcut) => `
            <a class="shortcut-card" href="${shortcut.url}" target="_blank" rel="noopener noreferrer">
                <strong>${shortcut.title}</strong>
                <span>${shortcut.category}</span>
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
            .map((log) => `
                <article class="log-entry">
                    <strong>${log.minutes}分 / ${log.category} / ${log.genre}</strong>
                    <p>${log.memo || "メモなし"}${log.tags ? ` #${log.tags.replaceAll(",", " #")}` : ""}</p>
                </article>
            `)
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
        summary.textContent = "今日はまだ学習ログがありません。過去問道場を15分だけ進めると、起動が軽くなります。";
    } else {
        summary.textContent = `今日は${metrics.todayMinutes}分積み上がっています。次は苦手ジャンルを1つだけ復習すると、記録の質が上がります。`;
    }
}

function render(state) {
    renderTasks(state);
    renderShortcuts(state);
    renderLogs(state);
    renderMetrics(state);
}

function setupTaskForm(state) {
    const form = document.getElementById("task-form");
    if (!form) return;

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const titleInput = document.getElementById("task-title");
        const title = titleInput.value.trim();
        if (!title) return;

        state.tasks.unshift({
            id: `task-${Date.now()}`,
            title,
            priority: document.getElementById("task-priority").value,
            category: document.getElementById("task-category").value,
            genre: inferGenre(title),
            status: "preparing",
            completed: false,
        });

        titleInput.value = "";
        saveState(state);
        render(state);
    });
}

function setupTaskToggle(state) {
    const list = document.getElementById("task-list");
    if (!list) return;

    list.addEventListener("change", (event) => {
        const taskId = event.target.dataset.taskToggle;
        if (!taskId) return;

        const task = state.tasks.find((item) => item.id === taskId);
        if (!task) return;

        task.completed = event.target.checked;
        task.status = task.completed ? "done" : "todo";
        saveState(state);
        render(state);
    });
}

function setupLearningLogForm(state) {
    const form = document.getElementById("learning-log-form");
    if (!form) return;

    const memoInput = document.getElementById("log-memo");
    memoInput.addEventListener("input", () => {
        const memo = memoInput.value;
        document.getElementById("log-category").value = inferCategory(memo);
        document.getElementById("log-genre").value = inferGenre(memo);
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const minutes = Number(document.getElementById("log-minutes").value);
        if (!minutes) return;

        state.logs.unshift({
            id: `log-${Date.now()}`,
            date: todayKey(),
            minutes,
            category: document.getElementById("log-category").value,
            genre: document.getElementById("log-genre").value,
            tags: document.getElementById("log-tags").value.trim(),
            memo: memoInput.value.trim(),
        });

        form.reset();
        saveState(state);
        render(state);
    });
}

export function setupDashboard() {
    const state = loadState();
    setupTaskForm(state);
    setupTaskToggle(state);
    setupLearningLogForm(state);
    render(state);
}
