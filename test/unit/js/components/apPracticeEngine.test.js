import {
  AP_SECTION_A,
  buildLearningLogFromPractice,
  buildPeriodSummaries,
  buildPeriodKey,
  filterQuestions,
  parseQuestionCsv,
  recordAnswer,
  selectLatestQuestionPeriod,
  sortPeriods,
  validateQuestionBank,
} from "../../../../docs/js/components/apPracticeEngine.js";

const manifest = {
  latestOfficialYear: 2025,
  latestOfficialSeason: "秋期",
  periods: [
    { year: 2024, season: "春期", periodLabel: "2024 春期", expectedCounts: { 科目A: 80, 科目B: 11 } },
    { year: 2025, season: "春期", periodLabel: "2025 春期", expectedCounts: { 科目A: 80, 科目B: 11 } },
    { year: 2025, season: "秋期", periodLabel: "2025 秋期", expectedCounts: { 科目A: 80, 科目B: 11 } },
  ],
};

const questions = [
  {
    id: "q-2025-autumn-1",
    year: 2025,
    season: "秋期",
    periodLabel: "2025 秋期",
    section: AP_SECTION_A,
    number: 1,
    domain: "テクノロジ",
    category: "ネットワーク",
    body: "IPの役割はどれか。",
    choices: [{ key: "ア", text: "名前解決" }, { key: "イ", text: "経路選択" }],
    answer: ["イ"],
    sourceUrl: "https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html",
    sourceLabel: "IPA",
  },
  {
    id: "q-2024-spring-1",
    year: 2024,
    season: "春期",
    periodLabel: "2024 春期",
    section: AP_SECTION_A,
    number: 1,
    domain: "ストラテジ",
    category: "SLA",
    body: "SLAの説明はどれか。",
    choices: [{ key: "ア", text: "サービス水準の合意" }, { key: "イ", text: "作業分解" }],
    answer: ["ア"],
    sourceUrl: "https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html",
    sourceLabel: "IPA",
  },
];

describe("AP practice engine", () => {
  test("sorts periods by newest year and autumn first", () => {
    expect(sortPeriods(manifest.periods).map((period) => period.periodLabel)).toEqual([
      "2025 秋期",
      "2025 春期",
      "2024 春期",
    ]);
  });

  test("selects the latest period from available question bank", () => {
    const latest = selectLatestQuestionPeriod(questions, manifest);

    expect(buildPeriodKey(latest.year, latest.season)).toBe("2025-秋期");
  });

  test("marks missing periods as not collected", () => {
    const summaries = buildPeriodSummaries(manifest, questions, {});
    const missing = summaries.find((period) => period.periodLabel === "2025 春期");

    expect(missing.collected).toBe(false);
    expect(missing.totalQuestions).toBe(0);
  });

  test("filters questions by selected year period without mixing old questions", () => {
    const filtered = filterQuestions(questions, {
      mode: "year",
      selectedPeriodKey: "2024-春期",
      filters: { section: "all", domain: "all", attempt: "all" },
      progress: { answered: {}, bookmarks: [], reviewQueue: [], notes: {} },
    }, manifest);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("q-2024-spring-1");
  });

  test("records wrong answers into review queue and removes them after correct answer", () => {
    let progress = { answered: {}, bookmarks: [], reviewQueue: [], notes: {} };

    let result = recordAnswer(progress, questions[0], "ア");
    progress = result.progress;
    expect(result.result.correct).toBe(false);
    expect(progress.reviewQueue).toContain("q-2025-autumn-1");

    result = recordAnswer(progress, questions[0], "イ");
    progress = result.progress;
    expect(result.result.correct).toBe(true);
    expect(progress.reviewQueue).not.toContain("q-2025-autumn-1");
  });

  test("parses CSV question import and validates required fields", () => {
    const csv = [
      "id,year,season,periodLabel,section,number,domain,category,body,choiceア,choiceイ,answer,sourceUrl,sourceLabel",
      "csv-1,2025,秋期,2025 秋期,科目A,3,テクノロジ,DB,正規化の目的はどれか,冗長性を減らす,全列を文字列にする,ア,https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html,IPA",
    ].join("\n");
    const parsed = parseQuestionCsv(csv);
    const validation = validateQuestionBank(parsed);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].answer).toEqual(["ア"]);
    expect(validation.ok).toBe(true);
  });

  test("builds a learning log from practice progress", () => {
    const progress = recordAnswer({ answered: {}, bookmarks: [], reviewQueue: [], notes: {} }, questions[0], "イ").progress;
    const log = buildLearningLogFromPractice({
      questions,
      progress,
      periodLabel: "2025 秋期",
      minutes: 12,
      mode: "年度別",
    });

    expect(log.category).toBe("応用情報演習");
    expect(log.memo).toContain("2025 秋期");
    expect(log.memo).toContain("正答: 1/1問");
  });
});
