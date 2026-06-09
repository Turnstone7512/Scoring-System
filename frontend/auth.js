(function () {
  const STORAGE_KEY = "scoringSystemAuth";
  const ADMIN_ACCOUNTS = ["Gink", "Lelia"];

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
    document.querySelectorAll('a[href="/user-accounts"], a[href="/score-items"]').forEach((link) => {
      link.classList.add("admin-only");
      if (link.getAttribute("href") === "/score-items") {
        link.textContent = "獎懲項目異動權限";
      }
    });
  }

  function renderAuthBar() {
    const header = document.querySelector(".app-header");
    if (!header || document.querySelector("#authBar")) return;

    const session = getSession();
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
              ${ADMIN_ACCOUNTS.map((account) => `<option value="${account}">${account}</option>`).join("")}
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
    role.value = session.role || "VIEWER";
    account.value = session.account || "Gink";

    function syncFields() {
      const isAdmin = role.value === "ADMIN";
      document.querySelector("#authAccountWrap").classList.toggle("hidden", !isAdmin);
      document.querySelector("#authPasswordWrap").classList.toggle("hidden", !isAdmin);
      logout.classList.toggle("hidden", !isAdmin);
      password.required = isAdmin;
      if (!isAdmin) {
        password.value = "";
      }
    }

    role.addEventListener("change", syncFields);
    document.querySelector("#authForm").addEventListener("submit", (event) => {
      event.preventDefault();
      if (role.value === "VIEWER") {
        setSession({ role: "VIEWER" });
        syncFields();
        return;
      }
      setSession({
        role: "ADMIN",
        account: account.value,
        password: password.value,
      });
      password.value = "";
      syncFields();
    });
    logout.addEventListener("click", () => {
      setSession({ role: "VIEWER" });
      role.value = "VIEWER";
      password.value = "";
      syncFields();
    });

    syncFields();
    applyRole();
  }

  window.ScoringAuth = {
    getAuthPayload() {
      const session = getSession();
      return {
        role: session.role || "VIEWER",
        account: session.account || "",
        password: session.password || "",
      };
    },
    getRole() {
      return getSession().role || "VIEWER";
    },
  };

  document.addEventListener("DOMContentLoaded", renderAuthBar);
})();
