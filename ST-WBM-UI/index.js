/**
 * ST-WBM-UI v1.0 — SillyTavern 前端扩展
 *
 * 依赖：
 *   - JS-Slash-Runner（提供 getWorldbook / updateWorldbookWith / toastr 等全局函数）
 *   - ST-WBM-Server（后端插件，提供 /api/plugins/wb-manager/ REST API）
 *
 * 功能：
 *   1. 注入小巧入口面板（连接状态 + 打开管理界面按钮）
 *   2. 注册 22 条斜杠命令（直接调用 JS-Slash-Runner 函数）
 */

(function () {
  "use strict";

  const MODULE = "ST-WBM-UI";
  const VERSION = "1.0.0";
  const BACKEND_BASE = "/api/plugins/wb-manager";
  const UI_PATH = BACKEND_BASE + "/ui/";
  const STORAGE_KEY = "wbm_panel_collapsed_v1";

  // =========================================================================
  // 工具函数
  // =========================================================================

  function log(msg) { console.log(`[${MODULE}] ${msg}`); }

  /**
   * 将 window.TavernHelper 上的 JSR 函数代理到 window，
   * 使所有命令可以直接调用全局函数名。
   * 返回 JSR 是否可用。
   */
  function setupJSRProxies() {
    const th = window.TavernHelper;
    if (!th) return typeof getWorldbookNames === "function";
    const funcs = [
      "getWorldbookNames", "getGlobalWorldbookNames", "getCharWorldbookNames",
      "rebindGlobalWorldbooks", "rebindCharWorldbooks",
      "getWorldbook", "createWorldbookEntries", "updateWorldbookWith",
      "deleteWorldbookEntries", "createWorldbook",
      "getCharacterNames", "getCharacter",
    ];
    funcs.forEach(name => {
      if (typeof window[name] !== "function" && typeof th[name] === "function") {
        window[name] = (...args) => th[name](...args);
      }
    });
    return typeof getWorldbookNames === "function";
  }

  /** 获取 JS-Slash-Runner 全局函数（如未安装则抛出） */
  function requireJSR() {
    if (setupJSRProxies()) return; // 代理成功即可用
    throw new Error("未找到酒馆助手 (JS-Slash-Runner) API。请确认已安装并启用「酒馆助手」扩展。");
  }

  /** toastr 通知（有则用，无则忽略） */
  function notifyOk(msg) { typeof toastr !== "undefined" && toastr.success(msg); }
  function notifyErr(msg) { typeof toastr !== "undefined" && toastr.error(msg); }
  function notifyInfo(msg) { typeof toastr !== "undefined" && toastr.info(msg); }

  /** 命令返回值：成功（toastr + 管道文本） */
  function feedOk(short, detail) { notifyOk(short); return detail; }
  /** 命令返回值：失败（toastr + 管道文本） */
  function feedErr(short, detail) { notifyErr(short); return detail; }

  /** 解析 uid 列表（"0,1,2" → [0,1,2]，"" → null 表示全部） */
  function parseUids(raw) {
    if (!raw || raw.trim() === "" || raw.trim() === "all") return null;
    return raw.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  }

  /** 根据 uid 列表过滤条目（null 表示全部） */
  function filterByUids(entries, uids) {
    if (!uids) return entries;
    const set = new Set(uids);
    return entries.filter(e => set.has(e.uid));
  }

  // position 字符串映射
  const POSITION_MAP = {
    "0": "before_character_definition", "bc": "before_character_definition", "before_char": "before_character_definition",
    "1": "after_character_definition",  "ac": "after_character_definition",  "after_char": "after_character_definition",
    "2": "before_example_messages",     "be": "before_example_messages",     "before_em": "before_example_messages",
    "3": "after_example_messages",      "ae": "after_example_messages",      "after_em": "after_example_messages",
    "4": "at_depth",                    "ad": "at_depth",                    "fixed": "at_depth",
    "5": "before_author_note",          "bn": "before_author_note",          "before_an": "before_author_note",
    "6": "after_author_note",           "an": "after_author_note",           "after_an": "after_author_note",
  };

  function resolvePosition(raw) {
    return POSITION_MAP[String(raw).toLowerCase()] || "before_character_definition";
  }

  function resolveStrategy(raw) {
    const m = { constant: "constant", selective: "selective", vectorized: "vectorized",
                 always: "constant", keyword: "selective", vector: "vectorized",
                 蓝灯: "constant", 绿灯: "selective" };
    return m[String(raw).toLowerCase()] || "selective";
  }

  // =========================================================================
  // 命令实现（使用 JS-Slash-Runner 全局函数）
  // =========================================================================

  /** 1. /wb-list — 列出所有世界书 */
  async function cmdList() {
    try {
      requireJSR();
      const names = getWorldbookNames();
      if (names.length === 0) return feedErr("没有找到世界书", "没有找到任何世界书");
      return feedOk(`共 ${names.length} 个世界书`,
        `共 ${names.length} 个世界书:\n${names.map(n => `• ${n}`).join("\n")}`);
    } catch (e) { return feedErr("获取失败", `[错误] ${e.message}`); }
  }

  /** 2. /wb-info <名称> — 查看世界书统计信息 */
  async function cmdInfo(_, name) {
    if (!name) return feedErr("缺少参数", "[错误] 用法: /wb-info <世界书名称>");
    try {
      requireJSR();
      const entries = await getWorldbook(name.trim());
      const total = entries.length;
      const constant = entries.filter(e => e.strategy.type === "constant").length;
      const selective = entries.filter(e => e.strategy.type === "selective").length;
      const vectorized = entries.filter(e => e.strategy.type === "vectorized").length;
      const enabled = entries.filter(e => e.enabled).length;
      return feedOk(`「${name}」共 ${total} 条`, [
        `世界书「${name}」统计:`,
        `  总条目数: ${total}`,
        `  🔵 常量: ${constant}  🟢 可选: ${selective}  🔗 向量: ${vectorized}`,
        `  启用: ${enabled}  禁用: ${total - enabled}`,
      ].join("\n"));
    } catch (e) { return feedErr(`获取「${name}」失败`, `[错误] ${e.message}`); }
  }

  /** 3. /wb-search name=<名称> q=<关键字> — 搜索条目 */
  async function cmdSearch(args, _) {
    const name = args.name;
    const q = (args.q || args.query || "").toLowerCase();
    if (!name) return feedErr("缺少参数", "[错误] 用法: /wb-search name=<世界书> q=<搜索词>");
    try {
      requireJSR();
      const entries = await getWorldbook(name);
      const matched = entries.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.strategy.keys.some(k => String(k).toLowerCase().includes(q))
      );
      if (matched.length === 0) return feedErr(`无匹配`, `在「${name}」中未找到包含「${q}」的条目`);
      const lines = matched.slice(0, 20).map(e =>
        `  [${e.uid}] ${e.name || "(无标题)"} — 关键字: ${e.strategy.keys.slice(0,3).join(", ")}`
      );
      return feedOk(`找到 ${matched.length} 条`,
        `在「${name}」找到 ${matched.length} 个匹配条目${matched.length > 20 ? "（显示前20条）" : ""}:\n${lines.join("\n")}`);
    } catch (e) { return feedErr("搜索失败", `[错误] ${e.message}`); }
  }

  /** 4. /wb-constants <名称> — 列出所有常量条目 */
  async function cmdConstants(_, name) {
    if (!name) return feedErr("缺少参数", "[错误] 用法: /wb-constants <世界书名称>");
    try {
      requireJSR();
      const entries = await getWorldbook(name.trim());
      const constants = entries.filter(e => e.strategy.type === "constant");
      if (constants.length === 0) return feedOk(`「${name}」无常量条目`, `「${name}」中没有常量（蓝灯）条目`);
      const lines = constants.map(e => `  [${e.uid}] ${e.name || "(无标题)"} | Order=${e.position.order} | ${e.enabled ? "启用" : "禁用"}`);
      return feedOk(`「${name}」共 ${constants.length} 个常量条目`,
        `「${name}」的常量条目（共 ${constants.length} 个）:\n${lines.join("\n")}`);
    } catch (e) { return feedErr("获取失败", `[错误] ${e.message}`); }
  }

  /** 5. /wb-new-entry name=<名称> [title=<标题>] [strategy=constant|selective] — 新建条目 */
  async function cmdNewEntry(args, _) {
    const name = args.name;
    if (!name) return feedErr("缺少参数", "[错误] 用法: /wb-new-entry name=<世界书> [title=<标题>] [strategy=selective]");
    try {
      requireJSR();
      const strategy = resolveStrategy(args.strategy || "selective");
      const { new_entries } = await createWorldbookEntries(name, [{
        name: args.title || "",
        strategy: { type: strategy, keys: [], keys_secondary: { logic: "and_any", keys: [] }, scan_depth: "same_as_global" },
        position: { type: "before_character_definition", role: "system", depth: 4, order: args.order ? parseInt(args.order) : 100 },
        content: "",
        enabled: true,
        probability: 100,
      }]);
      const e = new_entries[0];
      return feedOk(`已创建条目 [${e.uid}]`,
        `✅ 已在「${name}」创建新条目 [${e.uid}]「${e.name || "(无标题)"}」\n  策略: ${strategy}  Order: ${e.position.order}`);
    } catch (e) { return feedErr("创建条目失败", `[错误] ${e.message}`); }
  }

  /** 6. /wb-del-entry name=<名称> uid=<UID> — 删除条目 */
  async function cmdDelEntry(args, _) {
    const name = args.name;
    const uid = parseInt(args.uid, 10);
    if (!name || isNaN(uid)) return feedErr("缺少参数", "[错误] 用法: /wb-del-entry name=<世界书> uid=<UID>");
    try {
      requireJSR();
      const { deleted_entries } = await deleteWorldbookEntries(name, e => e.uid === uid);
      if (deleted_entries.length === 0) return feedErr(`UID=${uid} 不存在`, `[错误] 未找到 UID=${uid} 的条目`);
      const e = deleted_entries[0];
      return feedOk(`已删除条目 [${uid}]`,
        `✅ 已删除条目 [${uid}]「${e.name || "(无标题)"}」`);
    } catch (e) { return feedErr("删除条目失败", `[错误] ${e.message}`); }
  }

  /** 7. /wb-set-strategy name=<名称> [uids=<0,1,2>] strategy=<策略> — 批量设置激活策略 */
  async function cmdSetStrategy(args, _) {
    const name = args.name;
    const strategy = resolveStrategy(args.strategy);
    if (!name || !args.strategy) return feedErr("缺少参数", "[错误] 用法: /wb-set-strategy name=<世界书> strategy=constant|selective|vectorized [uids=0,1,2]");
    try {
      requireJSR();
      const uids = parseUids(args.uids);
      const updated = await updateWorldbookWith(name, entries => {
        const targets = filterByUids(entries, uids);
        return entries.map(e => targets.includes(e)
          ? { ...e, strategy: { ...e.strategy, type: strategy } } : e);
      });
      const count = uids ? uids.length : updated.length;
      return feedOk(`已更新 ${count} 条激活策略`,
        `✅ 已将 ${count} 个条目的激活策略设置为「${strategy}」`);
    } catch (e) { return feedErr("批量设置失败", `[错误] ${e.message}`); }
  }

  /** 8. /wb-set-position name=<名称> [uids=<...>] pos=<位置> — 批量设置插入位置 */
  async function cmdSetPosition(args, _) {
    const name = args.name;
    const pos = resolvePosition(args.pos || args.position);
    if (!name || (!args.pos && !args.position)) return feedErr("缺少参数",
      "[错误] 用法: /wb-set-position name=<世界书> pos=<位置> [uids=0,1,2]\n  位置: bc/ac/be/ae/ad/bn/an 或 0-6");
    try {
      requireJSR();
      const uids = parseUids(args.uids);
      await updateWorldbookWith(name, entries => {
        const targets = filterByUids(entries, uids);
        return entries.map(e => targets.includes(e)
          ? { ...e, position: { ...e.position, type: pos } } : e);
      });
      const count = uids ? uids.length : "(全部)";
      return feedOk(`已更新 ${count} 条插入位置`, `✅ 已将 ${count} 个条目的插入位置设置为「${pos}」`);
    } catch (e) { return feedErr("批量设置失败", `[错误] ${e.message}`); }
  }

  /** 9. /wb-set-order name=<名称> [uids=<...>] order=<数值> — 批量设置 Order */
  async function cmdSetOrder(args, _) {
    const name = args.name;
    const order = parseInt(args.order, 10);
    if (!name || isNaN(order)) return feedErr("缺少参数", "[错误] 用法: /wb-set-order name=<世界书> order=<数值> [uids=0,1,2]");
    try {
      requireJSR();
      const uids = parseUids(args.uids);
      await updateWorldbookWith(name, entries => {
        const targets = filterByUids(entries, uids);
        return entries.map(e => targets.includes(e)
          ? { ...e, position: { ...e.position, order } } : e);
      });
      const count = uids ? uids.length : "(全部)";
      return feedOk(`已更新 ${count} 条 Order`, `✅ 已将 ${count} 个条目的 Order 设置为 ${order}`);
    } catch (e) { return feedErr("批量设置失败", `[错误] ${e.message}`); }
  }

  /** 10. /wb-set-depth name=<名称> [uids=<...>] depth=<数值> — 批量设置深度 */
  async function cmdSetDepth(args, _) {
    const name = args.name;
    const depth = parseInt(args.depth, 10);
    if (!name || isNaN(depth)) return feedErr("缺少参数", "[错误] 用法: /wb-set-depth name=<世界书> depth=<数值> [uids=0,1,2]");
    try {
      requireJSR();
      const uids = parseUids(args.uids);
      await updateWorldbookWith(name, entries => {
        const targets = filterByUids(entries, uids);
        return entries.map(e => targets.includes(e)
          ? { ...e, position: { ...e.position, depth } } : e);
      });
      const count = uids ? uids.length : "(全部)";
      return feedOk(`已更新 ${count} 条深度`, `✅ 已将 ${count} 个条目的深度设置为 ${depth}`);
    } catch (e) { return feedErr("批量设置失败", `[错误] ${e.message}`); }
  }

  /** 11. /wb-set-prob name=<名称> [uids=<...>] prob=<0-100> — 批量设置触发概率 */
  async function cmdSetProb(args, _) {
    const name = args.name;
    const prob = parseInt(args.prob || args.probability, 10);
    if (!name || isNaN(prob) || prob < 0 || prob > 100)
      return feedErr("缺少参数", "[错误] 用法: /wb-set-prob name=<世界书> prob=<0-100> [uids=0,1,2]");
    try {
      requireJSR();
      const uids = parseUids(args.uids);
      await updateWorldbookWith(name, entries => {
        const targets = filterByUids(entries, uids);
        return entries.map(e => targets.includes(e)
          ? { ...e, probability: prob } : e);
      });
      const count = uids ? uids.length : "(全部)";
      return feedOk(`已更新 ${count} 条触发概率`, `✅ 已将 ${count} 个条目的触发概率设置为 ${prob}%`);
    } catch (e) { return feedErr("批量设置失败", `[错误] ${e.message}`); }
  }

  /** 12. /wb-set-name name=<名称> [uids=<...>] title=<标题> — 批量设置条目标题 */
  async function cmdSetName(args, _) {
    const name = args.name;
    const title = args.title || args.newname;
    if (!name || !title) return feedErr("缺少参数", "[错误] 用法: /wb-set-name name=<世界书> title=<新标题> [uids=0,1,2]");
    try {
      requireJSR();
      const uids = parseUids(args.uids);
      await updateWorldbookWith(name, entries => {
        const targets = filterByUids(entries, uids);
        return entries.map(e => targets.includes(e) ? { ...e, name: title } : e);
      });
      const count = uids ? uids.length : "(全部)";
      return feedOk(`已重命名 ${count} 条`, `✅ 已将 ${count} 个条目的标题设置为「${title}」`);
    } catch (e) { return feedErr("批量重命名失败", `[错误] ${e.message}`); }
  }

  /** 13. /wb-add-keys name=<名称> [uids=<...>] keys=<词1,词2> — 批量添加关键字 */
  async function cmdAddKeys(args, _) {
    const name = args.name;
    const keysRaw = args.keys || args.keywords;
    if (!name || !keysRaw) return feedErr("缺少参数", "[错误] 用法: /wb-add-keys name=<世界书> keys=<词1,词2,...> [uids=0,1,2]");
    const toAdd = keysRaw.split(",").map(k => k.trim()).filter(Boolean);
    try {
      requireJSR();
      const uids = parseUids(args.uids);
      await updateWorldbookWith(name, entries => {
        const targets = filterByUids(entries, uids);
        return entries.map(e => {
          if (!targets.includes(e)) return e;
          const existing = new Set(e.strategy.keys.map(String));
          const merged = [...e.strategy.keys, ...toAdd.filter(k => !existing.has(k))];
          return { ...e, strategy: { ...e.strategy, keys: merged } };
        });
      });
      const count = uids ? uids.length : "(全部)";
      return feedOk(`已为 ${count} 条添加关键字`, `✅ 已为 ${count} 个条目添加关键字: ${toAdd.join(", ")}`);
    } catch (e) { return feedErr("添加关键字失败", `[错误] ${e.message}`); }
  }

  /** 14. /wb-set-keys name=<名称> [uids=<...>] keys=<词1,词2> — 批量替换关键字 */
  async function cmdSetKeys(args, _) {
    const name = args.name;
    const keysRaw = args.keys || args.keywords;
    if (!name || keysRaw === undefined) return feedErr("缺少参数", "[错误] 用法: /wb-set-keys name=<世界书> keys=<词1,词2,...> [uids=0,1,2]");
    const newKeys = keysRaw ? keysRaw.split(",").map(k => k.trim()).filter(Boolean) : [];
    try {
      requireJSR();
      const uids = parseUids(args.uids);
      await updateWorldbookWith(name, entries => {
        const targets = filterByUids(entries, uids);
        return entries.map(e => targets.includes(e)
          ? { ...e, strategy: { ...e.strategy, keys: newKeys } } : e);
      });
      const count = uids ? uids.length : "(全部)";
      return feedOk(`已替换 ${count} 条关键字`,
        `✅ 已替换 ${count} 个条目的关键字为: ${newKeys.join(", ") || "(空)"}`);
    } catch (e) { return feedErr("替换关键字失败", `[错误] ${e.message}`); }
  }

  /** 15. /wb-clear-keys name=<名称> [uids=<...>] — 批量清空关键字 */
  async function cmdClearKeys(args, _) {
    const name = args.name;
    if (!name) return feedErr("缺少参数", "[错误] 用法: /wb-clear-keys name=<世界书> [uids=0,1,2]");
    try {
      requireJSR();
      const uids = parseUids(args.uids);
      await updateWorldbookWith(name, entries => {
        const targets = filterByUids(entries, uids);
        return entries.map(e => targets.includes(e)
          ? { ...e, strategy: { ...e.strategy, keys: [] } } : e);
      });
      const count = uids ? uids.length : "(全部)";
      return feedOk(`已清空 ${count} 条关键字`, `✅ 已清空 ${count} 个条目的所有关键字`);
    } catch (e) { return feedErr("清空关键字失败", `[错误] ${e.message}`); }
  }

  /** 16. /wb-set-recursion name=<名称> [uids=<...>] [pi=true] [po=true] — 批量设置递归控制 */
  async function cmdSetRecursion(args, _) {
    const name = args.name;
    if (!name) return feedErr("缺少参数",
      "[错误] 用法: /wb-set-recursion name=<世界书> [pi=true|false] [po=true|false] [uids=0,1,2]\n  pi=禁止被递归激活 po=禁止递归激活他人");
    try {
      requireJSR();
      const uids = parseUids(args.uids);
      const pi = args.pi !== undefined ? String(args.pi) === "true" : undefined;
      const po = args.po !== undefined ? String(args.po) === "true" : undefined;
      await updateWorldbookWith(name, entries => {
        const targets = filterByUids(entries, uids);
        return entries.map(e => {
          if (!targets.includes(e)) return e;
          const recursion = { ...e.recursion };
          if (pi !== undefined) recursion.prevent_incoming = pi;
          if (po !== undefined) recursion.prevent_outgoing = po;
          return { ...e, recursion };
        });
      });
      const count = uids ? uids.length : "(全部)";
      const desc = [pi !== undefined && `禁止被递归=${pi}`, po !== undefined && `禁止递归他人=${po}`].filter(Boolean).join("，");
      return feedOk(`已更新 ${count} 条递归控制`, `✅ 已设置 ${count} 个条目的递归控制: ${desc}`);
    } catch (e) { return feedErr("设置递归失败", `[错误] ${e.message}`); }
  }

  /** 17. /wb-set-effect name=<名称> [uids=<...>] [sticky=n] [cooldown=n] [delay=n] — 批量设置效果 */
  async function cmdSetEffect(args, _) {
    const name = args.name;
    if (!name) return feedErr("缺少参数",
      "[错误] 用法: /wb-set-effect name=<世界书> [sticky=<n>] [cooldown=<n>] [delay=<n>] [uids=0,1,2]");
    try {
      requireJSR();
      const uids = parseUids(args.uids);
      const sticky  = args.sticky   !== undefined ? (args.sticky  === "null" ? null : parseInt(args.sticky,   10)) : undefined;
      const cooldown = args.cooldown !== undefined ? (args.cooldown === "null" ? null : parseInt(args.cooldown, 10)) : undefined;
      const delay   = args.delay    !== undefined ? (args.delay   === "null" ? null : parseInt(args.delay,    10)) : undefined;
      await updateWorldbookWith(name, entries => {
        const targets = filterByUids(entries, uids);
        return entries.map(e => {
          if (!targets.includes(e)) return e;
          const effect = { ...e.effect };
          if (sticky   !== undefined) effect.sticky   = sticky;
          if (cooldown !== undefined) effect.cooldown = cooldown;
          if (delay    !== undefined) effect.delay    = delay;
          return { ...e, effect };
        });
      });
      const count = uids ? uids.length : "(全部)";
      return feedOk(`已更新 ${count} 条效果设置`, `✅ 已更新 ${count} 个条目的效果（粘性/冷却/延迟）`);
    } catch (e) { return feedErr("设置效果失败", `[错误] ${e.message}`); }
  }

  /** 18. /wb-enable name=<名称> [uids=<...>] [enabled=true|false] — 批量启用/禁用 */
  async function cmdEnable(args, _) {
    const name = args.name;
    const enabled = String(args.enabled || "true") !== "false";
    if (!name) return feedErr("缺少参数", "[错误] 用法: /wb-enable name=<世界书> [enabled=true|false] [uids=0,1,2]");
    try {
      requireJSR();
      const uids = parseUids(args.uids);
      await updateWorldbookWith(name, entries => {
        const targets = filterByUids(entries, uids);
        return entries.map(e => targets.includes(e) ? { ...e, enabled } : e);
      });
      const count = uids ? uids.length : "(全部)";
      return feedOk(`已${enabled ? "启用" : "禁用"} ${count} 条`, `✅ 已${enabled ? "启用" : "禁用"} ${count} 个条目`);
    } catch (e) { return feedErr("设置失败", `[错误] ${e.message}`); }
  }

  /** 19. /wb-export <名称> — 从后端下载世界书 JSON */
  async function cmdExport(_, name) {
    if (!name) return feedErr("缺少参数", "[错误] 用法: /wb-export <世界书名称>");
    const url = `${BACKEND_BASE}/worldbooks/${encodeURIComponent(name.trim())}/export`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.trim()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return feedOk(`正在下载「${name}」`, `✅ 已触发下载「${name}」（从后端获取）`);
  }

  /** 20. /wb-ui — 打开双面板管理界面（ST内嵌模态窗口） */
  function cmdUI() {
    if (typeof openManagerModal === "function") {
      openManagerModal();
    } else {
      window.open(UI_PATH, "_blank");
    }
    notifyInfo("喵~正在打开世界书管理器~ 📖");
    return "已打开管理界面";
  }

  /** 21. /wb-new <名称> — 创建新世界书 */
  async function cmdNewWorldbook(_, name) {
    if (!name) return feedErr("缺少参数", "[错误] 用法: /wb-new <世界书名称>");
    try {
      requireJSR();
      const created = await createWorldbook(name.trim());
      return feedOk(created ? `已创建「${name}」` : `已覆盖「${name}」`,
        created ? `✅ 已创建新世界书「${name}」` : `⚠️ 已覆盖现有世界书「${name}」`);
    } catch (e) { return feedErr("创建失败", `[错误] ${e.message}`); }
  }

  /** 获取 CSRF token（缓存） */
  let _csrfToken = null;
  async function getCsrfToken() {
    if (_csrfToken) return _csrfToken;
    try {
      const r = await fetch(`${BACKEND_BASE}/csrf-token`, { credentials: "include" });
      const d = await r.json();
      _csrfToken = d.token || null;
    } catch { _csrfToken = null; }
    return _csrfToken;
  }

  /**
   * 22. /wb-copy — 跨世界书复制条目（实现「拆分」和「合并」概念）
   *
   * 拆分：将条目从主世界书复制到临时世界书
   *   /wb-copy from=主世界书 to=临时世界书 uids=0,1,2
   *
   * 合并：将临时世界书条目合并回主世界书
   *   /wb-copy from=临时世界书 to=主世界书
   */
  async function cmdCopy(args, _) {
    const from = args.from || args.source;
    const to = args.to || args.target;
    if (!from || !to) return feedErr("缺少参数",
      "[错误] 用法: /wb-copy from=<源世界书> to=<目标世界书> [uids=0,1,2]\n" +
      "  省略 uids 则复制全部条目（合并操作）\n" +
      "  拆分: /wb-copy from=主WB to=临时WB uids=0,1,2\n" +
      "  合并: /wb-copy from=临时WB to=主WB");
    try {
      const uids = parseUids(args.uids);
      let resolvedUids = uids;
      if (!resolvedUids) {
        // 复制全部：先通过 JSR 获取所有 uid
        requireJSR();
        const entries = await getWorldbook(from);
        resolvedUids = entries.map(e => e.uid);
      }
      if (!resolvedUids || resolvedUids.length === 0) {
        return feedErr("无条目", `「${from}」中没有条目可复制`);
      }
      const csrfToken = await getCsrfToken();
      const headers = { "Content-Type": "application/json" };
      if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
      const res = await fetch(`${BACKEND_BASE}/worldbooks/${encodeURIComponent(from)}/copy`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ uids: resolvedUids, target_worldbook: to }),
      });
      const data = await res.json();
      if (data.success) {
        const count = data.data?.count ?? resolvedUids.length;
        return feedOk(`已复制 ${count} 条条目到「${to}」`,
          `✅ 已将 ${count} 条条目从「${from}」复制到「${to}」\n` +
          `  新 UID: ${(data.data?.copied_uids || []).slice(0, 5).join(", ")}${count > 5 ? "..." : ""}`);
      } else {
        return feedErr("复制失败", `[错误] ${data.message}`);
      }
    } catch (e) { return feedErr("复制失败", `[错误] ${e.message}`); }
  }

  /** 23. /wb-help — 显示命令列表 */
  function cmdHelp() {
    const cmds = [
      "查询类:",
      "  /wb-list                              — 列出所有世界书",
      "  /wb-info <名称>                       — 查看世界书统计",
      "  /wb-search name=<名> q=<搜索词>       — 搜索条目",
      "  /wb-constants <名称>                  — 列出常量条目",
      "",
      "世界书管理:",
      "  /wb-new <名称>                        — 创建世界书",
      "  /wb-new-entry name=<名> [title=<标>]  — 创建条目",
      "  /wb-del-entry name=<名> uid=<UID>     — 删除条目",
      "",
      "批量操作（均支持 uids=0,1,2 或省略表示全部）:",
      "  /wb-set-strategy name=<名> strategy=constant|selective|vectorized",
      "  /wb-set-position name=<名> pos=bc|ac|be|ae|ad|bn|an",
      "  /wb-set-order    name=<名> order=<数值>",
      "  /wb-set-depth    name=<名> depth=<数值>",
      "  /wb-set-prob     name=<名> prob=<0-100>",
      "  /wb-set-name     name=<名> title=<新标题>",
      "  /wb-add-keys     name=<名> keys=<词1,词2>",
      "  /wb-set-keys     name=<名> keys=<词1,词2>",
      "  /wb-clear-keys   name=<名>",
      "  /wb-set-recursion name=<名> [pi=true|false] [po=true|false]",
      "  /wb-set-effect   name=<名> [sticky=n] [cooldown=n] [delay=n]",
      "  /wb-enable       name=<名> [enabled=true|false]",
      "",
      "其他:",
      "  /wb-export <名称>                     — 下载世界书 JSON",
      "  /wb-copy from=<名> to=<名> [uids=...] — 复制条目（拆分/合并）",
      "  /wb-ui                                — 打开双面板管理界面",
      "  /wb-help                              — 显示此帮助",
    ].join("\n");
    notifyInfo("命令列表已显示");
    return cmds;
  }

  // =========================================================================
  // 命令注册（多策略渐进降级）
  // =========================================================================

  /** 全部斜杠命令定义（统一定义，所有注册策略共用） */
  const ALL_CMDS = () => [
    { name: "wb-list",         fn: cmdList,          help: "列出所有世界书" },
    { name: "wb-info",         fn: cmdInfo,          help: "查看世界书统计 <名称>" },
    { name: "wb-search",       fn: cmdSearch,        help: "搜索条目 name=<名> q=<词>" },
    { name: "wb-constants",    fn: cmdConstants,     help: "列出常量条目 <名称>" },
    { name: "wb-new",          fn: cmdNewWorldbook,  help: "创建世界书 <名称>" },
    { name: "wb-new-entry",    fn: cmdNewEntry,      help: "创建条目 name=<名> [title=<标>]" },
    { name: "wb-del-entry",    fn: cmdDelEntry,      help: "删除条目 name=<名> uid=<UID>" },
    { name: "wb-set-strategy", fn: cmdSetStrategy,   help: "批量设置激活策略" },
    { name: "wb-set-position", fn: cmdSetPosition,   help: "批量设置插入位置" },
    { name: "wb-set-order",    fn: cmdSetOrder,      help: "批量设置 Order" },
    { name: "wb-set-depth",    fn: cmdSetDepth,      help: "批量设置深度" },
    { name: "wb-set-prob",     fn: cmdSetProb,       help: "批量设置触发概率" },
    { name: "wb-set-name",     fn: cmdSetName,       help: "批量设置条目标题" },
    { name: "wb-add-keys",     fn: cmdAddKeys,       help: "批量添加关键字" },
    { name: "wb-set-keys",     fn: cmdSetKeys,       help: "批量替换关键字" },
    { name: "wb-clear-keys",   fn: cmdClearKeys,     help: "批量清空关键字" },
    { name: "wb-set-recursion",fn: cmdSetRecursion,  help: "批量设置递归控制" },
    { name: "wb-set-effect",   fn: cmdSetEffect,     help: "批量设置效果（粘性/冷却/延迟）" },
    { name: "wb-enable",       fn: cmdEnable,        help: "批量启用/禁用条目" },
    { name: "wb-export",       fn: cmdExport,        help: "下载世界书 JSON <名称>" },
    { name: "wb-copy",         fn: cmdCopy,          help: "复制条目 from=<源> to=<目标> [uids=...]" },
    { name: "wb-ui",           fn: cmdUI,            help: "打开双面板管理界面" },
    { name: "wb-help",         fn: cmdHelp,          help: "显示命令帮助" },
  ];

  // ── 防重复注册标志 ──
  let _cmdsRegistered = false;

  // ── 模块级缓存（动态 import 结果，多次调用共享） ──
  let _cachedParser   = null;
  let _cachedSlashCmd = null;

  // =========================================================================
  // 斜杠命令注册（五策略，优先级 0→1→2→3→4）
  //
  // ★ 根因分析（四旧策略全部失效）：
  //   旧策略 A: window.SlashCommandParser 在现代 ST 中不暴露到 window
  //   旧策略 B: 使用路径 /slash-commands/… 是错误路径（无 /scripts/ 前缀）
  //   旧策略 C: window.addSlashCommand 在 ST ≥1.10 删除
  //   旧策略 D: 轮询只重试旧策略 A，同样失败
  //
  // ★ 修复方案：
  //   策略 0 (trySTContext)    — window.SillyTavern.getContext()【官方稳定接口】
  //   策略 1 (tryWindowParser) — window.SlashCommandParser（A1/A2/A3 三子策略）
  //   策略 2 (tryDynamicImport)— 动态 import，路径已修正为正确的 ST 目录结构
  //   策略 3 (tryLegacyGlobal) — 旧版全局函数 addSlashCommand（ST ≤1.8）
  //   策略 4 (pollAndRegister) — 轮询兜底（60s），每轮依次尝试 0→1→2→3
  // =========================================================================

  /**
   * 策略 0（最优先）：window.SillyTavern.getContext()
   *
   * SillyTavern 为扩展提供的官方稳定接口（st-context.js）。
   * 从 exported.sillytavern.d.ts 确认：
   *   window.SillyTavern.getContext() 直接暴露 SlashCommandParser 和 SlashCommand。
   * 这是最可靠的方式，不依赖任何路径推断。
   */
  function trySTContext(cmds) {
    if (typeof window.SillyTavern?.getContext !== "function") return false;
    const ctx    = window.SillyTavern.getContext();
    const Parser = ctx?.SlashCommandParser;
    const SC     = ctx?.SlashCommand;
    if (!Parser?.addCommandObject || !SC?.fromProps) {
      log("SillyTavern.getContext() 存在但 SlashCommandParser/SlashCommand 未就绪");
      return false;
    }
    cmds.forEach(c => Parser.addCommandObject(
      SC.fromProps({ name: c.name, helpString: c.help, callback: c.fn })
    ));
    log(`已注册 ${cmds.length} 条命令（策略0: SillyTavern.getContext() 官方接口）`);
    return true;
  }

  /**
   * 尝试从多个候选路径动态 import SlashCommandParser + SlashCommand。
   *
   * ★ 路径说明（ST extensions.js 确认，扩展以 script.type='module' 加载）：
   *   扩展 URL: /scripts/extensions/third-party/ST-WBM-UI/index.js
   *   目标文件: /scripts/slash-commands/SlashCommandParser.js
   *
   *   相对路径（从扩展目录出发，3 层 ../）：
   *     ../../../slash-commands/SlashCommandParser.js
   *   绝对路径（不依赖 base URL）：
   *     /scripts/slash-commands/SlashCommandParser.js
   */
  async function loadSlashModules() {
    if (_cachedParser && _cachedSlashCmd) return true;

    const pathPairs = [
      // ① 相对路径：扩展以 ES module 加载时，base URL = 扩展文件 URL
      //   /scripts/extensions/third-party/ST-WBM-UI/ → ../../../ = /scripts/
      ["../../../slash-commands/SlashCommandParser.js",
       "../../../slash-commands/SlashCommand.js"],
      // ② 绝对路径：标准 ST 安装，不依赖 base URL 推断
      ["/scripts/slash-commands/SlashCommandParser.js",
       "/scripts/slash-commands/SlashCommand.js"],
      // ③ 相对路径备选：部分 ST 版本扩展路径深度不同（2 层 ../）
      ["../../slash-commands/SlashCommandParser.js",
       "../../slash-commands/SlashCommand.js"],
    ];

    for (const [pPath, cPath] of pathPairs) {
      try {
        const [mP, mC] = await Promise.all([import(pPath), import(cPath)]);
        const Parser = mP.SlashCommandParser ?? mP.default;
        const SC     = mC.SlashCommand       ?? mC.default;
        if (Parser?.addCommandObject && SC?.fromProps) {
          _cachedParser   = Parser;
          _cachedSlashCmd = SC;
          log(`SlashCommand 模块加载成功（路径: ${pPath}）`);
          return true;
        }
        log(`路径 ${pPath} 导入成功但导出不符，跳过`);
      } catch (e) {
        log(`路径 ${pPath} 加载失败: ${e.message}`);
      }
    }
    return false;
  }

  /**
   * 策略 1：window.SlashCommandParser（部分 ST 版本对外暴露）
   *   1A — parser + window.SlashCommand（两者均在 window）
   *   1B — parser + 动态导入 SlashCommand（parser 在 window，SlashCommand 不在）
   *   1C — parser.addCommand（旧版 ST ≤1.10 的 API）
   */
  async function tryWindowParser(cmds) {
    const p = window.SlashCommandParser;
    if (!p) return false;

    if (typeof p.addCommandObject === "function") {
      const SC = window.SlashCommand;
      if (SC?.fromProps) {
        cmds.forEach(c => p.addCommandObject(
          SC.fromProps({ name: c.name, helpString: c.help, callback: c.fn })
        ));
        log(`已注册 ${cmds.length} 条命令（策略1A: window.SlashCommandParser 现代 API）`);
        return true;
      }
      // 1B: parser 在 window 但 SlashCommand 不在，动态 import 补齐
      if (await loadSlashModules() && _cachedSlashCmd) {
        cmds.forEach(c => p.addCommandObject(
          _cachedSlashCmd.fromProps({ name: c.name, helpString: c.help, callback: c.fn })
        ));
        log(`已注册 ${cmds.length} 条命令（策略1B: window.parser + 动态 import SlashCommand）`);
        return true;
      }
    }
    // 1C: 旧版 addCommand API（ST ≤1.10）
    if (typeof p.addCommand === "function") {
      cmds.forEach(c => p.addCommand(c.name, c.fn, [], c.help, true, true));
      log(`已注册 ${cmds.length} 条命令（策略1C: window.SlashCommandParser.addCommand 旧版）`);
      return true;
    }
    return false;
  }

  /**
   * 策略 2：动态 import（路径已修正，见 loadSlashModules）
   */
  async function tryDynamicImport(cmds) {
    if (!await loadSlashModules()) return false;
    cmds.forEach(c => _cachedParser.addCommandObject(
      _cachedSlashCmd.fromProps({ name: c.name, helpString: c.help, callback: c.fn })
    ));
    log(`已注册 ${cmds.length} 条命令（策略2: 动态 import ES-module）`);
    return true;
  }

  /**
   * 策略 3：旧版全局函数 addSlashCommand / registerSlash（ST ≤1.8）
   */
  function tryLegacyGlobal(cmds) {
    const fn = window.addSlashCommand ?? window.registerSlash;
    if (typeof fn !== "function") return false;
    cmds.forEach(c => fn(c.name, c.fn, [], c.help));
    log(`已注册 ${cmds.length} 条命令（策略3: 全局旧版 addSlashCommand）`);
    return true;
  }

  /**
   * 策略 4：轮询兜底（最多 60 次 × 1s = 60 秒）
   * 每轮依次尝试 0→1→2→3，只要有一个成功即停止。
   */
  function pollAndRegister(cmds) {
    let attempts = 0;
    const t = setInterval(async () => {
      attempts++;
      if (
        trySTContext(cmds) ||
        await tryWindowParser(cmds) ||
        await tryDynamicImport(cmds) ||
        tryLegacyGlobal(cmds)
      ) {
        _cmdsRegistered = true;
        clearInterval(t);
        log(`命令注册成功（轮询第 ${attempts} 次）`);
        return;
      }
      if (attempts >= 60) {
        clearInterval(t);
        log("命令注册超时（60s）：所有策略均失败，/wb-* 命令不可用");
      }
    }, 1000);
  }

  async function registerCommands() {
    if (_cmdsRegistered) { log("命令已注册，跳过重复注册"); return; }

    const cmds = ALL_CMDS();

    // 策略 0 → 1 → 2 → 3 → 轮询兜底 4
    if (trySTContext(cmds))           { _cmdsRegistered = true; return; }
    if (await tryWindowParser(cmds))  { _cmdsRegistered = true; return; }
    if (await tryDynamicImport(cmds)) { _cmdsRegistered = true; return; }
    if (tryLegacyGlobal(cmds))        { _cmdsRegistered = true; return; }

    // 所有即时策略均失败 → 启动轮询等待 ST 初始化完成
    log("命令注册延迟：启动轮询等待 SlashCommandParser 就绪（最多 60s）…");
    pollAndRegister(cmds);
  }

  // =========================================================================
  // 内嵌模态窗口（在 ST 界面内打开世界书管理器）
  // =========================================================================

  // ── 页面滚动锁定/解锁（防止模态层背后的 ST 页面被意外滚动）──
  // 记住打开前的 overflow 值，关闭时精确还原
  let _prevHtmlOverflow = "";
  function lockPageScroll() {
    _prevHtmlOverflow = document.documentElement.style.overflow || "";
    document.documentElement.style.overflow = "hidden";
  }
  function unlockPageScroll() {
    document.documentElement.style.overflow = _prevHtmlOverflow;
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
      existing.style.alignItems     = mob ? "stretch" : "center";
      existing.style.justifyContent = mob ? "flex-start" : "center";
      existing.style.zIndex         = "2147483646";
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
      lockPageScroll();
      return;
    }

    // ── 遮罩层（纵向 flex，从上到下：关闭条 → iframe 容器） ──
    const overlay = document.createElement("div");
    overlay.id = "wbm-modal-overlay";
    // 手机/平板（<1100px）全屏覆盖；桌面（≥1100px）居中浮层
    // ★ z-index: 2147483646（CSS最大值）确保覆盖 ST 任何面板/抽屉，
    //   无论 body 是否有 transform（transform 会建立新层叠上下文，
    //   但 html 无 transform，我们的 fixed 元素在 root 层叠上下文中最高）
    const isMobile = window.innerWidth < 1100;

    Object.assign(overlay.style, {
      position: "fixed", inset: "0",
      background: "rgba(0,0,0,0.78)",
      display: "flex",
      flexDirection: "column",
      // 手机/平板：从顶部开始堆叠（避免 100vh 计算依赖）
      // 桌面：居中显示
      alignItems: isMobile ? "stretch" : "center",
      justifyContent: isMobile ? "flex-start" : "center",
      zIndex: "2147483646",
      padding: "0",
      boxSizing: "border-box",
    });

    const modalWidth = isMobile ? "100%" : "min(1440px, 96vw)";

    // ── 关闭按钮条（在 iframe 上方，独立行，不会重叠任何 Vue 内容） ──
    const topBar = document.createElement("div");
    topBar.className = "wbm-modal-topbar";          // 供 reuse 逻辑查找
    Object.assign(topBar.style, {
      width: modalWidth,            // 手机 100% / 桌面固定宽
      height: "32px",               // 固定高，不参与 100vh 计算
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      flexShrink: "0",
      paddingRight: "8px",
      boxSizing: "border-box",
    });

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
    container.className = "wbm-modal-container";   // 供 reuse 逻辑查找
    Object.assign(container.style, {
      width: modalWidth,
      // 手机：flex:1 填满 overlay 剩余空间（topBar 32px 之后全部）
      //   → 完全不依赖 100vh 计算，天然避免 iOS Safari 100vh 陷阱
      // 桌面：固定最大高度，居中展示
      ...(isMobile
        ? { flex: "1", minHeight: "0" }
        : { height: "min(900px, calc(92vh - 36px))", flexShrink: "0" }),
      borderRadius: isMobile ? "0" : "12px",
      overflow: "hidden",
      boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
      // Safari：容器需是 flex 容器，iframe 才能用 flex:1 正确撑满
      display: "flex",
      flexDirection: "column",
    });

    // ── iframe ──
    const iframe = document.createElement("iframe");
    iframe.src = UI_PATH;
    Object.assign(iframe.style, {
      width: "100%",
      flex: "1",      // 替代 height:100%，在 Safari flex 容器中更可靠
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
    overlay.appendChild(topBar);     // 关闭条在上
    overlay.appendChild(container); // iframe 在下
    // 挂载到 <html> 而非 <body>：
    // ST 手机端用 body transform 实现滑入抽屉动画，
    // position:fixed 在有 transform 的祖先内会相对于该祖先定位而非视口。
    // 将遮罩挂到 html 元素（html 无 transform），可保证 fixed 始终相对视口。
    document.documentElement.appendChild(overlay);
    // 锁定背景页滚动（防止用户滚动 ST 页面而非弹窗内容，
    // 同时稳定 #bg1 等 background-attachment:fixed 元素的宽度）
    lockPageScroll();
    log("模态窗口已打开");
  }

  // =========================================================================
  // 注入面板 UI
  // =========================================================================

  function injectPanel() {
    // 防重复注入：ST 扩展框架在某些场景下会多次调用 onLoad/ready，
    // 多个相同 id 的元素进入同一 form 会触发 "Duplicate form field id" 错误
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
          <span id="wbm-badge-jsr" class="wbm-badge wbm-badge-wait">⏳ 酒馆助手检测中</span>
        </div>
        <button id="wbm-open-btn">📖 打开管理面板</button>
        <div id="wbm-hint">
          输入 <code>/wb-help</code> 查看所有命令<br>
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

    // 检测酒馆助手（多方式 + 代理安装 + 重试最多30次×1s）
    let jsrReady = false;
    (function checkJSR(attempt) {
      const badge = document.getElementById("wbm-badge-jsr");
      if (!badge) return;

      // setupJSRProxies 会尝试从 TavernHelper 创建代理函数，返回是否可用
      const ok = setupJSRProxies() || (
        window.extension_settings && (
          window.extension_settings["JS-Slash-Runner"] !== undefined ||
          window.extension_settings["jsr"]             !== undefined
        )
      );

      if (ok && !jsrReady) {
        jsrReady = true;
        badge.textContent = "✅ 酒馆助手已就绪";
        badge.className   = "wbm-badge wbm-badge-ok";
        log("酒馆助手检测成功（第" + (attempt + 1) + "次），代理函数已安装");
        // 确保命令注册（如果首次注册时 ST 尚未就绪，这里补注册一次）
        registerCommands().catch(e => log("命令补注册失败: " + e.message));
      } else if (!ok && attempt < 30) {
        setTimeout(() => checkJSR(attempt + 1), 1000);
      } else if (!ok) {
        badge.textContent = "⚠️ 酒馆助手未加载";
        badge.className   = "wbm-badge wbm-badge-fail";
        log("酒馆助手检测失败（30s 超时），请确认已安装并启用「酒馆助手」扩展");
      }
    })(0);

    log("面板注入完成");
  }

  // =========================================================================
  // 入口（jQuery ready）
  // =========================================================================

  function init() {
    log(`ST-WBM-UI v${VERSION} 正在初始化...`);
    injectPanel();
    registerCommands().catch(e => log(`命令注册异常: ${e.message}`));
    log("初始化完成");
  }

  if (typeof jQuery !== "undefined") {
    jQuery(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
