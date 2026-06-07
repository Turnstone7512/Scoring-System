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

async function getAuditLogs(res, tableName, recordId) {
  const logs = await prisma.auditLog.findMany({
    where: { tableName, recordId },
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
