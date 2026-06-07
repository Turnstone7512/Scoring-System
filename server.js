const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/students") {
      return serveFile(res, path.join(ROOT, "students.html"));
    }

    if (url.pathname === "/score-items") {
      return serveFile(res, path.join(ROOT, "score-items.html"));
    }

    if (url.pathname === "/score-transactions") {
      return serveFile(res, path.join(ROOT, "score-transactions.html"));
    }

    if (url.pathname === "/reports/score-details") {
      return serveFile(res, path.join(ROOT, "score-details-report.html"));
    }

    if (url.pathname === "/audit-logs") {
      return serveFile(res, path.join(ROOT, "audit-logs.html"));
    }

    if (url.pathname === "/user-accounts") {
      return serveFile(res, path.join(ROOT, "user-accounts.html"));
    }

    if (url.pathname === "/api/students" && req.method === "GET") {
      return getStudents(res);
    }

    if (url.pathname === "/api/students" && req.method === "POST") {
      return createStudent(req, res);
    }

    const studentAuditMatch = url.pathname.match(/^\/api\/students\/([^/]+)\/audit-logs$/);
    if (studentAuditMatch && req.method === "GET") {
      return getAuditLogs(res, "Student", studentAuditMatch[1]);
    }

    const studentMatch = url.pathname.match(/^\/api\/students\/([^/]+)$/);
    if (studentMatch && req.method === "PUT") {
      return updateStudent(req, res, studentMatch[1]);
    }

    if (studentMatch && req.method === "DELETE") {
      return deleteStudent(res, studentMatch[1]);
    }

    if (url.pathname === "/api/score-items" && req.method === "GET") {
      return getScoreItems(res, url.searchParams.get("type"));
    }

    if (url.pathname === "/api/score-items" && req.method === "POST") {
      return createScoreItem(req, res);
    }

    const scoreItemAuditMatch = url.pathname.match(/^\/api\/score-items\/([^/]+)\/audit-logs$/);
    if (scoreItemAuditMatch && req.method === "GET") {
      return getAuditLogs(res, "ScoreItem", scoreItemAuditMatch[1]);
    }

    const scoreItemMatch = url.pathname.match(/^\/api\/score-items\/([^/]+)$/);
    if (scoreItemMatch && req.method === "PUT") {
      return updateScoreItem(req, res, scoreItemMatch[1]);
    }

    if (scoreItemMatch && req.method === "DELETE") {
      return deleteScoreItem(res, scoreItemMatch[1]);
    }

    if (url.pathname === "/api/score-transactions" && req.method === "GET") {
      return getScoreTransactions(res, url.searchParams);
    }

    if (url.pathname === "/api/score-transactions" && req.method === "POST") {
      return createScoreTransaction(req, res);
    }

    const transactionAuditMatch = url.pathname.match(/^\/api\/score-transactions\/([^/]+)\/audit-logs$/);
    if (transactionAuditMatch && req.method === "GET") {
      return getAuditLogs(res, "ScoreTransaction", transactionAuditMatch[1]);
    }

    const transactionMatch = url.pathname.match(/^\/api\/score-transactions\/([^/]+)$/);
    if (transactionMatch && req.method === "PUT") {
      return updateScoreTransaction(req, res, transactionMatch[1]);
    }

    if (transactionMatch && req.method === "DELETE") {
      return deleteScoreTransaction(res, transactionMatch[1]);
    }

    if (url.pathname === "/api/reports/score-details" && req.method === "GET") {
      return getScoreDetailsReport(res, url.searchParams);
    }

    if (url.pathname === "/api/audit-logs" && req.method === "GET") {
      return getAuditLogSearch(res, url.searchParams);
    }

    if (url.pathname === "/api/user-accounts" && req.method === "GET") {
      return getUserAccounts(res);
    }

    if (url.pathname === "/api/user-accounts" && req.method === "POST") {
      return createUserAccount(req, res);
    }

    const userAccountMatch = url.pathname.match(/^\/api\/user-accounts\/([^/]+)$/);
    if (userAccountMatch && req.method === "PUT") {
      return updateUserAccount(req, res, userAccountMatch[1]);
    }

    if (userAccountMatch && req.method === "DELETE") {
      return deleteUserAccount(res, userAccountMatch[1]);
    }

    if (url.pathname === "/api/reports/monthly-scores" && req.method === "GET") {
      return getMonthlyScores(res);
    }

    return serveStatic(req, res, url.pathname);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { message: "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Scoring system server is running at http://localhost:${PORT}`);
});

async function getStudents(res) {
  const students = await prisma.student.findMany({
    where: { isDeleted: false },
    orderBy: [{ grade: "asc" }, { classNo: "asc" }, { createdAt: "desc" }],
  });

  return sendJson(res, 200, students);
}

async function getUserAccounts(res) {
  const accounts = await prisma.userAccount.findMany({
    where: { isDeleted: false },
    orderBy: [{ role: "asc" }, { account: "asc" }],
  });

  return sendJson(res, 200, accounts);
}

async function createUserAccount(req, res) {
  const data = await readJson(req);
  const validation = validateUserAccount(data);

  if (!validation.valid) {
    return sendJson(res, 400, { message: validation.message });
  }

  const account = await prisma.$transaction(async (tx) => {
    const created = await tx.userAccount.create({
      data: normalizeUserAccountInput(data),
    });
    await createAuditLog(tx, "UserAccount", created.id, "CREATE", null, created);
    return created;
  });

  return sendJson(res, 201, account);
}

async function updateUserAccount(req, res, id) {
  const data = await readJson(req);
  const validation = validateUserAccount(data);

  if (!validation.valid) {
    return sendJson(res, 400, { message: validation.message });
  }

  const existing = await prisma.userAccount.findFirst({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    return sendJson(res, 404, { message: "User account not found" });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.userAccount.update({
      where: { id },
      data: normalizeUserAccountInput(data),
    });
    await createAuditLog(tx, "UserAccount", id, "UPDATE", existing, next);
    return next;
  });

  return sendJson(res, 200, updated);
}

async function deleteUserAccount(res, id) {
  const existing = await prisma.userAccount.findFirst({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    return sendJson(res, 404, { message: "User account not found" });
  }

  const deleted = await prisma.$transaction(async (tx) => {
    const next = await tx.userAccount.update({
      where: { id },
      data: { isDeleted: true },
    });
    await createAuditLog(tx, "UserAccount", id, "DELETE", existing, next);
    return next;
  });

  return sendJson(res, 200, deleted);
}

async function createStudent(req, res) {
  const data = await readJson(req);
  const validation = validateStudent(data);

  if (!validation.valid) {
    return sendJson(res, 400, { message: validation.message });
  }

  const student = await prisma.$transaction(async (tx) => {
    const created = await tx.student.create({
      data: normalizeStudentInput(data),
    });

    await createAuditLog(tx, "Student", created.id, "CREATE", null, created);
    return created;
  });

  return sendJson(res, 201, student);
}

async function updateStudent(req, res, id) {
  const data = await readJson(req);
  const validation = validateStudent(data);

  if (!validation.valid) {
    return sendJson(res, 400, { message: validation.message });
  }

  const existing = await prisma.student.findFirst({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    return sendJson(res, 404, { message: "Student not found" });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.student.update({
      where: { id },
      data: normalizeStudentInput(data),
    });

    await createAuditLog(tx, "Student", id, "UPDATE", existing, next);
    return next;
  });

  return sendJson(res, 200, updated);
}

async function deleteStudent(res, id) {
  const existing = await prisma.student.findFirst({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    return sendJson(res, 404, { message: "Student not found" });
  }

  const deleted = await prisma.$transaction(async (tx) => {
    const next = await tx.student.update({
      where: { id },
      data: { isDeleted: true },
    });

    await createAuditLog(tx, "Student", id, "DELETE", existing, next);
    return next;
  });

  return sendJson(res, 200, deleted);
}

async function getScoreItems(res, type) {
  const where = { isDeleted: false };
  if (type === "REWARD" || type === "PENALTY") {
    where.type = type;
  }

  const items = await prisma.scoreItem.findMany({
    where,
    orderBy: [{ type: "asc" }, { mainCategory: "asc" }, { subCategory: "asc" }],
  });

  return sendJson(res, 200, items);
}

async function createScoreItem(req, res) {
  const data = await readJson(req);
  const validation = validateScoreItem(data);

  if (!validation.valid) {
    return sendJson(res, 400, { message: validation.message });
  }

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.scoreItem.create({
      data: normalizeScoreItemInput(data),
    });

    await createAuditLog(tx, "ScoreItem", created.id, "CREATE", null, created);
    return created;
  });

  return sendJson(res, 201, item);
}

async function updateScoreItem(req, res, id) {
  const data = await readJson(req);
  const validation = validateScoreItem(data);

  if (!validation.valid) {
    return sendJson(res, 400, { message: validation.message });
  }

  const existing = await prisma.scoreItem.findFirst({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    return sendJson(res, 404, { message: "Score item not found" });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.scoreItem.update({
      where: { id },
      data: normalizeScoreItemInput(data),
    });

    await createAuditLog(tx, "ScoreItem", id, "UPDATE", existing, next);
    return next;
  });

  return sendJson(res, 200, updated);
}

async function deleteScoreItem(res, id) {
  const existing = await prisma.scoreItem.findFirst({
    where: { id, isDeleted: false },
  });

  if (!existing) {
    return sendJson(res, 404, { message: "Score item not found" });
  }

  const deleted = await prisma.$transaction(async (tx) => {
    const next = await tx.scoreItem.update({
      where: { id },
      data: { isDeleted: true },
    });

    await createAuditLog(tx, "ScoreItem", id, "DELETE", existing, next);
    return next;
  });

  return sendJson(res, 200, deleted);
}

async function getScoreTransactions(res, searchParams) {
  const where = {
    isDeleted: false,
    student: { isDeleted: false },
  };
  const studentId = searchParams.get("studentId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (studentId) {
    where.studentId = studentId;
  }

  if (dateFrom || dateTo) {
    where.transactionDate = {};
    if (dateFrom) {
      where.transactionDate.gte = startOfDay(dateFrom);
    }
    if (dateTo) {
      where.transactionDate.lte = endOfDay(dateTo);
    }
  }

  const transactions = await prisma.scoreTransaction.findMany({
    where,
    include: {
      student: true,
      scoreItem: true,
    },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  });

  return sendJson(res, 200, transactions);
}

async function getScoreDetailsReport(res, searchParams) {
  const where = {
    isDeleted: false,
    student: { isDeleted: false },
  };
  const studentId = searchParams.get("studentId");
  const type = searchParams.get("type");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const scoreItemIds = searchParams.getAll("scoreItemId").filter(Boolean);

  if (studentId) {
    where.studentId = studentId;
  }

  if (type === "REWARD" || type === "PENALTY") {
    where.type = type;
  }

  if (scoreItemIds.length) {
    where.scoreItemId = { in: scoreItemIds };
  }

  if (dateFrom || dateTo) {
    where.transactionDate = {};
    if (dateFrom) {
      where.transactionDate.gte = startOfDay(dateFrom);
    }
    if (dateTo) {
      where.transactionDate.lte = endOfDay(dateTo);
    }
  }

  const rows = await prisma.scoreTransaction.findMany({
    where,
    include: {
      student: true,
      scoreItem: true,
    },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  });

  return sendJson(res, 200, rows);
}

async function getMonthlyScores(res) {
  const transactions = await prisma.scoreTransaction.findMany({
    where: {
      isDeleted: false,
      student: { isDeleted: false },
    },
    select: {
      transactionDate: true,
      scoreChange: true,
    },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
  });

  const monthly = new Map();
  for (const transaction of transactions) {
    const date = new Date(transaction.transactionDate);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthly.set(month, (monthly.get(month) || 0) + transaction.scoreChange);
  }

  const rows = Array.from(monthly.entries()).map(([month, score]) => ({ month, score }));
  return sendJson(res, 200, rows);
}

async function createScoreTransaction(req, res) {
  const data = await readJson(req);
  const prepared = await prepareScoreTransactionInput(data);

  if (!prepared.valid) {
    return sendJson(res, 400, { message: prepared.message });
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const created = await tx.scoreTransaction.create({
      data: prepared.data,
    });

    await recalculateStudentScore(tx, created.studentId);
    const next = await getScoreTransactionById(tx, created.id);
    await createAuditLog(tx, "ScoreTransaction", created.id, "CREATE", null, next);
    return next;
  });

  return sendJson(res, 201, transaction);
}

async function updateScoreTransaction(req, res, id) {
  const data = await readJson(req);
  const existing = await prisma.scoreTransaction.findFirst({
    where: { id, isDeleted: false },
    include: { student: true, scoreItem: true },
  });

  if (!existing) {
    return sendJson(res, 404, { message: "Score transaction not found" });
  }

  const prepared = await prepareScoreTransactionInput(data);

  if (!prepared.valid) {
    return sendJson(res, 400, { message: prepared.message });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.scoreTransaction.update({
      where: { id },
      data: prepared.data,
    });

    await recalculateStudentScore(tx, existing.studentId);
    if (existing.studentId !== prepared.data.studentId) {
      await recalculateStudentScore(tx, prepared.data.studentId);
    }

    const next = await getScoreTransactionById(tx, id);
    await createAuditLog(tx, "ScoreTransaction", id, "UPDATE", existing, next);
    return next;
  });

  return sendJson(res, 200, updated);
}

async function deleteScoreTransaction(res, id) {
  const existing = await prisma.scoreTransaction.findFirst({
    where: { id, isDeleted: false },
    include: { student: true, scoreItem: true },
  });

  if (!existing) {
    return sendJson(res, 404, { message: "Score transaction not found" });
  }

  const deleted = await prisma.$transaction(async (tx) => {
    await tx.scoreTransaction.update({
      where: { id },
      data: { isDeleted: true },
    });

    await recalculateStudentScore(tx, existing.studentId);
    const next = await getScoreTransactionById(tx, id);
    await createAuditLog(tx, "ScoreTransaction", id, "DELETE", existing, next);
    return next;
  });

  return sendJson(res, 200, deleted);
}

async function getAuditLogs(res, tableName, recordId) {
  const logs = await prisma.auditLog.findMany({
    where: { tableName, recordId },
    orderBy: { createdAt: "desc" },
  });

  return sendJson(res, 200, logs);
}

async function getAuditLogSearch(res, searchParams) {
  const where = {};
  const tableName = searchParams.get("tableName");
  const action = searchParams.get("action");
  const recordId = searchParams.get("recordId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (tableName) {
    where.tableName = tableName;
  }

  if (action === "CREATE" || action === "UPDATE" || action === "DELETE") {
    where.action = action;
  }

  if (recordId) {
    where.recordId = recordId;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = startOfDay(dateFrom);
    }
    if (dateTo) {
      where.createdAt.lte = endOfDay(dateTo);
    }
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return sendJson(res, 200, logs);
}

async function createAuditLog(tx, tableName, recordId, action, oldValue, newValue) {
  await tx.auditLog.create({
    data: {
      tableName,
      recordId,
      action,
      oldValue: oldValue ? toAuditValue(oldValue) : null,
      newValue: newValue ? toAuditValue(newValue) : null,
    },
  });
}

async function prepareScoreTransactionInput(data) {
  if (!data || typeof data !== "object") {
    return { valid: false, message: "Score transaction data is required" };
  }

  if (!data.studentId) {
    return { valid: false, message: "Student is required" };
  }

  if (data.type !== "REWARD" && data.type !== "PENALTY") {
    return { valid: false, message: "Type must be REWARD or PENALTY" };
  }

  if (!data.scoreItemId) {
    return { valid: false, message: "Score item is required" };
  }

  const student = await prisma.student.findFirst({
    where: { id: data.studentId, isDeleted: false },
  });
  if (!student) {
    return { valid: false, message: "Student not found" };
  }

  const scoreItem = await prisma.scoreItem.findFirst({
    where: { id: data.scoreItemId, isDeleted: false },
  });
  if (!scoreItem) {
    return { valid: false, message: "Score item not found" };
  }

  if (scoreItem.type !== data.type) {
    return { valid: false, message: "Score item type does not match transaction type" };
  }

  const rawScoreChange = Number(data.scoreChange || scoreItem.score);
  if (!Number.isInteger(rawScoreChange) || rawScoreChange === 0) {
    return { valid: false, message: "Score change must be a non-zero integer" };
  }

  const transactionDate = data.transactionDate ? new Date(data.transactionDate) : new Date();
  if (Number.isNaN(transactionDate.getTime())) {
    return { valid: false, message: "Transaction date is invalid" };
  }

  const normalizedScoreChange = data.type === "PENALTY"
    ? -Math.abs(rawScoreChange)
    : Math.abs(rawScoreChange);

  return {
    valid: true,
    data: {
      studentId: data.studentId,
      scoreItemId: data.scoreItemId,
      type: data.type,
      scoreChange: normalizedScoreChange,
      runningTotalScore: 0,
      transactionDate,
    },
  };
}

async function recalculateStudentScore(tx, studentId) {
  const transactions = await tx.scoreTransaction.findMany({
    where: {
      studentId,
      isDeleted: false,
    },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  let runningTotal = 0;
  let lastTransactionAt = null;

  for (const transaction of transactions) {
    runningTotal += transaction.scoreChange;
    lastTransactionAt = transaction.transactionDate;

    if (transaction.runningTotalScore !== runningTotal) {
      await tx.scoreTransaction.update({
        where: { id: transaction.id },
        data: { runningTotalScore: runningTotal },
      });
    }
  }

  await tx.student.update({
    where: { id: studentId },
    data: {
      currentScore: runningTotal,
      lastTransactionAt,
    },
  });
}

async function getScoreTransactionById(tx, id) {
  return tx.scoreTransaction.findUnique({
    where: { id },
    include: {
      student: true,
      scoreItem: true,
    },
  });
}

function validateStudent(data) {
  if (!data || typeof data !== "object") {
    return { valid: false, message: "Student data is required" };
  }

  if (!String(data.name || "").trim()) {
    return { valid: false, message: "Student name is required" };
  }

  const grade = Number(data.grade);
  if (!Number.isInteger(grade) || grade < 1 || grade > 9) {
    return { valid: false, message: "Grade must be an integer from 1 to 9" };
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) {
    return { valid: false, message: "Email is invalid" };
  }

  if (data.photoUrl && !isValidUrl(data.photoUrl)) {
    return { valid: false, message: "Photo URL is invalid" };
  }

  return { valid: true };
}

function validateUserAccount(data) {
  if (!data || typeof data !== "object") {
    return { valid: false, message: "User account data is required" };
  }

  if (!String(data.account || "").trim()) {
    return { valid: false, message: "Account is required" };
  }

  if (!String(data.name || "").trim()) {
    return { valid: false, message: "Name is required" };
  }

  if (data.role !== "ADMIN" && data.role !== "VIEWER") {
    return { valid: false, message: "Role must be ADMIN or VIEWER" };
  }

  return { valid: true };
}

function validateScoreItem(data) {
  if (!data || typeof data !== "object") {
    return { valid: false, message: "Score item data is required" };
  }

  if (data.type !== "REWARD" && data.type !== "PENALTY") {
    return { valid: false, message: "Type must be REWARD or PENALTY" };
  }

  if (!String(data.mainCategory || "").trim()) {
    return { valid: false, message: "Main category is required" };
  }

  if (!String(data.subCategory || "").trim()) {
    return { valid: false, message: "Sub category is required" };
  }

  const score = Number(data.score);
  if (!Number.isInteger(score) || score === 0) {
    return { valid: false, message: "Score must be a non-zero integer" };
  }

  if (data.type === "REWARD" && score < 0) {
    return { valid: false, message: "Reward score must be positive" };
  }

  if (data.imageUrl && !isValidUrl(data.imageUrl)) {
    return { valid: false, message: "Image URL is invalid" };
  }

  return { valid: true };
}

function normalizeStudentInput(data) {
  return {
    name: String(data.name).trim(),
    grade: Number(data.grade),
    classNo: emptyToNull(data.classNo),
    email: emptyToNull(data.email),
    photoUrl: emptyToNull(data.photoUrl),
  };
}

function normalizeUserAccountInput(data) {
  return {
    account: String(data.account).trim(),
    name: String(data.name).trim(),
    role: data.role,
  };
}

function normalizeScoreItemInput(data) {
  const score = Math.abs(Number(data.score));

  return {
    type: data.type,
    mainCategory: String(data.mainCategory).trim(),
    subCategory: String(data.subCategory).trim(),
    imageUrl: emptyToNull(data.imageUrl),
    score: data.type === "PENALTY" ? -score : score,
  };
}

function emptyToNull(value) {
  const text = String(value || "").trim();
  return text || null;
}

function isValidUrl(value) {
  try {
    new URL(String(value));
    return true;
  } catch {
    return false;
  }
}

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function toAuditValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(ROOT, safePath));

  if (!filePath.startsWith(ROOT)) {
    return sendText(res, 403, "Forbidden");
  }

  return serveFile(res, filePath);
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      return sendText(res, 404, "Not found");
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(content);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}
