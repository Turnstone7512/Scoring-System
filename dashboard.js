const tableBody = document.querySelector("#dashboardTableBody");
const emptyDashboard = document.querySelector("#emptyDashboard");
const sortStatus = document.querySelector("#sortStatus");
const studentTotal = document.querySelector("#studentTotal");
const scoreTotal = document.querySelector("#scoreTotal");
const highestScore = document.querySelector("#highestScore");
const sortButtons = document.querySelectorAll("[data-sort]");

let students = [];
let sortState = {
  key: "classNo",
  direction: "asc",
};

sortButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.sort;
    sortState = {
      key,
      direction: sortState.key === key && sortState.direction === "asc" ? "desc" : "asc",
    };
    renderDashboard();
  });
});

loadDashboard();

async function loadDashboard() {
  try {
    students = await requestJson("/api/students");
    renderDashboard();
  } catch (error) {
    tableBody.innerHTML = "";
    emptyDashboard.classList.remove("hidden");
    emptyDashboard.textContent = error.message;
    sortStatus.textContent = "載入失敗";
  }
}

function renderDashboard() {
  const sortedStudents = [...students].sort(compareStudents);
  renderSummary(sortedStudents);
  renderSortIndicators();

  emptyDashboard.classList.toggle("hidden", sortedStudents.length > 0);
  tableBody.innerHTML = sortedStudents.map(renderStudentRow).join("");

  tableBody.querySelectorAll("[data-student-id]").forEach((row) => {
    row.addEventListener("click", () => {
      window.location.href = `/score-transactions?studentId=${encodeURIComponent(row.dataset.studentId)}`;
    });
  });
}

function renderSummary(items) {
  const totalScore = items.reduce((sum, student) => sum + Number(student.currentScore || 0), 0);
  const maxScore = items.length
    ? Math.max(...items.map((student) => Number(student.currentScore || 0)))
    : 0;

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

function compareStudents(a, b) {
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

function getSortValue(student, key) {
  if (key === "currentScore") {
    return Number(student.currentScore || 0);
  }

  if (key === "lastTransactionAt") {
    return student.lastTransactionAt ? new Date(student.lastTransactionAt).getTime() : 0;
  }

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
