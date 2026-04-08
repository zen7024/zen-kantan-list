// ==========================================
//  かんたんリスト v2.2 - script.js
//  新機能: 予定日登録 & 本日買うもの表示
// ==========================================

// ---------- データ ----------
let shoppingItems = [];
let categories = [];
let favorites = [];
let history = [];
let currentFilter = '全て';

const DEFAULT_CATEGORIES = [
    { icon: '🏪', name: 'マックスバリュー' },
    { icon: '🏪', name: 'オークワ' },
    { icon: '🏪', name: 'イオン' },
    { icon: '🏪', name: 'セブンイレブン' },
    { icon: '📦', name: 'その他' }
];



// ---------- 日付ユーティリティ ----------
function getTodayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const today = getTodayString();
    if (dateStr === today) return '今日';
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ---------- 🌅 本日買うもの バナー ----------
function renderTodayBanner() {
    const today = getTodayString();
    const todayItems = shoppingItems.filter(i => i.scheduledDate === today && !i.completed);
    const banner = document.getElementById('todayBanner');
    const listEl = document.getElementById('todayItemsList');
    const countEl = document.getElementById('todayCount');

    if (todayItems.length === 0) {
        banner.style.display = 'none';
        return;
    }

    banner.style.display = 'block';
    countEl.textContent = `${todayItems.length}個`;
    listEl.innerHTML = todayItems.map(item => {
        const cat = categories.find(c => c.name === item.category);
        const icon = cat ? cat.icon : '📦';
        return `<span class="today-chip">${icon} ${item.text}</span>`;
    }).join('');
}

// ---------- カテゴリ ----------
function renderCategories() {
    // ドロップダウン
    const sel = document.getElementById('categorySelect');
    sel.innerHTML = categories.map(c =>
        `<option value="${c.name}">${c.icon} ${c.name}</option>`
    ).join('');

    // フィルターボタン
    const filterDiv = document.getElementById('filterButtons');
    filterDiv.innerHTML =
        `<button class="filter-btn ${currentFilter === '全て' ? 'active' : ''}" data-filter="全て">全て</button>` +
        categories.map(c =>
            `<button class="filter-btn ${currentFilter === c.name ? 'active' : ''}" data-filter="${c.name}">${c.icon} ${c.name}</button>`
        ).join('');

    filterDiv.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            renderCategories();
            renderShoppingList();
        });
    });

    // 設定タブのリスト
    const catList = document.getElementById('categoriesList');
    catList.innerHTML = categories.map((c, i) =>
        `<li class="category-item">
            <div class="category-item-info">
                <span class="category-item-icon">${c.icon}</span>
                <span class="category-item-name">${c.name}</span>
            </div>
            <button class="btn-delete-category" data-index="${i}">削除</button>
        </li>`
    ).join('');

    catList.querySelectorAll('.btn-delete-category').forEach(btn => {
        btn.addEventListener('click', () => {   
            backupBeforeWrite();
            categories.splice(parseInt(btn.dataset.index), 1);
            save('categories', categories);
            renderCategories();
            renderShoppingList();
        });
    });
}

// ---------- 買い物リスト ----------
function renderShoppingList() {
    const list = document.getElementById('shoppingList');
    const emptyMsg = document.getElementById('emptyList');
    const today = getTodayString();

    const filtered = currentFilter === '全て'
        ? shoppingItems
        : shoppingItems.filter(i => i.category === currentFilter);

    if (filtered.length === 0) {
        emptyMsg.style.display = 'block';
        list.innerHTML = '';
        updateCompletedCount();
        return;
    }

    emptyMsg.style.display = 'none';

    list.innerHTML = filtered.map(item => {
        const cat = categories.find(c => c.name === item.category);
        const icon = cat ? cat.icon : '📦';
        const isToday = item.scheduledDate === today;
        const isFuture = item.scheduledDate && item.scheduledDate > today;

        // 日付バッジ
        let dateBadge = '';
        if (item.scheduledDate) {
            if (isToday) {
                dateBadge = `<span class="date-badge date-today">📅 今日</span>`;
            } else if (isFuture) {
                dateBadge = `<span class="date-badge date-future">📅 ${formatDateLabel(item.scheduledDate)}</span>`;
            } else {
                dateBadge = `<span class="date-badge date-past">📅 ${formatDateLabel(item.scheduledDate)}</span>`;
            }
        }

        return `<li class="list-item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
            <input type="checkbox" class="item-checkbox" ${item.completed ? 'checked' : ''} data-id="${item.id}">
            <div class="item-main">
                <span class="item-text">${item.text}</span>
                <span class="category-badge">${icon} ${item.category}</span>
                ${dateBadge}
            </div>
            <div class="item-actions">
                <button class="btn-favorite" data-id="${item.id}" title="お気に入りに追加">⭐</button>
                <button class="btn-delete-item" data-id="${item.id}" title="削除">🗑️</button>
            </div>
        </li>`;
    }).join('');

    // チェックボックス
    list.querySelectorAll('.item-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            const item = shoppingItems.find(i => i.id === parseInt(cb.dataset.id));
            if (item) {
                backupBeforeWrite();
                item.completed = cb.checked;
                if (cb.checked) addToHistory(item);
                save('shoppingItems', shoppingItems);
                renderShoppingList();
                renderTodayBanner();
            }
        });
    });

    // 削除
    list.querySelectorAll('.btn-delete-item').forEach(btn => {
        btn.addEventListener('click', () => {
            backupBeforeWrite();
            shoppingItems = shoppingItems.filter(i => i.id !== parseInt(btn.dataset.id));
            save('shoppingItems', shoppingItems);
            renderShoppingList();
            renderTodayBanner();
        });
    });

    // お気に入り追加
    list.querySelectorAll('.btn-favorite').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = shoppingItems.find(i => i.id === parseInt(btn.dataset.id));
            if (item && !favorites.find(f => f.text === item.text && f.category === item.category)) {
                favorites.push({ text: item.text, category: item.category });
                save('favorites', favorites);
                renderFavorites();
                showToast('⭐ お気に入りに追加しました');
            }
        });
    });

    updateCompletedCount();
}

function updateCompletedCount() {
    const count = shoppingItems.filter(i => i.completed).length;
    document.getElementById('completedCount').textContent = `✅ 買った: ${count}個`;
}

// ---------- アイテム追加 ----------
function addItem() {
    const input = document.getElementById('itemInput');
    const sel   = document.getElementById('categorySelect');
    const dateEl = document.getElementById('scheduledDateInput');

    const text = input.value.trim();
    if (!text) {
        input.focus();
        return;
    }

    const newItem = {
        id: Date.now(),
        text: text,
        category: sel.value,
        completed: false,
        createdAt: new Date().toISOString(),
        scheduledDate: dateEl.value || null   // 新フィールド：予定日
    };
    
    backupBeforeWrite();
    shoppingItems.push(newItem);
    save('shoppingItems', shoppingItems);

    input.value = '';
    dateEl.value = '';
    input.focus();

    renderShoppingList();
    renderTodayBanner();
}

// ---------- 履歴 ----------
function addToHistory(item) {
    history.unshift({
        text: item.text,
        category: item.category,
        completedAt: new Date().toISOString()
    });
    if (history.length > 100) history.pop();
    save('history', history);
    renderHistory();
}

function renderHistory() {
    const listEl   = document.getElementById('historyList');
    const emptyEl  = document.getElementById('emptyHistory');

    if (history.length === 0) {
        emptyEl.style.display = 'block';
        listEl.innerHTML = '';
        return;
    }

    emptyEl.style.display = 'none';
    listEl.innerHTML = history.map(item => {
        const d = new Date(item.completedAt);
        const dateStr = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
        const cat = categories.find(c => c.name === item.category);
        const icon = cat ? cat.icon : '📦';
        return `<div class="history-item">
            <span class="history-text">${icon} ${item.text}</span>
            <span class="history-date">${dateStr}</span>
        </div>`;
    }).join('');
}

// ---------- お気に入り ----------
function renderFavorites() {
    const list   = document.getElementById('favoritesList');
    const emptyEl = document.getElementById('emptyFavorites');

    if (favorites.length === 0) {
        emptyEl.style.display = 'block';
        list.innerHTML = '';
        return;
    }

    emptyEl.style.display = 'none';
    list.innerHTML = favorites.map((fav, i) => {
        const cat = categories.find(c => c.name === fav.category);
        const icon = cat ? cat.icon : '📦';
        return `<li class="favorite-item">
            <div class="favorite-item-name">${icon} ${fav.text}</div>
            <div class="favorite-item-category">${fav.category}</div>
            <div class="favorite-actions">
                <button class="btn-add-fav" data-index="${i}" title="リストに追加">➕ 追加</button>
                <button class="btn-remove-favorite" data-index="${i}" title="削除">🗑️</button>
            </div>
        </li>`;
    }).join('');

    list.querySelectorAll('.btn-add-fav').forEach(btn => {
        btn.addEventListener('click', () => {
            const fav = favorites[parseInt(btn.dataset.index)];
            shoppingItems.push({
                id: Date.now(),
                text: fav.text,
                category: fav.category,
                completed: false,
                createdAt: new Date().toISOString(),
                scheduledDate: null
            });
            save('shoppingItems', shoppingItems);
            renderShoppingList();
            renderTodayBanner();
            switchTab('shopping');
            showToast('📋 買い物リストに追加しました');
        });
    });

    list.querySelectorAll('.btn-remove-favorite').forEach(btn => {
        btn.addEventListener('click', () => {
            favorites.splice(parseInt(btn.dataset.index), 1);
            save('favorites', favorites);
            renderFavorites();
        });
    });
}

// ---------- タブ切替 ----------
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.toggle('active', tab.id === tabName + '-tab');
    });
}

// ---------- トースト通知 ----------
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

// ---------- 初期化 ----------
document.addEventListener('DOMContentLoaded', () => {
    const loaded = loadData(DEFAULT_CATEGORIES);
    shoppingItems = loaded.shoppingItems;
    categories = loaded.categories;
    favorites = loaded.favorites;
    history = loaded.history;

    // タブ切替
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 追加ボタン
    document.getElementById('addBtn').addEventListener('click', addItem);

    // Enterキー
    document.getElementById('itemInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') addItem();
    });

    // 履歴消去
    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
        if (confirm('履歴をすべて消去しますか？')) {
            history = [];
            save('history', history);
            renderHistory();
        }
    });

    // デフォルトに戻す
    document.getElementById('resetCategoriesBtn').addEventListener('click', () => {
        if (confirm('カテゴリをデフォルトに戻しますか？')) {
            categories = [...DEFAULT_CATEGORIES];
            save('categories', categories);
            renderCategories();
            renderShoppingList();
        }
    });

    // カテゴリ追加
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
        const name  = document.getElementById('categoryNameInput').value.trim();
        const emoji = document.getElementById('categoryEmojiInput').value.trim() || '🏪';
        if (name) {
            categories.push({ icon: emoji, name: name });
            save('categories', categories);
            document.getElementById('categoryNameInput').value = '';
            document.getElementById('categoryEmojiInput').value = '';
            renderCategories();
        }
    });

    // 初回レンダリング
    renderTodayBanner();
    renderCategories();
    renderShoppingList();
    renderFavorites();
    renderHistory();
});

document.addEventListener("DOMContentLoaded", () => {
  initInventoryMiniUI();
});

function initInventoryMiniUI() {
  if (typeof ensureInventoryStorageInitialized !== "function") {
    console.error("inventoryStorage.js が読み込まれていません。");
    return;
  }

  ensureInventoryStorageInitialized();

  const form = document.getElementById("inventoryForm");
  const refreshBtn = document.getElementById("inventoryRefreshBtn");
  const resetBtn = document.getElementById("inventoryFormResetBtn");
  const lowStockOnly = document.getElementById("inventoryLowStockOnly");
  const list = document.getElementById("inventoryList");

  if (!form || !refreshBtn || !resetBtn || !lowStockOnly || !list) {
    return;
  }

  form.addEventListener("submit", handleInventoryFormSubmit);
  refreshBtn.addEventListener("click", renderInventoryList);
  resetBtn.addEventListener("click", resetInventoryForm);
  lowStockOnly.addEventListener("change", renderInventoryList);

  list.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn) return;

    const itemId = actionBtn.dataset.id;
    const action = actionBtn.dataset.action;
    if (!itemId || !action) return;

    const targetItem = getInventoryItemById(itemId);
    if (!targetItem) {
      showInventoryMessage("対象の在庫が見つかりませんでした。", "error");
      renderInventoryList();
      return;
    }

    if (action === "delete") {
      const ok = window.confirm(`「${targetItem.name}」を削除しますか？`);
      if (!ok) return;

      deleteInventoryItem(itemId);
      showInventoryMessage(`「${targetItem.name}」を削除しました。`, "success");
      renderInventoryList();
      return;
    }

    if (action === "plus") {
      updateInventoryItem(itemId, {
        quantity: Number(targetItem.quantity) + 1
      });
      showInventoryMessage(`「${targetItem.name}」の数量を +1 しました。`, "success");
      renderInventoryList();
      return;
    }

    if (action === "minus") {
      const nextQuantity = Math.max(0, Number(targetItem.quantity) - 1);
      updateInventoryItem(itemId, { quantity: nextQuantity });
      showInventoryMessage(`「${targetItem.name}」の数量を -1 しました。`, "success");
      renderInventoryList();
      return;
    }

    if (action === "edit") {
      openInventoryEditPrompt(itemId);
    }
  });

  renderInventoryList();
}

function handleInventoryFormSubmit(event) {
  event.preventDefault();

  const name = document.getElementById("inventoryName").value.trim();
  const quantity = Number(document.getElementById("inventoryQuantity").value);
  const unit = document.getElementById("inventoryUnit").value.trim() || "個";
  const category = document.getElementById("inventoryCategory").value.trim();
  const location = document.getElementById("inventoryLocation").value.trim();
  const minStock = Number(document.getElementById("inventoryMinStock").value);
  const memo = document.getElementById("inventoryMemo").value.trim();

  if (!name) {
    showInventoryMessage("品名を入力してください。", "error");
    return;
  }

  addInventoryItem({
    name,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    unit,
    category,
    location,
    minStock: Number.isFinite(minStock) ? minStock : 0,
    memo
  });

  showInventoryMessage(`「${name}」を追加しました。`, "success");
  resetInventoryForm();
  renderInventoryList();
}

function resetInventoryForm() {
  document.getElementById("inventoryForm").reset();
  document.getElementById("inventoryQuantity").value = 1;
  document.getElementById("inventoryUnit").value = "個";
  document.getElementById("inventoryMinStock").value = 0;
}

function renderInventoryList() {
  const list = document.getElementById("inventoryList");
  const summary = document.getElementById("inventorySummary");
  const lowStockOnly = document.getElementById("inventoryLowStockOnly");

  if (!list || !summary || !lowStockOnly) return;

  let items = getInventoryItems();

  items.sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  if (lowStockOnly.checked) {
    items = items.filter((item) => item.quantity <= item.minStock);
  }

  summary.textContent = `在庫件数: ${items.length}件`;

  if (items.length === 0) {
    list.innerHTML = `<div class="inventory-empty">表示する在庫がありません。</div>`;
    return;
  }

  list.innerHTML = items
    .map((item) => {
      const isLowStock = item.quantity <= item.minStock;

      return `
      <div class="inventory-card">
        <div class="inventory-card-header">
          <div>
            <h3 class="inventory-card-title">
              ${escapeHtml(item.name)}
              ${isLowStock ? `<span class="inventory-low-badge">低在庫</span>` : ""}
            </h3>
          </div>

          <div class="inventory-card-actions">
            <button type="button" class="inventory-secondary-btn inventory-mini-btn" data-action="minus" data-id="${escapeHtml(item.id)}">-1</button>
            <button type="button" class="inventory-secondary-btn inventory-mini-btn" data-action="plus" data-id="${escapeHtml(item.id)}">+1</button>
            <button type="button" class="inventory-secondary-btn" data-action="edit" data-id="${escapeHtml(item.id)}">編集</button>
            <button type="button" class="inventory-delete-btn" data-action="delete" data-id="${escapeHtml(item.id)}">削除</button>
          </div>
        </div>

        <div class="inventory-card-meta">
          <div>数量: ${escapeHtml(String(item.quantity))} ${escapeHtml(item.unit || "")}</div>
          <div>カテゴリ: ${escapeHtml(item.category || "-")}</div>
          <div>場所: ${escapeHtml(item.location || "-")}</div>
          <div>最低在庫: ${escapeHtml(String(item.minStock))}</div>
          <div>メモ: ${escapeHtml(item.memo || "-")}</div>
          <div>更新: ${formatDateTime(item.updatedAt)}</div>
        </div>
      </div>
    `;
    })
    .join("");
}

function showInventoryMessage(message, type) {
  const messageEl = document.getElementById("inventoryMessage");
  if (!messageEl) return;

  messageEl.textContent = message;
  messageEl.className = "inventory-message";

  if (type === "success") {
    messageEl.classList.add("is-success");
  }

  if (type === "error") {
    messageEl.classList.add("is-error");
  }
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ja-JP");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function openInventoryEditPrompt(itemId) {
  const item = getInventoryItemById(itemId);
  if (!item) {
    showInventoryMessage("編集対象の在庫が見つかりませんでした。", "error");
    return;
  }

  const name = window.prompt("品名を入力してください", item.name);
  if (name === null) return;

  const quantityInput = window.prompt("数量を入力してください", String(item.quantity));
  if (quantityInput === null) return;

  const unit = window.prompt("単位を入力してください", item.unit || "個");
  if (unit === null) return;

  const category = window.prompt("カテゴリを入力してください", item.category || "");
  if (category === null) return;

  const location = window.prompt("保管場所を入力してください", item.location || "");
  if (location === null) return;

  const minStockInput = window.prompt("最低在庫を入力してください", String(item.minStock));
  if (minStockInput === null) return;

  const memo = window.prompt("メモを入力してください", item.memo || "");
  if (memo === null) return;

  const quantity = Number(quantityInput);
  const minStock = Number(minStockInput);

  if (!name.trim()) {
    showInventoryMessage("品名は空にできません。", "error");
    return;
  }

  if (!Number.isFinite(quantity) || quantity < 0) {
    showInventoryMessage("数量は 0 以上の数字で入力してください。", "error");
    return;
  }

  if (!Number.isFinite(minStock) || minStock < 0) {
    showInventoryMessage("最低在庫は 0 以上の数字で入力してください。", "error");
    return;
  }

  updateInventoryItem(itemId, {
    name: name.trim(),
    quantity,
    unit: unit.trim() || "個",
    category: category.trim(),
    location: location.trim(),
    minStock,
    memo: memo.trim()
  });

  showInventoryMessage(`「${name.trim()}」を更新しました。`, "success");
  renderInventoryList();
}