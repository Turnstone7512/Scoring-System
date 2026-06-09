(function () {
  const nativeFetch = window.fetch.bind(window);
  const config = window.SCORING_SYSTEM_CONFIG || {};
  const apiBaseUrl = String(config.apiBaseUrl || "").replace(/\/$/, "");

  window.fetch = async function scoringSystemFetch(input, options = {}) {
    const requestUrl = typeof input === "string" ? input : input.url;
    if (!requestUrl || !requestUrl.startsWith("/api/")) {
      return nativeFetch(input, options);
    }

    const method = String(options.method || "GET").toUpperCase();
    const queryUrl = new URL(requestUrl, window.location.origin);
    const target = apiBaseUrl
      ? `${apiBaseUrl}${queryUrl.pathname.replace(/^\/api/, "")}${queryUrl.search}`
      : requestUrl;

    const requestOptions = { ...options };
    if (method === "POST" || method === "PUT" || method === "DELETE") {
      requestOptions.method = "POST";
      requestOptions.headers = {
        ...(requestOptions.headers || {}),
        "Content-Type": "application/json",
      };
      const body = requestOptions.body ? JSON.parse(requestOptions.body) : {};
      requestOptions.body = JSON.stringify({
        ...body,
        ...(method === "POST" ? {} : { _method: method }),
        _auth: window.ScoringAuth ? window.ScoringAuth.getAuthPayload() : { role: "VIEWER" },
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    requestOptions.signal = requestOptions.signal || controller.signal;

    let response;
    try {
      response = await nativeFetch(target, requestOptions);
    } catch (error) {
      if (error.name === "AbortError") {
        return jsonResponse_("API 回應逾時，請確認 Google Apps Script Web App 是否已部署並允許存取。", 504);
      }
      return jsonResponse_("API 連線失敗，請確認 Netlify /api proxy 與 Apps Script Web App 部署設定。", 502);
    } finally {
      clearTimeout(timeoutId);
    }

    const payload = await response.clone().json().catch(() => null);
    if (!payload || typeof payload !== "object" || !Object.prototype.hasOwnProperty.call(payload, "ok")) {
      return jsonResponse_("API 沒有回傳 JSON。請確認 Apps Script Web App 的存取權限設定為「任何人」。", 502);
    }

    return new Response(JSON.stringify(payload.ok ? payload.data : { message: payload.message }), {
      status: payload.ok ? 200 : payload.status || 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  };

  function jsonResponse_(message, status) {
    return new Response(JSON.stringify({ message }), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
})();
