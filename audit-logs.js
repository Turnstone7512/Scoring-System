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

insertAuditControls();

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadAuditLogs();
});

clearButton.addEventListener("click", () => {
  searchForm.reset();
  history.replaceState(null, "", "/audit-logs");
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
  AppUI.showLoading("載入異動歷程");
  try {
    const params = new URLSearchParams();
    if (fields.tableName.value) params.set("tableName", fields.tableName.value);
    if (fields.action.value) params.set("action", fields.action.value);
    if (fields.dateFrom.value) params.set("dateFrom", fields.dateFrom.value);
    if (fields.dateTo.value) params.set("dateTo", fields.dateTo.value);
    if (fields.recordId.value.trim()) params.set("recordId", fields.recordId.value.trim());

    const query = params.toString() ? `?${params.toString()}` : "";
    history.replaceState(null, "", `/audit-logs${query}`);
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
      <input id="auditKeywordSearch" class="table-search" type="search" placeholder="搜尋資料表、ID、動作或 JSON" />
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
    const haystack = `${log.tableName} ${log.recordId} ${log.action} ${formatJson(log.oldValue)} ${formatJson(log.newValue)}`.toLowerCase();
    return haystack.includes(searchTerm);
  });
  const pageResult = AppUI.paginate(filtered, currentPage, pageSize);
  currentPage = pageResult.page;

  resultCount.textContent = `共 ${filtered.length} 筆異動`;
  emptyAuditLogs.classList.toggle("hidden", pageResult.items.length > 0);
  auditList.innerHTML = pageResult.items.map(renderAuditLogCard).join("");
  AppUI.renderPagination(document.querySelector("#auditPagination"), currentPage, pageResult.totalPages, (page) => {
    currentPage = page;
    renderAuditLogs();
  });
}

function renderAuditLogCard(log) {
  return `
    <article class="audit-card">
      <div class="audit-card-header">
        <div>
          <h3>${formatDate(log.createdAt)}</h3>
          <p class="meta">資料表：${escapeHtml(log.tableName)}｜資料 ID：${escapeHtml(log.recordId)}</p>
        </div>
        <span class="action-pill ${log.action.toLowerCase()}">${escapeHtml(log.action)}</span>
      </div>
      <div class="json-grid">
        <section class="json-block">
          <h4>修改前 oldValue</h4>
          <pre>${escapeHtml(formatJson(log.oldValue))}</pre>
        </section>
        <section class="json-block">
          <h4>修改後 newValue</h4>
          <pre>${escapeHtml(formatJson(log.newValue))}</pre>
        </section>
      </div>
    </article>
  `;
}

function formatJson(value) {
  if (value === null || value === undefined) {
    return "null";
  }

  return JSON.stringify(value, null, 2);
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
