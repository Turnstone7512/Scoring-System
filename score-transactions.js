const searchForm = document.querySelector("#searchForm");
const resetSearchButton = document.querySelector("#resetSearchButton");
const transactionForm = document.querySelector("#transactionForm");
const transactionFormTitle = document.querySelector("#transactionFormTitle");
const cancelEditButton = document.querySelector("#cancelEditButton");
const transactionsTableBody = document.querySelector("#transactionsTableBody");
const emptyTransactions = document.querySelector("#emptyTransactions");
const transactionCount = document.querySelector("#transactionCount");
const formError = document.querySelector("#formError");
const historyDialog = document.querySelector("#historyDialog");
const historyContent = document.querySelector("#historyContent");

const fields = {
  transactionId: document.querySelector("#transactionId"),
  searchStudentId: document.querySelector("#searchStudentId"),
  dateFrom: document.querySelector("#dateFrom"),
  dateTo: document.querySelector("#dateTo"),
  studentId: document.querySelector("#studentId"),
  type: document.querySelector("#type"),
  scoreItemId: document.querySelector("#scoreItemId"),
  scoreChange: document.querySelector("#scoreChange"),
  transactionDate: document.querySelector("#transactionDate"),
};

let students = [];
let scoreItems = [];
let transactions = [];
let transactionSearchTerm = "";
let currentPage = 1;
const pageSize = 10;

insertTransactionControls();

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadTransactions();
});
resetSearchButton.addEventListener("click", resetSearch);
transactionForm.addEventListener("submit", saveTransaction);
cancelEditButton.addEventListener("click", resetTransactionForm);
fields.type.addEventListener("change", () => {
  renderScoreItemOptions();
  fillScoreFromSelectedItem();
});
fields.scoreItemId.addEventListener("change", fillScoreFromSelectedItem);
document.querySelector("#closeHistoryDialog").addEventListener("click", () => historyDialog.close());

init();

async function init() {
  await Promise.all([loadStudents(), loadScoreItems()]);
  applyInitialQueryParams();
  resetTransactionForm();
  await loadTransactions();
}

async function loadStudents() {
  students = await requestJson("/api/students");
  renderStudentOptions();
}

async function loadScoreItems() {
  scoreItems = await requestJson("/api/score-items");
  renderScoreItemOptions();
}

async function loadTransactions() {
  AppUI.showLoading("載入分數異動");
  try {
    const params = new URLSearchParams();
    if (fields.searchStudentId.value) params.set("studentId", fields.searchStudentId.value);
    if (fields.dateFrom.value) params.set("dateFrom", fields.dateFrom.value);
    if (fields.dateTo.value) params.set("dateTo", fields.dateTo.value);

    const query = params.toString() ? `?${params.toString()}` : "";
    transactions = await requestJson(`/api/score-transactions${query}`);
    renderTransactions();
  } catch (error) {
    transactionsTableBody.innerHTML = "";
    emptyTransactions.classList.remove("hidden");
    emptyTransactions.textContent = error.message;
    transactionCount.textContent = "載入失敗";
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function insertTransactionControls() {
  document.querySelector(".table-wrap").insertAdjacentHTML("beforebegin", `
    <div class="utility-row">
      <input id="transactionSearch" class="table-search" type="search" placeholder="搜尋學生、項目或分數" />
      <div id="transactionPagination" class="pagination"></div>
    </div>
  `);
  document.querySelector("#transactionSearch").addEventListener("input", (event) => {
    transactionSearchTerm = event.target.value.trim().toLowerCase();
    currentPage = 1;
    renderTransactions();
  });
}

function renderStudentOptions() {
  const options = students
    .map((student) => `<option value="${student.id}">${escapeHtml(student.name)}（${student.grade} 年級）</option>`)
    .join("");

  fields.searchStudentId.innerHTML = `<option value="">全部學生</option>${options}`;
  fields.studentId.innerHTML = `<option value="">請選擇學生</option>${options}`;
}

function renderScoreItemOptions() {
  const type = fields.type.value;
  const options = scoreItems
    .filter((item) => item.type === type)
    .map((item) => `<option value="${item.id}">${escapeHtml(item.mainCategory)} - ${escapeHtml(item.subCategory)}</option>`)
    .join("");

  fields.scoreItemId.innerHTML = options || `<option value="">沒有可用項目</option>`;
}

function renderTransactions() {
  const filtered = transactions.filter((transaction) => {
    const itemLabel = transaction.scoreItem
      ? `${transaction.scoreItem.mainCategory} ${transaction.scoreItem.subCategory}`
      : "";
    const haystack = `${transaction.student?.name || ""} ${itemLabel} ${transaction.type} ${transaction.scoreChange}`.toLowerCase();
    return haystack.includes(transactionSearchTerm);
  });
  const pageResult = AppUI.paginate(filtered, currentPage, pageSize);
  currentPage = pageResult.page;

  transactionCount.textContent = `共 ${filtered.length} 筆異動`;
  emptyTransactions.classList.toggle("hidden", pageResult.items.length > 0);
  transactionsTableBody.innerHTML = pageResult.items.map(renderTransactionRow).join("");
  AppUI.renderPagination(document.querySelector("#transactionPagination"), currentPage, pageResult.totalPages, (page) => {
    currentPage = page;
    renderTransactions();
  });

  transactionsTableBody.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editTransaction(button.dataset.edit));
  });

  transactionsTableBody.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteTransaction(button.dataset.delete));
  });

  transactionsTableBody.querySelectorAll("[data-history]").forEach((button) => {
    button.addEventListener("click", () => openHistory(button.dataset.history));
  });
}

function renderTransactionRow(transaction) {
  const typeLabel = transaction.type === "REWARD" ? "加分" : "減分";
  const typeClass = transaction.type === "REWARD" ? "reward" : "penalty";
  const itemLabel = transaction.scoreItem
    ? `${transaction.scoreItem.mainCategory} - ${transaction.scoreItem.subCategory}`
    : "-";

  return `
    <tr>
      <td>${escapeHtml(transaction.student?.name || "-")}</td>
      <td>${formatDate(transaction.transactionDate)}</td>
      <td><span class="type-pill ${typeClass}">${typeLabel}</span></td>
      <td>${escapeHtml(itemLabel)}</td>
      <td>${transaction.scoreChange}</td>
      <td>${transaction.runningTotalScore}</td>
      <td>
        <div class="card-actions">
          <button type="button" data-edit="${transaction.id}">修改</button>
          <button class="danger-button" type="button" data-delete="${transaction.id}">刪除</button>
          <button class="secondary-button" type="button" data-history="${transaction.id}">查看歷程</button>
        </div>
      </td>
    </tr>
  `;
}

async function saveTransaction(event) {
  event.preventDefault();
  clearFieldErrors();
  hideFormError();

  const payload = {
    studentId: fields.studentId.value,
    type: fields.type.value,
    scoreItemId: fields.scoreItemId.value,
    scoreChange: Number(fields.scoreChange.value),
    transactionDate: fields.transactionDate.value,
  };

  const validation = validateTransaction(payload);
  if (!validation.valid) {
    showFieldError(validation.field, validation.message);
    return showFormError(validation.message);
  }

  const id = fields.transactionId.value;
  const url = id ? `/api/score-transactions/${id}` : "/api/score-transactions";
  const method = id ? "PUT" : "POST";

  AppUI.showLoading("儲存分數異動");
  try {
    await requestJson(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    resetTransactionForm();
    AppUI.toast(id ? "分數異動已更新" : "分數異動已新增");
    await Promise.all([loadStudents(), loadTransactions()]);
  } catch (error) {
    showFormError(error.message);
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function editTransaction(id) {
  const transaction = transactions.find((entry) => entry.id === id);
  if (!transaction) return;

  fields.transactionId.value = transaction.id;
  fields.studentId.value = transaction.studentId;
  fields.type.value = transaction.type;
  renderScoreItemOptions();
  fields.scoreItemId.value = transaction.scoreItemId;
  fields.scoreChange.value = Math.abs(transaction.scoreChange);
  fields.transactionDate.value = toDateTimeLocal(transaction.transactionDate);
  transactionFormTitle.textContent = "修改分數異動";
  cancelEditButton.classList.remove("hidden");
  fields.studentId.focus();
}

async function deleteTransaction(id) {
  const transaction = transactions.find((entry) => entry.id === id);
  if (!transaction || !confirm("確定要刪除這筆分數異動嗎？")) {
    return;
  }

  AppUI.showLoading("刪除分數異動");
  try {
    await requestJson(`/api/score-transactions/${id}`, { method: "DELETE" });
    AppUI.toast("分數異動已刪除");
    await Promise.all([loadStudents(), loadTransactions()]);
  } catch (error) {
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function openHistory(id) {
  window.location.href = `/audit-logs?tableName=ScoreTransaction&recordId=${encodeURIComponent(id)}`;
}

function renderHistoryEntry(log) {
  return `
    <article class="history-entry">
      <h3>${escapeHtml(log.action)}｜${formatDate(log.createdAt)}</h3>
      <p class="meta">資料表：${escapeHtml(log.tableName)}｜記錄 ID：${escapeHtml(log.recordId)}</p>
      <details>
        <summary>oldValue</summary>
        <pre>${escapeHtml(JSON.stringify(log.oldValue, null, 2))}</pre>
      </details>
      <details>
        <summary>newValue</summary>
        <pre>${escapeHtml(JSON.stringify(log.newValue, null, 2))}</pre>
      </details>
    </article>
  `;
}

function fillScoreFromSelectedItem() {
  const item = scoreItems.find((entry) => entry.id === fields.scoreItemId.value);
  fields.scoreChange.value = item ? Math.abs(item.score) : "";
}

function resetTransactionForm() {
  transactionForm.reset();
  fields.transactionId.value = "";
  fields.type.value = "REWARD";
  renderScoreItemOptions();
  fillScoreFromSelectedItem();
  fields.transactionDate.value = toDateTimeLocal(new Date());
  transactionFormTitle.textContent = "新增分數異動";
  cancelEditButton.classList.add("hidden");
  hideFormError();
}

function resetSearch() {
  fields.searchStudentId.value = "";
  fields.dateFrom.value = "";
  fields.dateTo.value = "";
  transactionSearchTerm = "";
  document.querySelector("#transactionSearch").value = "";
  currentPage = 1;
  history.replaceState(null, "", "/score-transactions");
  loadTransactions();
}

function applyInitialQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get("studentId");

  if (studentId) {
    fields.searchStudentId.value = studentId;
  }
}

function validateTransaction(data) {
  if (!data.studentId) {
    return { valid: false, field: "studentId", message: "請選擇學生" };
  }

  if (data.type !== "REWARD" && data.type !== "PENALTY") {
    return { valid: false, field: "type", message: "請選擇加分或減分" };
  }

  if (!data.scoreItemId) {
    return { valid: false, field: "scoreItemId", message: "請選擇主項-子項" };
  }

  if (!Number.isInteger(data.scoreChange) || data.scoreChange <= 0) {
    return { valid: false, field: "scoreChange", message: "分數必須是正整數" };
  }

  if (!data.transactionDate || Number.isNaN(new Date(data.transactionDate).getTime())) {
    return { valid: false, field: "transactionDate", message: "請選擇有效的異動日期" };
  }

  return { valid: true };
}

function showFormError(message) {
  formError.textContent = message;
  formError.classList.remove("hidden");
}

function showFieldError(field, message) {
  const input = fields[field];
  if (!input) return;
  input.insertAdjacentHTML("afterend", `<p class="field-error">${escapeHtml(message)}</p>`);
}

function clearFieldErrors() {
  transactionForm.querySelectorAll(".field-error").forEach((node) => node.remove());
}

function hideFormError() {
  formError.textContent = "";
  formError.classList.add("hidden");
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
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toDateTimeLocal(value) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
