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