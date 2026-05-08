<template>
  <div class="wbm-app">
    <div class="wbm-toasts">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="wbm-toast"
        :class="[`toast-${t.type}`]"
        @click="clickToast(t.id)"
      >
        <span class="toast-icon">{{ t.icon }}</span>
        <span class="toast-msg">{{ t.msg }}</span>
      </div>
    </div>

    <nav class="wbm-nav">
      <span class="wbm-title">📖 世界书管理器 <span class="wbm-version">v1.3</span></span>
      <div class="wbm-nav-actions">
        <button class="btn btn-primary" :disabled="!dirty || saving" @click="saveAll">
          {{ saving ? '⏳' : '💾' }}<span class="btn-label">{{ saving ? ' 保存中...' : ' 保存' }}</span>
        </button>
        <button class="btn" @click="refreshWorldbooks">🔄<span class="btn-label"> 刷新</span></button>
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
      </div>
    </nav>

    <div class="wbm-panels single-workspace">
      <Panel
        ref="panelRef"
        :worldbooks="worldbooks"
        @dirty="onDirty"
        @status="setStatus"
        @refresh-worldbooks="refreshWorldbooks"
      />
    </div>

    <footer class="wbm-status" :class="statusClass">
      {{ statusMessage || '就绪喵~ 🐾' }}
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import Panel from "./components/Panel.vue";
import { listWorldbooks } from "./services/api";

const worldbooks = ref<string[]>([]);
const panelRef = ref<InstanceType<typeof Panel> | null>(null);
const statusMessage = ref("");
const statusClass = ref("");
const dirty = ref(false);
const saving = ref(false);

const THEME_KEY = "wbm_theme_v1";
const activeTheme = ref("ocean");
const showThemePicker = ref(false);
const themePickerRef = ref<HTMLElement | null>(null);

const themes = [
  { id: "ocean",  label: "🌿 青墨纸窗",  color: "#647d6f" },
  { id: "starry", label: "🌙 群青听潮",  color: "#bda569" },
  { id: "forest", label: "🍂 金泥茶烟",  color: "#c79d61" },
  { id: "paper",  label: "🌲 竹岚杉影",  color: "#84b48a" },
  { id: "tassel", label: "❄️ 月白寒川",  color: "#8f8399" },
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

interface Toast {
  id: number;
  msg: string;
  type: "success" | "error" | "info";
  icon: string;
  timerId?: ReturnType<typeof setTimeout>;
}
const toasts = ref<Toast[]>([]);
let toastId = 0;

function showToast(msg: string, type: Toast["type"] = "info", duration = 4000) {
  const icons = { success: "✨", error: "😿", info: "🐾" };
  const id = ++toastId;
  const toast: Toast = { id, msg, type, icon: icons[type] };
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
  removeToast(id);
}

function setStatus(msg: string, type: "success" | "error" | "info" = "info") {
  statusMessage.value = msg;
  statusClass.value = `status-${type}`;
  showToast(msg, type, type === "error" ? 6000 : 3500);
  if (type !== "error") {
    setTimeout(() => { statusMessage.value = ""; statusClass.value = ""; }, 5000);
  }
}

function onDirty(isDirty: boolean) {
  dirty.value = isDirty;
}

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

async function saveAll() {
  saving.value = true;
  try {
    const saved = panelRef.value ? await panelRef.value.save() : false;
    if (saved) setStatus("喵~保存完成啦~ ✨", "success");
    else setStatus("没有需要保存的内容喵~ 🐾", "info");
  } finally {
    saving.value = false;
  }
}

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value) {
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
