(function () {
  const nativeFetch = window.fetch.bind(window);
  const config = window.SCORING_SYSTEM_CONFIG || {};
  const missingConfig = !config.supabaseUrl
    || !config.supabaseAnonKey
    || String(config.supabaseUrl).includes("PASTE_")
    || String(config.supabaseAnonKey).includes("PASTE_");

  const authClient = !missingConfig && window.supabase
    ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
    : null;

  window.ScoringSupabase = { client: authClient };

  window.fetch = async function scoringSystemFetch(input, options = {}) {
    const requestUrl = typeof input === "string" ? input : input.url;
    if (!requestUrl || !requestUrl.startsWith("/api/")) {
      return nativeFetch(input, options);
    }

    try {
      if (missingConfig) throw new Error("尚未設定 Supabase Project URL 與 anon key。");
      const method = String(options.method || "GET").toUpperCase();
      const url = new URL(requestUrl, window.location.origin);
      const body = options.body ? JSON.parse(options.body) : {};
      const data = await route(method, url.pathname.replace(/^\/api/, "") || "/", url.searchParams, body);
      return jsonResponse(data, 200);
    } catch (error) {
      return jsonResponse({ message: error.message || "Supabase API 連線失敗。" }, error.status || 400);
    }
  };

  async function route(method, path, params, body) {
    if (path === "/students" && method === "GET") return listStudents();
    if (path === "/students" && method === "POST") return createStudent(body);
    let match = path.match(/^\/students\/([^/]+)\/audit-logs$/);
    if (match && method === "GET") return listAuditLogs(new URLSearchParams({ tableName: "Student", recordId: match[1] }));
    match = path.match(/^\/students\/([^/]+)$/);
    if (match && method === "PUT") return updateStudent(match[1], body);
    if (match && method === "DELETE") return softDelete("students", "Student", match[1]);

    if (path === "/score-items" && method === "GET") return listScoreItems(params.get("type"));
    if (path === "/score-items" && method === "POST") return createScoreItem(body);
    match = path.match(/^\/score-items\/([^/]+)\/audit-logs$/);
    if (match && method === "GET") return listAuditLogs(new URLSearchParams({ tableName: "ScoreItem", recordId: match[1] }));
    match = path.match(/^\/score-items\/([^/]+)$/);
    if (match && method === "PUT") return updateScoreItem(match[1], body);
    if (match && method === "DELETE") return softDelete("score_items", "ScoreItem", match[1]);

    if (path === "/score-transactions" && method === "GET") return listTransactions(params);
    if (path === "/score-transactions" && method === "POST") return createTransaction(body);
    if (path === "/score-transactions/settlement" && method === "POST") return createSettlement(body);
    match = path.match(/^\/score-transactions\/([^/]+)\/audit-logs$/);
    if (match && method === "GET") return listAuditLogs(new URLSearchParams({ tableName: "ScoreTransaction", recordId: match[1] }));
    match = path.match(/^\/score-transactions\/([^/]+)$/);
    if (match && method === "PUT") return updateTransaction(match[1], body);
    if (match && method === "DELETE") return deleteTransaction(match[1]);

    if (path === "/reports/score-details" && method === "GET") return listTransactions(params);
    if (path === "/reports/monthly-scores" && method === "GET") return monthlyScores();
    if (path === "/audit-logs" && method === "GET") return listAuditLogs(params);

    if (path === "/user-accounts" && method === "GET") return listUserAccounts();
    match = path.match(/^\/user-accounts\/([^/]+)$/);
    if (match && method === "PUT") return updateUserAccount(match[1], body);

    throw httpError(404, `Route not found: ${method} ${path}`);
  }

  async function api(path, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const method = String(options.method || "GET").toUpperCase();
    const bearer = method === "GET" ? config.supabaseAnonKey : await getAccessToken();
    const headers = {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    try {
      const response = await nativeFetch(`${config.supabaseUrl}/rest/v1${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw httpError(response.status, data?.message || data?.hint || "Supabase API 錯誤。");
      }
      return data;
    } catch (error) {
      if (error.name === "AbortError") throw httpError(504, "Supabase API 回應逾時，請稍後再試。");
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function getAccessToken() {
    if (!authClient) return config.supabaseAnonKey;
    const { data } = await authClient.auth.getSession();
    return data?.session?.access_token || config.supabaseAnonKey;
  }

  async function listStudents() {
    const rows = await api("/students?select=*&is_deleted=eq.false&order=grade.asc,class_no.asc,created_at.desc");
    return rows.map(mapStudent);
  }

  async function createStudent(data) {
    const row = {
      name: text(data.name),
      grade: Number(data.grade),
      class_no: emptyToNull(data.classNo),
      email: emptyToNull(data.email),
      photo_url: emptyToNull(data.photoUrl),
    };
    const [inserted] = await api("/students?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    await audit("Student", inserted.id, "CREATE", null, inserted);
    return mapStudent(inserted);
  }

  async function updateStudent(id, data) {
    const existing = await getRow("students", id);
    const row = {
      name: text(data.name),
      grade: Number(data.grade),
      class_no: emptyToNull(data.classNo),
      email: emptyToNull(data.email),
      photo_url: emptyToNull(data.photoUrl),
      updated_at: new Date().toISOString(),
    };
    const [updated] = await api(`/students?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    await audit("Student", id, "UPDATE", existing, updated);
    return mapStudent(updated);
  }

  async function listScoreItems(type) {
    let path = "/score_items?select=*&is_deleted=eq.false&order=type.asc,main_category.asc,sub_category.asc";
    if (type) path += `&type=eq.${encodeURIComponent(type)}`;
    const rows = await api(path);
    return rows.map(mapScoreItem);
  }

  async function createScoreItem(data) {
    const score = Math.abs(Number(data.score));
    const row = {
      type: data.type,
      student_id: emptyToNull(data.studentId),
      main_category: text(data.mainCategory),
      sub_category: text(data.subCategory),
      image_url: emptyToNull(data.imageUrl),
      score: data.type === "PENALTY" ? -score : score,
    };
    const [inserted] = await api("/score_items?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    await audit("ScoreItem", inserted.id, "CREATE", null, inserted);
    return mapScoreItem(inserted);
  }

  async function updateScoreItem(id, data) {
    const existing = await getRow("score_items", id);
    const score = Math.abs(Number(data.score));
    const row = {
      type: data.type,
      student_id: emptyToNull(data.studentId),
      main_category: text(data.mainCategory),
      sub_category: text(data.subCategory),
      image_url: emptyToNull(data.imageUrl),
      score: data.type === "PENALTY" ? -score : score,
      updated_at: new Date().toISOString(),
    };
    const [updated] = await api(`/score_items?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    await audit("ScoreItem", id, "UPDATE", existing, updated);
    return mapScoreItem(updated);
  }

  async function listTransactions(params) {
    let path = "/score_transactions?select=*,student:students(*),score_item:score_items(*)&is_deleted=eq.false&order=transaction_date.desc,created_at.desc";
    if (params.get("studentId")) path += `&student_id=eq.${encodeURIComponent(params.get("studentId"))}`;
    if (params.get("type")) path += `&type=eq.${encodeURIComponent(params.get("type"))}`;
    if (params.get("dateFrom")) path += `&transaction_date=gte.${encodeURIComponent(startOfDay(params.get("dateFrom")))}`;
    if (params.get("dateTo")) path += `&transaction_date=lte.${encodeURIComponent(endOfDay(params.get("dateTo")))}`;
    const scoreItemIds = params.getAll("scoreItemId");
    if (scoreItemIds.length) path += `&score_item_id=in.(${scoreItemIds.map(encodeURIComponent).join(",")})`;
    const rows = await api(path);
    return rows.map(mapTransaction);
  }

  async function createTransaction(data) {
    const row = {
      student_id: data.studentId,
      score_item_id: data.scoreItemId,
      type: data.type,
      score_change: signedScore(data.type, data.scoreChange),
      running_total_score: 0,
      transaction_date: new Date(data.transactionDate || Date.now()).toISOString(),
    };
    const [inserted] = await api("/score_transactions?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    await recalcStudent(inserted.student_id);
    const next = await getTransaction(inserted.id);
    await audit("ScoreTransaction", inserted.id, "CREATE", null, next);
    return mapTransaction(next);
  }

  async function createSettlement(data) {
    const transactionDate = new Date(data.transactionDate || Date.now()).toISOString();
    const targetScore = Number(data.targetScore);
    const row = {
      student_id: data.studentId,
      score_item_id: null,
      type: "SETTLEMENT",
      score_change: targetScore,
      settlement_score: targetScore,
      running_total_score: targetScore,
      transaction_date: transactionDate,
    };
    const [inserted] = await api("/score_transactions?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    await recalcStudent(inserted.student_id);
    const next = await getTransaction(inserted.id);
    await audit("ScoreTransaction", inserted.id, "CREATE", null, next);
    return mapTransaction(next);
  }

  async function updateTransaction(id, data) {
    const existing = await getRow("score_transactions", id);
    const row = {
      student_id: data.studentId,
      score_item_id: data.scoreItemId,
      type: data.type,
      score_change: signedScore(data.type, data.scoreChange),
      transaction_date: new Date(data.transactionDate || Date.now()).toISOString(),
      updated_at: new Date().toISOString(),
    };
    await api(`/score_transactions?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(row) });
    await recalcStudent(existing.student_id);
    if (existing.student_id !== row.student_id) await recalcStudent(row.student_id);
    const updated = await getTransaction(id);
    await audit("ScoreTransaction", id, "UPDATE", existing, updated);
    return mapTransaction(updated);
  }

  async function deleteTransaction(id) {
    const existing = await getRow("score_transactions", id);
    await rpc("admin_delete_score_transaction", { p_id: id });
    await audit("ScoreTransaction", id, "DELETE", existing, { ...existing, is_deleted: true });
    return { id };
  }

  async function monthlyScores() {
    const [studentRows, transactionRows] = await Promise.all([
      listStudents(),
      listTransactions(new URLSearchParams()),
    ]);
    const transactions = [...transactionRows].sort((a, b) => {
      return new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
        || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        || String(a.id).localeCompare(String(b.id));
    });
    const monthSet = new Set(transactions.map((transaction) => monthKey(transaction.transactionDate)));
    const months = [...monthSet].sort();
    if (!months.length || !studentRows.length) return { months: [], students: [] };

    const transactionsByStudent = new Map();
    transactions.forEach((transaction) => {
      const list = transactionsByStudent.get(transaction.studentId) || [];
      list.push(transaction);
      transactionsByStudent.set(transaction.studentId, list);
    });

    return {
      months,
      students: studentRows.map((student, index) => {
        const studentTransactions = transactionsByStudent.get(student.id) || [];
        let runningTotal = 0;
        let cursor = 0;
        return {
          id: student.id,
          name: student.name,
          color: chartColor(index),
          points: months.map((month) => {
            const monthEnd = endOfMonth(month);
            while (
              cursor < studentTransactions.length
              && new Date(studentTransactions[cursor].transactionDate).getTime() <= monthEnd.getTime()
            ) {
              const transaction = studentTransactions[cursor];
              if (!transaction.scoreItemId && transaction.settlementScore !== null && transaction.settlementScore !== undefined) {
                runningTotal = Number(transaction.settlementScore || 0);
              } else {
                runningTotal += Number(transaction.scoreChange || 0);
              }
              cursor += 1;
            }
            return { month, score: runningTotal };
          }),
        };
      }).filter((student) => student.points.some((point) => point.score !== 0)),
    };
  }

  async function listAuditLogs(params) {
    let path = "/audit_logs?select=*&order=created_at.desc";
    if (params.get("tableName")) path += `&table_name=eq.${encodeURIComponent(params.get("tableName"))}`;
    if (params.get("recordId")) path += `&record_id=eq.${encodeURIComponent(params.get("recordId"))}`;
    if (params.get("action")) path += `&action=eq.${encodeURIComponent(params.get("action"))}`;
    if (params.get("dateFrom")) path += `&created_at=gte.${encodeURIComponent(startOfDay(params.get("dateFrom")))}`;
    if (params.get("dateTo")) path += `&created_at=lte.${encodeURIComponent(endOfDay(params.get("dateTo")))}`;
    const rows = await api(path);
    return rows.map(mapAuditLog);
  }

  async function listUserAccounts() {
    const rows = await api("/profiles?select=*&order=role.asc,display_name.asc");
    return rows.map(mapProfile);
  }

  async function updateUserAccount(id, data) {
    const existing = await getRow("profiles", id);
    const row = {
      display_name: text(data.name || data.account),
      role: data.role,
      updated_at: new Date().toISOString(),
    };
    const [updated] = await api(`/profiles?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    await audit("UserAccount", id, "UPDATE", existing, updated);
    return mapProfile(updated);
  }

  async function softDelete(table, tableName, id) {
    const existing = await getRow(table, id);
    const [updated] = await api(`/${table}?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ is_deleted: true, updated_at: new Date().toISOString() }),
    });
    await audit(tableName, id, "DELETE", existing, updated);
    return { id };
  }

  async function recalcStudent(studentId) {
    await rpc("admin_recalc_student", { p_student_id: studentId });
  }

  async function rpc(functionName, body) {
    return api(`/rpc/${functionName}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async function audit(tableName, recordId, action, oldValue, newValue) {
    await api("/audit_logs", {
      method: "POST",
      body: JSON.stringify({
        table_name: tableName,
        record_id: recordId,
        action,
        old_value: oldValue,
        new_value: newValue,
      }),
    });
  }

  async function getRow(table, id) {
    const rows = await api(`/${table}?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
    if (!rows.length) throw httpError(404, "資料不存在。");
    return rows[0];
  }

  async function getTransaction(id) {
    const rows = await api(`/score_transactions?select=*,student:students(*),score_item:score_items(*)&id=eq.${encodeURIComponent(id)}&limit=1`);
    if (!rows.length) throw httpError(404, "異動資料不存在。");
    return rows[0];
  }

  function mapStudent(row) {
    return {
      id: row.id,
      name: row.name,
      grade: row.grade,
      classNo: row.class_no,
      email: row.email,
      photoUrl: row.photo_url,
      currentScore: row.current_score,
      lastTransactionAt: row.last_transaction_at,
      isDeleted: row.is_deleted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function mapScoreItem(row) {
    return {
      id: row.id,
      type: row.type,
      studentId: row.student_id,
      mainCategory: row.main_category,
      subCategory: row.sub_category,
      imageUrl: row.image_url,
      score: row.score,
      isDeleted: row.is_deleted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function mapTransaction(row) {
    return {
      id: row.id,
      studentId: row.student_id,
      scoreItemId: row.score_item_id,
      type: row.type,
      scoreChange: row.score_change,
      settlementScore: row.settlement_score,
      runningTotalScore: row.running_total_score,
      transactionDate: row.transaction_date,
      isDeleted: row.is_deleted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      student: row.student ? mapStudent(row.student) : null,
      scoreItem: row.score_item ? mapScoreItem(row.score_item) : (row.score_item_id ? null : {
        id: null,
        type: row.type,
        mainCategory: "結算",
        subCategory: "結餘調整",
        imageUrl: null,
        score: row.settlement_score ?? row.running_total_score,
      }),
    };
  }

  function mapAuditLog(row) {
    return {
      id: row.id,
      tableName: row.table_name,
      recordId: row.record_id,
      action: row.action,
      oldValue: row.old_value,
      newValue: row.new_value,
      createdAt: row.created_at,
    };
  }

  function mapProfile(row) {
    return {
      id: row.id,
      account: row.display_name,
      name: row.display_name,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function signedScore(type, score) {
    const value = Math.abs(Number(score));
    if (type === "SETTLEMENT") return Number(score || 0);
    return type === "PENALTY" ? -value : value;
  }

  function startOfDay(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }

  function endOfDay(value) {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }

  function endOfMonth(month) {
    const [year, monthNumber] = String(month).split("-").map(Number);
    return new Date(year, monthNumber, 0, 23, 59, 59, 999);
  }

  function monthKey(value) {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function chartColor(index) {
    const colors = ["#0ea5e9", "#22c55e", "#f97316", "#a855f7", "#ef4444", "#14b8a6", "#eab308", "#6366f1", "#ec4899", "#64748b"];
    return colors[index % colors.length];
  }

  function emptyToNull(value) {
    const result = text(value);
    return result ? result : null;
  }

  function text(value) {
    return String(value || "").trim();
  }

  function httpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  function jsonResponse(data, status) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
})();
