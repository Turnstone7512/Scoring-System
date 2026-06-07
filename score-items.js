const tableBody = document.querySelector("#scoreItemsTableBody");
const emptyScoreItems = document.querySelector("#emptyScoreItems");
const scoreItemCount = document.querySelector("#scoreItemCount");
const addScoreItemButton = document.querySelector("#addScoreItemButton");
const scoreItemDialog = document.querySelector("#scoreItemDialog");
const historyDialog = document.querySelector("#historyDialog");
const scoreItemForm = document.querySelector("#scoreItemForm");
const scoreItemFormTitle = document.querySelector("#scoreItemFormTitle");
const formError = document.querySelector("#formError");
const historyContent = document.querySelector("#historyContent");
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

addScoreItemButton.addEventListener("click", openCreateDialog);
scoreItemForm.addEventListener("submit", saveScoreItem);
document.querySelector("#closeScoreItemDialog").addEventListener("click", closeScoreItemDialog);
document.querySelector("#cancelScoreItemForm").addEventListener("click", closeScoreItemDialog);
document.querySelector("#closeHistoryDialog").addEventListener("click", () => historyDialog.close());

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((entry) => entry.classList.toggle("active", entry === button));
    renderScoreItems();
  });
});

loadScoreItems();

async function loadScoreItems() {
  try {
    scoreItems = await requestJson("/api/score-items");
    renderScoreItems();
  } catch (error) {
    tableBody.innerHTML = "";
    emptyScoreItems.classList.remove("hidden");
    emptyScoreItems.textContent = error.message;
    scoreItemCount.textContent = "載入失敗";
  }
}

function renderScoreItems() {
  const filtered = activeFilter === "ALL"
    ? scoreItems
    : scoreItems.filter((item) => item.type === activeFilter);

  scoreItemCount.textContent = `共 ${filtered.length} 個項目`;
  emptyScoreItems.classList.toggle("hidden", filtered.length > 0);

  tableBody.innerHTML = filtered.map(renderScoreItemRow).join("");

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
  hideFormError();
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
  hideFormError();
  scoreItemDialog.showModal();
  fields.mainCategory.focus();
}

async function saveScoreItem(event) {
  event.preventDefault();

  const payload = {
    type: fields.type.value,
    mainCategory: fields.mainCategory.value.trim(),
    subCategory: fields.subCategory.value.trim(),
    imageUrl: fields.imageUrl.value.trim(),
    score: Number(fields.score.value),
  };

  const validation = validateScoreItem(payload);
  if (!validation.valid) {
    return showFormError(validation.message);
  }

  const id = fields.id.value;
  const url = id ? `/api/score-items/${id}` : "/api/score-items";
  const method = id ? "PUT" : "POST";

  try {
    await requestJson(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    closeScoreItemDialog();
    await loadScoreItems();
  } catch (error) {
    showFormError(error.message);
  }
}

async function deleteScoreItem(id) {
  const item = scoreItems.find((entry) => entry.id === id);
  if (!item || !confirm(`確定要刪除「${item.mainCategory} / ${item.subCategory}」嗎？`)) {
    return;
  }

  await requestJson(`/api/score-items/${id}`, { method: "DELETE" });
  await loadScoreItems();
}

async function openHistory(id) {
  historyContent.innerHTML = `<p class="meta">載入中</p>`;
  historyDialog.showModal();

  try {
    const logs = await requestJson(`/api/score-items/${id}/audit-logs`);
    historyContent.innerHTML = logs.length
      ? logs.map(renderHistoryEntry).join("")
      : `<p class="meta">尚無異動歷程</p>`;
  } catch (error) {
    historyContent.innerHTML = `<p class="error-text">${escapeHtml(error.message)}</p>`;
  }
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

function validateScoreItem(data) {
  if (data.type !== "REWARD" && data.type !== "PENALTY") {
    return { valid: false, message: "請選擇加分或減分" };
  }

  if (!data.mainCategory) {
    return { valid: false, message: "請輸入主項" };
  }

  if (!data.subCategory) {
    return { valid: false, message: "請輸入子項" };
  }

  if (!Number.isInteger(data.score) || data.score <= 0) {
    return { valid: false, message: "分數必須是正整數" };
  }

  if (data.imageUrl) {
    try {
      new URL(data.imageUrl);
    } catch {
      return { valid: false, message: "圖片網址格式不正確" };
    }
  }

  return { valid: true };
}

function closeScoreItemDialog() {
  hideFormError();
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
