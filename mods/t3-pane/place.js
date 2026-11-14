// Where a space is now, as t3-spaces has it: its first terminal's live folder, else where it was made.
// `ps`: panes(), read once by the caller (each read copies every pane).
export function placeOf(s, ps) {
  const tabs = new Set((s.tabs ?? []).map((c) => c.id));
  return ps?.find((p) => tabs.has(p.tab) && p.cwd)?.cwd || s.folder;
}
