const tableBody = document.querySelector("#scoreItemsTableBody");
const emptyScoreItems = document.querySelector("#emptyScoreItems");
const scoreItemCount = document.querySelector("#scoreItemCount");
const addScoreItemButton = document.querySelector("#addScoreItemButton");
const scoreItemDialog = document.querySelector("#scoreItemDialog");
const scoreItemForm = document.querySelector("#scoreItemForm");
const scoreItemFormTitle = document.querySelector("#scoreItemFormTitle");
const formError = document.querySelector("#formError");
const filterButtons = document.querySelectorAll("[data-filter]");

const fields = {
  id: document.querySelector("#scoreItemId"),
  type: document.querySelector("#type"),
  studentId: document.querySelector("#studentId"),
  mainCategory: document.querySelector("#mainCategory"),
  subCategory: document.querySelector("#subCategory"),
  imageUrl: document.querySelector("#imageUrl"),
  score: document.querySelector("#score"),
  isPinned: document.querySelector("#isPinned"),
};

let scoreItems = [];
let students = [];
let activeFilter = "ALL";
let searchTerm = "";
let studentFilter = "";
let mainCategoryFilter = "";
let pinnedFilter = "ALL";
let currentPage = 1;
const pageSize = 50;

insertScoreItemControls();
insertImagePreview();

addScoreItemButton.addEventListener("click", openCreateDialog);
scoreItemForm.addEventListener("submit", saveScoreItem);
document.querySelector("#closeScoreItemDialog").addEventListener("click", closeScoreItemDialog);
document.querySelector("#cancelScoreItemForm").addEventListener("click", closeScoreItemDialog);
fields.imageUrl.addEventListener("input", updateImagePreview);

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    currentPage = 1;
    filterButtons.forEach((entry) => entry.classList.toggle("active", entry === button));
    renderScoreItems();
  });
});

init();

async function init() {
  await loadStudents();
  await loadScoreItems();
}

async function loadStudents() {
  students = await requestJson("/api/students");
  renderStudentOptions();
}

async function loadScoreItems() {
  AppUI.showLoading("載入獎懲項目...");
  try {
    scoreItems = await requestJson("/api/score-items");
    renderMainCategoryFilterOptions();
    renderScoreItems();
  } catch (error) {
    tableBody.innerHTML = "";
    emptyScoreItems.classList.remove("hidden");
    emptyScoreItems.textContent = error.message;
    scoreItemCount.textContent = "載入失敗";
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function insertScoreItemControls() {
  document.querySelector(".tabs").insertAdjacentHTML("afterend", `
    <div class="utility-row score-item-filters">
      <input id="scoreItemSearch" class="table-search" type="search" placeholder="搜尋主類別、子項目、學生或點數" />
      <select id="scoreItemStudentFilter"><option value="">全部學生</option></select>
      <select id="scoreItemMainCategoryFilter"><option value="">全部主類別</option></select>
      <select id="scoreItemPinnedFilter">
        <option value="ALL">全部置頂狀態</option>
        <option value="PINNED">置頂</option>
        <option value="UNPINNED">未置頂</option>
      </select>
      <div id="scoreItemPagination" class="pagination"></div>
    </div>
  `);

  document.querySelector("#scoreItemSearch").addEventListener("input", (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    currentPage = 1;
    renderScoreItems();
  });
  document.querySelector("#scoreItemStudentFilter").addEventListener("change", (event) => {
    studentFilter = event.target.value;
    currentPage = 1;
    renderScoreItems();
  });
  document.querySelector("#scoreItemMainCategoryFilter").addEventListener("change", (event) => {
    mainCategoryFilter = event.target.value;
    currentPage = 1;
    renderScoreItems();
  });
  document.querySelector("#scoreItemPinnedFilter").addEventListener("change", (event) => {
    pinnedFilter = event.target.value;
    currentPage = 1;
    renderScoreItems();
  });
}

function insertImagePreview() {
  fields.imageUrl.insertAdjacentHTML("afterend", `<img id="scoreItemImagePreview" class="image-preview" alt="圖片預覽" />`);
}

function renderStudentOptions() {
  const options = students
    .map((student) => `<option value="${student.id}">${escapeHtml(student.name)}（${escapeHtml(student.classNo || "-")}）</option>`)
    .join("");
  fields.studentId.innerHTML = `<option value="">所有學生共用</option>${options}`;
  const studentFilterElement = document.querySelector("#scoreItemStudentFilter");
  if (studentFilterElement) studentFilterElement.innerHTML = `<option value="">全部學生</option><option value="COMMON">所有學生共用</option>${options}`;
}

function renderMainCategoryFilterOptions() {
  const categories = [...new Set(scoreItems.map((item) => item.mainCategory).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  const select = document.querySelector("#scoreItemMainCategoryFilter");
  if (!select) return;
  select.innerHTML = `<option value="">全部主類別</option>${categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("")}`;
  select.value = categories.includes(mainCategoryFilter) ? mainCategoryFilter : "";
  mainCategoryFilter = select.value;
}

function renderScoreItems() {
  const filtered = scoreItems.filter((item) => {
    const matchType = activeFilter === "ALL" || item.type === activeFilter;
    const matchStudent = !studentFilter
      || (studentFilter === "COMMON" ? !item.studentId : item.studentId === studentFilter);
    const matchMainCategory = !mainCategoryFilter || item.mainCategory === mainCategoryFilter;
    const matchPinned = pinnedFilter === "ALL"
      || (pinnedFilter === "PINNED" ? item.isPinned : !item.isPinned);
    const haystack = `${item.type} ${getStudentLabel(item.studentId)} ${item.mainCategory} ${item.subCategory} ${item.score}`.toLowerCase();
    return matchType && matchStudent && matchMainCategory && matchPinned && haystack.includes(searchTerm);
  });
  const pageResult = AppUI.paginate(filtered, currentPage, pageSize);
  currentPage = pageResult.page;

  scoreItemCount.textContent = `共 ${filtered.length} 個項目`;
  emptyScoreItems.classList.toggle("hidden", pageResult.items.length > 0);
  tableBody.innerHTML = pageResult.items.map(renderScoreItemRow).join("");
  AppUI.renderPagination(document.querySelector("#scoreItemPagination"), currentPage, pageResult.totalPages, (page) => {
    currentPage = page;
    renderScoreItems();
  });

  tableBody.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => openEditDialog(button.dataset.edit)));
  tableBody.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteScoreItem(button.dataset.delete)));
  tableBody.querySelectorAll("[data-history]").forEach((button) => button.addEventListener("click", () => openHistory(button.dataset.history)));
}

function renderScoreItemRow(item) {
  const image = item.imageUrl
    ? `<img class="score-image" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.mainCategory)}">`
    : `<span class="score-image placeholder">無圖片</span>`;
  const typeLabel = item.type === "REWARD" ? "獎勵" : "懲罰";
  const typeClass = item.type === "REWARD" ? "reward" : "penalty";
  return `
    <tr>
      <td><span class="type-pill ${typeClass}">${typeLabel}</span></td>
      <td>${escapeHtml(getStudentLabel(item.studentId))}</td>
      <td>${item.isPinned ? "是" : "否"}</td>
      <td>${escapeHtml(item.mainCategory)}</td>
      <td>${escapeHtml(item.subCategory)}</td>
      <td>${item.score}</td>
      <td>${image}</td>
      <td>${formatDate(item.updatedAt)}</td>
      <td>
        <div class="card-actions">
          <button type="button" data-edit="${item.id}">編輯</button>
          <button class="danger-button" type="button" data-delete="${item.id}">刪除</button>
          <button class="secondary-button" type="button" data-history="${item.id}">紀錄</button>
        </div>
      </td>
    </tr>
  `;
}

function openCreateDialog() {
  scoreItemForm.reset();
  fields.id.value = "";
  fields.type.value = "REWARD";
  fields.studentId.value = "";
  fields.isPinned.checked = false;
  scoreItemFormTitle.textContent = "新增項目";
  clearFieldErrors();
  hideFormError();
  updateImagePreview();
  scoreItemDialog.showModal();
  fields.mainCategory.focus();
}

function openEditDialog(id) {
  const item = scoreItems.find((entry) => entry.id === id);
  if (!item) return;
  fields.id.value = item.id;
  fields.type.value = item.type;
  fields.studentId.value = item.studentId || "";
  fields.mainCategory.value = item.mainCategory;
  fields.subCategory.value = item.subCategory;
  fields.imageUrl.value = item.imageUrl || "";
  fields.score.value = Math.abs(item.score);
  fields.isPinned.checked = Boolean(item.isPinned);
  scoreItemFormTitle.textContent = "編輯項目";
  clearFieldErrors();
  hideFormError();
  updateImagePreview();
  scoreItemDialog.showModal();
  fields.mainCategory.focus();
}

async function saveScoreItem(event) {
  event.preventDefault();
  clearFieldErrors();
  const payload = {
    type: fields.type.value,
    studentId: fields.studentId.value,
    mainCategory: fields.mainCategory.value.trim(),
    subCategory: fields.subCategory.value.trim(),
    imageUrl: fields.imageUrl.value.trim(),
    score: Number(fields.score.value),
    isPinned: fields.isPinned.checked,
  };
  const validation = validateScoreItem(payload);
  if (!validation.valid) {
    showFieldError(validation.field, validation.message);
    return showFormError(validation.message);
  }
  const id = fields.id.value;
  const url = id ? `/api/score-items/${id}` : "/api/score-items";
  const method = id ? "PUT" : "POST";

  AppUI.showLoading("儲存獎懲項目...");
  try {
    await requestJson(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    closeScoreItemDialog();
    AppUI.toast(id ? "項目已更新" : "項目已新增");
    await loadScoreItems();
  } catch (error) {
    showFormError(error.message);
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

async function deleteScoreItem(id) {
  const item = scoreItems.find((entry) => entry.id === id);
  if (!item || !confirm(`確定要刪除「${item.mainCategory} - ${item.subCategory}」？`)) return;
  AppUI.showLoading("刪除項目...");
  try {
    await requestJson(`/api/score-items/${id}`, { method: "DELETE" });
    AppUI.toast("項目已刪除");
    await loadScoreItems();
  } catch (error) {
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function openHistory(id) {
  window.location.href = `audit-logs.html?tableName=ScoreItem&recordId=${encodeURIComponent(id)}`;
}

function closeScoreItemDialog() {
  scoreItemDialog.close();
}

function updateImagePreview() {
  const preview = document.querySelector("#scoreItemImagePreview");
  preview.src = fields.imageUrl.value.trim();
  preview.classList.toggle("hidden", !fields.imageUrl.value.trim());
}

function validateScoreItem(data) {
  if (!data.mainCategory) return { valid: false, field: "mainCategory", message: "請輸入主項目" };
  if (!data.subCategory) return { valid: false, field: "subCategory", message: "請輸入子項目" };
  if (!Number.isInteger(data.score) || data.score <= 0) return { valid: false, field: "score", message: "點數必須是正整數" };
  return { valid: true };
}

function getStudentLabel(studentId) {
  if (!studentId) return "所有學生";
  return students.find((student) => student.id === studentId)?.name || "指定學生";
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
  scoreItemForm.querySelectorAll(".field-error").forEach((node) => node.remove());
}

function hideFormError() {
  formError.textContent = "";
  formError.classList.add("hidden");
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
