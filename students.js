const tableBody = document.querySelector("#studentsTableBody");
const emptyStudents = document.querySelector("#emptyStudents");
const studentCount = document.querySelector("#studentCount");
const addStudentButton = document.querySelector("#addStudentButton");
const studentDialog = document.querySelector("#studentDialog");
const historyDialog = document.querySelector("#historyDialog");
const studentForm = document.querySelector("#studentForm");
const studentFormTitle = document.querySelector("#studentFormTitle");
const formError = document.querySelector("#formError");
const historyContent = document.querySelector("#historyContent");

const fields = {
  id: document.querySelector("#studentId"),
  name: document.querySelector("#name"),
  grade: document.querySelector("#grade"),
  classNo: document.querySelector("#classNo"),
  email: document.querySelector("#email"),
  photoUrl: document.querySelector("#photoUrl"),
};

let students = [];

addStudentButton.addEventListener("click", openCreateDialog);
studentForm.addEventListener("submit", saveStudent);
document.querySelector("#closeStudentDialog").addEventListener("click", closeStudentDialog);
document.querySelector("#cancelStudentForm").addEventListener("click", closeStudentDialog);
document.querySelector("#closeHistoryDialog").addEventListener("click", () => historyDialog.close());

loadStudents();

async function loadStudents() {
  try {
    students = await requestJson("/api/students");
    renderStudents();
  } catch (error) {
    tableBody.innerHTML = "";
    emptyStudents.classList.remove("hidden");
    emptyStudents.textContent = error.message;
    studentCount.textContent = "載入失敗";
  }
}

function renderStudents() {
  studentCount.textContent = `共 ${students.length} 位學生`;
  emptyStudents.classList.toggle("hidden", students.length > 0);

  tableBody.innerHTML = students.map(renderStudentRow).join("");

  tableBody.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openEditDialog(button.dataset.edit));
  });

  tableBody.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteStudent(button.dataset.delete));
  });

  tableBody.querySelectorAll("[data-history]").forEach((button) => {
    button.addEventListener("click", () => openHistory(button.dataset.history));
  });
}

function renderStudentRow(student) {
  const photo = student.photoUrl
    ? `<img class="student-photo" src="${escapeHtml(student.photoUrl)}" alt="${escapeHtml(student.name)}">`
    : `<span class="student-photo placeholder">${escapeHtml(student.name.slice(0, 1))}</span>`;

  return `
    <tr>
      <td>
        <div class="student-name-cell">
          ${photo}
          <strong>${escapeHtml(student.name)}</strong>
        </div>
      </td>
      <td>${student.grade}</td>
      <td>${escapeHtml(student.classNo || "-")}</td>
      <td>${escapeHtml(student.email || "-")}</td>
      <td>${student.currentScore}</td>
      <td>${formatDate(student.lastTransactionAt || student.updatedAt)}</td>
      <td>
        <div class="card-actions">
          <button type="button" data-edit="${student.id}">修改</button>
          <button class="danger-button" type="button" data-delete="${student.id}">刪除</button>
          <button class="secondary-button" type="button" data-history="${student.id}">查看歷程</button>
        </div>
      </td>
    </tr>
  `;
}

function openCreateDialog() {
  studentForm.reset();
  fields.id.value = "";
  studentFormTitle.textContent = "新增學生";
  hideFormError();
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
  studentFormTitle.textContent = "修改學生";
  hideFormError();
  studentDialog.showModal();
  fields.name.focus();
}

async function saveStudent(event) {
  event.preventDefault();

  const payload = {
    name: fields.name.value.trim(),
    grade: Number(fields.grade.value),
    classNo: fields.classNo.value.trim(),
    email: fields.email.value.trim(),
    photoUrl: fields.photoUrl.value.trim(),
  };

  const validation = validateStudent(payload);
  if (!validation.valid) {
    return showFormError(validation.message);
  }

  const id = fields.id.value;
  const url = id ? `/api/students/${id}` : "/api/students";
  const method = id ? "PUT" : "POST";

  try {
    await requestJson(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    closeStudentDialog();
    await loadStudents();
  } catch (error) {
    showFormError(error.message);
  }
}

async function deleteStudent(id) {
  const student = students.find((entry) => entry.id === id);
  if (!student || !confirm(`確定要刪除「${student.name}」嗎？`)) {
    return;
  }

  await requestJson(`/api/students/${id}`, { method: "DELETE" });
  await loadStudents();
}

async function openHistory(id) {
  historyContent.innerHTML = `<p class="meta">載入中</p>`;
  historyDialog.showModal();

  try {
    const logs = await requestJson(`/api/students/${id}/audit-logs`);
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

function validateStudent(data) {
  if (!data.name) {
    return { valid: false, message: "請輸入學生名稱" };
  }

  if (!Number.isInteger(data.grade) || data.grade < 1 || data.grade > 9) {
    return { valid: false, message: "年級必須是 1 到 9 的整數" };
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { valid: false, message: "email 格式不正確" };
  }

  if (data.photoUrl) {
    try {
      new URL(data.photoUrl);
    } catch {
      return { valid: false, message: "照片網址格式不正確" };
    }
  }

  return { valid: true };
}

function closeStudentDialog() {
  hideFormError();
  studentDialog.close();
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
