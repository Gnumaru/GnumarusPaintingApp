# FORBIDEN KEYBOARD SHORTCUTS

Shortcuts this application must NOT use as factory defaults, because major
browsers (Chrome, Edge, Opera, Brave, Vivaldi, Firefox, Safari) or operating
systems reserve them. "Reserved" means the key event never reaches the page
at all (HARD), or the browser always acts on it too, so the page and the
browser fight over the same chord (SOFT / double action).

Rule: factory defaults must avoid every HARD combination below on all six
browsers, and avoid SOFT combinations wherever a safe alternative exists.
The Shortcuts editor still lets users map anything (their risk); conflicts
between our own actions keep being flagged and auto-disabled by the editor.

Legend:
- HARD — the page never receives the key event in a normal tab. No
  `preventDefault()` workaround exists (fullscreen Keyboard Lock and
  installed-app windows are out of scope for this app).
- SOFT — the page generally receives the event and `preventDefault()` wins,
  but the browser owns the same chord somewhere (another platform, a panel,
  devtools), so it can double-fire or break per browser/version/locale.
- OS — reserved by the operating system / window manager, above every
  browser. Never bind these.

Modifier notes for this codebase: our `Ctrl` also matches `Cmd` on macOS
(see `shortcutMatchesEvent`), so every `Ctrl+X` below also means `Cmd+X` on
Mac. `Space` is tracked as a held key. Mouse-only bindings are unaffected.

## 1. Chromium core: Chrome, Edge, Opera, Brave, Vivaldi

HARD — never dispatched to page content in a tab (stated as intentional by
Chromium engineers, no plans to allow it; issues 41081444, 40177511):
- `Ctrl+N`, `Ctrl+Shift+N` (new window / incognito)
- `Ctrl+T`, `Ctrl+Shift+T` (new tab / reopen tab)
- `Ctrl+W`, `Ctrl+Shift+W` (close tab / window)
- `Ctrl+Tab`, `Ctrl+Shift+Tab` (next / previous tab)
- `Ctrl+Shift+Q` (quit)
- `Ctrl+F4` (close tab, Windows)

Per-browser extras on top of the Chromium core:
- Edge: `Ctrl+Shift+P` (system print dialog), `Ctrl+Shift+O` (favorites),
  `Ctrl+Shift+E` (sidebar search), `Ctrl+Shift+K` (duplicate tab),
  `Ctrl+Shift+X` (web select), `Ctrl+Shift+Y` (collections),
  `Ctrl+Shift+S` (web capture), `Alt+Shift+B` (favorites bar focus).
- Opera: `Ctrl+Shift+X` (quit Opera), `Ctrl+Shift+S` (sidebar),
  `Ctrl+Shift+M` (messenger), `Ctrl+Shift+C` (snapshot), `Ctrl+Shift+O`
  (bookmarks), `F1` (help). Advanced single-key mode adds unmodified keys
  (`Z`/`X` navigation, `1`/`2` tab switching) but is opt-in.
- Brave: same core as Chrome (verified against the official list); its
  extras (Shields, Rewards, Wallet, Leo) have no default letter chords
  that collide with ours.
- Vivaldi: same core, plus its own layer — `F2` (Quick Commands),
  `Ctrl+E` (Quick Commands / search), `Ctrl+K` (focus search field),
  `Ctrl+O` (open file), `Ctrl+Alt+N` (notes panel), `Ctrl+Alt+C` (copy to
  note), `Ctrl+Alt+E` (extensions), `Ctrl+Alt+Up/Down` (panel switching),
  `Ctrl+Q` (quit), `Ctrl+Shift+S` (page actions). Vivaldi bindings are
  user-remappable, so treat these as SOFT (double-action risk), except the
  Chromium core set above, which stays HARD.

Sources: Chromium docs on reserved accelerators and keyboard lock
(`docs/ui/learn/keyboard_shortcuts.md`, issues 41081444 and 40177511);
Microsoft Edge, Opera and Brave official shortcut lists; Vivaldi help
(Quick Commands) and cheat sheet.

## 2. Firefox

HARD (`reserved="true"` in `browser/base/content/browser-sets.inc`: the key
event is never dispatched to web content):
- `Ctrl+N` (new window), `Ctrl+T` (new tab), `Ctrl+W` (close tab) — and, in
  practice, their `Shift` variants (`Ctrl+Shift+N/T/W`)
- `Ctrl+Shift+P` (private browsing)
- `Ctrl+Shift+Q` on Windows/Linux (quit; on macOS `Cmd+Q` is handled by an
  OS quirk path instead)
- `Ctrl+Shift+W` (close window)

Delivered (safe to bind; Firefox may also act on some, but pages are
expected to override them — document editors rely on this):
- `Ctrl+S/O/F/G/J/H/L/R/D` (save/open/find/go/history/downloads/address/
  reload/bookmark), `Ctrl+K/E` (search), `Ctrl+P` (print),
  `Ctrl+Z/Y/X/C/V/A` (editing), `Ctrl+arrows`, `Alt+Left/Right` (history),
  function keys except help.

Caveat: double actions happen (bug 1203059) — Firefox can both run its
binding and deliver the event. Reserving the HARD set above is what
Mozilla itself enforces; everything else is fair game for pages.

Sources: Mozilla `browser-sets.inc` (`reserved` attributes), bugs 1052569 /
1203059 / 380637, SUMO "override keyboard shortcuts" threads.

## 3. Safari / WebKit (macOS; our `Ctrl` bindings arrive as `Cmd`)

HARD (not dispatched to web content):
- `Cmd+N`, `Cmd+Shift+N`, `Cmd+T`, `Cmd+Shift+T`, `Cmd+W`, `Cmd+Shift+W`
- `Cmd+Q` (quit), `Cmd+R` (reload), `Cmd+L` (address field),
  `Cmd+O` (open file), `Cmd+E` (find selection), `Cmd+,` (settings),
  `Cmd+H` / `Cmd+M` (hide / minimize), `Cmd+Shift+R` (reader),
  `Cmd+Option+I/J/C/U` (developer tools), `Ctrl+Tab` / `Ctrl+Shift+Tab`
  (tab switching)

Delivered (safe): `Cmd+S/P/F/G/D/A/Z/X/C/V`, `Cmd+1..9`, `Cmd+[/]`
(history — delivered), `Cmd+0/plus/minus` (zoom).

Sources: Apple Support "Keyboard shortcuts in Safari", WebKit/Safari
override research (Safari blocks Cmd+R/L/O and tab/window keys).

## 4. OS level (above every browser — never bind)

- Windows: `Win+*` (any), `Ctrl+Esc`, `Alt+Tab`, `Alt+F4`, `Alt+Space`,
  `Ctrl+Alt+Del`, `Ctrl+Shift+Esc`. Caveat: `Shift+Alt` switches keyboard
  layout on multi-language setups, and `Ctrl+Shift` may do the same —
  avoid both as the sole modifiers for typing-adjacent actions.
- macOS: `Cmd+Tab`, `Cmd+Space`, `Cmd+Q/H/M`, `Cmd+Option+Esc`,
  `Ctrl+Up/Down` and `Ctrl+F2/F3` (Mission Control / accessibility),
  `Fn` keys.
- Linux / GNOME: `Super` (any), `Ctrl+Alt+T` (terminal),
  `Ctrl+Alt+arrows` (workspace switching — note: our layer expand
  `Ctrl+Alt+Arrow` collides here and is a known OS-level conflict),
  `Alt+F1..F4`, `Print`, `Ctrl+Alt+Del`.

## 5. Audit of this app's factory defaults (2026-11-24)

Replaced (were HARD or SOFT-conflicting on at least one target browser):
- `file-new` was `Ctrl+N` → now `Ctrl+Alt+N`. `Ctrl+N` never reaches the
  page in Chromium browsers, is reserved in Firefox and Safari, and also
  steals `Cmd+N` on macOS through our Ctrl/Cmd parity.
- `file-open` was `Ctrl+O` → now `Ctrl+Alt+O`. `Ctrl+O` is hard-reserved
  in Safari, swallowed-or-doubled in Vivaldi, and was reported blocked by
  our own testing.
- `edit-quick-search` was `Ctrl+Shift+P` → now `Ctrl+K`. `Ctrl+Shift+P`
  never reaches the page in Firefox (private browsing) and opens the
  system print dialog in Edge; `Ctrl+K` is delivered everywhere
  (Linear/VS Code precedent) and was free in every preset.

Deliberately kept (delivered by all six target browsers; standard web-app
keys with `preventDefault()` winning where a browser shares the chord):
- `Ctrl+S` (save), `Ctrl+Z`/`Ctrl+Y` (undo/redo), `Ctrl+X`/`Ctrl+C`/`Ctrl+V`
  (cut/copy/paste), `Ctrl+A` (select all — used by canvas tools, never as
  an action shortcut).
- `Ctrl+Shift+C` (copy merged): SOFT — Chromium/Firefox open the element
  inspector on this chord, but the page receives the event first, so our
  `preventDefault()` wins. Kept because remapping would break muscle
  memory in every locale; still remappable in the editor.
- `Ctrl+E` (merge layer down): SOFT — address-bar search in Chrome/Edge
  and Quick Commands in Vivaldi, but dispatched everywhere (Google Docs
  precedent). Kept; remappable.
- `Ctrl+arrows` (layer/frame create/move), `Alt+arrows` (nest in/out):
  delivered by all desktop browsers (Safari reserves `Opt+arrows` only
  inside text fields, where our shortcuts are suppressed anyway).
- `Ctrl+Alt+=` / `Ctrl+Alt+-` (zoom): no browser binds these.
- Plain letters/digits/arrows/Tab/Enter/Esc/Delete/Insert/F-keys: no
  browser reserves single keys (`F1` help and `F11` fullscreen stay
  deliberately unbound). `Tab` focus navigation is overridden
  intentionally, as in every canvas app.
- View/loupe modifiers (`Ctrl`, `Ctrl+Space`, wheel, drags): modifier-only
  gestures are never browser-reserved.

Presets: the 11 program presets only override tool letters (plus redo and
zoom variants), so none of them can produce a forbidden chord — and the
preset builder explicitly avoids every factory conflict key. If a future
preset ever collides with this list, the Shortcuts editor flags it as a
conflict and auto-disables it.

Policy for new bindings: prefer unmodified keys for tools, `Ctrl+letter`
only for universally delivered editing actions, and `Ctrl+Alt+letter` for
new File-level actions. Never introduce `Ctrl+N/T/W`, `Ctrl+Tab`,
`Ctrl+Shift+N/T/W/Q/P`, `Ctrl+F4`, `Cmd+Q/W/T/R/L/O/E` equivalents, or
OS-level chords. When in doubt, bind nothing (NONE) rather than a
potentially reserved chord — every action also runs from the palette.
