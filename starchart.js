// ==========================================
//  WARFRAME STAR CHART – Solar System Panel
// ==========================================
(function () {
  'use strict';

  var SOL_NODES_URL = 'https://raw.githubusercontent.com/WFCD/warframe-worldstate-data/master/data/solNodes.json';
  var EXPORT_REGIONS_URL = 'https://raw.githubusercontent.com/calamity-inc/warframe-public-export-plus/senpai/ExportRegions.json';

  var PLANET_LABEL_TO_KEY = {
    'Mercury': 'mercury',
    'Venus': 'venus',
    'Earth': 'earth',
    'Lua': 'lua',
    'Mars': 'mars',
    'Phobos': 'phobos',
    'Deimos': 'deimos',
    'Ceres': 'ceres',
    'Jupiter': 'jupiter',
    'Europa': 'europa',
    'Saturn': 'saturn',
    'Uranus': 'uranus',
    'Neptune': 'neptune',
    'Pluto': 'pluto',
    'Eris': 'eris',
    'Sedna': 'sedna',
    'Void': 'void',
    'Zariman': 'zariman',
    'Kuva Fortress': 'kuva'
  };

  var PLANET_DATA_OVERRIDES = {
    mercury: { boss: 'Captain Vor' },
    venus: { boss: 'Jackal' },
    earth: { boss: 'Councilor Vay Hek' },
    lua: { boss: 'None' },
    mars: { boss: 'Lieutenant Lech Kril' },
    phobos: { boss: 'The Sergeant' },
    deimos: { boss: 'Lephantis / Zealoid Prelate / The Fragmented' },
    ceres: { boss: 'Lieutenant Lech Kril & Captain Vor' },
    jupiter: { boss: 'Alad V / The Ropalolyst' },
    europa: { boss: 'Raptors' },
    saturn: { boss: 'General Sargas Ruk' },
    uranus: { boss: 'Tyl Regor' },
    neptune: { boss: 'Hyena Pack' },
    pluto: { boss: 'Ambulas' },
    eris: { boss: 'Mutalist Alad V / Jordas Golem' },
    sedna: { boss: 'Kela De Thaym' },
    void: { boss: 'Corrupted Vor (Mot)' },
    zariman: { boss: 'Void Angel' },
    kuva: { boss: 'None' }
  };

  var BOSS_DROPS = {
    'Fossa': { frameName: 'Rhino', bossName: 'Jackal' },
    'Oro': { frameName: 'Hydroid', bossName: 'Councilor Vay Hek' },
    'War': { frameName: 'Excalibur', bossName: 'Lieutenant Lech Kril' },
    'Iliad': { frameName: 'Mag', bossName: 'The Sergeant' },
    'Magnacidium': { frameName: 'Nekros', bossName: 'Lephantis' },
    'Exta': { frameName: 'Frost', bossName: 'Lieutenant Lech Kril & Captain Vor' },
    'Themisto': { frameName: 'Valkyr', bossName: 'Alad V' },
    'The Ropalolyst': { frameName: 'Wisp', bossName: 'The Ropalolyst' },
    'Naamah': { frameName: 'Nova', bossName: 'Raptors' },
    'Tethys': { frameName: 'Ember', bossName: 'General Sargas Ruk' },
    'Titania': { frameName: 'Equinox', bossName: 'Tyl Regor', note: 'Day and Night component blueprints' },
    'Psamathe': { frameName: 'Loki', bossName: 'Hyena Pack' },
    'Hades': { frameName: 'Trinity', bossName: 'Ambulas' },
    'Merrow': { frameName: 'Saryn', bossName: 'Kela De Thaym' }
  };

  var MISSION_TYPE_NAMES = {
    MT_ALCHEMY: 'Alchemy',
    MT_ARENA: 'Arena',
    MT_ARMAGEDDON: 'Void Armageddon',
    MT_ARTIFACT: 'Infested Salvage',
    MT_ASCENSION: 'Ascension',
    MT_ASSASSINATION: 'Boss',
    MT_ASSAULT: 'Assault',
    MT_CAPTURE: 'Capture',
    MT_CORRUPTION: 'Void Flood',
    MT_DEFENSE: 'Defense',
    MT_EVACUATION: 'Defection',
    MT_EXCAVATE: 'Excavation',
    MT_EXTERMINATION: 'Exterminate',
    MT_HIVE: 'Hive',
    MT_INTEL: 'Spy',
    MT_LANDSCAPE: 'Open World',
    MT_MOBILE_DEFENSE: 'Mobile Defense',
    MT_PAINT_FLOOD: 'Void Flood',
    MT_PURIFY: 'Sabotage',
    MT_PURSUIT: 'Pursuit (Archwing)',
    MT_RACE: 'Rush (Archwing)',
    MT_RESCUE: 'Rescue',
    MT_RETRIEVAL: 'Hijack',
    MT_SABOTAGE: 'Sabotage',
    MT_SURVIVAL: 'Survival',
    MT_TAU_WAR: 'The Perita Rebellion',
    MT_TERRITORY: 'Interception',
    MT_VAULTS: 'Netracells',
    MT_VOID_CASCADE: 'Void Cascade'
  };

  // ---------- Planet Data ----------
  var PLANETS = {
    mercury: {
      name: "MERCURY", type: "Grineer Territory", faction: "Grineer",
      factionColor: "#c84828", boss: "Jackal (Proxima)",
      level: "1-15", image: "assets/starchart/mercury.png",
      x: 430, y: 440, size: 10,
      description: "The closest planet to the sun. Grineer have established mining operations on this scorched rock.",
      missions: [
        { name: "Apollodorus", type: "Survival", level: "8-10" },
        { name: "Calypso", type: "Exterminate", level: "4-6" },
        { name: "Elion", type: "Defense", level: "5-7" },
        { name: "Lares", type: "Capture", level: "2-4" },
        { name: "Tolstoj", type: "Mobile Defense", level: "6-8" },
      ]
    },
    venus: {
      name: "VENUS", type: "Corpus Territory", faction: "Corpus",
      factionColor: "#4888c8", boss: "Jackal",
      level: "3-22", image: "assets/starchart/venus.png",
      x: 380, y: 500, size: 11,
      description: "Covered in clouds and Corpus settlements. The Orb Vallis awaits brave Tenno.",
      missions: [
        { name: "Ishtar", type: "Defense", level: "10-12" },
        { name: "Kiliken", type: "Exterminate", level: "4-6" },
        { name: "Tessera", type: "Spy", level: "6-8" },
        { name: "V Prime", type: "Sabotage", level: "8-10" },
        { name: "Cytherean", type: "Boss", level: "18-20" },
      ]
    },
    earth: {
      name: "EARTH", type: "Grineer Territory", faction: "Grineer",
      factionColor: "#c84828", boss: "Vay Hek",
      level: "1-15", image: "assets/starchart/earth.png",
      x: 650, y: 310, size: 13,
      description: "Once home to the Orokin Empire. Now a jungle reclaimed by nature, dominated by Grineer forces.",
      missions: [
        { name: "Eurasia", type: "Exterminate", level: "1-3" },
        { name: "E Prime", type: "Defense", level: "1-3" },
        { name: "Lith", type: "Excavation", level: "5-7" },
        { name: "Erpo", type: "Dark Sector", level: "15-25" },
        { name: "Oro", type: "Boss", level: "10-12" },
      ]
    },
    lua: {
      name: "LUA", type: "Orokin Territory", faction: "Sentient",
      factionColor: "#c8a84b", boss: "Sentient Battalyst",
      level: "25-30", image: "assets/starchart/lua.png",
      x: 710, y: 265, size: 7,
      description: "Earth's moon, pulled from orbit by the Tenno. Ancient Orokin towers now crawl with Sentients.",
      missions: [
        { name: "Plato", type: "Exterminate", level: "25-30" },
        { name: "Tycho", type: "Survival", level: "25-30" },
        { name: "Stöfler", type: "Spy", level: "25-30" },
        { name: "Copernicus", type: "Defense", level: "25-30" },
      ]
    },
    mars: {
      name: "MARS", type: "Grineer Territory", faction: "Grineer",
      factionColor: "#c84828", boss: "Lieutenant Lech Kril",
      level: "6-20", image: "assets/starchart/mars.png",
      x: 580, y: 290, size: 11,
      description: "Red deserts hide Grineer installations. The war between Corpus and Grineer rages across its surface.",
      missions: [
        { name: "Alator", type: "Defense", level: "10-12" },
        { name: "Ara", type: "Spy", level: "8-10" },
        { name: "Concordia", type: "Sabotage", level: "6-8" },
        { name: "Syrtis", type: "Mobile Defense", level: "8-10" },
        { name: "War", type: "Boss", level: "15-18" },
      ]
    },
    phobos: {
      name: "PHOBOS", type: "Corpus Territory", faction: "Corpus",
      factionColor: "#4888c8", boss: "Grustrag Three",
      level: "15-25", image: "assets/starchart/phobos.png",
      x: 640, y: 220, size: 7,
      description: "A moon of Mars, now a Corpus shipping hub. Strategic location for relay attacks.",
      missions: [
        { name: "Limtoc", type: "Exterminate", level: "15-17" },
        { name: "Montes", type: "Interception", level: "17-19" },
        { name: "Stickney", type: "Assault", level: "18-22" },
      ]
    },
    deimos: {
      name: "DEIMOS", type: "Infested Territory", faction: "Infested",
      factionColor: "#48a848", boss: "Jugulus",
      level: "25-30", image: "assets/starchart/deimos.png",
      x: 560, y: 210, size: 8,
      description: "The Heart of Deimos pulses with Infested biomass. The Entrati family remains trapped here.",
      missions: [
        { name: "Cambion Drift", type: "Open World", level: "25-30" },
        { name: "Vome", type: "Bounty", level: "20-25" },
        { name: "Fass", type: "Bounty", level: "25-30" },
        { name: "Xeno", type: "Defense", level: "28-32" },
      ]
    },
    ceres: {
      name: "CERES", type: "Grineer Territory", faction: "Grineer",
      factionColor: "#c84828", boss: "Sargas Ruk",
      level: "15-25", image: "assets/starchart/ceres.png",
      x: 440, y: 240, size: 9,
      description: "An asteroid-dwarf planet used by Grineer as a stronghold between the inner and outer system.",
      missions: [
        { name: "Cinxia", type: "Interception", level: "16-18" },
        { name: "Hapke", type: "Defense", level: "16-18" },
        { name: "Ker", type: "Mobile Defense", level: "18-22" },
        { name: "Draco", type: "Dark Sector", level: "20-30" },
      ]
    },
    jupiter: {
      name: "JUPITER", type: "Corpus Territory", faction: "Corpus",
      factionColor: "#4888c8", boss: "Alad V",
      level: "20-30", image: "assets/starchart/jupiter.png",
      x: 360, y: 350, size: 16,
      description: "Gas giant with massive Corpus gas cities. Alad V experiments on Warframes in the depths.",
      missions: [
        { name: "Io", type: "Defense", level: "22-24" },
        { name: "Cameria", type: "Dark Sector", level: "20-30" },
        { name: "Elara", type: "Spy", level: "20-22" },
        { name: "Sinai", type: "Boss", level: "24-26" },
      ]
    },
    europa: {
      name: "EUROPA", type: "Corpus Territory", faction: "Corpus",
      factionColor: "#4888c8", boss: "Raptor",
      level: "25-35", image: "assets/starchart/europa.png",
      x: 270, y: 300, size: 9,
      description: "An ice-covered moon of Jupiter with frozen Corpus facilities buried beneath the surface.",
      missions: [
        { name: "Larzac", type: "Interception", level: "26-28" },
        { name: "Naga", type: "Dark Sector", level: "28-38" },
        { name: "Valefor", type: "Spy", level: "26-28" },
        { name: "Ose", type: "Boss", level: "28-30" },
      ]
    },
    saturn: {
      name: "SATURN", type: "Grineer Territory", faction: "Grineer",
      factionColor: "#c84828", boss: "General Sargas Ruk",
      level: "22-35", image: "assets/starchart/saturn.png",
      x: 420, y: 570, size: 14,
      description: "Saturn's rings hide Grineer fleets. The Granum Void waits in Corpus ship wrecks nearby.",
      missions: [
        { name: "Cassini", type: "Capture", level: "22-24" },
        { name: "Helene", type: "Defense", level: "26-28" },
        { name: "Tethys", type: "Survival", level: "24-26" },
        { name: "Piscinas", type: "Dark Sector", level: "28-38" },
      ]
    },
    uranus: {
      name: "URANUS", type: "Grineer Territory", faction: "Grineer",
      factionColor: "#c84828", boss: "Tyl Regor",
      level: "30-40", image: "assets/starchart/uranus.png",
      x: 500, y: 630, size: 11,
      description: "Grineer underwater bases line the ocean of Uranus. Tyl Regor pursues Orokin secrets here.",
      missions: [
        { name: "Ariel", type: "Interception", level: "30-32" },
        { name: "Caliban", type: "Survival", level: "32-34" },
        { name: "Titania", type: "Spy", level: "32-34" },
        { name: "Ophelia", type: "Boss", level: "34-36" },
      ]
    },
    neptune: {
      name: "NEPTUNE", type: "Corpus Territory", faction: "Corpus",
      factionColor: "#4888c8", boss: "Councilor Vay Hek",
      level: "30-40", image: "assets/starchart/neptune.png",
      x: 780, y: 350, size: 12,
      description: "Corpus deep-space research stations orbit the cold giant. Sensitive Corpus data is stored here.",
      missions: [
        { name: "Laomedeia", type: "Defense", level: "33-35" },
        { name: "Proteus", type: "Dark Sector", level: "30-40" },
        { name: "Galatea", type: "Spy", level: "32-34" },
        { name: "Cephalon Capture", type: "Capture", level: "35-37" },
      ]
    },
    pluto: {
      name: "PLUTO", type: "Corpus Territory", faction: "Corpus",
      factionColor: "#4888c8", boss: "Ambulas",
      level: "35-45", image: "assets/starchart/pluto.png",
      x: 860, y: 370, size: 7,
      description: "At the edge of the solar system. Corpus use it for covert operations away from Grineer reach.",
      missions: [
        { name: "Cerberus", type: "Interception", level: "36-38" },
        { name: "Hydra", type: "Exterminate", level: "36-38" },
        { name: "Hieracon", type: "Dark Sector", level: "35-45" },
        { name: "Triton", type: "Boss", level: "38-40" },
      ]
    },
    eris: {
      name: "ERIS", type: "Infested Territory", faction: "Infested",
      factionColor: "#48a848", boss: "Mutalist Alad V",
      level: "30-40", image: "assets/starchart/eris.png",
      x: 860, y: 200, size: 7,
      description: "Overrun by the Infested. Alad V was transformed here, his Mutalist experiments run rampant.",
      missions: [
        { name: "Ixodes", type: "Dark Sector", level: "30-40" },
        { name: "Naeglar", type: "Dark Sector", level: "30-40" },
        { name: "Kappa", type: "Survival", level: "30-35" },
        { name: "Xini", type: "Interception", level: "30-35" },
      ]
    },
    sedna: {
      name: "SEDNA", type: "Grineer Territory", faction: "Grineer",
      factionColor: "#c84828", boss: "Kela De Thaym",
      level: "40-60", image: "assets/starchart/sedna.png",
      x: 560, y: 110, size: 7,
      description: "The furthest Grineer stronghold. Kela De Thaym rules her arena with an iron fist.",
      missions: [
        { name: "Adaro", type: "Exterminate", level: "42-44" },
        { name: "Hydron", type: "Defense", level: "40-42" },
        { name: "Kappa", type: "Survival", level: "40-42" },
        { name: "Merrow", type: "Boss", level: "40-45" },
      ]
    },
    void: {
      name: "VOID", type: "Orokin Territory", faction: "Corrupted",
      factionColor: "#c8a8f8", boss: "Corrupted Vor",
      level: "25-40", image: "assets/starchart/void.png",
      x: 180, y: 350, size: 11, special: "void",
      description: "A dimension outside space-time. The Orokin built their greatest towers here. Loot awaits.",
      missions: [
        { name: "Marduk", type: "Sabotage", level: "25-30" },
        { name: "Mot", type: "Survival", level: "35-45" },
        { name: "Oxomoco", type: "Exterminate", level: "30-35" },
        { name: "Teshub", type: "Defense", level: "25-30" },
        { name: "Ukko", type: "Capture", level: "25-30" },
      ]
    },
    zariman: {
      name: "ZARIMAN", type: "Holdfasts Colony", faction: "Void Angels",
      factionColor: "#60d4f8", boss: "Void Angel",
      level: "50-80", image: null, special: "zariman",
      x: 120, y: 240, size: 12,
      description: "The lost ship of the Zariman Ten Zero. Now adrift in the Void, the Tenno's origin point.",
      missions: [
        { name: "Everview Arc", type: "Exterminate", level: "50-60" },
        { name: "Tuvul Commons", type: "Defense", level: "50-60" },
        { name: "Taveuni", type: "Survival", level: "50-60" },
        { name: "Hive", type: "Alchemy", level: "55-65" },
        { name: "Duviri", type: "Circuit", level: "60-80" },
      ]
    },
    kuva: {
      name: "KUVA FORTRESS", type: "Grineer Stronghold", faction: "Grineer",
      factionColor: "#e87048", boss: "The Sergeant",
      level: "25-35", image: null, special: "kuva",
      x: 560, y: 470, size: 11,
      description: "The seat of the Twin Queens' power. Kuva Liches are born here from Kuva clouds.",
      missions: [
        { name: "Dakata", type: "Defense", level: "28-30" },
        { name: "Nabuk", type: "Rescue", level: "28-30" },
        { name: "Pago", type: "Spy", level: "28-30" },
        { name: "Taveuni", type: "Survival", level: "30-35" },
      ]
    },
    dojo: {
      name: "DOJO", type: "Clan HQ", faction: "Tenno",
      factionColor: "#c8a84b", boss: "—",
      level: "—", image: null, special: "dojo",
      x: 140, y: 500, size: 0,
      description: "Your clan's home base. Research new tech, trade with clanmates, and train in the Dueling Room.",
      missions: [
        { name: "Labs", type: "Research", level: "—" },
        { name: "Trading Post", type: "Trade", level: "—" },
        { name: "Obstacle Course", type: "Practice", level: "—" },
        { name: "Dueling Room", type: "PvP", level: "—" },
      ]
    }
  };

  var STAR_CHART_LAYOUT = {
    mercury: { x: 498, y: 408, size: 18, labelDx: 0, labelDy: -34, labelAnchor: 'middle' },
    venus: { x: 566, y: 492, size: 28, labelDx: 18, labelDy: -34, labelAnchor: 'middle' },
    earth: { x: 658, y: 333, size: 26, labelDx: 16, labelDy: -40, labelAnchor: 'middle' },
    lua: { x: 716, y: 348, size: 13, labelDx: 28, labelDy: -10, labelAnchor: 'start' },
    mars: { x: 622, y: 214, size: 22, labelDx: 18, labelDy: -34, labelAnchor: 'middle' },
    phobos: { x: 690, y: 156, size: 9, labelDx: 16, labelDy: -30, labelAnchor: 'middle' },
    deimos: { x: 577, y: 249, size: 14, labelDx: 30, labelDy: -12, labelAnchor: 'start' },
    ceres: { x: 391, y: 160, size: 15, labelDx: 8, labelDy: -32, labelAnchor: 'middle' },
    jupiter: { x: 236, y: 347, size: 50, labelDx: 56, labelDy: -22, labelAnchor: 'middle' },
    europa: { x: 166, y: 366, size: 22, labelDx: 36, labelDy: -18, labelAnchor: 'start' },
    saturn: { x: 268, y: 548, size: 34, labelDx: 16, labelDy: -40, labelAnchor: 'middle' },
    uranus: { x: 500, y: 618, size: 31, labelDx: 18, labelDy: -38, labelAnchor: 'middle' },
    neptune: { x: 780, y: 570, size: 29, labelDx: 18, labelDy: -40, labelAnchor: 'middle' },
    pluto: { x: 888, y: 344, size: 15, labelDx: 10, labelDy: -26, labelAnchor: 'middle' },
    eris: { x: 799, y: 166, size: 16, labelDx: 18, labelDy: -32, labelAnchor: 'middle' },
    sedna: { x: 506, y: 88, size: 11, labelDx: 18, labelDy: -30, labelAnchor: 'middle' },
    void: { x: 56, y: 362, size: 22, labelDx: -30, labelDy: -18, labelAnchor: 'end' },
    zariman: { x: 84, y: 188, size: 24, labelDx: 18, labelDy: -22, labelAnchor: 'start' },
    kuva: { x: 515, y: 128, size: 13, labelDx: 24, labelDy: -28, labelAnchor: 'middle' },
    dojo: { x: 84, y: 540, size: 32, labelDx: 0, labelDy: -48, labelAnchor: 'middle' }
  };

  Object.keys(STAR_CHART_LAYOUT).forEach(function (key) {
    if (!PLANETS[key]) return;
    Object.keys(STAR_CHART_LAYOUT[key]).forEach(function (prop) {
      PLANETS[key][prop] = STAR_CHART_LAYOUT[key][prop];
    });
  });

  Object.keys(PLANET_DATA_OVERRIDES).forEach(function (key) {
    if (PLANETS[key] && PLANET_DATA_OVERRIDES[key].boss) {
      PLANETS[key].boss = PLANET_DATA_OVERRIDES[key].boss;
    }
  });

  var CONNECTORS = [
    ["center", "mercury"], ["mercury", "venus"], ["venus", "saturn"],
    ["center", "mars"], ["mars", "phobos"], ["mars", "deimos"],
    ["phobos", "sedna"], ["phobos", "eris"],
    ["center", "ceres"], ["ceres", "sedna"],
    ["center", "jupiter"], ["jupiter", "europa"], ["europa", "zariman"],
    ["center", "earth"], ["earth", "lua"],
    ["center", "kuva"], ["kuva", "uranus"],
    ["saturn", "uranus"],
    ["earth", "neptune"], ["neptune", "pluto"],
    ["void", "europa"],
    ["dojo", "void"],
  ];

  var MISSION_COLORS = {
    "Survival": "#c87848", "Defense": "#4888c8", "Exterminate": "#c84848",
    "Capture": "#88c848", "Spy": "#a848c8", "Mobile Defense": "#48a8c8",
    "Interception": "#c8a848", "Sabotage": "#c84888", "Dark Sector": "#884848",
    "Boss": "#c8a84b", "Open World": "#48c888", "Bounty": "#a8c848",
    "Assault": "#c86848", "Rescue": "#48c8a8", "Excavation": "#c8c848",
    "Alchemy": "#48a8a8", "Circuit": "#a8a8c8", "Trade": "#c8a84b",
    "Research": "#4888c8", "Practice": "#88a848", "PvP": "#c84848",
  };

  var CENTER = { x: 500, y: 360 };
  var starchartInitialized = false;
  var starchartDataStatus = 'idle';
  var starchartDataPromise = null;
  var starchartDataError = null;
  var starchartActivePlanet = null;
  var starchartDetailView = null;
  var starchartStarsCanvas, starchartStarsCtx;
  var twinkleStars = [];
  var twinkleCanvas, twinkleCtx;
  var animFrameId = null;
  var frame = 0;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function cloneMissions(missions) {
    return (missions || []).map(function (mission) {
      var copy = {};
      Object.keys(mission || {}).forEach(function (key) {
        copy[key] = mission[key];
      });
      return copy;
    });
  }

  function fallbackFrameImageUrl(frameName) {
    return 'https://warframedrops.com/img/' + encodeURIComponent(String(frameName || '').toLowerCase()) + '.png';
  }

  function getFrameImageSources(frameName) {
    var bridge = window.warframeItemImageBridge;
    if (bridge && typeof bridge.getImageSourcesByName === 'function') {
      var sources = bridge.getImageSourcesByName(frameName);
      if (sources && (sources.primary || sources.fallback)) {
        return {
          primary: String(sources.primary || '').trim(),
          fallback: String(sources.fallback || '').trim()
        };
      }
    }

    return {
      primary: fallbackFrameImageUrl(frameName),
      fallback: ''
    };
  }

  function hydrateMissionDropImages(container) {
    if (!container || !container.querySelectorAll) return;

    var images = container.querySelectorAll('img[data-primary-src]');
    images.forEach(function (img) {
      if (img.getAttribute('data-fallback-bound') === '1') return;
      img.setAttribute('data-fallback-bound', '1');

      var fallbackSrc = String(img.getAttribute('data-fallback-src') || '').trim();
      img.addEventListener('error', function handleDropError() {
        if (fallbackSrc && img.src !== fallbackSrc) {
          img.src = fallbackSrc;
          return;
        }
        img.removeEventListener('error', handleDropError);
      });
    });
  }

  function cleanFallbackType(type) {
    if (!type) return '';
    if (type === 'Extermination') return 'Exterminate';
    if (type === 'Free Roam') return 'Open World';
    return type;
  }

  function formatMissionType(region, solNode) {
    var fallbackType = cleanFallbackType(solNode && solNode.type);
    if (fallbackType === 'Relay') return '';
    if (fallbackType.indexOf('(Archwing)') !== -1) return fallbackType;
    if (fallbackType.indexOf('Dark Sector') === 0) return fallbackType;
    if (fallbackType === 'Mirror Defense' ||
      fallbackType === 'Disruption' ||
      fallbackType === 'Arena' ||
      fallbackType === 'Ascension' ||
      fallbackType === 'Alchemy' ||
      fallbackType === 'Netracells' ||
      fallbackType === 'Infested Salvage' ||
      fallbackType === 'Hive Sabotage' ||
      fallbackType === 'Void Flood' ||
      fallbackType === 'Void Cascade' ||
      fallbackType === 'Void Armageddon' ||
      fallbackType === 'Skirmish' ||
      fallbackType === 'Volatile' ||
      fallbackType === 'Orphix' ||
      fallbackType === 'The Perita Rebellion') {
      return fallbackType;
    }
    return MISSION_TYPE_NAMES[region && region.missionType] || fallbackType || 'Mission';
  }

  function formatLevelRange(min, max) {
    if (!min && !max) return '';
    if (min === max) return String(min);
    return String(min) + '-' + String(max);
  }

  function extractMissionName(value) {
    return String(value || '').replace(/\s+\([^)]+\)$/, '');
  }

  function getMissionColor(type) {
    if (!type) return '#c8a84b';
    if (type.indexOf('Dark Sector') === 0) return '#884848';
    return MISSION_COLORS[type] || '#c8a84b';
  }

  function shouldSkipMission(solNode, region) {
    var missionType = region && region.missionType;
    var fallbackType = solNode && solNode.type;
    if (!region || !solNode) return true;
    if (!region.maxEnemyLevel || region.maxEnemyLevel <= 0) return true;
    if (missionType === 'MT_PVP') return true;
    if (missionType === 'MT_RAILJACK') return true;
    if (fallbackType === 'Relay') return true;
    return false;
  }

  function buildPlanetData(solNodes, regions) {
    var planetData = {};
    Object.keys(PLANETS).forEach(function (key) {
      planetData[key] = {
        boss: (PLANET_DATA_OVERRIDES[key] && PLANET_DATA_OVERRIDES[key].boss) || PLANETS[key].boss,
        level: PLANETS[key].level,
        missions: []
      };
    });

    Object.keys(solNodes || {}).forEach(function (id) {
      var solNode = solNodes[id];
      var region = regions[id];
      var match;
      var planetKey;
      var missionName;
      var missionType;
      var minLevel;
      var maxLevel;
      var mission;
      var drop;

      if (!solNode || !solNode.value || !region) return;
      match = String(solNode.value).match(/\(([^)]+)\)$/);
      if (!match) return;
      planetKey = PLANET_LABEL_TO_KEY[match[1]];
      if (!planetKey || !planetData[planetKey]) return;
      if (shouldSkipMission(solNode, region)) return;

      missionName = extractMissionName(solNode.value);
      missionType = formatMissionType(region, solNode);
      if (!missionType) return;

      minLevel = Number(region.minEnemyLevel || 0);
      maxLevel = Number(region.maxEnemyLevel || 0);
      mission = {
        id: id,
        name: missionName,
        type: missionType,
        level: formatLevelRange(minLevel, maxLevel),
        minLevel: minLevel,
        maxLevel: maxLevel
      };

      drop = BOSS_DROPS[missionName];
      if (drop) {
        mission.drop = {
          frameName: drop.frameName,
          bossName: drop.bossName,
          note: drop.note || ''
        };
      }

      planetData[planetKey].missions.push(mission);
    });

    Object.keys(planetData).forEach(function (key) {
      var missions = planetData[key].missions || [];
      var minLevel = Infinity;
      var maxLevel = 0;

      missions.sort(function (a, b) {
        var aMin = Number(a.minLevel || 0);
        var bMin = Number(b.minLevel || 0);
        if (aMin !== bMin) return aMin - bMin;
        if (a.maxLevel !== b.maxLevel) return Number(a.maxLevel || 0) - Number(b.maxLevel || 0);
        if (a.type === 'Boss' && b.type !== 'Boss') return 1;
        if (a.type !== 'Boss' && b.type === 'Boss') return -1;
        return String(a.name).localeCompare(String(b.name));
      });

      missions.forEach(function (mission) {
        if (mission.minLevel > 0 && mission.minLevel < minLevel) minLevel = mission.minLevel;
        if (mission.maxLevel > maxLevel) maxLevel = mission.maxLevel;
        delete mission.minLevel;
        delete mission.maxLevel;
      });

      if (minLevel !== Infinity && maxLevel > 0) {
        planetData[key].level = formatLevelRange(minLevel, maxLevel);
      }
    });

    return planetData;
  }

  function mergePlanetData(data) {
    Object.keys(data || {}).forEach(function (key) {
      if (!PLANETS[key]) return;
      if (data[key].boss) PLANETS[key].boss = data[key].boss;
      if (data[key].level) PLANETS[key].level = data[key].level;
      if (data[key].missions && data[key].missions.length) PLANETS[key].missions = data[key].missions;
    });
  }

  function fetchJson(url) {
    return fetch(url, { cache: 'force-cache' }).then(function (response) {
      if (!response.ok) {
        throw new Error('Failed to load ' + url + ' (' + response.status + ')');
      }
      return response.json();
    });
  }

  function ensureStarchartData() {
    if (starchartDataPromise) return starchartDataPromise;

    starchartDataStatus = 'loading';
    starchartDataError = null;
    starchartDataPromise = Promise.all([
      fetchJson(SOL_NODES_URL),
      fetchJson(EXPORT_REGIONS_URL)
    ]).then(function (results) {
      var data = buildPlanetData(results[0], results[1]);
      mergePlanetData(data);
      starchartDataStatus = 'ready';
      if (starchartActivePlanet) renderStarchartDetail(starchartActivePlanet);
      return data;
    }).catch(function (error) {
      starchartDataStatus = 'error';
      starchartDataError = error;
      if (starchartActivePlanet) renderStarchartDetail(starchartActivePlanet);
      throw error;
    });

    return starchartDataPromise;
  }

  function buildMissionCardHtml(mission) {
    var color = getMissionColor(mission.type);
    var hasDrop = !!(mission && mission.drop && mission.drop.frameName);
    var levelText = mission.level ? '<span>LV ' + escapeHtml(mission.level) + '</span>' : '';
    var dropHtml = '';

    if (hasDrop) {
      var imageSources = getFrameImageSources(mission.drop.frameName);
      dropHtml =
        '<div class="starchart-mission-drop-tooltip">' +
        '<div class="starchart-mission-drop-header">Warframe Drop</div>' +
        '<div class="starchart-mission-drop-content">' +
        '<img class="starchart-mission-drop-image" src="' + escapeHtml(imageSources.primary) + '" data-primary-src="' + escapeHtml(imageSources.primary) + '"' +
          (imageSources.fallback ? ' data-fallback-src="' + escapeHtml(imageSources.fallback) + '"' : '') +
          ' alt="' + escapeHtml(mission.drop.frameName) + '" loading="lazy">' +
        '<div class="starchart-mission-drop-copy">' +
        '<div class="starchart-mission-drop-name">' + escapeHtml(mission.drop.frameName) + '</div>' +
        '<div class="starchart-mission-drop-boss">' + escapeHtml(mission.drop.bossName) + '</div>' +
        (mission.drop.note ? '<div class="starchart-mission-drop-note">' + escapeHtml(mission.drop.note) + '</div>' : '') +
        '</div>' +
        '</div>' +
        '</div>';
    }

    return '<div class="starchart-mission-card' + (hasDrop ? ' has-drop' : '') + '"' +
      (hasDrop ? ' title="' + escapeHtml(mission.drop.frameName + ' drops here') + '"' : '') + '>' +
      '<div class="starchart-mission-name-row">' +
      '<div class="starchart-mission-name">' + escapeHtml(mission.name) + '</div>' +
      (hasDrop ? '<span class="starchart-mission-drop-pill">Warframe Drop</span>' : '') +
      '</div>' +
      '<div class="starchart-mission-meta">' +
      '<span class="starchart-mission-type" style="color:' + escapeHtml(color) + '">' + escapeHtml(String(mission.type || '').toUpperCase()) + '</span>' +
      levelText +
      '</div>' +
      dropHtml +
      '</div>';
  }

  function getMissionNodePosition(index, total) {
    var preset = [
      { x: 30, y: 16 }, { x: 48, y: 12 }, { x: 66, y: 17 },
      { x: 74, y: 27 }, { x: 79, y: 39 }, { x: 78, y: 51 },
      { x: 72, y: 64 }, { x: 61, y: 72 }, { x: 49, y: 78 },
      { x: 37, y: 73 }, { x: 25, y: 65 }, { x: 19, y: 53 },
      { x: 18, y: 41 }, { x: 22, y: 29 }, { x: 33, y: 34 },
      { x: 45, y: 37 }, { x: 57, y: 41 }, { x: 62, y: 54 },
      { x: 50, y: 58 }, { x: 38, y: 52 }, { x: 43, y: 25 },
      { x: 58, y: 27 }, { x: 28, y: 79 }, { x: 70, y: 78 }
    ];

    if (index < preset.length) return preset[index];

    var angle = (-145 + ((index - preset.length) * 31)) * Math.PI / 180;
    var radiusX = 36;
    var radiusY = 34;
    return {
      x: 50 + Math.cos(angle) * radiusX,
      y: 48 + Math.sin(angle) * radiusY
    };
  }

  function buildDetailMissionNodeHtml(mission, index, total) {
    var position = getMissionNodePosition(index, total);
    var color = getMissionColor(mission.type);
    var hasDrop = !!(mission && mission.drop && mission.drop.frameName);
    var classes = 'starchart-detail-node' + (position.x < 45 ? ' is-left' : '') + (hasDrop ? ' has-drop' : '');
    var dropHtml = '';

    if (hasDrop) {
      var imageSources = getFrameImageSources(mission.drop.frameName);
      dropHtml =
        '<div class="starchart-detail-node-drop">' +
        '<img src="' + escapeHtml(imageSources.primary) + '" data-primary-src="' + escapeHtml(imageSources.primary) + '"' +
          (imageSources.fallback ? ' data-fallback-src="' + escapeHtml(imageSources.fallback) + '"' : '') +
          ' alt="' + escapeHtml(mission.drop.frameName) + '" loading="lazy">' +
        '<div><strong>' + escapeHtml(mission.drop.frameName) + '</strong><span>' + escapeHtml(mission.drop.bossName) + '</span></div>' +
        '</div>';
    }

    return [
      '<button class="' + classes + '" type="button" style="left:' + position.x + '%;top:' + position.y + '%;--node-color:' + escapeHtml(color) + '"',
      hasDrop ? ' title="' + escapeHtml(mission.drop.frameName + ' drops from ' + mission.drop.bossName) + '"' : '',
      '>',
      '<span class="starchart-detail-node-mark"></span>',
      '<span class="starchart-detail-node-copy">',
      '<span class="starchart-detail-node-name">' + escapeHtml(mission.name) + '</span>',
      '<span class="starchart-detail-node-meta">' + escapeHtml(mission.type || 'Mission') + (mission.level ? ' ' + escapeHtml(mission.level) : '') + '</span>',
      '</span>',
      dropHtml,
      '</button>'
    ].join('');
  }

  function getPlanetExitLinks(key) {
    var seen = {};
    var links = [];

    CONNECTORS.forEach(function (pair) {
      var other = '';
      if (pair[0] === key) other = pair[1];
      if (pair[1] === key) other = pair[0];
      if (!other || other === 'center' || !PLANETS[other] || seen[other]) return;
      seen[other] = true;
      links.push(other);
    });

    return links.slice(0, 3);
  }

  function buildPlanetExitLinkHtml(key, index, total) {
    var p = PLANETS[key];
    var positions = [
      { x: 78, y: 26 },
      { x: 82, y: 56 },
      { x: 28, y: 22 }
    ];
    var pos = positions[index] || { x: 75, y: 30 + index * 18 };

    return [
      '<button class="starchart-detail-exit-link" type="button" data-planet-link="' + escapeHtml(key) + '" style="left:' + pos.x + '%;top:' + pos.y + '%">',
      '<span class="starchart-detail-exit-glyph"></span>',
      '<span>TO ' + escapeHtml(p.name) + '</span>',
      '</button>'
    ].join('');
  }

  function buildDetailPlanetVisual(p) {
    if (p.image) {
      return '<img class="starchart-detail-planet-img" src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.name) + '">';
    }

    if (p.special === 'void') {
      return '<div class="starchart-detail-special-planet is-void"><span></span></div>';
    }

    if (p.special === 'zariman') {
      return '<div class="starchart-detail-special-planet is-zariman"><span></span></div>';
    }

    return '<div class="starchart-detail-special-planet"><span>' + escapeHtml(p.name.charAt(0)) + '</span></div>';
  }

  function ensureStarchartDetailView() {
    if (starchartDetailView) return starchartDetailView;

    var panel = document.getElementById('starchart-panel');
    if (!panel) return null;

    starchartDetailView = document.createElement('section');
    starchartDetailView.id = 'starchart-detail-view';
    starchartDetailView.className = 'starchart-detail-view hidden';
    starchartDetailView.setAttribute('aria-hidden', 'true');
    panel.appendChild(starchartDetailView);

    return starchartDetailView;
  }

  function renderStarchartDetail(key) {
    var p = PLANETS[key];
    var view = ensureStarchartDetailView();
    if (!p || !view) return;

    var missions = p.missions || [];
    var exitLinks = getPlanetExitLinks(key);
    var statusHtml = '';

    if (starchartDataStatus === 'loading') {
      statusHtml = '<div class="starchart-detail-status">Syncing full mission data...</div>';
    } else if (starchartDataStatus === 'error') {
      statusHtml = '<div class="starchart-detail-status is-error">Full mission sync failed. Showing built-in data.</div>';
    }

    view.innerHTML = [
      '<button class="starchart-detail-back" id="starchart-detail-back" type="button" aria-label="Return to system map">',
      '<span class="material-icons-round">arrow_back</span>',
      '</button>',
      '<div class="starchart-detail-portrait" aria-hidden="true"></div>',
      '<div class="starchart-detail-top-icons" aria-hidden="true">',
      '<span></span><span></span><span></span><span></span><span></span>',
      '</div>',
      '<div class="starchart-detail-stage">',
      '<div class="starchart-detail-orbit is-a"></div>',
      '<div class="starchart-detail-orbit is-b"></div>',
      '<div class="starchart-detail-orbit is-c"></div>',
      '<div class="starchart-detail-planet-wrap">',
      buildDetailPlanetVisual(p),
      '</div>',
      '<div class="starchart-detail-title">',
      '<span></span>',
      '<strong>' + escapeHtml(p.name) + '</strong>',
      '</div>',
      exitLinks.map(buildPlanetExitLinkHtml).join(''),
      missions.map(function (mission, index) {
        return buildDetailMissionNodeHtml(mission, index, missions.length);
      }).join(''),
      '</div>',
      '<aside class="starchart-detail-info">',
      '<div class="starchart-detail-info-title">' + escapeHtml(p.name) + '</div>',
      '<div class="starchart-detail-info-grid">',
      '<div><span>LEVEL</span><strong>' + escapeHtml(p.level) + '</strong></div>',
      '<div><span>BOSS</span><strong>' + escapeHtml(p.boss) + '</strong></div>',
      '<div><span>FACTION</span><strong>' + escapeHtml(p.faction) + '</strong></div>',
      '<div><span>NODES</span><strong>' + escapeHtml(missions.length) + '</strong></div>',
      '</div>',
      statusHtml,
      '</aside>'
    ].join('');

    hydrateMissionDropImages(view);

    var backBtn = document.getElementById('starchart-detail-back');
    if (backBtn) backBtn.addEventListener('click', closeStarchartPanel);

    view.querySelectorAll('[data-planet-link]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.stopPropagation();
        openStarchartPanel(button.getAttribute('data-planet-link'));
      });
    });
  }

  function renderStarchartPanel(key) {
    var p = PLANETS[key];
    var statusHtml = '';
    var body = document.getElementById('starchart-panel-body');
    if (!p || !body) return;

    if (starchartDataStatus === 'loading') {
      statusHtml = '<div class="starchart-status-note">Syncing full mission data...</div>';
    } else if (starchartDataStatus === 'error') {
      statusHtml = '<div class="starchart-status-note is-error">Full mission sync failed. Showing built-in data.</div>';
    }

    body.innerHTML =
      '<div class="starchart-section-title">Overview</div>' +
      '<div class="starchart-description">' + escapeHtml(p.description) + '</div>' +
      statusHtml +
      '<div class="starchart-stats-grid">' +
      '<div class="starchart-stat-box"><div class="starchart-stat-label">Level Range</div><div class="starchart-stat-value">' + escapeHtml(p.level) + '</div></div>' +
      '<div class="starchart-stat-box"><div class="starchart-stat-label">Boss</div><div class="starchart-stat-value" style="font-size:11px;word-break:break-word">' + escapeHtml(p.boss) + '</div></div>' +
      '</div>' +
      '<div class="starchart-section-title" style="margin-top:20px">Missions</div>' +
      (p.missions || []).map(buildMissionCardHtml).join('') +
      '<div style="height:40px"></div>';

    hydrateMissionDropImages(body);
  }

  function setActivePlanetVisual(key) {
    var activeGroups = document.querySelectorAll('.sc-planet-group.is-active');
    activeGroups.forEach(function (group) {
      group.classList.remove('is-active');
    });

    if (!key) return;
    var active = document.querySelector('.sc-planet-group[data-planet="' + key + '"]');
    if (active) active.classList.add('is-active');
  }

  function buildPlanetLabelMarkup(p, outerR) {
    var labelDx = Number(p.labelDx || 0);
    var labelDy = Number(p.labelDy != null ? p.labelDy : outerR + 18);
    var labelAnchor = p.labelAnchor || 'middle';
    var markX1 = -16;
    var markX2 = -4;
    var starX = 0;

    if (labelAnchor === 'start') {
      markX1 = -18;
      markX2 = -6;
      starX = -2;
    } else if (labelAnchor === 'end') {
      markX1 = 18;
      markX2 = 6;
      starX = 2;
    }

    return [
      '<g class="sc-label-cluster" transform="translate(' + labelDx + ',' + labelDy + ')">',
      '<line class="sc-label-mark" x1="' + markX1 + '" y1="-8" x2="' + markX2 + '" y2="-8"></line>',
      '<circle class="sc-label-star" cx="' + starX + '" cy="-8" r="1.8"></circle>',
      '<text class="sc-planet-label" text-anchor="' + labelAnchor + '">' + escapeHtml(p.name) + '</text>',
      '</g>'
    ].join('');
  }

  function buildPlanetVisualMarkup(key, p) {
    var outerR = p.size + 7;
    var fillAttr = p.image ? 'url(#sc-img-' + key + ')' : '#284257';
    var ringMarkup = '';

    if (key === 'saturn') {
      ringMarkup = '<ellipse class="sc-planet-special-ring" rx="' + Math.round(p.size * 1.72) + '" ry="' + Math.round(p.size * 0.56) + '" transform="rotate(-12)"></ellipse>';
    } else if (key === 'uranus') {
      ringMarkup = '<ellipse class="sc-planet-special-ring is-subtle" rx="' + Math.round(p.size * 1.3) + '" ry="' + Math.round(p.size * 0.3) + '" transform="rotate(78)"></ellipse>';
    }

    if (p.special === 'void') {
      return [
        '<ellipse class="sc-planet-focus is-wide" rx="' + (outerR + 16) + '" ry="' + Math.round((outerR + 6) * 0.55) + '"></ellipse>',
        '<ellipse class="sc-void-rift-glow" rx="' + Math.round(p.size * 2.8) + '" ry="' + Math.round(p.size * 0.9) + '" transform="rotate(-4)"></ellipse>',
        '<ellipse class="sc-void-rift-core" rx="' + Math.round(p.size * 1.6) + '" ry="' + Math.round(p.size * 0.42) + '" transform="rotate(-4)"></ellipse>',
        '<circle class="sc-void-rift-spark" cx="' + Math.round(p.size * 1.4) + '" cy="-2" r="2.6"></circle>',
        buildPlanetLabelMarkup(p, outerR)
      ].join('');
    }

    if (p.special === 'zariman') {
      return [
        '<circle class="sc-planet-focus" r="' + (outerR + 9) + '"></circle>',
        '<ellipse class="sc-zariman-gate" rx="' + Math.round(p.size * 0.94) + '" ry="' + Math.round(p.size * 1.44) + '"></ellipse>',
        '<path class="sc-zariman-rift" d="M-10 -18 L-18 -1 L-10 18 L0 4 L8 18 L18 0 L10 -17 L0 -4 Z"></path>',
        '<circle class="sc-zariman-core" r="' + Math.round(p.size * 0.42) + '"></circle>',
        buildPlanetLabelMarkup(p, outerR)
      ].join('');
    }

    if (p.special === 'kuva') {
      return [
        '<circle class="sc-planet-focus" r="' + (outerR + 8) + '"></circle>',
        '<circle class="sc-kuva-shell" r="' + Math.round(p.size * 0.98) + '"></circle>',
        '<circle class="sc-kuva-core" r="' + Math.round(p.size * 0.56) + '"></circle>',
        '<path class="sc-kuva-fissure" d="M-7 -10 L-2 -3 L-6 9 L5 1 L1 11"></path>',
        buildPlanetLabelMarkup(p, outerR)
      ].join('');
    }

    if (p.special === 'dojo') {
      return [
        '<circle class="sc-planet-focus" r="' + (outerR + 8) + '"></circle>',
        '<circle class="sc-dojo-orb" r="' + Math.round(p.size * 1.04) + '"></circle>',
        '<circle class="sc-dojo-glass" r="' + Math.round(p.size * 0.74) + '"></circle>',
        '<path class="sc-dojo-crest" d="M0 -14 L8 -3 L4 13 L0 8 L-4 13 L-8 -3 Z"></path>',
        buildPlanetLabelMarkup(p, outerR)
      ].join('');
    }

    return [
      '<circle class="sc-planet-focus" r="' + (outerR + 9) + '"></circle>',
      '<circle class="sc-planet-halo" r="' + (outerR + 3) + '"></circle>',
      '<circle class="sc-planet-frame" r="' + outerR + '"></circle>',
      ringMarkup,
      '<circle class="sc-planet-body" r="' + p.size + '" fill="' + fillAttr + '" filter="url(#sc-glow-sm)"></circle>',
      '<ellipse class="sc-planet-shine" cx="' + (-Math.round(p.size * 0.28)) + '" cy="' + (-Math.round(p.size * 0.32)) + '" rx="' + Math.round(p.size * 0.48) + '" ry="' + Math.max(3, Math.round(p.size * 0.22)) + '"></ellipse>',
      buildPlanetLabelMarkup(p, outerR)
    ].join('');
  }

  // ---------- Build SVG ----------
  function buildChart() {
    var wrap = document.getElementById('starchart-chart-wrap');
    if (!wrap) return;

    wrap.innerHTML = '';

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'starchart-svg');
    svg.setAttribute('viewBox', '0 0 1000 700');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.width = '100%';
    svg.style.height = '100%';

    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = [
      '<filter id="sc-glow-sm" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.8" result="b"></feGaussianBlur><feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter>',
      '<filter id="sc-glow-lg" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="9" result="b"></feGaussianBlur><feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter>',
      '<radialGradient id="sc-left-flare" cx="38%" cy="50%"><stop offset="0%" stop-color="#edf6ff" stop-opacity="0.95"></stop><stop offset="36%" stop-color="#9db4dc" stop-opacity="0.28"></stop><stop offset="100%" stop-color="#03070f" stop-opacity="0"></stop></radialGradient>',
      '<radialGradient id="sc-gold-ambient" cx="50%" cy="52%"><stop offset="0%" stop-color="#ffd777" stop-opacity="0.54"></stop><stop offset="36%" stop-color="#8f631e" stop-opacity="0.3"></stop><stop offset="100%" stop-color="#000000" stop-opacity="0"></stop></radialGradient>',
      '<linearGradient id="sc-gold-shell" x1="50%" y1="0%" x2="50%" y2="100%"><stop offset="0%" stop-color="#d2bd74"></stop><stop offset="45%" stop-color="#8a7535"></stop><stop offset="100%" stop-color="#3b3018"></stop></linearGradient>',
      '<linearGradient id="sc-gold-edge" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fff1b2" stop-opacity="0.82"></stop><stop offset="100%" stop-color="#8b6520" stop-opacity="0.28"></stop></linearGradient>',
      '<radialGradient id="sc-center-core" cx="50%" cy="50%"><stop offset="0%" stop-color="#fff1a3"></stop><stop offset="42%" stop-color="#f3b940" stop-opacity="0.92"></stop><stop offset="100%" stop-color="#6e3f09" stop-opacity="0"></stop></radialGradient>',
      '<radialGradient id="sc-zariman-core-grad" cx="50%" cy="50%"><stop offset="0%" stop-color="#e7fbff" stop-opacity="1"></stop><stop offset="42%" stop-color="#67d8ff" stop-opacity="0.9"></stop><stop offset="100%" stop-color="#0d2748" stop-opacity="0"></stop></radialGradient>',
      '<radialGradient id="sc-kuva-core-grad" cx="50%" cy="50%"><stop offset="0%" stop-color="#ffbf9f"></stop><stop offset="50%" stop-color="#f36531"></stop><stop offset="100%" stop-color="#47160d"></stop></radialGradient>',
      '<radialGradient id="sc-dojo-grad" cx="50%" cy="40%"><stop offset="0%" stop-color="#90c9d8"></stop><stop offset="100%" stop-color="#132636"></stop></radialGradient>',
      '<radialGradient id="sc-void-grad" cx="50%" cy="50%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"></stop><stop offset="36%" stop-color="#c7d6ff" stop-opacity="0.66"></stop><stop offset="100%" stop-color="#c7d6ff" stop-opacity="0"></stop></radialGradient>'
    ].join('');

    Object.keys(PLANETS).forEach(function (key) {
      var p = PLANETS[key];
      if (!p.image) return;

      var pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
      pattern.setAttribute('id', 'sc-img-' + key);
      pattern.setAttribute('patternUnits', 'objectBoundingBox');
      pattern.setAttribute('width', '1');
      pattern.setAttribute('height', '1');

      var img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      img.setAttribute('href', p.image);
      img.setAttribute('width', String(p.size * 2));
      img.setAttribute('height', String(p.size * 2));
      img.setAttribute('preserveAspectRatio', 'xMidYMid slice');

      pattern.appendChild(img);
      defs.appendChild(pattern);
    });

    svg.appendChild(defs);
    svg.appendChild(createSvgEl('rect', {
      x: 0,
      y: 0,
      width: 1000,
      height: 700,
      fill: 'transparent',
      class: 'sc-hit-area'
    }));

    svg.appendChild(createSvgEl('ellipse', {
      cx: 68,
      cy: 362,
      rx: 106,
      ry: 28,
      fill: 'url(#sc-left-flare)',
      class: 'sc-left-flare'
    }));

    [
      { cx: CENTER.x, cy: CENTER.y + 18, rx: 120, ry: 84, rotate: -10 },
      { cx: CENTER.x, cy: CENTER.y + 12, rx: 214, ry: 144, rotate: -10 },
      { cx: CENTER.x, cy: CENTER.y + 8, rx: 316, ry: 216, rotate: -10 },
      { cx: CENTER.x, cy: CENTER.y + 3, rx: 426, ry: 286, rotate: -10 },
      { cx: CENTER.x + 6, cy: CENTER.y + 18, rx: 516, ry: 336, rotate: -10 }
    ].forEach(function (ring) {
      svg.appendChild(createSvgEl('ellipse', {
        class: 'sc-orbit-line',
        cx: ring.cx,
        cy: ring.cy,
        rx: ring.rx,
        ry: ring.ry,
        transform: 'rotate(' + ring.rotate + ' ' + ring.cx + ' ' + ring.cy + ')'
      }));
    });

    [-70, -42, -8, 18, 52, 86, 124, 162].forEach(function (angle) {
      var radians = angle * Math.PI / 180;
      var radius = 620;
      var x2 = CENTER.x + Math.cos(radians) * radius;
      var y2 = CENTER.y + Math.sin(radians) * radius;
      svg.appendChild(createSvgEl('line', {
        class: 'sc-grid-spoke',
        x1: CENTER.x,
        y1: CENTER.y,
        x2: x2,
        y2: y2
      }));
    });

    CONNECTORS.forEach(function (pair) {
      var from = pair[0] === 'center' ? CENTER : PLANETS[pair[0]];
      var to = PLANETS[pair[1]];
      if (!from || !to) return;

      svg.appendChild(createSvgEl('line', {
        class: 'sc-connector',
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y
      }));
    });

    Object.keys(PLANETS).forEach(function (key) {
      var p = PLANETS[key];
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'sc-planet-group');
      g.setAttribute('data-planet', key);
      g.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ')');
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', 'Open ' + p.name + ' details');
      g.innerHTML = buildPlanetVisualMarkup(key, p);

      g.addEventListener('click', function () {
        openStarchartPanel(key);
      });
      g.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openStarchartPanel(key);
        }
      });

      svg.appendChild(g);
    });

    wrap.appendChild(svg);
  }

  function createSvgEl(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, String(attrs[k])); });
    return el;
  }

  // ---------- Side Panel ----------
  function openStarchartPanel(key) {
    var p = PLANETS[key];
    if (!p) return;
    starchartActivePlanet = key;
    setActivePlanetVisual(key);
    renderStarchartDetail(key);

    var panel = document.getElementById('starchart-panel');
    if (panel) panel.classList.add('detail-open');

    var detail = ensureStarchartDetailView();
    if (detail) {
      detail.classList.remove('hidden');
      detail.setAttribute('aria-hidden', 'false');
    }

    var hudInfo = document.getElementById('starchart-hud-info');
    if (hudInfo) hudInfo.textContent = p.name;

    ensureStarchartData().catch(function () {
      return null;
    });
  }

  function closeStarchartPanel() {
    var panel = document.getElementById('starchart-panel');
    if (panel) panel.classList.remove('detail-open');

    var sidePanel = document.getElementById('starchart-side-panel');
    if (sidePanel) sidePanel.classList.remove('open');

    var detail = ensureStarchartDetailView();
    if (detail) {
      detail.classList.add('hidden');
      detail.setAttribute('aria-hidden', 'true');
    }

    var hudInfo = document.getElementById('starchart-hud-info');
    if (hudInfo) hudInfo.textContent = 'SELECT DESTINATION';
    starchartActivePlanet = null;
    setActivePlanetVisual(null);
  }

  // ---------- Star Field ----------
  function initStarField() {
    starchartStarsCanvas = document.getElementById('starchart-stars');
    if (!starchartStarsCanvas) return;
    starchartStarsCtx = starchartStarsCanvas.getContext('2d');
    resizeStarField();
    drawStaticStars();

    // Twinkle layer
    twinkleCanvas = document.createElement('canvas');
    twinkleCanvas.className = 'starchart-twinkle-canvas';
    starchartStarsCanvas.parentElement.appendChild(twinkleCanvas);
    twinkleCtx = twinkleCanvas.getContext('2d');

    twinkleStars = [];
    for (var i = 0; i < 60; i++) {
      twinkleStars.push({
        x: Math.random() * 2000,
        y: Math.random() * 1400,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.005,
        size: Math.random() * 1.5 + 0.3,
        px: 0, py: 0
      });
    }
    resizeTwinkle();
  }

  function resizeStarField() {
    if (!starchartStarsCanvas) return;
    var panel = document.getElementById('starchart-panel');
    if (!panel) return;
    starchartStarsCanvas.width = panel.offsetWidth;
    starchartStarsCanvas.height = panel.offsetHeight;
    drawStaticStars();
  }

  function drawStaticStars() {
    if (!starchartStarsCtx || !starchartStarsCanvas) return;
    var ctx = starchartStarsCtx;
    var w = starchartStarsCanvas.width;
    var h = starchartStarsCanvas.height;
    ctx.clearRect(0, 0, w, h);

    for (var i = 0; i < 220; i++) {
      var x = Math.random() * w;
      var y = Math.random() * h;
      var r = Math.random() * 1.2;
      var a = Math.random() * 0.7 + 0.1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200, 230, 240, ' + a + ')';
      ctx.fill();
    }

    var patches = [
      { x: 0.2, y: 0.3, r: 120, c: '20, 60, 120' },
      { x: 0.7, y: 0.6, r: 100, c: '20, 80, 60' },
      { x: 0.5, y: 0.2, r: 80, c: '60, 20, 80' },
      { x: 0.8, y: 0.2, r: 90, c: '80, 40, 20' },
    ];
    patches.forEach(function (p) {
      var grd = ctx.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, p.r);
      grd.addColorStop(0, 'rgba(' + p.c + ', 0.08)');
      grd.addColorStop(1, 'rgba(' + p.c + ', 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
    });
  }

  function resizeTwinkle() {
    if (!twinkleCanvas) return;
    var panel = document.getElementById('starchart-panel');
    if (!panel) return;
    twinkleCanvas.width = panel.offsetWidth;
    twinkleCanvas.height = panel.offsetHeight;
    twinkleStars.forEach(function (s) {
      s.px = (s.x / 2000) * twinkleCanvas.width;
      s.py = (s.y / 1400) * twinkleCanvas.height;
    });
  }

  function startTwinkle() {
    if (animFrameId) return;
    frame = 0;
    function loop() {
      if (!twinkleCtx || !twinkleCanvas) return;
      twinkleCtx.clearRect(0, 0, twinkleCanvas.width, twinkleCanvas.height);
      frame++;
      twinkleStars.forEach(function (s) {
        var alpha = (Math.sin(frame * s.speed + s.phase) + 1) / 2 * 0.8 + 0.1;
        twinkleCtx.beginPath();
        twinkleCtx.arc(s.px, s.py, s.size, 0, Math.PI * 2);
        twinkleCtx.fillStyle = 'rgba(200, 240, 255, ' + alpha + ')';
        twinkleCtx.fill();
      });
      animFrameId = requestAnimationFrame(loop);
    }
    loop();
  }

  function stopTwinkle() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  // ---------- Init ----------
  function initStarchart() {
    if (starchartInitialized) return;
    starchartInitialized = true;

    buildChart();
    initStarField();
    ensureStarchartData().catch(function () {
      return null;
    });

    // Close button
    var closeBtn = document.getElementById('starchart-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeStarchartPanel);

    // Close on background click
    var chartWrap = document.getElementById('starchart-chart-wrap');
    if (chartWrap) {
      chartWrap.addEventListener('click', function (e) {
        if (!e.target.closest || !e.target.closest('.sc-planet-group')) {
          closeStarchartPanel();
        }
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeStarchartPanel();
      }
    });

    window.addEventListener('resize', function () {
      resizeStarField();
      resizeTwinkle();
    });
  }

  // Expose for renderer.js
  window.warframeStarchart = {
    init: initStarchart,
    startAnimation: startTwinkle,
    stopAnimation: stopTwinkle,
    resizeStarField: resizeStarField,
    resizeTwinkle: resizeTwinkle
  };

})();
