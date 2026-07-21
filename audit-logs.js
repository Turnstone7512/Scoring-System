const searchForm = document.querySelector("#auditSearchForm");
const clearButton = document.querySelector("#clearButton");
const auditList = document.querySelector("#auditList");
const emptyAuditLogs = document.querySelector("#emptyAuditLogs");
const resultCount = document.querySelector("#resultCount");

const fields = {
  tableName: document.querySelector("#tableName"),
  action: document.querySelector("#action"),
  dateFrom: document.querySelector("#dateFrom"),
  dateTo: document.querySelector("#dateTo"),
  recordId: document.querySelector("#recordId"),
};

let auditLogs = [];
let students = [];
let studentNameById = new Map();
let studentById = new Map();
let measurementRows = [];
let searchTerm = "";
let currentPage = 1;
const pageSize = 20;

const tableLabels = {
  Student: "學生資料",
  ScoreItem: "獎懲項目",
  ScoreTransaction: "學生點數",
  StudentMeasurement: "身高體重",
  UserAccount: "使用者帳號",
};

const actionLabels = {
  CREATE: "新增",
  UPDATE: "修改",
  DELETE: "刪除",
};
const percentileMarks = [3, 25, 50, 75, 97];
const growthReference = {
  FEMALE: {
    height: [[0, 45.6, 47.9, 49.1, 50.4, 52.7], [1, 69.2, 72.3, 74, 75.8, 78.9], [2, 80.3, 84.2, 86.4, 88.6, 92.5], [3, 87.9, 92.5, 95.1, 97.6, 102.2], [4, 94.6, 99.8, 102.7, 105.6, 110.8], [5, 100.5, 106.2, 109.4, 112.6, 118.4], [6, 105.5, 111.3, 114.8, 118, 124.2], [7, 110.6, 116.4, 120.3, 123.5, 130.1], [8, 115.7, 122, 125.8, 129.2, 136.5], [9, 120.7, 127.5, 131.3, 135.4, 143.5], [10, 125.8, 133, 137.5, 142.3, 150.8], [11, 131.8, 139.8, 144.5, 149.4, 157.3], [12, 137.9, 146.3, 150.5, 154.9, 161.8], [13, 143.2, 150.7, 154.5, 158.4, 164.8], [14, 146.8, 153.2, 156.8, 160.4, 167], [15, 148.5, 154.5, 157.9, 161.5, 168.2], [16, 149.5, 155.3, 158.7, 162.3, 168.8], [17, 150, 155.8, 159.3, 162.8, 169], [18, 150, 156, 159.5, 163, 169]],
    weight: [[0, 2.4, 2.9, 3.2, 3.6, 4.2], [1, 7.1, 8.2, 8.9, 9.7, 11.3], [2, 9.2, 10.6, 11.5, 12.5, 14.6], [3, 11, 12.7, 13.9, 15.1, 17.8], [4, 12.5, 14.7, 16.1, 17.7, 21.1], [5, 14, 16.5, 18.2, 20.2, 24.4], [6, 15.9, 18.5, 20.5, 22.8, 28.6], [7, 17.8, 20.6, 22.8, 25.3, 32.9], [8, 19.6, 22.8, 25.4, 28.4, 37.8], [9, 21.5, 25.3, 28.2, 32.1, 42.8], [10, 23.8, 28.3, 31.8, 36.7, 47.3], [11, 26.5, 32.5, 36.9, 42.2, 52.7], [12, 29.8, 37.1, 41.7, 47, 57.8], [13, 33.5, 40.9, 45.4, 50.5, 61.2], [14, 37.1, 43.8, 48.1, 53, 63.9], [15, 39.3, 45.7, 49.6, 54.5, 65.5], [16, 40.5, 46.7, 50.5, 55, 66.2], [17, 41.5, 47.2, 51, 55, 66.7], [18, 42, 47.3, 51, 55, 67]],
  },
  MALE: {
    height: [[0, 46.3, 48.6, 49.9, 51.2, 53.4], [1, 71.3, 74.1, 75.7, 77.4, 80.2], [2, 82.1, 85.8, 87.8, 89.9, 93.6], [3, 89.1, 93.6, 96.1, 98.6, 103.1], [4, 95.4, 100.5, 103.5, 106.2, 111.2], [5, 101.2, 106.8, 110, 113.1, 118.7], [6, 106.5, 112.3, 115.6, 118.9, 124.9], [7, 111.8, 117.8, 121.2, 124.6, 131.2], [8, 117, 123.3, 126.8, 130.3, 137.2], [9, 121.8, 128, 131.8, 135.5, 142.5], [10, 126, 132.5, 136.5, 140.5, 148.3], [11, 130.5, 137.8, 142, 146.7, 156.1], [12, 135.6, 143.8, 148.8, 154.2, 164.4], [13, 141.9, 151.5, 156.9, 162, 171], [14, 149.3, 159, 163.7, 168.3, 176], [15, 155.5, 163.5, 167.6, 171.8, 179], [16, 159.3, 166.2, 170, 173.8, 180.5], [17, 160.9, 167.7, 171.5, 174.8, 181.5], [18, 161.5, 168, 172, 175, 182]],
    weight: [[0, 2.5, 3, 3.3, 3.7, 4.3], [1, 7.8, 9, 9.6, 10.4, 11.8], [2, 9.8, 11.3, 12.2, 13.1, 15.1], [3, 11.4, 13.2, 14.3, 15.6, 18], [4, 12.9, 15, 16.3, 17.8, 20.9], [5, 14.3, 16.7, 18.3, 20.1, 23.8], [6, 16.3, 19, 20.9, 23.2, 29.2], [7, 18.4, 21.3, 23.6, 26.3, 34.7], [8, 20.3, 23.8, 26.3, 29.6, 40.2], [9, 22.1, 26, 28.8, 32.7, 44.3], [10, 24, 28.4, 31.5, 36, 48.6], [11, 26.3, 31.4, 35.3, 40.8, 54.8], [12, 29.3, 35.2, 40.3, 46.5, 61.5], [13, 32.8, 40.7, 46.5, 53, 68.5], [14, 38, 46.8, 52.5, 58.7, 74.3], [15, 43, 51.3, 56.5, 62.5, 77.6], [16, 46.8, 54.1, 59, 65, 79.3], [17, 49.3, 56.1, 61, 66.6, 80], [18, 50.3, 57.5, 62.5, 67.6, 80]],
  },
};

insertAuditControls();

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadAuditLogs();
});

clearButton.addEventListener("click", () => {
  searchForm.reset();
  history.replaceState(null, "", "audit-logs.html");
  loadAuditLogs();
});

init();

async function init() {
  applyInitialQueryParams();
  await Promise.all([loadStudents(), loadMeasurements()]);
  await loadAuditLogs();
}

function applyInitialQueryParams() {
  const params = new URLSearchParams(window.location.search);
  fields.tableName.value = params.get("tableName") || "";
  fields.action.value = params.get("action") || "";
  fields.dateFrom.value = params.get("dateFrom") || "";
  fields.dateTo.value = params.get("dateTo") || "";
  fields.recordId.value = params.get("recordId") || "";
}

async function loadStudents() {
  try {
    students = await requestJson("/api/students");
    studentNameById = new Map(students.map((student) => [String(student.id), student.name]));
    studentById = new Map(students.map((student) => [String(student.id), student]));
  } catch (error) {
    students = [];
    studentNameById = new Map();
    studentById = new Map();
  }
}

async function loadMeasurements() {
  try {
    measurementRows = await requestJson("/api/student-measurements");
  } catch {
    measurementRows = [];
  }
}

async function loadAuditLogs() {
  AppUI.showLoading("載入異動紀錄...");
  try {
    const params = new URLSearchParams();
    if (fields.tableName.value) params.set("tableName", fields.tableName.value);
    if (fields.action.value) params.set("action", fields.action.value);
    if (fields.dateFrom.value) params.set("dateFrom", fields.dateFrom.value);
    if (fields.dateTo.value) params.set("dateTo", fields.dateTo.value);
    if (fields.recordId.value.trim()) params.set("recordId", fields.recordId.value.trim());
    const query = params.toString() ? `?${params.toString()}` : "";
    history.replaceState(null, "", `audit-logs.html${query}`);
    auditLogs = await requestJson(`/api/audit-logs${query}`);
    renderAuditLogs();
  } catch (error) {
    auditList.innerHTML = "";
    emptyAuditLogs.classList.remove("hidden");
    emptyAuditLogs.textContent = error.message;
    resultCount.textContent = "載入失敗";
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function insertAuditControls() {
  document.querySelector("#auditList").insertAdjacentHTML("beforebegin", `
    <div class="utility-row">
      <input id="auditKeywordSearch" class="table-search" type="search" placeholder="搜尋資料類型、recordId 或異動內容" />
      <div id="auditPagination" class="pagination"></div>
    </div>
  `);
  document.querySelector("#auditList").insertAdjacentHTML("afterend", `<div id="auditPaginationBottom" class="pagination"></div>`);
  document.querySelector("#auditKeywordSearch").addEventListener("input", (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    currentPage = 1;
    renderAuditLogs();
  });
}

function renderAuditLogs() {
  const filtered = auditLogs.filter((log) => {
    const haystack = `${log.tableName} ${log.recordId} ${log.action} ${formatAuditSearchText(log.oldValue)} ${formatAuditSearchText(log.newValue)}`.toLowerCase();
    return haystack.includes(searchTerm);
  });
  const pageResult = AppUI.paginate(filtered, currentPage, pageSize);
  currentPage = pageResult.page;

  resultCount.textContent = `共 ${filtered.length} 筆紀錄`;
  emptyAuditLogs.classList.toggle("hidden", pageResult.items.length > 0);
  auditList.innerHTML = pageResult.items.map(renderAuditLogCard).join("");
  AppUI.renderPagination(document.querySelector("#auditPagination"), currentPage, pageResult.totalPages, (page) => {
    currentPage = page;
    renderAuditLogs();
  });
  AppUI.renderPagination(document.querySelector("#auditPaginationBottom"), currentPage, pageResult.totalPages, (page) => {
    currentPage = page;
    renderAuditLogs();
  });
}

function renderAuditLogCard(log) {
  const spec = getTableSpec(log.tableName, log);
  return `
    <article class="audit-card">
      <div class="audit-card-header">
        <div>
          <h3>${formatDate(log.createdAt)}</h3>
          <p class="meta">資料類型：${escapeHtml(tableLabels[log.tableName] || log.tableName)}，recordId：${escapeHtml(log.recordId || "-")}</p>
        </div>
        <span class="action-pill ${String(log.action).toLowerCase()}">${escapeHtml(actionLabels[log.action] || log.action)}</span>
      </div>
      <div class="audit-table-wrap">
        <table class="audit-change-table">
          <thead>
            <tr>
              <th>狀態</th>
              ${spec.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${renderChangeRows(log, spec)}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function renderChangeRows(log, spec) {
  if (log.action === "CREATE") {
    return renderChangeRow("新增", spec, log.newValue, log.oldValue, log.newValue);
  }
  return `
    ${renderChangeRow("修改前", spec, log.oldValue, log.oldValue, log.newValue)}
    ${renderChangeRow("修改後", spec, log.newValue, log.oldValue, log.newValue)}
  `;
}

function renderChangeRow(label, spec, value, oldValue, newValue) {
  return `
    <tr>
      <th>${label}</th>
      ${spec.map((column) => {
        const oldDisplay = column.value(oldValue, oldValue, newValue, "修改前");
        const newDisplay = column.value(newValue, oldValue, newValue, "修改後");
        const isChanged = normalizeValue(oldDisplay) !== normalizeValue(newDisplay);
        const className = isChanged ? getChangeClass(label) : "unchanged";
        return `<td class="${className}">${escapeHtml(column.value(value, oldValue, newValue, label))}</td>`;
      }).join("")}
    </tr>
  `;
}

function getChangeClass(label) {
  if (String(label).includes("前")) return "changed-before";
  if (String(label).includes("後") || String(label).includes("新增")) return "changed-after";
  return "changed";
}

function getTableSpec(tableName, log) {
  const withActor = (columns) => tableName === "StudentMeasurement"
    ? columns
    : [...columns, { label: "異動帳號", value: () => formatAuditActor(log) }];
  if (tableName === "Student") {
    return withActor([
      { label: "建立時間", value: (value) => formatDate(readValue(value, "created_at", "createdAt")) },
      { label: "姓名", value: (value) => readValue(value, "name") },
      { label: "性別", value: (value) => formatGender(readValue(value, "gender")) },
      { label: "座號", value: (value) => readValue(value, "class_no", "classNo") },
      { label: "目前點數", value: (value) => readValue(value, "current_score", "currentScore") },
      { label: "照片網址", value: (value) => readValue(value, "photo_url", "photoUrl") },
      { label: "是否有效", value: (value) => formatActive(value) },
    ]);
  }
  if (tableName === "ScoreItem") {
    return withActor([
      { label: "建立時間", value: (value) => formatDate(readValue(value, "created_at", "createdAt")) },
      { label: "適用學生", value: (value) => formatApplicableStudent(value) },
      { label: "項目", value: (value) => formatItemName(value) },
      { label: "點數", value: (value) => readValue(value, "score") },
      { label: "生效時間", value: (value) => formatDate(readValue(value, "updated_at", "updatedAt", "created_at", "createdAt")) },
      { label: "是否有效", value: (value) => formatActive(value) },
    ]);
  }
  if (tableName === "ScoreTransaction") {
    return withActor([
      { label: "狀態", value: (value) => formatTransactionStatus(value) },
      { label: "學生姓名", value: (value) => formatStudentName(value) },
      { label: "項目", value: (value) => formatTransactionItem(value) },
      { label: "異動點數", value: (value) => readValue(value, "score_change", "scoreChange") },
      { label: "結餘點數", value: (value) => readValue(value, "running_total_score", "runningTotalScore", "settlement_score", "settlementScore") },
      { label: "生效時間", value: (value) => formatDate(readValue(value, "transaction_date", "transactionDate")) },
    ]);
  }
  if (tableName === "StudentMeasurement") {
    return [
      { label: "日期", value: (value) => formatDate(readValue(value, "measurement_date", "measurementDate")) },
      { label: "學生姓名", value: (value) => formatMeasurementPersonName(value) },
      { label: "身高", value: (value) => formatNumber(readValue(value, "height_cm", "heightCm")) },
      { label: "身高PR", value: (value) => formatMeasurementPercentile(value, "height") },
      { label: "與前次差", value: (value) => formatMeasurementDelta(value, "height_cm", "heightCm") },
      { label: "體重", value: (value) => formatNumber(readValue(value, "weight_kg", "weightKg")) },
      { label: "體重PR", value: (value) => formatMeasurementPercentile(value, "weight") },
      { label: "與前次差", value: (value) => formatMeasurementDelta(value, "weight_kg", "weightKg") },
      { label: "量測地點", value: (value) => readValue(value, "location") },
    ];
  }
  return withActor([
    { label: "建立時間", value: (value) => formatDate(readValue(value, "created_at", "createdAt")) },
    { label: "內容", value: (value) => formatAuditSearchText(value) || "-" },
  ]);
}

function formatAuditActor(log) {
  return log?.changedByAccount || log?.changedById || "-";
}

function formatApplicableStudent(value) {
  const studentId = readValue(value, "student_id", "studentId");
  if (!studentId) return "共用";
  return studentNameById.get(String(studentId)) || studentId;
}

function formatStudentName(value) {
  const nestedName = readValue(value?.student, "name");
  if (nestedName) return nestedName;
  const studentId = readValue(value, "student_id", "studentId");
  if (!studentId) return "-";
  return studentNameById.get(String(studentId)) || studentId;
}

function formatMeasurementPersonName(value) {
  const personName = readValue(value, "person_name", "personName");
  if (personName) return personName;
  return formatStudentName(value);
}

function formatTransactionStatus(value) {
  if (value === null || value === undefined) return "-";
  if (isTruthy(readValue(value, "is_deleted", "isDeleted"))) return "無效";
  return "有效";
}

function formatTransactionItem(value) {
  const item = value?.score_item || value?.scoreItem;
  if (item) return formatItemName(item);
  const type = readValue(value, "type");
  if (type === "SETTLEMENT") return "結算";
  if (!readValue(value, "score_item_id", "scoreItemId")) return "結算";
  return readValue(value, "score_item_id", "scoreItemId");
}

function formatMeasurementPercentile(value, metric) {
  const amount = Number(readValue(value, metric === "height" ? "height_cm" : "weight_kg", metric === "height" ? "heightCm" : "weightKg"));
  if (!Number.isFinite(amount) || amount <= 0) return "-";
  const person = getMeasurementPerson(value);
  const percentile = estimatePercentile(person, metric, amount, readValue(value, "measurement_date", "measurementDate"));
  return formatPercentile(percentile);
}

function formatMeasurementDelta(value, snakeKey, camelKey) {
  const currentRawValue = readValue(value, snakeKey, camelKey);
  if (currentRawValue === "") return "-";
  const currentNumber = Number(currentRawValue);
  if (!Number.isFinite(currentNumber)) return "-";
  const previous = findPreviousMeasurement(value, snakeKey, camelKey);
  if (!previous) return "-";
  const previousRawValue = readValue(previous, snakeKey, camelKey);
  if (previousRawValue === "") return "-";
  const previousNumber = Number(previousRawValue);
  if (!Number.isFinite(previousNumber)) return "-";
  const diff = currentNumber - previousNumber;
  if (diff === 0) return "0";
  return `${diff > 0 ? "+" : ""}${formatNumber(diff)}`;
}

function findPreviousMeasurement(value, snakeKey, camelKey) {
  const personKey = getMeasurementPersonKey(value);
  const currentTime = getMeasurementTime(value);
  const lowerBoundTime = getThreeMonthsBeforeTime(value);
  const currentId = readValue(value, "id");
  if (!personKey || !Number.isFinite(currentTime) || !Number.isFinite(lowerBoundTime)) return null;
  return measurementRows
    .filter((row) => {
      const rowTime = getMeasurementTime(row);
      if (String(readValue(row, "id")) === String(currentId)) return false;
      if (getMeasurementPersonKey(row) !== personKey) return false;
      if (rowTime >= currentTime || rowTime < lowerBoundTime) return false;
      const rawAmount = readValue(row, snakeKey, camelKey);
      if (rawAmount === "") return false;
      const amount = Number(rawAmount);
      return Number.isFinite(amount);
    })
    .sort((a, b) => getMeasurementTime(b) - getMeasurementTime(a)
      || new Date(readValue(b, "created_at", "createdAt") || 0).getTime() - new Date(readValue(a, "created_at", "createdAt") || 0).getTime())[0] || null;
}

function getMeasurementPersonKey(value) {
  const personType = readValue(value, "person_type", "personType") || "STUDENT";
  const personKey = readValue(value, "person_key", "personKey", "student_id", "studentId");
  return personKey ? `${personType}:${personKey}` : "";
}

function getMeasurementTime(value) {
  const date = new Date(readValue(value, "measurement_date", "measurementDate"));
  return date.getTime();
}

function getThreeMonthsBeforeTime(value) {
  const date = new Date(readValue(value, "measurement_date", "measurementDate"));
  if (Number.isNaN(date.getTime())) return NaN;
  date.setMonth(date.getMonth() - 3);
  return date.getTime();
}

function getMeasurementPerson(value) {
  const studentId = readValue(value, "student_id", "studentId");
  const student = studentId ? studentById.get(String(studentId)) : null;
  return {
    gender: readValue(value, "gender") || student?.gender,
    birthYear: student?.birthYear,
    grade: student?.grade,
  };
}

function formatGender(value) {
  if (value === "MALE") return "男";
  if (value === "FEMALE") return "女";
  return "-";
}

function formatItemName(value) {
  const mainCategory = readValue(value, "main_category", "mainCategory");
  const subCategory = readValue(value, "sub_category", "subCategory");
  if (!mainCategory && !subCategory) return "-";
  if (!subCategory) return mainCategory;
  if (!mainCategory) return subCategory;
  return `${mainCategory} - ${subCategory}`;
}

function formatActive(value) {
  if (value === null || value === undefined) return "-";
  const isDeleted = readValue(value, "is_deleted", "isDeleted");
  if (isDeleted === null || isDeleted === undefined || isDeleted === "") return "-";
  return isTruthy(isDeleted) ? "否" : "是";
}

function readValue(value, ...keys) {
  if (value === null || value === undefined) return "";
  for (const key of keys) {
    if (value[key] !== null && value[key] !== undefined && value[key] !== "") return value[key];
  }
  return "";
}

function formatAuditSearchText(value) {
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

function normalizeValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isTruthy(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function estimatePercentile(person, metric, value, measurementDateValue) {
  if (!person || !person.gender || value === null || value === undefined || value === "") return null;
  const age = estimateAge(person, measurementDateValue);
  const reference = growthReference[person.gender]?.[metric]?.find((row) => row[0] === age);
  if (!reference) return null;
  return interpolatePercentile(Number(value), reference.slice(1));
}

function estimateAge(person, measurementDateValue) {
  const birthYear = Number(person.birthYear);
  if (Number.isInteger(birthYear) && birthYear > 1900) {
    const measurementYear = getMeasurementYear(measurementDateValue);
    if (!measurementYear) return null;
    return Math.min(18, Math.max(0, measurementYear - birthYear));
  }
  return estimateAgeFromGrade(person.grade);
}

function estimateAgeFromGrade(grade) {
  const gradeNumber = Number(grade);
  if (!Number.isFinite(gradeNumber)) return null;
  return Math.min(18, Math.max(0, Math.round(gradeNumber + 5)));
}

function getMeasurementYear(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getFullYear();
}

function interpolatePercentile(value, values) {
  if (!Number.isFinite(value)) return null;
  if (value <= values[0]) return clampPercent((value / values[0]) * percentileMarks[0]);
  for (let index = 1; index < values.length; index += 1) {
    if (value <= values[index]) {
      const startValue = values[index - 1];
      const endValue = values[index];
      const startPercent = percentileMarks[index - 1];
      const endPercent = percentileMarks[index];
      const ratio = endValue === startValue ? 0 : (value - startValue) / (endValue - startValue);
      return clampPercent(startPercent + ratio * (endPercent - startPercent));
    }
  }
  const tailSpan = Math.max(1, values[4] - values[3]);
  return clampPercent(percentileMarks[4] + ((value - values[4]) / tailSpan) * (100 - percentileMarks[4]));
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function formatPercentile(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(value)}%`;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, "");
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "請求失敗");
  return data;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function escapeHtml(value) {
  const safeValue = value === null || value === undefined || value === "" ? "-" : value;
  return String(safeValue)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
