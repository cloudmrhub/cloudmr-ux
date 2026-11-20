/**
 * ROI label model (pure logic, no Niivue/React imports).
 *
 * Label space
 * -----------
 *  0        erase / background
 *  1..255   drawable ROI labels (one byte per voxel in Niivue's drawBitmap, so 255 is a hard cap)
 *  < 0      GROUP identifiers (-1, -2, ...). These are metadata only: they are never written
 *           into the bitmap. Voxels always keep their real label (1..255); a group simply
 *           makes its member labels render with one shared group colour (display-only remap
 *           applied through the 256-entry draw LUT).
 *
 * Palette
 * -------
 *  `colors` maps label -> "#rrggbb". Label 1 always exists and is the default colour. Every other
 *  label is added by the user (custom colour picker) or discovered in a loaded drawing.
 *  Labels with no explicit palette colour fall back to the base (ITK-SNAP) draw LUT.
 */

export const MAX_ROI_LABEL = 255;
export const DEFAULT_ROI_LABEL = 1;
export const DEFAULT_ROI_COLOR = "#ff0000";

/** Colours handed out to new groups (first unused one wins, then cycles). */
export const ROI_GROUP_COLORS = [
  "#e8dbc7",
  "#a1887f",
  "#90a4ae",
  "#ffcc80",
  "#b39ddb",
  "#80cbc4",
];

export function isGroupId(id) {
  return typeof id === "number" && id < 0;
}

export function isRoiLabel(id) {
  return Number.isInteger(id) && id >= 1 && id <= MAX_ROI_LABEL;
}

function clampByte(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/** Accepts "#abc", "abc", "#aabbcc", "aabbcc" (any case). Returns "#rrggbb" or null. */
export function normalizeHex(input) {
  if (typeof input !== "string") {
    return null;
  }
  let s = input.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(s)) {
    s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  }
  if (!/^[0-9a-f]{6}$/.test(s)) {
    return null;
  }
  return "#" + s;
}

export function hexToRgb(hex) {
  const n = normalizeHex(hex) || DEFAULT_ROI_COLOR;
  return [
    parseInt(n.slice(1, 3), 16),
    parseInt(n.slice(3, 5), 16),
    parseInt(n.slice(5, 7), 16),
  ];
}

export function rgbToHex(r, g, b) {
  const h = (v) => clampByte(v).toString(16).padStart(2, "0");
  return "#" + h(r) + h(g) + h(b);
}

export function createRoiLabelState() {
  return {
    colors: new Map([[DEFAULT_ROI_LABEL, DEFAULT_ROI_COLOR]]),
    /** @type {{ id: number, members: number[], color: string }[]} */
    groups: [],
  };
}

/** Palette entries sorted by label. */
export function getPalette(state) {
  return Array.from(state.colors.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([label, color]) => ({ label, color }));
}

/** Plain { label: "#rrggbb" } object (for persistence). */
export function getColorMap(state) {
  const out = {};
  // NOTE: the package builds to ES5 (no downlevelIteration), so never use for..of / spread on
  // Map or Set here; use forEach / Array.from instead.
  state.colors.forEach((color, label) => {
    out[label] = color;
  });
  return out;
}

/**
 * Remove a label's palette entry. The default colour (label 1) cannot be removed. Callers must
 * make sure no voxel still uses the label. Returns the removed colour, or null.
 */
export function removeLabelColor(state, label) {
  if (!isRoiLabel(label) || label === DEFAULT_ROI_LABEL || !state.colors.has(label)) {
    return null;
  }
  const color = state.colors.get(label);
  state.colors.delete(label);
  return color;
}

/** Back to just the default colour (label 1). Groups are left alone. */
export function resetPalette(state) {
  state.colors = new Map([[DEFAULT_ROI_LABEL, DEFAULT_ROI_COLOR]]);
}

/** Set (or overwrite) the colour for a label. Returns true if the state changed. */
export function setLabelColor(state, label, hex) {
  const n = normalizeHex(hex);
  if (!isRoiLabel(label) || !n) {
    return false;
  }
  if (state.colors.get(label) === n) {
    return false;
  }
  state.colors.set(label, n);
  return true;
}

/** Register a label (keeping its colour if it already has one). Returns true if added. */
export function registerLabel(state, label, fallbackHex) {
  if (!isRoiLabel(label) || state.colors.has(label)) {
    return false;
  }
  state.colors.set(label, normalizeHex(fallbackHex) || DEFAULT_ROI_COLOR);
  return true;
}

/** Lowest label in 1..255 that is neither in the palette nor in `extraUsed`. null when full. */
export function nextFreeLabel(state, extraUsed) {
  for (let l = 1; l <= MAX_ROI_LABEL; l++) {
    if (state.colors.has(l)) {
      continue;
    }
    if (extraUsed && extraUsed.has(l)) {
      continue;
    }
    return l;
  }
  return null;
}

export function findLabelByColor(state, hex) {
  const n = normalizeHex(hex);
  if (!n) {
    return null;
  }
  const entries = Array.from(state.colors.entries());
  for (let i = 0; i < entries.length; i++) {
    if (entries[i][1] === n) {
      return entries[i][0];
    }
  }
  return null;
}

export function getGroup(state, id) {
  return state.groups.find((g) => g.id === id) || null;
}

export function groupOfLabel(state, label) {
  return state.groups.find((g) => g.members.indexOf(label) >= 0) || null;
}

/** Labels that are currently members of any group. */
export function groupedLabelSet(state) {
  const s = new Set();
  for (const g of state.groups) {
    for (const m of g.members) {
      s.add(m);
    }
  }
  return s;
}

/**
 * Expand a mixed list of label ids (positive labels and negative group ids) into the
 * distinct positive voxel labels they stand for.
 */
export function expandToLabels(state, ids) {
  const out = new Set();
  for (const id of ids || []) {
    if (isGroupId(id)) {
      const g = getGroup(state, id);
      if (g) {
        for (const m of g.members) {
          out.add(m);
        }
      }
    } else if (id > 0) {
      out.add(id);
    }
  }
  return out;
}

function nextGroupId(state) {
  const used = new Set(state.groups.map((g) => Math.abs(g.id)));
  let n = 1;
  while (used.has(n)) {
    n++;
  }
  return -n;
}

function nextGroupColor(state) {
  const used = new Set(state.groups.map((g) => g.color));
  for (const c of ROI_GROUP_COLORS) {
    if (!used.has(c)) {
      return c;
    }
  }
  return ROI_GROUP_COLORS[state.groups.length % ROI_GROUP_COLORS.length];
}

/** Detach a label from every group except `keepGroup` (no pruning; caller prunes). */
function detachLabelFromGroups(state, label, keepGroup) {
  for (const g of state.groups) {
    if (g === keepGroup) {
      continue;
    }
    const i = g.members.indexOf(label);
    if (i >= 0) {
      g.members.splice(i, 1);
    }
  }
}

/**
 * Group the selected items. `ids` may mix labels (>0) and existing group ids (<0).
 *  - Selection contains group(s): everything is merged into the oldest selected group
 *    (smallest |id|); other selected groups disappear.
 *  - Otherwise a brand-new group is created with the next free negative id.
 * Needs at least 2 distinct items. Returns the resulting group, or null if nothing happened.
 */
export function groupItems(state, ids) {
  const items = new Set();
  for (const id of ids || []) {
    if (isGroupId(id)) {
      if (getGroup(state, id)) {
        items.add(id);
      }
    } else if (isRoiLabel(id)) {
      items.add(id);
    }
  }
  if (items.size < 2) {
    return null;
  }
  const selectedGroups = Array.from(items)
    .filter(isGroupId)
    .map((id) => getGroup(state, id))
    .sort((a, b) => Math.abs(a.id) - Math.abs(b.id));
  const labels = Array.from(items).filter((i) => i > 0);

  let target;
  if (selectedGroups.length > 0) {
    target = selectedGroups[0];
    for (let k = 1; k < selectedGroups.length; k++) {
      for (const m of selectedGroups[k].members) {
        if (target.members.indexOf(m) < 0) {
          target.members.push(m);
        }
      }
    }
    const absorbed = new Set(selectedGroups.slice(1).map((g) => g.id));
    state.groups = state.groups.filter((g) => !absorbed.has(g.id));
  } else {
    target = { id: nextGroupId(state), members: [], color: nextGroupColor(state) };
    state.groups.push(target);
  }
  for (const l of labels) {
    detachLabelFromGroups(state, l, target); // a label belongs to at most one group
    if (target.members.indexOf(l) < 0) {
      target.members.push(l);
    }
  }
  target.members.sort((a, b) => a - b);
  state.groups = state.groups.filter((g) => g.members.length > 0);
  return target;
}

/**
 * Dissolve groups. `ids` = group ids to dissolve; omitted/null = all groups.
 * Returns the removed groups (so callers can restore per-label state).
 */
export function ungroupItems(state, ids) {
  let removed;
  if (!ids) {
    removed = state.groups;
    state.groups = [];
  } else {
    const kill = new Set(ids.filter(isGroupId));
    removed = state.groups.filter((g) => kill.has(g.id));
    state.groups = state.groups.filter((g) => !kill.has(g.id));
  }
  return removed;
}

export function clearGroups(state) {
  state.groups = [];
}

/** Remove deleted labels from groups (dropping groups that become empty). */
export function pruneLabelsFromGroups(state, labelSet) {
  for (const g of state.groups) {
    g.members = g.members.filter((m) => !labelSet.has(m));
  }
  state.groups = state.groups.filter((g) => g.members.length > 0);
}

/** Rename `source` to `target` inside group membership (relabel). */
export function relabelInGroups(state, source, target) {
  for (const g of state.groups) {
    const i = g.members.indexOf(source);
    if (i < 0) {
      continue;
    }
    g.members.splice(i, 1);
    if (target > 0 && g.members.indexOf(target) < 0) {
      g.members.push(target);
    }
  }
  state.groups = state.groups.filter((g) => g.members.length > 0);
}

/**
 * Colour a label is drawn with: group colour if it is grouped, otherwise its palette colour,
 * otherwise the base-LUT colour (`baseLut`: 256*4 RGBA bytes, optional).
 */
export function resolveLabelColor(state, label, baseLut) {
  if (isGroupId(label)) {
    const g = getGroup(state, label);
    return g ? g.color : DEFAULT_ROI_COLOR;
  }
  const g = groupOfLabel(state, label);
  if (g) {
    return g.color;
  }
  return getBaseColor(state, label, baseLut);
}

/** Colour without group remap (what the label looks like when ungrouped). */
export function getBaseColor(state, label, baseLut) {
  const c = state.colors.get(label);
  if (c) {
    return c;
  }
  if (baseLut && label >= 0 && label <= MAX_ROI_LABEL) {
    return rgbToHex(baseLut[label * 4], baseLut[label * 4 + 1], baseLut[label * 4 + 2]);
  }
  return DEFAULT_ROI_COLOR;
}

/**
 * Build the 256*4 RGBA draw LUT: start from `baseLut`, apply palette colours, then apply the
 * group display remap. Alpha of label 0 stays transparent; every other entry is opaque.
 */
export function buildDrawLut(state, baseLut) {
  const lut = new Uint8ClampedArray(256 * 4);
  if (baseLut && baseLut.length >= 256 * 4) {
    lut.set(baseLut.subarray ? baseLut.subarray(0, 256 * 4) : baseLut.slice(0, 256 * 4));
  }
  state.colors.forEach((hex, label) => {
    const [r, g, b] = hexToRgb(hex);
    lut[label * 4] = r;
    lut[label * 4 + 1] = g;
    lut[label * 4 + 2] = b;
    lut[label * 4 + 3] = 255;
  });
  for (const grp of state.groups) {
    const [r, g, b] = hexToRgb(grp.color);
    for (const m of grp.members) {
      if (!isRoiLabel(m)) {
        continue;
      }
      lut[m * 4] = r;
      lut[m * 4 + 1] = g;
      lut[m * 4 + 2] = b;
      lut[m * 4 + 3] = 255;
    }
  }
  // Labels 1..255 must always be opaque; 0 (erase / background) must stay transparent.
  for (let l = 1; l <= MAX_ROI_LABEL; l++) {
    lut[l * 4 + 3] = 255;
  }
  lut[3] = 0;
  return lut;
}
