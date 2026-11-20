// Engraved line-art pictograms. Every symbol is drawn on a 24×24 grid with a
// single stroke pass so it inherits the colour and weight of its context.

const RESOURCE_ICONS = {
  wood: '<path d="M3.5 13.6h9.8a3.4 3.4 0 0 1 0 6.8H3.5z"/><ellipse cx="13.3" cy="17" rx="1.5" ry="3.2"/><path d="M6.6 13.9v6.2M9.6 13.8v6.5"/>',
  stone:
    '<path d="M4 17.2 6.6 8.4l6-2 5.8 4-1.4 6.8z"/><path d="M6.6 8.4 11.4 13l7-2.6"/><path d="M11.4 13l-.9 4.6"/><path d="M2.8 20.6h18.4"/>',
  food: '<path d="M12 20.8V8.2"/><path d="M12 8.2 9.4 5.9M12 8.2l2.6-2.3"/><path d="M12 11.8l-3.1-2.2M12 11.8l3.1-2.2"/><path d="M12 15.4l-3.1-2.2M12 15.4l3.1-2.2"/><path d="M8.8 20.8h6.4"/>',
  spirit:
    '<path d="M12 3.4c3.7 3.1 5.6 6.1 5.6 9.1a5.6 5.6 0 0 1-11.2 0c0-2 1-3.7 2.4-5.3.9 1.4 1.7 2.1 2.7 2.5-.4-2.5-.4-4.4.5-6.3z"/><path d="M12 20.6a2.9 2.9 0 0 0 1.5-5.4"/>',
  pearls:
    '<path d="M3.4 10.6c0 6.1 4 9.9 8.6 9.9s8.6-3.8 8.6-9.9"/><path d="M3.4 10.6c1.5-2.1 4.2-3.2 8.6-3.2s7.1 1.1 8.6 3.2"/><path d="M8.2 10.9 9.8 19M12 10v9.4M15.8 10.9 14.2 19"/><circle cx="12" cy="4.9" r="2.2"/>',
  parts:
    '<circle cx="12" cy="12" r="4.3"/><circle cx="12" cy="12" r="1.4"/><path d="M12 3.5v2.4M12 18.1v2.4M3.5 12h2.4M18.1 12h2.4M6 6l1.8 1.8M16.2 16.2 18 18M18 6l-1.8 1.8M7.8 16.2 6 18"/>',
  prosperity:
    '<path d="M3.4 17.8h17.2"/><path d="M7 17.8a5 5 0 0 1 10 0"/><path d="M12 4.6v2.6M6.4 7l1.7 2M17.6 7l-1.7 2M3.6 12.2h2.3M18.1 12.2h2.3"/>',
  growth: '<path d="M3.4 20.6h5.2v-5.2h5.2V10h5.2V4.8"/><path d="M14.4 4.8h4.6v4.6"/>',
  harmony:
    '<path d="M12 4.6v15.2"/><path d="M5.6 19.8h12.8"/><path d="M4.6 8.2h14.8"/><path d="M4.6 8.2 2.6 13.2a3.1 3.1 0 0 0 6 0z"/><path d="M19.4 8.2l2 5a3.1 3.1 0 0 1-6 0z"/>',
  vitality:
    '<path d="M12 20.4s-7.4-4.4-7.4-9.3a4.1 4.1 0 0 1 7.4-2.3 4.1 4.1 0 0 1 7.4 2.3c0 4.9-7.4 9.3-7.4 9.3z"/>',
  relation: '<circle cx="9.1" cy="12" r="4.6"/><circle cx="14.9" cy="12" r="4.6"/>',
  temporaryDefense:
    '<path d="M12 3.3 19 6v6c0 4.5-3 7.5-7 8.9C8 19.5 5 16.5 5 12V6z"/><path d="M8.6 11.4 12 14.9l3.4-3.5"/>',
};

const BUILDING_ICONS = {
  home: '<path d="M3.6 11 12 3.8 20.4 11"/><path d="M5.9 10.2v10.2h12.2V10.2"/><path d="M10 20.4v-5.2h4v5.2"/><path d="M9 13.2h2v2H9z"/>',
  farm: '<path d="M2.8 20.6h18.4"/><path d="M6 20.6c0-4.2 2.5-6.8 6-6.8s6 2.6 6 6.8"/><path d="M12 13.8V8.8"/><path d="M12 8.8c-2.3 0-3.7-1.5-3.9-3.7C10.4 5.3 12 6.7 12 8.8z"/><path d="M12 8.8c2.3 0 3.7-1.5 3.9-3.7C13.6 5.3 12 6.7 12 8.8z"/><path d="M5.2 17.1h13.6"/>',
  lumberCamp:
    '<path d="M12 3.1 16.9 10h-2.9l3.9 6.3H6.1L10 10H7.1z"/><path d="M12 16.3v4.3"/><path d="M3.6 20.6h16.8"/>',
  well: '<path d="M8.8 9.4 12 4.9l3.2 4.5"/><path d="M6.4 9.4v11.2h11.2V9.4"/><path d="M4.4 20.6h15.2"/><path d="M9.1 12.4h5.8"/><path d="M12 12.4v2.6"/><path d="M10.3 15h3.4l-.6 2.1h-2.2z"/>',
  watchtower:
    '<path d="M7.6 20.6 8.7 8h6.6l1.1 12.6z"/><path d="M6.2 8h11.6"/><path d="M8 5.1h2.1v2.9H8zM13.9 5.1H16v2.9h-2.1z"/><path d="M12 11.3v4.8"/><path d="M4.6 20.6h14.8"/>',
  quarry:
    '<path d="M3.4 20.6h13.2l1.4-5.4H4.8z"/><path d="M4.8 15.2 6.8 17l2.4-1.8 2.6 1.8 2.4-1.8"/><path d="M6.2 12.4 11.8 6.6"/><path d="M10.8 3.6c3.2-.4 6 1.2 7.4 4.2"/><path d="M18.2 7.8 15.6 9.4"/>',
  market:
    '<path d="M3.4 9.6h17.2"/><path d="M3.4 9.6v1.7a2.1 2.1 0 0 0 4.3 0V9.6"/><path d="M7.7 9.6v1.7a2.1 2.1 0 0 0 4.3 0V9.6"/><path d="M12 9.6v1.7a2.1 2.1 0 0 0 4.3 0V9.6"/><path d="M16.3 9.6v1.7a2.1 2.1 0 0 0 4.3 0V9.6"/><path d="M5.4 13.6v7h13.2v-7"/><path d="M3.4 20.6h17.2"/><circle cx="9.8" cy="16.4" r="1"/><circle cx="14.2" cy="16.4" r="1"/>',
  harbor:
    '<circle cx="12" cy="4.9" r="1.9"/><path d="M12 6.8v13.8"/><path d="M7.6 10.2h8.8"/><path d="M5 14.4c0 3.4 3.1 6.2 7 6.2s7-2.8 7-6.2"/><path d="M5 14.4 3.4 17.2M19 14.4l1.6 2.8"/>',
  palisade:
    '<path d="M5 20.6V8.6L6.5 6 8 8.6v12"/><path d="M9.5 20.6V8.6L11 6l1.5 2.6v12"/><path d="M14 20.6V8.6L15.5 6 17 8.6v12"/><path d="M2.8 12.6h18.4"/><path d="M2.8 17.4h18.4"/>',
  healer:
    '<path d="M4.8 12.6h14.4l-1.6 6.4a2.1 2.1 0 0 1-2.1 1.6H8.5a2.1 2.1 0 0 1-2.1-1.6z"/><path d="M12 3.9v6.4M8.8 7.1h6.4"/><path d="M16.9 12.6 18.4 5.6"/>',
  workshop:
    '<path d="M4.4 19.6 11.6 12.4"/><path d="M10.2 8.4 14.6 4l5.4 5.4-4.4 4.4z"/><path d="M10.2 8.4 14.6 12.8"/><path d="M3.6 21h8.8"/><path d="M18.6 16.4l2.4-2M20.6 19.6l2-1.2M16.6 20.6v2"/>',
  ballista:
    '<path d="M6.4 5.1c3.9 3.2 3.9 10.6 0 13.8"/><path d="M6.4 5.1v13.8"/><path d="M3.6 12h13"/><path d="M16.6 12l-3-2.6M16.6 12l-3 2.6"/><path d="M6.4 12h3"/>',
  skyDock:
    '<ellipse cx="12" cy="7.8" rx="8.4" ry="4.2"/><path d="M3.6 7.8h16.8"/><path d="M3.8 5.2 6.6 6.9v1.8L3.8 10.4"/><path d="M9 12h6l1 3.2H8z"/><path d="M3.4 20.4h17.2"/><path d="M10 15.2v2.4M14 15.2v2.4"/>',
  reservoir:
    '<path d="M7 13.6a3.6 3.6 0 0 1 0-7.2 4.6 4.6 0 0 1 8.8 1.2A3.1 3.1 0 0 1 17 13.6z"/><path d="M12 15.4c1.6 2 2.4 3.3 2.4 4.6a2.4 2.4 0 0 1-4.8 0c0-1.3.8-2.6 2.4-4.6z"/>',
  academy:
    '<circle cx="12" cy="12" r="8.2"/><path d="M9.2 15.2 15 8.8l-2.2 6.2z"/><path d="M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2"/>',
  temple:
    '<path d="M3.4 8.4 12 3l8.6 5.4z"/><path d="M4.9 8.4h14.2"/><path d="M7 8.4v9M10.6 8.4v9M14.2 8.4v9M17.8 8.4v9"/><path d="M4 17.4h16v3.2H4z"/>',
  aerie:
    '<path d="M8.1 6.1c1.4.7 2.8 2 3.9 3.6 1.1-1.6 2.5-2.9 3.9-3.6"/><path d="M12 9.7v1.9"/><path d="M3.6 14.2h16.8"/><path d="M5.4 14.2c1 4.8 12.2 4.8 13.2 0"/>',
  stoneWall:
    '<path d="M3.4 7.6h17.2v13h-17.2z"/><path d="M3.4 12h17.2M3.4 16.4h17.2"/><path d="M9 7.6V12M15 7.6V12"/><path d="M6 12v4.4M12 12v4.4M18 12v4.4"/><path d="M9 16.4v4.2M15 16.4v4.2"/>',
  greatMarket:
    '<path d="M3.4 9.6 5 5.4h14l1.6 4.2"/><path d="M3.4 9.6h17.2"/><path d="M7.8 9.6v11M16.2 9.6v11"/><path d="M5.6 20.6h12.8"/><path d="M10 13.4h4v4.4h-4z"/>',
  worldRoot:
    '<path d="M12 10.6V18"/><circle cx="8.6" cy="7.4" r="3.1"/><circle cx="15.4" cy="7.4" r="3.1"/><circle cx="12" cy="4.7" r="3.1"/><path d="M4 18.4h16"/><path d="M6.4 21.4c1.6-2 3.2-3 5.6-3s4 1 5.6 3"/><path d="M9.4 21.4v-2.6M14.6 21.4v-2.6"/>',
  citadel:
    '<path d="M3.4 20.6V8.8l3-1.9 3 1.9v11.8z"/><path d="M14.6 20.6V8.8l3-1.9 3 1.9v11.8z"/><path d="M9.4 20.6v-7.2h5.2v7.2"/><path d="M3.4 20.6h17.2"/><path d="M6.4 6.9V4.4l1.5 1 1.5-1v2.5"/>',
  stormCannon:
    '<path d="M3.8 9.8h8.4l2.9 3-2.9 3H3.8z"/><path d="M3.8 12.8h11.3"/><circle cx="7.6" cy="18.4" r="2.6"/><path d="M3.4 20.8h17.2"/><path d="M17.4 7.2l1.8-1.6M18.6 10.4h2.2M15.6 4.6V2.2"/>',
  grandSanctuary:
    '<path d="M4.6 20.6V12a7.4 7.4 0 0 1 14.8 0v8.6"/><path d="M3.4 20.6h17.2"/><path d="M12 19.4a3.6 3.6 0 1 1 0-7.2 2.3 2.3 0 1 1 0 4.6 1.1 1.1 0 0 1 0-2.2"/>',
  worldGate:
    '<path d="M6 20.6V13a6 6 0 0 1 12 0v7.6"/><path d="M9.6 20.6V13a2.4 2.4 0 0 1 4.8 0v7.6"/><path d="M12 3.4v2.8M17.4 5.4l-1.6 2M6.6 5.4l1.6 2"/><path d="M3.4 20.6h17.2"/>',
};

const EXPEDITION_ICONS = {
  shoreForage:
    '<ellipse cx="10.2" cy="15.2" rx="6.6" ry="4"/><path d="M16.6 15.2 21 12.4v5.6z"/><circle cx="6.6" cy="14.2" r=".7"/><path d="M3.4 8.4q2.4-2 4.8 0t4.8 0"/>',
  deepSalvage:
    '<circle cx="12" cy="5" r="2.2"/><path d="M12 7.2v11.8"/><path d="M8.6 9.8h6.8"/><path d="M4.8 13.4c0 4.4 3.2 7.6 7.2 7.6s7.2-3.2 7.2-7.6"/><path d="M4.8 13.4 3.4 15.6M19.2 13.4l1.4 2.2"/>',
  cloudHarvest:
    '<path d="M7 13.2a3.6 3.6 0 0 1 0-7.2 4.6 4.6 0 0 1 8.8 1.2A3.1 3.1 0 0 1 17 13.2z"/><path d="M9.2 16.2v2.6"/><path d="M12 16.8v3.4"/><path d="M14.8 16.2v2.6"/>',
  ancientMap:
    '<path d="M5.4 4.8h9.2l4 4v10.4H5.4z"/><path d="M14.6 4.8v4h4"/><path d="M8.2 9.4 10.4 11.6M10.4 9.4 8.2 11.6"/><path d="M7.4 16.8q2-3 4-2t3.6-1.4"/>',
  kelpPilgrimage:
    '<path d="M7.6 19.8c-2.8-4.6-.6-7.6 1-11 2 3.6 3.2 7.4-1 11z"/><path d="M15.4 19.8c-2.8-4.6-.6-7.6 1-11 2 3.6 3.2 7.4-1 11z"/><path d="M4 21.2h16"/>',
  thunderSurvey:
    '<path d="M7 13.4a3.6 3.6 0 0 1 0-7.2 4.6 4.6 0 0 1 8.8 1.2A3.1 3.1 0 0 1 17 13.4z"/><path d="M13.2 13.8 9 18.6h3.2l-.8 3 4.4-5.2h-3.2z"/>',
  basaltWay:
    '<path d="M4.6 20.4V9.2l2.6-1.6 2.6 1.6v11.2"/><path d="M14.2 20.4V6.6l2.6-1.6 2.6 1.6v13.8"/><path d="M4.6 13.4h5.2M14.2 10.6h5.2"/><path d="M11.8 20.4c.6-2.4 0-3.6-1.4-4.6"/>',
  elderConvoy:
    '<path d="M3.4 13.8h10l-2 3.4H5.4z"/><path d="M8.4 13.8V6.2"/><path d="M8.8 6.6 13.8 9.6H8.8z"/><path d="M2.6 20.6q2.4-2 4.8 0t4.8 0t4.8 0"/>',
};

const WORLD_ICONS = {
  turtle:
    '<path d="M5 16.4a7 6 0 0 1 14 0z"/><path d="M9 16.4c0-2.6 1.2-4.4 3-4.8M15 16.4c0-2.6-1.2-4.4-3-4.8"/><circle cx="20.2" cy="13.8" r="1.7"/><path d="M18.8 15.4 19.6 14.6"/><path d="M7.4 16.4v3.4M16.6 16.4v3.4"/>',
  whale:
    '<path d="M4 16c0-3.6 3.2-6.2 7.4-6.2 3.4 0 6.2 1.6 7.6 4.2-1.4 2.6-4.2 4.4-7.6 4.4H4z"/><path d="M4 16.6h3.8"/><path d="M7.6 9.8c0-1.8.8-3 2-3.6M9.8 9.4c.4-1.6 1.4-2.6 2.6-2.8"/><path d="M18.6 14.2c1.4-.2 2.4-1.2 3-2.6.7 1.1.7 2.4 0 3.5-.5-1.1-1.6-1.6-3-1.6"/>',
  crab:
    '<path d="M6 16.8a6 4 0 1 0 12 0 6 4 0 1 0-12 0z"/><path d="M10.6 13.2V11.8M13.4 13.2V11.8"/><circle cx="10.6" cy="11.2" r=".7"/><circle cx="13.4" cy="11.2" r=".7"/><path d="M6.4 15.2 4.6 13.5M4.6 13.5a1.4 1.4 0 1 0-1.1 2.2M17.6 15.2 19.4 13.5M19.4 13.5a1.4 1.4 0 1 1 1.1 2.2"/><path d="M7.6 19.6 6.2 21.2M16.4 19.6l1.4 1.6"/>',
  manta:
    '<path d="M12 4.4c-.6 2-1.8 3.4-3.4 4.2L3.6 11.2c2.8 1.6 5.4 2.4 8.4 2.4s5.6-.8 8.4-2.4l-5-2.6c-1.6-.8-2.8-2.2-3.4-4.2z"/><path d="M12 13.6v6.2"/><path d="M11.2 20.4h1.6"/>',
  leviathan:
    '<path d="M12 19.6a7.6 7.6 0 1 1 7.6-7.6 5.4 5.4 0 0 1-5.4 5.4 3.8 3.8 0 0 1-3.8-3.8 2.4 2.4 0 0 1 2.4-2.4 1.4 1.4 0 0 1 1.4 1.4"/><path d="M12 19.6c-1.6 0-2.6 1-2.6 1.8"/>',
  island:
    '<path d="M4.4 19.4a7.6 3.8 0 0 1 15.2 0z"/><path d="M12 15.6v-5"/><path d="M12 10.8c-2.6-.4-4 .8-4.6 2.4M12 10.8c2.6-.4 4 .8 4.6 2.4M12 10.8c-.6-1.8.2-3 1.4-3.6"/>',
};

// Path data only, so the canvas can stroke the same drawings with a Path2D.
const ENEMY_ICONS = {
  skiff: 'M4.6 15.4h11.2l-2.4 3.4H7zM10.2 15.4V6.4M10.2 7.4 15.6 13.4H10.2z',
  rammer: 'M3.4 13.2h7.8l3 2.6-2.8 3H6zM14.4 12.4 21 16l-6.6 3.2z',
  abyssSpawn:
    'M6 11.6a6 6 0 0 1 12 0c0 3.6-2.7 6-6 6s-6-2.4-6-6zM9.8 10.8a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zM14.2 10.8a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zM8.2 17.4c-.8 1.4-1.8 2.2-3 2.6M12 17.6V21M15.8 17.4c.8 1.4 1.8 2.2 3 2.6',
  glider: 'M3.2 9.4c3.6.6 6.4 2.2 8.8 4.8 2.4-2.6 5.2-4.2 8.8-4.8-1.2 4.4-4.4 7-8.8 7s-7.6-2.6-8.8-7z',
  bomber:
    'M12 6.4a3.2 3.2 0 0 1 3.2 3.2c0 2.6-1.5 3.8-1.5 6.4h-3.4c0-2.6-1.5-3.8-1.5-6.4A3.2 3.2 0 0 1 12 6.4zM12 6.2V3.8l2.2-1.4M8 15.4 5.4 17.2M16 15.4l2.6 1.8',
  stormRay:
    'M3.4 14.2c2.6 2.2 5.4 3.4 8.6 3.4s6-1.2 8.6-3.4c-1 3.8-4.2 6.2-8.6 6.2s-7.6-2.4-8.6-6.2zM13.4 2.8 9 8h3.2l-.8 3.6L16.4 5.8h-3.2z',
};

const GOAL_ICONS = {
  elder:
    '<path d="M4.4 16.6h15.2l1-8.2-4.6 3.2L12 5.8 7.9 11.6 3.4 8.4z"/><path d="M4.8 19.6h14.4"/>',
  population:
    '<path d="M9 5.6a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z"/><path d="M4.8 19.6v-1.6a4.2 4.2 0 0 1 8.4 0v1.6z"/><path d="M16.4 8a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z"/><path d="M18.4 19.6v-1.2a3.4 3.4 0 0 0-3.4-3.4"/>',
  expeditions: '<path d="M6.6 20.6V3.8"/><path d="M6.6 4.8 18.2 7.8 6.6 10.8z"/><path d="M4 20.6h5.2"/>',
  raids:
    '<path d="M4.4 20.6V9.4h2.8v2.4h2.6V9.4h2.8v2.4h2.6V9.4h2.8v11.2z"/><path d="M3 20.6h18"/>',
  enemies:
    '<path d="M4.8 4.8 16.4 16.4M19.2 4.8 7.6 16.4"/><path d="M7.2 18.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z"/><path d="M16.8 18.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z"/>',
  worlds:
    '<path d="M12 6.4a5.4 5.4 0 1 0 0 10.8 5.4 5.4 0 0 0 0-10.8z"/><path d="M18.4 3.4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/><path d="M4.4 17.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z"/>',
  allies:
    '<path d="M12 4.4a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z"/><path d="M5.4 16.2a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z"/><path d="M18.6 16.2a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z"/><path d="M12 9.2v5.2M10.6 14.2 6.8 16.6M13.4 14.2l3.8 2.4"/>',
  monuments:
    '<path d="M6 20.6h12"/><path d="M7.8 17.4h8.4"/><path d="M9.6 17.4 10.8 6.6h2.4l1.2 10.8z"/><path d="M10.8 6.6 12 3.4l1.2 3.2"/>',
};

const TERRAIN_ICONS = {
  grass:
    '<path d="M3.4 20.2h17.2"/><path d="M7.2 20c-.4-3.2.8-5.6 2.4-6.8"/><path d="M12 20c0-3.8 1.2-6.4 2.8-7.8"/><path d="M16.8 20c0-2.8.8-4.8 2-6"/>',
  fertile:
    '<path d="M3.4 20.4h17.2"/><path d="M12 20.4v-6.6"/><path d="M12 13.8c-3.4 0-5.2-1.8-5.2-4.4 3.2-.2 5.2 1.4 5.2 4.4z"/><path d="M12 13.8c3.4 0 5.2-1.8 5.2-4.4-3.2-.2-5.2 1.4-5.2 4.4z"/>',
  forest:
    '<path d="M7.6 8.4 4 14.6h7.2z"/><path d="M7.6 14.6v5.8"/><path d="M16.4 10.8 13.4 16h6z"/><path d="M16.4 16v4.4"/><path d="M3.2 20.6h17.6"/>',
  rock: '<path d="M4.8 18.2 6.6 9.6l5-2.4 6.4 3.2-1.2 7.8z"/><path d="M6.6 9.6 12 14.8l6-4.4"/><path d="M3.2 20.6h17.6"/>',
  spring:
    '<path d="M12 3.6c1.8 2.6 2.8 4.4 2.8 5.8a2.8 2.8 0 0 1-5.6 0c0-1.4 1-3.2 2.8-5.8z"/><path d="M3.2 15.6q2.8-2.4 5.6 0t5.6 0t5.6 0"/><path d="M3.2 19.8q2.8-2.4 5.6 0t5.6 0t5.6 0"/>',
  ridge:
    '<path d="M3.2 19.8 7.8 9.2l3.4 5.6 2.4-3.2 4.6 8.2z"/><path d="M2.8 20.4h18.4"/>',
};

const QUEST_ICONS = {
  building:
    '<path d="M4.8 5.8h14.4v13H4.8z"/><path d="M4.8 12.2h14.4M11.2 5.8v13"/><path d="M7.4 15.8h2.4"/>',
  population:
    '<circle cx="12" cy="6.4" r="2"/><path d="M8.4 17.8v-1.4a3.6 3.6 0 0 1 7.2 0v1.4"/><circle cx="5.4" cy="9.2" r="1.7"/><path d="M2.6 17.8v-1a3.2 3.2 0 0 1 3.2-2.8"/><circle cx="18.6" cy="9.2" r="1.7"/><path d="M21.4 17.8v-1a3.2 3.2 0 0 0-3.2-2.8"/>',
  tier: '<path d="M3.4 20.4h5.4v-5h5.2v-5h5.2V6"/><path d="M17.4 6.4V3.6M15.8 5.2 17.4 3.6 19 5.2"/>',
  expedition:
    '<circle cx="12" cy="12" r="8"/><path d="M15.6 8.4 13.6 13.6 8.4 15.6 10.4 10.4z"/>',
  victory:
    '<path d="M12 3.6 19 6.2v5.6c0 4.4-3 7.4-7 8.8-4-1.4-7-4.4-7-8.8V6.2z"/><path d="M8.8 12 11 14.2 15.4 9.8"/>',
};

const EVENT_ICONS = {
  gentleRain:
    '<path d="M7 13.2a3.6 3.6 0 0 1 0-7.2 4.6 4.6 0 0 1 8.8 1.2A3.1 3.1 0 0 1 17 13.2z"/><path d="M12 15c1.4 2 2.2 3.2 2.2 4.2a2.2 2.2 0 0 1-4.4 0c0-1 .8-2.2 2.2-4.2z"/>',
  shellCracks:
    '<path d="M4.6 17a7.4 6 0 0 1 14.8 0z"/><path d="M12.2 7.4 10.4 11l2.8 1.8-1.2 3.4"/>',
  driftingMerchants:
    '<path d="M12 4.8v14.6"/><path d="M6.6 7.4h10.8"/><path d="M4.2 13.4 6.6 7.4l2.4 6a3.2 3.2 0 0 1-4.8 0z"/><path d="M15 13.4 17.4 7.4l2.4 6a3.2 3.2 0 0 1-4.8 0z"/><path d="M8.6 19.4h6.8"/>',
  turtleDream:
    '<path d="M15 4.4a7.6 7.6 0 1 0 5.6 11.2A8.4 8.4 0 0 1 15 4.4z"/><path d="M7.8 6.2v2.8M6.4 7.6h2.8"/>',
  skyShadow:
    '<path d="M3.2 8.8c3.8 1 6.6 2.9 8.8 5.6 2.2-2.7 5-4.6 8.8-5.6-1.6 4.8-4.8 7.4-8.8 7.4s-7.2-2.6-8.8-7.4z"/>',
  lanternMigration:
    '<path d="M9.4 4.8h5.2M12 4.8V3.4"/><path d="M8.6 7.4h6.8l.8 7.4H7.8z"/><path d="M12 9c.9 1.2 1.4 2.1 1.4 2.8a1.4 1.4 0 0 1-2.8 0c0-.7.5-1.6 1.4-2.8z"/><path d="M9.4 14.8h5.2M12 14.8v2.6M8.6 18.6h6.8"/>',
  deepCurrent:
    '<path d="M3.2 9.4q2.8-2.6 5.6 0t5.6 0t5.6 0"/><path d="M3.2 14q2.8-2.6 5.6 0t5.6 0t5.6 0"/><path d="M3.2 18.6q2.8-2.6 5.6 0t5.6 0t5.6 0"/>',
  lostGlider:
    '<circle cx="12" cy="7.8" r="4.2"/><path d="M8.8 11.4 9.6 15.4M15.2 11.4 14.4 15.4"/><path d="M9.6 15.4h4.8v2.4H9.6z"/>',
  shellGarden:
    '<path d="M12 20.2V11"/><path d="M12 11c-2.8-.4-4.4-2-4.4-4.4 2.8.2 4.4 1.8 4.4 4.4z"/><path d="M12 11c2.8-.4 4.4-2 4.4-4.4-2.8.2-4.4 1.8-4.4 4.4z"/><path d="M9 20.2h6"/>',
  saltFestival:
    '<path d="M6.6 4.8h10.8l-1 6.2a4.4 4.4 0 0 1-8.8 0z"/><path d="M12 11v6.4"/><path d="M8.4 19.4h7.2"/>',
};

const COMBAT_ICONS = {
  victory:
    '<path d="M12 3.8 14 8.6l5.2.4-3.9 3.4 1.2 5.1-4.5-2.8-4.5 2.8 1.2-5.1L5.6 9l5.2-.4z"/>',
  defeat:
    '<path d="M6.4 12.6a6.4 4.6 0 0 1 11.2 0z"/><path d="M4 15.8q2.6-2 5.2 0t5.2 0t5.2 0"/><path d="M4 20q2.6-2 5.2 0t5.2 0t5.2 0"/>',
};

const CONTROL_ICONS = {
  play: '<path d="M8.6 5.4 19 12 8.6 18.6z"/>',
  pause: '<path d="M9.2 5.6v12.8M14.8 5.6v12.8"/>',
  save: '<path d="M12 3.6v9.8"/><path d="M8.4 9.8 12 13.4 15.6 9.8"/><path d="M4.6 16v4.4h14.8V16"/>',
  sound:
    '<path d="M4.4 9.4h3.4L12 5.8v12.4l-4.2-3.6H4.4z"/><path d="M15.4 9.2a4 4 0 0 1 0 5.6"/><path d="M18 6.8a7.4 7.4 0 0 1 0 10.4"/>',
  help:
    '<path d="M12 6.4c-2.4-1.6-5-2-7.6-1.6v12c2.6-.4 5.2 0 7.6 1.6 2.4-1.6 5-2 7.6-1.6v-12c-2.6-.4-5.2 0-7.6 1.6z"/><path d="M12 6.4v12"/>',
};

const FALLBACK = '<circle cx="12" cy="12" r="3.2"/>';

function svg(body) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
}

export function resourceIcon(resource) {
  return svg(RESOURCE_ICONS[resource] || FALLBACK);
}

export function buildingIcon(buildingId) {
  return svg(BUILDING_ICONS[buildingId] || FALLBACK);
}

export function expeditionIcon(expeditionId) {
  return svg(EXPEDITION_ICONS[expeditionId] || FALLBACK);
}

export function worldIcon(kind) {
  return svg(WORLD_ICONS[kind] || FALLBACK);
}

export function goalIcon(goalId) {
  return svg(GOAL_ICONS[goalId] || FALLBACK);
}

export function terrainIcon(terrainId) {
  return svg(TERRAIN_ICONS[terrainId] || FALLBACK);
}

export function questIcon(questType) {
  return svg(QUEST_ICONS[questType] || FALLBACK);
}

export function eventIcon(eventId) {
  return svg(EVENT_ICONS[eventId] || FALLBACK);
}

export function combatIcon(outcome) {
  return svg(COMBAT_ICONS[outcome] || FALLBACK);
}

export function controlIcon(name) {
  return svg(CONTROL_ICONS[name] || FALLBACK);
}

export function enemyIconPath(enemyId) {
  return ENEMY_ICONS[enemyId] || '';
}
