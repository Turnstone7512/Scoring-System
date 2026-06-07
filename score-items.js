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
  mainCategory: document.querySelector("#mainCategory"),
  subCategory: document.querySelector("#subCategory"),
  imageUrl: document.querySelector("#imageUrl"),
  score: document.querySelector("#score"),
};

let scoreItems = [];
let activeFilter = "ALL";
let searchTerm = "";
let currentPage = 1;
const pageSize = 10;

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

loadScoreItems();

async function loadScoreItems() {
  AppUI.showLoading("載入加減分項目");
  try {
    scoreItems = await requestJson("/api/score-items");
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
    <div class="utility-row">
      <input id="scoreItemSearch" class="table-search" type="search" placeholder="搜尋主項、子項或分數" />
      <div id="scoreItemPagination" class="pagination"></div>
    </div>
  `);
  document.querySelector("#scoreItemSearch").addEventListener("input", (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    currentPage = 1;
    renderScoreItems();
  });
}

function insertImagePreview() {
  fields.imageUrl.insertAdjacentHTML("afterend", `<img id="scoreItemImagePreview" class="image-preview" alt="圖片預覽" />`);
}

function renderScoreItems() {
  const filtered = scoreItems.filter((item) => {
    const matchType = activeFilter === "ALL" || item.type === activeFilter;
    const haystack = `${item.type} ${item.mainCategory} ${item.subCategory} ${item.score}`.toLowerCase();
    return matchType && haystack.includes(searchTerm);
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

  tableBody.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openEditDialog(button.dataset.edit));
  });
  tableBody.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteScoreItem(button.dataset.delete));
  });
  tableBody.querySelectorAll("[data-history]").forEach((button) => {
    button.addEventListener("click", () => openHistory(button.dataset.history));
  });
}

function renderScoreItemRow(item) {
  const image = item.imageUrl
    ? `<img class="score-image" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.mainCategory)}">`
    : `<span class="score-image placeholder">無圖片</span>`;
  const typeLabel = item.type === "REWARD" ? "加分" : "減分";
  const typeClass = item.type === "REWARD" ? "reward" : "penalty";

  return `
    <tr>
      <td><span class="type-pill ${typeClass}">${typeLabel}</span></td>
      <td>${escapeHtml(item.mainCategory)}</td>
      <td>${escapeHtml(item.subCategory)}</td>
      <td>${item.score}</td>
      <td>${image}</td>
      <td>${formatDate(item.createdAt)}</td>
      <td>
        <div class="card-actions">
          <button type="button" data-edit="${item.id}">修改</button>
          <button class="danger-button" type="button" data-delete="${item.id}">刪除</button>
          <button class="secondary-button" type="button" data-history="${item.id}">查看歷程</button>
        </div>
      </td>
    </tr>
  `;
}

function openCreateDialog() {
  scoreItemForm.reset();
  fields.id.value = "";
  fields.type.value = activeFilter === "PENALTY" ? "PENALTY" : "REWARD";
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
  fields.mainCategory.value = item.mainCategory;
  fields.subCategory.value = item.subCategory;
  fields.imageUrl.value = item.imageUrl || "";
  fields.score.value = Math.abs(item.score);
  scoreItemFormTitle.textContent = "修改項目";
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
    mainCategory: fields.mainCategory.value.trim(),
    subCategory: fields.subCategory.value.trim(),
    imageUrl: fields.imageUrl.value.trim(),
    score: Number(fields.score.value),
  };

  const validation = validateScoreItem(payload);
  if (!validation.valid) {
    showFieldError(validation.field, validation.message);
    return showFormError(validation.message);
  }

  const id = fields.id.value;
  const url = id ? `/api/score-items/${id}` : "/api/score-items";
  const method = id ? "PUT" : "POST";

  AppUI.showLoading("儲存項目");
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
  if (!item || !confirm(`確定要刪除「${item.mainCategory} / ${item.subCategory}」嗎？`)) return;

  AppUI.showLoading("刪除項目");
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
  window.location.href = `/audit-logs?tableName=ScoreItem&recordId=${encodeURIComponent(id)}`;
}

function validateScoreItem(data) {
  if (data.type !== "REWARD" && data.type !== "PENALTY") return { valid: false, field: "type", message: "請選擇加分或減分" };
  if (!data.mainCategory) return { valid: false, field: "mainCategory", message: "請輸入主項" };
  if (!data.subCategory) return { valid: false, field: "subCategory", message: "請輸入子項" };
  if (!Number.isInteger(data.score) || data.score <= 0) return { valid: false, field: "score", message: "分數必須是正整數" };
  if (data.imageUrl && !isValidUrl(data.imageUrl)) return { valid: false, field: "imageUrl", message: "圖片網址格式不正確" };
  return { valid: true };
}

function updateImagePreview() {
  const preview = document.querySelector("#scoreItemImagePreview");
  const url = fields.imageUrl.value.trim();
  if (url && isValidUrl(url)) {
    preview.src = url;
    preview.classList.add("visible");
  } else {
    preview.removeAttribute("src");
    preview.classList.remove("visible");
  }
}

function closeScoreItemDialog() {
  hideFormError();
  clearFieldErrors();
  scoreItemDialog.close();
}

function showFormError(message) {
  formError.textContent = message;
  formError.classList.remove("hidden");
}

function hideFormError() {
  formError.textContent = "";
  formError.classList.add("hidden");
}

function showFieldError(field, message) {
  const input = fields[field];
  if (!input) return;
  input.insertAdjacentHTML("afterend", `<p class="field-error">${escapeHtml(message)}</p>`);
}

function clearFieldErrors() {
  scoreItemForm.querySelectorAll(".field-error").forEach((node) => node.remove());
}

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
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
