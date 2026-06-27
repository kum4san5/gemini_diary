import { GAS_WEB_APP_URL } from "../config.js";
import { apiGet as requestGet, apiPost as requestPost, schemaWarningMessage } from "./api.js";
import { loadJsonState, normalizeDateKey, saveJsonState, STORAGE_KEY, todayKey } from "./state.js";
import { calculateLifeBalance, calculateMetrics, resolveActionResources, selectNextAction } from "./selectors.js";
import { createFocusSession, extendFocusSession as extendSessionData, sessionElapsedSeconds, sessionPlannedSeconds, sessionToLearningLogInput, updateActiveSessionProgress as updateSessionProgress } from "./timer.js";
import { renderLifeBalanceSummary } from "./renderToday.js";
import { renderDailyReviewListHtml, renderLogListHtml } from "./renderLogs.js";
import { renderSchemaCheckResultHtml } from "./renderSettings.js";

let sessionTimerId = null;
let reminderTimerId = null;

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

const categoryAccentColors = {
    "学習": "#2563eb",
    "応用情報": "#2563eb",
    "プログラミング": "#7c3aed",
    "開発": "#7c3aed",
    "英語": "#0891b2",
    "読書": "#0f766e",
    "創作": "#db2777",
    "生活": "#64748b",
    "お金": "#ca8a04",
    "健康": "#16a34a",
    "その他": "#475569",
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
    reviews: [],
    lifeScores: [],
    moodLogs: [],
    financeSnapshots: [],
    learningTopics: [],
    extended: {
        projects: [],
        goals: [],
        habits: [],
        weeklyReviews: [],
        tags: [],
        categories: [],
        aiInsights: [],
        resources: [],
        dashboardSettings: [],
    },
    shortcuts: [
        { id: "shortcut-default-ap", title: "過去問道場", category: "応用情報", url: "https://www.ap-siken.com/apkakomon.php" },
        { id: "shortcut-default-notion", title: "Notion", category: "Knowledge", url: "https://www.notion.so/" },
        { id: "shortcut-default-ipa", title: "IPA 試験情報", category: "Official", url: "https://www.ipa.go.jp/shiken/" },
        { id: "shortcut-default-ted", title: "TED", category: "English", url: "https://www.ted.com/" },
    ],
    syncStatus: "local",
    activeSession: null,
    reminders: {
        enabled: false,
        intervalMinutes: 60,
        quietStart: "23:00",
        quietEnd: "07:00",
        nextAt: "",
        lastNotifiedAt: "",
    },
    dayPlan: {
        activeDate: "",
        weekPlans: {},
        type: "weekday",
        useFixedWork: true,
        workStart: "09:00",
        workEnd: "18:00",
        freeStart: "06:30",
        freeEnd: "23:30",
        bufferMinutes: 5,
        selectedTaskIds: [],
        taskStarts: {},
        scheduleBlocks: [],
    },
};

const extendedDbConfig = {
    project: { label: "Projects", stateKey: "projects", saveAction: "saveProject", archiveAction: "archiveProject" },
    goal: { label: "Goals", stateKey: "goals", saveAction: "saveGoal", archiveAction: "archiveGoal" },
    habit: { label: "Habits", stateKey: "habits", saveAction: "saveHabit", archiveAction: "archiveHabit" },
    weeklyReview: { label: "Weekly Reviews", stateKey: "weeklyReviews", saveAction: "saveWeeklyReview", archiveAction: "archiveWeeklyReview" },
    tag: { label: "Tags", stateKey: "tags", saveAction: "saveTag", archiveAction: "archiveTag" },
    category: { label: "Categories", stateKey: "categories", saveAction: "saveCategory", archiveAction: "archiveCategory" },
    aiInsight: { label: "AI Insights", stateKey: "aiInsights", saveAction: "saveAiInsight", archiveAction: "archiveAiInsight" },
    resource: { label: "Resources", stateKey: "resources", saveAction: "saveResource", archiveAction: "archiveResource" },
    dashboardSetting: { label: "Dashboard Settings", stateKey: "dashboardSettings", saveAction: "saveDashboardSetting", archiveAction: "archiveDashboardSetting" },
};

function cloneDefaultState() {
    return JSON.parse(JSON.stringify(defaultState));
}

function loadLocalState() {
    return loadJsonState(STORAGE_KEY, cloneDefaultState, normalizeState, "Failed to load dashboard state");
}

function normalizeState(state) {
    state.shortcuts = normalizeShortcuts(state.shortcuts);
    state.lifeScores = Array.isArray(state.lifeScores) ? state.lifeScores : [];
    state.moodLogs = Array.isArray(state.moodLogs) ? state.moodLogs : [];
    state.financeSnapshots = Array.isArray(state.financeSnapshots) ? state.financeSnapshots : [];
    state.learningTopics = Array.isArray(state.learningTopics) ? state.learningTopics : [];
    state.activeSession = normalizeActiveSession(state.activeSession);
    state.reminders = normalizeReminderSettings(state.reminders);
    state.dayPlan = normalizeDayPlanState(state.dayPlan);
    return state;
}

function normalizeReminderSettings(reminders) {
    const defaults = cloneDefaultState().reminders;
    const current = reminders || {};
    return {
        ...defaults,
        ...current,
        intervalMinutes: Math.max(5, Number(current.intervalMinutes || defaults.intervalMinutes)),
    };
}

function normalizeActiveSession(session) {
    if (!session || !session.startedAt) return null;
    return {
        ...session,
        accumulatedSeconds: Number(session.accumulatedSeconds || 0),
        presetMinutes: Number(session.presetMinutes || 5),
        isRunning: Boolean(session.isRunning),
    };
}

function normalizeShortcuts(shortcuts) {
    return (shortcuts || []).map((shortcut, index) => ({
        ...shortcut,
        id: shortcut.id || `shortcut-local-${index + 1}`,
    }));
}

function normalizeScheduleBlocks(blocks) {
    return (Array.isArray(blocks) ? blocks : [])
        .map((block, index) => ({
            id: block.id || `schedule-block-${Date.now()}-${index}`,
            title: String(block.title || scheduleBlockTypeLabel(block.type || "planned")).trim(),
            type: block.type || "planned",
            start: block.start || "19:00",
            end: block.end || "20:00",
        }))
        .filter((block) => timeToMinutes(block.end) > timeToMinutes(block.start));
}

function normalizeDayPlanState(plan) {
    const defaults = cloneDefaultState().dayPlan;
    const base = { ...defaults, ...(plan || {}) };
    base.activeDate = normalizeDateKey(base.activeDate) || todayKey();
    base.weekPlans = base.weekPlans && typeof base.weekPlans === "object" ? base.weekPlans : {};
    base.taskStarts = base.taskStarts || {};
    base.useFixedWork = base.useFixedWork !== false;
    base.scheduleBlocks = normalizeScheduleBlocks(base.scheduleBlocks);
    if (!base.weekPlans[base.activeDate]) {
        base.weekPlans[base.activeDate] = stripDayPlanFields(base);
    }
    Object.keys(base.weekPlans).forEach((date) => {
        base.weekPlans[date] = normalizeDayPlanFields({ ...base, ...base.weekPlans[date] });
    });
    return base;
}

function normalizeDayPlanFields(plan) {
    const defaults = cloneDefaultState().dayPlan;
    return {
        type: plan.type || defaults.type,
        useFixedWork: plan.useFixedWork !== false,
        workStart: plan.workStart || defaults.workStart,
        workEnd: plan.workEnd || defaults.workEnd,
        freeStart: plan.freeStart || defaults.freeStart,
        freeEnd: plan.freeEnd || defaults.freeEnd,
        bufferMinutes: Number(plan.bufferMinutes ?? defaults.bufferMinutes),
        selectedTaskIds: Array.isArray(plan.selectedTaskIds) ? plan.selectedTaskIds : [],
        taskStarts: plan.taskStarts || {},
        scheduleBlocks: normalizeScheduleBlocks(plan.scheduleBlocks),
    };
}

function stripDayPlanFields(plan) {
    return normalizeDayPlanFields(plan);
}

function currentDayPlan(state, date = state.dayPlan?.activeDate || todayKey()) {
    const dayPlan = state.dayPlan || cloneDefaultState().dayPlan;
    const stored = dayPlan.weekPlans?.[date];
    if (!stored && date !== (dayPlan.activeDate || todayKey())) {
        return {
            ...normalizeDayPlanFields({
                ...dayPlan,
                type: isWeekendDateKey(date) ? "weekend" : "weekday",
                selectedTaskIds: [],
                taskStarts: {},
                scheduleBlocks: [],
            }),
            activeDate: date,
        };
    }
    return {
        ...normalizeDayPlanFields({ ...dayPlan, ...(stored || {}) }),
        activeDate: date,
    };
}

function updateCurrentDayPlan(state, patch) {
    const date = state.dayPlan.activeDate || todayKey();
    const current = currentDayPlan(state, date);
    const next = normalizeDayPlanFields({ ...current, ...patch });
    state.dayPlan.weekPlans = state.dayPlan.weekPlans || {};
    state.dayPlan.weekPlans[date] = next;
    Object.assign(state.dayPlan, next, { activeDate: date });
}

function saveLocalState(state) {
    saveJsonState(STORAGE_KEY, state);
}

async function apiGet(action) {
    return requestGet(GAS_WEB_APP_URL, action);
}

async function apiPost(payload) {
    const data = await requestPost(GAS_WEB_APP_URL, payload);
    notifySchemaWarnings(data);
    return data;
}

function notifySchemaWarnings(data) {
    const message = schemaWarningMessage(data);
    if (!message) return;
    console.warn("Notion schema warnings", data?.schemaWarnings);
    showToast(message, "error");
}

async function loadRemoteState() {
    const [tasks, logs, notes, shortcuts, reviews, projects, goals, habits, weeklyReviews, tags, categories, aiInsights, resources, dashboardSettings] = await Promise.all([
        apiGet("getTasks"),
        apiGet("getLearningLogs"),
        apiGet("getKnowledgeNotes"),
        apiGet("getShortcuts"),
        apiGet("getDailyReviews"),
        apiGet("getProjects"),
        apiGet("getGoals"),
        apiGet("getHabits"),
        apiGet("getWeeklyReviews"),
        apiGet("getTags"),
        apiGet("getCategories"),
        apiGet("getAiInsights"),
        apiGet("getResources"),
        apiGet("getDashboardSettings"),
    ]);

    return {
        tasks: Array.isArray(tasks) ? tasks : [],
        logs: Array.isArray(logs) ? logs : [],
        notes: Array.isArray(notes) ? notes : [],
        reviews: Array.isArray(reviews) ? reviews : [],
        extended: {
            projects: Array.isArray(projects) ? projects : [],
            goals: Array.isArray(goals) ? goals : [],
            habits: Array.isArray(habits) ? habits : [],
            weeklyReviews: Array.isArray(weeklyReviews) ? weeklyReviews : [],
            tags: Array.isArray(tags) ? tags : [],
            categories: Array.isArray(categories) ? categories : [],
            aiInsights: Array.isArray(aiInsights) ? aiInsights : [],
            resources: Array.isArray(resources) ? resources : [],
            dashboardSettings: Array.isArray(dashboardSettings) ? dashboardSettings : [],
        },
        shortcuts: normalizeShortcuts(Array.isArray(shortcuts) && shortcuts.length ? shortcuts : defaultState.shortcuts),
        syncStatus: "notion",
    };
}

function setSelectOptions(select, options, selectedValue) {
    select.innerHTML = options.map((option) => `<option>${option}</option>`).join("");
    if (selectedValue && options.includes(selectedValue)) select.value = selectedValue;
}

function uniqueOptions(options, currentValue) {
    return Array.from(new Set([...(options || []), currentValue].filter(Boolean)));
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

function inferGoalDomain(text) {
    if (/資格|試験|応用情報|基本情報|toeic|英検|合格|取得/i.test(text)) return "qualification";
    if (/ダイエット|減量|体重|痩せ|運動|筋トレ|食事|健康/.test(text)) return "health";
    if (/開発|アプリ|サービス|リリース|github|ポートフォリオ|プロジェクト/i.test(text)) return "project";
    if (/創作|小説|記事|漫画|動画|制作|作品/.test(text)) return "creative";
    if (/収入|副業|売上|稼|節約|貯金|投資/.test(text)) return "money";
    if (/英語|単語|リスニング|スピーキング|語学/i.test(text)) return "language";
    return "general";
}

function goalDomainLabel(domain) {
    return {
        qualification: "資格・学習",
        health: "健康・習慣",
        project: "開発プロジェクト",
        creative: "創作",
        money: "お金・収入",
        language: "英語・語学",
        general: "一般目標",
    }[domain] || "一般目標";
}

function estimateGoalWeeks(text) {
    const monthMatch = String(text).match(/(\d+)\s*(か月|ヶ月|カ月|月)/);
    if (monthMatch) return Math.max(2, Number(monthMatch[1]) * 4);
    const weekMatch = String(text).match(/(\d+)\s*(週間|週)/);
    if (weekMatch) return Math.max(1, Number(weekMatch[1]));
    if (/今年|年内/.test(text)) return 24;
    if (/来月/.test(text)) return 4;
    if (/今月/.test(text)) return 3;
    return 8;
}

function weeksFromToday(weeks) {
    const date = new Date();
    date.setDate(date.getDate() + weeks * 7);
    return date.toISOString().split("T")[0];
}

function buildGoalPlan(input) {
    const title = String(input?.title || "").trim();
    const memo = String(input?.memo || "").trim();
    const text = `${title} ${memo}`.trim();
    const domain = inferGoalDomain(text);
    const area = domain === "health" ? "健康"
        : domain === "project" ? "開発"
        : domain === "creative" ? "創作"
        : domain === "money" ? "お金"
        : domain === "language" ? "英語"
        : "学習";
    const weeks = estimateGoalWeeks(text);
    const targetDate = input?.targetDate || weeksFromToday(weeks);

    const templates = {
        qualification: {
            tasks: ["出題範囲と教材を確認する", "頻出分野を1周する", "過去問を解いて弱点を洗い出す", "弱点分野を復習する", "模擬試験で時間配分を確認する"],
            habits: ["毎日15分の学習ログを残す", "週1回、苦手分野を整理する"],
            resources: [
                { title: "公式試験情報", type: "Webサイト", url: "https://www.ipa.go.jp/shiken/", memo: "試験日、出題範囲、公式情報を確認する" },
                { title: "過去問道場", type: "Webサイト", url: "https://www.ap-siken.com/apkakomon.php", memo: "過去問演習と弱点確認に使う" },
                { title: "要点整理ノート", type: "Notionページ", url: "", memo: "頻出分野、間違えた問題、覚えることを集約する" },
            ],
        },
        health: {
            tasks: ["現状の体重・食事・運動を記録する", "無理のない食事ルールを決める", "週の運動メニューを決める", "停滞時の見直し条件を決める"],
            habits: ["毎日体重か食事を1つ記録する", "週3回、短い運動をする"],
            resources: [
                { title: "食事記録ルール", type: "メモ", url: "", memo: "何を記録するか、どこまで厳密に見るかを決める" },
                { title: "運動メニュー", type: "メモ", url: "", memo: "週に実行する運動メニューをまとめる" },
                { title: "体調メモ", type: "Notionページ", url: "", memo: "睡眠、疲労、体重変化を見返す場所" },
            ],
        },
        project: {
            tasks: ["目的と完成条件を1文で決める", "必要機能を洗い出す", "最小版を実装する", "動作確認と改善をする", "公開/共有まで進める"],
            habits: ["週2回、開発ログを残す", "詰まりをナレッジ化する"],
            resources: [
                { title: "GitHub / リポジトリ", type: "Webサイト", url: "", memo: "コード、Issue、変更履歴を見る場所" },
                { title: "仕様メモ", type: "Notionページ", url: "", memo: "目的、画面、DB、API、決定事項をまとめる" },
                { title: "参考実装", type: "Webサイト", url: "", memo: "似た機能やUIの参考リンクを置く" },
            ],
        },
        creative: {
            tasks: ["作品のテーマと完成形を決める", "構成案を作る", "初稿/初版を作る", "見直しポイントを整理する", "公開または保存する"],
            habits: ["週2回、制作時間を記録する", "アイデアをナレッジに残す"],
            resources: [
                { title: "参考作品", type: "Webサイト", url: "", memo: "方向性や品質基準の参考にする" },
                { title: "構成メモ", type: "Notionページ", url: "", memo: "テーマ、構成、下書きをまとめる" },
                { title: "公開先", type: "Webサイト", url: "", memo: "完成物を公開・保存する場所" },
            ],
        },
        money: {
            tasks: ["現状の収入・支出をざっくり把握する", "目標金額と期限を決める", "増やす/減らす行動を3つ選ぶ", "週次で数字を確認する"],
            habits: ["週1回、お金のログを確認する", "支出メモを残す"],
            resources: [
                { title: "家計メモ", type: "Notionページ", url: "", memo: "収入、支出、固定費をまとめる" },
                { title: "収入候補リスト", type: "メモ", url: "", memo: "試したい副業、仕事、改善案を並べる" },
                { title: "固定費チェックリスト", type: "メモ", url: "", memo: "見直す固定費と判断結果を残す" },
            ],
        },
        language: {
            tasks: ["現在地を確認する", "単語・文法・リスニングの配分を決める", "教材を1つ選ぶ", "週ごとの練習量を決める", "成果確認の小テストを入れる"],
            habits: ["毎日10分、英語に触れる", "週1回、できた表現をナレッジ化する"],
            resources: [
                { title: "単語帳", type: "Webサイト", url: "", memo: "語彙を積み上げる教材" },
                { title: "リスニング教材", type: "動画", url: "https://www.ted.com/", memo: "聞く練習と表現収集に使う" },
                { title: "英語日記", type: "Notionページ", url: "", memo: "書いた英文と添削結果を蓄積する" },
            ],
        },
        general: {
            tasks: ["成功条件を決める", "必要な行動を洗い出す", "最初の1週間で試す", "週次で進め方を見直す"],
            habits: ["週1回、進捗を確認する"],
            resources: [
                { title: "参考メモ", type: "メモ", url: "", memo: "関連情報や考えたことをまとめる" },
                { title: "チェックリスト", type: "Notionページ", url: "", memo: "進める条件、確認項目、完了条件を置く" },
            ],
        },
    };

    const template = templates[domain] || templates.general;
    const taskItems = template.tasks.map((task, index) => ({
        title: task,
        priority: index < 2 ? "なるべく早く" : "余裕があれば",
        area,
        category: domain === "qualification" ? "知識整理" : "計画",
        genre: goalDomainLabel(domain),
        estimatedMinutes: index === 0 ? 15 : 30,
        status: index === 0 ? "準備中" : "未着手",
        memo: `${title} のサブタスク`,
    }));

    return {
        title: title || "新しい目標",
        domain,
        domainLabel: goalDomainLabel(domain),
        area,
        targetDate,
        weeks,
        successCriteria: memo || `${title} を期限までに達成できる状態にする`,
        goal: {
            title: title || "新しい目標",
            area,
            targetDate,
            status: "未着手",
            priority: "中",
            progress: 0,
            successCriteria: memo || `${title} を期限までに達成できる状態にする`,
            memo: `自動提案: ${goalDomainLabel(domain)} / ${weeks}週間目安`,
        },
        tasks: taskItems,
        habits: template.habits.map((habit) => ({
            title: habit,
            area,
            status: "有効",
            frequency: /毎日/.test(habit) ? "毎日" : "毎週",
            targetMinutes: /15/.test(habit) ? 15 : 10,
            memo: `${title} を進めるための習慣`,
        })),
        resources: template.resources.map((resource) => ({
            title: resource.title,
            area,
            type: resource.type || "Webサイト",
            url: resource.url || "",
            category: goalDomainLabel(domain),
            memo: resource.memo || `${title} に関連するResource候補`,
        })),
        weeklyPlan: Array.from({ length: Math.min(weeks, 8) }, (_, index) => ({
            week: index + 1,
            title: index === 0 ? "準備と現在地確認" : index === weeks - 1 ? "仕上げと振り返り" : `実行週 ${index + 1}`,
        })),
    };
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

function timeToMinutes(value) {
    const [hours, minutes] = String(value || "00:00").split(":").map(Number);
    return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function minutesToTime(minutes) {
    const normalized = Math.max(0, minutes);
    const hours = Math.floor(normalized / 60) % 24;
    const mins = normalized % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function formatDuration(minutes) {
    const value = Math.max(0, Number(minutes || 0));
    const hours = Math.floor(value / 60);
    const mins = value % 60;
    if (hours && mins) return `${hours}時間${mins}分`;
    if (hours) return `${hours}時間`;
    return `${mins}分`;
}

function formatClock(totalSeconds) {
    const value = Math.max(0, Math.floor(Number(totalSeconds || 0)));
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function realIds(ids) {
    return (ids || []).filter((id) => isRealPageId(id));
}

function updateActiveSessionProgress(state, persist = false) {
    return updateSessionProgress(state, persist, saveLocalState);
}

function dayPlanBlocks(plan) {
    const freeStart = timeToMinutes(plan.freeStart);
    const freeEnd = timeToMinutes(plan.freeEnd);
    if (freeEnd <= freeStart) return [];
    const busyBlocks = dayPlanBusyBlocks(plan)
        .map((block) => ({
            ...block,
            start: Math.max(freeStart, block.start),
            end: Math.min(freeEnd, block.end),
        }))
        .filter((block) => block.end > block.start)
        .sort((a, b) => a.start - b.start);
    const freeBlocks = subtractRanges([{ type: "free", start: freeStart, end: freeEnd }], busyBlocks);
    return [...freeBlocks, ...busyBlocks].sort((a, b) => a.start - b.start);
}

function dayPlanBusyBlocks(plan) {
    const fixedWork = plan.type !== "weekend" && plan.useFixedWork !== false
        ? [{
            id: "fixed-work",
            type: "work",
            title: "仕事",
            start: timeToMinutes(plan.workStart),
            end: timeToMinutes(plan.workEnd),
            fixed: true,
        }]
        : [];
    const customBlocks = normalizeScheduleBlocks(plan.scheduleBlocks).map((block) => ({
        ...block,
        title: block.title || scheduleBlockTypeLabel(block.type),
        start: timeToMinutes(block.start),
        end: timeToMinutes(block.end),
    }));
    return [...fixedWork, ...customBlocks];
}

function scheduleBlockTypeLabel(type) {
    return {
        work: "仕事",
        planned: "予定",
        play: "遊び",
        transit: "移動",
        housework: "家事",
        rest: "休息",
        other: "その他",
    }[type] || "予定";
}

function scheduleBlockTimelineType(type) {
    return {
        work: "work",
        planned: "planned",
        play: "play",
        transit: "transit",
        housework: "housework",
        rest: "rest",
        other: "planned",
    }[type] || "planned";
}

function buildDayPlan(state) {
    const plan = currentDayPlan(state);
    const blocks = dayPlanBlocks(plan);
    const selectedTasks = (state.tasks || [])
        .filter((task) => !task.completed && (plan.selectedTaskIds || []).includes(task.id));
    const buffer = Math.max(0, Number(plan.bufferMinutes || 0));
    const scheduled = [];
    const dayStart = timeToMinutes(plan.freeStart);
    const dayEnd = timeToMinutes(plan.freeEnd);
    const manualRanges = [];
    const manualTasks = selectedTasks.filter((task) => plan.taskStarts?.[task.id]);
    const autoTasks = selectedTasks.filter((task) => !plan.taskStarts?.[task.id]);
    const busyBlocks = blocks.filter((block) => block.type !== "free");
    let overflowMinutes = 0;
    let conflictMinutes = 0;

    manualTasks.forEach((task) => {
        const duration = Math.max(5, Number(task.estimatedMinutes || task.actualMinutes || 30));
        const preferredStart = timeToMinutes(plan.taskStarts[task.id]);
        const start = Math.min(Math.max(preferredStart, dayStart), Math.max(dayStart, dayEnd - duration));
        const end = Math.min(start + duration, dayEnd);
        const conflict = overlapsAny({ start, end }, busyBlocks);
        conflictMinutes += conflict ? end - start : 0;
        scheduled.push({ task, start, end, manual: true, conflict });
        manualRanges.push({ start, end: end + buffer });
        overflowMinutes += Math.max(0, duration - (end - start));
    });

    const freeBlocks = subtractRanges(blocks.filter((block) => block.type === "free"), manualRanges)
        .map((block) => ({ ...block, cursor: block.start }));
    let freeBlockIndex = 0;

    autoTasks.forEach((task) => {
        const duration = Math.max(5, Number(task.estimatedMinutes || task.actualMinutes || 30));
        let remaining = duration;
        while (remaining > 0 && freeBlockIndex < freeBlocks.length) {
            const block = freeBlocks[freeBlockIndex];
            const available = block.end - block.cursor;
            if (available <= 0) {
                freeBlockIndex += 1;
                continue;
            }
            const used = Math.min(available, remaining);
            scheduled.push({
                task,
                start: block.cursor,
                end: block.cursor + used,
                partial: used < remaining,
                manual: false,
            });
            block.cursor += used;
            remaining -= used;
            if (remaining === 0) block.cursor += buffer;
        }
        overflowMinutes += remaining;
    });

    const freeMinutes = blocks.filter((block) => block.type === "free").reduce((sum, block) => sum + block.end - block.start, 0);
    const workMinutes = busyBlocks.filter((block) => block.type === "work").reduce((sum, block) => sum + block.end - block.start, 0);
    const plannedMinutes = busyBlocks.filter((block) => block.type !== "work").reduce((sum, block) => sum + block.end - block.start, 0);
    const taskMinutes = scheduled.reduce((sum, item) => sum + item.end - item.start, 0);
    const remainingFreeMinutes = Math.max(0, freeMinutes - taskMinutes - selectedTasks.length * buffer);
    const totalDayMinutes = Math.max(1, dayEnd - dayStart);

    return { blocks, selectedTasks, scheduled, freeMinutes, workMinutes, plannedMinutes, taskMinutes, remainingFreeMinutes, overflowMinutes, conflictMinutes, totalDayMinutes };
}

function weekDateKeys(baseKey = todayKey()) {
    const base = new Date(`${baseKey}T00:00:00`);
    const mondayOffset = (base.getDay() + 6) % 7;
    base.setDate(base.getDate() - mondayOffset);
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(base);
        date.setDate(base.getDate() + index);
        return todayKey(date);
    });
}

function weekDayLabel(dateKey) {
    const labels = ["日", "月", "火", "水", "木", "金", "土"];
    const date = new Date(`${dateKey}T00:00:00`);
    return labels[date.getDay()] || "";
}

function isWeekendDateKey(dateKey) {
    const date = new Date(`${dateKey}T00:00:00`);
    return [0, 6].includes(date.getDay());
}

function defaultPlanForDate(state, dateKey) {
    return normalizeDayPlanFields({
        ...state.dayPlan,
        type: isWeekendDateKey(dateKey) ? "weekend" : "weekday",
        selectedTaskIds: [],
        taskStarts: {},
        scheduleBlocks: [],
    });
}

function renderWeekPlanTabs(state) {
    const target = document.getElementById("day-plan-week-tabs");
    if (!target) return;
    const activeDate = state.dayPlan.activeDate || todayKey();
    const dates = weekDateKeys(activeDate);
    target.innerHTML = dates.map((date) => {
        const plan = currentDayPlan(state, date);
        const taskMinutes = (state.tasks || [])
            .filter((task) => !task.completed && (plan.selectedTaskIds || []).includes(task.id))
            .reduce((sum, task) => sum + Math.max(5, Number(task.estimatedMinutes || task.actualMinutes || 30)), 0);
        const busyMinutes = dayPlanBusyBlocks(plan).reduce((sum, block) => sum + Math.max(0, block.end - block.start), 0);
        const isToday = date === todayKey();
        const isActive = date === activeDate;
        return `
            <button class="day-plan-week-tab ${isActive ? "active" : ""}" type="button" data-day-plan-date="${date}" aria-pressed="${isActive}">
                <span>${weekDayLabel(date)}</span>
                <strong>${date.slice(5)}</strong>
                <small>${formatDuration(taskMinutes)}${busyMinutes ? ` / 予定${formatDuration(busyMinutes)}` : ""}${isToday ? " / 今日" : ""}</small>
            </button>
        `;
    }).join("");
}

function overlapsAny(range, ranges) {
    return ranges.some((item) => range.start < item.end && range.end > item.start);
}

function subtractRanges(blocks, ranges) {
    return blocks.flatMap((block) => {
        let segments = [{ ...block }];
        ranges.forEach((range) => {
            segments = segments.flatMap((segment) => {
                if (range.end <= segment.start || range.start >= segment.end) return [segment];
                return [
                    { ...segment, end: Math.max(segment.start, range.start) },
                    { ...segment, start: Math.min(segment.end, range.end) },
                ].filter((item) => item.end > item.start);
            });
        });
        return segments;
    });
}

function recommendedDayPlanTaskIds(state) {
    return (state.tasks || [])
        .filter((task) => !task.completed)
        .sort((a, b) => {
            const priorityScore = { "今日中": 0, "なるべく早く": 1, "余裕があれば": 2 };
            return (priorityScore[a.priority] ?? 3) - (priorityScore[b.priority] ?? 3);
        })
        .slice(0, 6)
        .map((task) => task.id);
}

function renderDayPlanner(state) {
    const form = document.getElementById("day-plan-settings");
    const picker = document.getElementById("day-plan-task-picker");
    const summary = document.getElementById("day-plan-summary");
    const timeline = document.getElementById("day-plan-timeline");
    const chart = document.getElementById("day-plan-chart");
    if (!form || !picker || !summary || !timeline || !chart) return;

    renderWeekPlanTabs(state);
    const plan = currentDayPlan(state);
    document.getElementById("day-plan-type").value = plan.type;
    document.getElementById("day-plan-buffer").value = plan.bufferMinutes;
    document.getElementById("day-plan-use-fixed-work").checked = plan.useFixedWork !== false;
    document.getElementById("day-plan-work-start").value = plan.workStart;
    document.getElementById("day-plan-work-end").value = plan.workEnd;
    document.getElementById("day-plan-free-start").value = plan.freeStart;
    document.getElementById("day-plan-free-end").value = plan.freeEnd;
    renderScheduleBlocks(plan);

    const candidateTasks = (state.tasks || []).filter((task) => !task.completed).slice(0, 24);
    const dayStart = timeToMinutes(plan.freeStart);
    const dayEnd = timeToMinutes(plan.freeEnd);
    picker.innerHTML = candidateTasks.length
        ? renderDayPlanTaskGroups(state, candidateTasks, plan, dayStart, dayEnd)
        : `<p class="placeholder">未完了Todoがありません。</p>`;

    const allocation = buildDayPlan(state);
    const total = allocation.totalDayMinutes;
    const taskAngle = (allocation.taskMinutes / total) * 360;
    const workAngle = ((allocation.taskMinutes + allocation.workMinutes) / total) * 360;
    const plannedAngle = ((allocation.taskMinutes + allocation.workMinutes + allocation.plannedMinutes) / total) * 360;
    chart.style.setProperty("--task-angle", `${taskAngle}deg`);
    chart.style.setProperty("--work-angle", `${workAngle}deg`);
    chart.style.setProperty("--planned-angle", `${plannedAngle}deg`);
    chart.innerHTML = `<strong>${Math.round((allocation.taskMinutes / Math.max(1, allocation.freeMinutes)) * 100)}%</strong><span>自由時間使用</span>`;

    summary.innerHTML = `
        <p><strong>${formatDuration(allocation.taskMinutes)}</strong> / 自由時間 ${formatDuration(allocation.freeMinutes)}</p>
        <p>仕事 ${formatDuration(allocation.workMinutes)} / 予定 ${formatDuration(allocation.plannedMinutes)} / 余白 ${formatDuration(allocation.remainingFreeMinutes)}</p>
        ${allocation.conflictMinutes ? `<p class="danger-text">予定と重なり: ${formatDuration(allocation.conflictMinutes)}</p>` : ""}
        ${allocation.overflowMinutes ? `<p class="danger-text">入りきらない: ${formatDuration(allocation.overflowMinutes)}</p>` : ""}
    `;

    const widthBase = Math.max(1, dayEnd - dayStart);
    const busyRows = allocation.blocks
        .filter((block) => block.type !== "free")
        .map((block) => timelineRow(block.title || scheduleBlockTypeLabel(block.type), block.start, block.end, scheduleBlockTimelineType(block.type), dayStart, widthBase, block.fixed));
    const taskRows = allocation.scheduled.map((item) => timelineRow(item.task.title, item.start, item.end, item.conflict ? "conflict" : "task", dayStart, widthBase, item.manual));
    timeline.innerHTML = [...busyRows, ...taskRows].length
        ? [...busyRows, ...taskRows].sort((a, b) => Number(a.datasetStart) - Number(b.datasetStart)).map((row) => row.html).join("")
        : `<p class="placeholder">予定かTodoを選ぶとタイムチャートを表示します。</p>`;
    renderPeriodCharts(state);
}

function renderDayPlanTaskGroups(state, tasks, plan, dayStart, dayEnd) {
    const groups = new Map();
    tasks.forEach((task) => {
        const label = taskParentLabel(state, task);
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push(task);
    });

    return Array.from(groups.entries()).map(([label, groupTasks], index) => {
        const selectedCount = groupTasks.filter((task) => (plan.selectedTaskIds || []).includes(task.id)).length;
        const totalMinutes = groupTasks.reduce((sum, task) => sum + Math.max(5, Number(task.estimatedMinutes || task.actualMinutes || 30)), 0);
        const open = selectedCount || index === 0;
        return `
            <details class="day-plan-task-group" ${open ? "open" : ""}>
                <summary>
                    <span>${escapeHtml(label)}</span>
                    <small>${groupTasks.length}件 / ${formatDuration(totalMinutes)}${selectedCount ? ` / 選択${selectedCount}` : ""}</small>
                </summary>
                <div class="day-plan-task-group-list">
                    ${groupTasks.map((task) => renderDayPlanTaskRow(task, plan, dayStart, dayEnd)).join("")}
                </div>
            </details>
        `;
    }).join("");
}

function renderDayPlanTaskRow(task, plan, dayStart, dayEnd) {
    const duration = Math.max(5, Number(task.estimatedMinutes || task.actualMinutes || 30));
    const latestStart = Math.max(dayStart, dayEnd - duration);
    const selected = (plan.selectedTaskIds || []).includes(task.id);
    return `
        <label class="day-plan-task">
            <input type="checkbox" data-day-plan-task="${escapeHtml(task.id)}" ${selected ? "checked" : ""}>
            <span>${escapeHtml(task.title || "Untitled Todo")}</span>
            <small>${escapeHtml(task.priority || "未設定")} / ${formatDuration(duration)}</small>
            ${selected ? `
                <div class="day-plan-placement">
                    <span>開始</span>
                    <input type="range" data-day-plan-start-range="${escapeHtml(task.id)}" min="${dayStart}" max="${latestStart}" step="5" value="${timeToMinutes(plan.taskStarts?.[task.id] || plan.freeStart)}">
                    <input type="time" data-day-plan-start-time="${escapeHtml(task.id)}" value="${escapeHtml(plan.taskStarts?.[task.id] || "")}">
                    <button class="item-action" type="button" data-day-plan-auto-task="${escapeHtml(task.id)}">自動</button>
                </div>
            ` : ""}
        </label>
    `;
}

function taskParentLabel(state, task) {
    const goal = (task.goalIds || [])
        .map((id) => (state.extended?.goals || []).find((item) => item.id === id))
        .find(Boolean);
    if (goal) return `Goal: ${goal.title || "Untitled"}`;
    const project = (task.projectIds || [])
        .map((id) => (state.extended?.projects || []).find((item) => item.id === id))
        .find(Boolean);
    if (project) return `Project: ${project.title || "Untitled"}`;
    return task.area || task.category || "未分類";
}

function timelineRow(title, start, end, type, dayStart, widthBase, manual = false) {
    const left = ((start - dayStart) / widthBase) * 100;
    const width = Math.max(2, ((end - start) / widthBase) * 100);
    return {
        datasetStart: start,
        html: `
            <div class="timeline-row">
                <span>${escapeHtml(minutesToTime(start))} - ${escapeHtml(minutesToTime(end))}</span>
                <div class="timeline-track">
                    <b class="${type}" style="left:${left}%;width:${width}%">${manual ? "固定: " : ""}${escapeHtml(title)}</b>
                </div>
            </div>
        `,
    };
}

function renderScheduleBlocks(plan) {
    const list = document.getElementById("day-plan-block-list");
    if (!list) return;
    const blocks = normalizeScheduleBlocks(plan.scheduleBlocks);
    list.innerHTML = blocks.length
        ? blocks.map((block) => `
            <article class="day-plan-block-item">
                <span class="status-pill">${escapeHtml(scheduleBlockTypeLabel(block.type))}</span>
                <strong>${escapeHtml(block.title || scheduleBlockTypeLabel(block.type))}</strong>
                <small>${escapeHtml(block.start)} - ${escapeHtml(block.end)}</small>
                <button class="item-action danger-text" type="button" data-day-plan-block-remove="${escapeHtml(block.id)}">削除</button>
            </article>
        `).join("")
        : `<p class="placeholder">仕事以外の予定や、変動する勤務時間を追加できます。</p>`;
}

function renderPeriodCharts(state) {
    const weekTarget = document.getElementById("week-time-chart");
    const monthTarget = document.getElementById("month-time-chart");
    if (!weekTarget || !monthTarget) return;
    weekTarget.innerHTML = renderPeriodBarList(buildWeekActivity(state), "Quick Logや集中セッションを記録すると、直近7日の実績が出ます。");
    monthTarget.innerHTML = renderPeriodBarList(buildMonthActivityByArea(state), "Quick Logや集中セッションを記録すると、今月の領域別実績が出ます。");
}

function buildWeekActivity(state) {
    return Array.from({ length: 7 }, (_, index) => {
        const key = dateKeyOffset(index - 6);
        const minutes = (state.logs || [])
            .filter((log) => normalizeDateKey(log.date) === key)
            .reduce((sum, log) => sum + Number(log.minutes || 0), 0);
        return { label: key.slice(5), minutes };
    });
}

function buildMonthActivityByArea(state) {
    const month = todayKey().slice(0, 7);
    const groups = new Map();
    (state.logs || [])
        .filter((log) => normalizeDateKey(log.date).startsWith(month))
        .forEach((log) => {
            const area = log.area || "その他";
            groups.set(area, (groups.get(area) || 0) + Number(log.minutes || 0));
        });
    return Array.from(groups.entries())
        .map(([label, minutes]) => ({ label, minutes }))
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 8);
}

function renderPeriodBarList(items, emptyText) {
    const maxMinutes = Math.max(1, ...items.map((item) => Number(item.minutes || 0)));
    const hasValue = items.some((item) => Number(item.minutes || 0) > 0);
    if (!hasValue) return `<p class="placeholder">${emptyText}</p>`;
    return items.map((item) => {
        const percent = Math.max(3, (Number(item.minutes || 0) / maxMinutes) * 100);
        return `
            <div class="period-row">
                <span>${escapeHtml(item.label)}</span>
                <div class="period-track"><b style="width:${percent}%"></b></div>
                <strong>${formatDuration(Number(item.minutes || 0))}</strong>
            </div>
        `;
    }).join("");
}

function dateKeyOffset(offsetDays) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return todayKey(date);
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
                    <button class="item-action" type="button" data-detail-type="task" data-detail-id="${task.id}">詳細</button>
                </div>
                <div class="task-meta">
                    <span class="priority-pill">${task.priority || "今日中"}</span>
                    <span class="state-pill">${statusLabel(task)}</span>
                    <span class="status-pill">${task.area || "学習"}</span>
                    <span class="status-pill">${task.category || "未分類"}</span>
                    <span class="status-pill">${task.genre || "その他"}</span>
                    ${task.estimatedMinutes ? `<span class="status-pill">見積 ${formatDuration(task.estimatedMinutes)}</span>` : ""}
                </div>
                ${relationBadges(state, task)}
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
    list.innerHTML = renderLogListHtml(state.logs, (log) => relationBadges(state, log), normalizeDateKey);
}

function renderDailyReviews(state) {
    const list = document.getElementById("daily-review-list");
    if (!list) return;
    list.innerHTML = renderDailyReviewListHtml(state.reviews);
}

function renderProjectHub(state) {
    renderHubList(state, "project", "project-list", state.extended?.projects || []);
    renderHubList(state, "goal", "goal-list", state.extended?.goals || []);
    renderHubList(state, "resource", "resource-list", state.extended?.resources || []);
}

function renderGoalDetail(state) {
    const list = document.getElementById("goal-detail-list");
    const body = document.getElementById("goal-detail-body");
    if (!list || !body) return;

    const goals = state.extended?.goals || [];
    list.innerHTML = goals.length
        ? goals.slice(0, 12).map((goal) => `
            <article class="hub-item ${state.selectedGoalId === goal.id ? "selected" : ""}">
                <div>
                    <strong>${escapeHtml(goal.title || "Untitled Goal")}</strong>
                    <p>${escapeHtml([goal.area, goal.status, goal.targetDate ? `目標日 ${goal.targetDate}` : ""].filter(Boolean).join(" / "))}</p>
                </div>
                <button class="item-action" type="button" data-goal-select="${goal.id}">表示</button>
            </article>
        `).join("")
        : `<p class="placeholder">まだGoalがありません。目標プランナーから作れます。</p>`;

    const goal = goals.find((item) => item.id === state.selectedGoalId) || goals[0];
    if (!goal) {
        body.innerHTML = `<p class="placeholder">Goalを選ぶと関連Todo、習慣、Resource、活動ログが表示されます。</p>`;
        return;
    }

    const goalIds = [goal.id].filter(Boolean);
    const tasks = state.tasks.filter((task) => (task.goalIds || []).some((id) => goalIds.includes(id)));
    const habits = (state.extended?.habits || []).filter((habit) => (habit.goalIds || []).some((id) => goalIds.includes(id)));
    const resources = (state.extended?.resources || []).filter((resource) => (resource.goalIds || []).some((id) => goalIds.includes(id)));
    const logs = state.logs.filter((log) => (log.goalIds || []).some((id) => goalIds.includes(id)));
    const completed = tasks.filter((task) => task.completed).length;
    const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : Number(goal.progress || 0);

    body.innerHTML = `
        <div class="panel-header">
            <div>
                <p class="eyebrow">Selected Goal</p>
                <h2>${escapeHtml(goal.title || "Untitled Goal")}</h2>
            </div>
            <span class="status-pill">${progress}%</span>
        </div>
        ${detailRows([
            ["領域", goal.area],
            ["状態", goal.status],
            ["目標日", goal.targetDate],
            ["成功条件", goal.successCriteria],
            ["メモ", goal.memo],
        ])}
        ${goalDetailSection("関連Todo", tasks.map((task) => `${task.completed ? "完了" : "未完了"}: ${task.title}`))}
        ${goalDetailSection("習慣", habits.map((habit) => `${habit.title} / ${habit.frequency || "頻度未設定"}`))}
        ${goalDetailSection("Resource", resources.map((resource) => [resource.title || "Untitled Resource", resource.type, resource.url].filter(Boolean).join(" / ")))}
        ${goalDetailSection("活動ログ", logs.map((log) => `${log.date || "日付なし"} / ${log.minutes || 0}分 / ${log.memo || log.category || "ログ"}`))}
    `;
}

function goalDetailSection(title, items) {
    return `
        <section class="goal-detail-section">
            <h3>${escapeHtml(title)}</h3>
            ${items.length ? items.slice(0, 8).map((item) => `<p>${escapeHtml(item)}</p>`).join("") : `<p class="placeholder">まだありません。</p>`}
        </section>
    `;
}

function renderGoalPlanPreview(state) {
    const target = document.getElementById("goal-plan-preview");
    if (!target) return;
    const plan = state.pendingGoalPlan;
    if (!plan) {
        target.innerHTML = `<p class="placeholder">タイトルを入れると、Goal、サブタスク、習慣、Resource候補、週次計画を提案します。</p>`;
        return;
    }

    target.innerHTML = `
        <section class="plan-summary">
            <p class="eyebrow">${escapeHtml(plan.domainLabel)} / ${plan.weeks}週間目安</p>
            <h3>${escapeHtml(plan.title)}</h3>
            <p>${escapeHtml(plan.successCriteria)}</p>
            <div class="task-meta">
                <span class="status-pill">${escapeHtml(plan.area)}</span>
                <span class="status-pill">目標日 ${escapeHtml(plan.targetDate)}</span>
            </div>
        </section>
        <section class="plan-columns">
            ${planEditableColumn("サブタスク", "tasks", plan.tasks, (task, index) => `
                ${planField("タイトル", `<textarea class="plan-title-input" data-plan-edit="tasks" data-plan-index="${index}" data-plan-field="title">${escapeHtml(task.title)}</textarea>`)}
                <div class="plan-compact-row">
                    ${planField("優先度", `<select data-plan-edit="tasks" data-plan-index="${index}" data-plan-field="priority">${optionsHtml(["今日中", "なるべく早く", "余裕があれば"], task.priority)}</select>`)}
                    ${planField("見積分", `<input data-plan-edit="tasks" data-plan-index="${index}" data-plan-field="estimatedMinutes" type="number" min="0" step="5" value="${escapeHtml(task.estimatedMinutes)}">`)}
                </div>
            `)}
            ${planEditableColumn("習慣", "habits", plan.habits, (habit, index) => `
                ${planField("タイトル", `<textarea class="plan-title-input" data-plan-edit="habits" data-plan-index="${index}" data-plan-field="title">${escapeHtml(habit.title)}</textarea>`)}
                <div class="plan-compact-row">
                    ${planField("頻度", `<select data-plan-edit="habits" data-plan-index="${index}" data-plan-field="frequency">${optionsHtml(["毎日", "毎週", "週2回", "週3回"], habit.frequency)}</select>`)}
                    ${planField("目標分", `<input data-plan-edit="habits" data-plan-index="${index}" data-plan-field="targetMinutes" type="number" min="0" step="5" value="${escapeHtml(habit.targetMinutes)}">`)}
                </div>
            `)}
            ${planEditableColumn("Resource候補", "resources", plan.resources, (resource, index) => `
                ${planField("タイトル", `<textarea class="plan-title-input" data-plan-edit="resources" data-plan-index="${index}" data-plan-field="title">${escapeHtml(resource.title)}</textarea>`)}
                ${planField("URL", `<input data-plan-edit="resources" data-plan-index="${index}" data-plan-field="url" type="url" placeholder="https://..." value="${escapeHtml(resource.url)}">`)}
                ${planField("種別", `<select data-plan-edit="resources" data-plan-index="${index}" data-plan-field="type">${optionsHtml(["Webサイト", "Notionページ", "書籍", "動画", "メモ", "ローカル"], resource.type)}</select>`)}
                ${planField("メモ", `<input data-plan-edit="resources" data-plan-index="${index}" data-plan-field="memo" value="${escapeHtml(resource.memo)}">`)}
            `)}
            ${planColumn("週次計画", plan.weeklyPlan.map((week) => `Week ${week.week}: ${week.title}`), "weeklyPlan")}
        </section>
        <div class="detail-modal-actions">
            <button type="button" data-goal-plan-confirm>この内容で登録</button>
            <button class="secondary-btn" type="button" data-goal-plan-clear>やり直す</button>
        </div>
    `;
}

function planEditableColumn(title, collection, items, renderItem) {
    return `
        <div class="plan-column plan-column-${escapeHtml(collection)}">
            <h4>${escapeHtml(title)}</h4>
            ${items.length ? items.map((item, index) => `
                <div class="plan-edit-item">
                    ${renderItem(item, index)}
                    <button class="item-action danger-text" type="button" data-plan-remove="${collection}" data-plan-index="${index}">削除</button>
                </div>
            `).join("") : `<p>候補なし</p>`}
        </div>
    `;
}

function planField(label, controlHtml) {
    return `
        <label class="plan-field">
            <span>${escapeHtml(label)}</span>
            ${controlHtml}
        </label>
    `;
}

function planColumn(title, items, collection = "static") {
    return `
        <div class="plan-column plan-column-${escapeHtml(collection)}">
            <h4>${escapeHtml(title)}</h4>
            ${items.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
        </div>
    `;
}

function renderHubList(state, type, elementId, items) {
    const list = document.getElementById(elementId);
    if (!list) return;
    list.innerHTML = items.length
        ? items.slice(0, 12).map((item) => `
            <article class="hub-item">
                <div>
                    <strong>${escapeHtml(item.title || "Untitled")}</strong>
                    <p>${escapeHtml([item.area, item.status || item.type || item.category, item.memo].filter(Boolean).join(" / "))}</p>
                    ${relationBadges(state, item)}
                </div>
                <button class="item-action danger-text" type="button" data-extended-archive="${type}" data-page-id="${item.id}">アーカイブ</button>
            </article>
        `).join("")
        : `<p class="placeholder">まだありません。</p>`;
}

function renderNotes(state) {
    const list = document.getElementById("knowledge-list");
    if (!list) return;

    const search = document.getElementById("knowledge-search")?.value.trim().toLowerCase() || "";
    const areaFilter = document.getElementById("knowledge-area-filter")?.value || "";
    const actionFilter = document.getElementById("knowledge-action-filter")?.value || "";
    const genreFilter = document.getElementById("knowledge-genre-filter")?.value || "";
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
        if (genreFilter && note.genre !== genreFilter) return false;
        if (actionFilter === "actionable" && !note.actionable) return false;
        if (actionFilter === "normal" && note.actionable) return false;
        return true;
    });
    const count = document.getElementById("knowledge-count");
    if (count) count.textContent = `${filtered.length}件のナレッジ`;
    const latest = filtered.slice(0, 12);
    list.innerHTML = latest.length
        ? latest.map((note) => {
            const tags = Array.isArray(note.tags) ? note.tags.join(",") : note.tags;
            const url = note.sourceUrl ? `<a href="${note.sourceUrl}" target="_blank" rel="noopener noreferrer">参照</a>` : "";
            return `
                <article class="note-entry">
                    <div class="log-entry-header">
                        <strong>${note.title || "Untitled Note"}</strong>
                        <button class="item-action" type="button" data-knowledge-select="${note.id}">表示</button>
                    </div>
                    <div class="task-meta">
                        <span class="status-pill">${note.area || "応用情報"}</span>
                        <span class="status-pill">${note.category || "知識整理"}</span>
                        <span class="status-pill">${note.genre || "その他"}</span>
                        ${note.actionable ? `<span class="priority-pill">実行候補</span>` : ""}
                    </div>
                    ${relationBadges(state, note)}
                    <p>${note.summary || note.body || "本文なし"}${tags ? ` #${String(tags).replaceAll(",", " #")}` : ""} ${url}</p>
                    ${note.actionable && note.actionText ? `<button class="item-action" type="button" data-note-create-task="${note.id}">Todoにする</button>` : ""}
                </article>
            `;
        }).join("")
        : `<p class="placeholder">条件に合うナレッジがありません。検索条件を変えるか、新しいメモを残しましょう。</p>`;
}

function renderKnowledgeDetail(state, noteId) {
    const pane = document.getElementById("knowledge-detail-pane");
    if (!pane) return;

    const note = noteId ? findItem(state, "note", noteId) : state.notes[0];
    if (!note) {
        pane.innerHTML = `<p class="placeholder">ナレッジを選ぶと詳細が表示されます。</p>`;
        return;
    }

    const tags = tagText(note.tags);
    pane.innerHTML = `
        <div class="panel-header">
            <div>
                <p class="eyebrow">Selected Note</p>
                <h2>${escapeHtml(note.title || "Untitled Note")}</h2>
            </div>
            <button class="item-action" type="button" data-detail-type="note" data-detail-id="${note.id}">詳細</button>
        </div>
        <div class="task-meta">
            <span class="status-pill">${escapeHtml(note.area || "応用情報")}</span>
            <span class="status-pill">${escapeHtml(note.category || "知識整理")}</span>
            <span class="status-pill">${escapeHtml(note.genre || "その他")}</span>
            ${note.actionable ? `<span class="priority-pill">実行候補</span>` : ""}
        </div>
        ${detailRows([
            ["要約", note.summary],
            ["本文", note.body],
            ["タグ", tags],
            ["参照URL", note.sourceUrl],
            ["関連Project", relationNames(state, note.projectIds, "projects")],
            ["関連Goal", relationNames(state, note.goalIds, "goals")],
            ["関連Resource", relationNames(state, note.resourceIds, "resources")],
            ["関連Todo", taskNames(state, note.relatedTaskIds || (note.relatedTaskId ? [note.relatedTaskId] : []))],
            ["関連ログ", logNames(state, note.relatedLogIds || (note.relatedLogId ? [note.relatedLogId] : []))],
            ["実行メモ", note.actionText],
        ])}
        <div class="detail-modal-actions">
            <button class="secondary-btn" type="button" data-manage-edit="note" data-page-id="${note.id}">編集</button>
            ${note.actionable && note.actionText ? `<button type="button" data-note-create-task="${note.id}">Todoにする</button>` : ""}
        </div>
    `;
}

function renderMetrics(state) {
    const metrics = calculateMetrics(state);
    const minutesPercent = Math.min((metrics.todayMinutes / 180) * 100, 100);
    const streakPercent = Math.min((metrics.streak / 14) * 100, 100);
    const scoreAngle = Math.min((metrics.score / 250) * 360, 360);

    document.getElementById("today-minutes").textContent = formatDuration(metrics.todayMinutes);
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
        summary.textContent = `今日は${formatDuration(metrics.todayMinutes)}積み上がっています。次は苦手ジャンルか、未完了Todoを1つだけ動かすのがよさそうです。`;
    }
}

function renderLifeBalance(state) {
    const summary = document.getElementById("life-balance-summary");
    if (!summary) return;
    const balance = calculateLifeBalance(state);
    summary.innerHTML = renderLifeBalanceSummary(balance);

    const latestScore = balance.latestScore;
    if (latestScore) {
        setInputValue("life-score-happiness", latestScore.happiness || 3);
        setInputValue("life-score-health", latestScore.health || 3);
        setInputValue("life-score-growth", latestScore.growth || 3);
        setInputValue("life-score-money", latestScore.money || 3);
        setInputValue("life-score-creation", latestScore.creation || 3);
        setInputValue("life-score-rest", latestScore.rest || 3);
        setInputValue("life-score-memo", latestScore.memo || "");
    }

    if (balance.latestMood) {
        setInputValue("mood-log-mood", balance.latestMood.mood || "普通");
        setInputValue("mood-log-energy", balance.latestMood.energy || "普通");
        setInputValue("mood-log-stress", balance.latestMood.stress || "普通");
        setInputValue("mood-log-sleep", balance.latestMood.sleepHours || "");
    }

    if (balance.latestFinance) {
        setInputValue("finance-month", balance.latestFinance.month || todayKey().slice(0, 7));
        setInputValue("finance-free-months", balance.latestFinance.freeMonths || "");
        setInputValue("finance-cash", balance.latestFinance.cash || "");
        setInputValue("finance-investment", balance.latestFinance.investment || "");
        setInputValue("finance-debt", balance.latestFinance.debt || "");
        setInputValue("finance-saving-rate", balance.latestFinance.savingRate || "");
    } else {
        setInputValue("finance-month", todayKey().slice(0, 7));
    }

    if (balance.activeLearningTopic) {
        setInputValue("learning-topic-title", balance.activeLearningTopic.title || "");
        setInputValue("learning-topic-output", balance.activeLearningTopic.nextOutput || "");
    }
}

function renderCategorySummary(state) {
    const target = document.getElementById("category-summary");
    if (!target) return;

    const today = todayKey();
    const groups = new Map();
    const order = ["学習", "応用情報", "開発", "プログラミング", "英語", "読書", "創作", "生活", "お金", "健康", "その他"];

    const ensureGroup = (area) => {
        const label = area || "その他";
        if (!groups.has(label)) groups.set(label, { area: label, tasks: 0, minutes: 0 });
        return groups.get(label);
    };

    (state.tasks || []).forEach((task) => {
        if (task.completed) return;
        const group = ensureGroup(task.area || "その他");
        group.tasks += 1;
    });

    (state.logs || [])
        .filter((log) => normalizeDateKey(log.date) === today)
        .forEach((log) => {
            const group = ensureGroup(log.area || "その他");
            group.minutes += Number(log.minutes || 0);
        });

    const ranked = Array.from(groups.values())
        .filter((group) => group.tasks || group.minutes)
        .sort((a, b) => {
            const score = (group) => group.tasks * 60 + group.minutes;
            const diff = score(b) - score(a);
            if (diff) return diff;
            const orderA = order.includes(a.area) ? order.indexOf(a.area) : order.length;
            const orderB = order.includes(b.area) ? order.indexOf(b.area) : order.length;
            return orderA - orderB;
        })
        .slice(0, 8);

    if (!ranked.length) {
        target.innerHTML = `<p class="placeholder">Todoか活動ログが入ると、カテゴリ別の配分がここに出ます。</p>`;
        return;
    }

    target.innerHTML = ranked.map((group) => `
        <article class="category-chip" style="--category-accent:${areaAccent(group.area)}">
            <div>
                <strong>${escapeHtml(group.area)}</strong>
                <span>${group.tasks ? `未完了 ${group.tasks}件` : "未完了なし"}</span>
            </div>
            <p>${formatDuration(group.minutes)}<small>今日の記録</small></p>
        </article>
    `).join("");
}

function renderReminderPanel(state) {
    const status = document.getElementById("reminder-status");
    const interval = document.getElementById("reminder-interval");
    const enableButton = document.querySelector("[data-reminder-enable]");
    const snoozeButton = document.querySelector("[data-reminder-snooze]");
    const testButton = document.querySelector("[data-reminder-test]");
    if (!status) return;

    const settings = state.reminders || normalizeReminderSettings();
    const notificationApi = typeof window !== "undefined" ? window.Notification : null;
    const permission = notificationApi ? notificationApi.permission : "unsupported";
    const nextLabel = settings.nextAt ? formatReminderDateTime(settings.nextAt) : "";

    if (interval && interval.value !== String(settings.intervalMinutes)) interval.value = String(settings.intervalMinutes);

    if (!notificationApi) {
        status.textContent = settings.enabled
            ? `ページ内リマインドON。次は${nextLabel || `${settings.intervalMinutes}分後`}ごろ戻します。`
            : "このブラウザでは通知を使えません。ページ内のリマインドだけ表示します。";
    } else if (permission === "denied") {
        status.textContent = "通知がブロックされています。ブラウザ設定から許可すると使えます。";
    } else if (permission === "default" && settings.enabled) {
        status.textContent = nextLabel
            ? `ページ内リマインドON。次は${nextLabel}ごろ戻します。通知許可でブラウザ通知も使えます。`
            : `ページ内リマインドON。通知許可でブラウザ通知も使えます。`;
    } else if (settings.enabled) {
        status.textContent = nextLabel
            ? `通知ON。次は${nextLabel}ごろ、今日の一手へ戻します。`
            : `通知ON。${settings.intervalMinutes}分ごとに、今日の一手へ戻します。`;
    } else {
        status.textContent = "通知を許可すると、開いている間だけ小さく戻ってこられます。";
    }

    if (enableButton) {
        enableButton.disabled = permission === "denied";
        enableButton.textContent = !notificationApi
            ? settings.enabled ? "リマインド停止" : "ページ内で使う"
            : settings.enabled && permission === "granted" ? "通知を止める" : "通知を許可";
    }
    if (snoozeButton) snoozeButton.disabled = false;
    if (testButton) testButton.disabled = permission === "denied";
}

function areaAccent(area) {
    return categoryAccentColors[area] || categoryAccentColors["その他"];
}

function formatReminderDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function setInputValue(id, value) {
    const input = document.getElementById(id);
    if (input && input.value !== String(value ?? "")) input.value = value ?? "";
}

function renderNextAction(state) {
    const target = document.getElementById("next-action-copy");
    if (!target) return;

    const action = selectNextAction(state);

    if (action?.type === "task") {
        const goal = (action.task.goalIds || [])
            .map((id) => (state.extended?.goals || []).find((item) => item.id === id))
            .find(Boolean);
        target.textContent = goal
            ? `「${goal.title}」の一手として、まずは「${action.task.title}」。5分だけ着手で十分です。`
            : `まずは「${action.task.title}」。完璧に終わらせるより、5分だけ着手で十分です。`;
    } else if (action?.type === "note") {
        target.textContent = `ナレッジの実行候補「${action.note.actionText}」をTodoにすると、次の行動に移せます。`;
    } else if (action?.type === "goal") {
        target.textContent = `Goal「${action.goal.title}」に向けて、最初のサブタスクを1つ作るのがよさそうです。Goalsタブの目標プランナーから提案できます。`;
    } else {
        target.textContent = "今すぐ動かす候補はありません。Todoか実行候補つきナレッジを1つ追加しましょう。";
    }
}

function renderStartConsole(state) {
    const target = document.getElementById("start-console");
    if (!target) return;
    updateActiveSessionProgress(state);

    if (state.activeSession) {
        target.innerHTML = renderActiveSession(state);
        return;
    }

    const action = selectNextAction(state);
    if (!action) {
        target.innerHTML = `<div class="start-empty">今日はまだ開始候補がありません。Todoを1つ作るか、実行候補つきナレッジをTodoにしましょう。</div>`;
        return;
    }

    if (action.type === "task") {
        const task = action.task;
        target.innerHTML = `
            <div class="start-card">
                <div>
                    <span class="metric-label">今やること</span>
                    <h3>${escapeHtml(task.title || "Untitled Todo")}</h3>
                    <div class="task-meta">
                        <span class="priority-pill">${escapeHtml(task.priority || "今日中")}</span>
                        <span class="status-pill">${escapeHtml(task.area || "学習")}</span>
                        <span class="status-pill">${escapeHtml(task.category || "未分類")}</span>
                        ${task.estimatedMinutes ? `<span class="status-pill">見積 ${formatDuration(task.estimatedMinutes)}</span>` : ""}
                    </div>
                </div>
                <div class="start-actions">
                    <button type="button" data-start-minutes="5">5分だけ始める</button>
                    <button class="secondary-btn" type="button" data-start-minutes="15">15分集中</button>
                </div>
            </div>
            ${renderLaunchLinks(resolveActionResources(state, action))}
        `;
        return;
    }

    if (action.type === "note") {
        target.innerHTML = `
            <div class="start-card">
                <div>
                    <span class="metric-label">Todo化する候補</span>
                    <h3>${escapeHtml(action.note.actionText || action.note.title || "実行候補")}</h3>
                    <p class="start-note">Todoに変換すると、開始ボタンとタイマーにつなげられます。</p>
                </div>
                <div class="start-actions">
                    <button type="button" data-note-create-task="${escapeHtml(action.note.id)}">Todoにする</button>
                </div>
            </div>
            ${renderLaunchLinks(resolveActionResources(state, action))}
        `;
        return;
    }

    target.innerHTML = `
        <div class="start-card">
            <div>
                <span class="metric-label">目標から作る</span>
                <h3>${escapeHtml(action.goal.title || "Untitled Goal")}</h3>
                <p class="start-note">最初のサブタスクを作ると、ここから着手できます。</p>
            </div>
            <div class="start-actions">
                <button type="button" data-view-jump="goals">Goalsを開く</button>
            </div>
        </div>
        ${renderLaunchLinks(resolveActionResources(state, action))}
    `;
}

function renderActiveSession(state) {
    const session = state.activeSession;
    const elapsed = sessionElapsedSeconds(session);
    const planned = sessionPlannedSeconds(session);
    const remaining = Math.max(0, planned - elapsed);
    const progress = Math.min((elapsed / Math.max(1, planned)) * 100, 100);
    const task = (state.tasks || []).find((item) => item.id === session.taskId);
    const sessionTask = task || session;
    return `
        <div class="start-card active">
            <div>
                <span class="metric-label">${session.isRunning ? "実行中" : "一区切り"}</span>
                <h3>${escapeHtml(session.title || "Focus Session")}</h3>
                <div class="session-clock">${formatClock(session.isRunning ? remaining : elapsed)}</div>
                <div class="session-progress"><span style="width:${progress}%"></span></div>
                <p class="start-note">${session.isRunning ? "このまま小さく進めましょう。" : "いい区切りです。記録するか、少しだけ続けられます。"}</p>
            </div>
            <div class="start-actions">
                ${session.isRunning ? "" : `<button type="button" data-start-extend="10">+10分続ける</button>`}
                <button class="secondary-btn" type="button" data-start-record>記録する</button>
                <button class="secondary-btn" type="button" data-start-clear>今日はここまで</button>
            </div>
        </div>
        ${renderLaunchLinks(resolveActionResources(state, { type: "task", task: sessionTask }))}
    `;
}

function renderLaunchLinks(links) {
    return `
        <div class="start-launch">
            <span class="metric-label">開くもの</span>
            ${links.length ? `
                <div class="start-launch-list">
                    ${links.map((link) => `
                        <a class="start-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
                            <strong>${escapeHtml(link.title)}</strong>
                            <span>${escapeHtml(link.category || "Resource")}</span>
                        </a>
                    `).join("")}
                </div>
            ` : `<p class="start-note">関連Resourceはまだありません。TaskにLinkかResourceを紐づけると、ここから直接始められます。</p>`}
        </div>
    `;
}

function renderSyncStatus(state) {
    const pill = document.querySelector("#todo-board .panel-header > .status-pill");
    const banner = document.getElementById("sync-banner");
    const synced = state.syncStatus === "notion";
    const syncing = state.syncStatus === "syncing";
    if (pill) pill.textContent = syncing ? "同期中" : synced ? "Notion同期" : "ローカル保存";
    if (banner) {
        banner.textContent = state.syncMessage || (syncing ? "Notionへ保存中..." : synced ? "Notionと同期済み" : "ローカル保存中。Notion接続に失敗した操作があるかもしれません。");
        banner.classList.toggle("is-local", !synced && !syncing);
        banner.classList.toggle("is-syncing", syncing);
    }
}

function renderManagementLists(state) {
    const extendedList = document.getElementById("settings-extended-list");
    const shortcutList = document.getElementById("settings-shortcut-list");
    const taskList = document.getElementById("settings-task-list");
    const logList = document.getElementById("settings-log-list");
    const noteList = document.getElementById("settings-note-list");

    if (extendedList) {
        const items = Object.entries(extendedDbConfig).flatMap(([type, config]) => {
            const records = state.extended?.[config.stateKey] || [];
            return records.slice(0, 8).map((item) => ({ ...item, extendedType: type, dbLabel: config.label }));
        });
        extendedList.innerHTML = items.length
            ? items.map((item) => `
                <article class="management-item">
                    <span>${item.dbLabel}: ${item.title || "Untitled"}</span>
                    <div class="management-actions">
                        <button class="item-action danger-text" type="button" data-extended-archive="${item.extendedType}" data-page-id="${item.id}">アーカイブ</button>
                    </div>
                </article>
            `).join("")
            : `<p class="placeholder">その他DBの管理対象はありません。</p>`;
    }

    if (shortcutList) {
        shortcutList.innerHTML = state.shortcuts.length
            ? state.shortcuts.slice(0, 12).map((shortcut) => `
                <article class="management-item">
                    <span>${shortcut.title || "Untitled Shortcut"}</span>
                    <div class="management-actions">
                        <button class="item-action" type="button" data-manage-edit="shortcut" data-page-id="${shortcut.id}">編集</button>
                        <button class="item-action danger-text" type="button" data-manage-archive="shortcut" data-page-id="${shortcut.id}">アーカイブ</button>
                    </div>
                </article>
            `).join("")
            : `<p class="placeholder">管理対象のショートカットはありません。</p>`;
    }

    if (taskList) {
        taskList.innerHTML = state.tasks.length
            ? state.tasks.slice(0, 12).map((task) => `
                <article class="management-item">
                    <span>${task.title || "Untitled Task"}</span>
                    <div class="management-actions">
                        <button class="item-action" type="button" data-manage-edit="task" data-page-id="${task.id}">編集</button>
                        <button class="item-action danger-text" type="button" data-manage-archive="task" data-page-id="${task.id}">アーカイブ</button>
                    </div>
                </article>
            `).join("")
            : `<p class="placeholder">管理対象のTodoはありません。</p>`;
    }

    if (logList) {
        logList.innerHTML = state.logs.length
            ? state.logs.slice(0, 12).map((log) => `
                <article class="management-item">
                    <span>${log.area || "活動"} / ${log.minutes || 0}分 / ${log.memo || log.category || "ログ"}</span>
                    <div class="management-actions">
                        <button class="item-action" type="button" data-manage-edit="log" data-page-id="${log.id}">編集</button>
                        <button class="item-action danger-text" type="button" data-manage-archive="log" data-page-id="${log.id}">アーカイブ</button>
                    </div>
                </article>
            `).join("")
            : `<p class="placeholder">管理対象の活動ログはありません。</p>`;
    }

    if (noteList) {
        noteList.innerHTML = state.notes.length
            ? state.notes.slice(0, 12).map((note) => `
                <article class="management-item">
                    <span>${note.title || note.summary || "Untitled Note"}</span>
                    <div class="management-actions">
                        <button class="item-action" type="button" data-manage-edit="note" data-page-id="${note.id}">編集</button>
                        <button class="item-action danger-text" type="button" data-manage-archive="note" data-page-id="${note.id}">アーカイブ</button>
                    </div>
                </article>
            `).join("")
            : `<p class="placeholder">管理対象のナレッジはありません。</p>`;
    }
}

function render(state) {
    renderTasks(state);
    renderDayPlanner(state);
    renderShortcuts(state);
    renderLogs(state);
    renderDailyReviews(state);
    renderNotes(state);
    renderKnowledgeDetail(state, state.selectedNoteId);
    renderProjectHub(state);
    renderGoalDetail(state);
    renderGoalPlanPreview(state);
    renderMetrics(state);
    renderLifeBalance(state);
    renderCategorySummary(state);
    renderNextAction(state);
    renderStartConsole(state);
    renderReminderPanel(state);
    renderSyncStatus(state);
    renderManagementLists(state);
    populateRelationSelects(state);
}

function setupDayPlanner(state) {
    const form = document.getElementById("day-plan-settings");
    const picker = document.getElementById("day-plan-task-picker");
    const autoButton = document.getElementById("day-plan-auto");
    const blockForm = document.getElementById("day-plan-block-form");
    const blockList = document.getElementById("day-plan-block-list");
    const weekTabs = document.getElementById("day-plan-week-tabs");

    const updateSettings = () => {
        updateCurrentDayPlan(state, {
            type: document.getElementById("day-plan-type").value,
            useFixedWork: document.getElementById("day-plan-use-fixed-work").checked,
            bufferMinutes: Number(document.getElementById("day-plan-buffer").value || 0),
            workStart: document.getElementById("day-plan-work-start").value,
            workEnd: document.getElementById("day-plan-work-end").value,
            freeStart: document.getElementById("day-plan-free-start").value,
            freeEnd: document.getElementById("day-plan-free-end").value,
        });
        saveLocalState(state);
        renderDayPlanner(state);
    };

    form?.addEventListener("input", updateSettings);
    form?.addEventListener("change", updateSettings);

    picker?.addEventListener("change", (event) => {
        const plan = currentDayPlan(state);
        const checkbox = event.target.closest("[data-day-plan-task]");
        const timeInput = event.target.closest("[data-day-plan-start-time]");
        const range = event.target.closest("[data-day-plan-start-range]");
        if (checkbox) {
            const ids = new Set(plan.selectedTaskIds || []);
            const taskStarts = { ...(plan.taskStarts || {}) };
            if (checkbox.checked) ids.add(checkbox.dataset.dayPlanTask);
            else {
                ids.delete(checkbox.dataset.dayPlanTask);
                delete taskStarts[checkbox.dataset.dayPlanTask];
            }
            updateCurrentDayPlan(state, { selectedTaskIds: Array.from(ids), taskStarts });
        } else if (timeInput) {
            const taskStarts = { ...(plan.taskStarts || {}) };
            if (timeInput.value) taskStarts[timeInput.dataset.dayPlanStartTime] = timeInput.value;
            else delete taskStarts[timeInput.dataset.dayPlanStartTime];
            updateCurrentDayPlan(state, { taskStarts });
        } else if (range) {
            const taskStarts = { ...(plan.taskStarts || {}) };
            taskStarts[range.dataset.dayPlanStartRange] = minutesToTime(Number(range.value));
            updateCurrentDayPlan(state, { taskStarts });
        } else {
            return;
        }
        saveLocalState(state);
        renderDayPlanner(state);
    });

    picker?.addEventListener("input", (event) => {
        const range = event.target.closest("[data-day-plan-start-range]");
        if (!range) return;
        const plan = currentDayPlan(state);
        const taskStarts = { ...(plan.taskStarts || {}) };
        const value = minutesToTime(Number(range.value));
        taskStarts[range.dataset.dayPlanStartRange] = value;
        updateCurrentDayPlan(state, { taskStarts });
        const timeInput = picker.querySelector(`[data-day-plan-start-time="${CSS.escape(range.dataset.dayPlanStartRange)}"]`);
        if (timeInput) timeInput.value = value;
        saveLocalState(state);
    });

    picker?.addEventListener("click", (event) => {
        const autoTaskButton = event.target.closest("[data-day-plan-auto-task]");
        if (!autoTaskButton) return;
        const plan = currentDayPlan(state);
        const taskStarts = { ...(plan.taskStarts || {}) };
        delete taskStarts[autoTaskButton.dataset.dayPlanAutoTask];
        updateCurrentDayPlan(state, { taskStarts });
        saveLocalState(state);
        renderDayPlanner(state);
    });

    autoButton?.addEventListener("click", () => {
        updateCurrentDayPlan(state, { selectedTaskIds: recommendedDayPlanTaskIds(state) });
        saveLocalState(state);
        renderDayPlanner(state);
    });

    blockForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const type = document.getElementById("day-plan-block-type").value;
        const start = document.getElementById("day-plan-block-start").value;
        const end = document.getElementById("day-plan-block-end").value;
        if (!start || !end || timeToMinutes(end) <= timeToMinutes(start)) {
            showToast("予定の開始/終了時間を確認してください。", "error");
            return;
        }
        const title = document.getElementById("day-plan-block-title").value.trim() || scheduleBlockTypeLabel(type);
        const plan = currentDayPlan(state);
        updateCurrentDayPlan(state, {
            scheduleBlocks: normalizeScheduleBlocks([
                ...(plan.scheduleBlocks || []),
                {
                    id: `schedule-block-${Date.now()}`,
                    type,
                    title,
                    start,
                    end,
                },
            ]),
        });
        document.getElementById("day-plan-block-title").value = "";
        saveLocalState(state);
        renderDayPlanner(state);
        showToast("予定ブロックを追加しました。", "success");
    });

    blockList?.addEventListener("click", (event) => {
        const removeButton = event.target.closest("[data-day-plan-block-remove]");
        if (!removeButton) return;
        const plan = currentDayPlan(state);
        updateCurrentDayPlan(state, {
            scheduleBlocks: (plan.scheduleBlocks || []).filter((block) => block.id !== removeButton.dataset.dayPlanBlockRemove),
        });
        saveLocalState(state);
        renderDayPlanner(state);
    });

    weekTabs?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-day-plan-date]");
        if (!button) return;
        state.dayPlan.activeDate = button.dataset.dayPlanDate;
        if (!state.dayPlan.weekPlans?.[state.dayPlan.activeDate]) {
            state.dayPlan.weekPlans = state.dayPlan.weekPlans || {};
            state.dayPlan.weekPlans[state.dayPlan.activeDate] = defaultPlanForDate(state, state.dayPlan.activeDate);
        }
        saveLocalState(state);
        renderDayPlanner(state);
    });
}

function setupStartConsole(state) {
    const consoleEl = document.getElementById("start-console");
    if (!consoleEl) return;

    consoleEl.addEventListener("click", async (event) => {
        const startButton = event.target.closest("[data-start-minutes]");
        if (startButton) {
            startFocusSession(state, Number(startButton.dataset.startMinutes));
            return;
        }

        const extendButton = event.target.closest("[data-start-extend]");
        if (extendButton) {
            extendFocusSession(state, Number(extendButton.dataset.startExtend));
            return;
        }

        if (event.target.closest("[data-start-clear]")) {
            clearFocusSession(state);
            return;
        }

        if (event.target.closest("[data-start-record]")) {
            await saveSessionAsLog(state);
        }
    });

    if (sessionTimerId) window.clearInterval(sessionTimerId);
    sessionTimerId = window.setInterval(() => {
        if (!state.activeSession) return;
        const wasRunning = state.activeSession.isRunning;
        const finished = updateActiveSessionProgress(state, true);
        renderStartConsole(state);
        if (wasRunning && finished) showToast("一区切りです。記録するか、少しだけ続けられます。", "success");
    }, 1000);
}

function setupReminderControls(state) {
    const panel = document.getElementById("reminder-panel");
    if (!panel) return;

    panel.addEventListener("change", (event) => {
        if (event.target.id !== "reminder-interval") return;
        state.reminders.intervalMinutes = Number(event.target.value || 60);
        if (state.reminders.enabled) scheduleNextReminder(state, state.reminders.intervalMinutes);
        saveLocalState(state);
        renderReminderPanel(state);
    });

    panel.addEventListener("click", async (event) => {
        if (event.target.closest("[data-reminder-enable]")) {
            await toggleReminders(state);
            return;
        }

        const snoozeButton = event.target.closest("[data-reminder-snooze]");
        if (snoozeButton) {
            scheduleNextReminder(state, Number(snoozeButton.dataset.reminderSnooze || 15));
            state.reminders.enabled = true;
            saveLocalState(state);
            renderReminderPanel(state);
            showToast("15分後に、今日の一手へ戻します。", "success");
            return;
        }

        if (event.target.closest("[data-reminder-test]")) {
            sendReminderNotification(state, true);
        }
    });

    if (reminderTimerId) window.clearInterval(reminderTimerId);
    reminderTimerId = window.setInterval(() => checkReminderDue(state), 30000);
    checkReminderDue(state);
}

async function toggleReminders(state) {
    const notificationApi = typeof window !== "undefined" ? window.Notification : null;

    if (state.reminders.enabled && (!notificationApi || notificationApi.permission === "granted")) {
        state.reminders.enabled = false;
        state.reminders.nextAt = "";
        saveLocalState(state);
        renderReminderPanel(state);
        showToast("リマインドを停止しました。", "info");
        return;
    }

    if (notificationApi && notificationApi.permission === "default") {
        await notificationApi.requestPermission();
    }

    if (notificationApi && notificationApi.permission === "denied") {
        renderReminderPanel(state);
        showToast("ブラウザ通知がブロックされています。設定から許可できます。", "error");
        return;
    }

    state.reminders.enabled = true;
    if (!state.reminders.nextAt) scheduleNextReminder(state, state.reminders.intervalMinutes);
    saveLocalState(state);
    renderReminderPanel(state);
    showToast("リマインドをONにしました。", "success");
}

function scheduleNextReminder(state, minutes) {
    const delayMinutes = Math.max(1, Number(minutes || state.reminders?.intervalMinutes || 60));
    state.reminders.nextAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
}

function checkReminderDue(state) {
    if (!state.reminders?.enabled) return;
    if (!state.reminders.nextAt) {
        scheduleNextReminder(state, state.reminders.intervalMinutes);
        saveLocalState(state);
        renderReminderPanel(state);
        return;
    }

    const dueAt = new Date(state.reminders.nextAt).getTime();
    if (!Number.isFinite(dueAt) || Date.now() < dueAt) return;

    if (isReminderQuietTime(state.reminders)) {
        scheduleNextReminder(state, 15);
        saveLocalState(state);
        renderReminderPanel(state);
        return;
    }

    sendReminderNotification(state);
    scheduleNextReminder(state, state.reminders.intervalMinutes);
    saveLocalState(state);
    renderReminderPanel(state);
}

function isReminderQuietTime(settings) {
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const start = timeToMinutes(settings.quietStart || "23:00");
    const end = timeToMinutes(settings.quietEnd || "07:00");
    if (start === end) return false;
    if (start < end) return current >= start && current < end;
    return current >= start || current < end;
}

function sendReminderNotification(state, forced = false) {
    const message = reminderMessage(state);
    const notificationApi = typeof window !== "undefined" ? window.Notification : null;

    if (notificationApi && notificationApi.permission === "granted") {
        new notificationApi("Life Dashboard", {
            body: message,
            tag: "life-dashboard-reminder",
            renotify: forced,
        });
    }

    state.reminders.lastNotifiedAt = new Date().toISOString();
    saveLocalState(state);
    renderReminderPanel(state);
    showToast(message, forced ? "success" : "info");
}

function reminderMessage(state) {
    const action = selectNextAction(state);
    if (action?.type === "task") return `「${action.task.title}」を5分だけ始める時間です。`;
    if (action?.type === "note") return `実行候補「${action.note.actionText || action.note.title}」をTodoにして進められます。`;
    if (action?.type === "goal") return `Goal「${action.goal.title}」から小さなTodoを1つ作れます。`;
    return "Life Dashboardを開いて、今日の一手を1つだけ決めましょう。";
}

function setupLifeBalanceForms(state) {
    const scoreForm = document.getElementById("life-score-form");
    const assetsForm = document.getElementById("life-assets-form");

    scoreForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const date = todayKey();
        const score = {
            id: `life-score-${date}`,
            date,
            happiness: Number(document.getElementById("life-score-happiness").value || 3),
            health: Number(document.getElementById("life-score-health").value || 3),
            growth: Number(document.getElementById("life-score-growth").value || 3),
            money: Number(document.getElementById("life-score-money").value || 3),
            creation: Number(document.getElementById("life-score-creation").value || 3),
            rest: Number(document.getElementById("life-score-rest").value || 3),
            memo: document.getElementById("life-score-memo").value.trim(),
        };
        const mood = {
            id: `mood-${date}`,
            date,
            mood: document.getElementById("mood-log-mood").value,
            energy: document.getElementById("mood-log-energy").value,
            stress: document.getElementById("mood-log-stress").value,
            sleepHours: Number(document.getElementById("mood-log-sleep").value || 0),
            memo: score.memo,
        };

        upsertByKey(state.lifeScores, score, "date");
        upsertByKey(state.moodLogs, mood, "date");
        saveLocalState(state);
        render(state);
        showToast("今日の状態を保存しました。", "success");
    });

    assetsForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const month = document.getElementById("finance-month").value || todayKey().slice(0, 7);
        const snapshot = {
            id: `finance-${month}`,
            month,
            cash: Number(document.getElementById("finance-cash").value || 0),
            investment: Number(document.getElementById("finance-investment").value || 0),
            debt: Number(document.getElementById("finance-debt").value || 0),
            savingRate: Number(document.getElementById("finance-saving-rate").value || 0),
            freeMonths: Number(document.getElementById("finance-free-months").value || 0),
            memo: "",
        };
        const topicTitle = document.getElementById("learning-topic-title").value.trim();
        const topicOutput = document.getElementById("learning-topic-output").value.trim();

        upsertByKey(state.financeSnapshots, snapshot, "month");
        if (topicTitle || topicOutput) {
            upsertByKey(state.learningTopics, {
                id: `learning-topic-${topicTitle || month}`,
                title: topicTitle || "学習テーマ",
                area: "学習",
                level: "現在地確認中",
                roadmapStage: "次のアウトプット",
                nextOutput: topicOutput,
                status: "進行中",
                resourceIds: [],
                goalIds: [],
                updatedAt: new Date().toISOString(),
            }, "title");
        }

        saveLocalState(state);
        render(state);
        showToast("月次資産と学習テーマを保存しました。", "success");
    });
}

function upsertByKey(items, item, key) {
    const index = items.findIndex((current) => current[key] === item[key]);
    if (index >= 0) items[index] = { ...items[index], ...item };
    else items.unshift(item);
}

function setSyncState(state, status, message) {
    state.syncStatus = status;
    state.syncMessage = message || "";
    renderSyncStatus(state);
}

function isValidUrl(value) {
    if (!value) return true;
    try {
        new URL(value);
        return true;
    } catch (_) {
        return false;
    }
}

function showValidation(state, message) {
    setSyncState(state, "local", message);
    showToast(message, "error");
}

function showToast(message, type = "info") {
    const stack = document.getElementById("toast-stack");
    if (!stack) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    stack.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3600);
}

function validateTaskInput(state, task) {
    if (!task.title) return showValidation(state, "Todoタイトルは必須です。"), false;
    if (task.estimatedMinutes < 0) return showValidation(state, "見積時間は0以上で入力してください。"), false;
    if (!isValidUrl(task.link)) return showValidation(state, "リンクはURL形式で入力してください。"), false;
    return true;
}

function validateLogInput(state, log) {
    if (!log.minutes || log.minutes <= 0) return showValidation(state, "活動ログの実績時間は1分以上で入力してください。"), false;
    return true;
}

function validateKnowledgeInput(state, note) {
    if (!note.title && !note.summary && !note.body) return showValidation(state, "ナレッジはタイトル、要約、本文のどれかを入力してください。"), false;
    if (!isValidUrl(note.sourceUrl)) return showValidation(state, "参照URLはURL形式で入力してください。"), false;
    if (note.actionable && !note.actionText) return showValidation(state, "実行候補にする場合は実行メモを入力してください。"), false;
    return true;
}

function validateShortcutInput(state, shortcut) {
    if (!shortcut.title) return showValidation(state, "ショートカット名は必須です。"), false;
    if (!shortcut.url || !isValidUrl(shortcut.url)) return showValidation(state, "ショートカットURLはURL形式で入力してください。"), false;
    return true;
}

function todayRelationIds(state) {
    const today = todayKey();
    const taskIds = state.tasks
        .filter((task) => normalizeDateKey(task.createdAt) === today || normalizeDateKey(task.updatedAt) === today || normalizeDateKey(task.completedAt) === today)
        .map((task) => task.id)
        .filter((id) => id && !id.startsWith("task-"));
    const learningLogIds = state.logs
        .filter((log) => normalizeDateKey(log.date) === today)
        .map((log) => log.id)
        .filter((id) => id && !id.startsWith("log-"));
    return { taskIds, learningLogIds };
}

function buildDailySummary(state, review) {
    const today = review.date || todayKey();
    const todayTasks = state.tasks.filter((task) => normalizeDateKey(task.createdAt) === today || normalizeDateKey(task.updatedAt) === today || normalizeDateKey(task.completedAt) === today);
    const todayLogs = state.logs.filter((log) => normalizeDateKey(log.date) === today);
    const todayNotes = state.notes.filter((note) => normalizeDateKey(note.createdAt) === today || normalizeDateKey(note.updatedAt) === today);
    const nextTask = state.tasks.find((task) => !task.completed);
    return [
        `${review.studyMinutes || 0}分の活動、完了Todo ${review.completedTasks || 0}件。`,
        `今日動いたTodo ${todayTasks.length}件、活動ログ ${todayLogs.length}件、ナレッジ ${todayNotes.length}件。`,
        nextTask ? `次の一手候補は「${nextTask.title}」。` : "未完了Todoはありません。",
    ].join(" ");
}

function buildLearningLog(input) {
    const area = input.area || "その他";
    const memo = String(input.memo || "").trim();
    const category = input.category || inferCategory(memo, area);
    const genre = input.genre || inferGenre(memo, area);
    return {
        id: input.id || `log-${Date.now()}`,
        date: input.date || todayKey(),
        minutes: Number(input.minutes || 0),
        area,
        category,
        genre,
        understanding: input.understanding || "不明",
        energy: input.energy || "普通",
        tags: input.tags || "",
        memo,
        relatedTaskId: input.relatedTaskId || "",
        projectIds: input.projectIds || [],
        goalIds: input.goalIds || [],
        resourceIds: input.resourceIds || [],
    };
}

async function saveLearningLogWithFallback(state, log, successMessage = "記録しました。") {
    if (!validateLogInput(state, log)) return null;

    state.logs.unshift(log);
    saveLocalState(state);
    render(state);

    try {
        setSyncState(state, "syncing", "活動ログをNotionへ保存中...");
        const result = await apiPost({ action: "saveLearningLog", ...log });
        if (result.learningLog) state.logs[0] = result.learningLog;
        setSyncState(state, "notion", "活動ログをNotionへ保存しました。");
        saveLocalState(state);
        render(state);
        showToast(successMessage, "success");
        return result.learningLog || log;
    } catch (error) {
        console.warn("saveLearningLog fallback to localStorage", error);
        setSyncState(state, "local", "活動ログはローカル保存です。Notion保存に失敗しました。");
        render(state);
        return log;
    }
}

function startFocusSession(state, minutes) {
    const action = selectNextAction(state);
    if (action?.type !== "task") {
        showToast("開始できるTodoがありません。先にTodoを1つ作りましょう。", "error");
        return;
    }

    const task = {
        ...action.task,
        category: action.task.category || inferCategory(action.task.title || "", action.task.area || "学習"),
        genre: action.task.genre || inferGenre(action.task.title || "", action.task.area || "学習"),
    };
    state.activeSession = createFocusSession(task, minutes);
    saveLocalState(state);
    render(state);
}

function extendFocusSession(state, minutes) {
    const session = state.activeSession;
    if (!session) return;
    state.activeSession = extendSessionData(session, minutes);
    saveLocalState(state);
    render(state);
}

function clearFocusSession(state) {
    state.activeSession = null;
    saveLocalState(state);
    render(state);
}

async function saveSessionAsLog(state) {
    const session = state.activeSession;
    if (!session) return;
    const log = buildLearningLog(sessionToLearningLogInput(session, {
        isRealPageId,
        filterRealIds: realIds,
    }));

    state.activeSession = null;
    await saveLearningLogWithFallback(state, log, "集中セッションを記録しました。");
    showToast("今日も再起動できました。小さな前進として記録しました。", "success");
}

async function refreshFromNotion(state) {
    const localOnlyState = {
        activeSession: state.activeSession,
        dayPlan: state.dayPlan,
        lifeScores: state.lifeScores,
        moodLogs: state.moodLogs,
        financeSnapshots: state.financeSnapshots,
        learningTopics: state.learningTopics,
        reminders: state.reminders,
    };
    const remoteState = await loadRemoteState();
    Object.assign(state, normalizeState({ ...remoteState, ...localOnlyState }));
    saveLocalState(state);
    render(state);
}

async function saveTaskToNotion(state, task) {
    setSyncState(state, "syncing", "TodoをNotionへ保存中...");
    const result = await apiPost({ action: "saveTask", ...task });
    if (result.task) {
        const index = state.tasks.findIndex((item) => item.id === task.id);
        if (index !== -1) state.tasks[index] = result.task;
        setSyncState(state, "notion", "TodoをNotionへ保存しました。");
        saveLocalState(state);
        render(state);
    }
    return result.task;
}

async function archiveItem(state, type, pageId) {
    const realPageId = isRealPageId(pageId);
    const config = {
        task: {
            confirmText: realPageId ? "このTodoをNotion側でもアーカイブしますか？" : "このローカルTodoを表示から外しますか？",
            action: "archiveTask",
            remove: () => {
                state.tasks = state.tasks.filter((task) => task.id !== pageId);
            },
        },
        log: {
            confirmText: realPageId ? "この活動ログをNotion側でもアーカイブしますか？" : "このローカル活動ログを表示から外しますか？",
            action: "archiveLearningLog",
            remove: () => {
                state.logs = state.logs.filter((log) => log.id !== pageId);
            },
        },
        note: {
            confirmText: realPageId ? "このナレッジをNotion側でもアーカイブしますか？" : "このローカルナレッジを表示から外しますか？",
            action: "archiveKnowledgeNote",
            remove: () => {
                state.notes = state.notes.filter((note) => note.id !== pageId);
            },
        },
        shortcut: {
            confirmText: realPageId ? "このショートカットをNotion側でもアーカイブしますか？" : "このローカルショートカットを表示から外しますか？",
            action: "archiveShortcut",
            remove: () => {
                state.shortcuts = state.shortcuts.filter((shortcut) => shortcut.id !== pageId);
            },
        },
    }[type];

    if (!config || !pageId) return;
    if (!confirm(config.confirmText)) return;

    config.remove();
    saveLocalState(state);
    render(state);

    if (!realPageId) {
        setSyncState(state, "local", "ローカル項目を表示から外しました。");
        showToast("ローカル項目を表示から外しました。", "success");
        return;
    }

    try {
        setSyncState(state, "syncing", "Notionでアーカイブ中...");
        await apiPost({ action: config.action, pageId });
        setSyncState(state, "notion", "Notionでアーカイブしました。");
        saveLocalState(state);
        render(state);
    } catch (error) {
        console.warn(`${config.action} failed`, error);
        setSyncState(state, "local", "Notion側のアーカイブに失敗しました。ローカル表示からは外しました。");
        render(state);
        showToast("Notion側のアーカイブに失敗しました。ローカル表示からは外しました。", "error");
    }
}

function findItem(state, type, id) {
    if (type === "task") return state.tasks.find((item) => item.id === id);
    if (type === "log") return state.logs.find((item) => item.id === id);
    if (type === "note") return state.notes.find((item) => item.id === id);
    if (type === "shortcut") return state.shortcuts.find((item) => item.id === id);
    return null;
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function tagText(tags) {
    return Array.isArray(tags) ? tags.join(", ") : String(tags || "");
}

function findExtendedItem(state, stateKey, id) {
    return (state.extended?.[stateKey] || []).find((item) => item.id === id);
}

function relationNames(state, ids, stateKey, fallbackLabel) {
    return (ids || [])
        .map((id) => findExtendedItem(state, stateKey, id)?.title || fallbackLabel || id)
        .filter(Boolean)
        .join(", ");
}

function taskNames(state, ids) {
    return (ids || [])
        .map((id) => state.tasks.find((task) => task.id === id)?.title || id)
        .filter(Boolean)
        .join(", ");
}

function logNames(state, ids) {
    return (ids || [])
        .map((id) => {
            const log = state.logs.find((item) => item.id === id);
            return log ? `${log.date || "日付なし"} ${log.category || log.memo || "活動ログ"}` : id;
        })
        .filter(Boolean)
        .join(", ");
}

function noteNames(state, ids) {
    return (ids || [])
        .map((id) => state.notes.find((note) => note.id === id)?.title || id)
        .filter(Boolean)
        .join(", ");
}

function relationBadges(state, item) {
    const labels = [
        relationNames(state, item.projectIds, "projects"),
        relationNames(state, item.goalIds, "goals"),
        relationNames(state, item.resourceIds, "resources"),
    ].filter(Boolean);
    return labels.length
        ? `<div class="relation-badges">${labels.map((label) => `<span class="status-pill">${escapeHtml(label)}</span>`).join("")}</div>`
        : "";
}

function isRealPageId(id) {
    return Boolean(id)
        && !["undefined", "null"].includes(String(id))
        && !/^(task|log|note|shortcut|project|goal|habit|weeklyReview|tag|category|aiInsight|resource|dashboardSetting|review)-/.test(String(id));
}

function relationOptionLabel(item, fallback = "Untitled") {
    const title = item.title || item.memo || item.summary || fallback;
    const meta = [item.area, item.category || item.type, item.status].filter(Boolean).join(" / ");
    return meta ? `${title} (${meta})` : title;
}

function setRelationOptions(selectId, items, emptyLabel = "自動/未指定") {
    const select = document.getElementById(selectId);
    if (!select) return;
    const currentValue = select.value;
    const options = (items || []).filter((item) => isRealPageId(item.id));
    select.innerHTML = [
        `<option value="">${escapeHtml(emptyLabel)}</option>`,
        ...options.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(relationOptionLabel(item))}</option>`),
    ].join("");
    if (currentValue && options.some((item) => item.id === currentValue)) select.value = currentValue;
}

function populateRelationSelects(state) {
    const extended = state.extended || {};
    setRelationOptions("task-related-project", extended.projects || []);
    setRelationOptions("task-related-goal", extended.goals || []);
    setRelationOptions("task-related-resource", extended.resources || []);

    setRelationOptions("log-related-task", state.tasks || []);
    setRelationOptions("log-related-project", extended.projects || []);
    setRelationOptions("log-related-goal", extended.goals || []);
    setRelationOptions("log-related-resource", extended.resources || []);

    setRelationOptions("knowledge-related-task", state.tasks || []);
    setRelationOptions("knowledge-related-log", state.logs || []);
    setRelationOptions("knowledge-related-project", extended.projects || []);
    setRelationOptions("knowledge-related-goal", extended.goals || []);
    setRelationOptions("knowledge-related-resource", extended.resources || []);

    setRelationOptions("extended-related-project", extended.projects || []);
    setRelationOptions("extended-related-goal", extended.goals || []);
    setRelationOptions("extended-related-resource", extended.resources || []);
}

function wordsForRelation(value) {
    return String(value || "")
        .toLowerCase()
        .split(/[\s,、。・/|:：()（）\[\]【】"'`]+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 2);
}

function inferRelatedId(items, text, area) {
    const words = wordsForRelation(text);
    if (!words.length && !area) return "";

    let best = { id: "", score: 0 };
    (items || []).filter((item) => isRealPageId(item.id)).forEach((item) => {
        const target = [
            item.title,
            item.memo,
            item.summary,
            item.body,
            item.area,
            item.category,
            item.genre,
            item.type,
            item.status,
        ].join(" ").toLowerCase();
        const wordScore = words.reduce((score, word) => score + (target.includes(word) ? 2 : 0), 0);
        const areaScore = area && item.area === area ? 3 : 0;
        const score = wordScore + areaScore;
        if (score > best.score) best = { id: item.id, score };
    });

    return best.score >= 3 ? best.id : "";
}

function relationIdFromSelect(selectId) {
    const id = document.getElementById(selectId)?.value || "";
    return isRealPageId(id) ? id : "";
}

function relationIdsFromSelectOrInference(selectId, items, text, area) {
    const selectedId = relationIdFromSelect(selectId);
    const id = selectedId || inferRelatedId(items, text, area);
    return id ? [id] : [];
}

function firstRelationId(selectId, items, text, area) {
    return relationIdsFromSelectOrInference(selectId, items, text, area)[0] || "";
}

function detailRows(rows) {
    return rows
        .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
        .map(([label, value]) => `
            <div class="detail-row">
                <span>${escapeHtml(label)}</span>
                <p>${escapeHtml(value)}</p>
            </div>
        `)
        .join("");
}

function openDetailModal(state, type, id) {
    const item = findItem(state, type, id);
    const modal = document.getElementById("detail-modal");
    if (!item || !modal) return;

    const typeLabel = { task: "Todo", log: "活動ログ", note: "ナレッジ" }[type] || "Detail";
    document.getElementById("detail-modal-type").textContent = typeLabel;
    document.getElementById("detail-modal-title").textContent = item.title || item.memo || item.summary || "詳細";

    const body = document.getElementById("detail-modal-body");
    if (type === "task") {
        body.innerHTML = detailRows([
            ["ステータス", statusLabel(item)],
            ["優先度", item.priority],
            ["領域", item.area],
            ["カテゴリ", item.category],
            ["ジャンル", item.genre],
            ["見積時間", item.estimatedMinutes ? formatDuration(item.estimatedMinutes) : ""],
            ["実績時間", item.actualMinutes ? formatDuration(item.actualMinutes) : ""],
            ["メモ", item.memo],
            ["リンク", item.link],
            ["関連Project", relationNames(state, item.projectIds, "projects")],
            ["関連Goal", relationNames(state, item.goalIds, "goals")],
            ["関連Resource", relationNames(state, item.resourceIds, "resources")],
            ["由来ナレッジ", noteNames(state, item.knowledgeNoteIds)],
        ]);
    } else if (type === "log") {
        body.innerHTML = detailRows([
            ["日付", item.date],
            ["実績時間", item.minutes ? formatDuration(item.minutes) : ""],
            ["領域", item.area],
            ["カテゴリ", item.category],
            ["ジャンル", item.genre],
            ["理解度", item.understanding],
            ["エネルギー", item.energy],
            ["タグ", tagText(item.tags)],
            ["メモ", item.memo],
            ["関連Todo", taskNames(state, item.relatedTaskIds || (item.relatedTaskId ? [item.relatedTaskId] : []))],
            ["関連Project", relationNames(state, item.projectIds, "projects")],
            ["関連Goal", relationNames(state, item.goalIds, "goals")],
            ["関連Resource", relationNames(state, item.resourceIds, "resources")],
        ]);
    } else {
        body.innerHTML = detailRows([
            ["領域", item.area],
            ["カテゴリ", item.category],
            ["ジャンル", item.genre],
            ["タグ", tagText(item.tags)],
            ["参照URL", item.sourceUrl],
            ["要約", item.summary],
            ["本文", item.body],
            ["実行候補", item.actionable ? "はい" : "いいえ"],
            ["実行メモ", item.actionText],
            ["関連Todo", taskNames(state, item.relatedTaskIds || (item.relatedTaskId ? [item.relatedTaskId] : []))],
            ["関連ログ", logNames(state, item.relatedLogIds || (item.relatedLogId ? [item.relatedLogId] : []))],
            ["関連Project", relationNames(state, item.projectIds, "projects")],
            ["関連Goal", relationNames(state, item.goalIds, "goals")],
            ["関連Resource", relationNames(state, item.resourceIds, "resources")],
        ]);
    }

    const actions = document.getElementById("detail-modal-actions");
    actions.innerHTML = `
        <button class="secondary-btn" type="button" data-manage-edit="${type}" data-page-id="${id}">編集</button>
        ${type === "note" && item.actionable && item.actionText ? `<button type="button" data-note-create-task="${id}">Todoにする</button>` : ""}
    `;

    modal.classList.remove("hidden");
}

function closeDetailModal() {
    document.getElementById("detail-modal")?.classList.add("hidden");
}

function closeEditModal() {
    document.getElementById("edit-modal")?.classList.add("hidden");
}

function buildNoteTaskForm(note) {
    return `
        <input type="hidden" name="type" value="noteTask">
        <input type="hidden" name="noteId" value="${escapeHtml(note.id)}">
        <label>Todo<input name="title" type="text" value="${escapeHtml(note.actionText || note.title || note.summary || "")}"></label>
        <div class="form-row">
            <label>優先度<select name="priority">${optionsHtml(["今日中", "なるべく早く", "余裕があれば"], "なるべく早く")}</select></label>
            <label>見積時間<input name="estimatedMinutes" type="number" min="0" step="5" value="0"></label>
        </div>
        <label>リンク<input name="link" type="url" value="${escapeHtml(note.sourceUrl || "")}"></label>
        <label>メモ<textarea name="memo">${escapeHtml(`ナレッジ由来: ${note.title || note.summary || ""}`)}</textarea></label>
        <div class="edit-actions">
            <button type="submit">Todoを作成</button>
            <button class="secondary-btn" type="button" data-edit-close>キャンセル</button>
        </div>
    `;
}

function createTaskFromNote(state, noteId) {
    const note = findItem(state, "note", noteId);
    if (!note || !note.actionText) return;

    const modal = document.getElementById("edit-modal");
    const form = document.getElementById("edit-form");
    if (!modal || !form) return;

    document.getElementById("edit-modal-type").textContent = "Knowledge";
    document.getElementById("edit-modal-title").textContent = "ナレッジからTodoを作成";
    form.innerHTML = buildNoteTaskForm(note);
    closeDetailModal();
    modal.classList.remove("hidden");
}

async function saveTaskFromNote(state, note, formData) {
    if (!note || !note.actionText) return;

    const task = {
        id: `task-${Date.now()}`,
        title: String(formData.get("title") || "").trim(),
        priority: String(formData.get("priority") || "なるべく早く"),
        area: note.area === "応用情報" ? "学習" : note.area,
        category: note.category === "問題解説" ? "苦手復習" : "知識整理",
        genre: note.genre || "その他",
        estimatedMinutes: Number(formData.get("estimatedMinutes") || 0),
        memo: String(formData.get("memo") || "").trim(),
        link: String(formData.get("link") || "").trim(),
        status: "準備中",
        completed: false,
        knowledgeNoteIds: isRealPageId(note.id) ? [note.id] : [],
        projectIds: note.projectIds || [],
        goalIds: note.goalIds || [],
        resourceIds: note.resourceIds || [],
    };

    if (!validateTaskInput(state, task)) return;
    state.tasks.unshift(task);
    saveLocalState(state);
    render(state);

    try {
        await saveTaskToNotion(state, task);
        closeEditModal();
        showToast("Todoを作成しました。", "success");
    } catch (error) {
        console.warn("createTaskFromNote fallback to localStorage", error);
        state.syncStatus = "local";
        render(state);
        showToast("NotionへのTodo作成に失敗しました。ローカルには追加しました。", "error");
    }
}

function optionsHtml(options, selectedValue) {
    return options.map((option) => `<option ${option === selectedValue ? "selected" : ""}>${escapeHtml(option)}</option>`).join("");
}

function checkboxValue(value) {
    return value ? "checked" : "";
}

function buildEditForm(type, item) {
    if (type === "task") {
        const taskCategories = uniqueOptions(categoryByArea[item.area] || categoryByArea["その他"], item.category);
        const taskGenres = uniqueOptions(genreByArea[item.area] || genreByArea["その他"], item.genre);
        return `
            <input type="hidden" name="type" value="task">
            <input type="hidden" name="id" value="${escapeHtml(item.id)}">
            <label>タイトル<input name="title" type="text" value="${escapeHtml(item.title)}"></label>
            <div class="form-row">
                <label>ステータス<select name="status">${optionsHtml(["準備中", "未着手", "進行中", "完了", "保留", "スキップ"], item.status || "準備中")}</select></label>
                <label>優先度<select name="priority">${optionsHtml(["今日中", "なるべく早く", "余裕があれば"], item.priority || "今日中")}</select></label>
            </div>
            <div class="form-row">
                <label>領域<select name="area" data-edit-area>${optionsHtml(["学習", "開発", "英語", "読書", "創作", "生活", "お金", "健康", "その他"], item.area || "学習")}</select></label>
                <label>カテゴリ<select name="category">${optionsHtml(taskCategories, item.category)}</select></label>
            </div>
            <div class="form-row">
                <label>ジャンル<select name="genre">${optionsHtml(taskGenres, item.genre)}</select></label>
                <label>見積時間<input name="estimatedMinutes" type="number" min="0" step="5" value="${escapeHtml(item.estimatedMinutes)}"></label>
            </div>
            <label>リンク<input name="link" type="url" value="${escapeHtml(item.link)}"></label>
            <label>メモ<textarea name="memo">${escapeHtml(item.memo)}</textarea></label>
            <label class="inline-check"><input name="completed" type="checkbox" ${checkboxValue(item.completed)}><span>完了</span></label>
            <div class="edit-actions">
                <button type="submit">保存</button>
                <button class="secondary-btn" type="button" data-edit-close>キャンセル</button>
            </div>
        `;
    }

    if (type === "log") {
        const logCategories = uniqueOptions(categoryByArea[item.area] || categoryByArea["その他"], item.category);
        const logGenres = uniqueOptions(genreByArea[item.area] || genreByArea["その他"], item.genre);
        return `
            <input type="hidden" name="type" value="log">
            <input type="hidden" name="id" value="${escapeHtml(item.id)}">
            <div class="form-row">
                <label>日付<input name="date" type="date" value="${escapeHtml(normalizeDateKey(item.date))}"></label>
                <label>実績時間<input name="minutes" type="number" min="1" step="1" value="${escapeHtml(item.minutes)}"></label>
            </div>
            <div class="form-row">
                <label>領域<select name="area">${optionsHtml(["応用情報", "英語", "プログラミング", "読書", "創作", "生活", "健康", "お金", "その他"], item.area || "応用情報")}</select></label>
                <label>カテゴリ<select name="category">${optionsHtml(logCategories, item.category)}</select></label>
            </div>
            <div class="form-row">
                <label>ジャンル<select name="genre">${optionsHtml(logGenres, item.genre)}</select></label>
                <label>タグ<input name="tags" type="text" value="${escapeHtml(tagText(item.tags))}"></label>
            </div>
            <div class="form-row">
                <label>理解度<select name="understanding">${optionsHtml(["不明", "少し理解", "だいたい理解", "人に説明できる"], item.understanding || "不明")}</select></label>
                <label>エネルギー<select name="energy">${optionsHtml(["普通", "低い", "高い"], item.energy || "普通")}</select></label>
            </div>
            <label>メモ<textarea name="memo">${escapeHtml(item.memo)}</textarea></label>
            <div class="edit-actions">
                <button type="submit">保存</button>
                <button class="secondary-btn" type="button" data-edit-close>キャンセル</button>
            </div>
        `;
    }

    if (type === "shortcut") {
        return `
            <input type="hidden" name="type" value="shortcut">
            <input type="hidden" name="id" value="${escapeHtml(item.id)}">
            <label>名前<input name="title" type="text" value="${escapeHtml(item.title)}"></label>
            <label>URL<input name="url" type="url" value="${escapeHtml(item.url)}"></label>
            <div class="form-row">
                <label>カテゴリ<select name="category">${optionsHtml(["応用情報", "Notion", "開発", "ニュース", "英語", "スポット", "その他"], item.category || "その他")}</select></label>
                <label>並び順<input name="sortOrder" type="number" min="0" step="1" value="${escapeHtml(item.sortOrder)}"></label>
            </div>
            <label>メモ<input name="memo" type="text" value="${escapeHtml(item.memo)}"></label>
            <label class="inline-check"><input name="enabled" type="checkbox" ${checkboxValue(item.enabled !== false)}><span>表示する</span></label>
            <div class="edit-actions">
                <button type="submit">保存</button>
                <button class="secondary-btn" type="button" data-edit-close>キャンセル</button>
            </div>
        `;
    }

    const noteGenres = uniqueOptions(genreByArea[item.area] || genreByArea["その他"], item.genre);
    return `
        <input type="hidden" name="type" value="note">
        <input type="hidden" name="id" value="${escapeHtml(item.id)}">
        <label>タイトル<input name="title" type="text" value="${escapeHtml(item.title)}"></label>
        <div class="form-row">
            <label>領域<select name="area">${optionsHtml(["応用情報", "英語", "開発", "読書", "創作", "生活", "その他"], item.area || "応用情報")}</select></label>
            <label>カテゴリ<select name="category">${optionsHtml(["知識整理", "問題解説", "調査", "アイデア", "反省", "その他"], item.category || "知識整理")}</select></label>
        </div>
        <div class="form-row">
            <label>ジャンル<select name="genre">${optionsHtml(noteGenres, item.genre)}</select></label>
            <label>タグ<input name="tags" type="text" value="${escapeHtml(tagText(item.tags))}"></label>
        </div>
        <label>参照URL<input name="sourceUrl" type="url" value="${escapeHtml(item.sourceUrl)}"></label>
        <label>要約<textarea name="summary">${escapeHtml(item.summary)}</textarea></label>
        <label>本文<textarea name="body">${escapeHtml(item.body)}</textarea></label>
        <label class="inline-check"><input name="actionable" type="checkbox" ${checkboxValue(item.actionable)}><span>実行候補</span></label>
        <label>実行メモ<input name="actionText" type="text" value="${escapeHtml(item.actionText)}"></label>
        <div class="edit-actions">
            <button type="submit">保存</button>
            <button class="secondary-btn" type="button" data-edit-close>キャンセル</button>
        </div>
    `;
}

function editItem(state, type, id) {
    const item = findItem(state, type, id);
    if (!item) return;

    const modal = document.getElementById("edit-modal");
    const form = document.getElementById("edit-form");
    if (!modal || !form) return;

    const typeLabel = { task: "Todo", log: "活動ログ", note: "ナレッジ" }[type] || "Item";
    document.getElementById("edit-modal-type").textContent = typeLabel;
    document.getElementById("edit-modal-title").textContent = `${typeLabel}を編集`;
    form.innerHTML = buildEditForm(type, item);
    modal.classList.remove("hidden");
}

async function saveEditedItem(state, form) {
    const formData = new FormData(form);
    const type = formData.get("type");
    if (type === "noteTask") {
        const note = findItem(state, "note", formData.get("noteId"));
        await saveTaskFromNote(state, note, formData);
        return;
    }

    const id = formData.get("id");
    const item = findItem(state, type, id);
    if (!item) return;

    let payload = { pageId: id };
    let action = "";
    if (type === "task") {
        const completed = formData.get("completed") === "on";
        payload = {
            ...payload,
            title: String(formData.get("title") || "").trim(),
            status: String(formData.get("status") || ""),
            priority: String(formData.get("priority") || ""),
            area: String(formData.get("area") || ""),
            category: String(formData.get("category") || "").trim(),
            genre: String(formData.get("genre") || "").trim(),
            estimatedMinutes: Number(formData.get("estimatedMinutes") || 0),
            memo: String(formData.get("memo") || "").trim(),
            link: String(formData.get("link") || "").trim(),
            completed,
            completedAt: completed ? (item.completedAt || new Date().toISOString()) : "",
        };
        action = "updateTask";
        if (!validateTaskInput(state, payload)) return;
        Object.assign(item, payload);
    } else if (type === "log") {
        payload = {
            ...payload,
            date: String(formData.get("date") || todayKey()),
            minutes: Number(formData.get("minutes") || 0),
            area: String(formData.get("area") || ""),
            category: String(formData.get("category") || "").trim(),
            genre: String(formData.get("genre") || "").trim(),
            tags: String(formData.get("tags") || "").trim(),
            understanding: String(formData.get("understanding") || ""),
            energy: String(formData.get("energy") || ""),
            memo: String(formData.get("memo") || "").trim(),
        };
        action = "updateLearningLog";
        if (!validateLogInput(state, payload)) return;
        Object.assign(item, payload);
    } else if (type === "note") {
        payload = {
            ...payload,
            title: String(formData.get("title") || "").trim(),
            area: String(formData.get("area") || ""),
            category: String(formData.get("category") || ""),
            genre: String(formData.get("genre") || "").trim(),
            tags: String(formData.get("tags") || "").trim(),
            sourceUrl: String(formData.get("sourceUrl") || "").trim(),
            summary: String(formData.get("summary") || "").trim(),
            body: String(formData.get("body") || "").trim(),
            actionable: formData.get("actionable") === "on",
            actionText: String(formData.get("actionText") || "").trim(),
        };
        action = "updateKnowledgeNote";
        if (!validateKnowledgeInput(state, payload)) return;
        Object.assign(item, payload);
    } else if (type === "shortcut") {
        payload = {
            ...payload,
            title: String(formData.get("title") || "").trim(),
            url: String(formData.get("url") || "").trim(),
            category: String(formData.get("category") || ""),
            sortOrder: Number(formData.get("sortOrder") || 0),
            memo: String(formData.get("memo") || "").trim(),
            enabled: formData.get("enabled") === "on",
        };
        action = "updateShortcut";
        if (!validateShortcutInput(state, payload)) return;
        Object.assign(item, payload);
    }

    saveLocalState(state);
    render(state);

    try {
        setSyncState(state, "syncing", "Notionへ更新中...");
        const result = await apiPost({ action, ...payload });
        if (result.task) Object.assign(item, result.task);
        if (result.learningLog) Object.assign(item, result.learningLog);
        if (result.knowledgeNote) Object.assign(item, result.knowledgeNote);
        if (result.shortcut) Object.assign(item, result.shortcut);
        setSyncState(state, "notion", "Notionを更新しました。");
        saveLocalState(state);
        render(state);
        closeEditModal();
        openDetailModal(state, type, id);
    } catch (error) {
        console.warn(`${action} fallback to localStorage`, error);
        setSyncState(state, "local", "Notionへの更新に失敗しました。ローカル表示だけ更新しました。");
        render(state);
        showToast("Notionへの更新に失敗しました。ローカル表示だけ更新しました。", "error");
    }
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
        const memo = document.getElementById("task-memo").value.trim();
        const relationText = `${title} ${memo}`;

        const task = {
            id: `task-${Date.now()}`,
            title,
            priority: document.getElementById("task-priority").value,
            area: areaInput.value,
            category: categoryInput.value,
            genre: genreInput.value,
            estimatedMinutes: Number(document.getElementById("task-estimated-minutes").value || 0),
            memo,
            link: document.getElementById("task-link").value.trim(),
            status: "準備中",
            completed: false,
            projectIds: relationIdsFromSelectOrInference("task-related-project", state.extended?.projects || [], relationText, areaInput.value),
            goalIds: relationIdsFromSelectOrInference("task-related-goal", state.extended?.goals || [], relationText, areaInput.value),
            resourceIds: relationIdsFromSelectOrInference("task-related-resource", state.extended?.resources || [], relationText, areaInput.value),
        };

        if (!validateTaskInput(state, task)) return;

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
        const memo = memoInput.value.trim();
        const relationText = `${areaInput.value} ${categoryInput.value} ${genreInput.value} ${memo}`;

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
            memo,
            relatedTaskId: firstRelationId("log-related-task", state.tasks || [], relationText, areaInput.value),
            projectIds: relationIdsFromSelectOrInference("log-related-project", state.extended?.projects || [], relationText, areaInput.value),
            goalIds: relationIdsFromSelectOrInference("log-related-goal", state.extended?.goals || [], relationText, areaInput.value),
            resourceIds: relationIdsFromSelectOrInference("log-related-resource", state.extended?.resources || [], relationText, areaInput.value),
        };

        if (!validateLogInput(state, log)) return;

        state.logs.unshift(log);
        form.reset();
        updateAreaOptions(areaInput, categoryInput, genreInput, "過去問道場", "セキュリティ");
        saveLocalState(state);
        render(state);

        try {
            setSyncState(state, "syncing", "活動ログをNotionへ保存中...");
            const result = await apiPost({ action: "saveLearningLog", ...log });
            if (result.learningLog) state.logs[0] = result.learningLog;
            setSyncState(state, "notion", "活動ログをNotionへ保存しました。");
            saveLocalState(state);
            render(state);
        } catch (error) {
            console.warn("saveLearningLog fallback to localStorage", error);
            setSyncState(state, "local", "活動ログはローカル保存です。Notion保存に失敗しました。");
            render(state);
        }
    });
}

function setupQuickLogForm(state) {
    const form = document.getElementById("quick-log-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const minutes = Number(document.getElementById("quick-log-minutes").value);
        const area = document.getElementById("quick-log-area").value;
        const memo = document.getElementById("quick-log-memo").value.trim();
        const category = inferCategory(memo, area);
        const genre = inferGenre(memo, area);
        const relationText = `${area} ${category} ${genre} ${memo}`;
        const log = buildLearningLog({
            minutes,
            area,
            category,
            genre,
            memo,
            relatedTaskId: inferRelatedId(state.tasks || [], relationText, area),
            projectIds: relationIdsFromSelectOrInference("", state.extended?.projects || [], relationText, area),
            goalIds: relationIdsFromSelectOrInference("", state.extended?.goals || [], relationText, area),
            resourceIds: relationIdsFromSelectOrInference("", state.extended?.resources || [], relationText, area),
        });

        const saved = await saveLearningLogWithFallback(state, log, "クイックログを保存しました。");
        if (saved) form.reset();
    });
}

function setupKnowledgeForm(state) {
    const form = document.getElementById("knowledge-form");
    if (!form) return;

    const toggleButton = document.getElementById("knowledge-form-toggle");
    const titleInput = document.getElementById("knowledge-title");
    const areaInput = document.getElementById("knowledge-area");
    const categoryInput = document.getElementById("knowledge-category");
    const genreInput = document.getElementById("knowledge-genre");
    const summaryInput = document.getElementById("knowledge-summary");
    const bodyInput = document.getElementById("knowledge-body");
    const actionableInput = document.getElementById("knowledge-actionable");
    const actionTextInput = document.getElementById("knowledge-action-text");

    updateGenreOptions(areaInput, genreInput, "セキュリティ");

    toggleButton?.addEventListener("click", () => {
        const collapsed = form.classList.toggle("collapsed");
        toggleButton.textContent = collapsed ? "入力を開く" : "入力を閉じる";
    });

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
        const relationText = `${title} ${summary} ${body} ${actionTextInput.value.trim()}`;

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
            relatedTaskId: firstRelationId("knowledge-related-task", state.tasks || [], relationText, areaInput.value),
            relatedLogId: firstRelationId("knowledge-related-log", state.logs || [], relationText, areaInput.value),
            projectIds: relationIdsFromSelectOrInference("knowledge-related-project", state.extended?.projects || [], relationText, areaInput.value),
            goalIds: relationIdsFromSelectOrInference("knowledge-related-goal", state.extended?.goals || [], relationText, areaInput.value),
            resourceIds: relationIdsFromSelectOrInference("knowledge-related-resource", state.extended?.resources || [], relationText, areaInput.value),
        };

        if (!validateKnowledgeInput(state, note)) return;

        state.notes.unshift(note);
        saveLocalState(state);
        render(state);

        try {
            setSyncState(state, "syncing", "ナレッジをNotionへ保存中...");
            const result = await apiPost({ action: "saveKnowledgeNote", ...note });
            if (result.knowledgeNote) state.notes[0] = result.knowledgeNote;

            setSyncState(state, "notion", "ナレッジをNotionへ保存しました。");
            form.reset();
            form.classList.add("collapsed");
            if (toggleButton) toggleButton.textContent = "入力を開く";
            updateGenreOptions(areaInput, genreInput, "セキュリティ");
            saveLocalState(state);
            render(state);
        } catch (error) {
            console.warn("saveKnowledgeNote fallback to localStorage", error);
            setSyncState(state, "local", "ナレッジはローカル保存です。Notion保存に失敗しました。");
            render(state);
        }
    });
}

function setupKnowledgeFilters(state) {
    [
        document.getElementById("knowledge-search"),
        document.getElementById("knowledge-area-filter"),
        document.getElementById("knowledge-action-filter"),
        document.getElementById("knowledge-genre-filter"),
    ].forEach((input) => {
        input?.addEventListener("input", () => renderNotes(state));
        input?.addEventListener("change", () => renderNotes(state));
    });
}

function setupKnowledgeWorkspace(state) {
    document.getElementById("knowledge-panel")?.addEventListener("click", (event) => {
        const selectButton = event.target.closest("[data-knowledge-select]");
        if (!selectButton) return;
        state.selectedNoteId = selectButton.dataset.knowledgeSelect;
        saveLocalState(state);
        renderKnowledgeDetail(state, state.selectedNoteId);
    });
}

function setupManagementLists(state) {
    document.getElementById("settings-panel")?.addEventListener("click", (event) => {
        const extendedArchiveButton = event.target.closest("[data-extended-archive]");
        if (extendedArchiveButton) {
            archiveExtendedItem(state, extendedArchiveButton.dataset.extendedArchive, extendedArchiveButton.dataset.pageId);
            return;
        }

        const archiveButton = event.target.closest("[data-manage-archive]");
        if (archiveButton) {
            archiveItem(state, archiveButton.dataset.manageArchive, archiveButton.dataset.pageId);
            return;
        }

        const editButton = event.target.closest("[data-manage-edit]");
        if (editButton) {
            editItem(state, editButton.dataset.manageEdit, editButton.dataset.pageId);
        }
    });
}

function setupProjectHubInteractions(state) {
    document.getElementById("projects-panel")?.addEventListener("click", (event) => {
        const archiveButton = event.target.closest("[data-extended-archive]");
        if (!archiveButton) return;
        archiveExtendedItem(state, archiveButton.dataset.extendedArchive, archiveButton.dataset.pageId);
    });
}

function setupDetailInteractions(state) {
    document.addEventListener("click", (event) => {
        const detailButton = event.target.closest("[data-detail-type]");
        if (detailButton) {
            openDetailModal(state, detailButton.dataset.detailType, detailButton.dataset.detailId);
            return;
        }

        const createTaskButton = event.target.closest("[data-note-create-task]");
        if (createTaskButton) {
            createTaskFromNote(state, createTaskButton.dataset.noteCreateTask);
            return;
        }

        const editButton = event.target.closest("#detail-modal [data-manage-edit]");
        if (editButton) {
            editItem(state, editButton.dataset.manageEdit, editButton.dataset.pageId);
            return;
        }

        if (event.target.closest("[data-detail-close]")) {
            closeDetailModal();
        }

        if (event.target.closest("[data-edit-close]")) {
            closeEditModal();
        }
    });

    document.getElementById("edit-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = event.target.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "保存中...";
        }
        try {
            await saveEditedItem(state, event.target);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "保存";
            }
        }
    });
}

function setupSettings(state) {
    const refreshButton = document.getElementById("refresh-dashboard-btn");
    const schemaCheckButton = document.getElementById("schema-check-btn");
    const clearCacheButton = document.getElementById("clear-local-cache-btn");

    refreshButton?.addEventListener("click", async () => {
        refreshButton.disabled = true;
        refreshButton.textContent = "読み込み中...";
        try {
            await refreshFromNotion(state);
        } catch (error) {
            console.warn("refresh failed", error);
            showToast("Notionからの再読み込みに失敗しました。", "error");
        } finally {
            refreshButton.disabled = false;
            refreshButton.textContent = "Notionから再読み込み";
        }
    });

    schemaCheckButton?.addEventListener("click", async () => {
        schemaCheckButton.disabled = true;
        schemaCheckButton.textContent = "確認中...";
        try {
            const result = await apiGet("getSchemaCheck");
            renderSchemaCheckResult(result);
            showToast(result.ok ? "Notion DB整合性はOKです。" : "不足プロパティがあります。", result.ok ? "success" : "error");
        } catch (error) {
            console.warn("schema check failed", error);
            showToast("Notion DB整合性チェックに失敗しました。GASデプロイ後に再確認してください。", "error");
        } finally {
            schemaCheckButton.disabled = false;
            schemaCheckButton.textContent = "Notion DB整合性チェック";
        }
    });

    clearCacheButton?.addEventListener("click", () => {
        if (!confirm("ブラウザ内の表示キャッシュをクリアしますか？Notionのデータは消えません。")) return;
        localStorage.removeItem(STORAGE_KEY);
        Object.assign(state, cloneDefaultState());
        render(state);
    });
}

function renderSchemaCheckResult(result) {
    const target = document.getElementById("schema-check-result");
    if (!target) return;
    target.innerHTML = renderSchemaCheckResultHtml(result);
}

function setupShortcutForm(state) {
    const form = document.getElementById("shortcut-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const shortcut = {
            id: `shortcut-${Date.now()}`,
            title: document.getElementById("shortcut-title").value.trim(),
            url: document.getElementById("shortcut-url").value.trim(),
            category: document.getElementById("shortcut-category").value,
            enabled: true,
            sortOrder: state.shortcuts.length + 1,
            memo: document.getElementById("shortcut-memo").value.trim(),
        };

        if (!validateShortcutInput(state, shortcut)) return;

        state.shortcuts.push(shortcut);
        saveLocalState(state);
        render(state);
        form.reset();

        try {
            setSyncState(state, "syncing", "ショートカットをNotionへ保存中...");
            const result = await apiPost({ action: "saveShortcut", ...shortcut });
            if (result.shortcut) {
                const index = state.shortcuts.findIndex((item) => item.id === shortcut.id);
                if (index !== -1) state.shortcuts[index] = result.shortcut;
            }
            setSyncState(state, "notion", "ショートカットを保存しました。");
            saveLocalState(state);
            render(state);
            showToast("ショートカットを追加しました。", "success");
        } catch (error) {
            console.warn("saveShortcut fallback to localStorage", error);
            setSyncState(state, "local", "ショートカットはローカル保存です。Notion保存に失敗しました。");
            render(state);
        }
    });
}

function setupDailyReviewForm(state) {
    const form = document.getElementById("daily-review-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const metrics = calculateMetrics(state);
        const relations = todayRelationIds(state);
        const review = {
            id: `review-${Date.now()}`,
            date: todayKey(),
            mood: document.getElementById("review-mood").value,
            energy: document.getElementById("review-energy").value,
            focus: document.getElementById("review-focus").value,
            effortScore: metrics.score,
            studyMinutes: metrics.todayMinutes,
            completedTasks: metrics.completedCount,
            highlights: document.getElementById("review-highlights").value.trim(),
            reflection: document.getElementById("review-reflection").value.trim(),
            tomorrow: document.getElementById("review-tomorrow").value.trim(),
            taskIds: relations.taskIds,
            learningLogIds: relations.learningLogIds,
        };
        review.aiSummary = buildDailySummary(state, review);

        if (!review.highlights && !review.reflection && !review.tomorrow) {
            showValidation(state, "日次レビューは、よかったこと・振り返り・明日の一手のどれかを入力してください。");
            return;
        }

        state.reviews.unshift(review);
        saveLocalState(state);
        render(state);
        form.reset();

        try {
            setSyncState(state, "syncing", "日次レビューをNotionへ保存中...");
            const result = await apiPost({ action: "saveDailyReview", ...review });
            if (result.dailyReview) state.reviews[0] = result.dailyReview;
            setSyncState(state, "notion", "日次レビューを保存しました。");
            saveLocalState(state);
            render(state);
            showToast("今日を保存しました。", "success");
        } catch (error) {
            console.warn("saveDailyReview fallback to localStorage", error);
            setSyncState(state, "local", "日次レビューはローカル保存です。Notion保存に失敗しました。");
            render(state);
        }
    });
}

function buildExtendedPayload(state) {
    const type = document.getElementById("extended-db-type").value;
    const title = document.getElementById("extended-title").value.trim();
    const area = document.getElementById("extended-area").value;
    const typeText = document.getElementById("extended-type-text").value.trim();
    const url = document.getElementById("extended-url").value.trim();
    const memo = document.getElementById("extended-memo").value.trim();
    const metrics = calculateMetrics(state);
    const today = todayKey();
    const relationText = `${title} ${area} ${typeText} ${url} ${memo}`;
    const relatedProjectIds = relationIdsFromSelectOrInference("extended-related-project", state.extended?.projects || [], relationText, area);
    const relatedGoalIds = relationIdsFromSelectOrInference("extended-related-goal", state.extended?.goals || [], relationText, area);
    const relatedResourceIds = relationIdsFromSelectOrInference("extended-related-resource", state.extended?.resources || [], relationText, area);

    const base = { id: `${type}-${Date.now()}`, title, area, memo, url, projectIds: relatedProjectIds, goalIds: relatedGoalIds, resourceIds: relatedResourceIds };
    if (type === "project") return { ...base, status: typeText || "構想中", priority: "中", githubUrl: url };
    if (type === "goal") return { ...base, status: typeText || "未着手", priority: "中", progress: 0, successCriteria: memo };
    if (type === "habit") return { ...base, status: "有効", frequency: typeText || "毎日", targetMinutes: 10 };
    if (type === "weeklyReview") return { ...base, weekStart: today, weekEnd: today, effortScore: metrics.score, studyMinutes: metrics.todayMinutes, completedTasks: metrics.completedCount, highlights: memo, nextActions: typeText };
    if (type === "tag") return { ...base, color: typeText || "Default" };
    if (type === "category") return { ...base, type: typeText || "Category", enabled: true };
    if (type === "aiInsight") return { ...base, date: today, type: typeText || "Suggestion", summary: title, suggestion: memo, model: "manual" };
    if (type === "resource") return { ...base, type: typeText || "Webサイト", category: "その他", tags: "" };
    if (type === "dashboardSetting") return { ...base, key: title, value: memo, type: typeText || "General", enabled: true };
    return base;
}

async function saveExtendedRecord(state, type, payload, form) {
    const config = extendedDbConfig[type];
    if (!config) return;
    if (!payload.title) return showValidation(state, "名前は必須です。");
    if (payload.url && !isValidUrl(payload.url)) return showValidation(state, "URLはURL形式で入力してください。");

    state.extended[config.stateKey].unshift(payload);
    saveLocalState(state);
    render(state);
    form?.reset();

    try {
        setSyncState(state, "syncing", `${config.label} をNotionへ保存中...`);
        const result = await apiPost({ action: config.saveAction, ...payload });
        const saved = result[type] || result[config.stateKey.replace(/s$/, "")] || Object.values(result).find((value) => value && value.id);
        if (saved) state.extended[config.stateKey][0] = saved;
        setSyncState(state, "notion", `${config.label} を保存しました。`);
        saveLocalState(state);
        render(state);
        showToast(`${config.label} に追加しました。`, "success");
    } catch (error) {
        console.warn(`${config.saveAction} fallback to localStorage`, error);
        setSyncState(state, "local", `${config.label} はローカル保存です。Notion保存に失敗しました。`);
        render(state);
    }
}

async function commitGoalPlan(state) {
    const plan = state.pendingGoalPlan;
    if (!plan) return;

    const goalPayload = {
        id: `goal-${Date.now()}`,
        ...plan.goal,
    };
    state.extended.goals.unshift(goalPayload);
    saveLocalState(state);
    render(state);

    let savedGoal = goalPayload;
    try {
        setSyncState(state, "syncing", "GoalプランをNotionへ登録中...");
        const result = await apiPost({ action: "saveGoal", ...goalPayload });
        if (result.goal) {
            state.extended.goals[0] = result.goal;
            savedGoal = result.goal;
        }
    } catch (error) {
        console.warn("saveGoal from planner fallback to localStorage", error);
        setSyncState(state, "local", "Goalはローカル保存です。Notion保存に失敗しました。");
    }

    const goalIds = isRealPageId(savedGoal.id) ? [savedGoal.id] : [];
    const tasks = plan.tasks.map((task, index) => ({
        id: `task-${Date.now()}-${index}`,
        ...task,
        goalIds,
        completed: false,
    }));
    const habits = plan.habits.map((habit, index) => ({
        id: `habit-${Date.now()}-${index}`,
        ...habit,
        goalIds,
    }));
    const resources = plan.resources.map((resource, index) => ({
        id: `resource-${Date.now()}-${index}`,
        ...resource,
        goalIds,
    }));

    state.tasks.unshift(...tasks);
    state.extended.habits.unshift(...habits);
    state.extended.resources.unshift(...resources);
    state.pendingGoalPlan = null;
    saveLocalState(state);
    render(state);

    try {
        setSyncState(state, "syncing", "サブタスクと関連DBをNotionへ登録中...");
        const taskResults = await Promise.all(tasks.map((task) => apiPost({ action: "saveTask", ...task })));
        taskResults.forEach((result) => {
            if (!result.task) return;
            const index = state.tasks.findIndex((task) => task.id === result.task.id || task.title === result.task.title);
            if (index !== -1) state.tasks[index] = result.task;
        });
        const habitResults = await Promise.all(habits.map((habit) => apiPost({ action: "saveHabit", ...habit })));
        habitResults.forEach((result) => {
            if (!result.habit) return;
            const index = state.extended.habits.findIndex((habit) => habit.id === result.habit.id || habit.title === result.habit.title);
            if (index !== -1) state.extended.habits[index] = result.habit;
        });
        const resourceResults = await Promise.all(resources.map((resource) => apiPost({ action: "saveResource", ...resource })));
        resourceResults.forEach((result) => {
            if (!result.resource) return;
            const index = state.extended.resources.findIndex((resource) => resource.id === result.resource.id || resource.title === result.resource.title);
            if (index !== -1) state.extended.resources[index] = result.resource;
        });
        setSyncState(state, "notion", "目標プランを登録しました。");
        showToast("目標プランを登録しました。", "success");
    } catch (error) {
        console.warn("commitGoalPlan partial fallback", error);
        setSyncState(state, "local", "一部はローカル保存です。Notion保存に失敗した項目があります。");
        showToast("一部はローカル保存です。Notion保存に失敗した項目があります。", "error");
    }

    saveLocalState(state);
    render(state);
}

function setupGoalPlanner(state) {
    const form = document.getElementById("goal-planner-form");
    if (!form) return;

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const title = document.getElementById("goal-planner-title").value.trim();
        if (!title) return showValidation(state, "目標タイトルを入力してください。");
        state.pendingGoalPlan = buildGoalPlan({
            title,
            targetDate: document.getElementById("goal-planner-target-date").value,
            memo: document.getElementById("goal-planner-memo").value.trim(),
        });
        saveLocalState(state);
        render(state);
    });

    document.getElementById("goal-plan-preview")?.addEventListener("click", async (event) => {
        const removeButton = event.target.closest("[data-plan-remove]");
        if (removeButton && state.pendingGoalPlan) {
            const collection = removeButton.dataset.planRemove;
            const index = Number(removeButton.dataset.planIndex);
            if (Array.isArray(state.pendingGoalPlan[collection])) {
                state.pendingGoalPlan[collection].splice(index, 1);
                saveLocalState(state);
                render(state);
            }
            return;
        }

        if (event.target.closest("[data-goal-plan-clear]")) {
            state.pendingGoalPlan = null;
            saveLocalState(state);
            render(state);
            return;
        }
        if (event.target.closest("[data-goal-plan-confirm]")) {
            await commitGoalPlan(state);
        }
    });

    document.getElementById("goal-plan-preview")?.addEventListener("input", (event) => {
        const input = event.target.closest("[data-plan-edit]");
        if (!input || !state.pendingGoalPlan) return;
        const collection = input.dataset.planEdit;
        const index = Number(input.dataset.planIndex);
        const field = input.dataset.planField;
        const item = state.pendingGoalPlan[collection]?.[index];
        if (!item || !field) return;
        item[field] = input.type === "number" ? Number(input.value || 0) : input.value;
        saveLocalState(state);
    });

    document.getElementById("goal-plan-preview")?.addEventListener("change", (event) => {
        const input = event.target.closest("[data-plan-edit]");
        if (!input || !state.pendingGoalPlan) return;
        const collection = input.dataset.planEdit;
        const index = Number(input.dataset.planIndex);
        const field = input.dataset.planField;
        const item = state.pendingGoalPlan[collection]?.[index];
        if (!item || !field) return;
        item[field] = input.type === "number" ? Number(input.value || 0) : input.value;
        saveLocalState(state);
    });
}

function setupGoalDetailInteractions(state) {
    document.getElementById("goal-detail-list")?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-goal-select]");
        if (!button) return;
        state.selectedGoalId = button.dataset.goalSelect;
        saveLocalState(state);
        renderGoalDetail(state);
    });
}

function setupExtendedDbForm(state) {
    const form = document.getElementById("extended-db-form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const type = document.getElementById("extended-db-type").value;
        const config = extendedDbConfig[type];
        if (!config) return;

        const payload = buildExtendedPayload(state);
        await saveExtendedRecord(state, type, payload, form);
    });
}

function setupProjectHubForms(state) {
    document.getElementById("project-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const title = document.getElementById("project-title").value.trim();
        const area = document.getElementById("project-area").value;
        const status = document.getElementById("project-status").value.trim() || "進行中";
        const url = document.getElementById("project-url").value.trim();
        const memo = document.getElementById("project-memo").value.trim();
        await saveExtendedRecord(state, "project", {
            id: `project-${Date.now()}`,
            title,
            area,
            status,
            priority: "中",
            url,
            githubUrl: url,
            memo,
        }, event.target);
    });

    document.getElementById("goal-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const title = document.getElementById("goal-title").value.trim();
        const area = document.getElementById("goal-area").value;
        const targetDate = document.getElementById("goal-target-date").value;
        const successCriteria = document.getElementById("goal-success").value.trim();
        await saveExtendedRecord(state, "goal", {
            id: `goal-${Date.now()}`,
            title,
            area,
            targetDate,
            status: "未着手",
            priority: "中",
            progress: 0,
            successCriteria,
            memo: successCriteria,
        }, event.target);
    });

    document.getElementById("resource-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const title = document.getElementById("resource-title").value.trim();
        const url = document.getElementById("resource-url").value.trim();
        const area = document.getElementById("resource-area").value;
        const type = document.getElementById("resource-type").value.trim() || "Webサイト";
        const memo = document.getElementById("resource-memo").value.trim();
        await saveExtendedRecord(state, "resource", {
            id: `resource-${Date.now()}`,
            title,
            url,
            area,
            type,
            category: "その他",
            tags: "",
            memo,
        }, event.target);
    });
}

async function archiveExtendedItem(state, type, pageId) {
    const config = extendedDbConfig[type];
    if (!config || !pageId) return;
    if (!confirm(`${config.label} の項目をNotion側でもアーカイブしますか？`)) return;

    state.extended[config.stateKey] = state.extended[config.stateKey].filter((item) => item.id !== pageId);
    saveLocalState(state);
    render(state);

    try {
        setSyncState(state, "syncing", `${config.label} をアーカイブ中...`);
        await apiPost({ action: config.archiveAction, pageId });
        setSyncState(state, "notion", `${config.label} をアーカイブしました。`);
        render(state);
    } catch (error) {
        console.warn(`${config.archiveAction} failed`, error);
        setSyncState(state, "local", `${config.label} のNotionアーカイブに失敗しました。`);
        render(state);
    }
}

function setupViewTabs() {
    const tabs = Array.from(document.querySelectorAll("[data-view-tab]"));
    const jumps = Array.from(document.querySelectorAll("[data-view-jump]"));
    const panels = Array.from(document.querySelectorAll("[data-view-panel]"));
    if (!tabs.length || !panels.length) return;

    function activateView(view) {
        document.body.dataset.activeView = view;
        tabs.forEach((tab) => {
            const active = tab.dataset.viewTab === view;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", String(active));
        });
        jumps.forEach((jump) => {
            jump.classList.toggle("active", jump.dataset.viewJump === view);
        });
        panels.forEach((panel) => {
            panel.hidden = panel.dataset.viewPanel !== view;
        });
    }

    document.addEventListener("click", (event) => {
        const tab = event.target.closest("[data-view-tab]");
        if (tab) {
            activateView(tab.dataset.viewTab);
            return;
        }

        const jump = event.target.closest("[data-view-jump]");
        if (jump) {
            activateView(jump.dataset.viewJump);
            document.querySelector(".view-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });

    activateView("today");
}

export async function setupDashboard() {
    const state = loadLocalState();
    updateActiveSessionProgress(state, true);
    render(state);
    setupTaskForm(state);
    setupTaskList(state);
    setupDayPlanner(state);
    setupStartConsole(state);
    setupReminderControls(state);
    setupLifeBalanceForms(state);
    setupQuickLogForm(state);
    setupLearningLogForm(state);
    setupKnowledgeForm(state);
    setupKnowledgeFilters(state);
    setupKnowledgeWorkspace(state);
    setupManagementLists(state);
    setupProjectHubInteractions(state);
    setupGoalPlanner(state);
    setupGoalDetailInteractions(state);
    setupDetailInteractions(state);
    setupShortcutForm(state);
    setupDailyReviewForm(state);
    setupExtendedDbForm(state);
    setupProjectHubForms(state);
    setupSettings(state);
    setupViewTabs();

    try {
        await refreshFromNotion(state);
    } catch (error) {
        console.warn("Dashboard uses localStorage fallback", error);
        state.syncStatus = "local";
        render(state);
    }
}

export const dashboardTestHooks = {
    buildDayPlan,
    calculateLifeBalance,
    calculateMetrics,
    buildGoalPlan,
    inferGoalDomain,
    estimateGoalWeeks,
    inferArea,
    inferCategory,
    inferGenre,
    inferKnowledgeCategory,
    normalizeKnowledgeArea,
    normalizeDateKey,
    selectNextAction,
    sessionToLearningLogInput,
    todayKey,
    isValidUrl,
};
