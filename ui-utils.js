window.AppUI = {
  showLoading(message = "載入中...") {
    let overlay = document.querySelector("#appLoading");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "appLoading";
      overlay.className = "app-loading";
      overlay.innerHTML = `<div class="app-loading-box"><span class="spinner"></span><strong></strong></div>`;
      document.body.appendChild(overlay);
    }
    overlay.querySelector("strong").textContent = message;
    overlay.classList.remove("hidden");
  },

  hideLoading() {
    document.querySelector("#appLoading")?.classList.add("hidden");
  },

  toast(message, type = "success") {
    let region = document.querySelector("#toastRegion");
    if (!region) {
      region = document.createElement("div");
      region.id = "toastRegion";
      region.className = "toast-region";
      document.body.appendChild(region);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    region.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  },

  paginate(items, page, pageSize) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      page: safePage,
      totalPages,
    };
  },

  renderPagination(container, page, totalPages, onChange) {
    if (!container) return;
    container.innerHTML = `
      <button class="secondary-button" type="button" data-page="prev" ${page <= 1 ? "disabled" : ""}>上一頁</button>
      <span class="meta">第 ${page} / ${totalPages} 頁</span>
      <button class="secondary-button" type="button" data-page="next" ${page >= totalPages ? "disabled" : ""}>下一頁</button>
    `;
    container.querySelector("[data-page='prev']")?.addEventListener("click", () => onChange(page - 1));
    container.querySelector("[data-page='next']")?.addEventListener("click", () => onChange(page + 1));
  },
};
