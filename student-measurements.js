const chartStudentId = document.querySelector("#chartStudentId");
const detailStudentId = document.querySelector("#detailStudentId");
const formStudentId = document.querySelector("#formStudentId");
const measurementForm = document.querySelector("#measurementForm");
const measurementFormTitle = document.querySelector("#measurementFormTitle");
const measurementId = document.querySelector("#measurementId");
const measurementDate = document.querySelector("#measurementDate");
const locationSelect = document.querySelector("#locationSelect");
const locationInput = document.querySelector("#locationInput");
const heightCm = document.querySelector("#heightCm");
const weightKg = document.querySelector("#weightKg");
const note = document.querySelector("#note");
const cancelMeasurementEdit = document.querySelector("#cancelMeasurementEdit");
const formError = document.querySelector("#measurementFormError");
const chart = document.querySelector("#measurementChart");
const tableBody = document.querySelector("#measurementTableBody");
const emptyMeasurements = document.querySelector("#emptyMeasurements");
const measurementCount = document.querySelector("#measurementCount");

let students = [];
let detailRows = [];
let allMeasurements = [];

chartStudentId.addEventListener("change", loadChart);
detailStudentId.addEventListener("change", loadDetails);
locationSelect.addEventListener("change", syncLocationInput);
measurementForm.addEventListener("submit", saveMeasurement);
cancelMeasurementEdit.addEventListener("click", resetForm);

init();

async function init() {
  measurementDate.value = todayInputValue();
  AppUI.showLoading("載入身高體重...");
  try {
    students = await requestJson("/api/students");
    renderStudentOptions();
    await loadLocationOptions();
    await Promise.all([loadChart(), loadDetails()]);
  } catch (error) {
    AppUI.toast(error.message, "error");
    chart.innerHTML = `<div class="empty-state chart-empty">${escapeHtml(error.message)}</div>`;
    measurementCount.textContent = "載入失敗";
  } finally {
    AppUI.hideLoading();
  }
}

function renderStudentOptions() {
  const options = students
    .map((student) => `<option value="${student.id}">${escapeHtml(student.name)}${student.grade ? `（${student.grade}年級）` : ""}</option>`)
    .join("");
  const firstStudentId = students[0]?.id || "";
  chartStudentId.innerHTML = options || `<option value="">尚無學生</option>`;
  detailStudentId.innerHTML = options || `<option value="">尚無學生</option>`;
  formStudentId.innerHTML = options || `<option value="">尚無學生</option>`;
  chartStudentId.value = firstStudentId;
  detailStudentId.value = firstStudentId;
  formStudentId.value = firstStudentId;
}

async function loadLocationOptions(selectedLocation = "") {
  allMeasurements = await requestJson("/api/student-measurements");
  renderLocationOptions(selectedLocation);
}

function renderLocationOptions(selectedLocation = "") {
  const locations = [...new Set(allMeasurements.map((row) => row.location).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  locationSelect.innerHTML = `<option value="">自行輸入或空白</option>${locations
    .map((location) => `<option value="${escapeHtml(location)}">${escapeHtml(location)}</option>`)
    .join("")}`;
  if (selectedLocation && locations.includes(selectedLocation)) {
    locationSelect.value = selectedLocation;
    locationInput.value = selectedLocation;
  } else {
    locationSelect.value = "";
    locationInput.value = selectedLocation || "";
  }
}

function syncLocationInput() {
  locationInput.value = locationSelect.value;
  if (!locationSelect.value) locationInput.focus();
}

async function loadChart() {
  const studentId = chartStudentId.value;
  if (!studentId) {
    chart.innerHTML = `<div class="empty-state chart-empty">請先建立學生資料</div>`;
    return;
  }
  try {
    const rows = await requestJson(`/api/student-measurements?studentId=${encodeURIComponent(studentId)}`);
    renderChart([...rows].sort((a, b) => new Date(a.measurementDate) - new Date(b.measurementDate)));
  } catch (error) {
    chart.innerHTML = `<div class="empty-state chart-empty">${escapeHtml(error.message)}</div>`;
  }
}

async function loadDetails() {
  const studentId = detailStudentId.value;
  if (!studentId) {
    detailRows = [];
    renderDetails();
    return;
  }
  try {
    detailRows = await requestJson(`/api/student-measurements?studentId=${encodeURIComponent(studentId)}`);
    renderDetails();
  } catch (error) {
    tableBody.innerHTML = "";
    emptyMeasurements.classList.remove("hidden");
    emptyMeasurements.textContent = error.message;
    measurementCount.textContent = "載入失敗";
  }
}

function renderChart(rows) {
  const validRows = rows.filter((row) => row.heightCm !== null || row.weightKg !== null);
  if (!validRows.length) {
    chart.innerHTML = `<div class="empty-state chart-empty">這位學生目前沒有可繪製的身高體重紀錄</div>`;
    return;
  }

  const width = Math.max(680, validRows.length * 96);
  const height = 300;
  const padding = { top: 24, right: 32, bottom: 46, left: 54 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = validRows.flatMap((row) => [row.heightCm, row.weightKg]).filter((value) => value !== null && Number.isFinite(value));
  const minValue = Math.max(0, Math.floor(Math.min(...values) - 5));
  const maxValue = Math.ceil(Math.max(...values) + 5);
  const range = Math.max(1, maxValue - minValue);
  const x = (index) => padding.left + (validRows.length === 1 ? plotWidth / 2 : (index / (validRows.length - 1)) * plotWidth);
  const y = (value) => padding.top + ((maxValue - value) / range) * plotHeight;
  const ticks = makeTicks(minValue, maxValue);

  const grid = ticks.map((tick) => `
    <line class="chart-grid" x1="${padding.left}" x2="${width - padding.right}" y1="${y(tick)}" y2="${y(tick)}"></line>
    <text class="chart-label" x="${padding.left - 10}" y="${y(tick) + 4}" text-anchor="end">${tick}</text>
  `).join("");
  const labels = validRows.map((row, index) => `
    <text class="chart-label" x="${x(index)}" y="${height - 18}" text-anchor="middle">${escapeHtml(formatShortDate(row.measurementDate))}</text>
  `).join("");
  const heightSeries = renderSeries(validRows, "heightCm", "#0ea5e9", "身高", x, y);
  const weightSeries = renderSeries(validRows, "weightKg", "#f97316", "體重", x, y);

  chart.innerHTML = `
    <div class="chart-scroll">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="身高體重折線圖">
        ${grid}
        <line class="chart-axis" x1="${padding.left}" x2="${padding.left}" y1="${padding.top}" y2="${height - padding.bottom}"></line>
        <line class="chart-axis" x1="${padding.left}" x2="${width - padding.right}" y1="${height - padding.bottom}" y2="${height - padding.bottom}"></line>
        ${labels}
        ${heightSeries}
        ${weightSeries}
      </svg>
    </div>
    <div class="chart-legend">
      <span class="chart-legend-item"><i style="background:#0ea5e9"></i>身高（cm）</span>
      <span class="chart-legend-item"><i style="background:#f97316"></i>體重（kg）</span>
    </div>
  `;
}

function renderSeries(rows, key, color, label, x, y) {
  const points = rows
    .map((row, index) => ({ row, index, value: row[key] }))
    .filter((point) => point.value !== null && Number.isFinite(point.value));
  if (!points.length) return "";

  const pointText = points.map((point) => `${x(point.index)},${y(point.value)}`).join(" ");
  const dots = points.map((point) => `
    <circle class="chart-point" cx="${x(point.index)}" cy="${y(point.value)}" r="4" style="fill:${color}">
      <title>${label} ${formatDate(point.row.measurementDate)}：${point.value}</title>
    </circle>
  `).join("");
  return `<polyline class="chart-line" points="${pointText}" style="stroke:${color}"></polyline>${dots}`;
}

function renderDetails() {
  const sortedRows = [...detailRows].sort((a, b) => new Date(b.measurementDate) - new Date(a.measurementDate));
  measurementCount.textContent = `共 ${sortedRows.length} 筆紀錄`;
  emptyMeasurements.classList.toggle("hidden", sortedRows.length > 0);
  tableBody.innerHTML = sortedRows.map((row) => `
    <tr>
      <td>${formatDate(row.measurementDate)}</td>
      <td>${escapeHtml(row.student?.name || getStudentName(row.studentId))}</td>
      <td>${formatNumber(row.heightCm)}</td>
      <td>${formatNumber(row.weightKg)}</td>
      <td>${escapeHtml(row.location || "-")}</td>
      <td>${escapeHtml(row.note || "-")}</td>
      <td class="admin-only"><button class="secondary-button" type="button" data-edit="${row.id}">編輯</button></td>
    </tr>
  `).join("");
  tableBody.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openEditMode(button.dataset.edit));
  });
}

function openEditMode(id) {
  const row = detailRows.find((entry) => entry.id === id);
  if (!row) return;
  measurementId.value = row.id;
  measurementDate.value = row.measurementDate;
  formStudentId.value = row.studentId;
  heightCm.value = row.heightCm ?? "";
  weightKg.value = row.weightKg ?? "";
  note.value = row.note || "";
  renderLocationOptions(row.location || "");
  measurementFormTitle.textContent = "編輯身高體重";
  cancelMeasurementEdit.classList.remove("hidden");
  measurementForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function saveMeasurement(event) {
  event.preventDefault();
  hideFormError();
  const payload = {
    studentId: formStudentId.value,
    measurementDate: measurementDate.value,
    heightCm: heightCm.value,
    weightKg: weightKg.value,
    location: locationInput.value.trim(),
    note: note.value.trim(),
  };
  const validation = validateMeasurement(payload);
  if (!validation.valid) return showFormError(validation.message);

  const id = measurementId.value;
  const url = id ? `/api/student-measurements/${encodeURIComponent(id)}` : "/api/student-measurements";
  const method = id ? "PUT" : "POST";
  AppUI.showLoading(id ? "更新身高體重..." : "儲存身高體重...");
  try {
    await requestJson(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    AppUI.toast(id ? "身高體重已更新" : "身高體重已新增");
    chartStudentId.value = payload.studentId;
    detailStudentId.value = payload.studentId;
    resetForm({ keepStudentId: payload.studentId });
    await loadLocationOptions();
    await Promise.all([loadChart(), loadDetails()]);
  } catch (error) {
    showFormError(error.message);
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function resetForm(options = {}) {
  measurementId.value = "";
  measurementDate.value = todayInputValue();
  formStudentId.value = options.keepStudentId || detailStudentId.value || students[0]?.id || "";
  heightCm.value = "";
  weightKg.value = "";
  note.value = "";
  renderLocationOptions("");
  measurementFormTitle.textContent = "新增身高體重";
  cancelMeasurementEdit.classList.add("hidden");
  hideFormError();
}

function validateMeasurement(data) {
  if (!data.studentId) return { valid: false, message: "請選擇學生" };
  if (!data.measurementDate) return { valid: false, message: "請選擇日期" };
  if (data.heightCm !== "" && Number(data.heightCm) < 0) return { valid: false, message: "身高不可小於 0" };
  if (data.weightKg !== "" && Number(data.weightKg) < 0) return { valid: false, message: "體重不可小於 0" };
  return { valid: true };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "請求失敗");
  return data;
}

function makeTicks(minValue, maxValue) {
  const ticks = [];
  const step = Math.max(1, Math.ceil((maxValue - minValue) / 4 / 5) * 5);
  const first = Math.ceil(minValue / step) * step;
  for (let value = first; value <= maxValue; value += step) ticks.push(value);
  if (!ticks.includes(minValue)) ticks.unshift(minValue);
  if (!ticks.includes(maxValue)) ticks.push(maxValue);
  return [...new Set(ticks)];
}

function todayInputValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function getStudentName(studentId) {
  return students.find((student) => student.id === studentId)?.name || "-";
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function formatShortDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatNumber(value) {
  return value === null || value === undefined || value === "" ? "-" : Number(value).toFixed(1).replace(/\.0$/, "");
}

function showFormError(message) {
  formError.textContent = message;
  formError.classList.remove("hidden");
}

function hideFormError() {
  formError.textContent = "";
  formError.classList.add("hidden");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
