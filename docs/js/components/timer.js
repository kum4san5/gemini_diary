export function sessionPlannedSeconds(session) {
    return Math.max(60, Number(session?.presetMinutes || 5) * 60);
}

export function sessionElapsedSeconds(session, now = Date.now()) {
    if (!session) return 0;
    const accumulated = Math.max(0, Number(session.accumulatedSeconds || 0));
    if (!session.isRunning || !session.startedAt) return accumulated;
    const startedAt = Date.parse(session.startedAt);
    if (!Number.isFinite(startedAt)) return accumulated;
    return accumulated + Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function updateActiveSessionProgress(state, persist = false, saveState = () => {}) {
    const session = state.activeSession;
    if (!session) return false;
    const elapsed = sessionElapsedSeconds(session);
    const planned = sessionPlannedSeconds(session);
    if (session.isRunning && elapsed >= planned) {
        session.accumulatedSeconds = planned;
        session.isRunning = false;
        session.finishedAt = new Date().toISOString();
        if (persist) saveState(state);
        return true;
    }
    return false;
}

export function createFocusSession(task, minutes) {
    return {
        id: `session-${Date.now()}`,
        taskId: task.id,
        title: task.title || "Focus Session",
        area: task.area || "学習",
        category: task.category || "",
        genre: task.genre || "",
        memo: task.memo || "",
        startedAt: new Date().toISOString(),
        accumulatedSeconds: 0,
        presetMinutes: Number(minutes || 5),
        isRunning: true,
        projectIds: task.projectIds || [],
        goalIds: task.goalIds || [],
        resourceIds: task.resourceIds || [],
    };
}

export function extendFocusSession(session, minutes) {
    if (!session) return null;
    return {
        ...session,
        accumulatedSeconds: sessionElapsedSeconds(session),
        startedAt: new Date().toISOString(),
        presetMinutes: Math.ceil(sessionElapsedSeconds(session) / 60) + Number(minutes || 10),
        isRunning: true,
        finishedAt: "",
    };
}

export function sessionToLearningLogInput(session, helpers = {}) {
    const elapsedSeconds = sessionElapsedSeconds(session);
    const minutes = Math.max(1, Math.ceil(elapsedSeconds / 60));
    const filterRealIds = helpers.filterRealIds || ((ids) => ids || []);
    const isRealPageId = helpers.isRealPageId || (() => false);
    return {
        minutes,
        area: session.area,
        category: session.category,
        genre: session.genre,
        memo: `集中セッション: ${session.title}`,
        relatedTaskId: isRealPageId(session.taskId) ? session.taskId : "",
        projectIds: filterRealIds(session.projectIds),
        goalIds: filterRealIds(session.goalIds),
        resourceIds: filterRealIds(session.resourceIds),
    };
}
