(function () {
    "use strict";
  
    const INVENTORY_KEYS = Object.freeze({
      items: "inventoryItems",
      settings: "inventorySettings",
      links: "inventoryLinks",
      meta: "inventoryMeta",
    });
  
    const INVENTORY_DEFAULT_SETTINGS = Object.freeze({
      lowStockThreshold: 1,
      nearExpiryDays: 7,
      autoLinkToShoppingList: false,
      sortBy: "updatedAt",
      sortOrder: "desc",
      lastSelectedTab: "inventory",
    });
  
    const INVENTORY_DEFAULT_META = Object.freeze({
      version: 1,
      createdAt: null,
      updatedAt: null,
      lastAction: "init",
    });
  
    function deepClone(value) {
      return JSON.parse(JSON.stringify(value));
    }
  
    function isPlainObject(value) {
      return value !== null && typeof value === "object" && !Array.isArray(value);
    }
  
    function nowIso() {
      return new Date().toISOString();
    }
  
    function toText(value, fallback = "") {
      if (value === null || value === undefined) return fallback;
      return String(value).trim();
    }
  
    function toNumber(value, fallback = 0) {
      const num = Number(value);
      return Number.isFinite(num) ? num : fallback;
    }
  
    function createId(prefix) {
      return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
  
    function readJSON(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
  
        if (raw === null || raw === "") {
          return deepClone(fallback);
        }
  
        const parsed = JSON.parse(raw);
  
        if (Array.isArray(fallback)) {
          return Array.isArray(parsed) ? parsed : deepClone(fallback);
        }
  
        if (isPlainObject(fallback)) {
          return isPlainObject(parsed) ? parsed : deepClone(fallback);
        }
  
        return parsed;
      } catch (error) {
        console.warn(`[inventoryStorage] ${key} の読み込みに失敗しました。`, error);
        return deepClone(fallback);
      }
    }
  
    function writeJSON(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
      return value;
    }
  
    function sanitizeInventoryItem(item) {
      const now = nowIso();
  
      return {
        id: toText(item && item.id) || createId("inv"),
        name: toText(item && item.name),
        sku: toText(item && item.sku),
        quantity: toNumber(item && item.quantity, 0),
        unit: toText(item && item.unit, "個") || "個",
        category: toText(item && item.category),
        location: toText(item && item.location),
        expiryDate: toText(item && item.expiryDate),
        openedDate: toText(item && item.openedDate),
        minStock: toNumber(item && item.minStock, 0),
        memo: toText(item && item.memo),
        linkedShoppingItemId: toText(item && item.linkedShoppingItemId),
        createdAt: toText(item && item.createdAt) || now,
        updatedAt: toText(item && item.updatedAt) || now,
      };
    }
  
    function sanitizeInventoryLink(link) {
      const now = nowIso();
  
      return {
        id: toText(link && link.id) || createId("link"),
        inventoryItemId: toText(link && link.inventoryItemId),
        shoppingItemId: toText(link && link.shoppingItemId),
        mode: toText(link && link.mode, "manual") || "manual",
        note: toText(link && link.note),
        createdAt: toText(link && link.createdAt) || now,
        updatedAt: toText(link && link.updatedAt) || now,
      };
    }
  
    function sanitizeInventorySettings(settings) {
      const base = deepClone(INVENTORY_DEFAULT_SETTINGS);
  
      if (!isPlainObject(settings)) {
        return base;
      }
  
      return {
        lowStockThreshold: toNumber(settings.lowStockThreshold, base.lowStockThreshold),
        nearExpiryDays: toNumber(settings.nearExpiryDays, base.nearExpiryDays),
        autoLinkToShoppingList: Boolean(settings.autoLinkToShoppingList),
        sortBy: toText(settings.sortBy, base.sortBy) || base.sortBy,
        sortOrder: settings.sortOrder === "asc" ? "asc" : "desc",
        lastSelectedTab: toText(settings.lastSelectedTab, base.lastSelectedTab) || base.lastSelectedTab,
      };
    }
  
    function sanitizeInventoryMeta(meta) {
      const base = deepClone(INVENTORY_DEFAULT_META);
  
      if (!isPlainObject(meta)) {
        return base;
      }
  
      return {
        version: 1,
        createdAt: toText(meta.createdAt) || base.createdAt,
        updatedAt: toText(meta.updatedAt) || base.updatedAt,
        lastAction: toText(meta.lastAction, base.lastAction) || base.lastAction,
      };
    }
  
    function getInventoryItems() {
      const items = readJSON(INVENTORY_KEYS.items, []);
      return Array.isArray(items) ? items.map(sanitizeInventoryItem) : [];
    }
  
    function saveInventoryItems(items) {
      const safeItems = Array.isArray(items) ? items.map(sanitizeInventoryItem) : [];
      writeJSON(INVENTORY_KEYS.items, safeItems);
      touchInventoryMeta("save_items");
      return safeItems;
    }
  
    function getInventorySettings() {
      return sanitizeInventorySettings(
        readJSON(INVENTORY_KEYS.settings, INVENTORY_DEFAULT_SETTINGS)
      );
    }
  
    function saveInventorySettings(settings) {
      const safeSettings = sanitizeInventorySettings(settings);
      writeJSON(INVENTORY_KEYS.settings, safeSettings);
      touchInventoryMeta("save_settings");
      return safeSettings;
    }
  
    function updateInventorySettings(patch) {
      const current = getInventorySettings();
      const next = sanitizeInventorySettings({
        ...current,
        ...(isPlainObject(patch) ? patch : {}),
      });
  
      writeJSON(INVENTORY_KEYS.settings, next);
      touchInventoryMeta("update_settings");
      return next;
    }
  
    function getInventoryLinks() {
      const links = readJSON(INVENTORY_KEYS.links, []);
      return Array.isArray(links) ? links.map(sanitizeInventoryLink) : [];
    }
  
    function saveInventoryLinks(links) {
      const safeLinks = Array.isArray(links) ? links.map(sanitizeInventoryLink) : [];
      writeJSON(INVENTORY_KEYS.links, safeLinks);
      touchInventoryMeta("save_links");
      return safeLinks;
    }
  
    function getInventoryMeta() {
      return sanitizeInventoryMeta(
        readJSON(INVENTORY_KEYS.meta, INVENTORY_DEFAULT_META)
      );
    }
  
    function touchInventoryMeta(action) {
      const current = getInventoryMeta();
      const now = nowIso();
  
      const next = {
        ...current,
        createdAt: current.createdAt || now,
        updatedAt: now,
        lastAction: action || current.lastAction || "update",
      };
  
      writeJSON(INVENTORY_KEYS.meta, next);
      return next;
    }
  
    function ensureInventoryStorageInitialized() {
      if (localStorage.getItem(INVENTORY_KEYS.items) === null) {
        writeJSON(INVENTORY_KEYS.items, []);
      }
  
      if (localStorage.getItem(INVENTORY_KEYS.settings) === null) {
        writeJSON(INVENTORY_KEYS.settings, deepClone(INVENTORY_DEFAULT_SETTINGS));
      } else {
        writeJSON(INVENTORY_KEYS.settings, getInventorySettings());
      }
  
      if (localStorage.getItem(INVENTORY_KEYS.links) === null) {
        writeJSON(INVENTORY_KEYS.links, []);
      }
  
      if (localStorage.getItem(INVENTORY_KEYS.meta) === null) {
        const now = nowIso();
        writeJSON(INVENTORY_KEYS.meta, {
          version: 1,
          createdAt: now,
          updatedAt: now,
          lastAction: "init",
        });
      } else {
        writeJSON(INVENTORY_KEYS.meta, getInventoryMeta());
      }
  
      return getAllInventoryData();
    }
  
    function getAllInventoryData() {
      return {
        items: getInventoryItems(),
        settings: getInventorySettings(),
        links: getInventoryLinks(),
        meta: getInventoryMeta(),
      };
    }
  
    function getInventoryItemById(id) {
      return getInventoryItems().find((item) => item.id === id) || null;
    }
  
    function addInventoryItem(itemData) {
      const now = nowIso();
      const newItem = sanitizeInventoryItem({
        ...itemData,
        id: toText(itemData && itemData.id) || createId("inv"),
        createdAt: now,
        updatedAt: now,
      });
  
      const items = getInventoryItems();
      items.push(newItem);
  
      writeJSON(INVENTORY_KEYS.items, items);
      touchInventoryMeta("add_item");
  
      return newItem;
    }
  
    function updateInventoryItem(id, patch) {
      const items = getInventoryItems();
      const now = nowIso();
      let updatedItem = null;
  
      const nextItems = items.map((item) => {
        if (item.id !== id) return item;
  
        updatedItem = sanitizeInventoryItem({
          ...item,
          ...(isPlainObject(patch) ? patch : {}),
          id: item.id,
          createdAt: item.createdAt,
          updatedAt: now,
        });
  
        return updatedItem;
      });
  
      if (!updatedItem) {
        return null;
      }
  
      writeJSON(INVENTORY_KEYS.items, nextItems);
      touchInventoryMeta("update_item");
  
      return updatedItem;
    }
  
    function deleteInventoryItem(id) {
      const items = getInventoryItems();
      const exists = items.some((item) => item.id === id);
  
      if (!exists) {
        return false;
      }
  
      const nextItems = items.filter((item) => item.id !== id);
      writeJSON(INVENTORY_KEYS.items, nextItems);
  
      const nextLinks = getInventoryLinks().filter((link) => link.inventoryItemId !== id);
      writeJSON(INVENTORY_KEYS.links, nextLinks);
  
      touchInventoryMeta("delete_item");
      return true;
    }
  
    function addInventoryLink(linkData) {
      const now = nowIso();
      const newLink = sanitizeInventoryLink({
        ...linkData,
        id: toText(linkData && linkData.id) || createId("link"),
        createdAt: now,
        updatedAt: now,
      });
  
      const links = getInventoryLinks();
      links.push(newLink);
  
      writeJSON(INVENTORY_KEYS.links, links);
      touchInventoryMeta("add_link");
  
      return newLink;
    }
  
    function removeInventoryLink(linkId) {
      const links = getInventoryLinks();
      const exists = links.some((link) => link.id === linkId);
  
      if (!exists) {
        return false;
      }
  
      const nextLinks = links.filter((link) => link.id !== linkId);
      writeJSON(INVENTORY_KEYS.links, nextLinks);
      touchInventoryMeta("remove_link");
  
      return true;
    }
  
    function getLinksByInventoryItemId(inventoryItemId) {
      return getInventoryLinks().filter((link) => link.inventoryItemId === inventoryItemId);
    }
  
    function getLinksByShoppingItemId(shoppingItemId) {
      return getInventoryLinks().filter((link) => link.shoppingItemId === shoppingItemId);
    }
  
    function getLowStockInventoryItems() {
      return getInventoryItems().filter((item) => item.quantity <= item.minStock);
    }
  
    function exportInventoryData() {
      return deepClone(getAllInventoryData());
    }
  
    const inventoryStorageApi = {
      INVENTORY_KEYS,
  
      ensureInventoryStorageInitialized,
      getAllInventoryData,
      exportInventoryData,
  
      getInventoryItems,
      saveInventoryItems,
      getInventoryItemById,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      getLowStockInventoryItems,
  
      getInventorySettings,
      saveInventorySettings,
      updateInventorySettings,
  
      getInventoryLinks,
      saveInventoryLinks,
      addInventoryLink,
      removeInventoryLink,
      getLinksByInventoryItemId,
      getLinksByShoppingItemId,
  
      getInventoryMeta,
      touchInventoryMeta,
    };
  
    window.inventoryStorage = inventoryStorageApi;
  
    window.ensureInventoryStorageInitialized = ensureInventoryStorageInitialized;
    window.getAllInventoryData = getAllInventoryData;
    window.exportInventoryData = exportInventoryData;
  
    window.getInventoryItems = getInventoryItems;
    window.saveInventoryItems = saveInventoryItems;
    window.getInventoryItemById = getInventoryItemById;
    window.addInventoryItem = addInventoryItem;
    window.updateInventoryItem = updateInventoryItem;
    window.deleteInventoryItem = deleteInventoryItem;
    window.getLowStockInventoryItems = getLowStockInventoryItems;
  
    window.getInventorySettings = getInventorySettings;
    window.saveInventorySettings = saveInventorySettings;
    window.updateInventorySettings = updateInventorySettings;
  
    window.getInventoryLinks = getInventoryLinks;
    window.saveInventoryLinks = saveInventoryLinks;
    window.addInventoryLink = addInventoryLink;
    window.removeInventoryLink = removeInventoryLink;
    window.getLinksByInventoryItemId = getLinksByInventoryItemId;
    window.getLinksByShoppingItemId = getLinksByShoppingItemId;
  
    window.getInventoryMeta = getInventoryMeta;
    window.touchInventoryMeta = touchInventoryMeta;
  })();