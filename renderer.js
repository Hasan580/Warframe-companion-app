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
  const ITEM_LEVELS_STORAGE_KEY = 'warframe_item_levels_v1';
  const REMOVED_PROFILE_NAME_KEY = 'warframe_profile_name_v1';
  const REMOVED_AUTO_PROFILE_SYNC_KEY = 'warframe_auto_profile_sync_v1';
  const PROFILE_FETCH_LAST_RESULT_KEY = 'warframe_profile_fetch_last_result_v1';
  const ITEMS_CACHE_KEY = 'warframe_items_cache_v22';
  const MARKET_TRADABLE_CACHE_KEY = 'warframe_market_tradable_names_v2';
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  const MARKET_TRADABLE_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
  const ITEMS_BACKGROUND_REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
  const ITEMS_BACKGROUND_REFRESH_MIN_GAP_MS = 5 * 60 * 1000; // 5 minutes
  const PROFILE_PROCESS_WATCH_INTERVAL_MS = 3000;
  const PROFILE_PROCESS_WATCH_TIMEOUT_MS = 90000;
  const PROFILE_AUTO_SYNC_INTERVAL_MS = 45000;
  const PROFILE_AUTO_SYNC_MIN_GAP_MS = 4 * 60 * 1000;
  const ALWAYS_ON_TOP_KEY = 'warframe_always_on_top_enabled';
  const AUTO_UPDATE_CHECK_KEY = 'warframe_auto_update_check_enabled';
  const APP_THEME_KEY = 'warframe_app_theme_v1';
  const SIDEBAR_COLLAPSED_KEY = 'warframe_sidebar_collapsed_v1';
  const REPO_URL = 'https://github.com/Hasan580/Warframe-companion-app.git';
  const TELEGRAM_CONTACT_URL = 'https://t.me/HassanF0';
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
  const WIKI_BASE_URL = 'https://wiki.warframe.com';
  const WIKI_API_URLS = Object.freeze([
    'https://wiki.warframe.com/api.php',
    'https://wiki.warframe.com/w/api.php',
    'https://warframe.fandom.com/api.php'
  ]);
  const WIKI_FETCH_TIMEOUT_MS = 12000;
  const RELIC_LOOKUP_CACHE_KEY = 'warframe_relic_projection_lookup_v1';
  const RELIC_DIRECTORY_CACHE_KEY = 'warframe_relic_directory_v2';
  const ARCANE_DIRECTORY_CACHE_KEY = 'warframe_arcane_directory_v2';
  const NEWS_CACHE_KEY = 'warframe_news_cache_v1';
  const NIGHTWAVE_ARTICLE_REFRESH_TTL = 6 * 60 * 60 * 1000; // 6 hours
  const PRIME_RESURGENCE_CACHE_KEY = 'warframe_prime_resurgence_cache_v2';
  const CETUS_CYCLE_API = 'https://api.warframestat.us/pc/cetusCycle/';
  const VALLIS_CYCLE_API = 'https://api.warframestat.us/pc/vallisCycle/';
  const CAMBION_CYCLE_API = 'https://api.warframestat.us/pc/cambionCycle/';
  const DUVIRI_CYCLE_API = 'https://api.warframestat.us/pc/duviriCycle/';
  const BUILDS_STORAGE_KEY = 'warframe_item_builds_v1';
  const NEWS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  const PRIME_RESURGENCE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  const RELIC_LOOKUP_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  const RELIC_DIRECTORY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  const ARCANE_DIRECTORY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  const RELIC_RENDER_BATCH_SIZE = 120;
  const ARCANE_RENDER_BATCH_SIZE = 72;
  const MOD_RENDER_BATCH_SIZE = 180;
  const ALL_ITEMS_RENDER_BATCH_SIZE = 120;
  const WIKI_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours
  const WIKI_ERROR_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
  const BUILD_SLOT_COUNT = 8;
  const BUILD_RANK_MAX = 16;
  const DEFAULT_APP_THEME = 'origin';
  const APP_THEMES = Object.freeze({
    origin: {
      label: 'Origin'
    },
    warframe: {
      label: 'Warframe'
    },
    lotus: {
      label: 'Lotus'
    },
    orokin: {
      label: 'Orokin'
    },
    stalker: {
      label: 'Stalker'
    }
  });
  const OCR_IGNORED_LINE_KEYS = new Set([
    'all items',
    'mastered',
    'unmastered',
    'mark all complete',
    'unmark all',
    'mastery rank',
    'search items',
    'check for updates',
    'latest warframe news',
    'trade mode disabled',
    'mr calculator',
    'reset all'
  ]);
  const MOTE_PRISM_NAME_KEY = 'mote prism';
  const SIROCCO_NAME_KEY = 'sirocco';
  const FOLLIE_NAME_KEY = 'follie';
  const ENKAUS_RIFLE_NAME_KEY = 'enkaus';
  const FOLLIE_THUMB_IMAGE = 'assets/Follie_Thumb.png';
  const ENKAUS_RIFLE_THUMB_IMAGE = 'enkaus-0ffed0644c.png';
  const MANUAL_CHECKLIST_ITEMS = Object.freeze([
    {
      uniqueName: 'manual://warframe/follie',
      name: 'Follie',
      category: 'Warframes',
      type: 'Warframe',
      masterable: true,
      tradable: false,
      imageName: FOLLIE_THUMB_IMAGE,
      description: 'Ink-redible Warframe released with The Shadowgrapher on March 25, 2026.',
      wikiaUrl: 'https://wiki.warframe.com/w/Follie',
      wikiAvailable: true,
      drops: [],
      components: [],
      buildPrice: 0,
      bpCost: 0,
      marketCost: 0,
      tags: ['warframe', 'shadowgrapher'],
      productCategory: 'Warframes',
      isPrime: false,
      vaulted: false,
      hasVaultedStatus: false,
      masteryReq: 0,
      profileOnly: false
    },
    {
      uniqueName: 'manual://primary/enkaus',
      name: 'Enkaus',
      category: 'Primary',
      type: 'Rifle',
      masterable: true,
      tradable: false,
      imageName: ENKAUS_RIFLE_THUMB_IMAGE,
      description: 'Follie\'s signature rifle released with The Shadowgrapher on March 25, 2026.',
      wikiaUrl: 'https://wiki.warframe.com/w/Enkaus',
      wikiAvailable: true,
      drops: [],
      components: [],
      buildPrice: 0,
      bpCost: 0,
      marketCost: 0,
      tags: ['weapon', 'rifle', 'shadowgrapher'],
      productCategory: 'LongGuns',
      isPrime: false,
      vaulted: false,
      hasVaultedStatus: false,
      masteryReq: 0,
      profileOnly: false
    },
    {
      uniqueName: 'manual://vehicle/plexus',
      name: 'Plexus',
      category: 'Vehicles',
      type: 'Plexus',
      masterable: true,
      tradable: false,
      imageName: '',
      description: 'Railjack modding system shown in Warframe Equipment under Vehicles.',
      wikiaUrl: 'https://wiki.warframe.com/w/Plexus',
      wikiAvailable: true,
      drops: [],
      components: [],
      buildPrice: 0,
      bpCost: 0,
      marketCost: 0,
      tags: ['vehicle', 'railjack'],
      productCategory: 'Vehicles',
      isPrime: false,
      vaulted: false,
      hasVaultedStatus: false,
      masteryReq: 0,
      profileOnly: false
    }
  ]);

  try {
    var bootThemeId = String(localStorage.getItem(APP_THEME_KEY) || '').trim().toLowerCase();
    document.documentElement.setAttribute(
      'data-theme',
      Object.prototype.hasOwnProperty.call(APP_THEMES, bootThemeId) ? bootThemeId : DEFAULT_APP_THEME
    );
  } catch (bootThemeErr) {
    document.documentElement.setAttribute('data-theme', DEFAULT_APP_THEME);
  }

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
  let itemLevelMap = Object.create(null);
  let currentCategory = 'all';
  let currentFilter = 'all';
  let searchQuery = '';
  let tradeModeEnabled = false;
  let currentItemInfo = null;
  let wikiArticleCache = Object.create(null);
  let currentAppVersion = '';
  let latestNewsItems = [];
  let primeResurgenceData = null;
  let recipeIndexByName = null;
  let recipeIndexByUnique = null;
  let recipeIndexPromise = null;
  let relicProjectionLookup = Object.create(null);
  let relicDirectory = [];
  let arcaneDirectory = [];
  let relicLookupPromise = null;
  let relicDirectoryPromise = null;
  let arcaneDirectoryPromise = null;
  let relicSearchQuery = '';
  let arcaneSearchQuery = '';
  let relicVisibleCount = RELIC_RENDER_BATCH_SIZE;
  let arcaneVisibleCount = ARCANE_RENDER_BATCH_SIZE;
  let modVisibleCount = MOD_RENDER_BATCH_SIZE;
  let allVisibleCount = ALL_ITEMS_RENDER_BATCH_SIZE;
  let relicRenderFrame = 0;
  let arcaneRenderFrame = 0;
  let primeRelicRewardsCache = Object.create(null);
  let primeCountdownTimer = null;
  let removeUpdateEventListener = null;
  let updateAvailableForDownload = false;
  let updateMenuAction = 'check';
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
  let nightwaveArticlePayload = null;
  let nightwaveArticlePromise = null;
  let nightwaveArticleFetchedAt = 0;
  let nightwavePanelError = '';
  let sidebarCollapsed = false;
  let masteryExtras = getDefaultMasteryExtras();
  let currentThemeId = DEFAULT_APP_THEME;
  let ocrScanInProgress = false;
  let scanDragDepth = 0;
  let tradabilityEnriched = false;
  let tradabilityPromise = null;
  let itemsRefreshInterval = null;
  let itemsRefreshInProgress = false;
  let lastItemsRefreshAt = 0;
  let itemsAutoRefreshInitialized = false;
  let profileFetchInProgress = false;
  let profileProcessWatchTimer = null;
  let profileProcessWatchStartedAt = 0;
  let profileAutoSyncTimer = null;
  let profileLastAutoSyncAt = 0;
  let profileAutoSyncInitialized = false;
  let simarisFetchInProgress = false;
  let scanBatchContext = {
    index: 0,
    total: 0,
    fileName: ''
  };

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
    scanItemsBtn: $('#btn-scan-items'),
    scanItemsInput: $('#scan-items-input'),
    tradeModeBtn: $('#btn-trade-mode'),
    mainMenuUpdateBtn: $('#btn-main-menu-update'),
    mainMenuUpdateText: $('#main-menu-update-text'),
    mainMenuUpdateDetails: $('#main-menu-update-details'),
    mainMenuUpdateIcon: $('#main-menu-update-icon'),
    settingsOpenBtn: $('#btn-open-settings'),
    settingsPage: $('#settings-page'),
    settingsBackBtn: $('#btn-settings-back'),
    profileFetchBtn: $('#btn-fetch-profile'),
    profileFetchBtnText: $('#profile-fetch-btn-text'),
    profileFetchStatus: $('#profile-fetch-status'),
    profileFetchStatusIcon: $('#profile-fetch-status-icon'),
    profileFetchStatusTitle: $('#profile-fetch-status-title'),
    profileFetchStatusCopy: $('#profile-fetch-status-copy'),
    profileFetchStatusMeta: $('#profile-fetch-status-meta'),
    profileSyncPill: $('#profile-sync-pill'),
    profileSyncText: $('#profile-sync-text'),
    alwaysOnTopToggle: $('#setting-always-on-top'),
    settingsThemeCurrent: $('#settings-theme-current'),
    themeOptions: $$('.settings-theme-option'),
    autoUpdateCheckToggle: $('#setting-auto-update-check'),
    openGithubRepoBtn: $('#btn-open-github-repo'),
    openTelegramContactBtn: $('#btn-open-telegram-contact'),
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
    relicsPanel: $('#relics-panel'),
    relicSearchInput: $('#relic-search-input'),
    relicSearchClear: $('#relic-search-clear'),
    relicsContent: $('#relics-content'),
    relicsCountText: $('#relics-count-text'),
    relicsTotalCount: $('#relics-total-count'),
    relicsResultsCount: $('#relics-results-count'),
    relicsSearchSummary: $('#relics-search-summary'),
    relicsGrid: $('#relics-grid'),
    arcanesPanel: $('#arcanes-panel'),
    arcaneSearchInput: $('#arcane-search-input'),
    arcaneSearchClear: $('#arcane-search-clear'),
    arcanesContent: $('#arcanes-content'),
    arcanesCountText: $('#arcanes-count-text'),
    arcanesSearchSummary: $('#arcanes-search-summary'),
    arcanesGrid: $('#arcanes-grid'),
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
    starchartNightwaveBanner: $('#starchart-nightwave-banner'),
    starchartNightwaveBannerLabel: $('#starchart-nightwave-banner-label'),
    starchartNightwaveBannerSub: $('#starchart-nightwave-banner-sub'),
    starchartNightwavePanel: $('#starchart-nightwave-panel'),
    starchartNightwaveClose: $('#starchart-nightwave-close'),
    starchartNightwaveTitle: $('#starchart-nightwave-title'),
    starchartNightwaveSubtitle: $('#starchart-nightwave-subtitle'),
    starchartNightwaveActsCount: $('#starchart-nightwave-acts-count'),
    starchartNightwaveDailyReset: $('#starchart-nightwave-daily-reset'),
    starchartNightwaveWeeklyReset: $('#starchart-nightwave-weekly-reset'),
    starchartNightwaveSeasonEnd: $('#starchart-nightwave-season-end'),
    starchartNightwaveRewards: $('#starchart-nightwave-rewards'),
    starchartNightwaveActs: $('#starchart-nightwave-acts'),
    updateDownloadBtn: $('#btn-download-update'),
    settingsUpdateDetails: $('#settings-update-details'),
    settingsAppVersion: $('#settings-app-version'),
    itemInfoModal: $('#item-info-modal'),
    itemInfoClose: $('#item-info-close'),
    itemInfoName: $('#item-info-name'),
    itemInfoPrimeStatus: $('#item-info-prime-status'),
    itemInfoImg: $('#item-info-img'),
    itemInfoSummary: $('#item-info-summary'),
    itemInfoDescription: $('#item-info-description'),
    itemInfoMarketBtn: $('#item-info-market-btn'),
    itemInfoPaneResources: $('#item-info-pane-resources'),
    itemInfoTabInfo: $('#item-info-tab-info'),
    itemInfoTabMission: $('#item-info-tab-mission'),
    itemInfoTabResources: $('#item-info-tab-resources'),
    itemInfoTabWiki: $('#item-info-tab-wiki'),
    itemInfoTabBuild: $('#item-info-tab-build'),
    itemInfoPaneInfo: $('#item-info-pane-info'),
    itemInfoPaneMission: $('#item-info-pane-mission'),
    itemInfoPaneWiki: $('#item-info-pane-wiki'),
    itemInfoPaneBuild: $('#item-info-pane-build'),
    itemInfoWikiState: $('#item-info-wiki-state'),
    itemInfoWikiContent: $('#item-info-wiki-content'),
    itemInfoFarmList: $('#item-info-farm-list'),
    itemInfoCraftList: $('#item-info-craft-list'),
    scanModal: $('#scan-modal'),
    scanModalClose: $('#scan-modal-close'),
    scanModalDone: $('#scan-modal-done'),
    scanModalPickAnother: $('#scan-modal-pick-another'),
    scanDropzone: $('#scan-dropzone'),
    scanModalBrowse: $('#scan-modal-browse'),
    scanDropzoneMeta: $('#scan-dropzone-meta'),
    scanPreviewShell: $('#scan-preview-shell'),
    scanPreviewImg: $('#scan-preview-img'),
    scanStatusCard: $('#scan-status-card'),
    scanStatusIcon: $('#scan-status-icon'),
    scanStatusTitle: $('#scan-status-title'),
    scanStatusCopy: $('#scan-status-copy'),
    scanProgressFill: $('#scan-progress-fill'),
    scanProgressText: $('#scan-progress-text'),
    scanResults: $('#scan-results'),
    scanMatchedCount: $('#scan-matched-count'),
    scanNewCount: $('#scan-new-count'),
    scanAlreadyCount: $('#scan-already-count'),
    scanPossibleCount: $('#scan-possible-count'),
    scanMatchedList: $('#scan-matched-list'),
    scanPossibleSection: $('#scan-possible-section'),
    scanPossibleList: $('#scan-possible-list'),
    scanResultsNote: $('#scan-results-note'),
    itemBuildSlots: $('#item-build-slots'),
    itemBuildFormaCount: $('#item-build-forma-count'),
    itemBuildCopyLink: $('#item-build-copy-link'),
    itemBuildCopyChat: $('#item-build-copy-chat'),
    itemBuildShareStatus: $('#item-build-share-status'),
    itemBuildSelectedSlot: $('#item-build-selected-slot'),
    itemBuildFamilyTabs: $('#item-build-family-tabs'),
    itemBuildModSearch: $('#item-build-mod-search'),
    itemBuildModList: $('#item-build-mod-list'),
    cephalonSimarisBtn: $('#btn-cephalon-simaris'),
    simarisModal: $('#simaris-modal'),
    simarisModalClose: $('#simaris-modal-close'),
    simarisSearchForm: $('#simaris-search-form'),
    simarisQueryInput: $('#simaris-query-input'),
    simarisSearchBtn: $('#simaris-search-btn'),
    simarisStatus: $('#simaris-status'),
    simarisStatusIcon: $('#simaris-status-icon'),
    simarisStatusText: $('#simaris-status-text'),
    simarisResult: $('#simaris-result'),
    simarisResultImg: $('#simaris-result-img'),
    simarisResultTitle: $('#simaris-result-title'),
    simarisResultLink: $('#simaris-result-link'),
    simarisResultContent: $('#simaris-result-content'),
  };

  // ---------- Window Controls ----------
  function bindWindowControl(buttonSelector, actionName) {
    var button = $(buttonSelector);
    if (!button) return;
    button.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      if (!window.electronAPI || typeof window.electronAPI[actionName] !== 'function') {
        console.warn('Window control bridge is unavailable:', actionName);
        return;
      }
      window.electronAPI[actionName]();
    });
  }

  bindWindowControl('#btn-minimize', 'minimize');
  bindWindowControl('#btn-maximize', 'maximize');
  bindWindowControl('#btn-close', 'close');

  // ---------- Helpers ----------
  var NECRAMECH_NAMES = {
    'bonewidow': true,
    'voidrig': true,
  };

  var FORCED_SENTINEL_NAMES = {};

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

  function cleanDisplayText(value) {
    return String(value == null ? '' : value)
      .replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢|Ã¢â‚¬Â¢/g, ' - ')
      .replace(/Ã¢â‚¬â€|Ã¢â‚¬â€�|Ã¢Ë†â€™/g, '-')
      .replace(/Ã¢â‚¬Å“|Ã¢â‚¬Â/g, '"')
      .replace(/Ã¢â‚¬Ëœ|Ã¢â‚¬â„¢|ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢/g, "'")
      .replace(/Ã¢â€žÂ¢/g, 'TM')
      .replace(/Ã‚Â®/g, '(R)')
      .replace(/Ã¢â€“Â²/g, '^')
      .replace(/Â/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function joinDisplayParts(parts) {
    return (Array.isArray(parts) ? parts : [])
      .map(cleanDisplayText)
      .filter(Boolean)
      .join(' - ');
  }

  function getWikiPageTitle(item) {
    var direct = String(item && (item.wikiaUrl || item.wikiUrl) ? (item.wikiaUrl || item.wikiUrl) : '').trim();
    if (direct) {
      try {
        var parsed = new URL(direct);
        var markers = ['/wiki/', '/w/'];
        for (var m = 0; m < markers.length; m++) {
          var marker = markers[m];
          var index = parsed.pathname.indexOf(marker);
          if (index === -1) continue;
          var slug = parsed.pathname.slice(index + marker.length).replace(/^\/+/, '').split('/')[0];
          slug = decodeURIComponent(slug || '').replace(/_/g, ' ').trim();
          if (slug) return slug;
        }
      } catch (err) {
        // Ignore malformed URLs and fall back to the item name.
      }
    }

    return String(item && item.name ? item.name : '').trim();
  }

  function buildWikiUrl(item) {
    var title = getWikiPageTitle(item);
    if (!title) return '';
    return WIKI_BASE_URL + '/w/' + encodeURIComponent(title.replace(/\s+/g, '_'));
  }

  function buildWikiApiUrl(item, apiBaseUrl) {
    var title = getWikiPageTitle(item);
    if (!title) return '';

    var apiUrl = new URL(apiBaseUrl || WIKI_API_URLS[0]);
    apiUrl.searchParams.set('origin', '*');
    apiUrl.searchParams.set('action', 'parse');
    apiUrl.searchParams.set('page', title.replace(/\s+/g, '_'));
    apiUrl.searchParams.set('prop', 'text');
    apiUrl.searchParams.set('formatversion', '2');
    apiUrl.searchParams.set('format', 'json');
    apiUrl.searchParams.set('redirects', 'true');
    apiUrl.searchParams.set('disableeditsection', 'true');
    apiUrl.searchParams.set('disabletoc', 'true');
    return apiUrl.toString();
  }

  async function fetchJsonWithTimeout(url, timeoutMs) {
    var controller = new AbortController();
    var timeout = window.setTimeout(function() {
      controller.abort();
    }, timeoutMs || WIKI_FETCH_TIMEOUT_MS);

    try {
      var response = await fetch(url, {
        cache: 'no-store',
        signal: controller.signal
      });
      var text = await response.text();
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return JSON.parse(text);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function isArchgunItem(item) {
    var type = String(item.type || '').toLowerCase();
    var category = String(item.category || '').toLowerCase();
    var productCategory = String(item.productCategory || '').toLowerCase();

    return type.indexOf('arch-gun') !== -1 ||
      type.indexOf('archgun') !== -1 ||
      category === 'arch-gun' ||
      category === 'archgun' ||
      productCategory === 'spaceguns';
  }

  function isArchmeleeItem(item) {
    var type = String(item.type || '').toLowerCase();
    var category = String(item.category || '').toLowerCase();
    var productCategory = String(item.productCategory || '').toLowerCase();

    return type.indexOf('arch-melee') !== -1 ||
      type.indexOf('archmelee') !== -1 ||
      category === 'arch-melee' ||
      category === 'archmelee' ||
      productCategory === 'spacemelee';
  }

  function isRoboticItem(item) {
    var type = String(item && item.type ? item.type : '').toLowerCase();
    var category = String(item && item.category ? item.category : '').toLowerCase();
    var productCategory = String(item && item.productCategory ? item.productCategory : '').toLowerCase();
    var uniqueName = String(item && (item.uniqueName || item.unique_name) ? (item.uniqueName || item.unique_name) : '').toLowerCase();
    var name = toLookupKey(item && item.name);

    if (isSentinelWeaponItem(item)) return true;
    if (type === 'sentinel' || category === 'sentinels' || productCategory === 'sentinels') return true;
    if (uniqueName.indexOf('/sentinelpowersuits/') !== -1) return true;
    if (uniqueName.indexOf('/moapets/') !== -1) return true;
    if (uniqueName.indexOf('/zanukapets/') !== -1) return true;
    if (name.indexOf('hound') !== -1 || name.indexOf('moa') !== -1) return true;
    return false;
  }

  function isVehicleItem(item) {
    var type = String(item.type || '').toLowerCase();
    var category = String(item.category || '').toLowerCase();
    var name = toLookupKey(item.name);
    var productCategory = String(item.productCategory || '').toLowerCase();
    var uniqueName = String(item.uniqueName || item.unique_name || '').toLowerCase();

    if (isArchgunItem(item) || isArchmeleeItem(item)) return false;
    if (type.indexOf('archwing') !== -1) return true;
    if (category === 'archwing' || productCategory === 'spacesuits') return true;
    if (type.indexOf('k-drive') !== -1 || type.indexOf('kdrive') !== -1) return true;
    if (category === 'k-drives' || uniqueName.indexOf('/hoverboard/') !== -1) return true;
    if (productCategory === 'mechsuits') return true;
    if (uniqueName.indexOf('/entrati') !== -1 && uniqueName.indexOf('mech') !== -1) return true;
    if (NECRAMECH_NAMES[name]) return true;
    if (name.indexOf('necramech') !== -1) return true;
    if (name === 'plexus') return true;
    return false;
  }

  function isModItem(item) {
    var type = String(item.type || '').toLowerCase();
    var category = String(item.category || '').toLowerCase();
    return category === 'mods' || type.indexOf(' mod') !== -1 || type === 'mod';
  }

  function isSentinelWeaponItem(item) {
    var type = String(item && item.type ? item.type : '').toLowerCase();
    var productCategory = String(item && item.productCategory ? item.productCategory : '').toLowerCase();
    var uniqueName = String(item && (item.uniqueName || item.unique_name) ? (item.uniqueName || item.unique_name) : '').toLowerCase();

    if (type === 'companion weapon' || type === 'sentinel weapon') return true;
    if (productCategory === 'sentinelweapons') return true;
    if (uniqueName.indexOf('/sentinelweapons/') !== -1) return true;
    return false;
  }

  function isKitgunChamberItem(item) {
    var name = toLookupKey(item && item.name);
    var productCategory = String(item && item.productCategory ? item.productCategory : '').toLowerCase();
    var uniqueName = String(item && (item.uniqueName || item.unique_name) ? (item.uniqueName || item.unique_name) : '').toLowerCase();

    return productCategory === 'pistols' && (
      name === 'catchmoon' ||
      name === 'gaze' ||
      name === 'rattleguts' ||
      name === 'tombfinger' ||
      name === 'sporelacer' ||
      name === 'vermisplicer' ||
      uniqueName.indexOf('/sumodularsecondaryset1/barrel/') !== -1 ||
      uniqueName.indexOf('/infkitgun/barrels/') !== -1
    );
  }

  function isVenariProfileItem(item) {
    var uniqueName = String(item && (item.uniqueName || item.unique_name) ? (item.uniqueName || item.unique_name) : '').toLowerCase();
    return uniqueName.indexOf('/powersuits/khora/kavat/') !== -1;
  }

  function isProfileMasterableException(item) {
    return isKitgunChamberItem(item) || isVenariProfileItem(item);
  }

  function isMasterableAmpItem(item) {
    var type = String(item && item.type ? item.type : '').toLowerCase();
    var name = String(item && item.name ? item.name : '').toLowerCase();
    var productCategory = String(item && item.productCategory ? item.productCategory : '').toLowerCase();
    var uniqueName = String(item && (item.uniqueName || item.unique_name) ? (item.uniqueName || item.unique_name) : '').toLowerCase();
    return productCategory === 'operatoramps' ||
      uniqueName.indexOf('/weapons/operator/pistols/drifterpistol/') !== -1 ||
      (type === 'amp' && (name.indexOf('prism') !== -1 || uniqueName.indexOf('/barrel') !== -1));
  }

  function normalizeCategory(cat, item) {
    var itemName = String((item && item.name) || '').toLowerCase();
    if (item && isModItem(item)) return 'Mods';
    if (item && isMasterableAmpItem(item)) return 'Amps';
    if (item && isArchgunItem(item)) return 'Archgun';
    if (item && isArchmeleeItem(item)) return 'Archmelee';
    if (item && isRoboticItem(item)) return 'Robotic';
    if (FORCED_SENTINEL_NAMES[itemName]) return 'Robotic';
    if (item && isVehicleItem(item)) return 'Vehicles';
    if (item && isKitgunChamberItem(item)) return 'Secondary';
    if (item && isVenariProfileItem(item)) return 'Companions';

    const map = {
      'Warframes': 'Warframes',
      'Primary': 'Primary',
      'Secondary': 'Secondary',
      'Melee': 'Melee',
      'Pets': 'Companions',
      'Sentinels': 'Robotic',
      'Archwing': 'Vehicles',
      'Arch-Gun': 'Archgun',
      'Arch-Melee': 'Archmelee',
    };
    return map[cat] || cat;
  }

  function parseBooleanFlag(value) {
    if (value === true || value === false) return value;
    var normalized = String(value || '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }

  function normalizeMaxLevelCap(item) {
    var source = item || {};
    var candidates = [
      source.maxLevelCap,
      source.maxLevel,
      source.maxRank,
      source.levelCap,
      source.rankCap
    ];

    for (var i = 0; i < candidates.length; i++) {
      var value = Number(candidates[i]);
      if (Number.isFinite(value) && value > 0) {
        return Math.floor(value);
      }
    }

    return 0;
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
    var name = cleanDisplayText(item.name || item.itemName || toTitleCaseFromSlug(fallbackName));
    var category = normalizeCategory(item.category || item.type || 'Misc', item);
    var hasVaultedStatus = Object.prototype.hasOwnProperty.call(item || {}, 'hasVaultedStatus')
      ? parseBooleanFlag(item.hasVaultedStatus)
      : (Object.prototype.hasOwnProperty.call(item || {}, 'vaulted') || Object.prototype.hasOwnProperty.call(item || {}, 'isVaulted'));
    var vaultedValue = Object.prototype.hasOwnProperty.call(item || {}, 'vaulted')
      ? item.vaulted
      : item.isVaulted;

    return {
      uniqueName: uniqueName,
      name: name,
      category: cleanDisplayText(category),
      type: cleanDisplayText(item.type || item.category || category),
      masterable: item.masterable === true || isMasterableAmpItem(item) || isProfileMasterableException(item),
      tradable: parseBooleanFlag(item.tradable) || parseBooleanFlag(item.tradeable),
      imageName: imageName,
      description: cleanDisplayText(item.description || ''),
      wikiaUrl: item.wikiaUrl || item.wikiUrl || '',
      wikiAvailable: item.wikiAvailable !== false,
      drops: Array.isArray(item.drops) ? item.drops : [],
      components: Array.isArray(item.components) ? item.components : [],
      buildPrice: typeof item.buildPrice === 'number' ? item.buildPrice : 0,
      bpCost: typeof item.bpCost === 'number' ? item.bpCost : 0,
      marketCost: typeof item.marketCost === 'number' ? item.marketCost : 0,
      tags: Array.isArray(item.tags) ? item.tags : [],
      productCategory: cleanDisplayText(item.productCategory || ''),
      isPrime: !!item.isPrime,
      vaulted: hasVaultedStatus ? parseBooleanFlag(vaultedValue) : false,
      hasVaultedStatus: hasVaultedStatus,
      masteryReq: item.masteryReq || 0,
      profileOnly: parseBooleanFlag(item.profileOnly),
      syncOptional: parseBooleanFlag(item.syncOptional),
      maxLevelCap: normalizeMaxLevelCap(item),
      levelStats: Array.isArray(item.levelStats) ? item.levelStats : [],
      rarity: cleanDisplayText(item.rarity || ''),
      polarity: cleanDisplayText(item.polarity || ''),
      baseDrain: typeof item.baseDrain === 'number' ? item.baseDrain : 0,
      fusionLimit: typeof item.fusionLimit === 'number' ? item.fusionLimit : 0,
      compatName: cleanDisplayText(item.compatName || ''),
      wikiaThumbnail: String(item.wikiaThumbnail || ''),
    };
  }

  function toLookupKey(name) {
    return cleanDisplayText(name)
      .toLowerCase()
      .replace(/[Ã¢â‚¬â„¢'`]/g, '')
      .replace(/[^a-z0-9+]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function cloneNormalizedChecklistItem(item) {
    var source = item || {};
    return {
      uniqueName: String(source.uniqueName || ''),
      name: cleanDisplayText(source.name || ''),
      category: cleanDisplayText(source.category || 'Misc'),
      type: cleanDisplayText(source.type || source.category || 'Misc'),
      masterable: source.masterable === true,
      tradable: !!source.tradable,
      imageName: String(source.imageName || ''),
      description: cleanDisplayText(source.description || ''),
      wikiaUrl: String(source.wikiaUrl || source.wikiUrl || ''),
      wikiAvailable: source.wikiAvailable !== false,
      drops: Array.isArray(source.drops) ? source.drops.slice() : [],
      components: Array.isArray(source.components) ? source.components.slice() : [],
      buildPrice: typeof source.buildPrice === 'number' ? source.buildPrice : 0,
      bpCost: typeof source.bpCost === 'number' ? source.bpCost : 0,
      marketCost: typeof source.marketCost === 'number' ? source.marketCost : 0,
      tags: Array.isArray(source.tags) ? source.tags.slice() : [],
      productCategory: cleanDisplayText(source.productCategory || ''),
      isPrime: !!source.isPrime,
      vaulted: !!source.vaulted,
      hasVaultedStatus: !!source.hasVaultedStatus,
      masteryReq: source.masteryReq || 0,
      profileOnly: source.profileOnly === true,
      syncOptional: source.syncOptional === true,
      maxLevelCap: normalizeMaxLevelCap(source),
      levelStats: Array.isArray(source.levelStats) ? source.levelStats.slice() : [],
      rarity: cleanDisplayText(source.rarity || ''),
      polarity: cleanDisplayText(source.polarity || ''),
      baseDrain: typeof source.baseDrain === 'number' ? source.baseDrain : 0,
      fusionLimit: typeof source.fusionLimit === 'number' ? source.fusionLimit : 0,
      compatName: cleanDisplayText(source.compatName || ''),
      wikiaThumbnail: String(source.wikiaThumbnail || ''),
    };
  }

  function getMarketAssetUrl(path) {
    if (!path) return '';
    var normalized = String(path).trim();
    if (!normalized) return '';
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return 'https://warframe.market/static/assets/' + normalized.replace(/^\/+/, '');
  }

  function normalizeMarketChecklistName(name) {
    var value = String(name || '').trim();
    if (!value) return '';
    return value.replace(/\s+set$/i, '').trim();
  }

  function normalizeMarketChecklistCategory(tags) {
    var normalizedTags = Array.isArray(tags)
      ? tags.map(function(tag) { return String(tag || '').trim().toLowerCase(); }).filter(Boolean)
      : [];

    if (normalizedTags.indexOf('warframe') !== -1) {
      return { category: 'Warframes', type: 'Warframe' };
    }
    if (normalizedTags.indexOf('sentinel') !== -1) {
      return { category: 'Robotic', type: 'Sentinel' };
    }
    if (normalizedTags.indexOf('companion') !== -1 || normalizedTags.indexOf('pet') !== -1) {
      return { category: 'Companions', type: 'Companion' };
    }
    if (normalizedTags.indexOf('primary') !== -1) {
      return { category: 'Primary', type: 'Primary' };
    }
    if (normalizedTags.indexOf('secondary') !== -1) {
      return { category: 'Secondary', type: 'Secondary' };
    }
    if (normalizedTags.indexOf('melee') !== -1) {
      return { category: 'Melee', type: 'Melee' };
    }
    if (normalizedTags.indexOf('arch-gun') !== -1 || normalizedTags.indexOf('archgun') !== -1) {
      return { category: 'Archgun', type: 'Archgun' };
    }
    if (normalizedTags.indexOf('arch-melee') !== -1 || normalizedTags.indexOf('archmelee') !== -1) {
      return { category: 'Archmelee', type: 'Archmelee' };
    }
    if (
      normalizedTags.indexOf('archwing') !== -1 ||
      normalizedTags.indexOf('k-drive') !== -1 ||
      normalizedTags.indexOf('kdrive') !== -1 ||
      normalizedTags.indexOf('vehicle') !== -1 ||
      normalizedTags.indexOf('necramech') !== -1
    ) {
      return { category: 'Vehicles', type: 'Vehicle' };
    }

    return null;
  }

  function isMarketMasteryChecklistEntry(entry, categoryMeta) {
    if (!categoryMeta) return false;

    var gameRef = String(entry && (entry.gameRef || entry.game_ref) ? (entry.gameRef || entry.game_ref) : '')
      .trim()
      .toLowerCase();
    if (!gameRef) return false;

    if (categoryMeta.category === 'Warframes') {
      return gameRef.indexOf('/powersuits/') !== -1;
    }
    if (categoryMeta.category === 'Primary' || categoryMeta.category === 'Secondary' || categoryMeta.category === 'Melee') {
      return gameRef.indexOf('/weapons/') !== -1;
    }
    if (categoryMeta.category === 'Vehicles' || categoryMeta.category === 'Archgun' || categoryMeta.category === 'Archmelee') {
      return gameRef.indexOf('/weapons/') !== -1 || gameRef.indexOf('/vehicles/') !== -1;
    }
    if (categoryMeta.category === 'Robotic') {
      return gameRef.indexOf('/sentinels/') !== -1 || gameRef.indexOf('/companions/sentinels/') !== -1;
    }
    if (categoryMeta.category === 'Companions') {
      return gameRef.indexOf('/companions/') !== -1 || gameRef.indexOf('/pets/') !== -1;
    }

    return false;
  }

  function normalizeMarketChecklistItem(entry) {
    var source = entry || {};
    var tags = Array.isArray(source.tags) ? source.tags.slice() : [];
    var categoryMeta = normalizeMarketChecklistCategory(tags);
    var localized = source.i18n && source.i18n.en ? source.i18n.en : {};
    var rawName = localized.name || source.item_name || source.name || '';
    var name = normalizeMarketChecklistName(rawName);
    if (!categoryMeta || !name || !isMarketMasteryChecklistEntry(source, categoryMeta)) return null;

    return cloneNormalizedChecklistItem({
      uniqueName: String(source.gameRef || source.game_ref || ('market://' + String(source.slug || name).trim().toLowerCase())),
      name: name,
      category: categoryMeta.category,
      type: categoryMeta.type,
      masterable: true,
      tradable: true,
      imageName: getMarketAssetUrl(localized.thumb || localized.icon || ''),
      description: '',
      wikiaUrl: buildWikiUrl({ name: name }),
      wikiAvailable: true,
      drops: [],
      components: [],
      buildPrice: 0,
      bpCost: 0,
      marketCost: 0,
      tags: tags,
      productCategory: categoryMeta.category,
      isPrime: tags.some(function(tag) { return String(tag || '').trim().toLowerCase() === 'prime'; }) || /\bprime\b/i.test(name),
      vaulted: false,
      hasVaultedStatus: false,
      masteryReq: 0,
      profileOnly: false
    });
  }

  function mergeChecklistItems(primaryItems, supplementalItems) {
    var merged = [];
    var seenUniqueNames = Object.create(null);
    var seenNames = Object.create(null);

    function addItem(item) {
      var normalizedItem = cloneNormalizedChecklistItem(item);
      var uniqueKey = String(normalizedItem.uniqueName || '').trim();
      var nameKey = toLookupKey(normalizedItem.name);
      if (!uniqueKey || !nameKey) return;
      if (seenUniqueNames[uniqueKey] || seenNames[nameKey]) return;
      seenUniqueNames[uniqueKey] = true;
      seenNames[nameKey] = true;
      merged.push(normalizedItem);
    }

    if (Array.isArray(primaryItems)) {
      primaryItems.forEach(addItem);
    }
    if (Array.isArray(supplementalItems)) {
      supplementalItems.forEach(addItem);
    }

    return merged;
  }

  function applyChecklistItemPatches(items) {
    var patchedItems = Array.isArray(items) ? items.map(cloneNormalizedChecklistItem) : [];
    var seenNames = Object.create(null);

    for (var i = 0; i < patchedItems.length; i++) {
      var item = patchedItems[i];
      var key = toLookupKey(item.name);
      if (!key) continue;

      if (key === MOTE_PRISM_NAME_KEY) {
        item.name = 'Mote Amp';
        item.category = 'Amps';
        item.type = 'Amp';
        if (!String(item.description || '').trim()) {
          item.description = 'Starter Amp awarded during early Operator progression.';
        }
        if (!String(item.wikiaUrl || '').trim()) {
          item.wikiaUrl = 'https://wiki.warframe.com/w/Mote_Amp';
        }
      } else if (key === SIROCCO_NAME_KEY) {
        item.category = 'Amps';
        item.type = 'Amp';
        if (!String(item.description || '').trim()) {
          item.description = 'Drifter sidearm that also counts toward Amp progression.';
        }
        if (!String(item.wikiaUrl || '').trim()) {
          item.wikiaUrl = 'https://wiki.warframe.com/w/Sirocco';
        }
      } else if (key === FOLLIE_NAME_KEY) {
        item.category = 'Warframes';
        item.type = 'Warframe';
        item.imageName = FOLLIE_THUMB_IMAGE;
        if (!String(item.description || '').trim()) {
          item.description = 'Ink-redible Warframe released with The Shadowgrapher on March 25, 2026.';
        }
        if (!String(item.wikiaUrl || '').trim()) {
          item.wikiaUrl = 'https://wiki.warframe.com/w/Follie';
        }
      } else if (key === ENKAUS_RIFLE_NAME_KEY) {
        item.category = 'Primary';
        item.type = 'Rifle';
        if (!String(item.imageName || '').trim()) {
          item.imageName = ENKAUS_RIFLE_THUMB_IMAGE;
        }
        if (!String(item.description || '').trim()) {
          item.description = 'Follie\'s signature rifle released with The Shadowgrapher on March 25, 2026.';
        }
        if (!String(item.wikiaUrl || '').trim()) {
          item.wikiaUrl = 'https://wiki.warframe.com/w/Enkaus';
        }
      } else if (key === 'plexus') {
        item.category = 'Vehicles';
        item.type = 'Plexus';
        item.masterable = true;
        item.profileOnly = false;
        item.syncOptional = false;
        if (!String(item.description || '').trim()) {
          item.description = 'Railjack modding system shown in Warframe Equipment under Vehicles.';
        }
        if (!String(item.wikiaUrl || '').trim()) {
          item.wikiaUrl = 'https://wiki.warframe.com/w/Plexus';
        }
      }

      seenNames[toLookupKey(item.name)] = true;
    }

    for (var j = 0; j < MANUAL_CHECKLIST_ITEMS.length; j++) {
      var manualItem = cloneNormalizedChecklistItem(MANUAL_CHECKLIST_ITEMS[j]);
      var manualKey = toLookupKey(manualItem.name);
      if (!manualKey || seenNames[manualKey]) continue;
      patchedItems.push(manualItem);
      seenNames[manualKey] = true;
    }

    patchedItems.sort(function(a, b) {
      return String(a && a.name ? a.name : '').localeCompare(String(b && b.name ? b.name : ''));
    });

    return patchedItems;
  }

  function getWikiCacheKey(item) {
    return toLookupKey(getWikiPageTitle(item));
  }

  function getWikiCacheEntry(item) {
    var key = getWikiCacheKey(item);
    if (!key) return null;

    var entry = wikiArticleCache[key];
    if (!entry) return null;
    if (entry.status === 'loading') return entry;

    var ttl = entry.status === 'error' ? WIKI_ERROR_CACHE_TTL : WIKI_CACHE_TTL;
    if (typeof entry.fetchedAt === 'number' && (Date.now() - entry.fetchedAt) > ttl) {
      delete wikiArticleCache[key];
      return null;
    }

    return entry;
  }

  function absolutizeWikiUrl(url) {
    var value = String(url || '').trim();
    if (!value) return '';
    if (/^javascript:/i.test(value)) return '';
    if (/^(https?:|mailto:)/i.test(value)) return value;
    if (value.indexOf('//') === 0) return 'https:' + value;
    if (value.indexOf('/') === 0) return WIKI_BASE_URL + value;
    if (value.indexOf('#') === 0) return '';
    return WIKI_BASE_URL + '/' + value.replace(/^\.?\//, '');
  }

  function getAppTradeStatusMeta(item) {
    var tradable = !!(item && item.tradable);
    return {
      tradable: tradable,
      statusLabel: tradable ? 'Tradable' : 'Untradable',
      summaryLabel: tradable ? 'Tradable in Trade Mode' : 'Untradable in Trade Mode',
      detail: tradable
        ? 'Verified using the same trade reference this app uses for Trade Mode and market matching.'
        : 'Not present in the app trade reference used by Trade Mode and market matching.',
      className: tradable ? 'is-tradable' : 'is-untradable'
    };
  }

  function getPrimeVaultStatusMeta(item) {
    if (!item || !item.isPrime || !item.hasVaultedStatus) {
      return {
        visible: false,
        text: '',
        detail: '',
        className: ''
      };
    }

    var vaulted = !!item.vaulted;
    return {
      visible: true,
      text: vaulted ? 'Vaulted' : 'Not Vaulted',
      detail: vaulted
        ? 'Prime relics for this item are currently vaulted in the API data.'
        : 'Prime relics for this item are currently available in the API data.',
      className: vaulted ? 'is-vaulted' : 'is-unvaulted'
    };
  }

  function updateItemInfoPrimeStatus(item) {
    if (!els.itemInfoPrimeStatus) return;

    var meta = getPrimeVaultStatusMeta(item);
    els.itemInfoPrimeStatus.className = 'item-info-prime-status';
    els.itemInfoPrimeStatus.textContent = '';
    els.itemInfoPrimeStatus.title = '';

    if (!meta.visible) {
      els.itemInfoPrimeStatus.classList.add('hidden');
      return;
    }

    els.itemInfoPrimeStatus.textContent = meta.text;
    els.itemInfoPrimeStatus.title = meta.detail;
    els.itemInfoPrimeStatus.classList.add(meta.className);
    els.itemInfoPrimeStatus.classList.remove('hidden');
  }

  function isWikiTradeLabelText(text) {
    var normalized = String(text || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    return normalized === 'tradable' || normalized === 'tradeable';
  }

  function applyAppTradeStatusToWikiArticle(articleEl, item) {
    if (!articleEl || !item) return;

    var meta = getAppTradeStatusMeta(item);

    var banner = document.createElement('div');
    banner.className = 'item-info-wiki-app-trade ' + meta.className;

    var bannerLabel = document.createElement('div');
    bannerLabel.className = 'item-info-wiki-app-trade-label';
    bannerLabel.textContent = 'App Trade Status';

    var bannerStatus = document.createElement('div');
    bannerStatus.className = 'item-info-wiki-app-trade-status';
    bannerStatus.textContent = meta.summaryLabel;

    var bannerDetail = document.createElement('div');
    bannerDetail.className = 'item-info-wiki-app-trade-detail';
    bannerDetail.textContent = meta.detail;

    banner.appendChild(bannerLabel);
    banner.appendChild(bannerStatus);
    banner.appendChild(bannerDetail);
    articleEl.insertBefore(banner, articleEl.firstChild);

    var infobox = articleEl.querySelector('.portable-infobox');
    if (!infobox) return;

    var tradeRowFound = false;
    var rows = infobox.querySelectorAll('.pi-item, .pi-data, tr');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var labelEl = row.querySelector('.pi-data-label') || row.querySelector('th');
      var labelText = labelEl ? labelEl.textContent : '';
      if (!isWikiTradeLabelText(labelText)) continue;

      tradeRowFound = true;
      row.classList.add('item-info-wiki-app-trade-row');

      var valueEl = row.querySelector('.pi-data-value') || row.querySelector('td');
      if (!valueEl) continue;

      valueEl.textContent = meta.statusLabel;
      valueEl.classList.remove('is-tradable', 'is-untradable');
      valueEl.classList.add('item-info-wiki-app-trade-value', meta.className);
    }

    if (!tradeRowFound) {
      var injectedRow = document.createElement('section');
      injectedRow.className = 'pi-item pi-data item-info-wiki-app-trade-row';

      var injectedLabel = document.createElement('h3');
      injectedLabel.className = 'pi-data-label';
      injectedLabel.textContent = 'Tradable';

      var injectedValue = document.createElement('div');
      injectedValue.className = 'pi-data-value item-info-wiki-app-trade-value ' + meta.className;
      injectedValue.textContent = meta.statusLabel;

      injectedRow.appendChild(injectedLabel);
      injectedRow.appendChild(injectedValue);
      infobox.appendChild(injectedRow);
    }
  }

  function sanitizeWikiArticleHtml(rawHtml) {
    var parser = new DOMParser();
    var parsed = parser.parseFromString(String(rawHtml || ''), 'text/html');
    var root = parsed.querySelector('.mw-parser-output') || parsed.body;
    if (!root) return '';

    root = root.cloneNode(true);

    var removableSelectors = [
      'script',
      'style',
      'link',
      'noscript',
      'iframe',
      'audio',
      'video',
      'form',
      'input',
      'button',
      '.mw-editsection',
      '.reference',
      '.references',
      '.reflist',
      '.toc',
      '.navbox',
      '.catlinks',
      '.license-description',
      '.mobile-hidden',
      '.mw-empty-elt',
      '[role="navigation"]'
    ];

    var junk = root.querySelectorAll(removableSelectors.join(','));
    for (var i = 0; i < junk.length; i++) {
      junk[i].remove();
    }

    var elements = root.querySelectorAll('*');
    for (var j = 0; j < elements.length; j++) {
      var el = elements[j];
      var attrs = Array.from(el.attributes);

      for (var a = 0; a < attrs.length; a++) {
        if (/^on/i.test(attrs[a].name)) {
          el.removeAttribute(attrs[a].name);
        }
      }

      if (el.tagName === 'A') {
        var href = String(el.getAttribute('href') || '').trim();
        var normalizedHref = absolutizeWikiUrl(href);
        if (normalizedHref) {
          el.setAttribute('href', normalizedHref);
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener noreferrer');
        } else {
          el.removeAttribute('href');
        }
      }

      if (el.tagName === 'IMG') {
        var imgSrc = String(el.getAttribute('data-src') || el.getAttribute('src') || '').trim();
        var normalizedSrc = absolutizeWikiUrl(imgSrc);
        if (!normalizedSrc || /^data:image\/gif/i.test(normalizedSrc)) {
          el.remove();
          continue;
        }

        el.setAttribute('src', normalizedSrc);
        el.removeAttribute('srcset');
        el.removeAttribute('data-src');
        el.classList.remove('lazyload');
        el.setAttribute('loading', 'lazy');
        el.removeAttribute('decoding');
      }
    }

    var emptyParagraphs = root.querySelectorAll('p');
    for (var p = 0; p < emptyParagraphs.length; p++) {
      var para = emptyParagraphs[p];
      if (!String(para.textContent || '').trim() && !para.querySelector('img, figure, table, aside, ul, ol')) {
        para.remove();
      }
    }

    return String(root.innerHTML || '').trim();
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

  function buildItemScanLookup() {
    var byLookup = Object.create(null);
    var byCompact = Object.create(null);
    var entries = [];
    var maxTokens = 1;

    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i] || {};
      if (!item.uniqueName || !item.name) continue;

      var lookupKey = toLookupKey(item.name);
      var compactKey = toCompactLookupKey(item.name);
      var tokenCount = lookupKey ? lookupKey.split(' ').filter(Boolean).length : 0;
      if (!lookupKey || !compactKey) continue;

      if (!byLookup[lookupKey]) byLookup[lookupKey] = item;
      if (!byCompact[compactKey]) byCompact[compactKey] = item;

      entries.push({
        item: item,
        lookupKey: lookupKey,
        compactKey: compactKey,
        tokenCount: tokenCount
      });

      if (tokenCount > maxTokens) {
        maxTokens = tokenCount;
      }
    }

    return {
      byLookup: byLookup,
      byCompact: byCompact,
      entries: entries,
      maxTokens: Math.min(Math.max(maxTokens, 1), 6)
    };
  }

  function cleanOcrLineText(value) {
    return String(value || '')
      .replace(/[|]/g, ' ')
      .replace(/[Ã¢â‚¬Å“Ã¢â‚¬Â]/g, '"')
      .replace(/[Ã¢â‚¬ËœÃ¢â‚¬â„¢]/g, "'")
      .replace(/[Ã¢â€žÂ¢Ã‚Â®]/g, ' ')
      .replace(/\b(?:rank|owned|mastered|unmastered|completed|complete|ready|equipped|inventory|item|items|slot|slots|qty|quantity|copy|loadout)\b/gi, ' ')
      .replace(/\b\d+\b/g, ' ')
      .replace(/[_~]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getUniqueOcrLines(scanPayload) {
    var seen = Object.create(null);
    var out = [];
    var lines = Array.isArray(scanPayload && scanPayload.lines) ? scanPayload.lines : [];

    for (var i = 0; i < lines.length; i++) {
      var rawLine = lines[i] || {};
      var lineText = String(rawLine.text || '').trim();
      if (!lineText) continue;
      var cleaned = cleanOcrLineText(lineText);
      var normalized = toLookupKey(cleaned);
      if (!normalized || OCR_IGNORED_LINE_KEYS.has(normalized) || seen[normalized]) continue;
      seen[normalized] = true;
      out.push({
        raw: lineText,
        cleaned: cleaned,
        normalized: normalized,
        confidence: typeof rawLine.confidence === 'number' ? rawLine.confidence : 0
      });
    }

    if (out.length > 0) {
      return out;
    }

    var fallbackLines = String(scanPayload && scanPayload.text ? scanPayload.text : '').split(/\r?\n/);
    for (var j = 0; j < fallbackLines.length; j++) {
      var fallbackText = String(fallbackLines[j] || '').trim();
      if (!fallbackText) continue;
      var fallbackCleaned = cleanOcrLineText(fallbackText);
      var fallbackNormalized = toLookupKey(fallbackCleaned);
      if (!fallbackNormalized || OCR_IGNORED_LINE_KEYS.has(fallbackNormalized) || seen[fallbackNormalized]) continue;
      seen[fallbackNormalized] = true;
      out.push({
        raw: fallbackText,
        cleaned: fallbackCleaned,
        normalized: fallbackNormalized,
        confidence: 0
      });
    }

    return out;
  }

  function isUsefulOcrLine(line) {
    if (!line || !line.normalized) return false;
    var tokens = line.normalized.split(' ').filter(Boolean);
    if (!tokens.length) return false;
    if (tokens.length === 1 && tokens[0].length < 4) return false;
    return true;
  }

  function tokenizeLookupValue(value) {
    return toLookupKey(value).split(' ').filter(Boolean);
  }

  function hasOccupiedTokens(occupied, start, length) {
    for (var i = start; i < start + length; i++) {
      if (occupied[i]) return true;
    }
    return false;
  }

  function fillOccupiedTokens(occupied, start, length) {
    for (var i = start; i < start + length; i++) {
      occupied[i] = true;
    }
  }

  function findExactItemMatchesInLine(line, lookup) {
    if (!line || !line.normalized) return [];
    var tokens = tokenizeLookupValue(line.normalized);
    if (!tokens.length) return [];

    var occupied = new Array(tokens.length);
    var matches = [];

    for (var len = Math.min(lookup.maxTokens, tokens.length); len >= 1; len--) {
      for (var start = 0; start <= tokens.length - len; start++) {
        if (hasOccupiedTokens(occupied, start, len)) continue;

        var phrase = tokens.slice(start, start + len).join(' ');
        var item = lookup.byLookup[phrase] || lookup.byCompact[toCompactLookupKey(phrase)];
        if (!item) continue;

        matches.push({
          item: item,
          source: phrase,
          rawLine: line.raw,
          score: 1,
          matchType: 'exact'
        });
        fillOccupiedTokens(occupied, start, len);
      }
    }

    return matches;
  }

  function levenshteinDistance(a, b) {
    var left = String(a || '');
    var right = String(b || '');
    if (!left) return right.length;
    if (!right) return left.length;

    var previous = [];
    var current = [];

    for (var i = 0; i <= right.length; i++) {
      previous[i] = i;
    }

    for (var row = 1; row <= left.length; row++) {
      current[0] = row;
      for (var col = 1; col <= right.length; col++) {
        var cost = left.charCodeAt(row - 1) === right.charCodeAt(col - 1) ? 0 : 1;
        current[col] = Math.min(
          current[col - 1] + 1,
          previous[col] + 1,
          previous[col - 1] + cost
        );
      }
      previous = current.slice();
    }

    return previous[right.length];
  }

  function getTokenOverlapScore(leftTokens, rightTokens) {
    if (!leftTokens.length || !rightTokens.length) return 0;
    var rightSeen = Object.create(null);
    var shared = 0;

    for (var i = 0; i < rightTokens.length; i++) {
      rightSeen[rightTokens[i]] = (rightSeen[rightTokens[i]] || 0) + 1;
    }

    for (var j = 0; j < leftTokens.length; j++) {
      var token = leftTokens[j];
      if (!rightSeen[token]) continue;
      shared++;
      rightSeen[token]--;
    }

    return shared / Math.max(leftTokens.length, rightTokens.length);
  }

  function getOcrSimilarityScore(candidateKey, entry) {
    var compactCandidate = toCompactLookupKey(candidateKey);
    var compactTarget = entry && entry.compactKey ? entry.compactKey : '';
    if (!compactCandidate || !compactTarget) return 0;

    var editDistance = levenshteinDistance(compactCandidate, compactTarget);
    var maxLength = Math.max(compactCandidate.length, compactTarget.length);
    var editScore = maxLength ? 1 - (editDistance / maxLength) : 0;
    var tokenScore = getTokenOverlapScore(
      candidateKey.split(' ').filter(Boolean),
      entry.lookupKey.split(' ').filter(Boolean)
    );
    var startBonus = compactCandidate.charAt(0) && compactCandidate.charAt(0) === compactTarget.charAt(0) ? 0.03 : 0;

    return (editScore * 0.72) + (tokenScore * 0.28) + startBonus;
  }

  function findFuzzyItemMatchForLine(line, lookup) {
    if (!line || !line.normalized) return null;
    var candidateTokens = line.normalized.split(' ').filter(Boolean);
    var compactCandidate = toCompactLookupKey(line.normalized);
    if (!candidateTokens.length || compactCandidate.length < 5) return null;

    var best = null;
    var second = null;

    for (var i = 0; i < lookup.entries.length; i++) {
      var entry = lookup.entries[i];
      if (Math.abs(entry.tokenCount - candidateTokens.length) > 1) continue;
      if (Math.abs(entry.compactKey.length - compactCandidate.length) > 4) continue;

      var score = getOcrSimilarityScore(line.normalized, entry);
      if (!best || score > best.score) {
        second = best;
        best = {
          item: entry.item,
          score: score
        };
      } else if (!second || score > second.score) {
        second = {
          item: entry.item,
          score: score
        };
      }
    }

    if (!best || best.score < 0.86) return null;

    return {
      item: best.item,
      score: best.score,
      confident: best.score >= 0.94 && (!second || (best.score - second.score) >= 0.05),
      source: line.cleaned || line.raw
    };
  }

  function analyzeRecognizedItems(scanPayload, options) {
    var lookup = buildItemScanLookup();
    var lines = getUniqueOcrLines(scanPayload).filter(isUsefulOcrLine);
    var matchMap = Object.create(null);
    var possibleMatches = [];
    var unmatchedLines = [];
    var sourceLabel = String(options && options.sourceLabel ? options.sourceLabel : '').trim();

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var exactMatches = findExactItemMatchesInLine(line, lookup);

      if (exactMatches.length > 0) {
        for (var j = 0; j < exactMatches.length; j++) {
          var exactMatch = exactMatches[j];
          if (!matchMap[exactMatch.item.uniqueName]) {
            matchMap[exactMatch.item.uniqueName] = exactMatch;
          }
        }
        continue;
      }

      var fuzzyMatch = findFuzzyItemMatchForLine(line, lookup);
      if (fuzzyMatch && fuzzyMatch.confident) {
        if (!matchMap[fuzzyMatch.item.uniqueName]) {
          matchMap[fuzzyMatch.item.uniqueName] = {
            item: fuzzyMatch.item,
            source: fuzzyMatch.source,
            rawLine: line.raw,
            score: fuzzyMatch.score,
            matchType: 'fuzzy'
          };
        }
        continue;
      }

      if (fuzzyMatch) {
        possibleMatches.push({
          source: sourceLabel ? (sourceLabel + ': ' + fuzzyMatch.source) : fuzzyMatch.source,
          itemName: fuzzyMatch.item.name,
          score: fuzzyMatch.score
        });
      } else {
        unmatchedLines.push(line.cleaned || line.raw);
      }
    }

    var matchedItems = Object.keys(matchMap).map(function(key) { return matchMap[key]; });
    matchedItems.sort(function(a, b) {
      return String(a.item && a.item.name ? a.item.name : '').localeCompare(String(b.item && b.item.name ? b.item.name : ''));
    });

    possibleMatches.sort(function(a, b) { return b.score - a.score; });

    return {
      matchedItems: matchedItems,
      possibleMatches: possibleMatches,
      unmatchedCount: unmatchedLines.length,
      scannedLineCount: lines.length
    };
  }

  function applyRecognizedMatches(scanAnalysis, options) {
    var matchedItems = Array.isArray(scanAnalysis && scanAnalysis.matchedItems)
      ? scanAnalysis.matchedItems.slice()
      : [];
    matchedItems.sort(function(a, b) {
      return String(a && a.item && a.item.name ? a.item.name : '').localeCompare(String(b && b.item && b.item.name ? b.item.name : ''));
    });
    var newlyMarked = [];
    var alreadyMarked = [];
    var shouldPersist = !(options && options.persist === false);
    var shouldRefreshUi = !(options && options.refreshUi === false);

    for (var k = 0; k < matchedItems.length; k++) {
      var match = matchedItems[k];
      if (!match.item || !match.item.uniqueName) continue;
      if (isItemFullyRanked(match.item)) {
        alreadyMarked.push(match);
      } else {
        var maxRank = getItemMaxRank(match.item);
        setItemRank(match.item, match.item.category === 'Mods' ? 1 : (maxRank > 0 ? maxRank : 1));
        newlyMarked.push(match);
      }
    }

    if (shouldPersist && newlyMarked.length > 0) {
      saveMasteryProgress();
      if (shouldRefreshUi) {
        updateCounts();
        updateStats();
        applyFilters();
      }
    }

    var possibleMatches = Array.isArray(scanAnalysis && scanAnalysis.possibleMatches)
      ? scanAnalysis.possibleMatches.slice()
      : [];
    possibleMatches.sort(function(a, b) { return b.score - a.score; });
    var possibleMatchTotal = typeof (scanAnalysis && scanAnalysis.possibleMatchTotal) === 'number'
      ? Math.max(0, Math.floor(scanAnalysis.possibleMatchTotal))
      : possibleMatches.length;

    return {
      matchedItems: matchedItems,
      newlyMarked: newlyMarked,
      alreadyMarked: alreadyMarked,
      possibleMatches: possibleMatches.slice(0, 8),
      possibleMatchTotal: possibleMatchTotal,
      unmatchedCount: scanAnalysis && typeof scanAnalysis.unmatchedCount === 'number' ? scanAnalysis.unmatchedCount : 0,
      scannedLineCount: scanAnalysis && typeof scanAnalysis.scannedLineCount === 'number' ? scanAnalysis.scannedLineCount : 0,
      scannedFileCount: scanAnalysis && typeof scanAnalysis.scannedFileCount === 'number' ? scanAnalysis.scannedFileCount : 1,
      successfulFileCount: scanAnalysis && typeof scanAnalysis.successfulFileCount === 'number'
        ? scanAnalysis.successfulFileCount
        : (scanAnalysis && typeof scanAnalysis.scannedFileCount === 'number' ? scanAnalysis.scannedFileCount : 1),
      failedFiles: Array.isArray(scanAnalysis && scanAnalysis.failedFiles) ? scanAnalysis.failedFiles.slice() : []
    };
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
    if (category === 'archgun') return { family: 'archgun', subType: 'archgun' };
    if (category === 'archmelee') return { family: 'archmelee', subType: 'archmelee' };
    if (category === 'vehicles') {
      if (subType === 'archgun') return { family: 'archgun', subType: subType };
      if (subType === 'archmelee') return { family: 'archmelee', subType: subType };
      return { family: 'archwing', subType: subType };
    }
    if (category === 'companions' || category === 'robotic' || category === 'sentinels') return { family: 'companion', subType: 'companion' };
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
      var name = cleanDisplayText(comp.name || '');
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

  async function ensureTradabilityLoaded(items) {
    var targetItems = Array.isArray(items) ? items : allItems;
    if (!Array.isArray(targetItems) || targetItems.length === 0) return false;
    if (tradabilityEnriched) return true;

    if (tradabilityPromise) {
      try {
        await tradabilityPromise;
        return tradabilityEnriched;
      } catch (e) {
        return false;
      }
    }

    tradabilityPromise = (async function() {
      await enrichItemsTradability(targetItems);
      tradabilityEnriched = true;
    })();

    try {
      await tradabilityPromise;
      return tradabilityEnriched;
    } catch (err) {
      console.warn('Failed to enrich tradability:', err);
      return false;
    } finally {
      tradabilityPromise = null;
    }
  }

  function getChecklistImageUrl(imageName) {
    if (!imageName) return '';
    var normalized = String(imageName).trim();
    if (/^(https?:|data:|file:)/i.test(normalized)) return normalized;
    if (/^\/?assets\//i.test(normalized)) {
      var assetPath = normalized.replace(/^\/+/, '');
      if (window.electronAPI && typeof window.electronAPI.resolveAssetUrl === 'function') {
        return window.electronAPI.resolveAssetUrl(assetPath);
      }
      try {
        return new URL(assetPath, window.location.href).toString();
      } catch (e) {
        return encodeURI(assetPath);
      }
    }
    return CDN_URL + encodeURI(normalized.replace(/^\/+/, ''));
  }

  function getItemImageSources(item) {
    if (!item) return { primary: '', fallback: '' };

    var primaryImage = String(item.imageName || '').trim();
    var fallbackImage = String(item.wikiaThumbnail || '').trim();
    var primaryUrl = primaryImage ? getChecklistImageUrl(primaryImage) : '';
    var fallbackUrl = fallbackImage ? getChecklistImageUrl(fallbackImage) : '';

    if (primaryUrl && fallbackUrl && primaryUrl === fallbackUrl) {
      fallbackUrl = '';
    }

    if (!primaryUrl && fallbackUrl) {
      primaryUrl = fallbackUrl;
      fallbackUrl = '';
    }

    return {
      primary: primaryUrl,
      fallback: fallbackUrl
    };
  }

  function getItemImageUrl(item) {
    var sources = getItemImageSources(item);
    return sources.primary || '';
  }

  function bindImageFallback(img, sources, onFinalError) {
    if (!img) return;

    var imageSources = sources || {};
    var primaryUrl = String(imageSources.primary || '').trim();
    var fallbackUrl = String(imageSources.fallback || '').trim();

    if (!primaryUrl) {
      if (typeof onFinalError === 'function') onFinalError();
      return;
    }

    function handleError() {
      if (fallbackUrl && img.src !== fallbackUrl) {
        img.src = fallbackUrl;
        return;
      }

      img.removeEventListener('error', handleError);
      if (typeof onFinalError === 'function') onFinalError();
    }

    img.addEventListener('error', handleError);
    img.src = primaryUrl;
  }

  function hydrateManagedImageFallbacks(container) {
    if (!container || !container.querySelectorAll) return;

    var managedImages = container.querySelectorAll('img[data-primary-src]');
    managedImages.forEach(function(img) {
      if (img.getAttribute('data-fallback-bound') === '1') return;
      img.setAttribute('data-fallback-bound', '1');

      var primaryUrl = String(img.getAttribute('data-primary-src') || img.getAttribute('src') || '').trim();
      var fallbackUrl = String(img.getAttribute('data-fallback-src') || '').trim();
      var finalUrl = String(img.getAttribute('data-final-src') || '').trim();

      img.addEventListener('error', function handleManagedError() {
        if (fallbackUrl && img.src !== fallbackUrl) {
          img.src = fallbackUrl;
          return;
        }

        if (finalUrl && img.src !== finalUrl) {
          img.src = finalUrl;
          return;
        }

        img.removeEventListener('error', handleManagedError);
      });

      if (primaryUrl && img.getAttribute('src') !== primaryUrl) {
        img.setAttribute('src', primaryUrl);
      }
    });
  }

  window.warframeItemImageBridge = {
    getImageSourcesByName: function(rawName) {
      var item = findItemByLooseName(rawName);
      return getItemImageSources(item);
    },
    getImageUrlByName: function(rawName) {
      var item = findItemByLooseName(rawName);
      return getItemImageUrl(item);
    }
  };

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

  function normalizeSearchText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getRelicDisplayName(name) {
    var raw = String(name || '').trim();
    if (!raw) return '';
    return raw.replace(/\s+relic$/i, '').trim() || raw;
  }

  function getRelicTier(name) {
    var displayName = getRelicDisplayName(name);
    var match = displayName.match(/^(Lith|Meso|Neo|Axi|Requiem)\b/i);
    return match ? match[1][0].toUpperCase() + match[1].slice(1).toLowerCase() : 'Relic';
  }

  function getRelicTierSortScore(name) {
    var tier = getRelicTier(name).toLowerCase();
    if (tier === 'lith') return 1;
    if (tier === 'meso') return 2;
    if (tier === 'neo') return 3;
    if (tier === 'axi') return 4;
    if (tier === 'requiem') return 5;
    return 99;
  }

  function extractRelicRewardsFromItem(item) {
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

    return normalized;
  }

  function buildRelicDirectory(rawItems) {
    var out = [];
    if (!Array.isArray(rawItems)) return out;

    for (var i = 0; i < rawItems.length; i++) {
      var item = rawItems[i] || {};
      var itemType = String(item.type || '').toLowerCase();
      var relicName = String(item.name || '').trim();
      if (itemType !== 'relic' || !relicName) continue;

      var rewards = extractRelicRewardsFromItem(item);
      if (!Array.isArray(rewards) || rewards.length === 0) continue;

      var rewardNames = [];
      for (var j = 0; j < rewards.length; j++) {
        rewardNames.push(rewards[j].name);
      }

      var displayName = getRelicDisplayName(relicName) || relicName;
      var rareRewardName = '';
      for (var r = 0; r < rewards.length; r++) {
        if (String(rewards[r].rarity || '').toLowerCase() === 'rare') {
          rareRewardName = rewards[r].name;
          break;
        }
      }

      out.push({
        name: relicName,
        displayName: displayName,
        tier: getRelicTier(relicName),
        rewardCount: rewards.length,
        rewards: rewards,
        rewardNames: rewardNames,
        rareRewardName: rareRewardName,
        relicSearchKey: normalizeSearchText(relicName + ' ' + displayName),
        rewardSearchKey: normalizeSearchText(rewardNames.join(' ')),
        searchKey: normalizeSearchText(relicName + ' ' + displayName + ' ' + rewardNames.join(' '))
      });
    }

    out.sort(function(a, b) {
      var tierDiff = getRelicTierSortScore(a.name) - getRelicTierSortScore(b.name);
      if (tierDiff !== 0) return tierDiff;
      return String(a.displayName || a.name || '').localeCompare(String(b.displayName || b.name || ''));
    });

    return out;
  }

  function cacheRelicRewardsDirectory(entries) {
    if (!Array.isArray(entries)) return;
    for (var i = 0; i < entries.length; i++) {
      var relic = entries[i] || {};
      var relicName = String(relic.name || '').trim();
      if (!relicName) continue;
      primeRelicRewardsCache[relicName] = Array.isArray(relic.rewards) ? relic.rewards : [];
    }
  }

  function saveRelicDirectoryCache(entries) {
    try {
      localStorage.setItem(RELIC_DIRECTORY_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        relics: entries
      }));
    } catch (e) { /* ignore */ }
  }

  function loadRelicDirectoryCache() {
    try {
      var raw = localStorage.getItem(RELIC_DIRECTORY_CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.relics)) return null;
      if (Date.now() - parsed.timestamp > RELIC_DIRECTORY_CACHE_TTL) return null;
      return parsed.relics;
    } catch (e) {
      return null;
    }
  }

  async function ensureRelicDirectoryLoaded(forceRefresh) {
    if (!forceRefresh && Array.isArray(relicDirectory) && relicDirectory.length > 0) return true;

    if (!forceRefresh) {
      var cached = loadRelicDirectoryCache();
      if (cached) {
        relicDirectory = cached;
        cacheRelicRewardsDirectory(relicDirectory);
        return true;
      }
    }

    if (relicDirectoryPromise) {
      try {
        await relicDirectoryPromise;
        return Array.isArray(relicDirectory) && relicDirectory.length > 0;
      } catch (e) {
        return false;
      }
    }

    relicDirectoryPromise = (async function() {
      var resp = await fetch(API_URL);
      if (!resp.ok) throw new Error('Failed to load relic catalog: HTTP ' + resp.status);
      var data = await resp.json();

      relicProjectionLookup = buildRelicProjectionLookup(data);
      saveRelicLookupCache(relicProjectionLookup);

      relicDirectory = buildRelicDirectory(data);
      cacheRelicRewardsDirectory(relicDirectory);
      saveRelicDirectoryCache(relicDirectory);
    })();

    try {
      await relicDirectoryPromise;
      return Array.isArray(relicDirectory) && relicDirectory.length > 0;
    } catch (e) {
      return false;
    } finally {
      relicDirectoryPromise = null;
    }
  }

  function normalizeArcaneStatLines(rawStats) {
    var out = [];
    var seen = Object.create(null);
    var stats = Array.isArray(rawStats) ? rawStats : [];

    for (var i = 0; i < stats.length; i++) {
      var raw = String(stats[i] || '');
      if (!raw) continue;

      var chunks = raw.split(/\r?\n+/);
      for (var j = 0; j < chunks.length; j++) {
        var clean = String(chunks[j] || '').replace(/\s+/g, ' ').trim();
        if (!clean) continue;

        var key = clean.toLowerCase();
        if (seen[key]) continue;
        seen[key] = true;
        out.push(clean);
      }
    }

    return out;
  }

  function buildArcaneDirectory(rawItems) {
    var out = [];
    var seen = Object.create(null);
    if (!Array.isArray(rawItems)) return out;

    for (var i = 0; i < rawItems.length; i++) {
      var item = rawItems[i] || {};
      var category = String(item.category || '').trim().toLowerCase();
      var arcaneName = String(item.name || '').trim();
      var uniqueName = String(item.uniqueName || arcaneName).trim();
      if (category !== 'arcanes' || !arcaneName) continue;
      var arcaneNameKey = normalizeSearchText(arcaneName);
      if (!arcaneNameKey || arcaneNameKey === 'arcane') continue;

      var typeLabel = String(item.type || 'Arcane').trim() || 'Arcane';
      var rarityLabel = String(item.rarity || 'Unknown').trim() || 'Unknown';
      var tradable = parseBooleanFlag(item.tradable) || parseBooleanFlag(item.tradeable);
      var ranks = [];
      var allStatLines = [];
      var rawLevelStats = Array.isArray(item.levelStats) ? item.levelStats : [];

      for (var r = 0; r < rawLevelStats.length; r++) {
        var rankEntry = rawLevelStats[r] || {};
        var lines = normalizeArcaneStatLines(rankEntry.stats);
        if (lines.length === 0) continue;

        for (var s = 0; s < lines.length; s++) {
          allStatLines.push(lines[s]);
        }

        ranks.push({
          rank: r,
          label: 'Rank ' + r,
          lines: lines
        });
      }

      if (ranks.length === 0 || allStatLines.length === 0) continue;
      if (seen[arcaneNameKey]) continue;
      seen[arcaneNameKey] = uniqueName || arcaneNameKey;

      var dropLocations = [];
      var locationSeen = Object.create(null);
      var drops = Array.isArray(item.drops) ? item.drops : [];
      for (var d = 0; d < drops.length; d++) {
        var location = String(drops[d] && drops[d].location || '').replace(/\s+/g, ' ').trim();
        if (!location) continue;
        var locationKey = location.toLowerCase();
        if (locationSeen[locationKey]) continue;
        locationSeen[locationKey] = true;
        dropLocations.push(location);
      }

      var maxRank = Math.max(0, ranks.length - 1);
      var previewLines = (ranks[ranks.length - 1] && Array.isArray(ranks[ranks.length - 1].lines) && ranks[ranks.length - 1].lines.length > 0
        ? ranks[ranks.length - 1].lines
        : allStatLines).slice(0, 2);

      out.push({
        uniqueName: uniqueName,
        name: arcaneName,
        type: typeLabel,
        rarity: rarityLabel,
        tradable: tradable,
        imageName: String(item.imageName || ''),
        ranks: ranks,
        maxRank: maxRank,
        previewLines: previewLines,
        statLines: allStatLines,
        dropCount: dropLocations.length,
        dropLocations: dropLocations.slice(0, 3),
        nameKey: arcaneNameKey,
        typeKey: normalizeSearchText(typeLabel),
        rarityKey: normalizeSearchText(rarityLabel),
        statsSearchKey: normalizeSearchText(allStatLines.join(' ')),
        dropsSearchKey: normalizeSearchText(dropLocations.join(' ')),
        searchKey: normalizeSearchText(
          arcaneName + ' ' + typeLabel + ' ' + rarityLabel + ' ' + allStatLines.join(' ') + ' ' + dropLocations.join(' ')
        )
      });
    }

    out.sort(function(a, b) {
      var typeDiff = String(a.type || '').localeCompare(String(b.type || ''));
      if (typeDiff !== 0) return typeDiff;

      var rarityDiff = raritySortScore(b.rarity) - raritySortScore(a.rarity);
      if (rarityDiff !== 0) return rarityDiff;

      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    return out;
  }

  function saveArcaneDirectoryCache(entries) {
    try {
      localStorage.setItem(ARCANE_DIRECTORY_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        arcanes: entries
      }));
    } catch (e) { /* ignore */ }
  }

  function loadArcaneDirectoryCache() {
    try {
      var raw = localStorage.getItem(ARCANE_DIRECTORY_CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.arcanes)) return null;
      if (Date.now() - parsed.timestamp > ARCANE_DIRECTORY_CACHE_TTL) return null;
      return parsed.arcanes;
    } catch (e) {
      return null;
    }
  }

  async function ensureArcaneDirectoryLoaded(forceRefresh) {
    if (!forceRefresh && Array.isArray(arcaneDirectory) && arcaneDirectory.length > 0) return true;

    if (!forceRefresh) {
      var cached = loadArcaneDirectoryCache();
      if (cached) {
        arcaneDirectory = cached;
        return true;
      }
    }

    if (arcaneDirectoryPromise) {
      try {
        await arcaneDirectoryPromise;
        return Array.isArray(arcaneDirectory) && arcaneDirectory.length > 0;
      } catch (e) {
        return false;
      }
    }

    arcaneDirectoryPromise = (async function() {
      var resp = await fetch(API_URL);
      if (!resp.ok) throw new Error('Failed to load arcane codex: HTTP ' + resp.status);
      var data = await resp.json();
      arcaneDirectory = buildArcaneDirectory(data);
      saveArcaneDirectoryCache(arcaneDirectory);
    })();

    try {
      await arcaneDirectoryPromise;
      return Array.isArray(arcaneDirectory) && arcaneDirectory.length > 0;
    } catch (e) {
      return false;
    } finally {
      arcaneDirectoryPromise = null;
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
      var imageUrl = getItemImageUrl(frameItem);

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
      var imageUrl = getItemImageUrl(weaponItem);

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
    if (value === 'legendary') return 4;
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
      var normalized = extractRelicRewardsFromItem(item);
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
      right.textContent = cleanDisplayText(reward.rarity) + (chance ? ' - ' + chance : '');

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
      card.tabIndex = 0;

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

  function getRelicSearchMatches(relic, query) {
    var normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
      return { score: 0, matchedRewards: [] };
    }

    var tokens = normalizedQuery.split(' ').filter(Boolean);
    var relicNameHit = relic.relicSearchKey.indexOf(normalizedQuery) !== -1;
    var rewardNameHit = relic.rewardSearchKey.indexOf(normalizedQuery) !== -1;
    var tokenHit = tokens.length > 0 && tokens.every(function(token) {
      return relic.searchKey.indexOf(token) !== -1;
    });

    if (!relicNameHit && !rewardNameHit && !tokenHit) {
      return null;
    }

    var matchedRewards = [];
    for (var i = 0; i < relic.rewardNames.length; i++) {
      var rewardName = relic.rewardNames[i];
      var rewardKey = normalizeSearchText(rewardName);
      var rewardMatches = rewardKey.indexOf(normalizedQuery) !== -1 || (tokens.length > 0 && tokens.every(function(token) {
        return rewardKey.indexOf(token) !== -1;
      }));
      if (rewardMatches) {
        matchedRewards.push(rewardName);
      }
      if (matchedRewards.length >= 3) break;
    }

    var score = 0;
    if (relicNameHit) score += 400;
    if (rewardNameHit) score += 250;
    if (tokenHit) score += 100;
    if (relic.relicSearchKey.indexOf(normalizedQuery) === 0) score += 40;

    return {
      score: score,
      matchedRewards: matchedRewards
    };
  }

  function getVisibleRelicResults() {
    if (!Array.isArray(relicDirectory) || relicDirectory.length === 0) return [];
    if (!normalizeSearchText(relicSearchQuery)) {
      return relicDirectory.map(function(relic) {
        return {
          relic: relic,
          score: 0,
          matchedRewards: []
        };
      });
    }

    var results = [];
    for (var i = 0; i < relicDirectory.length; i++) {
      var relic = relicDirectory[i];
      var matchInfo = getRelicSearchMatches(relic, relicSearchQuery);
      if (!matchInfo) continue;
      results.push({
        relic: relic,
        score: matchInfo.score,
        matchedRewards: matchInfo.matchedRewards
      });
    }

    results.sort(function(a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.relic.displayName || a.relic.name || '').localeCompare(String(b.relic.displayName || b.relic.name || ''));
    });
    return results;
  }

  function updateRelicResultsHeader(results) {
    var totalCount = Array.isArray(relicDirectory) ? relicDirectory.length : 0;
    var visibleCount = Array.isArray(results) ? results.length : 0;
    var renderedCount = Math.min(visibleCount, relicVisibleCount);
    var hasQuery = !!normalizeSearchText(relicSearchQuery);

    if (els.relicsTotalCount) {
      els.relicsTotalCount.textContent = totalCount ? totalCount.toLocaleString() : '0';
    }
    if (els.relicsResultsCount) {
      els.relicsResultsCount.textContent = renderedCount.toLocaleString();
    }
    if (els.relicsCountText) {
      els.relicsCountText.textContent = hasQuery
        ? 'Showing ' + renderedCount.toLocaleString() + ' of ' + visibleCount.toLocaleString() + ' matches for "' + relicSearchQuery + '".'
        : 'Showing ' + renderedCount.toLocaleString() + ' of ' + totalCount.toLocaleString() + ' relics in the full in-game reward table.';
    }
    if (els.relicsSearchSummary) {
      els.relicsSearchSummary.textContent = hasQuery
        ? 'Matches by relic name and reward name'
        : 'Search by relic name, Warframe, weapon, or prime part';
    }
  }

  function syncRelicSearchControls() {
    if (els.relicSearchInput && els.relicSearchInput.value !== relicSearchQuery) {
      els.relicSearchInput.value = relicSearchQuery;
    }
    if (els.relicSearchClear) {
      els.relicSearchClear.classList.toggle('hidden', !relicSearchQuery);
    }
  }

  function scrollRelicsToTop(smooth) {
    if (!els.relicsContent) return;
    if (smooth && typeof els.relicsContent.scrollTo === 'function') {
      els.relicsContent.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    els.relicsContent.scrollTop = 0;
  }

  function scheduleRelicDirectoryRender(options) {
    var opts = options || {};
    if (opts.resetLimit) {
      relicVisibleCount = RELIC_RENDER_BATCH_SIZE;
    }
    if (opts.resetScroll) {
      scrollRelicsToTop(!!opts.smoothScroll);
    }

    if (relicRenderFrame && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(relicRenderFrame);
      relicRenderFrame = 0;
    }

    if (typeof window.requestAnimationFrame === 'function') {
      relicRenderFrame = window.requestAnimationFrame(function() {
        relicRenderFrame = 0;
        renderRelicDirectory();
      });
      return;
    }

    renderRelicDirectory();
  }

  function renderRelicDirectory() {
    if (!els.relicsGrid) return;

    var results = getVisibleRelicResults();
    var visibleResults = results.slice(0, relicVisibleCount);
    syncRelicSearchControls();
    updateRelicResultsHeader(results);
    els.relicsGrid.textContent = '';

    if (results.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'prime-empty';
      empty.textContent = relicSearchQuery
        ? 'No relics matched "' + relicSearchQuery + '". Try a broader item or relic name.'
        : 'No relics are available right now.';
      els.relicsGrid.appendChild(empty);
      return;
    }

    var fragment = document.createDocumentFragment();

    for (var i = 0; i < visibleResults.length; i++) {
      var result = visibleResults[i];
      var relic = result.relic;

      var card = document.createElement('article');
      card.className = 'prime-relic-card relic-directory-card';
      card.tabIndex = 0;

      var title = document.createElement('h4');
      title.className = 'prime-relic-name';
      title.textContent = relic.name;

      var meta = document.createElement('div');
      meta.className = 'prime-relic-cost';
      meta.textContent = relic.rareRewardName
        ? 'Rare reward: ' + relic.rareRewardName
        : relic.rewardCount + ' rewards available';

      var pillRow = document.createElement('div');
      pillRow.className = 'relic-card-pill-row';

      var tierPill = document.createElement('span');
      tierPill.className = 'relic-card-pill';
      tierPill.textContent = relic.tier;

      var countPill = document.createElement('span');
      countPill.className = 'relic-card-pill';
      countPill.textContent = relic.rewardCount + ' rewards';

      pillRow.appendChild(tierPill);
      pillRow.appendChild(countPill);

      var detail = document.createElement('div');
      if (result.matchedRewards && result.matchedRewards.length > 0) {
        detail.className = 'relic-card-match';

        var label = document.createElement('span');
        label.className = 'relic-card-match-label';
        label.textContent = 'Matches:';

        var matchText = document.createElement('span');
        matchText.textContent = result.matchedRewards.join(', ');

        detail.appendChild(label);
        detail.appendChild(matchText);
      } else {
        detail.className = 'relic-card-preview';
        detail.textContent = relic.rareRewardName
          ? 'Hover to inspect all drops and drop chances.'
          : 'Hover to inspect the full reward table.';
      }

      var spacer = document.createElement('div');
      spacer.className = 'relic-card-spacer';

      var hint = document.createElement('div');
      hint.className = 'prime-relic-hint';
      hint.textContent = 'Hover to see drops';

      var hover = document.createElement('div');
      hover.className = 'prime-relic-hover';
      renderRelicRewards(hover, relic.rewards);

      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(pillRow);
      card.appendChild(detail);
      card.appendChild(spacer);
      card.appendChild(hint);
      card.appendChild(hover);
      fragment.appendChild(card);
    }

    if (results.length > visibleResults.length) {
      var remaining = results.length - visibleResults.length;
      var showMoreCard = document.createElement('article');
      showMoreCard.className = 'prime-relic-card relic-directory-card relic-show-more-card';

      var showMoreTitle = document.createElement('h4');
      showMoreTitle.className = 'prime-relic-name';
      showMoreTitle.textContent = 'More Relics Ready';

      var showMoreCopy = document.createElement('p');
      showMoreCopy.className = 'relic-show-more-copy';
      showMoreCopy.textContent = 'Showing ' + visibleResults.length.toLocaleString() + ' of ' + results.length.toLocaleString() + ' matches. Load more results to keep browsing without freezing the tab.';

      var showMoreBtn = document.createElement('button');
      showMoreBtn.className = 'relic-show-more-btn';
      showMoreBtn.type = 'button';
      showMoreBtn.innerHTML = '<span class="material-icons-round">expand_more</span><span>Show ' + Math.min(RELIC_RENDER_BATCH_SIZE, remaining).toLocaleString() + ' More</span>';
      showMoreBtn.addEventListener('click', function() {
        relicVisibleCount += RELIC_RENDER_BATCH_SIZE;
        scheduleRelicDirectoryRender({ resetScroll: false });
      });

      showMoreCard.appendChild(showMoreTitle);
      showMoreCard.appendChild(showMoreCopy);
      showMoreCard.appendChild(showMoreBtn);
      fragment.appendChild(showMoreCard);
    }

    els.relicsGrid.appendChild(fragment);
  }

  async function loadRelicDirectory(forceRefresh) {
    if (!els.relicsGrid) return;
    if (!relicSearchQuery) {
      relicVisibleCount = RELIC_RENDER_BATCH_SIZE;
    }
    syncRelicSearchControls();
    scrollRelicsToTop(false);

    if (!forceRefresh && Array.isArray(relicDirectory) && relicDirectory.length > 0) {
      scheduleRelicDirectoryRender({ resetScroll: false });
      return;
    }

    els.relicsGrid.innerHTML = '<div class="prime-loading">Loading relic catalog...</div>';
    if (els.relicsSearchSummary) {
      els.relicsSearchSummary.textContent = 'Building relic catalog...';
    }

    try {
      var loaded = await ensureRelicDirectoryLoaded(!!forceRefresh);
      if (!loaded) {
        throw new Error('Relic catalog is unavailable right now.');
      }
      scheduleRelicDirectoryRender({ resetScroll: false });
    } catch (err) {
      var msg = err && err.message ? String(err.message) : 'Unknown error';
      if (els.relicsGrid) {
        els.relicsGrid.innerHTML = '<div class="prime-error">Failed to load relic catalog. ' + escapeHtml(msg) + '</div>';
      }
      if (els.relicsCountText) {
        els.relicsCountText.textContent = 'Unable to load relic search right now.';
      }
      if (els.relicsSearchSummary) {
        els.relicsSearchSummary.textContent = 'Try reopening the panel in a moment';
      }
      if (els.relicsTotalCount) {
        els.relicsTotalCount.textContent = '--';
      }
      if (els.relicsResultsCount) {
        els.relicsResultsCount.textContent = '--';
      }
    }
  }

  function getArcaneSearchMatches(arcane, query) {
    var normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
      return { score: 0, matchedLines: [] };
    }

    var tokens = normalizedQuery.split(' ').filter(Boolean);
    var nameHit = arcane.nameKey.indexOf(normalizedQuery) !== -1;
    var typeHit = arcane.typeKey.indexOf(normalizedQuery) !== -1;
    var rarityHit = arcane.rarityKey.indexOf(normalizedQuery) !== -1;
    var statsHit = arcane.statsSearchKey.indexOf(normalizedQuery) !== -1;
    var dropHit = arcane.dropsSearchKey.indexOf(normalizedQuery) !== -1;
    var tokenHit = tokens.length > 0 && tokens.every(function(token) {
      return arcane.searchKey.indexOf(token) !== -1;
    });

    if (!nameHit && !typeHit && !rarityHit && !statsHit && !dropHit && !tokenHit) {
      return null;
    }

    var matchedLines = [];
    for (var i = 0; i < arcane.statLines.length; i++) {
      var line = arcane.statLines[i];
      var lineKey = normalizeSearchText(line);
      var lineMatches = lineKey.indexOf(normalizedQuery) !== -1 || (tokens.length > 0 && tokens.every(function(token) {
        return lineKey.indexOf(token) !== -1;
      }));
      if (!lineMatches) continue;
      matchedLines.push(line);
      if (matchedLines.length >= 2) break;
    }

    var score = 0;
    if (nameHit) score += 500;
    if (typeHit) score += 180;
    if (rarityHit) score += 90;
    if (statsHit) score += 260;
    if (dropHit) score += 80;
    if (tokenHit) score += 100;
    if (arcane.nameKey.indexOf(normalizedQuery) === 0) score += 50;

    return {
      score: score,
      matchedLines: matchedLines
    };
  }

  function getVisibleArcaneResults() {
    if (!Array.isArray(arcaneDirectory) || arcaneDirectory.length === 0) return [];
    if (!normalizeSearchText(arcaneSearchQuery)) {
      return arcaneDirectory.map(function(arcane) {
        return {
          arcane: arcane,
          score: 0,
          matchedLines: []
        };
      });
    }

    var results = [];
    for (var i = 0; i < arcaneDirectory.length; i++) {
      var arcane = arcaneDirectory[i];
      var matchInfo = getArcaneSearchMatches(arcane, arcaneSearchQuery);
      if (!matchInfo) continue;
      results.push({
        arcane: arcane,
        score: matchInfo.score,
        matchedLines: matchInfo.matchedLines
      });
    }

    results.sort(function(a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.arcane.name || '').localeCompare(String(b.arcane.name || ''));
    });
    return results;
  }

  function updateArcaneResultsHeader(results) {
    var totalCount = Array.isArray(arcaneDirectory) ? arcaneDirectory.length : 0;
    var visibleCount = Array.isArray(results) ? results.length : 0;
    var renderedCount = Math.min(visibleCount, arcaneVisibleCount);
    var hasQuery = !!normalizeSearchText(arcaneSearchQuery);
    if (els.arcanesCountText) {
      els.arcanesCountText.textContent = hasQuery
        ? 'Showing ' + renderedCount.toLocaleString() + ' of ' + visibleCount.toLocaleString() + ' matches for "' + arcaneSearchQuery + '".'
        : 'Showing ' + renderedCount.toLocaleString() + ' of ' + totalCount.toLocaleString() + ' arcanes with full rank breakdowns.';
    }
    if (els.arcanesSearchSummary) {
      els.arcanesSearchSummary.textContent = hasQuery
        ? 'Matches by name, slot type, rarity, effect text, or drop location'
        : 'Search by arcane name, slot type, rarity, or effect text';
    }
  }

  function syncArcaneSearchControls() {
    if (els.arcaneSearchInput && els.arcaneSearchInput.value !== arcaneSearchQuery) {
      els.arcaneSearchInput.value = arcaneSearchQuery;
    }
    if (els.arcaneSearchClear) {
      els.arcaneSearchClear.classList.toggle('hidden', !arcaneSearchQuery);
    }
  }

  function scrollArcanesToTop(smooth) {
    if (!els.arcanesContent) return;
    if (smooth && typeof els.arcanesContent.scrollTo === 'function') {
      els.arcanesContent.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    els.arcanesContent.scrollTop = 0;
  }

  function scheduleArcaneDirectoryRender(options) {
    var opts = options || {};
    if (opts.resetLimit) {
      arcaneVisibleCount = ARCANE_RENDER_BATCH_SIZE;
    }
    if (opts.resetScroll) {
      scrollArcanesToTop(!!opts.smoothScroll);
    }

    if (arcaneRenderFrame && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(arcaneRenderFrame);
      arcaneRenderFrame = 0;
    }

    if (typeof window.requestAnimationFrame === 'function') {
      arcaneRenderFrame = window.requestAnimationFrame(function() {
        arcaneRenderFrame = 0;
        renderArcaneDirectory();
      });
      return;
    }

    renderArcaneDirectory();
  }

  function renderArcaneRanks(hoverEl, ranks) {
    if (!hoverEl) return;
    hoverEl.textContent = '';

    if (!Array.isArray(ranks) || ranks.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'prime-relic-empty';
      empty.textContent = 'No rank data available.';
      hoverEl.appendChild(empty);
      return;
    }

    for (var i = 0; i < ranks.length; i++) {
      var rank = ranks[i] || {};
      var section = document.createElement('section');
      section.className = 'arcane-hover-rank';

      var label = document.createElement('div');
      label.className = 'arcane-hover-rank-label';
      label.textContent = rank.label || ('Rank ' + i);
      section.appendChild(label);

      var list = document.createElement('ul');
      list.className = 'arcane-hover-rank-list';

      var lines = Array.isArray(rank.lines) && rank.lines.length > 0 ? rank.lines : ['No stat data available.'];
      for (var j = 0; j < lines.length; j++) {
        var line = document.createElement('li');
        line.className = 'arcane-hover-rank-line';
        line.textContent = lines[j];
        list.appendChild(line);
      }

      section.appendChild(list);
      hoverEl.appendChild(section);
    }
  }

  function renderArcaneDirectory() {
    if (!els.arcanesGrid) return;

    var results = getVisibleArcaneResults();
    var visibleResults = results.slice(0, arcaneVisibleCount);
    syncArcaneSearchControls();
    updateArcaneResultsHeader(results);
    els.arcanesGrid.textContent = '';

    if (results.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'prime-empty';
      empty.textContent = arcaneSearchQuery
        ? 'No arcanes matched "' + arcaneSearchQuery + '". Try a broader name or stat search.'
        : 'No arcanes are available right now.';
      els.arcanesGrid.appendChild(empty);
      return;
    }

    var fragment = document.createDocumentFragment();

    for (var i = 0; i < visibleResults.length; i++) {
      var result = visibleResults[i];
      var arcane = result.arcane;

      var card = document.createElement('article');
      card.className = 'prime-relic-card arcane-directory-card';
      card.tabIndex = 0;

      var head = document.createElement('div');
      head.className = 'arcane-card-head';

      var media = document.createElement('div');
      media.className = 'arcane-card-media';
      if (arcane.imageName) {
        var img = document.createElement('img');
        img.className = 'arcane-card-icon';
        img.src = getChecklistImageUrl(arcane.imageName);
        img.alt = arcane.name;
        img.loading = 'lazy';
        img.decoding = 'async';
        media.appendChild(img);
      } else {
        var fallback = document.createElement('span');
        fallback.className = 'material-icons-round arcane-card-icon-fallback';
        fallback.textContent = 'diamond';
        media.appendChild(fallback);
      }

      var body = document.createElement('div');
      body.className = 'arcane-card-body';

      var title = document.createElement('h4');
      title.className = 'prime-relic-name';
      title.textContent = arcane.name;

      var meta = document.createElement('div');
      meta.className = 'prime-relic-cost';
      meta.textContent = arcane.type + ' | ' + arcane.rarity;

      body.appendChild(title);
      body.appendChild(meta);
      head.appendChild(media);
      head.appendChild(body);

      var pillRow = document.createElement('div');
      pillRow.className = 'arcane-card-pill-row';

      var rankPill = document.createElement('span');
      rankPill.className = 'arcane-card-pill';
      rankPill.textContent = 'Max Rank ' + arcane.maxRank;

      var rarityPill = document.createElement('span');
      rarityPill.className = 'arcane-card-pill';
      rarityPill.textContent = arcane.rarity;

      var tradePill = document.createElement('span');
      tradePill.className = 'arcane-card-pill' + (arcane.tradable ? ' is-tradable' : ' is-untradable');
      tradePill.textContent = arcane.tradable ? 'Tradable' : 'Untradable';

      pillRow.appendChild(rankPill);
      pillRow.appendChild(rarityPill);
      pillRow.appendChild(tradePill);

      var detail = document.createElement('div');
      if (result.matchedLines && result.matchedLines.length > 0) {
        detail.className = 'arcane-card-match';

        var label = document.createElement('span');
        label.className = 'arcane-card-match-label';
        label.textContent = 'Matched:';

        var matchText = document.createElement('span');
        matchText.textContent = result.matchedLines.join(' / ');

        detail.appendChild(label);
        detail.appendChild(matchText);
      } else {
        detail.className = 'arcane-card-preview';
        detail.textContent = arcane.previewLines && arcane.previewLines.length > 0
          ? arcane.previewLines.join(' / ')
          : 'Hover to inspect every arcane rank.';
      }

      var source = document.createElement('div');
      source.className = 'arcane-card-source';
      source.textContent = arcane.dropLocations && arcane.dropLocations.length > 0
        ? 'Drops: ' + arcane.dropLocations.join(' | ')
        : 'Rank entries: ' + arcane.ranks.length;

      var spacer = document.createElement('div');
      spacer.className = 'relic-card-spacer';

      var hint = document.createElement('div');
      hint.className = 'prime-relic-hint';
      hint.textContent = 'Hover to see ranks';

      var hover = document.createElement('div');
      hover.className = 'prime-relic-hover arcane-hover';
      renderArcaneRanks(hover, arcane.ranks);

      card.appendChild(head);
      card.appendChild(pillRow);
      card.appendChild(detail);
      card.appendChild(source);
      card.appendChild(spacer);
      card.appendChild(hint);
      card.appendChild(hover);
      fragment.appendChild(card);
    }

    if (results.length > visibleResults.length) {
      var remaining = results.length - visibleResults.length;
      var showMoreCard = document.createElement('article');
      showMoreCard.className = 'prime-relic-card arcane-directory-card arcane-show-more-card';

      var showMoreTitle = document.createElement('h4');
      showMoreTitle.className = 'prime-relic-name';
      showMoreTitle.textContent = 'More Arcanes Ready';

      var showMoreCopy = document.createElement('p');
      showMoreCopy.className = 'arcane-show-more-copy';
      showMoreCopy.textContent = 'Showing ' + visibleResults.length.toLocaleString() + ' of ' + results.length.toLocaleString() + ' matches. Load more without freezing the panel.';

      var showMoreBtn = document.createElement('button');
      showMoreBtn.className = 'arcane-show-more-btn';
      showMoreBtn.type = 'button';
      showMoreBtn.innerHTML = '<span class="material-icons-round">expand_more</span><span>Show ' + Math.min(ARCANE_RENDER_BATCH_SIZE, remaining).toLocaleString() + ' More</span>';
      showMoreBtn.addEventListener('click', function() {
        arcaneVisibleCount += ARCANE_RENDER_BATCH_SIZE;
        scheduleArcaneDirectoryRender({ resetScroll: false });
      });

      showMoreCard.appendChild(showMoreTitle);
      showMoreCard.appendChild(showMoreCopy);
      showMoreCard.appendChild(showMoreBtn);
      fragment.appendChild(showMoreCard);
    }

    els.arcanesGrid.appendChild(fragment);
  }

  async function loadArcaneDirectory(forceRefresh) {
    if (!els.arcanesGrid) return;
    if (!normalizeSearchText(arcaneSearchQuery)) {
      arcaneVisibleCount = ARCANE_RENDER_BATCH_SIZE;
    }
    syncArcaneSearchControls();
    scrollArcanesToTop(false);

    if (!forceRefresh && Array.isArray(arcaneDirectory) && arcaneDirectory.length > 0) {
      scheduleArcaneDirectoryRender({ resetScroll: false });
      return;
    }

    els.arcanesGrid.innerHTML = '<div class="prime-loading">Loading arcane codex...</div>';
    if (els.arcanesSearchSummary) {
      els.arcanesSearchSummary.textContent = 'Building arcane codex...';
    }

    try {
      var loaded = await ensureArcaneDirectoryLoaded(!!forceRefresh);
      if (!loaded) {
        throw new Error('Arcane codex is unavailable right now.');
      }
      scheduleArcaneDirectoryRender({ resetScroll: false });
    } catch (err) {
      var msg = err && err.message ? String(err.message) : 'Unknown error';
      if (els.arcanesGrid) {
        els.arcanesGrid.innerHTML = '<div class="prime-error">Failed to load arcane codex. ' + escapeHtml(msg) + '</div>';
      }
      if (els.arcanesCountText) {
        els.arcanesCountText.textContent = 'Unable to load arcane search right now.';
      }
      if (els.arcanesSearchSummary) {
        els.arcanesSearchSummary.textContent = 'Try reopening the panel in a moment';
      }
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

  function setScanTriggerBusy(isBusy) {
    if (!els.scanItemsBtn) return;
    els.scanItemsBtn.disabled = !!isBusy;
  }

  function setScanBatchContext(index, total, fileName) {
    scanBatchContext.index = Math.max(0, Number(index) || 0);
    scanBatchContext.total = Math.max(0, Number(total) || 0);
    scanBatchContext.fileName = String(fileName || '').trim();
  }

  function getDefaultScanDropzoneMetaText() {
    return 'Supports PNG, JPG, WEBP, GIF, BMP, and TIFF screenshots.';
  }

  function setScanDropzoneMetaText(text) {
    if (!els.scanDropzoneMeta) return;
    els.scanDropzoneMeta.textContent = String(text || '').trim() || getDefaultScanDropzoneMetaText();
  }

  function resetScanDropzoneState() {
    scanDragDepth = 0;
    if (els.scanDropzone) {
      els.scanDropzone.classList.remove('is-dragover');
    }
    setScanDropzoneMetaText('');
  }

  function updateScanDropzoneMetaForSelection(files) {
    var count = Array.isArray(files) ? files.length : 0;
    if (!count) {
      setScanDropzoneMetaText('');
      return;
    }

    var firstName = files[0] && files[0].name ? String(files[0].name) : '';
    if (count === 1) {
      setScanDropzoneMetaText(firstName ? ('1 screenshot selected: ' + firstName) : '1 screenshot selected.');
      return;
    }

    setScanDropzoneMetaText(count + ' screenshots selected for batch scanning.');
  }

  function updateScanDropzoneMetaForProgress(index, total, fileName) {
    if (total <= 0) {
      setScanDropzoneMetaText('');
      return;
    }

    var safeName = String(fileName || '').trim();
    if (total === 1) {
      setScanDropzoneMetaText(safeName ? ('Scanning: ' + safeName) : 'Scanning screenshot...');
      return;
    }

    setScanDropzoneMetaText('Scanning ' + index + ' of ' + total + (safeName ? (': ' + safeName) : ''));
  }

  function prepareScanModalForSelection() {
    openScanModal();
    resetScanModalView();
    renderScanPreview('');
    setScanBatchContext(0, 0, '');
    resetScanDropzoneState();
    setScanStatus(
      'idle',
      'Drop screenshots to begin',
      'Drag and drop one or more screenshots here, or choose images to batch scan your inventory checklist.',
      0,
      'Idle'
    );
  }

  function openScanModal() {
    if (!els.scanModal) return;
    els.scanModal.classList.remove('hidden');
  }

  function closeScanModal(force) {
    if (!els.scanModal) return;
    if (ocrScanInProgress && !force) return;
    els.scanModal.classList.add('hidden');
    resetScanDropzoneState();
  }

  function resetScanModalView(options) {
    var preservePreview = !!(options && options.preservePreview);
    if (!preservePreview) {
      if (els.scanPreviewShell) els.scanPreviewShell.classList.add('hidden');
      if (els.scanPreviewImg) {
        els.scanPreviewImg.removeAttribute('src');
      }
    }
    if (els.scanResults) els.scanResults.classList.add('hidden');
    if (els.scanMatchedList) els.scanMatchedList.textContent = '';
    if (els.scanPossibleList) els.scanPossibleList.textContent = '';
    if (els.scanPossibleSection) els.scanPossibleSection.classList.add('hidden');
    if (els.scanMatchedCount) els.scanMatchedCount.textContent = '0';
    if (els.scanNewCount) els.scanNewCount.textContent = '0';
    if (els.scanAlreadyCount) els.scanAlreadyCount.textContent = '0';
    if (els.scanPossibleCount) els.scanPossibleCount.textContent = '0';
    if (els.scanResultsNote) els.scanResultsNote.textContent = '';
  }

  function setScanStatus(state, title, copy, progress, progressLabel) {
    if (els.scanStatusCard) {
      els.scanStatusCard.classList.remove('is-busy', 'is-success', 'is-error');
      if (state === 'busy') els.scanStatusCard.classList.add('is-busy');
      if (state === 'success') els.scanStatusCard.classList.add('is-success');
      if (state === 'error') els.scanStatusCard.classList.add('is-error');
    }
    if (els.scanStatusIcon) {
      els.scanStatusIcon.textContent = state === 'error'
        ? 'error'
        : state === 'success'
          ? 'task_alt'
          : 'image_search';
    }
    if (els.scanStatusTitle) els.scanStatusTitle.textContent = title || '';
    if (els.scanStatusCopy) els.scanStatusCopy.textContent = copy || '';
    if (els.scanProgressFill) {
      var value = typeof progress === 'number' ? Math.max(0, Math.min(progress, 1)) : 0;
      els.scanProgressFill.style.width = Math.round(value * 100) + '%';
    }
    if (els.scanProgressText) {
      els.scanProgressText.textContent = progressLabel || '';
    }
  }

  function setScanModalBusy(isBusy) {
    ocrScanInProgress = !!isBusy;
    setScanTriggerBusy(isBusy);
    if (els.scanModalClose) els.scanModalClose.disabled = !!isBusy;
    if (els.scanModalDone) els.scanModalDone.disabled = !!isBusy;
    if (els.scanModalPickAnother) els.scanModalPickAnother.disabled = !!isBusy;
    if (els.scanModalBrowse) els.scanModalBrowse.disabled = !!isBusy;
    if (els.scanItemsInput) els.scanItemsInput.disabled = !!isBusy;
    if (els.scanDropzone) els.scanDropzone.classList.toggle('is-disabled', !!isBusy);
  }

  function renderScanPreview(dataUrl) {
    if (!els.scanPreviewShell || !els.scanPreviewImg) return;
    if (!dataUrl) {
      els.scanPreviewShell.classList.add('hidden');
      els.scanPreviewImg.removeAttribute('src');
      return;
    }
    els.scanPreviewImg.src = dataUrl;
    els.scanPreviewShell.classList.remove('hidden');
  }

  function appendScanChip(container, label, tone) {
    if (!container) return;
    var chip = document.createElement('div');
    chip.className = 'scan-chip' + (tone ? ' ' + tone : '');

    var name = document.createElement('span');
    name.textContent = label;
    chip.appendChild(name);

    var tag = document.createElement('span');
    tag.className = 'scan-chip-tag';
    tag.textContent = tone === 'is-new' ? 'new' : 'already checked';
    chip.appendChild(tag);

    container.appendChild(chip);
  }

  function renderPossibleScanMatch(container, match) {
    if (!container || !match) return;

    var row = document.createElement('div');
    row.className = 'scan-possible-item';

    var source = document.createElement('div');
    source.className = 'scan-possible-source';
    source.textContent = match.source || '';
    row.appendChild(source);

    var arrow = document.createElement('div');
    arrow.className = 'scan-possible-arrow';
    arrow.textContent = '->';
    row.appendChild(arrow);

    var target = document.createElement('div');
    target.className = 'scan-possible-target';
    target.textContent = match.itemName || '';
    row.appendChild(target);

    var score = document.createElement('div');
    score.className = 'scan-possible-score';
    score.textContent = Math.round((match.score || 0) * 100) + '%';
    row.appendChild(score);

    container.appendChild(row);
  }

  function renderScanResults(scanResult) {
    resetScanModalView({ preservePreview: true });

    if (els.scanResults) {
      els.scanResults.classList.remove('hidden');
    }
    if (els.scanMatchedCount) els.scanMatchedCount.textContent = String(scanResult.matchedItems.length);
    if (els.scanNewCount) els.scanNewCount.textContent = String(scanResult.newlyMarked.length);
    if (els.scanAlreadyCount) els.scanAlreadyCount.textContent = String(scanResult.alreadyMarked.length);
    if (els.scanPossibleCount) {
      var possibleCount = typeof scanResult.possibleMatchTotal === 'number'
        ? scanResult.possibleMatchTotal
        : scanResult.possibleMatches.length;
      els.scanPossibleCount.textContent = String(possibleCount);
    }

    for (var i = 0; i < scanResult.newlyMarked.length; i++) {
      appendScanChip(els.scanMatchedList, scanResult.newlyMarked[i].item.name, 'is-new');
    }
    for (var j = 0; j < scanResult.alreadyMarked.length; j++) {
      appendScanChip(els.scanMatchedList, scanResult.alreadyMarked[j].item.name, 'is-existing');
    }

    if (scanResult.possibleMatches.length > 0 && els.scanPossibleSection) {
      els.scanPossibleSection.classList.remove('hidden');
      for (var p = 0; p < scanResult.possibleMatches.length; p++) {
        renderPossibleScanMatch(els.scanPossibleList, scanResult.possibleMatches[p]);
      }
    }

    if (els.scanResultsNote) {
      var successfulFileCount = typeof scanResult.successfulFileCount === 'number'
        ? scanResult.successfulFileCount
        : (typeof scanResult.scannedFileCount === 'number' ? scanResult.scannedFileCount : 1);
      var selectedFileCount = typeof scanResult.scannedFileCount === 'number' ? scanResult.scannedFileCount : 1;
      var failedFiles = Array.isArray(scanResult.failedFiles) ? scanResult.failedFiles : [];
      var failedNames = failedFiles
        .map(function(entry) { return String(entry && entry.name ? entry.name : '').trim(); })
        .filter(Boolean);
      var failedSummary = '';

      if (failedNames.length > 0) {
        failedSummary = failedNames.length <= 3
          ? failedNames.join(', ')
          : failedNames.slice(0, 3).join(', ') + ', +' + (failedNames.length - 3) + ' more';
      }

      if (scanResult.matchedItems.length > 0) {
        els.scanResultsNote.textContent = selectedFileCount > 1
          ? 'Matched ' + scanResult.matchedItems.length + ' unique item(s) from ' + scanResult.scannedLineCount + ' OCR line(s) across ' + successfulFileCount + ' successful screenshot(s). Low-confidence guesses were left unchecked so the app does not mark the wrong item.'
          : 'Matched ' + scanResult.matchedItems.length + ' item(s) from ' + scanResult.scannedLineCount + ' OCR line(s). Low-confidence guesses were left unchecked so the app does not mark the wrong item.';
      } else {
        els.scanResultsNote.textContent = selectedFileCount > 1
          ? 'No confident matches were found in the successful screenshots from this batch. Try clearer screenshots with item names visible, or crop tighter around the item list.'
          : 'No confident matches were found in this screenshot. Try a clearer screenshot with item names visible, or crop tighter around the item list.';
      }

      if (scanResult.unmatchedCount > 0) {
        els.scanResultsNote.textContent += ' Unmatched OCR lines: ' + scanResult.unmatchedCount + '.';
      }
      if (failedFiles.length > 0) {
        els.scanResultsNote.textContent += ' Failed screenshots: ' + failedFiles.length + (failedSummary ? (' (' + failedSummary + ').') : '.');
      }
    }
  }

  function formatOcrProgressLabel(payload) {
    var status = String(payload && payload.status ? payload.status : '').toLowerCase();
    if (status === 'queued') return 'Preparing screenshot';
    if (status === 'loading tesseract core') return 'Loading OCR engine';
    if (status === 'initializing tesseract') return 'Starting OCR engine';
    if (status === 'loading language traineddata') return 'Downloading OCR language data';
    if (status === 'initializing api') return 'Preparing text recognition';
    if (status === 'recognizing text') return 'Reading item names';
    if (status === 'done') return 'Scan complete';
    return 'Analyzing screenshot';
  }

  function handleOcrScanProgress(payload) {
    if (!ocrScanInProgress) return;
    var progress = typeof payload.progress === 'number' ? payload.progress : 0;
    var overallProgress = progress;
    if (scanBatchContext.total > 1 && scanBatchContext.index > 0) {
      overallProgress = ((scanBatchContext.index - 1) + Math.max(0, Math.min(progress, 1))) / scanBatchContext.total;
    }
    var label = formatOcrProgressLabel(payload);
    var title = scanBatchContext.total > 1 && scanBatchContext.index > 0
      ? label + ' (' + scanBatchContext.index + '/' + scanBatchContext.total + ')'
      : label;
    var copy = scanBatchContext.fileName
      ? 'Current file: ' + scanBatchContext.fileName + '. The first scan can take longer while the OCR engine downloads its English data.'
      : 'The first scan can take longer while the OCR engine downloads its English data.';
    var progressLabel = scanBatchContext.total > 1 && scanBatchContext.index > 0
      ? 'Batch ' + scanBatchContext.index + '/' + scanBatchContext.total + ' | ' + label + ' ' + Math.round(overallProgress * 100) + '%'
      : label + ' ' + Math.round(overallProgress * 100) + '%';
    setScanStatus(
      'busy',
      title,
      copy,
      overallProgress,
      progressLabel
    );
  }

  function readFileAsDataUrl(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() {
        resolve(String(reader.result || ''));
      };
      reader.onerror = function() {
        reject(new Error('Failed to read the selected image.'));
      };
      reader.readAsDataURL(file);
    });
  }

  function isSupportedScanImageFile(file) {
    if (!file) return false;

    var type = String(file.type || '').toLowerCase();
    if (type.indexOf('image/') === 0) return true;

    var name = String(file.name || '').toLowerCase();
    return /\.(png|jpe?g|webp|gif|bmp|tiff?)$/i.test(name);
  }

  function getSelectedScanFiles(fileList) {
    var files = [];
    if (!fileList || typeof fileList.length !== 'number') return files;

    for (var i = 0; i < fileList.length; i++) {
      var file = fileList[i];
      if (isSupportedScanImageFile(file)) {
        files.push(file);
      }
    }

    return files;
  }

  function buildScanBatchAggregate(fileCount) {
    return {
      matchedMap: Object.create(null),
      possibleMap: Object.create(null),
      scannedLineCount: 0,
      unmatchedCount: 0,
      scannedFileCount: fileCount,
      successfulFileCount: 0,
      failedFiles: []
    };
  }

  function accumulateScanAnalysis(aggregate, scanAnalysis) {
    if (!aggregate || !scanAnalysis) return;

    aggregate.successfulFileCount += 1;
    aggregate.scannedLineCount += Math.max(0, Number(scanAnalysis.scannedLineCount) || 0);
    aggregate.unmatchedCount += Math.max(0, Number(scanAnalysis.unmatchedCount) || 0);

    var matchedItems = Array.isArray(scanAnalysis.matchedItems) ? scanAnalysis.matchedItems : [];
    for (var i = 0; i < matchedItems.length; i++) {
      var match = matchedItems[i];
      var key = match && match.item ? String(match.item.uniqueName || '') : '';
      if (!key || aggregate.matchedMap[key]) continue;
      aggregate.matchedMap[key] = match;
    }

    var possibleMatches = Array.isArray(scanAnalysis.possibleMatches) ? scanAnalysis.possibleMatches : [];
    for (var p = 0; p < possibleMatches.length; p++) {
      var possible = possibleMatches[p];
      if (!possible) continue;
      var possibleKey = String(possible.itemName || '') + '|' + String(possible.source || '');
      var existing = aggregate.possibleMap[possibleKey];
      if (!existing || Number(possible.score || 0) > Number(existing.score || 0)) {
        aggregate.possibleMap[possibleKey] = possible;
      }
    }
  }

  function finalizeScanBatchResult(aggregate) {
    var matchedItems = Object.keys(aggregate.matchedMap).map(function(key) {
      return aggregate.matchedMap[key];
    });
    matchedItems.sort(function(a, b) {
      return String(a && a.item && a.item.name ? a.item.name : '').localeCompare(String(b && b.item && b.item.name ? b.item.name : ''));
    });

    var possibleMatches = Object.keys(aggregate.possibleMap).map(function(key) {
      return aggregate.possibleMap[key];
    });
    possibleMatches.sort(function(a, b) { return Number(b.score || 0) - Number(a.score || 0); });

    return applyRecognizedMatches({
      matchedItems: matchedItems,
      possibleMatches: possibleMatches,
      possibleMatchTotal: possibleMatches.length,
      unmatchedCount: aggregate.unmatchedCount,
      scannedLineCount: aggregate.scannedLineCount,
      scannedFileCount: aggregate.scannedFileCount,
      successfulFileCount: aggregate.successfulFileCount,
      failedFiles: aggregate.failedFiles
    });
  }

  function buildScanCompletionCopy(scanResult) {
    var scannedFileCount = typeof scanResult.scannedFileCount === 'number' ? scanResult.scannedFileCount : 1;
    var successfulFileCount = typeof scanResult.successfulFileCount === 'number' ? scanResult.successfulFileCount : scannedFileCount;
    var failedFileCount = Array.isArray(scanResult.failedFiles) ? scanResult.failedFiles.length : 0;

    if (failedFileCount > 0 && successfulFileCount > 0) {
      return scanResult.newlyMarked.length > 0
        ? 'Scanned ' + successfulFileCount + ' of ' + scannedFileCount + ' screenshots. New matches from the successful scans were added to your checklist.'
        : 'Scanned ' + successfulFileCount + ' of ' + scannedFileCount + ' screenshots. No new items were added automatically from the successful scans.';
    }

    if (scanResult.newlyMarked.length > 0) {
      return scannedFileCount > 1
        ? 'New matches from this batch were added to your checklist automatically.'
        : 'New matches were added to your checklist automatically.';
    }

    return scannedFileCount > 1
      ? 'No new items were added automatically from this batch scan.'
      : 'No new items were added automatically from this scan.';
  }

  function openScanFilePicker() {
    if (ocrScanInProgress || !els.scanItemsInput) return;
    els.scanItemsInput.click();
  }

  async function startScreenshotItemScanBatch(files) {
    var selectedFiles = Array.isArray(files) ? files.filter(Boolean) : [];
    if (!selectedFiles.length) return;

    prepareScanModalForSelection();
    updateScanDropzoneMetaForSelection(selectedFiles);

    if (!allItems.length) {
      setScanStatus(
        'error',
        'Items are still loading',
        'Wait for the checklist to finish loading before scanning screenshots.',
        0,
        'Unavailable'
      );
      return;
    }

    if (!window.electronAPI || !window.electronAPI.scanImageForItems) {
      setScanStatus(
        'error',
        'OCR is not available',
        'This build does not expose the screenshot scanner through Electron.',
        0,
        'Unavailable'
      );
      return;
    }

    try {
      var aggregate = buildScanBatchAggregate(selectedFiles.length);
      setScanModalBusy(true);

      for (var i = 0; i < selectedFiles.length; i++) {
        var file = selectedFiles[i];
        setScanBatchContext(i + 1, selectedFiles.length, file && file.name ? file.name : '');
        updateScanDropzoneMetaForProgress(i + 1, selectedFiles.length, scanBatchContext.fileName);

        setScanStatus(
          'busy',
          selectedFiles.length > 1 ? ('Preparing screenshot ' + (i + 1) + ' of ' + selectedFiles.length) : 'Preparing screenshot',
          scanBatchContext.fileName
            ? ('Loading ' + scanBatchContext.fileName + ' and sending it to the OCR worker.')
            : 'Loading the selected image and sending it to the OCR worker.',
          selectedFiles.length > 1 ? (i / selectedFiles.length) : 0.02,
          selectedFiles.length > 1 ? ('Batch ' + (i + 1) + '/' + selectedFiles.length) : 'Preparing 2%'
        );

        var dataUrl = await readFileAsDataUrl(file);
        renderScanPreview(dataUrl);

        try {
          var scanResponse = await window.electronAPI.scanImageForItems(dataUrl);
          if (!scanResponse || !scanResponse.ok) {
            throw new Error(scanResponse && scanResponse.message ? scanResponse.message : 'The screenshot scan failed.');
          }

          var scanAnalysis = analyzeRecognizedItems(scanResponse, {
            sourceLabel: selectedFiles.length > 1 && file && file.name ? file.name : ''
          });
          accumulateScanAnalysis(aggregate, scanAnalysis);
        } catch (fileErr) {
          aggregate.failedFiles.push({
            name: file && file.name ? file.name : '',
            message: fileErr && fileErr.message ? fileErr.message : 'The screenshot scan failed.'
          });
        }
      }

      if (aggregate.successfulFileCount === 0) {
        throw new Error(
          aggregate.failedFiles.length > 0 && aggregate.failedFiles[0] && aggregate.failedFiles[0].message
            ? aggregate.failedFiles[0].message
            : 'The screenshot scan failed.'
        );
      }

      var scanResult = finalizeScanBatchResult(aggregate);
      renderScanResults(scanResult);
      setScanStatus(
        scanResult.failedFiles.length > 0 ? 'error' : 'success',
        scanResult.failedFiles.length > 0
          ? 'Batch completed with some issues'
          : (scanResult.scannedFileCount > 1
              ? (scanResult.matchedItems.length > 0 ? 'Batch processed' : 'Batch scanned')
              : (scanResult.matchedItems.length > 0 ? 'Screenshot processed' : 'Screenshot scanned')),
        buildScanCompletionCopy(scanResult),
        1,
        'Complete 100%'
      );
      setScanDropzoneMetaText(
        scanResult.scannedFileCount > 1
          ? (scanResult.scannedFileCount + ' screenshots scanned. Drop more images or choose another batch.')
          : '1 screenshot scanned. Drop or choose another image to scan again.'
      );
    } catch (err) {
      resetScanModalView({ preservePreview: true });
      setScanStatus(
        'error',
        'Scan failed',
        err && err.message ? err.message : 'Something went wrong while analyzing the screenshot.',
        0,
        'Failed'
      );
      setScanDropzoneMetaText('Drop more images or choose another batch to try again.');
    } finally {
      setScanBatchContext(0, 0, '');
      setScanModalBusy(false);
    }
  }

  function triggerScreenshotItemScan() {
    if (ocrScanInProgress) return;
    prepareScanModalForSelection();
  }

  function formatPercentChance(chance) {
    var numeric = Number(chance);
    if (!Number.isFinite(numeric)) return '';
    var percent = numeric > 1 ? numeric : numeric * 100;
    var precision = percent < 1 ? 2 : (percent < 10 ? 1 : 2);
    return percent.toFixed(precision).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1') + '%';
  }

  function setActiveInfoTab(tab) {
    if (!els.itemInfoTabInfo) return;
    var isInfo = tab === 'info';
    var isMission = tab === 'mission';
    var isResources = tab === 'resources';
    var isWiki = tab === 'wiki';
    var isBuild = tab === 'build';

    els.itemInfoTabInfo.classList.toggle('active', isInfo);
    els.itemInfoTabMission.classList.toggle('active', isMission);
    els.itemInfoTabResources.classList.toggle('active', isResources);
    if (els.itemInfoTabWiki) els.itemInfoTabWiki.classList.toggle('active', isWiki);
    if (els.itemInfoTabBuild) els.itemInfoTabBuild.classList.toggle('active', isBuild);

    els.itemInfoTabInfo.setAttribute('aria-selected', isInfo ? 'true' : 'false');
    els.itemInfoTabMission.setAttribute('aria-selected', isMission ? 'true' : 'false');
    els.itemInfoTabResources.setAttribute('aria-selected', isResources ? 'true' : 'false');
    if (els.itemInfoTabWiki) els.itemInfoTabWiki.setAttribute('aria-selected', isWiki ? 'true' : 'false');
    if (els.itemInfoTabBuild) els.itemInfoTabBuild.setAttribute('aria-selected', isBuild ? 'true' : 'false');

    els.itemInfoPaneInfo.classList.toggle('hidden', !isInfo);
    els.itemInfoPaneMission.classList.toggle('hidden', !isMission);
    els.itemInfoPaneResources.classList.toggle('hidden', !isResources);
    if (els.itemInfoPaneWiki) els.itemInfoPaneWiki.classList.toggle('hidden', !isWiki);
    if (els.itemInfoPaneBuild) els.itemInfoPaneBuild.classList.toggle('hidden', !isBuild);
  }

  function renderSummary(item) {
    if (!els.itemInfoSummary) return;
    els.itemInfoSummary.textContent = '';
    var masteryXpValue = item.category === 'Mods'
      ? 'N/A'
      : getTrackedItemXp(item).toLocaleString() + ' / ' + getItemXP(item).toLocaleString() + ' XP';
    var masteryRankValue = item.category === 'Mods'
      ? 'N/A'
      : getStoredItemRank(item) + ' / ' + getItemMaxRank(item);
    if (item.category !== 'Mods' && getItemMaxRank(item) <= 0) {
      masteryRankValue = isItemFullyRanked(item) ? 'Checked' : 'Not checked';
      masteryXpValue = 'No mastery XP';
    }

    var summary = [
      { label: 'Category', value: item.category || '-' },
      { label: 'Type', value: item.type || '-' },
      { label: 'Level', value: masteryRankValue },
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

  function findItemByUniqueName(uniqueName) {
    var target = String(uniqueName || '').trim();
    if (!target) return null;
    for (var i = 0; i < allItems.length; i++) {
      if (allItems[i] && allItems[i].uniqueName === target) {
        return allItems[i];
      }
    }
    return null;
  }

  function syncItemInfoModalContent(item, options) {
    var config = options || {};
    if (!item) return;

    currentItemInfo = item;
    els.itemInfoName.textContent = item.name || 'Item';
    var itemInfoImageUrl = getItemImageUrl(item);
    if (itemInfoImageUrl) {
      els.itemInfoImg.src = itemInfoImageUrl;
    } else {
      els.itemInfoImg.removeAttribute('src');
    }
    els.itemInfoImg.alt = item.name || 'Item';
    els.itemInfoImg.onerror = function() {
      els.itemInfoImg.removeAttribute('src');
      els.itemInfoImg.onerror = null;
    };
    els.itemInfoDescription.textContent = item.description || 'No description available.';
    updateItemInfoPrimeStatus(item);

    if (els.itemInfoMarketBtn) {
      var canOpenMarket = tradeModeEnabled && !!item.tradable;
      els.itemInfoMarketBtn.classList.toggle('hidden', !canOpenMarket);
      els.itemInfoMarketBtn.disabled = !canOpenMarket;
    }

    renderSummary(item);
    if (!config.preserveActiveTab) {
      setActiveInfoTab('info');
    }
    updateWikiPaneForCurrentItem();
    populateInfoList(els.itemInfoFarmList, buildFarmEntries(item), 'No farm source data found.');
    populateCraftInfoList(els.itemInfoCraftList, item);

    if (config.prefetchWiki !== false) {
      prefetchWikiArticle(item);
    }
  }

  function refreshCurrentItemInfoFromLatestData() {
    if (!currentItemInfo || !els.itemInfoModal || els.itemInfoModal.classList.contains('hidden')) return;

    var latestItem = findItemByUniqueName(currentItemInfo.uniqueName);
    if (!latestItem) return;

    syncItemInfoModalContent(latestItem, {
      preserveActiveTab: true,
      prefetchWiki: false
    });
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
      var m = cleanDisplayText(main || '');
      var s = cleanDisplayText(sub || '');
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
      var sourceName = cleanDisplayText(sourceLabel || '');
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i] || {};
        var location = cleanDisplayText(d.location || 'Unknown Location');
        var parts = String(location).split(' - ');
        var mission = cleanDisplayText(parts[0] || location);
        var zone = cleanDisplayText(parts.length > 1 ? parts.slice(1).join(' - ') : '');
        var chanceText = formatPercentChance(d.chance);
        var rarity = cleanDisplayText(d.rarity || '');
        var key = location + '|' + sourceName + '|' + rarity;
        var rightParts = [];
        if (zone) rightParts.push(zone);
        if (sourceName) rightParts.push(sourceName);
        if (chanceText) rightParts.push(chanceText);
        if (rarity) rightParts.push(rarity);

        if (!byKey[key]) {
          byKey[key] = {
            main: mission,
            sub: joinDisplayParts(rightParts) || 'Drop source',
            score: typeof d.chance === 'number' ? d.chance : 0
          };
        } else if (typeof d.chance === 'number' && d.chance > byKey[key].score) {
          byKey[key].score = d.chance;
          byKey[key].sub = joinDisplayParts(rightParts) || 'Drop source';
        }
      }
    }

    ingestDrops(item.drops || [], '');

    if (Array.isArray(item.components)) {
      for (var c = 0; c < item.components.length; c++) {
        var comp = item.components[c];
        ingestDrops(comp && comp.drops ? comp.drops : [], comp && comp.name ? cleanDisplayText(comp.name) : 'Component');
      }
    }

    var values = Object.values(byKey);
    values.sort(function(a, b) {
      return (b.score || 0) - (a.score || 0);
    });

    var hints = buildAcquisitionHintEntries(item);
    var farmEntryLimit = 40;
    for (var h = 0; h < hints.length && entries.length < farmEntryLimit; h++) {
      entries.push(hints[h]);
    }

    for (var v = 0; v < values.length && entries.length < farmEntryLimit; v++) {
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
          if (sub.name) needs.push(cleanDisplayText(sub.name) + ' x' + subCount);
        }
      }
      entries.push({
        main: cleanDisplayText(comp.name || 'Unknown Resource'),
        sub: needs.length > 0 ? ('x' + count + ' - Needs: ' + needs.slice(0, 4).join(', ')) : ('x' + count)
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
      main.textContent = cleanDisplayText(entries[i].main);
      var sub = document.createElement('span');
      sub.className = 'item-info-row-sub';
      sub.textContent = cleanDisplayText(entries[i].sub || '');
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
      main.textContent = cleanDisplayText(entries[e].main);

      var sub = document.createElement('span');
      sub.className = 'item-info-row-sub';
      sub.textContent = cleanDisplayText(entries[e].sub || '');

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
          detail.textContent = joinDisplayParts(partResources.slice(0, 10));
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

  function isWikiTabActive() {
    return !!(els.itemInfoTabWiki && els.itemInfoTabWiki.classList.contains('active'));
  }

  function setWikiPaneState(state, message) {
    if (!els.itemInfoWikiState || !els.itemInfoWikiContent) return;

    els.itemInfoWikiState.className = 'item-info-wiki-state';
    if (state) els.itemInfoWikiState.classList.add('is-' + state);

    var text = String(message || '').trim();
    els.itemInfoWikiState.textContent = text;
    els.itemInfoWikiState.classList.toggle('hidden', !text);
  }

  function renderWikiPaneContent(entry) {
    if (!els.itemInfoWikiContent) return;

    els.itemInfoWikiContent.textContent = '';

    var source = document.createElement('div');
    source.className = 'item-info-wiki-source';
    source.textContent = 'Content from Warframe Wiki';

    var article = document.createElement('div');
    article.className = 'item-info-wiki-article';
    article.innerHTML = entry && entry.html ? entry.html : '';
    applyAppTradeStatusToWikiArticle(article, currentItemInfo);

    els.itemInfoWikiContent.appendChild(source);
    els.itemInfoWikiContent.appendChild(article);
    els.itemInfoWikiContent.classList.remove('hidden');
    setWikiPaneState('', '');
  }

  function updateWikiPaneForCurrentItem() {
    if (!els.itemInfoWikiContent) return;

    var entry = currentItemInfo ? getWikiCacheEntry(currentItemInfo) : null;
    if (entry && entry.status === 'ready' && entry.html) {
      renderWikiPaneContent(entry);
      return;
    }

    els.itemInfoWikiContent.textContent = '';
    els.itemInfoWikiContent.classList.add('hidden');

    if (entry && entry.status === 'loading') {
      setWikiPaneState('loading', 'Fetching article from Warframe Wiki...');
      return;
    }

    if (entry && entry.status === 'error') {
      setWikiPaneState('error', entry.message || 'Unable to load wiki content right now.');
      return;
    }

    setWikiPaneState('idle', 'Open the Wiki tab to load the full article for this item.');
  }

  async function fetchWikiArticle(item) {
    var cacheKey = getWikiCacheKey(item);
    var existing = getWikiCacheEntry(item);
    if (existing) {
      if (existing.status === 'loading' && existing.promise) return existing.promise;
      if (existing.status === 'ready' && existing.html) return existing;
    }

    if (!cacheKey) {
      return {
        status: 'error',
        fetchedAt: Date.now(),
        message: 'This item does not have a wiki page title.'
      };
    }

    var pending = (async function() {
      try {
        var json = null;
        var lastError = null;
        for (var apiIndex = 0; apiIndex < WIKI_API_URLS.length; apiIndex++) {
          try {
            json = await fetchJsonWithTimeout(buildWikiApiUrl(item, WIKI_API_URLS[apiIndex]), WIKI_FETCH_TIMEOUT_MS);
            break;
          } catch (apiErr) {
            lastError = apiErr;
          }
        }
        if (!json && lastError) throw lastError;
        if (json && json.error) {
          throw new Error(String(json.error.info || json.error.code || 'Wiki page could not be loaded.'));
        }

        var parsed = json && json.parse ? json.parse : null;
        var html = sanitizeWikiArticleHtml(parsed && parsed.text ? parsed.text : '');
        if (!html) throw new Error('Warframe Wiki did not return article content for this item.');

        var readyEntry = {
          status: 'ready',
          fetchedAt: Date.now(),
          title: parsed && parsed.title ? parsed.title : getWikiPageTitle(item),
          url: buildWikiUrl(item),
          html: html
        };

        wikiArticleCache[cacheKey] = readyEntry;
        return readyEntry;
      } catch (err) {
        var message = err && err.message ? err.message : 'Unable to load wiki content right now.';
        var errorEntry = {
          status: 'error',
          fetchedAt: Date.now(),
          title: getWikiPageTitle(item),
          url: buildWikiUrl(item),
          message: message
        };

        wikiArticleCache[cacheKey] = errorEntry;
        return errorEntry;
      } finally {
        if (currentItemInfo && getWikiCacheKey(currentItemInfo) === cacheKey && isWikiTabActive()) {
          updateWikiPaneForCurrentItem();
        }
      }
    })();

    wikiArticleCache[cacheKey] = {
      status: 'loading',
      fetchedAt: Date.now(),
      title: getWikiPageTitle(item),
      url: buildWikiUrl(item),
      promise: pending
    };

    return pending;
  }

  function prefetchWikiArticle(item) {
    var entry = getWikiCacheEntry(item);
    if (entry && (entry.status === 'loading' || entry.status === 'ready')) return;
    fetchWikiArticle(item);
  }

  function openWikiTabForCurrentItem() {
    setActiveInfoTab('wiki');
    updateWikiPaneForCurrentItem();
    if (currentItemInfo) fetchWikiArticle(currentItemInfo);
  }

  function setSimarisStatus(state, icon, text) {
    if (els.simarisStatus) {
      els.simarisStatus.setAttribute('data-state', state || 'idle');
    }
    if (els.simarisStatusIcon) {
      els.simarisStatusIcon.textContent = icon || 'psychology';
    }
    if (els.simarisStatusText) {
      els.simarisStatusText.textContent = text || '';
    }
  }

  function findSimarisChecklistItem(query) {
    var key = toLookupKey(query);
    if (!key) return null;

    for (var i = 0; i < allItems.length; i++) {
      if (toLookupKey(allItems[i] && allItems[i].name) === key) return allItems[i];
    }

    for (var j = 0; j < allItems.length; j++) {
      var itemKey = toLookupKey(allItems[j] && allItems[j].name);
      if (itemKey && (itemKey.indexOf(key) !== -1 || key.indexOf(itemKey) !== -1)) {
        return allItems[j];
      }
    }

    return null;
  }

  function buildSimarisQueryItem(query) {
    var item = findSimarisChecklistItem(query);
    if (item) return item;

    var cleanQuery = cleanDisplayText(query);
    return {
      uniqueName: 'simaris://' + toLookupKey(cleanQuery),
      name: cleanQuery,
      category: 'Wiki',
      type: 'Wiki Query',
      masterable: false,
      tradable: false,
      imageName: '',
      description: '',
      wikiaUrl: buildWikiUrl({ name: cleanQuery }),
      wikiAvailable: true,
      drops: [],
      components: [],
      productCategory: '',
      profileOnly: true
    };
  }

  function renderSimarisResult(item, entry) {
    if (!els.simarisResult || !entry || entry.status !== 'ready') return;

    var title = cleanDisplayText(entry.title || getWikiPageTitle(item) || item.name || 'Result');
    if (els.simarisResultTitle) els.simarisResultTitle.textContent = title;
    if (els.simarisResultLink) {
      els.simarisResultLink.href = entry.url || buildWikiUrl(item);
      els.simarisResultLink.textContent = 'Open full wiki page';
    }

    var imageUrl = getItemImageUrl(item);
    if (els.simarisResultImg) {
      if (imageUrl) {
        els.simarisResultImg.src = imageUrl;
        els.simarisResultImg.alt = title;
        els.simarisResultImg.classList.remove('hidden');
      } else {
        els.simarisResultImg.removeAttribute('src');
        els.simarisResultImg.classList.add('hidden');
      }
    }

    if (els.simarisResultContent) {
      els.simarisResultContent.textContent = '';
      var source = document.createElement('div');
      source.className = 'item-info-wiki-source';
      source.textContent = 'Content from Warframe Wiki';

      var article = document.createElement('div');
      article.className = 'item-info-wiki-article simaris-article';
      article.innerHTML = entry.html || '';
      applyAppTradeStatusToWikiArticle(article, item);

      els.simarisResultContent.appendChild(source);
      els.simarisResultContent.appendChild(article);
    }

    els.simarisResult.classList.remove('hidden');
  }

  async function fetchSimarisQuery(rawQuery) {
    var query = cleanDisplayText(rawQuery);
    if (!query) {
      setSimarisStatus('error', 'error', 'Enter an item name first, Tenno.');
      return;
    }
    if (simarisFetchInProgress) return;

    simarisFetchInProgress = true;
    if (els.simarisSearchBtn) els.simarisSearchBtn.disabled = true;
    if (els.simarisResult) els.simarisResult.classList.add('hidden');
    setSimarisStatus('busy', 'sync', 'Cephalon Simaris is searching the Warframe Wiki for "' + query + '"...');

    try {
      var item = buildSimarisQueryItem(query);
      var entry = await fetchWikiArticle(item);
      if (!entry || entry.status !== 'ready') {
        throw new Error(entry && entry.message ? entry.message : 'No Warframe Wiki page was found for "' + query + '".');
      }

      renderSimarisResult(item, entry);
      setSimarisStatus('success', 'check_circle', 'Information synthesized for ' + cleanDisplayText(entry.title || item.name) + '.');
    } catch (err) {
      setSimarisStatus('error', 'error', err && err.message ? err.message : 'Simaris could not fetch that wiki entry.');
    } finally {
      simarisFetchInProgress = false;
      if (els.simarisSearchBtn) els.simarisSearchBtn.disabled = false;
    }
  }

  function openSimarisModal() {
    if (!els.simarisModal) return;
    els.simarisModal.classList.remove('hidden');
    setSimarisStatus('idle', 'psychology', 'Ask Simaris for a specific item to fetch fresh wiki information.');
    if (els.simarisQueryInput) {
      window.setTimeout(function() {
        els.simarisQueryInput.focus();
        els.simarisQueryInput.select();
      }, 40);
    }
  }

  function closeSimarisModal() {
    if (!els.simarisModal) return;
    els.simarisModal.classList.add('hidden');
  }

  function openItemInfoModal(item) {
    if (!els.itemInfoModal) return;
    syncItemInfoModalContent(item, {
      preserveActiveTab: false,
      prefetchWiki: false
    });
    els.itemInfoModal.classList.remove('hidden');
    if (tradeModeEnabled && !tradabilityEnriched) {
      var scheduleTradabilityLoad = typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback.bind(window)
        : function(callback) { return window.setTimeout(callback, 80); };
      scheduleTradabilityLoad(function() {
        ensureTradabilityLoaded(allItems).then(function(ready) {
          if (!ready) return;
          saveToCache(allItems);
          refreshCurrentItemInfoFromLatestData();
        });
      });
    }
  }

  function closeItemInfoModal() {
    if (!els.itemInfoModal) return;
    els.itemInfoModal.classList.add('hidden');
    updateItemInfoPrimeStatus(null);
    currentItemInfo = null;
    updateWikiPaneForCurrentItem();
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

  function cleanNightwaveRewardText(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeNightwaveSeriesLabel(rawTitle) {
    var cleaned = String(rawTitle || '')
      .replace(/^nightwave:\s*/i, '')
      .replace(/\s+is live!?$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return '';
    if (/^nora'?s mix/i.test(cleaned)) return cleaned;
    return 'Nora\'s Mix: ' + cleaned;
  }

  function buildNightwaveBannerSubtitle(rawTitle, nightwave) {
    var label = normalizeNightwaveSeriesLabel(rawTitle);
    if (label) return label.toUpperCase();
    if (nightwave && nightwave.season) return ('SEASON ' + String(nightwave.season)).toUpperCase();
    return 'CURRENT BROADCAST';
  }

  function getNightwaveResetTs(acts, predicate) {
    var now = Date.now();
    var target = 0;
    var list = ensureArray(acts);
    for (var i = 0; i < list.length; i++) {
      var act = list[i] || {};
      if (typeof predicate === 'function' && !predicate(act)) continue;
      var expiryTs = resolveWorldstateExpiryTs(act, now);
      if (!expiryTs || expiryTs <= now) continue;
      if (!target || expiryTs < target) target = expiryTs;
    }
    return target;
  }

  function parseNightwaveRewardEntry(text, index) {
    var clean = cleanNightwaveRewardText(text);
    var count = 0;
    var name = clean;
    var countMatch = clean.match(/^(\d+)\s*x\s+(.*)$/i);
    if (countMatch) {
      count = parseInt(countMatch[1], 10) || 0;
      name = cleanNightwaveRewardText(countMatch[2]);
    }

    var searchNames = [name];
    if (/\s+bundle$/i.test(name)) {
      searchNames.push(name.replace(/\s+bundle$/i, '').trim());
    }
    if (/slots?$/i.test(name)) {
      searchNames.push(name.replace(/slots?$/i, 'Slot').trim());
    }
    if (/forma bundle$/i.test(name)) {
      searchNames.push('Forma');
    }

    return {
      id: 'nightwave-reward-' + String(index + 1),
      raw: clean,
      name: name || clean || 'Reward',
      count: count,
      searchNames: searchNames.filter(Boolean)
    };
  }

  function findNightwaveRewardItem(reward) {
    var names = ensureArray(reward && reward.searchNames);
    var seen = Object.create(null);
    for (var i = 0; i < names.length; i++) {
      var candidate = cleanNightwaveRewardText(names[i]);
      if (!candidate) continue;
      var key = candidate.toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      var item = findItemByLooseName(candidate);
      if (item) return item;
    }
    return null;
  }

  function getNightwaveRewardPlaceholderText(name) {
    var words = cleanNightwaveRewardText(name).split(' ').filter(Boolean);
    var out = '';
    for (var i = 0; i < words.length && out.length < 2; i++) {
      var firstChar = String(words[i] || '').charAt(0).toUpperCase();
      if (/[A-Z0-9]/.test(firstChar)) out += firstChar;
    }
    return out || 'NW';
  }

  function buildNightwaveRewardCardHtml(reward) {
    var item = findNightwaveRewardItem(reward);
    var displayName = cleanNightwaveRewardText(reward && reward.name) || 'Nightwave Reward';
    var imageSources = item ? getItemImageSources(item) : { primary: '', fallback: '' };
    var metaParts = [];

    if (Number.isFinite(reward && reward.count) && reward.count > 1) {
      metaParts.push(String(reward.count) + 'x');
    }
    metaParts.push(item && item.category ? item.category : 'Tier Reward');

    var mediaHtml = imageSources.primary
      ? (
        '<div class="starchart-nightwave-reward-media">' +
          '<img class="starchart-nightwave-reward-image" src="' + escapeHtml(imageSources.primary) + '" data-primary-src="' + escapeHtml(imageSources.primary) + '"' +
            (imageSources.fallback ? ' data-fallback-src="' + escapeHtml(imageSources.fallback) + '"' : '') +
            ' data-final-src="' + escapeHtml(getChecklistImageUrl('assets/icon.png')) + '" alt="' + escapeHtml(displayName) + '">' +
        '</div>'
      )
      : ('<div class="starchart-nightwave-reward-placeholder">' + escapeHtml(getNightwaveRewardPlaceholderText(displayName)) + '</div>');

    return '' +
      '<article class="starchart-nightwave-reward-card">' +
        mediaHtml +
        '<div class="starchart-nightwave-reward-copy">' +
          '<div class="starchart-nightwave-reward-name">' + escapeHtml(displayName) + '</div>' +
          '<div class="starchart-nightwave-reward-meta">' + escapeHtml(metaParts.join(' | ')) + '</div>' +
        '</div>' +
      '</article>';
  }

  function buildNightwaveActCardHtml(act, seasonExpiryTs) {
    var title = firstNonEmptyText(act && act.title, act && act.name, act && act.desc, 'Nightwave Act');
    var description = firstNonEmptyText(act && act.desc, act && act.description, act && act.restricted, '');
    var standing = firstNonEmptyText(act && act.reputation, act && act.standing, act && act.xp, act && act.value);
    var chips = [];
    var expiryTs = resolveWorldstateExpiryTs(act, Date.now()) || seasonExpiryTs;

    if (act && act.isDaily) {
      chips.push('Daily');
    } else if (act && act.isElite) {
      chips.push('Elite');
      chips.push('Weekly');
    } else if (act && act.isPermanent) {
      chips.push('Permanent');
    } else {
      chips.push('Weekly');
    }

    var chipsHtml = '';
    for (var i = 0; i < chips.length; i++) {
      chipsHtml += '<span class="starchart-nightwave-chip">' + escapeHtml(chips[i]) + '</span>';
    }

    var timerHtml = expiryTs > 0
      ? (
        '<span class="worldstate-row-kicker">Ends In</span>' +
        '<span class="js-worldstate-timer" data-expiry-ts="' + String(Math.floor(expiryTs)) + '">' + escapeHtml(formatCountdown(expiryTs - Date.now())) + '</span>'
      )
      : (
        '<span class="worldstate-row-kicker">Series</span>' +
        '<span class="js-worldstate-timer">' + escapeHtml(firstNonEmptyText(act && act.type, 'Ongoing')) + '</span>'
      );

    return '' +
      '<article class="starchart-nightwave-act-card">' +
        '<div class="starchart-nightwave-act-top">' +
          '<h4 class="starchart-nightwave-act-title">' + escapeHtml(title) + '</h4>' +
          (standing ? ('<div class="starchart-nightwave-act-standing">' + escapeHtml(formatStandingValue(standing)) + '</div>') : '') +
        '</div>' +
        (description ? ('<div class="starchart-nightwave-act-desc">' + escapeHtml(description) + '</div>') : '') +
        '<div class="starchart-nightwave-act-meta">' +
          '<div class="starchart-nightwave-chip-row">' + chipsHtml + '</div>' +
          '<div class="starchart-nightwave-act-timer">' + timerHtml + '</div>' +
        '</div>' +
      '</article>';
  }

  function findLatestNightwaveNewsItem(newsItems) {
    var matches = ensureArray(newsItems).filter(function(entry) {
      var text = [
        firstNonEmptyText(entry && entry.message),
        firstNonEmptyText(entry && entry.title),
        firstNonEmptyText(entry && entry.link)
      ].join(' ');
      return /nightwave/i.test(text) && !!firstNonEmptyText(entry && entry.link);
    });

    matches.sort(function(a, b) {
      return toNewsTimestamp(b && b.date) - toNewsTimestamp(a && a.date);
    });

    return matches[0] || null;
  }

  function parseNightwaveArticlePayload(html, articleMeta) {
    var doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    var postBody = doc.querySelector('#post-body, .BlogPost');
    var rewardList = null;
    var rewards = [];

    if (postBody) {
      var headings = postBody.querySelectorAll('h1, h2, h3, h4, strong');
      for (var i = 0; i < headings.length; i++) {
        if (!/rewards include|rewards/i.test(cleanNightwaveRewardText(headings[i].textContent))) continue;
        var sibling = headings[i].nextElementSibling;
        while (sibling && !/^(UL|OL)$/i.test(String(sibling.tagName || ''))) {
          sibling = sibling.nextElementSibling;
        }
        if (sibling) {
          rewardList = sibling;
          break;
        }
      }

      if (!rewardList) {
        rewardList = postBody.querySelector('ul, ol');
      }
    }

    if (rewardList) {
      var rewardItems = rewardList.querySelectorAll('li');
      for (var r = 0; r < rewardItems.length; r++) {
        var rewardText = cleanNightwaveRewardText(rewardItems[r].textContent);
        if (!rewardText) continue;
        rewards.push(parseNightwaveRewardEntry(rewardText, rewards.length));
      }
    }

    return {
      articleUrl: firstNonEmptyText(articleMeta && articleMeta.link),
      title: firstNonEmptyText(doc.querySelector('.ArticleHeader-title') && doc.querySelector('.ArticleHeader-title').textContent, articleMeta && articleMeta.message, articleMeta && articleMeta.title, 'Nightwave'),
      subtitle: firstNonEmptyText(doc.querySelector('.ArticleHeader-description') && doc.querySelector('.ArticleHeader-description').textContent, 'Current acts and reward track.'),
      heroImage: firstNonEmptyText(doc.querySelector('.post-image') && doc.querySelector('.post-image').getAttribute('src'), articleMeta && articleMeta.imageLink),
      rewards: rewards
    };
  }

  async function ensureNightwaveArticleData(force) {
    var shouldForce = force === true;
    if (!shouldForce && nightwaveArticlePayload && (Date.now() - nightwaveArticleFetchedAt) < NIGHTWAVE_ARTICLE_REFRESH_TTL) {
      return nightwaveArticlePayload;
    }
    if (nightwaveArticlePromise) {
      return nightwaveArticlePromise;
    }

    nightwaveArticlePromise = (async function() {
      try {
        var newsResp = await fetch(WARFRAME_NEWS_API + '?_ts=' + Date.now(), { cache: 'no-store' });
        if (!newsResp.ok) throw new Error('Nightwave news feed is unavailable.');

        var newsItems = await newsResp.json();
        var articleMeta = findLatestNightwaveNewsItem(newsItems);
        if (!articleMeta) throw new Error('Nightwave article is unavailable.');

        if (
          !shouldForce &&
          nightwaveArticlePayload &&
          nightwaveArticlePayload.articleUrl === firstNonEmptyText(articleMeta.link) &&
          (Date.now() - nightwaveArticleFetchedAt) < (NIGHTWAVE_ARTICLE_REFRESH_TTL * 3)
        ) {
          return nightwaveArticlePayload;
        }

        var articleResp = await fetch(firstNonEmptyText(articleMeta.link), { cache: 'no-store' });
        if (!articleResp.ok) throw new Error('Nightwave article failed to load.');

        var articleHtml = await articleResp.text();
        nightwaveArticlePayload = parseNightwaveArticlePayload(articleHtml, articleMeta);
        nightwaveArticleFetchedAt = Date.now();
        return nightwaveArticlePayload;
      } catch (err) {
        if (nightwaveArticlePayload) return nightwaveArticlePayload;
        throw err;
      } finally {
        nightwaveArticlePromise = null;
      }
    })();

    return nightwaveArticlePromise;
  }

  function setNightwaveStatContent(node, targetTs, fallbackText) {
    if (!node) return;
    if (Number.isFinite(targetTs) && targetTs > 0) {
      node.innerHTML = '<span class="js-worldstate-timer" data-expiry-ts="' + String(Math.floor(targetTs)) + '">' + escapeHtml(formatCountdown(targetTs - Date.now())) + '</span>';
      return;
    }
    node.textContent = fallbackText || '--';
  }

  function syncStarchartNightwaveBanner(nightwave, article) {
    if (els.starchartNightwaveBannerLabel) {
      els.starchartNightwaveBannerLabel.textContent = 'NIGHTWAVE';
    }
    if (els.starchartNightwaveBannerSub) {
      els.starchartNightwaveBannerSub.textContent = buildNightwaveBannerSubtitle(firstNonEmptyText(article && article.title), nightwave);
    }
  }

  function renderStarchartNightwavePanel(options) {
    var loading = !!(options && options.loading);
    var worldstate = cycleSnapshot && cycleSnapshot.worldstate ? cycleSnapshot.worldstate : null;
    var nightwave = worldstate && worldstate.nightwave ? worldstate.nightwave : null;
    var article = nightwaveArticlePayload;
    var panelSubtitle = firstNonEmptyText(article && article.subtitle, 'Current acts, reward track, and rollover timers.');
    var seasonTitle = normalizeNightwaveSeriesLabel(firstNonEmptyText(article && article.title));

    syncStarchartNightwaveBanner(nightwave, article);

    if (!els.starchartNightwavePanel) return;

    if (els.starchartNightwaveTitle) {
      els.starchartNightwaveTitle.textContent = seasonTitle || (nightwave && nightwave.season ? ('Nightwave Season ' + String(nightwave.season)) : 'Nightwave');
    }
    if (els.starchartNightwaveSubtitle) {
      els.starchartNightwaveSubtitle.textContent = nightwavePanelError || panelSubtitle;
    }

    if (!nightwave) {
      if (els.starchartNightwaveActsCount) els.starchartNightwaveActsCount.textContent = '--';
      setNightwaveStatContent(els.starchartNightwaveDailyReset, 0, loading || cycleRefreshInProgress ? 'Loading...' : '--');
      setNightwaveStatContent(els.starchartNightwaveWeeklyReset, 0, loading || cycleRefreshInProgress ? 'Loading...' : '--');
      setNightwaveStatContent(els.starchartNightwaveSeasonEnd, 0, loading || cycleRefreshInProgress ? 'Loading...' : '--');

      if (els.starchartNightwaveActs) {
        els.starchartNightwaveActs.innerHTML = '<div class="starchart-nightwave-empty">' + escapeHtml(nightwavePanelError || (loading || cycleRefreshInProgress ? 'Loading live Nightwave acts...' : 'Nightwave data is unavailable right now.')) + '</div>';
      }
      if (els.starchartNightwaveRewards) {
        if (article && Array.isArray(article.rewards) && article.rewards.length > 0) {
          els.starchartNightwaveRewards.innerHTML = article.rewards.map(buildNightwaveRewardCardHtml).join('');
          hydrateManagedImageFallbacks(els.starchartNightwaveRewards);
        } else {
          els.starchartNightwaveRewards.innerHTML = '<div class="starchart-nightwave-empty">' + escapeHtml(nightwaveArticlePromise ? 'Loading current reward track...' : 'Reward images and names are unavailable right now.') + '</div>';
        }
      }

      updateWorldstateTimers();
      return;
    }

    var acts = ensureArray(nightwave.acts).filter(function(entry) {
      return entry && entry.active !== false;
    });
    var seasonExpiryTs = toNewsTimestamp(nightwave.expiry);
    var dailyResetTs = getNightwaveResetTs(acts, function(act) { return !!(act && act.isDaily); });
    var weeklyResetTs = getNightwaveResetTs(acts, function(act) { return !!(act && !act.isDaily); });

    if (els.starchartNightwaveActsCount) {
      els.starchartNightwaveActsCount.textContent = String(acts.length);
    }
    setNightwaveStatContent(els.starchartNightwaveDailyReset, dailyResetTs, acts.some(function(act) { return !!(act && act.isDaily); }) ? '--' : 'No dailies');
    setNightwaveStatContent(els.starchartNightwaveWeeklyReset, weeklyResetTs, acts.some(function(act) { return !!(act && !act.isDaily); }) ? '--' : 'No weeklies');
    setNightwaveStatContent(els.starchartNightwaveSeasonEnd, seasonExpiryTs, firstNonEmptyText(nightwave.expiry, '--'));

    if (els.starchartNightwaveActs) {
      els.starchartNightwaveActs.innerHTML = acts.length > 0
        ? acts.map(function(act) { return buildNightwaveActCardHtml(act, seasonExpiryTs); }).join('')
        : '<div class="starchart-nightwave-empty">No Nightwave acts are active right now.</div>';
    }

    if (els.starchartNightwaveRewards) {
      if (article && Array.isArray(article.rewards) && article.rewards.length > 0) {
        els.starchartNightwaveRewards.innerHTML = article.rewards.map(buildNightwaveRewardCardHtml).join('');
        hydrateManagedImageFallbacks(els.starchartNightwaveRewards);
      } else {
        els.starchartNightwaveRewards.innerHTML = '<div class="starchart-nightwave-empty">' + escapeHtml(nightwaveArticlePromise ? 'Loading current reward track...' : 'Reward images and names are unavailable right now.') + '</div>';
      }
    }

    updateWorldstateTimers();
  }

  function isStarchartNightwaveOpen() {
    return !!(els.starchartNightwavePanel && !els.starchartNightwavePanel.classList.contains('hidden'));
  }

  function openStarchartNightwavePanel() {
    if (!els.starchartNightwavePanel) return;
    nightwavePanelError = '';
    els.starchartNightwavePanel.classList.remove('hidden');
    els.starchartNightwavePanel.setAttribute('aria-hidden', 'false');
    if (els.starchartNightwaveBanner) {
      els.starchartNightwaveBanner.classList.add('active');
      els.starchartNightwaveBanner.setAttribute('aria-expanded', 'true');
    }

    renderStarchartNightwavePanel({ loading: !cycleSnapshot || !cycleSnapshot.worldstate });
    loadCycles();
    ensureNightwaveArticleData(false).then(function() {
      renderStarchartNightwavePanel();
    }).catch(function() {
      renderStarchartNightwavePanel();
    });
  }

  function closeStarchartNightwavePanel(stopTimers) {
    if (els.starchartNightwavePanel) {
      els.starchartNightwavePanel.classList.add('hidden');
      els.starchartNightwavePanel.setAttribute('aria-hidden', 'true');
    }
    if (els.starchartNightwaveBanner) {
      els.starchartNightwaveBanner.classList.remove('active');
      els.starchartNightwaveBanner.setAttribute('aria-expanded', 'false');
    }
    if (stopTimers !== false && getCurrentPanelName() !== 'cycles') {
      stopCycleCountdown();
    }
  }

  function toggleStarchartNightwavePanel() {
    if (isStarchartNightwaveOpen()) {
      closeStarchartNightwavePanel(true);
      return;
    }
    openStarchartNightwavePanel();
  }

  function updateWorldstateTimers() {
    if (!document || typeof document.querySelectorAll !== 'function') return false;
    var hasExpired = false;
    document.querySelectorAll('.js-worldstate-timer[data-expiry-ts]').forEach(function(node) {
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
    return 'Ends in ' + remainingText + ' - Expires ' + expiryText;
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
    return 'Ends in ' + remainingText + ' - Expires ' + expiryText;
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
      var imageSources = getItemImageSources(item);

      var card = document.createElement('article');
      card.className = 'cycle-item-card';

      var img = document.createElement('img');
      img.className = 'cycle-item-image';
      if (opts.preferIncarnon) img.classList.add('incarnon-image');
      img.alt = displayName;
      img.loading = 'lazy';
      bindImageFallback(img, imageSources, function() {
        img.src = getChecklistImageUrl('assets/icon.png');
      });

      var textWrap = document.createElement('div');

      var nameEl = document.createElement('div');
      nameEl.className = 'cycle-item-name';
      nameEl.textContent = opts.preferIncarnon ? (displayName + ' Incarnon') : displayName;

      var noteEl = document.createElement('div');
      noteEl.className = 'cycle-item-note';
      noteEl.textContent = opts.preferIncarnon ? ('Incarnon form - ' + noteText) : noteText;

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
      nightwavePanelError = '';
      renderStarchartNightwavePanel();
      if (isStarchartNightwaveOpen()) {
        ensureNightwaveArticleData(false).then(function() {
          renderStarchartNightwavePanel();
        }).catch(function() {
          renderStarchartNightwavePanel();
        });
      }

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
      nightwavePanelError = 'Unable to load live Nightwave data right now.';
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
      renderStarchartNightwavePanel();
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
    var uniqueName = String(item && item.uniqueName ? item.uniqueName : '').toLowerCase();
    var productCategory = String(item && item.productCategory ? item.productCategory : '').toLowerCase();
    return !!NECRAMECH_NAMES[name] ||
      name.indexOf('necramech') !== -1 ||
      productCategory === 'mechsuits' ||
      uniqueName.indexOf('/entrati') !== -1 && uniqueName.indexOf('mech') !== -1;
  }

  function isKuvaTenetCodaWeapon(item) {
    var name = String(item && item.name ? item.name : '').toLowerCase();
    var category = String(item && item.category ? item.category : '').toLowerCase();
    var hasPrefix = name.indexOf('kuva ') === 0 || name.indexOf('tenet ') === 0 || name.indexOf('coda ') === 0;
    var isWeaponCategory = category === 'primary' || category === 'secondary' || category === 'melee' || category === 'vehicles';
    return hasPrefix && isWeaponCategory;
  }

  function normalizeApiItems(data) {
    return applyChecklistItemPatches(
      data
        .filter(function(item) { return item.masterable === true || item.category === 'Mods' || isMasterableAmpItem(item) || isProfileMasterableException(item); })
        .map(normalizeItem)
        .filter(function(item) { return !!item.uniqueName && !!item.name; })
    );
  }

  async function fetchMarketChecklistSupplements() {
    var response = await fetch(MARKET_ITEMS_API_URL);
    if (!response.ok) throw new Error('HTTP ' + response.status);

    var json = await response.json();
    var data = Array.isArray(json && json.data) ? json.data : [];

    return data
      .filter(function(entry) {
        var tags = Array.isArray(entry && entry.tags)
          ? entry.tags.map(function(tag) { return String(tag || '').trim().toLowerCase(); }).filter(Boolean)
          : [];
        var hasCategory = !!normalizeMarketChecklistCategory(tags);
        var isSetEntry = tags.indexOf('set') !== -1;
        var isDirectMasteryItem =
          tags.indexOf('mod') === -1 &&
          tags.indexOf('riven') === -1 &&
          tags.indexOf('arcane') === -1 &&
          tags.indexOf('imprint') === -1 &&
          tags.indexOf('part') === -1 &&
          tags.indexOf('blueprint') === -1 &&
          tags.indexOf('recipe') === -1 &&
          tags.indexOf('component') === -1;
        return hasCategory && (isSetEntry || isDirectMasteryItem);
      })
      .map(normalizeMarketChecklistItem)
      .filter(Boolean);
  }

  async function fetchLatestItemsFromApi() {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    return normalizeApiItems(data);
  }

  function areItemsEquivalent(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;

    for (var i = 0; i < left.length; i++) {
      var a = left[i] || {};
      var b = right[i] || {};
      if (a.uniqueName !== b.uniqueName) return false;
      if (a.name !== b.name) return false;
      if (a.category !== b.category) return false;
      if (a.type !== b.type) return false;
      if (!!a.tradable !== !!b.tradable) return false;
      if (!!a.isPrime !== !!b.isPrime) return false;
      if (!!a.vaulted !== !!b.vaulted) return false;
      if (!!a.hasVaultedStatus !== !!b.hasVaultedStatus) return false;
      if ((a.imageName || '') !== (b.imageName || '')) return false;
      if ((a.description || '') !== (b.description || '')) return false;
      if ((a.masteryReq || 0) !== (b.masteryReq || 0)) return false;
      if ((a.maxLevelCap || 0) !== (b.maxLevelCap || 0)) return false;
      if (!!a.profileOnly !== !!b.profileOnly) return false;
      if (!!a.syncOptional !== !!b.syncOptional) return false;
    }

    return true;
  }

  function applyLatestItems(items, initialLoad) {
    var changed = !areItemsEquivalent(allItems, items);
    tradabilityPromise = null;
    tradabilityEnriched = false;
    allItems = items;
    saveToCache(allItems);
    if (!initialLoad) {
      reconcileMasteryProgressWithItems();
    }

    if (initialLoad) {
      onItemsLoaded();
      return;
    }

    refreshCurrentItemInfoFromLatestData();

    if (!changed) return;
    updateCounts();
    applyFilters();
    updateStats();
    renderStarchartNightwavePanel();
  }

  async function refreshItemsInBackground(force) {
    var shouldForce = force === true;
    if (itemsRefreshInProgress) return false;
    if (!shouldForce && lastItemsRefreshAt && (Date.now() - lastItemsRefreshAt) < ITEMS_BACKGROUND_REFRESH_MIN_GAP_MS) {
      return false;
    }

    itemsRefreshInProgress = true;
    try {
      var latestItems = await fetchLatestItemsFromApi();
      applyLatestItems(latestItems, false);
      lastItemsRefreshAt = Date.now();
      return true;
    } catch (err) {
      console.warn('Background item refresh failed:', err);
      return false;
    } finally {
      itemsRefreshInProgress = false;
    }
  }

  function handleItemsAutoRefreshWake() {
    refreshItemsInBackground(false);
  }

  function initItemsAutoRefresh() {
    if (itemsAutoRefreshInitialized) return;
    itemsAutoRefreshInitialized = true;

    itemsRefreshInterval = window.setInterval(function() {
      refreshItemsInBackground(false);
    }, ITEMS_BACKGROUND_REFRESH_INTERVAL_MS);

    window.addEventListener('focus', handleItemsAutoRefreshWake);
    window.addEventListener('online', handleItemsAutoRefreshWake);
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) return;
      handleItemsAutoRefreshWake();
    });
  }

  function getItemMaxRank(item) {
    if (!item || item.category === 'Mods' || item.profileOnly) return 0;

    var apiCap = normalizeMaxLevelCap(item);
    if (apiCap > 0) return apiCap;

    if (isNecramechItem(item)) return 40;
    if (isKuvaTenetCodaWeapon(item)) return 40;
    if (toLookupKey(item.name) === 'paracesis') return 40;
    return 30;
  }

  function getItemXpPerRank(item) {
    var type = String(item.type || '').toLowerCase();
    if (item.category === 'Mods' || item.profileOnly) return 0;
    if (isSentinelWeaponItem(item)) return 100;
    if (item.category === 'Archgun' || item.category === 'Archmelee' || type.indexOf('arch-gun') !== -1 || type.indexOf('arch-melee') !== -1) return 100;
    if (item.category === 'Warframes') return 200;
    if (item.category === 'Companions' || item.category === 'Pets') return 200;
    if (item.category === 'Robotic') return 200;
    if (item.category === 'Vehicles') return 200;
    return 100;
  }

  function getItemAffinityPerRankSquared(item) {
    return getItemXpPerRank(item) * 5;
  }

  function getItemAffinityForRank(item, rank) {
    var maxRank = getItemMaxRank(item);
    var safeRank = clampWholeNumber(rank, 0, maxRank);
    return getItemAffinityPerRankSquared(item) * safeRank * safeRank;
  }

  function getItemXP(item) {
    var maxRank = getItemMaxRank(item);
    var xpPerRank = getItemXpPerRank(item);
    if (maxRank <= 0 || xpPerRank <= 0) return 0;
    return maxRank * xpPerRank;
  }

  function isMasteryRelevantItem(item) {
    return !!item && item.category !== 'Mods' && item.masterable === true;
  }

  // ---------- Data Loading ----------
  async function loadItems() {
    const cached = loadFromCache();
    if (cached) {
      allItems = cached;
      tradabilityPromise = null;
      tradabilityEnriched = false;
      saveToCache(allItems);
      onItemsLoaded();
      refreshItemsInBackground();
      return;
    }

    try {
      const latestItems = await fetchLatestItemsFromApi();
      lastItemsRefreshAt = Date.now();
      applyLatestItems(latestItems, true);
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
      var migrated = applyChecklistItemPatches(
        cached.items.map(normalizeItem).filter(function(item) {
          return !!item.uniqueName && !!item.name;
        })
      );
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
    migrateRemovedProfileStorage(ITEM_LEVELS_STORAGE_KEY);
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

  function getNormalStarChartXpCap() {
    return NORMAL_STAR_CHART_XP_MAX;
  }

  function getSteelPathXpCap() {
    return STEEL_PATH_XP_MAX;
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

  function findChecklistItemByUniqueName(uniqueName) {
    var key = String(uniqueName || '');
    if (!key) return null;
    for (var i = 0; i < allItems.length; i++) {
      if (allItems[i] && allItems[i].uniqueName === key) return allItems[i];
    }
    return null;
  }

  function getStoredItemRank(item) {
    if (!item || !item.uniqueName) return 0;
    if (item.category === 'Mods') return masteredSet.has(item.uniqueName) ? 1 : 0;

    var maxRank = getItemMaxRank(item);
    if (maxRank <= 0) return masteredSet.has(item.uniqueName) ? 1 : 0;
    var hasStoredRank = Object.prototype.hasOwnProperty.call(itemLevelMap, item.uniqueName);
    if (!hasStoredRank && masteredSet.has(item.uniqueName)) return maxRank;

    return clampWholeNumber(itemLevelMap[item.uniqueName], 0, maxRank);
  }

  function getTrackedItemXp(item) {
    if (!isMasteryRelevantItem(item)) return 0;
    var maxXp = getItemXP(item);
    var rank = getStoredItemRank(item);
    var xpPerRank = getItemXpPerRank(item);
    return Math.min(maxXp, Math.max(0, rank * xpPerRank));
  }

  function isItemFullyRanked(item) {
    if (!item || !item.uniqueName) return false;
    if (item.category === 'Mods') return masteredSet.has(item.uniqueName);
    var maxRank = getItemMaxRank(item);
    if (maxRank <= 0) return masteredSet.has(item.uniqueName);
    return maxRank > 0 && getStoredItemRank(item) >= maxRank;
  }

  function setItemRank(item, rank) {
    if (!item || !item.uniqueName) return false;

    if (item.category === 'Mods') {
      var shouldOwn = Number(rank) > 0;
      var wasOwned = masteredSet.has(item.uniqueName);
      if (shouldOwn) {
        masteredSet.add(item.uniqueName);
      } else {
        masteredSet.delete(item.uniqueName);
      }
      return shouldOwn !== wasOwned;
    }

    var maxRank = getItemMaxRank(item);
    if (maxRank <= 0) {
      var shouldMark = Number(rank) > 0;
      var wasMarked = masteredSet.has(item.uniqueName);
      if (shouldMark) {
        masteredSet.add(item.uniqueName);
      } else {
        masteredSet.delete(item.uniqueName);
      }
      delete itemLevelMap[item.uniqueName];
      return shouldMark !== wasMarked;
    }

    var nextRank = clampWholeNumber(rank, 0, maxRank);
    var previousRank = getStoredItemRank(item);
    if (nextRank === previousRank) return false;

    if (nextRank > 0) {
      itemLevelMap[item.uniqueName] = nextRank;
    } else {
      delete itemLevelMap[item.uniqueName];
    }

    if (nextRank >= maxRank) {
      masteredSet.add(item.uniqueName);
    } else {
      masteredSet.delete(item.uniqueName);
    }

    return true;
  }

  function setItemRankByUniqueName(uniqueName, rank) {
    var item = findChecklistItemByUniqueName(uniqueName);
    return setItemRank(item, rank);
  }

  function saveItemLevels() {
    var compact = Object.create(null);
    Object.keys(itemLevelMap).forEach(function(uniqueName) {
      var item = findChecklistItemByUniqueName(uniqueName);
      if (!item || item.category === 'Mods') return;
      var rank = clampWholeNumber(itemLevelMap[uniqueName], 0, getItemMaxRank(item));
      if (rank > 0) compact[uniqueName] = rank;
    });
    itemLevelMap = compact;
    localStorage.setItem(ITEM_LEVELS_STORAGE_KEY, JSON.stringify(compact));
  }

  function saveMasteryProgress() {
    saveItemLevels();
    saveMastered();
  }

  function reconcileMasteryProgressWithItems() {
    var changed = false;

    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i];
      if (!item || !item.uniqueName || item.category === 'Mods') continue;

      var maxRank = getItemMaxRank(item);
      if (maxRank <= 0) {
        if (Object.prototype.hasOwnProperty.call(itemLevelMap, item.uniqueName)) {
          delete itemLevelMap[item.uniqueName];
          changed = true;
        }
        continue;
      }

      var hasStoredRank = Object.prototype.hasOwnProperty.call(itemLevelMap, item.uniqueName);
      if (!hasStoredRank && masteredSet.has(item.uniqueName)) {
        itemLevelMap[item.uniqueName] = maxRank;
        changed = true;
      }

      var rank = clampWholeNumber(itemLevelMap[item.uniqueName], 0, maxRank);
      if (rank > 0 && rank !== itemLevelMap[item.uniqueName]) {
        itemLevelMap[item.uniqueName] = rank;
        changed = true;
      } else if (rank <= 0 && hasStoredRank) {
        delete itemLevelMap[item.uniqueName];
        changed = true;
      }

      if (rank >= maxRank) {
        if (!masteredSet.has(item.uniqueName)) {
          masteredSet.add(item.uniqueName);
          changed = true;
        }
      } else if (masteredSet.delete(item.uniqueName)) {
        changed = true;
      }
    }

    if (changed) saveMasteryProgress();
  }

  function getTrackedItemMasteryXp() {
    var totalXP = 0;
    for (var i = 0; i < allItems.length; i++) {
      if (!isMasteryRelevantItem(allItems[i])) continue;
      totalXP += getTrackedItemXp(allItems[i]);
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

  function loadItemLevels() {
    itemLevelMap = Object.create(null);
    try {
      var raw = localStorage.getItem(ITEM_LEVELS_STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;

      Object.keys(parsed).forEach(function(uniqueName) {
        var rank = Number(parsed[uniqueName]);
        if (Number.isFinite(rank) && rank > 0) {
          itemLevelMap[uniqueName] = Math.floor(rank);
        }
      });
    } catch (e) {
      itemLevelMap = Object.create(null);
    }
  }

  function toggleMastered(uniqueName) {
    var item = findChecklistItemByUniqueName(uniqueName);
    if (!item) return;

    if (item.category === 'Mods') {
      setItemRank(item, masteredSet.has(uniqueName) ? 0 : 1);
    } else {
      var maxRank = getItemMaxRank(item);
      setItemRank(item, isItemFullyRanked(item) ? 0 : (maxRank > 0 ? maxRank : 1));
    }

    saveMasteryProgress();
    updateStats();
  }

  // ---------- Item Rendering ----------
  function onItemsLoaded() {
    els.loadingContainer.classList.add('hidden');
    loadBuilds();
    loadMastered();
    loadItemLevels();
    reconcileMasteryProgressWithItems();
    loadMasteryExtras();
    updateCounts();
    applyFilters();
    updateStats();
    renderStarchartNightwavePanel();
    initItemsAutoRefresh();
    initProfileAutoSync();
  }

  function applyFilters() {
    var normalizedSearchQuery = normalizeSearchText(searchQuery);

    filteredItems = allItems.filter(function(item) {
      if (currentCategory === 'all' && item.category === 'Mods') return false;
      if (currentCategory !== 'all' && item.category !== currentCategory) return false;
      if (currentFilter === 'mastered' && !isItemFullyRanked(item)) return false;
      if (currentFilter === 'unmastered' && isItemFullyRanked(item)) return false;
      if (normalizedSearchQuery && normalizeSearchText(item.name).indexOf(normalizedSearchQuery) === -1) return false;
      return true;
    });

    allVisibleCount = ALL_ITEMS_RENDER_BATCH_SIZE;
    modVisibleCount = MOD_RENDER_BATCH_SIZE;
    renderItems();
  }

  function getModRarityClass(rarity) {
    var r = String(rarity || '').toLowerCase().trim();
    if (r === 'rare') return 'mod-rarity-rare';
    if (r === 'uncommon') return 'mod-rarity-uncommon';
    if (r === 'common') return 'mod-rarity-common';
    if (r === 'legendary') return 'mod-rarity-legendary';
    if (r.indexOf('amalgam') !== -1) return 'mod-rarity-amalgam';
    return 'mod-rarity-common';
  }

  function getPolaritySymbol(polarity) {
    var p = String(polarity || '').toLowerCase().trim();
    var symbols = {
      'madurai': 'V',
      'vazarin': 'D',
      'naramon': '-',
      'zenurik': '=',
      'unairu': 'U',
      'penjaga': 'Y',
      'umbra': 'W'
    };
    return symbols[p] || '';
  }

  function classifyModStat(text) {
    var t = String(text || '').trim();
    if (!t) return 'neutral';
    if (/^[+]/.test(t)) return 'buff';
    if (/^[-]/.test(t) || /^−/.test(t)) return 'nerf';
    // Check for negative values embedded in text
    if (/\-\d/.test(t) || /−\d/.test(t)) return 'nerf';
    if (/\+\d/.test(t)) return 'buff';
    return 'neutral';
  }

  function buildModCard(item) {
    var rarityClass = getModRarityClass(item.rarity);
    var polaritySymbol = getPolaritySymbol(item.polarity);
    var fusionLimit = item.fusionLimit || 0;
    var drain = item.baseDrain || 0;
    var compatName = item.compatName || '';

    // Get max-rank stats
    var maxRankStats = [];
    var maxRankLabel = 'Rank 0';
    if (Array.isArray(item.levelStats) && item.levelStats.length > 0) {
      var lastRank = item.levelStats[item.levelStats.length - 1];
      if (lastRank && Array.isArray(lastRank.stats)) {
        maxRankStats = lastRank.stats;
      }
      maxRankLabel = 'Rank ' + (item.levelStats.length - 1);
    }

    var modCard = document.createElement('div');
    modCard.className = 'mod-card ' + rarityClass;

    // Image wrap
    var imgWrap = document.createElement('div');
    imgWrap.className = 'mod-card-img-wrap';

    // Use wikiaThumbnail as primary (direct mod card image from wiki), CDN as fallback
    var primaryImgSrc = item.imageName ? getChecklistImageUrl(item.imageName) : '';
    var fallbackImgSrc = item.wikiaThumbnail ? getChecklistImageUrl(item.wikiaThumbnail) : '';
    if (primaryImgSrc && fallbackImgSrc && primaryImgSrc === fallbackImgSrc) {
      fallbackImgSrc = '';
    }
    var hasAnySrc = !!(primaryImgSrc || fallbackImgSrc);

    if (hasAnySrc) {
      var img = document.createElement('img');
      img.src = primaryImgSrc || fallbackImgSrc;
      img.alt = item.name;
      img.loading = 'lazy';
      img.addEventListener('error', function() {
        // Try fallback if primary failed
        if (img.src !== fallbackImgSrc && fallbackImgSrc) {
          img.src = fallbackImgSrc;
        } else {
          img.style.display = 'none';
          var ph = imgWrap.querySelector('.placeholder-icon');
          if (ph) ph.style.display = 'block';
        }
      });
      imgWrap.appendChild(img);
    }

    var placeholder = document.createElement('span');
    placeholder.className = 'material-icons-round placeholder-icon';
    placeholder.textContent = 'auto_awesome';
    if (hasAnySrc) placeholder.style.display = 'none';
    imgWrap.appendChild(placeholder);

    // Drain badge
    if (drain > 0) {
      var drainEl = document.createElement('span');
      drainEl.className = 'mod-card-drain';
      drainEl.textContent = drain;
      imgWrap.appendChild(drainEl);
    }

    // Polarity badge
    if (polaritySymbol) {
      var polEl = document.createElement('span');
      polEl.className = 'mod-card-polarity';
      polEl.textContent = polaritySymbol;
      polEl.title = item.polarity || '';
      imgWrap.appendChild(polEl);
    }

    // Rank badge
    if (fusionLimit > 0) {
      var rankBadge = document.createElement('span');
      rankBadge.className = 'mod-card-rank-badge';
      rankBadge.textContent = fusionLimit + '^';
      imgWrap.appendChild(rankBadge);
    }

    // Owned badge
    var ownedBadge = document.createElement('span');
    ownedBadge.className = 'mod-card-owned-badge';
    ownedBadge.textContent = 'OWNED';
    imgWrap.appendChild(ownedBadge);

    modCard.appendChild(imgWrap);

    // Bottom section (name + pips)
    var bottom = document.createElement('div');
    bottom.className = 'mod-card-bottom';

    var nameEl = document.createElement('div');
    nameEl.className = 'mod-card-name';
    nameEl.textContent = item.name;
    nameEl.title = item.name;
    bottom.appendChild(nameEl);

    // Compat label
    if (compatName) {
      var compatEl = document.createElement('div');
      compatEl.className = 'mod-card-compat';
      compatEl.textContent = compatName;
      bottom.appendChild(compatEl);
    }

    // Rank pips
    if (fusionLimit > 0) {
      var pipsRow = document.createElement('div');
      pipsRow.className = 'mod-card-pips';
      for (var p = 0; p < fusionLimit; p++) {
        var pip = document.createElement('span');
        pip.className = 'mod-card-pip filled';
        pipsRow.appendChild(pip);
      }
      bottom.appendChild(pipsRow);
    }

    modCard.appendChild(bottom);

    // Check overlay
    var checkOverlay = document.createElement('div');
    checkOverlay.className = 'mod-card-check';
    var checkIcon = document.createElement('span');
    checkIcon.className = 'material-icons-round';
    checkIcon.textContent = 'check';
    checkOverlay.appendChild(checkIcon);
    modCard.appendChild(checkOverlay);

    // Hover tooltip
    if (maxRankStats.length > 0 || compatName) {
      var tooltip = document.createElement('div');
      tooltip.className = 'mod-card-tooltip';

      var ttTitle = document.createElement('div');
      ttTitle.className = 'mod-card-tooltip-title';
      ttTitle.textContent = item.name;
      tooltip.appendChild(ttTitle);

      // Meta row (rarity + rank)
      var meta = document.createElement('div');
      meta.className = 'mod-card-tooltip-meta';

      var raritySpan = document.createElement('span');
      raritySpan.textContent = item.rarity || 'Mod';
      meta.appendChild(raritySpan);

      if (fusionLimit > 0) {
        var rankSpan = document.createElement('span');
        rankSpan.className = 'mod-card-tooltip-rank';
        rankSpan.textContent = maxRankLabel;
        meta.appendChild(rankSpan);
      }

      tooltip.appendChild(meta);

      // Stats
      if (maxRankStats.length > 0) {
        var statsDiv = document.createElement('div');
        statsDiv.className = 'mod-card-tooltip-stats';

        for (var s = 0; s < maxRankStats.length; s++) {
          var statText = String(maxRankStats[s] || '').trim();
          if (!statText) continue;
          var statEl = document.createElement('div');
          statEl.className = 'mod-card-stat ' + classifyModStat(statText);
          statEl.textContent = statText;
          statsDiv.appendChild(statEl);
        }

        tooltip.appendChild(statsDiv);
      }

      // Compat footer
      if (compatName) {
        var compatFooter = document.createElement('div');
        compatFooter.className = 'mod-card-tooltip-compat';
        compatFooter.textContent = compatName;
        tooltip.appendChild(compatFooter);
      }

      modCard.appendChild(tooltip);
    }

    // Click on image opens item info
    imgWrap.title = 'Open mod details';
    imgWrap.addEventListener('click', function(e) {
      e.stopPropagation();
      openItemInfoModal(item);
    });

    return modCard;
  }

  function getModernPolaritySymbol(polarity) {
    var key = String(polarity || '').trim().toLowerCase();
    var symbols = {
      'madurai': 'V',
      'vazarin': 'D',
      'naramon': '-',
      'zenurik': '=',
      'unairu': 'U',
      'penjaga': 'Y',
      'umbra': 'W'
    };
    return symbols[key] || '';
  }

  function getModernPolarityLabel(polarity) {
    var raw = String(polarity || '').trim().toLowerCase();
    if (!raw) return '';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  function buildModernModCard(item) {
    var rarityClass = getModRarityClass(item.rarity);
    var polaritySymbol = getModernPolaritySymbol(item.polarity);
    var fusionLimit = item.fusionLimit || 0;
    var compatName = String(item.compatName || item.type || 'Mod').trim();
    var primaryImgSrc = getItemImageUrl(item);
    var fallbackImgSrc = '';

    function appendArtwork(container, imageClass, placeholderClass, placeholderIcon) {
      var hasAnySrc = !!(primaryImgSrc || fallbackImgSrc);

      if (hasAnySrc) {
        var img = document.createElement('img');
        img.className = imageClass || '';
        img.src = primaryImgSrc || fallbackImgSrc;
        img.alt = item.name || 'Mod artwork';
        img.loading = 'lazy';
        img.addEventListener('error', function() {
          if (img.src !== fallbackImgSrc && fallbackImgSrc) {
            img.src = fallbackImgSrc;
          } else {
            img.style.display = 'none';
            var ph = container.querySelector('.' + placeholderClass);
            if (ph) ph.style.display = 'flex';
          }
        });
        container.appendChild(img);
      }

      var placeholder = document.createElement('span');
      placeholder.className = 'material-icons-round ' + placeholderClass;
      placeholder.textContent = placeholderIcon || 'auto_awesome';
      if (hasAnySrc) placeholder.style.display = 'none';
      container.appendChild(placeholder);
    }

    var modCard = document.createElement('div');
    modCard.className = 'mod-card mod-card-modern ' + rarityClass;

    var front = document.createElement('div');
    front.className = 'mod-card-front';

    var topRow = document.createElement('div');
    topRow.className = 'mod-card-top-row';

    var badges = document.createElement('div');
    badges.className = 'mod-card-badges';

    if (polaritySymbol) {
      var polarityBadge = document.createElement('span');
      polarityBadge.className = 'mod-card-polarity';
      polarityBadge.title = getModernPolarityLabel(item.polarity) || '';

      var glyph = document.createElement('span');
      glyph.className = 'mod-card-polarity-glyph';
      glyph.textContent = polaritySymbol;
      polarityBadge.appendChild(glyph);

      badges.appendChild(polarityBadge);
    }

    topRow.appendChild(badges);
    front.appendChild(topRow);

    var ownedBadge = document.createElement('span');
    ownedBadge.className = 'mod-card-owned-badge';
    ownedBadge.textContent = 'OWNED';
    front.appendChild(ownedBadge);

    var imgWrap = document.createElement('div');
    imgWrap.className = 'mod-card-img-wrap';
    appendArtwork(imgWrap, 'mod-card-art', 'mod-card-art-placeholder', 'shield_moon');
    imgWrap.title = 'Open mod details';
    imgWrap.addEventListener('click', function(e) {
      e.stopPropagation();
      openItemInfoModal(item);
    });
    front.appendChild(imgWrap);

    var bottom = document.createElement('div');
    bottom.className = 'mod-card-bottom';

    var nameEl = document.createElement('div');
    nameEl.className = 'mod-card-name';
    nameEl.textContent = item.name;
    nameEl.title = item.name;
    bottom.appendChild(nameEl);

    if (compatName) {
      var compatEl = document.createElement('div');
      compatEl.className = 'mod-card-compat';
      compatEl.textContent = compatName;
      bottom.appendChild(compatEl);
    }

    if (fusionLimit > 0) {
      var pipsRow = document.createElement('div');
      pipsRow.className = 'mod-card-pips';
      for (var p = 0; p < fusionLimit; p++) {
        var pip = document.createElement('span');
        pip.className = 'mod-card-pip filled';
        pipsRow.appendChild(pip);
      }
      bottom.appendChild(pipsRow);
    }

    front.appendChild(bottom);
    modCard.appendChild(front);

    var checkOverlay = document.createElement('div');
    checkOverlay.className = 'mod-card-check';
    var checkIcon = document.createElement('span');
    checkIcon.className = 'material-icons-round';
    checkIcon.textContent = 'check';
    checkOverlay.appendChild(checkIcon);
    modCard.appendChild(checkOverlay);

    return modCard;
  }

  function getItemProgressLabel(item) {
    if (!item || item.category === 'Mods') return '';
    var rank = getStoredItemRank(item);
    var maxRank = getItemMaxRank(item);
    var trackedXp = getTrackedItemXp(item);
    var totalXp = getItemXP(item);
    if (maxRank <= 0 || totalXp <= 0) {
      return isItemFullyRanked(item) ? 'Checked - no mastery XP' : 'No mastery XP';
    }
    return 'Rank ' + rank + '/' + maxRank + ' - ' + trackedXp.toLocaleString() + '/' + totalXp.toLocaleString() + ' XP';
  }

  function updateItemCardProgress(card, item) {
    if (!card || !item) return;
    var fullyRanked = isItemFullyRanked(item);
    card.classList.toggle('mastered', fullyRanked);

    var xpEl = card.querySelector('.item-card-xp');
    if (xpEl && item.category !== 'Mods') {
      xpEl.textContent = getItemProgressLabel(item);
    }

    var maxRank = getItemMaxRank(item);
    var rank = getStoredItemRank(item);
    var levelLabel = card.querySelector('.item-level-label');
    if (levelLabel) {
      levelLabel.textContent = maxRank > 0 ? ('Level ' + rank + ' / ' + maxRank) : 'No mastery XP';
    }

    var levelFill = card.querySelector('.item-level-fill');
    if (levelFill) {
      levelFill.style.width = (maxRank > 0 ? (rank / maxRank * 100) : 0) + '%';
    }

    var decrementBtn = card.querySelector('[data-level-action="decrease"]');
    if (decrementBtn) decrementBtn.disabled = rank <= 0;
    var incrementBtn = card.querySelector('[data-level-action="increase"]');
    if (incrementBtn) incrementBtn.disabled = maxRank <= 0 || rank >= maxRank;
  }

  function commitItemRankChange(card, item) {
    saveMasteryProgress();
    updateCounts();
    updateStats();

    if (currentFilter === 'mastered' || currentFilter === 'unmastered') {
      applyFilters();
      return;
    }

    updateItemCardProgress(card, item);
  }

  function createItemLevelControl(item, card) {
    var maxRank = getItemMaxRank(item);
    if (maxRank <= 0) return null;

    var levelDiv = document.createElement('div');
    levelDiv.className = 'item-card-level';

    var topRow = document.createElement('div');
    topRow.className = 'item-level-top';

    var label = document.createElement('span');
    label.className = 'item-level-label';
    topRow.appendChild(label);

    var controls = document.createElement('div');
    controls.className = 'item-level-controls';

    var decrementBtn = document.createElement('button');
    decrementBtn.type = 'button';
    decrementBtn.className = 'item-level-btn';
    decrementBtn.setAttribute('data-level-action', 'decrease');
    decrementBtn.title = 'Decrease level';
    decrementBtn.textContent = '-';
    decrementBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      setItemRank(item, getStoredItemRank(item) - 1);
      commitItemRankChange(card, item);
    });

    var incrementBtn = document.createElement('button');
    incrementBtn.type = 'button';
    incrementBtn.className = 'item-level-btn';
    incrementBtn.setAttribute('data-level-action', 'increase');
    incrementBtn.title = 'Increase level';
    incrementBtn.textContent = '+';
    incrementBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      setItemRank(item, getStoredItemRank(item) + 1);
      commitItemRankChange(card, item);
    });

    controls.appendChild(decrementBtn);
    controls.appendChild(incrementBtn);
    topRow.appendChild(controls);

    var bar = document.createElement('div');
    bar.className = 'item-level-bar';
    var fill = document.createElement('span');
    fill.className = 'item-level-fill';
    bar.appendChild(fill);

    levelDiv.appendChild(topRow);
    levelDiv.appendChild(bar);
    return levelDiv;
  }

  function createItemCard(item, index) {
    var card = document.createElement('div');
    card.className = 'item-card' + (isItemFullyRanked(item) ? ' mastered' : '');
    if (item.category === 'Mods') card.setAttribute('data-mastery-label', 'OWNED');
    card.setAttribute('data-unique-name', item.uniqueName);
    card.style.animationDelay = Math.min(index * 15, 400) + 'ms';


    // ---------- STANDARD CARD ----------
    // Image container
    var imageDiv = document.createElement('div');
    imageDiv.className = 'item-card-image';

    var cardImageUrl = getItemImageUrl(item);

    if (cardImageUrl) {
      var img = document.createElement('img');
      img.src = cardImageUrl;
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
    if (cardImageUrl) placeholderIcon.style.display = 'none';
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
      xpDiv.textContent = getItemProgressLabel(item);
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
      var levelControl = createItemLevelControl(item, card);
      if (levelControl) bodyDiv.appendChild(levelControl);
    }
    bodyDiv.appendChild(checkDiv);

    card.appendChild(imageDiv);
    card.appendChild(bodyDiv);

    card.addEventListener('click', function() {
      if (item.category === 'Mods') {
        setItemRank(item, masteredSet.has(item.uniqueName) ? 0 : 1);
      } else {
        var maxRank = getItemMaxRank(item);
        setItemRank(item, isItemFullyRanked(item) ? 0 : (maxRank > 0 ? maxRank : 1));
      }
      commitItemRankChange(card, item);
    });

    updateItemCardProgress(card, item);
    return card;
  }

  function isAllBatchingActive() {
    return currentCategory === 'all';
  }

  function isModBatchingActive() {
    return currentCategory === 'Mods';
  }

  function isChecklistBatchingActive() {
    return isAllBatchingActive() || isModBatchingActive();
  }

  function getChecklistBatchSize() {
    if (isAllBatchingActive()) return ALL_ITEMS_RENDER_BATCH_SIZE;
    if (isModBatchingActive()) return MOD_RENDER_BATCH_SIZE;
    return filteredItems.length;
  }

  function getChecklistVisibleCount() {
    if (isAllBatchingActive()) return allVisibleCount;
    if (isModBatchingActive()) return modVisibleCount;
    return filteredItems.length;
  }

  function loadMoreChecklistItems() {
    if (isAllBatchingActive()) {
      allVisibleCount += ALL_ITEMS_RENDER_BATCH_SIZE;
    } else if (isModBatchingActive()) {
      modVisibleCount += MOD_RENDER_BATCH_SIZE;
    }
    renderItems();
  }

  function getVisibleChecklistItems() {
    if (!isChecklistBatchingActive()) return filteredItems;
    return filteredItems.slice(0, getChecklistVisibleCount());
  }

  function appendChecklistShowMoreCard(fragment, renderedCount, totalCount) {
    var remaining = Math.max(0, totalCount - renderedCount);
    if (remaining <= 0) return;
    var batchSize = getChecklistBatchSize();
    var isAllItems = isAllBatchingActive();

    var showMoreCard = document.createElement('div');
    showMoreCard.className = 'item-card items-show-more-card';

    var showMoreTitle = document.createElement('div');
    showMoreTitle.className = 'items-show-more-title';
    showMoreTitle.textContent = isAllItems ? 'More Items Ready' : 'More Mods Ready';

    var showMoreCopy = document.createElement('div');
    showMoreCopy.className = 'items-show-more-copy';
    showMoreCopy.textContent = remaining.toLocaleString() + (isAllItems
      ? ' more items are waiting below. Load the next batch when you are ready.'
      : ' more mods are waiting below. Load the next batch when you are ready.');

    var showMoreBtn = document.createElement('button');
    showMoreBtn.className = 'items-show-more-btn';
    showMoreBtn.type = 'button';
    showMoreBtn.innerHTML = '<span class="material-icons-round">expand_more</span><span>Show ' + Math.min(batchSize, remaining).toLocaleString() + ' More</span>';
    showMoreBtn.addEventListener('click', function(evt) {
      evt.stopPropagation();
      loadMoreChecklistItems();
    });

    showMoreCard.appendChild(showMoreTitle);
    showMoreCard.appendChild(showMoreCopy);
    showMoreCard.appendChild(showMoreBtn);
    fragment.appendChild(showMoreCard);
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

    var visibleItems = getVisibleChecklistItems();
    var fragment = document.createDocumentFragment();
    for (var j = 0; j < visibleItems.length; j++) {
      fragment.appendChild(createItemCard(visibleItems[j], j));
    }
    if (isChecklistBatchingActive()) {
      appendChecklistShowMoreCard(fragment, visibleItems.length, filteredItems.length);
    }
    els.itemsGrid.appendChild(fragment);
    updateCategoryHeader();
  }

  function updateCategoryHeader() {
    var labels = {
      'all': 'All Items',
      'Warframes': 'Warframe',
      'Primary': 'Primary',
      'Secondary': 'Secondary',
      'Melee': 'Melee',
      'Robotic': 'Robotic',
      'Archgun': 'Archgun',
      'Archmelee': 'Archmelee',
      'Amps': 'Amps',
      'Companions': 'Companions',
      'Vehicles': 'Vehicles',
      'Mods': 'Mods',
    };
    els.categoryTitle.textContent = labels[currentCategory] || currentCategory;

    if (currentCategory === 'all' && tradeModeEnabled) {
      var tradableCount = 0;
      for (var i = 0; i < allItems.length; i++) {
        if (allItems[i].category === 'Mods') continue;
        if (allItems[i].tradable) tradableCount++;
      }
      var allItemsText = filteredItems.length + ' items';
      if (filteredItems.length > ALL_ITEMS_RENDER_BATCH_SIZE) {
        allItemsText += ' - showing ' + Math.min(filteredItems.length, allVisibleCount).toLocaleString();
      }
      els.categoryItemCount.textContent = allItemsText + ' - ' + tradableCount + ' tradable';
      return;
    }

    if (isChecklistBatchingActive() && filteredItems.length > getChecklistBatchSize()) {
      els.categoryItemCount.textContent = filteredItems.length + ' items - showing ' + Math.min(filteredItems.length, getChecklistVisibleCount()).toLocaleString();
      return;
    }

    if (currentCategory === 'all' && tradeModeEnabled) {
      var tradableCount = 0;
      for (var i = 0; i < allItems.length; i++) {
        if (allItems[i].category === 'Mods') continue;
        if (allItems[i].tradable) tradableCount++;
      }
      els.categoryItemCount.textContent = filteredItems.length + ' items - ' + tradableCount + ' tradable';
      return;
    }

    if (isModBatchingActive() && filteredItems.length > MOD_RENDER_BATCH_SIZE) {
      els.categoryItemCount.textContent = filteredItems.length + ' items - showing ' + Math.min(filteredItems.length, modVisibleCount).toLocaleString();
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
      itemXP += getTrackedItemXp(item);
      if (isItemFullyRanked(item)) {
        totalMasteredCount++;
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

  async function openExternalUrl(url) {
    if (!url) return;

    if (window.electronAPI && window.electronAPI.openExternal) {
      try {
        await window.electronAPI.openExternal(url);
        return;
      } catch (e) { /* fall through */ }
    }

    window.open(url, '_blank', 'noopener');
  }

  async function openGitHubRepo() {
    await openExternalUrl(REPO_URL);
  }

  async function openTelegramContact() {
    await openExternalUrl(TELEGRAM_CONTACT_URL);
  }

  function setProfileSyncIndicator(state, text, title) {
    if (!els.profileSyncPill) return;
    var nextState = state || 'offline';
    els.profileSyncPill.classList.remove('is-offline', 'is-syncing', 'is-online');
    els.profileSyncPill.classList.add('is-' + nextState);
    els.profileSyncPill.setAttribute('title', title || text || 'Warframe profile sync status');
    if (els.profileSyncText) {
      els.profileSyncText.textContent = text || 'profile offline';
    }
  }

  function getProfileFetchStatusIcon(state) {
    if (state === 'busy') return 'sync';
    if (state === 'success') return 'check_circle';
    if (state === 'warning') return 'travel_explore';
    if (state === 'error') return 'error';
    return 'info';
  }

  function setProfileFetchButtonState(options) {
    if (!els.profileFetchBtn) return;
    var opts = options || {};
    els.profileFetchBtn.disabled = !!opts.disabled;
    if (els.profileFetchBtnText && opts.text) {
      els.profileFetchBtnText.textContent = opts.text;
    }
  }

  function setProfileFetchStatus(state, title, copy, meta) {
    if (els.profileFetchStatus) {
      els.profileFetchStatus.setAttribute('data-state', state || 'idle');
    }
    if (els.profileFetchStatusIcon) {
      els.profileFetchStatusIcon.textContent = getProfileFetchStatusIcon(state);
    }
    if (els.profileFetchStatusTitle) {
      els.profileFetchStatusTitle.textContent = title || 'Ready when you are';
    }
    if (els.profileFetchStatusCopy) {
      els.profileFetchStatusCopy.textContent = copy || '';
    }
    if (els.profileFetchStatusMeta) {
      els.profileFetchStatusMeta.textContent = meta || '';
      els.profileFetchStatusMeta.classList.toggle('hidden', !meta);
    }
  }

  function formatProfileFetchDate(value) {
    var timestamp = Number(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return '';
    try {
      return new Date(timestamp).toLocaleString();
    } catch (err) {
      return '';
    }
  }

  function saveLastProfileFetchSummary(summary) {
    try {
      localStorage.setItem(PROFILE_FETCH_LAST_RESULT_KEY, JSON.stringify(summary || {}));
    } catch (err) { /* ignore */ }
  }

  function loadLastProfileFetchSummary() {
    try {
      var raw = localStorage.getItem(PROFILE_FETCH_LAST_RESULT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function initProfileFetchSetting() {
    var summary = loadLastProfileFetchSummary();
    if (summary && summary.importedAt) {
      var namePart = summary.displayName ? (summary.displayName + ' - ') : '';
      var totalPart = typeof summary.matchedCount === 'number'
        ? (summary.matchedCount.toLocaleString() + ' matched')
        : 'profile imported';
      setProfileFetchStatus(
        'success',
        'Last profile sync loaded',
        namePart + totalPart + ' item levels. Fetch again after you enter and leave a Relay or Dojo if you want fresh data.',
        'Last sync: ' + formatProfileFetchDate(summary.importedAt)
      );
      setProfileSyncIndicator('online', 'profile synced', 'Last sync: ' + formatProfileFetchDate(summary.importedAt));
      return;
    }

    setProfileSyncIndicator('offline', 'profile offline', 'Waiting for Warframe to open and sync.');
    setProfileFetchStatus(
      'idle',
      'Automatic sync is watching',
      'Start Warframe first for the cleanest sync. If the data looks stale, enter and leave a Relay or Dojo so the game refreshes your profile cache.',
      ''
    );
  }

  function stopProfileProcessWatch() {
    if (profileProcessWatchTimer) {
      clearInterval(profileProcessWatchTimer);
      profileProcessWatchTimer = null;
    }
    profileProcessWatchStartedAt = 0;
  }

  function startProfileProcessWatch() {
    if (!window.electronAPI || !window.electronAPI.detectWarframeProcess) return;
    stopProfileProcessWatch();
    profileProcessWatchStartedAt = Date.now();
    setProfileFetchButtonState({ disabled: false, text: 'Fetch Your Profile' });
    setProfileFetchStatus(
      'warning',
      'Waiting for Warframe',
      'Open Warframe and log in. I will keep watching for the process, then ask you to refresh the profile cache.',
      'Watching for up to 90 seconds...'
    );

    profileProcessWatchTimer = setInterval(async function() {
      if (profileFetchInProgress) return;

      if (Date.now() - profileProcessWatchStartedAt > PROFILE_PROCESS_WATCH_TIMEOUT_MS) {
        stopProfileProcessWatch();
        setProfileFetchStatus(
          'warning',
          'Warframe was not detected',
          'Open Warframe, log in, then press Fetch Your Profile again. Tiny sentinel went on break.',
          ''
        );
        return;
      }

      try {
        var detection = await window.electronAPI.detectWarframeProcess();
        if (detection && detection.process && detection.process.running) {
          stopProfileProcessWatch();
          setProfileFetchButtonState({ disabled: false, text: 'Fetch After Relay Refresh' });
          setProfileFetchStatus(
            'warning',
            'Warframe detected',
            'Enter and leave a Relay or Dojo to refresh your profile data, then press the button again to import item levels and account XP.',
            'Detected process: ' + (detection.process.name || 'Warframe')
          );
        }
      } catch (err) {
        // Keep watching; process detection can briefly fail while the game is starting.
      }
    }, PROFILE_PROCESS_WATCH_INTERVAL_MS);
  }

  function normalizeProfileUniqueKey(value) {
    return String(value || '').trim().replace(/\\/g, '/').toLowerCase();
  }

  function getProfileUniqueCandidates(value) {
    var normalized = normalizeProfileUniqueKey(value);
    if (!normalized) return [];
    var candidates = [normalized];

    if (normalized.indexOf('/storeitems/') !== -1) {
      candidates.push(normalized.replace('/storeitems/', '/'));
    }
    if (normalized.indexOf('/types/game/') !== -1) {
      candidates.push(normalized.replace('/types/game/', '/'));
    }

    return candidates.filter(function(candidate, index, list) {
      return !!candidate && list.indexOf(candidate) === index;
    });
  }

  function getProfilePathLeafKey(value) {
    var normalized = normalizeProfileUniqueKey(value);
    if (!normalized) return '';
    var parts = normalized.split('/').filter(Boolean);
    var leaf = parts.length ? parts[parts.length - 1] : normalized;
    return toLookupKey(leaf.replace(/([a-z])([A-Z])/g, '$1 $2'));
  }

  function addProfileLookupEntry(bucket, key, item) {
    if (!key || !item) return;
    if (!bucket[key]) bucket[key] = [];
    if (bucket[key].indexOf(item) === -1) {
      bucket[key].push(item);
    }
  }

  function getProfileLookupAliases(item) {
    if (toLookupKey(item && item.name) !== 'plexus') return [];
    return [
      'Plexus',
      'Railjack Plexus',
      'Railjack',
      'Railjack Harness',
      'RailjackHarness',
      'CrewShip Harness',
      'Crew Ship Harness',
      'CrewShipHarness',
      'Default Harness',
      'DefaultHarness',
      '/Lotus/Types/Game/CrewShip/CrewShipHarness',
      '/Lotus/Types/Game/CrewShip/RailJack/DefaultHarness',
      '/Lotus/Types/Game/CrewShip/Railjack/DefaultHarness',
      '/Lotus/Types/Game/Railjack/RailjackHarness',
      '/Lotus/Types/Game/Railjack/Plexus'
    ];
  }

  function buildProfileItemLookup() {
    var lookup = {
      byUnique: Object.create(null),
      byLeaf: Object.create(null),
      byName: Object.create(null),
      byCompactName: Object.create(null)
    };

    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i];
      if (!isMasteryRelevantItem(item)) continue;

      var uniqueCandidates = getProfileUniqueCandidates(item.uniqueName);
      for (var c = 0; c < uniqueCandidates.length; c++) {
        lookup.byUnique[uniqueCandidates[c]] = item;
      }

      addProfileLookupEntry(lookup.byLeaf, getProfilePathLeafKey(item.uniqueName), item);
      addProfileLookupEntry(lookup.byName, toLookupKey(item.name), item);
      addProfileLookupEntry(lookup.byCompactName, toCompactLookupKey(item.name), item);

      var aliases = getProfileLookupAliases(item);
      for (var a = 0; a < aliases.length; a++) {
        var alias = aliases[a];
        var normalizedAlias = normalizeProfileUniqueKey(alias);
        if (normalizedAlias.indexOf('/') !== -1) {
          lookup.byUnique[normalizedAlias] = item;
          addProfileLookupEntry(lookup.byLeaf, getProfilePathLeafKey(alias), item);
        }
        addProfileLookupEntry(lookup.byName, toLookupKey(alias), item);
        addProfileLookupEntry(lookup.byCompactName, toCompactLookupKey(alias), item);
      }
    }

    return lookup;
  }

  function chooseProfileLookupCandidate(candidates, entryXp) {
    if (!Array.isArray(candidates) || candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    var masteredCandidates = candidates.filter(function(item) {
      return Number(entryXp || 0) >= getItemAffinityForRank(item, getItemMaxRank(item));
    });
    if (masteredCandidates.length === 1) return masteredCandidates[0];

    var partialCandidates = candidates.filter(function(item) {
      var itemXp = getItemXP(item);
      var profileXp = Number(entryXp || 0);
      return itemXp > 0 && profileXp > 0 && profileXp <= getItemAffinityForRank(item, getItemMaxRank(item));
    });
    return partialCandidates.length === 1 ? partialCandidates[0] : null;
  }

  function findProfileChecklistItem(entry, lookup) {
    var itemType = String(entry && entry.itemType || '').trim();
    if (!itemType) return null;

    var uniqueCandidates = getProfileUniqueCandidates(itemType);
    for (var i = 0; i < uniqueCandidates.length; i++) {
      var exact = lookup.byUnique[uniqueCandidates[i]];
      if (exact) return exact;
    }

    var leafCandidate = chooseProfileLookupCandidate(lookup.byLeaf[getProfilePathLeafKey(itemType)], entry.xp);
    if (leafCandidate) return leafCandidate;

    var nameCandidate = chooseProfileLookupCandidate(lookup.byName[toLookupKey(itemType)], entry.xp);
    if (nameCandidate) return nameCandidate;

    return chooseProfileLookupCandidate(lookup.byCompactName[toCompactLookupKey(itemType)], entry.xp);
  }

  function getProfileEntryExtraKey(entry) {
    var key = toLookupKey(entry && entry.itemType);
    if (!key) return '';
    var looksLikeXpField = key.indexOf('xp') !== -1 || key.indexOf('experience') !== -1 || key.indexOf('mastery') !== -1;
    if (!looksLikeXpField && (key.indexOf('completed') !== -1 || key.indexOf('cleared') !== -1 || key.indexOf('count') !== -1)) return '';

    if ((key.indexOf('steel') !== -1 && (key.indexOf('mission') !== -1 || key.indexOf('star chart') !== -1 || key.indexOf('node') !== -1)) || key.indexOf('steel path') !== -1) {
      return 'steelPathXp';
    }
    if ((key.indexOf('hard mode') !== -1 || key.indexOf('hardmode') !== -1) && (key.indexOf('mission') !== -1 || key.indexOf('node') !== -1)) {
      return 'steelPathXp';
    }
    if ((key.indexOf('mission') !== -1 || key.indexOf('star chart') !== -1 || key.indexOf('starchart') !== -1 || key.indexOf('node') !== -1) && key.indexOf('steel') === -1 && key.indexOf('hardmode') === -1 && key.indexOf('hard mode') === -1) {
      return 'normalStarChartXp';
    }
    if ((key.indexOf('railjack') !== -1 || key.indexOf('rail jack') !== -1 || key.indexOf('crewship') !== -1) && (key.indexOf('intrinsic') !== -1 || key.indexOf('skill') !== -1 || looksLikeXpField)) {
      return 'railjackRanks';
    }
    if ((key.indexOf('duviri') !== -1 || key.indexOf('drifter') !== -1) && (key.indexOf('intrinsic') !== -1 || key.indexOf('skill') !== -1 || looksLikeXpField)) {
      return 'duviriRanks';
    }

    return '';
  }

  function getItemRankFromProfileXp(item, profileXp) {
    var xp = Number(profileXp);
    if (!Number.isFinite(xp) || xp <= 0) return 0;

    var maxRank = getItemMaxRank(item);
    var affinityBase = getItemAffinityPerRankSquared(item);
    if (maxRank <= 0 || affinityBase <= 0) return 0;
    if (xp >= getItemAffinityForRank(item, maxRank)) return maxRank;
    return clampWholeNumber(Math.floor(Math.sqrt(xp / affinityBase)), 0, maxRank);
  }

  function extractProfileMasteryExtras(profileResponse) {
    var values = getDefaultMasteryExtras();
    var found = Object.create(null);

    function recordExtra(key, value, isRankValue) {
      if (!key) return;
      var numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) return;

      if (key === 'railjackRanks' || key === 'duviriRanks') {
        var ranks = isRankValue ? numeric : Math.floor(numeric / INTRINSIC_RANK_XP);
        values[key] = Math.max(values[key], ranks);
      } else {
        values[key] = Math.max(values[key], numeric);
      }
      found[key] = true;
    }

    var responseExtras = profileResponse && profileResponse.masteryExtras;
    if (responseExtras && typeof responseExtras === 'object') {
      var foundKeys = Array.isArray(responseExtras.foundKeys) ? responseExtras.foundKeys : [];
      ['normalStarChartXp', 'steelPathXp', 'railjackRanks', 'duviriRanks'].forEach(function(key) {
        if (foundKeys.indexOf(key) !== -1 || Number(responseExtras[key] || 0) > 0) {
          recordExtra(key, responseExtras[key], key === 'railjackRanks' || key === 'duviriRanks');
        }
      });
    }

    var xpInfo = Array.isArray(profileResponse && profileResponse.xpInfo) ? profileResponse.xpInfo : [];
    for (var i = 0; i < xpInfo.length; i++) {
      var entry = xpInfo[i] || {};
      recordExtra(getProfileEntryExtraKey(entry), entry.xp, false);
    }

    return {
      values: normalizeMasteryExtras(values),
      foundKeys: Object.keys(found)
    };
  }

  function applyProfileMasteryExtras(profileResponse) {
    var imported = extractProfileMasteryExtras(profileResponse);
    var before = normalizeMasteryExtras(masteryExtras);
    var next = {
      normalStarChartXp: before.normalStarChartXp,
      steelPathXp: before.steelPathXp,
      railjackRanks: before.railjackRanks,
      duviriRanks: before.duviriRanks
    };
    var updatedKeys = [];

    imported.foundKeys.forEach(function(key) {
      if (!Object.prototype.hasOwnProperty.call(next, key)) return;
      var importedValue = imported.values[key];
      if (Number(importedValue) !== Number(next[key])) {
        next[key] = importedValue;
        updatedKeys.push(key);
      }
    });

    if (updatedKeys.length > 0) {
      masteryExtras = normalizeMasteryExtras(next);
      saveMasteryExtras();
      syncMasteryExtrasInputs();
    }

    return {
      foundKeys: imported.foundKeys,
      values: imported.values,
      updatedKeys: updatedKeys,
      changed: updatedKeys.length > 0
    };
  }

  function analyzeProfileXpInfo(profileResponse) {
    var xpInfo = Array.isArray(profileResponse && profileResponse.xpInfo) ? profileResponse.xpInfo : [];
    var lookup = buildProfileItemLookup();
    var matchedByUnique = Object.create(null);
    var partialCount = 0;
    var unmatchedCount = 0;
    var ignoredCount = 0;

    for (var i = 0; i < xpInfo.length; i++) {
      var entry = xpInfo[i] || {};
      if (getProfileEntryExtraKey(entry)) {
        ignoredCount++;
        continue;
      }

      var item = findProfileChecklistItem(entry, lookup);
      if (!item) {
        unmatchedCount++;
        continue;
      }

      var requiredXp = getItemXP(item);
      if (requiredXp <= 0) {
        ignoredCount++;
        continue;
      }

      var profileXp = Number(entry.xp || 0);
      if (!Number.isFinite(profileXp) || profileXp <= 0) {
        ignoredCount++;
        continue;
      }

      var profileRank = getItemRankFromProfileXp(item, profileXp);
      if (profileRank <= 0) {
        partialCount++;
        continue;
      }

      var existing = matchedByUnique[item.uniqueName];
      if (existing && existing.profileRank >= profileRank) continue;

      matchedByUnique[item.uniqueName] = {
        item: item,
        profileXp: profileXp,
        requiredXp: requiredXp,
        requiredAffinity: getItemAffinityForRank(item, getItemMaxRank(item)),
        profileRank: profileRank,
        maxRank: getItemMaxRank(item),
        itemType: entry.itemType || ''
      };
    }

    var matchedItems = Object.keys(matchedByUnique)
      .map(function(uniqueName) { return matchedByUnique[uniqueName]; })
      .sort(function(a, b) {
        return String(a.item.name || '').localeCompare(String(b.item.name || ''));
      });

    return {
      profileEntryCount: xpInfo.length,
      matchedItems: matchedItems,
      partialCount: partialCount + matchedItems.filter(function(match) {
        return match.profileRank > 0 && match.profileRank < match.maxRank;
      }).length,
      fullCount: matchedItems.filter(function(match) {
        return match.profileRank >= match.maxRank;
      }).length,
      unmatchedCount: unmatchedCount,
      ignoredCount: ignoredCount
    };
  }

  function applyProfileMasteryMatches(profileResponse) {
    var analysis = analyzeProfileXpInfo(profileResponse);
    var newlyLeveled = [];
    var upgradedRanks = [];
    var newlyMastered = [];
    var alreadyAtOrAbove = [];
    var clearedItems = [];
    var matchedUniqueNames = Object.create(null);

    for (var i = 0; i < analysis.matchedItems.length; i++) {
      var match = analysis.matchedItems[i];
      if (!match.item || !match.item.uniqueName) continue;
      matchedUniqueNames[match.item.uniqueName] = true;

      var previousRank = getStoredItemRank(match.item);
      if (match.profileRank !== previousRank) {
        setItemRank(match.item, match.profileRank);
        upgradedRanks.push(match);
        if (previousRank <= 0) newlyLeveled.push(match);
        if (match.profileRank >= match.maxRank && previousRank < match.maxRank) {
          newlyMastered.push(match);
        }
      } else {
        alreadyAtOrAbove.push(match);
      }
    }

    for (var j = 0; j < allItems.length; j++) {
      var item = allItems[j];
      if (!isMasteryRelevantItem(item) || !item.uniqueName || item.profileOnly || item.syncOptional || item.category === 'Mods') continue;
      if (matchedUniqueNames[item.uniqueName]) continue;
      if (getStoredItemRank(item) <= 0) continue;

      setItemRank(item, 0);
      clearedItems.push(item);
    }

    var extrasResult = applyProfileMasteryExtras(profileResponse);

    if (upgradedRanks.length > 0 || clearedItems.length > 0 || extrasResult.changed) {
      saveMasteryProgress();
      updateCounts();
      updateStats();
      applyFilters();
    }

    analysis.newlyLeveled = newlyLeveled;
    analysis.upgradedRanks = upgradedRanks;
    analysis.newlyMastered = newlyMastered;
    analysis.alreadyAtOrAbove = alreadyAtOrAbove;
    analysis.clearedItems = clearedItems;
    analysis.masteryExtras = extrasResult;
    return analysis;
  }

  function buildProfileFetchMeta(profileResponse, analysis) {
    var parts = [];
    if (profileResponse && profileResponse.displayName) {
      parts.push(profileResponse.displayName);
    }
    if (profileResponse && Number.isFinite(Number(profileResponse.masteryRank))) {
      parts.push('MR ' + String(profileResponse.masteryRank));
    }
    if (analysis && typeof analysis.profileEntryCount === 'number') {
      parts.push(analysis.profileEntryCount.toLocaleString() + ' profile XP entries');
    }
    if (profileResponse && profileResponse.logUpdatedAt) {
      parts.push('EE.log ' + formatProfileFetchDate(profileResponse.logUpdatedAt));
    }
    return parts.join(' - ');
  }

  function handleProfileFetchFailure(result) {
    var reason = result && result.reason ? result.reason : '';
    var message = result && result.message ? result.message : 'Profile sync failed.';

    if (reason === 'process-not-running') {
      startProfileProcessWatch();
      return;
    }

    if (reason === 'account-id-not-found' || reason === 'profile-empty') {
      setProfileFetchStatus(
        'warning',
        'Refresh your Warframe profile',
        message + ' Enter and leave a Relay or Dojo, then press Fetch Your Profile again.',
        result && result.logUpdatedAt ? ('EE.log updated: ' + formatProfileFetchDate(result.logUpdatedAt)) : ''
      );
      return;
    }

    if (reason === 'log-not-found') {
      setProfileFetchStatus(
        'warning',
        'EE.log was not found',
        message + ' Start Warframe once so it creates the local log file, then try again.',
        ''
      );
      return;
    }

    setProfileFetchStatus(
      'error',
      'Profile sync failed',
      message + ' If this repeats, enter and leave a Relay or Dojo and wait a minute before retrying.',
      ''
    );
  }

  function applyProfileFetchSuccess(result, mode) {
    var analysis = applyProfileMasteryMatches(result);
    var leveledCount = analysis.upgradedRanks.length;
    var newLevelCount = analysis.newlyLeveled.length;
    var newlyMasteredCount = analysis.newlyMastered.length;
    var alreadyCount = analysis.alreadyAtOrAbove.length;
    var clearedCount = Array.isArray(analysis.clearedItems) ? analysis.clearedItems.length : 0;
    var matchedCount = analysis.matchedItems.length;
    var extrasUpdatedCount = analysis.masteryExtras && Array.isArray(analysis.masteryExtras.updatedKeys)
      ? analysis.masteryExtras.updatedKeys.length
      : 0;
    var details = leveledCount.toLocaleString() + ' item levels updated, '
      + newLevelCount.toLocaleString() + ' new items found, '
      + newlyMasteredCount.toLocaleString() + ' newly mastered, '
      + clearedCount.toLocaleString() + ' local extras cleared, '
      + alreadyCount.toLocaleString() + ' already at or above profile rank, '
      + extrasUpdatedCount.toLocaleString() + ' account XP fields updated, '
      + analysis.unmatchedCount.toLocaleString() + ' unmatched profile entries.';

    setProfileFetchStatus(
      'success',
      mode === 'auto' ? 'Profile auto-sync complete' : 'Profile levels imported',
      'Matched ' + matchedCount.toLocaleString() + ' checklist items from your profile. ' + details,
      buildProfileFetchMeta(result, analysis)
    );
    setProfileSyncIndicator(
      'online',
      'profile synced',
      'Warframe detected and profile synced at ' + formatProfileFetchDate(Date.now())
    );

    saveLastProfileFetchSummary({
      displayName: result.displayName || '',
      masteryRank: result.masteryRank,
      matchedCount: matchedCount,
      leveledCount: leveledCount,
      newlyLeveledCount: newLevelCount,
      newlyMasteredCount: newlyMasteredCount,
      clearedCount: clearedCount,
      alreadyAtOrAboveCount: alreadyCount,
      accountXpFieldsUpdated: extrasUpdatedCount,
      unmatchedCount: analysis.unmatchedCount,
      importedAt: Date.now()
    });

    return analysis;
  }

  async function fetchWarframeProfileFromSettings() {
    if (profileFetchInProgress) return;
    stopProfileProcessWatch();

    if (!window.electronAPI || !window.electronAPI.fetchWarframeProfile) {
      setProfileFetchStatus(
        'error',
        'Profile sync unavailable',
        'This build does not expose the Warframe profile bridge through Electron.',
        ''
      );
      return;
    }

    if (!allItems.length) {
      setProfileFetchStatus(
        'warning',
        'Checklist is still loading',
        'Wait for the item list to finish loading, then fetch your profile.',
        ''
      );
      return;
    }

    profileFetchInProgress = true;
    setProfileFetchButtonState({ disabled: true, text: 'Fetching...' });
    setProfileFetchStatus(
      'busy',
      'Looking for Warframe',
      'Checking the Warframe process, reading EE.log, and requesting your profile mastery data.',
      ''
    );

    try {
      var result = await window.electronAPI.fetchWarframeProfile();
      if (!result || result.ok === false) {
        handleProfileFetchFailure(result || {});
        return;
      }

      applyProfileFetchSuccess(result, 'manual');
    } catch (err) {
      setProfileFetchStatus(
        'error',
        'Profile sync failed',
        err && err.message ? err.message : 'Unexpected profile sync error.',
        ''
      );
    } finally {
      profileFetchInProgress = false;
      setProfileFetchButtonState({ disabled: false, text: 'Fetch Your Profile' });
    }
  }

  function handleAutoProfileFetchFailure(result) {
    var reason = result && result.reason ? result.reason : '';
    var message = result && result.message ? result.message : 'Profile sync failed.';

    if (reason === 'process-not-running') {
      setProfileSyncIndicator('offline', 'profile offline', 'Warframe is not running.');
      setProfileFetchStatus(
        'error',
        'Warframe is not running',
        'Automatic profile sync will turn green after Warframe opens and the profile can be fetched.',
        ''
      );
      return;
    }

    setProfileSyncIndicator('offline', 'profile not fetched', message);
    setProfileFetchStatus(
      'error',
      reason === 'account-id-not-found' ? 'Refresh profile cache' : 'Automatic sync failed',
      reason === 'account-id-not-found'
        ? message + ' Enter and leave a Relay or Dojo so EE.log receives your account id.'
        : message,
      result && result.logUpdatedAt ? ('EE.log updated: ' + formatProfileFetchDate(result.logUpdatedAt)) : ''
    );
  }

  async function runAutomaticProfileSync(force) {
    if (profileFetchInProgress) return false;
    if (!allItems.length) return false;
    if (!window.electronAPI || !window.electronAPI.fetchWarframeProfile) {
      setProfileSyncIndicator('offline', 'profile bridge missing', 'This build cannot fetch Warframe profile data.');
      return false;
    }
    if (!force && profileLastAutoSyncAt && Date.now() - profileLastAutoSyncAt < PROFILE_AUTO_SYNC_MIN_GAP_MS) {
      return false;
    }

    profileFetchInProgress = true;
    setProfileSyncIndicator('syncing', 'syncing profile', 'Checking Warframe and profile data...');
    setProfileFetchStatus(
      'busy',
      'Automatic profile sync running',
      'Checking Warframe, reading EE.log, and importing profile item levels plus account XP.',
      ''
    );

    try {
      var result = await window.electronAPI.fetchWarframeProfile();
      profileLastAutoSyncAt = Date.now();
      if (!result || result.ok === false) {
        handleAutoProfileFetchFailure(result || {});
        return false;
      }
      applyProfileFetchSuccess(result, 'auto');
      return true;
    } catch (err) {
      setProfileSyncIndicator('offline', 'profile not fetched', err && err.message ? err.message : 'Automatic profile sync failed.');
      setProfileFetchStatus(
        'error',
        'Automatic sync failed',
        err && err.message ? err.message : 'Unexpected profile sync error.',
        ''
      );
      return false;
    } finally {
      profileFetchInProgress = false;
    }
  }

  function initProfileAutoSync() {
    if (profileAutoSyncInitialized) return;
    profileAutoSyncInitialized = true;
    if (!els.profileSyncPill || !els.profileSyncPill.classList.contains('is-online')) {
      setProfileSyncIndicator('offline', 'profile offline', 'Waiting for Warframe profile sync.');
    }

    window.setTimeout(function() {
      runAutomaticProfileSync(true);
    }, 1500);

    profileAutoSyncTimer = window.setInterval(function() {
      runAutomaticProfileSync(false);
    }, PROFILE_AUTO_SYNC_INTERVAL_MS);

    window.addEventListener('focus', function() {
      runAutomaticProfileSync(false);
    });
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
    try {
      var nextState = !tradeModeEnabled;
      tradeModeEnabled = nextState;
      updateTradeModeUI();
      applyFilters();

      if (window.electronAPI && window.electronAPI.setTradeMode) {
        var result = await window.electronAPI.setTradeMode(nextState);
        if (result && result.ok === false) {
          tradeModeEnabled = nextState;
        } else if (result && Object.prototype.hasOwnProperty.call(result, 'enabled')) {
          tradeModeEnabled = !!result.enabled;
        }
      }

      updateTradeModeUI();
      applyFilters();

      if (tradeModeEnabled) {
        ensureTradabilityLoaded(allItems).then(function(ready) {
          if (!ready) return;
          saveToCache(allItems);
          refreshCurrentItemInfoFromLatestData();
          if (tradeModeEnabled) {
            applyFilters();
          }
        });
      }
    } catch (err) {
      console.error('Failed to toggle trade mode:', err);
      updateTradeModeUI();
      applyFilters();
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

  function normalizeThemeId(rawThemeId) {
    var themeId = String(rawThemeId || '').trim().toLowerCase();
    if (!themeId || !Object.prototype.hasOwnProperty.call(APP_THEMES, themeId)) {
      return DEFAULT_APP_THEME;
    }
    return themeId;
  }

  function getThemeMeta(themeId) {
    return APP_THEMES[normalizeThemeId(themeId)] || APP_THEMES[DEFAULT_APP_THEME];
  }

  function updateThemeSettingUI(themeId) {
    var normalizedThemeId = normalizeThemeId(themeId);
    var themeMeta = getThemeMeta(normalizedThemeId);

    if (els.settingsThemeCurrent) {
      els.settingsThemeCurrent.textContent = themeMeta.label;
    }

    if (!els.themeOptions || !els.themeOptions.length) return;
    els.themeOptions.forEach(function(button) {
      var buttonThemeId = normalizeThemeId(button.getAttribute('data-theme'));
      var isActive = buttonThemeId === normalizedThemeId;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function applyTheme(themeId, persist) {
    var normalizedThemeId = normalizeThemeId(themeId);
    currentThemeId = normalizedThemeId;
    document.documentElement.setAttribute('data-theme', normalizedThemeId);

    if (persist !== false) {
      localStorage.setItem(APP_THEME_KEY, normalizedThemeId);
    }

    updateThemeSettingUI(normalizedThemeId);
    return normalizedThemeId;
  }

  function initThemeSetting() {
    var storedThemeId = normalizeThemeId(localStorage.getItem(APP_THEME_KEY) || document.documentElement.getAttribute('data-theme'));
    applyTheme(storedThemeId, false);
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
    var versionHint = '';
    if (window.electronAPI && typeof window.electronAPI.getVersionHint === 'function') {
      versionHint = String(window.electronAPI.getVersionHint() || '').trim();
    }
    if (!window.electronAPI || !window.electronAPI.getAppVersion) {
      currentAppVersion = versionHint;
      els.settingsAppVersion.textContent = 'Version ' + (currentAppVersion || '-');
      return currentAppVersion;
    }
    try {
      var version = await window.electronAPI.getAppVersion();
      currentAppVersion = String(version || '').trim();
      if (!currentAppVersion && versionHint) {
        currentAppVersion = versionHint;
      }
      els.settingsAppVersion.textContent = 'Version ' + (currentAppVersion || '-');
      return currentAppVersion;
    } catch (err) {
      currentAppVersion = versionHint;
      els.settingsAppVersion.textContent = 'Version ' + (currentAppVersion || '-');
      return currentAppVersion;
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
    if (els.mainMenuUpdateDetails && details) {
      els.mainMenuUpdateDetails.textContent = details;
    }
    if (els.mainMenuUpdateBtn) {
      els.mainMenuUpdateBtn.title = details || text || 'Check for Updates';
    }
  }

  function setMainMenuUpdateButtonState(options) {
    var config = options || {};
    var action = config.action ? String(config.action) : 'check';
    var text = config.text ? String(config.text) : 'Check for Updates';
    var icon = config.icon ? String(config.icon) : 'system_update_alt';
    var kind = config.kind ? String(config.kind) : '';
    var disabled = !!config.disabled;
    var details = config.details ? String(config.details) : '';

    updateMenuAction = action;

    if (els.mainMenuUpdateBtn) {
      els.mainMenuUpdateBtn.disabled = disabled;
      els.mainMenuUpdateBtn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      els.mainMenuUpdateBtn.dataset.action = action;
      els.mainMenuUpdateBtn.classList.remove('is-checking', 'is-up-to-date', 'is-outdated', 'is-error', 'is-downloading');
      if (kind) {
        els.mainMenuUpdateBtn.classList.add(kind);
      }
      els.mainMenuUpdateBtn.title = details || text;
    }
    if (els.mainMenuUpdateText) {
      els.mainMenuUpdateText.textContent = text;
    }
    if (els.mainMenuUpdateDetails && details) {
      els.mainMenuUpdateDetails.textContent = details;
    }
    if (els.mainMenuUpdateIcon) {
      els.mainMenuUpdateIcon.textContent = icon;
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
      setMainMenuUpdateButtonState({
        action: 'check',
        disabled: true,
        text: 'Checking...',
        icon: 'sync',
        kind: 'is-checking'
      });
      setUpdateStatus('is-checking', 'checking...', 'Checking GitHub Releases for update metadata...');
      return;
    }

    if (type === 'update-available') {
      updateAvailableForDownload = true;
      var nextVersion = payload && payload.version ? payload.version : 'latest';
      setDownloadUpdateButtonVisible(true, false, 'Download Update');
      setMainMenuUpdateButtonState({
        action: 'download',
        disabled: false,
        text: 'Download Update',
        icon: 'system_update_alt',
        kind: 'is-outdated'
      });
      setUpdateStatus('is-outdated', 'you need to update', 'Update ' + nextVersion + ' is available. Click Download Update to install in-app.');
      return;
    }

    if (type === 'update-not-available') {
      updateAvailableForDownload = false;
      setDownloadUpdateButtonVisible(false, true);
      setMainMenuUpdateButtonState({
        action: 'check',
        disabled: false,
        text: 'Check for Updates',
        icon: 'verified',
        kind: 'is-up-to-date'
      });
      setUpdateStatus('is-up-to-date', 'up to date', 'You are running the latest release build.');
      return;
    }

    if (type === 'download-progress') {
      var percent = payload && typeof payload.percent === 'number' ? payload.percent : 0;
      var transferred = bytesToMiB(payload && payload.transferred);
      var total = bytesToMiB(payload && payload.total);
      setDownloadUpdateButtonVisible(true, true, 'Downloading...');
      setMainMenuUpdateButtonState({
        action: 'download',
        disabled: true,
        text: 'Downloading...',
        icon: 'download',
        kind: 'is-downloading'
      });
      setUpdateStatus('is-downloading', 'downloading ' + percent.toFixed(0) + '%', transferred + ' MiB / ' + total + ' MiB downloaded.');
      return;
    }

    if (type === 'update-downloaded') {
      setDownloadUpdateButtonVisible(false, true);
      setMainMenuUpdateButtonState({
        action: 'busy',
        disabled: true,
        text: 'Installing Update',
        icon: 'restart_alt',
        kind: 'is-checking'
      });
      setUpdateStatus('is-checking', 'restarting...', 'Update downloaded. Restarting app to install now...');
      return;
    }

    if (type === 'installing-update') {
      setDownloadUpdateButtonVisible(false, true);
      setMainMenuUpdateButtonState({
        action: 'busy',
        disabled: true,
        text: 'Installing Update',
        icon: 'restart_alt',
        kind: 'is-checking'
      });
      setUpdateStatus('is-checking', 'installing...', 'Installing update and restarting...');
      return;
    }

    if (type === 'error') {
      var message = payload && payload.message ? payload.message : 'Update operation failed.';
      setDownloadUpdateButtonVisible(updateAvailableForDownload, false, 'Download Update');
      setMainMenuUpdateButtonState({
        action: updateAvailableForDownload ? 'download' : 'check',
        disabled: false,
        text: updateAvailableForDownload ? 'Download Update' : 'Check for Updates',
        icon: updateAvailableForDownload ? 'system_update_alt' : 'error_outline',
        kind: 'is-error'
      });
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
      setMainMenuUpdateButtonState({
        action: 'check',
        disabled: false,
        text: 'Check for Updates',
        icon: 'error_outline',
        kind: 'is-error'
      });
      setUpdateStatus('is-error', 'status unavailable', 'Current app version is unavailable.');
      return;
    }

    setMainMenuUpdateButtonState({
      action: 'check',
      disabled: true,
      text: 'Checking...',
      icon: 'sync',
      kind: 'is-checking'
    });
    setUpdateStatus('is-checking', 'checking...', 'Checking GitHub for the latest version...');

    try {
      var latestInfo = await fetchLatestVersionFromRepo();
      var latest = latestInfo.version;
      var comparison = compareVersionParts(current.parts, latest.parts);

      if (comparison >= 0) {
        setMainMenuUpdateButtonState({
          action: 'check',
          disabled: false,
          text: 'Check for Updates',
          icon: 'verified',
          kind: 'is-up-to-date'
        });
        setUpdateStatus(
          'is-up-to-date',
          'up to date',
          'Current ' + current.normalized + ' - Latest ' + latest.normalized + ' (' + latestInfo.source + ')'
        );
      } else {
        setMainMenuUpdateButtonState({
          action: 'check',
          disabled: false,
          text: 'Check for Updates',
          icon: 'priority_high',
          kind: 'is-outdated'
        });
        setUpdateStatus(
          'is-outdated',
          'you need to update',
          'Current ' + current.normalized + ' - Latest ' + latest.normalized + ' (' + latestInfo.source + ')'
        );
      }
    } catch (err) {
      setMainMenuUpdateButtonState({
        action: 'check',
        disabled: false,
        text: 'Check for Updates',
        icon: 'error_outline',
        kind: 'is-error'
      });
      setUpdateStatus('is-error', 'status unavailable', err && err.message ? err.message : 'Update check failed.');
    }
  }

  async function checkForUpdates() {
    if (!window.electronAPI || !window.electronAPI.checkForAppUpdate) {
      await checkForUpdatesFromRepo();
      return;
    }

    setMainMenuUpdateButtonState({
      action: 'check',
      disabled: true,
      text: 'Checking...',
      icon: 'sync',
      kind: 'is-checking'
    });
    setDownloadUpdateButtonVisible(false, true);
    setUpdateStatus('is-checking', 'checking...', 'Checking for updates...');

    var result;
    try {
      result = await window.electronAPI.checkForAppUpdate();
    } catch (err) {
      setMainMenuUpdateButtonState({
        action: 'check',
        disabled: false,
        text: 'Check for Updates',
        icon: 'error_outline',
        kind: 'is-error'
      });
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

    setMainMenuUpdateButtonState({
      action: 'check',
      disabled: false,
      text: 'Check for Updates',
      icon: 'error_outline',
      kind: 'is-error'
    });
    setUpdateStatus('is-error', 'status unavailable', result && result.message ? result.message : 'Update check failed.');
  }

  async function downloadUpdateInApp() {
    if (!window.electronAPI || !window.electronAPI.downloadAppUpdate) {
      setMainMenuUpdateButtonState({
        action: 'check',
        disabled: false,
        text: 'Check for Updates',
        icon: 'error_outline',
        kind: 'is-error'
      });
      setUpdateStatus('is-error', 'status unavailable', 'In-app updater is unavailable in this build.');
      return;
    }

    setMainMenuUpdateButtonState({
      action: 'download',
      disabled: true,
      text: 'Downloading...',
      icon: 'download',
      kind: 'is-downloading'
    });
    setDownloadUpdateButtonVisible(true, true, 'Downloading...');
    setUpdateStatus('is-downloading', 'downloading...', 'Starting secure update download from GitHub Releases...');

    var result;
    try {
      result = await window.electronAPI.downloadAppUpdate();
    } catch (err) {
      setMainMenuUpdateButtonState({
        action: 'download',
        disabled: false,
        text: 'Download Update',
        icon: 'system_update_alt',
        kind: 'is-error'
      });
      setDownloadUpdateButtonVisible(true, false, 'Download Update');
      setUpdateStatus('is-error', 'status unavailable', err && err.message ? err.message : 'Update download failed.');
      return;
    }

    if (!result || !result.ok) {
      setMainMenuUpdateButtonState({
        action: 'download',
        disabled: false,
        text: 'Download Update',
        icon: 'system_update_alt',
        kind: 'is-error'
      });
      setDownloadUpdateButtonVisible(true, false, 'Download Update');
      setUpdateStatus('is-error', 'status unavailable', result && result.message ? result.message : 'Update download failed.');
    }
  }

  function initAutoUpdateSetting() {
    var raw = localStorage.getItem(AUTO_UPDATE_CHECK_KEY);
    var enabled = raw === null ? true : raw === '1';

    setMainMenuUpdateButtonState({
      action: 'check',
      disabled: false,
      text: 'Check for Updates',
      icon: 'system_update_alt',
      details: 'Use this button to check for or download new versions.'
    });

    if (els.autoUpdateCheckToggle) {
      els.autoUpdateCheckToggle.checked = enabled;
    }

    if (enabled) {
      checkForUpdates();
    } else {
      setDownloadUpdateButtonVisible(false, true);
      setMainMenuUpdateButtonState({
        action: 'check',
        disabled: false,
        text: 'Check for Updates',
        icon: 'system_update_alt',
        kind: 'is-error'
      });
      setUpdateStatus('is-error', 'status unavailable', 'Auto update check is disabled.');
    }
  }

  // ---------- Counts ----------
  function shouldMirrorMasteredItemIntoPrimaryCount(item) {
    // Warframe reports Kitgun chamber paths as Secondary/Pistol parts, but the
    // in-game Equipment screen also counts mastered Kitgun chambers in Primary.
    return !!item && item.category !== 'Primary' && isKitgunChamberItem(item);
  }

  function updateCounts() {
    var counts = {};
    var totalAll = 0;

    for (var i = 0; i < allItems.length; i++) {
      var item = allItems[i];
      if (!counts[item.category]) counts[item.category] = { total: 0, mastered: 0 };
      counts[item.category].total++;
      if (item.category !== 'Mods') totalAll++;
      if (isItemFullyRanked(item)) {
        counts[item.category].mastered++;
        if (shouldMirrorMasteredItemIntoPrimaryCount(item)) {
          if (!counts['Primary']) counts['Primary'] = { total: 0, mastered: 0 };
          counts['Primary'].mastered++;
        }
      }
    }

    var masteredCount = 0;
    for (var j = 0; j < allItems.length; j++) {
      if (allItems[j].category !== 'Mods' && isItemFullyRanked(allItems[j])) {
        masteredCount++;
      }
    }
    setCount('count-all', masteredCount, totalAll);
    setCount('count-warframes', counts['Warframes']);
    setCount('count-primary', counts['Primary']);
    setCount('count-secondary', counts['Secondary']);
    setCount('count-melee', counts['Melee']);
    setCount('count-robotic', counts['Robotic']);
    setCount('count-companions', counts['Companions']);
    setCount('count-vehicles', counts['Vehicles']);
    setCount('count-archgun', counts['Archgun']);
    setCount('count-archmelee', counts['Archmelee']);
    setCount('count-amps', counts['Amps']);
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
      var item = itemsToMark[i];
      var maxRank = getItemMaxRank(item);
      setItemRank(item, item.category === 'Mods' ? 1 : (maxRank > 0 ? maxRank : 1));
    }
    saveMasteryProgress();
    updateCounts();
    updateStats();
    applyFilters();
  }

  function unmarkAllInCategory() {
    var itemsToUnmark = filteredItems;
    for (var i = 0; i < itemsToUnmark.length; i++) {
      setItemRank(itemsToUnmark[i], 0);
    }
    saveMasteryProgress();
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
    searchQuery = String(e.target.value || '');
    els.searchClear.classList.toggle('hidden', !searchQuery);
    applyFilters();
  });

  $('#search-clear').addEventListener('click', function() {
    els.searchInput.value = '';
    searchQuery = '';
    els.searchClear.classList.add('hidden');
    applyFilters();
  });

  if (els.relicSearchInput) {
    els.relicSearchInput.addEventListener('input', function(e) {
      relicSearchQuery = String(e.target.value || '');
      syncRelicSearchControls();
      if (Array.isArray(relicDirectory) && relicDirectory.length > 0) {
        scheduleRelicDirectoryRender({ resetLimit: true, resetScroll: true, smoothScroll: false });
      } else {
        loadRelicDirectory(false);
      }
    });
  }

  if (els.relicSearchClear) {
    els.relicSearchClear.addEventListener('click', function() {
      relicSearchQuery = '';
      syncRelicSearchControls();
      if (Array.isArray(relicDirectory) && relicDirectory.length > 0) {
        scheduleRelicDirectoryRender({ resetLimit: true, resetScroll: true, smoothScroll: true });
      } else {
        loadRelicDirectory(false);
      }
      if (els.relicSearchInput) {
        els.relicSearchInput.focus();
      }
    });
  }

  if (els.arcaneSearchInput) {
    els.arcaneSearchInput.addEventListener('input', function(e) {
      arcaneSearchQuery = String(e.target.value || '');
      syncArcaneSearchControls();
      if (Array.isArray(arcaneDirectory) && arcaneDirectory.length > 0) {
        scheduleArcaneDirectoryRender({ resetLimit: true, resetScroll: true, smoothScroll: false });
      } else {
        loadArcaneDirectory(false);
      }
    });
  }

  if (els.arcaneSearchClear) {
    els.arcaneSearchClear.addEventListener('click', function() {
      arcaneSearchQuery = '';
      syncArcaneSearchControls();
      if (Array.isArray(arcaneDirectory) && arcaneDirectory.length > 0) {
        scheduleArcaneDirectoryRender({ resetLimit: true, resetScroll: true, smoothScroll: true });
      } else {
        loadArcaneDirectory(false);
      }
      if (els.arcaneSearchInput) {
        els.arcaneSearchInput.focus();
      }
    });
  }

  // Mark All / Unmark All buttons
  if (els.scanItemsBtn) {
    els.scanItemsBtn.addEventListener('click', function() {
      triggerScreenshotItemScan();
    });
  }

  if (els.scanModalBrowse) {
    els.scanModalBrowse.addEventListener('click', function() {
      openScanFilePicker();
    });
  }

  if (els.scanItemsInput) {
    els.scanItemsInput.addEventListener('change', function(e) {
      var input = e.target;
      var files = getSelectedScanFiles(input && input.files ? input.files : null);
      if (input) input.value = '';
      if (!files.length) return;
      startScreenshotItemScanBatch(files);
    });
  }

  if (els.scanDropzone) {
    els.scanDropzone.addEventListener('click', function(e) {
      if (ocrScanInProgress) return;
      if (e.target === els.scanModalBrowse) return;
      openScanFilePicker();
    });

    els.scanDropzone.addEventListener('keydown', function(e) {
      if (ocrScanInProgress) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openScanFilePicker();
      }
    });

    els.scanDropzone.addEventListener('dragenter', function(e) {
      if (ocrScanInProgress) return;
      e.preventDefault();
      scanDragDepth += 1;
      els.scanDropzone.classList.add('is-dragover');
    });

    els.scanDropzone.addEventListener('dragover', function(e) {
      if (ocrScanInProgress) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      els.scanDropzone.classList.add('is-dragover');
    });

    els.scanDropzone.addEventListener('dragleave', function(e) {
      if (ocrScanInProgress) return;
      e.preventDefault();
      scanDragDepth = Math.max(0, scanDragDepth - 1);
      if (scanDragDepth === 0) {
        els.scanDropzone.classList.remove('is-dragover');
      }
    });

    els.scanDropzone.addEventListener('drop', function(e) {
      if (ocrScanInProgress) return;
      e.preventDefault();
      scanDragDepth = 0;
      els.scanDropzone.classList.remove('is-dragover');
      var files = getSelectedScanFiles(e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : null);
      if (!files.length) {
        setScanStatus(
          'error',
          'No image files detected',
          'Drop one or more screenshot image files to start a scan.',
          0,
          'Unavailable'
        );
        return;
      }
      startScreenshotItemScanBatch(files);
    });
  }

  if (els.scanModalClose) {
    els.scanModalClose.addEventListener('click', function() {
      closeScanModal(false);
    });
  }

  if (els.scanModalDone) {
    els.scanModalDone.addEventListener('click', function() {
      closeScanModal(false);
    });
  }

  if (els.scanModalPickAnother) {
    els.scanModalPickAnother.addEventListener('click', function() {
      openScanFilePicker();
    });
  }

  if (els.scanModal) {
    els.scanModal.addEventListener('click', function(e) {
      if (e.target === els.scanModal) closeScanModal(false);
    });
  }

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

  if (els.themeOptions && els.themeOptions.length) {
    els.themeOptions.forEach(function(button) {
      button.addEventListener('click', function() {
        var requestedThemeId = button.getAttribute('data-theme');
        if (normalizeThemeId(requestedThemeId) === currentThemeId) return;
        applyTheme(requestedThemeId, true);
      });
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
        setMainMenuUpdateButtonState({
          action: 'check',
          disabled: false,
          text: 'Check for Updates',
          icon: 'system_update_alt',
          kind: 'is-error'
        });
        setUpdateStatus('is-error', 'status unavailable', 'Auto update check is disabled.');
      }
    });
  }

  if (els.profileFetchBtn) {
    els.profileFetchBtn.addEventListener('click', function() {
      fetchWarframeProfileFromSettings();
    });
  }

  if (els.profileSyncPill) {
    els.profileSyncPill.addEventListener('click', function() {
      runAutomaticProfileSync(true);
    });
  }

  if (els.openGithubRepoBtn) {
    els.openGithubRepoBtn.addEventListener('click', function() {
      openGitHubRepo();
    });
  }

  if (els.openTelegramContactBtn) {
    els.openTelegramContactBtn.addEventListener('click', function() {
      openTelegramContact();
    });
  }

  if (els.mainMenuUpdateBtn) {
    els.mainMenuUpdateBtn.addEventListener('click', function() {
      if (els.mainMenuUpdateBtn.disabled) return;
      if (updateMenuAction === 'download') {
        downloadUpdateInApp();
        return;
      }
      if (updateMenuAction === 'busy') return;
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

  if (els.cephalonSimarisBtn) {
    els.cephalonSimarisBtn.addEventListener('click', function() {
      openSimarisModal();
    });
  }

  if (els.simarisModalClose) {
    els.simarisModalClose.addEventListener('click', closeSimarisModal);
  }

  if (els.simarisModal) {
    els.simarisModal.addEventListener('click', function(e) {
      if (e.target === els.simarisModal) closeSimarisModal();
    });
  }

  if (els.simarisSearchForm) {
    els.simarisSearchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      fetchSimarisQuery(els.simarisQueryInput ? els.simarisQueryInput.value : '');
    });
  }

  if (els.simarisResultLink) {
    els.simarisResultLink.addEventListener('click', function(e) {
      e.preventDefault();
      openExternalUrl(els.simarisResultLink.href);
    });
  }

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
        els.calcNormalStarChartXp.value = String(getNormalStarChartXpCap());
      }
      applyMasteryExtrasFromInputs(true);
    });
  }

  if (els.calcSteelPathMaxBtn) {
    els.calcSteelPathMaxBtn.addEventListener('click', function() {
      if (els.calcSteelPathXp) {
        els.calcSteelPathXp.value = String(getSteelPathXpCap());
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
    itemLevelMap = Object.create(null);
    saveMasteryProgress();
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
      var relicsPanel = $('#relics-panel');
      var arcanesPanel = $('#arcanes-panel');
      if (marketPanel && !marketPanel.classList.contains('hidden')) {
        $('#market-search-input').focus();
      } else if (arcanesPanel && !arcanesPanel.classList.contains('hidden') && els.arcaneSearchInput) {
        els.arcaneSearchInput.focus();
      } else if (relicsPanel && !relicsPanel.classList.contains('hidden') && els.relicSearchInput) {
        els.relicSearchInput.focus();
      } else {
        els.searchInput.focus();
      }
    }
    if (e.key === 'Escape') {
      els.calculatorModal.classList.add('hidden');
      els.resetModal.classList.add('hidden');
      closeNewsModal();
      closeItemInfoModal();
      closeScanModal(false);
    }
  });

  if (window.electronAPI && window.electronAPI.onOcrScanProgress) {
    window.electronAPI.onOcrScanProgress(handleOcrScanProgress);
  }

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
  if (els.itemInfoTabWiki) {
    els.itemInfoTabWiki.addEventListener('click', function() { openWikiTabForCurrentItem(); });
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
  if (els.itemInfoWikiContent) {
    els.itemInfoWikiContent.addEventListener('click', function(evt) {
      var target = evt.target;
      if (!target || !target.closest) return;
      var link = target.closest('a[href]');
      if (!link) return;
      evt.preventDefault();
      window.open(link.href, '_blank', 'noopener');
    });
  }

  // ---------- Panel Switching (Checklist Ã¢â€ â€ Market) ----------
  var marketLoaded = false;

  function getPanelRefs() {
    return {
      checklist: $('#content'),
      market: $('#market-panel'),
      analytics: $('#trade-analytics-panel'),
      prime: $('#prime-panel'),
      relics: $('#relics-panel'),
      arcanes: $('#arcanes-panel'),
      cycles: $('#cycles-panel'),
      starchart: $('#starchart-panel'),
      settings: $('#settings-page')
    };
  }

  function getCurrentPanelName() {
    var refs = getPanelRefs();
    if (refs.settings && !refs.settings.classList.contains('hidden')) return 'settings';
    if (refs.starchart && !refs.starchart.classList.contains('hidden')) return 'starchart';
    if (refs.cycles && !refs.cycles.classList.contains('hidden')) return 'cycles';
    if (refs.arcanes && !refs.arcanes.classList.contains('hidden')) return 'arcanes';
    if (refs.relics && !refs.relics.classList.contains('hidden')) return 'relics';
    if (refs.prime && !refs.prime.classList.contains('hidden')) return 'prime';
    if (refs.analytics && !refs.analytics.classList.contains('hidden')) return 'analytics';
    if (refs.market && !refs.market.classList.contains('hidden')) return 'market';
    return 'checklist';
  }

  function applyPanelVisibility(panel, refs) {
    var contentEl = refs.checklist;
    var marketPanel = refs.market;
    var analyticsPanel = refs.analytics;
    var primePanel = refs.prime;
    var relicsPanel = refs.relics;
    var arcanesPanel = refs.arcanes;
    var cyclesPanel = refs.cycles;
    var starchartPanel = refs.starchart;
    var settingsPage = refs.settings;

    var navMarket = $('#nav-market');
    var navAnalytics = $('#nav-trade-analytics');
    var navPrime = $('#nav-prime-resurgence');
    var navRelics = $('#nav-relics');
    var navArcanes = $('#nav-arcanes');
    var navCycles = $('#nav-cycles');
    var navStarchart = $('#nav-starchart');

    // Stop starchart animation when leaving that panel
    if (panel !== 'starchart' && window.warframeStarchart) {
      window.warframeStarchart.stopAnimation();
    }
    if (panel !== 'starchart') {
      closeStarchartNightwavePanel(false);
    }

    if (panel === 'market') {
      contentEl.classList.add('hidden');
      marketPanel.classList.remove('hidden');
      if (analyticsPanel) analyticsPanel.classList.add('hidden');
      if (primePanel) primePanel.classList.add('hidden');
      if (relicsPanel) relicsPanel.classList.add('hidden');
      if (arcanesPanel) arcanesPanel.classList.add('hidden');
      if (cyclesPanel) cyclesPanel.classList.add('hidden');
      if (starchartPanel) starchartPanel.classList.add('hidden');
      settingsPage.classList.add('hidden');
      $$('.nav-item[data-category]').forEach(function(b) { b.classList.remove('active'); });
      if (navMarket) navMarket.classList.add('active');
      if (navAnalytics) navAnalytics.classList.remove('active');
      if (navPrime) navPrime.classList.remove('active');
      if (navRelics) navRelics.classList.remove('active');
      if (navArcanes) navArcanes.classList.remove('active');
      if (navCycles) navCycles.classList.remove('active');
      if (navStarchart) navStarchart.classList.remove('active');
      stopPrimeCountdown();
      stopCycleCountdown();
      if (!marketLoaded && window.warframeMarket) {
        window.warframeMarket.init();
        window.warframeMarket.load();
        marketLoaded = true;
      }
    } else if (panel === 'analytics') {
      contentEl.classList.add('hidden');
      marketPanel.classList.add('hidden');
      if (analyticsPanel) analyticsPanel.classList.remove('hidden');
      if (primePanel) primePanel.classList.add('hidden');
      if (relicsPanel) relicsPanel.classList.add('hidden');
      if (arcanesPanel) arcanesPanel.classList.add('hidden');
      if (cyclesPanel) cyclesPanel.classList.add('hidden');
      if (starchartPanel) starchartPanel.classList.add('hidden');
      settingsPage.classList.add('hidden');
      $$('.nav-item[data-category]').forEach(function(b) { b.classList.remove('active'); });
      if (navMarket) navMarket.classList.remove('active');
      if (navAnalytics) navAnalytics.classList.add('active');
      if (navPrime) navPrime.classList.remove('active');
      if (navRelics) navRelics.classList.remove('active');
      if (navArcanes) navArcanes.classList.remove('active');
      if (navCycles) navCycles.classList.remove('active');
      if (navStarchart) navStarchart.classList.remove('active');
      stopPrimeCountdown();
      stopCycleCountdown();
      if (!marketLoaded && window.warframeMarket) {
        window.warframeMarket.init();
        marketLoaded = true;
      }
      if (window.warframeMarket && typeof window.warframeMarket.loadAnalytics === 'function') {
        window.warframeMarket.loadAnalytics();
      }
    } else if (panel === 'prime') {
      contentEl.classList.add('hidden');
      marketPanel.classList.add('hidden');
      if (analyticsPanel) analyticsPanel.classList.add('hidden');
      if (primePanel) primePanel.classList.remove('hidden');
      if (relicsPanel) relicsPanel.classList.add('hidden');
      if (arcanesPanel) arcanesPanel.classList.add('hidden');
      if (cyclesPanel) cyclesPanel.classList.add('hidden');
      if (starchartPanel) starchartPanel.classList.add('hidden');
      settingsPage.classList.add('hidden');
      $$('.nav-item[data-category]').forEach(function(b) { b.classList.remove('active'); });
      if (navMarket) navMarket.classList.remove('active');
      if (navAnalytics) navAnalytics.classList.remove('active');
      if (navPrime) navPrime.classList.add('active');
      if (navRelics) navRelics.classList.remove('active');
      if (navArcanes) navArcanes.classList.remove('active');
      if (navCycles) navCycles.classList.remove('active');
      if (navStarchart) navStarchart.classList.remove('active');
      stopCycleCountdown();
      loadPrimeResurgence(false);
    } else if (panel === 'relics') {
      contentEl.classList.add('hidden');
      marketPanel.classList.add('hidden');
      if (analyticsPanel) analyticsPanel.classList.add('hidden');
      if (primePanel) primePanel.classList.add('hidden');
      if (relicsPanel) relicsPanel.classList.remove('hidden');
      if (arcanesPanel) arcanesPanel.classList.add('hidden');
      if (cyclesPanel) cyclesPanel.classList.add('hidden');
      if (starchartPanel) starchartPanel.classList.add('hidden');
      settingsPage.classList.add('hidden');
      $$('.nav-item[data-category]').forEach(function(b) { b.classList.remove('active'); });
      if (navMarket) navMarket.classList.remove('active');
      if (navAnalytics) navAnalytics.classList.remove('active');
      if (navPrime) navPrime.classList.remove('active');
      if (navRelics) navRelics.classList.add('active');
      if (navArcanes) navArcanes.classList.remove('active');
      if (navCycles) navCycles.classList.remove('active');
      if (navStarchart) navStarchart.classList.remove('active');
      stopPrimeCountdown();
      stopCycleCountdown();
      loadRelicDirectory(false);
    } else if (panel === 'arcanes') {
      contentEl.classList.add('hidden');
      marketPanel.classList.add('hidden');
      if (analyticsPanel) analyticsPanel.classList.add('hidden');
      if (primePanel) primePanel.classList.add('hidden');
      if (relicsPanel) relicsPanel.classList.add('hidden');
      if (arcanesPanel) arcanesPanel.classList.remove('hidden');
      if (cyclesPanel) cyclesPanel.classList.add('hidden');
      if (starchartPanel) starchartPanel.classList.add('hidden');
      settingsPage.classList.add('hidden');
      $$('.nav-item[data-category]').forEach(function(b) { b.classList.remove('active'); });
      if (navMarket) navMarket.classList.remove('active');
      if (navAnalytics) navAnalytics.classList.remove('active');
      if (navPrime) navPrime.classList.remove('active');
      if (navRelics) navRelics.classList.remove('active');
      if (navArcanes) navArcanes.classList.add('active');
      if (navCycles) navCycles.classList.remove('active');
      if (navStarchart) navStarchart.classList.remove('active');
      stopPrimeCountdown();
      stopCycleCountdown();
      loadArcaneDirectory(false);
    } else if (panel === 'cycles') {
      contentEl.classList.add('hidden');
      marketPanel.classList.add('hidden');
      if (analyticsPanel) analyticsPanel.classList.add('hidden');
      if (primePanel) primePanel.classList.add('hidden');
      if (relicsPanel) relicsPanel.classList.add('hidden');
      if (arcanesPanel) arcanesPanel.classList.add('hidden');
      if (cyclesPanel) cyclesPanel.classList.remove('hidden');
      if (starchartPanel) starchartPanel.classList.add('hidden');
      settingsPage.classList.add('hidden');
      $$('.nav-item[data-category]').forEach(function(b) { b.classList.remove('active'); });
      if (navMarket) navMarket.classList.remove('active');
      if (navAnalytics) navAnalytics.classList.remove('active');
      if (navPrime) navPrime.classList.remove('active');
      if (navRelics) navRelics.classList.remove('active');
      if (navArcanes) navArcanes.classList.remove('active');
      if (navCycles) navCycles.classList.add('active');
      if (navStarchart) navStarchart.classList.remove('active');
      stopPrimeCountdown();
      loadCycles();
    } else if (panel === 'starchart') {
      contentEl.classList.add('hidden');
      marketPanel.classList.add('hidden');
      if (analyticsPanel) analyticsPanel.classList.add('hidden');
      if (primePanel) primePanel.classList.add('hidden');
      if (relicsPanel) relicsPanel.classList.add('hidden');
      if (arcanesPanel) arcanesPanel.classList.add('hidden');
      if (cyclesPanel) cyclesPanel.classList.add('hidden');
      if (starchartPanel) starchartPanel.classList.remove('hidden');
      settingsPage.classList.add('hidden');
      $$('.nav-item[data-category]').forEach(function(b) { b.classList.remove('active'); });
      if (navMarket) navMarket.classList.remove('active');
      if (navAnalytics) navAnalytics.classList.remove('active');
      if (navPrime) navPrime.classList.remove('active');
      if (navRelics) navRelics.classList.remove('active');
      if (navArcanes) navArcanes.classList.remove('active');
      if (navCycles) navCycles.classList.remove('active');
      if (navStarchart) navStarchart.classList.add('active');
      stopPrimeCountdown();
      stopCycleCountdown();
      if (window.warframeStarchart) {
        window.warframeStarchart.init();
        setTimeout(function() {
          window.warframeStarchart.resizeStarField();
          window.warframeStarchart.resizeTwinkle();
          window.warframeStarchart.startAnimation();
        }, 50);
      }
      renderStarchartNightwavePanel({ loading: !cycleSnapshot || !cycleSnapshot.worldstate });
    } else if (panel === 'settings') {
      contentEl.classList.add('hidden');
      marketPanel.classList.add('hidden');
      if (analyticsPanel) analyticsPanel.classList.add('hidden');
      if (primePanel) primePanel.classList.add('hidden');
      if (relicsPanel) relicsPanel.classList.add('hidden');
      if (arcanesPanel) arcanesPanel.classList.add('hidden');
      if (cyclesPanel) cyclesPanel.classList.add('hidden');
      if (starchartPanel) starchartPanel.classList.add('hidden');
      settingsPage.classList.remove('hidden');
      if (navMarket) navMarket.classList.remove('active');
      if (navAnalytics) navAnalytics.classList.remove('active');
      if (navPrime) navPrime.classList.remove('active');
      if (navRelics) navRelics.classList.remove('active');
      if (navArcanes) navArcanes.classList.remove('active');
      if (navCycles) navCycles.classList.remove('active');
      if (navStarchart) navStarchart.classList.remove('active');
      stopPrimeCountdown();
      stopCycleCountdown();
    } else {
      contentEl.classList.remove('hidden');
      marketPanel.classList.add('hidden');
      if (analyticsPanel) analyticsPanel.classList.add('hidden');
      if (primePanel) primePanel.classList.add('hidden');
      if (relicsPanel) relicsPanel.classList.add('hidden');
      if (arcanesPanel) arcanesPanel.classList.add('hidden');
      if (cyclesPanel) cyclesPanel.classList.add('hidden');
      if (starchartPanel) starchartPanel.classList.add('hidden');
      settingsPage.classList.add('hidden');
      if (navMarket) navMarket.classList.remove('active');
      if (navAnalytics) navAnalytics.classList.remove('active');
      if (navPrime) navPrime.classList.remove('active');
      if (navRelics) navRelics.classList.remove('active');
      if (navArcanes) navArcanes.classList.remove('active');
      if (navCycles) navCycles.classList.remove('active');
      if (navStarchart) navStarchart.classList.remove('active');
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

  var navTradeAnalytics = $('#nav-trade-analytics');
  if (navTradeAnalytics) {
    navTradeAnalytics.addEventListener('click', function() {
      showPanel('analytics', true);
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(function() {
          var analyticsSearchInput = $('#trade-analytics-search-input');
          if (analyticsSearchInput) analyticsSearchInput.focus();
        });
      }
    });
  }

  var navPrimeResurgence = $('#nav-prime-resurgence');
  if (navPrimeResurgence) {
    navPrimeResurgence.addEventListener('click', function() {
      showPanel('prime', true);
    });
  }

  var navRelics = $('#nav-relics');
  if (navRelics) {
    navRelics.addEventListener('click', function() {
      showPanel('relics', true);
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(function() {
          if (els.relicSearchInput) els.relicSearchInput.focus();
        });
      }
    });
  }

  var navArcanes = $('#nav-arcanes');
  if (navArcanes) {
    navArcanes.addEventListener('click', function() {
      showPanel('arcanes', true);
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(function() {
          if (els.arcaneSearchInput) els.arcaneSearchInput.focus();
        });
      }
    });
  }

  var navCycles = $('#nav-cycles');
  if (navCycles) {
    navCycles.addEventListener('click', function() {
      showPanel('cycles', true);
    });
  }

  var navStarchartEl = $('#nav-starchart');
  if (navStarchartEl) {
    navStarchartEl.addEventListener('click', function() {
      showPanel('starchart', true);
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

  if (els.starchartNightwaveBanner) {
    els.starchartNightwaveBanner.addEventListener('click', function() {
      toggleStarchartNightwavePanel();
    });
  }

  if (els.starchartNightwaveClose) {
    els.starchartNightwaveClose.addEventListener('click', function() {
      closeStarchartNightwavePanel(true);
    });
  }

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && isStarchartNightwaveOpen()) {
      closeStarchartNightwavePanel(true);
    }
  });

  // Override category nav clicks to ensure we return to checklist
  $$('.nav-item[data-category]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      showPanel('checklist');
    });
  });

  // ---------- Init ----------
  initNativeUpdaterBridge();
  initThemeSetting();
  initAppVersion();
  initAlwaysOnTopSetting();
  initAutoUpdateSetting();
  initProfileFetchSetting();
  initSidebarToggle();
  initRemovedProfileStorageMigration();
  loadItems();

})();
