const status = document.querySelector("#status");
const schedule = document.querySelector("#schedule");
const courses = document.querySelector("#courses");
const eventCount = document.querySelector("#event-count");
const download = document.querySelector("#download");
const reminder = document.querySelector("#reminder");
const language = document.querySelector("#language");
const selectAll = document.querySelector("#select-all");

let currentTab;
let currentEvents = [];
let selectedCourses = new Set();
let hasRenderedCourses = false;

const copy = {
  en: { title: "Your timetable", loading: "Reading your open AIMS page…", eventSelected: "class events selected", selectCourses: "Courses to export", selectAll: "Select all", reminder: "Reminder", none: "No reminder", minutes15: "15 minutes before", minutes30: "30 minutes before", download: "Download calendar file", preparing: "Preparing download…", openSchedule: "Open your AIMS Weekly Schedule or Student Detail Schedule, then open this extension.", noSchedule: "No timetable was found on this page.", downloadError: "Could not create the calendar file." },
  "zh-HK": { title: "你的課表", loading: "正在讀取目前的 AIMS 課表…", eventSelected: "個已選課堂事件可匯出", selectCourses: "選擇要匯出的課程", selectAll: "全選", reminder: "提醒", none: "不設提醒", minutes15: "提前 15 分鐘", minutes30: "提前 30 分鐘", download: "下載日曆檔案", preparing: "正在準備下載…", openSchedule: "請先開啟 AIMS 的 Weekly Schedule 或 Student Detail Schedule，再打開此擴展。", noSchedule: "這個頁面找不到課表。", downloadError: "無法建立日曆檔案。" }
};

initialize();

async function initialize() {
  const stored = await chrome.storage.local.get({ language: "en" });
  language.value = stored.language;
  applyLanguage();
  start().catch(showError);
}

async function start() {
  [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!currentTab?.id || !currentTab.url?.includes("banweb.cityu.edu.hk")) {
    throw new Error(t("openSchedule"));
  }
  const result = await askPage({ type: "PREVIEW_SCHEDULE" });
  if (!result?.ok) throw new Error(result?.error || t("noSchedule"));
  render(result.events);
}

async function askPage(message) {
  try {
    // Always create a fresh reader for the currently open authenticated page.
    // This avoids stale content-script contexts after an extension reload.
    await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, files: ["content.js"] });
    return await withTimeout(chrome.tabs.sendMessage(currentTab.id, message), 10000);
  } catch (error) {
    throw new Error(`Cannot read this AIMS page: ${error.message}`);
  }
}

function withTimeout(promise, milliseconds) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("the page did not respond")), milliseconds))
  ]);
}

function render(events) {
  currentEvents = events;
  const grouped = new Map();
  for (const event of events) {
    grouped.set(event.course, [...(grouped.get(event.course) || []), event]);
  }
  const availableCourses = new Set(grouped.keys());
  if (!hasRenderedCourses) selectedCourses = availableCourses;
  else selectedCourses = new Set([...selectedCourses].filter((course) => availableCourses.has(course)));
  hasRenderedCourses = true;

  courses.replaceChildren(...[...grouped].map(([course, sessions]) => {
    const row = document.createElement("label");
    row.className = "course";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.course = course;
    checkbox.checked = selectedCourses.has(course);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedCourses.add(course);
      else selectedCourses.delete(course);
      updateSelectionSummary();
    });
    const name = document.createElement("div");
    name.textContent = course;
    const count = document.createElement("span");
    count.textContent = `${sessions.length}×`;
    row.append(checkbox, name, count);
    return row;
  }));
  updateSelectionSummary();
  status.hidden = true;
  schedule.hidden = false;
}

function updateSelectionSummary() {
  const selectedEvents = currentEvents.filter((event) => selectedCourses.has(event.course));
  eventCount.textContent = selectedEvents.length;
  const courseCheckboxes = [...courses.querySelectorAll('input[type="checkbox"]')];
  selectAll.checked = courseCheckboxes.length > 0 && courseCheckboxes.every((checkbox) => checkbox.checked);
  selectAll.indeterminate = !selectAll.checked && courseCheckboxes.some((checkbox) => checkbox.checked);
  download.disabled = selectedEvents.length === 0;
}

selectAll.addEventListener("change", () => {
  const courseCheckboxes = [...courses.querySelectorAll('input[type="checkbox"]')];
  selectedCourses = new Set(selectAll.checked ? courseCheckboxes.map((checkbox) => checkbox.dataset.course) : []);
  for (const checkbox of courseCheckboxes) checkbox.checked = selectAll.checked;
  updateSelectionSummary();
});

language.addEventListener("change", async () => {
  await chrome.storage.local.set({ language: language.value });
  applyLanguage();
  if (currentEvents.length) render(currentEvents);
});

function applyLanguage() {
  document.documentElement.lang = language.value;
  for (const node of document.querySelectorAll("[data-i18n]")) node.textContent = t(node.dataset.i18n);
}

function t(key) {
  return copy[language.value]?.[key] || copy.en[key];
}

download.addEventListener("click", async () => {
  download.disabled = true;
  download.textContent = t("preparing");
  try {
    const result = await askPage({ type: "EXPORT_SCHEDULE", reminderMinutes: Number(reminder.value), selectedCourses: [...selectedCourses] });
    if (!result?.ok) throw new Error(result?.error || t("downloadError"));
    const saved = await chrome.runtime.sendMessage({ type: "DOWNLOAD_CALENDAR", ...result, tabId: currentTab.id });
    if (!saved?.ok) throw new Error(saved?.error || "Could not download the calendar file.");
    window.close();
  } catch (error) {
    download.disabled = false;
    download.textContent = t("download");
    showError(error);
  }
});

function showError(error) {
  status.textContent = error.message || "Something went wrong. Please try again.";
  status.style.color = "#b42318";
}
