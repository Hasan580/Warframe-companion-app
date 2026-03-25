// ==========================================
//  WARFRAME MARKET MODULE
// ==========================================

(function () {
  'use strict';

  const MARKET_API = 'https://api.warframe.market/v2/items';
  const ORDERS_API_V2 = 'https://api.warframe.market/v2/orders/item';
  const ORDERS_API_V1 = 'https://api.warframe.market/v1/items';
  const STATS_API_V1 = 'https://api.warframe.market/v1/items';
  const CDN_BASE = 'https://warframe.market/static/assets/';
  const MARKET_CACHE_KEY = 'warframe_market_items_v3';
  const MARKET_CACHE_TTL = 60 * 60 * 1000; // 1 hour
  const ANALYTICS_STATS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
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
  let analyticsSearchQuery = '';
  let analyticsSelectedSlug = '';
  let analyticsCurrentItem = null;
  let analyticsStatsCache = Object.create(null);
  let analyticsRequestToken = 0;

  const $ = function (sel) { return document.querySelector(sel); };

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
    var countEl = $('#market-item-count');
    if (countEl) countEl.textContent = filteredMarketItems.length + ' items';
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
  }

  // Expose globally
  window.warframeMarket = {
    init: initMarket,
    load: loadMarketItems,
    loadAnalytics: loadTradeAnalytics,
    openItemByName: openItemByName,
    searchItemByName: searchItemByName,
  };

})();
