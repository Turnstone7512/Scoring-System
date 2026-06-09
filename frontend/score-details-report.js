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
let searchTerm = "";
let currentPage = 1;
const pageSize = 10;
let sortState = { key: "date", direction: "desc" };

insertReportControls();

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  currentPage = 1;
  loadReport();
});

clearButton.addEventListener("click", () => {
  searchForm.reset();
  Array.from(fields.scoreItemIds.options).forEach((option) => option.selected = false);
  currentPage = 1;
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
      const typeLabel = item.type === "REWARD" ? "獎勵" : "懲罰";
      return `<option value="${item.id}">[${typeLabel}] ${escapeHtml(item.mainCategory)} - ${escapeHtml(item.subCategory)}</option>`;
    })
    .join("");
}

async function loadReport() {
  AppUI.showLoading("載入積分明細報表...");
  try {
    const params = new URLSearchParams();
    getSelectedScoreItemIds().forEach((id) => params.append("scoreItemId", id));
    if (fields.studentId.value) params.set("studentId", fields.studentId.value);
    if (fields.dateFrom.value) params.set("dateFrom", fields.dateFrom.value);
    if (fields.dateTo.value) params.set("dateTo", fields.dateTo.value);
    if (fields.type.value) params.set("type", fields.type.value);
    rows = await requestJson(`/api/reports/score-details${params.toString() ? `?${params}` : ""}`);
    renderReport();
  } catch (error) {
    reportTableBody.innerHTML = "";
    emptyReport.classList.remove("hidden");
    emptyReport.textContent = error.message;
    resultCount.textContent = "載入失敗";
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function insertReportControls() {
  document.querySelector(".table-wrap").insertAdjacentHTML("beforebegin", `
    <div class="utility-row">
      <input id="reportKeywordSearch" class="table-search" type="search" placeholder="搜尋學生、項目或分數" />
      <div class="form-actions">
        <button id="exportCsvButton" class="secondary-button" type="button">匯出 CSV</button>
      </div>
      <div id="reportPagination" class="pagination"></div>
    </div>
  `);
  document.querySelector("#reportKeywordSearch").addEventListener("input", (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    currentPage = 1;
    renderReport();
  });
  document.querySelector("#exportCsvButton").addEventListener("click", exportCsv);
}

function renderReport() {
  const filtered = getFilteredRows();
  const sortedRows = [...filtered].sort(compareRows);
  const pageResult = AppUI.paginate(sortedRows, currentPage, pageSize);
  currentPage = pageResult.page;

  resultCount.textContent = `共 ${filtered.length} 筆資料`;
  emptyReport.classList.toggle("hidden", pageResult.items.length > 0);
  renderSortIndicators();
  reportTableBody.innerHTML = pageResult.items.map(renderReportRow).join("");
  AppUI.renderPagination(document.querySelector("#reportPagination"), currentPage, pageResult.totalPages, (page) => {
    currentPage = page;
    renderReport();
  });
}

function renderReportRow(row) {
  const typeLabel = row.type === "REWARD" ? "獎勵" : "懲罰";
  const typeClass = row.type === "REWARD" ? "reward" : "penalty";
  return `
    <tr>
      <td>${escapeHtml(row.student?.name || "-")}</td>
      <td>${formatDate(row.transactionDate)}</td>
      <td><span class="type-pill ${typeClass}">${typeLabel}</span></td>
      <td>${escapeHtml(getItemLabel(row))}</td>
      <td>${row.scoreChange}</td>
      <td>${row.runningTotalScore}</td>
    </tr>
  `;
}

function getFilteredRows() {
  return rows.filter((row) => {
    const haystack = `${row.student?.name || ""} ${getItemLabel(row)} ${row.type} ${row.scoreChange} ${row.runningTotalScore}`.toLowerCase();
    return haystack.includes(searchTerm);
  });
}

function exportCsv() {
  const exportRows = [...getFilteredRows()].sort(compareRows);
  const headers = ["學生", "日期", "類型", "項目", "異動分數", "累計積分"];
  const lines = [
    headers.map(csvCell).join(","),
    ...exportRows.map((row) => [
      row.student?.name || "",
      formatDate(row.transactionDate),
      row.type === "REWARD" ? "獎勵" : "懲罰",
      getItemLabel(row),
      row.scoreChange,
      row.runningTotalScore,
    ].map(csvCell).join(",")),
  ];
  const blob = new Blob([`\ufeff${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `score-details-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  AppUI.toast("CSV 已匯出");
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function getItemLabel(row) {
  return row.scoreItem ? `${row.scoreItem.mainCategory} - ${row.scoreItem.subCategory}` : "-";
}

function compareRows(a, b) {
  const direction = sortState.direction === "asc" ? 1 : -1;
  const aValue = getSortValue(a, sortState.key);
  const bValue = getSortValue(b, sortState.key);
  if (typeof aValue === "number" && typeof bValue === "number") return (aValue - bValue) * direction;
  return String(aValue).localeCompare(String(bValue), "zh-Hant", { numeric: true, sensitivity: "base" }) * direction;
}

function getSortValue(row, key) {
  if (key === "date") return new Date(row.transactionDate).getTime();
  if (key === "student") return row.student?.name || "";
  if (key === "score") return Number(row.scoreChange || 0);
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
  if (!response.ok) throw new Error(data.message || "請求失敗");
  return data;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
