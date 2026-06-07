const searchForm = document.querySelector("#reportSearchForm");
const clearButton = document.querySelector("#clearButton");
const reportTableBody = document.querySelector("#reportTableBody");
const emptyReport = document.querySelector("#emptyReport");
const resultCount = document.querySelector("#resultCount");
const sortButtons = document.querySelectorAll("[data-sort]");

const fields = {
  studentId: document.querySelector("#studentId"),
  dateFrom: document.querySelector("#dateFrom"),
  dateTo: document.querySelector("#dateTo"),
  type: document.querySelector("#type"),
  scoreItemIds: document.querySelector("#scoreItemIds"),
};

let students = [];
let scoreItems = [];
let rows = [];
let sortState = {
  key: "date",
  direction: "desc",
};

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadReport();
});

clearButton.addEventListener("click", () => {
  searchForm.reset();
  Array.from(fields.scoreItemIds.options).forEach((option) => {
    option.selected = false;
  });
  loadReport();
});

sortButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.sort;
    sortState = {
      key,
      direction: sortState.key === key && sortState.direction === "asc" ? "desc" : "asc",
    };
    renderReport();
  });
});

init();

async function init() {
  await Promise.all([loadStudents(), loadScoreItems()]);
  await loadReport();
}

async function loadStudents() {
  students = await requestJson("/api/students");
  fields.studentId.innerHTML = `<option value="">全部學生</option>${students
    .map((student) => `<option value="${student.id}">${escapeHtml(student.name)}</option>`)
    .join("")}`;
}

async function loadScoreItems() {
  scoreItems = await requestJson("/api/score-items");
  fields.scoreItemIds.innerHTML = scoreItems
    .map((item) => {
      const typeLabel = item.type === "REWARD" ? "加分" : "減分";
      return `<option value="${item.id}">[${typeLabel}] ${escapeHtml(item.mainCategory)} - ${escapeHtml(item.subCategory)}</option>`;
    })
    .join("");
}

async function loadReport() {
  try {
    const params = new URLSearchParams();
    const selectedScoreItemIds = getSelectedScoreItemIds();

    if (fields.studentId.value) params.set("studentId", fields.studentId.value);
    if (fields.dateFrom.value) params.set("dateFrom", fields.dateFrom.value);
    if (fields.dateTo.value) params.set("dateTo", fields.dateTo.value);
    if (fields.type.value) params.set("type", fields.type.value);
    selectedScoreItemIds.forEach((id) => params.append("scoreItemId", id));

    const query = params.toString() ? `?${params.toString()}` : "";
    rows = await requestJson(`/api/reports/score-details${query}`);
    renderReport();
  } catch (error) {
    reportTableBody.innerHTML = "";
    emptyReport.classList.remove("hidden");
    emptyReport.textContent = error.message;
    resultCount.textContent = "載入失敗";
  }
}

function renderReport() {
  const sortedRows = [...rows].sort(compareRows);
  resultCount.textContent = `共 ${sortedRows.length} 筆明細`;
  emptyReport.classList.toggle("hidden", sortedRows.length > 0);
  renderSortIndicators();
  reportTableBody.innerHTML = sortedRows.map(renderReportRow).join("");
}

function renderReportRow(row) {
  const typeLabel = row.type === "REWARD" ? "加分" : "減分";
  const typeClass = row.type === "REWARD" ? "reward" : "penalty";
  const itemLabel = row.scoreItem
    ? `${row.scoreItem.mainCategory} - ${row.scoreItem.subCategory}`
    : "-";

  return `
    <tr>
      <td>${escapeHtml(row.student?.name || "-")}</td>
      <td>${formatDate(row.transactionDate)}</td>
      <td><span class="type-pill ${typeClass}">${typeLabel}</span></td>
      <td>${escapeHtml(itemLabel)}</td>
      <td>${row.scoreChange}</td>
      <td>${row.runningTotalScore}</td>
    </tr>
  `;
}

function compareRows(a, b) {
  const direction = sortState.direction === "asc" ? 1 : -1;
  const aValue = getSortValue(a, sortState.key);
  const bValue = getSortValue(b, sortState.key);

  if (typeof aValue === "number" && typeof bValue === "number") {
    return (aValue - bValue) * direction;
  }

  return String(aValue).localeCompare(String(bValue), "zh-Hant", {
    numeric: true,
    sensitivity: "base",
  }) * direction;
}

function getSortValue(row, key) {
  if (key === "date") {
    return new Date(row.transactionDate).getTime();
  }

  if (key === "student") {
    return row.student?.name || "";
  }

  if (key === "score") {
    return Number(row.scoreChange || 0);
  }

  return "";
}

function renderSortIndicators() {
  document.querySelectorAll("[data-indicator]").forEach((indicator) => {
    indicator.textContent = indicator.dataset.indicator === sortState.key
      ? (sortState.direction === "asc" ? "↑" : "↓")
      : "";
  });
}

function getSelectedScoreItemIds() {
  return Array.from(fields.scoreItemIds.selectedOptions).map((option) => option.value);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "請求失敗");
  }

  return data;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
