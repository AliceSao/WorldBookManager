<template>
  <div class="panel">
    <!-- 面板头部（紧凑：当前书名 + 状态 + 菜单） -->
    <div class="panel-header">
      <button class="wb-toggle-btn" @click="wbSelectorOpen = !wbSelectorOpen">
        📖 {{ selectedWorldbook || '选择世界书' }}
        <span class="wb-toggle-arrow">{{ wbSelectorOpen ? '▾' : '▸' }}</span>
      </button>
      <span v-if="isDirty" class="dirty-badge" title="有未保存的修改">●</span>
      <button v-if="canUndo()" class="btn btn-sm btn-icon" @click="undoHistory" title="回退">↩</button>
      <span class="entry-count" v-if="selectedWorldbook">{{ filteredEntries.length }}/{{ localEntries.length }}</span>
      <div v-if="selectedWorldbook" class="wb-menu-wrap">
        <button class="btn btn-sm btn-icon" @click="wbMenuOpen = !wbMenuOpen" title="操作">⋯</button>
        <div v-if="wbMenuOpen" class="wb-menu" @click.stop>
          <a :href="exportUrl" :download="`${selectedWorldbook}.json`" class="wb-menu-item" @click="wbMenuOpen = false">📤 导出</a>
          <button class="wb-menu-item" @click="wbMenuOpen = false; renameWorldbook()">✏️ 重命名</button>
          <button class="wb-menu-item wb-menu-danger" @click="wbMenuOpen = false; confirmDeleteWorldbook()">🗑️ 删除</button>
        </div>
      </div>
    </div>

    <!-- 世界书选择器（可折叠） -->
    <div v-show="wbSelectorOpen" class="wb-selector-panel">
      <div class="wb-search-row" v-if="worldbooks.length > 6">
        <input v-model="wbSearchQuery" class="search-input wb-search-input" placeholder="🔍 搜索世界书..." />
        <button v-if="wbSearchQuery" class="btn btn-sm btn-icon" @click="wbSearchQuery = ''" title="清空">✕</button>
      </div>
      <div class="wb-select-row">
        <select v-model="selectedWorldbook" class="wb-select" @change="wbSelectorOpen = false; loadWorldbook()">
          <option value="">— 选择世界书 —</option>
          <option v-if="filteredWorldbookList.length === 0 && wbSearchQuery" disabled value="">未找到</option>
          <option v-for="wb in filteredWorldbookList" :key="wb" :value="wb">{{ wb }}</option>
        </select>
        <button class="btn btn-sm btn-icon wb-new-btn" @click="openCreateDialog" title="新建世界书">＋</button>
      </div>
    </div>

    <!-- 搜索栏（可折叠） -->
    <div class="panel-search">
      <button class="search-collapse-btn" @click="searchExpanded = !searchExpanded">
        🔍 搜索与排序 {{ searchExpanded ? '▾' : '▸' }}
      </button>
      <div v-show="searchExpanded" class="search-collapsible">
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
      <div class="sort-row">
        <label class="sort-label">排序：</label>
        <select v-model="sortMode" class="sort-select" @change="applySortMode">
          <option value="priority">优先级（Order）</option>
          <option value="custom">自定义（DisplayIndex）</option>
          <option value="name-asc">标题 A→Z</option>
          <option value="name-desc">标题 Z→A</option>
          <option value="token">Token（内容长度）</option>
          <option value="depth">深度</option>
          <option value="order-asc">Order ↑</option>
          <option value="order-desc">Order ↓</option>
          <option value="uid-asc">UID ↑</option>
          <option value="uid-desc">UID ↓</option>
          <option value="strategy">策略分组</option>
        </select>
      </div>
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
            <button class="btn btn-icon entry-move-btn" @click.stop="moveEntry(entry.uid, -1)" title="上移">⬆</button>
            <button class="btn btn-icon entry-move-btn" @click.stop="moveEntry(entry.uid, 1)" title="下移">⬇</button>
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

        <!-- 创建组 -->
        <div class="action-group">
          <span class="action-group-label">创建</span>
          <button class="btn btn-sm" @click="addEntry" :disabled="!selectedWorldbook">＋ 新建</button>
          <button class="btn btn-sm" @click="openBatchCreate" :disabled="!selectedWorldbook">＋＋ 批量</button>
          <button class="btn btn-sm" @click="duplicateSelected" :disabled="selectedUids.size === 0">📋 复制</button>
          <button class="btn btn-sm" :disabled="selectedUids.size === 0 || !otherWorldbook" @click="emitCopyToOther">
            {{ side === 'left' ? '→右' : '←左' }}
          </button>
        </div>

        <!-- 选中组 -->
        <div class="action-group">
          <span class="action-group-label">选中</span>
          <button class="btn btn-sm" @click="selectByStrategy('constant')">🔵</button>
          <button class="btn btn-sm" @click="selectByStrategy('selective')">🟢</button>
          <button class="btn btn-sm" @click="selectByStrategy('vectorized')">🔗</button>
          <button class="btn btn-sm" @click="showSmartDialog = 'keyword'">🔤</button>
          <button class="btn btn-sm" @click="showSmartDialog = 'uid-range'">🆔</button>
        </div>

        <!-- 移动组 -->
        <div v-if="selectedUids.size > 0" class="action-group">
          <span class="action-group-label">移动</span>
          <button class="btn btn-sm" @click="openMoveDialog('up')">⬆ 上移</button>
          <button class="btn btn-sm" @click="openMoveDialog('down')">⬇ 下移</button>
        </div>
      </div>
    </div>

    <!-- 新建世界书弹窗 -->
    <div v-if="showCreateDialog" class="smart-dialog-overlay" @click.self="cancelCreate">
      <div class="smart-dialog">
        <h4>📖 新建世界书</h4>
        <div style="display:flex;gap:6px;margin-bottom:10px">
          <input
            v-model="newWbName"
            class="editor-input"
            placeholder="输入世界书名称..."
            maxlength="100"
            @keydown.enter="doCreateWorldbook"
            @keydown.esc="cancelCreate"
            ref="newWbInputRef"
          />
        </div>
        <div class="dialog-actions">
          <button class="btn btn-primary btn-sm" @click="doCreateWorldbook" :disabled="!newWbName.trim() || creating">
            {{ creating ? '⏳ 创建中...' : '✅ 创建' }}
          </button>
          <button class="btn btn-sm" @click="cancelCreate">取消</button>
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

    <!-- 批量创建弹窗 -->
    <div v-if="showBatchCreateDialog" class="smart-dialog-overlay" @click.self="showBatchCreateDialog = false">
      <div class="smart-dialog">
        <h4>＋＋ 批量创建条目</h4>
        <div class="editor-row">
          <label class="editor-label">数量</label>
          <input v-model.number="batchCreateCount" type="number" class="editor-input narrow" min="1" max="100" />
        </div>
        <div class="editor-row">
          <label class="editor-label">策略</label>
          <select v-model="batchCreateStrategy" class="editor-select">
            <option value="constant">🔵 常量</option>
            <option value="selective">🟢 可选</option>
            <option value="vectorized">🔗 向量化</option>
          </select>
        </div>
        <div class="editor-row">
          <label class="editor-label">Order</label>
          <input v-model.number="batchCreateOrder" type="number" class="editor-input narrow" />
        </div>
        <div class="editor-row">
          <label class="editor-label">位置</label>
          <select v-model.number="batchCreatePosition" class="editor-select">
            <option :value="0">角色定义之前</option>
            <option :value="1">角色定义之后</option>
            <option :value="2">示例消息之前</option>
            <option :value="3">示例消息之后</option>
            <option :value="4">固定深度</option>
            <option :value="5">作者注释之前</option>
            <option :value="6">作者注释之后</option>
          </select>
        </div>
        <div class="editor-row">
          <label class="editor-label">关键字</label>
          <input v-model="batchCreateKeys" class="editor-input" placeholder="逗号分隔，如：关键字1,关键字2" />
        </div>
        <div class="dialog-actions">
          <button class="btn btn-primary btn-sm" @click="doBatchCreate">✅ 创建</button>
          <button class="btn btn-sm" @click="showBatchCreateDialog = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 批量移动弹窗 -->
    <div v-if="showMoveDialog" class="smart-dialog-overlay" @click.self="showMoveDialog = false">
      <div class="smart-dialog">
        <h4>{{ moveDirection === 'up' ? '⬆ 批量上移' : '⬇ 批量下移' }}</h4>
        <p style="font-size:12px;color:var(--text-muted)">已选 {{ selectedUids.size }} 条条目</p>
        <div class="editor-row">
          <label class="editor-label">移动步数</label>
          <input v-model.number="moveSteps" type="number" class="editor-input narrow" min="1" max="9999" />
        </div>
        <div class="dialog-actions">
          <button class="btn btn-primary btn-sm" @click="doBatchMove">✅ 移动</button>
          <button class="btn btn-sm" @click="showMoveDialog = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, nextTick, onMounted, onUnmounted } from "vue";
import EntryEditor from "./EntryEditor.vue";
import BatchMenu from "./BatchMenu.vue";
import type { RawEntry } from "../utils/worldbook";
import { strategyLabel, positionLabel, cloneEntries, createBlankEntry } from "../utils/worldbook";
import {
  getWorldbook, saveWorldbook, deleteEntries, addEntries,
  exportWorldbookUrl, syncWorldbookToST, createWorldbook,
  onWorldbookUpdate, offWorldbookUpdate,
  type SseCallback,
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
  (e: "refresh-worldbooks"): void;
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

// 搜索栏折叠
const searchExpanded = ref(typeof window !== "undefined" ? window.innerWidth > 768 : true);

// 世界书选择器折叠
const wbSelectorOpen = ref(false);

// 世界书操作菜单
const wbMenuOpen = ref(false);
function closeWbMenuOnOutside(ev: MouseEvent) {
  const target = ev.target as HTMLElement;
  if (!target.closest(".wb-menu-wrap")) wbMenuOpen.value = false;
}
onMounted(() => document.addEventListener("click", closeWbMenuOnOutside));
onUnmounted(() => document.removeEventListener("click", closeWbMenuOnOutside));

// 批量创建弹窗
const showBatchCreateDialog = ref(false);
const batchCreateCount = ref(5);
const batchCreateStrategy = ref("selective");
const batchCreateOrder = ref(100);
const batchCreatePosition = ref(0);
const batchCreateKeys = ref("");
const batchCreateConstant = ref(false);

// 批量移动弹窗
const showMoveDialog = ref(false);
const moveDirection = ref<"up" | "down">("up");
const moveSteps = ref(1);

// 智能选中弹窗
const showSmartDialog = ref("");
const smartKeyword    = ref("");
const smartUidFrom    = ref<number | null>(null);
const smartUidTo      = ref<number | null>(null);

// 快捷删除撤销
interface UndoEntry { entry: RawEntry; idx: number; timerId?: ReturnType<typeof setTimeout> }
const undoEntry = ref<UndoEntry | null>(null);

// ─────── 排序 ───────
const sortMode = ref("uid-asc");

function applySortMode() {
  const mode = sortMode.value;
  localEntries.value.sort((a, b) => {
    switch (mode) {
      case "priority": return a.order - b.order || a.uid - b.uid;
      case "custom": return a.displayIndex - b.displayIndex;
      case "name-asc": return (a.comment || "").localeCompare(b.comment || "");
      case "name-desc": return (b.comment || "").localeCompare(a.comment || "");
      case "token": return (b.content || "").length - (a.content || "").length;
      case "depth": return (a.depth ?? 0) - (b.depth ?? 0) || a.uid - b.uid;
      case "order-asc": return a.order - b.order;
      case "order-desc": return b.order - a.order;
      case "uid-asc": return a.uid - b.uid;
      case "uid-desc": return b.uid - a.uid;
      case "strategy": {
        const rank = (e: RawEntry) => e.constant ? 0 : e.selective ? 1 : 2;
        return rank(a) - rank(b) || a.uid - b.uid;
      }
      default: return 0;
    }
  });
}

// ─────── 历史回退栈（每个世界书独立，最多10步） ───────
const historyMap = reactive(new Map<string, RawEntry[][]>());
const MAX_HISTORY = 10;

function pushHistory() {
  if (!selectedWorldbook.value || localEntries.value.length === 0) return;
  const key = selectedWorldbook.value;
  if (!historyMap.has(key)) historyMap.set(key, []);
  const stack = historyMap.get(key)!;
  stack.push(cloneEntries(localEntries.value));
  if (stack.length > MAX_HISTORY) stack.shift();
}

function canUndo(): boolean {
  const stack = historyMap.get(selectedWorldbook.value);
  return !!stack && stack.length > 0;
}

function undoHistory() {
  const stack = historyMap.get(selectedWorldbook.value);
  if (!stack || stack.length === 0) return;
  const prev = stack.pop()!;
  localEntries.value = prev;
  markDirty();
  emit("status", `已回退到上一步喵~ ↩（还剩 ${stack.length} 步历史）`, "info");
}

// 底部操作栏折叠（手机端默认收起，桌面端默认展开）
const footerExpanded = ref(
  typeof window !== "undefined" ? window.innerWidth > 768 : true
);

// 世界书列表搜索
const wbSearchQuery = ref("");

// 新建世界书弹窗
const showCreateDialog = ref(false);
const newWbName        = ref("");
const creating         = ref(false);
const newWbInputRef    = ref<HTMLInputElement | null>(null);

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
  // 切换前检查：如果有未保存的修改，弹窗提示
  if (isDirty.value) {
    const prev = localEntries.value.length > 0 ? selectedWorldbook.value : "";
    const action = window.confirm(
      "当前有未保存的修改，是否放弃修改并切换？\n点击「确定」放弃修改，点击「取消」留在当前页面。"
    );
    if (!action) {
      // 恢复 select 值（v-model 已经变了，需要回退）
      const target = selectedWorldbook.value;
      selectedWorldbook.value = "";
      nextTick(() => { selectedWorldbook.value = prev || target; });
      return;
    }
    isDirty.value = false;
    emit("dirty", false);
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

// ─────── SSE 实时同步：后端变更时自动刷新 ───────
// 标记：自己触发的写入不要重复响应（防止自反馈循环）
let _skipNextSse = false;

const sseHandler: SseCallback = async (data) => {
  if (!data.name) return;
  // 跳过自己触发的写入
  if (_skipNextSse) { _skipNextSse = false; return; }
  // 仅当当前面板正在查看被更新的世界书且无未保存修改时才刷新
  if (data.name === selectedWorldbook.value && !isDirty.value) {
    await loadWorldbook();
  }
};

onMounted(() => {
  onWorldbookUpdate(sseHandler);
});

onUnmounted(() => {
  offWorldbookUpdate(sseHandler);
});

// ─────── 新建世界书 ───────
function openCreateDialog() {
  newWbName.value = "";
  showCreateDialog.value = true;
  nextTick(() => newWbInputRef.value?.focus());
}

function cancelCreate() {
  showCreateDialog.value = false;
  newWbName.value = "";
}

async function doCreateWorldbook() {
  const name = newWbName.value.trim();
  if (!name || creating.value) return;
  creating.value = true;
  try {
    const res = await createWorldbook(name);
    if (!res.success) {
      emit("status", `呜喵新建失败：${res.message} 😿`, "error");
      creating.value = false;
      return;
    }
    showCreateDialog.value = false;
    newWbName.value = "";
    // 通知 App.vue 刷新世界书列表
    emit("refresh-worldbooks");
    // 尝试同步到 ST 运行时内存（新建后立即通知）
    await syncWorldbookToST(name, []);
    // 刷新完成后自动选中新建的世界书
    await nextTick();
    selectedWorldbook.value = name;
    await loadWorldbook();
    emit(
      "status",
      res.data?.created
        ? `喵~已新建世界书「${name}」~ 📖`
        : `喵~已覆盖世界书「${name}」~ 📖`,
      "success"
    );
  } catch (e) {
    emit("status", `呜喵新建出错了：${(e as Error).message} 😿`, "error");
  }
  creating.value = false;
}

// ─────── 世界书重命名 ───────
async function renameWorldbook() {
  const oldName = selectedWorldbook.value;
  if (!oldName) return;
  const newName = window.prompt(`将「${oldName}」重命名为：`, oldName);
  if (!newName || newName.trim() === oldName) return;
  try {
    // 复制到新名称 → 删除旧的
    const res = await getWorldbook(oldName);
    if (!res.success || !res.data) { emit("status", "读取世界书失败", "error"); return; }
    const createRes = await createWorldbook(newName.trim(), res.data.entries);
    if (!createRes.success) { emit("status", `创建失败：${createRes.message}`, "error"); return; }
    const { deleteWorldbook: delWb } = await import("../services/api");
    await delWb(oldName);
    // 同步两个到 ST 内存
    await syncWorldbookToST(newName.trim(), res.data.entries);
    emit("refresh-worldbooks");
    await nextTick();
    selectedWorldbook.value = newName.trim();
    await loadWorldbook();
    emit("status", `已重命名「${oldName}」→「${newName.trim()}」`, "success");
  } catch (e) { emit("status", `重命名失败：${(e as Error).message}`, "error"); }
}

// ─────── 删除世界书 ───────
async function confirmDeleteWorldbook() {
  const name = selectedWorldbook.value;
  if (!name) return;
  if (!window.confirm(`确定要删除世界书「${name}」吗？此操作无法撤销！`)) return;
  try {
    const { deleteWorldbook: delWb } = await import("../services/api");
    const res = await delWb(name);
    if (res.success) {
      selectedWorldbook.value = "";
      localEntries.value = [];
      isDirty.value = false;
      emit("dirty", false);
      emit("refresh-worldbooks");
      emit("status", `已删除世界书「${name}」`, "success");
    } else {
      emit("status", `删除失败：${res.message}`, "error");
    }
  } catch (e) { emit("status", `删除失败：${(e as Error).message}`, "error"); }
}

// ─────── 保存（供 App.vue 调用） ───────
async function save(): Promise<boolean> {
  if (!selectedWorldbook.value || !isDirty.value) return false;

  // ── 保存前推入历史栈（用于回退） ──
  pushHistory();

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
  _skipNextSse = true; // 跳过本次写入触发的 SSE

  // ── 同步到 ST 内存（带重试） ──
  let synced = await syncWorldbookToST(selectedWorldbook.value, localEntries.value);
  if (!synced) {
    // 重试一次（CSRF token 可能过期，resetCsrfToken 后重试）
    synced = await syncWorldbookToST(selectedWorldbook.value, localEntries.value);
  }
  emit(
    "status",
    `保存成功（"${selectedWorldbook.value}"，${localEntries.value.length} 条）`,
    "success"
  );
  // 通知父窗口（index.js）本次会话有过保存操作
  try { window.parent.postMessage("wbm-saved", "*"); } catch { /* iframe 安全限制 */ }
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

// ─────── 复制选中条目 ───────
function duplicateSelected() {
  if (selectedUids.size === 0) return;
  const toDup = localEntries.value.filter((e) => selectedUids.has(e.uid));
  let maxUid = localEntries.value.reduce((m, e) => Math.max(m, e.uid), -1);
  const copies = toDup.map((e) => ({
    ...JSON.parse(JSON.stringify(e)),
    uid: ++maxUid,
    displayIndex: maxUid,
    comment: e.comment ? `${e.comment} (副本)` : `UID ${e.uid} 副本`,
  }));
  localEntries.value.push(...copies);
  markDirty();
  emit("status", `已复制 ${copies.length} 条条目`, "success");
}

// ─────── 批量新建 ───────
function openBatchCreate() {
  batchCreateCount.value = 5;
  batchCreateStrategy.value = "selective";
  batchCreateOrder.value = 100;
  batchCreatePosition.value = 0;
  batchCreateKeys.value = "";
  showBatchCreateDialog.value = true;
}

async function doBatchCreate() {
  const count = Math.max(1, Math.min(100, batchCreateCount.value || 1));
  const s = batchCreateStrategy.value;
  const keys = batchCreateKeys.value.split(",").map(k => k.trim()).filter(Boolean);
  const template: Partial<RawEntry> = {
    constant: s === "constant",
    selective: s === "selective",
    vectorized: s === "vectorized",
    order: batchCreateOrder.value,
    position: batchCreatePosition.value as 0|1|2|3|4|5|6,
    key: keys,
  };
  showBatchCreateDialog.value = false;
  const overrides = Array.from({ length: count }, () => ({ ...template }));
  const res = await addEntries(selectedWorldbook.value, overrides);
  if (res.success && res.data) {
    await loadWorldbook();
    await syncWorldbookToST(selectedWorldbook.value, localEntries.value);
    emit("status", `已创建 ${count} 条条目`, "success");
  } else {
    emit("status", `批量创建失败：${res.message}`, "error");
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

// ─────── 条目上移/下移 ───────
function moveEntry(uid: number, direction: number) {
  const idx = localEntries.value.findIndex((e) => e.uid === uid);
  if (idx === -1) return;
  const newIdx = Math.max(0, Math.min(localEntries.value.length - 1, idx + direction));
  if (newIdx === idx) return;
  const [entry] = localEntries.value.splice(idx, 1);
  localEntries.value.splice(newIdx, 0, entry);
  markDirty();
}

function openMoveDialog(dir: "up" | "down") {
  if (selectedUids.size === 0) return;
  moveDirection.value = dir;
  moveSteps.value = 1;
  showMoveDialog.value = true;
}

function doBatchMove() {
  const steps = Math.max(1, moveSteps.value || 1);
  showMoveDialog.value = false;
  const all = localEntries.value;
  const selSet = new Set(selectedUids);
  // 提取选中和未选中
  const selected: RawEntry[] = [];
  const rest: RawEntry[] = [];
  const selPositions: number[] = [];
  all.forEach((e, i) => {
    if (selSet.has(e.uid)) { selected.push(e); selPositions.push(i); }
    else rest.push(e);
  });
  if (selected.length === 0) return;
  // 计算新的插入位置（基于第一个/最后一个选中项）
  const anchorIdx = moveDirection.value === "up"
    ? Math.max(0, selPositions[0] - steps)
    : Math.min(all.length - selected.length, selPositions[selPositions.length - 1] - selected.length + 1 + steps);
  // 重建数组：在 rest 的 anchorIdx 位置插入 selected
  rest.splice(anchorIdx, 0, ...selected);
  localEntries.value = rest;
  markDirty();
  emit("status", `已${moveDirection.value === "up" ? "上" : "下"}移 ${selected.length} 条条目 ${steps} 步`, "success");
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
  if (!isDirty.value) {
    // 首次标脏时保存一个干净快照，用于回退
    pushHistory();
  }
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

defineExpose({ save, receiveCopy, selectedWorldbook, canUndo, undoHistory });
</script>
