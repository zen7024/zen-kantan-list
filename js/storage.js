// ==========================================
// かんたんリスト v2.2 - storage.js
// 役割:
// - 既存の買い物データ読み書き
// - 既存キーは絶対に変えない
// ==========================================

// ---------- 既存キー ----------
const STORAGE_KEYS = {
    SHOPPING_ITEMS: 'shoppingItems',
    CATEGORIES: 'categories',
    FAVORITES: 'favorites',
    HISTORY: 'history',
    GENRES: 'genres',
    GENRE_MAPPING: 'genreMapping'
};

// ---------- 安全にJSONを読む ----------
function safeReadJson(key, fallbackValue) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null || raw === undefined || raw === '') {
            return fallbackValue;
        }
        return JSON.parse(raw);
    } catch (error) {
        console.error(`[storage] ${key} の読み込みに失敗しました`, error);
        return fallbackValue;
    }
}

// ---------- 安全にJSONを書く ----------
function safeWriteJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`[storage] ${key} の保存に失敗しました`, error);
        return false;
    }
}

// ---------- 買い物リスト ----------
function loadShoppingItems() {
    return safeReadJson(STORAGE_KEYS.SHOPPING_ITEMS, []);
}

function saveShoppingItems(items) {
    return safeWriteJson(STORAGE_KEYS.SHOPPING_ITEMS, items);
}

// ---------- カテゴリ ----------
function loadCategories(defaultCategories) {
    const stored = safeReadJson(STORAGE_KEYS.CATEGORIES, null);
    return stored || [...defaultCategories];
}

function saveCategories(categories) {
    return safeWriteJson(STORAGE_KEYS.CATEGORIES, categories);
}

// ---------- お気に入り ----------
function loadFavorites() {
    return safeReadJson(STORAGE_KEYS.FAVORITES, []);
}

function saveFavorites(favorites) {
    return safeWriteJson(STORAGE_KEYS.FAVORITES, favorites);
}

// ---------- 履歴 ----------
function loadHistory() {
    return safeReadJson(STORAGE_KEYS.HISTORY, []);
}

function saveHistory(history) {
    return safeWriteJson(STORAGE_KEYS.HISTORY, history);
}

// ---------- ジャンル ----------
function loadGenres(defaultGenres) {
    const stored = safeReadJson(STORAGE_KEYS.GENRES, null);
    return stored || [...defaultGenres];
}

function saveGenres(genres) {
    return safeWriteJson(STORAGE_KEYS.GENRES, genres);
}

// ---------- ジャンルマッピング（商品名 → ジャンル名）----------
function loadGenreMapping() {
    return safeReadJson(STORAGE_KEYS.GENRE_MAPPING, {});
}

function saveGenreMapping(mapping) {
    return safeWriteJson(STORAGE_KEYS.GENRE_MAPPING, mapping);
}

// ---------- 既存コード互換 ----------
// 今の script.js の save(key, data) をすぐ全部直さなくても動くように残す
function save(key, data) {
    return safeWriteJson(key, data);
}

// 今の script.js の loadData() を置き換える用
function loadData(defaultCategories, defaultGenres) {
    return {
        shoppingItems: loadShoppingItems(),
        categories: loadCategories(defaultCategories),
        favorites: loadFavorites(),
        history: loadHistory(),
        genres: loadGenres(defaultGenres || []),
        genreMapping: loadGenreMapping()
    };
}