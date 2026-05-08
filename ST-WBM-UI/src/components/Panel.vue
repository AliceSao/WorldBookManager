<template>
  <div class="workspace-panel">
    <!-- Desktop >= 767px -->
    <div v-if="!isMobile" class="dual-workspace">
      <aside class="workspace-left">
        <div class="left-scroll">
        <section class="workspace-module" :class="{ collapsed: !wbModuleOpen }">
          <header class="workspace-module-head" @click="wbModuleOpen = !wbModuleOpen">
            <div>
              <div class="workspace-module-title">世界书</div>
              <div class="workspace-module-sub">搜索与当前工作书</div>
            </div>
            <span>{{ wbModuleOpen ? '▾' : '▸' }}</span>
          </header>
          <div class="workspace-module-body">
            <div class="current-worldbook-card" :class="{ empty: !selectedWorldbook }">
              <div class="current-worldbook-title">当前工作书</div>
              <div class="current-worldbook-name">{{ selectedWorldbook || '未选择世界书' }}</div>
              <div v-if="selectedWorldbooks.size" class="current-worldbook-meta">
                已勾选 {{ selectedWorldbooks.size }} 本
              </div>
              <div v-if="selectedWorldbooks.size" class="workspace-chip-row current-worldbook-list">
                <button
                  v-for="wb in Array.from(selectedWorldbooks).slice(0,2)"
                  :key="wb"
                  class="workspace-chip"
                  :class="{ active: selectedWorldbook === wb }"
                  @click="selectWorldbook(wb)"
                >{{ wb }}</button>
                <span v-if="selectedWorldbooks.size > 2" class="workspace-entry-meta">+{{ selectedWorldbooks.size - 2 }}</span>
              </div>
            </div>

            <button class="workspace-chip selector-toggle" @click="wbPoolOpen = !wbPoolOpen">
              📚 选择世界书 {{ wbPoolOpen ? '▾' : '▸' }}
            </button>

            <div v-show="wbPoolOpen" class="wb-pool-wrap">
              <input v-model="wbSearchQuery" class="search-input" placeholder="搜索世界书..." />
              <div class="workspace-wb-list wb-pool-list">
                <label
                  v-for="wb in filteredWorldbookList"
                  :key="wb"
                  class="workspace-wb-item"
                  :class="{ active: selectedWorldbook === wb, checked: selectedWorldbooks.has(wb) }"
                >
                  <div class="workspace-wb-main wb-select-row2">
                    <input type="checkbox" :checked="selectedWorldbooks.has(wb)" @change="toggleWorldbookCheck(wb)" @click.stop />
                    <button class="wb-open-btn" @click.stop="selectWorldbook(wb)">
                      <strong>{{ selectedWorldbook === wb ? '☑' : '☐' }} {{ wb }}</strong>
                    </button>
                  </div>
                </label>
              </div>
            </div>
            <div class="workspace-chip-row worldbook-ops-grid">
              <button class="workspace-chip" @click="triggerImport">📥 导入</button>
              <a v-if="selectedWorldbook" :href="exportUrl" :download="`${selectedWorldbook}.json`" class="workspace-chip">📤 导出</a>
              <button class="workspace-chip" @click="duplicateWorldbook" :disabled="!selectedWorldbook">📋 复制世界书</button>
              <button class="workspace-chip" @click="renameWorldbook" :disabled="!selectedWorldbook">✏️ 改名</button>
              <button class="workspace-chip danger" @click="confirmDeleteWorldbook" :disabled="!selectedWorldbook">🗑️ 删除</button>
              <button class="workspace-chip" @click="openCreateDialog">＋ 新建</button>
            </div>
            <input ref="importFileRef" type="file" accept=".json" style="display:none" @change="importFromFile" />
          </div>
        </section>

        <section class="workspace-module" :class="{ collapsed: !entryModuleOpen }">
          <header class="workspace-module-head" @click="entryModuleOpen = !entryModuleOpen">
            <div>
              <div class="workspace-module-title">条目与排序</div>
              <div class="workspace-module-sub">搜索、排序、当前条目列表</div>
            </div>
            <span>{{ entryModuleOpen ? '▾' : '▸' }}</span>
          </header>
          <div class="workspace-module-body">
            <input v-model="searchQuery" class="search-input" :placeholder="searchPlaceholder" />
            <div class="workspace-chip-row chip-wrap">
              <button
                v-for="m in searchModes"
                :key="m.id"
                class="workspace-chip"
                :class="{ active: searchMode === m.id }"
                @click="searchMode = m.id; selectedUids.clear()"
              >{{ m.label }}</button>
            </div>
            <select v-model="sortMode" class="sort-select" @change="applySortMode">
              <option value="custom">自定义（DisplayIndex）</option>
              <option value="priority">优先级（Order）</option>
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
            <div class="entry-selection-toolbar">
              <span class="entry-selection-summary">{{ entrySelectionSummary }}</span>
              <button class="btn btn-sm ghost-btn" @click="selectedUids.clear()" :disabled="selectedUids.size === 0">清空选中</button>
            </div>
            <div class="workspace-entry-list workspace-entry-scroll">
              <div v-if="!selectedWorldbook" class="panel-empty">请先选择世界书喵~ 📚</div>
              <div v-else-if="loading" class="panel-empty">正在加载中喵... 🐾</div>
              <div v-else-if="filteredEntries.length === 0" class="panel-empty">没有条目呢喵~</div>
              <div
                v-else
                v-for="entry in filteredEntries"
                :key="entry.uid"
                class="workspace-entry-item"
                :class="{ active: currentEditUid === entry.uid, selected: selectedUids.has(entry.uid), disabled: entry.disable }"
                @click="handleEntryCardClick(entry.uid)"
              >
                <div class="workspace-entry-top">
                  <label class="entry-check" @click.stop>
                    <input type="checkbox" :checked="selectedUids.has(entry.uid)" @change="toggleSelect(entry.uid)" />
                  </label>
                  <div class="workspace-entry-title">
                    <span class="entry-uid-badge">[{{ entry.uid }}]</span>
                    <span class="entry-title-text">{{ entry.comment || '（无标题）' }}</span>
                  </div>
                  <button class="entry-action-btn" @click.stop="openEntryEditor(entry.uid)">编辑</button>
                </div>
                <div class="workspace-entry-meta-row">
                  <span class="workspace-entry-meta">{{ strategyShort(entry) }}</span>
                  <span class="workspace-entry-meta">Order {{ entry.order }}</span>
                  <span class="workspace-entry-meta">{{ positionShort(entry) }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="workspace-module" :class="{ collapsed: !actionModuleOpen }">
          <header class="workspace-module-head" @click="actionModuleOpen = !actionModuleOpen">
            <div>
              <div class="workspace-module-title">批量操作</div>
              <div class="workspace-module-sub">选择、创建、移动、UID 与复制</div>
            </div>
            <span>{{ actionModuleOpen ? '▾' : '▸' }}</span>
          </header>
          <div class="workspace-module-body">
            <div class="action-group-title">选择</div>
            <div class="workspace-action-grid">
              <button class="btn btn-sm" @click="selectByStrategy('constant')">🔵 常量</button>
              <button class="btn btn-sm" @click="selectByStrategy('selective')">🟢 可选</button>
              <button class="btn btn-sm" @click="selectByStrategy('vectorized')">🔗 向量</button>
              <button class="btn btn-sm" @click="showSmartDialog = 'keyword'">🔤 关键字</button>
              <button class="btn btn-sm" @click="showSmartDialog = 'uid-range'">🆔 区间</button>
              <button class="btn btn-sm" @click="toggleAll" :disabled="!filteredEntries.length">☑ 全选当前</button>
            </div>
            <div class="action-group-title">创建与复制</div>
            <div class="workspace-action-grid">
              <button class="btn btn-sm" @click="addEntry" :disabled="!selectedWorldbook">＋ 新建</button>
              <button class="btn btn-sm" @click="openBatchCreate" :disabled="!selectedWorldbook">＋＋ 批量</button>
              <button class="btn btn-sm" @click="duplicateSelected" :disabled="selectedUids.size === 0">📋 复制条目</button>
              <button class="btn btn-sm" @click="openWorldbookCopyDialog" :disabled="selectedWorldbooks.size === 0">📚 复制到目标书</button>
            </div>
            <div class="action-group-title">移动与编号</div>
            <div class="workspace-action-grid">
              <button class="btn btn-sm" @click="openMoveDialog('up')" :disabled="selectedUids.size === 0">⬆ 上移</button>
              <button class="btn btn-sm" @click="openMoveDialog('down')" :disabled="selectedUids.size === 0">⬇ 下移</button>
              <button class="btn btn-sm" @click="openReorderUidDialog" :disabled="selectedUids.size === 0 && !filteredEntries.length">UID 重排</button>
              <button class="btn btn-sm" @click="undoHistory" :disabled="!canUndo()">↩ 回退</button>
            </div>
            <div class="action-group-title">完整批量工具</div>
            <BatchMenu
              v-if="selectedWorldbook"
              :worldbook-name="selectedWorldbook"
              :selected-uids="Array.from(selectedUids)"
              @done="onBatchDone"
              @error="onError"
              @clear-selection="selectedUids.clear()"
              @batch-delete="batchDelete"
              @reorder-uids="reorderUidsByCurrentView"
              @refresh="loadWorldbook"
            />
          </div>
        </section>
        </div>
      </aside>

      <main class="workspace-right">
        <div class="workspace-editor-top">
          <div>
            <div class="workspace-editor-title">条目编辑 · {{ currentEntry?.comment || '未选择条目' }}</div>
            <div class="workspace-editor-sub">右栏仅负责编辑，不承担世界书切换与批量工具</div>
          </div>
          <div class="workspace-editor-actions">
            <button class="btn btn-sm" @click="showPreview = !showPreview" :disabled="!currentEntry">{{ showPreview ? '📝 返回编辑' : '👁️ 预览' }}</button>
            <button class="btn btn-sm" @click="openContentEditorFromCurrent" :disabled="!currentEntry">⛶ 正文全屏</button>
          </div>
        </div>

        <div class="workspace-editor-tabs">
          <span class="pill active">基础信息</span>
          <span class="pill">关键字</span>
          <span class="pill">递归与效果</span>
          <span class="pill">状态</span>
        </div>

        <div class="workspace-editor-body">
          <div v-if="!currentEntry" class="panel-empty">从左侧选择一条条目开始编辑喵~ ✏️</div>
          <template v-else>
            <EntryEditor ref="entryEditorRef" v-if="!showPreview" :entry="currentEntry" @update="onCurrentEntryUpdate" @cancel="currentEditUid = null" />
            <div v-else class="workspace-preview-card">
              <div class="workspace-preview-title">正文预览</div>
              <div class="preview">{{ currentEntry.content }}</div>
            </div>
          </template>
        </div>
      </main>
    </div>

    <!-- Mobile < 767px -->
    <div v-else class="mobile-workspace">
      <div class="mobile-top-steps">
        <span class="mobile-step" :class="{ active: mobileTab === 'worldbooks' }">1 世界书</span>
        <span class="mobile-step" :class="{ active: mobileTab === 'entries' }">2 条目</span>
        <span class="mobile-step" :class="{ active: mobileTab === 'actions' }">3 操作</span>
        <span class="mobile-step" :class="{ active: mobileTab === 'editor' }">4 编辑</span>
      </div>

      <section v-show="mobileTab === 'worldbooks'" class="mobile-panel">
        <div class="current-worldbook-card" :class="{ empty: !selectedWorldbook }">
          <div class="current-worldbook-title">当前工作书</div>
          <div class="current-worldbook-name">{{ selectedWorldbook || '未选择世界书' }}</div>
          <div v-if="selectedWorldbooks.size" class="current-worldbook-meta">已勾选 {{ selectedWorldbooks.size }} 本</div>
          <div v-if="selectedWorldbooks.size" class="workspace-chip-row current-worldbook-list">
            <button
              v-for="wb in Array.from(selectedWorldbooks).slice(0,2)"
              :key="wb"
              class="workspace-chip"
              :class="{ active: selectedWorldbook === wb }"
              @click="selectWorldbook(wb)"
            >{{ wb }}</button>
            <span v-if="selectedWorldbooks.size > 2" class="workspace-entry-meta">+{{ selectedWorldbooks.size - 2 }}</span>
          </div>
        </div>
        <button class="workspace-chip selector-toggle" @click="wbPoolOpen = !wbPoolOpen">📚 选择世界书 {{ wbPoolOpen ? '▾' : '▸' }}</button>
        <div v-show="wbPoolOpen" class="wb-pool-wrap mobile-list-gap">
          <input v-model="wbSearchQuery" class="search-input" placeholder="搜索世界书..." />
          <div class="workspace-wb-list wb-pool-list">
            <div v-for="wb in filteredWorldbookList" :key="wb" class="workspace-wb-item" :class="{ active: selectedWorldbook === wb, checked: selectedWorldbooks.has(wb) }">
              <div class="workspace-wb-main wb-select-row2">
                <input type="checkbox" :checked="selectedWorldbooks.has(wb)" @change="toggleWorldbookCheck(wb)" @click.stop />
                <button class="wb-open-btn" @click.stop="selectWorldbook(wb)">
                  <strong>{{ selectedWorldbook === wb ? '☑' : '☐' }} {{ wb }}</strong>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="workspace-chip-row mobile-list-gap worldbook-ops-grid">
          <button class="workspace-chip" @click="triggerImport">📥 导入</button>
          <a v-if="selectedWorldbook" :href="exportUrl" :download="`${selectedWorldbook}.json`" class="workspace-chip">📤 导出</a>
          <button class="workspace-chip" @click="duplicateWorldbook" :disabled="!selectedWorldbook">📋 复制世界书</button>
          <button class="workspace-chip" @click="renameWorldbook" :disabled="!selectedWorldbook">✏️ 改名</button>
          <button class="workspace-chip danger" @click="confirmDeleteWorldbook" :disabled="!selectedWorldbook">🗑️ 删除</button>
          <button class="workspace-chip" @click="openCreateDialog">＋ 新建</button>
        </div>
      </section>

      <section v-show="mobileTab === 'entries'" class="mobile-panel">
        <input v-model="searchQuery" class="search-input" :placeholder="searchPlaceholder" />
        <div class="workspace-chip-row mobile-list-gap">
          <button v-for="m in searchModes" :key="m.id" class="workspace-chip" :class="{ active: searchMode === m.id }" @click="searchMode = m.id; selectedUids.clear()">{{ m.label }}</button>
        </div>
        <div class="mobile-entry-mode-toggle mobile-list-gap">
          <button class="btn btn-sm" :class="{ active: mobileEntryMode === 'select' }" @click="mobileEntryMode = 'select'">选择模式</button>
          <button class="btn btn-sm" :class="{ active: mobileEntryMode === 'edit' }" @click="mobileEntryMode = 'edit'">编辑模式</button>
        </div>
        <select v-model="sortMode" class="sort-select mobile-sort" @change="applySortMode">
          <option value="custom">自定义（DisplayIndex）</option>
          <option value="priority">优先级（Order）</option>
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
        <div class="entry-selection-toolbar mobile-list-gap">
          <span class="entry-selection-summary">{{ entrySelectionSummary }} · 当前{{ mobileEntryMode === 'select' ? '点条目即选中' : '点条目即进入编辑' }}</span>
          <button class="btn btn-sm ghost-btn" @click="selectedUids.clear()" :disabled="selectedUids.size === 0">清空</button>
        </div>
        <div class="workspace-entry-list mobile-list-gap">
          <div
            v-for="entry in filteredEntries"
            :key="entry.uid"
            class="workspace-entry-item"
            :class="{ active: currentEditUid === entry.uid, selected: selectedUids.has(entry.uid), disabled: entry.disable }"
            @click="handleMobileEntryClick(entry.uid)"
          >
            <div class="workspace-entry-top">
              <label class="entry-check mobile-entry-check" @click.stop>
                <input type="checkbox" :checked="selectedUids.has(entry.uid)" @change="toggleSelect(entry.uid)" />
              </label>
              <div class="workspace-entry-title">
                <span class="entry-uid-badge">[{{ entry.uid }}]</span>
                <span class="entry-title-text">{{ entry.comment || '（无标题）' }}</span>
              </div>
              <button class="entry-action-btn" @click.stop="openEntryEditor(entry.uid)">编辑</button>
            </div>
            <div class="workspace-entry-meta-row">
              <span class="workspace-entry-meta">{{ strategyShort(entry) }}</span>
              <span class="workspace-entry-meta">Order {{ entry.order }}</span>
              <span class="workspace-entry-meta">{{ positionShort(entry) }}</span>
            </div>
          </div>
        </div>
      </section>

      <section v-show="mobileTab === 'actions'" class="mobile-panel">
        <div class="workspace-action-grid mobile-action-grid">
          <button class="btn btn-sm" @click="selectByStrategy('constant')">🔵 常量</button>
          <button class="btn btn-sm" @click="selectByStrategy('selective')">🟢 可选</button>
          <button class="btn btn-sm" @click="selectByStrategy('vectorized')">🔗 向量</button>
          <button class="btn btn-sm" @click="showSmartDialog = 'keyword'">🔤 关键字</button>
          <button class="btn btn-sm" @click="showSmartDialog = 'uid-range'">🆔 区间</button>
          <button class="btn btn-sm" @click="toggleAll" :disabled="!filteredEntries.length">☑ 全选当前</button>
          <button class="btn btn-sm" @click="addEntry" :disabled="!selectedWorldbook">＋ 新建</button>
          <button class="btn btn-sm" @click="openBatchCreate" :disabled="!selectedWorldbook">＋＋ 批量</button>
          <button class="btn btn-sm" @click="duplicateSelected" :disabled="selectedUids.size === 0">📋 复制条目</button>
          <button class="btn btn-sm" @click="openWorldbookCopyDialog" :disabled="selectedWorldbooks.size === 0">📚 复制到目标书</button>
          <button class="btn btn-sm" @click="openMoveDialog('up')" :disabled="selectedUids.size === 0">⬆ 上移</button>
          <button class="btn btn-sm" @click="openMoveDialog('down')" :disabled="selectedUids.size === 0">⬇ 下移</button>
          <button class="btn btn-sm" @click="openReorderUidDialog" :disabled="selectedUids.size === 0 && !filteredEntries.length">UID 重排</button>
          <button class="btn btn-sm" @click="undoHistory" :disabled="!canUndo()">↩ 回退</button>
        </div>
        <div class="mobile-batch-wrap">
          <BatchMenu
            v-if="selectedWorldbook"
            :worldbook-name="selectedWorldbook"
            :selected-uids="Array.from(selectedUids)"
            @done="onBatchDone"
            @error="onError"
            @clear-selection="selectedUids.clear()"
            @batch-delete="batchDelete"
            @reorder-uids="reorderUidsByCurrentView"
            @refresh="loadWorldbook"
          />
        </div>
      </section>

      <section v-show="mobileTab === 'editor'" class="mobile-panel">
        <div class="mobile-editor-switch">
          <button class="btn btn-sm" @click="showPreview = false">基础编辑</button>
          <button class="btn btn-sm" @click="showPreview = true">正文预览</button>
          <button class="btn btn-sm" @click="openContentEditorFromCurrent" :disabled="!currentEntry">⛶ 正文全屏</button>
        </div>
        <div v-if="!currentEntry" class="panel-empty">先从条目列表里选一条喵~</div>
        <template v-else>
          <EntryEditor v-if="!showPreview" :entry="currentEntry" @update="onCurrentEntryUpdate" @cancel="currentEditUid = null" />
          <div v-else class="workspace-preview-card mobile-preview-card">
            <div class="workspace-preview-title">正文预览</div>
            <div class="preview">{{ currentEntry.content }}</div>
          </div>
        </template>
      </section>

      <div class="mobile-bottom-tabs">
        <button class="mobile-tab" :class="{ active: mobileTab === 'worldbooks' }" @click="mobileTab = 'worldbooks'">📚<span>世界书</span></button>
        <button class="mobile-tab" :class="{ active: mobileTab === 'entries' }" @click="mobileTab = 'entries'">🧾<span>条目</span></button>
        <button class="mobile-tab" :class="{ active: mobileTab === 'actions' }" @click="mobileTab = 'actions'">🧰<span>操作</span></button>
        <button class="mobile-tab" :class="{ active: mobileTab === 'editor' }" @click="mobileTab = 'editor'">✏️<span>编辑</span></button>
      </div>
    </div>

    <!-- Dialogs -->
    <div v-if="showCreateDialog" class="smart-dialog-overlay" @click.self="cancelCreate">
      <div class="smart-dialog">
        <h4>📖 新建世界书</h4>
        <div style="display:flex;gap:6px;margin-bottom:10px">
          <input v-model="newWbName" class="editor-input" placeholder="输入世界书名称..." maxlength="100" @keydown.enter="doCreateWorldbook" @keydown.esc="cancelCreate" ref="newWbInputRef" />
        </div>
        <div class="dialog-actions">
          <button class="btn btn-primary btn-sm" @click="doCreateWorldbook" :disabled="!newWbName.trim() || creating">{{ creating ? '⏳ 创建中...' : '✅ 创建' }}</button>
          <button class="btn btn-sm" @click="cancelCreate">取消</button>
        </div>
      </div>
    </div>

    <div v-if="showSmartDialog" class="smart-dialog-overlay" @click.self="showSmartDialog = ''">
      <div class="smart-dialog">
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

    <div v-if="showBatchCreateDialog" class="smart-dialog-overlay" @click.self="showBatchCreateDialog = false">
      <div class="smart-dialog">
        <h4>＋＋ 批量创建条目</h4>
        <div class="editor-row"><label class="editor-label">数量</label><input v-model.number="batchCreateCount" type="number" class="editor-input narrow" min="1" max="100" /></div>
        <div class="editor-row"><label class="editor-label">策略</label><select v-model="batchCreateStrategy" class="editor-select"><option value="constant">🔵 常量</option><option value="selective">🟢 可选</option><option value="vectorized">🔗 向量化</option></select></div>
        <div class="editor-row"><label class="editor-label">Order</label><input v-model.number="batchCreateOrder" type="number" class="editor-input narrow" /></div>
        <div class="editor-row"><label class="editor-label">位置</label><select v-model.number="batchCreatePosition" class="editor-select"><option :value="0">角色定义之前</option><option :value="1">角色定义之后</option><option :value="2">示例消息之前</option><option :value="3">示例消息之后</option><option :value="4">固定深度</option><option :value="5">作者注释之前</option><option :value="6">作者注释之后</option></select></div>
        <div class="editor-row"><label class="editor-label">关键字</label><input v-model="batchCreateKeys" class="editor-input" placeholder="逗号分隔，如：关键字1,关键字2" /></div>
        <div class="dialog-actions"><button class="btn btn-primary btn-sm" @click="doBatchCreate">✅ 创建</button><button class="btn btn-sm" @click="showBatchCreateDialog = false">取消</button></div>
      </div>
    </div>

    <div v-if="showMoveDialog" class="smart-dialog-overlay" @click.self="showMoveDialog = false">
      <div class="smart-dialog">
        <h4>{{ moveDirection === 'up' ? '⬆ 批量上移' : '⬇ 批量下移' }}</h4>
        <p style="font-size:12px;color:var(--text-muted)">已选 {{ selectedUids.size }} 条条目</p>
        <div class="editor-row"><label class="editor-label">移动步数</label><input v-model.number="moveSteps" type="number" class="editor-input narrow" min="1" max="9999" /></div>
        <div class="dialog-actions"><button class="btn btn-primary btn-sm" @click="doBatchMove">✅ 移动</button><button class="btn btn-sm" @click="showMoveDialog = false">取消</button></div>
      </div>
    </div>

    <div v-if="showUidDialog" class="smart-dialog-overlay" @click.self="showUidDialog = false">
      <div class="smart-dialog">
        <h4>🆔 按当前顺序重排 UID</h4>
        <p style="font-size:11px;color:var(--text-muted);margin-bottom:8px">
          从指定 UID 开始，按当前界面显示顺序依次分配。兼容当前排序/搜索/自定义顺序。
        </p>
        <div class="editor-row"><label class="editor-label">起始 UID</label><input v-model.number="uidStartFrom" type="number" class="editor-input narrow" min="0" /></div>
        <div class="dialog-actions"><button class="btn btn-primary btn-sm" @click="confirmReorderUids">✅ 重排</button><button class="btn btn-sm" @click="showUidDialog = false">取消</button></div>
      </div>
    </div>

    <div v-if="showCopyDialog" class="smart-dialog-overlay" @click.self="showCopyDialog = false">
      <div class="smart-dialog">
        <h4>📚 复制到目标世界书</h4>
        <p style="font-size:11px;color:var(--text-muted);margin-bottom:8px">从已勾选世界书中选择目标，可多选。</p>
        <div class="copy-mode-row">
          <label><input type="radio" v-model="copyMode" value="all" /> 复制到全部勾选目标</label>
          <label><input type="radio" v-model="copyMode" value="single" /> 只复制到一个目标</label>
        </div>
        <div class="workspace-wb-list compact-wb-list">
          <label v-for="wb in copyCandidateTargets" :key="wb" class="workspace-wb-item compact-selectable">
            <div class="workspace-wb-main">
              <input type="checkbox" :value="wb" v-model="copyTargetWorldbooks" :disabled="copyMode === 'single' && copyTargetWorldbooks.length > 0 && !copyTargetWorldbooks.includes(wb)" />
              <strong>{{ wb }}</strong>
            </div>
          </label>
        </div>
        <div class="dialog-actions"><button class="btn btn-primary btn-sm" @click="confirmCopyToTargets">✅ 复制</button><button class="btn btn-sm" @click="showCopyDialog = false">取消</button></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, nextTick, onMounted, onUnmounted } from "vue";
import EntryEditor from "./EntryEditor.vue";
import BatchMenu from "./BatchMenu.vue";
import type { RawEntry } from "../utils/worldbook";
import { cloneEntries, createBlankEntry } from "../utils/worldbook";
import {
  getWorldbook,
  saveWorldbook,
  addEntries,
  deleteEntries,
  exportWorldbookUrl,
  syncWorldbookToST,
  createWorldbook,
  deleteWorldbook,
  onWorldbookUpdate,
  offWorldbookUpdate,
  type SseCallback,
} from "../services/api";

const props = defineProps<{ worldbooks: string[] }>();
const emit = defineEmits<{
  (e: "dirty", isDirty: boolean): void;
  (e: "status", message: string, type?: "success" | "error" | "info"): void;
  (e: "refresh-worldbooks"): void;
}>();

const selectedWorldbook = ref("");
let _prevWorldbook = "";
const selectedWorldbooks = reactive(new Set<string>());
const currentEditUid = ref<number | null>(null);
const localEntries = ref<RawEntry[]>([]);
const loading = ref(false);
const searchQuery = ref("");
const searchMode = ref("all");
const selectedUids = reactive(new Set<number>());
const isDirty = ref(false);
const showPreview = ref(false);
const wbSearchQuery = ref("");
const wbPoolOpen = ref(false);
const sortMode = ref("custom");
const footerExpanded = ref(true);
const isMobile = ref(typeof window !== "undefined" ? window.innerWidth < 767 : false);
const mobileTab = ref<"worldbooks" | "entries" | "actions" | "editor">("worldbooks");
const mobileEntryMode = ref<"select" | "edit">("select");
const wbModuleOpen = ref(true);
const entryModuleOpen = ref(true);
const actionModuleOpen = ref(true);
const showSmartDialog = ref("");
const smartKeyword = ref("");
const smartUidFrom = ref<number | null>(null);
const smartUidTo = ref<number | null>(null);
const showBatchCreateDialog = ref(false);
const batchCreateCount = ref(5);
const batchCreateStrategy = ref("selective");
const batchCreateOrder = ref(100);
const batchCreatePosition = ref(0);
const batchCreateKeys = ref("");
const showMoveDialog = ref(false);
const moveDirection = ref<"up" | "down">("up");
const moveSteps = ref(1);
const showUidDialog = ref(false);
const uidStartFrom = ref(0);
const showCopyDialog = ref(false);
const copyTargetWorldbooks = ref<string[]>([]);
const copyMode = ref<"all" | "single">("all");
const showCreateDialog = ref(false);
const newWbName = ref("");
const creating = ref(false);
const newWbInputRef = ref<HTMLInputElement | null>(null);
const importFileRef = ref<HTMLInputElement | null>(null);
const entryEditorRef = ref<InstanceType<typeof EntryEditor> | null>(null);

interface UndoEntry { snapshot: RawEntry[] }
const historyMap = reactive(new Map<string, RawEntry[][]>());
const MAX_HISTORY = 10;

const searchModes = [
  { id: "all", label: "全部" },
  { id: "title", label: "标题" },
  { id: "keyword", label: "关键字" },
  { id: "content", label: "内容" },
];

const searchPlaceholder = computed(() => {
  const m: Record<string, string> = {
    all: "搜索标题、关键字、内容...",
    title: "搜索条目标题...",
    keyword: "搜索主要/次要关键字...",
    content: "搜索条目正文内容...",
  };
  return m[searchMode.value] ?? "搜索...";
});

const exportUrl = computed(() => selectedWorldbook.value ? exportWorldbookUrl(selectedWorldbook.value) : "#");

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
    if ((mode === "title" || mode === "all") && (e.comment || "").toLowerCase().includes(q)) return true;
    if (mode === "keyword" || mode === "all") {
      if (e.key.some((k) => k.toLowerCase().includes(q))) return true;
      if ((e.keysecondary || []).some((k: string) => k.toLowerCase().includes(q))) return true;
    }
    if ((mode === "content" || mode === "all") && (e.content || "").toLowerCase().includes(q)) return true;
    return false;
  });
});

const currentEntry = computed(() => localEntries.value.find((e) => e.uid === currentEditUid.value) || null);
const allSelected = computed(() => filteredEntries.value.length > 0 && filteredEntries.value.every((e) => selectedUids.has(e.uid)));
const copyCandidateTargets = computed(() => props.worldbooks.filter((wb) => wb !== selectedWorldbook.value));
const entrySelectionSummary = computed(() => `已选 ${selectedUids.size} / 当前 ${filteredEntries.value.length}`);

function toggleWorldbookCheck(wb: string) {
  if (selectedWorldbooks.has(wb)) selectedWorldbooks.delete(wb);
  else selectedWorldbooks.add(wb);
}

function handleResize() {
  isMobile.value = window.innerWidth < 767;
}

function pushHistory() {
  if (!selectedWorldbook.value || localEntries.value.length === 0) return;
  const key = selectedWorldbook.value;
  if (!historyMap.has(key)) historyMap.set(key, []);
  const stack = historyMap.get(key)!;
  stack.push(cloneEntries(localEntries.value));
  if (stack.length > MAX_HISTORY) stack.shift();
}

function canUndo() {
  const stack = historyMap.get(selectedWorldbook.value);
  return !!stack && stack.length > 0;
}

function undoHistory() {
  const stack = historyMap.get(selectedWorldbook.value);
  if (!stack || stack.length === 0) return;
  localEntries.value = stack.pop()!;
  markDirty();
  emit("status", `已回退到上一步喵~ ↩（还剩 ${stack.length} 步历史）`, "info");
}

function markDirty() {
  isDirty.value = true;
  emit("dirty", true);
}

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

async function loadWorldbook() {
  if (!selectedWorldbook.value) {
    localEntries.value = [];
    currentEditUid.value = null;
    return;
  }
  loading.value = true;
  selectedUids.clear();
  try {
    const res = await getWorldbook(selectedWorldbook.value);
    if (res.success && res.data) {
      localEntries.value = cloneEntries(res.data.entries);
      applySortMode();
      _prevWorldbook = selectedWorldbook.value;
      currentEditUid.value = localEntries.value[0]?.uid ?? null;
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

async function selectWorldbook(wb: string) {
  if (selectedWorldbook.value === wb) {
    if (selectedWorldbooks.has(wb)) selectedWorldbooks.delete(wb);
    else selectedWorldbooks.add(wb);
    return;
  }
  if (isDirty.value) {
    const action = window.confirm("当前有未保存的修改，是否放弃修改并切换？\n点击「确定」放弃修改，点击「取消」留在当前页面。");
    if (!action) return;
    isDirty.value = false;
    emit("dirty", false);
  }
  selectedWorldbook.value = wb;
  selectedWorldbooks.add(wb);
  wbPoolOpen.value = false;
  await loadWorldbook();
  if (isMobile.value) mobileTab.value = "entries";
}

function toggleSelect(uid: number) {
  selectedUids.has(uid) ? selectedUids.delete(uid) : selectedUids.add(uid);
}

function openEntryEditor(uid: number) {
  currentEditUid.value = uid;
  if (isMobile.value) mobileTab.value = "editor";
}

function handleEntryCardClick(uid: number) {
  toggleSelect(uid);
}

function handleMobileEntryClick(uid: number) {
  if (mobileEntryMode.value === "edit") {
    openEntryEditor(uid);
    return;
  }
  toggleSelect(uid);
}

function toggleAll() {
  if (allSelected.value) filteredEntries.value.forEach((e) => selectedUids.delete(e.uid));
  else filteredEntries.value.forEach((e) => selectedUids.add(e.uid));
}

function selectByStrategy(type: "constant" | "selective" | "vectorized") {
  selectedUids.clear();
  localEntries.value.forEach((e) => {
    const match =
      (type === "constant" && e.constant) ||
      (type === "selective" && e.selective && !e.constant) ||
      (type === "vectorized" && e.vectorized);
    if (match) selectedUids.add(e.uid);
  });
  emit("status", `喵~已选中 ${selectedUids.size} 条条目~ ✅`, "info");
}

function selectByKeyword() {
  const q = smartKeyword.value.toLowerCase().trim();
  if (!q) return;
  selectedUids.clear();
  localEntries.value.forEach((e) => {
    const inKey = e.key.some((k) => k.toLowerCase().includes(q));
    const inKey2 = (e.keysecondary || []).some((k: string) => k.toLowerCase().includes(q));
    const inTitle = (e.comment || "").toLowerCase().includes(q);
    if (inKey || inKey2 || inTitle) selectedUids.add(e.uid);
  });
  emit("status", `喵~已按关键字选中 ${selectedUids.size} 条~ ✅`, "info");
  showSmartDialog.value = "";
  smartKeyword.value = "";
}

function selectByUidRange() {
  const from = smartUidFrom.value;
  const to = smartUidTo.value;
  if (from === null || to === null || isNaN(from) || isNaN(to)) return;
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  selectedUids.clear();
  localEntries.value.forEach((e) => {
    if (e.uid >= lo && e.uid <= hi) selectedUids.add(e.uid);
  });
  emit("status", `喵~已按区间选中 ${selectedUids.size} 条~ ✅`, "info");
  showSmartDialog.value = "";
  smartUidFrom.value = null;
  smartUidTo.value = null;
}

function addEntry() {
  const maxUid = localEntries.value.reduce((m, e) => Math.max(m, e.uid), -1);
  const newEntry = createBlankEntry(maxUid + 1);
  localEntries.value.push(newEntry);
  currentEditUid.value = newEntry.uid;
  markDirty();
  if (isMobile.value) mobileTab.value = "editor";
}

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
    position: batchCreatePosition.value as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    key: keys,
  };
  showBatchCreateDialog.value = false;
  const overrides = Array.from({ length: count }, () => ({ ...template }));
  const res = await addEntries(selectedWorldbook.value, overrides);
  if (res.success) {
    await loadWorldbook();
    await syncWorldbookToST(selectedWorldbook.value, localEntries.value);
    emit("status", `已创建 ${count} 条条目`, "success");
  } else {
    emit("status", `批量创建失败：${res.message}`, "error");
  }
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
  const selected: RawEntry[] = [];
  const rest: RawEntry[] = [];
  const selPositions: number[] = [];
  all.forEach((e, i) => {
    if (selSet.has(e.uid)) { selected.push(e); selPositions.push(i); }
    else rest.push(e);
  });
  if (selected.length === 0) return;
  const anchorIdx = moveDirection.value === "up"
    ? Math.max(0, selPositions[0] - steps)
    : Math.min(all.length - selected.length, selPositions[selPositions.length - 1] - selected.length + 1 + steps);
  rest.splice(anchorIdx, 0, ...selected);
  localEntries.value = rest;
  markDirty();
  emit("status", `已${moveDirection.value === "up" ? "上" : "下"}移 ${selected.length} 条 ${steps} 步`, "success");
}

function openReorderUidDialog() {
  uidStartFrom.value = 0;
  showUidDialog.value = true;
}

function confirmReorderUids() {
  showUidDialog.value = false;
  reorderUidsByCurrentView(uidStartFrom.value);
}

function reorderUidsByCurrentView(startFrom: number) {
  if (!selectedWorldbook.value) return;
  const targets = selectedUids.size > 0 ? filteredEntries.value.filter((e) => selectedUids.has(e.uid)) : [...filteredEntries.value];
  if (targets.length === 0) {
    emit("status", "没有可重排的条目", "info");
    return;
  }
  const hasFilter = !!searchQuery.value.trim();
  if (hasFilter && selectedUids.size === 0) {
    const ok = window.confirm(`当前存在搜索/过滤，仅会按当前可见顺序重排 ${targets.length} 条。\n继续吗？`);
    if (!ok) return;
  }
  const orderedOldUids = targets.map((e) => e.uid);
  const targetUidSet = new Set(orderedOldUids);
  const occupied = new Set(localEntries.value.filter((e) => !targetUidSet.has(e.uid)).map((e) => e.uid));
  const uidMap = new Map<number, number>();
  let cur = Math.max(0, startFrom);
  for (const oldUid of orderedOldUids) {
    while (occupied.has(cur)) cur++;
    uidMap.set(oldUid, cur);
    occupied.add(cur);
    cur++;
  }
  localEntries.value = localEntries.value.map((entry) => {
    const newUid = uidMap.get(entry.uid);
    return newUid === undefined ? entry : { ...entry, uid: newUid, displayIndex: newUid };
  });
  selectedUids.clear();
  for (const newUid of uidMap.values()) selectedUids.add(newUid);
  applySortMode();
  markDirty();
  emit("status", `已按当前显示顺序重排 ${uidMap.size} 条 UID（从 ${startFrom} 开始）`, "success");
}

function openWorldbookCopyDialog() {
  copyTargetWorldbooks.value = [];
  copyMode.value = "all";
  showCopyDialog.value = true;
}

async function confirmCopyToTargets() {
  if (copyTargetWorldbooks.value.length === 0) {
    emit("status", "请选择至少一个目标世界书", "error");
    return;
  }
  const finalTargets = copyMode.value === "single" ? copyTargetWorldbooks.value.slice(0, 1) : copyTargetWorldbooks.value;
  const sources = Array.from(selectedWorldbooks.size ? selectedWorldbooks : (selectedWorldbook.value ? new Set([selectedWorldbook.value]) : new Set<string>()));
  if (sources.length === 0) {
    emit("status", "请先勾选至少一个源世界书", "error");
    return;
  }
  showCopyDialog.value = false;
  try {
    for (const src of sources) {
      const res = await getWorldbook(src);
      if (!res.success || !res.data) continue;
      for (const target of finalTargets) {
        if (target === src) continue;
        await createWorldbook(target, res.data.entries);
      }
    }
    emit("refresh-worldbooks");
    emit("status", `已复制 ${sources.length} 本世界书到 ${finalTargets.length} 个目标`, "success");
  } catch (e) {
    emit("status", `复制世界书失败：${(e as Error).message}`, "error");
  }
}

async function importFromFile(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  input.value = "";
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const entries = data.entries;
    if (!entries) { emit("status", "JSON 格式无效：缺少 entries", "error"); return; }
    const rawList = Array.isArray(entries) ? entries : Object.values(entries);
    const list: RawEntry[] = rawList.filter((e: any) => e && typeof e === "object" && typeof e.content === "string");
    const wbName = selectedWorldbook.value || file.name.replace(/\.json$/i, "");
    if (!selectedWorldbook.value) {
      const res = await createWorldbook(wbName, list);
      if (!res.success) { emit("status", `导入失败：${res.message}`, "error"); return; }
      emit("refresh-worldbooks");
      await nextTick();
      selectedWorldbook.value = wbName;
    }
    await loadWorldbook();
    localEntries.value = list.map((e, i) => ({ ...createBlankEntry(i), ...e, uid: e.uid ?? i, displayIndex: i }));
    markDirty();
    emit("status", `已导入 ${list.length} 条条目（请保存以生效）`, "success");
  } catch (e) {
    emit("status", `导入失败：${(e as Error).message}`, "error");
  }
}

function triggerImport() {
  importFileRef.value?.click();
}

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
    emit("refresh-worldbooks");
    await nextTick();
    selectedWorldbook.value = name;
    await loadWorldbook();
    emit(
      "status",
      res.data?.created ? `喵~已新建世界书「${name}」~ 📖` : `喵~已覆盖世界书「${name}」~ 📖`,
      "success"
    );
  } catch (e) {
    emit("status", `呜喵新建出错了：${(e as Error).message} 😿`, "error");
  }
  creating.value = false;
}

async function duplicateWorldbook() {
  const src = selectedWorldbook.value;
  if (!src) return;
  const newName = window.prompt(`将「${src}」复制为：`, `${src} (副本)`);
  if (!newName || !newName.trim()) return;
  try {
    const res = await getWorldbook(src);
    if (!res.success || !res.data) { emit("status", "读取世界书失败", "error"); return; }
    const createRes = await createWorldbook(newName.trim(), res.data.entries);
    if (!createRes.success) { emit("status", `复制失败：${createRes.message}`, "error"); return; }
    emit("refresh-worldbooks");
    emit("status", `已复制「${src}」→「${newName.trim()}」`, "success");
  } catch (e) {
    emit("status", `复制失败：${(e as Error).message}`, "error");
  }
}

async function renameWorldbook() {
  const oldName = selectedWorldbook.value;
  if (!oldName) return;
  const newName = window.prompt(`将「${oldName}」重命名为：`, oldName);
  if (!newName || newName.trim() === oldName) return;
  try {
    const res = await getWorldbook(oldName);
    if (!res.success || !res.data) { emit("status", "读取世界书失败", "error"); return; }
    const createRes = await createWorldbook(newName.trim(), res.data.entries);
    if (!createRes.success) { emit("status", `创建失败：${createRes.message}`, "error"); return; }
    await deleteWorldbook(oldName);
    await syncWorldbookToST(newName.trim(), res.data.entries);
    emit("refresh-worldbooks");
    await nextTick();
    selectedWorldbook.value = newName.trim();
    await loadWorldbook();
    emit("status", `已重命名「${oldName}」→「${newName.trim()}」`, "success");
  } catch (e) {
    emit("status", `重命名失败：${(e as Error).message}`, "error");
  }
}

async function confirmDeleteWorldbook() {
  const name = selectedWorldbook.value;
  if (!name) return;
  if (!window.confirm(`确定要删除世界书「${name}」吗？此操作无法撤销！`)) return;
  try {
    const res = await deleteWorldbook(name);
    if (res.success) {
      selectedWorldbook.value = "";
      localEntries.value = [];
      currentEditUid.value = null;
      isDirty.value = false;
      emit("dirty", false);
      emit("refresh-worldbooks");
      emit("status", `已删除世界书「${name}」`, "success");
    } else {
      emit("status", `删除失败：${res.message}`, "error");
    }
  } catch (e) {
    emit("status", `删除失败：${(e as Error).message}`, "error");
  }
}

const _skipNextSse = ref(false);
const sseHandler: SseCallback = async (data) => {
  if (!data.name) return;
  if (_skipNextSse.value) { _skipNextSse.value = false; return; }
  if (data.name === selectedWorldbook.value && !isDirty.value) {
    await loadWorldbook();
  }
};

onMounted(() => {
  onWorldbookUpdate(sseHandler);
  window.addEventListener("resize", handleResize);
  handleResize();
});

onUnmounted(() => {
  offWorldbookUpdate(sseHandler);
  window.removeEventListener("resize", handleResize);
});

async function save(): Promise<boolean> {
  if (!selectedWorldbook.value || !isDirty.value) return false;
  pushHistory();
  const uids = localEntries.value.map((e) => e.uid);
  const dupUids = [...new Set(uids.filter((uid, i) => uids.indexOf(uid) !== i))];
  if (dupUids.length > 0) {
    const fix = window.confirm(`发现重复 UID：${dupUids.join(", ")}，是否自动修正？`);
    if (!fix) {
      emit("status", `请先修正重复 UID：${dupUids.join(", ")}`, "error");
      return false;
    }
    const seen = new Set<number>();
    let maxUid = Math.max(...uids, 0);
    for (const e of localEntries.value) {
      if (seen.has(e.uid)) {
        maxUid++;
        e.uid = maxUid;
        e.displayIndex = maxUid;
      }
      seen.add(e.uid);
    }
  }
  const res = await saveWorldbook(selectedWorldbook.value, localEntries.value);
  if (!res.success) {
    emit("status", `保存失败：${res.message}`, "error");
    return false;
  }
  isDirty.value = false;
  emit("dirty", false);
  _skipNextSse.value = true;
  await syncWorldbookToST(selectedWorldbook.value, localEntries.value);
  emit("status", `保存成功（"${selectedWorldbook.value}"，${localEntries.value.length} 条）`, "success");
  try { window.parent.postMessage("wbm-saved", "*"); } catch {}
  return true;
}

function onCurrentEntryUpdate(updated: RawEntry) {
  const idx = localEntries.value.findIndex((e) => e.uid === updated.uid || e.uid === currentEditUid.value);
  if (idx !== -1) {
    localEntries.value[idx] = updated;
    currentEditUid.value = updated.uid;
    markDirty();
  }
}

function strategyShort(entry: RawEntry) {
  if (entry.constant) return "🔵";
  if (entry.selective) return "🟢";
  return "🔗";
}

function positionShort(entry: RawEntry) {
  const map: Record<number, string> = { 0: "BC", 1: "AC", 2: "BE", 3: "AE", 4: "@D", 5: "BN", 6: "AN" };
  return map[entry.position] ?? "?";
}

function openContentEditorFromCurrent() {
  const editor = document.querySelector('.entry-editor .content-expand-btn, .entry-editor .editor-toolbar button') as HTMLButtonElement | null;
  editor?.click();
}

function onBatchDone(msg: string) {
  emit("status", msg, "success");
  loadWorldbook();
}

function onError(msg: string) {
  emit("status", msg, "error");
}

async function batchDelete() {
  if (!selectedWorldbook.value || selectedUids.size === 0) return;
  if (!window.confirm(`确定删除已选的 ${selectedUids.size} 条条目吗？`)) return;
  const res = await deleteEntries(selectedWorldbook.value, Array.from(selectedUids));
  if (res.success) {
    selectedUids.clear();
    await loadWorldbook();
    markDirty();
    emit("status", `已删除 ${res.data?.count ?? 0} 条条目`, "success");
  } else {
    emit("status", `删除失败：${res.message}`, "error");
  }
}

defineExpose({ save });
</script>

<style scoped>
.entry-selection-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 8px 0 10px;
  flex-wrap: wrap;
}

.entry-selection-summary {
  font-size: 12px;
  color: var(--text-muted, #93a0c3);
}

.workspace-entry-item {
  cursor: pointer;
}

.workspace-entry-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.workspace-entry-title {
  flex: 1 1 auto;
  min-width: 0;
}

.entry-action-btn {
  flex: 0 0 auto;
  min-height: 32px;
  padding: 6px 10px;
  border: 1px solid var(--border, #334155);
  border-radius: 8px;
  background: var(--bg-input, rgba(16, 24, 39, 0.92));
  color: var(--text, #e8ecf8);
  font-size: 12px;
  line-height: 1;
}

.entry-action-btn:hover {
  border-color: var(--accent, #7c9cff);
}

.mobile-entry-mode-toggle {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.mobile-entry-mode-toggle .btn.active {
  border-color: var(--accent, #7c9cff);
  box-shadow: inset 0 0 0 1px var(--accent, #7c9cff);
}

.workspace-action-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.workspace-action-grid .btn {
  min-height: 38px;
  width: 100%;
  justify-content: center;
}

.ghost-btn {
  min-height: 32px;
}

.mobile-entry-check {
  margin-right: 2px;
}

.mobile-action-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.mobile-editor-switch {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

@media (max-width: 1024px) {
  .workspace-action-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .entry-selection-toolbar {
    align-items: stretch;
  }

  .entry-selection-toolbar > * {
    width: 100%;
  }

  .workspace-entry-top {
    align-items: flex-start;
  }

  .entry-action-btn {
    min-width: 52px;
  }

  .mobile-editor-switch {
    grid-template-columns: 1fr;
  }
}
</style>
