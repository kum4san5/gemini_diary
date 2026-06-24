import { todayKey } from "./state.js";

export const LAB_STORAGE_KEY = "lifeDashboardLearningLabState";

export const DEFAULT_HANDLER_SOURCE = `function handler(event) {
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, path: event.path || "/" })
  };
}`;

export const LAB_QUESTS = [
    {
        id: "http-health",
        title: "HTTP疎通確認",
        domain: "ネットワーク",
        difficulty: "Beginner",
        estimatedMinutes: 10,
        scenario: "API GatewayからFunctionへ流れる基本の疎通を確認します。まずはTerminalで health check を実行しましょう。",
        initialCloudState: {},
        successConditions: ["curl GET /health が 200 を返す"],
        conceptTitle: "HTTPメソッドとステータスコード",
        conceptSummary: "GETは状態取得に使い、200は成功を表します。疎通確認では、まずリクエストが入口から処理系まで届いているかを見ます。",
        apKeywords: ["HTTP", "GET", "ステータスコード", "API Gateway"],
        checkQuestion: "GET /health が 200 を返す時、何が確認できたと言えますか？",
        expectedAnswer: "APIの入口とFunctionの基本処理が動いていること。",
        genre: "ネットワーク",
    },
    {
        id: "auth-error",
        title: "認証エラーを読む",
        domain: "セキュリティ",
        difficulty: "Beginner",
        estimatedMinutes: 12,
        scenario: "保護されたAPIにアクセスし、認証なしの失敗とAPIキー付きの成功を比べます。",
        initialCloudState: {
            api: { secureRequiresApiKey: true },
        },
        successConditions: ["curl GET /secure が認証なしで失敗する", "curl GET /secure --api-key lab-key が 200 を返す"],
        conceptTitle: "認証と認可",
        conceptSummary: "認証は誰かを確認すること、認可は何をしてよいかを判断することです。401は認証不足、403は権限不足の切り分けに使えます。",
        apKeywords: ["認証", "認可", "401", "403", "APIキー"],
        checkQuestion: "401と403の違いを一言で説明すると？",
        expectedAnswer: "401は認証不足、403は認証済みだが権限不足。",
        genre: "セキュリティ",
    },
    {
        id: "db-iam",
        title: "DB権限エラーを直す",
        domain: "IAM",
        difficulty: "Intermediate",
        estimatedMinutes: 15,
        scenario: "FunctionからDBへ注文を書き込もうとすると権限不足で失敗します。ログを読み、最小権限を付与して再実行します。",
        initialCloudState: {
            iam: { function: [] },
        },
        successConditions: ["iam grant function db:read を実行する", "curl POST /orders が 201 を返す"],
        conceptTitle: "最小権限とIAM",
        conceptSummary: "必要な操作だけを許可するのが最小権限です。FunctionがDBを読む/書くには、実行主体に明示的な権限が必要です。",
        apKeywords: ["IAM", "最小権限", "アクセス制御", "DB権限"],
        checkQuestion: "DBアクセスをFunctionに許可する時、なぜ最小権限が重要ですか？",
        expectedAnswer: "侵害時の被害範囲を小さくし、不要な操作を防ぐため。",
        genre: "IAM",
    },
    {
        id: "incident-response",
        title: "疑似障害対応",
        domain: "障害対応",
        difficulty: "Intermediate",
        estimatedMinutes: 15,
        scenario: "APIが500を返しています。ログを見てFunctionの異常を確認し、再デプロイで復旧させます。",
        initialCloudState: {
            function: { broken: true },
        },
        successConditions: ["500エラーを再現する", "logs で原因を見る", "deploy function 後に /health が 200 を返す"],
        conceptTitle: "ログを使った障害切り分け",
        conceptSummary: "障害対応では、入口、処理、データ、権限のどこで失敗したかをログで切り分けます。500はサーバ側処理の失敗を示します。",
        apKeywords: ["500", "ログ監視", "障害切り分け", "デプロイ"],
        checkQuestion: "500エラーが出た時、最初に確認したい情報は何ですか？",
        expectedAnswer: "エラーログ、発生時刻、直前の変更、影響範囲。",
        genre: "障害対応",
    },
    {
        id: "security-review",
        title: "セキュリティ設定レビュー",
        domain: "セキュリティ",
        difficulty: "Intermediate",
        estimatedMinutes: 12,
        scenario: "Storageが公開状態です。Cloud Consoleで状態を確認し、公開設定を閉じます。",
        initialCloudState: {
            storage: { public: true },
        },
        successConditions: ["Storageのpublic設定を確認する", "iam revoke storage public で非公開にする"],
        conceptTitle: "公開範囲と情報漏洩リスク",
        conceptSummary: "公開Storageは便利ですが、設定ミスが情報漏洩に直結します。公開するものと非公開にするものを明確に分けます。",
        apKeywords: ["アクセス制御", "情報漏洩", "公開設定", "セキュリティレビュー"],
        checkQuestion: "Storageを不用意にpublicにすると、どんなリスクがありますか？",
        expectedAnswer: "意図しない第三者がデータを閲覧できるリスク。",
        genre: "セキュリティ",
    },
];

export function createCloudState(overrides = {}) {
    const base = {
        api: {
            online: true,
            secureRequiresApiKey: false,
            validApiKey: "lab-key",
        },
        function: {
            deployed: true,
            version: 1,
            broken: false,
        },
        database: {
            online: true,
            tables: {
                orders: [{ id: 1, item: "book", status: "created" }],
            },
        },
        storage: {
            public: false,
            objects: ["readme.txt", "orders.csv"],
        },
        iam: {
            function: ["logs:read"],
        },
        logs: [],
        requestHistory: [],
    };
    return deepMerge(base, overrides);
}

export function createQuestSession(questId) {
    const quest = questById(questId);
    return {
        questId,
        startedAt: new Date().toISOString(),
        cloudState: createCloudState(quest?.initialCloudState || {}),
        history: [],
        codeSource: DEFAULT_HANDLER_SOURCE,
    };
}

export function createSandboxSession() {
    return {
        startedAt: new Date().toISOString(),
        cloudState: createCloudState({
            iam: { function: ["logs:read", "db:read"] },
        }),
        history: [],
        codeSource: DEFAULT_HANDLER_SOURCE,
    };
}

export function executeCommand(session, rawCommand, context = {}) {
    const command = String(rawCommand || "").trim();
    const nextSession = clone(session);
    if (!command) return { session: nextSession, result: { level: "info", output: "" } };

    pushHistory(nextSession, "command", `$ ${command}`);
    const result = runCommand(nextSession, command, context);
    pushHistory(nextSession, result.level || "output", result.output);
    return { session: nextSession, result };
}

export function evaluateQuest(quest, session) {
    const cloud = session?.cloudState || createCloudState();
    const history = session?.history || [];
    const hasRequest = (method, path, statusCode) => cloud.requestHistory.some((item) =>
        item.method === method && item.path === path && item.statusCode === statusCode
    );
    const hasCommand = (pattern) => history.some((item) => item.type === "command" && pattern.test(item.text));

    const checks = {
        "http-health": [
            ["GET /health が 200", hasRequest("GET", "/health", 200)],
        ],
        "auth-error": [
            ["認証なしで /secure が失敗", hasRequest("GET", "/secure", 401)],
            ["APIキー付きで /secure が成功", hasRequest("GET", "/secure", 200)],
        ],
        "db-iam": [
            ["Functionに db:read が付与済み", hasPermission(cloud, "db:read")],
            ["POST /orders が 201", hasRequest("POST", "/orders", 201)],
        ],
        "incident-response": [
            ["500エラーを再現", hasRequest("GET", "/health", 500)],
            ["ログ確認済み", hasCommand(/logs$/i)],
            ["復旧後 /health が 200", hasRequest("GET", "/health", 200) && cloud.function.broken === false],
        ],
        "security-review": [
            ["Storageが非公開", cloud.storage.public === false],
            ["公開設定を閉じるコマンドを実行", hasCommand(/iam revoke storage public/i)],
        ],
    }[quest?.id] || [];

    const passed = checks.filter(([, ok]) => ok).map(([label]) => label);
    const missing = checks.filter(([, ok]) => !ok).map(([label]) => label);
    return { complete: missing.length === 0 && checks.length > 0, passed, missing };
}

export function runCodeTests(source, tests = defaultCodeTests()) {
    try {
        const handler = compileHandler(source);
        const results = tests.map((test) => {
            try {
                const actual = handler(test.input);
                const pass = deepEqual(actual, test.expected);
                return { name: test.name, pass, actual, expected: test.expected };
            } catch (error) {
                return { name: test.name, pass: false, error: error.message, expected: test.expected };
            }
        });
        return { ok: results.every((item) => item.pass), results };
    } catch (error) {
        return { ok: false, results: [{ name: "構文チェック", pass: false, error: error.message }] };
    }
}

export function buildLearningLogFromQuest(quest, session, note = "", minutes = 1) {
    const evaluation = evaluateQuest(quest, session);
    return learningLog({
        category: "Cloud Quest",
        genre: quest?.genre || quest?.domain || "セキュリティ",
        minutes,
        memo: [
            `Quest: ${quest?.title || "Cloud Quest"}`,
            `実践: ${evaluation.passed.join(" / ") || "途中まで実施"}`,
            `CS: ${(quest?.apKeywords || []).join(", ")}`,
            note ? `メモ: ${note}` : "",
        ].filter(Boolean).join("\n"),
        tags: "learning-lab, cloud-quest, ap, security, network",
    });
}

export function buildLearningLogFromSandbox(session, note = "", genre = "セキュリティ", minutes = 1) {
    return learningLog({
        category: "Cloud Sandbox",
        genre,
        minutes,
        memo: [
            "Sandbox実践",
            summarizeHistory(session?.history || []),
            note ? `メモ: ${note}` : "",
        ].filter(Boolean).join("\n"),
        tags: "learning-lab, cloud-sandbox",
    });
}

export function summarizeHistory(history = [], limit = 6) {
    const commands = history
        .filter((item) => item.type === "command")
        .slice(-limit)
        .map((item) => item.text.replace(/^\$\s*/, ""));
    return commands.length ? `実行: ${commands.join(" / ")}` : "実行履歴なし";
}

export function questById(id) {
    return LAB_QUESTS.find((quest) => quest.id === id) || LAB_QUESTS[0];
}

function runCommand(session, command, context) {
    if (/^help$/i.test(command)) {
        return output(`Commands:
help
status
curl GET /health
curl GET /secure --api-key lab-key
curl POST /orders
logs
iam grant function db:read
iam revoke storage public
db select orders
deploy function
reset`);
    }
    if (/^status$/i.test(command)) return output(formatStatus(session.cloudState));
    if (/^logs$/i.test(command)) return output(formatLogs(session.cloudState.logs));
    if (/^db select orders$/i.test(command)) return selectOrders(session);
    if (/^iam grant function db:read$/i.test(command)) return grantPermission(session, "db:read");
    if (/^iam revoke storage public$/i.test(command)) return revokeStoragePublic(session);
    if (/^deploy function$/i.test(command)) return deployFunction(session);
    if (/^reset$/i.test(command)) {
        const quest = context.questId ? questById(context.questId) : null;
        session.cloudState = createCloudState(quest?.initialCloudState || {});
        session.history = [];
        return output("環境をリセットしました。");
    }
    if (/^curl\s+/i.test(command)) return handleCurl(session, command);
    return { level: "error", output: `Unknown command: ${command}\nhelp でコマンド一覧を確認できます。` };
}

function handleCurl(session, command) {
    const match = command.match(/^curl\s+(GET|POST)\s+(\S+)(.*)$/i);
    if (!match) return { level: "error", output: "Usage: curl GET /health" };
    const [, methodRaw, path, rest] = match;
    const method = methodRaw.toUpperCase();
    const apiKey = rest.match(/--api-key\s+(\S+)/)?.[1] || "";
    const cloud = session.cloudState;

    if (!cloud.api.online) return recordRequest(session, method, path, 503, "API Gateway is offline");
    if (cloud.function.broken) {
        addCloudLog(cloud, "error", "Function handler failed: Cannot read property 'status' of undefined");
        return recordRequest(session, method, path, 500, "Internal Server Error. Run logs to inspect.");
    }
    if (path === "/health" && method === "GET") {
        addCloudLog(cloud, "info", "GET /health -> 200");
        return recordRequest(session, method, path, 200, JSON.stringify({ ok: true, service: "quest-api" }));
    }
    if (path === "/secure" && method === "GET") {
        if (cloud.api.secureRequiresApiKey && apiKey !== cloud.api.validApiKey) {
            addCloudLog(cloud, "warn", "GET /secure rejected: missing or invalid API key");
            return recordRequest(session, method, path, 401, "Unauthorized: API key required");
        }
        addCloudLog(cloud, "info", "GET /secure -> 200");
        return recordRequest(session, method, path, 200, JSON.stringify({ ok: true, scope: "secure" }));
    }
    if (path === "/orders" && method === "POST") {
        if (!hasPermission(cloud, "db:read")) {
            addCloudLog(cloud, "error", "POST /orders failed: function lacks db:read");
            return recordRequest(session, method, path, 403, "Forbidden: function needs db:read");
        }
        const order = { id: cloud.database.tables.orders.length + 1, item: "quest-item", status: "created" };
        cloud.database.tables.orders.push(order);
        addCloudLog(cloud, "info", `POST /orders -> 201 id=${order.id}`);
        return recordRequest(session, method, path, 201, JSON.stringify(order));
    }
    return recordRequest(session, method, path, 404, "Not Found");
}

function selectOrders(session) {
    const cloud = session.cloudState;
    if (!hasPermission(cloud, "db:read")) {
        addCloudLog(cloud, "error", "db select orders failed: missing db:read");
        return { level: "error", output: "Forbidden: function needs db:read" };
    }
    return output(JSON.stringify(cloud.database.tables.orders, null, 2));
}

function grantPermission(session, permission) {
    const permissions = new Set(session.cloudState.iam.function || []);
    permissions.add(permission);
    session.cloudState.iam.function = Array.from(permissions);
    addCloudLog(session.cloudState, "info", `IAM grant function ${permission}`);
    return output(`Granted function ${permission}`);
}

function revokeStoragePublic(session) {
    session.cloudState.storage.public = false;
    addCloudLog(session.cloudState, "info", "Storage public access disabled");
    return output("Storage public access disabled");
}

function deployFunction(session) {
    session.cloudState.function.broken = false;
    session.cloudState.function.version += 1;
    addCloudLog(session.cloudState, "info", `Function deployed v${session.cloudState.function.version}`);
    return output(`Function deployed v${session.cloudState.function.version}`);
}

function recordRequest(session, method, path, statusCode, body) {
    session.cloudState.requestHistory.push({ method, path, statusCode, at: new Date().toISOString() });
    return { level: statusCode >= 400 ? "error" : "output", output: `${statusCode} ${body}`, statusCode };
}

function addCloudLog(cloud, level, message) {
    cloud.logs.push({ at: new Date().toISOString(), level, message });
}

function hasPermission(cloud, permission) {
    return (cloud.iam.function || []).includes(permission);
}

function formatStatus(cloud) {
    return [
        `API: ${cloud.api.online ? "online" : "offline"}`,
        `Function: ${cloud.function.deployed ? `v${cloud.function.version}` : "not deployed"}${cloud.function.broken ? " / broken" : ""}`,
        `DB orders: ${cloud.database.tables.orders.length}`,
        `Storage public: ${cloud.storage.public ? "yes" : "no"}`,
        `Function IAM: ${(cloud.iam.function || []).join(", ") || "none"}`,
    ].join("\n");
}

function formatLogs(logs) {
    if (!logs.length) return "No logs yet.";
    return logs.slice(-8).map((log) => `[${log.level}] ${log.message}`).join("\n");
}

function output(text) {
    return { level: "output", output: text };
}

function pushHistory(session, type, text) {
    session.history.push({ at: new Date().toISOString(), type, text });
}

function learningLog({ category, genre, minutes, memo, tags }) {
    return {
        id: `log-${Date.now()}`,
        date: todayKey(),
        minutes: Math.max(1, Number(minutes || 1)),
        area: "プログラミング",
        category,
        genre,
        understanding: "演習済み",
        energy: "普通",
        tags,
        memo,
        relatedTaskId: "",
        projectIds: [],
        goalIds: [],
        resourceIds: [],
    };
}

function defaultCodeTests() {
    return [
        {
            name: "health response",
            input: { path: "/health" },
            expected: { statusCode: 200, body: JSON.stringify({ ok: true, path: "/health" }) },
        },
    ];
}

function compileHandler(source) {
    const factory = new Function(`${source}\nreturn typeof handler === "function" ? handler : null;`);
    const handler = factory();
    if (!handler) throw new Error("handler(event) function が見つかりません。");
    return handler;
}

function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function deepMerge(target, source) {
    const outputValue = clone(target);
    Object.entries(source || {}).forEach(([key, value]) => {
        if (value && typeof value === "object" && !Array.isArray(value)) {
            outputValue[key] = deepMerge(outputValue[key] || {}, value);
        } else {
            outputValue[key] = value;
        }
    });
    return outputValue;
}
