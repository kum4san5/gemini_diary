import {
  buildLearningLogFromQuest,
  buildLearningLogFromSandbox,
  createQuestSession,
  createSandboxSession,
  DEFAULT_HANDLER_SOURCE,
  evaluateQuest,
  executeCommand,
  questById,
  runCodeTests,
} from "../../../../docs/js/components/labEngine.js";

describe("learning lab engine", () => {
  test("starts any quest directly without lock order", () => {
    const session = createQuestSession("db-iam");

    expect(session.questId).toBe("db-iam");
    expect(session.cloudState.iam.function).toEqual([]);
  });

  test("keeps sandbox state separate from quest sessions", () => {
    const questSession = createQuestSession("http-health");
    const sandboxSession = createSandboxSession();

    const { session: nextSandbox } = executeCommand(sandboxSession, "curl GET /health");

    expect(nextSandbox.cloudState.requestHistory).toHaveLength(1);
    expect(questSession.cloudState.requestHistory).toHaveLength(0);
  });

  test("updates pseudo cloud state through CLI commands and completes DB IAM quest", () => {
    const quest = questById("db-iam");
    let session = createQuestSession("db-iam");

    let commandResult = executeCommand(session, "curl POST /orders");
    session = commandResult.session;
    expect(commandResult.result.statusCode).toBe(403);

    commandResult = executeCommand(session, "iam grant function db:read");
    session = commandResult.session;
    expect(session.cloudState.iam.function).toContain("db:read");

    commandResult = executeCommand(session, "curl POST /orders");
    session = commandResult.session;
    expect(commandResult.result.statusCode).toBe(201);
    expect(evaluateQuest(quest, session).complete).toBe(true);
  });

  test("detects fixed storage exposure in security review quest", () => {
    const quest = questById("security-review");
    let session = createQuestSession("security-review");

    expect(session.cloudState.storage.public).toBe(true);
    session = executeCommand(session, "iam revoke storage public").session;

    expect(session.cloudState.storage.public).toBe(false);
    expect(evaluateQuest(quest, session).complete).toBe(true);
  });

  test("builds learning logs for quest and sandbox practice", () => {
    const quest = questById("http-health");
    const questSession = executeCommand(createQuestSession("http-health"), "curl GET /health").session;
    const sandboxSession = executeCommand(createSandboxSession(), "status").session;

    const questLog = buildLearningLogFromQuest(quest, questSession, "疎通確認できた", 10);
    const sandboxLog = buildLearningLogFromSandbox(sandboxSession, "IAMを確認した", "IAM", 8);

    expect(questLog.category).toBe("Cloud Quest");
    expect(questLog.genre).toBe("ネットワーク");
    expect(questLog.area).toBe("プログラミング");
    expect(questLog.memo).toContain("HTTP疎通確認");
    expect(sandboxLog.category).toBe("Cloud Sandbox");
    expect(sandboxLog.genre).toBe("IAM");
    expect(sandboxLog.memo).toContain("status");
  });

  test("runs default handler tests in code runner", () => {
    const result = runCodeTests(DEFAULT_HANDLER_SOURCE);

    expect(result.ok).toBe(true);
  });
});
