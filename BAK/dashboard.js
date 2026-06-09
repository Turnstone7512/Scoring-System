const tableBody = document.querySelector("#dashboardTableBody");
const emptyDashboard = document.querySelector("#emptyDashboard");
const sortStatus = document.querySelector("#sortStatus");
const studentTotal = document.querySelector("#studentTotal");
const scoreTotal = document.querySelector("#scoreTotal");
const highestScore = document.querySelector("#highestScore");
const sortButtons = document.querySelectorAll("[data-sort]");
const monthlyChart = document.querySelector("#monthlyChart");

let students = [];
let monthlyScores = [];
let searchTerm = "";
let currentPage = 1;
const pageSize = 10;
let sortState = {
  key: "classNo",
  direction: "asc",
};

insertDashboardControls();

sortButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.sort;
    sortState = {
      key,
      direction: sortState.key === key && sortState.direction === "asc" ? "desc" : "asc",
    };
    currentPage = 1;
    renderDashboard();
  });
});

loadDashboard();

async function loadDashboard() {
  AppUI.showLoading("載入 Dashboard");
  try {
    [students, monthlyScores] = await Promise.all([
      requestJson("/api/students"),
      requestJson("/api/reports/monthly-scores"),
    ]);
    renderDashboard();
    renderMonthlyChart();
  } catch (error) {
    tableBody.innerHTML = "";
    emptyDashboard.classList.remove("hidden");
    emptyDashboard.textContent = error.message;
    monthlyChart.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    sortStatus.textContent = "載入失敗";
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function insertDashboardControls() {
  const panel = document.querySelector(".dashboard-panel .section-title");
  panel.insertAdjacentHTML("afterend", `
    <div class="utility-row">
      <input id="dashboardSearch" class="table-search" type="search" placeholder="搜尋學生姓名或班級座號" />
      <div id="dashboardPaginationTop" class="pagination"></div>
    </div>
  `);
  document.querySelector("#dashboardSearch").addEventListener("input", (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    currentPage = 1;
    renderDashboard();
  });
}

function renderDashboard() {
  const filtered = students.filter((student) => {
    const haystack = `${student.name || ""} ${student.classNo || ""}`.toLowerCase();
    return haystack.includes(searchTerm);
  });
  const sortedStudents = [...filtered].sort(compareStudents);
  const pageResult = AppUI.paginate(sortedStudents, currentPage, pageSize);
  currentPage = pageResult.page;

  renderSummary(filtered);
  renderSortIndicators();
  AppUI.renderPagination(document.querySelector("#dashboardPaginationTop"), currentPage, pageResult.totalPages, (page) => {
    currentPage = page;
    renderDashboard();
  });

  emptyDashboard.classList.toggle("hidden", pageResult.items.length > 0);
  tableBody.innerHTML = pageResult.items.map(renderStudentRow).join("");
  tableBody.querySelectorAll("[data-student-id]").forEach((row) => {
    row.addEventListener("click", () => {
      window.location.href = `/score-transactions?studentId=${encodeURIComponent(row.dataset.studentId)}`;
    });
  });
}

function renderSummary(items) {
  const totalScore = items.reduce((sum, student) => sum + Number(student.currentScore || 0), 0);
  const maxScore = items.length ? Math.max(...items.map((student) => Number(student.currentScore || 0))) : 0;
  studentTotal.textContent = items.length;
  scoreTotal.textContent = totalScore;
  highestScore.textContent = maxScore;
  sortStatus.textContent = `目前依${sortLabel(sortState.key)}${sortState.direction === "asc" ? "升冪" : "降冪"}排序`;
}

function renderSortIndicators() {
  document.querySelectorAll("[data-indicator]").forEach((indicator) => {
    indicator.textContent = indicator.dataset.indicator === sortState.key
      ? (sortState.direction === "asc" ? "↑" : "↓")
      : "";
  });
}

function renderStudentRow(student) {
  const score = Number(student.currentScore || 0);
  const scoreClass = score > 0 ? "positive" : score < 0 ? "negative" : "zero";
  return `
    <tr class="dashboard-row" data-student-id="${student.id}" title="查看 ${escapeHtml(student.name)} 的分數明細">
      <td><strong>${escapeHtml(student.name)}</strong></td>
      <td>${escapeHtml(student.classNo || "-")}</td>
      <td><span class="score-value ${scoreClass}">${score}</span></td>
      <td>${student.lastTransactionAt ? formatDate(student.lastTransactionAt) : "尚無異動"}</td>
    </tr>
  `;
}

function renderMonthlyChart() {
  if (!monthlyScores.length) {
    monthlyChart.innerHTML = `<div class="empty-state">尚無分數異動資料</div>`;
    return;
  }

  const width = Math.max(640, monthlyScores.length * 90);
  const height = 280;
  const padding = { top: 24, right: 24, bottom: 54, left: 54 };
  const values = monthlyScores.map((row) => Number(row.score || 0));
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const xStep = monthlyScores.length > 1 ? (width - padding.left - padding.right) / (monthlyScores.length - 1) : 0;
  const y = (value) => padding.top + ((max - value) / span) * (height - padding.top - padding.bottom);
  const x = (index) => padding.left + index * xStep;
  const points = monthlyScores.map((row, index) => `${x(index)},${y(Number(row.score || 0))}`).join(" ");
  const zeroY = y(0);

  monthlyChart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="每月分數趨勢折線圖">
      <line class="chart-axis" x1="${padding.left}" y1="${zeroY}" x2="${width - padding.right}" y2="${zeroY}"></line>
      <line class="chart-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"></line>
      <polyline class="chart-line" points="${points}"></polyline>
      ${monthlyScores.map((row, index) => `
        <circle class="chart-point" cx="${x(index)}" cy="${y(Number(row.score || 0))}" r="4"></circle>
        <text class="chart-label" x="${x(index)}" y="${height - 28}" text-anchor="middle">${escapeHtml(row.month)}</text>
        <text class="chart-label" x="${x(index)}" y="${y(Number(row.score || 0)) - 10}" text-anchor="middle">${row.score}</text>
      `).join("")}
      <text class="chart-label" x="12" y="${padding.top + 8}">${max}</text>
      <text class="chart-label" x="12" y="${height - padding.bottom}">${min}</text>
    </svg>
  `;
}

function compareStudents(a, b) {
  const direction = sortState.direction === "asc" ? 1 : -1;
  const aValue = getSortValue(a, sortState.key);
  const bValue = getSortValue(b, sortState.key);
  if (typeof aValue === "number" && typeof bValue === "number") return (aValue - bValue) * direction;
  return String(aValue).localeCompare(String(bValue), "zh-Hant", { numeric: true, sensitivity: "base" }) * direction;
}

function getSortValue(student, key) {
  if (key === "currentScore") return Number(student.currentScore || 0);
  if (key === "lastTransactionAt") return student.lastTransactionAt ? new Date(student.lastTransactionAt).getTime() : 0;
  return student[key] || "";
}

function sortLabel(key) {
  return {
    name: "學生姓名",
    classNo: "班級座號",
    currentScore: "目前分數",
    lastTransactionAt: "最後異動日",
  }[key];
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "請求失敗");
  return data;
}

function formatDate(value) {
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
