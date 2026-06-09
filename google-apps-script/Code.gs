const SHEETS = {
  Student: {
    name: "Students",
    columns: ["id", "name", "grade", "classNo", "email", "photoUrl", "currentScore", "lastTransactionAt", "isDeleted", "createdAt", "updatedAt"],
  },
  ScoreItem: {
    name: "ScoreItems",
    columns: ["id", "type", "mainCategory", "subCategory", "imageUrl", "score", "isDeleted", "createdAt", "updatedAt"],
  },
  ScoreTransaction: {
    name: "ScoreTransactions",
    columns: ["id", "studentId", "scoreItemId", "type", "scoreChange", "runningTotalScore", "transactionDate", "isDeleted", "createdAt", "updatedAt"],
  },
  AuditLog: {
    name: "AuditLogs",
    columns: ["id", "tableName", "recordId", "action", "oldValue", "newValue", "createdAt"],
  },
  UserAccount: {
    name: "UserAccounts",
    columns: ["id", "account", "name", "role", "password", "isDeleted", "createdAt", "updatedAt"],
  },
};

const ADMIN_PASSWORD = "789456123";
const ADMIN_ACCOUNTS = ["Gink", "Lelia"];

function setup() {
  getSpreadsheet_();
  Object.keys(SHEETS).forEach((key) => getSheet_(key));
  seedAdminAccounts_();
}

function checkSetup() {
  const ss = getSpreadsheet_();
  Logger.log(`Spreadsheet name: ${ss.getName()}`);
  Logger.log(`Spreadsheet ID: ${ss.getId()}`);
  setup();
  Logger.log("Setup completed.");
}

function doGet(e) {
  return handleRequest_("GET", e);
}

function doPost(e) {
  const body = parseBody_(e);
  const method = String(body._method || "POST").toUpperCase();
  const auth = body._auth || {};
  delete body._method;
  delete body._auth;
  return handleRequest_(method, e, body, auth);
}

function handleRequest_(method, e, body, auth) {
  try {
    setup();
    const path = normalizePath_(e);
    const params = normalizeParams_(e);
    let result;
    if (method === "GET") {
      result = route_(method, path, params, body || {});
    } else {
      requireAdmin_(auth);
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        result = route_(method, path, params, body || {});
      } finally {
        lock.releaseLock();
      }
    }
    return json_({ ok: true, data: result });
  } catch (error) {
    return json_({ ok: false, status: error.status || 500, message: error.message || "Server error" });
  }
}

function route_(method, path, params, body) {
  if (path === "/students" && method === "GET") return listStudents_();
  if (path === "/students" && method === "POST") return createStudent_(body);
  let match = path.match(/^\/students\/([^/]+)\/audit-logs$/);
  if (match && method === "GET") return listAuditLogs_({ tableName: "Student", recordId: match[1] });
  match = path.match(/^\/students\/([^/]+)$/);
  if (match && method === "PUT") return updateStudent_(match[1], body);
  if (match && method === "DELETE") return deleteRecord_("Student", match[1]);

  if (path === "/score-items" && method === "GET") return listScoreItems_(params.type);
  if (path === "/score-items" && method === "POST") return createScoreItem_(body);
  match = path.match(/^\/score-items\/([^/]+)\/audit-logs$/);
  if (match && method === "GET") return listAuditLogs_({ tableName: "ScoreItem", recordId: match[1] });
  match = path.match(/^\/score-items\/([^/]+)$/);
  if (match && method === "PUT") return updateScoreItem_(match[1], body);
  if (match && method === "DELETE") return deleteRecord_("ScoreItem", match[1]);

  if (path === "/score-transactions" && method === "GET") return listTransactions_(params);
  if (path === "/score-transactions" && method === "POST") return createTransaction_(body);
  match = path.match(/^\/score-transactions\/([^/]+)\/audit-logs$/);
  if (match && method === "GET") return listAuditLogs_({ tableName: "ScoreTransaction", recordId: match[1] });
  match = path.match(/^\/score-transactions\/([^/]+)$/);
  if (match && method === "PUT") return updateTransaction_(match[1], body);
  if (match && method === "DELETE") return deleteTransaction_(match[1]);

  if (path === "/reports/score-details" && method === "GET") return listTransactions_(params);
  if (path === "/reports/monthly-scores" && method === "GET") return monthlyScores_();
  if (path === "/audit-logs" && method === "GET") return listAuditLogs_(params);

  if (path === "/user-accounts" && method === "GET") return listUserAccounts_();
  if (path === "/user-accounts" && method === "POST") return createUserAccount_(body);
  match = path.match(/^\/user-accounts\/([^/]+)$/);
  if (match && method === "PUT") return updateUserAccount_(match[1], body);
  if (match && method === "DELETE") return deleteRecord_("UserAccount", match[1]);

  throw httpError_(404, `Route not found: ${method} ${path}`);
}

function requireAdmin_(auth) {
  if (!auth || auth.role !== "ADMIN") {
    throw httpError_(403, "Admin permission is required.");
  }
  const account = rows_("UserAccount").find((row) => {
    return !toBoolean_(row.isDeleted)
      && row.role === "ADMIN"
      && text_(row.account).toLowerCase() === text_(auth.account).toLowerCase();
  });
  if (!account || String(account.password || "") !== String(auth.password || "")) {
    throw httpError_(403, "Admin account or password is incorrect.");
  }
}

function seedAdminAccounts_() {
  const now = now_();
  ADMIN_ACCOUNTS.forEach((account) => {
    const existing = rows_("UserAccount").find((row) => text_(row.account).toLowerCase() === account.toLowerCase());
    if (existing) {
      if (existing.role !== "ADMIN" || toBoolean_(existing.isDeleted) || !existing.password) {
        saveRow_("UserAccount", { ...existing, name: account, role: "ADMIN", password: existing.password || ADMIN_PASSWORD, isDeleted: false, updatedAt: now });
      }
      return;
    }
    appendRow_("UserAccount", {
      id: Utilities.getUuid(),
      account,
      name: account,
      role: "ADMIN",
      password: ADMIN_PASSWORD,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  });
}

function listStudents_() {
  return rows_("Student")
    .filter((row) => !toBoolean_(row.isDeleted))
    .sort((a, b) => Number(a.grade) - Number(b.grade) || String(a.classNo || "").localeCompare(String(b.classNo || "")) || compareDateDesc_(a.createdAt, b.createdAt));
}

function createStudent_(data) {
  validateStudent_(data);
  ensureUnique_("Student", "email", data.email);
  const now = now_();
  const row = {
    id: Utilities.getUuid(),
    name: text_(data.name),
    grade: Number(data.grade),
    classNo: emptyToNull_(data.classNo),
    email: emptyToNull_(data.email),
    photoUrl: emptyToNull_(data.photoUrl),
    currentScore: 0,
    lastTransactionAt: "",
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
  appendRow_("Student", row);
  audit_("Student", row.id, "CREATE", null, row);
  return row;
}

function updateStudent_(id, data) {
  validateStudent_(data);
  const existing = findActive_("Student", id);
  ensureUnique_("Student", "email", data.email, id);
  const next = {
    ...existing,
    name: text_(data.name),
    grade: Number(data.grade),
    classNo: emptyToNull_(data.classNo),
    email: emptyToNull_(data.email),
    photoUrl: emptyToNull_(data.photoUrl),
    updatedAt: now_(),
  };
  saveRow_("Student", next);
  audit_("Student", id, "UPDATE", existing, next);
  return next;
}

function listScoreItems_(type) {
  return rows_("ScoreItem")
    .filter((row) => !toBoolean_(row.isDeleted))
    .filter((row) => !type || row.type === type)
    .sort((a, b) => String(a.type).localeCompare(String(b.type)) || String(a.mainCategory).localeCompare(String(b.mainCategory)) || String(a.subCategory).localeCompare(String(b.subCategory)));
}

function createScoreItem_(data) {
  validateScoreItem_(data);
  const now = now_();
  const score = Math.abs(Number(data.score));
  const row = {
    id: Utilities.getUuid(),
    type: data.type,
    mainCategory: text_(data.mainCategory),
    subCategory: text_(data.subCategory),
    imageUrl: emptyToNull_(data.imageUrl),
    score: data.type === "PENALTY" ? -score : score,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
  appendRow_("ScoreItem", row);
  audit_("ScoreItem", row.id, "CREATE", null, row);
  return row;
}

function updateScoreItem_(id, data) {
  validateScoreItem_(data);
  const existing = findActive_("ScoreItem", id);
  const score = Math.abs(Number(data.score));
  const next = {
    ...existing,
    type: data.type,
    mainCategory: text_(data.mainCategory),
    subCategory: text_(data.subCategory),
    imageUrl: emptyToNull_(data.imageUrl),
    score: data.type === "PENALTY" ? -score : score,
    updatedAt: now_(),
  };
  saveRow_("ScoreItem", next);
  audit_("ScoreItem", id, "UPDATE", existing, next);
  return next;
}

function listTransactions_(params) {
  const students = indexById_(listStudents_());
  const items = indexById_(listScoreItems_());
  const scoreItemIds = asArray_(params.scoreItemId);
  return rows_("ScoreTransaction")
    .filter((row) => !toBoolean_(row.isDeleted))
    .filter((row) => students[row.studentId])
    .filter((row) => !params.studentId || row.studentId === params.studentId)
    .filter((row) => !params.type || row.type === params.type)
    .filter((row) => !params.dateFrom || dateValue_(row.transactionDate) >= startOfDay_(params.dateFrom))
    .filter((row) => !params.dateTo || dateValue_(row.transactionDate) <= endOfDay_(params.dateTo))
    .filter((row) => !scoreItemIds.length || scoreItemIds.indexOf(row.scoreItemId) !== -1)
    .map((row) => ({ ...row, student: students[row.studentId] || null, scoreItem: items[row.scoreItemId] || null }))
    .sort((a, b) => compareDateDesc_(a.transactionDate, b.transactionDate) || compareDateDesc_(a.createdAt, b.createdAt));
}

function createTransaction_(data) {
  const prepared = prepareTransaction_(data);
  const now = now_();
  const row = { ...prepared, id: Utilities.getUuid(), runningTotalScore: 0, isDeleted: false, createdAt: now, updatedAt: now };
  appendRow_("ScoreTransaction", row);
  recalculateStudentScore_(row.studentId);
  const next = getTransaction_(row.id);
  audit_("ScoreTransaction", row.id, "CREATE", null, next);
  return next;
}

function updateTransaction_(id, data) {
  const existing = getTransaction_(id);
  if (!existing || toBoolean_(existing.isDeleted)) throw httpError_(404, "Score transaction not found");
  const prepared = prepareTransaction_(data);
  const next = { ...existing, ...prepared, updatedAt: now_() };
  delete next.student;
  delete next.scoreItem;
  saveRow_("ScoreTransaction", next);
  recalculateStudentScore_(existing.studentId);
  if (existing.studentId !== prepared.studentId) recalculateStudentScore_(prepared.studentId);
  const updated = getTransaction_(id);
  audit_("ScoreTransaction", id, "UPDATE", existing, updated);
  return updated;
}

function deleteTransaction_(id) {
  const existing = getTransaction_(id);
  if (!existing || toBoolean_(existing.isDeleted)) throw httpError_(404, "Score transaction not found");
  const next = { ...existing, isDeleted: true, updatedAt: now_() };
  delete next.student;
  delete next.scoreItem;
  saveRow_("ScoreTransaction", next);
  recalculateStudentScore_(existing.studentId);
  const deleted = getTransaction_(id);
  audit_("ScoreTransaction", id, "DELETE", existing, deleted);
  return deleted;
}

function listUserAccounts_() {
  return rows_("UserAccount")
    .filter((row) => !toBoolean_(row.isDeleted))
    .sort((a, b) => String(a.role).localeCompare(String(b.role)) || String(a.account).localeCompare(String(b.account)))
    .map(hidePassword_);
}

function createUserAccount_(data) {
  validateUserAccount_(data);
  if (!String(data.password || "")) throw httpError_(400, "Password is required");
  ensureUnique_("UserAccount", "account", data.account);
  const now = now_();
  const row = {
    id: Utilities.getUuid(),
    account: text_(data.account),
    name: text_(data.name),
    role: data.role,
    password: String(data.password || ""),
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
  appendRow_("UserAccount", row);
  audit_("UserAccount", row.id, "CREATE", null, row);
  return hidePassword_(row);
}

function updateUserAccount_(id, data) {
  validateUserAccount_(data);
  const existing = findActive_("UserAccount", id);
  ensureUnique_("UserAccount", "account", data.account, id);
  const next = {
    ...existing,
    account: text_(data.account),
    name: text_(data.name),
    role: data.role,
    password: data.password ? String(data.password) : existing.password,
    updatedAt: now_(),
  };
  saveRow_("UserAccount", next);
  audit_("UserAccount", id, "UPDATE", existing, next);
  return hidePassword_(next);
}

function deleteRecord_(tableKey, id) {
  const existing = findActive_(tableKey, id);
  const next = { ...existing, isDeleted: true, updatedAt: now_() };
  saveRow_(tableKey, next);
  audit_(tableKey, id, "DELETE", existing, next);
  return next;
}

function listAuditLogs_(params) {
  return rows_("AuditLog")
    .filter((row) => !params.tableName || row.tableName === params.tableName)
    .filter((row) => !params.action || row.action === params.action)
    .filter((row) => !params.recordId || row.recordId === params.recordId)
    .filter((row) => !params.dateFrom || dateValue_(row.createdAt) >= startOfDay_(params.dateFrom))
    .filter((row) => !params.dateTo || dateValue_(row.createdAt) <= endOfDay_(params.dateTo))
    .map((row) => ({ ...row, oldValue: parseJson_(row.oldValue), newValue: parseJson_(row.newValue) }))
    .sort((a, b) => compareDateDesc_(a.createdAt, b.createdAt));
}

function hidePassword_(row) {
  const copy = { ...row };
  delete copy.password;
  return copy;
}

function monthlyScores_() {
  const monthly = {};
  listTransactions_({}).forEach((transaction) => {
    const date = new Date(transaction.transactionDate);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthly[month] = (monthly[month] || 0) + Number(transaction.scoreChange || 0);
  });
  return Object.keys(monthly).sort().map((month) => ({ month, score: monthly[month] }));
}

function prepareTransaction_(data) {
  if (!data.studentId) throw httpError_(400, "Student is required");
  if (data.type !== "REWARD" && data.type !== "PENALTY") throw httpError_(400, "Type must be REWARD or PENALTY");
  if (!data.scoreItemId) throw httpError_(400, "Score item is required");
  findActive_("Student", data.studentId);
  const scoreItem = findActive_("ScoreItem", data.scoreItemId);
  if (scoreItem.type !== data.type) throw httpError_(400, "Score item type does not match transaction type");
  const rawScoreChange = Number(data.scoreChange || scoreItem.score);
  if (!Number.isInteger(rawScoreChange) || rawScoreChange === 0) throw httpError_(400, "Score change must be a non-zero integer");
  const transactionDate = data.transactionDate ? new Date(data.transactionDate) : new Date();
  if (Number.isNaN(transactionDate.getTime())) throw httpError_(400, "Transaction date is invalid");
  return {
    studentId: data.studentId,
    scoreItemId: data.scoreItemId,
    type: data.type,
    scoreChange: data.type === "PENALTY" ? -Math.abs(rawScoreChange) : Math.abs(rawScoreChange),
    transactionDate: transactionDate.toISOString(),
  };
}

function recalculateStudentScore_(studentId) {
  const transactions = rows_("ScoreTransaction")
    .filter((row) => row.studentId === studentId && !toBoolean_(row.isDeleted))
    .sort((a, b) => dateValue_(a.transactionDate) - dateValue_(b.transactionDate) || dateValue_(a.createdAt) - dateValue_(b.createdAt) || String(a.id).localeCompare(String(b.id)));
  let runningTotal = 0;
  let lastTransactionAt = "";
  transactions.forEach((transaction) => {
    runningTotal += Number(transaction.scoreChange || 0);
    lastTransactionAt = transaction.transactionDate;
    saveRow_("ScoreTransaction", { ...transaction, runningTotalScore: runningTotal });
  });
  const student = findActive_("Student", studentId);
  saveRow_("Student", { ...student, currentScore: runningTotal, lastTransactionAt, updatedAt: now_() });
}

function getTransaction_(id) {
  const row = findById_("ScoreTransaction", id);
  if (!row) return null;
  const student = findById_("Student", row.studentId);
  const scoreItem = findById_("ScoreItem", row.scoreItemId);
  return { ...row, student, scoreItem };
}

function audit_(tableName, recordId, action, oldValue, newValue) {
  appendRow_("AuditLog", {
    id: Utilities.getUuid(),
    tableName,
    recordId,
    action,
    oldValue: oldValue ? JSON.stringify(oldValue) : "",
    newValue: newValue ? JSON.stringify(newValue) : "",
    createdAt: now_(),
  });
}

function rows_(tableKey) {
  const sheet = getSheet_(tableKey);
  const values = sheet.getDataRange().getValues();
  const columns = SHEETS[tableKey].columns;
  return values.slice(1).filter((row) => row.some((cell) => cell !== "")).map((row) => {
    const item = {};
    columns.forEach((column, index) => item[column] = normalizeCell_(row[index]));
    return item;
  });
}

function appendRow_(tableKey, row) {
  const sheet = getSheet_(tableKey);
  sheet.appendRow(SHEETS[tableKey].columns.map((column) => serializeCell_(row[column])));
}

function saveRow_(tableKey, row) {
  const sheet = getSheet_(tableKey);
  const columns = SHEETS[tableKey].columns;
  const values = sheet.getDataRange().getValues();
  const idIndex = columns.indexOf("id");
  for (let i = 1; i < values.length; i += 1) {
    if (String(values[i][idIndex]) === String(row.id)) {
      sheet.getRange(i + 1, 1, 1, columns.length).setValues([columns.map((column) => serializeCell_(row[column]))]);
      return;
    }
  }
  throw httpError_(404, `${tableKey} not found`);
}

function findById_(tableKey, id) {
  return rows_(tableKey).find((row) => String(row.id) === String(id)) || null;
}

function findActive_(tableKey, id) {
  const row = findById_(tableKey, id);
  if (!row || toBoolean_(row.isDeleted)) throw httpError_(404, `${tableKey} not found`);
  return row;
}

function ensureUnique_(tableKey, fieldName, value, ignoreId) {
  const normalized = text_(value).toLowerCase();
  if (!normalized) return;
  const duplicate = rows_(tableKey).find((row) => {
    return !toBoolean_(row.isDeleted)
      && String(row.id) !== String(ignoreId || "")
      && text_(row[fieldName]).toLowerCase() === normalized;
  });
  if (duplicate) throw httpError_(400, `${fieldName} already exists`);
}

function getSheet_(tableKey) {
  const ss = getSpreadsheet_();
  const meta = SHEETS[tableKey];
  let sheet = ss.getSheetByName(meta.name);
  if (!sheet) sheet = ss.insertSheet(meta.name);
  let header = sheet.getRange(1, 1, 1, Math.max(meta.columns.length, sheet.getLastColumn() || 1)).getValues()[0];
  if (header.join("") === "") {
    sheet.getRange(1, 1, 1, meta.columns.length).setValues([meta.columns]);
    sheet.setFrozenRows(1);
  } else {
    meta.columns.forEach((column) => {
      if (header.indexOf(column) === -1) {
        const desiredIndex = meta.columns.indexOf(column);
        const nextKnownIndex = meta.columns.slice(desiredIndex + 1).findIndex((nextColumnName) => header.indexOf(nextColumnName) !== -1);
        if (nextKnownIndex !== -1) {
          const nextColumnName = meta.columns[desiredIndex + 1 + nextKnownIndex];
          const insertBefore = header.indexOf(nextColumnName) + 1;
          sheet.insertColumnBefore(insertBefore);
          sheet.getRange(1, insertBefore).setValue(column);
        } else {
          const nextColumn = sheet.getLastColumn() + 1;
          sheet.getRange(1, nextColumn).setValue(column);
        }
        header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      }
    });
  }
  return sheet;
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (id) return SpreadsheetApp.openById(id);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw httpError_(
      500,
      "Spreadsheet not found. Set Script property SPREADSHEET_ID to your Google Sheet ID, or create the Apps Script from Extensions > Apps Script inside the Sheet."
    );
  }
  return ss;
}

function normalizePath_(e) {
  const path = `/${String(e.pathInfo || "").replace(/^api\/?/, "").replace(/^\/+/, "")}`;
  return path === "/" ? "/" : path.replace(/\/$/, "");
}

function normalizeParams_(e) {
  const params = {};
  Object.keys(e.parameters || {}).forEach((key) => {
    const values = e.parameters[key].filter((value) => value !== "");
    params[key] = values.length > 1 ? values : values[0] || "";
  });
  return params;
}

function parseBody_(e) {
  if (!e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (_error) {
    return {};
  }
}

function validateStudent_(data) {
  if (!text_(data.name)) throw httpError_(400, "Student name is required");
  const grade = Number(data.grade);
  if (!Number.isInteger(grade) || grade < 1 || grade > 9) throw httpError_(400, "Grade must be an integer from 1 to 9");
}

function validateScoreItem_(data) {
  if (data.type !== "REWARD" && data.type !== "PENALTY") throw httpError_(400, "Type must be REWARD or PENALTY");
  if (!text_(data.mainCategory)) throw httpError_(400, "Main category is required");
  if (!text_(data.subCategory)) throw httpError_(400, "Sub category is required");
  const score = Number(data.score);
  if (!Number.isInteger(score) || score === 0) throw httpError_(400, "Score must be a non-zero integer");
}

function validateUserAccount_(data) {
  if (!text_(data.account)) throw httpError_(400, "Account is required");
  if (!text_(data.name)) throw httpError_(400, "Name is required");
  if (data.role !== "ADMIN" && data.role !== "VIEWER") throw httpError_(400, "Role must be ADMIN or VIEWER");
}

function indexById_(rows) {
  return rows.reduce((index, row) => {
    index[row.id] = row;
    return index;
  }, {});
}

function asArray_(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function serializeCell_(value) {
  if (value === null || value === undefined) return "";
  return value;
}

function normalizeCell_(value) {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function dateValue_(value) {
  return new Date(value || 0).getTime();
}

function startOfDay_(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function endOfDay_(value) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

function compareDateDesc_(a, b) {
  return dateValue_(b) - dateValue_(a);
}

function parseJson_(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return value;
  }
}

function text_(value) {
  return String(value || "").trim();
}

function emptyToNull_(value) {
  const text = text_(value);
  return text || "";
}

function toBoolean_(value) {
  return value === true || String(value).toLowerCase() === "true";
}

function now_() {
  return new Date().toISOString();
}

function httpError_(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
