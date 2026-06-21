import { dashboardTestHooks } from "../../../../docs/js/components/dashboard.js";

describe("dashboard classification helpers", () => {
  test("infers learning task metadata for AP text", () => {
    const text = "応用情報 過去問 ネットワーク サブネットを復習";

    expect(dashboardTestHooks.inferArea(text)).toBe("学習");
    expect(dashboardTestHooks.inferCategory(text, "学習")).toBe("苦手復習");
    expect(dashboardTestHooks.inferGenre(text, "学習")).toBe("ネットワーク");
  });

  test("infers development metadata", () => {
    const text = "GAS API のテストを追加";

    expect(dashboardTestHooks.inferArea(text)).toBe("開発");
    expect(dashboardTestHooks.inferCategory(text, "開発")).toBe("テスト");
    expect(dashboardTestHooks.inferGenre(text, "開発")).toBe("バックエンド");
  });

  test("normalizes knowledge areas for Notion options", () => {
    expect(dashboardTestHooks.normalizeKnowledgeArea("学習")).toBe("応用情報");
    expect(dashboardTestHooks.normalizeKnowledgeArea("プログラミング")).toBe("開発");
  });

  test("validates optional URLs", () => {
    expect(dashboardTestHooks.isValidUrl("")).toBe(true);
    expect(dashboardTestHooks.isValidUrl("https://example.com/article")).toBe(true);
    expect(dashboardTestHooks.isValidUrl("not a url")).toBe(false);
  });

  test("builds a qualification goal plan with tasks, habits, and resources", () => {
    const plan = dashboardTestHooks.buildGoalPlan({
      title: "応用情報を取りたい",
      memo: "3か月で午前と午後を進めたい",
    });

    expect(plan.domain).toBe("qualification");
    expect(plan.area).toBe("学習");
    expect(plan.weeks).toBe(12);
    expect(plan.tasks.length).toBeGreaterThan(3);
    expect(plan.habits.length).toBeGreaterThan(0);
    expect(plan.resources.length).toBeGreaterThan(0);
  });

  test("classifies health and project goals", () => {
    expect(dashboardTestHooks.inferGoalDomain("ダイエットする 食事と運動")).toBe("health");
    expect(dashboardTestHooks.inferGoalDomain("アプリをリリースしたい GitHub")).toBe("project");
  });

  test("estimates goal weeks from loose text", () => {
    expect(dashboardTestHooks.estimateGoalWeeks("2か月でやる")).toBe(8);
    expect(dashboardTestHooks.estimateGoalWeeks("6週間でやる")).toBe(6);
  });

  test("selects next action using due date and action readiness", () => {
    const today = dashboardTestHooks.todayKey();
    const action = dashboardTestHooks.selectNextAction({
      tasks: [
        { id: "later", title: "余裕があれば読む", priority: "余裕があれば", estimatedMinutes: 90, completed: false },
        { id: "due", title: "今日中に着手", priority: "なるべく早く", due: today, resourceIds: ["r1"], estimatedMinutes: 15, completed: false },
      ],
      notes: [],
      shortcuts: [],
      extended: { goals: [], resources: [] },
    });

    expect(action.type).toBe("task");
    expect(action.task.id).toBe("due");
  });

  test("calculates life balance from six axes", () => {
    const balance = dashboardTestHooks.calculateLifeBalance({
      lifeScores: [{
        date: dashboardTestHooks.todayKey(),
        happiness: 4,
        health: 3,
        growth: 5,
        money: 3,
        creation: 4,
        rest: 2,
      }],
      moodLogs: [],
      financeSnapshots: [],
      learningTopics: [],
    });

    expect(balance.average).toBe(70);
    expect(balance.dimensions).toHaveLength(6);
  });

  test("converts focus session to learning log input", () => {
    const input = dashboardTestHooks.sessionToLearningLogInput({
      taskId: "notion-page-id",
      title: "ネットワーク復習",
      area: "学習",
      category: "過去問道場",
      genre: "ネットワーク",
      accumulatedSeconds: 300,
      isRunning: false,
      projectIds: ["project-1"],
      goalIds: ["goal-1"],
      resourceIds: ["resource-1"],
    }, {
      isRealPageId: () => true,
      filterRealIds: (ids) => ids,
    });

    expect(input.minutes).toBe(5);
    expect(input.relatedTaskId).toBe("notion-page-id");
    expect(input.memo).toContain("ネットワーク復習");
  });

  test("uses custom schedule blocks when calculating day plan availability", () => {
    const allocation = dashboardTestHooks.buildDayPlan({
      dayPlan: {
        type: "weekday",
        useFixedWork: false,
        freeStart: "08:00",
        freeEnd: "22:00",
        workStart: "09:00",
        workEnd: "18:00",
        bufferMinutes: 0,
        selectedTaskIds: ["task-1"],
        taskStarts: {},
        scheduleBlocks: [
          { id: "work-shift", type: "work", title: "遅番", start: "12:00", end: "17:00" },
          { id: "play", type: "play", title: "友達とご飯", start: "19:00", end: "21:00" },
        ],
      },
      tasks: [
        { id: "task-1", title: "開発する", completed: false, estimatedMinutes: 60 },
      ],
    });

    expect(allocation.workMinutes).toBe(300);
    expect(allocation.plannedMinutes).toBe(120);
    expect(allocation.freeMinutes).toBe(420);
    expect(allocation.taskMinutes).toBe(60);
  });

  test("uses Japan time for date keys", () => {
    expect(dashboardTestHooks.todayKey(new Date("2026-06-20T15:30:00.000Z"))).toBe("2026-06-21");
    expect(dashboardTestHooks.normalizeDateKey("2026-06-20T15:30:00.000Z")).toBe("2026-06-21");
  });
});
