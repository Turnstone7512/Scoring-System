const STORAGE_KEY = "elementaryPointSystem";

const state = loadState();

const elements = {
  tabButtons: document.querySelectorAll(".tab-button"),
  panels: document.querySelectorAll(".tab-panel"),
  exportButton: document.querySelector("#exportButton"),
  rewardForm: document.querySelector("#rewardForm"),
  rewardId: document.querySelector("#rewardId"),
  rewardName: document.querySelector("#rewardName"),
  rewardImage: document.querySelector("#rewardImage"),
  rewardPoints: document.querySelector("#rewardPoints"),
  rewardList: document.querySelector("#rewardList"),
  cancelRewardEdit: document.querySelector("#cancelRewardEdit"),
  penaltyForm: document.querySelector("#penaltyForm"),
  penaltyId: document.querySelector("#penaltyId"),
  penaltyName: document.querySelector("#penaltyName"),
  penaltyPoints: document.querySelector("#penaltyPoints"),
  penaltyList: document.querySelector("#penaltyList"),
  cancelPenaltyEdit: document.querySelector("#cancelPenaltyEdit"),
  studentForm: document.querySelector("#studentForm"),
  studentId: document.querySelector("#studentId"),
  studentName: document.querySelector("#studentName"),
  studentGrade: document.querySelector("#studentGrade"),
  studentList: document.querySelector("#studentList"),
  cancelStudentEdit: document.querySelector("#cancelStudentEdit"),
};

elements.tabButtons.forEach((button) => {
  button.addEventListener("click", () => showTab(button.dataset.tab));
});

elements.rewardForm.addEventListener("submit", handleRewardSubmit);
elements.penaltyForm.addEventListener("submit", handlePenaltySubmit);
elements.studentForm.addEventListener("submit", handleStudentSubmit);
elements.cancelRewardEdit.addEventListener("click", resetRewardForm);
elements.cancelPenaltyEdit.addEventListener("click", resetPenaltyForm);
elements.cancelStudentEdit.addEventListener("click", resetStudentForm);
elements.exportButton.addEventListener("click", exportData);

renderAll();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return { rewards: [], penalties: [], students: [] };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      rewards: parsed.rewards || [],
      penalties: parsed.penalties || [],
      students: parsed.students || [],
    };
  } catch {
    return { rewards: [], penalties: [], students: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function showTab(tabName) {
  elements.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  elements.panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabName);
  });
}

async function handleRewardSubmit(event) {
  event.preventDefault();
  const id = elements.rewardId.value;
  const now = getDateTimeText();
  const imageData = await readImage(elements.rewardImage.files[0]);
  const existing = state.rewards.find((item) => item.id === id);

  if (existing) {
    const previous = snapshotReward(existing);
    existing.name = elements.rewardName.value.trim();
    existing.points = Number(elements.rewardPoints.value);
    existing.image = imageData || existing.image;
    existing.updatedAt = now;
    existing.history.unshift({
      at: now,
      action: "修改",
      detail: `原資料：${previous}`,
    });
  } else {
    state.rewards.unshift({
      id: crypto.randomUUID(),
      name: elements.rewardName.value.trim(),
      points: Number(elements.rewardPoints.value),
      image: imageData,
      updatedAt: now,
      history: [{ at: now, action: "新增", detail: "建立加點項目" }],
    });
  }

  saveState();
  resetRewardForm();
  renderRewards();
}

function handlePenaltySubmit(event) {
  event.preventDefault();
  const id = elements.penaltyId.value;
  const now = getDateTimeText();
  const existing = state.penalties.find((item) => item.id === id);

  if (existing) {
    const previous = snapshotPenalty(existing);
    existing.name = elements.penaltyName.value.trim();
    existing.points = Number(elements.penaltyPoints.value);
    existing.updatedAt = now;
    existing.history.unshift({
      at: now,
      action: "修改",
      detail: `原資料：${previous}`,
    });
  } else {
    state.penalties.unshift({
      id: crypto.randomUUID(),
      name: elements.penaltyName.value.trim(),
      points: Number(elements.penaltyPoints.value),
      updatedAt: now,
      history: [{ at: now, action: "新增", detail: "建立扣點項目" }],
    });
  }

  saveState();
  resetPenaltyForm();
  renderPenalties();
}

function handleStudentSubmit(event) {
  event.preventDefault();
  const id = elements.studentId.value;
  const now = getDateTimeText();
  const existing = state.students.find((student) => student.id === id);

  if (existing) {
    const previous = snapshotStudent(existing);
    existing.name = elements.studentName.value.trim();
    existing.grade = elements.studentGrade.value;
    existing.updatedAt = now;
    existing.history = existing.history || [];
    existing.history.unshift({
      at: now,
      action: "修改",
      detail: `原資料：${previous}`,
    });
  } else {
    state.students.unshift({
      id: crypto.randomUUID(),
      name: elements.studentName.value.trim(),
      grade: elements.studentGrade.value,
      updatedAt: now,
      history: [{ at: now, action: "新增", detail: "建立學童資料" }],
    });
  }

  saveState();
  resetStudentForm();
  renderStudents();
}

function renderAll() {
  renderRewards();
  renderPenalties();
  renderStudents();
}

function renderRewards() {
  if (!state.rewards.length) {
    elements.rewardList.innerHTML = `<div class="empty-state">尚未新增加點項目</div>`;
    return;
  }

  elements.rewardList.innerHTML = state.rewards.map(renderRewardCard).join("");
  elements.rewardList.querySelectorAll("[data-edit-reward]").forEach((button) => {
    button.addEventListener("click", () => editReward(button.dataset.editReward));
  });
  elements.rewardList.querySelectorAll("[data-delete-reward]").forEach((button) => {
    button.addEventListener("click", () => deleteItem("rewards", button.dataset.deleteReward, renderRewards));
  });
}

function renderPenalties() {
  if (!state.penalties.length) {
    elements.penaltyList.innerHTML = `<div class="empty-state">尚未新增扣點項目</div>`;
    return;
  }

  elements.penaltyList.innerHTML = state.penalties.map(renderPenaltyCard).join("");
  elements.penaltyList.querySelectorAll("[data-edit-penalty]").forEach((button) => {
    button.addEventListener("click", () => editPenalty(button.dataset.editPenalty));
  });
  elements.penaltyList.querySelectorAll("[data-delete-penalty]").forEach((button) => {
    button.addEventListener("click", () => deleteItem("penalties", button.dataset.deletePenalty, renderPenalties));
  });
}

function renderStudents() {
  if (!state.students.length) {
    elements.studentList.innerHTML = `<div class="empty-state">尚未新增學童資料</div>`;
    return;
  }

  elements.studentList.innerHTML = state.students.map(renderStudentRow).join("");
  elements.studentList.querySelectorAll("[data-edit-student]").forEach((button) => {
    button.addEventListener("click", () => editStudent(button.dataset.editStudent));
  });
  elements.studentList.querySelectorAll("[data-delete-student]").forEach((button) => {
    button.addEventListener("click", () => deleteItem("students", button.dataset.deleteStudent, renderStudents));
  });
}

function renderRewardCard(item) {
  const image = item.image
    ? `<img class="item-image" src="${item.image}" alt="${escapeHtml(item.name)}">`
    : `<div class="item-image placeholder-image">無圖片</div>`;

  return `
    <article class="item-card">
      ${image}
      <h3>${escapeHtml(item.name)}</h3>
      <p><span class="points">+${item.points} 點</span></p>
      <p class="meta">更新日期：${item.updatedAt}</p>
      ${renderHistory(item.history)}
      <div class="card-actions">
        <button type="button" data-edit-reward="${item.id}">修改</button>
        <button class="danger-button" type="button" data-delete-reward="${item.id}">刪除</button>
      </div>
    </article>
  `;
}

function renderPenaltyCard(item) {
  return `
    <article class="item-card">
      <h3>${escapeHtml(item.name)}</h3>
      <p><span class="points">-${item.points} 點</span></p>
      <p class="meta">更新日期：${item.updatedAt}</p>
      ${renderHistory(item.history)}
      <div class="card-actions">
        <button type="button" data-edit-penalty="${item.id}">修改</button>
        <button class="danger-button" type="button" data-delete-penalty="${item.id}">刪除</button>
      </div>
    </article>
  `;
}

function renderStudentRow(student) {
  return `
    <article class="student-row">
      <div>
        <h3>${escapeHtml(student.name)}</h3>
        <p class="meta">${student.grade}｜更新日期：${student.updatedAt}</p>
        ${renderHistory(student.history)}
      </div>
      <div class="card-actions">
        <button type="button" data-edit-student="${student.id}">修改</button>
        <button class="danger-button" type="button" data-delete-student="${student.id}">刪除</button>
      </div>
    </article>
  `;
}

function renderHistory(history = []) {
  if (!history.length) {
    return "";
  }

  const items = history
    .map((entry) => `<li>${entry.at}｜${entry.action}｜${escapeHtml(entry.detail)}</li>`)
    .join("");

  return `
    <details class="history">
      <summary>更新歷程（${history.length}）</summary>
      <ul>${items}</ul>
    </details>
  `;
}

function editReward(id) {
  const item = state.rewards.find((reward) => reward.id === id);
  if (!item) return;

  elements.rewardForm.querySelector("h2").textContent = "修改加點項目";
  elements.rewardId.value = item.id;
  elements.rewardName.value = item.name;
  elements.rewardPoints.value = item.points;
  elements.cancelRewardEdit.classList.remove("hidden");
  elements.rewardName.focus();
}

function editPenalty(id) {
  const item = state.penalties.find((penalty) => penalty.id === id);
  if (!item) return;

  elements.penaltyForm.querySelector("h2").textContent = "修改扣點項目";
  elements.penaltyId.value = item.id;
  elements.penaltyName.value = item.name;
  elements.penaltyPoints.value = item.points;
  elements.cancelPenaltyEdit.classList.remove("hidden");
  elements.penaltyName.focus();
}

function editStudent(id) {
  const student = state.students.find((entry) => entry.id === id);
  if (!student) return;

  elements.studentForm.querySelector("h2").textContent = "修改學童";
  elements.studentId.value = student.id;
  elements.studentName.value = student.name;
  elements.studentGrade.value = student.grade;
  elements.cancelStudentEdit.classList.remove("hidden");
  elements.studentName.focus();
}

function deleteItem(collectionName, id, render) {
  if (!confirm("確定要刪除這筆資料嗎？")) {
    return;
  }

  const collection = state[collectionName];
  const index = collection.findIndex((item) => item.id === id);
  if (index >= 0) {
    collection.splice(index, 1);
    saveState();
    render();
  }
}

function resetRewardForm() {
  elements.rewardForm.reset();
  elements.rewardId.value = "";
  elements.rewardForm.querySelector("h2").textContent = "新增加點項目";
  elements.cancelRewardEdit.classList.add("hidden");
}

function resetPenaltyForm() {
  elements.penaltyForm.reset();
  elements.penaltyId.value = "";
  elements.penaltyForm.querySelector("h2").textContent = "新增扣點項目";
  elements.cancelPenaltyEdit.classList.add("hidden");
}

function resetStudentForm() {
  elements.studentForm.reset();
  elements.studentId.value = "";
  elements.studentForm.querySelector("h2").textContent = "新增學童";
  elements.cancelStudentEdit.classList.add("hidden");
}

function readImage(file) {
  if (!file) {
    return Promise.resolve("");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function snapshotReward(item) {
  return `項目「${item.name}」、點數 ${item.points}、更新日期 ${item.updatedAt}`;
}

function snapshotPenalty(item) {
  return `項目「${item.name}」、點數 ${item.points}、更新日期 ${item.updatedAt}`;
}

function snapshotStudent(student) {
  return `人名「${student.name}」、年級 ${student.grade}、更新日期 ${student.updatedAt}`;
}

function getDateTimeText() {
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

function exportData() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `point-system-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
