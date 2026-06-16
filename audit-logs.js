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
let searchTerm = "";
let currentPage = 1;
const pageSize = 8;

const fieldLabels = {
  type: "類型",
  student_id: "適用學生",
  main_category: "主項目",
  sub_category: "子項目",
  image_url: "圖片網址",
  score: "點數",
  is_pinned: "置頂",
  is_deleted: "刪除狀態",
  created_at: "建立時間",
  updated_at: "最後異動時間",
  name: "姓名",
  grade: "年級",
  class_no: "座號",
  email: "Email",
  photo_url: "照片網址",
  current_score: "目前點數",
  last_transaction_at: "最後點數異動",
  student_id_transaction: "學生",
  score_item_id: "項目",
  score_change: "異動點數",
  settlement_score: "結餘點數",
  running_total_score: "異動後點數",
  transaction_date: "生效日期",
  display_name: "顯示名稱",
  role: "角色",
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
      <input id="auditKeywordSearch" class="table-search" type="search" placeholder="搜尋資料表、recordId 或異動內容" />
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
  const fieldsToRender = getAuditFields(log.oldValue, log.newValue);
  return `
    <article class="audit-card">
      <div class="audit-card-header">
        <div>
          <h3>${formatDate(log.createdAt)}</h3>
          <p class="meta">資料表：${escapeHtml(log.tableName)}，recordId：${escapeHtml(log.recordId)}</p>
        </div>
        <span class="action-pill ${String(log.action).toLowerCase()}">${escapeHtml(log.action)}</span>
      </div>
      <div class="change-stack">
        <section class="change-block">
          <h4>異動前</h4>
          ${renderPlainTextFields(fieldsToRender, log.oldValue, log.oldValue, log.newValue)}
        </section>
        <section class="change-block">
          <h4>異動後</h4>
          ${renderPlainTextFields(fieldsToRender, log.newValue, log.oldValue, log.newValue)}
        </section>
      </div>
    </article>
  `;
}

function renderPlainTextFields(fieldsToRender, value, oldValue, newValue) {
  if (!fieldsToRender.length) return `<p class="field-line unchanged">無資料</p>`;
  return fieldsToRender.map((field) => {
    const changed = normalizeValue(oldValue?.[field]) !== normalizeValue(newValue?.[field]);
    const className = changed ? "changed" : "unchanged";
    return `<p class="field-line ${className}"><span>${escapeHtml(getFieldLabel(field))}</span>：${escapeHtml(formatPlainValue(value?.[field]))}</p>`;
  }).join("");
}

function getAuditFields(oldValue, newValue) {
  const keys = new Set([
    ...Object.keys(oldValue || {}),
    ...Object.keys(newValue || {}),
  ]);
  return [...keys].filter((key) => !["id"].includes(key));
}

function getFieldLabel(field) {
  return fieldLabels[field] || field;
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

function formatPlainValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
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
