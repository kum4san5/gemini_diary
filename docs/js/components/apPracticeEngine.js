import { todayKey } from "./state.js";

export const AP_STORAGE_KEY = "lifeDashboardApPracticeState";
export const AP_IMPORTED_KEY = "lifeDashboardApImportedQuestions";
export const AP_MANIFEST_PATH = "data/ap/manifest.json";
export const AP_SECTION_A = "科目A";
export const AP_SECTION_B = "科目B";

const SEASON_RANK = {
    "春期": 1,
    "秋期": 2,
};

export function createDefaultApState() {
    return {
        mode: "latest",
        selectedPeriodKey: "",
        selectedQuestionId: "",
        filters: {
            section: "all",
            domain: "all",
            attempt: "all",
        },
        progress: {
            answered: {},
            bookmarks: [],
            reviewQueue: [],
            notes: {},
        },
        session: {
            startedAt: new Date().toISOString(),
            questionIds: [],
            currentIndex: 0,
        },
    };
}

export function normalizeApState(raw = {}) {
    const fallback = createDefaultApState();
    return {
        ...fallback,
        ...raw,
        filters: { ...fallback.filters, ...(raw.filters || {}) },
        progress: {
            ...fallback.progress,
            ...(raw.progress || {}),
            answered: raw.progress?.answered || {},
            bookmarks: raw.progress?.bookmarks || [],
            reviewQueue: raw.progress?.reviewQueue || [],
            notes: raw.progress?.notes || {},
        },
        session: { ...fallback.session, ...(raw.session || {}) },
    };
}

export function normalizeQuestion(raw) {
    return {
        id: String(raw.id || ""),
        source: raw.source || "seed",
        exam: raw.exam || "AP",
        year: Number(raw.year),
        season: raw.season || "",
        periodLabel: raw.periodLabel || `${raw.year} ${raw.season}`,
        section: raw.section || AP_SECTION_A,
        number: Number(raw.number || 0),
        domain: raw.domain || "その他",
        category: raw.category || "その他",
        keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
        body: raw.body || "",
        choices: normalizeChoices(raw.choices || []),
        answer: Array.isArray(raw.answer) ? raw.answer : raw.answer ? [raw.answer] : [],
        explanation: raw.explanation || "",
        imageRefs: Array.isArray(raw.imageRefs) ? raw.imageRefs : [],
        subQuestions: Array.isArray(raw.subQuestions) ? raw.subQuestions.map(normalizeSubQuestion) : [],
        sourceUrl: raw.sourceUrl || "",
        sourceLabel: raw.sourceLabel || "",
    };
}

export function normalizeQuestions(questions = []) {
    return questions.map(normalizeQuestion).filter((question) => question.id);
}

export function validateQuestion(question) {
    const errors = [];
    const normalized = normalizeQuestion(question);
    if (!normalized.id) errors.push("id is required");
    if (!Number.isFinite(normalized.year)) errors.push("year is required");
    if (!normalized.season) errors.push("season is required");
    if (!normalized.periodLabel) errors.push("periodLabel is required");
    if (!normalized.section) errors.push("section is required");
    if (!normalized.number) errors.push("number is required");
    if (!normalized.sourceUrl) errors.push("sourceUrl is required");
    if (!normalized.sourceLabel) errors.push("sourceLabel is required");
    if (!normalized.body) errors.push("body is required");
    if (normalized.section === AP_SECTION_A && normalized.choices.length < 2) errors.push("科目A choices are required");
    if (normalized.section === AP_SECTION_A && normalized.answer.length === 0) errors.push("科目A answer is required");
    if (normalized.answer.some((answer) => !normalized.choices.some((choice) => choice.key === answer))) {
        errors.push("answer must match choices");
    }
    return { ok: errors.length === 0, errors, question: normalized };
}

export function validateQuestionBank(questions = []) {
    const seen = new Set();
    const rows = questions.map((rawQuestion) => {
        const question = normalizeQuestion(rawQuestion);
        const result = validateQuestion(question);
        if (seen.has(question.id)) result.errors.push("duplicated id");
        if (question.id) seen.add(question.id);
        return { id: question.id, ok: result.errors.length === 0, errors: result.errors };
    });
    return {
        ok: rows.every((row) => row.ok),
        rows,
    };
}

export function buildPeriodKey(year, season) {
    return `${year}-${season}`;
}

export function sortPeriods(periods = []) {
    return [...periods].sort((a, b) => {
        if (Number(b.year) !== Number(a.year)) return Number(b.year) - Number(a.year);
        return (SEASON_RANK[b.season] || 0) - (SEASON_RANK[a.season] || 0);
    });
}

export function questionPeriodKey(question) {
    return buildPeriodKey(question.year, question.season);
}

export function selectLatestQuestionPeriod(questions = [], manifest = {}) {
    const validQuestions = normalizeQuestions(questions);
    if (validQuestions.length) {
        return sortPeriods(uniquePeriods(validQuestions))[0];
    }
    return sortPeriods(manifest.periods || [])[0] || {
        year: manifest.latestOfficialYear || 2025,
        season: manifest.latestOfficialSeason || "秋期",
        periodLabel: `${manifest.latestOfficialYear || 2025} ${manifest.latestOfficialSeason || "秋期"}`,
    };
}

export function buildPeriodSummaries(manifest = {}, questions = [], progress = {}) {
    const normalizedQuestions = normalizeQuestions(questions);
    const periods = sortPeriods(manifest.periods || []);
    return periods.map((period) => {
        const periodKey = buildPeriodKey(period.year, period.season);
        const periodQuestions = normalizedQuestions.filter((question) => questionPeriodKey(question) === periodKey);
        const sectionCounts = countBy(periodQuestions, "section");
        const answered = periodQuestions.filter((question) => progress.answered?.[question.id]).length;
        const correct = periodQuestions.filter((question) => progress.answered?.[question.id]?.correct).length;
        return {
            ...period,
            periodKey,
            periodLabel: period.periodLabel || `${period.year} ${period.season}`,
            collected: periodQuestions.length > 0,
            totalQuestions: periodQuestions.length,
            sectionCounts,
            answered,
            correct,
            accuracy: answered ? Math.round((correct / answered) * 100) : 0,
        };
    });
}

export function filterQuestions(questions = [], state = createDefaultApState(), manifest = {}) {
    const normalized = normalizeQuestions(questions);
    const latestPeriod = selectLatestQuestionPeriod(normalized, manifest);
    const selectedPeriodKey = state.mode === "latest"
        ? buildPeriodKey(latestPeriod.year, latestPeriod.season)
        : state.selectedPeriodKey;
    const reviewSet = new Set(state.progress?.reviewQueue || []);

    return normalized.filter((question) => {
        const answered = state.progress?.answered?.[question.id];
        if (state.mode === "latest" || state.mode === "year" || state.mode === "mock") {
            if (questionPeriodKey(question) !== selectedPeriodKey) return false;
        }
        if (state.mode === "domain" && state.filters.domain !== "all" && question.domain !== state.filters.domain) return false;
        if (state.mode === "review" && !reviewSet.has(question.id)) return false;
        if (state.filters.section !== "all" && question.section !== state.filters.section) return false;
        if (state.filters.domain !== "all" && question.domain !== state.filters.domain) return false;
        if (state.filters.attempt === "unanswered" && answered) return false;
        if (state.filters.attempt === "wrong" && (!answered || answered.correct)) return false;
        if (state.filters.attempt === "bookmarked" && !(state.progress?.bookmarks || []).includes(question.id)) return false;
        return true;
    }).sort(sortQuestions);
}

export function gradeAnswer(question, answer) {
    const normalized = normalizeQuestion(question);
    const selected = Array.isArray(answer) ? answer : answer ? [answer] : [];
    const expected = [...normalized.answer].sort();
    const actual = [...selected].sort();
    const correct = expected.length > 0 && expected.length === actual.length && expected.every((value, index) => value === actual[index]);
    return { correct, expected, actual };
}

export function recordAnswer(progress, question, answer, options = {}) {
    const next = cloneProgress(progress);
    const normalized = normalizeQuestion(question);
    const result = normalized.section === AP_SECTION_B && options.selfScore
        ? { correct: options.selfScore === "correct", expected: normalized.answer, actual: Array.isArray(answer) ? answer : [answer].filter(Boolean) }
        : gradeAnswer(normalized, answer);
    next.answered[normalized.id] = {
        answer: result.actual,
        correct: result.correct,
        answeredAt: new Date().toISOString(),
        attempts: (next.answered[normalized.id]?.attempts || 0) + 1,
        selfScore: options.selfScore || "",
    };
    if (!result.correct && !next.reviewQueue.includes(normalized.id)) next.reviewQueue.push(normalized.id);
    if (result.correct) next.reviewQueue = next.reviewQueue.filter((id) => id !== normalized.id);
    return { progress: next, result };
}

export function toggleBookmark(progress, questionId) {
    const next = cloneProgress(progress);
    next.bookmarks = next.bookmarks.includes(questionId)
        ? next.bookmarks.filter((id) => id !== questionId)
        : [...next.bookmarks, questionId];
    return next;
}

export function saveQuestionNote(progress, questionId, note) {
    const next = cloneProgress(progress);
    next.notes[questionId] = note;
    return next;
}

export function buildPracticeStats(questions = [], progress = {}) {
    const normalized = normalizeQuestions(questions);
    const answered = normalized.filter((question) => progress.answered?.[question.id]).length;
    const correct = normalized.filter((question) => progress.answered?.[question.id]?.correct).length;
    const wrong = answered - correct;
    return {
        total: normalized.length,
        answered,
        correct,
        wrong,
        unanswered: Math.max(0, normalized.length - answered),
        accuracy: answered ? Math.round((correct / answered) * 100) : 0,
    };
}

export function buildLearningLogFromPractice({ questions = [], progress = {}, periodLabel = "", minutes = 1, mode = "年度別" }) {
    const stats = buildPracticeStats(questions, progress);
    const domains = countBy(questions, "domain");
    const weakest = Object.entries(domains).sort((a, b) => b[1] - a[1])[0]?.[0] || "応用情報";
    return {
        id: `ap-log-${Date.now()}`,
        date: todayKey(),
        minutes: Math.max(1, Number(minutes || 1)),
        area: "学習",
        category: mode === "科目B" ? "応用情報B演習" : "応用情報演習",
        genre: weakest,
        understanding: stats.wrong ? "復習あり" : "演習済み",
        energy: "普通",
        tags: "ap-practice, ipa, exam",
        memo: [
            `${periodLabel || "応用情報"} ${mode}`,
            `正答: ${stats.correct}/${stats.answered}問 / 対象: ${stats.total}問 / 正答率: ${stats.accuracy}%`,
            stats.wrong ? `復習対象: ${stats.wrong}問` : "復習対象なし",
        ].join("\n"),
        relatedTaskId: "",
        projectIds: [],
        goalIds: [],
        resourceIds: [],
    };
}

export function parseQuestionCsv(text) {
    const rows = parseCsvRows(text);
    const [header = [], ...bodyRows] = rows;
    const headerMap = Object.fromEntries(header.map((name, index) => [name.trim(), index]));
    return bodyRows.filter((row) => row.some(Boolean)).map((row) => normalizeQuestion({
        id: cell(row, headerMap, "id"),
        source: cell(row, headerMap, "source") || "import",
        exam: cell(row, headerMap, "exam") || "AP",
        year: cell(row, headerMap, "year"),
        season: cell(row, headerMap, "season"),
        periodLabel: cell(row, headerMap, "periodLabel"),
        section: cell(row, headerMap, "section") || AP_SECTION_A,
        number: cell(row, headerMap, "number"),
        domain: cell(row, headerMap, "domain"),
        category: cell(row, headerMap, "category"),
        keywords: splitList(cell(row, headerMap, "keywords")),
        body: cell(row, headerMap, "body"),
        choices: ["ア", "イ", "ウ", "エ"].map((key) => ({ key, text: cell(row, headerMap, `choice${key}`) })).filter((choice) => choice.text),
        answer: splitList(cell(row, headerMap, "answer")),
        explanation: cell(row, headerMap, "explanation"),
        sourceUrl: cell(row, headerMap, "sourceUrl"),
        sourceLabel: cell(row, headerMap, "sourceLabel"),
    }));
}

function normalizeChoices(choices) {
    if (Array.isArray(choices)) {
        return choices.map((choice, index) => typeof choice === "string"
            ? { key: ["ア", "イ", "ウ", "エ"][index] || String(index + 1), text: choice }
            : { key: choice.key, text: choice.text });
    }
    return Object.entries(choices || {}).map(([key, text]) => ({ key, text }));
}

function normalizeSubQuestion(raw) {
    return {
        id: String(raw.id || ""),
        number: raw.number || "",
        prompt: raw.prompt || "",
        choices: normalizeChoices(raw.choices || []),
        answer: Array.isArray(raw.answer) ? raw.answer : raw.answer ? [raw.answer] : [],
        explanation: raw.explanation || "",
    };
}

function uniquePeriods(questions) {
    const periodMap = new Map();
    questions.forEach((question) => {
        const key = questionPeriodKey(question);
        if (!periodMap.has(key)) {
            periodMap.set(key, {
                year: question.year,
                season: question.season,
                periodLabel: question.periodLabel,
            });
        }
    });
    return Array.from(periodMap.values());
}

function sortQuestions(a, b) {
    if (Number(a.year) !== Number(b.year)) return Number(b.year) - Number(a.year);
    if ((SEASON_RANK[a.season] || 0) !== (SEASON_RANK[b.season] || 0)) return (SEASON_RANK[b.season] || 0) - (SEASON_RANK[a.season] || 0);
    if (a.section !== b.section) return a.section.localeCompare(b.section, "ja");
    return Number(a.number) - Number(b.number);
}

function countBy(items = [], key) {
    return items.reduce((acc, item) => {
        const value = item[key] || "未分類";
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
}

function cloneProgress(progress = {}) {
    return {
        answered: { ...(progress.answered || {}) },
        bookmarks: [...(progress.bookmarks || [])],
        reviewQueue: [...(progress.reviewQueue || [])],
        notes: { ...(progress.notes || {}) },
    };
}

function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        const next = text[index + 1];
        if (char === '"' && inQuotes && next === '"') {
            field += '"';
            index += 1;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            row.push(field);
            field = "";
        } else if ((char === "\n" || char === "\r") && !inQuotes) {
            if (char === "\r" && next === "\n") index += 1;
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else {
            field += char;
        }
    }
    row.push(field);
    rows.push(row);
    return rows.filter((currentRow) => currentRow.some((value) => value !== ""));
}

function cell(row, headerMap, key) {
    return row[headerMap[key]]?.trim() || "";
}

function splitList(value) {
    return value ? value.split(/[|、,]/).map((item) => item.trim()).filter(Boolean) : [];
}
