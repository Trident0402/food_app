const STORAGE_KEY = "food_picker_state_v1";
const TINDER_MIN_ROUNDS = 10;
const TINDER_MAX_ROUNDS = 15;

const emptyState = {
  targetAreas: [],
  importBatches: [],
  categories: [],
  tags: [],
  restaurants: [],
  savedFilters: [],
  weeklyPicks: {},
  selectedCategoryIds: [],
  selectedTagIds: [],
  wishlistOnly: false,
  showBlacklisted: false,
  selectedTargetAreaId: null,
  lastLotteryRestaurantId: null
};

let state = loadState();
let pendingImport = null;
let toastTimer = null;
const transientSelections = {};
let currentRestaurantId = null;
let tinderBattle = null;
let lotteryAnimating = false;

const els = {
  statRestaurants: document.querySelector("#stat-restaurants"),
  statWishlist: document.querySelector("#stat-wishlist"),
  statBlacklist: document.querySelector("#stat-blacklist"),
  targetForm: document.querySelector("#target-form"),
  targetName: document.querySelector("#target-name"),
  targetCenter: document.querySelector("#target-center"),
  targetRadius: document.querySelector("#target-radius"),
  targetPurpose: document.querySelector("#target-purpose"),
  categoryForm: document.querySelector("#category-form"),
  categoryName: document.querySelector("#category-name"),
  tagForm: document.querySelector("#tag-form"),
  tagName: document.querySelector("#tag-name"),
  restaurantForm: document.querySelector("#restaurant-form"),
  restaurantModalTitle: document.querySelector("#restaurant-modal-title"),
  restaurantEditId: document.querySelector("#restaurant-edit-id"),
  restaurantName: document.querySelector("#restaurant-name"),
  restaurantTarget: document.querySelector("#restaurant-target"),
  restaurantAddress: document.querySelector("#restaurant-address"),
  restaurantMapUrl: document.querySelector("#restaurant-map-url"),
  restaurantCategories: document.querySelector("#restaurant-categories"),
  restaurantTags: document.querySelector("#restaurant-tags"),
  restaurantNote: document.querySelector("#restaurant-note"),
  restaurantPrivateNote: document.querySelector("#restaurant-private-note"),
  filterTarget: document.querySelector("#filter-target"),
  filterOptionsButton: document.querySelector("#filter-options-button"),
  filterOptionsMenu: document.querySelector("#filter-options-menu"),
  filterOptionsWrap: document.querySelector(".filter-menu-wrap"),
  filterWishlist: document.querySelector("#filter-wishlist"),
  filterBlacklisted: document.querySelector("#filter-blacklisted"),
  filterCategories: document.querySelector("#filter-categories"),
  filterTags: document.querySelector("#filter-tags"),
  clearFilters: document.querySelector("#clear-filters"),
  resultCount: document.querySelector("#result-count"),
  importJson: document.querySelector("#import-json"),
  previewImport: document.querySelector("#preview-import"),
  confirmImport: document.querySelector("#confirm-import"),
  importPreview: document.querySelector("#import-preview"),
  loadSeedData: document.querySelector("#load-seed-data"),
  drawRestaurant: document.querySelector("#draw-restaurant"),
  lotteryResult: document.querySelector("#lottery-result"),
  lotteryResultModal: document.querySelector("#lottery-result-modal"),
  lotteryResultModalContent: document.querySelector("#lottery-result-modal-content"),
  closeLotteryResult: document.querySelector("#close-lottery-result"),
  startTinder: document.querySelector("#start-tinder"),
  tinderStatus: document.querySelector("#tinder-status"),
  tinderMatch: document.querySelector("#tinder-match"),
  weekCalendar: document.querySelector("#week-calendar"),
  restaurantList: document.querySelector("#restaurant-list"),
  toast: document.querySelector("#toast"),
  homePage: document.querySelector("#home-page"),
  filterPage: document.querySelector("#filter-page"),
  lotteryPage: document.querySelector("#lottery-page"),
  restaurantDetailPage: document.querySelector("#restaurant-detail-page"),
  restaurantDetailContent: document.querySelector("#restaurant-detail-content"),
  backToList: document.querySelector("#back-to-list"),
  editRestaurantDetail: document.querySelector("#edit-restaurant-detail"),
  settingsPage: document.querySelector("#settings-page"),
  navButtons: document.querySelectorAll("[data-page]"),
  fabAdd: document.querySelector("#fab-add"),
  addMenu: document.querySelector("#add-menu"),
  openModalButtons: document.querySelectorAll("[data-open-modal]"),
  closeModalButtons: document.querySelectorAll("[data-close-modal]"),
  modals: document.querySelectorAll(".modal-backdrop")
};

function createId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}_${window.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function clone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(emptyState);
    return normalizeState(JSON.parse(raw));
  } catch {
    return clone(emptyState);
  }
}

function normalizeState(raw) {
  const next = { ...clone(emptyState), ...(raw || {}) };
  next.targetAreas = Array.isArray(next.targetAreas) ? next.targetAreas : [];
  next.importBatches = Array.isArray(next.importBatches) ? next.importBatches : [];
  next.categories = Array.isArray(next.categories) ? next.categories : [];
  next.tags = Array.isArray(next.tags) ? next.tags : [];
  next.restaurants = Array.isArray(next.restaurants) ? next.restaurants : [];
  next.savedFilters = Array.isArray(next.savedFilters) ? next.savedFilters : [];
  next.weeklyPicks = next.weeklyPicks && typeof next.weeklyPicks === "object" && !Array.isArray(next.weeklyPicks) ? next.weeklyPicks : {};
  next.selectedCategoryIds = Array.isArray(next.selectedCategoryIds) ? next.selectedCategoryIds : [];
  next.selectedTagIds = Array.isArray(next.selectedTagIds) ? next.selectedTagIds : [];
  next.wishlistOnly = Boolean(next.wishlistOnly);
  next.showBlacklisted = Boolean(next.showBlacklisted);
  next.selectedTargetAreaId = next.selectedTargetAreaId || null;
  return next;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function text(value) {
  return String(value || "").trim();
}

function normalizeName(value) {
  return text(value).toLowerCase();
}

function findByName(items, name) {
  const target = normalizeName(name);
  return items.find((item) => normalizeName(item.name) === target);
}

function getCategoryName(id) {
  return state.categories.find((category) => category.id === id)?.name || "";
}

function getTagName(id) {
  return state.tags.find((tag) => tag.id === id)?.name || "";
}

function getTargetAreaName(id) {
  return state.targetAreas.find((target) => target.id === id)?.name || "未指定";
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekDates(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay() || 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day + 1);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return next;
  });
}

function getShortRestaurantName(name) {
  const cleanName = text(name).replace(/[\s_\-()[\]（）【】・.]/g, "");
  return Array.from(cleanName || "未記").slice(0, 4).join("");
}

function recordWeeklyPick(restaurantId) {
  state.weeklyPicks[getLocalDateKey()] = restaurantId;
}

function getOrCreateCategoryId(name) {
  const cleanName = text(name);
  if (!cleanName) return null;
  const existing = findByName(state.categories, cleanName);
  if (existing) return existing.id;
  const category = { id: createId("cat"), name: cleanName };
  state.categories.push(category);
  return category.id;
}

function getOrCreateTagId(name) {
  const cleanName = text(name);
  if (!cleanName) return null;
  const existing = findByName(state.tags, cleanName);
  if (existing) return existing.id;
  const tag = { id: createId("tag"), name: cleanName };
  state.tags.push(tag);
  return tag.id;
}

function getOrCreateTargetAreaId(targetArea) {
  if (!targetArea || !text(targetArea.name)) return null;
  const existing = findByName(state.targetAreas, targetArea.name);
  if (existing) return existing.id;
  const area = {
    id: createId("area"),
    name: text(targetArea.name),
    centerName: text(targetArea.centerName),
    radiusText: text(targetArea.radiusText),
    purpose: text(targetArea.purpose),
    createdAt: new Date().toISOString()
  };
  state.targetAreas.push(area);
  return area.id;
}

function getCheckedIds(container) {
  if (container instanceof HTMLSelectElement) {
    return Array.from(container.selectedOptions).map((option) => option.value);
  }
  return Array.from(container.querySelectorAll("input:checked")).map((input) => input.value);
}

function getSelectItems(select) {
  return select.id.includes("categories") ? state.categories : state.tags;
}

function getSelectKind(select) {
  return select.id.includes("categories") ? "category" : "tag";
}

function getSelectLabel(select) {
  return getSelectKind(select) === "category" ? "食物類別" : "自訂標籤";
}

function isFilterSelect(select) {
  return select.id.startsWith("filter-");
}

function hasAny(sourceIds, selectedIds) {
  return selectedIds.length === 0 || selectedIds.some((id) => sourceIds.includes(id));
}

function getFilteredRestaurants() {
  return state.restaurants.filter((restaurant) => {
    if (!restaurant.enabled) return false;
    if (!state.showBlacklisted && restaurant.isBlacklisted) return false;
    if (state.selectedTargetAreaId && restaurant.targetAreaId !== state.selectedTargetAreaId) return false;
    if (state.wishlistOnly && !restaurant.isWishlisted) return false;
    if (!hasAny(restaurant.categoryIds || [], state.selectedCategoryIds)) return false;
    if (!hasAny(restaurant.tagIds || [], state.selectedTagIds)) return false;
    return true;
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 2400);
}

function switchPage(pageName) {
  currentRestaurantId = null;
  els.homePage.classList.toggle("is-active", pageName === "home");
  els.filterPage.classList.toggle("is-active", pageName === "filter");
  els.lotteryPage.classList.toggle("is-active", pageName === "lottery");
  els.restaurantDetailPage.classList.remove("is-active");
  els.settingsPage.classList.toggle("is-active", pageName === "settings");
  for (const button of els.navButtons) {
    button.classList.toggle("is-active", button.dataset.page === pageName);
  }
  closeAddMenu();
  closeFilterOptions();
}

function toggleAddMenu() {
  const willOpen = !els.addMenu.classList.contains("is-open");
  els.addMenu.classList.toggle("is-open", willOpen);
  els.addMenu.setAttribute("aria-hidden", String(!willOpen));
  els.fabAdd.setAttribute("aria-expanded", String(willOpen));
}

function closeAddMenu() {
  els.addMenu.classList.remove("is-open");
  els.addMenu.setAttribute("aria-hidden", "true");
  els.fabAdd.setAttribute("aria-expanded", "false");
}

function closeFilterOptions() {
  els.filterOptionsWrap.classList.remove("is-open");
  els.filterOptionsMenu.setAttribute("aria-hidden", "true");
  els.filterOptionsButton.setAttribute("aria-expanded", "false");
}

function toggleFilterOptions() {
  const willOpen = !els.filterOptionsWrap.classList.contains("is-open");
  els.filterOptionsWrap.classList.toggle("is-open", willOpen);
  els.filterOptionsMenu.setAttribute("aria-hidden", String(!willOpen));
  els.filterOptionsButton.setAttribute("aria-expanded", String(willOpen));
}

function openModal(id) {
  closeAddMenu();
  closeModals();
  const modal = document.querySelector(`#${id}`);
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  const firstField = modal.querySelector("input, select, textarea, button");
  if (firstField) firstField.focus();
}

function closeModals() {
  for (const modal of els.modals) {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }
}

function setSelectValues(select, ids) {
  const selectedIds = new Set(ids || []);
  Array.from(select.options).forEach((option) => {
    option.selected = selectedIds.has(option.value);
  });
  transientSelections[select.id] = Array.from(selectedIds);
  renderChipSelect(select);
}

function setEmptyMessage(container, message) {
  container.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function renderOptions(select, items, placeholder) {
  const current = select.value;
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`;
  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    select.append(option);
  }
  select.value = items.some((item) => item.id === current) ? current : "";
}

function renderCheckList(container, items, selectedIds, name) {
  if (container instanceof HTMLSelectElement) {
    const effectiveSelectedIds = transientSelections[container.id] || selectedIds;
    container.innerHTML = "";
    for (const item of items) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;
      option.selected = effectiveSelectedIds.includes(item.id);
      container.append(option);
    }
    if (items.length === 0) {
      const option = document.createElement("option");
      option.disabled = true;
      option.textContent = "尚未新增";
      container.append(option);
    }
    renderChipSelect(container);
    return;
  }
  if (items.length === 0) {
    container.innerHTML = `<span class="muted">尚未新增</span>`;
    return;
  }
  container.innerHTML = "";
  for (const item of items) {
    const label = document.createElement("label");
    label.className = "check-pill";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    input.value = item.id;
    input.checked = selectedIds.includes(item.id);
    label.append(input, document.createTextNode(item.name));
    container.append(label);
  }
}

function renderChipSelect(select) {
  let wrapper = select.nextElementSibling;
  if (!wrapper || !wrapper.classList.contains("chip-select")) {
    wrapper = document.createElement("div");
    wrapper.className = "chip-select";
    wrapper.dataset.selectId = select.id;
    select.insertAdjacentElement("afterend", wrapper);
  }

  const items = getSelectItems(select);
  const selectedIds = getCheckedIds(select);
  const selectedItems = selectedIds
    .map((id) => items.find((item) => item.id === id))
    .filter(Boolean);

  wrapper.innerHTML = `
    <div class="chip-select-control" role="combobox" aria-expanded="false">
      ${selectedItems
        .map(
          (item) => `
            <span class="chip-select-chip">
              ${escapeHtml(item.name)}
              <button class="chip-remove" type="button" data-chip-remove="${escapeHtml(item.id)}" aria-label="移除 ${escapeHtml(item.name)}">×</button>
            </span>
          `
        )
        .join("")}
      <input class="chip-select-input" type="text" autocomplete="off" placeholder="Select an option or create one">
    </div>
    <div class="chip-select-menu" role="listbox"></div>
  `;

  const input = wrapper.querySelector(".chip-select-input");
  const menu = wrapper.querySelector(".chip-select-menu");
  const control = wrapper.querySelector(".chip-select-control");

  function drawMenu() {
    const query = normalizeName(input.value);
    const visibleItems = items.filter((item) => !query || normalizeName(item.name).includes(query));
    const exactMatch = items.some((item) => normalizeName(item.name) === query);
    menu.innerHTML = "";

    if (visibleItems.length === 0) {
      menu.innerHTML = `<p class="meta">沒有符合選項</p>`;
    }

    for (const item of visibleItems) {
      const selected = selectedIds.includes(item.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `chip-select-option${selected ? " is-selected" : ""}`;
      button.dataset.optionId = item.id;
      button.innerHTML = `
        <span class="drag-dots">⋮⋮</span>
        <span class="option-pill">${escapeHtml(item.name)}</span>
        <span>${selected ? "✓" : ""}</span>
      `;
      menu.append(button);
    }

    if (text(input.value) && !exactMatch) {
      const createButton = document.createElement("button");
      createButton.type = "button";
      createButton.className = "chip-select-option chip-create-option";
      createButton.dataset.createOption = text(input.value);
      createButton.innerHTML = `
        <span class="drag-dots">＋</span>
        <span class="option-pill">建立「${escapeHtml(text(input.value))}」</span>
        <span></span>
      `;
      menu.append(createButton);
    }
  }

  function open() {
    wrapper.classList.add("is-open");
    control.setAttribute("aria-expanded", "true");
    drawMenu();
  }

  control.addEventListener("click", () => {
    open();
    input.focus();
  });

  input.addEventListener("focus", open);
  input.addEventListener("input", drawMenu);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      createMultiSelectOption(select, text(input.value));
    }
    if (event.key === "Escape") {
      wrapper.classList.remove("is-open");
      control.setAttribute("aria-expanded", "false");
    }
  });

  wrapper.querySelectorAll("[data-chip-remove]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setMultiSelectValue(select, button.dataset.chipRemove, false);
    });
  });

  menu.addEventListener("click", (event) => {
    const optionButton = event.target.closest("[data-option-id]");
    const createButton = event.target.closest("[data-create-option]");
    if (optionButton) {
      const id = optionButton.dataset.optionId;
      setMultiSelectValue(select, id, !selectedIds.includes(id));
    }
    if (createButton) {
      createMultiSelectOption(select, createButton.dataset.createOption);
    }
  });
}

function setMultiSelectValue(select, id, shouldSelect) {
  const option = Array.from(select.options).find((item) => item.value === id);
  if (option) option.selected = shouldSelect;

  if (isFilterSelect(select)) {
    if (getSelectKind(select) === "category") {
      state.selectedCategoryIds = getCheckedIds(select);
    } else {
      state.selectedTagIds = getCheckedIds(select);
    }
    saveState();
    renderFilters();
    renderRestaurantList();
    renderLottery();
    return;
  }

  transientSelections[select.id] = getCheckedIds(select);
  renderForms();
}

function createMultiSelectOption(select, value) {
  const cleanName = text(value);
  if (!cleanName) return;
  const id = getSelectKind(select) === "category" ? getOrCreateCategoryId(cleanName) : getOrCreateTagId(cleanName);
  if (!id) return;

  if (isFilterSelect(select)) {
    if (getSelectKind(select) === "category" && !state.selectedCategoryIds.includes(id)) {
      state.selectedCategoryIds.push(id);
    }
    if (getSelectKind(select) === "tag" && !state.selectedTagIds.includes(id)) {
      state.selectedTagIds.push(id);
    }
    saveState();
    render();
    showToast(`已建立${getSelectLabel(select)}`);
    return;
  }

  const selectedIds = new Set(getCheckedIds(select));
  selectedIds.add(id);
  transientSelections[select.id] = Array.from(selectedIds);
  saveState();
  render();
  showToast(`已建立${getSelectLabel(select)}`);
}

function renderStats() {
  els.statRestaurants.textContent = state.restaurants.length;
  els.statWishlist.textContent = state.restaurants.filter((restaurant) => restaurant.isWishlisted).length;
  els.statBlacklist.textContent = state.restaurants.filter((restaurant) => restaurant.isBlacklisted).length;
}

function renderForms() {
  renderOptions(els.restaurantTarget, state.targetAreas, "不指定");
  renderCheckList(els.restaurantCategories, state.categories, getCheckedIds(els.restaurantCategories), "restaurant-category");
  renderCheckList(els.restaurantTags, state.tags, getCheckedIds(els.restaurantTags), "restaurant-tag");
}

function renderFilters() {
  renderOptions(els.filterTarget, state.targetAreas, "全部地點");
  els.filterTarget.value = state.selectedTargetAreaId || "";
  els.filterWishlist.checked = state.wishlistOnly;
  els.filterBlacklisted.checked = state.showBlacklisted;
  const activeOptionCount = [state.wishlistOnly, state.showBlacklisted].filter(Boolean).length;
  els.filterOptionsButton.textContent = activeOptionCount ? `篩選選項 (${activeOptionCount})` : "篩選選項";
  renderCheckList(els.filterCategories, state.categories, state.selectedCategoryIds, "filter-category");
  renderCheckList(els.filterTags, state.tags, state.selectedTagIds, "filter-tag");
}

function renderRestaurantList() {
  const restaurants = getFilteredRestaurants();
  els.resultCount.textContent = `目前 ${restaurants.length} 間符合`;
  if (restaurants.length === 0) {
    setEmptyMessage(els.restaurantList, "目前沒有符合的餐廳");
    return;
  }

  els.restaurantList.innerHTML = "";
  for (const restaurant of restaurants) {
    const card = document.createElement("article");
    card.className = `restaurant-card${restaurant.isBlacklisted ? " is-blacklisted" : ""}`;
    card.dataset.restaurantId = restaurant.id;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `查看 ${restaurant.name} 詳細資料`);
    card.innerHTML = `
      <header>
        <div>
          <h3>${escapeHtml(restaurant.name)}</h3>
          <p class="meta">${escapeHtml(getTargetAreaName(restaurant.targetAreaId))}</p>
        </div>
        <div class="tag-row">
          ${restaurant.isWishlisted ? '<span class="tag">待吃</span>' : ""}
          ${restaurant.isBlacklisted ? '<span class="tag warn">避雷</span>' : ""}
          ${restaurant.dataVerified ? '<span class="tag">已確認</span>' : '<span class="tag ai">待確認</span>'}
        </div>
      </header>
      <div class="tag-row">
        ${(restaurant.categoryIds || []).map((id) => `<span class="tag category">${escapeHtml(getCategoryName(id))}</span>`).join("")}
        ${(restaurant.tagIds || []).map((id) => `<span class="tag">${escapeHtml(getTagName(id))}</span>`).join("")}
      </div>
      ${(restaurant.aiSuggestedTagIds || []).length ? `<div class="tag-row">${restaurant.aiSuggestedTagIds.map((id) => `<span class="tag">${escapeHtml(getTagName(id))}</span>`).join("")}</div>` : ""}
      ${restaurant.address ? `<p class="meta">${escapeHtml(restaurant.address)}</p>` : ""}
      ${restaurant.distanceText ? `<p class="meta">距離：${escapeHtml(restaurant.distanceText)}</p>` : ""}
      ${restaurant.googleMapsUrl ? `<p><a class="map-link" href="${escapeHtml(restaurant.googleMapsUrl)}" target="_blank" rel="noreferrer">Google Maps</a></p>` : ""}
      ${restaurant.note ? `<p class="meta">${escapeHtml(restaurant.note)}</p>` : ""}
      ${restaurant.privateNote ? `<p class="meta">私人筆記：${escapeHtml(restaurant.privateNote)}</p>` : ""}
      ${restaurant.aiSuggestionNote ? `<p class="meta">建議：${escapeHtml(restaurant.aiSuggestionNote)}</p>` : ""}
      <div class="card-actions">
        <button class="small-button" type="button" data-action="wishlist" data-id="${restaurant.id}">${restaurant.isWishlisted ? "移出待吃" : "下次吃"}</button>
        <button class="small-button ${restaurant.isBlacklisted ? "" : "danger-button"}" type="button" data-action="blacklist" data-id="${restaurant.id}">${restaurant.isBlacklisted ? "取消避雷" : "避雷"}</button>
        <button class="small-button ghost-button" type="button" data-action="verify" data-id="${restaurant.id}">${restaurant.dataVerified ? "標為待確認" : "標為已確認"}</button>
        <button class="small-button danger-button" type="button" data-action="delete" data-id="${restaurant.id}">刪除</button>
      </div>
    `;
    els.restaurantList.append(card);
  }
}

function renderRestaurantDetail() {
  const restaurant = state.restaurants.find((item) => item.id === currentRestaurantId);
  if (!restaurant) {
    els.restaurantDetailContent.innerHTML = `<div class="empty-state">找不到餐廳資料</div>`;
    return;
  }

  els.restaurantDetailContent.innerHTML = `
    <div class="detail-title">
      <p class="eyebrow">${escapeHtml(getTargetAreaName(restaurant.targetAreaId))}</p>
      <h2>${escapeHtml(restaurant.name)}</h2>
      <div class="tag-row">
        ${restaurant.isWishlisted ? '<span class="tag">待吃</span>' : ""}
        ${restaurant.isBlacklisted ? '<span class="tag warn">避雷</span>' : ""}
        ${restaurant.dataVerified ? '<span class="tag">已確認</span>' : '<span class="tag ai">待確認</span>'}
      </div>
    </div>
    <div class="tag-row">
      ${(restaurant.categoryIds || []).map((id) => `<span class="tag category">${escapeHtml(getCategoryName(id))}</span>`).join("")}
      ${(restaurant.tagIds || []).map((id) => `<span class="tag">${escapeHtml(getTagName(id))}</span>`).join("")}
      ${(restaurant.aiSuggestedTagIds || []).map((id) => `<span class="tag">${escapeHtml(getTagName(id))}</span>`).join("")}
    </div>
    <div class="detail-grid">
      <div class="detail-field"><span>地址</span><p>${escapeHtml(restaurant.address || "未填寫")}</p></div>
      <div class="detail-field"><span>距離</span><p>${escapeHtml(restaurant.distanceText || "未填寫")}</p></div>
      <div class="detail-field"><span>價位</span><p>${escapeHtml(restaurant.priceText || "未填寫")}</p></div>
      <div class="detail-field"><span>營業時間</span><p>${escapeHtml(restaurant.openingHoursText || "未填寫")}</p></div>
      <div class="detail-field"><span>Google Maps</span><p>${restaurant.googleMapsUrl ? `<a class="map-link" href="${escapeHtml(restaurant.googleMapsUrl)}" target="_blank" rel="noreferrer">開啟地圖</a>` : "未填寫"}</p></div>
      <div class="detail-field"><span>資料來源</span><p>${escapeHtml(restaurant.source || "未填寫")}</p></div>
    </div>
    <div class="detail-field"><span>備註</span><p>${escapeHtml(restaurant.note || "未填寫")}</p></div>
    <div class="detail-field"><span>私人筆記</span><p>${escapeHtml(restaurant.privateNote || "未填寫")}</p></div>
    <div class="detail-field"><span>建議說明</span><p>${escapeHtml(restaurant.aiSuggestionNote || "未填寫")}</p></div>
  `;
}

function openRestaurantDetail(id) {
  currentRestaurantId = id;
  els.homePage.classList.remove("is-active");
  els.filterPage.classList.remove("is-active");
  els.lotteryPage.classList.remove("is-active");
  els.settingsPage.classList.remove("is-active");
  els.restaurantDetailPage.classList.add("is-active");
  for (const button of els.navButtons) button.classList.remove("is-active");
  closeAddMenu();
  renderRestaurantDetail();
}

function backToRestaurantList() {
  currentRestaurantId = null;
  els.restaurantDetailPage.classList.remove("is-active");
  els.homePage.classList.remove("is-active");
  els.filterPage.classList.add("is-active");
  els.lotteryPage.classList.remove("is-active");
  els.settingsPage.classList.remove("is-active");
  for (const button of els.navButtons) {
    button.classList.toggle("is-active", button.dataset.page === "filter");
  }
}

function renderLotteryCard(restaurant, extraClass = "") {
  return `
    <div class="lottery-card ${extraClass}">
      <h3>${escapeHtml(restaurant.name)}</h3>
      <p class="meta">${escapeHtml(getTargetAreaName(restaurant.targetAreaId))}</p>
      <div class="tag-row">
        ${(restaurant.categoryIds || []).map((id) => `<span class="tag category">${escapeHtml(getCategoryName(id))}</span>`).join("")}
        ${(restaurant.tagIds || []).map((id) => `<span class="tag">${escapeHtml(getTagName(id))}</span>`).join("")}
      </div>
      ${restaurant.note ? `<p class="meta">${escapeHtml(restaurant.note)}</p>` : ""}
      ${restaurant.privateNote ? `<p class="meta">私人筆記：${escapeHtml(restaurant.privateNote)}</p>` : ""}
      ${restaurant.googleMapsUrl ? `<p><a class="map-link" href="${escapeHtml(restaurant.googleMapsUrl)}" target="_blank" rel="noreferrer">Google Maps</a></p>` : ""}
    </div>
  `;
}

function renderWeekCalendar() {
  const todayKey = getLocalDateKey();
  const labels = ["一", "二", "三", "四", "五", "六", "日"];
  els.weekCalendar.innerHTML = getWeekDates().map((date, index) => {
    const dateKey = getLocalDateKey(date);
    const restaurant = state.restaurants.find((item) => item.id === state.weeklyPicks[dateKey]);
    const shortName = restaurant ? getShortRestaurantName(restaurant.name) : "未記";
    return `
      <div class="week-day${dateKey === todayKey ? " is-today" : ""}">
        <div class="week-label">週${labels[index]} ${date.getMonth() + 1}/${date.getDate()}</div>
        <div class="week-restaurant">${escapeHtml(shortName)}</div>
      </div>
    `;
  }).join("");
}

function renderLottery() {
  const restaurant = state.restaurants.find((item) => item.id === state.lastLotteryRestaurantId);
  if (!restaurant) {
    els.lotteryResult.innerHTML = "";
    return;
  }
  els.lotteryResult.innerHTML = renderLotteryCard(restaurant);
}

function getRandomRestaurant(excludedIds = []) {
  const excluded = new Set(excludedIds);
  const candidates = getFilteredRestaurants().filter((restaurant) => !excluded.has(restaurant.id));
  return candidates[Math.floor(Math.random() * candidates.length)] || null;
}

function getRandomTinderRoundCount() {
  return TINDER_MIN_ROUNDS + Math.floor(Math.random() * (TINDER_MAX_ROUNDS - TINDER_MIN_ROUNDS + 1));
}

function renderTinderRestaurantButton(restaurant, sideLabel) {
  return `
    <button class="tinder-choice" type="button" data-tinder-choice="${restaurant.id}">
      <span class="tinder-choice-side">${escapeHtml(sideLabel)}</span>
      <h3>${escapeHtml(restaurant.name)}</h3>
      <p class="meta">${escapeHtml(getTargetAreaName(restaurant.targetAreaId))}</p>
      <div class="tag-row">
        ${(restaurant.categoryIds || []).map((id) => `<span class="tag category">${escapeHtml(getCategoryName(id))}</span>`).join("")}
        ${(restaurant.tagIds || []).map((id) => `<span class="tag">${escapeHtml(getTagName(id))}</span>`).join("")}
      </div>
      ${restaurant.distanceText ? `<p class="meta">距離：${escapeHtml(restaurant.distanceText)}</p>` : ""}
      ${restaurant.note ? `<p class="meta">${escapeHtml(restaurant.note)}</p>` : ""}
    </button>
  `;
}

function renderTinder() {
  const candidates = getFilteredRestaurants();
  els.startTinder.disabled = candidates.length < 2;

  if (candidates.length < 2) {
    tinderBattle = null;
    els.tinderStatus.textContent = "目前篩選結果少於 2 間餐廳";
    els.tinderMatch.innerHTML = `<div class="empty-state">請先調整篩選條件</div>`;
    return;
  }

  if (!tinderBattle) {
    els.tinderStatus.textContent = `目前 ${candidates.length} 間可對決`;
    els.tinderMatch.innerHTML = `<div class="empty-state">按下開始後隨機進行 ${TINDER_MIN_ROUNDS}-${TINDER_MAX_ROUNDS} 回合二選一</div>`;
    return;
  }

  if (tinderBattle.complete) {
    const winner = state.restaurants.find((restaurant) => restaurant.id === tinderBattle.winnerId);
    els.tinderStatus.textContent = "淘汰賽完成";
    els.tinderMatch.innerHTML = winner
      ? `
        <div class="tinder-result">
          <h3>${escapeHtml(winner.name)}</h3>
          <p class="meta">${escapeHtml(getTargetAreaName(winner.targetAreaId))}</p>
          ${winner.googleMapsUrl ? `<p><a class="map-link" href="${escapeHtml(winner.googleMapsUrl)}" target="_blank" rel="noreferrer">Google Maps</a></p>` : ""}
        </div>
      `
      : `<div class="empty-state">找不到勝出餐廳</div>`;
    return;
  }

  const left = state.restaurants.find((restaurant) => restaurant.id === tinderBattle.leftId);
  const right = state.restaurants.find((restaurant) => restaurant.id === tinderBattle.rightId);
  if (!left || !right) {
    tinderBattle = null;
    renderTinder();
    return;
  }

  els.tinderStatus.textContent = `第 ${tinderBattle.round} / ${tinderBattle.totalRounds} 回合`;
  els.tinderMatch.innerHTML = `
    <div class="tinder-duel">
      ${renderTinderRestaurantButton(left, "左邊")}
      ${renderTinderRestaurantButton(right, "右邊")}
    </div>
  `;
}

function startTinderBattle() {
  const left = getRandomRestaurant();
  const right = left ? getRandomRestaurant([left.id]) : null;
  if (!left || !right) {
    tinderBattle = null;
    renderTinder();
    return;
  }
  const pair = Math.random() > 0.5 ? [left.id, right.id] : [right.id, left.id];
  tinderBattle = {
    round: 1,
    totalRounds: getRandomTinderRoundCount(),
    leftId: pair[0],
    rightId: pair[1],
    winnerId: null,
    complete: false
  };
  renderTinder();
}

function chooseTinderRestaurant(id) {
  if (!tinderBattle || tinderBattle.complete) return;
  const winner = state.restaurants.find((restaurant) => restaurant.id === id);
  if (!winner) return;

  if (tinderBattle.round >= tinderBattle.totalRounds) {
    tinderBattle = { ...tinderBattle, winnerId: winner.id, complete: true };
    state.lastLotteryRestaurantId = winner.id;
    recordWeeklyPick(winner.id);
    saveState();
    renderLottery();
    renderWeekCalendar();
    renderTinder();
    showToast("二選一完成");
    return;
  }

  const challenger = getRandomRestaurant([winner.id]);
  if (!challenger) {
    tinderBattle = { ...tinderBattle, winnerId: winner.id, complete: true };
    state.lastLotteryRestaurantId = winner.id;
    recordWeeklyPick(winner.id);
    saveState();
    renderLottery();
    renderWeekCalendar();
    renderTinder();
    return;
  }

  const pair = Math.random() > 0.5 ? [winner.id, challenger.id] : [challenger.id, winner.id];
  tinderBattle = {
    round: tinderBattle.round + 1,
    totalRounds: tinderBattle.totalRounds,
    leftId: pair[0],
    rightId: pair[1],
    winnerId: null,
    complete: false
  };
  renderTinder();
}

function resetTinderBattle() {
  tinderBattle = null;
  renderTinder();
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function openLotteryResultModal(restaurant) {
  els.lotteryResultModalContent.innerHTML = renderLotteryCard(restaurant);
  els.lotteryResultModal.classList.add("is-open");
  els.lotteryResultModal.setAttribute("aria-hidden", "false");
  els.closeLotteryResult.focus();
}

function closeLotteryResultModal() {
  els.lotteryResultModal.classList.remove("is-open");
  els.lotteryResultModal.setAttribute("aria-hidden", "true");
}

async function animateLotterySelection(restaurants, finalRestaurant) {
  const delays = [46, 54, 62, 72, 86, 104, 128, 158, 196, 244, 304, 380];
  for (const delay of delays) {
    const preview = restaurants[Math.floor(Math.random() * restaurants.length)];
    els.lotteryResult.innerHTML = renderLotteryCard(preview, "is-spinning");
    await sleep(delay);
  }
  els.lotteryResult.innerHTML = renderLotteryCard(finalRestaurant);
}

function render() {
  renderStats();
  renderWeekCalendar();
  renderForms();
  renderFilters();
  renderRestaurantList();
  renderLottery();
  renderTinder();
  if (currentRestaurantId) renderRestaurantDetail();
}

function commit(message) {
  saveState();
  pendingImport = null;
  els.confirmImport.disabled = true;
  if (message) showToast(message);
  render();
}

function addTargetArea(event) {
  event.preventDefault();
  const name = text(els.targetName.value);
  if (!name) return showToast("請輸入目標地點名稱");
  if (findByName(state.targetAreas, name)) return showToast("目標地點已存在");
  state.targetAreas.push({
    id: createId("area"),
    name,
    centerName: text(els.targetCenter.value),
    radiusText: text(els.targetRadius.value),
    purpose: text(els.targetPurpose.value),
    createdAt: new Date().toISOString()
  });
  els.targetForm.reset();
  closeModals();
  commit("已新增目標地點");
}

function addCategory(event) {
  event.preventDefault();
  const name = text(els.categoryName.value);
  if (!name) return showToast("請輸入類別名稱");
  if (findByName(state.categories, name)) return showToast("類別已存在");
  state.categories.push({ id: createId("cat"), name });
  els.categoryForm.reset();
  closeModals();
  commit("已新增類別");
}

function addTag(event) {
  event.preventDefault();
  const name = text(els.tagName.value);
  if (!name) return showToast("請輸入標籤名稱");
  if (findByName(state.tags, name)) return showToast("標籤已存在");
  state.tags.push({ id: createId("tag"), name });
  els.tagForm.reset();
  closeModals();
  commit("已新增標籤");
}

function addRestaurant(event) {
  event.preventDefault();
  const name = text(els.restaurantName.value);
  if (!name) return showToast("請輸入餐廳名稱");
  const editId = els.restaurantEditId.value;
  const existing = editId ? state.restaurants.find((item) => item.id === editId) : null;
  const nextData = {
    targetAreaId: els.restaurantTarget.value || null,
    name,
    address: text(els.restaurantAddress.value),
    googleMapsUrl: text(els.restaurantMapUrl.value),
    categoryIds: getCheckedIds(els.restaurantCategories),
    tagIds: getCheckedIds(els.restaurantTags),
    note: text(els.restaurantNote.value),
    privateNote: text(els.restaurantPrivateNote.value)
  };

  if (existing) {
    Object.assign(existing, nextData);
    els.restaurantForm.reset();
    transientSelections[els.restaurantCategories.id] = [];
    transientSelections[els.restaurantTags.id] = [];
    els.restaurantEditId.value = "";
    els.restaurantModalTitle.textContent = "新增餐廳";
    closeModals();
    commit("已更新餐廳");
    return;
  }

  state.restaurants.push({
    id: createId("res"),
    ...nextData,
    aiSuggestedTagIds: [],
    aiSuggestionNote: "",
    dataVerified: true,
    source: "manual",
    priceText: "",
    rating: null,
    reviewCount: null,
    isWishlisted: false,
    isBlacklisted: false,
    enabled: true,
    visitRecords: [],
    createdAt: new Date().toISOString()
  });
  els.restaurantForm.reset();
  transientSelections[els.restaurantCategories.id] = [];
  transientSelections[els.restaurantTags.id] = [];
  closeModals();
  commit("已新增餐廳");
}

function prepareRestaurantCreateForm() {
  els.restaurantForm.reset();
  els.restaurantEditId.value = "";
  els.restaurantModalTitle.textContent = "新增餐廳";
  transientSelections[els.restaurantCategories.id] = [];
  transientSelections[els.restaurantTags.id] = [];
  renderForms();
}

function openRestaurantEditForm(id) {
  const restaurant = state.restaurants.find((item) => item.id === id);
  if (!restaurant) return;
  els.restaurantEditId.value = restaurant.id;
  els.restaurantModalTitle.textContent = "修改餐廳";
  els.restaurantName.value = restaurant.name || "";
  els.restaurantTarget.value = restaurant.targetAreaId || "";
  els.restaurantAddress.value = restaurant.address || "";
  els.restaurantMapUrl.value = restaurant.googleMapsUrl || "";
  els.restaurantNote.value = restaurant.note || "";
  els.restaurantPrivateNote.value = restaurant.privateNote || "";
  setSelectValues(els.restaurantCategories, restaurant.categoryIds || []);
  setSelectValues(els.restaurantTags, restaurant.tagIds || []);
  openModal("restaurant-modal");
}

function updateFilters() {
  state.selectedTargetAreaId = els.filterTarget.value || null;
  state.wishlistOnly = els.filterWishlist.checked;
  state.showBlacklisted = els.filterBlacklisted.checked;
  state.selectedCategoryIds = getCheckedIds(els.filterCategories);
  state.selectedTagIds = getCheckedIds(els.filterTags);
  saveState();
  renderRestaurantList();
  renderLottery();
  resetTinderBattle();
}

function clearFilters() {
  state.selectedTargetAreaId = null;
  state.selectedCategoryIds = [];
  state.selectedTagIds = [];
  state.wishlistOnly = false;
  state.showBlacklisted = false;
  state.lastLotteryRestaurantId = null;
  tinderBattle = null;
  commit("已清除篩選");
}

function toggleRestaurantAction(action, id) {
  const restaurant = state.restaurants.find((item) => item.id === id);
  if (!restaurant) return;
  if (action === "wishlist") {
    restaurant.isWishlisted = !restaurant.isWishlisted;
    commit(restaurant.isWishlisted ? "已加入待吃" : "已移出待吃");
  }
  if (action === "blacklist") {
    restaurant.isBlacklisted = !restaurant.isBlacklisted;
    if (restaurant.isBlacklisted && state.lastLotteryRestaurantId === restaurant.id) {
      state.lastLotteryRestaurantId = null;
    }
    commit(restaurant.isBlacklisted ? "已加入避雷" : "已取消避雷");
  }
  if (action === "verify") {
    restaurant.dataVerified = !restaurant.dataVerified;
    commit(restaurant.dataVerified ? "已標為確認" : "已標為待確認");
  }
  if (action === "delete") {
    state.restaurants = state.restaurants.filter((item) => item.id !== id);
    if (state.lastLotteryRestaurantId === id) state.lastLotteryRestaurantId = null;
    if (currentRestaurantId === id) backToRestaurantList();
    commit("已刪除餐廳");
  }
}

function parseArray(value) {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  if (typeof value === "string") return value.split("|").map(text).filter(Boolean);
  return [];
}

function validateImportPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, message: "JSON 需要是物件格式" };
  }
  if (!Array.isArray(payload.restaurants)) {
    return { ok: false, message: "缺少 restaurants 陣列" };
  }
  if (payload.restaurants.length === 0) {
    return { ok: false, message: "匯入清單沒有餐廳" };
  }
  return { ok: true };
}

function previewImport(payload) {
  const validation = validateImportPayload(payload);
  if (!validation.ok) return { ok: false, message: validation.message };

  const duplicateKeys = new Set(
    state.restaurants.map((restaurant) => `${normalizeName(restaurant.name)}|${normalizeName(restaurant.address)}`)
  );
  const validRestaurants = [];
  const duplicates = [];
  const errors = [];

  payload.restaurants.forEach((item, index) => {
    const name = text(item.name);
    if (!name) {
      errors.push({ index, reason: "缺少餐廳名稱" });
      return;
    }
    const address = text(item.address);
    const key = `${normalizeName(name)}|${normalizeName(address)}`;
    if (duplicateKeys.has(key)) {
      duplicates.push({ index, name });
      return;
    }
    duplicateKeys.add(key);
    validRestaurants.push(item);
  });

  return {
    ok: true,
    targetArea: payload.targetArea || null,
    restaurants: validRestaurants,
    duplicateCount: duplicates.length,
    errorCount: errors.length
  };
}

function handlePreviewImport() {
  let payload;
  try {
    payload = JSON.parse(els.importJson.value);
  } catch {
    pendingImport = null;
    els.confirmImport.disabled = true;
    els.importPreview.innerHTML = '<span class="tag warn">JSON 格式錯誤</span>';
    return;
  }

  const preview = previewImport(payload);
  if (!preview.ok) {
    pendingImport = null;
    els.confirmImport.disabled = true;
    els.importPreview.innerHTML = `<span class="tag warn">${escapeHtml(preview.message)}</span>`;
    return;
  }

  pendingImport = preview;
  els.confirmImport.disabled = preview.restaurants.length === 0;
  els.importPreview.innerHTML = `
    <p><strong>${preview.restaurants.length}</strong> 筆可新增，<strong>${preview.duplicateCount}</strong> 筆重複，<strong>${preview.errorCount}</strong> 筆錯誤</p>
  `;
}

function importPreviewToState(importPreview, note) {
  const targetAreaId = getOrCreateTargetAreaId(importPreview.targetArea);
  const importBatchId = createId("import");

  for (const item of importPreview.restaurants) {
    const categoryIds = parseArray(item.categoryNames).map(getOrCreateCategoryId).filter(Boolean);
    const tagIds = parseArray(item.tagNames).map(getOrCreateTagId).filter(Boolean);
    const aiSuggestedTagIds = parseArray(item.aiSuggestedTagNames).map(getOrCreateTagId).filter(Boolean);
    state.restaurants.push({
      id: createId("res"),
      targetAreaId,
      importBatchId,
      name: text(item.name),
      address: text(item.address),
      googleMapsUrl: text(item.googleMapsUrl),
      categoryIds,
      tagIds,
      aiSuggestedTagIds,
      aiSuggestionNote: text(item.aiSuggestionNote),
      dataVerified: Boolean(item.dataVerified),
      source: text(item.source) || "manual-google-maps-offline-ai",
      priceText: text(item.priceText),
      rating: typeof item.rating === "number" ? item.rating : null,
      reviewCount: typeof item.reviewCount === "number" ? item.reviewCount : null,
      openingHoursText: text(item.openingHoursText),
      distanceText: text(item.distanceText),
      distanceRank: typeof item.distanceRank === "number" ? item.distanceRank : null,
      latitude: typeof item.latitude === "number" ? item.latitude : null,
      longitude: typeof item.longitude === "number" ? item.longitude : null,
      note: text(item.note),
      privateNote: "",
      isWishlisted: false,
      isBlacklisted: false,
      enabled: true,
      visitRecords: [],
      createdAt: new Date().toISOString()
    });
  }

  state.importBatches.push({
    id: importBatchId,
    targetAreaId,
    sourceType: "offline-ai-google整理",
    importedAt: new Date().toISOString(),
    restaurantCount: importPreview.restaurants.length,
    note
  });
}

function applyImport() {
  if (!pendingImport) return;
  importPreviewToState(pendingImport, "由 JSON 匯入");

  els.importJson.value = "";
  els.importPreview.innerHTML = "";
  commit("匯入完成");
}

function applyInitialSeeds() {
  const seedPayloads = Array.isArray(window.FOOD_PICKER_INITIAL_IMPORTS) ? window.FOOD_PICKER_INITIAL_IMPORTS : [];
  if (!seedPayloads.length) return;
  if (state.restaurants.length > 0 || state.targetAreas.length > 0 || state.importBatches.length > 0) return;

  for (const payload of seedPayloads) {
    const preview = previewImport(payload);
    if (preview.ok && preview.restaurants.length > 0) {
      importPreviewToState(preview, "初始資料：新莊高中附近餐廳");
    }
  }
  saveState();
}

function migrateLegacyXinzhuangSeed() {
  const seedPayloads = Array.isArray(window.FOOD_PICKER_INITIAL_IMPORTS) ? window.FOOD_PICKER_INITIAL_IMPORTS : [];
  const hasLegacySeed = state.restaurants.some((restaurant) => restaurant.source === "xinzhuang-high-school-initial-seed");
  if (!seedPayloads.length || !hasLegacySeed) return;

  state.restaurants = state.restaurants.filter((restaurant) => restaurant.source !== "xinzhuang-high-school-initial-seed");
  state.importBatches = state.importBatches.filter((batch) => !String(batch.note || "").includes("新莊高中附近餐廳"));

  for (const payload of seedPayloads) {
    const preview = previewImport(payload);
    if (preview.ok && preview.restaurants.length > 0) {
      importPreviewToState(preview, "遷移初始資料：Google Maps 新莊高中 10 筆");
    }
  }
  saveState();
}

function loadSeedDataManually() {
  const seedPayloads = Array.isArray(window.FOOD_PICKER_INITIAL_IMPORTS) ? window.FOOD_PICKER_INITIAL_IMPORTS : [];
  let added = 0;
  for (const payload of seedPayloads) {
    const preview = previewImport(payload);
    if (preview.ok && preview.restaurants.length > 0) {
      importPreviewToState(preview, "手動載入初始資料：新莊高中附近餐廳");
      added += preview.restaurants.length;
    }
  }
  if (!added) {
    showToast("沒有新的初始資料可載入");
    return;
  }
  commit(`已載入 ${added} 筆初始資料`);
}

async function drawRestaurant() {
  if (lotteryAnimating) return;
  const restaurants = getFilteredRestaurants().filter((restaurant) => !restaurant.isBlacklisted && restaurant.enabled);
  if (restaurants.length === 0) {
    state.lastLotteryRestaurantId = null;
    saveState();
    renderLottery();
    showToast("目前沒有可抽的餐廳");
    return;
  }
  const picked = restaurants[Math.floor(Math.random() * restaurants.length)];
  lotteryAnimating = true;
  els.drawRestaurant.disabled = true;
  els.drawRestaurant.textContent = "挑選中";
  await animateLotterySelection(restaurants, picked);
  state.lastLotteryRestaurantId = picked.id;
  recordWeeklyPick(picked.id);
  saveState();
  renderLottery();
  renderWeekCalendar();
  openLotteryResultModal(picked);
  showToast("抽籤完成");
  els.drawRestaurant.disabled = false;
  els.drawRestaurant.textContent = "開始抽籤";
  lotteryAnimating = false;
}

function bindEvents() {
  els.fabAdd.addEventListener("click", toggleAddMenu);
  for (const button of els.navButtons) {
    button.addEventListener("click", () => switchPage(button.dataset.page));
  }
  for (const button of els.openModalButtons) {
    button.addEventListener("click", () => {
      if (button.dataset.openModal === "restaurant-modal") {
        prepareRestaurantCreateForm();
      }
      openModal(button.dataset.openModal);
    });
  }
  for (const button of els.closeModalButtons) {
    button.addEventListener("click", closeModals);
  }
  for (const modal of els.modals) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModals();
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAddMenu();
      closeFilterOptions();
      closeModals();
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#add-menu") && !event.target.closest("#fab-add")) {
      closeAddMenu();
    }
    if (!event.target.closest(".filter-menu-wrap")) {
      closeFilterOptions();
    }
    if (!event.target.closest(".chip-select")) {
      document.querySelectorAll(".chip-select.is-open").forEach((wrapper) => {
        wrapper.classList.remove("is-open");
        wrapper.querySelector(".chip-select-control")?.setAttribute("aria-expanded", "false");
      });
    }
  });
  els.targetForm.addEventListener("submit", addTargetArea);
  els.categoryForm.addEventListener("submit", addCategory);
  els.tagForm.addEventListener("submit", addTag);
  els.restaurantForm.addEventListener("submit", addRestaurant);
  els.filterTarget.addEventListener("change", updateFilters);
  els.filterOptionsButton.addEventListener("click", toggleFilterOptions);
  els.filterWishlist.addEventListener("change", updateFilters);
  els.filterBlacklisted.addEventListener("change", updateFilters);
  els.filterCategories.addEventListener("change", updateFilters);
  els.filterTags.addEventListener("change", updateFilters);
  els.clearFilters.addEventListener("click", clearFilters);
  els.previewImport.addEventListener("click", handlePreviewImport);
  els.confirmImport.addEventListener("click", applyImport);
  els.loadSeedData.addEventListener("click", loadSeedDataManually);
  els.drawRestaurant.addEventListener("click", drawRestaurant);
  els.closeLotteryResult.addEventListener("click", closeLotteryResultModal);
  els.startTinder.addEventListener("click", startTinderBattle);
  els.tinderMatch.addEventListener("click", (event) => {
    const choice = event.target.closest("[data-tinder-choice]");
    if (choice) chooseTinderRestaurant(choice.dataset.tinderChoice);
  });
  els.backToList.addEventListener("click", backToRestaurantList);
  els.editRestaurantDetail.addEventListener("click", () => {
    if (currentRestaurantId) openRestaurantEditForm(currentRestaurantId);
  });
  els.restaurantList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (button) {
      toggleRestaurantAction(button.dataset.action, button.dataset.id);
      return;
    }
    if (event.target.closest("a")) return;
    const card = event.target.closest(".restaurant-card");
    if (card) openRestaurantDetail(card.dataset.restaurantId);
  });
  els.restaurantList.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest(".restaurant-card");
    if (!card) return;
    event.preventDefault();
    openRestaurantDetail(card.dataset.restaurantId);
  });
}

migrateLegacyXinzhuangSeed();
applyInitialSeeds();
bindEvents();
render();
