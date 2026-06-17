const accountTableBody = document.querySelector("#accountTableBody");
const emptyAccounts = document.querySelector("#emptyAccounts");
const accountCount = document.querySelector("#accountCount");
const addAccountButton = document.querySelector("#addAccountButton");
const accountDialog = document.querySelector("#accountDialog");
const accountForm = document.querySelector("#accountForm");
const accountFormTitle = document.querySelector("#accountFormTitle");
const formError = document.querySelector("#formError");
const accountSearch = document.querySelector("#accountSearch");

const fields = {
  id: document.querySelector("#accountId"),
  account: document.querySelector("#account"),
  name: document.querySelector("#name"),
  role: document.querySelector("#role"),
  password: document.querySelector("#password"),
};

let accounts = [];
let searchTerm = "";
let currentPage = 1;
const pageSize = 10;
let sortState = { key: "updatedAt", direction: "desc" };

setupAccountSortHeaders();

addAccountButton.addEventListener("click", openCreateDialog);
accountForm.addEventListener("submit", saveAccount);
document.querySelector("#closeAccountDialog").addEventListener("click", closeAccountDialog);
document.querySelector("#cancelAccountForm").addEventListener("click", closeAccountDialog);
accountSearch.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  currentPage = 1;
  renderAccounts();
});

loadAccounts();

async function loadAccounts() {
  AppUI.showLoading("載入使用者帳號...");
  try {
    accounts = await requestJson("/api/user-accounts");
    renderAccounts();
  } catch (error) {
    accountTableBody.innerHTML = "";
    emptyAccounts.classList.remove("hidden");
    emptyAccounts.textContent = error.message;
    accountCount.textContent = "載入失敗";
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function renderAccounts() {
  const filtered = accounts.filter((account) => {
    const haystack = `${account.account || ""} ${account.name || ""} ${account.role || ""}`.toLowerCase();
    return haystack.includes(searchTerm);
  });
  const sortedAccounts = [...filtered].sort(compareAccounts);
  const pageResult = AppUI.paginate(sortedAccounts, currentPage, pageSize);
  currentPage = pageResult.page;

  accountCount.textContent = `共 ${filtered.length} 個帳號`;
  emptyAccounts.classList.toggle("hidden", pageResult.items.length > 0);
  accountTableBody.innerHTML = pageResult.items.map(renderAccountRow).join("");
  AppUI.renderPagination(document.querySelector("#accountPagination"), currentPage, pageResult.totalPages, (page) => {
    currentPage = page;
    renderAccounts();
  });
  AppUI.renderPagination(document.querySelector("#accountPaginationBottom"), currentPage, pageResult.totalPages, (page) => {
    currentPage = page;
    renderAccounts();
  });
  renderAccountSortIndicators();

  accountTableBody.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => openEditDialog(button.dataset.edit)));
  accountTableBody.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteAccount(button.dataset.delete)));
}

function setupAccountSortHeaders() {
  document.querySelector(".accounts-page .table-wrap")?.insertAdjacentHTML("afterend", `<div id="accountPaginationBottom" class="pagination"></div>`);
  const headers = document.querySelectorAll(".account-table thead th");
  const columns = [
    ["account", "帳號"],
    ["name", "姓名"],
    ["role", "角色"],
    ["updatedAt", "最後異動時間"],
  ];
  columns.forEach(([key, label], index) => {
    const header = headers[index];
    if (!header) return;
    header.innerHTML = `<button class="sort-button" type="button" data-account-sort="${key}">${label} <span data-account-indicator="${key}"></span></button>`;
  });
  document.querySelectorAll("[data-account-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.accountSort;
      sortState = {
        key,
        direction: sortState.key === key && sortState.direction === "desc" ? "asc" : "desc",
      };
      currentPage = 1;
      renderAccounts();
    });
  });
}

function compareAccounts(a, b) {
  const direction = sortState.direction === "asc" ? 1 : -1;
  const aValue = getAccountSortValue(a, sortState.key);
  const bValue = getAccountSortValue(b, sortState.key);
  if (typeof aValue === "number" && typeof bValue === "number") return (aValue - bValue) * direction;
  return String(aValue).localeCompare(String(bValue), "zh-Hant", { numeric: true, sensitivity: "base" }) * direction;
}

function getAccountSortValue(account, key) {
  if (key === "updatedAt") return new Date(account.updatedAt || account.createdAt || 0).getTime();
  return account[key] || "";
}

function renderAccountSortIndicators() {
  document.querySelectorAll("[data-account-indicator]").forEach((indicator) => {
    indicator.textContent = indicator.dataset.accountIndicator === sortState.key
      ? (sortState.direction === "asc" ? "↑" : "↓")
      : "";
  });
}

function renderAccountRow(account) {
  return `
    <tr>
      <td>${escapeHtml(account.account)}</td>
      <td>${escapeHtml(account.name)}</td>
      <td>${escapeHtml(roleLabel(account.role))}</td>
      <td>${formatDate(account.updatedAt || account.createdAt)}</td>
      <td>
        <div class="card-actions">
          <button type="button" data-edit="${account.id}">編輯</button>
          <button class="danger-button" type="button" data-delete="${account.id}">刪除</button>
        </div>
      </td>
    </tr>
  `;
}

function openCreateDialog() {
  accountForm.reset();
  fields.id.value = "";
  fields.role.value = "VIEWER";
  fields.password.required = true;
  accountFormTitle.textContent = "新增帳號";
  clearFieldErrors();
  hideFormError();
  accountDialog.showModal();
  fields.account.focus();
}

function openEditDialog(id) {
  const account = accounts.find((entry) => entry.id === id);
  if (!account) return;
  fields.id.value = account.id;
  fields.account.value = account.account;
  fields.name.value = account.name;
  fields.role.value = account.role;
  fields.password.value = "";
  fields.password.required = false;
  accountFormTitle.textContent = "編輯帳號 / 修改密碼";
  clearFieldErrors();
  hideFormError();
  accountDialog.showModal();
  fields.account.focus();
}

async function saveAccount(event) {
  event.preventDefault();
  clearFieldErrors();
  const payload = {
    account: fields.account.value.trim(),
    name: fields.name.value.trim(),
    role: fields.role.value,
    password: fields.password.value,
  };
  const validation = validateAccount(payload, !fields.id.value);
  if (!validation.valid) {
    showFieldError(validation.field, validation.message);
    return showFormError(validation.message);
  }
  const id = fields.id.value;
  const url = id ? `/api/user-accounts/${id}` : "/api/user-accounts";
  const method = id ? "PUT" : "POST";
  AppUI.showLoading("儲存帳號...");
  try {
    await requestJson(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    closeAccountDialog();
    AppUI.toast(id ? "帳號已更新" : "帳號已新增");
    await loadAccounts();
  } catch (error) {
    showFormError(error.message);
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

async function deleteAccount(id) {
  const account = accounts.find((entry) => entry.id === id);
  if (!account || !confirm(`確定要刪除帳號「${account.account}」嗎？`)) return;
  AppUI.showLoading("刪除帳號...");
  try {
    await requestJson(`/api/user-accounts/${id}`, { method: "DELETE" });
    AppUI.toast("帳號已刪除");
    await loadAccounts();
  } catch (error) {
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function closeAccountDialog() {
  accountDialog.close();
}

function validateAccount(data, isCreate) {
  if (!data.account) return { valid: false, field: "account", message: "請輸入帳號" };
  if (!data.name) return { valid: false, field: "name", message: "請輸入姓名" };
  if (data.role !== "ADMIN" && data.role !== "VIEWER") return { valid: false, field: "role", message: "請選擇角色" };
  if (isCreate && !data.password) return { valid: false, field: "password", message: "新增帳號必須設定密碼" };
  return { valid: true };
}

function roleLabel(role) {
  return role === "ADMIN" ? "管理者" : "檢視者";
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
  accountForm.querySelectorAll(".field-error").forEach((node) => node.remove());
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
