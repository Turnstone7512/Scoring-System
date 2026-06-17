const searchForm = document.querySelector("#auditSearchForm");
const clearButton = document.querySelector("#clearButton");
const auditList = document.querySelector("#auditList");
const emptyAuditLogs = document.querySelector("#emptyAuditLogs");
const resultCount = document.querySelector("#resultCount");

const fields = {
  tableName: document.querySelector("#tableName"),
  action: document.querySelector("#action"),
  dateFrom: document.querySelector("#dateFrom"),
  dateTo: document.querySelector("#dateTo"),
  recordId: document.querySelector("#recordId"),
};

let auditLogs = [];
let students = [];
let studentNameById = new Map();
let searchTerm = "";
let currentPage = 1;
const pageSize = 8;

const tableLabels = {
  Student: "學生資料",
  ScoreItem: "獎懲項目類",
  ScoreTransaction: "學生點數類",
  UserAccount: "使用者帳號",
};

const actionLabels = {
  CREATE: "新增",
  UPDATE: "修改",
  DELETE: "刪除",
};

insertAuditControls();

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadAuditLogs();
});

clearButton.addEventListener("click", () => {
  searchForm.reset();
  history.replaceState(null, "", "audit-logs.html");
  loadAuditLogs();
});

init();

async function init() {
  applyInitialQueryParams();
  await loadStudents();
  await loadAuditLogs();
}

function applyInitialQueryParams() {
  const params = new URLSearchParams(window.location.search);
  fields.tableName.value = params.get("tableName") || "";
  fields.action.value = params.get("action") || "";
  fields.dateFrom.value = params.get("dateFrom") || "";
  fields.dateTo.value = params.get("dateTo") || "";
  fields.recordId.value = params.get("recordId") || "";
}

async function loadStudents() {
  try {
    students = await requestJson("/api/students");
    studentNameById = new Map(students.map((student) => [String(student.id), student.name]));
  } catch (error) {
    students = [];
    studentNameById = new Map();
  }
}

async function loadAuditLogs() {
  AppUI.showLoading("載入異動紀錄...");
  try {
    const params = new URLSearchParams();
    if (fields.tableName.value) params.set("tableName", fields.tableName.value);
    if (fields.action.value) params.set("action", fields.action.value);
    if (fields.dateFrom.value) params.set("dateFrom", fields.dateFrom.value);
    if (fields.dateTo.value) params.set("dateTo", fields.dateTo.value);
    if (fields.recordId.value.trim()) params.set("recordId", fields.recordId.value.trim());
    const query = params.toString() ? `?${params.toString()}` : "";
    history.replaceState(null, "", `audit-logs.html${query}`);
    auditLogs = await requestJson(`/api/audit-logs${query}`);
    renderAuditLogs();
  } catch (error) {
    auditList.innerHTML = "";
    emptyAuditLogs.classList.remove("hidden");
    emptyAuditLogs.textContent = error.message;
    resultCount.textContent = "載入失敗";
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function insertAuditControls() {
  document.querySelector("#auditList").insertAdjacentHTML("beforebegin", `
    <div class="utility-row">
      <input id="auditKeywordSearch" class="table-search" type="search" placeholder="搜尋資料類型、recordId 或異動內容" />
      <div id="auditPagination" class="pagination"></div>
    </div>
  `);
  document.querySelector("#auditKeywordSearch").addEventListener("input", (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    currentPage = 1;
    renderAuditLogs();
  });
}

function renderAuditLogs() {
  const filtered = auditLogs.filter((log) => {
    const haystack = `${log.tableName} ${log.recordId} ${log.action} ${formatAuditSearchText(log.oldValue)} ${formatAuditSearchText(log.newValue)}`.toLowerCase();
    return haystack.includes(searchTerm);
  });
  const pageResult = AppUI.paginate(filtered, currentPage, pageSize);
  currentPage = pageResult.page;

  resultCount.textContent = `共 ${filtered.length} 筆紀錄`;
  emptyAuditLogs.classList.toggle("hidden", pageResult.items.length > 0);
  auditList.innerHTML = pageResult.items.map(renderAuditLogCard).join("");
  AppUI.renderPagination(document.querySelector("#auditPagination"), currentPage, pageResult.totalPages, (page) => {
    currentPage = page;
    renderAuditLogs();
  });
}

function renderAuditLogCard(log) {
  const spec = getTableSpec(log.tableName);
  return `
    <article class="audit-card">
      <div class="audit-card-header">
        <div>
          <h3>${formatDate(log.createdAt)}</h3>
          <p class="meta">資料類型：${escapeHtml(tableLabels[log.tableName] || log.tableName)}，recordId：${escapeHtml(log.recordId || "-")}</p>
        </div>
        <span class="action-pill ${String(log.action).toLowerCase()}">${escapeHtml(actionLabels[log.action] || log.action)}</span>
      </div>
      <div class="audit-table-wrap">
        <table class="audit-change-table">
          <thead>
            <tr>
              <th>狀態</th>
              ${spec.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${renderChangeRow("修改前", spec, log.oldValue, log.oldValue, log.newValue)}
            ${renderChangeRow("修改後", spec, log.newValue, log.oldValue, log.newValue)}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function renderChangeRow(label, spec, value, oldValue, newValue) {
  return `
    <tr>
      <th>${label}</th>
      ${spec.map((column) => {
        const oldDisplay = column.value(oldValue);
        const newDisplay = column.value(newValue);
        const className = normalizeValue(oldDisplay) !== normalizeValue(newDisplay) ? "changed" : "unchanged";
        return `<td class="${className}">${escapeHtml(column.value(value))}</td>`;
      }).join("")}
    </tr>
  `;
}

function getTableSpec(tableName) {
  if (tableName === "Student") {
    return [
      { label: "建立時間", value: (value) => formatDate(readValue(value, "created_at", "createdAt")) },
      { label: "姓名", value: (value) => readValue(value, "name") },
      { label: "座號", value: (value) => readValue(value, "class_no", "classNo") },
      { label: "目前點數", value: (value) => readValue(value, "current_score", "currentScore") },
      { label: "照片網址", value: (value) => readValue(value, "photo_url", "photoUrl") },
      { label: "是否有效", value: (value) => formatActive(value) },
    ];
  }

  if (tableName === "ScoreItem") {
    return [
      { label: "建立時間", value: (value) => formatDate(readValue(value, "created_at", "createdAt")) },
      { label: "適用學生", value: (value) => formatApplicableStudent(value) },
      { label: "項目-子項目", value: (value) => formatItemName(value) },
      { label: "點數", value: (value) => readValue(value, "score") },
      { label: "生效時間", value: (value) => formatDate(readValue(value, "updated_at", "updatedAt", "created_at", "createdAt")) },
      { label: "是否有效", value: (value) => formatActive(value) },
    ];
  }

  if (tableName === "ScoreTransaction") {
    return [
      { label: "建立時間", value: (value) => formatDate(readValue(value, "updated_at", "updatedAt", "created_at", "createdAt")) },
      { label: "學生姓名", value: (value) => formatStudentName(value) },
      { label: "結餘點數", value: (value) => readValue(value, "settlement_score", "settlementScore", "running_total_score", "runningTotalScore") },
      { label: "生效時間", value: (value) => formatDate(readValue(value, "transaction_date", "transactionDate")) },
      { label: "是否有效", value: (value) => formatActive(value) },
    ];
  }

  return [
    { label: "建立時間", value: (value) => formatDate(readValue(value, "created_at", "createdAt")) },
    { label: "內容", value: (value) => formatAuditSearchText(value) || "-" },
  ];
}

function formatApplicableStudent(value) {
  const studentId = readValue(value, "student_id", "studentId");
  if (!studentId) return "共用";
  return studentNameById.get(String(studentId)) || studentId;
}

function formatStudentName(value) {
  const nestedName = readValue(value?.student, "name");
  if (nestedName) return nestedName;
  const studentId = readValue(value, "student_id", "studentId");
  if (!studentId) return "-";
  return studentNameById.get(String(studentId)) || studentId;
}

function formatItemName(value) {
  const mainCategory = readValue(value, "main_category", "mainCategory");
  const subCategory = readValue(value, "sub_category", "subCategory");
  if (!mainCategory && !subCategory) return "-";
  if (!subCategory) return mainCategory;
  if (!mainCategory) return subCategory;
  return `${mainCategory} - ${subCategory}`;
}

function formatActive(value) {
  if (value === null || value === undefined) return "-";
  const isDeleted = readValue(value, "is_deleted", "isDeleted");
  if (isDeleted === null || isDeleted === undefined || isDeleted === "") return "-";
  return isTruthy(isDeleted) ? "否" : "是";
}

function readValue(value, ...keys) {
  if (value === null || value === undefined) return "";
  for (const key of keys) {
    if (value[key] !== null && value[key] !== undefined && value[key] !== "") return value[key];
  }
  return "";
}

function formatAuditSearchText(value) {
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

function normalizeValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isTruthy(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "請求失敗");
  return data;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function escapeHtml(value) {
  const safeValue = value === null || value === undefined || value === "" ? "-" : value;
  return String(safeValue)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
