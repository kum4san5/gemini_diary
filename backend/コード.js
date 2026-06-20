function doGet(e) {
  try {
    resetSchemaWarnings();
    const action = (e && e.parameter && e.parameter.action) || "health";

    switch (action) {
      case "health":
        return jsonOutput({ status: "ok", service: "life-dashboard-api" });
      case "notionTest":
        return jsonOutput(testNotionConnection());
      case "getTasks":
        return jsonOutput(getTasks());
      case "getLearningLogs":
        return jsonOutput(getLearningLogs());
      case "getKnowledgeNotes":
        return jsonOutput(getKnowledgeNotes());
      case "getShortcuts":
        return jsonOutput(getShortcuts());
      case "getDailyReviews":
        return jsonOutput(getDailyReviews());
      case "getProjects":
        return jsonOutput(getProjects());
      case "getGoals":
        return jsonOutput(getGoals());
      case "getHabits":
        return jsonOutput(getHabits());
      case "getWeeklyReviews":
        return jsonOutput(getWeeklyReviews());
      case "getTags":
        return jsonOutput(getTags());
      case "getCategories":
        return jsonOutput(getCategories());
      case "getAiInsights":
        return jsonOutput(getAiInsights());
      case "getResources":
        return jsonOutput(getResources());
      case "getDashboardSettings":
        return jsonOutput(getDashboardSettings());
      case "getSchemaCheck":
        return jsonOutput(getSchemaCheck());
      case "getDiaries":
        return jsonOutput(getDiaries());
      default:
        return jsonOutput({ status: "error", message: "Invalid action: " + action });
    }
  } catch (error) {
    return jsonOutput(errorPayload(error));
  }
}

function doPost(e) {
  try {
    resetSchemaWarnings();
    const data = parsePostData(e);
    const action = data.action || inferPostAction(data);

    switch (action) {
      case "saveTask":
        return jsonOutput(saveTask(data));
      case "updateTask":
        return jsonOutput(updateTask(data));
      case "archiveTask":
        return jsonOutput(archiveTask(data));
      case "saveLearningLog":
        return jsonOutput(saveLearningLog(data));
      case "updateLearningLog":
        return jsonOutput(updateLearningLog(data));
      case "archiveLearningLog":
        return jsonOutput(archiveLearningLog(data));
      case "saveKnowledgeNote":
        return jsonOutput(saveKnowledgeNote(data));
      case "updateKnowledgeNote":
        return jsonOutput(updateKnowledgeNote(data));
      case "archiveKnowledgeNote":
        return jsonOutput(archiveKnowledgeNote(data));
      case "saveShortcut":
        return jsonOutput(saveShortcut(data));
      case "updateShortcut":
        return jsonOutput(updateShortcut(data));
      case "archiveShortcut":
        return jsonOutput(archiveShortcut(data));
      case "saveDailyReview":
        return jsonOutput(saveDailyReview(data));
      case "saveProject":
        return jsonOutput(saveProject(data));
      case "archiveProject":
        return jsonOutput(archiveProject(data));
      case "saveGoal":
        return jsonOutput(saveGoal(data));
      case "archiveGoal":
        return jsonOutput(archiveGoal(data));
      case "saveHabit":
        return jsonOutput(saveHabit(data));
      case "archiveHabit":
        return jsonOutput(archiveHabit(data));
      case "saveWeeklyReview":
        return jsonOutput(saveWeeklyReview(data));
      case "archiveWeeklyReview":
        return jsonOutput(archiveWeeklyReview(data));
      case "saveTag":
        return jsonOutput(saveTag(data));
      case "archiveTag":
        return jsonOutput(archiveTag(data));
      case "saveCategory":
        return jsonOutput(saveCategory(data));
      case "archiveCategory":
        return jsonOutput(archiveCategory(data));
      case "saveAiInsight":
        return jsonOutput(saveAiInsight(data));
      case "archiveAiInsight":
        return jsonOutput(archiveAiInsight(data));
      case "saveResource":
        return jsonOutput(saveResource(data));
      case "archiveResource":
        return jsonOutput(archiveResource(data));
      case "saveDashboardSetting":
        return jsonOutput(saveDashboardSetting(data));
      case "archiveDashboardSetting":
        return jsonOutput(archiveDashboardSetting(data));
      case "saveDiary":
        return jsonOutput(saveDiary(data));
      default:
        return jsonOutput({ status: "error", message: "Invalid action: " + action });
    }
  } catch (error) {
    return jsonOutput(errorPayload(error));
  }
}

function parsePostData(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Missing POST body");
  }
  return JSON.parse(e.postData.contents);
}

function inferPostAction(data) {
  if (data.content || data.corrected_text || data.feedback) return "saveDiary";
  if (data.minutes || data.genre || data.tags) return "saveLearningLog";
  if (data.title || data.status || data.priority) return "saveTask";
  return "";
}
