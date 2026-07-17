export interface TradeJobType {
  id: string;
  label: string;
  icon: string;
}

export interface Trade {
  id: string;
  label: string;
  emoji: string;
  jobTypes: TradeJobType[];
  defaultLabourRate: number;
  promptContext: string;
  typicalItems: string;
  defaultFooter: string;
  measurementsPlaceholder: string;
}

export const TRADES: Trade[] = [
  {
    id: "electrician",
    label: "Electrician",
    emoji: "⚡",
    defaultLabourRate: 55,
    jobTypes: [
      { id: "rewire", label: "Full Rewire", icon: "zap" },
      { id: "consumer-unit", label: "Consumer Unit", icon: "shield" },
      { id: "sockets-switches", label: "Sockets & Switches", icon: "square" },
      { id: "lighting", label: "Lighting", icon: "sun" },
      { id: "ev-charger", label: "EV Charger", icon: "battery-charging" },
      { id: "eicr", label: "EICR / Testing", icon: "clipboard" },
      { id: "fault-finding", label: "Fault Finding", icon: "search" },
      { id: "smoke-alarms", label: "Smoke Alarms", icon: "bell" },
      { id: "other", label: "Other", icon: "tool" },
    ],
    promptContext: "UK electrician. All work must comply with BS 7671 (18th Edition Wiring Regulations) and Part P of the UK Building Regulations. Include testing & certification (EIC or Minor Works) and notification to Building Control where required.",
    typicalItems: "labour, cable (2.5mm² T&E, 6mm² T&E, 6242Y), accessories (sockets, switches, back boxes), consumer unit components (RCBOs, MCBs), testing & certification (EIC or Minor Works), Part P notification",
    defaultFooter: "All work carried out in compliance with BS 7671 (18th Edition) and Part P of the Building Regulations. A certificate of compliance will be issued on completion.",
    measurementsPlaceholder: "e.g. 8 double sockets, 12m cable run, 3 light fittings, 1 consumer unit, 2-gang dimmer switch...",
  },
  {
    id: "plumber",
    label: "Plumbing / Heating",
    emoji: "🔧",
    defaultLabourRate: 50,
    jobTypes: [
      { id: "bathroom-fit", label: "Bathroom Fit", icon: "droplet" },
      { id: "boiler-install", label: "Boiler Install", icon: "thermometer" },
      { id: "leak-repair", label: "Leak Repair", icon: "alert-triangle" },
      { id: "radiators", label: "Radiators", icon: "wind" },
      { id: "pipework", label: "Pipework", icon: "git-commit" },
      { id: "unvented-cylinder", label: "Unvented Cylinder", icon: "server" },
      { id: "drain-clearing", label: "Drain Clearing", icon: "filter" },
      { id: "other", label: "Other", icon: "tool" },
    ],
    promptContext: "UK plumber. All work must comply with the Water Supply (Water Fittings) Regulations 1999 and Building Regulations Part G. Include pressure testing and sign-off documentation where required.",
    typicalItems: "labour, copper/plastic pipe, compression fittings, push-fit fittings, isolating valves, taps, sanitaryware, silicone sealant, PTFE tape",
    defaultFooter: "All plumbing work carried out in compliance with the Water Supply (Water Fittings) Regulations 1999 and Building Regulations Part G.",
    measurementsPlaceholder: "e.g. 15m copper pipe, 2 radiators, 1 bathroom suite, 4 isolating valves, 3 compression fittings...",
  },
  {
    id: "gas-engineer",
    label: "Gas Engineer",
    emoji: "🔥",
    defaultLabourRate: 65,
    jobTypes: [
      { id: "boiler-service", label: "Boiler Service", icon: "settings" },
      { id: "boiler-install", label: "Boiler Install", icon: "thermometer" },
      { id: "gas-safety-check", label: "Gas Safety Check", icon: "shield" },
      { id: "landlord-certificate", label: "Landlord Certificate", icon: "file-text" },
      { id: "gas-leak", label: "Gas Leak Repair", icon: "alert-triangle" },
      { id: "flue-work", label: "Flue Work", icon: "wind" },
      { id: "other", label: "Other", icon: "tool" },
    ],
    promptContext: "UK Gas Safe registered engineer. All work must comply with the Gas Safety (Installation and Use) Regulations 1998 and relevant British Standards. Include Gas Safe registration number and CP12 certificate where applicable.",
    typicalItems: "labour, boiler parts, flue components, gas pipe, compression fittings, gas safety devices, landlord gas safety certificate (CP12), commissioning report",
    defaultFooter: "All gas work carried out by a Gas Safe registered engineer in compliance with the Gas Safety (Installation and Use) Regulations 1998. Gas Safe registration available on request.",
    measurementsPlaceholder: "e.g. 1 combi boiler (35kW), 2m flue run, 5 radiator valves, 1 thermostat, 1 CP12 certificate...",
  },
  {
    id: "builder",
    label: "Builder",
    emoji: "🏗️",
    defaultLabourRate: 45,
    jobTypes: [
      { id: "extension", label: "Extension", icon: "maximize" },
      { id: "loft-conversion", label: "Loft Conversion", icon: "triangle" },
      { id: "brickwork", label: "Brickwork / Pointing", icon: "square" },
      { id: "structural-repairs", label: "Structural Repairs", icon: "alert-circle" },
      { id: "groundwork", label: "Groundwork / Foundation", icon: "layers" },
      { id: "demolition", label: "Demolition", icon: "trash-2" },
      { id: "other", label: "Other", icon: "tool" },
    ],
    promptContext: "UK building contractor. Work may require Building Regulations approval and/or planning permission. Comply with relevant British Standards and local authority requirements. Note any notifiable works.",
    typicalItems: "labour, bricks/blocks, cement, sand, aggregate, timber, steel lintels, insulation, DPC membrane, concrete mix, fixings",
    defaultFooter: "All building work carried out in compliance with the relevant Building Regulations. Notifiable structural work will be submitted to the local Building Control authority.",
    measurementsPlaceholder: "e.g. 20m² extension floor area, 6m wall run, 3 lintels, 15m² insulation, 50 blocks, 2 skips...",
  },
  {
    id: "painter-decorator",
    label: "Painter & Decorator",
    emoji: "🎨",
    defaultLabourRate: 35,
    jobTypes: [
      { id: "interior-painting", label: "Interior Painting", icon: "edit-3" },
      { id: "exterior-painting", label: "Exterior Painting", icon: "sun" },
      { id: "wallpapering", label: "Wallpapering", icon: "layout" },
      { id: "rendering", label: "Rendering / Skimming", icon: "box" },
      { id: "coving", label: "Coving & Cornices", icon: "crop" },
      { id: "other", label: "Other", icon: "tool" },
    ],
    promptContext: "UK painter and decorator. Provide a professional quote covering preparation, priming, materials, and application. Measure areas in m² where applicable.",
    typicalItems: "labour, emulsion paint, gloss/satin paint, primer/undercoat, filler, sandpaper, masking tape, wallpaper, paste, dust sheets, brushes/rollers",
    defaultFooter: "All surfaces properly prepared before work commences. Two coats applied as standard unless otherwise stated. Client to approve colour/finish before painting begins.",
    measurementsPlaceholder: "e.g. 45m² walls, 12m² ceiling, 3 doors, 14m skirting, 2 coats emulsion, 1 coat gloss...",
  },
  {
    id: "carpenter",
    label: "Joinery / Carpentry",
    emoji: "🪚",
    defaultLabourRate: 42,
    jobTypes: [
      { id: "door-fitting", label: "Door Fitting", icon: "square" },
      { id: "flooring", label: "Flooring", icon: "grid" },
      { id: "kitchen-fitting", label: "Kitchen Fitting", icon: "home" },
      { id: "decking", label: "Decking / Fencing", icon: "wind" },
      { id: "bespoke-joinery", label: "Bespoke Joinery", icon: "tool" },
      { id: "roofing-timbers", label: "Roofing Timbers", icon: "triangle" },
      { id: "other", label: "Other", icon: "tool" },
    ],
    promptContext: "UK carpenter and joiner. Provide a professional quote for carpentry and joinery work including materials and skilled labour. Reference BS 8213-4 for door installation where applicable.",
    typicalItems: "labour, timber (softwood/hardwood), plywood, MDF, fixings (screws/nails/bolts), wood adhesive, door furniture (hinges, handles, locks), flooring boards, wood finish",
    defaultFooter: "All carpentry work carried out using quality materials to BS standards. Work guaranteed for 12 months against defects in workmanship.",
    measurementsPlaceholder: "e.g. 3 internal doors, 25m² engineered flooring, 14m skirting board, 2 window boards, 4 shelves...",
  },
  {
    id: "plasterer",
    label: "Plasterer",
    emoji: "🧱",
    defaultLabourRate: 40,
    jobTypes: [
      { id: "full-plaster", label: "Full Room Plaster", icon: "square" },
      { id: "skim-coat", label: "Skim Coat", icon: "layers" },
      { id: "patch-repair", label: "Patch Repair", icon: "edit" },
      { id: "dry-lining", label: "Dry Lining / Dot & Dab", icon: "box" },
      { id: "rendering", label: "External Render", icon: "home" },
      { id: "other", label: "Other", icon: "tool" },
    ],
    promptContext: "UK plasterer. Provide a professional plastering quote. Measure areas in m² and specify number of coats. Include drying/curing times in the job notes.",
    typicalItems: "labour, bonding coat, finishing plaster, hardwall, beading (angle bead, stop bead), PVA bonding agent, render mix, mesh tape",
    defaultFooter: "All plastering carried out by a skilled tradesperson. Allow 24-48 hours drying time per coat before decoration. Surfaces should not be painted until fully dry.",
    measurementsPlaceholder: "e.g. 30m² skim coat, 8m² bonding + skim, 6m angle bead, 2 patch repairs (0.5m² each)...",
  },
  {
    id: "roofer",
    label: "Roofer",
    emoji: "🏠",
    defaultLabourRate: 52,
    jobTypes: [
      { id: "re-roof", label: "Re-Roof", icon: "triangle" },
      { id: "tile-repair", label: "Tile / Slate Repair", icon: "grid" },
      { id: "flat-roof", label: "Flat Roof", icon: "minus" },
      { id: "guttering", label: "Guttering & Fascias", icon: "droplet" },
      { id: "chimney", label: "Chimney & Flashing", icon: "thermometer" },
      { id: "velux", label: "Velux / Skylights", icon: "sun" },
      { id: "other", label: "Other", icon: "tool" },
    ],
    promptContext: "UK roofer. Provide a professional roofing quote. Include scaffolding or access equipment costs where required. Reference BS 5534 for slating and tiling work.",
    typicalItems: "labour, tiles/slates, roofing felt/membrane, battens, lead flashing, ridge tiles, hip tiles, valley tiles, fixings, guttering, fascia board, scaffolding hire",
    defaultFooter: "All roofing work carried out to manufacturer specifications and BS 5534. Appropriate access equipment used. Any existing lead flashings will be checked and repointed as required.",
    measurementsPlaceholder: "e.g. 60m² re-roof, 45 ridge tiles, 3m lead flashing, 2 Velux frames, 20m guttering, scaffolding...",
  },
  {
    id: "landscaper",
    label: "Gardening / Landscaping",
    emoji: "🌿",
    defaultLabourRate: 35,
    jobTypes: [
      { id: "patio", label: "Patio / Paving", icon: "grid" },
      { id: "decking", label: "Decking", icon: "layers" },
      { id: "fencing", label: "Fencing", icon: "minus" },
      { id: "lawn-turf", label: "Lawn / Turfing", icon: "sun" },
      { id: "driveway", label: "Driveway", icon: "map" },
      { id: "planting", label: "Planting & Garden Design", icon: "feather" },
      { id: "other", label: "Other", icon: "tool" },
    ],
    promptContext: "UK landscaper and groundworker. Provide a professional landscaping quote. Measure areas in m² where applicable. Include waste removal/skip hire if required.",
    typicalItems: "labour, paving slabs/sets, sub-base material (MOT Type 1), sharp sand, cement, turf, topsoil, timber for decking/fencing, fence posts, concrete mix, skip hire",
    defaultFooter: "All landscaping work completed to a high standard using quality materials. Site left clean and tidy on completion. Garden waste removed as part of the works unless stated otherwise.",
    measurementsPlaceholder: "e.g. 40m² patio, 15m fencing (6ft panels), 20m² turf, 3 tonnes sub-base, 2 tonnes sand, 1 skip...",
  },
];

export function getTradeById(id: string): Trade | undefined {
  return TRADES.find((t) => t.id === id);
}

export function getDefaultTrade(): Trade {
  return TRADES[0];
}
