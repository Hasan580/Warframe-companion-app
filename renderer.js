// ==========================================
//  WARFRAME COMPANION APP - RENDERER
// ==========================================

(function () {
  'use strict';

  // ---------- Constants ----------
  const API_URL = 'https://api.warframestat.us/items';
  const MARKET_ITEMS_API_URL = 'https://api.warframe.market/v2/items';
  const CDN_URL = 'https://cdn.warframestat.us/img/';
  const MASTERED_STORAGE_KEY = 'warframe_mastered_items';
  const REMOVED_PROFILE_NAME_KEY = 'warframe_profile_name_v1';
  const REMOVED_AUTO_PROFILE_SYNC_KEY = 'warframe_auto_profile_sync_v1';
  const ITEMS_CACHE_KEY = 'warframe_items_cache_v12';
  const MARKET_TRADABLE_CACHE_KEY = 'warframe_market_tradable_names_v2';
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  const MARKET_TRADABLE_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
  const ALWAYS_ON_TOP_KEY = 'warframe_always_on_top_enabled';
  const AUTO_UPDATE_CHECK_KEY = 'warframe_auto_update_check_enabled';
  const SIDEBAR_COLLAPSED_KEY = 'warframe_sidebar_collapsed_v1';
  const REPO_URL = 'https://github.com/Hasan580/Warframe-companion-app.git';
  const UPDATE_REPO_API = 'https://api.github.com/repos/Hasan580/Warframe-companion-app';
  const UPDATE_RELEASE_API = UPDATE_REPO_API + '/releases/latest';
  const UPDATE_TAGS_API = UPDATE_REPO_API + '/tags?per_page=1';
  const UPDATE_PACKAGE_API = UPDATE_REPO_API + '/contents/package.json';
  const WARFRAME_NEWS_API = 'https://api.warframestat.us/pc/news';
  const VAULT_TRADER_API = 'https://api.warframestat.us/pc/vaultTrader';
  const WARFRAMESTAT_PC_API = 'https://api.warframestat.us/pc';
  const FISSURES_API = 'https://api.warframestat.us/pc/fissures';
  const ARBITRATION_API = 'https://api.warframestat.us/pc/arbitration';
  const OFFICIAL_WORLDSTATE_API = 'https://content.warframe.com/dynamic/worldState.php';
  const RELIC_LOOKUP_CACHE_KEY = 'warframe_relic_projection_lookup_v1';
  const NEWS_CACHE_KEY = 'warframe_news_cache_v1';
  const PRIME_RESURGENCE_CACHE_KEY = 'warframe_prime_resurgence_cache_v2';
  const CETUS_CYCLE_API = 'https://api.warframestat.us/pc/cetusCycle/';
  const VALLIS_CYCLE_API = 'https://api.warframestat.us/pc/vallisCycle/';
  const CAMBION_CYCLE_API = 'https://api.warframestat.us/pc/cambionCycle/';
  const DUVIRI_CYCLE_API = 'https://api.warframestat.us/pc/duviriCycle/';
  const BUILDS_STORAGE_KEY = 'warframe_item_builds_v1';
  const NEWS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  const PRIME_RESURGENCE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  const RELIC_LOOKUP_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  const BUILD_SLOT_COUNT = 8;
  const BUILD_RANK_MAX = 16;

  // Base mastery progression through MR30
  const MR_XP_MULTIPLIER = 2500;
  const MR30 = 30;
  const MR30_TOTAL_XP = MR_XP_MULTIPLIER * MR30 * MR30; // 2,250,000
  const LEGENDARY_STEP_XP = 147500;
  var panelSwitchInProgress = false;
  const DEFAULT_XP = 3000;
  const MASTERY_EXTRAS_STORAGE_KEY = 'warframe_mastery_extras_v1';
  const NORMAL_STAR_CHART_XP_MAX = 27519;
  const STEEL_PATH_XP_MAX = 27519;
  const INTRINSIC_RANK_XP = 1500;
  const RAILJACK_INTRINSIC_RANK_MAX = 50;
  const DUVIRI_INTRINSIC_RANK_MAX = 40;

  // ---------- State ----------
  let allItems = [];
  let filteredItems = [];
  let masteredSet = new Set();
  let currentCategory = 'all';
  let currentFilter = 'all';
  let searchQuery = '';
  let tradeModeEnabled = false;
  let currentItemInfo = null;
  let currentAppVersion = '';
  let latestNewsItems = [];
  let primeResurgenceData = null;
  let recipeIndexByName = null;
  let recipeIndexByUnique = null;
  let recipeIndexPromise = null;
  let relicProjectionLookup = Object.create(null);
  let relicLookupPromise = null;
  let primeRelicRewardsCache = Object.create(null);
  let primeCountdownTimer = null;
  let removeUpdateEventListener = null;
  let updateAvailableForDownload = false;
  let itemBuildsByKey = Object.create(null);
  let pendingBuildFromHash = null;
  let selectedBuildSlotIndex = 0;
  let currentBuildFamily = 'recommended';
  let buildModSearchQuery = '';
  let currentCycleTab = 'overview';
  let cycleSnapshot = null;
  let cycleCountdownTimer = null;
  let cycleRefreshInProgress = false;
  let cycleAutoRefreshTimeout = null;
  let cycleLastBoundaryRefreshAt = 0;
  let cycleRetryTimeout = null;
  let cycleRetryDelayMs = 5000;
  let sidebarCollapsed = false;
  let masteryExtras = getDefaultMasteryExtras();

  // ---------- DOM Elements ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    itemsGrid: $('#items-grid'),
    loadingContainer: $('#loading-container'),
    emptyState: $('#empty-state'),
    searchInput: $('#search-input'),
    searchClear: $('#search-clear'),
    categoryTitle: $('#category-title'),
    categoryItemCount: $('#category-item-count'),
    masteryRankDisplay: $('#mastery-rank-display'),
    masteryXpDisplay: $('#mastery-xp-display'),
    ringProgress: $('#ring-progress'),
    totalMastered: $('#total-mastered'),
    totalItems: $('#total-items'),
    overallProgress: $('#overall-progress'),
    progressPercent: $('#progress-percent'),
    calculatorModal: $('#calculator-modal'),
    resetModal: $('#reset-modal'),
    calcCurrentXp: $('#calc-current-xp'),
    calcCurrentRank: $('#calc-current-rank'),
    targetRankInput: $('#target-rank'),
    calcNormalStarChartXp: $('#calc-normal-star-chart-xp'),
    calcNormalStarChartMaxBtn: $('#calc-normal-star-chart-max'),
    calcSteelPathXp: $('#calc-steel-path-xp'),
    calcSteelPathMaxBtn: $('#calc-steel-path-max'),
    calcRailjackRanks: $('#calc-railjack-ranks'),
    calcRailjackXp: $('#calc-railjack-xp'),
    calcDuviriRanks: $('#calc-duviri-ranks'),
    calcDuviriXp: $('#calc-duviri-xp'),
    calcItemXp: $('#calc-item-xp'),
    calcBonusXp: $('#calc-bonus-xp'),
    calcTrackedTotalXp: $('#calc-tracked-total-xp'),
    calcTargetXp: $('#calc-target-xp'),
    calcXpNeeded: $('#calc-xp-needed'),
    calcItemsNeeded: $('#calc-items-needed'),
    calcProgressPercent: $('#calc-progress-percent'),
    calcProgressBar: $('#calc-progress-bar'),
    tradeModeBtn: $('#btn-trade-mode'),
    settingsOpenBtn: $('#btn-open-settings'),
    settingsPage: $('#settings-page'),
    settingsBackBtn: $('#btn-settings-back'),
    alwaysOnTopToggle: $('#setting-always-on-top'),
    autoUpdateCheckToggle: $('#setting-auto-update-check'),
    openGithubRepoBtn: $('#btn-open-github-repo'),
    updateStatusPill: $('#update-status-pill'),
    updateStatusText: $('#update-status-text'),
    appContainer: $('.app-container'),
    sidebar: $('#sidebar'),
    sidebarToggleBtn: $('#btn-sidebar-toggle'),
    sidebarToggleIcon: $('#sidebar-toggle-icon'),
    newsBtn: $('#btn-news'),
    newsModal: $('#news-modal'),
    newsModalClose: $('#news-modal-close'),
    newsList: $('#news-list'),
    primePanel: $('#prime-panel'),
    primeRefreshBtn: $('#btn-prime-refresh'),
    primeLocationText: $('#prime-location-text'),
    primeCurrentTitle: $('#prime-current-title'),
    primeNextTitle: $('#prime-next-title'),
    primeNextDate: $('#prime-next-date'),
    primeCountdown: $('#prime-countdown'),
    primeFrameAImg: $('#prime-frame-a-img'),
    primeFrameBImg: $('#prime-frame-b-img'),
    primeNextFrameAImg: $('#prime-next-frame-a-img'),
    primeNextFrameBImg: $('#prime-next-frame-b-img'),
    primeWeaponAImg: $('#prime-weapon-a-img'),
    primeWeaponBImg: $('#prime-weapon-b-img'),
    primeWeaponCImg: $('#prime-weapon-c-img'),
    primeHeroBackdrop: $('#prime-hero-backdrop'),
    primeRelicsGrid: $('#prime-relics-grid'),
    primeRelicsSub: $('#prime-relics-sub'),
    cyclesPanel: $('#cycles-panel'),
    cyclesLocationText: $('#cycles-location-text'),
    cyclesRefreshBtn: $('#btn-cycles-refresh'),
    worldstateSummaryGrid: $('#worldstate-summary-grid'),
    worldstateFissuresList: $('#worldstate-fissures-list'),
    worldstateInvasionsList: $('#worldstate-invasions-list'),
    worldstateNightwaveList: $('#worldstate-nightwave-list'),
    worldstateWeeklyList: $('#worldstate-weekly-list'),
    worldstateSpecialsList: $('#worldstate-specials-list'),
    cycleCetusState: $('#cycle-cetus-state'),
    cycleCetusExpiry: $('#cycle-cetus-expiry'),
    cycleCetusTimer: $('#cycle-cetus-timer'),
    cycleFortunaState: $('#cycle-fortuna-state'),
    cycleFortunaExpiry: $('#cycle-fortuna-expiry'),
    cycleFortunaTimer: $('#cycle-fortuna-timer'),
    cycleDeimosState: $('#cycle-deimos-state'),
    cycleDeimosExpiry: $('#cycle-deimos-expiry'),
    cycleDeimosTimer: $('#cycle-deimos-timer'),
    cycleDuviriState: $('#cycle-duviri-state'),
    cycleDuviriExpiry: $('#cycle-duviri-expiry'),
    cycleDuviriNormalMoodTimer: $('#cycle-duviri-normal-mood-timer'),
    cycleDuviriNormalCircuitTimer: $('#cycle-duviri-normal-circuit-timer'),
    cycleDuviriSteelMoodTimer: $('#cycle-duviri-steel-mood-timer'),
    cycleDuviriSteelCircuitTimer: $('#cycle-duviri-steel-circuit-timer'),
    cycleCardCetus: $('#cycle-card-cetus'),
    cycleCardFortuna: $('#cycle-card-fortuna'),
    cycleCardDeimos: $('#cycle-card-deimos'),
    cycleCardDuviriNormal: $('#cycle-card-duviri-normal'),
    cycleCardDuviriSteel: $('#cycle-card-duviri-steel'),
    cycleDuviriSteelChip: $('#cycle-duviri-steel-chip'),
    cycleDuviriSteelSub: $('#cycle-duviri-steel-sub'),
    cycleDuviriNormalItems: $('#cycle-duviri-normal-items'),
    cycleDuviriHardItems: $('#cycle-duviri-hard-items'),
    updateCheckNowBtn: $('#btn-check-updates-now'),
    updateDownloadBtn: $('#btn-download-update'),
    settingsUpdateDetails: $('#settings-update-details'),
    settingsAppVersion: $('#settings-app-version'),
    itemInfoModal: $('#item-info-modal'),
    itemInfoClose: $('#item-info-close'),
    itemInfoName: $('#item-info-name'),
    itemInfoImg: $('#item-info-img'),
    itemInfoSummary: $('#item-info-summary'),
    itemInfoDescription: $('#item-info-description'),
    itemInfoWikiBtn: $('#item-info-wiki-btn'),
    itemInfoMarketBtn: $('#item-info-market-btn'),
    itemInfoPaneResources: $('#item-info-pane-resources'),
    itemInfoTabInfo: $('#item-info-tab-info'),
    itemInfoTabMission: $('#item-info-tab-mission'),
    itemInfoTabResources: $('#item-info-tab-resources'),
    itemInfoTabBuild: $('#item-info-tab-build'),
    itemInfoPaneInfo: $('#item-info-pane-info'),
    itemInfoPaneMission: $('#item-info-pane-mission'),
    itemInfoPaneBuild: $('#item-info-pane-build'),
    itemInfoFarmList: $('#item-info-farm-list'),
    itemInfoCraftList: $('#item-info-craft-list'),
    itemBuildSlots: $('#item-build-slots'),
    itemBuildFormaCount: $('#item-build-forma-count'),
    itemBuildCopyLink: $('#item-build-copy-link'),
    itemBuildCopyChat: $('#item-build-copy-chat'),
    itemBuildShareStatus: $('#item-build-share-status'),
    itemBuildSelectedSlot: $('#item-build-selected-slot'),
    itemBuildFamilyTabs: $('#item-build-family-tabs'),
    itemBuildModSearch: $('#item-build-mod-search'),
    itemBuildModList: $('#item-build-mod-list'),
  };

  // ---------- Window Controls ----------
  $('#btn-minimize').addEventListener('click', () => window.electronAPI.minimize());
  $('#btn-maximize').addEventListener('click', () => window.electronAPI.maximize());
  $('#btn-close').addEventListener('click', () => window.electronAPI.close());

  // ---------- Helpers ----------
  var NECRAMECH_NAMES = {
    'bonewidow': true,
    'voidrig': true,
  };

  var FORCED_SENTINEL_NAMES = {
    'bharira hound': true,
    'dorma hound': true,
    'hec hound': true,
    'lambeo moa': true,
    'para moa': true,
    'nychus moa': true,
    'oloro moa': true,
  };

  var BUILD_POLARITY_OPTIONS = [
    { id: 'none', label: 'None' },
    { id: 'madurai', label: 'Madurai (V)' },
    { id: 'vazarin', label: 'Vazarin (D)' },
    { id: 'naramon', label: 'Naramon (-)' },
    { id: 'zenurik', label: 'Zenurik (=)' },
    { id: 'unairu', label: 'Unairu (U)' },
    { id: 'penjaga', label: 'Penjaga (Y)' },
    { id: 'umbra', label: 'Umbra' },
  ];

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function buildWikiUrl(item) {
    var direct = String(item && (item.wikiaUrl || item.wikiUrl) ? (item.wikiaUrl || item.wikiUrl) : '').trim();
    if (direct) return direct;

    var name = String(item && item.name ? item.name : '').trim();
    if (!name) return '';
    return 'https://warframe.fandom.com/wiki/' + encodeURIComponent(name.replace(/\s+/g, '_'));
  }

  function isVehicleItem(item) {
    var type = String(item.type || '').toLowerCase();
    var category = String(item.category || '').toLowerCase();
    var name = String(item.name || '').toLowerCase();

    if (type.indexOf('archwing') !== -1 || type.indexOf('arch-gun') !== -1 || type.indexOf('arch-melee') !== -1) return true;
    if (type.indexOf('k-drive') !== -1) return true;
    if (category === 'archwing' || category === 'arch-gun' || category === 'arch-melee') return true;
    if (NECRAMECH_NAMES[name]) return true;
    if (name.indexOf('necramech') !== -1) return true;
    return false;
  }

  function isModItem(item) {
    var type = String(item.type || '').toLowerCase();
    var category = String(item.category || '').toLowerCase();
    return category === 'mods' || type.indexOf(' mod') !== -1 || type === 'mod';
  }

  function normalizeCategory(cat, item) {
    var itemName = String((item && item.name) || '').toLowerCase();
    if (item && isModItem(item)) return 'Mods';
    if (FORCED_SENTINEL_NAMES[itemName]) return 'Sentinels';
    if (item && isVehicleItem(item)) return 'Vehicles';

    const map = {
      'Warframes': 'Warframes',
      'Primary': 'Primary',
      'Secondary': 'Secondary',
      'Melee': 'Melee',
      'Pets': 'Companions',
      'Sentinels': 'Sentinels',
      'Archwing': 'Vehicles',
      'Arch-Gun': 'Vehicles',
      'Arch-Melee': 'Vehicles',
    };
    return map[cat] || cat;
  }

  function toTitleCaseFromSlug(text) {
    if (!text) return 'Unknown Item';
    return text
      .replace(/^\/+/, '')
      .split(/[\/_-]+/)
      .filter(Boolean)
      .map(function(part) { return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(); })
      .join(' ');
  }

  function normalizeItem(item) {
    var uniqueName = item.uniqueName || item.unique_name || item.slug || '';
    var imageName = item.imageName || item.image_name || '';
    var fallbackName = uniqueName ? uniqueName.split('/').pop() : '';
    var name = item.name || item.itemName || toTitleCaseFromSlug(fallbackName);
    var category = normalizeCategory(item.category || item.type || 'Misc', item);

    return {
      uniqueName: uniqueName,
      name: name,
      category: category,
      type: item.type || item.category || category,
      tradable: item.tradable === true || item.tradeable === true || String(item.tradable).toLowerCase() === 'true' || String(item.tradeable).toLowerCase() === 'true',
      imageName: imageName,
      description: item.description || '',
      wikiaUrl: item.wikiaUrl || item.wikiUrl || '',
      wikiAvailable: item.wikiAvailable !== false,
      drops: Array.isArray(item.drops) ? item.drops : [],
      components: Array.isArray(item.components) ? item.components : [],
      buildPrice: typeof item.buildPrice === 'number' ? item.buildPrice : 0,
      bpCost: typeof item.bpCost === 'number' ? item.bpCost : 0,
      marketCost: typeof item.marketCost === 'number' ? item.marketCost : 0,
      tags: Array.isArray(item.tags) ? item.tags : [],
      productCategory: item.productCategory || '',
      isPrime: !!item.isPrime,
      masteryReq: item.masteryReq || 0,
    };
  }

  function toLookupKey(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/[’'`]/g, '')
      .replace(/[^a-z0-9+]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function toCompactLookupKey(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  function findItemByLooseName(rawName) {
    var exactKey = toLookupKey(rawName);
    var compactKey = toCompactLookupKey(rawName);

    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i] || {};
      if (toLookupKey(item.name) === exactKey) return item;
    }

    for (var j = 0; j < allItems.length; j++) {
      var item2 = allItems[j] || {};
      if (toCompactLookupKey(item2.name) === compactKey) return item2;
    }

    return null;
  }

  function normalizeChoiceName(name) {
    var raw = String(name || '').trim();
    if (!raw) return '';
    return raw.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
  }

  function findIncarnonItemByBaseName(baseName) {
    var base = toLookupKey(baseName);
    if (!base) return null;

    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i] || {};
      var itemName = toLookupKey(item.name);
      if (itemName.indexOf(base) === -1) continue;
      if (itemName.indexOf('incarnon') === -1) continue;
      return item;
    }

    return null;
  }

  function getNextCircuitResetTimestamp(nowMs) {
    var now = new Date(Number.isFinite(nowMs) ? nowMs : Date.now());
    var year = now.getUTCFullYear();
    var month = now.getUTCMonth();
    var date = now.getUTCDate();
    var day = now.getUTCDay();

    var mondayIndex = 1;
    var daysUntilReset = (mondayIndex - day + 7) % 7;
    var thisResetTs = Date.UTC(year, month, date, 0, 0, 0, 0);
    var nextResetTs = thisResetTs + (daysUntilReset * 24 * 60 * 60 * 1000);
    if (nextResetTs <= now.getTime()) {
      nextResetTs += 7 * 24 * 60 * 60 * 1000;
    }
    return nextResetTs;
  }

  function getBuildItemKey(item) {
    var unique = String(item && item.uniqueName ? item.uniqueName : '').trim();
    if (unique) return unique.toLowerCase();
    return 'name:' + toLookupKey(item && item.name ? item.name : '');
  }

  function createEmptyBuild(item) {
    var slots = [];
    for (var i = 0; i < BUILD_SLOT_COUNT; i++) {
      slots.push({ mod: '', rank: 0, polarity: 'none' });
    }
    return {
      itemKey: getBuildItemKey(item),
      itemName: String(item && item.name ? item.name : ''),
      slots: slots,
    };
  }

  function sanitizeBuildSlot(raw) {
    var rankVal = Number(raw && raw.rank);
    var rank = Number.isFinite(rankVal) ? Math.max(0, Math.min(BUILD_RANK_MAX, Math.floor(rankVal))) : 0;
    var polarity = String(raw && raw.polarity ? raw.polarity : 'none');
    var validPolarity = BUILD_POLARITY_OPTIONS.some(function(opt) { return opt.id === polarity; }) ? polarity : 'none';
    return {
      mod: String(raw && raw.mod ? raw.mod : '').slice(0, 80),
      rank: rank,
      polarity: validPolarity,
    };
  }

  function sanitizeBuildData(raw, item) {
    var base = createEmptyBuild(item);
    if (!raw || !Array.isArray(raw.slots)) return base;
    for (var i = 0; i < BUILD_SLOT_COUNT; i++) {
      base.slots[i] = sanitizeBuildSlot(raw.slots[i]);
    }
    return base;
  }

  function loadBuilds() {
    try {
      var raw = localStorage.getItem(BUILDS_STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;

      var out = Object.create(null);
      var keys = Object.keys(parsed);
      for (var i = 0; i < keys.length; i++) {
        var key = String(keys[i] || '').trim().toLowerCase();
        if (!key) continue;
        var fakeItem = { uniqueName: key, name: parsed[key] && parsed[key].itemName ? parsed[key].itemName : '' };
        out[key] = sanitizeBuildData(parsed[key], fakeItem);
      }
      itemBuildsByKey = out;
    } catch (e) {
      itemBuildsByKey = Object.create(null);
    }
  }

  function saveBuilds() {
    try {
      localStorage.setItem(BUILDS_STORAGE_KEY, JSON.stringify(itemBuildsByKey));
    } catch (e) {
      // ignore quota issues
    }
  }

  function getBuildForItem(item) {
    var key = getBuildItemKey(item);
    if (!itemBuildsByKey[key]) {
      itemBuildsByKey[key] = createEmptyBuild(item);
      saveBuilds();
    }
    return itemBuildsByKey[key];
  }

  function getBuildFormaCount(build) {
    if (!build || !Array.isArray(build.slots)) return 0;
    var total = 0;
    for (var i = 0; i < build.slots.length; i++) {
      if (String(build.slots[i] && build.slots[i].polarity || 'none') !== 'none') total++;
    }
    return total;
  }

  function getPolarityChip(slot) {
    var id = String(slot && slot.polarity ? slot.polarity : 'none');
    var option = BUILD_POLARITY_OPTIONS.find(function(opt) { return opt.id === id; }) || BUILD_POLARITY_OPTIONS[0];
    return option.label;
  }

  function getPolarityGlyph(slot) {
    var id = String(slot && slot.polarity ? slot.polarity : 'none');
    if (id === 'madurai') return 'V';
    if (id === 'vazarin') return 'D';
    if (id === 'naramon') return '-';
    if (id === 'zenurik') return '=';
    if (id === 'unairu') return 'U';
    if (id === 'penjaga') return 'Y';
    if (id === 'umbra') return 'Um';
    return 'o';
  }

  function inferWeaponSubType(item) {
    var typeBlob = toLookupKey((item && item.type ? item.type : '') + ' ' + (item && item.name ? item.name : ''));
    if (/shotgun/.test(typeBlob)) return 'shotgun';
    if (/sniper/.test(typeBlob)) return 'sniper';
    if (/bow/.test(typeBlob)) return 'bow';
    if (/launcher/.test(typeBlob) || /grenade/.test(typeBlob)) return 'launcher';
    if (/kitgun/.test(typeBlob)) return 'kitgun';
    if (/zaw/.test(typeBlob)) return 'zaw';
    if (/arch gun|archgun/.test(typeBlob)) return 'archgun';
    if (/arch melee|archmelee/.test(typeBlob)) return 'archmelee';
    if (/pistol|secondary/.test(typeBlob)) return 'secondary';
    if (/melee/.test(typeBlob)) return 'melee';
    if (/warframe/.test(typeBlob)) return 'warframe';
    if (/companion|sentinel|kubrow|kavat|moa|hound/.test(typeBlob)) return 'companion';
    if (/archwing/.test(typeBlob)) return 'archwing';
    if (/necramech|voidrig|bonewidow/.test(typeBlob)) return 'necramech';
    return 'primary';
  }

  function getItemCompatibilityProfile(item) {
    var category = String(item && item.category ? item.category : '').toLowerCase();
    var subType = inferWeaponSubType(item);

    if (isNecramechItem(item)) return { family: 'necramech', subType: 'necramech' };
    if (category === 'warframes') return { family: 'warframe', subType: 'warframe' };
    if (category === 'primary') return { family: 'primary', subType: subType };
    if (category === 'secondary') return { family: 'secondary', subType: subType };
    if (category === 'melee') return { family: 'melee', subType: subType };
    if (category === 'vehicles') {
      if (subType === 'archgun') return { family: 'archgun', subType: subType };
      if (subType === 'archmelee') return { family: 'archmelee', subType: subType };
      return { family: 'archwing', subType: subType };
    }
    if (category === 'companions' || category === 'sentinels') return { family: 'companion', subType: 'companion' };
    return { family: 'all', subType: 'all' };
  }

  function isModCompatibleWithItem(mod, item) {
    var type = String(mod && mod.type ? mod.type : '').toLowerCase();
    var profile = getItemCompatibilityProfile(item);

    if (profile.family === 'all') return true;
    if (type === 'mod set mod') return true;
    if (type === 'peculiar mod' && profile.family === 'warframe') return true;

    if (profile.family === 'warframe') {
      return type === 'warframe mod';
    }

    if (profile.family === 'primary') {
      if (profile.subType === 'shotgun') return type === 'shotgun mod' || type === 'shotgun riven mod';
      if (profile.subType === 'sniper' || profile.subType === 'bow' || profile.subType === 'launcher' || profile.subType === 'primary') {
        return type === 'primary mod' || type === 'rifle riven mod';
      }
      if (profile.subType === 'kitgun') return type === 'primary mod' || type === 'rifle riven mod' || type === 'kitgun riven mod';
      return type === 'primary mod' || type === 'rifle riven mod';
    }

    if (profile.family === 'secondary') {
      if (profile.subType === 'kitgun') return type === 'secondary mod' || type === 'pistol riven mod' || type === 'kitgun riven mod';
      return type === 'secondary mod' || type === 'pistol riven mod';
    }

    if (profile.family === 'melee') {
      if (profile.subType === 'zaw') return type === 'melee mod' || type === 'stance mod' || type === 'zaw riven mod';
      return type === 'melee mod' || type === 'stance mod' || type === 'melee riven mod';
    }

    if (profile.family === 'necramech') {
      return type === 'necramech mod';
    }

    if (profile.family === 'companion') {
      return type === 'companion mod' || type === 'companion weapon riven mod';
    }

    if (profile.family === 'archgun') {
      return type === 'arch-gun mod' || type === 'arch-gun riven mod';
    }

    if (profile.family === 'archmelee') {
      return type === 'arch-melee mod';
    }

    if (profile.family === 'archwing') {
      return type === 'archwing mod';
    }

    return false;
  }

  function getBuildFamilyForItem(item) {
    var profile = getItemCompatibilityProfile(item);
    if (profile.family === 'primary' || profile.family === 'secondary' || profile.family === 'melee') return 'weapon';
    if (profile.family === 'archgun' || profile.family === 'archmelee' || profile.family === 'archwing') return 'archwing';
    return profile.family;
  }

  function cycleSlotPolarity(item, slotIndex) {
    var build = getBuildForItem(item);
    var slot = build.slots[slotIndex];
    if (!slot) return;

    var current = String(slot.polarity || 'none');
    var index = BUILD_POLARITY_OPTIONS.findIndex(function(opt) { return opt.id === current; });
    var nextIndex = index >= 0 ? (index + 1) % BUILD_POLARITY_OPTIONS.length : 1;
    slot.polarity = BUILD_POLARITY_OPTIONS[nextIndex].id;
    saveBuilds();
    renderBuildPane(item);
  }

  function classifyBuildFamilyFromItem(item) {
    return getBuildFamilyForItem(item);
  }

  function classifyModFamily(mod) {
    var blob = toLookupKey(
      (mod && mod.name ? mod.name : '') + ' ' +
      (mod && mod.type ? mod.type : '') + ' ' +
      (mod && mod.description ? mod.description : '') + ' ' +
      (Array.isArray(mod && mod.tags) ? mod.tags.join(' ') : '')
    );

    if (/necramech|voidrig|bonewidow/.test(blob)) return 'necramech';
    if (/archwing|arch gun|archgun|arch melee|archmelee|heavy weapon/.test(blob)) return 'archwing';
    if (/sentinel|companion|kubrow|kavat|moa|beast|hound|vulpaphyla|predasite/.test(blob)) return 'companion';
    if (/warframe|ability|aura|exilus/.test(blob)) return 'warframe';
    if (/rifle|shotgun|sniper|pistol|secondary|melee|glaive|sword|nikana|staff|hammer|primary/.test(blob)) return 'weapon';
    return 'all';
  }

  function getBuildFamilyTabs(item) {
    var recommended = classifyBuildFamilyFromItem(item);
    return [
      { id: 'recommended', label: 'Recommended', target: recommended },
      { id: 'warframe', label: 'Warframe', target: 'warframe' },
      { id: 'weapon', label: 'Weapons', target: 'weapon' },
      { id: 'necramech', label: 'Necramech', target: 'necramech' },
      { id: 'companion', label: 'Companion', target: 'companion' },
      { id: 'archwing', label: 'Archwing', target: 'archwing' },
      { id: 'all', label: 'All Mods', target: 'all' }
    ];
  }

  function getActiveBuildFamilyTarget(item) {
    var tabs = getBuildFamilyTabs(item);
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].id === currentBuildFamily) return tabs[i].target;
    }
    return tabs[0].target;
  }

  function getFilteredBuildMods(item) {
    var targetFamily = getActiveBuildFamilyTarget(item);
    var query = toLookupKey(buildModSearchQuery);

    var out = [];
    for (var i = 0; i < allItems.length; i++) {
      var mod = allItems[i];
      if (!mod || mod.category !== 'Mods') continue;
      if (!isModCompatibleWithItem(mod, item)) continue;

      var family = classifyModFamily(mod);
      if (targetFamily !== 'all' && family !== targetFamily) continue;
      if (query && toLookupKey(mod.name).indexOf(query) === -1) continue;

      out.push(mod);
    }

    out.sort(function(a, b) { return String(a.name || '').localeCompare(String(b.name || '')); });
    return out.slice(0, 180);
  }

  function setBuildShareStatus(text, isError) {
    if (!els.itemBuildShareStatus) return;
    var msg = String(text || '').trim();
    if (!msg) {
      els.itemBuildShareStatus.textContent = '';
      els.itemBuildShareStatus.classList.add('hidden');
      els.itemBuildShareStatus.classList.remove('is-error');
      return;
    }
    els.itemBuildShareStatus.textContent = msg;
    els.itemBuildShareStatus.classList.remove('hidden');
    els.itemBuildShareStatus.classList.toggle('is-error', !!isError);
  }

  function updateBuildFormaDisplay(item) {
    if (!els.itemBuildFormaCount || !item) return;
    var build = getBuildForItem(item);
    els.itemBuildFormaCount.textContent = String(getBuildFormaCount(build));
    if (els.itemBuildSelectedSlot) {
      els.itemBuildSelectedSlot.textContent = 'Selected Slot: ' + String(selectedBuildSlotIndex + 1);
    }
  }

  function renderBuildFamilyTabs(item) {
    if (!els.itemBuildFamilyTabs) return;

    var tabs = getBuildFamilyTabs(item);
    els.itemBuildFamilyTabs.textContent = '';

    for (var i = 0; i < tabs.length; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'item-build-family-tab' + (tabs[i].id === currentBuildFamily ? ' active' : '');
      btn.setAttribute('data-family', tabs[i].id);
      btn.textContent = tabs[i].label;
      els.itemBuildFamilyTabs.appendChild(btn);
    }
  }

  function applyModToSelectedSlot(item, modName) {
    var build = getBuildForItem(item);
    if (!build.slots[selectedBuildSlotIndex]) return;
    build.slots[selectedBuildSlotIndex].mod = String(modName || '').slice(0, 80);
    saveBuilds();
    renderBuildSlots(item);
    updateBuildFormaDisplay(item);
  }

  function changeSlotRank(item, slotIndex, delta) {
    var build = getBuildForItem(item);
    var slot = build.slots[slotIndex];
    if (!slot) return;
    var next = Math.max(0, Math.min(BUILD_RANK_MAX, Number(slot.rank || 0) + delta));
    slot.rank = next;
    saveBuilds();
    renderBuildSlots(item);
  }

  function renderBuildModList(item) {
    if (!els.itemBuildModList) return;
    var mods = getFilteredBuildMods(item);
    els.itemBuildModList.textContent = '';

    if (mods.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'item-build-mod-empty';
      empty.textContent = 'No mods found for this family.';
      els.itemBuildModList.appendChild(empty);
      return;
    }

    for (var i = 0; i < mods.length; i++) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'item-build-mod-chip';
      chip.setAttribute('data-mod-name', mods[i].name || '');
      chip.textContent = mods[i].name || 'Unknown Mod';
      els.itemBuildModList.appendChild(chip);
    }
  }

  function renderBuildSlots(item) {
    if (!els.itemBuildSlots || !item) return;
    var build = getBuildForItem(item);
    els.itemBuildSlots.textContent = '';

    selectedBuildSlotIndex = Math.max(0, Math.min(BUILD_SLOT_COUNT - 1, selectedBuildSlotIndex));

    for (var i = 0; i < BUILD_SLOT_COUNT; i++) {
      var slot = build.slots[i] || sanitizeBuildSlot(null);

      var row = document.createElement('div');
      row.className = 'item-build-slot' + (i === selectedBuildSlotIndex ? ' is-selected' : '');
      row.addEventListener('click', function(idx) {
        return function() {
          selectedBuildSlotIndex = idx;
          renderBuildPane(item);
        };
      }(i));

      var head = document.createElement('div');
      head.className = 'item-build-slot-head';

      var formaBtn = document.createElement('button');
      formaBtn.className = 'item-build-slot-forma' + (String(slot.polarity || 'none') !== 'none' ? ' active' : '');
      formaBtn.type = 'button';
      formaBtn.title = 'Polarity: ' + getPolarityChip(slot) + ' (click to change)';
      formaBtn.textContent = getPolarityGlyph(slot);
      formaBtn.addEventListener('click', function(idx) {
        return function(evt) {
          evt.stopPropagation();
          cycleSlotPolarity(item, idx);
        };
      }(i));

      var index = document.createElement('div');
      index.className = 'item-build-slot-index';
      index.textContent = String(i + 1);

      head.appendChild(formaBtn);
      head.appendChild(index);

      var modName = document.createElement('div');
      modName.className = 'item-build-slot-mod-name' + (slot.mod ? '' : ' is-empty');
      modName.textContent = slot.mod || 'Empty';

      var footer = document.createElement('div');
      footer.className = 'item-build-slot-footer';

      var rankDec = document.createElement('button');
      rankDec.className = 'item-build-rank-btn';
      rankDec.type = 'button';
      rankDec.textContent = '-';
      rankDec.addEventListener('click', function(idx) {
        return function(evt) {
          evt.stopPropagation();
          changeSlotRank(item, idx, -1);
        };
      }(i));

      var rankText = document.createElement('div');
      rankText.className = 'item-build-rank-value';
      rankText.textContent = 'R' + String(slot.rank || 0);

      var rankInc = document.createElement('button');
      rankInc.className = 'item-build-rank-btn';
      rankInc.type = 'button';
      rankInc.textContent = '+';
      rankInc.addEventListener('click', function(idx) {
        return function(evt) {
          evt.stopPropagation();
          changeSlotRank(item, idx, 1);
        };
      }(i));

      footer.appendChild(rankDec);
      footer.appendChild(rankText);
      footer.appendChild(rankInc);

      row.appendChild(head);
      row.appendChild(modName);
      row.appendChild(footer);
      els.itemBuildSlots.appendChild(row);
    }
  }

  function renderBuildPane(item) {
    if (!item) return;
    updateBuildFormaDisplay(item);
    renderBuildSlots(item);
    renderBuildFamilyTabs(item);
    renderBuildModList(item);
    setBuildShareStatus('');
  }

  function buildSharePayload(item) {
    var build = getBuildForItem(item);
    return {
      i: getBuildItemKey(item),
      n: String(item && item.name ? item.name : ''),
      f: getBuildFormaCount(build),
      s: build.slots.map(function(slot) {
        return {
          m: String(slot.mod || ''),
          r: Number(slot.rank || 0),
          p: String(slot.polarity || 'none'),
        };
      }),
    };
  }

  function encodeBuildPayload(payload) {
    var json = JSON.stringify(payload || {});
    var utf8 = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, function(_, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    });
    var base = btoa(utf8);
    return base.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function decodeBuildPayload(encoded) {
    try {
      var base = String(encoded || '').replace(/-/g, '+').replace(/_/g, '/');
      while (base.length % 4 !== 0) base += '=';
      var json = decodeURIComponent(Array.prototype.map.call(atob(base), function(ch) {
        return '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function createBuildShareLink(item) {
    var payload = buildSharePayload(item);
    var encoded = encodeBuildPayload(payload);
    var baseUrl = String(window.location.href || '').split('#')[0];
    if (/^file:\/\//i.test(baseUrl)) {
      return 'WCA-BUILD:' + encoded;
    }
    return baseUrl + '#build=' + encoded;
  }

  function readBuildFromHash() {
    var rawHash = String(window.location.hash || '').replace(/^#/, '');
    if (!rawHash) return;

    var params = new URLSearchParams(rawHash);
    var buildEncoded = params.get('build');
    if (!buildEncoded) return;

    var decoded = decodeBuildPayload(buildEncoded);
    if (!decoded || !Array.isArray(decoded.s)) return;

    pendingBuildFromHash = {
      key: String(decoded.i || '').toLowerCase(),
      nameKey: toLookupKey(decoded.n || ''),
      raw: {
        slots: decoded.s.map(function(slot) {
          return {
            mod: String(slot && slot.m ? slot.m : ''),
            rank: Number(slot && slot.r ? slot.r : 0),
            polarity: String(slot && slot.p ? slot.p : 'none')
          };
        })
      }
    };
  }

  function tryApplyPendingBuildForItem(item) {
    if (!pendingBuildFromHash || !item) return false;

    var itemKey = getBuildItemKey(item);
    var itemNameKey = toLookupKey(item.name || '');
    var keyMatches = pendingBuildFromHash.key && pendingBuildFromHash.key === itemKey;
    var nameMatches = pendingBuildFromHash.nameKey && pendingBuildFromHash.nameKey === itemNameKey;
    if (!keyMatches && !nameMatches) return false;

    itemBuildsByKey[itemKey] = sanitizeBuildData(pendingBuildFromHash.raw, item);
    saveBuilds();
    pendingBuildFromHash = null;
    return true;
  }

  async function copyTextToClipboard(text) {
    var value = String(text || '');
    if (!value) return false;

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (e) {
      // fallback below
    }

    try {
      var ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.left = '-1000px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return !!ok;
    } catch (e2) {
      return false;
    }
  }

  function buildGameShareText(item) {
    var build = getBuildForItem(item);
    var lines = [];
    var modLinks = [];

    function toWarframeLink(name) {
      var clean = String(name || '').replace(/[\[\]]/g, '').trim();
      return clean ? ('[' + clean + ']') : '[Unknown]';
    }

    function toConfigLabel(name) {
      return String(name || '').replace(/[\[\]]/g, '').trim() || 'Item';
    }

    lines.push(toWarframeLink(item && item.name ? item.name : 'Item'));
    lines.push('[Mod Config: ' + toConfigLabel(item && item.name ? item.name : 'Item') + ']');

    for (var i = 0; i < build.slots.length; i++) {
      var slot = build.slots[i] || {};
      var modName = String(slot.mod || '').trim();
      if (!modName) continue;
      modLinks.push(toWarframeLink(modName));
    }

    if (modLinks.length === 0) {
      lines.push('No mods selected yet.');
      return lines.join('\r\n');
    }

    lines.push(modLinks.join(' '));
    return lines.join('\r\n');
  }

  function getRecipeCandidate(item, component) {
    if (!component) return null;
    var unique = String(component.uniqueName || '').toLowerCase();
    if (unique && recipeIndexByUnique && recipeIndexByUnique[unique]) {
      return recipeIndexByUnique[unique];
    }

    var compName = String(component.name || '').trim();
    var itemName = String(item && item.name ? item.name : '').trim();
    var candidates = [];

    if (compName) {
      candidates.push(compName);
      if (itemName && compName.toLowerCase().indexOf(itemName.toLowerCase()) !== 0) {
        candidates.push(itemName + ' ' + compName);
      }
    }

    for (var i = 0; i < candidates.length; i++) {
      var key = toLookupKey(candidates[i]);
      if (key && recipeIndexByName && recipeIndexByName[key]) {
        return recipeIndexByName[key];
      }
    }

    return null;
  }

  async function ensureRecipeIndexLoaded() {
    if (recipeIndexByName && recipeIndexByUnique) return;
    if (recipeIndexPromise) {
      await recipeIndexPromise;
      return;
    }

    recipeIndexPromise = (async function() {
      var resp = await fetch(API_URL);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var data = await resp.json();
      var byName = Object.create(null);
      var byUnique = Object.create(null);

      for (var i = 0; i < data.length; i++) {
        var it = data[i] || {};
        var nameKey = toLookupKey(it.name || '');
        var uniqueKey = String(it.uniqueName || '').toLowerCase();
        if (nameKey && !byName[nameKey]) byName[nameKey] = it;
        if (uniqueKey && !byUnique[uniqueKey]) byUnique[uniqueKey] = it;
      }

      recipeIndexByName = byName;
      recipeIndexByUnique = byUnique;
    })();

    try {
      await recipeIndexPromise;
    } finally {
      recipeIndexPromise = null;
    }
  }

  function isLikelyPartName(componentName) {
    var name = String(componentName || '').toLowerCase();
    if (!name || name === 'blueprint') return false;
    return (
      name.indexOf('chassis') !== -1 ||
      name.indexOf('systems') !== -1 ||
      name.indexOf('neuroptics') !== -1 ||
      name.indexOf('capsule') !== -1 ||
      name.indexOf('casing') !== -1 ||
      name.indexOf('engine') !== -1 ||
      name.indexOf('weapon pod') !== -1 ||
      name.indexOf('barrel') !== -1 ||
      name.indexOf('receiver') !== -1 ||
      name.indexOf('stock') !== -1 ||
      name.indexOf('blade') !== -1 ||
      name.indexOf('handle') !== -1 ||
      name.indexOf('hilt') !== -1 ||
      name.indexOf('link') !== -1 ||
      name.indexOf('grip') !== -1 ||
      name.indexOf('string') !== -1
    );
  }

  function getPartResourceList(recipe) {
    var out = [];
    if (!recipe || !Array.isArray(recipe.components)) return out;

    for (var i = 0; i < recipe.components.length; i++) {
      var comp = recipe.components[i] || {};
      var name = String(comp.name || '').trim();
      if (!name || name.toLowerCase() === 'blueprint') continue;
      var count = typeof comp.itemCount === 'number' ? comp.itemCount : 1;
      out.push(name + ' x' + count);
    }
    return out;
  }

  async function getCraftPartEntries(item) {
    await ensureRecipeIndexLoaded();
    var entries = [];

    if (!item || !Array.isArray(item.components)) return entries;

    for (var i = 0; i < item.components.length; i++) {
      var comp = item.components[i] || {};
      var compName = String(comp.name || '').trim();
      if (!compName || compName.toLowerCase() === 'blueprint') continue;

      var recipe = getRecipeCandidate(item, comp);
      var resources = getPartResourceList(recipe);
      var hasPartSignal = isLikelyPartName(compName) || (Array.isArray(comp.drops) && comp.drops.length > 0) || resources.length > 0;
      if (!hasPartSignal) continue;

      entries.push({
        part: compName,
        resources: resources,
      });
    }

    return entries;
  }

  function getMarketTradeCandidates(itemName) {
    var base = toLookupKey(itemName);
    if (!base) return [];

    var out = [base];
    var imprintName = String(itemName || '').trim();
    if (/^helminth charger$/i.test(imprintName) || /(kubrow|kavat|vulpaphyla|predasite)$/i.test(imprintName)) {
      out.push(toLookupKey(imprintName + ' Imprint'));
    }
    out.push(base + ' blueprint');
    out.push(base + ' set');

    return out;
  }

  function saveMarketTradableCache(nameSet) {
    try {
      localStorage.setItem(MARKET_TRADABLE_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        names: Array.from(nameSet),
      }));
    } catch (e) { /* ignore quota */ }
  }

  function loadMarketTradableCache() {
    try {
      var raw = localStorage.getItem(MARKET_TRADABLE_CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.names)) return null;
      if (Date.now() - parsed.timestamp > MARKET_TRADABLE_CACHE_TTL) return null;
      return new Set(parsed.names);
    } catch (e) {
      return null;
    }
  }

  async function getMarketTradableNameSet() {
    var cached = loadMarketTradableCache();
    if (cached) return cached;

    try {
      var resp = await fetch(MARKET_ITEMS_API_URL);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var json = await resp.json();
      var data = Array.isArray(json.data) ? json.data : [];
      var set = new Set();

      for (var i = 0; i < data.length; i++) {
        var it = data[i] || {};
        var en = it.i18n && it.i18n.en ? it.i18n.en : {};
        var name = en.name || it.item_name || it.name || '';
        var key = toLookupKey(name);
        if (key) set.add(key);
      }

      saveMarketTradableCache(set);
      return set;
    } catch (err) {
      console.warn('Failed to load market tradable names:', err);
      return new Set();
    }
  }

  async function enrichItemsTradability(items) {
    if (!Array.isArray(items) || items.length === 0) return;
    var tradableNames = await getMarketTradableNameSet();

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item.tradable) {
        var candidates = getMarketTradeCandidates(item.name);
        for (var c = 0; c < candidates.length; c++) {
          if (tradableNames.has(candidates[c])) {
            item.tradable = true;
            break;
          }
        }
      }
    }
  }

  function getChecklistImageUrl(imageName) {
    if (!imageName) return '';
    if (/^https?:\/\//i.test(imageName)) return imageName;
    return CDN_URL + encodeURI(String(imageName).replace(/^\/+/, ''));
  }

  function getNewsImageUrl(imagePath) {
    if (!imagePath) return '';
    if (/^https?:\/\//i.test(imagePath)) return imagePath;
    return CDN_URL + encodeURI(String(imagePath).replace(/^\/+/, ''));
  }

  function saveNewsCache(items) {
    try {
      localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        items: items
      }));
    } catch (e) { /* ignore */ }
  }

  function savePrimeResurgenceCache(payload) {
    try {
      localStorage.setItem(PRIME_RESURGENCE_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        payload: payload
      }));
    } catch (e) { /* ignore */ }
  }

  function loadPrimeResurgenceCache() {
    try {
      var raw = localStorage.getItem(PRIME_RESURGENCE_CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.payload) return null;
      if (Date.now() - parsed.timestamp > PRIME_RESURGENCE_CACHE_TTL) return null;
      if (Array.isArray(parsed.payload.relics)) {
        for (var i = 0; i < parsed.payload.relics.length; i++) {
          var relic = parsed.payload.relics[i] || {};
          var relicName = String(relic.name || '');
          if (relicName.indexOf('?') !== -1 || relicName === 'Unknown Relic') {
            return null;
          }
        }
      }
      return parsed.payload;
    } catch (e) {
      return null;
    }
  }

  function loadNewsCache(allowStale) {
    try {
      var raw = localStorage.getItem(NEWS_CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items)) return null;
      if (!allowStale && Date.now() - parsed.timestamp > NEWS_CACHE_TTL) return null;
      var filtered = parsed.items.filter(function(item) {
        return !!(item && item.title) && toNewsTimestamp(item.date) > 0;
      });
      return filtered.length > 0 ? filtered : null;
    } catch (e) {
      return null;
    }
  }

  function normalizeNewsEntry(entry) {
    var title = String(entry && (entry.message || entry.title || entry.text) || '').trim();
    var image = String(entry && (entry.imageLink || entry.image || entry.imageUrl) || '').trim();
    var link = String(entry && (entry.link || entry.url) || '').trim();
    var date = String(entry && (entry.date || entry.createdAt || entry.timestamp) || '').trim();
    if (!title || toNewsTimestamp(date) <= 0) return null;
    return {
      title: title,
      image: getNewsImageUrl(image),
      link: link,
      date: date
    };
  }

  function formatNewsDate(rawDate) {
    if (!rawDate) return '';
    var date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
  }

  function toNewsTimestamp(rawDate) {
    if (!rawDate) return 0;
    var parsed = new Date(rawDate);
    var ts = parsed.getTime();
    return Number.isFinite(ts) ? ts : 0;
  }

  function buildRelicProjectionLookup(rawItems) {
    var lookup = Object.create(null);
    if (!Array.isArray(rawItems)) return lookup;

    for (var i = 0; i < rawItems.length; i++) {
      var item = rawItems[i] || {};
      var uniqueName = String(item.uniqueName || '').toLowerCase();
      var name = String(item.name || '').trim();
      var type = String(item.type || '').toLowerCase();

      if (!uniqueName || !name) continue;
      if (type !== 'relic') continue;

      lookup[normalizeProjectionUniqueName(uniqueName)] = {
        name: name,
        imageName: String(item.imageName || '')
      };
    }

    return lookup;
  }

  function saveRelicLookupCache(lookup) {
    try {
      localStorage.setItem(RELIC_LOOKUP_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        lookup: lookup
      }));
    } catch (e) { /* ignore */ }
  }

  function loadRelicLookupCache() {
    try {
      var raw = localStorage.getItem(RELIC_LOOKUP_CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.lookup || typeof parsed.lookup !== 'object') return null;
      if (Date.now() - parsed.timestamp > RELIC_LOOKUP_CACHE_TTL) return null;
      return parsed.lookup;
    } catch (e) {
      return null;
    }
  }

  async function ensureRelicLookupLoaded() {
    if (relicProjectionLookup && Object.keys(relicProjectionLookup).length > 0) return true;

    var cached = loadRelicLookupCache();
    if (cached) {
      relicProjectionLookup = cached;
      return true;
    }

    if (relicLookupPromise) {
      try {
        await relicLookupPromise;
        return relicProjectionLookup && Object.keys(relicProjectionLookup).length > 0;
      } catch (e) {
        return false;
      }
    }

    relicLookupPromise = (async function() {
      var resp = await fetch(API_URL);
      if (!resp.ok) throw new Error('Failed to load relic lookup: HTTP ' + resp.status);
      var data = await resp.json();
      var lookup = buildRelicProjectionLookup(data);
      relicProjectionLookup = lookup;
      saveRelicLookupCache(lookup);
    })();

    try {
      await relicLookupPromise;
      return relicProjectionLookup && Object.keys(relicProjectionLookup).length > 0;
    } catch (e) {
      return false;
    } finally {
      relicLookupPromise = null;
    }
  }

  function toPrimeNameMatchKey(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, ' ')
      .replace(/\bprime\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizePrimeDisplayName(name) {
    var cleaned = String(name || '')
      .replace(/\bblueprint\b/gi, ' ')
      .replace(/\bset\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return '';

    // Some API rows use prefix form like "Prime Dual Kamas".
    if (/^prime\s+/i.test(cleaned) && !/\sprime$/i.test(cleaned)) {
      cleaned = cleaned.replace(/^prime\s+/i, '').trim() + ' Prime';
    }

    return cleaned;
  }

  function normalizeProjectionUniqueName(rawUniqueName) {
    return String(rawUniqueName || '')
      .toLowerCase()
      .replace('/storeitems', '')
      .replace(/^\/+/, '/');
  }

  function toLookupUniqueNameKey(rawUniqueName) {
    return String(rawUniqueName || '')
      .toLowerCase()
      .replace('/storeitems', '')
      .replace('/types/game/projections/', '/storeitems/types/game/projections/')
      .replace(/^\/+/, '/');
  }

  function readWorldStateDate(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (value.$date && typeof value.$date.$numberLong === 'string') {
      var num = parseInt(value.$date.$numberLong, 10);
      if (Number.isFinite(num)) return new Date(num).toISOString();
    }
    if (value.$date && typeof value.$date === 'string') return value.$date;
    return '';
  }

  function buildItemNameLookupFromAllItems() {
    var lookup = Object.create(null);
    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i] || {};
      var key = toLookupUniqueNameKey(item.uniqueName || '');
      if (!key || !item.name) continue;
      if (!lookup[key]) lookup[key] = item.name;
    }
    return lookup;
  }

  function fallbackNameFromUniqueName(uniqueName) {
    var raw = String(uniqueName || '').split('/').pop() || '';
    if (!raw) return 'Unknown Item';
    var clean = raw
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/Prime/g, ' Prime')
      .replace(/\s+/g, ' ')
      .trim();
    return clean;
  }

  function resolveWorldStateItemName(itemType, itemNameLookup) {
    var key = toLookupUniqueNameKey(itemType);
    if (itemNameLookup[key]) return itemNameLookup[key];

    var projectionName = resolveRelicNameFromProjection(itemType);
    if (projectionName !== 'Unknown Relic' && projectionName.indexOf('?') === -1) {
      return projectionName;
    }

    return fallbackNameFromUniqueName(itemType);
  }

  function normalizeOfficialPrimeVaultTrader(worldStateData) {
    var traders = Array.isArray(worldStateData && worldStateData.PrimeVaultTraders) ? worldStateData.PrimeVaultTraders : [];
    if (!traders.length) throw new Error('PrimeVaultTraders not found in official worldstate.');

    var now = Date.now();
    var selected = traders[0];
    for (var t = 0; t < traders.length; t++) {
      var candidate = traders[t] || {};
      var expTs = toNewsTimestamp(readWorldStateDate(candidate.Expiry));
      if (expTs > now) {
        selected = candidate;
        break;
      }
    }

    var itemNameLookup = buildItemNameLookupFromAllItems();
    var manifest = Array.isArray(selected && selected.Manifest) ? selected.Manifest : [];
    var scheduleInfo = Array.isArray(selected && selected.ScheduleInfo) ? selected.ScheduleInfo : [];

    var inventory = [];
    for (var i = 0; i < manifest.length; i++) {
      var row = manifest[i] || {};
      var itemType = String(row.ItemType || '');
      if (!itemType) continue;
      inventory.push({
        uniqueName: itemType,
        item: resolveWorldStateItemName(itemType, itemNameLookup),
        ducats: typeof row.PrimePrice === 'number' ? row.PrimePrice : null,
        credits: typeof row.RegularPrice === 'number' ? row.RegularPrice : null
      });
    }

    var schedule = [];
    for (var s = 0; s < scheduleInfo.length; s++) {
      var sched = scheduleInfo[s] || {};
      schedule.push({
        expiry: readWorldStateDate(sched.Expiry),
        item: resolveWorldStateItemName(String(sched.FeaturedItem || ''), itemNameLookup)
      });
    }

    return {
      activation: readWorldStateDate(selected && selected.Activation),
      expiry: readWorldStateDate(selected && selected.Expiry),
      character: 'Varzia',
      location: "Maroo's Bazaar (Mars)",
      inventory: inventory,
      schedule: schedule
    };
  }

  function normalizeResurgencePackLabel(text) {
    return String(text || '')
      .replace(/\bM\s*P\s*V\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function findPrimeWarframeItemByName(name) {
    var target = toPrimeNameMatchKey(name);
    if (!target) return null;
    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i];
      if (!item || !item.isPrime) continue;
      if (item.category !== 'Warframes') continue;
      if (toPrimeNameMatchKey(item.name) === target) return item;
    }
    return null;
  }

  function findPrimeWeaponItemByName(name) {
    var cleanName = normalizePrimeDisplayName(name);
    var target = toPrimeNameMatchKey(cleanName);
    if (!target) return null;

    var looseMatch = null;
    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i];
      if (!item) continue;
      var itemKey = toPrimeNameMatchKey(item.name);
      if (!itemKey) continue;

      if (item.isPrime && (item.category === 'Primary' || item.category === 'Secondary' || item.category === 'Melee' || item.category === 'Vehicles') && itemKey === target) {
        return item;
      }

      if (itemKey === target && !looseMatch) {
        looseMatch = item;
      }

      if (!looseMatch && (itemKey.indexOf(target) !== -1 || target.indexOf(itemKey) !== -1)) {
        looseMatch = item;
      }
    }

    return looseMatch;
  }

  function getPrimeWarframeNames() {
    var names = [];
    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i];
      if (!item || !item.isPrime || item.category !== 'Warframes') continue;
      names.push(String(item.name || ''));
    }
    names.sort(function(a, b) {
      return b.length - a.length;
    });
    return names;
  }

  function parseFrameNamesFromScheduleLabel(label) {
    var out = [];
    var clean = normalizeResurgencePackLabel(label)
      .replace(/\bPrime\s+Dual\s+Pack\b/gi, '')
      .replace(/\bPrime\s+Single\s+Pack\b/gi, '')
      .replace(/\bDual\s+Pack\b/gi, '')
      .replace(/\bSingle\s+Pack\b/gi, '')
      .replace(/\bPack\b/gi, '')
      .replace(/\s*&\s*/g, ' ')
      .replace(/\s+and\s+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    var knownPrimeNames = getPrimeWarframeNames();
    var matched = {};
    for (var i = 0; i < knownPrimeNames.length; i++) {
      var primeName = knownPrimeNames[i];
      var baseName = primeName.replace(/\s+Prime$/i, '');
      var re = new RegExp('(^|\\s)' + baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s|$)', 'i');
      if (re.test(clean) && !matched[primeName]) {
        out.push(primeName);
        matched[primeName] = true;
      }
      if (out.length >= 2) break;
    }

    return out;
  }

  function getCurrentPrimeFramesFromInventory(inventory) {
    var out = [];
    var seen = {};
    if (!Array.isArray(inventory)) return out;

    for (var i = 0; i < inventory.length; i++) {
      var it = inventory[i] || {};
      var itemName = String(it.item || '').trim();
      var uniqueName = String(it.uniqueName || '');
      if (!itemName || !uniqueName) continue;
      if (uniqueName.toLowerCase().indexOf('/powersuits/') === -1) continue;
      if (!/\sPrime$/i.test(itemName)) continue;
      if (seen[itemName]) continue;
      seen[itemName] = true;
      out.push(itemName);
    }

    return out;
  }

  function getCurrentPrimeWeaponsFromInventory(inventory) {
    var out = [];
    var seen = {};
    if (!Array.isArray(inventory)) return out;

    for (var i = 0; i < inventory.length; i++) {
      var it = inventory[i] || {};
      var itemName = String(it.item || '').trim();
      var uniqueName = String(it.uniqueName || '').toLowerCase();
      if (!itemName || !uniqueName) continue;
      if (uniqueName.indexOf('/weapons/') === -1) continue;
      var normalizedName = normalizePrimeDisplayName(itemName);
      if (!/\bprime\b/i.test(normalizedName)) continue;
      var seenKey = toPrimeNameMatchKey(normalizedName);
      if (!seenKey || seen[seenKey]) continue;
      seen[seenKey] = true;
      out.push(normalizedName);
    }

    return out;
  }

  function resolveRelicNameFromProjection(projectionUniqueName) {
    var key = normalizeProjectionUniqueName(projectionUniqueName);
    if (relicProjectionLookup[key] && relicProjectionLookup[key].name) {
      return relicProjectionLookup[key].name;
    }

    var tierMap = {
      t1: 'Lith',
      t2: 'Meso',
      t3: 'Neo',
      t4: 'Axi'
    };
    var m = key.match(/\/(t[1-4])voidprojection/i);
    if (m && tierMap[m[1].toLowerCase()]) {
      return tierMap[m[1].toLowerCase()] + ' ? Intact';
    }
    return 'Unknown Relic';
  }

  function normalizePrimeResurgencePayload(vaultData) {
    var schedule = Array.isArray(vaultData && vaultData.schedule) ? vaultData.schedule.slice() : [];
    schedule.sort(function(a, b) {
      return toNewsTimestamp(a && a.expiry) - toNewsTimestamp(b && b.expiry);
    });

    var currentExpiry = String(vaultData && vaultData.expiry || '');
    var currentIndex = -1;
    for (var i = 0; i < schedule.length; i++) {
      if (String(schedule[i] && schedule[i].expiry || '') === currentExpiry) {
        currentIndex = i;
        break;
      }
    }

    var currentSchedule = currentIndex >= 0 ? schedule[currentIndex] : null;
    var nextSchedule = null;
    for (var s = 0; s < schedule.length; s++) {
      var sched = schedule[s] || {};
      var schedTs = toNewsTimestamp(sched.expiry);
      if (schedTs <= toNewsTimestamp(currentExpiry)) continue;
      if (!String(sched.item || '').trim()) continue;
      nextSchedule = sched;
      break;
    }

    var currentFrames = getCurrentPrimeFramesFromInventory(vaultData && vaultData.inventory);
    var currentWeapons = getCurrentPrimeWeaponsFromInventory(vaultData && vaultData.inventory);
    if (currentFrames.length === 0 && currentSchedule && currentSchedule.item) {
      currentFrames = parseFrameNamesFromScheduleLabel(currentSchedule.item);
    }

    var nextFrames = [];
    var nextLabel = '';
    if (nextSchedule && nextSchedule.item) {
      nextFrames = parseFrameNamesFromScheduleLabel(nextSchedule.item);
      nextLabel = normalizeResurgencePackLabel(nextSchedule.item);
    }

    var currentLabel = currentFrames.length > 0
      ? currentFrames.join(' & ')
      : normalizeResurgencePackLabel(currentSchedule && currentSchedule.item ? currentSchedule.item : 'Prime Rotation');

    if (!nextLabel) {
      nextLabel = nextFrames.length > 0 ? nextFrames.join(' & ') : 'Coming Soon';
    }

    var relics = [];
    var inventory = Array.isArray(vaultData && vaultData.inventory) ? vaultData.inventory : [];
    for (var r = 0; r < inventory.length; r++) {
      var inv = inventory[r] || {};
      var uniqueName = String(inv.uniqueName || '');
      if (uniqueName.toLowerCase().indexOf('/projections/') === -1) continue;
      relics.push({
        uniqueName: uniqueName,
        name: resolveRelicNameFromProjection(uniqueName),
        ayaCost: typeof inv.credits === 'number' ? inv.credits : null,
        regalAyaCost: typeof inv.ducats === 'number' ? inv.ducats : null
      });
    }

    relics.sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });

    return {
      location: String(vaultData && vaultData.location || "Maroo's Bazaar (Mars)"),
      activation: String(vaultData && vaultData.activation || ''),
      expiry: currentExpiry,
      nextExpiry: String(nextSchedule && nextSchedule.expiry || ''),
      currentLabel: currentLabel,
      nextLabel: nextLabel,
      currentFrames: currentFrames,
      nextFrames: nextFrames,
      currentWeapons: currentWeapons,
      relics: relics
    };
  }

  async function fetchPrimeResurgence(forceRefresh) {
    var lookupReady = await ensureRelicLookupLoaded();

    if (!forceRefresh) {
      var cached = loadPrimeResurgenceCache();
      if (cached) return cached;
    }

    var data;
    var primaryError = null;

    try {
      var resp = await fetch(VAULT_TRADER_API);
      if (!resp.ok) throw new Error('warframestat vaultTrader HTTP ' + resp.status);
      data = await resp.json();
    } catch (err) {
      primaryError = err;
      var fallbackResp = await fetch(OFFICIAL_WORLDSTATE_API);
      if (!fallbackResp.ok) {
        throw new Error('Primary failed (' + (primaryError && primaryError.message ? primaryError.message : 'unknown') + '), fallback worldstate HTTP ' + fallbackResp.status);
      }
      var fallbackData = await fallbackResp.json();
      data = normalizeOfficialPrimeVaultTrader(fallbackData);
    }

    var normalized = normalizePrimeResurgencePayload(data);

    var hasUnknownRelics = false;
    if (Array.isArray(normalized.relics)) {
      for (var i = 0; i < normalized.relics.length; i++) {
        var relicName = String(normalized.relics[i] && normalized.relics[i].name || '');
        if (relicName.indexOf('?') !== -1 || relicName === 'Unknown Relic') {
          hasUnknownRelics = true;
          break;
        }
      }
    }

    if (!hasUnknownRelics || !lookupReady) {
      savePrimeResurgenceCache(normalized);
    }
    return normalized;
  }

  function formatCountdown(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return '00d 00h 00m 00s';
    var totalSeconds = Math.floor(ms / 1000);
    var days = Math.floor(totalSeconds / 86400);
    var hours = Math.floor((totalSeconds % 86400) / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    return String(days).padStart(2, '0') + 'd ' +
      String(hours).padStart(2, '0') + 'h ' +
      String(minutes).padStart(2, '0') + 'm ' +
      String(seconds).padStart(2, '0') + 's';
  }

  function stopPrimeCountdown() {
    if (primeCountdownTimer) {
      clearInterval(primeCountdownTimer);
      primeCountdownTimer = null;
    }
  }

  function startPrimeCountdown(expiryIso) {
    stopPrimeCountdown();
    if (!els.primeCountdown) return;

    var expiryTs = toNewsTimestamp(expiryIso);
    var tick = function() {
      var remaining = expiryTs - Date.now();
      els.primeCountdown.textContent = formatCountdown(remaining);
      if (remaining <= 0) {
        stopPrimeCountdown();
        loadPrimeResurgence(true);
      }
    };

    tick();
    primeCountdownTimer = setInterval(tick, 1000);
  }

  function updatePrimeFrameImages(frameNames, slots, updateBackdrop) {
    var targetSlots = Array.isArray(slots) && slots.length > 0 ? slots : [els.primeFrameAImg, els.primeFrameBImg];
    var urls = [];

    for (var i = 0; i < targetSlots.length; i++) {
      var slot = targetSlots[i];
      if (!slot) continue;

      var frameName = frameNames && frameNames[i] ? frameNames[i] : '';
      var frameItem = findPrimeWarframeItemByName(frameName);
      var imageUrl = frameItem && frameItem.imageName ? getChecklistImageUrl(frameItem.imageName) : '';

      if (imageUrl) {
        slot.src = imageUrl;
        slot.alt = frameName || 'Prime frame';
        slot.classList.remove('hidden');
        urls.push(imageUrl);
      } else {
        slot.src = '';
        slot.alt = 'Prime frame';
        slot.classList.add('hidden');
      }
    }

    if (updateBackdrop && els.primeHeroBackdrop) {
      if (urls.length > 0) {
        var layers = [];
        for (var u = 0; u < urls.length; u++) {
          layers.push('url("' + urls[u].replace(/"/g, '%22') + '")');
        }
        els.primeHeroBackdrop.style.backgroundImage = layers.join(', ');
      } else {
        els.primeHeroBackdrop.style.backgroundImage = 'none';
      }
    }
  }

  function updatePrimeWeaponImages(weaponNames) {
    var slots = [els.primeWeaponAImg, els.primeWeaponBImg, els.primeWeaponCImg];

    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      if (!slot) continue;

      var weaponName = weaponNames && weaponNames[i] ? weaponNames[i] : '';
      var weaponItem = findPrimeWeaponItemByName(weaponName);
      var imageUrl = weaponItem && weaponItem.imageName ? getChecklistImageUrl(weaponItem.imageName) : '';

      if (imageUrl) {
        slot.src = imageUrl;
        slot.alt = weaponName || 'Prime weapon';
        slot.classList.remove('hidden');
      } else {
        slot.src = '';
        slot.alt = 'Prime weapon';
        slot.classList.add('hidden');
      }
    }
  }

  function formatRewardChance(chance) {
    if (typeof chance !== 'number' || !Number.isFinite(chance)) return '';
    var fixed = chance % 1 === 0 ? chance.toFixed(0) : chance.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return fixed + '%';
  }

  function raritySortScore(rarity) {
    var value = String(rarity || '').toLowerCase();
    if (value === 'rare') return 3;
    if (value === 'uncommon') return 2;
    if (value === 'common') return 1;
    return 0;
  }

  async function fetchRelicRewardsByName(relicName) {
    var key = String(relicName || '').trim();
    if (!key) return [];
    if (primeRelicRewardsCache[key]) return primeRelicRewardsCache[key];

    try {
      var resp = await fetch('https://api.warframestat.us/items/' + encodeURIComponent(key));
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var item = await resp.json();
      var rewards = Array.isArray(item && item.rewards) ? item.rewards : [];

      var normalized = [];
      for (var i = 0; i < rewards.length; i++) {
        var reward = rewards[i] || {};
        var rewardItem = reward.item || {};
        var rewardName = String(rewardItem.name || '').trim();
        if (!rewardName) continue;
        normalized.push({
          name: rewardName,
          rarity: String(reward.rarity || 'Unknown'),
          chance: typeof reward.chance === 'number' ? reward.chance : null
        });
      }

      normalized.sort(function(a, b) {
        var rarityDiff = raritySortScore(b.rarity) - raritySortScore(a.rarity);
        if (rarityDiff !== 0) return rarityDiff;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });

      primeRelicRewardsCache[key] = normalized;
      return normalized;
    } catch (err) {
      primeRelicRewardsCache[key] = [];
      return [];
    }
  }

  function renderRelicRewards(hoverEl, rewards) {
    if (!hoverEl) return;
    hoverEl.textContent = '';

    if (!rewards || rewards.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'prime-relic-empty';
      empty.textContent = 'No reward table available.';
      hoverEl.appendChild(empty);
      return;
    }

    for (var i = 0; i < rewards.length; i++) {
      var reward = rewards[i];

      var row = document.createElement('div');
      row.className = 'prime-relic-reward-row';

      var left = document.createElement('span');
      left.className = 'prime-relic-reward-name';
      left.textContent = reward.name;

      var right = document.createElement('span');
      right.className = 'prime-relic-reward-meta';
      var chance = formatRewardChance(reward.chance);
      right.textContent = reward.rarity + (chance ? ' • ' + chance : '');

      row.appendChild(left);
      row.appendChild(right);
      hoverEl.appendChild(row);
    }
  }

  function renderPrimeRelics(relics) {
    if (!els.primeRelicsGrid) return;
    els.primeRelicsGrid.textContent = '';

    if (!relics || relics.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'prime-empty';
      empty.textContent = 'No Prime Resurgence relics available for this rotation.';
      els.primeRelicsGrid.appendChild(empty);
      return;
    }

    for (var i = 0; i < relics.length; i++) {
      var relic = relics[i];
      var card = document.createElement('article');
      card.className = 'prime-relic-card';

      var title = document.createElement('h4');
      title.className = 'prime-relic-name';
      title.textContent = relic.name;

      var cost = document.createElement('div');
      cost.className = 'prime-relic-cost';
      if (typeof relic.ayaCost === 'number') {
        cost.textContent = relic.ayaCost + ' Aya';
      } else if (typeof relic.regalAyaCost === 'number') {
        cost.textContent = relic.regalAyaCost + ' Regal Aya';
      } else {
        cost.textContent = 'Varzia Stock';
      }

      var hint = document.createElement('div');
      hint.className = 'prime-relic-hint';
      hint.textContent = 'Hover to see drops';

      var hover = document.createElement('div');
      hover.className = 'prime-relic-hover';
      hover.innerHTML = '<div class="prime-relic-loading">Loading rewards...</div>';

      card.appendChild(title);
      card.appendChild(cost);
      card.appendChild(hint);
      card.appendChild(hover);
      els.primeRelicsGrid.appendChild(card);

      fetchRelicRewardsByName(relic.name).then(function(targetHover) {
        return function(rewards) {
          renderRelicRewards(targetHover, rewards);
        };
      }(hover));
    }
  }

  function renderPrimeResurgence(data) {
    if (!data) return;
    if (els.primeLocationText) {
      els.primeLocationText.textContent = data.location || "Maroo's Bazaar (Mars)";
    }
    if (els.primeCurrentTitle) {
      els.primeCurrentTitle.textContent = data.currentLabel || 'Current rotation unavailable';
    }
    if (els.primeNextTitle) {
      els.primeNextTitle.textContent = data.nextLabel || 'TBA';
    }
    if (els.primeNextDate) {
      var nextDate = formatNewsDate(data.nextExpiry || data.expiry);
      els.primeNextDate.textContent = nextDate ? ('Starts: ' + nextDate) : 'Starts: TBA';
    }
    if (els.primeRelicsSub) {
      els.primeRelicsSub.textContent = 'Hover a relic to see in-game style rewards';
    }

    updatePrimeFrameImages(data.currentFrames || [], [els.primeFrameAImg, els.primeFrameBImg], true);
    updatePrimeFrameImages(data.nextFrames || [], [els.primeNextFrameAImg, els.primeNextFrameBImg], false);
    updatePrimeWeaponImages(data.currentWeapons || []);
    renderPrimeRelics(data.relics || []);
    startPrimeCountdown(data.expiry);
  }

  async function loadPrimeResurgence(forceRefresh) {
    if (!els.primeRelicsGrid) return;
    els.primeRelicsGrid.innerHTML = '<div class="prime-loading">Loading Prime Resurgence...</div>';

    try {
      primeResurgenceData = await fetchPrimeResurgence(!!forceRefresh);
      renderPrimeResurgence(primeResurgenceData);
    } catch (err) {
      var msg = err && err.message ? String(err.message) : 'Unknown error';
      if (els.primeRelicsGrid) {
        els.primeRelicsGrid.innerHTML = '<div class="prime-error">Failed to load Prime Resurgence. ' + escapeHtml(msg) + '</div>';
      }
      if (els.primeCurrentTitle) {
        els.primeCurrentTitle.textContent = 'Prime Resurgence unavailable';
      }
      if (els.primeNextTitle) {
        els.primeNextTitle.textContent = 'TBA';
      }
      stopPrimeCountdown();
    }
  }

  async function fetchLatestWarframeNews() {
    var cached = loadNewsCache(false);
    if (cached) return cached;

    try {
      var resp = await fetch(WARFRAME_NEWS_API, { cache: 'no-store' });
      if (!resp.ok) throw new Error('Failed to fetch news: HTTP ' + resp.status);
      var data = await resp.json();
      if (!Array.isArray(data)) return [];

      var items = [];
      for (var i = 0; i < data.length; i++) {
        var normalized = normalizeNewsEntry(data[i]);
        if (normalized) items.push(normalized);
      }

      // Always show newest news first.
      items.sort(function(a, b) {
        return toNewsTimestamp(b.date) - toNewsTimestamp(a.date);
      });

      saveNewsCache(items);
      return items;
    } catch (err) {
      var stale = loadNewsCache(true);
      if (stale && stale.length > 0) return stale;
      throw err;
    }
  }

  function renderNewsList(items) {
    if (!els.newsList) return;
    els.newsList.textContent = '';

    if (!items || items.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'news-empty';
      empty.textContent = 'No news available right now.';
      els.newsList.appendChild(empty);
      return;
    }

    var sortedItems = items.slice().sort(function(a, b) {
      return toNewsTimestamp(b.date) - toNewsTimestamp(a.date);
    });

    for (var i = 0; i < sortedItems.length; i++) {
      var news = sortedItems[i];

      var card = document.createElement('article');
      card.className = 'news-card';

      var imageWrap = document.createElement('div');
      imageWrap.className = 'news-image-wrap';

      if (news.image) {
        var image = document.createElement('img');
        image.className = 'news-image';
        image.src = news.image;
        image.alt = news.title;
        image.loading = 'lazy';
        imageWrap.appendChild(image);
      }

      var title = document.createElement('div');
      title.className = 'news-title';
      title.textContent = news.title;
      imageWrap.appendChild(title);

      var meta = document.createElement('div');
      meta.className = 'news-meta';

      var date = document.createElement('span');
      date.textContent = formatNewsDate(news.date) || 'Warframe News';

      var open = document.createElement('span');
      open.className = 'news-open';
      open.textContent = news.link ? 'Open' : '';

      meta.appendChild(date);
      meta.appendChild(open);

      card.appendChild(imageWrap);
      card.appendChild(meta);

      if (news.link) {
        card.addEventListener('click', function(url) {
          return function() {
            window.open(url, '_blank');
          };
        }(news.link));
      }

      els.newsList.appendChild(card);
    }
  }

  async function openNewsModal() {
    if (!els.newsModal || !els.newsList) return;
    els.newsModal.classList.remove('hidden');
    els.newsList.innerHTML = '<div class="news-loading">Loading latest news...</div>';

    try {
      latestNewsItems = await fetchLatestWarframeNews();
      renderNewsList(latestNewsItems);
    } catch (err) {
      els.newsList.innerHTML = '<div class="news-error">Failed to load news. Please try again.</div>';
    }
  }

  function closeNewsModal() {
    if (!els.newsModal) return;
    els.newsModal.classList.add('hidden');
  }

  function formatPercentChance(chance) {
    if (typeof chance !== 'number') return '';
    return (chance * 100).toFixed(chance < 0.01 ? 2 : 1).replace(/\.0$/, '') + '%';
  }

  function setActiveInfoTab(tab) {
    if (!els.itemInfoTabInfo) return;
    var isInfo = tab === 'info';
    var isMission = tab === 'mission';
    var isResources = tab === 'resources';
    var isBuild = tab === 'build';

    els.itemInfoTabInfo.classList.toggle('active', isInfo);
    els.itemInfoTabMission.classList.toggle('active', isMission);
    els.itemInfoTabResources.classList.toggle('active', isResources);
    if (els.itemInfoTabBuild) els.itemInfoTabBuild.classList.toggle('active', isBuild);

    els.itemInfoTabInfo.setAttribute('aria-selected', isInfo ? 'true' : 'false');
    els.itemInfoTabMission.setAttribute('aria-selected', isMission ? 'true' : 'false');
    els.itemInfoTabResources.setAttribute('aria-selected', isResources ? 'true' : 'false');
    if (els.itemInfoTabBuild) els.itemInfoTabBuild.setAttribute('aria-selected', isBuild ? 'true' : 'false');

    els.itemInfoPaneInfo.classList.toggle('hidden', !isInfo);
    els.itemInfoPaneMission.classList.toggle('hidden', !isMission);
    els.itemInfoPaneResources.classList.toggle('hidden', !isResources);
    if (els.itemInfoPaneBuild) els.itemInfoPaneBuild.classList.toggle('hidden', !isBuild);
  }

  function renderSummary(item) {
    if (!els.itemInfoSummary) return;
    els.itemInfoSummary.textContent = '';
    var masteryXpValue = item.category === 'Mods' ? 'N/A' : getItemXP(item).toLocaleString() + ' XP';

    var summary = [
      { label: 'Category', value: item.category || '-' },
      { label: 'Type', value: item.type || '-' },
      { label: 'Mastery XP', value: masteryXpValue },
      { label: 'Mastery Req', value: String(item.masteryReq || 0) }
    ];

    for (var i = 0; i < summary.length; i++) {
      var block = document.createElement('div');
      block.className = 'item-info-summary-item';
      var label = document.createElement('span');
      label.className = 'item-info-summary-label';
      label.textContent = summary[i].label;
      var value = document.createElement('span');
      value.className = 'item-info-summary-value';
      value.textContent = summary[i].value;
      block.appendChild(label);
      block.appendChild(value);
      els.itemInfoSummary.appendChild(block);
    }
  }

  function appendEmptyInfoRow(container, text) {
    var empty = document.createElement('div');
    empty.className = 'item-info-empty';
    empty.textContent = text;
    container.appendChild(empty);
  }

  function getBlueprintUniqueName(item) {
    if (!item || !Array.isArray(item.components)) return '';
    for (var i = 0; i < item.components.length; i++) {
      var comp = item.components[i] || {};
      if (String(comp.name || '').toLowerCase() === 'blueprint' && comp.uniqueName) {
        return String(comp.uniqueName);
      }
    }
    return '';
  }

  function buildAcquisitionHintEntries(item) {
    var hints = [];
    var seen = {};
    var name = String(item && item.name ? item.name : '');
    var nameLower = name.toLowerCase();
    var description = String(item && item.description ? item.description : '');
    var descriptionLower = description.toLowerCase();
    var bpUniqueLower = getBlueprintUniqueName(item).toLowerCase();

    function add(main, sub) {
      var m = String(main || '').trim();
      var s = String(sub || '').trim();
      if (!m || !s) return;
      var key = m + '|' + s;
      if (seen[key]) return;
      seen[key] = true;
      hints.push({ main: m, sub: s });
    }

    if (nameLower.indexOf('kuva ') === 0) {
      add('Kuva Lich', 'Vanquish a Kuva Lich that is wielding this weapon to claim it.');
    }

    if (nameLower.indexOf('tenet ') === 0) {
      add('Sister of Parvos', 'Defeat a Sister of Parvos wielding this Tenet weapon to claim it.');
    }

    if (nameLower.indexOf('coda ') === 0) {
      add('Coda Adversary', 'Claim this weapon by defeating the matching Coda adversary variant.');
    }

    var isDojoResearch = bpUniqueLower.indexOf('/clantech/') !== -1 ||
      descriptionLower.indexOf('clan dojo') !== -1 ||
      descriptionLower.indexOf('clan research') !== -1 ||
      descriptionLower.indexOf('research') !== -1;
    if (isDojoResearch) {
      add('Clan Dojo Research', 'Research the blueprint in your Clan Dojo lab, then craft it in the Foundry.');
    }

    if (typeof item.bpCost === 'number' && item.bpCost > 0) {
      add('In-Game Market Blueprint', 'Buy the blueprint from the Market for ' + item.bpCost.toLocaleString() + ' Credits.');
    }

    if (typeof item.marketCost === 'number' && item.marketCost > 0) {
      add('In-Game Market Purchase', 'Buy a fully built copy from the Market for ' + item.marketCost.toLocaleString() + ' Platinum.');
    }

    if (hints.length === 0) {
      add('Acquisition', 'Check codex/market entries for current acquisition details for this item.');
    }

    return hints;
  }

  function buildFarmEntries(item) {
    var entries = [];
    var byKey = {};

    function ingestDrops(drops, sourceLabel) {
      if (!Array.isArray(drops)) return;
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i] || {};
        var location = d.location || 'Unknown Location';
        var parts = String(location).split(' - ');
        var mission = parts[0] || location;
        var zone = parts.length > 1 ? parts.slice(1).join(' - ') : '';
        var chanceText = formatPercentChance(d.chance);
        var rarity = d.rarity ? String(d.rarity) : '';
        var key = location + '|' + sourceLabel + '|' + rarity;
        var rightParts = [];
        if (zone) rightParts.push(zone);
        if (sourceLabel) rightParts.push(sourceLabel);
        if (chanceText) rightParts.push(chanceText);
        if (rarity) rightParts.push(rarity);

        if (!byKey[key]) {
          byKey[key] = {
            main: mission,
            sub: rightParts.join(' • ') || 'Drop source',
            score: typeof d.chance === 'number' ? d.chance : 0
          };
        } else if (typeof d.chance === 'number' && d.chance > byKey[key].score) {
          byKey[key].score = d.chance;
          byKey[key].sub = rightParts.join(' • ') || 'Drop source';
        }
      }
    }

    ingestDrops(item.drops || [], '');

    if (Array.isArray(item.components)) {
      for (var c = 0; c < item.components.length; c++) {
        var comp = item.components[c];
        ingestDrops(comp && comp.drops ? comp.drops : [], comp && comp.name ? comp.name : 'Component');
      }
    }

    var values = Object.values(byKey);
    values.sort(function(a, b) {
      return (b.score || 0) - (a.score || 0);
    });

    var hints = buildAcquisitionHintEntries(item);
    for (var h = 0; h < hints.length && entries.length < 16; h++) {
      entries.push(hints[h]);
    }

    for (var v = 0; v < values.length && entries.length < 16; v++) {
      entries.push({ main: values[v].main, sub: values[v].sub || 'Drop source' });
    }
    return entries;
  }

  function buildCraftEntries(item) {
    var entries = [];
    if (!Array.isArray(item.components) || item.components.length === 0) return entries;

    for (var i = 0; i < item.components.length; i++) {
      var comp = item.components[i] || {};
      var count = typeof comp.itemCount === 'number' ? comp.itemCount : 1;
      var needs = [];
      if (Array.isArray(comp.components) && comp.components.length > 0) {
        for (var c = 0; c < comp.components.length; c++) {
          var sub = comp.components[c] || {};
          var subCount = typeof sub.itemCount === 'number' ? sub.itemCount : 1;
          if (sub.name) needs.push(sub.name + ' x' + subCount);
        }
      }
      entries.push({
        main: comp.name || 'Unknown Resource',
        sub: needs.length > 0 ? ('x' + count + ' • Needs: ' + needs.slice(0, 4).join(', ')) : ('x' + count)
      });
    }

    if (typeof item.buildPrice === 'number' && item.buildPrice > 0) {
      entries.push({ main: 'Credits', sub: item.buildPrice.toLocaleString() });
    }
    return entries;
  }

  function populateInfoList(container, entries, emptyText) {
    container.textContent = '';
    if (!entries || entries.length === 0) {
      appendEmptyInfoRow(container, emptyText);
      return;
    }

    for (var i = 0; i < entries.length; i++) {
      var row = document.createElement('div');
      row.className = 'item-info-row';
      var main = document.createElement('span');
      main.className = 'item-info-row-main';
      main.textContent = entries[i].main;
      var sub = document.createElement('span');
      sub.className = 'item-info-row-sub';
      sub.textContent = entries[i].sub || '';
      row.appendChild(main);
      row.appendChild(sub);
      container.appendChild(row);
    }
  }

  async function populateCraftInfoList(container, item) {
    if (!container) return;

    var entries = buildCraftEntries(item);
    container.textContent = '';
    if (!entries || entries.length === 0) {
      appendEmptyInfoRow(container, 'No crafting requirements found.');
      return;
    }

    var partEntries = [];
    try {
      partEntries = await getCraftPartEntries(item);
    } catch (err) {
      partEntries = [];
    }

    var partMap = Object.create(null);
    for (var i = 0; i < partEntries.length; i++) {
      var key = toLookupKey(partEntries[i].part);
      if (key && partEntries[i].resources && partEntries[i].resources.length > 0) {
        partMap[key] = partEntries[i].resources;
      }
    }

    var isFrameOrMech = String(item && item.category ? item.category : '').toLowerCase() === 'warframes' || isNecramechItem(item);

    for (var e = 0; e < entries.length; e++) {
      var row = document.createElement('div');
      row.className = 'item-info-row';

      var main = document.createElement('span');
      main.className = 'item-info-row-main';
      main.textContent = entries[e].main;

      var sub = document.createElement('span');
      sub.className = 'item-info-row-sub';
      sub.textContent = entries[e].sub || '';

      var partResources = partMap[toLookupKey(entries[e].main)] || null;
      var shouldForceToggle = isFrameOrMech && String(entries[e].main || '').toLowerCase() !== 'credits';

      if (partResources || shouldForceToggle) {
        row.classList.add('has-part-toggle');

        var toggle = document.createElement('button');
        toggle.className = 'item-info-part-toggle';
        toggle.type = 'button';
        toggle.setAttribute('aria-label', 'Show part resources');
        toggle.setAttribute('aria-expanded', 'false');

        var icon = document.createElement('span');
        icon.className = 'material-icons-round';
        icon.textContent = 'expand_more';
        toggle.appendChild(icon);

        var detail = document.createElement('div');
        detail.className = 'item-info-part-details hidden';
        if (partResources && partResources.length > 0) {
          detail.textContent = partResources.slice(0, 10).join(' • ');
        } else {
          detail.textContent = 'No detailed sub-recipe is listed for this part in the current API data.';
        }

        toggle.addEventListener('click', function(targetRow, targetDetail, targetToggle) {
          return function(evt) {
            evt.stopPropagation();
            var open = !targetDetail.classList.contains('hidden');
            targetDetail.classList.toggle('hidden', open);
            targetRow.classList.toggle('open', !open);
            targetToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
          };
        }(row, detail, toggle));

        row.appendChild(main);
        row.appendChild(sub);
        row.appendChild(toggle);
        container.appendChild(row);
        container.appendChild(detail);
      } else {
        row.appendChild(main);
        row.appendChild(sub);
        container.appendChild(row);
      }
    }
  }

  function openItemInfoModal(item) {
    if (!els.itemInfoModal) return;
    currentItemInfo = item;
    els.itemInfoName.textContent = item.name || 'Item';
    els.itemInfoImg.src = getChecklistImageUrl(item.imageName);
    els.itemInfoImg.alt = item.name || 'Item';
    els.itemInfoDescription.textContent = item.description || 'No description available.';
    if (els.itemInfoWikiBtn) {
      var wikiUrl = buildWikiUrl(item);
      els.itemInfoWikiBtn.classList.toggle('hidden', !wikiUrl);
      els.itemInfoWikiBtn.disabled = !wikiUrl;
      els.itemInfoWikiBtn.dataset.url = wikiUrl;
    }
    if (els.itemInfoMarketBtn) {
      var canOpenMarket = tradeModeEnabled && !!item.tradable;
      els.itemInfoMarketBtn.classList.toggle('hidden', !canOpenMarket);
      els.itemInfoMarketBtn.disabled = !canOpenMarket;
    }
    renderSummary(item);
    setActiveInfoTab('info');

    populateInfoList(els.itemInfoFarmList, buildFarmEntries(item), 'No farm source data found.');
    populateCraftInfoList(els.itemInfoCraftList, item);

    els.itemInfoModal.classList.remove('hidden');
  }

  function closeItemInfoModal() {
    if (!els.itemInfoModal) return;
    els.itemInfoModal.classList.add('hidden');
    currentItemInfo = null;
  }

  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function isReasonableLiveTimestamp(ts, nowMs, maxFutureMs) {
    var now = Number.isFinite(nowMs) ? nowMs : Date.now();
    var maxFuture = Number.isFinite(maxFutureMs) ? maxFutureMs : (5 * 365 * 24 * 60 * 60 * 1000);
    return Number.isFinite(ts)
      && ts > Date.UTC(2013, 0, 1)
      && ts < now + maxFuture;
  }

  function isPlaceholderNodeValue(value) {
    var text = String(value || '').trim();
    if (!text) return true;
    return /^solnode0+$/i.test(text) || /^unknown$/i.test(text);
  }

  function firstNonEmptyText() {
    for (var i = 0; i < arguments.length; i++) {
      var value = arguments[i];
      if (value === null || typeof value === 'undefined') continue;
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
      var text = String(value).trim();
      if (text) return text;
    }
    return '';
  }

  function getObjectDateTs(obj, keys) {
    if (!obj || !Array.isArray(keys)) return 0;
    for (var i = 0; i < keys.length; i++) {
      var ts = toNewsTimestamp(obj[keys[i]]);
      if (ts > 0) return ts;
    }
    return 0;
  }

  function resolveRelativeEtaTs(raw, nowMs) {
    var now = Number.isFinite(nowMs) ? nowMs : Date.now();
    var derivedMs = parseCycleTimeLeftToMs(raw);
    if (derivedMs > 0) return now + derivedMs;
    return 0;
  }

  function resolveWorldstateExpiryTs(entry, nowMs) {
    var now = Number.isFinite(nowMs) ? nowMs : Date.now();
    if (!entry) return 0;
    var direct = getObjectDateTs(entry, ['expiry', 'endDate', 'endTime', 'end']);
    if (isReasonableLiveTimestamp(direct, now)) return direct;
    var fallback = resolveRelativeEtaTs(firstNonEmptyText(entry.eta, entry.endString), now);
    return isReasonableLiveTimestamp(fallback, now) ? fallback : 0;
  }

  function resolveWorldstateActivationTs(entry, nowMs) {
    var now = Number.isFinite(nowMs) ? nowMs : Date.now();
    if (!entry) return 0;
    var direct = getObjectDateTs(entry, ['activation', 'startDate', 'startTime', 'start']);
    if (isReasonableLiveTimestamp(direct, now)) return direct;
    var fallback = resolveRelativeEtaTs(entry.startString, now);
    return isReasonableLiveTimestamp(fallback, now) ? fallback : 0;
  }

  function formatWorldstateAbsolute(ts) {
    if (!Number.isFinite(ts) || ts <= 0) return '--';
    return new Date(ts).toLocaleString();
  }

  function formatCompactNumber(value) {
    var num = Number(value);
    if (!Number.isFinite(num)) return '';
    return num.toLocaleString();
  }

  function formatStandingValue(value) {
    var text = formatCompactNumber(value);
    return text ? (text + ' standing') : '';
  }

  function buildWorldstateChipsHtml(chips) {
    var out = [];
    var list = ensureArray(chips);
    for (var i = 0; i < list.length; i++) {
      var chip = String(list[i] || '').trim();
      if (!chip) continue;
      out.push('<span class="worldstate-chip">' + escapeHtml(chip) + '</span>');
    }
    return out.join('');
  }

  function buildWorldstateRowHtml(options) {
    var title = firstNonEmptyText(options && options.title, 'Unknown');
    var subtitle = firstNonEmptyText(options && options.subtitle);
    var sideLabel = firstNonEmptyText(options && options.sideLabel);
    var sideValue = firstNonEmptyText(options && options.sideValue);
    var timerTs = Number(options && options.timerTs);
    var meta = firstNonEmptyText(options && options.meta);
    var progressRaw = options ? options.progress : null;
    var progress = (progressRaw === null || typeof progressRaw === 'undefined' || progressRaw === '')
      ? NaN
      : Number(progressRaw);
    var chipsHtml = buildWorldstateChipsHtml(options && options.chips);
    var timerHtml = '';
    var progressHtml = '';

    if (Number.isFinite(timerTs) && timerTs > 0) {
      timerHtml = '' +
        '<div class="worldstate-row-side">' +
          (sideLabel ? ('<div class="worldstate-row-kicker">' + escapeHtml(sideLabel) + '</div>') : '') +
          '<div class="worldstate-row-timer js-worldstate-timer" data-expiry-ts="' + String(Math.floor(timerTs)) + '">' + escapeHtml(formatCountdown(timerTs - Date.now())) + '</div>' +
          (meta ? ('<div class="worldstate-row-meta">' + escapeHtml(meta) + '</div>') : '') +
        '</div>';
    } else if (sideValue || meta) {
      timerHtml = '' +
        '<div class="worldstate-row-side">' +
          (sideLabel ? ('<div class="worldstate-row-kicker">' + escapeHtml(sideLabel) + '</div>') : '') +
          (sideValue ? ('<div class="worldstate-row-static">' + escapeHtml(sideValue) + '</div>') : '') +
          (meta ? ('<div class="worldstate-row-meta">' + escapeHtml(meta) + '</div>') : '') +
        '</div>';
    }

    if (Number.isFinite(progress)) {
      var safeProgress = Math.max(0, Math.min(100, progress));
      progressHtml = '' +
        '<div class="worldstate-progress">' +
          '<div class="worldstate-progress-bar" style="width:' + safeProgress.toFixed(1) + '%"></div>' +
        '</div>';
    }

    return '' +
      '<article class="worldstate-row">' +
        '<div class="worldstate-row-main">' +
          '<div class="worldstate-row-titleline">' +
            '<div class="worldstate-row-title">' + escapeHtml(title) + '</div>' +
            chipsHtml +
          '</div>' +
          (subtitle ? ('<div class="worldstate-row-sub">' + escapeHtml(subtitle) + '</div>') : '') +
          progressHtml +
        '</div>' +
        timerHtml +
      '</article>';
  }

  function buildWorldstateBlockHtml(options) {
    var title = firstNonEmptyText(options && options.title, 'Untitled');
    var subtitle = firstNonEmptyText(options && options.subtitle);
    var missions = ensureArray(options && options.lines);
    var chipsHtml = buildWorldstateChipsHtml(options && options.chips);
    var timerTs = Number(options && options.timerTs);
    var timerLabel = firstNonEmptyText(options && options.timerLabel);
    var timerMeta = firstNonEmptyText(options && options.timerMeta);
    var sideHtml = '';
    var linesHtml = '';

    if (Number.isFinite(timerTs) && timerTs > 0) {
      sideHtml = '' +
        '<div class="worldstate-block-side">' +
          (timerLabel ? ('<div class="worldstate-row-kicker">' + escapeHtml(timerLabel) + '</div>') : '') +
          '<div class="worldstate-row-timer js-worldstate-timer" data-expiry-ts="' + String(Math.floor(timerTs)) + '">' + escapeHtml(formatCountdown(timerTs - Date.now())) + '</div>' +
          (timerMeta ? ('<div class="worldstate-row-meta">' + escapeHtml(timerMeta) + '</div>') : '') +
        '</div>';
    } else if (timerMeta) {
      sideHtml = '<div class="worldstate-block-side"><div class="worldstate-row-static">' + escapeHtml(timerMeta) + '</div></div>';
    }

    if (missions.length > 0) {
      for (var i = 0; i < missions.length; i++) {
        var item = missions[i] || {};
        var lineTitle = firstNonEmptyText(item.title, item.main, 'Unknown');
        var lineSub = firstNonEmptyText(item.subtitle, item.sub);
        linesHtml += '' +
          '<div class="worldstate-mini-item">' +
            '<div class="worldstate-mini-title">' + escapeHtml(lineTitle) + '</div>' +
            (lineSub ? ('<div class="worldstate-mini-sub">' + escapeHtml(lineSub) + '</div>') : '') +
          '</div>';
      }
    }

    return '' +
      '<article class="worldstate-block">' +
        '<div class="worldstate-block-header">' +
          '<div>' +
            '<div class="worldstate-block-titleline">' +
              '<h3 class="worldstate-block-title">' + escapeHtml(title) + '</h3>' +
              chipsHtml +
            '</div>' +
            (subtitle ? ('<p class="worldstate-block-sub">' + escapeHtml(subtitle) + '</p>') : '') +
          '</div>' +
          sideHtml +
        '</div>' +
        (linesHtml ? ('<div class="worldstate-mini-list">' + linesHtml + '</div>') : '') +
      '</article>';
  }

  function normalizeNightwaveState(raw, previous) {
    var prev = previous || { acts: [], season: '', phase: '', expiry: '' };
    if (!raw) return prev;

    var acts = [];
    if (Array.isArray(raw)) {
      acts = raw;
    } else if (Array.isArray(raw.activeChallenges)) {
      acts = raw.activeChallenges;
    } else if (Array.isArray(raw.challenges)) {
      acts = raw.challenges;
    }

    return {
      raw: raw,
      acts: acts,
      season: firstNonEmptyText(raw.season, raw.tag, raw.title, prev.season),
      phase: firstNonEmptyText(raw.phase, raw.phaseName, prev.phase),
      expiry: firstNonEmptyText(raw.expiry, raw.endDate, prev.expiry)
    };
  }

  function normalizeWorldstateState(raw, previous) {
    var prev = previous || {};
    return {
      timestamp: firstNonEmptyText(raw && raw.timestamp, prev.timestamp),
      alerts: raw && Array.isArray(raw.alerts) ? raw.alerts : ensureArray(prev.alerts),
      fissures: raw && Array.isArray(raw.fissures) ? raw.fissures : ensureArray(prev.fissures),
      invasions: raw && Array.isArray(raw.invasions) ? raw.invasions : ensureArray(prev.invasions),
      events: raw && Array.isArray(raw.events) ? raw.events : ensureArray(prev.events),
      arbitration: raw && raw.arbitration ? raw.arbitration : (prev.arbitration || null),
      archonHunt: raw && raw.archonHunt ? raw.archonHunt : (prev.archonHunt || null),
      sortie: raw && raw.sortie ? raw.sortie : (prev.sortie || null),
      nightwave: normalizeNightwaveState(raw && raw.nightwave, prev.nightwave),
      voidTrader: raw && raw.voidTrader ? raw.voidTrader : (prev.voidTrader || null),
      steelPath: raw && raw.steelPath ? raw.steelPath : (prev.steelPath || null)
    };
  }

  function isUsableArbitrationEntry(entry) {
    if (!entry || typeof entry !== 'object') return false;

    var now = Date.now();
    var node = firstNonEmptyText(entry.node, entry.nodeKey);
    var type = firstNonEmptyText(entry.type, entry.typeKey);
    var expiryTs = resolveWorldstateExpiryTs(entry, now);

    if (isPlaceholderNodeValue(node)) return false;
    if (!type || /^unknown$/i.test(type)) return false;
    if (!isReasonableLiveTimestamp(expiryTs, now, 14 * 24 * 60 * 60 * 1000)) return false;

    return true;
  }

  function getActiveWorldstateFissures(worldstate) {
    var now = Date.now();
    var fissures = ensureArray(worldstate && worldstate.fissures).filter(function(entry) {
      if (!entry || entry.active === false || entry.expired === true) return false;
      var expiryTs = resolveWorldstateExpiryTs(entry, now);
      return expiryTs > now + 1000;
    });

    fissures.sort(function(a, b) {
      var aTs = resolveWorldstateExpiryTs(a, now);
      var bTs = resolveWorldstateExpiryTs(b, now);
      if (aTs !== bTs) {
        if (!aTs) return 1;
        if (!bTs) return -1;
        return aTs - bTs;
      }
      return firstNonEmptyText(a && a.tier, a && a.tierNum).localeCompare(firstNonEmptyText(b && b.tier, b && b.tierNum));
    });

    return fissures;
  }

  function getActiveWorldstateInvasions(worldstate) {
    var invasions = ensureArray(worldstate && worldstate.invasions).filter(function(entry) {
      return entry && entry.completed !== true;
    });

    invasions.sort(function(a, b) {
      var aCompletion = Number(a && a.completion);
      var bCompletion = Number(b && b.completion);
      if (Number.isFinite(aCompletion) && Number.isFinite(bCompletion) && aCompletion !== bCompletion) {
        return bCompletion - aCompletion;
      }
      return firstNonEmptyText(a && a.node).localeCompare(firstNonEmptyText(b && b.node));
    });

    return invasions;
  }

  function formatInvasionReward(reward) {
    if (!reward) return '';
    if (typeof reward === 'string') return reward;

    var direct = firstNonEmptyText(reward.asString, reward.itemString, reward.localizedString, reward.item);
    if (direct) return direct;

    var counted = ensureArray(reward.countedItems);
    if (counted.length > 0) {
      var parts = [];
      for (var i = 0; i < counted.length; i++) {
        var countedItem = counted[i] || {};
        var countedName = firstNonEmptyText(countedItem.type, countedItem.itemType, countedItem.key, countedItem.name);
        var countedCount = Number(countedItem.count);
        if (!countedName) continue;
        parts.push((Number.isFinite(countedCount) && countedCount > 1 ? (countedCount + 'x ') : '') + countedName);
      }
      if (parts.length > 0) return parts.join(', ');
    }

    return '';
  }

  function getVoidTraderStatusInfo(voidTrader) {
    var now = Date.now();
    var trader = voidTrader || null;
    var active = !!(trader && (trader.active === true || trader.characterInRelay === true));
    var targetTs = 0;
    var label = active ? 'Leaves In' : 'Arrives In';

    if (active) {
      targetTs = resolveWorldstateExpiryTs(trader, now);
    } else {
      targetTs = resolveWorldstateActivationTs(trader, now);
      if (!targetTs) targetTs = resolveWorldstateExpiryTs(trader, now);
    }

    return {
      active: active,
      label: label,
      targetTs: targetTs,
      location: firstNonEmptyText(trader && trader.location, trader && trader.node, active ? 'In Relay' : 'Away from the relay')
    };
  }

  function getSteelPathOfferInfo(steelPath) {
    var root = steelPath || {};
    var reward = root.currentReward || root.currentOffer || root.rotation || root.reward || null;
    var rewardName = firstNonEmptyText(reward && reward.name, reward && reward.item, reward && reward.itemName, root.currentRewardName);
    var rewardCost = firstNonEmptyText(reward && reward.cost, reward && reward.price, root.cost, root.price);
    var remaining = firstNonEmptyText(root.remaining, reward && reward.remaining);
    var expiryTs = resolveWorldstateExpiryTs(root, Date.now()) || resolveWorldstateExpiryTs(reward, Date.now()) || resolveRelativeEtaTs(remaining, Date.now());

    return {
      name: rewardName,
      cost: rewardCost,
      remaining: remaining,
      expiryTs: expiryTs
    };
  }

  function renderWorldstateSummary(worldstate) {
    if (!els.worldstateSummaryGrid) return;

    var trader = getVoidTraderStatusInfo(worldstate && worldstate.voidTrader);
    var fissureCount = getActiveWorldstateFissures(worldstate).length;
    var invasionCount = getActiveWorldstateInvasions(worldstate).length;
    var alertCount = ensureArray(worldstate && worldstate.alerts).filter(function(entry) {
      return entry && entry.active !== false && entry.expired !== true;
    }).length;
    var nightwaveCount = ensureArray(worldstate && worldstate.nightwave && worldstate.nightwave.acts).length;
    var updatedTs = toNewsTimestamp(worldstate && worldstate.timestamp);
    var summaryCards = [
      {
        label: 'Active Fissures',
        value: String(fissureCount),
        meta: fissureCount > 0 ? 'Live relic missions right now.' : 'No fissures reported.'
      },
      {
        label: 'Invasions',
        value: String(invasionCount),
        meta: invasionCount > 0 ? 'Battles still in progress.' : 'No invasions active.'
      },
      {
        label: 'Nightwave Acts',
        value: String(nightwaveCount),
        meta: nightwaveCount > 0 ? 'Acts currently available.' : 'No acts available.'
      },
      {
        label: 'Alerts',
        value: String(alertCount),
        meta: alertCount > 0 ? 'Alerts still live.' : 'No alerts active.'
      },
      {
        label: 'Baro Ki\'Teer',
        value: trader.active ? 'IN RELAY' : 'AWAY',
        meta: trader.targetTs > 0 ? (trader.label + ' | ' + formatWorldstateAbsolute(trader.targetTs)) : trader.location
      },
      {
        label: 'Last Sync',
        value: updatedTs > 0 ? new Date(updatedTs).toLocaleTimeString() : '--',
        meta: updatedTs > 0 ? formatWorldstateAbsolute(updatedTs) : 'Waiting for a fresh payload.'
      }
    ];

    var html = '';
    for (var i = 0; i < summaryCards.length; i++) {
      html += '' +
        '<article class="worldstate-summary-card">' +
          '<div class="worldstate-summary-label">' + escapeHtml(summaryCards[i].label) + '</div>' +
          '<div class="worldstate-summary-value">' + escapeHtml(summaryCards[i].value) + '</div>' +
          '<div class="worldstate-summary-meta">' + escapeHtml(summaryCards[i].meta) + '</div>' +
        '</article>';
    }

    els.worldstateSummaryGrid.innerHTML = html;
  }

  function renderWorldstateFissures(worldstate) {
    if (!els.worldstateFissuresList) return;

    var fissures = getActiveWorldstateFissures(worldstate).slice(0, 8);
    if (fissures.length === 0) {
      els.worldstateFissuresList.innerHTML = '<div class="worldstate-empty">No active fissures found.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < fissures.length; i++) {
      var fissure = fissures[i] || {};
      var tier = firstNonEmptyText(fissure.tier, fissure.tierNum, fissure.isStorm ? 'Storm' : 'Fissure');
      var missionType = firstNonEmptyText(fissure.missionType, fissure.missionKey, fissure.nodeKey, 'Mission');
      var node = firstNonEmptyText(fissure.node, fissure.nodeKey, 'Unknown Node');
      var enemy = firstNonEmptyText(fissure.enemy, fissure.enemyKey);
      var timerTs = resolveWorldstateExpiryTs(fissure, Date.now());
      var chips = [tier];
      if (fissure.isHard) chips.push('Steel Path');
      if (fissure.isStorm) chips.push('Void Storm');
      if (fissure.isStorm && fissure.tier) chips[0] = fissure.tier + ' Storm';

      html += buildWorldstateRowHtml({
        title: missionType,
        subtitle: enemy ? (node + ' | ' + enemy) : node,
        chips: chips,
        sideLabel: 'Expires In',
        timerTs: timerTs,
        meta: formatWorldstateAbsolute(timerTs)
      });
    }

    els.worldstateFissuresList.innerHTML = html;
  }

  function renderWorldstateInvasions(worldstate) {
    if (!els.worldstateInvasionsList) return;

    var invasions = getActiveWorldstateInvasions(worldstate).slice(0, 6);
    if (invasions.length === 0) {
      els.worldstateInvasionsList.innerHTML = '<div class="worldstate-empty">No active invasions found.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < invasions.length; i++) {
      var invasion = invasions[i] || {};
      var attackerReward = formatInvasionReward(invasion.attackerReward);
      var defenderReward = formatInvasionReward(invasion.defenderReward);
      var completion = Number(invasion.completion);
      var attackerFaction = firstNonEmptyText(invasion.attacker && invasion.attacker.faction, invasion.attackingFaction, invasion.attackerFaction);
      var defenderFaction = firstNonEmptyText(invasion.defender && invasion.defender.faction, invasion.defendingFaction, invasion.defenderFaction);
      var subtitleParts = [];
      if (attackerReward) subtitleParts.push('Attack: ' + attackerReward);
      if (defenderReward) subtitleParts.push('Defend: ' + defenderReward);

      html += buildWorldstateRowHtml({
        title: firstNonEmptyText(invasion.node, 'Unknown Node'),
        subtitle: subtitleParts.join(' | ') || 'Rewards not available yet.',
        chips: [attackerFaction, defenderFaction].filter(Boolean),
        sideLabel: 'Progress',
        sideValue: Number.isFinite(completion) ? (completion.toFixed(1) + '%') : firstNonEmptyText(invasion.eta, '--'),
        meta: firstNonEmptyText(invasion.eta, 'Battle in progress'),
        progress: Number.isFinite(completion) ? completion : null
      });
    }

    els.worldstateInvasionsList.innerHTML = html;
  }

  function renderWorldstateNightwave(worldstate) {
    if (!els.worldstateNightwaveList) return;

    var nightwave = worldstate && worldstate.nightwave ? worldstate.nightwave : { acts: [] };
    var acts = ensureArray(nightwave.acts).filter(function(entry) {
      return entry && entry.active !== false;
    }).slice(0, 6);

    if (acts.length === 0) {
      els.worldstateNightwaveList.innerHTML = '<div class="worldstate-empty">No Nightwave acts reported right now.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < acts.length; i++) {
      var act = acts[i] || {};
      var standing = firstNonEmptyText(act.reputation, act.standing, act.xp, act.value);
      var typeLabel = act.isDaily ? 'Daily' : (act.isElite ? 'Elite' : (act.isPermanent ? 'Permanent' : 'Weekly'));
      var expiryTs = resolveWorldstateExpiryTs(act, Date.now()) || toNewsTimestamp(nightwave.expiry);

      html += buildWorldstateRowHtml({
        title: firstNonEmptyText(act.title, act.desc, act.name, 'Nightwave Act'),
        subtitle: firstNonEmptyText(act.description, act.restricted, act.type),
        chips: [typeLabel, standing ? formatStandingValue(standing) : ''].filter(Boolean),
        sideLabel: expiryTs > 0 ? 'Ends In' : 'Type',
        timerTs: expiryTs,
        sideValue: expiryTs > 0 ? '' : typeLabel,
        meta: expiryTs > 0 ? formatWorldstateAbsolute(expiryTs) : firstNonEmptyText(nightwave.season, nightwave.phase)
      });
    }

    els.worldstateNightwaveList.innerHTML = html;
  }

  function renderWorldstateWeekly(worldstate) {
    if (!els.worldstateWeeklyList) return;

    var html = '';
    var archon = worldstate && worldstate.archonHunt ? worldstate.archonHunt : null;
    var sortie = worldstate && worldstate.sortie ? worldstate.sortie : null;

    if (archon) {
      var archonMissions = ensureArray(archon.missions).slice(0, 3).map(function(mission, index) {
        return {
          title: 'Stage ' + String(index + 1) + ': ' + firstNonEmptyText(mission.type, mission.typeKey, 'Mission'),
          subtitle: firstNonEmptyText(mission.node, mission.nodeKey, '')
        };
      });

      html += buildWorldstateBlockHtml({
        title: 'Archon Hunt',
        subtitle: firstNonEmptyText(archon.boss, archon.faction, archon.rewardPool, 'Weekly three-stage hunt'),
        chips: ['Weekly'],
        lines: archonMissions,
        timerLabel: 'Resets In',
        timerTs: resolveWorldstateExpiryTs(archon, Date.now()),
        timerMeta: formatWorldstateAbsolute(resolveWorldstateExpiryTs(archon, Date.now()))
      });
    }

    if (sortie) {
      var sortieVariants = ensureArray(sortie.variants).slice(0, 3).map(function(variant, index) {
        return {
          title: 'Stage ' + String(index + 1) + ': ' + firstNonEmptyText(variant.missionType, variant.type, 'Mission'),
          subtitle: firstNonEmptyText(variant.node, variant.modifier, variant.modifierDescription, '')
        };
      });

      html += buildWorldstateBlockHtml({
        title: 'Sortie',
        subtitle: firstNonEmptyText(sortie.boss, sortie.faction, sortie.rewardPool, 'Daily sortie rotation'),
        chips: ['Daily'],
        lines: sortieVariants,
        timerLabel: 'Resets In',
        timerTs: resolveWorldstateExpiryTs(sortie, Date.now()),
        timerMeta: formatWorldstateAbsolute(resolveWorldstateExpiryTs(sortie, Date.now()))
      });
    }

    if (!html) {
      html = '<div class="worldstate-empty">Weekly operations are unavailable right now.</div>';
    }

    els.worldstateWeeklyList.innerHTML = html;
  }

  function renderWorldstateSpecials(worldstate) {
    if (!els.worldstateSpecialsList) return;

    var html = '';
    var trader = getVoidTraderStatusInfo(worldstate && worldstate.voidTrader);
    var arbitration = (worldstate && isUsableArbitrationEntry(worldstate.arbitration)) ? worldstate.arbitration : null;
    var steelPath = getSteelPathOfferInfo(worldstate && worldstate.steelPath);
    var alerts = ensureArray(worldstate && worldstate.alerts).filter(function(entry) {
      return entry && entry.active !== false && entry.expired !== true;
    }).slice(0, 3);
    var events = ensureArray(worldstate && worldstate.events).filter(function(entry) {
      return entry && entry.active !== false && entry.expired !== true;
    }).slice(0, 2);

    html += buildWorldstateBlockHtml({
      title: 'Baro Ki\'Teer',
      subtitle: trader.location,
      chips: [trader.active ? 'Active' : 'Inactive'],
      lines: [],
      timerLabel: trader.label,
      timerTs: trader.targetTs,
      timerMeta: trader.targetTs > 0 ? formatWorldstateAbsolute(trader.targetTs) : trader.location
    });

    if (arbitration) {
      html += buildWorldstateBlockHtml({
        title: 'Arbitration',
        subtitle: firstNonEmptyText(arbitration.type, arbitration.typeKey, 'Current arbitration'),
        chips: [firstNonEmptyText(arbitration.enemy, arbitration.enemyKey)].filter(Boolean),
        lines: [{
          title: firstNonEmptyText(arbitration.node, arbitration.nodeKey, 'Unknown Node'),
          subtitle: firstNonEmptyText(arbitration.activation, '')
        }],
        timerLabel: 'Ends In',
        timerTs: resolveWorldstateExpiryTs(arbitration, Date.now()),
        timerMeta: formatWorldstateAbsolute(resolveWorldstateExpiryTs(arbitration, Date.now()))
      });
    }

    if (steelPath && (steelPath.name || steelPath.remaining || steelPath.expiryTs)) {
      html += buildWorldstateBlockHtml({
        title: 'Steel Path Honors',
        subtitle: steelPath.name ? steelPath.name + (steelPath.cost ? (' | ' + steelPath.cost + ' essence') : '') : 'Current Teshin rotation',
        chips: ['Rotation'],
        lines: [],
        timerLabel: 'Refreshes In',
        timerTs: steelPath.expiryTs,
        timerMeta: steelPath.expiryTs > 0 ? formatWorldstateAbsolute(steelPath.expiryTs) : steelPath.remaining
      });
    }

    for (var i = 0; i < alerts.length; i++) {
      var alert = alerts[i] || {};
      var rewardTypes = ensureArray(alert.rewardTypes).slice(0, 2);
      var rewardLabel = rewardTypes.length > 0 ? rewardTypes.join(', ') : 'Alert reward';
      html += buildWorldstateRowHtml({
        title: firstNonEmptyText(alert.mission && alert.mission.type, alert.node, 'Alert'),
        subtitle: firstNonEmptyText(alert.mission && alert.mission.node, alert.node, rewardLabel),
        chips: rewardTypes,
        sideLabel: 'Ends In',
        timerTs: resolveWorldstateExpiryTs(alert, Date.now()),
        meta: formatWorldstateAbsolute(resolveWorldstateExpiryTs(alert, Date.now()))
      });
    }

    for (var e = 0; e < events.length; e++) {
      var eventEntry = events[e] || {};
      html += buildWorldstateRowHtml({
        title: firstNonEmptyText(eventEntry.description, eventEntry.tooltip, 'Active Event'),
        subtitle: firstNonEmptyText(eventEntry.node, eventEntry.faction, ''),
        chips: [firstNonEmptyText(eventEntry.faction)].filter(Boolean),
        sideLabel: 'Ends In',
        timerTs: resolveWorldstateExpiryTs(eventEntry, Date.now()),
        meta: formatWorldstateAbsolute(resolveWorldstateExpiryTs(eventEntry, Date.now()))
      });
    }

    if (!html) {
      html = '<div class="worldstate-empty">No special activities are active right now.</div>';
    }

    els.worldstateSpecialsList.innerHTML = html;
  }

  function renderWorldstateHub(worldstate) {
    renderWorldstateSummary(worldstate);
    renderWorldstateFissures(worldstate);
    renderWorldstateInvasions(worldstate);
    renderWorldstateNightwave(worldstate);
    renderWorldstateWeekly(worldstate);
    renderWorldstateSpecials(worldstate);
    updateWorldstateTimers();
  }

  function updateWorldstateTimers() {
    if (!els.cyclesPanel) return;
    var hasExpired = false;
    els.cyclesPanel.querySelectorAll('.js-worldstate-timer[data-expiry-ts]').forEach(function(node) {
      var targetTs = parseInt(node.getAttribute('data-expiry-ts'), 10);
      if (!Number.isFinite(targetTs) || targetTs <= 0) {
        node.textContent = '--';
        return;
      }
      var remaining = targetTs - Date.now();
      node.textContent = formatCountdown(remaining);
      if (remaining <= 0) {
        hasExpired = true;
      }
    });
    return hasExpired;
  }

  function getWorldstateRefreshCandidates(worldstate, nowMs) {
    var now = Number.isFinite(nowMs) ? nowMs : Date.now();
    var out = [];
    var pushTs = function(value) {
      var ts = Number(value);
      if (Number.isFinite(ts) && ts > now) out.push(ts);
    };
    var fissures = getActiveWorldstateFissures(worldstate);
    var invasions = getActiveWorldstateInvasions(worldstate);
    var alerts = ensureArray(worldstate && worldstate.alerts);
    var acts = ensureArray(worldstate && worldstate.nightwave && worldstate.nightwave.acts);
    var events = ensureArray(worldstate && worldstate.events);
    var trader = getVoidTraderStatusInfo(worldstate && worldstate.voidTrader);
    var steelPath = getSteelPathOfferInfo(worldstate && worldstate.steelPath);

    for (var i = 0; i < fissures.length; i++) pushTs(resolveWorldstateExpiryTs(fissures[i], now));
    for (var j = 0; j < invasions.length; j++) pushTs(resolveWorldstateExpiryTs(invasions[j], now));
    for (var a = 0; a < alerts.length; a++) pushTs(resolveWorldstateExpiryTs(alerts[a], now));
    for (var n = 0; n < acts.length; n++) pushTs(resolveWorldstateExpiryTs(acts[n], now));
    for (var e = 0; e < events.length; e++) pushTs(resolveWorldstateExpiryTs(events[e], now));

    pushTs(resolveWorldstateExpiryTs(worldstate && worldstate.archonHunt, now));
    pushTs(resolveWorldstateExpiryTs(worldstate && worldstate.sortie, now));
    pushTs(resolveWorldstateExpiryTs(worldstate && worldstate.arbitration, now));
    pushTs(trader.targetTs);
    pushTs(steelPath.expiryTs);

    return out;
  }

  async function fetchWorldstateActivityOverrides() {
    var out = {};
    var results = await Promise.allSettled([
      fetch(FISSURES_API, { cache: 'no-store' }),
      fetch(ARBITRATION_API, { cache: 'no-store' })
    ]);

    var fissureResp = results[0];
    if (fissureResp && fissureResp.status === 'fulfilled' && fissureResp.value && fissureResp.value.ok) {
      try {
        var fissureJson = await fissureResp.value.json();
        if (Array.isArray(fissureJson)) {
          out.fissures = fissureJson;
        }
      } catch (_fissureErr) {
        // Ignore override failure and keep root worldstate data.
      }
    }

    var arbitrationResp = results[1];
    if (arbitrationResp && arbitrationResp.status === 'fulfilled' && arbitrationResp.value && arbitrationResp.value.ok) {
      try {
        var arbitrationJson = await arbitrationResp.value.json();
        if (isUsableArbitrationEntry(arbitrationJson)) {
          out.arbitration = arbitrationJson;
        } else {
          out.arbitration = null;
        }
      } catch (_arbitrationErr) {
        // Ignore override failure and keep root worldstate data.
      }
    }

    return out;
  }

  async function fetchCycleSnapshot() {
    var stamp = Date.now();
    var json = [null, null, null, null];
    var worldData = null;

    // Primary source: warframestat worldstate payload. This is currently stable
    // while some per-cycle routes intermittently return 404.
    try {
      var worldResp = await fetch(WARFRAMESTAT_PC_API + '?_ts=' + stamp, { cache: 'no-store' });
      if (worldResp.ok) {
        var world = await worldResp.json();
        worldData = world;
        json[0] = world && world.cetusCycle ? world.cetusCycle : null;
        json[1] = world && world.vallisCycle ? world.vallisCycle : null;
        json[2] = world && world.cambionCycle ? world.cambionCycle : null;
        json[3] = world && world.duviriCycle ? world.duviriCycle : null;
      }
    } catch (_err) {
      // Fallback to legacy endpoint fanout below.
    }

    if (worldData) {
      try {
        var overrides = await fetchWorldstateActivityOverrides();
        if (Array.isArray(overrides.fissures)) {
          worldData.fissures = overrides.fissures;
        }
        if (Object.prototype.hasOwnProperty.call(overrides, 'arbitration')) {
          worldData.arbitration = overrides.arbitration;
        }
      } catch (_overrideErr) {
        // Root worldstate data is still usable.
      }
    }

    // Official fallback: build a cycle snapshot from DE worldstate when
    // community routes are unavailable in runtime.
    if (!json[0] || !json[1] || !json[2] || !json[3]) {
      try {
        var officialResp = await fetch(OFFICIAL_WORLDSTATE_API, { cache: 'no-store' });
        if (officialResp.ok) {
          var official = await officialResp.json();
          var missions = Array.isArray(official && official.SyndicateMissions) ? official.SyndicateMissions : [];
          var endlessChoices = Array.isArray(official && official.EndlessXpChoices) ? official.EndlessXpChoices : [];

          function getMissionByTag(tag) {
            for (var i = 0; i < missions.length; i++) {
              var entryTag = String((missions[i] && missions[i].Tag) || '');
              if (entryTag === tag) return missions[i];
            }
            return null;
          }

          function getExpiryIsoFromMission(mission) {
            var ms = mission && mission.Expiry && mission.Expiry.$date && mission.Expiry.$date.$numberLong
              ? parseInt(mission.Expiry.$date.$numberLong, 10)
              : 0;
            return ms > 0 ? new Date(ms).toISOString() : null;
          }

          var cetusMission = getMissionByTag('CetusSyndicate');
          var solarisMission = getMissionByTag('SolarisSyndicate');
          var entratiMission = getMissionByTag('EntratiSyndicate');

          if (!json[0] && cetusMission) {
            var cetusExpiryIso = getExpiryIsoFromMission(cetusMission);
            var cetusExpiryMs = cetusExpiryIso ? Date.parse(cetusExpiryIso) : 0;
            var cetusRemaining = cetusExpiryMs > 0 ? Math.max(0, cetusExpiryMs - Date.now()) : 0;
            // Cetus cycle approximation from known day/night cadence.
            var cetusState = cetusRemaining > (50 * 60 * 1000) ? 'day' : 'night';
            json[0] = {
              state: cetusState,
              expiry: cetusExpiryIso,
              timeLeft: formatCountdown(cetusRemaining)
            };
          }

          if (!json[1] && solarisMission) {
            var vallisExpiryIso = getExpiryIsoFromMission(solarisMission);
            var vallisExpiryMs = vallisExpiryIso ? Date.parse(vallisExpiryIso) : 0;
            var vallisRemaining = vallisExpiryMs > 0 ? Math.max(0, vallisExpiryMs - Date.now()) : 0;
            json[1] = {
              state: 'cold',
              expiry: vallisExpiryIso,
              timeLeft: formatCountdown(vallisRemaining)
            };
          }

          if (!json[2] && entratiMission) {
            var cambionExpiryIso = getExpiryIsoFromMission(entratiMission);
            var cambionExpiryMs = cambionExpiryIso ? Date.parse(cambionExpiryIso) : 0;
            var cambionRemaining = cambionExpiryMs > 0 ? Math.max(0, cambionExpiryMs - Date.now()) : 0;
            json[2] = {
              state: 'fass',
              expiry: cambionExpiryIso,
              timeLeft: formatCountdown(cambionRemaining)
            };
          }

          if (!json[3] && endlessChoices.length > 0) {
            var normalChoices = [];
            var hardChoices = [];
            for (var c = 0; c < endlessChoices.length; c++) {
              var group = endlessChoices[c] || {};
              var category = String(group.Category || '').toUpperCase();
              if (category === 'EXC_NORMAL') normalChoices = Array.isArray(group.Choices) ? group.Choices : [];
              if (category === 'EXC_HARD') hardChoices = Array.isArray(group.Choices) ? group.Choices : [];
            }
            json[3] = {
              state: 'fear',
              expiry: null,
              timeLeft: '--',
              choices: [
                { category: 'normal', choices: normalChoices },
                { category: 'hard', choices: hardChoices }
              ]
            };
          }
        }
      } catch (_officialErr) {
        // Ignore and continue with remaining sources/previous snapshot.
      }
    }

    var hasAtLeastOneCycle = !!(json[0] || json[1] || json[2] || json[3]);
    if (!hasAtLeastOneCycle && cycleSnapshot) {
      return {
        cetus: cycleSnapshot.cetus || {},
        fortuna: cycleSnapshot.fortuna || {},
        deimos: cycleSnapshot.deimos || {},
        duviri: cycleSnapshot.duviri || {},
        worldstate: cycleSnapshot.worldstate || {}
      };
    }

    if (!hasAtLeastOneCycle) {
      throw new Error('All cycle endpoints failed.');
    }

    var previous = cycleSnapshot || {};
    // Clear cached __expiryTs so stale values don't persist on fresh data
    var result = {
      cetus: json[0] || previous.cetus || {},
      fortuna: json[1] || previous.fortuna || {},
      deimos: json[2] || previous.deimos || {},
      duviri: json[3] || previous.duviri || {},
      worldstate: normalizeWorldstateState(worldData, previous.worldstate)
    };
    // If we got fresh data from the API, ensure __expiryTs is recalculated
    if (json[0]) delete result.cetus.__expiryTs;
    if (json[1]) delete result.fortuna.__expiryTs;
    if (json[2]) delete result.deimos.__expiryTs;
    if (json[3]) delete result.duviri.__expiryTs;
    return result;
  }

  function formatCycleExpiry(iso, fallbackTimeLeft) {
    var expiryTs = toNewsTimestamp(iso);
    var remaining = expiryTs > 0 ? (expiryTs - Date.now()) : 0;
    var remainingText = remaining > 0 ? formatCountdown(remaining) : String(fallbackTimeLeft || '--');
    var expiryText = expiryTs > 0 ? new Date(expiryTs).toLocaleString() : '--';
    return 'Ends in ' + remainingText + ' • Expires ' + expiryText;
  }

  function parseCycleTimeLeftToMs(raw) {
    var text = String(raw || '').toLowerCase();
    if (!text) return 0;

    var days = 0;
    var hours = 0;
    var minutes = 0;
    var seconds = 0;

    var dayMatch = text.match(/(\d+)\s*d/);
    var hourMatch = text.match(/(\d+)\s*h/);
    var minuteMatch = text.match(/(\d+)\s*m/);
    var secondMatch = text.match(/(\d+)\s*s/);

    if (dayMatch) days = parseInt(dayMatch[1], 10) || 0;
    if (hourMatch) hours = parseInt(hourMatch[1], 10) || 0;
    if (minuteMatch) minutes = parseInt(minuteMatch[1], 10) || 0;
    if (secondMatch) seconds = parseInt(secondMatch[1], 10) || 0;

    return ((((days * 24) + hours) * 60 + minutes) * 60 + seconds) * 1000;
  }

  function resolveCycleExpiryTs(cycleObj, nowMs) {
    var cycle = cycleObj || {};
    var now = Number.isFinite(nowMs) ? nowMs : Date.now();

    if (Number.isFinite(cycle.__expiryTs) && cycle.__expiryTs > 0) {
      return cycle.__expiryTs;
    }

    var directTs = toNewsTimestamp(cycle.expiry);
    if (directTs > 0) {
      cycle.__expiryTs = directTs;
      return directTs;
    }

    var fallbackMs = parseCycleTimeLeftToMs(cycle.timeLeft);
    if (fallbackMs > 0) {
      var derivedTs = now + fallbackMs;
      cycle.__expiryTs = derivedTs;
      return derivedTs;
    }

    return 0;
  }

  function getCycleRemainingMs(cycleObj, nowMs) {
    var now = Number.isFinite(nowMs) ? nowMs : Date.now();
    var expiryTs = resolveCycleExpiryTs(cycleObj, now);
    if (!expiryTs) return 0;
    return expiryTs - now;
  }

  function formatCycleExpiryFromCycle(cycleObj) {
    var cycle = cycleObj || {};
    var now = Date.now();
    var expiryTs = resolveCycleExpiryTs(cycle, now);
    var remaining = expiryTs > 0 ? (expiryTs - now) : 0;
    var remainingText = remaining > 0 ? formatCountdown(remaining) : String(cycle.timeLeft || '--');
    var expiryText = expiryTs > 0 ? new Date(expiryTs).toLocaleString() : '--';
    return 'Ends in ' + remainingText + ' • Expires ' + expiryText;
  }

  function applyCycleCardStateVisuals(cetusState) {
    if (!els.cycleCardCetus) return;
    var state = String(cetusState || '').toLowerCase();
    els.cycleCardCetus.classList.toggle('state-day', state === 'day');
    els.cycleCardCetus.classList.toggle('state-night', state === 'night');
  }

  function stopCycleCountdown() {
    if (cycleCountdownTimer) {
      clearInterval(cycleCountdownTimer);
      cycleCountdownTimer = null;
    }
    if (cycleAutoRefreshTimeout) {
      clearTimeout(cycleAutoRefreshTimeout);
      cycleAutoRefreshTimeout = null;
    }
    if (cycleRetryTimeout) {
      clearTimeout(cycleRetryTimeout);
      cycleRetryTimeout = null;
    }
  }

  function scheduleCycleRetry(delayMs) {
    var delay = Math.max(3000, Number(delayMs) || cycleRetryDelayMs);

    // If a retry is already queued but we now need a faster one, replace it.
    if (cycleRetryTimeout) {
      clearTimeout(cycleRetryTimeout);
      cycleRetryTimeout = null;
    }

    cycleRetryTimeout = setTimeout(function() {
      cycleRetryTimeout = null;
      loadCycles();
    }, delay);
  }

  function scheduleCycleRefresh() {
    if (!cycleSnapshot) return;
    if (cycleAutoRefreshTimeout) {
      clearTimeout(cycleAutoRefreshTimeout);
      cycleAutoRefreshTimeout = null;
    }

    var now = Date.now();
    var candidates = [
      resolveCycleExpiryTs(cycleSnapshot.cetus, now),
      resolveCycleExpiryTs(cycleSnapshot.fortuna, now),
      resolveCycleExpiryTs(cycleSnapshot.deimos, now),
      resolveCycleExpiryTs(cycleSnapshot.duviri, now),
      getNextCircuitResetTimestamp(now)
    ].filter(function(ts) {
      return Number.isFinite(ts) && ts > now;
    });
    var worldstateCandidates = getWorldstateRefreshCandidates(cycleSnapshot.worldstate, now);
    if (worldstateCandidates.length > 0) {
      candidates = candidates.concat(worldstateCandidates);
    }

    if (candidates.length === 0) {
      if (!cycleRefreshInProgress) {
        cycleLastBoundaryRefreshAt = Date.now();
        loadCycles();
      }
      return;
    }
    var nextTs = Math.min.apply(Math, candidates);
    var delay = Math.max(800, nextTs - now + 1200);

    cycleAutoRefreshTimeout = setTimeout(function() {
      loadCycles();
    }, delay);
  }

  function updateCycleCountdowns() {
    if (!cycleSnapshot) return;

    var now = Date.now();
    var cetusRemaining = getCycleRemainingMs(cycleSnapshot.cetus, now);
    var fortunaRemaining = getCycleRemainingMs(cycleSnapshot.fortuna, now);
    var deimosRemaining = getCycleRemainingMs(cycleSnapshot.deimos, now);
    var duviriRemaining = getCycleRemainingMs(cycleSnapshot.duviri, now);
    var circuitRemaining = getNextCircuitResetTimestamp(now) - now;

    if (els.cycleCetusTimer) {
      els.cycleCetusTimer.textContent = formatCountdown(cetusRemaining);
    }
    if (els.cycleFortunaTimer) {
      els.cycleFortunaTimer.textContent = formatCountdown(fortunaRemaining);
    }
    if (els.cycleDeimosTimer) {
      els.cycleDeimosTimer.textContent = formatCountdown(deimosRemaining);
    }
    if (els.cycleDuviriNormalMoodTimer) {
      els.cycleDuviriNormalMoodTimer.textContent = formatCountdown(duviriRemaining);
    }
    if (els.cycleDuviriSteelMoodTimer) {
      els.cycleDuviriSteelMoodTimer.textContent = formatCountdown(duviriRemaining);
    }
    if (els.cycleDuviriNormalCircuitTimer) {
      els.cycleDuviriNormalCircuitTimer.textContent = formatCountdown(circuitRemaining);
    }
    if (els.cycleDuviriSteelCircuitTimer) {
      els.cycleDuviriSteelCircuitTimer.textContent = formatCountdown(circuitRemaining);
    }

    if (els.cycleCetusExpiry) {
      els.cycleCetusExpiry.textContent = formatCycleExpiryFromCycle(cycleSnapshot.cetus);
    }
    if (els.cycleFortunaExpiry) {
      els.cycleFortunaExpiry.textContent = formatCycleExpiryFromCycle(cycleSnapshot.fortuna);
    }
    if (els.cycleDeimosExpiry) {
      els.cycleDeimosExpiry.textContent = formatCycleExpiryFromCycle(cycleSnapshot.deimos);
    }
    if (els.cycleDuviriExpiry) {
      els.cycleDuviriExpiry.textContent = formatCycleExpiryFromCycle(cycleSnapshot.duviri);
    }
    var worldstateBoundaryHit = !!updateWorldstateTimers();

    var boundaryHit = cetusRemaining <= 0 || fortunaRemaining <= 0 || deimosRemaining <= 0 || duviriRemaining <= 0 || circuitRemaining <= 0 || worldstateBoundaryHit;
    if (boundaryHit && !cycleRefreshInProgress) {
      var nowBoundary = Date.now();

      // Hard watchdog: do immediate refresh attempts around rollover so UI cannot stay at 00.
      if (nowBoundary - cycleLastBoundaryRefreshAt > 1500) {
        cycleLastBoundaryRefreshAt = nowBoundary;
        loadCycles();
      }

      scheduleCycleRetry(3000);
    }

  }

  function startCycleCountdown() {
    stopCycleCountdown();
    updateCycleCountdowns();
    cycleCountdownTimer = setInterval(updateCycleCountdowns, 1000);
  }

  function renderCycleItemCards(container, names, noteText, options) {
    if (!container) return;
    var opts = options || {};
    container.textContent = '';

    var list = Array.isArray(names) ? names : [];
    if (list.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'cycle-empty';
      empty.textContent = 'No current rewards available.';
      container.appendChild(empty);
      return;
    }

    for (var i = 0; i < list.length; i++) {
      var displayName = normalizeChoiceName(list[i]);
      if (!displayName) continue;

      var item = null;
      if (opts.preferIncarnon) {
        item = findIncarnonItemByBaseName(displayName) || findItemByLooseName(displayName);
      } else {
        item = findItemByLooseName(displayName);
      }
      var imageUrl = item && item.imageName ? getChecklistImageUrl(item.imageName) : '';

      var card = document.createElement('article');
      card.className = 'cycle-item-card';

      var img = document.createElement('img');
      img.className = 'cycle-item-image';
      if (opts.preferIncarnon) img.classList.add('incarnon-image');
      img.src = imageUrl || 'assets/icon.png';
      img.alt = displayName;
      img.loading = 'lazy';

      var textWrap = document.createElement('div');

      var nameEl = document.createElement('div');
      nameEl.className = 'cycle-item-name';
      nameEl.textContent = opts.preferIncarnon ? (displayName + ' Incarnon') : displayName;

      var noteEl = document.createElement('div');
      noteEl.className = 'cycle-item-note';
      noteEl.textContent = opts.preferIncarnon ? ('Incarnon form • ' + noteText) : noteText;

      textWrap.appendChild(nameEl);
      textWrap.appendChild(noteEl);

      card.appendChild(img);
      card.appendChild(textWrap);
      container.appendChild(card);
    }
  }

  function setActiveCycleTab(tabName) {
    currentCycleTab = tabName;

    var navButtons = document.querySelectorAll('.cycles-nav-btn[data-cycle-tab]');
    navButtons.forEach(function(btn) {
      var isActive = btn.getAttribute('data-cycle-tab') === tabName;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    var views = document.querySelectorAll('.cycle-view[data-cycle-view]');
    views.forEach(function(view) {
      var isVisible = view.getAttribute('data-cycle-view') === tabName;
      view.classList.toggle('hidden', !isVisible);
    });
  }

  async function loadCycles() {
    if (!els.cyclesPanel) return;
    if (cycleRefreshInProgress) return;
    cycleRefreshInProgress = true;

    try {
      var data = await fetchCycleSnapshot();
      cycleSnapshot = data;
      renderWorldstateHub(data.worldstate);

      var cetusState = String((data.cetus && data.cetus.state) || '--').toUpperCase();
      var fortunaState = String((data.fortuna && data.fortuna.state) || '--').toUpperCase();
      var deimosState = String((data.deimos && data.deimos.state) || '--').toUpperCase();
      var duviriState = String((data.duviri && data.duviri.state) || '--').toUpperCase();

      if (els.cycleCetusState) els.cycleCetusState.textContent = cetusState;
      if (els.cycleFortunaState) els.cycleFortunaState.textContent = fortunaState;
      if (els.cycleDeimosState) els.cycleDeimosState.textContent = deimosState;
      if (els.cycleDuviriState) els.cycleDuviriState.textContent = duviriState;

      applyCycleCardStateVisuals(data.cetus && data.cetus.state);
      startCycleCountdown();

      var choices = Array.isArray(data.duviri && data.duviri.choices) ? data.duviri.choices : [];
      var normalChoices = [];
      var hardChoices = [];

      for (var i = 0; i < choices.length; i++) {
        var group = choices[i] || {};
        var key = String(group.category || '').toLowerCase();
        if (key === 'normal') normalChoices = Array.isArray(group.choices) ? group.choices : [];
        if (key === 'hard') hardChoices = Array.isArray(group.choices) ? group.choices : [];
      }

      renderCycleItemCards(els.cycleDuviriNormalItems, normalChoices, 'Duviri frame choice', { preferIncarnon: false });
      renderCycleItemCards(els.cycleDuviriHardItems, hardChoices, 'Duviri steel reward', { preferIncarnon: true });

      if (els.cyclesLocationText) {
        els.cyclesLocationText.textContent = 'Live fissures, invasions, weekly rotations, traders, and open-world cycles';
      }

      if (els.cycleDuviriSteelSub) {
        els.cycleDuviriSteelSub.textContent = (hardChoices.length > 0 ? hardChoices.length : 0) + ' steel path choices in the current circuit rotation';
      }
      if (els.cycleDuviriSteelChip) {
        els.cycleDuviriSteelChip.textContent = 'STEEL PATH';
      }

      var now = Date.now();
      var stillBoundary =
        getCycleRemainingMs(data.cetus, now) <= 0 ||
        getCycleRemainingMs(data.fortuna, now) <= 0 ||
        getCycleRemainingMs(data.deimos, now) <= 0 ||
        getCycleRemainingMs(data.duviri, now) <= 0;

      if (stillBoundary) {
        cycleRetryDelayMs = 3000;
        scheduleCycleRetry(3000);
      } else {
        cycleRetryDelayMs = 5000;
      }
    } catch (err) {
      cycleSnapshot = null;
      stopCycleCountdown();
      if (els.cyclesLocationText) {
        els.cyclesLocationText.textContent = 'Failed to load live worldstate data. Try refresh.';
      }
      if (els.worldstateSummaryGrid) {
        els.worldstateSummaryGrid.innerHTML = '<div class="worldstate-summary-card"><div class="worldstate-summary-label">Unavailable</div><div class="worldstate-summary-value">Worldstate</div><div class="worldstate-summary-meta">Unable to load live activities right now.</div></div>';
      }
      if (els.worldstateFissuresList) {
        els.worldstateFissuresList.innerHTML = '<div class="worldstate-empty">Unable to load fissures right now.</div>';
      }
      if (els.worldstateInvasionsList) {
        els.worldstateInvasionsList.innerHTML = '<div class="worldstate-empty">Unable to load invasions right now.</div>';
      }
      if (els.worldstateNightwaveList) {
        els.worldstateNightwaveList.innerHTML = '<div class="worldstate-empty">Unable to load Nightwave right now.</div>';
      }
      if (els.worldstateWeeklyList) {
        els.worldstateWeeklyList.innerHTML = '<div class="worldstate-empty">Unable to load weekly operations right now.</div>';
      }
      if (els.worldstateSpecialsList) {
        els.worldstateSpecialsList.innerHTML = '<div class="worldstate-empty">Unable to load special activities right now.</div>';
      }
      if (els.cycleDuviriNormalItems) {
        els.cycleDuviriNormalItems.innerHTML = '<div class="cycle-empty">Unable to load cycle rewards right now.</div>';
      }
      if (els.cycleDuviriHardItems) {
        els.cycleDuviriHardItems.innerHTML = '<div class="cycle-empty">Unable to load steel path rewards right now.</div>';
      }
      cycleRetryDelayMs = 3000;
      scheduleCycleRetry(3000);
    }

    // Must set false BEFORE scheduleCycleRefresh so the auto-refresh
    // can immediately queue a new fetch when all expiries have passed.
    cycleRefreshInProgress = false;

    // Schedule the next auto-refresh now that the flag is cleared.
    scheduleCycleRefresh();

    setActiveCycleTab(currentCycleTab || 'overview');
  }

  function isNecramechItem(item) {
    var name = String(item && item.name ? item.name : '').toLowerCase();
    return !!NECRAMECH_NAMES[name] || name.indexOf('necramech') !== -1;
  }

  function isKuvaTenetCodaWeapon(item) {
    var name = String(item && item.name ? item.name : '').toLowerCase();
    var category = String(item && item.category ? item.category : '').toLowerCase();
    var hasPrefix = name.indexOf('kuva ') === 0 || name.indexOf('tenet ') === 0 || name.indexOf('coda ') === 0;
    var isWeaponCategory = category === 'primary' || category === 'secondary' || category === 'melee' || category === 'vehicles';
    return hasPrefix && isWeaponCategory;
  }

  function getItemXP(item) {
    var type = String(item.type || '').toLowerCase();
    if (item.category === 'Mods') return 0;
    if (isNecramechItem(item)) return 8000;
    if (isKuvaTenetCodaWeapon(item)) return 4000;
    if (type.indexOf('arch-gun') !== -1 || type.indexOf('arch-melee') !== -1) return 3000;
    if (item.category === 'Warframes') return 6000;
    if (item.category === 'Companions' || item.category === 'Pets') return 6000;
    if (item.category === 'Sentinels') return 6000;
    if (item.category === 'Vehicles') return 6000;
    return DEFAULT_XP;
  }

  function isMasteryRelevantItem(item) {
    return !!item && item.category !== 'Mods';
  }

  // ---------- Data Loading ----------
  async function loadItems() {
    const cached = loadFromCache();
    if (cached) {
      allItems = cached;
      ensureRelicLookupLoaded().catch(function() { /* ignore lookup preload failure */ });
      await enrichItemsTradability(allItems);
      onItemsLoaded();
      return;
    }

    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();

      relicProjectionLookup = buildRelicProjectionLookup(data);
      saveRelicLookupCache(relicProjectionLookup);

      allItems = data
        .filter(function(item) { return item.masterable === true || item.category === 'Mods'; })
        .map(normalizeItem)
        .filter(function(item) { return !!item.uniqueName && !!item.name; })
        .sort(function(a, b) { return a.name.localeCompare(b.name); });

      await enrichItemsTradability(allItems);

      saveToCache(allItems);
      onItemsLoaded();
    } catch (err) {
      console.error('Failed to fetch items:', err);
      els.loadingContainer.textContent = '';
      var errIcon = document.createElement('span');
      errIcon.className = 'material-icons-round';
      errIcon.style.cssText = 'font-size:48px;color:var(--red);opacity:0.6';
      errIcon.textContent = 'cloud_off';
      var errText = document.createElement('p');
      errText.className = 'loading-text';
      errText.style.color = 'var(--red)';
      errText.textContent = 'Failed to load items';
      var errSub = document.createElement('p');
      errSub.className = 'loading-subtext';
      errSub.textContent = err.message;
      var retryBtn = document.createElement('button');
      retryBtn.className = 'btn btn-secondary';
      retryBtn.style.marginTop = '16px';
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', function() { location.reload(); });
      els.loadingContainer.appendChild(errIcon);
      els.loadingContainer.appendChild(errText);
      els.loadingContainer.appendChild(errSub);
      els.loadingContainer.appendChild(retryBtn);
    }
  }

  // ---------- Cache ----------
  function saveToCache(items) {
    try {
      localStorage.setItem(ITEMS_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        items: items
      }));
    } catch (e) { /* quota exceeded */ }
  }

  function loadFromCache() {
    try {
      var raw = localStorage.getItem(ITEMS_CACHE_KEY);
      if (!raw) return null;
      var cached = JSON.parse(raw);
      if (Date.now() - cached.timestamp > CACHE_TTL) return null;
      if (!cached.items || !Array.isArray(cached.items)) return null;
      var migrated = cached.items.map(normalizeItem).filter(function(item) {
        return !!item.uniqueName && !!item.name;
      });
      var valid = migrated.every(function(item) {
        return item && typeof item.uniqueName === 'string' && typeof item.name === 'string';
      });
      if (!valid) return null;
      return migrated;
    } catch (e) { return null; }
  }

  function sanitizeProfileName(rawName) {
    var value = String(rawName || '').trim().toLowerCase();
    value = value.replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
    return value || 'default';
  }

  function migrateRemovedProfileStorage(baseKey) {
    try {
      if (localStorage.getItem(baseKey) !== null) {
        return;
      }

      var storedProfileName = sanitizeProfileName(localStorage.getItem(REMOVED_PROFILE_NAME_KEY));
      var candidateKeys = [
        baseKey + '::' + storedProfileName,
        baseKey + '::default'
      ];

      for (var i = 0; i < candidateKeys.length; i++) {
        var raw = localStorage.getItem(candidateKeys[i]);
        if (raw === null) continue;
        localStorage.setItem(baseKey, raw);
        return;
      }
    } catch (e) { /* ignore */ }
  }

  function initRemovedProfileStorageMigration() {
    migrateRemovedProfileStorage(MASTERED_STORAGE_KEY);
    migrateRemovedProfileStorage(MASTERY_EXTRAS_STORAGE_KEY);
    try {
      localStorage.removeItem(REMOVED_PROFILE_NAME_KEY);
      localStorage.removeItem(REMOVED_AUTO_PROFILE_SYNC_KEY);
    } catch (e) { /* ignore */ }
  }

  function getDefaultMasteryExtras() {
    return {
      normalStarChartXp: 0,
      steelPathXp: 0,
      railjackRanks: 0,
      duviriRanks: 0
    };
  }

  function clampWholeNumber(value, min, max) {
    var num = parseInt(value, 10);
    if (!Number.isFinite(num)) num = 0;
    if (num < min) return min;
    if (num > max) return max;
    return num;
  }

  function normalizeMasteryExtras(raw) {
    var source = raw || {};
    return {
      normalStarChartXp: clampWholeNumber(source.normalStarChartXp, 0, NORMAL_STAR_CHART_XP_MAX),
      steelPathXp: clampWholeNumber(source.steelPathXp, 0, STEEL_PATH_XP_MAX),
      railjackRanks: clampWholeNumber(source.railjackRanks, 0, RAILJACK_INTRINSIC_RANK_MAX),
      duviriRanks: clampWholeNumber(source.duviriRanks, 0, DUVIRI_INTRINSIC_RANK_MAX)
    };
  }

  function getMasteryExtrasBreakdown(source) {
    var normalized = normalizeMasteryExtras(source || masteryExtras);
    var railjackXp = normalized.railjackRanks * INTRINSIC_RANK_XP;
    var duviriXp = normalized.duviriRanks * INTRINSIC_RANK_XP;

    return {
      normalStarChartXp: normalized.normalStarChartXp,
      steelPathXp: normalized.steelPathXp,
      railjackRanks: normalized.railjackRanks,
      duviriRanks: normalized.duviriRanks,
      railjackXp: railjackXp,
      duviriXp: duviriXp,
      totalBonusXp: normalized.normalStarChartXp + normalized.steelPathXp + railjackXp + duviriXp
    };
  }

  function getTrackedItemMasteryXp() {
    var totalXP = 0;
    for (var i = 0; i < allItems.length; i++) {
      if (!isMasteryRelevantItem(allItems[i])) continue;
      if (masteredSet.has(allItems[i].uniqueName)) {
        totalXP += getItemXP(allItems[i]);
      }
    }
    return totalXP;
  }

  function updateMasteryExtrasPreview() {
    var breakdown = getMasteryExtrasBreakdown();
    if (els.calcRailjackXp) {
      els.calcRailjackXp.textContent = breakdown.railjackXp.toLocaleString() + ' XP';
    }
    if (els.calcDuviriXp) {
      els.calcDuviriXp.textContent = breakdown.duviriXp.toLocaleString() + ' XP';
    }
  }

  function syncMasteryExtrasInputs() {
    var normalized = normalizeMasteryExtras(masteryExtras);
    masteryExtras = normalized;

    if (els.calcNormalStarChartXp) els.calcNormalStarChartXp.value = String(normalized.normalStarChartXp);
    if (els.calcSteelPathXp) els.calcSteelPathXp.value = String(normalized.steelPathXp);
    if (els.calcRailjackRanks) els.calcRailjackRanks.value = String(normalized.railjackRanks);
    if (els.calcDuviriRanks) els.calcDuviriRanks.value = String(normalized.duviriRanks);

    updateMasteryExtrasPreview();
  }

  function loadMasteryExtras() {
    try {
      var raw = localStorage.getItem(MASTERY_EXTRAS_STORAGE_KEY);
      masteryExtras = raw ? normalizeMasteryExtras(JSON.parse(raw)) : getDefaultMasteryExtras();
    } catch (e) {
      masteryExtras = getDefaultMasteryExtras();
    }
    syncMasteryExtrasInputs();
  }

  function saveMasteryExtras() {
    try {
      localStorage.setItem(MASTERY_EXTRAS_STORAGE_KEY, JSON.stringify(normalizeMasteryExtras(masteryExtras)));
    } catch (e) { /* ignore */ }
  }

  function applyMasteryExtrasFromInputs(syncInputs) {
    masteryExtras = normalizeMasteryExtras({
      normalStarChartXp: els.calcNormalStarChartXp ? els.calcNormalStarChartXp.value : 0,
      steelPathXp: els.calcSteelPathXp ? els.calcSteelPathXp.value : 0,
      railjackRanks: els.calcRailjackRanks ? els.calcRailjackRanks.value : 0,
      duviriRanks: els.calcDuviriRanks ? els.calcDuviriRanks.value : 0
    });

    saveMasteryExtras();
    if (syncInputs) {
      syncMasteryExtrasInputs();
    } else {
      updateMasteryExtrasPreview();
    }
    updateStats();
  }

  // ---------- Mastered Persistence ----------
  function loadMastered() {
    try {
      var raw = localStorage.getItem(MASTERED_STORAGE_KEY);
      if (!raw) {
        masteredSet = new Set();
        return;
      }
      var parsed = JSON.parse(raw);
      masteredSet = new Set(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      masteredSet = new Set();
    }
  }

  function saveMastered() {
    localStorage.setItem(MASTERED_STORAGE_KEY, JSON.stringify(Array.from(masteredSet)));
  }

  function toggleMastered(uniqueName) {
    if (masteredSet.has(uniqueName)) {
      masteredSet.delete(uniqueName);
    } else {
      masteredSet.add(uniqueName);
    }
    saveMastered();
    updateStats();
  }

  // ---------- Item Rendering ----------
  function onItemsLoaded() {
    els.loadingContainer.classList.add('hidden');
    loadBuilds();
    loadMastered();
    loadMasteryExtras();
    updateCounts();
    applyFilters();
    updateStats();
  }

  function applyFilters() {
    filteredItems = allItems.filter(function(item) {
      if (currentCategory === 'all' && item.category === 'Mods') return false;
      if (currentCategory !== 'all' && item.category !== currentCategory) return false;
      if (currentFilter === 'mastered' && !masteredSet.has(item.uniqueName)) return false;
      if (currentFilter === 'unmastered' && masteredSet.has(item.uniqueName)) return false;
      if (searchQuery && item.name.toLowerCase().indexOf(searchQuery.toLowerCase()) === -1) return false;
      return true;
    });

    renderItems();
    updateCategoryHeader();
  }

  function createItemCard(item, index) {
    var card = document.createElement('div');
    card.className = 'item-card' + (masteredSet.has(item.uniqueName) ? ' mastered' : '');
    if (item.category === 'Mods') card.classList.add('mod-item');
    card.setAttribute('data-unique-name', item.uniqueName);
    card.style.animationDelay = Math.min(index * 15, 400) + 'ms';

    // Image container
    var imageDiv = document.createElement('div');
    imageDiv.className = 'item-card-image';

    if (item.imageName) {
      var img = document.createElement('img');
      img.src = getChecklistImageUrl(item.imageName);
      img.alt = item.name;
      img.loading = 'lazy';
      img.addEventListener('error', function() {
        img.style.display = 'none';
        var placeholder = imageDiv.querySelector('.placeholder-icon');
        if (placeholder) placeholder.style.display = 'block';
      });
      imageDiv.appendChild(img);
    }

    if (tradeModeEnabled) {
      var tradeBadge = document.createElement('span');
      tradeBadge.className = 'item-card-trade-badge ' + (item.tradable ? 'tradable' : 'not-tradable');
      tradeBadge.textContent = item.tradable ? 'Tradable' : 'Not Tradable';
      imageDiv.appendChild(tradeBadge);
    }

    imageDiv.title = 'Open item details';
    imageDiv.style.cursor = 'pointer';
    imageDiv.addEventListener('click', function(e) {
      e.stopPropagation();
      openItemInfoModal(item);
    });

    var placeholderIcon = document.createElement('span');
    placeholderIcon.className = 'material-icons-round placeholder-icon';
    placeholderIcon.textContent = 'image';
    if (item.imageName) placeholderIcon.style.display = 'none';
    imageDiv.appendChild(placeholderIcon);

    // Body
    var bodyDiv = document.createElement('div');
    bodyDiv.className = 'item-card-body';

    var nameDiv = document.createElement('div');
    nameDiv.className = 'item-card-name';
    nameDiv.title = item.name;
    nameDiv.textContent = item.name;

    var typeDiv = document.createElement('div');
    typeDiv.className = 'item-card-type';
    typeDiv.textContent = item.type || item.category;

    var xpDiv = document.createElement('div');
    xpDiv.className = 'item-card-xp';
    if (item.category !== 'Mods') {
      xpDiv.textContent = getItemXP(item).toLocaleString() + ' XP';
    }

    var checkDiv = document.createElement('div');
    checkDiv.className = 'item-card-check';
    checkDiv.title = item.category === 'Mods' ? 'Owned' : 'Mastered';
    var checkIcon = document.createElement('span');
    checkIcon.className = 'material-icons-round';
    checkIcon.textContent = 'check';
    checkDiv.appendChild(checkIcon);

    bodyDiv.appendChild(nameDiv);
    bodyDiv.appendChild(typeDiv);
    if (item.category !== 'Mods') {
      bodyDiv.appendChild(xpDiv);
    }
    bodyDiv.appendChild(checkDiv);

    card.appendChild(imageDiv);
    card.appendChild(bodyDiv);

    card.addEventListener('click', function() {
      toggleMastered(item.uniqueName);
      card.classList.toggle('mastered');
      updateCounts();
    });

    return card;
  }

  function renderItems() {
    // Remove old cards
    var existingCards = els.itemsGrid.querySelectorAll('.item-card');
    for (var i = 0; i < existingCards.length; i++) {
      existingCards[i].remove();
    }

    if (filteredItems.length === 0) {
      els.emptyState.classList.remove('hidden');
    } else {
      els.emptyState.classList.add('hidden');
    }

    var fragment = document.createDocumentFragment();
    for (var j = 0; j < filteredItems.length; j++) {
      fragment.appendChild(createItemCard(filteredItems[j], j));
    }
    els.itemsGrid.appendChild(fragment);
  }

  function updateCategoryHeader() {
    var labels = {
      'all': 'All Items',
      'Warframes': 'Warframes',
      'Primary': 'Primary Weapons',
      'Secondary': 'Secondary Weapons',
      'Melee': 'Melee Weapons',
      'Companions': 'Companions',
      'Vehicles': 'Vehicles',
      'Sentinels': 'Sentinels',
      'Mods': 'Mods',
    };
    els.categoryTitle.textContent = labels[currentCategory] || currentCategory;

    if (currentCategory === 'all' && tradeModeEnabled) {
      var tradableCount = 0;
      for (var i = 0; i < allItems.length; i++) {
        if (allItems[i].category === 'Mods') continue;
        if (allItems[i].tradable) tradableCount++;
      }
      els.categoryItemCount.textContent = filteredItems.length + ' items • ' + tradableCount + ' tradable';
      return;
    }

    els.categoryItemCount.textContent = filteredItems.length + ' items';
  }

  // ---------- Stats ----------
  function updateStats() {
    var totalMasteredCount = 0;
    var totalItemsCount = 0;
    var itemXP = 0;
    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i];
      if (!isMasteryRelevantItem(item)) continue;
      totalItemsCount++;
      if (masteredSet.has(item.uniqueName)) {
        totalMasteredCount++;
        itemXP += getItemXP(item);
      }
    }

    var masteryBreakdown = getMasteryExtrasBreakdown();
    var totalXP = itemXP + masteryBreakdown.totalBonusXp;

    var mr = getMRFromXP(totalXP);
    var xpForCurrentMR = getXPForMR(mr);
    var xpForNextMR = getXPForMR(mr + 1);
    var xpIntoRank = totalXP - xpForCurrentMR;
    var xpNeededForNext = xpForNextMR - xpForCurrentMR;
    var rankProgress = xpNeededForNext > 0 ? xpIntoRank / xpNeededForNext : 1;

    els.masteryRankDisplay.textContent = formatRankLabel(mr);
    els.masteryXpDisplay.textContent = totalXP.toLocaleString() + ' / ' + xpForNextMR.toLocaleString() + ' XP';

    var circumference = 2 * Math.PI * 42;
    var offset = circumference - (rankProgress * circumference);
    els.ringProgress.style.strokeDashoffset = offset;

    els.totalMastered.textContent = totalMasteredCount;
    els.totalItems.textContent = totalItemsCount;
    var overallPercent = totalItemsCount > 0 ? (totalMasteredCount / totalItemsCount * 100) : 0;
    els.overallProgress.style.width = overallPercent + '%';
    els.progressPercent.textContent = overallPercent.toFixed(1) + '% Complete';

    updateCalculator();
  }

  async function openGitHubRepo() {
    if (window.electronAPI && window.electronAPI.openExternal) {
      try {
        await window.electronAPI.openExternal(REPO_URL);
        return;
      } catch (e) { /* fall through */ }
    }
    window.open(REPO_URL, '_blank', 'noopener');
  }

  function getMRFromXP(xp) {
    if (xp <= 0) return 0;

    if (xp < MR30_TOTAL_XP) {
      return Math.floor(Math.sqrt(xp / MR_XP_MULTIPLIER));
    }

    return MR30 + Math.floor((xp - MR30_TOTAL_XP) / LEGENDARY_STEP_XP);
  }

  function getXPForMR(mr) {
    if (mr <= MR30) {
      // MR1 = 2,500   MR10 = 250,000   MR30 = 2,250,000
      return MR_XP_MULTIPLIER * mr * mr;
    }

    // Legendary ranks increase by a flat 147,500 XP per rank.
    return MR30_TOTAL_XP + ((mr - MR30) * LEGENDARY_STEP_XP);
  }

  function formatRankLabel(rank) {
    if (rank <= MR30) return String(rank);
    return 'L' + String(rank - MR30);
  }

  function updateTradeModeUI() {
    if (!els.tradeModeBtn) return;
    var textEl = els.tradeModeBtn.querySelector('.nav-text');
    if (textEl) {
      textEl.textContent = tradeModeEnabled ? 'Trade Mode: Enabled' : 'Trade Mode: Disabled';
    }
    els.tradeModeBtn.classList.toggle('active', tradeModeEnabled);
    els.tradeModeBtn.setAttribute('aria-pressed', tradeModeEnabled ? 'true' : 'false');
  }

  async function toggleTradeMode() {
    if (!window.electronAPI || !window.electronAPI.setTradeMode) return;
    try {
      var nextState = !tradeModeEnabled;
      var result = await window.electronAPI.setTradeMode(nextState);
      tradeModeEnabled = !!(result && result.enabled);
      updateTradeModeUI();
      applyFilters();
    } catch (err) {
      console.error('Failed to toggle trade mode:', err);
    }
  }

  async function setAlwaysOnTopEnabled(enabled) {
    if (!window.electronAPI || !window.electronAPI.setAlwaysOnTop) return;
    try {
      var result = await window.electronAPI.setAlwaysOnTop(!!enabled);
      var applied = !!(result && result.enabled);
      localStorage.setItem(ALWAYS_ON_TOP_KEY, applied ? '1' : '0');
      if (els.alwaysOnTopToggle) {
        els.alwaysOnTopToggle.checked = applied;
      }
    } catch (err) {
      console.error('Failed to set always-on-top:', err);
    }
  }

  async function initAlwaysOnTopSetting() {
    var enabled = localStorage.getItem(ALWAYS_ON_TOP_KEY) === '1';
    if (els.alwaysOnTopToggle) {
      els.alwaysOnTopToggle.checked = enabled;
    }
    await setAlwaysOnTopEnabled(enabled);
  }

  async function initAppVersion() {
    if (!els.settingsAppVersion) return '';
    if (!window.electronAPI || !window.electronAPI.getAppVersion) {
      els.settingsAppVersion.textContent = 'Version -';
      return '';
    }
    try {
      var version = await window.electronAPI.getAppVersion();
      currentAppVersion = String(version || '').trim();
      els.settingsAppVersion.textContent = 'Version ' + (currentAppVersion || '-');
      return currentAppVersion;
    } catch (err) {
      els.settingsAppVersion.textContent = 'Version -';
      currentAppVersion = '';
      return '';
    }
  }

  function normalizeVersion(rawVersion) {
    var raw = String(rawVersion || '').trim();
    if (!raw) return null;
    var cleaned = raw.replace(/^v/i, '').split('-')[0].trim();
    var match = cleaned.match(/^\d+(?:\.\d+){0,2}/);
    if (!match) return null;
    var parts = match[0].split('.').map(function(part) {
      var num = parseInt(part, 10);
      return Number.isFinite(num) ? num : 0;
    });
    while (parts.length < 3) parts.push(0);
    return { raw: raw, normalized: parts.join('.'), parts: parts };
  }

  function compareVersionParts(left, right) {
    for (var i = 0; i < 3; i++) {
      var l = left[i] || 0;
      var r = right[i] || 0;
      if (l > r) return 1;
      if (l < r) return -1;
    }
    return 0;
  }

  function setUpdateStatus(kind, text, details) {
    if (els.updateStatusPill) {
      els.updateStatusPill.classList.remove('is-checking', 'is-up-to-date', 'is-outdated', 'is-error', 'is-downloading');
      els.updateStatusPill.classList.add(kind);
      els.updateStatusPill.title = details || text || '';
    }
    if (els.updateStatusText) {
      els.updateStatusText.textContent = text || 'checking...';
    }
    if (els.settingsUpdateDetails && details) {
      els.settingsUpdateDetails.textContent = details;
    }
  }

  async function fetchLatestVersionFromRepo() {
    var releaseResp;
    try {
      releaseResp = await fetch(UPDATE_RELEASE_API);
      if (releaseResp.ok) {
        var releaseData = await releaseResp.json();
        var releaseVersion = normalizeVersion(releaseData.tag_name || releaseData.name || '');
        if (releaseVersion) {
          return { version: releaseVersion, source: 'release' };
        }
      }
    } catch (e) { /* ignore and continue fallback */ }

    try {
      var tagsResp = await fetch(UPDATE_TAGS_API);
      if (tagsResp.ok) {
        var tagsData = await tagsResp.json();
        if (Array.isArray(tagsData) && tagsData.length > 0) {
          var tagVersion = normalizeVersion(tagsData[0] && tagsData[0].name ? tagsData[0].name : '');
          if (tagVersion) {
            return { version: tagVersion, source: 'tag' };
          }
        }
      }
    } catch (e2) { /* ignore and continue fallback */ }

    try {
      var packageResp = await fetch(UPDATE_PACKAGE_API);
      if (packageResp.ok) {
        var packageData = await packageResp.json();
        var encoded = packageData && packageData.content ? String(packageData.content).replace(/\s+/g, '') : '';
        if (encoded) {
          var decoded = atob(encoded);
          var pkg = JSON.parse(decoded);
          var packageVersion = normalizeVersion(pkg && pkg.version ? pkg.version : '');
          if (packageVersion) {
            return { version: packageVersion, source: 'package.json' };
          }
        }
      }
    } catch (e3) { /* ignore final fallback */ }

    throw new Error('No published version metadata found in repository.');
  }

  function setDownloadUpdateButtonVisible(show, disabled, text) {
    if (!els.updateDownloadBtn) return;
    els.updateDownloadBtn.classList.toggle('hidden', !show);
    els.updateDownloadBtn.disabled = !!disabled;
    if (text) {
      els.updateDownloadBtn.textContent = text;
    }
  }

  function bytesToMiB(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '0.0';
    return (value / (1024 * 1024)).toFixed(1);
  }

  function handleNativeUpdaterEvent(payload) {
    var type = payload && payload.type ? String(payload.type) : '';

    if (type === 'checking-for-update') {
      updateAvailableForDownload = false;
      setDownloadUpdateButtonVisible(false, true);
      setUpdateStatus('is-checking', 'checking...', 'Checking GitHub Releases for update metadata...');
      return;
    }

    if (type === 'update-available') {
      updateAvailableForDownload = true;
      var nextVersion = payload && payload.version ? payload.version : 'latest';
      setDownloadUpdateButtonVisible(true, false, 'Download Update');
      setUpdateStatus('is-outdated', 'you need to update', 'Update ' + nextVersion + ' is available. Click Download Update to install in-app.');
      return;
    }

    if (type === 'update-not-available') {
      updateAvailableForDownload = false;
      setDownloadUpdateButtonVisible(false, true);
      setUpdateStatus('is-up-to-date', 'up to date', 'You are running the latest release build.');
      return;
    }

    if (type === 'download-progress') {
      var percent = payload && typeof payload.percent === 'number' ? payload.percent : 0;
      var transferred = bytesToMiB(payload && payload.transferred);
      var total = bytesToMiB(payload && payload.total);
      setDownloadUpdateButtonVisible(true, true, 'Downloading...');
      setUpdateStatus('is-downloading', 'downloading ' + percent.toFixed(0) + '%', transferred + ' MiB / ' + total + ' MiB downloaded.');
      return;
    }

    if (type === 'update-downloaded') {
      setDownloadUpdateButtonVisible(false, true);
      setUpdateStatus('is-checking', 'restarting...', 'Update downloaded. Restarting app to install now...');
      return;
    }

    if (type === 'installing-update') {
      setDownloadUpdateButtonVisible(false, true);
      setUpdateStatus('is-checking', 'installing...', 'Installing update and restarting...');
      return;
    }

    if (type === 'error') {
      var message = payload && payload.message ? payload.message : 'Update operation failed.';
      setDownloadUpdateButtonVisible(updateAvailableForDownload, false, 'Download Update');
      setUpdateStatus('is-error', 'status unavailable', message);
    }
  }

  function initNativeUpdaterBridge() {
    if (!window.electronAPI || !window.electronAPI.onAppUpdateEvent) return;
    if (removeUpdateEventListener) {
      removeUpdateEventListener();
      removeUpdateEventListener = null;
    }
    removeUpdateEventListener = window.electronAPI.onAppUpdateEvent(handleNativeUpdaterEvent);
  }

  async function checkForUpdatesFromRepo() {
    if (!currentAppVersion) {
      await initAppVersion();
    }

    var current = normalizeVersion(currentAppVersion);
    if (!current) {
      setUpdateStatus('is-error', 'status unavailable', 'Current app version is unavailable.');
      return;
    }

    setUpdateStatus('is-checking', 'checking...', 'Checking GitHub for the latest version...');

    try {
      var latestInfo = await fetchLatestVersionFromRepo();
      var latest = latestInfo.version;
      var comparison = compareVersionParts(current.parts, latest.parts);

      if (comparison >= 0) {
        setUpdateStatus(
          'is-up-to-date',
          'up to date',
          'Current ' + current.normalized + ' • Latest ' + latest.normalized + ' (' + latestInfo.source + ')'
        );
      } else {
        setUpdateStatus(
          'is-outdated',
          'you need to update',
          'Current ' + current.normalized + ' • Latest ' + latest.normalized + ' (' + latestInfo.source + ')'
        );
      }
    } catch (err) {
      setUpdateStatus('is-error', 'status unavailable', err && err.message ? err.message : 'Update check failed.');
    }
  }

  async function checkForUpdates() {
    if (!window.electronAPI || !window.electronAPI.checkForAppUpdate) {
      await checkForUpdatesFromRepo();
      return;
    }

    setDownloadUpdateButtonVisible(false, true);
    setUpdateStatus('is-checking', 'checking...', 'Checking for updates...');

    var result;
    try {
      result = await window.electronAPI.checkForAppUpdate();
    } catch (err) {
      setUpdateStatus('is-error', 'status unavailable', err && err.message ? err.message : 'Update check failed.');
      return;
    }

    if (result && result.ok) {
      return;
    }

    if (result && result.reason === 'dev-mode') {
      await checkForUpdatesFromRepo();
      return;
    }

    setUpdateStatus('is-error', 'status unavailable', result && result.message ? result.message : 'Update check failed.');
  }

  async function downloadUpdateInApp() {
    if (!window.electronAPI || !window.electronAPI.downloadAppUpdate) {
      setUpdateStatus('is-error', 'status unavailable', 'In-app updater is unavailable in this build.');
      return;
    }

    setDownloadUpdateButtonVisible(true, true, 'Downloading...');
    setUpdateStatus('is-downloading', 'downloading...', 'Starting secure update download from GitHub Releases...');

    var result;
    try {
      result = await window.electronAPI.downloadAppUpdate();
    } catch (err) {
      setDownloadUpdateButtonVisible(true, false, 'Download Update');
      setUpdateStatus('is-error', 'status unavailable', err && err.message ? err.message : 'Update download failed.');
      return;
    }

    if (!result || !result.ok) {
      setDownloadUpdateButtonVisible(true, false, 'Download Update');
      setUpdateStatus('is-error', 'status unavailable', result && result.message ? result.message : 'Update download failed.');
    }
  }

  function initAutoUpdateSetting() {
    var raw = localStorage.getItem(AUTO_UPDATE_CHECK_KEY);
    var enabled = raw === null ? true : raw === '1';

    if (els.autoUpdateCheckToggle) {
      els.autoUpdateCheckToggle.checked = enabled;
    }

    if (enabled) {
      checkForUpdates();
    } else {
      setDownloadUpdateButtonVisible(false, true);
      setUpdateStatus('is-error', 'status unavailable', 'Auto update check is disabled.');
    }
  }

  // ---------- Counts ----------
  function updateCounts() {
    var counts = {};
    var totalAll = 0;

    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i];
      if (!counts[item.category]) counts[item.category] = { total: 0, mastered: 0 };
      counts[item.category].total++;
      if (item.category !== 'Mods') totalAll++;
      if (masteredSet.has(item.uniqueName)) {
        counts[item.category].mastered++;
      }
    }

    var masteredCount = 0;
    for (var j = 0; j < allItems.length; j++) {
      if (allItems[j].category !== 'Mods' && masteredSet.has(allItems[j].uniqueName)) {
        masteredCount++;
      }
    }
    setCount('count-all', masteredCount, totalAll);
    setCount('count-warframes', counts['Warframes']);
    setCount('count-primary', counts['Primary']);
    setCount('count-secondary', counts['Secondary']);
    setCount('count-melee', counts['Melee']);
    setCount('count-companions', counts['Companions']);
    setCount('count-vehicles', counts['Vehicles']);
    setCount('count-sentinels', counts['Sentinels']);
    setCount('count-mods', counts['Mods']);
  }

  function setCount(id, masteredOrCounts, total) {
    var el = document.getElementById(id);
    if (!el) return;
    if (typeof total === 'number') {
      el.textContent = masteredOrCounts + '/' + total;
    } else if (masteredOrCounts) {
      el.textContent = (masteredOrCounts.mastered || 0) + '/' + (masteredOrCounts.total || 0);
    } else {
      el.textContent = '0/0';
    }
  }

  // ---------- Calculator ----------
  function updateCalculator() {
    var itemXP = getTrackedItemMasteryXp();
    var masteryBreakdown = getMasteryExtrasBreakdown();
    var totalXP = itemXP + masteryBreakdown.totalBonusXp;

    var currentMR = getMRFromXP(totalXP);
    var targetMR = parseInt(els.targetRankInput.value) || 0;
    var targetXP = getXPForMR(targetMR);
    var xpNeeded = Math.max(0, targetXP - totalXP);
    var avgXP = 3500;
    var itemsNeeded = Math.ceil(xpNeeded / avgXP);
    var progress = targetXP > 0 ? Math.min(100, (totalXP / targetXP) * 100) : 0;

    els.calcCurrentXp.textContent = totalXP.toLocaleString() + ' XP';
    els.calcCurrentRank.textContent = formatRankLabel(currentMR);
    if (els.calcItemXp) els.calcItemXp.textContent = itemXP.toLocaleString() + ' XP';
    if (els.calcBonusXp) els.calcBonusXp.textContent = masteryBreakdown.totalBonusXp.toLocaleString() + ' XP';
    if (els.calcTrackedTotalXp) els.calcTrackedTotalXp.textContent = totalXP.toLocaleString() + ' XP';
    els.calcTargetXp.textContent = targetXP.toLocaleString() + ' XP';
    els.calcXpNeeded.textContent = xpNeeded > 0 ? xpNeeded.toLocaleString() + ' XP' : 'Achieved! \u2713';
    els.calcItemsNeeded.textContent = xpNeeded > 0 ? '~' + itemsNeeded : '0';
    els.calcProgressPercent.textContent = progress.toFixed(1) + '%';
    els.calcProgressBar.style.width = progress + '%';

    els.calcXpNeeded.style.color = xpNeeded <= 0 ? 'var(--green)' : '';
  }

  // ---------- Mark All / Unmark All ----------
  function markAllInCategory() {
    var itemsToMark = filteredItems;
    for (var i = 0; i < itemsToMark.length; i++) {
      masteredSet.add(itemsToMark[i].uniqueName);
    }
    saveMastered();
    updateCounts();
    updateStats();
    applyFilters();
  }

  function unmarkAllInCategory() {
    var itemsToUnmark = filteredItems;
    for (var i = 0; i < itemsToUnmark.length; i++) {
      masteredSet.delete(itemsToUnmark[i].uniqueName);
    }
    saveMastered();
    updateCounts();
    updateStats();
    applyFilters();
  }

  function syncSidebarToggleUi() {
    if (!els.appContainer) return;

    els.appContainer.classList.toggle('sidebar-collapsed', sidebarCollapsed);

    var label = sidebarCollapsed ? 'Show left panel' : 'Hide left panel';
    if (els.sidebarToggleBtn) {
      els.sidebarToggleBtn.setAttribute('aria-label', label);
      els.sidebarToggleBtn.setAttribute('title', label);
      els.sidebarToggleBtn.setAttribute('aria-pressed', sidebarCollapsed ? 'true' : 'false');
    }

    if (els.sidebarToggleIcon) {
      els.sidebarToggleIcon.textContent = sidebarCollapsed ? 'chevron_right' : 'chevron_left';
    }
  }

  function setSidebarCollapsed(nextCollapsed) {
    sidebarCollapsed = !!nextCollapsed;
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0');
    syncSidebarToggleUi();
  }

  function initSidebarToggle() {
    sidebarCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    syncSidebarToggleUi();

    if (els.sidebarToggleBtn) {
      els.sidebarToggleBtn.addEventListener('click', function() {
        setSidebarCollapsed(!sidebarCollapsed);
      });
    }
  }

  // ---------- Event Listeners ----------

  // Sidebar navigation
  $$('.nav-item[data-category]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      $$('.nav-item[data-category]').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      applyFilters();
    });
  });

  // Filter buttons
  $$('.filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      $$('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      applyFilters();
    });
  });

  // Search
  els.searchInput.addEventListener('input', function(e) {
    searchQuery = e.target.value.trim();
    els.searchClear.classList.toggle('hidden', !searchQuery);
    applyFilters();
  });

  $('#search-clear').addEventListener('click', function() {
    els.searchInput.value = '';
    searchQuery = '';
    els.searchClear.classList.add('hidden');
    applyFilters();
  });

  // Mark All / Unmark All buttons
  $('#btn-mark-all').addEventListener('click', function() {
    markAllInCategory();
  });

  $('#btn-unmark-all').addEventListener('click', function() {
    unmarkAllInCategory();
  });

  // Calculator modal
  if (els.tradeModeBtn) {
    els.tradeModeBtn.addEventListener('click', function() {
      toggleTradeMode();
    });
    updateTradeModeUI();
  }

  if (els.alwaysOnTopToggle) {
    els.alwaysOnTopToggle.addEventListener('change', function() {
      setAlwaysOnTopEnabled(!!els.alwaysOnTopToggle.checked);
    });
  }

  if (els.autoUpdateCheckToggle) {
    els.autoUpdateCheckToggle.addEventListener('change', function() {
      var enabled = !!els.autoUpdateCheckToggle.checked;
      localStorage.setItem(AUTO_UPDATE_CHECK_KEY, enabled ? '1' : '0');
      if (enabled) {
        checkForUpdates();
      } else {
        setDownloadUpdateButtonVisible(false, true);
        setUpdateStatus('is-error', 'status unavailable', 'Auto update check is disabled.');
      }
    });
  }

  if (els.openGithubRepoBtn) {
    els.openGithubRepoBtn.addEventListener('click', function() {
      openGitHubRepo();
    });
  }

  if (els.updateCheckNowBtn) {
    els.updateCheckNowBtn.addEventListener('click', function() {
      checkForUpdates();
    });
  }

  if (els.updateDownloadBtn) {
    els.updateDownloadBtn.addEventListener('click', function() {
      downloadUpdateInApp();
    });
  }

  if (els.newsBtn) {
    els.newsBtn.addEventListener('click', function() {
      openNewsModal();
    });
  }

  if (els.newsModalClose) {
    els.newsModalClose.addEventListener('click', function() {
      closeNewsModal();
    });
  }

  if (els.newsModal) {
    els.newsModal.addEventListener('click', function(e) {
      if (e.target === els.newsModal) closeNewsModal();
    });
  }

  // Calculator modal
  $('#btn-calculator').addEventListener('click', function() {
    updateCalculator();
    els.calculatorModal.classList.remove('hidden');
  });

  $('#modal-close').addEventListener('click', function() {
    els.calculatorModal.classList.add('hidden');
  });

  els.calculatorModal.addEventListener('click', function(e) {
    if (e.target === els.calculatorModal) els.calculatorModal.classList.add('hidden');
  });

  els.targetRankInput.addEventListener('input', updateCalculator);

  [
    els.calcNormalStarChartXp,
    els.calcSteelPathXp,
    els.calcRailjackRanks,
    els.calcDuviriRanks
  ].forEach(function(input) {
    if (!input) return;
    input.addEventListener('input', function() {
      applyMasteryExtrasFromInputs(false);
    });
    input.addEventListener('change', function() {
      applyMasteryExtrasFromInputs(true);
    });
  });

  if (els.calcNormalStarChartMaxBtn) {
    els.calcNormalStarChartMaxBtn.addEventListener('click', function() {
      if (els.calcNormalStarChartXp) {
        els.calcNormalStarChartXp.value = String(NORMAL_STAR_CHART_XP_MAX);
      }
      applyMasteryExtrasFromInputs(true);
    });
  }

  if (els.calcSteelPathMaxBtn) {
    els.calcSteelPathMaxBtn.addEventListener('click', function() {
      if (els.calcSteelPathXp) {
        els.calcSteelPathXp.value = String(STEEL_PATH_XP_MAX);
      }
      applyMasteryExtrasFromInputs(true);
    });
  }

  // Reset modal
  $('#btn-reset').addEventListener('click', function() {
    els.resetModal.classList.remove('hidden');
  });

  $('#reset-modal-close').addEventListener('click', function() {
    els.resetModal.classList.add('hidden');
  });

  $('#reset-cancel').addEventListener('click', function() {
    els.resetModal.classList.add('hidden');
  });

  els.resetModal.addEventListener('click', function(e) {
    if (e.target === els.resetModal) els.resetModal.classList.add('hidden');
  });

  $('#reset-confirm').addEventListener('click', function() {
    masteredSet.clear();
    saveMastered();
    els.resetModal.classList.add('hidden');
    updateCounts();
    updateStats();
    applyFilters();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      var marketPanel = $('#market-panel');
      if (marketPanel && !marketPanel.classList.contains('hidden')) {
        $('#market-search-input').focus();
      } else {
        els.searchInput.focus();
      }
    }
    if (e.key === 'Escape') {
      els.calculatorModal.classList.add('hidden');
      els.resetModal.classList.add('hidden');
      closeNewsModal();
      closeItemInfoModal();
    }
  });

  if (els.itemInfoClose) {
    els.itemInfoClose.addEventListener('click', closeItemInfoModal);
  }
  if (els.itemInfoModal) {
    els.itemInfoModal.addEventListener('click', function(e) {
      if (e.target === els.itemInfoModal) closeItemInfoModal();
    });
  }
  if (els.itemInfoTabInfo) {
    els.itemInfoTabInfo.addEventListener('click', function() { setActiveInfoTab('info'); });
  }
  if (els.itemInfoTabMission) {
    els.itemInfoTabMission.addEventListener('click', function() { setActiveInfoTab('mission'); });
  }
  if (els.itemInfoTabResources) {
    els.itemInfoTabResources.addEventListener('click', function() { setActiveInfoTab('resources'); });
  }
  if (els.itemInfoMarketBtn) {
    els.itemInfoMarketBtn.addEventListener('click', async function() {
      if (!tradeModeEnabled || !currentItemInfo || !currentItemInfo.tradable) return;
      await showPanel('market');
      if (window.warframeMarket && window.warframeMarket.searchItemByName) {
        await window.warframeMarket.searchItemByName(currentItemInfo.name);
      } else if (window.warframeMarket && window.warframeMarket.openItemByName) {
        await window.warframeMarket.openItemByName(currentItemInfo.name);
      }
      closeItemInfoModal();
    });
  }
  if (els.itemInfoWikiBtn) {
    els.itemInfoWikiBtn.addEventListener('click', function() {
      if (!currentItemInfo) return;
      var wikiUrl = buildWikiUrl(currentItemInfo);
      if (!wikiUrl) return;
      window.open(wikiUrl, '_blank', 'noopener');
    });
  }

  // ---------- Panel Switching (Checklist ↔ Market) ----------
  var marketLoaded = false;

  function getPanelRefs() {
    return {
      checklist: $('#content'),
      market: $('#market-panel'),
      prime: $('#prime-panel'),
      cycles: $('#cycles-panel'),
      settings: $('#settings-page')
    };
  }

  function getCurrentPanelName() {
    var refs = getPanelRefs();
    if (refs.settings && !refs.settings.classList.contains('hidden')) return 'settings';
    if (refs.cycles && !refs.cycles.classList.contains('hidden')) return 'cycles';
    if (refs.prime && !refs.prime.classList.contains('hidden')) return 'prime';
    if (refs.market && !refs.market.classList.contains('hidden')) return 'market';
    return 'checklist';
  }

  function applyPanelVisibility(panel, refs) {
    var contentEl = refs.checklist;
    var marketPanel = refs.market;
    var primePanel = refs.prime;
    var cyclesPanel = refs.cycles;
    var settingsPage = refs.settings;

    var navMarket = $('#nav-market');
    var navPrime = $('#nav-prime-resurgence');
    var navCycles = $('#nav-cycles');

    if (panel === 'market') {
      contentEl.classList.add('hidden');
      marketPanel.classList.remove('hidden');
      if (primePanel) primePanel.classList.add('hidden');
      if (cyclesPanel) cyclesPanel.classList.add('hidden');
      settingsPage.classList.add('hidden');
      $$('.nav-item[data-category]').forEach(function(b) { b.classList.remove('active'); });
      if (navMarket) navMarket.classList.add('active');
      if (navPrime) navPrime.classList.remove('active');
      if (navCycles) navCycles.classList.remove('active');
      stopPrimeCountdown();
      stopCycleCountdown();
      if (!marketLoaded && window.warframeMarket) {
        window.warframeMarket.init();
        window.warframeMarket.load();
        marketLoaded = true;
      }
    } else if (panel === 'prime') {
      contentEl.classList.add('hidden');
      marketPanel.classList.add('hidden');
      if (primePanel) primePanel.classList.remove('hidden');
      if (cyclesPanel) cyclesPanel.classList.add('hidden');
      settingsPage.classList.add('hidden');
      $$('.nav-item[data-category]').forEach(function(b) { b.classList.remove('active'); });
      if (navMarket) navMarket.classList.remove('active');
      if (navPrime) navPrime.classList.add('active');
      if (navCycles) navCycles.classList.remove('active');
      stopCycleCountdown();
      loadPrimeResurgence(false);
    } else if (panel === 'cycles') {
      contentEl.classList.add('hidden');
      marketPanel.classList.add('hidden');
      if (primePanel) primePanel.classList.add('hidden');
      if (cyclesPanel) cyclesPanel.classList.remove('hidden');
      settingsPage.classList.add('hidden');
      $$('.nav-item[data-category]').forEach(function(b) { b.classList.remove('active'); });
      if (navMarket) navMarket.classList.remove('active');
      if (navPrime) navPrime.classList.remove('active');
      if (navCycles) navCycles.classList.add('active');
      stopPrimeCountdown();
      loadCycles();
    } else if (panel === 'settings') {
      contentEl.classList.add('hidden');
      marketPanel.classList.add('hidden');
      if (primePanel) primePanel.classList.add('hidden');
      if (cyclesPanel) cyclesPanel.classList.add('hidden');
      settingsPage.classList.remove('hidden');
      if (navMarket) navMarket.classList.remove('active');
      if (navPrime) navPrime.classList.remove('active');
      if (navCycles) navCycles.classList.remove('active');
      stopPrimeCountdown();
      stopCycleCountdown();
    } else {
      contentEl.classList.remove('hidden');
      marketPanel.classList.add('hidden');
      if (primePanel) primePanel.classList.add('hidden');
      if (cyclesPanel) cyclesPanel.classList.add('hidden');
      settingsPage.classList.add('hidden');
      if (navMarket) navMarket.classList.remove('active');
      if (navPrime) navPrime.classList.remove('active');
      if (navCycles) navCycles.classList.remove('active');
      stopPrimeCountdown();
      stopCycleCountdown();
    }
  }

  async function animateOut(el) {
    if (!el || typeof el.animate !== 'function') return;
    try {
      await el.animate([
        { opacity: 1, transform: 'translateY(0px)' },
        { opacity: 0, transform: 'translateY(8px)' }
      ], { duration: 140, easing: 'ease' }).finished;
    } catch (e) { /* ignore */ }
  }

  function animateIn(el) {
    if (!el || typeof el.animate !== 'function') return;
    try {
      el.animate([
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0px)' }
      ], { duration: 180, easing: 'ease-out' });
    } catch (e) { /* ignore */ }
  }

  async function showPanel(panel, smooth) {
    var refs = getPanelRefs();
    var currentName = getCurrentPanelName();
    var currentEl = refs[currentName];

    if (panelSwitchInProgress || !smooth || currentName === panel) {
      applyPanelVisibility(panel, refs);
      return;
    }

    panelSwitchInProgress = true;
    await animateOut(currentEl);
    applyPanelVisibility(panel, refs);
    animateIn(refs[panel]);
    panelSwitchInProgress = false;
  }

  // Market nav button
  $('#nav-market').addEventListener('click', function() {
    showPanel('market');
  });

  var navPrimeResurgence = $('#nav-prime-resurgence');
  if (navPrimeResurgence) {
    navPrimeResurgence.addEventListener('click', function() {
      showPanel('prime', true);
    });
  }

  var navCycles = $('#nav-cycles');
  if (navCycles) {
    navCycles.addEventListener('click', function() {
      showPanel('cycles', true);
    });
  }

  document.querySelectorAll('.cycles-nav-btn[data-cycle-tab]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      setActiveCycleTab(btn.getAttribute('data-cycle-tab'));
    });
  });

  if (els.settingsOpenBtn) {
    els.settingsOpenBtn.addEventListener('click', function() {
      showPanel('settings', true);
    });
  }

  if (els.settingsBackBtn) {
    els.settingsBackBtn.addEventListener('click', function() {
      showPanel('checklist', true);
    });
  }

  if (els.primeRefreshBtn) {
    els.primeRefreshBtn.addEventListener('click', function() {
      loadPrimeResurgence(true);
    });
  }

  if (els.cyclesRefreshBtn) {
    els.cyclesRefreshBtn.addEventListener('click', function() {
      loadCycles();
    });
  }

  // Override category nav clicks to ensure we return to checklist
  $$('.nav-item[data-category]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      showPanel('checklist');
    });
  });

  // ---------- Init ----------
  initNativeUpdaterBridge();
  initAppVersion();
  initAlwaysOnTopSetting();
  initAutoUpdateSetting();
  initSidebarToggle();
  initRemovedProfileStorageMigration();
  loadItems();

})();
