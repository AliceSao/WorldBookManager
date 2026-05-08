<template>
  <div class="entry-editor" :class="{ 'editor-fullscreen': isFullscreen }">
    <div class="editor-toolbar">
      <button class="btn btn-sm" @click="isFullscreen = !isFullscreen" :title="isFullscreen ? '退出全屏' : '全屏编辑'">
        {{ isFullscreen ? '⛶ 退出全屏' : '⛶ 全屏编辑' }}
      </button>
    </div>
    <div class="editor-row">
      <label class="editor-label">UID</label>
      <input v-model.number="local.uid" type="number" class="editor-input narrow" min="0" />
      <span style="font-size:10px;color:var(--text-muted);margin-left:6px">
        编辑时允许重复，点击保存时自动检查
      </span>
    </div>
    <div class="editor-row">
      <label class="editor-label">标题</label>
      <input v-model="local.comment" class="editor-input" placeholder="条目标题（comment）" />
    </div>
    <div class="editor-row">
      <label class="editor-label">激活策略</label>
      <select v-model="strategy" class="editor-select">
        <option value="constant">🔵 常量（蓝灯）</option>
        <option value="selective">🟢 可选（绿灯）</option>
        <option value="vectorized">🔗 向量化</option>
      </select>
    </div>
    <div v-if="strategy === 'selective'" class="editor-row">
      <label class="editor-label">主要关键字</label>
      <div class="tag-input-group">
        <div class="tags">
          <span v-for="(k, i) in local.key" :key="i" class="tag">
            {{ k }} <button @click="removeKey(i)">×</button>
          </span>
        </div>
        <input
          v-model="newKey"
          class="editor-input tag-add"
          placeholder="输入关键字后按 Enter"
          @keydown.enter.prevent="addKey"
        />
      </div>
    </div>
    <div class="editor-row">
      <label class="editor-label">插入位置</label>
      <select v-model.number="local.position" class="editor-select">
        <option :value="0">角色定义之前</option>
        <option :value="1">角色定义之后</option>
        <option :value="2">示例消息之前</option>
        <option :value="3">示例消息之后</option>
        <option :value="4">固定深度</option>
        <option :value="5">作者注释之前</option>
        <option :value="6">作者注释之后</option>
      </select>
    </div>
    <div v-if="local.position === 4" class="editor-row">
      <label class="editor-label">深度</label>
      <input v-model.number="local.depth" type="number" class="editor-input narrow" min="0" />
      <label class="editor-label ml">身份</label>
      <select v-model.number="local.role" class="editor-select narrow">
        <option :value="0">System</option>
        <option :value="1">User</option>
        <option :value="2">Assistant</option>
      </select>
    </div>
    <div class="editor-row">
      <label class="editor-label">Order</label>
      <input v-model.number="local.order" type="number" class="editor-input narrow" />
      <label class="editor-label ml">触发概率%</label>
      <input v-model.number="local.probability" type="number" class="editor-input narrow" min="0" max="100" />
    </div>
    <div class="editor-row">
      <label class="editor-label">递归控制</label>
      <label class="check-label">
        <input type="checkbox" v-model="local.excludeRecursion" /> 不可递归激活
      </label>
      <label class="check-label ml">
        <input type="checkbox" v-model="local.preventRecursion" /> 防止进一步递归
      </label>
    </div>
    <div class="editor-row">
      <label class="editor-label">效果</label>
      <label class="editor-label tiny">粘性</label>
      <input v-model.number="local.sticky" type="number" class="editor-input narrow" placeholder="null" />
      <label class="editor-label tiny ml">冷却</label>
      <input v-model.number="local.cooldown" type="number" class="editor-input narrow" placeholder="null" />
      <label class="editor-label tiny ml">延迟</label>
      <input v-model.number="local.delay" type="number" class="editor-input narrow" placeholder="null" />
    </div>
    <div class="editor-row">
      <label class="editor-label">状态</label>
      <label class="check-label">
        <input type="checkbox" :checked="!local.disable" @change="local.disable = !($event.target as HTMLInputElement).checked" />
        启用
      </label>
    </div>
    <div class="editor-row editor-content-row">
      <label class="editor-label">正文</label>
      <div class="content-edit-wrap">
        <textarea v-model="local.content" class="editor-textarea" rows="6" placeholder="条目内容..."></textarea>
        <button class="btn btn-sm content-expand-btn" @click="openContentModal" title="在大窗口中编辑正文">⛶ 展开编辑</button>
      </div>
    </div>

    <!-- Content 大窗口编辑器 -->
    <div v-if="showContentModal" class="content-modal-overlay" @click.self="closeContentModal">
      <div class="content-modal">
        <div class="content-modal-header">
          <span class="content-modal-title">📝 正文编辑 — {{ local.comment || 'UID ' + local.uid }}</span>
          <button class="btn btn-sm" @click="closeContentModal">✕ 关闭</button>
        </div>
        <textarea
          v-model="local.content"
          class="content-modal-textarea"
          placeholder="在此编辑条目正文..."
          ref="contentModalTextareaRef"
        ></textarea>
        <div class="content-modal-footer">
          <span class="content-modal-info">{{ local.content.length }} 字符</span>
          <button class="btn btn-primary btn-sm" @click="closeContentModal">✅ 完成</button>
        </div>
      </div>
    </div>
    <div class="editor-actions">
      <button class="btn btn-primary btn-sm" @click="applyEdit">✅ 应用</button>
      <button class="btn btn-sm" @click="$emit('cancel')">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import type { RawEntry } from "../utils/worldbook";

const props = defineProps<{ entry: RawEntry }>();
const emit = defineEmits<{
  (e: "update", entry: RawEntry): void;
  (e: "cancel"): void;
}>();

const local = ref<RawEntry>(JSON.parse(JSON.stringify(props.entry)));
const newKey = ref("");
const showContentModal = ref(false);
const isFullscreen = ref(false);
const contentModalTextareaRef = ref<HTMLTextAreaElement | null>(null);

function openContentModal() {
  showContentModal.value = true;
  nextTick(() => contentModalTextareaRef.value?.focus());
}

function closeContentModal() {
  showContentModal.value = false;
}

watch(() => props.entry, (v) => { local.value = JSON.parse(JSON.stringify(v)); });

const strategy = computed({
  get() {
    if (local.value.constant) return "constant";
    if (local.value.selective) return "selective";
    if (local.value.vectorized) return "vectorized";
    return "constant";
  },
  set(v: string) {
    local.value.constant = v === "constant";
    local.value.selective = v === "selective";
    local.value.vectorized = v === "vectorized";
  },
});

function addKey() {
  const k = newKey.value.trim();
  if (k && !local.value.key.includes(k)) {
    local.value.key.push(k);
  }
  newKey.value = "";
}

function removeKey(i: number) {
  local.value.key.splice(i, 1);
}

function applyEdit() {
  emit("update", { ...local.value });
}
</script>

<style scoped>
.entry-editor {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.editor-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  flex-wrap: wrap;
  min-width: 0;
  width: 100%;
}

.editor-label {
  flex: 0 0 78px;
  min-width: 78px;
  font-size: 12px;
  color: var(--text, #e8ecf8);
  line-height: 1.4;
}

.editor-label.tiny {
  flex-basis: auto;
  min-width: 0;
  font-size: 11px;
  color: var(--text-muted, #93a0c3);
}

.editor-input,
.editor-select,
.editor-textarea {
  min-width: 0;
  width: 100%;
  border: 1px solid var(--border, #334155);
  border-radius: 8px;
  background: var(--bg-input, rgba(16, 24, 39, 0.92));
  color: var(--text, #e8ecf8);
  padding: 8px 10px;
  box-sizing: border-box;
}

.editor-input,
.editor-select {
  flex: 1 1 220px;
}

.editor-input.narrow,
.editor-select.narrow {
  flex: 0 1 120px;
  width: auto;
}

.editor-textarea {
  resize: vertical;
  line-height: 1.6;
  min-height: 160px;
}

.tag-input-group {
  flex: 1 1 260px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(79, 70, 229, 0.18);
  color: var(--text, #e8ecf8);
  font-size: 12px;
}

.tag button {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;
}

.tag-add {
  width: 100%;
}

.check-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 12px;
  color: var(--text, #e8ecf8);
}

.editor-content-row {
  align-items: flex-start;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
}

.ml {
  margin-left: 8px;
}

/* 全屏编辑模式 */
.editor-fullscreen {
  position: fixed !important;
  top: 0; left: 0;
  width: 100vw !important;
  height: 100vh !important;
  height: 100dvh !important;
  z-index: 99998;
  background: var(--bg, #0b1929);
  overflow-y: auto;
  padding: 12px;
  box-sizing: border-box;
  border-radius: 0 !important;
  border: none !important;
  opacity: 1 !important;
}

.editor-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 6px;
}

.content-edit-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.content-expand-btn {
  align-self: flex-end;
  font-size: 11px;
  opacity: 0.7;
  transition: opacity 0.15s;
}
.content-expand-btn:hover { opacity: 1; }

/* Content 大窗口编辑器 */
.content-modal-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 16px;
  box-sizing: border-box;
  opacity: 1 !important;
}

.content-modal {
  width: min(960px, 96vw);
  height: min(720px, 85vh);
  background: var(--bg-card, #1e1e2e);
  border: 1px solid var(--border, #444);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0,0,0,0.6);
  overflow: hidden;
}

.content-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border, #444);
  flex-shrink: 0;
}

.content-modal-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text, #e0e0e0);
}

.content-modal-textarea {
  flex: 1;
  margin: 0;
  padding: 16px;
  border: none;
  outline: none;
  resize: none;
  font-family: "Consolas", "SF Mono", monospace;
  font-size: 14px;
  line-height: 1.6;
  background: var(--bg-input, #181825);
  color: var(--text, #e0e0e0);
  tab-size: 2;
}

.content-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid var(--border, #444);
  flex-shrink: 0;
}

.content-modal-info {
  font-size: 12px;
  color: var(--text-muted, #888);
}

/* 手机端：弹窗全屏 */
@media (max-width: 768px) {
  .entry-editor {
    gap: 10px;
  }

  .editor-row {
    align-items: stretch;
    margin-bottom: 0;
  }

  .editor-label,
  .editor-label.tiny {
    flex: 0 0 auto;
    min-width: 0;
    width: 100%;
  }

  .editor-input,
  .editor-select,
  .editor-input.narrow,
  .editor-select.narrow,
  .tag-input-group,
  .check-label,
  .content-edit-wrap {
    flex: 1 1 100%;
    width: 100%;
  }

  .check-label {
    min-height: 36px;
  }

  .ml {
    margin-left: 0;
  }

  .editor-actions > * {
    flex: 1 1 calc(50% - 4px);
  }

  .content-modal {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }
  .content-modal-overlay {
    padding: 0;
  }
}
</style>
