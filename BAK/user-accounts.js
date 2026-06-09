const tableBody = document.querySelector("#accountTableBody");
const emptyAccounts = document.querySelector("#emptyAccounts");
const accountCount = document.querySelector("#accountCount");
const accountDialog = document.querySelector("#accountDialog");
const accountForm = document.querySelector("#accountForm");
const accountFormTitle = document.querySelector("#accountFormTitle");
const formError = document.querySelector("#formError");

const fields = {
  id: document.querySelector("#accountId"),
  account: document.querySelector("#account"),
  name: document.querySelector("#name"),
  role: document.querySelector("#role"),
};

let accounts = [];
let searchTerm = "";
let currentPage = 1;
const pageSize = 10;

document.querySelector("#addAccountButton").addEventListener("click", openCreateDialog);
document.querySelector("#closeAccountDialog").addEventListener("click", closeDialog);
document.querySelector("#cancelAccountForm").addEventListener("click", closeDialog);
document.querySelector("#accountSearch").addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  currentPage = 1;
  renderAccounts();
});
accountForm.addEventListener("submit", saveAccount);

loadAccounts();

async function loadAccounts() {
  AppUI.showLoading("載入使用者帳號");
  try {
    accounts = await requestJson("/api/user-accounts");
    renderAccounts();
  } catch (error) {
    tableBody.innerHTML = "";
    emptyAccounts.classList.remove("hidden");
    emptyAccounts.textContent = error.message;
    accountCount.textContent = "載入失敗";
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function renderAccounts() {
  const filtered = accounts.filter((entry) => {
    const haystack = `${entry.account} ${entry.name} ${entry.role}`.toLowerCase();
    return haystack.includes(searchTerm);
  });
  const pageResult = AppUI.paginate(filtered, currentPage, pageSize);
  currentPage = pageResult.page;

  accountCount.textContent = `共 ${filtered.length} 個帳號`;
  emptyAccounts.classList.toggle("hidden", pageResult.items.length > 0);
  tableBody.innerHTML = pageResult.items.map(renderAccountRow).join("");
  AppUI.renderPagination(document.querySelector("#accountPagination"), currentPage, pageResult.totalPages, (page) => {
    currentPage = page;
    renderAccounts();
  });

  tableBody.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openEditDialog(button.dataset.edit));
  });
  tableBody.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteAccount(button.dataset.delete));
  });
  tableBody.querySelectorAll("[data-history]").forEach((button) => {
    button.addEventListener("click", () => {
      window.location.href = `/audit-logs?tableName=UserAccount&recordId=${encodeURIComponent(button.dataset.history)}`;
    });
  });
}

function renderAccountRow(entry) {
  const roleClass = entry.role === "ADMIN" ? "admin" : "viewer";
  const roleLabel = entry.role === "ADMIN" ? "Admin" : "Viewer";
  return `
    <tr>
      <td><strong>${escapeHtml(entry.account)}</strong></td>
      <td>${escapeHtml(entry.name)}</td>
      <td><span class="role-pill ${roleClass}">${roleLabel}</span></td>
      <td>${formatDate(entry.createdAt)}</td>
      <td>
        <div class="card-actions">
          <button type="button" data-edit="${entry.id}">修改</button>
          <button class="danger-button" type="button" data-delete="${entry.id}">刪除</button>
          <button class="secondary-button" type="button" data-history="${entry.id}">查看歷程</button>
        </div>
      </td>
    </tr>
  `;
}

function openCreateDialog() {
  accountForm.reset();
  fields.id.value = "";
  fields.role.value = "VIEWER";
  accountFormTitle.textContent = "新增帳號";
  hideFormError();
  clearFieldErrors();
  accountDialog.showModal();
  fields.account.focus();
}

function openEditDialog(id) {
  const entry = accounts.find((item) => item.id === id);
  if (!entry) return;
  fields.id.value = entry.id;
  fields.account.value = entry.account;
  fields.name.value = entry.name;
  fields.role.value = entry.role;
  accountFormTitle.textContent = "修改帳號";
  hideFormError();
  clearFieldErrors();
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
  };
  const validation = validateAccount(payload);
  if (!validation.valid) {
    showFieldError(validation.field, validation.message);
    return showFormError(validation.message);
  }

  const id = fields.id.value;
  AppUI.showLoading("儲存帳號");
  try {
    await requestJson(id ? `/api/user-accounts/${id}` : "/api/user-accounts", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    closeDialog();
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
  const entry = accounts.find((item) => item.id === id);
  if (!entry || !confirm(`確定要刪除「${entry.account}」嗎？`)) return;
  AppUI.showLoading("刪除帳號");
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

function validateAccount(data) {
  if (!data.account) return { valid: false, field: "account", message: "請輸入帳號" };
  if (!data.name) return { valid: false, field: "name", message: "請輸入姓名" };
  if (data.role !== "ADMIN" && data.role !== "VIEWER") return { valid: false, field: "role", message: "請選擇權限" };
  return { valid: true };
}

function closeDialog() {
  hideFormError();
  clearFieldErrors();
  accountDialog.close();
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
  if (input) input.insertAdjacentHTML("afterend", `<p class="field-error">${escapeHtml(message)}</p>`);
}

function clearFieldErrors() {
  accountForm.querySelectorAll(".field-error").forEach((node) => node.remove());
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "請求失敗");
  return data;
}

function formatDate(value) {
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
