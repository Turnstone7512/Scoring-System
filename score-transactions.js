const searchForm = document.querySelector("#searchForm");
const resetSearchButton = document.querySelector("#resetSearchButton");
const transactionForm = document.querySelector("#transactionForm");
const settlementForm = document.querySelector("#settlementForm");
const transactionFormTitle = document.querySelector("#transactionFormTitle");
const cancelEditButton = document.querySelector("#cancelEditButton");
const transactionsTableBody = document.querySelector("#transactionsTableBody");
const emptyTransactions = document.querySelector("#emptyTransactions");
const transactionCount = document.querySelector("#transactionCount");
const formError = document.querySelector("#formError");
const settlementError = document.querySelector("#settlementError");
const v2FormError = document.querySelector("#v2FormError");

const fields = {
  transactionId: document.querySelector("#transactionId"),
  searchStudentId: document.querySelector("#searchStudentId"),
  dateFrom: document.querySelector("#dateFrom"),
  dateTo: document.querySelector("#dateTo"),
  studentId: document.querySelector("#studentId"),
  type: document.querySelector("#type"),
  scoreItemId: document.querySelector("#scoreItemId"),
  quantity: document.querySelector("#quantity"),
  scoreChange: document.querySelector("#scoreChange"),
  transactionDate: document.querySelector("#transactionDate"),
  settlementStudentId: document.querySelector("#settlementStudentId"),
  settlementScore: document.querySelector("#settlementScore"),
  settlementDate: document.querySelector("#settlementDate"),
  v2StudentId: document.querySelector("#v2StudentId"),
  v2TransactionDate: document.querySelector("#v2TransactionDate"),
};

const v2 = {
  rewardBody: document.querySelector("#rewardItemsBody"),
  penaltyBody: document.querySelector("#penaltyItemsBody"),
  rewardPinnedBody: document.querySelector("#rewardPinnedBody"),
  penaltyPinnedBody: document.querySelector("#penaltyPinnedBody"),
  emptyReward: document.querySelector("#emptyRewardItems"),
  emptyPenalty: document.querySelector("#emptyPenaltyItems"),
  emptyRewardPinned: document.querySelector("#emptyRewardPinned"),
  emptyPenaltyPinned: document.querySelector("#emptyPenaltyPinned"),
  rewardCount: document.querySelector("#rewardItemCount"),
  penaltyCount: document.querySelector("#penaltyItemCount"),
  saveTopButton: document.querySelector("#saveTopButton"),
  saveRewardButton: document.querySelector("#saveRewardButton"),
  savePenaltyButton: document.querySelector("#savePenaltyButton"),
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
settlementForm.addEventListener("submit", saveSettlement);
cancelEditButton.addEventListener("click", resetTransactionForm);
fields.type.addEventListener("change", () => {
  renderScoreItemOptions();
  fillScoreFromSelectedItem();
});
fields.studentId.addEventListener("change", () => {
  renderScoreItemOptions();
  fillScoreFromSelectedItem();
});
fields.scoreItemId.addEventListener("change", fillScoreFromSelectedItem);
fields.v2StudentId.addEventListener("change", renderV2ItemTables);
window.matchMedia("(max-width: 980px)").addEventListener("change", renderV2ItemTables);
v2.saveTopButton.addEventListener("click", saveAllV2Transactions);
v2.saveRewardButton.addEventListener("click", saveAllV2Transactions);
v2.savePenaltyButton.addEventListener("click", saveAllV2Transactions);

init();

async function init() {
  normalizeVisibleLabels();
  fields.v2TransactionDate.value = toDateInputValue(new Date());
  fields.transactionDate.value = toDateInputValue(new Date());
  fields.settlementDate.value = toDateInputValue(new Date());
  await Promise.all([loadStudents(), loadScoreItems()]);
  applyInitialQueryParams();
  resetTransactionForm();
  renderV2ItemTables();
  await loadTransactions();
}

function normalizeVisibleLabels() {
  const title = document.querySelector(".transaction-v2 h2");
  if (title) title.textContent = "點數異動";
}

async function loadStudents() {
  students = await requestJson("/api/students");
  renderStudentOptions();
}

async function loadScoreItems() {
  scoreItems = await requestJson("/api/score-items");
  renderScoreItemOptions();
  renderV2ItemTables();
}

async function loadTransactions() {
  AppUI.showLoading("載入異動紀錄...");
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
  document.querySelector(".table-section .table-wrap").insertAdjacentHTML("beforebegin", `
    <div class="utility-row">
      <input id="transactionSearch" class="table-search" type="search" placeholder="搜尋學生、項目或點數" />
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
    .map((student) => `<option value="${student.id}">${escapeHtml(student.name)}${student.grade ? `（${student.grade}年級）` : ""}</option>`)
    .join("");
  fields.searchStudentId.innerHTML = `<option value="">全部學生</option>${options}`;
  fields.studentId.innerHTML = `<option value="">請選擇學生</option>${options}`;
  fields.v2StudentId.innerHTML = `<option value="">請選擇學生</option>${options}`;
  fields.settlementStudentId.innerHTML = `<option value="">請選擇學生</option>${options}`;
}

function renderScoreItemOptions() {
  const type = fields.type.value;
  const studentId = fields.studentId.value;
  const options = scoreItems
    .filter((item) => item.type === type)
    .filter((item) => !item.studentId || item.studentId === studentId)
    .map((item) => {
      const scope = item.studentId ? "個別" : "共用";
      return `<option value="${item.id}">[${scope}] ${escapeHtml(getItemName(item))}</option>`;
    })
    .join("");
  fields.scoreItemId.innerHTML = options || `<option value="">沒有可使用項目</option>`;
}

function renderV2ItemTables() {
  const studentId = fields.v2StudentId.value;
  const availableItems = studentId
    ? scoreItems.filter((item) => !item.studentId || item.studentId === studentId)
    : [];
  const rewardItems = availableItems.filter((item) => item.type === "REWARD");
  const penaltyItems = availableItems.filter((item) => item.type === "PENALTY");
  const pinnedRewardItems = rewardItems.filter((item) => item.isPinned);
  const pinnedPenaltyItems = penaltyItems.filter((item) => item.isPinned);
  const regularRewardItems = rewardItems.filter((item) => !item.isPinned);
  const regularPenaltyItems = penaltyItems.filter((item) => !item.isPinned);

  renderPinnedRows(v2.rewardPinnedBody, pinnedRewardItems);
  renderPinnedRows(v2.penaltyPinnedBody, pinnedPenaltyItems);
  renderV2Rows(v2.rewardBody, regularRewardItems);
  renderV2Rows(v2.penaltyBody, regularPenaltyItems);
  v2.emptyRewardPinned.classList.toggle("hidden", pinnedRewardItems.length > 0);
  v2.emptyPenaltyPinned.classList.toggle("hidden", pinnedPenaltyItems.length > 0);
  v2.emptyReward.classList.toggle("hidden", regularRewardItems.length > 0);
  v2.emptyPenalty.classList.toggle("hidden", regularPenaltyItems.length > 0);
  v2.rewardCount.textContent = `${rewardItems.length} 個項目`;
  v2.penaltyCount.textContent = `${penaltyItems.length} 個項目`;
}

function renderPinnedRows(body, items) {
  body.innerHTML = items.map((item) => `
    <tr>
      <td data-v2-item="${item.id}"><strong>${escapeHtml(getItemName(item))}</strong><span class="item-scope">${item.studentId ? "個別" : "共用"}</span></td>
      <td><input class="quantity-input" type="number" min="0" step="1" inputmode="numeric" data-quantity value="" placeholder="0" /></td>
    </tr>
  `).join("");
}

function renderV2Rows(body, items) {
  if (isCompactLayout()) {
    body.innerHTML = items.map((item) => `<tr>${renderV2ItemCells(item)}</tr>`).join("");
    return;
  }

  const rowCount = Math.ceil(items.length / 2);
  const rows = [];
  for (let index = 0; index < rowCount; index += 1) {
    const leftItem = items[index];
    const rightItem = items[index + rowCount];
    rows.push(`
      <tr>
        ${renderV2ItemCells(leftItem)}
        ${rightItem ? renderV2ItemCells(rightItem) : renderEmptyV2ItemCells()}
      </tr>
    `);
  }
  body.innerHTML = rows.join("");
}

function isCompactLayout() {
  return window.matchMedia("(max-width: 980px)").matches;
}

function renderV2ItemCells(item) {
  const scope = item.studentId ? "個別" : "共用";
  return `
    <td data-v2-item="${item.id}"><span class="type-pill ${getTypeClass(item.type)}">${getTypeLabel(item.type)}</span></td>
    <td><strong>${escapeHtml(getItemName(item))}</strong><span class="item-scope">${scope}</span></td>
    <td>${Math.abs(Number(item.score || 0))}</td>
    <td><input class="quantity-input" type="number" min="0" step="1" inputmode="numeric" data-quantity value="" placeholder="0" /></td>
  `;
}

function renderEmptyV2ItemCells() {
  return `<td class="empty-cell"></td><td class="empty-cell"></td><td class="empty-cell"></td><td class="empty-cell"></td>`;
}

function renderTransactions() {
  const filtered = transactions.filter((transaction) => {
    const itemLabel = getTransactionItemLabel(transaction);
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

  transactionsTableBody.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => editTransaction(button.dataset.edit)));
  transactionsTableBody.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteTransaction(button.dataset.delete)));
  transactionsTableBody.querySelectorAll("[data-history]").forEach((button) => button.addEventListener("click", () => openHistory(button.dataset.history)));
}

function renderTransactionRow(transaction) {
  const typeLabel = getTypeLabel(transaction.type);
  const typeClass = getTypeClass(transaction.type);
  const itemLabel = getTransactionItemLabel(transaction);
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
          <button type="button" data-edit="${transaction.id}">編輯</button>
          <button class="danger-button" type="button" data-delete="${transaction.id}">刪除</button>
          <button class="secondary-button" type="button" data-history="${transaction.id}">紀錄</button>
        </div>
      </td>
    </tr>
  `;
}

async function saveAllV2Transactions() {
  hideV2FormError();
  const studentId = fields.v2StudentId.value;
  const transactionDate = fields.v2TransactionDate.value;
  if (!studentId) return showV2FormError("請選擇學生");
  if (!isValidDate(transactionDate)) return showV2FormError("請選擇生效日期");

  const rows = [
    ...collectV2Rows(v2.rewardPinnedBody, "REWARD"),
    ...collectV2Rows(v2.penaltyPinnedBody, "PENALTY"),
    ...collectV2Rows(v2.rewardBody, "REWARD"),
    ...collectV2Rows(v2.penaltyBody, "PENALTY"),
  ];
  const invalid = rows.find(({ rawQuantity, quantity }) => rawQuantity !== "" && (!Number.isInteger(quantity) || quantity < 0));
  if (invalid) return showV2FormError("數量必須是 0 或正整數");

  const payloads = rows.filter(({ item, quantity }) => item && quantity > 0);
  if (!payloads.length) return showV2FormError("請至少輸入一個數量");

  AppUI.showLoading("儲存點數異動...");
  try {
    for (const { item, quantity, type } of payloads) {
      await requestJson("/api/score-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          type,
          scoreItemId: item.id,
          scoreChange: Math.abs(Number(item.score || 0)) * quantity,
          transactionDate,
        }),
      });
    }
    clearAllV2Quantities();
    AppUI.toast(`已新增 ${payloads.length} 筆點數異動`);
    await Promise.all([loadStudents(), loadTransactions()]);
  } catch (error) {
    showV2FormError(error.message);
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function collectV2Rows(body, type) {
  return [...body.querySelectorAll("[data-v2-item]")].map((cell) => {
    const item = scoreItems.find((entry) => entry.id === cell.dataset.v2Item);
    const row = cell.parentElement;
    const cellIndex = [...row.children].indexOf(cell);
    const quantityInput = row.children[cellIndex + 3]?.querySelector("[data-quantity]")
      || row.children[cellIndex + 1]?.querySelector("[data-quantity]");
    const rawQuantity = quantityInput?.value.trim() || "";
    const quantity = rawQuantity === "" ? 0 : Number(rawQuantity);
    return { item, rawQuantity, quantity, type };
  });
}

async function saveTransaction(event) {
  event.preventDefault();
  clearFieldErrors();
  hideFormError();
  const quantity = Number(fields.quantity.value || 1);
  const payload = {
    studentId: fields.studentId.value,
    type: fields.type.value,
    scoreItemId: fields.scoreItemId.value,
    scoreChange: Number(fields.scoreChange.value) * quantity,
    transactionDate: fields.transactionDate.value,
  };
  const validation = validateTransaction(payload, quantity);
  if (!validation.valid) {
    showFieldError(validation.field, validation.message);
    return showFormError(validation.message);
  }
  const id = fields.transactionId.value;
  const url = id ? `/api/score-transactions/${id}` : "/api/score-transactions";
  const method = id ? "PUT" : "POST";
  AppUI.showLoading("儲存點數異動...");
  try {
    await requestJson(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    resetTransactionForm();
    AppUI.toast(id ? "點數異動已更新" : "點數異動已新增");
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
  if (!transaction.scoreItemId) {
    AppUI.toast("結餘異動請重新新增結餘調整", "error");
    return;
  }
  fields.transactionId.value = transaction.id;
  fields.studentId.value = transaction.studentId;
  fields.type.value = transaction.type;
  renderScoreItemOptions();
  fields.scoreItemId.value = transaction.scoreItemId;
  fields.quantity.value = 1;
  fields.scoreChange.value = Math.abs(transaction.scoreChange);
  fields.transactionDate.value = toDateInputValue(transaction.transactionDate);
  transactionFormTitle.textContent = "點數異動 v1（編輯）";
  cancelEditButton.classList.remove("hidden");
  document.querySelector(".transaction-v1").classList.remove("hidden");
  fields.studentId.focus();
}

async function saveSettlement(event) {
  event.preventDefault();
  hideSettlementError();
  const payload = {
    studentId: fields.settlementStudentId.value,
    targetScore: Number(fields.settlementScore.value),
    transactionDate: fields.settlementDate.value,
  };
  const validation = validateSettlement(payload);
  if (!validation.valid) return showSettlementError(validation.message);

  AppUI.showLoading("儲存結餘...");
  try {
    await requestJson("/api/score-transactions/settlement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    settlementForm.reset();
    fields.settlementDate.value = toDateInputValue(new Date());
    AppUI.toast("結餘已儲存");
    await Promise.all([loadStudents(), loadTransactions()]);
  } catch (error) {
    showSettlementError(error.message);
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

async function deleteTransaction(id) {
  const transaction = transactions.find((entry) => entry.id === id);
  if (!transaction || !confirm("確定要刪除此筆點數異動？")) return;
  AppUI.showLoading("刪除點數異動...");
  try {
    await requestJson(`/api/score-transactions/${id}`, { method: "DELETE" });
    AppUI.toast("點數異動已刪除");
    await Promise.all([loadStudents(), loadTransactions()]);
  } catch (error) {
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function openHistory(id) {
  window.location.href = `audit-logs.html?tableName=ScoreTransaction&recordId=${encodeURIComponent(id)}`;
}

function fillScoreFromSelectedItem() {
  const item = scoreItems.find((entry) => entry.id === fields.scoreItemId.value);
  fields.scoreChange.value = item ? Math.abs(item.score) : "";
  fields.quantity.value = fields.quantity.value || 1;
}

function resetTransactionForm() {
  transactionForm.reset();
  fields.transactionId.value = "";
  fields.type.value = "REWARD";
  fields.quantity.value = 1;
  renderScoreItemOptions();
  fillScoreFromSelectedItem();
  fields.transactionDate.value = toDateInputValue(new Date());
  fields.settlementDate.value = fields.settlementDate.value || toDateInputValue(new Date());
  transactionFormTitle.textContent = "點數異動 v1";
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
  history.replaceState(null, "", "score-transactions.html");
  loadTransactions();
}

function applyInitialQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get("studentId");
  if (studentId) {
    fields.searchStudentId.value = studentId;
    fields.v2StudentId.value = studentId;
  }
}

function validateTransaction(data, quantity) {
  if (!data.studentId) return { valid: false, field: "studentId", message: "請選擇學生" };
  if (!data.scoreItemId) return { valid: false, field: "scoreItemId", message: "請選擇項目" };
  if (!Number.isInteger(quantity) || quantity <= 0) return { valid: false, field: "quantity", message: "數量必須是正整數" };
  if (!Number.isInteger(data.scoreChange) || data.scoreChange <= 0) return { valid: false, field: "scoreChange", message: "點數必須是正整數" };
  if (!isValidDate(data.transactionDate)) return { valid: false, field: "transactionDate", message: "請選擇生效日期" };
  return { valid: true };
}

function validateSettlement(data) {
  if (!data.studentId) return { valid: false, message: "請選擇學生" };
  if (!Number.isInteger(data.targetScore)) return { valid: false, message: "結餘點數必須是整數" };
  if (!isValidDate(data.transactionDate)) return { valid: false, message: "請選擇生效日期" };
  return { valid: true };
}

function getTransactionItemLabel(transaction) {
  if (transaction.scoreItem) return getItemName(transaction.scoreItem);
  return "結餘 - 結餘調整";
}

function getItemName(item) {
  return `${item.mainCategory} - ${item.subCategory}`;
}

function getTypeLabel(type) {
  if (type === "SETTLEMENT") return "結餘";
  return type === "REWARD" ? "獎勵" : "懲罰";
}

function getTypeClass(type) {
  if (type === "SETTLEMENT") return "settlement";
  return type === "REWARD" ? "reward" : "penalty";
}

function clearAllV2Quantities() {
  v2.rewardPinnedBody.querySelectorAll("[data-quantity]").forEach((input) => {
    input.value = "";
  });
  v2.penaltyPinnedBody.querySelectorAll("[data-quantity]").forEach((input) => {
    input.value = "";
  });
  v2.rewardBody.querySelectorAll("[data-quantity]").forEach((input) => {
    input.value = "";
  });
  v2.penaltyBody.querySelectorAll("[data-quantity]").forEach((input) => {
    input.value = "";
  });
}

function showV2FormError(message) {
  v2FormError.textContent = message;
  v2FormError.classList.remove("hidden");
}

function hideV2FormError() {
  v2FormError.textContent = "";
  v2FormError.classList.add("hidden");
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

function showSettlementError(message) {
  settlementError.textContent = message;
  settlementError.classList.remove("hidden");
}

function hideSettlementError() {
  settlementError.textContent = "";
  settlementError.classList.add("hidden");
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "請求失敗");
  return data;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium" }).format(new Date(value));
}

function toDateInputValue(value) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function isValidDate(value) {
  return Boolean(value) && !Number.isNaN(new Date(value).getTime());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
