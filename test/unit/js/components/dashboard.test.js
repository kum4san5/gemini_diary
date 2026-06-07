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
});
