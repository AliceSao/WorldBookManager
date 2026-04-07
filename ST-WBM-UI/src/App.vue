<template>
  <div class="wbm-app">
    <!-- Toast 通知层 -->
    <div class="wbm-toasts">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="wbm-toast"
        :class="[`toast-${t.type}`, { 'toast-paused': t.paused }]"
        @click="clickToast(t.id)"
      >
        <span class="toast-icon">{{ t.paused ? '📌' : t.icon }}</span>
        <span class="toast-msg">{{ t.msg }}</span>
        <span v-if="t.paused" class="toast-pin-hint">再点关闭</span>
      </div>
    </div>

    <!-- 导航栏 -->
    <nav class="wbm-nav">
      <span class="wbm-title">📖 世界书管理器 <span class="wbm-version">v1.0</span></span>
      <div class="wbm-nav-actions">
        <button class="btn btn-primary" :disabled="!anyDirty || saving" @click="saveAll">
          {{ saving ? '⏳' : '💾' }}<span class="btn-label">{{ saving ? ' 保存中...' : ' 保存' }}</span>
        </button>
        <button class="btn" @click="triggerImport" title="从本地 JSON 文件导入世界书">📥<span class="btn-label"> 导入</span></button>
        <button class="btn" @click="refreshWorldbooks">🔄<span class="btn-label"> 刷新</span></button>
        <!-- 主题切换器 -->
        <div class="theme-picker-wrap" ref="themePickerRef">
          <button class="btn" @click="toggleThemePicker" title="切换主题">🎨</button>
          <div v-if="showThemePicker" class="theme-picker-dropdown">
            <button
              v-for="t in themes"
              :key="t.id"
              class="theme-option"
              :class="{ active: activeTheme === t.id }"
              @click="setTheme(t.id)"
            >
              <span class="theme-dot" :style="{ background: t.color }"></span>
              {{ t.label }}
            </button>
          </div>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          style="display:none"
          @change="importFromFile"
        />
      </div>
    </nav>

    <!-- 移动端标签栏（仅小屏显示） -->
    <div class="wbm-mobile-tabs">
      <button
        class="mobile-tab-btn"
        :class="{ active: mobileSide === 'left' }"
        @click="mobileSide = 'left'"
      >
        📖 {{ leftPanelRef?.selectedWorldbook || '左面板' }}
      </button>
      <button
        class="mobile-tab-btn"
        :class="{ active: mobileSide === 'right' }"
        @click="mobileSide = 'right'"
      >
        📖 {{ rightPanelRef?.selectedWorldbook || '右面板' }}
      </button>
    </div>

    <!-- 主体：双面板 -->
    <div class="wbm-panels">
      <div class="panel-slot" :class="{ 'mobile-hidden': mobileSide !== 'left' }">
        <Panel
          ref="leftPanelRef"
          :worldbooks="worldbooks"
          :other-worldbook="rightPanelRef?.selectedWorldbook ?? ''"
          side="left"
          @dirty="onDirty('left', $event)"
          @status="setStatus"
          @copy-to-other="copyToRight"
        />
      </div>
      <div class="wbm-divider" title="双面板分隔">↔</div>
      <div class="panel-slot" :class="{ 'mobile-hidden': mobileSide !== 'right' }">
        <Panel
          ref="rightPanelRef"
          :worldbooks="worldbooks"
          :other-worldbook="leftPanelRef?.selectedWorldbook ?? ''"
          side="right"
          @dirty="onDirty('right', $event)"
          @status="setStatus"
          @copy-to-other="copyToLeft"
        />
      </div>
    </div>

    <!-- 状态栏 -->
    <footer class="wbm-status" :class="statusClass">
      {{ statusMessage || '就绪喵~ 🐾' }}
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import Panel from "./components/Panel.vue";
import { listWorldbooks, saveWorldbook } from "./services/api";
import { parseWorldbookJson } from "./utils/worldbook";

const worldbooks = ref<string[]>([]);
const leftPanelRef  = ref<InstanceType<typeof Panel> | null>(null);
const rightPanelRef = ref<InstanceType<typeof Panel> | null>(null);
const statusMessage = ref("");
const statusClass   = ref("");
const dirtyMap      = ref<Record<string, boolean>>({ left: false, right: false });
const saving        = ref(false);
const fileInputRef  = ref<HTMLInputElement | null>(null);
const mobileSide    = ref<"left" | "right">("left");

// ─────── 主题系统 ───────
const THEME_KEY = "wbm_theme_v1";
const activeTheme    = ref("ocean");
const showThemePicker = ref(false);
const themePickerRef  = ref<HTMLElement | null>(null);

const themes = [
  { id: "ocean",  label: "🌊 深海·潮汐",  color: "#00bcd4" },
  { id: "starry", label: "🌙 星月·长安",  color: "#f0c040" },
  { id: "forest", label: "🌿 森林·听风",  color: "#66bb6a" },
  { id: "paper",  label: "📜 宣纸·墨韵",  color: "#8b6d40" },
  { id: "tassel", label: "🎀 流苏·绛唇",  color: "#ff7f7f" },
];

function setTheme(id: string) {
  activeTheme.value = id;
  document.documentElement.setAttribute("data-theme", id);
  localStorage.setItem(THEME_KEY, id);
  showThemePicker.value = false;
}

function toggleThemePicker() {
  showThemePicker.value = !showThemePicker.value;
}

function onDocClick(e: MouseEvent) {
  if (showThemePicker.value && themePickerRef.value && !themePickerRef.value.contains(e.target as Node)) {
    showThemePicker.value = false;
  }
}

// ─────── Toast 通知系统 ───────
interface Toast {
  id: number;
  msg: string;
  type: "success" | "error" | "info";
  icon: string;
  paused: boolean;
  timerId?: ReturnType<typeof setTimeout>;
}
const toasts = ref<Toast[]>([]);
let toastId = 0;

function showToast(msg: string, type: Toast["type"] = "info", duration = 4000) {
  const icons = { success: "✨", error: "😿", info: "🐾" };
  const id = ++toastId;
  const toast: Toast = { id, msg, type, icon: icons[type], paused: false };
  toast.timerId = setTimeout(() => removeToast(id), duration);
  toasts.value.push(toast);
}

function removeToast(id: number) {
  const idx = toasts.value.findIndex((t) => t.id === id);
  if (idx !== -1) {
    clearTimeout(toasts.value[idx].timerId);
    toasts.value.splice(idx, 1);
  }
}

function clickToast(id: number) {
  const toast = toasts.value.find((t) => t.id === id);
  if (!toast) return;
  if (!toast.paused) {
    // 第一次点击：暂停自动关闭，钉住 Toast
    toast.paused = true;
    clearTimeout(toast.timerId);
  } else {
    // 第二次点击：立即关闭
    removeToast(id);
  }
}

// ─────── 状态栏 ───────
const anyDirty = computed(() => dirtyMap.value.left || dirtyMap.value.right);

function setStatus(msg: string, type: "success" | "error" | "info" = "info") {
  statusMessage.value = msg;
  statusClass.value   = `status-${type}`;
  showToast(msg, type, type === "error" ? 6000 : 3500);
  if (type !== "error") {
    setTimeout(() => { statusMessage.value = ""; statusClass.value = ""; }, 5000);
  }
}

function onDirty(side: "left" | "right", isDirty: boolean) {
  dirtyMap.value[side] = isDirty;
}

// ─────── 刷新世界书列表 ───────
async function refreshWorldbooks() {
  try {
    const res = await listWorldbooks();
    if (res.success && res.data) {
      worldbooks.value = res.data.worldbooks;
      setStatus(`喵~已加载 ${worldbooks.value.length} 个世界书啦！ 📚`, "success");
    } else {
      setStatus(`呜喵！获取世界书列表失败了：${res.message} 😿`, "error");
    }
  } catch {
    setStatus("呜呜后端连不上喵...SillyTavern 插件加载了嘛？ 😿", "error");
  }
}

// ─────── 保存所有脏面板 ───────
async function saveAll() {
  saving.value = true;
  try {
    const panels = [leftPanelRef.value, rightPanelRef.value].filter(Boolean);
    let saved = 0;
    for (const panel of panels) {
      if (panel && (await panel.save())) saved++;
    }
    if (saved > 0) setStatus(`喵~帮主人保存了 ${saved} 个世界书啦~ ✨`, "success");
    else setStatus("没有需要保存的内容喵~ 🐾", "info");
  } finally {
    saving.value = false;
  }
}

// ─────── 导入 ───────
function triggerImport() {
  fileInputRef.value?.click();
}

async function importFromFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file  = input.files?.[0];
  if (!file) return;
  const worldbookName = file.name.replace(/\.json$/i, "");
  try {
    const text = await file.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      setStatus(`呜喵！"${file.name}" 不是有效的 JSON 文件诶~ 😿`, "error");
      input.value = "";
      return;
    }
    const entries = parseWorldbookJson(json);
    if (entries.length === 0) {
      setStatus("呜喵，文件里没找到条目呢...格式对吗？ 🔍", "error");
      input.value = "";
      return;
    }
    setStatus(`喵~正在努力导入 "${worldbookName}"（${entries.length} 条）...请稍等一下~ 🐾`, "info");
    const res = await saveWorldbook(worldbookName, entries);
    if (res.success) {
      await refreshWorldbooks();
      setStatus(`喵~导入成功啦！"${worldbookName}"（${entries.length} 条）全部搬进来了~ 📦`, "success");
    } else {
      setStatus(`呜喵！导入失败了：${res.message}，再试一次嘛？ 😿`, "error");
    }
  } catch (e) {
    setStatus(`呜呜导入出错了喵：${(e as Error).message} 😿`, "error");
  }
  input.value = "";
}

// ─────── 复制跨面板 ───────
function copyToRight(uids: number[]) {
  if (!rightPanelRef.value) return;
  rightPanelRef.value.receiveCopy(leftPanelRef.value?.selectedWorldbook ?? "", uids);
}

function copyToLeft(uids: number[]) {
  if (!leftPanelRef.value) return;
  leftPanelRef.value.receiveCopy(rightPanelRef.value?.selectedWorldbook ?? "", uids);
}

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (anyDirty.value) {
    e.preventDefault();
    e.returnValue = "";
  }
}

onMounted(() => {
  const saved = localStorage.getItem(THEME_KEY) || "ocean";
  setTheme(saved);
  refreshWorldbooks();
  window.addEventListener("beforeunload", onBeforeUnload);
  document.addEventListener("click", onDocClick);
});

onUnmounted(() => {
  window.removeEventListener("beforeunload", onBeforeUnload);
  document.removeEventListener("click", onDocClick);
});
</script>
