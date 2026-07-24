/* ===========================================================
   NovaShop — Admin-Dashboard
   Eigener, von Kundenkonten getrennter Login. Serverseitige Session
   (siehe server/routes/admin.js) — Zugangsdaten liegen nur noch als
   bcrypt-Hash in der Datenbank, nie im Quellcode.
   =========================================================== */
(function () {
  "use strict";

  const loginView = document.getElementById("admin-login-view");
  const dashboardView = document.getElementById("admin-dashboard-view");
  const loginForm = document.getElementById("admin-login-form");
  const loginError = document.getElementById("admin-login-error");
  const logoutBtn = document.getElementById("admin-logout");

  let adminProducts = [];
  let adminOrders = [];
  let adminCustomers = [];

  async function loadAdminData() {
    try {
      const [productsRes, ordersRes, customersRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/orders"),
        fetch("/api/admin/customers"),
      ]);
      adminProducts = productsRes.ok ? (await productsRes.json()).products : [];
      adminOrders = ordersRes.ok ? (await ordersRes.json()).orders : [];
      adminCustomers = customersRes.ok ? (await customersRes.json()).customers : [];
    } catch (err) {
      adminProducts = [];
      adminOrders = [];
      adminCustomers = [];
      if (typeof showToast === "function") {
        showToast("Daten konnten nicht geladen werden", "Bitte Seite neu laden und erneut versuchen.");
      }
    }
  }

  async function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    logoutBtn.hidden = false;
    await loadAdminData();
    renderAll();
  }

  function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
    logoutBtn.hidden = true;
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    const email = document.getElementById("admin-email").value;
    const password = document.getElementById("admin-password").value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        loginError.textContent = data.error || "E-Mail oder Passwort ist falsch.";
        return;
      }
      loginForm.reset();
      await showDashboard();
    } catch (err) {
      loginError.textContent = "Verbindung zum Server fehlgeschlagen. Bitte versuch es erneut.";
    } finally {
      submitBtn.disabled = false;
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    showLogin();
  });

  document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const input = document.getElementById(toggle.getAttribute("data-password-toggle"));
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      toggle.setAttribute("aria-pressed", String(show));
      toggle.setAttribute("aria-label", show ? "Passwort verbergen" : "Passwort anzeigen");
    });
  });

  /* -------------------- Sidebar-Navigation -------------------- */
  document.querySelectorAll("[data-admin-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.getAttribute("data-admin-view");
      document.querySelectorAll("[data-admin-view]").forEach((b) => b.classList.toggle("is-active", b === btn));
      document.querySelectorAll("[data-admin-panel]").forEach((panel) => {
        panel.hidden = panel.getAttribute("data-admin-panel") !== view;
      });
    });
  });

  /* -------------------- Helfer -------------------- */
  function categoryLabelFor(product) {
    const nonPopular = product.categories.find((c) => c !== "beliebt") || product.categories[0];
    const cat = CATEGORIES.find((c) => c.id === nonPopular);
    return cat ? cat.label : nonPopular;
  }

  /* -------------------- Übersicht -------------------- */
  function renderOverview() {
    const orders = adminOrders;
    const revenue = orders.reduce((sum, o) => sum + o.total, 0);
    const products = adminProducts;

    document.getElementById("kpi-revenue").textContent = formatPrice(revenue);
    document.getElementById("kpi-orders").textContent = orders.length;
    document.getElementById("kpi-customers").textContent = adminCustomers.length;
    document.getElementById("kpi-products").textContent = products.filter((p) => p.active).length;

    const tbody = document.querySelector("#recent-orders-table tbody");
    const empty = document.getElementById("recent-orders-empty");
    const recent = orders.slice(0, 5);
    if (recent.length === 0) {
      tbody.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    tbody.innerHTML = recent
      .map(
        (o) => `
      <tr>
        <td><strong>${o.orderNumber}</strong></td>
        <td>${escapeHtml(o.customerName)}</td>
        <td>${formatDate(o.date)}</td>
        <td>${formatPrice(o.total)}</td>
        <td><span class="status-badge" data-status="${o.status || "In Bearbeitung"}">${o.status || "In Bearbeitung"}</span></td>
      </tr>`
      )
      .join("");
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  /* -------------------- Umsatz-Chart -------------------- */
  let chartGranularity = "day";
  let chartViewMode = "chart";

  function startOfWeek(date) {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function isoWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    return 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  }

  function buildRevenueBuckets(granularity) {
    const now = new Date();
    const buckets = [];
    if (granularity === "day") {
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        buckets.push({ key: d.toDateString(), label: d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }), fullLabel: d.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" }), value: 0 });
      }
    } else if (granularity === "week") {
      for (let i = 7; i >= 0; i--) {
        const d = startOfWeek(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7));
        buckets.push({ key: d.toDateString(), label: "KW " + isoWeekNumber(d), fullLabel: "Woche " + isoWeekNumber(d) + " (ab " + d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) + ")", value: 0 });
      }
    } else if (granularity === "month") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({ key: d.getFullYear() + "-" + d.getMonth(), label: d.toLocaleDateString("de-DE", { month: "short" }), fullLabel: d.toLocaleDateString("de-DE", { month: "long", year: "numeric" }), value: 0 });
      }
    } else {
      for (let i = 4; i >= 0; i--) {
        const y = now.getFullYear() - i;
        buckets.push({ key: String(y), label: String(y), fullLabel: String(y), value: 0 });
      }
    }
    const bucketMap = new Map(buckets.map((b) => [b.key, b]));
    adminOrders.forEach((o) => {
      const d = new Date(o.date);
      let key;
      if (granularity === "day") key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
      else if (granularity === "week") key = startOfWeek(d).toDateString();
      else if (granularity === "month") key = d.getFullYear() + "-" + d.getMonth();
      else key = String(d.getFullYear());
      const bucket = bucketMap.get(key);
      if (bucket) bucket.value += o.total;
    });
    return buckets;
  }

  function formatAxisValue(value) {
    if (value >= 1000) return (value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(".", ",") + "K €";
    return Math.round(value) + " €";
  }

  function niceMax(value) {
    if (value <= 0) return 10;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const normalized = value / magnitude;
    let niceNormalized;
    if (normalized <= 1) niceNormalized = 1;
    else if (normalized <= 2) niceNormalized = 2;
    else if (normalized <= 5) niceNormalized = 5;
    else niceNormalized = 10;
    return niceNormalized * magnitude;
  }

  function roundedTopPath(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h));
    if (h <= 0) return `M${x},${y + h} L${x + w},${y + h} Z`;
    return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
  }

  function renderRevenueChart() {
    const chartEl = document.getElementById("revenue-chart");
    const tableWrap = document.getElementById("revenue-table-wrap");
    const tableBody = document.getElementById("revenue-table-body");
    const toggleBtn = document.getElementById("chart-view-toggle");
    const buckets = buildRevenueBuckets(chartGranularity);
    const hasData = buckets.some((b) => b.value > 0);

    tableBody.innerHTML = buckets.map((b) => `<tr><td>${b.fullLabel}</td><td>${formatPrice(b.value)}</td></tr>`).join("");
    toggleBtn.textContent = chartViewMode === "chart" ? "Als Tabelle anzeigen" : "Als Diagramm anzeigen";
    chartEl.hidden = chartViewMode !== "chart";
    tableWrap.hidden = chartViewMode !== "table";
    if (chartViewMode === "table") return;

    if (!hasData) {
      chartEl.innerHTML = `
        <div class="chart-empty">
          <svg class="icon" aria-hidden="true"><use href="#icon-trending-up"></use></svg>
          <p>Noch keine Umsatzdaten für diesen Zeitraum.</p>
        </div>`;
      return;
    }

    const width = Math.max(chartEl.clientWidth || 640, 420);
    const height = 260;
    const padLeft = 52;
    const padRight = 12;
    const padTop = 16;
    const padBottom = 32;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const max = niceMax(Math.max(...buckets.map((b) => b.value)) * 1.15);

    const n = buckets.length;
    const slot = plotW / n;
    const barW = Math.min(24, slot * 0.55);

    const gridLines = [0, 0.25, 0.5, 0.75, 1]
      .map((t) => {
        const y = padTop + plotH * (1 - t);
        const val = max * t;
        return `<line class="grid-line" x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}"></line>
        <text class="y-label" x="${padLeft - 8}" y="${y + 3}" text-anchor="end">${formatAxisValue(val)}</text>`;
      })
      .join("");

    const bars = buckets
      .map((b, i) => {
        const cx = padLeft + slot * i + slot / 2;
        const barH = max > 0 ? (b.value / max) * plotH : 0;
        const y = padTop + plotH - barH;
        const showLabel = n <= 8 || i % Math.ceil(n / 8) === 0 || i === n - 1;
        return `
        <g data-bar tabindex="0" role="img" aria-label="${b.fullLabel}: ${formatPrice(b.value)}" data-label="${b.fullLabel}" data-value="${formatPrice(b.value)}">
          <rect class="bar-hit" x="${cx - slot / 2}" y="${padTop}" width="${slot}" height="${plotH}"></rect>
          <path class="bar-fill" d="${roundedTopPath(cx - barW / 2, y, barW, barH, 4)}"></path>
          ${showLabel ? `<text class="axis-label" x="${cx}" y="${height - padBottom + 16}" text-anchor="middle">${b.label}</text>` : ""}
        </g>`;
      })
      .join("");

    chartEl.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="group" aria-label="Umsatz nach Zeitraum">
        ${gridLines}
        <line class="grid-line" x1="${padLeft}" y1="${padTop + plotH}" x2="${width - padRight}" y2="${padTop + plotH}"></line>
        ${bars}
      </svg>`;
  }

  const chartTooltip = document.getElementById("chart-tooltip");
  const revenueChartEl = document.getElementById("revenue-chart");

  function showChartTooltip(target) {
    const label = target.getAttribute("data-label");
    const value = target.getAttribute("data-value");
    chartTooltip.innerHTML = `<span class="chart-tooltip__value"></span><span class="chart-tooltip__label"></span>`;
    chartTooltip.querySelector(".chart-tooltip__value").textContent = value;
    chartTooltip.querySelector(".chart-tooltip__label").textContent = label;
    const rect = target.getBoundingClientRect();
    const wrapRect = revenueChartEl.closest(".revenue-chart-wrap").getBoundingClientRect();
    let left = rect.left - wrapRect.left + rect.width / 2;
    let top = rect.top - wrapRect.top - 8;
    chartTooltip.style.left = left + "px";
    chartTooltip.style.top = top + "px";
    chartTooltip.classList.add("is-visible");
    // Innerhalb des Chart-Bereichs halten, damit das Tooltip weder seitlich noch nach oben in die Filter-Buttons ragt
    const ttRect = chartTooltip.getBoundingClientRect();
    const halfW = ttRect.width / 2 + 4;
    left = Math.min(Math.max(left, halfW), wrapRect.width - halfW);
    top = Math.max(top, ttRect.height + 4);
    chartTooltip.style.left = left + "px";
    chartTooltip.style.top = top + "px";
  }
  function hideChartTooltip() {
    chartTooltip.classList.remove("is-visible");
  }

  revenueChartEl.addEventListener("pointerover", (e) => {
    const bar = e.target.closest("[data-bar]");
    if (bar) showChartTooltip(bar);
  });
  revenueChartEl.addEventListener("pointerout", (e) => {
    if (e.target.closest("[data-bar]")) hideChartTooltip();
  });
  revenueChartEl.addEventListener("focusin", (e) => {
    const bar = e.target.closest("[data-bar]");
    if (bar) showChartTooltip(bar);
  });
  revenueChartEl.addEventListener("focusout", (e) => {
    if (e.target.closest("[data-bar]")) hideChartTooltip();
  });

  document.querySelectorAll("[data-granularity]").forEach((btn) => {
    btn.addEventListener("click", () => {
      chartGranularity = btn.getAttribute("data-granularity");
      document.querySelectorAll("[data-granularity]").forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-selected", String(b === btn));
      });
      hideChartTooltip();
      renderRevenueChart();
    });
  });

  document.getElementById("chart-view-toggle").addEventListener("click", () => {
    chartViewMode = chartViewMode === "chart" ? "table" : "chart";
    hideChartTooltip();
    renderRevenueChart();
  });

  let resizeDebounce = null;
  window.addEventListener("resize", () => {
    if (chartViewMode !== "chart" || dashboardView.hidden) return;
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(renderRevenueChart, 150);
  });

  /* -------------------- Produkte -------------------- */
  function renderProductsTable() {
    const tbody = document.querySelector("#products-table tbody");
    const products = adminProducts;
    tbody.innerHTML = products
      .map(
        (p) => `
      <tr data-row-product="${p.id}">
        <td>
          <div class="admin-product-cell">
            <span class="admin-product-cell__media tint-${p.tint}"><svg class="icon" aria-hidden="true"><use href="#${p.icon}"></use></svg></span>
            <span>
              <span class="admin-product-cell__name">${escapeHtml(p.name)}</span><br>
              <span class="admin-product-cell__cat">${categoryLabelFor(p)}</span>
            </span>
          </div>
        </td>
        <td>${categoryLabelFor(p)}</td>
        <td><input class="admin-input admin-input--price" type="number" min="0" step="0.01" value="${p.price}" data-field="price" data-id="${p.id}" aria-label="Preis für ${escapeHtml(p.name)}"></td>
        <td><input class="admin-input" type="number" min="0" step="1" value="${p.stock}" data-field="stock" data-id="${p.id}" aria-label="Lagerbestand für ${escapeHtml(p.name)}"></td>
        <td>
          <button type="button" class="toggle-btn" data-active="${p.active}" data-toggle-active="${p.id}" aria-pressed="${p.active}">
            <svg class="icon" aria-hidden="true"><use href="#${p.active ? "icon-toggle-on" : "icon-toggle-off"}"></use></svg>
            ${p.active ? "Aktiv" : "Inaktiv"}
          </button>
        </td>
        <td>
          <button type="button" class="row-delete-btn" data-delete-product="${p.id}" aria-label="${escapeHtml(p.name)} löschen">
            <svg class="icon icon-sm" aria-hidden="true"><use href="#icon-trash"></use></svg>
          </button>
        </td>
      </tr>`
      )
      .join("");
  }

  document.querySelector("#products-table tbody")?.addEventListener("click", async (e) => {
    const delBtn = e.target.closest("[data-delete-product]");
    if (!delBtn) return;
    if (delBtn.getAttribute("data-armed") !== "true") {
      delBtn.setAttribute("data-armed", "true");
      delBtn.innerHTML = "Bestätigen?";
      delBtn.setAttribute("aria-label", "Löschen bestätigen");
      delBtn._disarmTimer = setTimeout(() => {
        delBtn.setAttribute("data-armed", "false");
        delBtn.innerHTML = '<svg class="icon icon-sm" aria-hidden="true"><use href="#icon-trash"></use></svg>';
      }, 3000);
      return;
    }
    clearTimeout(delBtn._disarmTimer);
    const id = delBtn.getAttribute("data-delete-product");
    const product = adminProducts.find((p) => p.id === id);
    const res = await fetch("/api/admin/products/" + encodeURIComponent(id), { method: "DELETE" });
    if (!res.ok) {
      showToast("Löschen fehlgeschlagen", "Bitte versuch es erneut.");
      return;
    }
    showToast("Produkt gelöscht", product ? product.name + " wurde entfernt." : "");
    await loadAdminData();
    renderProductsTable();
    renderOverview();
  });

  document.querySelector("#products-table tbody")?.addEventListener("change", async (e) => {
    const input = e.target.closest("[data-field]");
    if (!input) return;
    const id = input.getAttribute("data-id");
    const field = input.getAttribute("data-field");
    let value = parseFloat(input.value);
    if (Number.isNaN(value) || value < 0) value = 0;
    const res = await fetch("/api/admin/products/" + encodeURIComponent(id), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast("Fehler", data.error || "Aktualisierung fehlgeschlagen.");
      return;
    }
    const idx = adminProducts.findIndex((p) => p.id === id);
    if (idx !== -1) adminProducts[idx] = data.product;
    showToast(field === "price" ? "Preis aktualisiert" : "Lagerbestand aktualisiert", data.product ? data.product.name : "");
    renderOverview();
  });

  document.querySelector("#products-table tbody")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-toggle-active]");
    if (!btn) return;
    const id = btn.getAttribute("data-toggle-active");
    const current = adminProducts.find((p) => p.id === id);
    const nextActive = !current.active;
    const res = await fetch("/api/admin/products/" + encodeURIComponent(id), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: nextActive }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast("Fehler", data.error || "Aktualisierung fehlgeschlagen.");
      return;
    }
    const idx = adminProducts.findIndex((p) => p.id === id);
    if (idx !== -1) adminProducts[idx] = data.product;
    btn.setAttribute("data-active", String(nextActive));
    btn.setAttribute("aria-pressed", String(nextActive));
    btn.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#${nextActive ? "icon-toggle-on" : "icon-toggle-off"}"></use></svg>${nextActive ? "Aktiv" : "Inaktiv"}`;
    showToast(nextActive ? "Produkt aktiviert" : "Produkt deaktiviert", current.name + (nextActive ? " ist wieder im Shop sichtbar." : " wurde aus dem Shop entfernt."));
    renderOverview();
  });

  /* -------------------- Produkt hinzufügen -------------------- */
  const PRODUCT_ICON_OPTIONS = [
    { id: "icon-earbuds", label: "Ohrhörer" },
    { id: "icon-headset", label: "Kopfhörer / Headset" },
    { id: "icon-speaker", label: "Lautsprecher" },
    { id: "icon-mouse", label: "Maus" },
    { id: "icon-keyboard", label: "Tastatur" },
    { id: "icon-gamepad", label: "Gaming-Zubehör" },
    { id: "icon-watch", label: "Uhr / Wearable" },
    { id: "icon-phone", label: "Handy / Hülle" },
    { id: "icon-camera", label: "Kamera / Elektronik" },
    { id: "icon-shirt", label: "Kleidung" },
    { id: "icon-home", label: "Home & Living" },
    { id: "icon-sparkles", label: "Beauty" },
    { id: "icon-dumbbell", label: "Sport" },
    { id: "icon-toy", label: "Spielzeug" },
    { id: "icon-book", label: "Bücher / Büro" },
    { id: "icon-package", label: "Zubehör (allgemein)" },
  ];
  const PRODUCT_TINTS = ["blue", "violet", "cyan", "pink"];

  const categoriesEl = document.getElementById("product-categories");
  if (categoriesEl) {
    categoriesEl.innerHTML = CATEGORIES.map(
      (c) => `
      <label class="checkbox-chip">
        <input type="checkbox" name="product-category" value="${c.id}">
        ${c.label}
      </label>`
    ).join("");
  }
  const iconSelectEl = document.getElementById("product-icon");
  if (iconSelectEl) {
    iconSelectEl.innerHTML = PRODUCT_ICON_OPTIONS.map((opt) => `<option value="${opt.id}">${opt.label}</option>`).join("");
  }
  const tintRowEl = document.getElementById("product-tint");
  if (tintRowEl) {
    tintRowEl.innerHTML = PRODUCT_TINTS.map(
      (t, i) => `
      <label class="swatch swatch--${t}">
        <input type="radio" name="product-tint" value="${t}" ${i === 0 ? "checked" : ""} aria-label="Farbe ${t}">
      </label>`
    ).join("");
  }

  const addProductBackdrop = document.getElementById("add-product-backdrop");
  const addProductForm = document.getElementById("add-product-form");
  const addProductError = document.getElementById("add-product-error");

  function openAddProductModal() {
    addProductBackdrop.classList.add("is-open");
    document.body.style.overflow = "hidden";
    setTimeout(() => document.getElementById("product-name")?.focus(), 50);
  }
  function closeAddProductModal() {
    addProductBackdrop.classList.remove("is-open");
    document.body.style.overflow = "";
    addProductForm.reset();
    addProductError.textContent = "";
  }

  document.getElementById("open-add-product")?.addEventListener("click", openAddProductModal);
  document.getElementById("add-product-close")?.addEventListener("click", closeAddProductModal);
  addProductBackdrop?.addEventListener("click", (e) => {
    if (e.target === addProductBackdrop) closeAddProductModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && addProductBackdrop?.classList.contains("is-open")) closeAddProductModal();
  });

  addProductForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    addProductError.textContent = "";
    const name = document.getElementById("product-name").value.trim();
    const subtitle = document.getElementById("product-subtitle").value.trim();
    const price = parseFloat(document.getElementById("product-price").value);
    const oldPriceRaw = document.getElementById("product-old-price").value;
    const oldPrice = oldPriceRaw ? parseFloat(oldPriceRaw) : null;
    const stock = parseInt(document.getElementById("product-stock").value, 10);
    const badge = document.getElementById("product-badge").value.trim() || null;
    const categories = [...document.querySelectorAll('input[name="product-category"]:checked')].map((el) => el.value);
    const icon = iconSelectEl.value;
    const tint = document.querySelector('input[name="product-tint"]:checked').value;

    if (!name || !subtitle) {
      addProductError.textContent = "Bitte Name und Kurzbeschreibung ausfüllen.";
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      addProductError.textContent = "Bitte einen gültigen Preis angeben.";
      return;
    }
    if (Number.isNaN(stock) || stock < 0) {
      addProductError.textContent = "Bitte einen gültigen Lagerbestand angeben.";
      return;
    }
    if (oldPriceRaw && (Number.isNaN(oldPrice) || oldPrice <= price)) {
      addProductError.textContent = "Der alte Preis muss höher als der neue Preis sein, sonst lässt sich kein Rabatt berechnen.";
      return;
    }
    if (categories.length === 0) {
      addProductError.textContent = "Bitte mindestens eine Kategorie auswählen.";
      return;
    }

    const submitBtn = addProductForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, subtitle, price,
          oldPrice: oldPriceRaw ? oldPrice : null,
          categories, icon, tint, badge, stock,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addProductError.textContent = data.error || "Produkt konnte nicht angelegt werden.";
        return;
      }
      adminProducts.push(data.product);
      closeAddProductModal();
      renderProductsTable();
      renderOverview();
      showToast("Produkt hinzugefügt", data.product.name + " ist jetzt im Shop verfügbar.");
    } finally {
      submitBtn.disabled = false;
    }
  });

  /* -------------------- Bestellungen -------------------- */
  const ORDER_STATUSES = ["In Bearbeitung", "Versendet", "Abgeschlossen", "Storniert"];

  function renderOrdersTable() {
    const tbody = document.querySelector("#orders-table tbody");
    const empty = document.getElementById("orders-empty");
    const orders = adminOrders;
    if (orders.length === 0) {
      tbody.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    tbody.innerHTML = orders
      .map(
        (o) => `
      <tr>
        <td><strong>${o.orderNumber}</strong></td>
        <td>${escapeHtml(o.customerName)}<br><span class="admin-product-cell__cat">${escapeHtml(o.customerEmail || "")}</span></td>
        <td>${formatDate(o.date)}</td>
        <td>${o.items.reduce((sum, it) => sum + it.qty, 0)} Artikel</td>
        <td>${formatPrice(o.total)}</td>
        <td>
          <select class="admin-select" data-order-status="${o.id}" aria-label="Status für Bestellung ${o.orderNumber}" ${o.status === "Zahlung ausstehend" || o.status === "Zahlung fehlgeschlagen" ? "disabled" : ""}>
            ${ORDER_STATUSES.map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
            ${o.status === "Zahlung ausstehend" || o.status === "Zahlung fehlgeschlagen" ? `<option value="${o.status}" selected>${o.status}</option>` : ""}
          </select>
        </td>
      </tr>`
      )
      .join("");
  }

  document.querySelector("#orders-table tbody")?.addEventListener("change", async (e) => {
    const select = e.target.closest("[data-order-status]");
    if (!select) return;
    const id = select.getAttribute("data-order-status");
    const res = await fetch(`/api/admin/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: select.value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast("Fehler", data.error || "Status konnte nicht aktualisiert werden.");
      return;
    }
    const idx = adminOrders.findIndex((o) => o.id === Number(id));
    if (idx !== -1) adminOrders[idx] = Object.assign({}, adminOrders[idx], data.order);
    showToast("Status aktualisiert", data.order.orderNumber + " ist jetzt „" + select.value + "“");
    renderOverview();
  });

  /* -------------------- Kunden -------------------- */
  function renderCustomersTable() {
    const tbody = document.querySelector("#customers-table tbody");
    const empty = document.getElementById("customers-empty");
    const users = adminCustomers;
    if (users.length === 0) {
      tbody.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    tbody.innerHTML = users
      .map((u) => `
        <tr>
          <td><strong>${escapeHtml(u.name)}</strong></td>
          <td>${escapeHtml(u.email)}</td>
          <td>${formatDate(u.created_at)}</td>
          <td>${u.orderCount}</td>
          <td>${formatPrice(u.totalSpent)}</td>
        </tr>`)
      .join("");
  }

  function renderAll() {
    renderOverview();
    renderRevenueChart();
    renderProductsTable();
    renderOrdersTable();
    renderCustomersTable();
  }

  /* -------------------- Initialisierung -------------------- */
  fetch("/api/admin/me")
    .then((res) => {
      if (res.ok) showDashboard();
      else showLogin();
    })
    .catch(() => showLogin());
})();
