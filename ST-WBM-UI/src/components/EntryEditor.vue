<template>
  <div class="entry-editor">
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
      <textarea v-model="local.content" class="editor-textarea" rows="6" placeholder="条目内容..."></textarea>
    </div>
    <div class="editor-actions">
      <button class="btn btn-primary btn-sm" @click="applyEdit">✅ 应用</button>
      <button class="btn btn-sm" @click="$emit('cancel')">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { RawEntry } from "../utils/worldbook";

const props = defineProps<{ entry: RawEntry }>();
const emit = defineEmits<{
  (e: "update", entry: RawEntry): void;
  (e: "cancel"): void;
}>();

const local = ref<RawEntry>({ ...props.entry, key: [...props.entry.key] });
const newKey = ref("");

watch(() => props.entry, (v) => { local.value = { ...v, key: [...v.key] }; });

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
