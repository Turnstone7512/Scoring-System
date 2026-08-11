const chartStudentId = document.querySelector("#chartStudentId");
const chartLocationFilter = document.querySelector("#chartLocationFilter");
const detailStudentId = document.querySelector("#detailStudentId");
const detailLocationFilter = document.querySelector("#detailLocationFilter");
const formStudentId = document.querySelector("#formStudentId");
const measurementForm = document.querySelector("#measurementForm");
const measurementFormTitle = document.querySelector("#measurementFormTitle");
const measurementId = document.querySelector("#measurementId");
const measurementDate = document.querySelector("#measurementDate");
const locationSelect = document.querySelector("#locationSelect");
const locationInput = document.querySelector("#locationInput");
const heightField = document.querySelector("#heightField");
const weightField = document.querySelector("#weightField");
const waistField = document.querySelector("#waistField");
const heightCm = document.querySelector("#heightCm");
const weightKg = document.querySelector("#weightKg");
const waistCm = document.querySelector("#waistCm");
const note = document.querySelector("#note");
const cancelMeasurementEdit = document.querySelector("#cancelMeasurementEdit");
const formError = document.querySelector("#measurementFormError");
const chart = document.querySelector("#measurementChart");
const downloadChartsButton = document.querySelector("#downloadCharts");
const tableHead = document.querySelector("#measurementTableHead");
const tableBody = document.querySelector("#measurementTableBody");
const emptyMeasurements = document.querySelector("#emptyMeasurements");
const measurementCount = document.querySelector("#measurementCount");
const detailSuggestion = document.querySelector("#detailSuggestion");
const toggleDetailList = document.querySelector("#toggleDetailList");
const detailListPanel = document.querySelector("#detailListPanel");
const rawMeasurementCount = document.querySelector("#rawMeasurementCount");
const rawTableHead = document.querySelector("#rawMeasurementTableHead");
const rawTableBody = document.querySelector("#rawMeasurementTableBody");
const rawEmptyMeasurements = document.querySelector("#rawEmptyMeasurements");
const temporaryPrForm = document.querySelector("#temporaryPrForm");
const temporaryPrFields = {
  name: document.querySelector("#temporaryPrName"),
  birthYear: document.querySelector("#temporaryPrBirthYear"),
  gender: document.querySelector("#temporaryPrGender"),
  height: document.querySelector("#temporaryPrHeight"),
  weight: document.querySelector("#temporaryPrWeight"),
};
const temporaryPrError = document.querySelector("#temporaryPrError");
const temporaryPrResult = document.querySelector("#temporaryPrResult");
const clearTemporaryPr = document.querySelector("#clearTemporaryPr");

let students = [];
let people = [];
let detailRows = [];
let allMeasurements = [];

const adminPeople = [
  { id: "ADMIN:Gink", personType: "ADMIN", personKey: "Gink", name: "Gink", gender: "MALE", isAdminPerson: true },
  { id: "ADMIN:Lelia", personType: "ADMIN", personKey: "Lelia", name: "Lelia", gender: "FEMALE", isAdminPerson: true },
];
const temporaryPrStorageKey = "scoringSystemTemporaryPr";

const growthReference = {
  FEMALE: {
    height: [
      [0, 45.6, 47.9, 49.1, 50.4, 52.7],
      [1, 69.2, 72.3, 74, 75.8, 78.9],
      [2, 80.3, 84.2, 86.4, 88.6, 92.5],
      [3, 87.9, 92.5, 95.1, 97.6, 102.2],
      [4, 94.6, 99.8, 102.7, 105.6, 110.8],
      [5, 100.5, 106.2, 109.4, 112.6, 118.4],
      [6, 105.5, 111.3, 114.8, 118, 124.2],
      [7, 110.6, 116.4, 120.3, 123.5, 130.1],
      [8, 115.7, 122, 125.8, 129.2, 136.5],
      [9, 120.7, 127.5, 131.3, 135.4, 143.5],
      [10, 125.8, 133, 137.5, 142.3, 150.8],
      [11, 131.8, 139.8, 144.5, 149.4, 157.3],
      [12, 137.9, 146.3, 150.5, 154.9, 161.8],
      [13, 143.2, 150.7, 154.5, 158.4, 164.8],
      [14, 146.8, 153.2, 156.8, 160.4, 167],
      [15, 148.5, 154.5, 157.9, 161.5, 168.2],
      [16, 149.5, 155.3, 158.7, 162.3, 168.8],
      [17, 150, 155.8, 159.3, 162.8, 169],
      [18, 150, 156, 159.5, 163, 169],
    ],
    weight: [
      [0, 2.4, 2.9, 3.2, 3.6, 4.2],
      [1, 7.1, 8.2, 8.9, 9.7, 11.3],
      [2, 9.2, 10.6, 11.5, 12.5, 14.6],
      [3, 11, 12.7, 13.9, 15.1, 17.8],
      [4, 12.5, 14.7, 16.1, 17.7, 21.1],
      [5, 14, 16.5, 18.2, 20.2, 24.4],
      [6, 15.9, 18.5, 20.5, 22.8, 28.6],
      [7, 17.8, 20.6, 22.8, 25.3, 32.9],
      [8, 19.6, 22.8, 25.4, 28.4, 37.8],
      [9, 21.5, 25.3, 28.2, 32.1, 42.8],
      [10, 23.8, 28.3, 31.8, 36.7, 47.3],
      [11, 26.5, 32.5, 36.9, 42.2, 52.7],
      [12, 29.8, 37.1, 41.7, 47, 57.8],
      [13, 33.5, 40.9, 45.4, 50.5, 61.2],
      [14, 37.1, 43.8, 48.1, 53, 63.9],
      [15, 39.3, 45.7, 49.6, 54.5, 65.5],
      [16, 40.5, 46.7, 50.5, 55, 66.2],
      [17, 41.5, 47.2, 51, 55, 66.7],
      [18, 42, 47.3, 51, 55, 67],
    ],
  },
  MALE: {
    height: [
      [0, 46.3, 48.6, 49.9, 51.2, 53.4],
      [1, 71.3, 74.1, 75.7, 77.4, 80.2],
      [2, 82.1, 85.8, 87.8, 89.9, 93.6],
      [3, 89.1, 93.6, 96.1, 98.6, 103.1],
      [4, 95.4, 100.5, 103.5, 106.2, 111.2],
      [5, 101.2, 106.8, 110, 113.1, 118.7],
      [6, 106.5, 112.3, 115.6, 118.9, 124.9],
      [7, 111.8, 117.8, 121.2, 124.6, 131.2],
      [8, 117, 123.3, 126.8, 130.3, 137.2],
      [9, 121.8, 128, 131.8, 135.5, 142.5],
      [10, 126, 132.5, 136.5, 140.5, 148.3],
      [11, 130.5, 137.8, 142, 146.7, 156.1],
      [12, 135.6, 143.8, 148.8, 154.2, 164.4],
      [13, 141.9, 151.5, 156.9, 162, 171],
      [14, 149.3, 159, 163.7, 168.3, 176],
      [15, 155.5, 163.5, 167.6, 171.8, 179],
      [16, 159.3, 166.2, 170, 173.8, 180.5],
      [17, 160.9, 167.7, 171.5, 174.8, 181.5],
      [18, 161.5, 168, 172, 175, 182],
    ],
    weight: [
      [0, 2.5, 3, 3.3, 3.7, 4.3],
      [1, 7.8, 9, 9.6, 10.4, 11.8],
      [2, 9.8, 11.3, 12.2, 13.1, 15.1],
      [3, 11.4, 13.2, 14.3, 15.6, 18],
      [4, 12.9, 15, 16.3, 17.8, 20.9],
      [5, 14.3, 16.7, 18.3, 20.1, 23.8],
      [6, 16.3, 19, 20.9, 23.2, 29.2],
      [7, 18.4, 21.3, 23.6, 26.3, 34.7],
      [8, 20.3, 23.8, 26.3, 29.6, 40.2],
      [9, 22.1, 26, 28.8, 32.7, 44.3],
      [10, 24, 28.4, 31.5, 36, 48.6],
      [11, 26.3, 31.4, 35.3, 40.8, 54.8],
      [12, 29.3, 35.2, 40.3, 46.5, 61.5],
      [13, 32.8, 40.7, 46.5, 53, 68.5],
      [14, 38, 46.8, 52.5, 58.7, 74.3],
      [15, 43, 51.3, 56.5, 62.5, 77.6],
      [16, 46.8, 54.1, 59, 65, 79.3],
      [17, 49.3, 56.1, 61, 66.6, 80],
      [18, 50.3, 57.5, 62.5, 67.6, 80],
    ],
  },
};

const percentileMarks = [3, 25, 50, 75, 97];

chartStudentId.addEventListener("change", syncStudentFilters);
detailStudentId.addEventListener("change", syncStudentFilters);
formStudentId.addEventListener("change", () => {
  chartStudentId.value = formStudentId.value;
  detailStudentId.value = formStudentId.value;
  updateMeasurementMode();
});
chartLocationFilter.addEventListener("change", syncLocationFilters);
detailLocationFilter.addEventListener("change", syncLocationFilters);
downloadChartsButton.addEventListener("click", downloadChartImage);
toggleDetailList?.addEventListener("click", () => {
  const isHidden = detailListPanel.classList.toggle("hidden");
  toggleDetailList.textContent = isHidden ? "顯示明細清單" : "隱藏明細清單";
  renderRawDetails();
});
locationSelect.addEventListener("change", syncLocationInput);
measurementForm.addEventListener("submit", saveMeasurement);
cancelMeasurementEdit.addEventListener("click", resetForm);
temporaryPrForm.addEventListener("submit", calculateTemporaryPr);
clearTemporaryPr.addEventListener("click", clearTemporaryPrCache);

init();

async function init() {
  measurementDate.value = todayInputValue();
  AppUI.showLoading("載入身高體重...");
  try {
    students = await requestJson("/api/students");
    renderStudentOptions();
    restoreTemporaryPr();
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
  people = [
    ...students.map((student) => ({
      ...student,
      id: `STUDENT:${student.id}`,
      personType: "STUDENT",
      personKey: student.id,
      isAdminPerson: false,
    })),
    ...adminPeople,
  ];
  const options = people
    .map((person) => `<option value="${person.id}">${escapeHtml(person.name)}${person.grade ? `（${person.grade}年級）` : ""}</option>`)
    .join("");
  const firstStudentId = people[0]?.id || "";
  chartStudentId.innerHTML = options || `<option value=""></option>`;
  detailStudentId.innerHTML = options || `<option value=""></option>`;
  formStudentId.innerHTML = options || `<option value=""></option>`;
  chartStudentId.value = firstStudentId;
  detailStudentId.value = firstStudentId;
  formStudentId.value = firstStudentId;
  updateMeasurementMode();
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
  const filterOptions = `<option value="">全部</option>${locations
    .map((location) => `<option value="${escapeHtml(location)}">${escapeHtml(location)}</option>`)
    .join("")}`;
  const chartLocationValue = chartLocationFilter.value;
  const detailLocationValue = detailLocationFilter.value;
  const sharedLocationValue = chartLocationValue || detailLocationValue;
  chartLocationFilter.innerHTML = filterOptions;
  detailLocationFilter.innerHTML = filterOptions;
  const nextLocationValue = locations.includes(sharedLocationValue) ? sharedLocationValue : "";
  chartLocationFilter.value = nextLocationValue;
  detailLocationFilter.value = nextLocationValue;
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

function syncStudentFilters(event) {
  const studentId = event.target.value;
  chartStudentId.value = studentId;
  detailStudentId.value = studentId;
  formStudentId.value = studentId;
  updateMeasurementMode();
  loadPageData();
}

function syncLocationFilters(event) {
  const location = event.target.value;
  chartLocationFilter.value = location;
  detailLocationFilter.value = location;
  loadPageData();
}

function loadPageData() {
  return Promise.all([loadChart(), loadDetails()]);
}

function updateMeasurementMode() {
  const person = getPerson(detailStudentId.value || chartStudentId.value || formStudentId.value);
  const isAdminPerson = Boolean(person?.isAdminPerson);
  waistField.classList.toggle("hidden", !isAdminPerson);
  renderGrowthTableHeader();
  renderRawTableHeader(isAdminPerson);
}

async function loadChart() {
  const person = getPerson(chartStudentId.value);
  if (!person) {
    chart.innerHTML = `<div class="empty-state chart-empty">請先建立 Name 資料</div>`;
    return;
  }
  try {
    const rows = await requestJson(buildMeasurementUrl(person));
    const filteredRows = filterByLocation(rows, chartLocationFilter.value);
    renderChart([...filteredRows].sort((a, b) => new Date(a.measurementDate) - new Date(b.measurementDate)));
  } catch (error) {
    chart.innerHTML = `<div class="empty-state chart-empty">${escapeHtml(error.message)}</div>`;
  }
}

async function loadDetails() {
  const person = getPerson(detailStudentId.value);
  if (!person) {
    detailRows = [];
    renderDetails();
    return;
  }
  try {
    const rows = await requestJson(buildMeasurementUrl(person));
    detailRows = filterByLocation(rows, detailLocationFilter.value);
    renderDetails();
  } catch (error) {
    tableBody.innerHTML = "";
    emptyMeasurements.classList.remove("hidden");
    emptyMeasurements.textContent = error.message;
    measurementCount.textContent = "載入失敗";
  }
}

function filterByLocation(rows, location) {
  if (!location) return rows;
  return rows.filter((row) => row.location === location);
}

function renderChart(rows) {
  const selectedPerson = getPerson(chartStudentId.value);
  const isAdminPerson = selectedPerson?.isAdminPerson;
  const annualRows = getAnnualMeasurementRows(rows, selectedPerson);
  const rowsWithBmi = addBmiValues(annualRows);
  const validRows = rowsWithBmi.filter((row) => (
    isAdminPerson
      ? row.weightKg !== null || row.bmi !== null || row.waistCm !== null
      : row.heightCm !== null || row.weightKg !== null
  ));
  if (!validRows.length) {
    chart.innerHTML = `<div class="empty-state chart-empty">這個 Name 目前沒有可繪製的身高體重紀錄</div>`;
    return;
  }

  chart.innerHTML = `
    ${isAdminPerson ? "" : renderSingleChart(validRows, "heightCm", "height", "身高", "cm")}
    ${renderSingleChart(validRows, "weightKg", "weight", "體重", "kg")}
    ${isAdminPerson ? renderSingleChart(validRows, "bmi", "bmi", "BMI", "") : ""}
    ${isAdminPerson ? renderSingleChart(validRows, "waistCm", "waist", "腰圍", "cm") : ""}
  `;
}

function renderSingleChart(rows, key, metric, label, unit) {
  const chartRows = rows.filter((row) => row[key] !== null && Number.isFinite(row[key]));
  const title = unit ? `${label}（${unit}）` : label;
  if (!chartRows.length) {
    return `
      <section class="split-chart">
        <h3>${title}</h3>
        <div class="empty-state chart-empty">目前沒有${label}紀錄</div>
      </section>
    `;
  }

  const width = Math.max(680, chartRows.length * 120);
  const height = 300;
  const padding = { top: 24, right: 32, bottom: 46, left: 54 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const student = getPerson(chartStudentId.value);
  const lineColor = getGenderLineColor(student);
  const referenceValues = chartRows.flatMap((row) => getChartBandValues(student, metric, row.measurementDate));
  const values = [...chartRows.map((row) => row[key]), ...referenceValues];
  const minValue = Math.max(0, Math.floor(Math.min(...values) - 5));
  const maxValue = Math.ceil(Math.max(...values) + 5);
  const range = Math.max(1, maxValue - minValue);
  const x = createIndexScale(chartRows, padding.left, plotWidth);
  const y = (value) => padding.top + ((maxValue - value) / range) * plotHeight;
  const ticks = makeTicks(minValue, maxValue);

  const grid = ticks.map((tick) => `
    <line class="chart-grid" x1="${padding.left}" x2="${width - padding.right}" y1="${y(tick)}" y2="${y(tick)}"></line>
    <text class="chart-label" x="${padding.left - 10}" y="${y(tick) + 4}" text-anchor="end">${tick}</text>
  `).join("");
  const bands = renderReferenceBands(chartRows, metric, student, x, y, minValue, maxValue, padding.left, width - padding.right);
  const boundaryLabels = renderAdminBoundaryLabels(metric, student, y, minValue, maxValue, width - padding.right + 8);
  const labels = chartRows.map((row, index) => renderAnnualChartLabel(row, x(index), height - 18)).join("");
  const series = renderSeries(chartRows, key, metric, student, lineColor, label, unit, x, y);
  const percentileLegend = renderPercentileLegend(metric, student);

  return `
    <section class="split-chart">
      <div class="split-chart-title">
        <h3>${title}</h3>
        <span class="chart-legend-item"><i style="background:${lineColor}"></i>${label}</span>
      </div>
    <div class="chart-scroll">
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}折線圖">
        ${bands}
        ${grid}
        <line class="chart-axis" x1="${padding.left}" x2="${padding.left}" y1="${padding.top}" y2="${height - padding.bottom}"></line>
        <line class="chart-axis" x1="${padding.left}" x2="${width - padding.right}" y1="${height - padding.bottom}" y2="${height - padding.bottom}"></line>
        ${boundaryLabels}
        ${labels}
          ${series}
      </svg>
    </div>
    ${percentileLegend}
    </section>
  `;
}

function renderSeries(rows, key, metric, student, lineColor, label, unit, x, y) {
  const points = rows
    .map((row, index) => ({ row, index, value: row[key] }))
    .filter((point) => point.value !== null && Number.isFinite(point.value));
  if (!points.length) return "";

  const pointText = points.map((point) => `${x(point.index)},${y(point.value)}`).join(" ");
  const dots = points.map((point) => {
    const percentile = estimatePercentile(student, metric, point.value, point.row.measurementDate);
    const bmi = point.row.bmi ?? calculateBmi(point.row);
    const pointClass = getMeasurementColorClass(student, metric, percentile, bmi, point.value);
    const marker = getChartMarker(student, metric, percentile, bmi, point.value);
    const valueText = `${label} ${formatNumber(point.value)}${unit}`;
    const tooltip = metric === "bmi"
      ? `${valueText}\n${formatDate(point.row.measurementDate)}`
      : `${valueText}（${marker}）\n${formatDate(point.row.measurementDate)}`;
    return `
    <circle class="chart-point ${pointClass}" cx="${x(point.index)}" cy="${y(point.value)}" r="4">
      <title>${escapeHtml(tooltip)}</title>
    </circle>
  `;
  }).join("");
  return `<polyline class="chart-line" points="${pointText}" style="stroke:${lineColor}"></polyline>${dots}`;
}

function getChartMarker(person, metric, percentile, bmi, value) {
  if (!person?.isAdminPerson) return formatPercentile(percentile);
  if (metric === "weight" || metric === "bmi") return formatBmi(bmi);
  if (metric === "waist") return getWaistClassLabel(person, value);
  return "-";
}

function renderPercentileLegend(metric, student) {
  if (student?.isAdminPerson || !["height", "weight"].includes(metric)) return "";
  const items = metric === "height"
    ? [
        ["pr-red", "PR1 以下"],
        ["pr-orange", "PR1 ~ PR3"],
        ["pr-yellow", "PR3 ~ PR25"],
        ["pr-green", "PR25 ~ PR75"],
        ["pr-blue", "PR75 ~ PR97"],
        ["pr-purple", "PR97 以上"],
      ]
    : [
        ["pr-red", "PR1 以下"],
        ["pr-orange", "PR1 ~ PR3"],
        ["pr-yellow", "PR3 ~ PR25"],
        ["pr-green", "PR25 ~ PR75"],
        ["pr-yellow", "PR75 ~ PR97"],
        ["pr-orange", "PR97 ~ PR99"],
        ["pr-red", "PR99 以上"],
      ];
  return `
    <div class="percentile-legend" aria-label="${metric === "height" ? "身高" : "體重"} PR 色彩區間">
      ${items.map(([className, text]) => `
        <span class="percentile-legend-item ${className}">
          <i></i>${text}
        </span>
      `).join("")}
    </div>
  `;
}

function renderReferenceBands(rows, metric, student, x, y, minValue, maxValue, left, right) {
  if (student?.isAdminPerson) return renderAdminBands(metric, student, minValue, maxValue, left, right, y);
  if (!student?.gender) return "";
  const boundaries = rows.map((row) => getChartBandBoundaries(student, metric, row.measurementDate));
  if (boundaries.some((entry) => !entry)) return "";
  const bands = metric === "height"
    ? [
        { className: "band-red", lower: (entry) => minValue, upper: (entry) => entry.pr1 },
        { className: "band-orange", lower: (entry) => entry.pr1, upper: (entry) => entry.pr3 },
        { className: "band-yellow", lower: (entry) => entry.pr3, upper: (entry) => entry.pr25 },
        { className: "band-green", lower: (entry) => entry.pr25, upper: (entry) => entry.pr75 },
        { className: "band-blue", lower: (entry) => entry.pr75, upper: (entry) => entry.pr97 },
        { className: "band-purple", lower: (entry) => entry.pr97, upper: (entry) => maxValue },
      ]
    : [
        { className: "band-red", lower: (entry) => minValue, upper: (entry) => entry.pr1 },
        { className: "band-orange", lower: (entry) => entry.pr1, upper: (entry) => entry.pr3 },
        { className: "band-yellow", lower: (entry) => entry.pr3, upper: (entry) => entry.pr25 },
        { className: "band-green", lower: (entry) => entry.pr25, upper: (entry) => entry.pr75 },
        { className: "band-yellow", lower: (entry) => entry.pr75, upper: (entry) => entry.pr97 },
        { className: "band-orange", lower: (entry) => entry.pr97, upper: (entry) => entry.pr99 },
        { className: "band-red", lower: (entry) => entry.pr99, upper: (entry) => maxValue },
      ];

  return bands.map((band) => {
    if (rows.length === 1) {
      const upperY = y(clampRange(band.upper(boundaries[0]), minValue, maxValue));
      const lowerY = y(clampRange(band.lower(boundaries[0]), minValue, maxValue));
      return `<rect class="chart-band ${band.className}" x="${left}" y="${upperY}" width="${right - left}" height="${Math.max(0, lowerY - upperY)}"></rect>`;
    }
    const topPoints = rows.map((row, index) => `${x(index)},${y(clampRange(band.upper(boundaries[index]), minValue, maxValue))}`);
    const bottomPoints = rows
      .map((row, index) => `${x(index)},${y(clampRange(band.lower(boundaries[index]), minValue, maxValue))}`)
      .reverse();
    return `<polygon class="chart-band ${band.className}" points="${[...topPoints, ...bottomPoints].join(" ")}"></polygon>`;
  }).join("");
}

function createTimeScale(rows, left, width) {
  const times = rows.map((row) => toDateTime(row.measurementDate));
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const range = maxTime - minTime;
  return (index) => {
    if (!range) return left + width / 2;
    return left + ((times[index] - minTime) / range) * width;
  };
}

function createIndexScale(rows, left, width) {
  const lastIndex = rows.length - 1;
  return (index) => {
    if (lastIndex <= 0) return left + width / 2;
    return left + (index / lastIndex) * width;
  };
}

function getAnnualMeasurementRows(rows, person) {
  const latestByPeriod = new Map();
  rows
    .filter((row) => row.measurementDate)
    .forEach((row) => {
      const period = getMeasurementPeriod(row.measurementDate, person);
      if (!period) return;
      const current = latestByPeriod.get(period.key);
      if (!current || compareMeasurementRows(row, current.row) > 0) {
        latestByPeriod.set(period.key, { ...period, row });
      }
    });
  return [...latestByPeriod.values()]
    .sort((a, b) => a.sort - b.sort)
    .map((entry) => ({
      ...entry.row,
      annualKey: entry.key,
      annualSort: entry.sort,
      annualLabel: entry.label,
      annualAge: entry.age,
      annualYear: entry.year,
    }));
}

function getMeasurementPeriod(measurementDateValue, person) {
  const parts = parseDateParts(measurementDateValue);
  if (!parts) return null;
  if (!person?.isAdminPerson) {
    const birthYear = Number(person?.birthYear);
    if (Number.isInteger(birthYear) && birthYear > 1900) {
      const birthday = getBirthdayParts(person);
      const afterBirthday = parts.month > birthday.month
        || (parts.month === birthday.month && parts.day >= birthday.day);
      const age = Math.max(0, parts.year - birthYear - (afterBirthday ? 0 : 1));
      const periodYear = birthYear + age;
      return {
        key: `age:${age}`,
        sort: age,
        year: periodYear,
        age,
        label: `${periodYear}（${age}歲）`,
      };
    }
  }
  return {
    key: `year:${parts.year}`,
    sort: parts.year,
    year: parts.year,
    age: null,
    label: `${parts.year}`,
  };
}

function getBirthdayParts(person) {
  const month = Number(person?.birthMonth);
  const day = Number(person?.birthDay);
  return {
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : 1,
    day: Number.isInteger(day) && day >= 1 && day <= 31 ? day : 1,
  };
}

function compareMeasurementRows(a, b) {
  const dateDiff = toDateTime(a.measurementDate) - toDateTime(b.measurementDate);
  if (dateDiff !== 0) return dateDiff;
  return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
}

function renderDetails() {
  const person = getPerson(detailStudentId.value);
  const isAdminPerson = Boolean(person?.isAdminPerson);
  const sortedRows = addBmiValues([...detailRows].sort((a, b) => new Date(b.measurementDate) - new Date(a.measurementDate)));
  renderSuggestedWeightUpper(detailRows);
  const annualRows = getAnnualGrowthRows(detailRows, person);
  renderGrowthTableHeader();
  measurementCount.textContent = `共 ${annualRows.length} 筆年度紀錄`;
  emptyMeasurements.classList.toggle("hidden", annualRows.length > 0);
  tableBody.innerHTML = annualRows.map(renderGrowthRow).join("");
  renderRawDetails(sortedRows, isAdminPerson);
}

function renderRawDetails(rows = null, isAdminPerson = null) {
  if (!rawTableHead || !rawTableBody || !rawEmptyMeasurements || !rawMeasurementCount) return;
  const person = getPerson(detailStudentId.value);
  const adminMode = isAdminPerson ?? Boolean(person?.isAdminPerson);
  const sortedRows = rows || addBmiValues([...detailRows].sort((a, b) => new Date(b.measurementDate) - new Date(a.measurementDate)));
  renderRawTableHeader(adminMode);
  rawMeasurementCount.textContent = `共 ${sortedRows.length} 筆紀錄`;
  rawEmptyMeasurements.classList.toggle("hidden", sortedRows.length > 0);
  rawTableBody.innerHTML = sortedRows.map((row) => {
    const student = getMeasurementPerson(row);
    const heightPercentile = estimatePercentile(student, "height", row.heightCm, row.measurementDate);
    const weightPercentile = estimatePercentile(student, "weight", row.weightKg, row.measurementDate);
    const bmi = row.bmi;
    const heightClass = getMeasurementColorClass(student, "height", heightPercentile, bmi, row.heightCm);
    const weightClass = getMeasurementColorClass(student, "weight", weightPercentile, bmi, row.weightKg);
    const bmiClass = getBmiClass(bmi);
    const waistClass = getMeasurementColorClass(student, "waist", null, bmi, row.waistCm);
    const cells = isAdminPerson ? `
        <td class="metric-value ${heightClass}">${formatNumber(row.heightCm)}</td>
        <td class="metric-value ${weightClass}">${formatNumber(row.weightKg)}</td>
        <td class="pr-cell ${bmiClass}">${formatBmi(bmi)}</td>
        <td class="metric-value ${waistClass}">${formatNumber(row.waistCm)}</td>
      ` : `
        <td class="metric-value ${heightClass}">${formatNumber(row.heightCm)}</td>
        <td class="pr-cell ${heightClass}">${formatPercentile(heightPercentile)}</td>
        <td class="metric-value ${weightClass}">${formatNumber(row.weightKg)}</td>
        <td class="pr-cell ${weightClass}">${formatPercentile(weightPercentile)}</td>
      `;
    return `
      <tr>
        <td>${formatDate(row.measurementDate)}</td>
        <td>${escapeHtml(student?.name || "-")}</td>
        ${cells}
        <td>${escapeHtml(row.location || "-")}</td>
        <td>${escapeHtml(row.note || "-")}</td>
        <td class="admin-only"><button class="secondary-button" type="button" data-edit="${row.id}">編輯</button></td>
      </tr>
    `;
  }).join("");
  rawTableBody.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openEditMode(button.dataset.edit));
  });
}

function renderRawTableHeader(isAdminPerson) {
  const metricHeaders = isAdminPerson
    ? ["身高（cm）", "體重（kg）", "BMI", "腰圍（cm）"]
    : ["身高（cm）", "身高 PR", "體重（kg）", "體重 PR"];
  const headers = [
    "日期",
    "Name",
    ...metricHeaders,
    "量測地點",
    "備註",
  ].map((label) => `<th>${label}</th>`).join("");
  rawTableHead.innerHTML = `${headers}<th class="admin-only">操作</th>`;
}

function renderGrowthTableHeader() {
  const headers = [
    "資料日期",
    "身高成長（cm）",
    "身高成長（%）",
    "PR",
    "體重成長（kg）",
    "體重成長（%）",
    "PR",
  ].map((label) => `<th>${label}</th>`).join("");
  tableHead.innerHTML = headers;
}

function renderGrowthRow(row) {
  const heightClass = getGrowthClass("height", row.heightPercentile);
  const weightClass = getGrowthClass("weight", row.weightPercentile);
  return `
    <tr>
      <td>${formatGrowthDate(row.measurementDate, row.annualAge)}</td>
      <td class="metric-value ${heightClass}">${formatSignedNumber(row.heightGrowth)}</td>
      <td class="metric-value ${heightClass}">${formatPercentGrowth(row.heightGrowthPercent)}</td>
      <td class="pr-cell ${heightClass}">${formatPercentile(row.heightPercentile)}</td>
      <td class="metric-value ${weightClass}">${formatSignedNumber(row.weightGrowth)}</td>
      <td class="metric-value ${weightClass}">${formatPercentGrowth(row.weightGrowthPercent)}</td>
      <td class="pr-cell ${weightClass}">${formatPercentile(row.weightPercentile)}</td>
    </tr>
  `;
}

function getAnnualGrowthRows(rows, person) {
  const annualRows = getAnnualMeasurementRows(rows, person);
  return annualRows
    .map((row, index) => {
      const previous = annualRows[index - 1] || null;
      const heightPercentile = estimatePercentile(person, "height", row.heightCm, row.measurementDate);
      const weightPercentile = estimatePercentile(person, "weight", row.weightKg, row.measurementDate);
      return {
        measurementDate: row.measurementDate,
        annualAge: row.annualAge,
        heightGrowth: calculateGrowth(row.heightCm, previous?.heightCm),
        heightGrowthPercent: calculateGrowthPercent(row.heightCm, previous?.heightCm),
        heightPercentile,
        weightGrowth: calculateGrowth(row.weightKg, previous?.weightKg),
        weightGrowthPercent: calculateGrowthPercent(row.weightKg, previous?.weightKg),
        weightPercentile,
        sort: row.annualSort,
      };
    })
    .sort((a, b) => b.sort - a.sort);
}

function calculateGrowth(currentValue, previousValue) {
  const current = Number(currentValue);
  const previous = Number(previousValue);
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return current - previous;
}

function calculateGrowthPercent(currentValue, previousValue) {
  const growth = calculateGrowth(currentValue, previousValue);
  const previous = Number(previousValue);
  if (!Number.isFinite(growth) || !Number.isFinite(previous) || previous <= 0) return null;
  return (growth / previous) * 100;
}

function getGrowthClass(metric, percentile) {
  return Number.isFinite(percentile) ? getPercentileClass(metric, percentile) : "";
}

function formatSignedNumber(value) {
  if (!Number.isFinite(value)) return "-";
  if (value === 0) return "0";
  return `${value > 0 ? "+" : ""}${formatNumber(value)}`;
}

function formatPercentGrowth(value) {
  if (!Number.isFinite(value)) return "-";
  if (value === 0) return "0%";
  return `${value > 0 ? "+" : ""}${formatNumber(value)}%`;
}

function renderSuggestedWeightUpper(rows) {
  const person = getPerson(detailStudentId.value);
  const suggestion = person?.isAdminPerson
    ? getAdminSuggestedWeight(rows)
    : getStudentSuggestedWeight(person, rows);
  if (!suggestion) {
    detailSuggestion.textContent = "";
    return;
  }
  detailSuggestion.innerHTML = `建議體重：<strong>${formatNumber(suggestion.weight)} kg</strong>（${escapeHtml(suggestion.description)}）`;
}

function openEditMode(id) {
  const row = detailRows.find((entry) => entry.id === id);
  if (!row) return;
  measurementId.value = row.id;
  measurementDate.value = row.measurementDate;
  formStudentId.value = getMeasurementPersonId(row);
  updateMeasurementMode();
  heightCm.value = row.heightCm ?? "";
  weightKg.value = row.weightKg ?? "";
  waistCm.value = row.waistCm ?? "";
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
    ...buildPersonPayload(getPerson(formStudentId.value)),
    measurementDate: measurementDate.value,
    heightCm: heightCm.value,
    weightKg: weightKg.value,
    waistCm: waistCm.value,
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
    const personId = getPersonIdFromPayload(payload);
    chartStudentId.value = personId;
    detailStudentId.value = personId;
    resetForm({ keepStudentId: personId });
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
  formStudentId.value = options.keepStudentId || detailStudentId.value || people[0]?.id || "";
  updateMeasurementMode();
  heightCm.value = "";
  weightKg.value = "";
  waistCm.value = "";
  note.value = "";
  renderLocationOptions("");
  measurementFormTitle.textContent = "新增身高體重";
  cancelMeasurementEdit.classList.add("hidden");
  hideFormError();
}

function validateMeasurement(data) {
  if (!data.personKey) return { valid: false, message: "請選擇 Name" };
  if (!data.measurementDate) return { valid: false, message: "請選擇日期" };
  if (!parseDateParts(data.measurementDate)) return { valid: false, message: "量測日期年份請使用 4 碼西元年，例如 2026-06-30" };
  if (data.heightCm !== "" && Number(data.heightCm) < 0) return { valid: false, message: "身高不可小於 0" };
  if (data.weightKg !== "" && Number(data.weightKg) < 0) return { valid: false, message: "體重不可小於 0" };
  if (data.waistCm !== "" && Number(data.waistCm) < 0) return { valid: false, message: "腰圍不可小於 0" };
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
  return getStudent(studentId)?.name || "-";
}

function getStudent(studentId) {
  return students.find((student) => student.id === studentId) || null;
}

function getPerson(personId) {
  return people.find((person) => person.id === personId) || null;
}

function buildMeasurementUrl(person) {
  const params = new URLSearchParams({
    personType: person.personType,
    personKey: person.personKey,
  });
  return `/api/student-measurements?${params.toString()}`;
}

function buildPersonPayload(person) {
  if (!person) return {};
  return {
    studentId: person.personType === "STUDENT" ? person.personKey : "",
    personType: person.personType,
    personKey: person.personKey,
    personName: person.name,
    gender: person.gender || "",
  };
}

function getPersonIdFromPayload(payload) {
  return `${payload.personType}:${payload.personKey}`;
}

function getMeasurementPerson(row) {
  if (row.personType === "ADMIN") {
    return adminPeople.find((person) => person.personKey === row.personKey) || {
      id: `ADMIN:${row.personKey}`,
      personType: "ADMIN",
      personKey: row.personKey,
      name: row.personName || row.personKey,
      gender: row.gender,
      isAdminPerson: true,
    };
  }
  const student = row.student || getStudent(row.studentId);
  if (!student) return null;
  return {
    ...student,
    id: `STUDENT:${student.id}`,
    personType: "STUDENT",
    personKey: student.id,
    isAdminPerson: false,
  };
}

function getMeasurementPersonId(row) {
  const person = getMeasurementPerson(row);
  return person?.id || "";
}

function getGenderLineColor(student) {
  if (student?.gender === "FEMALE") return "#f9a8d4";
  if (student?.gender === "MALE") return "#93c5fd";
  return "#a5b4fc";
}

function getChartBandValues(student, metric, measurementDateValue) {
  if (student?.isAdminPerson) {
    if (metric === "waist") return getWaistThresholds(student);
    if (metric === "bmi") return [17.5, 18.5, 24, 27, 30];
    return [];
  }
  const entry = getChartBandBoundaries(student, metric, measurementDateValue);
  if (!entry) return [];
  return metric === "height"
    ? [entry.pr1, entry.pr3, entry.pr25, entry.pr75, entry.pr97]
    : [entry.pr1, entry.pr3, entry.pr25, entry.pr75, entry.pr97, entry.pr99];
}

function getChartBandBoundaries(student, metric, measurementDateValue) {
  if (student?.isAdminPerson) return null;
  if (!student?.gender) return null;
  const age = estimateAge(student, measurementDateValue);
  const reference = growthReference[student.gender]?.[metric]?.find((row) => row[0] === age);
  if (!reference) return null;
  const values = reference.slice(1);
  return {
    pr1: estimatePr1(values),
    pr3: values[0],
    pr25: values[1],
    pr50: values[2],
    pr75: values[3],
    pr97: values[4],
    pr99: estimatePr99(values),
  };
}

function renderAdminBands(metric, student, minValue, maxValue, left, right, y) {
  const bands = metric === "waist"
    ? getWaistBands(student, minValue, maxValue)
    : metric === "bmi"
      ? getBmiBands(minValue, maxValue)
      : [];
  if (!bands.length) return "";
  return bands.map((band) => {
    const upperY = y(clampRange(band.upper, minValue, maxValue));
    const lowerY = y(clampRange(band.lower, minValue, maxValue));
    return `<rect class="chart-band ${band.className}" x="${left}" y="${upperY}" width="${right - left}" height="${Math.max(0, lowerY - upperY)}"></rect>`;
  }).join("");
}

function renderAdminBoundaryLabels(metric, student, y, minValue, maxValue, x) {
  if (!student?.isAdminPerson) return "";
  const labels = metric === "bmi"
    ? [
        { value: 17.5, className: "threshold-yellow" },
        { value: 18.5, className: "threshold-green" },
        { value: 24, className: "threshold-green" },
        { value: 27, className: "threshold-yellow" },
        { value: 30, className: "threshold-orange" },
      ]
    : metric === "waist"
      ? getWaistThresholds(student).map((value, index) => ({
          value,
          className: index === 0 ? "threshold-yellow" : "threshold-red",
        }))
      : [];
  return labels
    .filter((entry) => entry.value >= minValue && entry.value <= maxValue)
    .map((entry) => `
      <text class="chart-threshold-label ${entry.className}" x="${x}" y="${y(entry.value) + 4}" text-anchor="start">${formatNumber(entry.value)}</text>
    `).join("");
}

function getBmiBands(minValue, maxValue) {
  return [
    { className: "band-red", lower: minValue, upper: 17.5 },
    { className: "band-yellow", lower: 17.5, upper: 18.5 },
    { className: "band-green", lower: 18.5, upper: 24 },
    { className: "band-yellow", lower: 24, upper: 27 },
    { className: "band-orange", lower: 27, upper: 30 },
    { className: "band-red", lower: 30, upper: maxValue },
  ];
}

function getWaistBands(student, minValue, maxValue) {
  const thresholds = getWaistThresholds(student);
  if (!thresholds.length) return [];
  return [
    { className: "band-green", lower: minValue, upper: thresholds[0] },
    { className: "band-yellow", lower: thresholds[0], upper: thresholds[1] },
    { className: "band-red", lower: thresholds[1], upper: maxValue },
  ];
}

function getWaistThresholds(person) {
  return person?.gender === "FEMALE" ? [80, 82] : [90, 92];
}

function estimatePercentile(student, metric, value, measurementDateValue) {
  if (student?.isAdminPerson) return null;
  if (!student || !student.gender || value === null || value === undefined || value === "") return null;
  const age = estimateAge(student, measurementDateValue);
  const reference = growthReference[student.gender]?.[metric]?.find((row) => row[0] === age);
  if (!reference) return null;
  return interpolatePercentile(Number(value), reference.slice(1));
}

function estimateAge(student, measurementDateValue) {
  const birthYear = Number(student.birthYear);
  if (Number.isInteger(birthYear) && birthYear > 1900) {
    const parts = parseDateParts(measurementDateValue);
    if (!parts) return null;
    const birthday = getBirthdayParts(student);
    const afterBirthday = parts.month > birthday.month
      || (parts.month === birthday.month && parts.day >= birthday.day);
    return Math.min(18, Math.max(0, parts.year - birthYear - (afterBirthday ? 0 : 1)));
  }
  return estimateAgeFromGrade(student.grade);
}

function estimateAgeFromGrade(grade) {
  const gradeNumber = Number(grade);
  if (!Number.isFinite(gradeNumber)) return null;
  return Math.min(18, Math.max(0, Math.round(gradeNumber + 5)));
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

function clampRange(value, minValue, maxValue) {
  return Math.max(minValue, Math.min(maxValue, value));
}

function estimatePr1(values) {
  const estimated = values[0] - ((values[1] - values[0]) * 2) / 22;
  return Math.max(0, estimated);
}

function estimatePr99(values) {
  return values[4] + ((values[4] - values[3]) * 2) / 22;
}

function getPercentileClass(metric, value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  if (metric === "height") {
    if (value <= 1) return "pr-red";
    if (value <= 3) return "pr-orange";
    if (value <= 25) return "pr-yellow";
    if (value <= 75) return "pr-green";
    if (value <= 97) return "pr-blue";
    return "pr-purple";
  }
  if (value <= 1) return "pr-red";
  if (value <= 3) return "pr-orange";
  if (value <= 25) return "pr-yellow";
  if (value <= 75) return "pr-green";
  if (value <= 97) return "pr-yellow";
  if (value <= 99) return "pr-orange";
  return "pr-red";
}

function getMeasurementColorClass(person, metric, percentile, bmi, value) {
  if (value === null || value === undefined || value === "") return "";
  if (person?.isAdminPerson) {
    if (metric === "waist") return getWaistClass(person, value);
    return getBmiClass(bmi);
  }
  return getPercentileClass(metric, percentile);
}

function calculateTemporaryPr(event) {
  event.preventDefault();
  hideTemporaryPrError();
  const data = getTemporaryPrData();
  const validation = validateTemporaryPr(data);
  if (!validation.valid) return showTemporaryPrError(validation.message);
  localStorage.setItem(temporaryPrStorageKey, JSON.stringify(data));
  renderTemporaryPrResult(data);
}

function getTemporaryPrData() {
  return {
    name: temporaryPrFields.name.value.trim(),
    birthYear: temporaryPrFields.birthYear.value,
    gender: temporaryPrFields.gender.value,
    height: temporaryPrFields.height.value,
    weight: temporaryPrFields.weight.value,
  };
}

function validateTemporaryPr(data) {
  if (!data.name) return { valid: false, message: "請輸入 Name" };
  if (!data.birthYear || !Number.isInteger(Number(data.birthYear)) || Number(data.birthYear) < 1900 || Number(data.birthYear) > 2100) {
    return { valid: false, message: "出生年請輸入有效西元年" };
  }
  if (!data.gender) return { valid: false, message: "請選擇性別" };
  if (data.height === "" && data.weight === "") return { valid: false, message: "請至少輸入身高或體重" };
  if (data.height !== "" && Number(data.height) <= 0) return { valid: false, message: "身高請輸入正數" };
  if (data.weight !== "" && Number(data.weight) <= 0) return { valid: false, message: "體重請輸入正數" };
  return { valid: true };
}

function restoreTemporaryPr() {
  try {
    const data = JSON.parse(localStorage.getItem(temporaryPrStorageKey) || "null");
    if (!data) return;
    temporaryPrFields.name.value = data.name || "";
    temporaryPrFields.birthYear.value = data.birthYear || "";
    temporaryPrFields.gender.value = data.gender || "";
    temporaryPrFields.height.value = data.height || "";
    temporaryPrFields.weight.value = data.weight || "";
    renderTemporaryPrResult(data);
  } catch {
    localStorage.removeItem(temporaryPrStorageKey);
  }
}

function clearTemporaryPrCache() {
  localStorage.removeItem(temporaryPrStorageKey);
  temporaryPrForm.reset();
  hideTemporaryPrError();
  temporaryPrResult.className = "temporary-pr-result empty-state";
  temporaryPrResult.textContent = "尚未計算";
}

function renderTemporaryPrResult(data) {
  const age = Math.max(0, new Date().getFullYear() - Number(data.birthYear));
  const person = { gender: data.gender, birthYear: data.birthYear };
  const measurementDateValue = todayInputValue();
  const useAdminLogic = age >= 19;
  const heightPercentile = useAdminLogic || data.height === "" ? null : estimatePercentile(person, "height", data.height, measurementDateValue);
  const weightPercentile = useAdminLogic || data.weight === "" ? null : estimatePercentile(person, "weight", data.weight, measurementDateValue);
  const bmi = useAdminLogic ? calculateBmi({ heightCm: data.height, weightKg: data.weight }) : null;
  const heightClass = getPercentileClass("height", heightPercentile);
  const weightClass = useAdminLogic ? getBmiClass(bmi) : getPercentileClass("weight", weightPercentile);
  const suggestedWeight = useAdminLogic
    ? calculateSuggestedWeightUpper(data.height)
    : getTemporaryStudentSuggestedWeight(person, measurementDateValue);
  const suggestedDescription = useAdminLogic ? "依 BMI 24 計算" : "依年齡體重 PR75 計算";
  temporaryPrResult.className = "temporary-pr-result";
  temporaryPrResult.innerHTML = `
    <div><strong>${escapeHtml(data.name)}</strong>，估算年齡 ${age} 歲</div>
    <div class="temporary-pr-grid">
      <span>身高</span>
      <strong class="${heightClass}">${formatTemporaryHeightResult(data.height, heightPercentile, useAdminLogic)}</strong>
      <span>體重</span>
      <strong class="${weightClass}">${formatTemporaryWeightResult(data.weight, weightPercentile, bmi, useAdminLogic)}</strong>
      <span>建議體重</span>
      <strong class="pr-green">${suggestedWeight === null ? "-" : `${formatNumber(suggestedWeight)} kg`}</strong>
      <span>計算方式</span>
      <strong>${suggestedDescription}</strong>
    </div>
  `;
}

function getTemporaryStudentSuggestedWeight(person, measurementDateValue) {
  const boundaries = getChartBandBoundaries(person, "weight", measurementDateValue);
  return boundaries?.pr75 ?? null;
}

function formatTemporaryHeightResult(height, percentile, useAdminLogic) {
  if (height === "") return "-";
  const value = `${formatNumber(height)} cm`;
  return useAdminLogic ? value : `${value} / ${formatPercentile(percentile)}`;
}

function formatTemporaryWeightResult(weight, percentile, bmi, useAdminLogic) {
  if (weight === "") return "-";
  const value = `${formatNumber(weight)} kg`;
  return useAdminLogic ? `${value} / ${formatBmi(bmi)}` : `${value} / ${formatPercentile(percentile)}`;
}

function showTemporaryPrError(message) {
  temporaryPrError.textContent = message;
  temporaryPrError.classList.remove("hidden");
}

function hideTemporaryPrError() {
  temporaryPrError.textContent = "";
  temporaryPrError.classList.add("hidden");
}

function addBmiValues(rows) {
  const ascendingRows = [...rows].sort((a, b) => new Date(a.measurementDate) - new Date(b.measurementDate));
  let latestHeight = null;
  const bmiById = new Map();
  ascendingRows.forEach((row) => {
    if (Number.isFinite(Number(row.heightCm)) && Number(row.heightCm) > 0) latestHeight = Number(row.heightCm);
    bmiById.set(row.id, calculateBmi(row, latestHeight));
  });
  return rows.map((row) => ({ ...row, bmi: bmiById.get(row.id) ?? null }));
}

function getLatestHeight(rows) {
  const latestRow = [...rows]
    .filter((row) => Number.isFinite(Number(row.heightCm)) && Number(row.heightCm) > 0)
    .sort((a, b) => new Date(b.measurementDate) - new Date(a.measurementDate))[0];
  return latestRow ? Number(latestRow.heightCm) : null;
}

function getLatestMeasurementDate(rows) {
  return [...rows]
    .filter((row) => row.measurementDate)
    .sort((a, b) => new Date(b.measurementDate) - new Date(a.measurementDate))[0]?.measurementDate || todayInputValue();
}

function getStudentSuggestedWeight(person, rows) {
  if (!person || person.isAdminPerson) return null;
  const measurementDateValue = getLatestMeasurementDate(rows);
  const boundaries = getChartBandBoundaries(person, "weight", measurementDateValue);
  if (!boundaries || !Number.isFinite(boundaries.pr75)) return null;
  const age = estimateAge(person, measurementDateValue);
  const ageText = Number.isFinite(age) ? `${age} 歲` : "目前年齡";
  return {
    weight: boundaries.pr75,
    description: `依 ${ageText} 體重 PR75 計算`,
  };
}

function getAdminSuggestedWeight(rows) {
  const latestHeight = getLatestHeight(rows);
  const suggestedWeightUpper = calculateSuggestedWeightUpper(latestHeight);
  if (suggestedWeightUpper === null) return null;
  return {
    weight: suggestedWeightUpper,
    description: `依目前最新身高 ${formatNumber(latestHeight)} cm 與 BMI 24 計算`,
  };
}

function calculateSuggestedWeightUpper(heightCmValue) {
  const height = Number(heightCmValue);
  if (!Number.isFinite(height) || height <= 0) return null;
  const meters = height / 100;
  return 24 * meters * meters;
}

function calculateBmi(row, heightCmValue = row.heightCm) {
  const height = Number(heightCmValue);
  const weight = Number(row.weightKg);
  if (!Number.isFinite(height) || !Number.isFinite(weight) || height <= 0 || weight <= 0) return null;
  const meters = height / 100;
  return weight / (meters * meters);
}

function formatBmi(value) {
  return value === null || value === undefined || Number.isNaN(value) ? "-" : `BMI ${formatNumber(value)}`;
}

function getBmiClass(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  if (value < 17.5) return "pr-red";
  if (value < 18.5) return "pr-yellow";
  if (value < 24) return "pr-green";
  if (value < 27) return "pr-yellow";
  if (value < 30) return "pr-orange";
  return "pr-red";
}

function getWaistClass(person, value) {
  const waist = Number(value);
  if (!Number.isFinite(waist)) return "";
  const [warning, danger] = getWaistThresholds(person);
  if (waist < warning) return "pr-green";
  if (waist < danger) return "pr-yellow";
  return "pr-red";
}

function formatPercentile(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(value)}%`;
}

function formatDate(value) {
  if (!value) return "-";
  const parts = parseDateParts(value);
  if (!parts) return "-";
  return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium" }).format(new Date(parts.year, parts.month - 1, parts.day));
}

function formatGrowthDate(value, age) {
  const parts = parseDateParts(value);
  if (!parts) return "-";
  const dateText = `${parts.year}/${parts.month}/${parts.day}`;
  return Number.isFinite(age) ? `${dateText} (${age}歲)` : dateText;
}

async function downloadChartImage() {
  const svgs = [...chart.querySelectorAll("svg")];
  if (!svgs.length) {
    AppUI.toast("目前沒有可下載的折線圖", "error");
    return;
  }
  const student = getPerson(chartStudentId.value);
  const locationLabel = chartLocationFilter.value || "全部";
  const title = "身高體重折線圖";
  const subtitle = `學生：${student?.name || "-"}　量測地點：${locationLabel}`;
  const chartImages = svgs.map((svg) => svgToImageBlock(svg));
  const width = Math.max(900, ...chartImages.map((item) => item.width));
  const gap = 26;
  const titleHeight = 82;
  const height = titleHeight + chartImages.reduce((sum, item) => sum + item.height, 0) + gap * (chartImages.length - 1) + 28;
  let y = titleHeight;
  const content = chartImages.map((item) => {
    const block = `<image href="${item.dataUri}" x="${(width - item.width) / 2}" y="${y}" width="${item.width}" height="${item.height}" />`;
    y += item.height + gap;
    return block;
  }).join("");
  const combinedSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#ffffff" />
      <text x="32" y="36" font-family="Arial, 'Microsoft JhengHei', sans-serif" font-size="24" font-weight="700" fill="#0f172a">${escapeXml(title)}</text>
      <text x="32" y="64" font-family="Arial, 'Microsoft JhengHei', sans-serif" font-size="15" fill="#475569">${escapeXml(subtitle)}</text>
      ${content}
    </svg>
  `;
  const blob = new Blob([combinedSvg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `身高體重折線圖-${student?.name || "student"}-${todayInputValue()}.png`;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function svgToImageBlock(svg) {
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const viewBox = clone.viewBox.baseVal;
  const width = Math.ceil(viewBox?.width || svg.getBoundingClientRect().width || 900);
  const height = Math.ceil(viewBox?.height || svg.getBoundingClientRect().height || 300);
  clone.setAttribute("width", width);
  clone.setAttribute("height", height);
  const style = document.createElement("style");
  style.textContent = getChartSvgStyles();
  clone.insertBefore(style, clone.firstChild);
  const data = new XMLSerializer().serializeToString(clone);
  return {
    width,
    height,
    dataUri: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data)}`,
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function getChartSvgStyles() {
  return `
    .chart-axis{stroke:#94a3b8;stroke-width:1}
    .chart-grid{stroke:#e2e8f0;stroke-width:1}
    .chart-line{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-width:3}
    .chart-point{stroke:#ffffff;stroke-width:2}
    .chart-label{fill:#64748b;font-family:Arial,'Microsoft JhengHei',sans-serif;font-size:12px}
    .chart-year-label{fill:#0f766e;font-size:11px;font-weight:700}
    .chart-threshold-label{font-family:Arial,'Microsoft JhengHei',sans-serif;font-size:11px;font-weight:700}
    .threshold-red{fill:#dc2626}
    .threshold-orange{fill:#ea580c}
    .threshold-yellow{fill:#f59e0b}
    .threshold-green{fill:#16a34a}
    .chart-band{opacity:.18}
    .band-red{fill:#ef4444}
    .band-orange{fill:#f97316}
    .band-yellow{fill:#eab308}
    .band-green{fill:#22c55e}
    .band-blue{fill:#3b82f6}
    .band-purple{fill:#8b5cf6}
    .pr-red{fill:#dc2626}
    .pr-orange{fill:#ea580c}
    .pr-yellow{fill:#f59e0b}
    .pr-green{fill:#16a34a}
    .pr-blue{fill:#2563eb}
    .pr-purple{fill:#7c3aed}
  `;
}

function toDateTime(value) {
  const parts = parseDateParts(value);
  if (!parts) return 0;
  return new Date(parts.year, parts.month - 1, parts.day).getTime();
}

function renderChartDateLabels(value, previousValue, x, monthY, index) {
  if (!value) return "-";
  const parts = parseDateParts(value);
  if (!parts) return "-";
  const previousParts = parseDateParts(previousValue);
  const isFirstInMonth = !previousParts || previousParts.year !== parts.year || previousParts.month !== parts.month;
  const monthLabel = isFirstInMonth
    ? `<text class="chart-label chart-month-label" x="${x}" y="${monthY}" text-anchor="middle">${parts.month}月</text>`
    : "";
  const shouldShowYear = index === 0 || (parts.month === 1 && isFirstInMonth);
  if (!shouldShowYear) return monthLabel;
  return `
    <text class="chart-label chart-year-label" x="${x}" y="${monthY - 16}" text-anchor="middle">${parts.year}</text>
    ${monthLabel}
  `;
}

function renderAnnualChartLabel(row, x, labelY) {
  const label = row.annualLabel || String(getMeasurementYear(row.measurementDate) || "");
  return `
    <text class="chart-label chart-year-label" x="${x}" y="${labelY - 14}" text-anchor="middle">${escapeHtml(label)}</text>
    <text class="chart-label chart-month-label" x="${x}" y="${labelY}" text-anchor="middle">${escapeHtml(formatShortDate(row.measurementDate))}</text>
  `;
}

function formatShortDate(value) {
  const parts = parseDateParts(value);
  if (!parts) return "-";
  return `${parts.month}/${parts.day}`;
}

function getMeasurementYear(value) {
  return parseDateParts(value)?.year || null;
}

function parseDateParts(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    year < 1900
    || year > 2100
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) return null;
  return { year, month, day };
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

function escapeXml(value) {
  return escapeHtml(value);
}
