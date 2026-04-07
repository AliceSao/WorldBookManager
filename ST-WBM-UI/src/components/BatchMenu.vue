<template>
  <div class="batch-menu" v-if="selectedCount > 0">
    <div class="batch-menu-header">
      已选 {{ selectedCount }} 条
      <button class="btn btn-sm" @click="$emit('clear-selection')">清空</button>
    </div>
    <div class="batch-ops">
      <button class="btn btn-sm batch-op" @click="op('strategy')">激活策略</button>
      <button class="btn btn-sm batch-op" @click="op('position')">插入位置</button>
      <button class="btn btn-sm batch-op" @click="op('depth')">深度</button>
      <button class="btn btn-sm batch-op" @click="op('order')">Order</button>
      <button class="btn btn-sm batch-op" @click="op('probability')">触发概率</button>
      <button class="btn btn-sm batch-op" @click="op('name')">标题</button>
      <button class="btn btn-sm batch-op" @click="op('keys')">关键字操作</button>
      <button class="btn btn-sm batch-op" @click="op('recursion')">递归控制</button>
      <button class="btn btn-sm batch-op" @click="op('effect')">效果</button>
      <button class="btn btn-sm batch-op" @click="op('group-weight')">组权重</button>
      <button class="btn btn-sm batch-op" @click="op('char-filter')">角色绑定</button>
      <button class="btn btn-sm batch-op" @click="op('uid')">重新编号UID</button>
      <button class="btn btn-sm batch-op" @click="op('create')">批量创建条目</button>
      <button class="btn btn-sm batch-op batch-enable" @click="op('enabled', true)">批量启用</button>
      <button class="btn btn-sm batch-op batch-disable" @click="op('enabled', false)">批量禁用</button>
      <button class="btn btn-sm batch-op batch-delete" @click="$emit('batch-delete')">批量删除</button>
    </div>

    <!-- 操作弹窗 -->
    <div v-if="activeOp" class="batch-dialog-overlay" @click.self="activeOp = ''">
      <div class="batch-dialog">
        <h4>{{ dialogTitle }}</h4>

        <!-- 激活策略 -->
        <div v-if="activeOp === 'strategy'">
          <select v-model="opValue.strategy" class="editor-select">
            <option value="constant">🔵 常量（蓝灯）</option>
            <option value="selective">🟢 可选（绿灯）</option>
            <option value="vectorized">🔗 向量化</option>
          </select>
        </div>

        <!-- 插入位置 -->
        <div v-else-if="activeOp === 'position'">
          <select v-model.number="opValue.position" class="editor-select">
            <option :value="0">角色定义之前</option>
            <option :value="1">角色定义之后</option>
            <option :value="2">示例消息之前</option>
            <option :value="3">示例消息之后</option>
            <option :value="4">固定深度</option>
            <option :value="5">作者注释之前</option>
            <option :value="6">作者注释之后</option>
          </select>
        </div>

        <!-- 数字输入类 -->
        <div v-else-if="['depth','order','probability','group-weight'].includes(activeOp)">
          <input v-model.number="opValue.numVal" type="number" class="editor-input"
            :placeholder="activeOp === 'probability' ? '0-100' : ''" />
        </div>

        <!-- 文本输入类 -->
        <div v-else-if="activeOp === 'name'">
          <input v-model="opValue.title" class="editor-input" placeholder="新标题" />
        </div>

        <!-- 关键字操作（三种模式） -->
        <div v-else-if="activeOp === 'keys'">
          <div style="display:flex;gap:12px;margin-bottom:12px">
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px">
              <input type="radio" v-model="opValue.keysMode" value="replace" /> 查找替换
            </label>
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px">
              <input type="radio" v-model="opValue.keysMode" value="add" /> 追加关键字
            </label>
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px">
              <input type="radio" v-model="opValue.keysMode" value="clear" /> 清空全部
            </label>
          </div>

          <!-- 查找替换模式 -->
          <div v-if="opValue.keysMode === 'replace'" style="display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;align-items:center;gap:6px">
              <label class="editor-label">查找</label>
              <input v-model="opValue.findKey" class="editor-input" placeholder="要查找的关键字（精确匹配）" />
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <label class="editor-label">替换为</label>
              <input v-model="opValue.replaceWith" class="editor-input" placeholder="留空则删除匹配关键字" />
            </div>
            <p style="font-size:10px;color:var(--text-muted)">
              仅替换精确匹配的关键字，其余关键字保持不变
            </p>
          </div>

          <!-- 追加模式 -->
          <div v-else-if="opValue.keysMode === 'add'" style="display:flex;flex-direction:column;gap:6px">
            <input v-model="opValue.keysRaw" class="editor-input"
              placeholder="新增关键字（逗号分隔，已有的不重复添加）" />
          </div>

          <!-- 清空模式 -->
          <div v-else-if="opValue.keysMode === 'clear'">
            <p class="dialog-warning">⚠️ 将清空 {{ selectedCount }} 条条目的全部主要关键字，确认？</p>
          </div>
        </div>

        <!-- 递归控制 -->
        <div v-else-if="activeOp === 'recursion'" class="dialog-checks">
          <label><input type="checkbox" v-model="opValue.excludeRecursion" /> 禁止被递归激活</label>
          <label><input type="checkbox" v-model="opValue.preventRecursion" /> 禁止递归激活他人</label>
        </div>

        <!-- 效果 -->
        <div v-else-if="activeOp === 'effect'" class="dialog-effects">
          <label>粘性 <input v-model.number="opValue.sticky" type="number" class="editor-input narrow" placeholder="null" /></label>
          <label>冷却 <input v-model.number="opValue.cooldown" type="number" class="editor-input narrow" placeholder="null" /></label>
          <label>延迟 <input v-model.number="opValue.delay" type="number" class="editor-input narrow" placeholder="null" /></label>
        </div>

        <!-- 角色绑定（含角色卡下拉） -->
        <div v-else-if="activeOp === 'char-filter'" style="display:flex;flex-direction:column;gap:8px">
          <div>
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">角色名</label>
            <div v-if="charList.length > 0" style="margin-bottom:4px">
              <select v-model="charPickerVal" class="editor-select" @change="pickChar">
                <option value="">— 从角色卡列表选择 —</option>
                <option v-for="c in charList" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <input v-model="opValue.charNames" class="editor-input"
              :placeholder="charList.length ? '或手动输入（逗号分隔）' : '角色名（逗号分隔）'" />
          </div>
          <div>
            <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">标签</label>
            <input v-model="opValue.charTags" class="editor-input mt" placeholder="标签（逗号分隔）" />
          </div>
          <label style="font-size:12px;display:flex;align-items:center;gap:6px">
            <input type="checkbox" v-model="opValue.isExclude" /> 排除模式（不匹配以上角色/标签时激活）
          </label>
          <button class="btn btn-sm" style="align-self:flex-start" @click="clearCharFilter">清除绑定</button>
        </div>

        <!-- UID 重新编号（顺序设定，非偏移） -->
        <div v-else-if="activeOp === 'uid'">
          <p style="font-size:11px;color:var(--text-muted);margin-bottom:8px">
            从指定 UID 开始，按当前选中顺序依次分配 N, N+1, N+2...
            <br>会跳过与未选中条目的冲突值。
          </p>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="font-size:12px;white-space:nowrap">起始 UID</label>
            <input v-model.number="opValue.numVal" type="number" class="editor-input"
              min="0" placeholder="如 100" />
          </div>
          <p style="font-size:10px;color:var(--text-muted);margin-top:6px">
            选中 {{ selectedCount }} 条，将分配 {{ opValue.numVal ?? '?' }} ~ {{ endUid }}
          </p>
        </div>

        <!-- 批量创建 -->
        <div v-else-if="activeOp === 'create'">
          <p style="font-size:11px;color:var(--text-muted);margin-bottom:8px">
            在当前世界书中批量创建空白条目，立即写入文件。
          </p>
          <label style="font-size:12px;display:flex;align-items:center;gap:8px">
            创建数量
            <input v-model.number="opValue.numVal" type="number" class="editor-input narrow"
              min="1" max="100" placeholder="1-100" />
          </label>
        </div>

        <div class="dialog-actions">
          <button class="btn btn-primary btn-sm" @click="applyOp">✅ 应用</button>
          <button class="btn btn-sm" @click="activeOp = ''">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { batchOp, addEntries, getSTCharacters } from "../services/api";

const props = defineProps<{
  worldbookName: string;
  selectedUids: number[];
  user?: string;
}>();

const emit = defineEmits<{
  (e: "done", message: string): void;
  (e: "error", message: string): void;
  (e: "clear-selection"): void;
  (e: "batch-delete"): void;
  (e: "refresh"): void;
}>();

const selectedCount = computed(() => props.selectedUids.length);
const activeOp = ref("");
const opValue = ref<Record<string, unknown>>({});
const charList = ref<string[]>([]);
const charPickerVal = ref("");

const DIALOG_TITLES: Record<string, string> = {
  strategy: "批量设置激活策略",
  position: "批量设置插入位置",
  depth: "批量设置深度",
  order: "批量设置 Order",
  probability: "批量设置触发概率（%）",
  name: "批量设置条目标题",
  keys: "批量关键字操作",
  recursion: "批量设置递归控制",
  effect: "批量设置效果",
  "group-weight": "批量设置组权重",
  "char-filter": "批量绑定角色/标签",
  uid: "批量重新编号 UID",
  create: "批量创建空白条目",
};

const dialogTitle = computed(() => DIALOG_TITLES[activeOp.value] || "批量操作");

// 预估结束 UID
const endUid = computed(() => {
  const start = Number(opValue.value.numVal ?? 0);
  if (isNaN(start)) return "?";
  return start + selectedCount.value - 1;
});

function op(name: string, value?: unknown) {
  if (name === "enabled") {
    runOp("enabled", { enabled: value });
    return;
  }
  activeOp.value = name;
  opValue.value = name === "keys" ? { keysMode: "replace" } : {};
  charPickerVal.value = "";
  // 打开角色绑定时尝试拉取角色列表
  if (name === "char-filter" && charList.value.length === 0) {
    getSTCharacters().then((list) => { charList.value = list; });
  }
}

// 从下拉选中角色追加到 charNames
function pickChar() {
  if (!charPickerVal.value) return;
  const current = String(opValue.value.charNames || "");
  const parts = current.split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.includes(charPickerVal.value)) {
    parts.push(charPickerVal.value);
    opValue.value.charNames = parts.join(", ");
  }
  charPickerVal.value = "";
}

// 清除角色绑定
async function clearCharFilter() {
  await runOp("char-filter", { filter: null });
}

async function runOp(opName: string, body: Record<string, unknown>) {
  if (!props.worldbookName) { emit("error", "呜喵，还没选世界书呢！先选一个嘛~ 📚"); return; }
  if (props.selectedUids.length === 0) { emit("error", "呜喵，还没选条目呢！先勾选一些嘛~ 🐱"); return; }
  const res = await batchOp(
    props.worldbookName,
    opName,
    { uids: props.selectedUids, ...body },
    props.user
  );
  if (res.success) {
    emit("done", res.message);
    emit("refresh");
  } else {
    emit("error", res.message);
  }
  activeOp.value = "";
}

async function applyOp() {
  const v = opValue.value;
  const curOp = activeOp.value;

  if (curOp === "strategy") await runOp("strategy", { strategy: v.strategy || "constant" });
  else if (curOp === "position") await runOp("position", { position: v.position ?? 0 });
  else if (curOp === "depth") await runOp("depth", { depth: v.numVal ?? 4 });
  else if (curOp === "order") await runOp("order", { order: v.numVal ?? 100 });
  else if (curOp === "probability") await runOp("probability", { probability: v.numVal ?? 100 });
  else if (curOp === "name") await runOp("name", { title: v.title ?? "" });
  else if (curOp === "keys") {
    const mode = String(v.keysMode || "replace");
    if (mode === "replace") {
      const findKey = String(v.findKey || "").trim();
      if (!findKey) { emit("error", "呜喵，查找的关键字是什么呀？ 🔍"); return; }
      await runOp("keys/replace", { findKey, replaceWith: String(v.replaceWith || "") });
    } else if (mode === "add") {
      const keys = String(v.keysRaw || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      if (!keys.length) { emit("error", "呜喵，要追加什么关键字呀？ 🔍"); return; }
      await runOp("keys/add", { keys });
    } else if (mode === "clear") {
      await runOp("keys/clear", {});
    }
  } else if (curOp === "recursion") {
    await runOp("recursion", {
      excludeRecursion: v.excludeRecursion ?? false,
      preventRecursion: v.preventRecursion ?? false,
    });
  } else if (curOp === "effect") {
    await runOp("effect", {
      sticky: v.sticky ?? null,
      cooldown: v.cooldown ?? null,
      delay: v.delay ?? null,
    });
  } else if (curOp === "group-weight") await runOp("group-weight", { groupWeight: v.numVal ?? 100 });
  else if (curOp === "char-filter") {
    const names = String(v.charNames || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    const tags = String(v.charTags || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    const filter = names.length || tags.length
      ? { names, tags, isExclude: !!v.isExclude }
      : null;
    await runOp("char-filter", { filter });
  } else if (curOp === "uid") {
    const startFrom = Number(v.numVal);
    if (isNaN(startFrom) || startFrom < 0) { emit("error", "呜喵，起始UID要填0以上的整数哦！ 🐱"); return; }
    await runOp("uid/set", { startFrom });
  } else if (curOp === "create") {
    const count = Math.max(1, Math.min(100, Number(v.numVal) || 1));
    const entries = Array.from({ length: count }, () => ({}));
    const res = await addEntries(props.worldbookName, entries, props.user);
    if (res.success) {
      emit("done", `喵~已创建 ${count} 条空白条目啦！记得保存哦~ ✨`);
      emit("refresh");
    } else {
      emit("error", res.message);
    }
    activeOp.value = "";
  }
}
</script>
