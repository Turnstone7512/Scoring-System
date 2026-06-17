const tableBody = document.querySelector("#dashboardTableBody");
const emptyDashboard = document.querySelector("#emptyDashboard");
const sortStatus = document.querySelector("#sortStatus");
const sortButtons = document.querySelectorAll("[data-sort]");
const monthlyChart = document.querySelector("#monthlyChart");

let students = [];
let monthlyScores = { months: [], students: [] };
let searchTerm = "";
let currentPage = 1;
const pageSize = 10;
let sortState = { key: "classNo", direction: "asc" };

insertDashboardControls();

sortButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.sort;
    sortState = {
      key,
      direction: sortState.key === key && sortState.direction === "asc" ? "desc" : "asc",
    };
    currentPage = 1;
    renderDashboard();
  });
});

loadDashboard();

async function loadDashboard() {
  AppUI.showLoading("載入 Dashboard...");
  try {
    students = await requestJson("/api/students");
    try {
      monthlyScores = await requestJson("/api/reports/monthly-scores");
    } catch (chartError) {
      monthlyScores = { months: [], students: [] };
      monthlyChart.innerHTML = `<div class="empty-state">${escapeHtml(chartError.message)}</div>`;
    }
    renderDashboard();
    renderMonthlyChart();
  } catch (error) {
    tableBody.innerHTML = "";
    emptyDashboard.classList.remove("hidden");
    emptyDashboard.textContent = error.message;
    monthlyChart.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    sortStatus.textContent = "載入失敗";
    AppUI.toast(error.message, "error");
  } finally {
    AppUI.hideLoading();
  }
}

function insertDashboardControls() {
  const panel = document.querySelector(".dashboard-panel .section-title");
  panel.insertAdjacentHTML("afterend", `
    <div class="utility-row">
      <input id="dashboardSearch" class="table-search" type="search" placeholder="搜尋學生姓名或座號" />
      <div id="dashboardPaginationTop" class="pagination"></div>
    </div>
  `);
  document.querySelector(".dashboard-panel .table-wrap").insertAdjacentHTML("afterend", `<div id="dashboardPaginationBottom" class="pagination"></div>`);
  document.querySelector("#dashboardSearch").addEventListener("input", (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    currentPage = 1;
    renderDashboard();
  });
}

function renderDashboard() {
  const filtered = students.filter((student) => `${student.name || ""} ${student.classNo || ""}`.toLowerCase().includes(searchTerm));
  const sortedStudents = [...filtered].sort(compareStudents);
  const pageResult = AppUI.paginate(sortedStudents, currentPage, pageSize);
  currentPage = pageResult.page;

  renderDashboardStatus();
  renderSortIndicators();
  AppUI.renderPagination(document.querySelector("#dashboardPaginationTop"), currentPage, pageResult.totalPages, (page) => {
    currentPage = page;
    renderDashboard();
  });
  AppUI.renderPagination(document.querySelector("#dashboardPaginationBottom"), currentPage, pageResult.totalPages, (page) => {
    currentPage = page;
    renderDashboard();
  });

  emptyDashboard.classList.toggle("hidden", pageResult.items.length > 0);
  tableBody.innerHTML = pageResult.items.map(renderStudentRow).join("");
  tableBody.querySelectorAll("[data-student-id]").forEach((row) => {
    row.addEventListener("click", () => {
      window.location.href = `score-transactions.html?studentId=${encodeURIComponent(row.dataset.studentId)}`;
    });
  });
}

function renderDashboardStatus() {
  sortStatus.textContent = `依 ${sortLabel(sortState.key)} ${sortState.direction === "asc" ? "升冪" : "降冪"} 排序`;
}

function renderSortIndicators() {
  document.querySelectorAll("[data-indicator]").forEach((indicator) => {
    indicator.textContent = indicator.dataset.indicator === sortState.key
      ? (sortState.direction === "asc" ? "↑" : "↓")
      : "";
  });
}

function renderStudentRow(student) {
  const score = Number(student.currentScore || 0);
  const scoreClass = score > 0 ? "positive" : score < 0 ? "negative" : "zero";
  return `
    <tr class="dashboard-row" data-student-id="${student.id}" title="查看 ${escapeHtml(student.name)} 的異動">
      <td><strong>${escapeHtml(student.name)}</strong></td>
      <td>${escapeHtml(student.classNo || "-")}</td>
      <td><span class="score-value ${scoreClass}">${score}</span></td>
      <td>${formatDate(student.lastTransactionAt || student.updatedAt)}</td>
    </tr>
  `;
}

function renderMonthlyChart() {
  const months = monthlyScores.months || [];
  const series = monthlyScores.students || [];
  if (!months.length || !series.length) {
    monthlyChart.innerHTML = `<div class="empty-state">目前沒有每月點數資料</div>`;
    return;
  }

  const width = Math.max(760, months.length * 120);
  const height = 380;
  const padding = { top: 30, right: 36, bottom: 58, left: 72 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = series.flatMap((student) => student.points.map((point) => Number(point.score || 0)));
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const scale = createYAxisScale(minValue, maxValue, plotHeight, padding.top);

  const x = (index) => padding.left + (months.length === 1 ? plotWidth / 2 : (index / (months.length - 1)) * plotWidth);
  const y = (value) => scale.y(value);
  const yTicks = makeTicksForScale(scale, minValue, maxValue);

  const grid = yTicks.map((tick) => `
    <line class="chart-grid" x1="${padding.left}" y1="${y(tick)}" x2="${width - padding.right}" y2="${y(tick)}"></line>
    <text class="chart-label" x="${padding.left - 10}" y="${y(tick) + 4}" text-anchor="end">${tick}</text>
  `).join("");

  const zeroLine = `
    <line class="chart-zero-line" x1="${padding.left}" y1="${y(0)}" x2="${width - padding.right}" y2="${y(0)}"></line>
    <text class="chart-zero-label" x="${width - padding.right + 8}" y="${y(0) + 4}">0</text>
  `;

  const axisBreak = scale.break
    ? renderAxisBreak(scale.break.y, padding.left, width - padding.right)
    : "";

  const monthLabels = months.map((month, index) => `
    <text class="chart-label" x="${x(index)}" y="${height - 18}" text-anchor="middle">${escapeHtml(month)}</text>
  `).join("");

  const lines = series.map((student) => {
    const points = student.points.map((point, index) => `${x(index)},${y(Number(point.score || 0))}`).join(" ");
    const dots = student.points.map((point, index) => {
      const score = Number(point.score || 0);
      return `
        <circle class="chart-point" cx="${x(index)}" cy="${y(score)}" r="4" style="fill:${escapeHtml(student.color)}">
          <title>${escapeHtml(student.name)} ${escapeHtml(point.month)}：${score}</title>
        </circle>
      `;
    }).join("");
    return `
      <polyline class="chart-line" points="${points}" style="stroke:${escapeHtml(student.color)}"></polyline>
      ${dots}
    `;
  }).join("");

  const legend = series.map((student) => `
    <span class="chart-legend-item"><i style="background:${escapeHtml(student.color)}"></i>${escapeHtml(student.name)}</span>
  `).join("");

  const breakNote = scale.break
    ? `<p class="chart-note">Y 軸已略過 ${scale.break.start} 到 ${scale.break.end} 的空白區間。</p>`
    : "";

  monthlyChart.innerHTML = `
    <div class="chart-scroll">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="每月月底點數折線圖">
        ${grid}
        ${zeroLine}
        <line class="chart-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"></line>
        <line class="chart-axis" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
        ${axisBreak}
        ${monthLabels}
        ${lines}
      </svg>
    </div>
    <div class="chart-legend">${legend}</div>
    ${breakNote}
  `;
}

function createYAxisScale(minValue, maxValue, plotHeight, top) {
  const range = Math.max(1, maxValue - minValue);
  const breakCandidate = findAxisBreak(minValue, maxValue);
  if (!breakCandidate) {
    return {
      y: (value) => top + ((maxValue - value) / range) * plotHeight,
      break: null,
    };
  }

  const breakPixels = 26;
  const visibleRange = Math.max(1, range - breakCandidate.size);
  const pixelsPerUnit = (plotHeight - breakPixels) / visibleRange;
  const breakY = top + (maxValue - breakCandidate.end) * pixelsPerUnit + breakPixels / 2;
  return {
    y: (value) => {
      if (value >= breakCandidate.end) {
        return top + (maxValue - value) * pixelsPerUnit;
      }
      return top + (maxValue - breakCandidate.end) * pixelsPerUnit + breakPixels + (breakCandidate.start - value) * pixelsPerUnit;
    },
    break: {
      ...breakCandidate,
      y: breakY,
    },
  };
}

function findAxisBreak(minValue, maxValue) {
  const allValues = monthlyScores.students
    .flatMap((student) => student.points.map((point) => Number(point.score || 0)))
    .concat([0, minValue, maxValue]);
  const uniqueValues = [...new Set(allValues)].sort((a, b) => a - b);
  let largestGap = null;
  for (let index = 1; index < uniqueValues.length; index += 1) {
    const start = uniqueValues[index - 1];
    const end = uniqueValues[index];
    const size = end - start;
    if (size > 1000 && (!largestGap || size > largestGap.size)) {
      largestGap = { start, end, size };
    }
  }
  if (!largestGap) return null;
  return {
    start: largestGap.start,
    end: largestGap.end,
    size: largestGap.size,
  };
}

function renderAxisBreak(y, axisX, rightX) {
  const startX = axisX;
  const endX = rightX;
  const upperWave = makeWavePath(startX, endX, y - 6);
  const lowerWave = makeWavePath(startX, endX, y + 6);
  return `
    <path class="chart-axis-break" d="${upperWave}"></path>
    <path class="chart-axis-break" d="${lowerWave}"></path>
  `;
}

function makeWavePath(startX, endX, y) {
  const amplitude = 4;
  const segmentWidth = 18;
  let path = `M ${startX} ${y}`;
  for (let x = startX; x < endX; x += segmentWidth) {
    const nextX = Math.min(x + segmentWidth, endX);
    const midX = x + (nextX - x) / 2;
    const controlY = y + (Math.floor((x - startX) / segmentWidth) % 2 === 0 ? -amplitude : amplitude);
    path += ` Q ${midX} ${controlY} ${nextX} ${y}`;
  }
  return path;
}

function makeTicksForScale(scale, minValue, maxValue) {
  if (!scale.break) return makeTicks(minValue, maxValue);
  const lowerTicks = makeTicks(minValue, scale.break.start).filter((tick) => tick <= scale.break.start);
  const upperTicks = makeTicks(scale.break.end, maxValue).filter((tick) => tick >= scale.break.end);
  return [...new Set([...lowerTicks, ...upperTicks, 0, minValue, maxValue])]
    .filter((tick) => tick >= minValue && tick <= maxValue)
    .filter((tick) => tick <= scale.break.start || tick >= scale.break.end)
    .sort((a, b) => a - b);
}

function makeTicks(minValue, maxValue) {
  if (minValue === maxValue) return [minValue];
  const ticks = [];
  const step = niceStep((maxValue - minValue) / 4);
  const firstTick = Math.ceil(minValue / step) * step;
  for (let value = firstTick; value <= maxValue; value += step) {
    ticks.push(Math.round(value));
  }
  if (!ticks.includes(minValue)) ticks.unshift(minValue);
  if (!ticks.includes(maxValue)) ticks.push(maxValue);
  return [...new Set(ticks)];
}

function niceStep(rawStep) {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, rawStep)));
  const normalized = rawStep / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function compareStudents(a, b) {
  const direction = sortState.direction === "asc" ? 1 : -1;
  const aValue = getSortValue(a, sortState.key);
  const bValue = getSortValue(b, sortState.key);
  if (typeof aValue === "number" && typeof bValue === "number") return (aValue - bValue) * direction;
  return String(aValue).localeCompare(String(bValue), "zh-Hant", { numeric: true, sensitivity: "base" }) * direction;
}

function getSortValue(student, key) {
  if (key === "currentScore") return Number(student.currentScore || 0);
  if (key === "lastTransactionAt") return new Date(student.lastTransactionAt || student.updatedAt || 0).getTime();
  return student[key] || "";
}

function sortLabel(key) {
  return {
    name: "學生姓名",
    classNo: "座號",
    currentScore: "目前點數",
    lastTransactionAt: "最後異動時間",
  }[key] || key;
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
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
