const tableBody = document.querySelector("#studentsTableBody");
const emptyStudents = document.querySelector("#emptyStudents");
const studentCount = document.querySelector("#studentCount");
const addStudentButton = document.querySelector("#addStudentButton");
const studentDialog = document.querySelector("#studentDialog");
const studentForm = document.querySelector("#studentForm");
const studentFormTitle = document.querySelector("#studentFormTitle");
const formError = document.querySelector("#formError");

const fields = {
  id: document.querySelector("#studentId"),
  name: document.querySelector("#name"),
  grade: document.querySelector("#grade"),
  classNo: document.querySelector("#classNo"),
  email: document.querySelector("#email"),
  photoUrl: document.querySelector("#photoUrl"),
};

let students = [];
let searchTerm = "";
let currentPage = 1;
const pageSize = 10;

insertStudentControls();
insertPhotoPreview();

addStudentButton.addEventListener("click", openCreateDialog);
studentForm.addEventListener("submit", saveStudent);
document.querySelector("#closeStudentDialog").addEventListener("click", closeStudentDialog);
document.querySelector("#cancelStudentForm").addEventListener("click", closeStudentDialog);
fields.photoUrl.addEventListener("input", updatePhotoPreview);

loadStudents();

async function loadStudents() {
  AppUI.showLoading("載入學生資料...");
  try {
    students = await requestJson("/api/students");
    renderStudents();
  } catch (error) {
    tableBody.innerHTML = "";
    emptyStudents.classList.remove("hidden");
    emptyStudents.textContent = error.message;
    studentCount.textContent = "載入失敗";
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function insertStudentControls() {
  document.querySelector(".toolbar").insertAdjacentHTML("afterend", `
    <div class="utility-row">
      <input id="studentSearch" class="table-search" type="search" placeholder="搜尋姓名、年級、座號或 Email" />
      <div id="studentPagination" class="pagination"></div>
    </div>
  `);
  document.querySelector("#studentSearch").addEventListener("input", (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    currentPage = 1;
    renderStudents();
  });
}

function insertPhotoPreview() {
  fields.photoUrl.insertAdjacentHTML("afterend", `<img id="studentPhotoPreview" class="image-preview" alt="照片預覽" />`);
}

function renderStudents() {
  const filtered = students.filter((student) => {
    const haystack = `${student.name || ""} ${student.grade || ""} ${student.classNo || ""} ${student.email || ""}`.toLowerCase();
    return haystack.includes(searchTerm);
  });
  const pageResult = AppUI.paginate(filtered, currentPage, pageSize);
  currentPage = pageResult.page;

  studentCount.textContent = `共 ${filtered.length} 位學生`;
  emptyStudents.classList.toggle("hidden", pageResult.items.length > 0);
  tableBody.innerHTML = pageResult.items.map(renderStudentRow).join("");
  AppUI.renderPagination(document.querySelector("#studentPagination"), currentPage, pageResult.totalPages, (page) => {
    currentPage = page;
    renderStudents();
  });

  tableBody.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => openEditDialog(button.dataset.edit)));
  tableBody.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteStudent(button.dataset.delete)));
  tableBody.querySelectorAll("[data-history]").forEach((button) => button.addEventListener("click", () => openHistory(button.dataset.history)));
}

function renderStudentRow(student) {
  const photo = student.photoUrl
    ? `<img class="student-photo" src="${escapeHtml(student.photoUrl)}" alt="${escapeHtml(student.name)}">`
    : `<span class="student-photo placeholder">${escapeHtml(String(student.name || "?").slice(0, 1))}</span>`;

  return `
    <tr>
      <td><div class="student-name-cell">${photo}<strong>${escapeHtml(student.name)}</strong></div></td>
      <td>${student.grade}</td>
      <td>${escapeHtml(student.classNo || "-")}</td>
      <td>${escapeHtml(student.email || "-")}</td>
      <td>${student.currentScore || 0}</td>
      <td>${formatDate(student.lastTransactionAt || student.updatedAt)}</td>
      <td>
        <div class="card-actions">
          <button type="button" data-edit="${student.id}">編輯</button>
          <button class="danger-button" type="button" data-delete="${student.id}">刪除</button>
          <button class="secondary-button" type="button" data-history="${student.id}">紀錄</button>
        </div>
      </td>
    </tr>
  `;
}

function openCreateDialog() {
  studentForm.reset();
  fields.id.value = "";
  studentFormTitle.textContent = "新增學生";
  clearFieldErrors();
  hideFormError();
  updatePhotoPreview();
  studentDialog.showModal();
  fields.name.focus();
}

function openEditDialog(id) {
  const student = students.find((entry) => entry.id === id);
  if (!student) return;
  fields.id.value = student.id;
  fields.name.value = student.name;
  fields.grade.value = student.grade;
  fields.classNo.value = student.classNo || "";
  fields.email.value = student.email || "";
  fields.photoUrl.value = student.photoUrl || "";
  studentFormTitle.textContent = "編輯學生";
  clearFieldErrors();
  hideFormError();
  updatePhotoPreview();
  studentDialog.showModal();
  fields.name.focus();
}

async function saveStudent(event) {
  event.preventDefault();
  clearFieldErrors();
  const payload = {
    name: fields.name.value.trim(),
    grade: Number(fields.grade.value),
    classNo: fields.classNo.value.trim(),
    email: fields.email.value.trim(),
    photoUrl: fields.photoUrl.value.trim(),
  };
  const validation = validateStudent(payload);
  if (!validation.valid) {
    showFieldError(validation.field, validation.message);
    return showFormError(validation.message);
  }
  const id = fields.id.value;
  const url = id ? `/api/students/${id}` : "/api/students";
  const method = id ? "PUT" : "POST";

  AppUI.showLoading("儲存學生資料...");
  try {
    await requestJson(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    closeStudentDialog();
    AppUI.toast(id ? "學生資料已更新" : "學生已新增");
    await loadStudents();
  } catch (error) {
    showFormError(error.message);
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

async function deleteStudent(id) {
  const student = students.find((entry) => entry.id === id);
  if (!student || !confirm(`確定要刪除「${student.name}」嗎？`)) return;
  AppUI.showLoading("刪除學生...");
  try {
    await requestJson(`/api/students/${id}`, { method: "DELETE" });
    AppUI.toast("學生已刪除");
    await loadStudents();
  } catch (error) {
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function openHistory(id) {
  window.location.href = `/audit-logs?tableName=Student&recordId=${encodeURIComponent(id)}`;
}

function closeStudentDialog() {
  studentDialog.close();
}

function updatePhotoPreview() {
  const preview = document.querySelector("#studentPhotoPreview");
  preview.src = fields.photoUrl.value.trim();
  preview.classList.toggle("hidden", !fields.photoUrl.value.trim());
}

function validateStudent(data) {
  if (!data.name) return { valid: false, field: "name", message: "請輸入學生姓名" };
  if (!Number.isInteger(data.grade) || data.grade < 1 || data.grade > 9) {
    return { valid: false, field: "grade", message: "年級必須是 1 到 9 的整數" };
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { valid: false, field: "email", message: "Email 格式不正確" };
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
  studentForm.querySelectorAll(".field-error").forEach((node) => node.remove());
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
