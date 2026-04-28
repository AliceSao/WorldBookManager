/**
 * ST-WBM-UI v1.1.0 — SillyTavern 前端扩展
 *
 * 依赖：
 *   - ST-WBM-Server（后端插件，提供 /api/plugins/wb-manager/ REST API）
 *
 * 功能：
 *   1. 注入小巧入口面板（连接状态 + 打开管理界面按钮）
 *   2. 在 ST 界面内以模态 iframe 打开 Vue 3 双面板世界书编辑器
 *
 * 注意：
 *   斜杠命令已移除（v1.1.0）。如需命令行操作，请使用 Python CLI。
 *   图形化操作通过本扩展的 Vue UI 双面板编辑器完成。
 */

(function () {
  "use strict";

  const MODULE = "ST-WBM-UI";
  const VERSION = "1.1.0";
  const BACKEND_BASE = "/api/plugins/wb-manager";
  const UI_PATH = BACKEND_BASE + "/ui/";
  const STORAGE_KEY = "wbm_panel_collapsed_v1";

  // =========================================================================
  // 工具函数
  // =========================================================================

  function log(msg) { console.log(`[${MODULE}] ${msg}`); }

  // =========================================================================
  // 内嵌模态窗口（在 ST 界面内打开世界书管理器）
  // =========================================================================

  // ── 页面滚动锁定/解锁（防止模态层背后的 ST 页面被意外滚动）──
  let _prevHtmlOverflow = "";
  let _prevBodyOverflow = "";

  function lockPageScroll() {
    _prevHtmlOverflow = document.documentElement.style.overflow || "";
    _prevBodyOverflow = document.body.style.overflow || "";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    // 强制滚动到顶部，防止 fixed 定位偏移
    window.scrollTo(0, 0);
  }

  function unlockPageScroll() {
    document.documentElement.style.overflow = _prevHtmlOverflow;
    document.body.style.overflow = _prevBodyOverflow;
  }

  // ── 统一关闭弹窗（隐藏+解锁滚动） ──
  function closeModal(overlay) {
    overlay.style.display = "none";
    unlockPageScroll();
  }

  function openManagerModal() {
    // 若已存在则直接显示（每次开启重新应用尺寸以适配屏幕旋转/缩放）
    const existing = document.getElementById("wbm-modal-overlay");
    if (existing) {
      const mob = window.innerWidth < 1100;
      const mw  = mob ? "100%" : "min(1440px, 96vw)";
      existing.style.top             = "0";
      existing.style.left            = "0";
      existing.style.width           = "100vw";
      existing.style.height          = "100dvh";
      existing.style.alignItems      = mob ? "stretch" : "center";
      existing.style.justifyContent  = mob ? "flex-start" : "center";
      existing.style.zIndex          = "2147483646";
      existing.style.transform       = "none";
      const topBar = existing.querySelector(".wbm-modal-topbar");
      if (topBar) {
        topBar.style.width = mw;
      }
      const ctr = existing.querySelector(".wbm-modal-container");
      if (ctr) {
        ctr.style.width          = mw;
        ctr.style.flex           = mob ? "1"  : "";
        ctr.style.minHeight      = mob ? "0"  : "";
        ctr.style.height         = mob ? ""   : "min(900px, calc(92vh - 36px))";
        ctr.style.borderRadius   = mob ? "0"  : "12px";
        ctr.style.flexShrink     = mob ? ""   : "0";
        ctr.style.display        = "flex";
        ctr.style.flexDirection  = "column";
      }
      existing.style.display = "flex";
      existing.style.padding = "";
      // 重置全屏状态
      const fsBtnEl = existing.querySelector("[data-wbm-fs-btn]");
      if (fsBtnEl) {
        fsBtnEl.innerHTML = "⛶ 全屏";
        fsBtnEl.__wbmIsFs = false;
      }
      lockPageScroll();
      return;
    }

    // ── 遮罩层（纵向 flex，从上到下：关闭条 → iframe 容器） ──
    const overlay = document.createElement("div");
    overlay.id = "wbm-modal-overlay";
    // 手机/平板（<1100px）全屏覆盖；桌面（≥1100px）居中浮层
    // ★ z-index: 2147483646（CSS最大值）确保覆盖 ST 任何面板/抽屉
    const isMobile = window.innerWidth < 1100;

    Object.assign(overlay.style, {
      position: "fixed",
      top: "0", left: "0",
      width: "100vw",
      height: "100vh",                  // fallback
      height: "100dvh",                 // 优先：动态视口高度，规避 iOS Safari 100vh 陷阱
      background: "rgba(0,0,0,0.78)",
      display: "flex",
      flexDirection: "column",
      alignItems: isMobile ? "stretch" : "center",
      justifyContent: isMobile ? "flex-start" : "center",
      zIndex: "2147483646",
      padding: "0",
      boxSizing: "border-box",
      // 强制重置：防止任何祖先的 transform/perspective 破坏 fixed 定位
      transform: "none",
      willChange: "auto",
    });

    const modalWidth = isMobile ? "100%" : "min(1440px, 96vw)";

    // ── 关闭按钮条（在 iframe 上方，独立行） ──
    const topBar = document.createElement("div");
    topBar.className = "wbm-modal-topbar";
    Object.assign(topBar.style, {
      width: modalWidth,
      height: "32px",
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      flexShrink: "0",
      paddingRight: "8px",
      boxSizing: "border-box",
      gap: "6px",
    });

    // 全屏切换按钮
    const fsBtn = document.createElement("button");
    fsBtn.setAttribute("data-wbm-fs-btn", "1");
    (fsBtn as any).__wbmIsFs = false;
    fsBtn.innerHTML = "⛶ 全屏";
    fsBtn.title = "切换全屏";
    Object.assign(fsBtn.style, {
      background: "rgba(20,10,30,0.88)",
      border: "1px solid rgba(255,255,255,0.28)",
      borderRadius: "6px",
      padding: "5px 14px",
      cursor: "pointer",
      color: "rgba(255,255,255,0.85)",
      fontSize: "13px",
      fontWeight: "600",
      display: "flex", alignItems: "center", gap: "5px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      flexShrink: "0",
    });
    fsBtn.addEventListener("click", () => {
      const isFs = !(fsBtn as any).__wbmIsFs;
      (fsBtn as any).__wbmIsFs = isFs;
      fsBtn.innerHTML = isFs ? "⛶ 退出全屏" : "⛶ 全屏";
      if (isFs) {
        topBar.style.width = "100%";
        container.style.width = "100%";
        container.style.height = "calc(100dvh - 32px)";
        container.style.borderRadius = "0";
        overlay.style.padding = "0";
        overlay.style.alignItems = "stretch";
      } else {
        const mw = window.innerWidth < 1100 ? "100%" : "min(1440px, 96vw)";
        topBar.style.width = mw;
        container.style.width = mw;
        if (window.innerWidth >= 1100) {
          container.style.height = "min(900px, calc(92vh - 36px))";
          container.style.borderRadius = "12px";
        }
      }
    });
    topBar.appendChild(fsBtn);

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕ 关闭";
    closeBtn.title = "关闭管理器（ESC）";
    Object.assign(closeBtn.style, {
      background: "rgba(20,10,30,0.88)",
      border: "1px solid rgba(255,255,255,0.28)",
      borderRadius: "6px",
      padding: "5px 14px",
      cursor: "pointer",
      color: "rgba(255,255,255,0.85)",
      fontSize: "13px",
      fontWeight: "600",
      display: "flex", alignItems: "center", gap: "5px",
      transition: "background 0.18s, color 0.18s",
      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      flexShrink: "0",
    });
    closeBtn.addEventListener("mouseover", () => {
      closeBtn.style.background = "rgba(239,83,80,0.85)";
      closeBtn.style.color = "#fff";
    });
    closeBtn.addEventListener("mouseout", () => {
      closeBtn.style.background = "rgba(20,10,30,0.88)";
      closeBtn.style.color = "rgba(255,255,255,0.85)";
    });
    closeBtn.addEventListener("click", () => { closeModal(overlay); });
    topBar.appendChild(closeBtn);

    // ── iframe 容器（紧跟在关闭条下方） ──
    const container = document.createElement("div");
    container.className = "wbm-modal-container";
    Object.assign(container.style, {
      width: modalWidth,
      ...(isMobile
        ? { flex: "1", minHeight: "0" }
        : { height: "min(900px, calc(92vh - 36px))", flexShrink: "0" }),
      borderRadius: isMobile ? "0" : "12px",
      overflow: "hidden",
      boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
      display: "flex",
      flexDirection: "column",
    });

    // ── iframe ──
    const iframe = document.createElement("iframe");
    iframe.src = UI_PATH;
    Object.assign(iframe.style, {
      width: "100%",
      flex: "1",
      border: "none",
      display: "block",
    });
    iframe.allow = "clipboard-write";

    // ESC 关闭
    function onKeydown(e) {
      if (e.key === "Escape" && overlay.style.display !== "none") {
        closeModal(overlay);
      }
    }
    document.addEventListener("keydown", onKeydown);

    // 点击遮罩背景关闭
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay);
    });

    container.appendChild(iframe);
    overlay.appendChild(topBar);
    overlay.appendChild(container);
    // 挂载到 <html> 而非 <body>：
    // ST 手机端用 body transform 实现滑入抽屉动画，
    // position:fixed 在有 transform 的祖先内会相对于该祖先定位而非视口。
    document.documentElement.appendChild(overlay);
    lockPageScroll();
    log("模态窗口已打开");
  }

  // =========================================================================
  // 注入面板 UI
  // =========================================================================

  function injectPanel() {
    // 防重复注入
    if (document.getElementById("wbm-panel")) {
      log("面板已存在，跳过重复注入");
      return;
    }
    const settingsContainer = document.getElementById("extensions_settings") ||
      document.querySelector(".extensions_settings") ||
      document.querySelector("#extension_settings");
    if (!settingsContainer) {
      log("未找到 extensions_settings 容器，跳过面板注入");
      return;
    }

    const collapsed = localStorage.getItem(STORAGE_KEY) !== "false";
    const panel = document.createElement("div");
    panel.id = "wbm-panel";
    panel.innerHTML = `
      <div id="wbm-header">
        <span id="wbm-title-text">📖 世界书管理器 v${VERSION}</span>
        <span id="wbm-toggle-icon">${collapsed ? "▶" : "▼"}</span>
      </div>
      <div id="wbm-body" style="display:${collapsed ? "none" : "flex"}">
        <div id="wbm-status-row">
          <span id="wbm-badge-backend" class="wbm-badge wbm-badge-wait">⏳ 后端检测中</span>
        </div>
        <button id="wbm-open-btn">📖 打开管理面板</button>
        <div id="wbm-hint">
          命令行操作请使用 Python CLI<br>
          安装路径：<code>extensions/third-party/ST-WBM-UI/</code>
        </div>
      </div>
    `;

    settingsContainer.prepend(panel);

    // 折叠/展开
    panel.querySelector("#wbm-header").addEventListener("click", () => {
      const body = panel.querySelector("#wbm-body");
      const icon = panel.querySelector("#wbm-toggle-icon");
      const isOpen = body.style.display !== "none";
      body.style.display = isOpen ? "none" : "flex";
      icon.textContent = isOpen ? "▶" : "▼";
      localStorage.setItem(STORAGE_KEY, isOpen ? "true" : "false");
    });

    // 打开管理面板（ST内嵌模态窗口）
    panel.querySelector("#wbm-open-btn").addEventListener("click", openManagerModal);

    // 异步检测后端
    fetch(`${BACKEND_BASE}/ping`)
      .then(r => r.json())
      .then(d => {
        const badge = document.getElementById("wbm-badge-backend");
        if (badge && d.success) {
          badge.textContent = "✅ 后端已连接";
          badge.className = "wbm-badge wbm-badge-ok";
        }
      })
      .catch(() => {
        const badge = document.getElementById("wbm-badge-backend");
        if (badge) {
          badge.textContent = "❌ 后端未连接";
          badge.className = "wbm-badge wbm-badge-fail";
        }
      });

    log("面板注入完成");
  }

  // =========================================================================
  // 入口（jQuery ready）
  // =========================================================================

  function init() {
    log(`ST-WBM-UI v${VERSION} 正在初始化...`);
    injectPanel();
    log("初始化完成");
  }

  if (typeof jQuery !== "undefined") {
    jQuery(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
