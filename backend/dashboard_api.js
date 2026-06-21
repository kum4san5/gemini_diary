function getTasks() {
  const databaseId = requireScriptProp("TASKS_DATABASE_ID");
  const result = notionQueryDatabase(databaseId, {
    page_size: 50,
    sorts: [{ property: "Created At", direction: "descending" }],
  });
  return (result.results || []).map(mapTaskPage);
}

function saveTask(data) {
  const databaseId = requireScriptProp("TASKS_DATABASE_ID");
  const page = notionCreatePage(databaseId, taskProperties(data));
  return { status: "success", task: mapTaskPage(page) };
}

function updateTask(data) {
  const pageId = data.pageId || data.id;
  if (!pageId) throw new Error("Missing task pageId");

  const databaseId = requireScriptProp("TASKS_DATABASE_ID");
  const properties = {};
  if ("title" in data) properties.Name = titleProp(data.title);
  if ("status" in data) properties.Status = statusProp(data.status);
  if ("priority" in data) properties.Priority = selectProp(data.priority);
  if ("area" in data) properties.Area = selectProp(data.area);
  if ("category" in data) properties.Category = selectProp(data.category);
  if ("genre" in data) properties.Genre = selectProp(data.genre);
  if ("estimatedMinutes" in data) properties["Estimated Minutes"] = numberProp(data.estimatedMinutes);
  if ("actualMinutes" in data) properties["Actual Minutes"] = numberProp(data.actualMinutes);
  if ("memo" in data) properties.Memo = richTextProp(data.memo);
  if ("link" in data) properties.Link = urlProp(data.link);
  if ("completed" in data) properties.Completed = checkboxProp(data.completed);
  if ("completedAt" in data && data.completedAt) properties["Completed At"] = dateProp(data.completedAt);
  if ("projectIds" in data) properties.Projects = relationProp(data.projectIds);
  if ("goalIds" in data) properties.Goals = relationProp(data.goalIds);
  if ("resourceIds" in data) properties.Resources = relationProp(data.resourceIds);
  if ("knowledgeNoteIds" in data) properties["Knowledge Notes"] = relationProp(data.knowledgeNoteIds);

  const page = notionUpdatePage(pageId, filterDatabaseProperties(databaseId, properties));
  return { status: "success", task: mapTaskPage(page) };
}

function archiveTask(data) {
  const pageId = data.pageId || data.id;
  if (!pageId) throw new Error("Missing task pageId");
  notionArchivePage(pageId);
  return { status: "success", archived: true, id: pageId };
}

function getLearningLogs() {
  const databaseId = requireScriptProp("LEARNING_LOGS_DATABASE_ID");
  const result = notionQueryDatabase(databaseId, {
    page_size: 50,
    sorts: [{ property: "Date", direction: "descending" }],
  });
  return (result.results || []).map(mapLearningLogPage);
}

function saveLearningLog(data) {
  const databaseId = requireScriptProp("LEARNING_LOGS_DATABASE_ID");
  const page = notionCreatePage(databaseId, learningLogProperties(data));
  return { status: "success", learningLog: mapLearningLogPage(page) };
}

function updateLearningLog(data) {
  const pageId = data.pageId || data.id;
  if (!pageId) throw new Error("Missing learning log pageId");

  const databaseId = requireScriptProp("LEARNING_LOGS_DATABASE_ID");
  const properties = {};
  if ("title" in data) properties.Name = titleProp(data.title);
  if ("date" in data) properties.Date = dateProp(data.date);
  if ("minutes" in data) properties.Minutes = numberProp(data.minutes);
  if ("area" in data) properties.Area = selectProp(data.area);
  if ("category" in data) properties.Category = selectProp(data.category);
  if ("genre" in data) properties.Genre = selectProp(data.genre);
  if ("tags" in data) properties.Tags = multiSelectProp(data.tags);
  if ("understanding" in data) properties.Understanding = selectProp(data.understanding);
  if ("energy" in data) properties.Energy = selectProp(data.energy);
  if ("memo" in data) properties.Memo = richTextProp(data.memo);
  if ("aiSummary" in data) properties["AI Summary"] = richTextProp(data.aiSummary);
  if ("relatedTaskId" in data) properties["Related Task"] = relationProp(data.relatedTaskId);
  if ("projectIds" in data) properties.Projects = relationProp(data.projectIds);
  if ("goalIds" in data) properties.Goals = relationProp(data.goalIds);
  if ("resourceIds" in data) properties.Resources = relationProp(data.resourceIds);

  const page = notionUpdatePage(pageId, filterDatabaseProperties(databaseId, properties));
  return { status: "success", learningLog: mapLearningLogPage(page) };
}

function archiveLearningLog(data) {
  const pageId = data.pageId || data.id;
  if (!pageId) throw new Error("Missing learning log pageId");
  notionArchivePage(pageId);
  return { status: "success", archived: true, id: pageId };
}

function getKnowledgeNotes() {
  const databaseId = requireScriptProp("KNOWLEDGE_NOTES_DATABASE_ID");
  const result = notionQueryDatabase(databaseId, {
    page_size: 50,
    sorts: [{ property: "Created At", direction: "descending" }],
  });
  return (result.results || []).map(mapKnowledgeNotePage);
}

function saveKnowledgeNote(data) {
  const databaseId = requireScriptProp("KNOWLEDGE_NOTES_DATABASE_ID");
  const page = notionCreatePage(databaseId, knowledgeNoteProperties(data));
  return { status: "success", knowledgeNote: mapKnowledgeNotePage(page) };
}

function updateKnowledgeNote(data) {
  const pageId = data.pageId || data.id;
  if (!pageId) throw new Error("Missing knowledge note pageId");

  const databaseId = requireScriptProp("KNOWLEDGE_NOTES_DATABASE_ID");
  const properties = {};
  if ("title" in data) properties.Name = titleProp(data.title);
  if ("area" in data) properties.Area = selectProp(data.area);
  if ("category" in data) properties.Category = selectProp(data.category);
  if ("genre" in data) properties.Genre = selectProp(data.genre);
  if ("tags" in data) properties.Tags = multiSelectProp(data.tags);
  if ("sourceUrl" in data) properties["Source URL"] = urlProp(data.sourceUrl);
  if ("summary" in data) properties.Summary = richTextProp(data.summary);
  if ("body" in data) properties.Body = richTextProp(data.body);
  if ("actionable" in data) properties.Actionable = checkboxProp(data.actionable);
  if ("actionText" in data) properties["Action Text"] = richTextProp(data.actionText);
  if ("relatedTaskId" in data) properties["Related Task"] = relationProp(data.relatedTaskId);
  if ("relatedLogId" in data) properties["Related Log"] = relationProp(data.relatedLogId);
  if ("projectIds" in data) properties.Projects = relationProp(data.projectIds);
  if ("goalIds" in data) properties.Goals = relationProp(data.goalIds);
  if ("resourceIds" in data) properties.Resources = relationProp(data.resourceIds);

  const page = notionUpdatePage(pageId, filterDatabaseProperties(databaseId, properties));
  return { status: "success", knowledgeNote: mapKnowledgeNotePage(page) };
}

function archiveKnowledgeNote(data) {
  const pageId = data.pageId || data.id;
  if (!pageId) throw new Error("Missing knowledge note pageId");
  notionArchivePage(pageId);
  return { status: "success", archived: true, id: pageId };
}

function getShortcuts() {
  const databaseId = requireScriptProp("SHORTCUTS_DATABASE_ID");
  const result = notionQueryDatabase(databaseId, {
    page_size: 50,
    filter: { property: "Enabled", checkbox: { equals: true } },
    sorts: [{ property: "Sort Order", direction: "ascending" }],
  });
  return (result.results || []).map(mapShortcutPage);
}

function saveShortcut(data) {
  const databaseId = requireScriptProp("SHORTCUTS_DATABASE_ID");
  const page = notionCreatePage(databaseId, shortcutProperties(data));
  return { status: "success", shortcut: mapShortcutPage(page) };
}

function updateShortcut(data) {
  const pageId = data.pageId || data.id;
  if (!pageId) throw new Error("Missing shortcut pageId");

  const databaseId = requireScriptProp("SHORTCUTS_DATABASE_ID");
  const properties = {};
  if ("title" in data) properties.Name = titleProp(data.title);
  if ("url" in data) properties.URL = urlProp(data.url);
  if ("category" in data) properties.Category = selectProp(data.category);
  if ("enabled" in data) properties.Enabled = checkboxProp(data.enabled);
  if ("sortOrder" in data) properties["Sort Order"] = numberProp(data.sortOrder);
  if ("memo" in data) properties.Memo = richTextProp(data.memo);

  const page = notionUpdatePage(pageId, filterDatabaseProperties(databaseId, properties));
  return { status: "success", shortcut: mapShortcutPage(page) };
}

function archiveShortcut(data) {
  const pageId = data.pageId || data.id;
  if (!pageId) throw new Error("Missing shortcut pageId");
  notionArchivePage(pageId);
  return { status: "success", archived: true, id: pageId };
}

function getDailyReviews() {
  const databaseId = requireScriptProp("DAILY_REVIEWS_DATABASE_ID");
  const result = notionQueryDatabase(databaseId, {
    page_size: 30,
    sorts: [{ property: "Date", direction: "descending" }],
  });
  return (result.results || []).map(mapDailyReviewPage);
}

function saveDailyReview(data) {
  const databaseId = requireScriptProp("DAILY_REVIEWS_DATABASE_ID");
  const page = notionCreatePage(databaseId, dailyReviewProperties(data));
  return { status: "success", dailyReview: mapDailyReviewPage(page) };
}

function getProjects() {
  return querySimpleDatabase("PROJECTS_DATABASE_ID", mapProjectPage);
}

function saveProject(data) {
  return createSimplePage("PROJECTS_DATABASE_ID", projectProperties(data), mapProjectPage, "project");
}

function archiveProject(data) {
  return archiveSimplePage(data, "project");
}

function getGoals() {
  return querySimpleDatabase("GOALS_DATABASE_ID", mapGoalPage);
}

function saveGoal(data) {
  return createSimplePage("GOALS_DATABASE_ID", goalProperties(data), mapGoalPage, "goal");
}

function archiveGoal(data) {
  return archiveSimplePage(data, "goal");
}

function getHabits() {
  return querySimpleDatabase("HABITS_DATABASE_ID", mapHabitPage);
}

function saveHabit(data) {
  return createSimplePage("HABITS_DATABASE_ID", habitProperties(data), mapHabitPage, "habit");
}

function archiveHabit(data) {
  return archiveSimplePage(data, "habit");
}

function getWeeklyReviews() {
  return querySimpleDatabase("WEEKLY_REVIEWS_DATABASE_ID", mapWeeklyReviewPage);
}

function saveWeeklyReview(data) {
  return createSimplePage("WEEKLY_REVIEWS_DATABASE_ID", weeklyReviewProperties(data), mapWeeklyReviewPage, "weeklyReview");
}

function archiveWeeklyReview(data) {
  return archiveSimplePage(data, "weeklyReview");
}

function getTags() {
  return querySimpleDatabase("TAGS_DATABASE_ID", mapTagPage);
}

function saveTag(data) {
  return createSimplePage("TAGS_DATABASE_ID", tagProperties(data), mapTagPage, "tag");
}

function archiveTag(data) {
  return archiveSimplePage(data, "tag");
}

function getCategories() {
  return querySimpleDatabase("CATEGORIES_DATABASE_ID", mapCategoryPage);
}

function saveCategory(data) {
  return createSimplePage("CATEGORIES_DATABASE_ID", categoryProperties(data), mapCategoryPage, "category");
}

function archiveCategory(data) {
  return archiveSimplePage(data, "category");
}

function getAiInsights() {
  return querySimpleDatabase("AI_INSIGHTS_DATABASE_ID", mapAiInsightPage);
}

function saveAiInsight(data) {
  return createSimplePage("AI_INSIGHTS_DATABASE_ID", aiInsightProperties(data), mapAiInsightPage, "aiInsight");
}

function archiveAiInsight(data) {
  return archiveSimplePage(data, "aiInsight");
}

function getResources() {
  return querySimpleDatabase("RESOURCES_DATABASE_ID", mapResourcePage);
}

function saveResource(data) {
  return createSimplePage("RESOURCES_DATABASE_ID", resourceProperties(data), mapResourcePage, "resource");
}

function archiveResource(data) {
  return archiveSimplePage(data, "resource");
}

function getDashboardSettings() {
  return querySimpleDatabase("DASHBOARD_SETTINGS_DATABASE_ID", mapDashboardSettingPage);
}

function getSchemaCheck() {
  const schemas = [
    { key: "TASKS_DATABASE_ID", name: "Life Tasks", properties: ["Name", "Status", "Priority", "Area", "Category", "Genre", "Estimated Minutes", "Actual Minutes", "Memo", "Link", "Completed", "Completed At", "Due", "Start Date", "Projects", "Goals", "Resources", "Knowledge Notes"] },
    { key: "LEARNING_LOGS_DATABASE_ID", name: "Learning Logs", properties: ["Name", "Date", "Minutes", "Area", "Category", "Genre", "Tags", "Understanding", "Energy", "Memo", "AI Summary", "Related Task", "Projects", "Goals", "Resources"] },
    { key: "SHORTCUTS_DATABASE_ID", name: "Shortcuts", properties: ["Name", "URL", "Category", "Enabled", "Sort Order", "Memo"] },
    { key: "PROJECTS_DATABASE_ID", name: "Projects", properties: ["Name", "Status", "Area", "Priority", "GitHub URL", "Notion URL", "Local Path", "Memo", "Goals", "Resources"] },
    { key: "GOALS_DATABASE_ID", name: "Goals", properties: ["Name", "Status", "Area", "Target Date", "Priority", "Progress", "Success Criteria", "Memo", "Projects", "Resources"] },
    { key: "HABITS_DATABASE_ID", name: "Habits", properties: ["Name", "Status", "Area", "Frequency", "Target Minutes", "Current Streak", "Best Streak", "Memo"] },
    { key: "DAILY_REVIEWS_DATABASE_ID", name: "Daily Reviews", properties: ["Name", "Date", "Mood", "Energy", "Focus", "Effort Score", "Study Minutes", "Completed Tasks", "Tasks", "Learning Logs", "Diary Entries", "Highlights", "Reflection", "Tomorrow", "AI Summary"] },
    { key: "WEEKLY_REVIEWS_DATABASE_ID", name: "Weekly Reviews", properties: ["Name", "Week Start", "Week End", "Effort Score", "Study Minutes", "Completed Tasks", "Highlights", "Problems", "Next Actions", "AI Summary"] },
    { key: "KNOWLEDGE_NOTES_DATABASE_ID", name: "Knowledge Notes", properties: ["Name", "Area", "Category", "Genre", "Tags", "Source URL", "Summary", "Body", "Actionable", "Action Text", "Related Task", "Related Log", "Projects", "Goals", "Resources"] },
    { key: "TAGS_DATABASE_ID", name: "Tags", properties: ["Name", "Area", "Color", "Memo"] },
    { key: "CATEGORIES_DATABASE_ID", name: "Categories", properties: ["Name", "Type", "Area", "Sort Order", "Enabled"] },
    { key: "AI_INSIGHTS_DATABASE_ID", name: "AI Insights", properties: ["Name", "Date", "Type", "Area", "Summary", "Suggestion", "Prompt", "Model", "Projects", "Goals", "Resources"] },
    { key: "DIARY_DATABASE_ID", name: "Diary Entries", properties: ["Name", "Date", "Type", "Original Text", "Corrected Text", "Feedback"] },
    { key: "RESOURCES_DATABASE_ID", name: "Resources", properties: ["Name", "Type", "URL", "Area", "Category", "Tags", "Memo", "Projects", "Goals"] },
    { key: "DASHBOARD_SETTINGS_DATABASE_ID", name: "Dashboard Settings", properties: ["Name", "Key", "Value", "Type", "Enabled"] },
    { key: "LIFE_SCORES_DATABASE_ID", name: "Life Scores", properties: ["Name", "Date", "Happiness", "Health", "Growth", "Money", "Creation", "Rest", "Memo"] },
    { key: "MOOD_LOGS_DATABASE_ID", name: "Mood Logs", properties: ["Name", "Date", "Mood", "Energy", "Stress", "Sleep Hours", "Memo"] },
    { key: "FINANCE_SNAPSHOTS_DATABASE_ID", name: "Finance Snapshots", properties: ["Name", "Month", "Cash", "Investment", "Debt", "Saving Rate", "Free Months", "Memo"] },
    { key: "LEARNING_TOPICS_DATABASE_ID", name: "Learning Topics", properties: ["Name", "Area", "Level", "Roadmap Stage", "Next Output", "Status", "Resources", "Goals"] },
  ];

  const results = schemas.map(function (schema) {
    const databaseId = scriptProp(schema.key);
    if (!databaseId) {
      return {
        key: schema.key,
        name: schema.name,
        ok: false,
        missingDatabaseId: true,
        missingProperties: schema.properties,
      };
    }
    const result = inspectDatabaseSchema(databaseId, schema.properties);
    result.key = schema.key;
    result.name = schema.name;
    return result;
  });

  return {
    status: "success",
    ok: results.every(function (result) { return result.ok; }),
    results: results,
  };
}

function saveDashboardSetting(data) {
  return createSimplePage("DASHBOARD_SETTINGS_DATABASE_ID", dashboardSettingProperties(data), mapDashboardSettingPage, "dashboardSetting");
}

function archiveDashboardSetting(data) {
  return archiveSimplePage(data, "dashboardSetting");
}

function querySimpleDatabase(propertyName, mapper) {
  const databaseId = requireScriptProp(propertyName);
  const result = notionQueryDatabase(databaseId, { page_size: 50 });
  return (result.results || []).map(mapper);
}

function createSimplePage(propertyName, properties, mapper, key) {
  const databaseId = requireScriptProp(propertyName);
  const page = notionCreatePage(databaseId, properties);
  const payload = { status: "success" };
  payload[key] = mapper(page);
  return payload;
}

function archiveSimplePage(data, key) {
  const pageId = data.pageId || data.id;
  if (!pageId) throw new Error("Missing " + key + " pageId");
  notionArchivePage(pageId);
  return { status: "success", archived: true, id: pageId };
}

function taskProperties(data) {
  const completed = Boolean(data.completed);
  const properties = {
    Name: titleProp(data.title || "Untitled Task"),
    Status: statusProp(data.status || (completed ? "完了" : "準備中")),
    Priority: selectProp(data.priority || "今日中"),
    Area: selectProp(data.area || "学習"),
    Category: selectProp(data.category || "過去問道場"),
    Genre: selectProp(data.genre || "その他"),
    "Estimated Minutes": numberProp(data.estimatedMinutes),
    "Actual Minutes": numberProp(data.actualMinutes),
    Memo: richTextProp(data.memo),
    Link: urlProp(data.link),
    Completed: checkboxProp(completed),
  };

  if (data.completedAt) properties["Completed At"] = dateProp(data.completedAt);
  if (data.due) properties.Due = dateProp(data.due);
  if (data.startDate) properties["Start Date"] = dateProp(data.startDate);
  if (data.projectIds && data.projectIds.length) properties.Projects = relationProp(data.projectIds);
  if (data.goalIds && data.goalIds.length) properties.Goals = relationProp(data.goalIds);
  if (data.resourceIds && data.resourceIds.length) properties.Resources = relationProp(data.resourceIds);
  if (data.knowledgeNoteIds && data.knowledgeNoteIds.length) properties["Knowledge Notes"] = relationProp(data.knowledgeNoteIds);

  return properties;
}

function learningLogProperties(data) {
  const title = data.title || [
    data.category || "活動ログ",
    data.genre || "",
    data.minutes ? data.minutes + "分" : "",
  ].filter(Boolean).join(" ");

  const properties = {
    Name: titleProp(title),
    Date: dateProp(data.date || new Date().toISOString()),
    Minutes: numberProp(data.minutes),
    Area: selectProp(data.area || "応用情報"),
    Category: selectProp(data.category || "過去問道場"),
    Genre: selectProp(data.genre || "その他"),
    Tags: multiSelectProp(data.tags),
    Understanding: selectProp(data.understanding),
    Energy: selectProp(data.energy),
    Memo: richTextProp(data.memo),
    "AI Summary": richTextProp(data.aiSummary),
  };

  if (data.relatedTaskId) properties["Related Task"] = relationProp(data.relatedTaskId);
  if (data.projectIds && data.projectIds.length) properties.Projects = relationProp(data.projectIds);
  if (data.goalIds && data.goalIds.length) properties.Goals = relationProp(data.goalIds);
  if (data.resourceIds && data.resourceIds.length) properties.Resources = relationProp(data.resourceIds);
  return properties;
}

function knowledgeNoteProperties(data) {
  const properties = {
    Name: titleProp(data.title || "Untitled Note"),
    Area: selectProp(data.area || "応用情報"),
    Category: selectProp(data.category || "知識整理"),
    Genre: selectProp(data.genre || "その他"),
    Tags: multiSelectProp(data.tags),
    "Source URL": urlProp(data.sourceUrl),
    Summary: richTextProp(data.summary),
    Body: richTextProp(data.body),
    Actionable: checkboxProp(data.actionable),
    "Action Text": richTextProp(data.actionText),
  };

  if (data.relatedTaskId) properties["Related Task"] = relationProp(data.relatedTaskId);
  if (data.relatedLogId) properties["Related Log"] = relationProp(data.relatedLogId);
  if (data.projectIds && data.projectIds.length) properties.Projects = relationProp(data.projectIds);
  if (data.goalIds && data.goalIds.length) properties.Goals = relationProp(data.goalIds);
  if (data.resourceIds && data.resourceIds.length) properties.Resources = relationProp(data.resourceIds);
  return properties;
}

function shortcutProperties(data) {
  return {
    Name: titleProp(data.title || "Untitled Shortcut"),
    URL: urlProp(data.url),
    Category: selectProp(data.category || "その他"),
    Enabled: checkboxProp("enabled" in data ? data.enabled : true),
    "Sort Order": numberProp(data.sortOrder),
    Memo: richTextProp(data.memo),
  };
}

function dailyReviewProperties(data) {
  const date = data.date || new Date().toISOString().split("T")[0];
  const properties = {
    Name: titleProp(data.title || date + " Daily Review"),
    Date: dateProp(date),
    Mood: selectProp(data.mood || "普通"),
    Energy: selectProp(data.energy || "普通"),
    Focus: selectProp(data.focus || "普通"),
    "Effort Score": numberProp(data.effortScore),
    "Study Minutes": numberProp(data.studyMinutes),
    "Completed Tasks": numberProp(data.completedTasks),
    Highlights: richTextProp(data.highlights),
    Reflection: richTextProp(data.reflection),
    Tomorrow: richTextProp(data.tomorrow),
    "AI Summary": richTextProp(data.aiSummary),
  };

  if (data.taskIds && data.taskIds.length) properties.Tasks = relationProp(data.taskIds);
  if (data.learningLogIds && data.learningLogIds.length) properties["Learning Logs"] = relationProp(data.learningLogIds);
  if (data.diaryEntryIds && data.diaryEntryIds.length) properties["Diary Entries"] = relationProp(data.diaryEntryIds);
  return properties;
}

function projectProperties(data) {
  const properties = {
    Name: titleProp(data.title || "Untitled Project"),
    Status: selectProp(data.status || "構想中"),
    Area: selectProp(data.area || "開発"),
    Priority: selectProp(data.priority || "中"),
    "GitHub URL": urlProp(data.githubUrl),
    "Notion URL": urlProp(data.notionUrl),
    "Local Path": richTextProp(data.localPath),
    Memo: richTextProp(data.memo),
  };
  if (data.goalIds && data.goalIds.length) properties.Goals = relationProp(data.goalIds);
  if (data.resourceIds && data.resourceIds.length) properties.Resources = relationProp(data.resourceIds);
  return properties;
}

function goalProperties(data) {
  const properties = {
    Name: titleProp(data.title || "Untitled Goal"),
    Status: selectProp(data.status || "未着手"),
    Area: selectProp(data.area || "学習"),
    "Target Date": dateProp(data.targetDate),
    Priority: selectProp(data.priority || "中"),
    Progress: numberProp(data.progress),
    "Success Criteria": richTextProp(data.successCriteria),
    Memo: richTextProp(data.memo),
  };
  if (data.projectIds && data.projectIds.length) properties.Projects = relationProp(data.projectIds);
  if (data.resourceIds && data.resourceIds.length) properties.Resources = relationProp(data.resourceIds);
  return properties;
}

function habitProperties(data) {
  return {
    Name: titleProp(data.title || "Untitled Habit"),
    Status: selectProp(data.status || "有効"),
    Area: selectProp(data.area || "生活"),
    Frequency: selectProp(data.frequency || "毎日"),
    "Target Minutes": numberProp(data.targetMinutes),
    "Current Streak": numberProp(data.currentStreak),
    "Best Streak": numberProp(data.bestStreak),
    Memo: richTextProp(data.memo),
  };
}

function weeklyReviewProperties(data) {
  return {
    Name: titleProp(data.title || "Weekly Review"),
    "Week Start": dateProp(data.weekStart),
    "Week End": dateProp(data.weekEnd),
    "Effort Score": numberProp(data.effortScore),
    "Study Minutes": numberProp(data.studyMinutes),
    "Completed Tasks": numberProp(data.completedTasks),
    Highlights: richTextProp(data.highlights),
    Problems: richTextProp(data.problems),
    "Next Actions": richTextProp(data.nextActions),
    "AI Summary": richTextProp(data.aiSummary),
  };
}

function tagProperties(data) {
  return {
    Name: titleProp(data.title || "Untitled Tag"),
    Area: selectProp(data.area || "学習"),
    Color: selectProp(data.color || "Default"),
    Memo: richTextProp(data.memo),
  };
}

function categoryProperties(data) {
  return {
    Name: titleProp(data.title || "Untitled Category"),
    Type: selectProp(data.type || "Category"),
    Area: selectProp(data.area || "学習"),
    "Sort Order": numberProp(data.sortOrder),
    Enabled: checkboxProp("enabled" in data ? data.enabled : true),
  };
}

function aiInsightProperties(data) {
  const properties = {
    Name: titleProp(data.title || "AI Insight"),
    Date: dateProp(data.date || new Date().toISOString()),
    Type: selectProp(data.type || "Suggestion"),
    Area: selectProp(data.area || "学習"),
    Summary: richTextProp(data.summary),
    Suggestion: richTextProp(data.suggestion),
    Prompt: richTextProp(data.prompt),
    Model: richTextProp(data.model),
  };
  if (data.projectIds && data.projectIds.length) properties.Projects = relationProp(data.projectIds);
  if (data.goalIds && data.goalIds.length) properties.Goals = relationProp(data.goalIds);
  if (data.resourceIds && data.resourceIds.length) properties.Resources = relationProp(data.resourceIds);
  return properties;
}

function resourceProperties(data) {
  const properties = {
    Name: titleProp(data.title || "Untitled Resource"),
    Type: selectProp(data.type || "Webサイト"),
    URL: urlProp(data.url),
    Area: selectProp(data.area || "学習"),
    Category: selectProp(data.category || "その他"),
    Tags: multiSelectProp(data.tags),
    Memo: richTextProp(data.memo),
  };
  if (data.projectIds && data.projectIds.length) properties.Projects = relationProp(data.projectIds);
  if (data.goalIds && data.goalIds.length) properties.Goals = relationProp(data.goalIds);
  return properties;
}

function dashboardSettingProperties(data) {
  return {
    Name: titleProp(data.title || data.key || "Dashboard Setting"),
    Key: richTextProp(data.key),
    Value: richTextProp(data.value),
    Type: selectProp(data.type || "General"),
    Enabled: checkboxProp("enabled" in data ? data.enabled : true),
  };
}

function mapTaskPage(page) {
  const props = page.properties || {};
  return {
    id: page.id,
    title: readTitle(props, "Name"),
    status: readStatus(props, "Status"),
    priority: readSelect(props, "Priority"),
    area: readSelect(props, "Area"),
    category: readSelect(props, "Category"),
    genre: readSelect(props, "Genre"),
    estimatedMinutes: readNumber(props, "Estimated Minutes"),
    actualMinutes: readNumber(props, "Actual Minutes", "ActualMinutes"),
    memo: readRichText(props, "Memo"),
    link: readUrl(props, "Link"),
    completed: readCheckbox(props, "Completed"),
    completedAt: readDate(props, "Completed At", "CompletedAt"),
    due: readDate(props, "Due"),
    startDate: readDate(props, "Start Date"),
    projectIds: readRelationIds(props, "Projects"),
    goalIds: readRelationIds(props, "Goals"),
    resourceIds: readRelationIds(props, "Resources"),
    knowledgeNoteIds: readRelationIds(props, "Knowledge Notes"),
    createdAt: page.created_time || "",
    updatedAt: page.last_edited_time || "",
  };
}

function mapLearningLogPage(page) {
  const props = page.properties || {};
  return {
    id: page.id,
    title: readTitle(props, "Name"),
    date: readDate(props, "Date"),
    minutes: readNumber(props, "Minutes"),
    area: readSelect(props, "Area"),
    category: readSelect(props, "Category"),
    genre: readSelect(props, "Genre"),
    tags: readMultiSelect(props, "Tags"),
    relatedTaskIds: readRelationIds(props, "Related Task"),
    projectIds: readRelationIds(props, "Projects"),
    goalIds: readRelationIds(props, "Goals"),
    resourceIds: readRelationIds(props, "Resources"),
    understanding: readSelect(props, "Understanding"),
    energy: readSelect(props, "Energy"),
    memo: readRichText(props, "Memo"),
    aiSummary: readRichText(props, "AI Summary"),
    createdAt: page.created_time || "",
    updatedAt: page.last_edited_time || "",
  };
}

function mapKnowledgeNotePage(page) {
  const props = page.properties || {};
  return {
    id: page.id,
    title: readTitle(props, "Name"),
    area: readSelect(props, "Area"),
    category: readSelect(props, "Category"),
    genre: readSelect(props, "Genre"),
    tags: readMultiSelect(props, "Tags"),
    sourceUrl: readUrl(props, "Source URL"),
    summary: readRichText(props, "Summary"),
    body: readRichText(props, "Body"),
    actionable: readCheckbox(props, "Actionable"),
    actionText: readRichText(props, "Action Text"),
    relatedTaskIds: readRelationIds(props, "Related Task"),
    relatedLogIds: readRelationIds(props, "Related Log"),
    projectIds: readRelationIds(props, "Projects"),
    goalIds: readRelationIds(props, "Goals"),
    resourceIds: readRelationIds(props, "Resources"),
    createdAt: page.created_time || "",
    updatedAt: page.last_edited_time || "",
  };
}

function mapShortcutPage(page) {
  const props = page.properties || {};
  return {
    id: page.id,
    title: readTitle(props, "Name"),
    url: readUrl(props, "URL"),
    category: readSelect(props, "Category"),
    enabled: readCheckbox(props, "Enabled"),
    sortOrder: readNumber(props, "Sort Order"),
    memo: readRichText(props, "Memo"),
    createdAt: page.created_time || "",
  };
}

function mapDailyReviewPage(page) {
  const props = page.properties || {};
  return {
    id: page.id,
    title: readTitle(props, "Name"),
    date: readDate(props, "Date"),
    mood: readSelect(props, "Mood"),
    energy: readSelect(props, "Energy"),
    focus: readSelect(props, "Focus"),
    effortScore: readNumber(props, "Effort Score"),
    studyMinutes: readNumber(props, "Study Minutes"),
    completedTasks: readNumber(props, "Completed Tasks"),
    taskIds: readRelationIds(props, "Tasks"),
    learningLogIds: readRelationIds(props, "Learning Logs"),
    diaryEntryIds: readRelationIds(props, "Diary Entries"),
    highlights: readRichText(props, "Highlights"),
    reflection: readRichText(props, "Reflection"),
    tomorrow: readRichText(props, "Tomorrow"),
    aiSummary: readRichText(props, "AI Summary"),
    createdAt: page.created_time || "",
  };
}

function mapSimplePage(page) {
  const props = page.properties || {};
  return {
    id: page.id,
    title: readTitle(props, "Name"),
    status: readSelect(props, "Status"),
    type: readSelect(props, "Type"),
    area: readSelect(props, "Area"),
    category: readSelect(props, "Category"),
    url: readUrl(props, "URL"),
    memo: readRichText(props, "Memo"),
    projectIds: readRelationIds(props, "Projects"),
    goalIds: readRelationIds(props, "Goals"),
    resourceIds: readRelationIds(props, "Resources"),
    createdAt: page.created_time || "",
    updatedAt: page.last_edited_time || "",
  };
}

function mapProjectPage(page) { return mapSimplePage(page); }
function mapGoalPage(page) { return mapSimplePage(page); }
function mapHabitPage(page) { return mapSimplePage(page); }
function mapWeeklyReviewPage(page) { return mapSimplePage(page); }
function mapTagPage(page) { return mapSimplePage(page); }
function mapCategoryPage(page) { return mapSimplePage(page); }
function mapAiInsightPage(page) { return mapSimplePage(page); }
function mapResourcePage(page) { return mapSimplePage(page); }
function mapDashboardSettingPage(page) { return mapSimplePage(page); }
