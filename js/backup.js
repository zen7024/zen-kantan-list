// ==========================================
// かんたんリスト v2.2 - backup.js
// 役割:
// - 現在のLocalStorageデータをバックアップする
// - JSONファイルとして書き出す
// - LocalStorage内にも簡易バックアップを残す
// ==========================================

// ---------- バックアップ設定 ----------
const BACKUP_STORAGE_KEYS = {
    BACKUP_INDEX: 'appBackups',
    BACKUP_PREFIX: 'backup_'
};

const BACKUP_TARGET_KEYS = [
    'shoppingItems',
    'categories',
    'favorites',
    'history'
];

// ---------- 日時文字列 ----------
function getBackupTimestamp() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `${y}${m}${d}_${h}${min}${s}`;
}

// ---------- LocalStorageから対象データを集める ----------
function collectBackupData() {
    const data = {};

    BACKUP_TARGET_KEYS.forEach(key => {
        const raw = localStorage.getItem(key);
        try {
            data[key] = raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.error(`[backup] ${key} の読み取りに失敗しました`, error);
            data[key] = null;
        }
    });

    return data;
}

// ---------- バックアップ本体を作る ----------
function createBackupObject() {
    return {
        appName: 'かんたんリスト',
        version: '2.2',
        exportedAt: new Date().toISOString(),
        keys: [...BACKUP_TARGET_KEYS],
        data: collectBackupData()
    };
}

// ---------- LocalStorage内に簡易バックアップ保存 ----------
function saveBackupToLocal() {
    try {
        const backupId = `${BACKUP_STORAGE_KEYS.BACKUP_PREFIX}${getBackupTimestamp()}`;
        const backupObject = createBackupObject();

        localStorage.setItem(backupId, JSON.stringify(backupObject));

        const currentIndex = JSON.parse(localStorage.getItem(BACKUP_STORAGE_KEYS.BACKUP_INDEX) || '[]');
        currentIndex.unshift({
            id: backupId,
            createdAt: backupObject.exportedAt
        });

        // 最新10件だけ保持
        const trimmedIndex = currentIndex.slice(0, 10);
        localStorage.setItem(BACKUP_STORAGE_KEYS.BACKUP_INDEX, JSON.stringify(trimmedIndex));

        // 10件を超えた古いバックアップは削除
        currentIndex.slice(10).forEach(item => {
            localStorage.removeItem(item.id);
        });

        return {
            success: true,
            backupId,
            backupObject
        };
    } catch (error) {
        console.error('[backup] LocalStorageバックアップ保存に失敗しました', error);
        return {
            success: false,
            error
        };
    }
}

// ---------- JSONファイルとしてダウンロード ----------
function downloadBackupFile() {
    try {
        const backupObject = createBackupObject();
        const fileName = `kantan-list-backup_${getBackupTimestamp()}.json`;
        const json = JSON.stringify(backupObject, null, 2);

        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        return {
            success: true,
            fileName
        };
    } catch (error) {
        console.error('[backup] JSON書き出しに失敗しました', error);
        return {
            success: false,
            error
        };
    }
}

// ---------- 書き込み前バックアップ ----------
function backupBeforeWrite() {
    return saveBackupToLocal();
}

// ---------- バックアップ一覧取得 ----------
function loadBackupIndex() {
    try {
        return JSON.parse(localStorage.getItem(BACKUP_STORAGE_KEYS.BACKUP_INDEX) || '[]');
    } catch (error) {
        console.error('[backup] バックアップ一覧の読み込みに失敗しました', error);
        return [];
    }
}

// ---------- バックアップから復元 ----------
function restoreBackupById(backupId) {
    try {
        const raw = localStorage.getItem(backupId);
        if (!raw) {
            return {
                success: false,
                message: 'バックアップが見つかりません'
            };
        }

        const backupObject = JSON.parse(raw);
        if (!backupObject.data) {
            return {
                success: false,
                message: 'バックアップ形式が不正です'
            };
        }

        BACKUP_TARGET_KEYS.forEach(key => {
            const value = backupObject.data[key];
            if (value === null || value === undefined) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
        });

        return {
            success: true,
            message: 'バックアップから復元しました'
        };
    } catch (error) {
        console.error('[backup] 復元に失敗しました', error);
        return {
            success: false,
            message: '復元に失敗しました'
        };
    }
}