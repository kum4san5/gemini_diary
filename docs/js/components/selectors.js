import { normalizeDateKey, todayKey } from "./state.js";

const priorityScore = { "今日中": 3, "なるべく早く": 2, "余裕があれば": 1 };

export function calculateStreak(logs) {
    const dates = new Set((logs || []).map((log) => normalizeDateKey(log.date)));
    let streak = 0;
    const cursor = new Date();
    while (dates.has(todayKey(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}

export function calculateMetrics(state) {
    const today = todayKey();
    const todayLogs = (state.logs || []).filter((log) => normalizeDateKey(log.date) === today);
    const todayMinutes = todayLogs.reduce((sum, log) => sum + Number(log.minutes || 0), 0);
    const completedCount = (state.tasks || []).filter((task) => task.completed && normalizeDateKey(task.completedAt) === today).length;
    const streak = calculateStreak(state.logs || []);
    const score = Math.min(todayMinutes, 180) + Math.min(streak * 5, 50) + completedCount * 5;
    return { todayMinutes, completedCount, streak, score };
}

export function calculateLifeBalance(state) {
    const today = todayKey();
    const latestScore = latestByDate(state.lifeScores || [], "date");
    const todayScore = (state.lifeScores || []).find((score) => normalizeDateKey(score.date) === today) || latestScore;
    const dimensions = [
        ["happiness", "幸福", todayScore?.happiness],
        ["health", "健康", todayScore?.health],
        ["growth", "成長", todayScore?.growth],
        ["money", "お金", todayScore?.money],
        ["creation", "創作", todayScore?.creation],
        ["rest", "休息", todayScore?.rest],
    ].map(([key, label, value]) => ({ key, label, value: Number(value || 3) }));
    const average = Math.round((dimensions.reduce((sum, item) => sum + item.value, 0) / dimensions.length) * 20);
    return {
        average,
        dimensions,
        latestScore: todayScore || null,
        latestMood: latestByDate(state.moodLogs || [], "date"),
        latestFinance: latestByDate(state.financeSnapshots || [], "month"),
        activeLearningTopic: (state.learningTopics || []).find((topic) => topic.status !== "完了") || (state.learningTopics || [])[0] || null,
    };
}

export function selectNextAction(state) {
    const tasks = (state.tasks || [])
        .filter((item) => !item.completed)
        .map((task) => ({ task, score: scoreTask(task, state) }))
        .sort((a, b) => b.score - a.score);
    if (tasks.length) return { type: "task", task: tasks[0].task, score: tasks[0].score };

    const note = (state.notes || []).find((item) => item.actionable && item.actionText);
    if (note) return { type: "note", note, score: 0 };

    const goal = (state.extended?.goals || []).find((item) => item.status !== "完了") || (state.extended?.goals || [])[0];
    return goal ? { type: "goal", goal, score: 0 } : null;
}

export function scoreTask(task, state = {}) {
    const today = todayKey();
    let score = 0;
    score += (priorityScore[task.priority] || 0) * 30;

    const due = normalizeDateKey(task.due);
    if (due) {
        const days = daysBetween(today, due);
        if (days < 0) score += 120;
        else if (days === 0) score += 110;
        else if (days <= 3) score += 55;
        else if (days <= 7) score += 20;
    }

    const startDate = normalizeDateKey(task.startDate);
    if (startDate) {
        const daysUntilStart = daysBetween(today, startDate);
        if (daysUntilStart > 0) score -= 80;
        else score += 24;
    }

    const goals = state.extended?.goals || [];
    const linkedGoals = goals.filter((goal) => (task.goalIds || []).includes(goal.id));
    score += linkedGoals.length * 14;
    if (linkedGoals.some((goal) => goal.priority === "高" || goal.priority === "今日中")) score += 16;

    if (task.link) score += 10;
    if ((task.resourceIds || []).length) score += 14;

    const estimated = Number(task.estimatedMinutes || 0);
    if (estimated && estimated <= 15) score += 14;
    else if (estimated && estimated <= 30) score += 8;
    else if (estimated > 60) score -= 6;

    if (normalizeDateKey(task.updatedAt) === today || normalizeDateKey(task.createdAt) === today) score += 4;
    return score;
}

export function resolveActionResources(state, action) {
    if (!action) return [];
    const item = action.task || action.note || action.goal || {};
    const resources = state.extended?.resources || [];
    const links = [];

    if (item.link && isValidUrl(item.link)) links.push({ id: "task-link", title: "Task link", url: item.link, category: "Task" });
    if (item.sourceUrl && isValidUrl(item.sourceUrl)) links.push({ id: "source-url", title: "参照URL", url: item.sourceUrl, category: "Knowledge" });

    const itemResourceIds = new Set(item.resourceIds || []);
    resources
        .filter((resource) => itemResourceIds.has(resource.id) && isValidUrl(resource.url))
        .forEach((resource) => links.push(resourceLink(resource, "Resource")));

    const goalIds = new Set(item.goalIds || (action.goal?.id ? [action.goal.id] : []));
    if (goalIds.size) {
        resources
            .filter((resource) => (resource.goalIds || []).some((id) => goalIds.has(id)) && isValidUrl(resource.url))
            .forEach((resource) => links.push(resourceLink(resource, "Goal Resource")));
    }

    const fallbackShortcuts = (state.shortcuts || [])
        .filter((shortcut) => shortcut.enabled !== false && isValidUrl(shortcut.url))
        .map((shortcut) => ({ ...shortcut, score: shortcutScore(shortcut, item) }))
        .filter((shortcut) => shortcut.score > 0 || links.length === 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(0, 3 - links.length))
        .map((shortcut) => ({
            id: shortcut.id,
            title: shortcut.title || "Shortcut",
            url: shortcut.url,
            category: shortcut.category || "Shortcut",
        }));

    return uniqueLaunchLinks([...links, ...fallbackShortcuts]).slice(0, 4);
}

function resourceLink(resource, fallbackCategory) {
    return {
        id: resource.id,
        title: resource.title || "Resource",
        url: resource.url,
        category: resource.type || resource.category || fallbackCategory,
    };
}

function shortcutScore(shortcut, item) {
    const haystack = [shortcut.title, shortcut.category, shortcut.memo].join(" ").toLowerCase();
    const words = wordsForRelation([item.title, item.area, item.category, item.genre, item.memo].join(" "));
    return words.reduce((score, word) => score + (haystack.includes(word) ? 2 : 0), 0)
        + (item.area && haystack.includes(String(item.area).toLowerCase()) ? 3 : 0);
}

function uniqueLaunchLinks(links) {
    const seen = new Set();
    return links.filter((link) => {
        if (!link?.url || seen.has(link.url)) return false;
        seen.add(link.url);
        return true;
    });
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

function wordsForRelation(value) {
    return String(value || "")
        .toLowerCase()
        .split(/[\s　,、/／・:：()（）\[\]【】]+/)
        .filter((word) => word.length >= 2);
}

function latestByDate(items, key) {
    return [...items].filter((item) => item?.[key]).sort((a, b) => String(b[key]).localeCompare(String(a[key])))[0] || null;
}

function daysBetween(fromDateKey, toDateKey) {
    const from = Date.parse(`${fromDateKey}T00:00:00+09:00`);
    const to = Date.parse(`${toDateKey}T00:00:00+09:00`);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
    return Math.round((to - from) / 86400000);
}
