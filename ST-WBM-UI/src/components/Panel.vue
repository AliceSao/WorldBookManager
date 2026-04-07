<template>
  <div class="panel">
    <!-- 面板头部 -->
    <div class="panel-header">
      <!-- 世界书搜索 + 选择 -->
      <div class="wb-select-wrap">
        <div class="wb-search-row" v-if="worldbooks.length > 6">
          <input
            v-model="wbSearchQuery"
            class="search-input wb-search-input"
            placeholder="🔍 搜索世界书喵~"
          />
          <button v-if="wbSearchQuery" class="btn btn-sm btn-icon" @click="wbSearchQuery = ''" title="清空搜索">✕</button>
        </div>
        <select v-model="selectedWorldbook" class="wb-select" @change="loadWorldbook">
          <option value="">— 选择世界书 —</option>
          <option
            v-if="filteredWorldbookList.length === 0 && wbSearchQuery"
            disabled
            value=""
          >没找到这本世界书喵~ 🐱</option>
          <option v-for="wb in filteredWorldbookList" :key="wb" :value="wb">{{ wb }}</option>
        </select>
      </div>
      <span v-if="isDirty" class="dirty-badge" title="有未保存的修改">●</span>
      <span class="entry-count" v-if="selectedWorldbook">{{ filteredEntries.length }}/{{ localEntries.length }}</span>
      <a
        v-if="selectedWorldbook"
        :href="exportUrl"
        :download="`${selectedWorldbook}.json`"
        class="btn btn-sm"
        title="下载此世界书 JSON 文件"
      >📤</a>
    </div>

    <!-- 搜索栏（含模式切换） -->
    <div class="panel-search">
      <div class="search-mode-tabs">
        <button
          v-for="m in searchModes"
          :key="m.id"
          class="mode-tab"
          :class="{ active: searchMode === m.id }"
          @click="searchMode = m.id; selectedUids.clear()"
        >{{ m.label }}</button>
      </div>
      <div class="search-input-row">
        <input
          v-model="searchQuery"
          class="search-input"
          :placeholder="searchPlaceholder"
        />
        <button v-if="searchQuery" class="btn btn-sm" @click="searchQuery = ''">✕</button>
      </div>
    </div>

    <!-- 条目列表 -->
    <div class="panel-entries" ref="listRef">
      <div v-if="!selectedWorldbook" class="panel-empty">请先选择世界书喵~ 📚</div>
      <div v-else-if="loading" class="panel-empty">正在努力加载中喵...请稍等一下~ 🐾</div>
      <div v-else-if="filteredEntries.length === 0 && searchQuery" class="panel-empty">
        找不到呢喵...换个关键词试试？ 🔍
      </div>
      <div v-else-if="filteredEntries.length === 0" class="panel-empty">暂无条目，创建一条吧喵~ ✏️</div>
      <template v-else>
        <!-- 全选表头 -->
        <div class="entry-row entry-header-row">
          <div class="entry-main">
            <input
              type="checkbox"
              :checked="allSelected"
              :indeterminate="someSelected && !allSelected"
              @change="toggleAll"
            />
            <span class="entry-col-title">
              <span v-if="someSelected" class="selection-count">
                已选 {{ selectedUids.size }}/{{ filteredEntries.length }}
              </span>
              <span v-else class="selection-hint">标题 Shift+点击范围选</span>
            </span>
            <span class="entry-col-meta">策略</span>
            <span class="entry-col-meta">位置</span>
            <span style="width:28px;flex-shrink:0"></span>
          </div>
        </div>

        <!-- 条目行 -->
        <div
          v-for="entry in filteredEntries"
          :key="entry.uid"
          class="entry-row"
          :class="{
            selected: selectedUids.has(entry.uid),
            disabled: entry.disable,
            expanded: expandedUid === entry.uid,
          }"
        >
          <div class="entry-main" @click="handleRowClick(entry.uid, $event)">
            <input
              type="checkbox"
              :checked="selectedUids.has(entry.uid)"
              @click.stop
              @change="handleRowClick(entry.uid, $event)"
            />
            <span class="entry-title">
              <span class="entry-uid-badge">[{{ entry.uid }}]</span>
              <span class="entry-title-text" :title="entry.comment || '（无标题）'">
                {{ entry.comment || "（无标题）" }}
              </span>
            </span>
            <span class="entry-meta strategy" :class="strategyClass(entry)">
              {{ strategyShort(entry) }}
            </span>
            <span class="entry-meta">{{ positionShort(entry) }}</span>
            <button class="btn btn-icon entry-del-btn" @click.stop="quickDeleteEntry(entry.uid)" title="快捷删除">🗑️</button>
            <button class="btn btn-icon" @click.stop="toggleExpand(entry.uid)" title="编辑">
              {{ expandedUid === entry.uid ? "▲" : "▼" }}
            </button>
          </div>

          <!-- 内联编辑器 -->
          <EntryEditor
            v-if="expandedUid === entry.uid"
            :entry="entry"
            @update="onEntryUpdate"
            @cancel="expandedUid = null"
          />
        </div>
      </template>
    </div>

    <!-- 撤销删除浮条（出现在列表底部） -->
    <div v-if="undoEntry" class="undo-bar">
      <span>已删「{{ undoEntry.entry.comment || 'UID ' + undoEntry.entry.uid }}」喵~ 🗑️</span>
      <button class="btn btn-sm" @click="undoDelete">↩ 撤销</button>
    </div>

    <!-- 底部操作栏 -->
    <div class="panel-footer">
      <!-- 手机端折叠切换按钮 -->
      <button class="footer-collapse-toggle" @click="footerExpanded = !footerExpanded">
        📋 操作菜单 {{ footerExpanded ? '▾' : '▸' }}
      </button>

      <div class="footer-collapsible" :class="{ collapsed: !footerExpanded }">
        <!-- 批量操作（有选中时显示） -->
        <BatchMenu
          v-if="selectedWorldbook"
          :worldbook-name="selectedWorldbook"
          :selected-uids="Array.from(selectedUids)"
          @done="onBatchDone"
          @error="onError"
          @clear-selection="selectedUids.clear()"
          @batch-delete="batchDelete"
          @refresh="loadWorldbook"
        />

        <!-- 智能选中行 -->
        <div v-if="selectedWorldbook" class="smart-select-row">
          <span class="smart-label">选中：</span>
          <button class="btn btn-sm" @click="selectByStrategy('constant')" title="选中所有常量条目">🔵常量</button>
          <button class="btn btn-sm" @click="selectByStrategy('selective')" title="选中所有绿灯条目">🟢绿灯</button>
          <button class="btn btn-sm" @click="selectByStrategy('vectorized')" title="选中所有向量化条目">🔗向量</button>
          <button class="btn btn-sm" @click="showSmartDialog = 'keyword'" title="按关键字批量选中">🔤关键字</button>
          <button class="btn btn-sm" @click="showSmartDialog = 'uid-range'" title="按UID区间批量选中">🆔区间</button>
        </div>

        <!-- 新建 & 复制操作行 -->
        <div class="panel-actions">
          <button class="btn btn-sm" @click="addEntry" :disabled="!selectedWorldbook">＋ 新建</button>
          <button class="btn btn-sm" @click="batchCreate" :disabled="!selectedWorldbook" title="批量创建多条空白条目">
            ＋＋ 批量新建
          </button>
          <button
            class="btn btn-sm"
            :disabled="selectedUids.size === 0 || !otherWorldbook"
            @click="emitCopyToOther"
            :title="otherWorldbook ? `复制到 ${otherWorldbook}` : '右侧面板未选择世界书'"
          >
            {{ side === 'left' ? '→ 复制到右侧' : '← 复制到左侧' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 智能选中弹窗 -->
    <div v-if="showSmartDialog" class="smart-dialog-overlay" @click.self="showSmartDialog = ''">
      <div class="smart-dialog">
        <!-- 按关键字选中 -->
        <template v-if="showSmartDialog === 'keyword'">
          <h4>🔤 按关键字批量选中</h4>
          <div style="display:flex;gap:6px;margin-bottom:10px">
            <input v-model="smartKeyword" class="editor-input" placeholder="输入关键字（包含即选中）" @keydown.enter="selectByKeyword" />
          </div>
          <div class="dialog-actions">
            <button class="btn btn-primary btn-sm" @click="selectByKeyword">✅ 选中匹配</button>
            <button class="btn btn-sm" @click="showSmartDialog = ''">取消</button>
          </div>
        </template>

        <!-- 按UID区间选中 -->
        <template v-if="showSmartDialog === 'uid-range'">
          <h4>🆔 按 UID 区间选中</h4>
          <div class="uid-range-inputs">
            <label class="uid-range-label">从 UID</label>
            <input v-model.number="smartUidFrom" type="number" class="editor-input uid-range-field" min="0" placeholder="起始" />
            <label class="uid-range-label">到</label>
            <input v-model.number="smartUidTo" type="number" class="editor-input uid-range-field" min="0" placeholder="结束" />
          </div>
          <div class="dialog-actions">
            <button class="btn btn-primary btn-sm" @click="selectByUidRange">✅ 选中区间</button>
            <button class="btn btn-sm" @click="showSmartDialog = ''">取消</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from "vue";
import EntryEditor from "./EntryEditor.vue";
import BatchMenu from "./BatchMenu.vue";
import type { RawEntry } from "../utils/worldbook";
import { strategyLabel, positionLabel, cloneEntries, createBlankEntry } from "../utils/worldbook";
import {
  getWorldbook, saveWorldbook, deleteEntries, addEntries,
  exportWorldbookUrl, syncWorldbookToST,
} from "../services/api";

const props = defineProps<{
  worldbooks: string[];
  otherWorldbook: string;
  side: "left" | "right";
}>();

const emit = defineEmits<{
  (e: "dirty", isDirty: boolean): void;
  (e: "status", message: string, type?: "success" | "error" | "info"): void;
  (e: "copy-to-other", uids: number[]): void;
}>();

// ─────── 状态 ───────
const selectedWorldbook = ref("");
const localEntries      = ref<RawEntry[]>([]);
const loading           = ref(false);
const searchQuery       = ref("");
const searchMode        = ref("all");
const selectedUids      = reactive(new Set<number>());
const expandedUid       = ref<number | null>(null);
const isDirty           = ref(false);
const listRef           = ref<HTMLElement | null>(null);
const lastClickedUid    = ref<number | null>(null);

// 智能选中弹窗
const showSmartDialog = ref("");
const smartKeyword    = ref("");
const smartUidFrom    = ref<number | null>(null);
const smartUidTo      = ref<number | null>(null);

// 快捷删除撤销
interface UndoEntry { entry: RawEntry; idx: number; timerId?: ReturnType<typeof setTimeout> }
const undoEntry = ref<UndoEntry | null>(null);

// 底部操作栏折叠（手机端默认收起，桌面端默认展开）
const footerExpanded = ref(
  typeof window !== "undefined" ? window.innerWidth > 768 : true
);

// 世界书列表搜索
const wbSearchQuery = ref("");

// ─────── 搜索模式定义 ───────
const searchModes = [
  { id: "all",     label: "全部" },
  { id: "title",   label: "标题" },
  { id: "keyword", label: "关键字" },
  { id: "content", label: "内容" },
];

const searchPlaceholder = computed(() => {
  const m: Record<string, string> = {
    all:     "搜索标题、关键字、内容...",
    title:   "搜索条目标题...",
    keyword: "搜索主要/次要关键字...",
    content: "搜索条目正文内容...",
  };
  return m[searchMode.value] ?? "搜索...";
});

// ─────── 计算属性 ───────
const exportUrl = computed(() =>
  selectedWorldbook.value ? exportWorldbookUrl(selectedWorldbook.value) : "#"
);

// 世界书列表：根据搜索词过滤
const filteredWorldbookList = computed(() => {
  const q = wbSearchQuery.value.toLowerCase().trim();
  if (!q) return props.worldbooks;
  return props.worldbooks.filter((n) => n.toLowerCase().includes(q));
});

const filteredEntries = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return localEntries.value;
  const mode = searchMode.value;
  return localEntries.value.filter((e) => {
    if (mode === "title"   || mode === "all") {
      if ((e.comment || "").toLowerCase().includes(q)) return true;
    }
    if (mode === "keyword" || mode === "all") {
      if (e.key.some((k) => k.toLowerCase().includes(q))) return true;
      if ((e.keysecondary || []).some((k: string) => k.toLowerCase().includes(q))) return true;
    }
    if (mode === "content" || mode === "all") {
      if ((e.content || "").toLowerCase().includes(q)) return true;
    }
    return false;
  });
});

const allSelected  = computed(
  () => filteredEntries.value.length > 0 && filteredEntries.value.every((e) => selectedUids.has(e.uid))
);
const someSelected = computed(() => filteredEntries.value.some((e) => selectedUids.has(e.uid)));

// ─────── 加载世界书 ───────
async function loadWorldbook() {
  if (!selectedWorldbook.value) {
    localEntries.value = [];
    return;
  }
  loading.value = true;
  selectedUids.clear();
  expandedUid.value = null;
  try {
    const res = await getWorldbook(selectedWorldbook.value);
    if (res.success && res.data) {
      localEntries.value = cloneEntries(res.data.entries);
      isDirty.value = false;
      emit("dirty", false);
      emit("status", `喵~"${selectedWorldbook.value}"加载好了！共 ${localEntries.value.length} 条条目~ 📖`, "success");
    } else {
      emit("status", `呜喵加载失败了：${res.message} 😿`, "error");
    }
  } catch (e) {
    emit("status", `呜喵加载失败了：${(e as Error).message} 😿`, "error");
  }
  loading.value = false;
}

// ─────── 保存（供 App.vue 调用） ───────
async function save(): Promise<boolean> {
  if (!selectedWorldbook.value || !isDirty.value) return false;

  // ── UID 重复检查 ──
  const uids    = localEntries.value.map((e) => e.uid);
  const dupUids = [...new Set(uids.filter((uid, i) => uids.indexOf(uid) !== i))];
  if (dupUids.length > 0) {
    const fix = window.confirm(
      `呜喵！发现重复的UID了：${dupUids.join(", ")}，要帮忙自动修正嘛？🐱\n（选「取消」则返回手动修改）`
    );
    if (!fix) {
      emit("status", `好哒，主人自己修正喵~ 请检查重复UID：${dupUids.join(", ")} 🐱`, "error");
      return false;
    }
    const seen = new Set<number>();
    let maxUid = Math.max(...uids, 0);
    for (const e of localEntries.value) {
      if (seen.has(e.uid)) {
        maxUid++;
        e.uid          = maxUid;
        e.displayIndex = maxUid;
      }
      seen.add(e.uid);
    }
  }

  // ── 写入磁盘 ──
  const res = await saveWorldbook(selectedWorldbook.value, localEntries.value);
  if (!res.success) {
    emit("status", `呜呜保存失败了喵：${res.message}，再试一次嘛？ 😿`, "error");
    return false;
  }

  isDirty.value = false;
  emit("dirty", false);

  // ── 同步到 ST 内存 ──
  const synced = await syncWorldbookToST(selectedWorldbook.value, localEntries.value);
  const msg = synced
    ? `喵~保存成功啦！已同步到酒馆喵~ ✨（"${selectedWorldbook.value}"，${localEntries.value.length} 条）`
    : `文件已保存喵，不过 ST 同步出了点问题...手动刷新世界书嘛？ 🔄`;
  emit("status", msg, synced ? "success" : "info");
  return true;
}

// ─────── 选择逻辑 ───────
function toggleSelect(uid: number) {
  selectedUids.has(uid) ? selectedUids.delete(uid) : selectedUids.add(uid);
  lastClickedUid.value = uid;
}

function handleRowClick(uid: number, event: MouseEvent | Event) {
  const me = event as MouseEvent;
  if (me.shiftKey && lastClickedUid.value !== null) {
    const list    = filteredEntries.value;
    const fromIdx = list.findIndex((e) => e.uid === lastClickedUid.value);
    const toIdx   = list.findIndex((e) => e.uid === uid);
    if (fromIdx !== -1 && toIdx !== -1) {
      const start        = Math.min(fromIdx, toIdx);
      const end          = Math.max(fromIdx, toIdx);
      const shouldSelect = !selectedUids.has(uid);
      for (let i = start; i <= end; i++) {
        if (shouldSelect) selectedUids.add(list[i].uid);
        else              selectedUids.delete(list[i].uid);
      }
      lastClickedUid.value = uid;
      return;
    }
  }
  toggleSelect(uid);
}

function toggleAll() {
  if (allSelected.value) filteredEntries.value.forEach((e) => selectedUids.delete(e.uid));
  else                   filteredEntries.value.forEach((e) => selectedUids.add(e.uid));
}

// ─────── 智能选中 ───────
function selectByStrategy(type: "constant" | "selective" | "vectorized") {
  selectedUids.clear();
  localEntries.value.forEach((e) => {
    const match =
      (type === "constant"   &&  e.constant)   ||
      (type === "selective"  &&  e.selective && !e.constant) ||
      (type === "vectorized" &&  e.vectorized);
    if (match) selectedUids.add(e.uid);
  });
  const n = selectedUids.size;
  emit("status", `喵~已选中 ${n} 条${type === "constant" ? "常量" : type === "selective" ? "绿灯" : "向量化"}条目~ ✅`, "info");
}

function selectByKeyword() {
  const q = smartKeyword.value.toLowerCase().trim();
  if (!q) return;
  selectedUids.clear();
  localEntries.value.forEach((e) => {
    const inKey  = e.key.some((k) => k.toLowerCase().includes(q));
    const inKey2 = (e.keysecondary || []).some((k: string) => k.toLowerCase().includes(q));
    const inTitle = (e.comment || "").toLowerCase().includes(q);
    if (inKey || inKey2 || inTitle) selectedUids.add(e.uid);
  });
  const n = selectedUids.size;
  if (n === 0) emit("status", `找不到包含"${smartKeyword.value}"的条目呢喵~ 🔍`, "info");
  else         emit("status", `喵~已选中 ${n} 条包含"${smartKeyword.value}"的条目~ ✅`, "info");
  showSmartDialog.value = "";
  smartKeyword.value    = "";
}

function selectByUidRange() {
  const from = smartUidFrom.value;
  const to   = smartUidTo.value;
  if (from === null || to === null || isNaN(from) || isNaN(to)) return;
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  selectedUids.clear();
  localEntries.value.forEach((e) => {
    if (e.uid >= lo && e.uid <= hi) selectedUids.add(e.uid);
  });
  const n = selectedUids.size;
  emit("status", `喵~已选中 UID ${lo}~${hi} 范围内的 ${n} 条条目~ ✅`, "info");
  showSmartDialog.value = "";
  smartUidFrom.value    = null;
  smartUidTo.value      = null;
}

// ─────── 展开编辑 ───────
function toggleExpand(uid: number) {
  expandedUid.value = expandedUid.value === uid ? null : uid;
}

function onEntryUpdate(updated: RawEntry) {
  const originalUid = expandedUid.value;
  const idx = localEntries.value.findIndex((e) => e.uid === originalUid);
  if (idx !== -1) {
    localEntries.value[idx] = updated;
    markDirty();
  }
  expandedUid.value = null;
}

// ─────── 新建条目 ───────
function addEntry() {
  const maxUid = localEntries.value.reduce((m, e) => Math.max(m, e.uid), -1);
  const newEntry = createBlankEntry(maxUid + 1);
  localEntries.value.push(newEntry);
  expandedUid.value = newEntry.uid;
  markDirty();
  emit("status", "新条目创建好啦喵！快去编辑后点击应用吧~ ✏️", "info");
}

// ─────── 批量新建 ───────
async function batchCreate() {
  const input = window.prompt("要创建几条空白条目呢喵？（1-100）~ 🐾", "5");
  if (input === null) return;
  const count     = Math.max(1, Math.min(100, parseInt(input, 10) || 1));
  const overrides = Array.from({ length: count }, () => ({}));
  const res       = await addEntries(selectedWorldbook.value, overrides);
  if (res.success && res.data) {
    await loadWorldbook();
    markDirty();
    emit("status", `喵~已创建 ${count} 条空白条目啦！记得保存哦~ ✨`, "success");
  } else {
    emit("status", `呜喵批量创建失败了：${res.message} 😿`, "error");
  }
}

// ─────── 快捷删除（单条 + 5秒撤销） ───────
function quickDeleteEntry(uid: number) {
  const idx = localEntries.value.findIndex((e) => e.uid === uid);
  if (idx === -1) return;
  // 清除上一个未撤销的条目（直接确认删除）
  if (undoEntry.value) clearTimeout(undoEntry.value.timerId);
  const removed = localEntries.value.splice(idx, 1)[0];
  if (expandedUid.value === uid) expandedUid.value = null;
  selectedUids.delete(uid);
  markDirty();
  const timerId = setTimeout(() => { undoEntry.value = null; }, 5000);
  undoEntry.value = { entry: removed, idx: Math.min(idx, localEntries.value.length), timerId };
  emit("status", `已删「${removed.comment || "UID " + removed.uid}」喵~ 🗑️ 5秒内可撤销哦`, "info");
}

function undoDelete() {
  if (!undoEntry.value) return;
  clearTimeout(undoEntry.value.timerId);
  const { entry, idx } = undoEntry.value;
  localEntries.value.splice(idx, 0, entry);
  undoEntry.value = null;
  emit("status", `已帮主人撤销删除「${entry.comment || "UID " + entry.uid}」喵~ ↩`, "success");
}

// ─────── 批量删除 ───────
async function batchDelete() {
  if (selectedUids.size === 0) return;
  const uids = Array.from(selectedUids);
  if (!confirm(`真的要帮主人删掉 ${uids.length} 个条目嘛？删了就找不回来了喵~ 🗑️`)) return;
  localEntries.value = localEntries.value.filter((e) => !selectedUids.has(e.uid));
  selectedUids.clear();
  markDirty();
  emit("status", `已经帮主人删掉了 ${uids.length} 个条目喵~ 🗑️（记得保存哦）`, "info");
}

// ─────── 复制到对侧 ───────
function emitCopyToOther() {
  emit("copy-to-other", Array.from(selectedUids));
}

async function receiveCopy(sourceWorldbook: string, uids: number[]) {
  if (!selectedWorldbook.value) {
    emit("status", "呜喵，要先在这里选择目标世界书嘛！ 📚", "error");
    return;
  }
  if (!sourceWorldbook || uids.length === 0) return;
  const res = await getWorldbook(sourceWorldbook);
  if (!res.success || !res.data) {
    emit("status", `呜喵，获取源世界书失败了：${res.message} 😿`, "error");
    return;
  }
  const toCopy    = res.data.entries.filter((e: RawEntry) => uids.includes(e.uid));
  const maxUid    = localEntries.value.reduce((m, e) => Math.max(m, e.uid), -1);
  const newEntries = toCopy.map((e: RawEntry, i: number) => ({
    ...e,
    uid:          maxUid + 1 + i,
    displayIndex: localEntries.value.length + i,
  }));
  localEntries.value.push(...newEntries);
  markDirty();
  emit("status", `复制完成喵！从"${sourceWorldbook}"搬来了 ${newEntries.length} 个条目~ 📋（记得保存哦）`, "success");
}

// ─────── 批量操作回调 ───────
async function onBatchDone(message: string) {
  await loadWorldbook();
  if (selectedWorldbook.value) {
    await syncWorldbookToST(selectedWorldbook.value, localEntries.value);
  }
  emit("status", message, "success");
}

function onError(message: string) {
  emit("status", message, "error");
}

// ─────── 脏标记 ───────
function markDirty() {
  isDirty.value = true;
  emit("dirty", true);
}

// ─────── 工具函数 ───────
function strategyClass(entry: RawEntry) {
  if (entry.constant)  return "const";
  if (entry.selective) return "select";
  return "vec";
}

function strategyShort(entry: RawEntry) {
  if (entry.constant)  return "🔵";
  if (entry.selective) return "🟢";
  return "🔗";
}

function positionShort(entry: RawEntry) {
  const map: Record<number, string> = { 0: "BC", 1: "AC", 2: "BE", 3: "AE", 4: "@D", 5: "BN", 6: "AN" };
  return map[entry.position] ?? "?";
}

defineExpose({ save, receiveCopy, selectedWorldbook });
</script>
