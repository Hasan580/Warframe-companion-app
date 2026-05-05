// ==========================================
//  WARFRAME MARKET MODULE
// ==========================================

(function () {
  'use strict';

  const MARKET_API = 'https://api.warframe.market/v2/items';
  const AUCTIONS_PAGE_URL = 'https://warframe.market/auctions';
  const AUCTIONS_SEARCH_API = 'https://api.warframe.market/v1/auctions/search';
  const ORDERS_API_V2 = 'https://api.warframe.market/v2/orders/item';
  const ORDERS_API_V1 = 'https://api.warframe.market/v1/items';
  const STATS_API_V1 = 'https://api.warframe.market/v1/items';
  const CDN_BASE = 'https://warframe.market/static/assets/';
  const MARKET_CACHE_KEY = 'warframe_market_items_v3';
  const CONTRACTS_LOOKUP_CACHE_KEY = 'warframe_market_contract_lookups_v1';
  const MARKET_CACHE_TTL = 60 * 60 * 1000; // 1 hour
  const CONTRACTS_LOOKUP_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours
  const ANALYTICS_STATS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  const CONTRACT_RESULTS_BATCH_SIZE = 60;
  const CONTRACT_ANY_EPHEMERA_VALUE = '__any_ephemera__';
  const ANALYTICS_DEFAULT_PICK_NAMES = [
    'Arcane Energize',
    'Arcane Grace',
    'Primed Continuity',
    'Glaive Prime Set',
    'Harrow Prime Set',
    'Nekros Prime Set',
    'Aya',
    'Legendary Core'
  ];

  let marketItems = [];
  let filteredMarketItems = [];
  let marketSearchQuery = '';
  let marketCategory = 'all';
  let currentOrdersSlug = null;
  let currentOrdersItemName = null;
  let currentOrdersWikiUrl = null;
  let ordersOnlineOnly = false;
  let ordersOnlineMode = 'all_online';
  let ordersRefreshInterval = null;
  let marketInitialized = false;
  let marketViewMode = 'items';
  let analyticsSearchQuery = '';
  let analyticsSelectedSlug = '';
  let analyticsCurrentItem = null;
  let analyticsStatsCache = Object.create(null);
  let analyticsRequestToken = 0;
  let contractsLookupData = null;
  let contractsLookupPromise = null;
  let contractsLookupError = '';
  let contractsResults = [];
  let contractsLoading = false;
  let contractsError = '';
  let contractsHasSearched = false;
  let contractsRequestToken = 0;
  let contractsVisibleCount = CONTRACT_RESULTS_BATCH_SIZE;
  let contractsFilters = createDefaultContractsFilters();

  const $ = function (sel) { return document.querySelector(sel); };

  function createDefaultContractsFilters(type) {
    return {
      type: type || 'riven',
      weaponUrlName: '',
      positiveStats: ['', '', ''],
      negativeStat: '',
      modRank: 'any',
      element: '',
      ephemera: '',
      sortBy: 'price_asc',
      quickSearch: ''
    };
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getMarketPanelRefs() {
    return {
      topbar: document.querySelector('#market-panel .content-topbar'),
      categoriesList: $('#market-categories-list'),
      contractsBtn: $('#market-contracts-btn'),
      contractsBtnLabel: $('#market-contracts-btn-label'),
      title: $('#market-panel-title'),
      count: $('#market-item-count'),
      grid: $('#market-grid'),
      contractsView: $('#contracts-view')
    };
  }

  function updateMarketPanelHeader() {
    var refs = getMarketPanelRefs();
    if (!refs.title || !refs.count) return;

    if (marketViewMode === 'contracts') {
      refs.title.textContent = 'Contracts';

      if (contractsLookupError) {
        refs.count.textContent = 'status unavailable';
      } else if (contractsLoading) {
        refs.count.textContent = 'Searching live auctions...';
      } else if (!canSearchContracts()) {
        refs.count.textContent = 'Pick filters for Rivens, Liches, or Sisters';
      } else if (!contractsHasSearched) {
        refs.count.textContent = 'Ready to search';
      } else {
        refs.count.textContent = getFilteredContractsResults().length + ' contracts';
      }
      return;
    }

    refs.title.textContent = 'Warframe Market';
    refs.count.textContent = filteredMarketItems.length + ' items';
  }

  function renderMarketViewState() {
    var refs = getMarketPanelRefs();
    if (refs.topbar) refs.topbar.classList.toggle('hidden', marketViewMode === 'contracts');
    if (refs.categoriesList) refs.categoriesList.classList.toggle('hidden', marketViewMode === 'contracts');
    if (refs.grid) refs.grid.classList.toggle('hidden', marketViewMode === 'contracts');
    if (refs.contractsView) refs.contractsView.classList.toggle('hidden', marketViewMode !== 'contracts');

    if (refs.contractsBtn) refs.contractsBtn.classList.toggle('active', marketViewMode === 'contracts');
    if (refs.contractsBtnLabel) refs.contractsBtnLabel.textContent = marketViewMode === 'contracts' ? 'Back To Market' : 'Contracts';

    updateMarketPanelHeader();
  }

  async function setMarketViewMode(mode) {
    marketViewMode = mode === 'contracts' ? 'contracts' : 'items';
    renderMarketViewState();

    if (marketViewMode === 'contracts') {
      try {
        await ensureContractsLookupData();
      } catch (err) {
        /* render fallback below */
      }
      renderContractsView();
      return;
    }

    applyMarketFilters();
  }

  function safeNameFromSlug(slug) {
    if (!slug) return 'Unknown Item';
    return String(slug)
      .replace(/^\/+/, '')
      .split(/[_-]+/)
      .filter(Boolean)
      .map(function(part) { return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(); })
      .join(' ');
  }

  function getMarketImageUrl(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return CDN_BASE + String(path).replace(/^\/+/, '');
  }

  function getMarketDisplayImage(item) {
    if (!item) return '';
    return item.subIcon || item.thumb || item.icon || '';
  }

  function buildWikiUrl(item) {
    var direct = String(item && (item.wikiaUrl || item.wikiUrl) ? (item.wikiaUrl || item.wikiUrl) : '').trim();
    if (direct) return direct;

    var name = String(item && item.name ? item.name : '').trim();
    if (!name) return '';
    return 'https://warframe.fandom.com/wiki/' + encodeURIComponent(name.replace(/\s+/g, '_'));
  }

  function normalizeMarketName(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/[’'`]/g, '')
      .replace(/[^a-z0-9+]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function getCompanionImprintMarketName(name) {
    var raw = String(name || '').trim();
    if (!raw) return '';
    if (/^helminth charger$/i.test(raw)) return raw + ' Imprint';
    if (/(kubrow|kavat|vulpaphyla|predasite)$/i.test(raw)) return raw + ' Imprint';
    return '';
  }

  function getMarketNameCandidates(name) {
    var raw = String(name || '').trim();
    var base = normalizeMarketName(raw);
    if (!base) return [];

    var out = [];
    var imprintName = getCompanionImprintMarketName(raw);
    if (imprintName) out.push(normalizeMarketName(imprintName));
    out.push(base);
    out.push(base + ' blueprint');
    out.push(base + ' set');

    return out.filter(function(candidate, index, list) {
      return !!candidate && list.indexOf(candidate) === index;
    });
  }

  function findMarketItemByName(name) {
    var candidates = getMarketNameCandidates(name);
    if (candidates.length === 0) return null;

    for (var c = 0; c < candidates.length; c++) {
      var candidate = candidates[c];
      for (var i = 0; i < marketItems.length; i++) {
        if (normalizeMarketName(marketItems[i].name) === candidate) {
          return marketItems[i];
        }
      }
    }

    return null;
  }

  async function openItemByName(name) {
    if (marketViewMode !== 'items') {
      await setMarketViewMode('items');
    }

    if (!marketItems || marketItems.length === 0) {
      await loadMarketItems();
    }

    var item = findMarketItemByName(name);
    if (!item) {
      return { ok: false };
    }

    await openOrdersModal(item);
    return { ok: true, slug: item.slug, name: item.name };
  }

  async function searchItemByName(name) {
    if (marketViewMode !== 'items') {
      await setMarketViewMode('items');
    }

    if (!marketItems || marketItems.length === 0) {
      await loadMarketItems();
    }

    var input = $('#market-search-input');
    var clearBtn = $('#market-search-clear');
    var query = String(name || '').trim();

    marketSearchQuery = query;
    marketCategory = 'all';

    if (input) input.value = query;
    if (clearBtn) clearBtn.classList.toggle('hidden', !query);

    document.querySelectorAll('.market-cat-btn').forEach(function (b) { b.classList.remove('active'); });
    var allBtn = document.querySelector('.market-cat-btn[data-market-cat="all"]');
    if (allBtn) allBtn.classList.add('active');

    closeOrdersModal();
    applyMarketFilters();

    var grid = $('#market-grid');
    if (grid) grid.scrollTop = 0;

    return { ok: true, query: query };
  }

  // Tag → Category mapping
  function getMarketCategory(tags) {
    if (!tags) return 'misc';
    if (tags.includes('mod') || tags.includes('stance') || tags.includes('aura')) return 'mods';
    if (tags.includes('arcane_enhancement') || tags.includes('arcane_helmet')) return 'arcanes';
    if (tags.includes('set') && tags.includes('prime')) return 'prime_sets';
    if (tags.includes('prime') && (tags.includes('blueprint') || tags.includes('component'))) return 'prime_parts';
    if (tags.includes('riven_mod')) return 'rivens';
    if (tags.includes('weapon') || tags.includes('set')) return 'weapons';
    if (tags.includes('blueprint')) return 'blueprints';
    if (tags.includes('gem') || tags.includes('fish') || tags.includes('lens') || tags.includes('ayatan_sculpture')) return 'resources';
    return 'misc';
  }

  function findMarketItemBySlug(slug) {
    var target = String(slug || '').trim();
    if (!target) return null;

    for (var i = 0; i < marketItems.length; i++) {
      if (marketItems[i] && marketItems[i].slug === target) {
        return marketItems[i];
      }
    }

    return null;
  }

  function formatPlatValue(value) {
    var num = Number(value);
    if (!isFinite(num)) return '--';
    var rounded = Math.round(num * 10) / 10;
    return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + 'p';
  }

  function formatSignedPlatValue(value) {
    var num = Number(value);
    if (!isFinite(num)) return '--';
    var prefix = num > 0 ? '+' : '';
    return prefix + formatPlatValue(num).replace(/p$/, '') + 'p';
  }

  function formatMetricNumber(value) {
    var num = Number(value);
    if (!isFinite(num)) return '--';
    return Math.round(num).toLocaleString();
  }

  function formatAnalyticsDate(value) {
    if (!value) return '--';
    var date = new Date(value);
    if (isNaN(date.getTime())) return '--';
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  }

  function formatAnalyticsTimestamp(value) {
    if (!value) return 'Waiting for market data';
    var date = new Date(value);
    if (isNaN(date.getTime())) return 'Waiting for market data';
    return 'Updated ' + date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function getAnalyticsQuickPickItems() {
    var picks = [];
    var seen = Object.create(null);
    var i;

    for (i = 0; i < ANALYTICS_DEFAULT_PICK_NAMES.length; i++) {
      var exact = findMarketItemByName(ANALYTICS_DEFAULT_PICK_NAMES[i]);
      if (exact && !seen[exact.slug]) {
        seen[exact.slug] = true;
        picks.push(exact);
      }
    }

    if (picks.length >= 8) return picks.slice(0, 8);

    var preferredCategories = ['prime_sets', 'arcanes', 'mods', 'weapons', 'resources'];
    for (i = 0; i < marketItems.length; i++) {
      var item = marketItems[i];
      if (!item || seen[item.slug]) continue;
      if (preferredCategories.indexOf(item.category) === -1) continue;
      seen[item.slug] = true;
      picks.push(item);
      if (picks.length >= 8) break;
    }

    return picks.slice(0, 8);
  }

  function getAnalyticsSearchResults() {
    var query = normalizeMarketName(analyticsSearchQuery);
    if (!query) return getAnalyticsQuickPickItems();

    return marketItems
      .map(function(item) {
        var normalized = normalizeMarketName(item.name);
        var index = normalized.indexOf(query);
        return {
          item: item,
          score: index === -1 ? Number.MAX_SAFE_INTEGER : index,
          normalized: normalized
        };
      })
      .filter(function(entry) { return entry.score !== Number.MAX_SAFE_INTEGER; })
      .sort(function(a, b) {
        if (a.score !== b.score) return a.score - b.score;
        if (a.normalized.length !== b.normalized.length) return a.normalized.length - b.normalized.length;
        return a.item.name.localeCompare(b.item.name);
      })
      .slice(0, 12)
      .map(function(entry) { return entry.item; });
  }

  function createAnalyticsPlaceholder(text) {
    var el = document.createElement('div');
    el.className = 'trade-analytics-empty-message';
    el.textContent = text;
    return el;
  }

  function saveContractsLookupCache(data) {
    try {
      localStorage.setItem(CONTRACTS_LOOKUP_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: data
      }));
    } catch (e) { /* ignore quota */ }
  }

  function loadContractsLookupCache() {
    try {
      var raw = localStorage.getItem(CONTRACTS_LOOKUP_CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.data) return null;
      if (Date.now() - parsed.timestamp > CONTRACTS_LOOKUP_CACHE_TTL) return null;
      return parsed.data;
    } catch (e) {
      return null;
    }
  }

  function sortLookupList(items, labelKey) {
    return items.slice().sort(function (a, b) {
      return String(a[labelKey] || '').localeCompare(String(b[labelKey] || ''));
    });
  }

  function normalizeContractsLookups(state) {
    var riven = state && state.riven ? state.riven : {};
    var lich = state && state.lich ? state.lich : {};
    var sister = state && state.sister ? state.sister : {};

    return {
      rivenWeapons: sortLookupList((Array.isArray(riven.items) ? riven.items : []).map(function (item) {
        return {
          name: item.item_name || '',
          urlName: item.url_name || '',
          icon: item.icon || item.thumb || '',
          thumb: item.thumb || item.icon || '',
          rivenType: item.riven_type || '',
          group: item.group || '',
          masteryLevel: typeof item.mastery_level === 'number' ? item.mastery_level : 0
        };
      }).filter(function (item) { return !!item.urlName; }), 'name'),
      rivenAttributes: sortLookupList((Array.isArray(riven.attributes) ? riven.attributes : []).map(function (item) {
        return {
          name: item.effect || '',
          urlName: item.url_name || '',
          units: item.units || '',
          exclusiveTo: Array.isArray(item.exclusive_to) ? item.exclusive_to.slice() : [],
          positiveOnly: !!item.positive_only,
          negativeOnly: !!item.negative_only,
          searchOnly: !!item.search_only
        };
      }).filter(function (item) { return !!item.urlName; }), 'name'),
      lichWeapons: sortLookupList((Array.isArray(lich.weapons) ? lich.weapons : []).map(function (item) {
        return {
          name: item.item_name || '',
          urlName: item.url_name || '',
          icon: item.icon || item.thumb || '',
          thumb: item.thumb || item.icon || ''
        };
      }).filter(function (item) { return !!item.urlName; }), 'name'),
      lichEphemeras: sortLookupList((Array.isArray(lich.ephemeras) ? lich.ephemeras : []).map(function (item) {
        return {
          name: item.item_name || '',
          urlName: item.url_name || '',
          icon: item.icon || item.thumb || '',
          thumb: item.thumb || item.icon || '',
          element: item.element || ''
        };
      }).filter(function (item) { return !!item.urlName; }), 'name'),
      sisterWeapons: sortLookupList((Array.isArray(sister.weapons) ? sister.weapons : []).map(function (item) {
        return {
          name: item.item_name || '',
          urlName: item.url_name || '',
          icon: item.icon || item.thumb || '',
          thumb: item.thumb || item.icon || ''
        };
      }).filter(function (item) { return !!item.urlName; }), 'name'),
      sisterEphemeras: sortLookupList((Array.isArray(sister.ephemeras) ? sister.ephemeras : []).map(function (item) {
        return {
          name: item.item_name || '',
          urlName: item.url_name || '',
          icon: item.icon || item.thumb || '',
          thumb: item.thumb || item.icon || '',
          element: item.element || ''
        };
      }).filter(function (item) { return !!item.urlName; }), 'name')
    };
  }

  async function ensureContractsLookupData() {
    if (contractsLookupData) return contractsLookupData;
    if (contractsLookupPromise) return contractsLookupPromise;

    var cached = loadContractsLookupCache();
    if (cached) {
      contractsLookupData = cached;
      contractsLookupError = '';
      return contractsLookupData;
    }

    contractsLookupPromise = fetch(AUCTIONS_PAGE_URL, {
      headers: {
        Platform: 'pc',
        Language: 'en'
      }
    }).then(function (resp) {
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return resp.text();
    }).then(function (html) {
      var match = html.match(/<script type="application\/json" id="application-state">([\s\S]*?)<\/script>/i);
      if (!match) throw new Error('Contracts bootstrap payload missing');
      var state = JSON.parse(match[1]);
      contractsLookupData = normalizeContractsLookups(state);
      contractsLookupError = '';
      saveContractsLookupCache(contractsLookupData);
      return contractsLookupData;
    }).catch(function (err) {
      contractsLookupError = err && err.message ? err.message : 'Failed to load contracts';
      throw err;
    }).finally(function () {
      contractsLookupPromise = null;
    });

    return contractsLookupPromise;
  }

  function findLookupByUrl(list, urlName) {
    if (!Array.isArray(list)) return null;

    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].urlName === urlName) {
        return list[i];
      }
    }

    return null;
  }

  function getContractsWeaponOptions() {
    if (!contractsLookupData) return [];
    if (contractsFilters.type === 'riven') return contractsLookupData.rivenWeapons;
    if (contractsFilters.type === 'lich') return contractsLookupData.lichWeapons;
    return contractsLookupData.sisterWeapons;
  }

  function getContractsEphemeraOptions() {
    if (!contractsLookupData) return [];
    return contractsFilters.type === 'lich' ? contractsLookupData.lichEphemeras : contractsLookupData.sisterEphemeras;
  }

  function getRivenAttributeOptions(negative) {
    if (!contractsLookupData) return [];

    var selectedWeapon = findLookupByUrl(contractsLookupData.rivenWeapons, contractsFilters.weaponUrlName);
    var rivenType = selectedWeapon ? selectedWeapon.rivenType : '';

    return contractsLookupData.rivenAttributes.filter(function (attr) {
      if (!attr || attr.searchOnly) return false;
      if (negative && attr.positiveOnly) return false;
      if (!negative && attr.negativeOnly) return false;
      if (!rivenType || !Array.isArray(attr.exclusiveTo) || attr.exclusiveTo.length === 0) return true;
      return attr.exclusiveTo.indexOf(rivenType) !== -1;
    });
  }

  function getContractElementOptions() {
    var ephemeras = getContractsEphemeraOptions();
    var seen = Object.create(null);
    var out = [];

    for (var i = 0; i < ephemeras.length; i++) {
      var element = String(ephemeras[i].element || '').trim();
      if (!element || seen[element]) continue;
      seen[element] = true;
      out.push({
        value: element,
        label: element.charAt(0).toUpperCase() + element.slice(1)
      });
    }

    return out.sort(function (a, b) { return a.label.localeCompare(b.label); });
  }

  function formatContractTypeLabel(type) {
    if (type === 'lich') return 'Kuva Lich';
    if (type === 'sister') return 'Sister Of Parvos';
    return 'Riven Mod';
  }

  function formatRelativeTime(value) {
    if (!value) return 'just now';
    var date = new Date(value);
    if (isNaN(date.getTime())) return 'just now';

    var diffMs = Date.now() - date.getTime();
    var diffMinutes = Math.max(0, Math.round(diffMs / 60000));
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return diffMinutes + 'm ago';

    var diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return diffHours + 'h ago';

    var diffDays = Math.round(diffHours / 24);
    if (diffDays < 7) return diffDays + 'd ago';

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  }

  function formatContractAttributeValue(attribute, lookup) {
    var value = Number(attribute && attribute.value);
    if (!isFinite(value)) return '';

    var absValue = Math.abs(value);
    var prefix = value > 0 ? '+' : '-';
    var units = lookup && lookup.units ? lookup.units : '';
    var rendered = absValue % 1 === 0 ? absValue.toFixed(0) : absValue.toFixed(1);

    if (units === 'percent') return prefix + rendered + '%';
    if (units === 'multiply') return prefix + rendered + 'x';
    if (units === 'seconds') return prefix + rendered + 's';
    if (units === 'degrees') return prefix + rendered + 'deg';
    return prefix + rendered;
  }

  function getAuctionSearchText(auction) {
    var owner = auction && auction.owner ? auction.owner : {};
    var item = auction && auction.item ? auction.item : {};
    var searchParts = [
      owner.ingame_name,
      item.name,
      item.weapon_url_name,
      item.element,
      auction.note_raw
    ];

    if (Array.isArray(item.attributes)) {
      for (var i = 0; i < item.attributes.length; i++) {
        searchParts.push(item.attributes[i] && item.attributes[i].url_name ? item.attributes[i].url_name : '');
      }
    }

    return searchParts.join(' ').toLowerCase();
  }

  function getFilteredContractsResults() {
    var quickSearch = String(contractsFilters.quickSearch || '').toLowerCase().trim();
    var results = contractsResults.slice();

    if (quickSearch) {
      results = results.filter(function (auction) {
        return getAuctionSearchText(auction).indexOf(quickSearch) !== -1;
      });
    }

    results.sort(function (a, b) {
      if (contractsFilters.sortBy === 'price_desc') {
        return Number(b.buyout_price || b.starting_price || 0) - Number(a.buyout_price || a.starting_price || 0);
      }

      if (contractsFilters.sortBy === 'created_desc') {
        return new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime();
      }

      return Number(a.buyout_price || a.starting_price || 0) - Number(b.buyout_price || b.starting_price || 0);
    });

    return results;
  }

  function canSearchContracts() {
    if (contractsFilters.type === 'riven') return !!contractsFilters.weaponUrlName;
    if (contractsFilters.weaponUrlName) return true;
    if (contractsFilters.element) return true;
    if (contractsFilters.ephemera && contractsFilters.ephemera !== CONTRACT_ANY_EPHEMERA_VALUE) return true;
    return false;
  }

  function buildContractsQueryString() {
    var params = new URLSearchParams();
    params.set('type', contractsFilters.type);
    params.set('sort_by', 'price_asc');

    if (contractsFilters.weaponUrlName) {
      params.set('weapon_url_name', contractsFilters.weaponUrlName);
    }

    if (contractsFilters.type === 'riven') {
      var positiveStats = contractsFilters.positiveStats.filter(function (value, index, list) {
        return !!value && list.indexOf(value) === index;
      });
      if (positiveStats.length > 0) params.set('positive_stats', positiveStats.join(','));
      if (contractsFilters.negativeStat) params.set('negative_stats', contractsFilters.negativeStat);
      if (contractsFilters.modRank === 'maxed') params.set('mod_rank', 'maxed');
      return params.toString();
    }

    var selectedEphemera = findLookupByUrl(getContractsEphemeraOptions(), contractsFilters.ephemera);
    var element = contractsFilters.element;
    if (selectedEphemera && selectedEphemera.element) {
      element = selectedEphemera.element;
    }

    if (element) params.set('element', element);
    if (contractsFilters.ephemera === CONTRACT_ANY_EPHEMERA_VALUE || selectedEphemera) {
      params.set('has_ephemera', 'true');
    }

    return params.toString();
  }

  async function searchContracts() {
    contractsError = '';

    if (!canSearchContracts()) {
      contractsResults = [];
      contractsHasSearched = false;
      contractsVisibleCount = CONTRACT_RESULTS_BATCH_SIZE;
      renderContractsView();
      return;
    }

    contractsLoading = true;
    contractsHasSearched = true;
    contractsVisibleCount = CONTRACT_RESULTS_BATCH_SIZE;
    renderContractsView();

    var requestToken = ++contractsRequestToken;
    try {
      var resp = await fetch(AUCTIONS_SEARCH_API + '?' + buildContractsQueryString(), {
        headers: {
          Platform: 'pc',
          Language: 'en'
        }
      });

      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var json = await resp.json();

      if (requestToken !== contractsRequestToken) return;

      contractsResults = Array.isArray(json && json.payload && json.payload.auctions) ? json.payload.auctions.slice() : [];
      contractsError = '';
    } catch (err) {
      if (requestToken !== contractsRequestToken) return;
      contractsResults = [];
      contractsError = err && err.message ? err.message : 'Failed to load contracts';
    } finally {
      if (requestToken === contractsRequestToken) {
        contractsLoading = false;
        renderContractsView();
      }
    }
  }

  function buildOptionsMarkup(options, selectedValue, emptyLabel) {
    var html = '';
    if (typeof emptyLabel === 'string') {
      html += '<option value="">' + escapeHtml(emptyLabel) + '</option>';
    }

    for (var i = 0; i < options.length; i++) {
      var option = options[i];
      var value = option.value;
      var selected = selectedValue === value ? ' selected' : '';
      html += '<option value="' + escapeHtml(value) + '"' + selected + '>' + escapeHtml(option.label) + '</option>';
    }

    return html;
  }

  function getContractsSummaryText() {
    if (contractsLoading) return 'Live Search';
    if (contractsFilters.type === 'riven') return 'Rivens';
    if (contractsFilters.type === 'lich') return 'Kuva Liches';
    return 'Sisters';
  }

  function getContractsSearchHint() {
    if (contractsFilters.type === 'riven') {
      return 'Pick a weapon first, then narrow with positive or negative stats.';
    }

    return 'Search by weapon, by element, by ephemera, or combine them for tighter results.';
  }

  function getContractsResultsTitle() {
    if (contractsFilters.type === 'riven') return 'Riven Contracts';
    if (contractsFilters.type === 'lich') return 'Kuva Lich Contracts';
    return 'Sister Contracts';
  }

  function getContractsResultsSubtext(filteredResults) {
    if (!canSearchContracts()) return 'Choose your filters above to load live warframe.market contracts.';
    if (contractsLoading) return 'Searching live warframe.market auctions...';
    if (contractsError) return 'Search unavailable right now.';
    if (!contractsHasSearched) return 'Press Search Contracts to load live listings for the current filters.';

    var total = filteredResults.length;
    if (total === 0) return 'No matching contracts were found for the current filters.';

    var rendered = Math.min(total, contractsVisibleCount);
    return 'Showing ' + rendered + ' of ' + total + ' matching contracts.';
  }

  function renderContractsView() {
    var refs = getMarketPanelRefs();
    if (!refs.contractsView) return;

    updateMarketPanelHeader();

    if (contractsLookupError && !contractsLookupData) {
      refs.contractsView.innerHTML = '' +
        '<div class="contracts-results-shell">' +
          '<div class="contracts-empty">' +
            '<h3 class="contracts-empty-title">Contracts unavailable</h3>' +
            '<p class="contracts-empty-copy">' + escapeHtml(contractsLookupError) + '</p>' +
          '</div>' +
        '</div>';
      return;
    }

    if (!contractsLookupData && contractsLookupPromise) {
      refs.contractsView.innerHTML = '' +
        '<div class="contracts-results-shell">' +
          '<div class="contracts-loading">' +
            '<h3 class="contracts-loading-title">Loading contracts</h3>' +
            '<p class="contracts-loading-copy">Fetching the live Riven, Lich, Sister, weapon, and ephemera lists from warframe.market.</p>' +
          '</div>' +
        '</div>';
      return;
    }

    var weaponOptions = getContractsWeaponOptions().map(function (item) {
      return { value: item.urlName, label: item.name };
    });
    var elementOptions = getContractElementOptions();
    var ephemeraOptions = getContractsEphemeraOptions().map(function (item) {
      return { value: item.urlName, label: item.name };
    });
    ephemeraOptions.unshift({ value: CONTRACT_ANY_EPHEMERA_VALUE, label: 'Has Any Ephemera' });

    var positiveOptions = getRivenAttributeOptions(false).map(function (item) {
      return { value: item.urlName, label: item.name };
    });
    var negativeOptions = getRivenAttributeOptions(true).map(function (item) {
      return { value: item.urlName, label: item.name };
    });

    refs.contractsView.innerHTML = '' +
      '<section class="contracts-hero">' +
        '<div class="contracts-hero-top">' +
          '<div>' +
            '<div class="contracts-eyebrow">Warframe Market</div>' +
            '<h2 class="contracts-title">Contracts</h2>' +
            '<p class="contracts-subtitle">Browse live Rivens, Kuva Liches, and Sisters of Parvos with fast filters for weapon, ephemera, element, and attribute combinations.</p>' +
          '</div>' +
          '<div class="contracts-summary-badge"><span class="material-icons-round">hub</span>' + escapeHtml(getContractsSummaryText()) + '</div>' +
        '</div>' +
        '<div class="contracts-type-switch">' +
          '<button class="contracts-type-btn' + (contractsFilters.type === 'riven' ? ' active' : '') + '" type="button" data-contract-type="riven">Rivens</button>' +
          '<button class="contracts-type-btn' + (contractsFilters.type === 'lich' ? ' active' : '') + '" type="button" data-contract-type="lich">Kuva Liches</button>' +
          '<button class="contracts-type-btn' + (contractsFilters.type === 'sister' ? ' active' : '') + '" type="button" data-contract-type="sister">Sisters</button>' +
        '</div>' +
        '<div class="contracts-filter-grid">' +
          '<label class="contracts-field">' +
            '<span class="contracts-field-label">Weapon</span>' +
            '<select class="contracts-select" id="contracts-weapon-select">' +
              buildOptionsMarkup(weaponOptions, contractsFilters.weaponUrlName, 'Any weapon') +
            '</select>' +
          '</label>' +
          (contractsFilters.type === 'riven'
            ? (
              '<label class="contracts-field"><span class="contracts-field-label">Positive 1</span><select class="contracts-select" id="contracts-positive-0">' + buildOptionsMarkup(positiveOptions, contractsFilters.positiveStats[0], 'Any positive stat') + '</select></label>' +
              '<label class="contracts-field"><span class="contracts-field-label">Positive 2</span><select class="contracts-select" id="contracts-positive-1">' + buildOptionsMarkup(positiveOptions, contractsFilters.positiveStats[1], 'Any positive stat') + '</select></label>' +
              '<label class="contracts-field"><span class="contracts-field-label">Positive 3</span><select class="contracts-select" id="contracts-positive-2">' + buildOptionsMarkup(positiveOptions, contractsFilters.positiveStats[2], 'Any positive stat') + '</select></label>' +
              '<label class="contracts-field"><span class="contracts-field-label">Negative</span><select class="contracts-select" id="contracts-negative-select">' + buildOptionsMarkup(negativeOptions, contractsFilters.negativeStat, 'No preference') + '</select></label>' +
              '<label class="contracts-field"><span class="contracts-field-label">Rank</span><select class="contracts-select" id="contracts-rank-select"><option value="any"' + (contractsFilters.modRank === 'any' ? ' selected' : '') + '>Any rank</option><option value="maxed"' + (contractsFilters.modRank === 'maxed' ? ' selected' : '') + '>Maxed only</option></select></label>'
            )
            : (
              '<label class="contracts-field"><span class="contracts-field-label">Element</span><select class="contracts-select" id="contracts-element-select">' + buildOptionsMarkup(elementOptions, contractsFilters.element, 'Any element') + '</select></label>' +
              '<label class="contracts-field"><span class="contracts-field-label">Ephemera</span><select class="contracts-select" id="contracts-ephemera-select">' + buildOptionsMarkup(ephemeraOptions, contractsFilters.ephemera, 'Any ephemera') + '</select></label>'
            )
          ) +
          '<label class="contracts-field"><span class="contracts-field-label">Sort</span><select class="contracts-select" id="contracts-sort-select"><option value="price_asc"' + (contractsFilters.sortBy === 'price_asc' ? ' selected' : '') + '>Price ascending</option><option value="price_desc"' + (contractsFilters.sortBy === 'price_desc' ? ' selected' : '') + '>Price descending</option><option value="created_desc"' + (contractsFilters.sortBy === 'created_desc' ? ' selected' : '') + '>Most recent</option></select></label>' +
          '<label class="contracts-field"><span class="contracts-field-label">Search Loaded Results</span><input class="contracts-control" id="contracts-quick-search" type="text" value="' + escapeHtml(contractsFilters.quickSearch) + '" placeholder="Seller, weapon, stat, note..."></label>' +
        '</div>' +
        '<div class="contracts-filter-actions">' +
          '<button class="btn btn-primary" id="contracts-apply-btn" type="button">Search Contracts</button>' +
          '<button class="btn btn-secondary" id="contracts-reset-btn" type="button">Reset Filters</button>' +
          '<span class="contracts-results-helper">' + escapeHtml(getContractsSearchHint()) + '</span>' +
        '</div>' +
      '</section>' +
      '<section class="contracts-results-shell">' +
        '<div class="contracts-results-head">' +
          '<div>' +
            '<h3 class="contracts-results-title">' + escapeHtml(getContractsResultsTitle()) + '</h3>' +
            '<div class="contracts-results-sub">' + escapeHtml(getContractsResultsSubtext(getFilteredContractsResults())) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="contracts-results" id="contracts-results-list"></div>' +
      '</section>';

    renderContractsResultsList($('#contracts-results-list'));
  }

  function renderContractsResultsList(listEl) {
    if (!listEl) return;
    listEl.textContent = '';

    if (contractsLoading) {
      var loadingEl = document.createElement('div');
      loadingEl.className = 'contracts-loading';
      loadingEl.innerHTML = '<h3 class="contracts-loading-title">Searching contracts</h3><p class="contracts-loading-copy">Pulling the latest live auctions from warframe.market.</p>';
      listEl.appendChild(loadingEl);
      return;
    }

    if (contractsError) {
      var errorEl = document.createElement('div');
      errorEl.className = 'contracts-empty';
      errorEl.innerHTML = '<h3 class="contracts-empty-title">Search failed</h3><p class="contracts-empty-copy">' + escapeHtml(contractsError) + '</p>';
      listEl.appendChild(errorEl);
      return;
    }

    if (!canSearchContracts()) {
      var promptEl = document.createElement('div');
      promptEl.className = 'contracts-empty';
      promptEl.innerHTML = '<h3 class="contracts-empty-title">Choose your filters</h3><p class="contracts-empty-copy">' + escapeHtml(getContractsSearchHint()) + '</p>';
      listEl.appendChild(promptEl);
      return;
    }

    if (!contractsHasSearched) {
      var readyEl = document.createElement('div');
      readyEl.className = 'contracts-empty';
      readyEl.innerHTML = '<h3 class="contracts-empty-title">Search is ready</h3><p class="contracts-empty-copy">Press Search Contracts to load live results for the current filters.</p>';
      listEl.appendChild(readyEl);
      return;
    }

    var filteredResults = getFilteredContractsResults();
    if (filteredResults.length === 0) {
      var emptyEl = document.createElement('div');
      emptyEl.className = 'contracts-empty';
      emptyEl.innerHTML = '<h3 class="contracts-empty-title">No contracts found</h3><p class="contracts-empty-copy">Try another weapon, relax one stat filter, or switch the contract type.</p>';
      listEl.appendChild(emptyEl);
      return;
    }

    var fragment = document.createDocumentFragment();
    var limit = Math.min(filteredResults.length, contractsVisibleCount);
    for (var i = 0; i < limit; i++) {
      fragment.appendChild(createContractCard(filteredResults[i]));
    }

    listEl.appendChild(fragment);

    if (filteredResults.length > contractsVisibleCount) {
      var moreWrap = document.createElement('div');
      moreWrap.className = 'contracts-more';
      var moreBtn = document.createElement('button');
      moreBtn.className = 'btn btn-secondary';
      moreBtn.type = 'button';
      moreBtn.id = 'contracts-load-more-btn';
      moreBtn.textContent = 'Load Another ' + CONTRACT_RESULTS_BATCH_SIZE;
      moreWrap.appendChild(moreBtn);
      listEl.appendChild(moreWrap);
    }
  }

  function refreshContractsResults() {
    updateMarketPanelHeader();

    var resultsSub = document.querySelector('.contracts-results-sub');
    if (resultsSub) {
      resultsSub.textContent = getContractsResultsSubtext(getFilteredContractsResults());
    }

    renderContractsResultsList($('#contracts-results-list'));
  }

  function findContractAuctionById(auctionId) {
    for (var i = 0; i < contractsResults.length; i++) {
      if (contractsResults[i] && contractsResults[i].id === auctionId) {
        return contractsResults[i];
      }
    }
    return null;
  }

  function buildContractWhisperMessage(auction) {
    var item = auction && auction.item ? auction.item : {};
    var owner = auction && auction.owner ? auction.owner : {};
    var type = item.type || contractsFilters.type;
    var weapon = type === 'riven'
      ? findLookupByUrl(contractsLookupData.rivenWeapons, item.weapon_url_name)
      : findLookupByUrl(type === 'lich' ? contractsLookupData.lichWeapons : contractsLookupData.sisterWeapons, item.weapon_url_name);
    var ephemera = (type === 'lich' ? contractsLookupData.lichEphemeras : contractsLookupData.sisterEphemeras).filter(function (entry) {
      return item.having_ephemera && entry.element === item.element;
    })[0] || null;
    var weaponName = weapon ? weapon.name : safeNameFromSlug(item.weapon_url_name);
    var price = String(auction && (auction.buyout_price || auction.starting_price || 0));
    var itemLabel = weaponName;

    if (type === 'riven') {
      itemLabel = weaponName + ' Riven';
      if (item.name) itemLabel += ' (' + String(item.name).replace(/-/g, ' ') + ')';
    } else if (type === 'lich') {
      itemLabel = weaponName + ' Kuva Lich';
    } else if (type === 'sister') {
      itemLabel = weaponName + ' Sister of Parvos';
    }

    if (type !== 'riven') {
      var detailParts = [];
      if (item.element) {
        detailParts.push(Number(item.damage || 0) + '% ' + String(item.element).replace(/^\w/, function (s) { return s.toUpperCase(); }) + ' bonus');
      }
      if (item.having_ephemera) {
        detailParts.push(ephemera ? '[' + ephemera.name + ']' : 'Ephemera');
      }
      if (detailParts.length > 0) {
        itemLabel += ' with ' + detailParts.join(' and ');
      }
    }

    return '/w ' + (owner.ingame_name || 'Unknown') + ' Hi! I want to buy your ' + itemLabel + ' for ' + price + ' platinum. (warframe companion app)';
  }

  async function copyContractWhisper(auction) {
    if (!auction) return;

    try {
      var message = buildContractWhisperMessage(auction);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
      } else {
        var ta = document.createElement('textarea');
        ta.value = message;
        ta.setAttribute('readonly', 'readonly');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showContractsToast('Seller whisper copied');
    } catch (err) {
      showContractsToast('Copy failed');
    }
  }

  function showContractsToast(text) {
    var existing = document.querySelector('.contracts-copy-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'contracts-copy-toast';
    toast.textContent = text;
    document.body.appendChild(toast);

    setTimeout(function () {
      toast.classList.add('show');
    }, 10);

    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 220);
    }, 1500);
  }

  function createContractCard(auction) {
    var card = document.createElement('article');
    card.className = 'contracts-card';

    var item = auction && auction.item ? auction.item : {};
    var owner = auction && auction.owner ? auction.owner : {};
    var type = item.type || contractsFilters.type;
    var weapon = type === 'riven'
      ? findLookupByUrl(contractsLookupData.rivenWeapons, item.weapon_url_name)
      : findLookupByUrl(type === 'lich' ? contractsLookupData.lichWeapons : contractsLookupData.sisterWeapons, item.weapon_url_name);
    var ephemera = (type === 'lich' ? contractsLookupData.lichEphemeras : contractsLookupData.sisterEphemeras).filter(function (entry) {
      return item.having_ephemera && entry.element === item.element;
    })[0] || null;

    var media = document.createElement('div');
    media.className = 'contracts-card-media';
    var mediaPath = weapon ? (weapon.icon || weapon.thumb) : '';
    if (mediaPath) {
      var img = document.createElement('img');
      img.src = getMarketImageUrl(mediaPath);
      img.alt = weapon.name || formatContractTypeLabel(type);
      img.loading = 'lazy';
      img.addEventListener('error', function () {
        img.style.display = 'none';
      });
      media.appendChild(img);
    } else {
      var placeholder = document.createElement('span');
      placeholder.className = 'material-icons-round';
      placeholder.textContent = type === 'riven' ? 'auto_awesome' : 'badge';
      media.appendChild(placeholder);
    }

    var main = document.createElement('div');
    main.className = 'contracts-card-main';

    var titleWrap = document.createElement('div');
    var title = document.createElement('h3');
    title.className = 'contracts-card-title';
    title.textContent = type === 'riven'
      ? (weapon ? weapon.name : safeNameFromSlug(item.weapon_url_name)) + ' Riven'
      : (weapon ? weapon.name : safeNameFromSlug(item.weapon_url_name)) + (type === 'lich' ? ' Kuva Lich' : ' Sister');
    var subtitle = document.createElement('p');
    subtitle.className = 'contracts-card-subtitle';
    subtitle.textContent = type === 'riven'
      ? String(item.name || '').replace(/-/g, ' ')
      : formatContractTypeLabel(type) + ' • ' + formatRelativeTime(auction.created);
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);
    main.appendChild(titleWrap);

    var chipRow = document.createElement('div');
    chipRow.className = 'contracts-chip-row';
    var typeChip = document.createElement('span');
    typeChip.className = 'contracts-chip is-type';
    typeChip.textContent = formatContractTypeLabel(type);
    chipRow.appendChild(typeChip);

    if (type !== 'riven') {
      var elementChip = document.createElement('span');
      elementChip.className = 'contracts-chip';
      elementChip.textContent = String(item.element || 'unknown').replace(/^\w/, function (s) { return s.toUpperCase(); }) + ' • ' + Number(item.damage || 0) + '%';
      chipRow.appendChild(elementChip);

      if (item.having_ephemera) {
        var ephChip = document.createElement('span');
        ephChip.className = 'contracts-chip';
        ephChip.textContent = ephemera ? ephemera.name : 'Has Ephemera';
        chipRow.appendChild(ephChip);
      }
    }

    main.appendChild(chipRow);

    if (type === 'riven' && Array.isArray(item.attributes) && item.attributes.length > 0) {
      var attrRow = document.createElement('div');
      attrRow.className = 'contracts-attr-row';

      for (var a = 0; a < item.attributes.length; a++) {
        var attribute = item.attributes[a];
        var attrLookup = findLookupByUrl(contractsLookupData.rivenAttributes, attribute && attribute.url_name ? attribute.url_name : '');
        var chip = document.createElement('span');
        chip.className = 'contracts-chip ' + (attribute && attribute.positive === false ? 'is-negative' : 'is-positive');
        chip.textContent = formatContractAttributeValue(attribute, attrLookup) + ' ' + (attrLookup ? attrLookup.name : safeNameFromSlug(attribute.url_name));
        attrRow.appendChild(chip);
      }

      main.appendChild(attrRow);

      var rivenMeta = document.createElement('div');
      rivenMeta.className = 'contracts-meta-row';
      [
        'MR ' + (item.mastery_level || 0),
        'Rank ' + (item.mod_rank || 0),
        'Rolls ' + (item.re_rolls || 0),
        String(item.polarity || 'Any').replace(/^\w/, function (s) { return s.toUpperCase(); })
      ].forEach(function (label) {
        var metaChip = document.createElement('span');
        metaChip.className = 'contracts-meta-chip';
        metaChip.textContent = label;
        rivenMeta.appendChild(metaChip);
      });
      main.appendChild(rivenMeta);
    }

    if (auction.note_raw) {
      var note = document.createElement('p');
      note.className = 'contracts-card-note';
      note.textContent = auction.note_raw;
      main.appendChild(note);
    }

    var side = document.createElement('div');
    side.className = 'contracts-card-side';

    var price = document.createElement('div');
    price.className = 'contracts-price';
    var priceMain = document.createElement('span');
    priceMain.textContent = String(auction.buyout_price || auction.starting_price || 0);
    var priceSuffix = document.createElement('span');
    priceSuffix.className = 'contracts-price-suffix';
    priceSuffix.textContent = 'p';
    price.appendChild(priceMain);
    price.appendChild(priceSuffix);
    side.appendChild(price);

    var seller = document.createElement('div');
    seller.className = 'contracts-seller';
    var dot = document.createElement('span');
    dot.className = 'status-dot status-' + String(owner.status || 'offline');
    seller.appendChild(dot);
    var sellerName = document.createElement('span');
    sellerName.className = 'contracts-seller-name';
    sellerName.textContent = owner.ingame_name || 'Unknown';
    seller.appendChild(sellerName);
    var sellerState = document.createElement('span');
    sellerState.textContent = String(owner.status || 'offline').toUpperCase();
    seller.appendChild(sellerState);
    side.appendChild(seller);

    var contactBtn = document.createElement('button');
    contactBtn.className = 'btn btn-secondary';
    contactBtn.type = 'button';
    contactBtn.dataset.contractAuctionId = auction.id;
    contactBtn.textContent = 'Contact Seller';
    side.appendChild(contactBtn);

    card.appendChild(media);
    card.appendChild(main);
    card.appendChild(side);

    return card;
  }

  async function openExternalUrl(url) {
    if (!url) return;

    if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
      try {
        await window.electronAPI.openExternal(url);
        return;
      } catch (err) {
        console.warn('Failed to open external url:', err);
      }
    }

    window.open(url, '_blank', 'noopener');
  }

  // ---------- Data Loading ----------
  async function loadMarketItems() {
    var cached = loadMarketCache();
    if (cached) {
      marketItems = cached;
      onMarketItemsLoaded();
      return;
    }

    showMarketLoading(true);
    try {
      var resp = await fetch(MARKET_API);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var json = await resp.json();
      var data = json.data || [];

      marketItems = data.map(function (item) {
        var en = item.i18n && item.i18n.en ? item.i18n.en : {};
        var slug = item.slug || item.url_name || '';
        return {
          id: item.id,
          slug: slug,
          name: en.name || item.item_name || item.name || safeNameFromSlug(slug),
          thumb: en.thumb || en.icon || item.thumb || item.icon || '',
          icon: en.icon || item.icon || '',
          subIcon: en.subIcon || en.sub_icon || item.subIcon || item.sub_icon || '',
          tags: item.tags || [],
          category: getMarketCategory(item.tags),
        };
      }).filter(function (item) { return !!item.slug; }).sort(function (a, b) { return a.name.localeCompare(b.name); });

      saveMarketCache(marketItems);
      onMarketItemsLoaded();
    } catch (err) {
      console.error('Failed to fetch market items:', err);
      showMarketError(err.message);
    }
  }

  function saveMarketCache(items) {
    try {
      localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(), items: items
      }));
    } catch (e) { /* quota */ }
  }

  function loadMarketCache() {
    try {
      var raw = localStorage.getItem(MARKET_CACHE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (Date.now() - c.timestamp > MARKET_CACHE_TTL) return null;
      return c.items;
    } catch (e) { return null; }
  }

  // ---------- UI Helpers ----------
  function showMarketLoading(show) {
    var el = $('#market-loading');
    if (el) el.classList.toggle('hidden', !show);
  }

  function showMarketError(msg) {
    showMarketLoading(false);
    var grid = $('#market-grid');
    if (!grid) return;
    grid.textContent = '';
    var errBox = document.createElement('div');
    errBox.className = 'market-error';
    errBox.textContent = 'Failed to load market: ' + msg;
    grid.appendChild(errBox);
  }

  function onMarketItemsLoaded() {
    showMarketLoading(false);
    applyMarketFilters();
    updateMarketCategoryCounts();
    renderTradeAnalyticsSearchResults();
  }

  // ---------- Filters ----------
  function applyMarketFilters() {
    var normalizedQuery = String(marketSearchQuery || '').toLowerCase().trim();

    filteredMarketItems = marketItems.filter(function (item) {
      if (marketCategory !== 'all' && item.category !== marketCategory) return false;
      if (normalizedQuery && String(item.name || '').toLowerCase().indexOf(normalizedQuery) === -1) return false;
      return true;
    });
    renderMarketItems();
    updateMarketPanelHeader();
  }

  function updateMarketCategoryCounts() {
    var counts = { all: marketItems.length };
    for (var i = 0; i < marketItems.length; i++) {
      var cat = marketItems[i].category;
      counts[cat] = (counts[cat] || 0) + 1;
    }
    document.querySelectorAll('.market-cat-btn').forEach(function (btn) {
      var cat = btn.dataset.marketCat;
      var badge = btn.querySelector('.market-cat-count');
      if (badge && counts[cat] !== undefined) {
        badge.textContent = counts[cat];
      }
    });
  }

  // ---------- Render Items ----------
  function renderMarketItems() {
    var grid = $('#market-grid');
    if (!grid) return;
    // clear existing cards only
    var existing = grid.querySelectorAll('.market-item-card, .market-empty, .market-error, .market-more-hint');
    for (var i = 0; i < existing.length; i++) existing[i].remove();

    if (filteredMarketItems.length === 0) {
      var emptyEl = document.createElement('div');
      emptyEl.className = 'market-empty';
      emptyEl.textContent = 'No items found';
      grid.appendChild(emptyEl);
      return;
    }

    var fragment = document.createDocumentFragment();
    var limit = Math.min(filteredMarketItems.length, 200); // show max 200
    for (var j = 0; j < limit; j++) {
      fragment.appendChild(createMarketCard(filteredMarketItems[j], j));
    }
    if (filteredMarketItems.length > 200) {
      var moreEl = document.createElement('div');
      moreEl.className = 'market-more-hint';
      moreEl.textContent = (filteredMarketItems.length - 200) + ' more items. Use search to narrow.';
      fragment.appendChild(moreEl);
    }
    grid.appendChild(fragment);
  }

  function createMarketCard(item, index) {
    var card = document.createElement('div');
    card.className = 'market-item-card';
    card.style.animationDelay = Math.min(index * 8, 300) + 'ms';

    var imgWrap = document.createElement('div');
    imgWrap.className = 'market-item-thumb';
    var imagePath = getMarketDisplayImage(item);
    if (imagePath) {
      var img = document.createElement('img');
      img.src = getMarketImageUrl(imagePath);
      img.alt = item.name;
      img.loading = 'lazy';
      img.addEventListener('error', function () {
        img.style.display = 'none';
        var ph = imgWrap.querySelector('.mi-placeholder');
        if (ph) ph.style.display = 'flex';
      });
      imgWrap.appendChild(img);
    }
    var placeholder = document.createElement('div');
    placeholder.className = 'mi-placeholder';
    placeholder.style.display = imagePath ? 'none' : 'flex';
    var phIcon = document.createElement('span');
    phIcon.className = 'material-icons-round';
    phIcon.textContent = 'storefront';
    placeholder.appendChild(phIcon);
    imgWrap.appendChild(placeholder);

    var info = document.createElement('div');
    info.className = 'market-item-info';
    var name = document.createElement('div');
    name.className = 'market-item-name';
    name.textContent = item.name;
    name.title = item.name;
    var tagEl = document.createElement('div');
    tagEl.className = 'market-item-tag';
    tagEl.textContent = item.category.replace(/_/g, ' ');

    info.appendChild(name);
    info.appendChild(tagEl);

    card.appendChild(imgWrap);
    card.appendChild(info);

    card.addEventListener('click', function () {
      openOrdersModal(item);
    });

    return card;
  }

  // ---------- Orders Modal ----------
  async function openOrdersModal(item) {
    var modal = $('#market-orders-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    var titleEl = $('#orders-item-name');
    var imgEl = $('#orders-item-img');
    var ordersBody = $('#orders-body');

    if (titleEl) titleEl.textContent = item.name;
    if (imgEl) {
      imgEl.src = getMarketImageUrl(getMarketDisplayImage(item));
      imgEl.alt = item.name;
    }

    ordersBody.textContent = '';
    var loadMsg = document.createElement('div');
    loadMsg.className = 'orders-loading';
    loadMsg.textContent = 'Loading orders...';
    ordersBody.appendChild(loadMsg);

    currentOrdersSlug = item.slug;
    currentOrdersItemName = item.name;
    currentOrdersWikiUrl = buildWikiUrl(item);
    ordersOnlineOnly = false;
    ordersOnlineMode = 'all_online';
    await fetchAndRenderOrders(item.slug);

    // Auto-refresh
    clearInterval(ordersRefreshInterval);
    ordersRefreshInterval = setInterval(function () {
      fetchAndRenderOrders(item.slug);
    }, 60000);
  }

  function closeOrdersModal() {
    var modal = $('#market-orders-modal');
    if (modal) modal.classList.add('hidden');
    clearInterval(ordersRefreshInterval);
    currentOrdersSlug = null;
    currentOrdersItemName = null;
    currentOrdersWikiUrl = null;
    ordersOnlineOnly = false;
    ordersOnlineMode = 'all_online';
  }

  function isOnlineSeller(order) {
    var status = getNormalizedUserStatus(order);
    return status === 'online' || status === 'ingame';
  }

  function isInGameSeller(order) {
    var status = getNormalizedUserStatus(order);
    return status === 'ingame';
  }

  function getNormalizedUserStatus(order) {
    var raw = String(order && order.user ? order.user.status : 'offline')
      .toLowerCase()
      .replace(/[\s_-]+/g, '');
    if (raw === 'ingame') return 'ingame';
    if (raw === 'online') return 'online';
    return 'offline';
  }

  function getStatusSortRank(order) {
    var status = getNormalizedUserStatus(order);
    if (status === 'ingame') return 0;
    if (status === 'online') return 1;
    return 2;
  }

  function getOrderReputation(order) {
    if (!order || !order.user) return null;
    var rep = order.user.reputation;
    if (rep === null || typeof rep === 'undefined' || rep === '') return null;
    return rep;
  }

  function formatReputation(rep) {
    if (rep === null || typeof rep === 'undefined' || rep === '') return '--';
    var n = Number(rep);
    if (!isNaN(n)) {
      return n > 0 ? ('+' + n) : String(n);
    }
    return String(rep);
  }

  async function fetchAndRenderOrders(slug) {
    var ordersBody = $('#orders-body');
    if (!ordersBody) return;

    try {
      var orders = await fetchOrdersV2(slug);

      // Filter visible orders
      var sellOrders = [];
      var buyOrders = [];
      for (var i = 0; i < orders.length; i++) {
        var o = orders[i];
        if (o.visible === false) continue;
        if (o.order_type === 'sell') sellOrders.push(o);
        else if (o.order_type === 'buy') buyOrders.push(o);
      }

      // Sort: in-game first, then online, then offline. Within each status sort by price.
      sellOrders.sort(function (a, b) {
        var sa = getStatusSortRank(a);
        var sb = getStatusSortRank(b);
        if (sa !== sb) return sa - sb;
        return a.platinum - b.platinum;
      });
      buyOrders.sort(function (a, b) {
        var sa = getStatusSortRank(a);
        var sb = getStatusSortRank(b);
        if (sa !== sb) return sa - sb;
        return b.platinum - a.platinum;
      });

      renderOrdersContent(ordersBody, sellOrders, buyOrders, {
        name: currentOrdersItemName || 'this item',
        wikiUrl: currentOrdersWikiUrl || ''
      });
    } catch (err) {
      ordersBody.textContent = '';
      var errEl = document.createElement('div');
      errEl.className = 'orders-error';
      errEl.textContent = 'Failed to load orders: ' + err.message;
      ordersBody.appendChild(errEl);
    }
  }

  async function fetchOrdersV2(slug) {
    var resp = await fetch(ORDERS_API_V2 + '/' + slug, {
      headers: { 'Accept': 'application/json' }
    });
    if (!resp.ok) {
      if (resp.status === 403 || resp.status === 404) {
        // Keep v1 fallback for environments that still allow legacy endpoint.
        return fetchOrdersV1(slug);
      }
      throw new Error('HTTP ' + resp.status);
    }

    var json = await resp.json();
    var data = Array.isArray(json.data) ? json.data : [];
    return data.map(function (o) {
      return {
        order_type: o.type,
        platinum: o.platinum,
        quantity: o.quantity,
        visible: o.visible,
        platform: o.user && o.user.platform,
        user: {
          status: o.user && o.user.status,
          ingame_name: (o.user && (o.user.ingameName || o.user.ingame_name)) || 'Unknown',
          reputation: o.user && (o.user.reputation || o.user.reputation_level || o.user.reputationLevel)
        }
      };
    });
  }

  async function fetchOrdersV1(slug) {
    var legacyResp = await fetch(ORDERS_API_V1 + '/' + slug + '/orders', {
      headers: { 'Accept': 'application/json' }
    });
    if (!legacyResp.ok) throw new Error('HTTP ' + legacyResp.status);
    var legacyJson = await legacyResp.json();
    return legacyJson.payload && legacyJson.payload.orders ? legacyJson.payload.orders : [];
  }

  async function fetchItemStatistics(slug, forceRefresh) {
    var key = String(slug || '').trim();
    if (!key) return null;

    var cached = analyticsStatsCache[key];
    if (!forceRefresh && cached && (Date.now() - cached.timestamp) < ANALYTICS_STATS_CACHE_TTL) {
      return cached.data;
    }

    var resp = await fetch(STATS_API_V1 + '/' + key + '/statistics', {
      headers: {
        'Accept': 'application/json',
        'Platform': 'pc',
        'Language': 'en'
      }
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);

    var json = await resp.json();
    var payload = json && json.payload ? json.payload : {};
    analyticsStatsCache[key] = {
      timestamp: Date.now(),
      data: payload
    };
    return payload;
  }

  function getLatestEntryByType(entries, orderType) {
    if (!Array.isArray(entries)) return null;

    for (var i = entries.length - 1; i >= 0; i--) {
      var entry = entries[i];
      if (!entry) continue;
      if (!orderType || entry.order_type === orderType) {
        return entry;
      }
    }

    return null;
  }

  function getWeightedAverage(entries, valueKey) {
    if (!Array.isArray(entries) || entries.length === 0) return null;

    var totalVolume = 0;
    var totalValue = 0;
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (!entry) continue;

      var value = Number(entry[valueKey]);
      var volume = Number(entry.volume);
      if (!isFinite(value)) continue;

      var safeVolume = isFinite(volume) && volume > 0 ? volume : 1;
      totalVolume += safeVolume;
      totalValue += value * safeVolume;
    }

    if (totalVolume <= 0) return null;
    return totalValue / totalVolume;
  }

  function getVolumeTotal(entries) {
    if (!Array.isArray(entries)) return 0;

    var total = 0;
    for (var i = 0; i < entries.length; i++) {
      var volume = Number(entries[i] && entries[i].volume);
      if (isFinite(volume) && volume > 0) total += volume;
    }
    return total;
  }

  function getBestVisibleOrder(orders, orderType) {
    var filtered = [];
    var i;

    for (i = 0; i < orders.length; i++) {
      var order = orders[i];
      if (!order || order.visible === false || order.order_type !== orderType) continue;
      if (isOnlineSeller(order)) filtered.push(order);
    }

    if (filtered.length === 0) {
      for (i = 0; i < orders.length; i++) {
        var fallback = orders[i];
        if (!fallback || fallback.visible === false || fallback.order_type !== orderType) continue;
        filtered.push(fallback);
      }
    }

    if (filtered.length === 0) return null;

    filtered.sort(function(a, b) {
      if (orderType === 'sell') return Number(a.platinum || 0) - Number(b.platinum || 0);
      return Number(b.platinum || 0) - Number(a.platinum || 0);
    });

    return filtered[0] || null;
  }

  function buildTradeAnalyticsModel(item, statsPayload, orders) {
    var closedHistory = Array.isArray(statsPayload && statsPayload.statistics_closed && statsPayload.statistics_closed['90days'])
      ? statsPayload.statistics_closed['90days']
      : [];
    var liveHistory = Array.isArray(statsPayload && statsPayload.statistics_live && statsPayload.statistics_live['48hours'])
      ? statsPayload.statistics_live['48hours']
      : [];

    var closed7 = closedHistory.slice(-7);
    var closed30 = closedHistory.slice(-30);
    var recentClosed = closed7.slice().reverse();

    var latestClosed = closedHistory.length > 0 ? closedHistory[closedHistory.length - 1] : null;
    var latestLiveSell = getLatestEntryByType(liveHistory, 'sell');
    var latestLiveBuy = getLatestEntryByType(liveHistory, 'buy');
    var bestSell = getBestVisibleOrder(orders, 'sell');
    var bestBuy = getBestVisibleOrder(orders, 'buy');

    var avg7 = getWeightedAverage(closed7, 'wa_price');
    var avg30 = getWeightedAverage(closed30, 'wa_price');
    var volume7 = getVolumeTotal(closed7);
    var volume30 = getVolumeTotal(closed30);
    var spread = bestSell && bestBuy ? Number(bestSell.platinum) - Number(bestBuy.platinum) : null;
    var change7vs30 = isFinite(avg7) && isFinite(avg30) ? (avg7 - avg30) : null;

    var visibleSellOrders = orders.filter(function(order) {
      return order && order.visible !== false && order.order_type === 'sell';
    });
    var visibleBuyOrders = orders.filter(function(order) {
      return order && order.visible !== false && order.order_type === 'buy';
    });

    return {
      item: item,
      latestClosed: latestClosed,
      latestLiveSell: latestLiveSell,
      latestLiveBuy: latestLiveBuy,
      bestSell: bestSell,
      bestBuy: bestBuy,
      spread: spread,
      avg7: avg7,
      avg30: avg30,
      change7vs30: change7vs30,
      volume7: volume7,
      volume30: volume30,
      recentClosed: recentClosed,
      visibleSellOrders: visibleSellOrders,
      visibleBuyOrders: visibleBuyOrders
    };
  }

  function renderTradeAnalyticsSearchResults() {
    var container = $('#trade-analytics-search-results');
    var summary = $('#trade-analytics-search-summary');
    if (!container) return;

    container.textContent = '';

    if (!marketItems.length) {
      container.appendChild(createAnalyticsPlaceholder('Unable to load the market catalog right now.'));
      if (summary) summary.textContent = 'Market catalog unavailable.';
      return;
    }

    var query = normalizeMarketName(analyticsSearchQuery);
    var results = getAnalyticsSearchResults();

    if (summary) {
      if (query) {
        summary.textContent = results.length > 0
          ? ('Showing ' + results.length + ' match' + (results.length === 1 ? '' : 'es') + ' for "' + analyticsSearchQuery + '".')
          : ('No market matches for "' + analyticsSearchQuery + '".');
      } else {
        summary.textContent = 'Quick picks from active public trading items.';
      }
    }

    if (results.length === 0) {
      container.appendChild(createAnalyticsPlaceholder('No matching items found. Try a different search term.'));
      return;
    }

    for (var i = 0; i < results.length; i++) {
      var item = results[i];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'trade-analytics-result-item' + (item.slug === analyticsSelectedSlug ? ' active' : '');

      var thumb = document.createElement('div');
      thumb.className = 'trade-analytics-result-thumb';
      var imagePath = getMarketDisplayImage(item);
      if (imagePath) {
        var img = document.createElement('img');
        img.src = getMarketImageUrl(imagePath);
        img.alt = item.name;
        img.loading = 'lazy';
        img.addEventListener('error', function() {
          img.style.display = 'none';
        });
        thumb.appendChild(img);
      } else {
        var ph = document.createElement('span');
        ph.className = 'material-icons-round';
        ph.textContent = 'insights';
        thumb.appendChild(ph);
      }

      var copy = document.createElement('div');
      copy.className = 'trade-analytics-result-copy';
      var name = document.createElement('div');
      name.className = 'trade-analytics-result-name';
      name.textContent = item.name;
      var meta = document.createElement('div');
      meta.className = 'trade-analytics-result-meta';
      var tag = document.createElement('span');
      tag.className = 'trade-analytics-result-tag';
      tag.textContent = item.category.replace(/_/g, ' ');
      meta.appendChild(tag);
      copy.appendChild(name);
      copy.appendChild(meta);

      btn.appendChild(thumb);
      btn.appendChild(copy);
      btn.addEventListener('click', function(targetItem) {
        return function() {
          selectAnalyticsItem(targetItem, false);
        };
      }(item));
      container.appendChild(btn);
    }
  }

  function renderTradeAnalyticsOverview(model) {
    var emptyState = $('#trade-analytics-empty-state');
    var overview = $('#trade-analytics-overview');
    var img = $('#trade-analytics-selected-img');
    var placeholder = $('#trade-analytics-selected-placeholder');
    var nameEl = $('#trade-analytics-selected-name');
    var categoryEl = $('#trade-analytics-selected-category');
    var updatedEl = $('#trade-analytics-selected-updated');
    var statGrid = $('#trade-analytics-stat-grid');

    if (!model) {
      if (emptyState) emptyState.classList.remove('hidden');
      if (overview) overview.classList.add('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (overview) overview.classList.remove('hidden');

    if (img) {
      var imagePath = getMarketDisplayImage(model.item);
      img.src = imagePath ? getMarketImageUrl(imagePath) : '';
      img.alt = model.item.name;
      img.classList.toggle('hidden', !imagePath);
      img.onerror = function() {
        img.classList.add('hidden');
        if (placeholder) placeholder.classList.remove('hidden');
      };
      img.onload = function() {
        if (imagePath) {
          img.classList.remove('hidden');
          if (placeholder) placeholder.classList.add('hidden');
        }
      };
    }
    if (placeholder) placeholder.classList.toggle('hidden', !!getMarketDisplayImage(model.item));
    if (nameEl) nameEl.textContent = model.item.name;
    if (categoryEl) categoryEl.textContent = model.item.category.replace(/_/g, ' ');
    if (updatedEl) {
      var updatedFrom = (model.latestLiveSell && model.latestLiveSell.datetime) ||
        (model.latestLiveBuy && model.latestLiveBuy.datetime) ||
        (model.latestClosed && model.latestClosed.datetime) ||
        '';
      updatedEl.textContent = formatAnalyticsTimestamp(updatedFrom);
    }

    if (!statGrid) return;
    statGrid.textContent = '';

    var statItems = [
      {
        label: 'Lowest Sell',
        value: formatPlatValue(model.bestSell && model.bestSell.platinum),
        detail: model.visibleSellOrders.length + ' visible sell orders'
      },
      {
        label: 'Highest Buy',
        value: formatPlatValue(model.bestBuy && model.bestBuy.platinum),
        detail: model.visibleBuyOrders.length + ' visible buy orders'
      },
      {
        label: 'Spread',
        value: formatPlatValue(model.spread),
        detail: (model.bestSell && model.bestBuy) ? 'Lowest sell minus highest buy' : 'Need both live buy and sell orders'
      },
      {
        label: '7D Closed Avg',
        value: formatPlatValue(model.avg7),
        detail: isFinite(model.change7vs30) ? ('vs 30D avg ' + formatSignedPlatValue(model.change7vs30)) : 'Compare against 30-day weighted average',
        kind: isFinite(model.change7vs30) ? (model.change7vs30 > 0 ? 'is-positive' : (model.change7vs30 < 0 ? 'is-negative' : '')) : ''
      },
      {
        label: '30D Closed Avg',
        value: formatPlatValue(model.avg30),
        detail: model.latestClosed ? ('Latest close ' + formatPlatValue(model.latestClosed.closed_price || model.latestClosed.avg_price) + ' on ' + formatAnalyticsDate(model.latestClosed.datetime)) : 'No recent closed history available'
      },
      {
        label: '7D Volume',
        value: formatMetricNumber(model.volume7),
        detail: '30D volume ' + formatMetricNumber(model.volume30)
      }
    ];

    for (var i = 0; i < statItems.length; i++) {
      var card = document.createElement('div');
      card.className = 'trade-analytics-stat-card';
      var label = document.createElement('div');
      label.className = 'trade-analytics-stat-label';
      label.textContent = statItems[i].label;
      var value = document.createElement('div');
      value.className = 'trade-analytics-stat-value';
      if (statItems[i].kind) value.classList.add(statItems[i].kind);
      value.textContent = statItems[i].value;
      var detail = document.createElement('div');
      detail.className = 'trade-analytics-stat-detail';
      detail.textContent = statItems[i].detail;
      card.appendChild(label);
      card.appendChild(value);
      card.appendChild(detail);
      statGrid.appendChild(card);
    }
  }

  function renderTradeAnalyticsTable(targetId, headers, rows, emptyText) {
    var container = $(targetId);
    if (!container) return;
    container.textContent = '';

    if (!Array.isArray(rows) || rows.length === 0) {
      container.appendChild(createAnalyticsPlaceholder(emptyText));
      return;
    }

    var table = document.createElement('table');
    table.className = 'trade-analytics-table';

    var thead = document.createElement('thead');
    var headRow = document.createElement('tr');
    for (var i = 0; i < headers.length; i++) {
      var th = document.createElement('th');
      th.textContent = headers[i];
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    for (var r = 0; r < rows.length; r++) {
      var tr = document.createElement('tr');
      for (var c = 0; c < rows[r].length; c++) {
        var cell = rows[r][c] || {};
        var td = document.createElement('td');
        td.textContent = cell.text || '--';
        if (cell.strong) td.classList.add('is-strong');
        if (cell.accent) td.classList.add('is-accent');
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.appendChild(table);
  }

  function renderTradeAnalyticsHistory(model) {
    if (!model) {
      renderTradeAnalyticsTable('#trade-analytics-history', [], [], 'Choose an item to inspect its recent closed history.');
      return;
    }

    var rows = model.recentClosed.map(function(entry) {
      var low = isFinite(Number(entry.min_price)) ? Number(entry.min_price) : null;
      var high = isFinite(Number(entry.max_price)) ? Number(entry.max_price) : null;
      return [
        { text: formatAnalyticsDate(entry.datetime), strong: true },
        { text: formatPlatValue(entry.avg_price), accent: true },
        { text: formatPlatValue(entry.closed_price) },
        { text: formatMetricNumber(entry.volume) },
        { text: (low !== null && high !== null) ? (formatPlatValue(low) + ' - ' + formatPlatValue(high)) : '--' }
      ];
    });

    renderTradeAnalyticsTable(
      '#trade-analytics-history',
      ['Date', 'Avg', 'Close', 'Volume', 'Range'],
      rows,
      'No closed history available for this item yet.'
    );
  }

  function renderTradeAnalyticsLive(model) {
    if (!model) {
      renderTradeAnalyticsTable('#trade-analytics-live', [], [], 'Choose an item to inspect its live buy and sell pressure.');
      return;
    }

    var sell = model.latestLiveSell || {};
    var buy = model.latestLiveBuy || {};
    var rows = [
      [
        { text: 'Avg Price', strong: true },
        { text: formatPlatValue(sell.avg_price), accent: true },
        { text: formatPlatValue(buy.avg_price), accent: true }
      ],
      [
        { text: 'Weighted Avg', strong: true },
        { text: formatPlatValue(sell.wa_price) },
        { text: formatPlatValue(buy.wa_price) }
      ],
      [
        { text: 'Median', strong: true },
        { text: formatPlatValue(sell.median) },
        { text: formatPlatValue(buy.median) }
      ],
      [
        { text: 'Volume', strong: true },
        { text: formatMetricNumber(sell.volume) },
        { text: formatMetricNumber(buy.volume) }
      ],
      [
        { text: 'Moving Avg', strong: true },
        { text: formatPlatValue(sell.moving_avg) },
        { text: formatPlatValue(buy.moving_avg) }
      ],
      [
        { text: 'Best Current Order', strong: true },
        { text: formatPlatValue(model.bestSell && model.bestSell.platinum) },
        { text: formatPlatValue(model.bestBuy && model.bestBuy.platinum) }
      ],
      [
        { text: 'Visible Orders', strong: true },
        { text: formatMetricNumber(model.visibleSellOrders.length) },
        { text: formatMetricNumber(model.visibleBuyOrders.length) }
      ]
    ];

    renderTradeAnalyticsTable(
      '#trade-analytics-live',
      ['Signal', 'Sell Side', 'Buy Side'],
      rows,
      'No live market data available for this item yet.'
    );
  }

  function setTradeAnalyticsLoadingState(item) {
    analyticsCurrentItem = item || analyticsCurrentItem;
    renderTradeAnalyticsOverview({
      item: analyticsCurrentItem || { name: 'Loading...', category: 'market' },
      latestClosed: null,
      latestLiveSell: null,
      latestLiveBuy: null,
      bestSell: null,
      bestBuy: null,
      spread: null,
      avg7: null,
      avg30: null,
      change7vs30: null,
      volume7: 0,
      volume30: 0,
      visibleSellOrders: [],
      visibleBuyOrders: []
    });
    renderTradeAnalyticsTable('#trade-analytics-history', [], [], 'Loading recent closed history...');
    renderTradeAnalyticsTable('#trade-analytics-live', [], [], 'Loading live market pressure...');
  }

  function renderTradeAnalyticsError(item, message) {
    renderTradeAnalyticsOverview(null);
    renderTradeAnalyticsTable('#trade-analytics-history', [], [], 'Failed to load analytics for ' + (item && item.name ? item.name : 'this item') + ': ' + message);
    renderTradeAnalyticsTable('#trade-analytics-live', [], [], 'Try refreshing this item in a moment.');
  }

  async function selectAnalyticsItem(item, forceRefresh) {
    if (!item || !item.slug) return;

    analyticsSelectedSlug = item.slug;
    analyticsCurrentItem = item;
    renderTradeAnalyticsSearchResults();
    setTradeAnalyticsLoadingState(item);

    var token = ++analyticsRequestToken;
    try {
      var results = await Promise.all([
        fetchItemStatistics(item.slug, !!forceRefresh),
        fetchOrdersV2(item.slug)
      ]);
      if (token !== analyticsRequestToken) return;

      var model = buildTradeAnalyticsModel(item, results[0], Array.isArray(results[1]) ? results[1] : []);
      renderTradeAnalyticsOverview(model);
      renderTradeAnalyticsHistory(model);
      renderTradeAnalyticsLive(model);
    } catch (err) {
      if (token !== analyticsRequestToken) return;
      renderTradeAnalyticsError(item, err && err.message ? err.message : 'Unknown error');
    }
  }

  async function loadTradeAnalytics(forceRefresh) {
    if (!marketItems.length) {
      await loadMarketItems();
    }

    renderTradeAnalyticsSearchResults();

    if (!marketItems.length) {
      renderTradeAnalyticsOverview(null);
      renderTradeAnalyticsHistory(null);
      renderTradeAnalyticsLive(null);
      return;
    }

    if (analyticsCurrentItem && analyticsCurrentItem.slug) {
      await selectAnalyticsItem(analyticsCurrentItem, !!forceRefresh);
      return;
    }

    var quickPicks = getAnalyticsQuickPickItems();
    if (quickPicks.length > 0) {
      await selectAnalyticsItem(quickPicks[0], !!forceRefresh);
    } else {
      renderTradeAnalyticsOverview(null);
      renderTradeAnalyticsHistory(null);
      renderTradeAnalyticsLive(null);
    }
  }

  function renderOrdersContent(container, sellOrders, buyOrders, itemMeta) {
    container.textContent = '';

    var itemName = itemMeta && itemMeta.name ? itemMeta.name : 'this item';
    var wikiUrl = itemMeta && itemMeta.wikiUrl ? itemMeta.wikiUrl : '';

    var allOnlineSellOrders = sellOrders.filter(isOnlineSeller);
    var inGameSellOrders = sellOrders.filter(isInGameSeller);
    var safeMode = ordersOnlineMode === 'ingame_only' ? 'ingame_only' : 'all_online';
    var filteredSellOrders = ordersOnlineOnly
      ? (safeMode === 'ingame_only' ? inGameSellOrders : allOnlineSellOrders)
      : sellOrders;

    // Stats
    if (filteredSellOrders.length > 0) {
      var prices = filteredSellOrders.map(function (o) { return o.platinum; });
      var min = Math.min.apply(null, prices);
      var max = Math.max.apply(null, prices);
      var avg = Math.round(prices.reduce(function (s, v) { return s + v; }, 0) / prices.length);

      var statsBar = document.createElement('div');
      statsBar.className = 'orders-stats';
      statsBar.innerHTML = '';
      var statItems = [
        { label: 'Lowest', value: min + 'p', cls: 'stat-low' },
        { label: 'Average', value: avg + 'p', cls: 'stat-avg' },
        { label: 'Highest', value: max + 'p', cls: 'stat-high' },
        { label: 'Sellers', value: String(filteredSellOrders.length), cls: '' },
        { label: 'Buyers', value: String(buyOrders.length), cls: '' },
      ];
      for (var s = 0; s < statItems.length; s++) {
        var si = document.createElement('div');
        si.className = 'orders-stat-item ' + statItems[s].cls;
        var sl = document.createElement('span');
        sl.className = 'orders-stat-label';
        sl.textContent = statItems[s].label;
        var sv = document.createElement('span');
        sv.className = 'orders-stat-value';
        sv.textContent = statItems[s].value;
        si.appendChild(sl);
        si.appendChild(sv);
        statsBar.appendChild(si);
      }
      container.appendChild(statsBar);
    }

    var filterWrap = document.createElement('div');
    filterWrap.className = 'orders-filter-wrap';

    var legend = document.createElement('div');
    legend.className = 'orders-status-legend';
    var legendIngame = document.createElement('span');
    legendIngame.className = 'orders-status-legend-item';
    legendIngame.innerHTML = '<span class="status-dot status-ingame"></span>In Game';
    var legendOnline = document.createElement('span');
    legendOnline.className = 'orders-status-legend-item';
    legendOnline.innerHTML = '<span class="status-dot status-online"></span>Online';
    legend.appendChild(legendIngame);
    legend.appendChild(legendOnline);

    var filterLinks = document.createElement('div');
    filterLinks.className = 'orders-filter-links';

    if (wikiUrl) {
      var wikiBtn = document.createElement('button');
      wikiBtn.type = 'button';
      wikiBtn.className = 'orders-wiki-link';

      var wikiIcon = document.createElement('span');
      wikiIcon.className = 'material-icons-round';
      wikiIcon.textContent = 'open_in_new';

      var wikiLabel = document.createElement('span');
      wikiLabel.textContent = 'Wiki';

      wikiBtn.appendChild(wikiIcon);
      wikiBtn.appendChild(wikiLabel);
      wikiBtn.addEventListener('click', function () {
        window.open(wikiUrl, '_blank', 'noopener');
      });

      filterLinks.appendChild(wikiBtn);
    }

    var filterControls = document.createElement('div');
    filterControls.className = 'orders-filter-controls';

    var filterBtn = document.createElement('button');
    filterBtn.className = 'orders-online-filter' + (ordersOnlineOnly ? ' active' : '');
    filterBtn.textContent = ordersOnlineOnly ? 'Online Sellers Only: ON' : 'Online Sellers Only: OFF';
    filterBtn.addEventListener('click', function () {
      ordersOnlineOnly = !ordersOnlineOnly;
      renderOrdersContent(container, sellOrders, buyOrders, itemMeta);
    });

    var scopeSelect = document.createElement('select');
    scopeSelect.className = 'orders-online-scope';
    scopeSelect.disabled = !ordersOnlineOnly;
    var optAllOnline = document.createElement('option');
    optAllOnline.value = 'all_online';
    optAllOnline.textContent = 'All Online (' + allOnlineSellOrders.length + ')';
    var optInGameOnly = document.createElement('option');
    optInGameOnly.value = 'ingame_only';
    optInGameOnly.textContent = 'In Game Only (' + inGameSellOrders.length + ')';
    scopeSelect.appendChild(optAllOnline);
    scopeSelect.appendChild(optInGameOnly);
    scopeSelect.value = safeMode;
    scopeSelect.addEventListener('change', function () {
      ordersOnlineMode = scopeSelect.value;
      renderOrdersContent(container, sellOrders, buyOrders, itemMeta);
    });

    filterControls.appendChild(filterBtn);
    filterControls.appendChild(scopeSelect);
    filterWrap.appendChild(legend);
    filterWrap.appendChild(filterLinks);
    filterWrap.appendChild(filterControls);
    container.appendChild(filterWrap);

    // Tabs
    var tabsWrap = document.createElement('div');
    tabsWrap.className = 'orders-tabs';
    var sellTab = document.createElement('button');
    sellTab.className = 'orders-tab active';
    sellTab.textContent = 'Sellers (' + filteredSellOrders.length + ')';
    var buyTab = document.createElement('button');
    buyTab.className = 'orders-tab';
    buyTab.textContent = 'Buyers (' + buyOrders.length + ')';
    tabsWrap.appendChild(sellTab);
    tabsWrap.appendChild(buyTab);
    container.appendChild(tabsWrap);

    // Order lists
    var sellList = createOrderList(filteredSellOrders, 'sell', itemName);
    var buyList = createOrderList(buyOrders, 'buy', itemName);
    buyList.classList.add('hidden');
    container.appendChild(sellList);
    container.appendChild(buyList);

    sellTab.addEventListener('click', function () {
      sellTab.classList.add('active');
      buyTab.classList.remove('active');
      sellList.classList.remove('hidden');
      buyList.classList.add('hidden');
    });
    buyTab.addEventListener('click', function () {
      buyTab.classList.add('active');
      sellTab.classList.remove('active');
      buyList.classList.remove('hidden');
      sellList.classList.add('hidden');
    });
  }

  function createOrderList(orders, type, itemName) {
    var list = document.createElement('div');
    list.className = 'orders-list';

    if (orders.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'orders-empty';
      empty.textContent = 'No ' + type + ' orders available';
      list.appendChild(empty);
      return list;
    }

    // Header
    var header = document.createElement('div');
    header.className = 'order-row order-header';
    var cols = ['Status', 'Player', 'Rep', 'Price', 'Quantity', 'Action'];
    for (var h = 0; h < cols.length; h++) {
      var hd = document.createElement('div');
      hd.className = 'order-col';
      hd.textContent = cols[h];
      header.appendChild(hd);
    }
    list.appendChild(header);

    for (var i = 0; i < orders.length; i++) {
      var o = orders[i];
      var row = document.createElement('div');
      row.className = 'order-row';

      // Status dot
      var statusCol = document.createElement('div');
      statusCol.className = 'order-col';
      var dot = document.createElement('span');
      var status = o.user ? o.user.status : 'offline';
      dot.className = 'status-dot status-' + status;
      dot.title = status;
      statusCol.appendChild(dot);

      // Player
      var playerCol = document.createElement('div');
      playerCol.className = 'order-col order-player';
      playerCol.textContent = o.user ? o.user.ingame_name : 'Unknown';

      // Reputation
      var repCol = document.createElement('div');
      repCol.className = 'order-col order-rep';
      repCol.textContent = formatReputation(getOrderReputation(o));

      // Price
      var priceCol = document.createElement('div');
      priceCol.className = 'order-col order-price';
      var priceVal = document.createElement('span');
      priceVal.className = 'plat-value';
      priceVal.textContent = o.platinum;
      var platIcon = document.createElement('span');
      platIcon.className = 'plat-icon';
      platIcon.textContent = 'p';
      priceCol.appendChild(priceVal);
      priceCol.appendChild(platIcon);

      // Quantity
      var qtyCol = document.createElement('div');
      qtyCol.className = 'order-col';
      qtyCol.textContent = o.quantity || 1;

      var actionCol = document.createElement('div');
      actionCol.className = 'order-col order-action';
      var actionBtn = document.createElement('button');
      actionBtn.className = 'btn btn-secondary order-action-btn';
      actionBtn.type = 'button';
      actionBtn.textContent = type === 'sell' ? 'Buy' : 'Sell';
      actionBtn.addEventListener('click', function(order, orderType, orderItemName) {
        return function(event) {
          event.stopPropagation();
          copyWhisper(order, orderType, orderItemName);
        };
      }(o, type, itemName));
      actionCol.appendChild(actionBtn);

      row.appendChild(statusCol);
      row.appendChild(playerCol);
      row.appendChild(repCol);
      row.appendChild(priceCol);
      row.appendChild(qtyCol);
      row.appendChild(actionCol);

      list.appendChild(row);
    }

    return list;
  }

  function buildWhisperMessage(order, orderType, itemName) {
    var player = order && order.user ? order.user.ingame_name : 'Unknown';
    var price = order && typeof order.platinum !== 'undefined' ? String(order.platinum) : '?';
    if (orderType === 'sell') {
      return '/w ' + player + ' Hi! I want to buy your ' + itemName + ' for ' + price + ' platinum. (warframe companion app)';
    }
    return '/w ' + player + ' Hi! I want to sell ' + itemName + ' for ' + price + ' platinum. (warframe companion app)';
  }

  async function copyWhisper(order, orderType, itemName) {
    try {
      var message = buildWhisperMessage(order, orderType, itemName);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
      } else {
        var ta = document.createElement('textarea');
        ta.value = message;
        ta.setAttribute('readonly', 'readonly');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showCopyToast((orderType === 'sell' ? 'Buy' : 'Sell') + ' whisper copied');
    } catch (err) {
      showCopyToast('Copy failed');
    }
  }

  function showCopyToast(text) {
    var existing = document.querySelector('.orders-copy-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'orders-copy-toast';
    toast.textContent = text;

    var modal = $('#market-orders-modal .modal');
    if (!modal) return;
    modal.appendChild(toast);

    setTimeout(function () {
      toast.classList.add('show');
    }, 10);

    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 220);
    }, 1400);
  }

  function resetContractsFilters(nextType) {
    contractsFilters = createDefaultContractsFilters(nextType || contractsFilters.type);
    contractsResults = [];
    contractsError = '';
    contractsHasSearched = false;
    contractsVisibleCount = CONTRACT_RESULTS_BATCH_SIZE;
  }

  function handleContractsViewClick(event) {
    var typeBtn = event.target.closest('[data-contract-type]');
    if (typeBtn) {
      resetContractsFilters(typeBtn.dataset.contractType);
      renderContractsView();
      return;
    }

    var contactBtn = event.target.closest('[data-contract-auction-id]');
    if (contactBtn) {
      copyContractWhisper(findContractAuctionById(contactBtn.dataset.contractAuctionId));
      return;
    }

    if (event.target.id === 'contracts-apply-btn') {
      searchContracts();
      return;
    }

    if (event.target.id === 'contracts-reset-btn') {
      resetContractsFilters();
      renderContractsView();
      return;
    }

    if (event.target.id === 'contracts-load-more-btn') {
      contractsVisibleCount += CONTRACT_RESULTS_BATCH_SIZE;
      refreshContractsResults();
    }
  }

  function handleContractsViewChange(event) {
    var target = event.target;
    if (!target) return;

    if (target.id === 'contracts-weapon-select') {
      contractsFilters.weaponUrlName = target.value;
      contractsResults = [];
      contractsError = '';
      contractsHasSearched = false;
      contractsVisibleCount = CONTRACT_RESULTS_BATCH_SIZE;
      if (contractsFilters.type === 'riven') {
        contractsFilters.positiveStats = ['', '', ''];
        contractsFilters.negativeStat = '';
      }
      renderContractsView();
      return;
    }

    if (target.id === 'contracts-positive-0' || target.id === 'contracts-positive-1' || target.id === 'contracts-positive-2') {
      var index = Number(String(target.id).slice(-1));
      contractsFilters.positiveStats[index] = target.value;
      contractsResults = [];
      contractsError = '';
      contractsHasSearched = false;
      contractsVisibleCount = CONTRACT_RESULTS_BATCH_SIZE;
      renderContractsView();
      return;
    }

    if (target.id === 'contracts-negative-select') {
      contractsFilters.negativeStat = target.value;
      contractsResults = [];
      contractsError = '';
      contractsHasSearched = false;
      contractsVisibleCount = CONTRACT_RESULTS_BATCH_SIZE;
      renderContractsView();
      return;
    }

    if (target.id === 'contracts-rank-select') {
      contractsFilters.modRank = target.value || 'any';
      contractsResults = [];
      contractsError = '';
      contractsHasSearched = false;
      contractsVisibleCount = CONTRACT_RESULTS_BATCH_SIZE;
      renderContractsView();
      return;
    }

    if (target.id === 'contracts-element-select') {
      contractsFilters.element = target.value;
      contractsResults = [];
      contractsError = '';
      contractsHasSearched = false;
      contractsVisibleCount = CONTRACT_RESULTS_BATCH_SIZE;
      if (contractsFilters.ephemera) {
        var selectedEphemera = findLookupByUrl(getContractsEphemeraOptions(), contractsFilters.ephemera);
        if (selectedEphemera && selectedEphemera.element !== contractsFilters.element) {
          contractsFilters.ephemera = '';
        }
      }
      renderContractsView();
      return;
    }

    if (target.id === 'contracts-ephemera-select') {
      contractsFilters.ephemera = target.value;
      contractsResults = [];
      contractsError = '';
      contractsHasSearched = false;
      contractsVisibleCount = CONTRACT_RESULTS_BATCH_SIZE;
      var ephemera = findLookupByUrl(getContractsEphemeraOptions(), contractsFilters.ephemera);
      if (ephemera && ephemera.element) {
        contractsFilters.element = ephemera.element;
      }
      renderContractsView();
      return;
    }

    if (target.id === 'contracts-sort-select') {
      contractsFilters.sortBy = target.value || 'price_asc';
      refreshContractsResults();
    }
  }

  function handleContractsViewInput(event) {
    var target = event.target;
    if (!target) return;

    if (target.id === 'contracts-quick-search') {
      contractsFilters.quickSearch = String(target.value || '');
      refreshContractsResults();
    }
  }

  // ---------- Init on document ready ----------
  function initMarket() {
    if (marketInitialized) return;
    marketInitialized = true;

    // Market search
    var searchInput = $('#market-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        marketSearchQuery = String(e.target.value || '');
        var clearBtn = $('#market-search-clear');
        if (clearBtn) clearBtn.classList.toggle('hidden', !marketSearchQuery);
        applyMarketFilters();
      });
    }

    var analyticsSearchInput = $('#trade-analytics-search-input');
    if (analyticsSearchInput) {
      analyticsSearchInput.addEventListener('input', function (e) {
        analyticsSearchQuery = String(e.target.value || '');
        var clearBtn = $('#trade-analytics-search-clear');
        if (clearBtn) clearBtn.classList.toggle('hidden', !analyticsSearchQuery);
        renderTradeAnalyticsSearchResults();
      });

      analyticsSearchInput.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var results = getAnalyticsSearchResults();
        if (results.length > 0) {
          selectAnalyticsItem(results[0], false);
        }
      });
    }

    var searchClear = $('#market-search-clear');
    if (searchClear) {
      searchClear.addEventListener('click', function () {
        var inp = $('#market-search-input');
        if (inp) inp.value = '';
        marketSearchQuery = '';
        searchClear.classList.add('hidden');
        applyMarketFilters();
      });
    }

    var analyticsSearchClear = $('#trade-analytics-search-clear');
    if (analyticsSearchClear) {
      analyticsSearchClear.addEventListener('click', function () {
        var inp = $('#trade-analytics-search-input');
        if (inp) inp.value = '';
        analyticsSearchQuery = '';
        analyticsSearchClear.classList.add('hidden');
        renderTradeAnalyticsSearchResults();
      });
    }

    // Category buttons
    document.querySelectorAll('.market-cat-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.market-cat-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        marketCategory = btn.dataset.marketCat;
        applyMarketFilters();
      });
    });

    var analyticsRefreshBtn = $('#btn-trade-analytics-refresh');
    if (analyticsRefreshBtn) {
      analyticsRefreshBtn.addEventListener('click', function () {
        loadTradeAnalytics(true);
      });
    }

    var analyticsOpenOrdersBtn = $('#btn-trade-analytics-open-orders');
    if (analyticsOpenOrdersBtn) {
      analyticsOpenOrdersBtn.addEventListener('click', function () {
        if (analyticsCurrentItem) {
          openOrdersModal(analyticsCurrentItem);
        }
      });
    }

    var contractsToggleBtn = $('#market-contracts-btn');
    if (contractsToggleBtn) {
      contractsToggleBtn.addEventListener('click', function () {
        setMarketViewMode(marketViewMode === 'contracts' ? 'items' : 'contracts');
      });
    }

    var contractsView = $('#contracts-view');
    if (contractsView) {
      contractsView.addEventListener('click', handleContractsViewClick);
      contractsView.addEventListener('change', handleContractsViewChange);
      contractsView.addEventListener('input', handleContractsViewInput);
    }

    // Close modal
    var closeBtn = $('#orders-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeOrdersModal);
    var modal = $('#market-orders-modal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeOrdersModal();
      });
    }

    // ESC key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeOrdersModal();
    });

    renderMarketViewState();
  }

  // Expose globally
  window.warframeMarket = {
    init: initMarket,
    load: loadMarketItems,
    loadAnalytics: loadTradeAnalytics,
    openItemByName: openItemByName,
    searchItemByName: searchItemByName,
    showContracts: function () {
      return setMarketViewMode('contracts');
    },
  };

})();
