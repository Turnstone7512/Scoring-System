(function () {
  const STORAGE_KEY = "scoringSystemAuth";
  const config = window.SCORING_SYSTEM_CONFIG || {};

  function getSupabaseClient() {
    return window.ScoringSupabase?.client || null;
  }

  function getAccounts() {
    return Array.isArray(config.adminAccounts) && config.adminAccounts.length
      ? config.adminAccounts
      : [{ label: "Gink", email: "gink1222@gmail.com" }, { label: "Lelia", email: "viola4378@gmail.com" }];
  }

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || { role: "VIEWER" };
    } catch {
      return { role: "VIEWER" };
    }
  }

  function setSession(session) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    applyRole();
  }

  function applyRole() {
    const session = getSession();
    document.body.dataset.role = session.role || "VIEWER";
    const label = document.querySelector("#authStatus");
    if (label) {
      label.textContent = session.role === "ADMIN"
        ? `目前身分：Admin（${session.account || ""}）`
        : "目前身分：Viewer";
    }
    markAdminLinks();
  }

  function markAdminLinks() {
    document.querySelectorAll('a[href="/score-items"]').forEach((link) => {
      link.classList.add("admin-only");
      if (link.getAttribute("href") === "/score-items") {
        link.textContent = "獎懲項目異動權限";
      }
    });
  }

  async function restoreAuthState() {
    const client = getSupabaseClient();
    if (!client) {
      setSession({ role: "VIEWER" });
      return;
    }

    const { data } = await client.auth.getUser();
    const user = data?.user;
    if (!user) {
      setSession({ role: "VIEWER" });
      return;
    }

    const { data: profile } = await client
      .from("profiles")
      .select("display_name, role")
      .eq("id", user.id)
      .maybeSingle();

    setSession({
      role: profile?.role === "ADMIN" ? "ADMIN" : "VIEWER",
      account: profile?.display_name || user.email,
      email: user.email,
    });
  }

  function renderAuthBar() {
    const header = document.querySelector(".app-header");
    if (!header || document.querySelector("#authBar")) return;

    const accounts = getAccounts();
    header.insertAdjacentHTML("afterend", `
      <section id="authBar" class="auth-bar">
        <div>
          <strong id="authStatus"></strong>
        </div>
        <form id="authForm" class="auth-form">
          <label>
            身分
            <select id="authRole">
              <option value="VIEWER">Viewer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <label id="authAccountWrap" class="hidden">
            帳號
            <select id="authAccount">
              ${accounts.map((account) => `<option value="${account.email}">${account.label}</option>`).join("")}
            </select>
          </label>
          <label id="authPasswordWrap" class="hidden">
            密碼
            <input id="authPassword" type="password" autocomplete="current-password" />
          </label>
          <button type="submit">套用</button>
          <button id="authLogout" class="secondary-button hidden" type="button">回 Viewer</button>
        </form>
      </section>
    `);

    const role = document.querySelector("#authRole");
    const account = document.querySelector("#authAccount");
    const password = document.querySelector("#authPassword");
    const logout = document.querySelector("#authLogout");

    function syncFields() {
      const session = getSession();
      const isAdminChoice = role.value === "ADMIN";
      const isAdminSession = session.role === "ADMIN";
      document.querySelector("#authAccountWrap").classList.toggle("hidden", !isAdminChoice);
      document.querySelector("#authPasswordWrap").classList.toggle("hidden", !isAdminChoice);
      logout.classList.toggle("hidden", !isAdminSession);
      password.required = isAdminChoice;
      if (!isAdminChoice) password.value = "";
    }

    role.addEventListener("change", syncFields);
    document.querySelector("#authForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const client = getSupabaseClient();
      if (role.value === "VIEWER") {
        await client?.auth.signOut();
        setSession({ role: "VIEWER" });
        syncFields();
        return;
      }

      if (!client) {
        AppUI.toast("尚未設定 Supabase URL / anon key。", "error");
        return;
      }

      AppUI.showLoading("登入中...");
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: account.value,
          password: password.value,
        });
        if (error) throw error;

        const { data: profile, error: profileError } = await client
          .from("profiles")
          .select("display_name, role")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        if (profile?.role !== "ADMIN") throw new Error("此帳號沒有 Admin 權限。");

        setSession({ role: "ADMIN", account: profile.display_name || data.user.email, email: data.user.email });
        password.value = "";
        role.value = "ADMIN";
        syncFields();
        AppUI.toast("已登入 Admin");
      } catch (error) {
        await client.auth.signOut();
        setSession({ role: "VIEWER" });
        AppUI.toast(error.message || "登入失敗", "error");
      } finally {
        AppUI.hideLoading();
      }
    });

    logout.addEventListener("click", async () => {
      await getSupabaseClient()?.auth.signOut();
      setSession({ role: "VIEWER" });
      role.value = "VIEWER";
      password.value = "";
      syncFields();
    });

    restoreAuthState().finally(() => {
      const session = getSession();
      role.value = session.role === "ADMIN" ? "ADMIN" : "VIEWER";
      syncFields();
      applyRole();
    });
  }

  window.ScoringAuth = {
    getRole() {
      return getSession().role || "VIEWER";
    },
  };

  document.addEventListener("DOMContentLoaded", renderAuthBar);
})();
