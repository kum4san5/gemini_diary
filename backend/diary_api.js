function getDiaries() {
  const databaseId = requireScriptProp("DIARY_DATABASE_ID", "DATABASE_ID");
  const result = notionQueryDatabase(databaseId, {
    page_size: 50,
    sorts: [{ property: "Date", direction: "descending" }],
  });
  return (result.results || []).map(mapDiaryPage);
}

function saveDiary(data) {
  const diaryText = data.content || data.originalText || "";
  const geminiResult = callGeminiAPI(diaryText);
  const aiData = JSON.parse(geminiResult);

  const databaseId = requireScriptProp("DIARY_DATABASE_ID", "DATABASE_ID");
  const page = notionCreatePage(databaseId, {
    Name: titleProp(data.date || new Date().toISOString().split("T")[0]),
    Date: dateProp(data.date || new Date().toISOString()),
    Type: selectProp(data.type || "English"),
    "Original Text": richTextProp(diaryText),
    "Corrected Text": richTextProp(aiData.corrected_text || aiData.answer || ""),
    Feedback: richTextProp(aiData.feedback || ""),
  });

  return {
    status: "success",
    corrected_text: aiData.corrected_text || aiData.answer || "",
    feedback: aiData.feedback || "",
    pageId: page.id,
  };
}

function mapDiaryPage(page) {
  const props = page.properties || {};
  return {
    id: page.id,
    date: readDate(props, "Date") || readTitle(props, "Name"),
    text: readRichText(props, "Original Text"),
    correction: readRichText(props, "Corrected Text"),
    feedback: readRichText(props, "Feedback"),
    type: readSelect(props, "Type"),
    createdAt: page.created_time || "",
  };
}
