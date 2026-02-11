# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

Legend in the Mist is a Foundry Virtual Tabletop (v13 minimum, v14 verified) system for a rustic fantasy RPG based on the Mist Engine. The system id is `litm`.

## Commands

- `node check-keys.js` — find missing localization keys across language files
- `node diff.js` — diff localization keys between language files
- E2E tests: `cd tests/e2e && npx playwright test`

## Architecture

### Entry Point (`litm.js`)

Runs in the `init` Foundry hook. Responsibilities in order:

1. Registers custom HTML elements (`SuperCheckbox`)
2. Sets `CONFIG.Actor.dataModels`, `CONFIG.Item.dataModels`, `CONFIG.ActiveEffect.dataModels`
3. Registers `CONFIG.Dice.terms` and `CONFIG.Dice.rolls` for the custom `DoubleSix` (d6) denomination
4. Unregisters core Foundry sheets and registers all system sheets
5. Calls `HandlebarsHelpers.register()`, `HandlebarsPartials.register()`, `Fonts.register()`, `KeyBindings.register()`, `LitmSettings.register()`, `LitmHooks.register()`
6. Exposes `game.litm` with references to apps, roll state, and methods

Separate hooks handle deferred registration:
- **`i18nInit`**: `Enrichers.register()` (needs localized strings)
- **`ready`**: `Sockets.registerListeners()` (needs game world + socket)

`CONFIG.litm` is set to a `LitmConfig` instance (`scripts/system/config.js`) during init. It holds asset paths, roll config, tag regex, and other runtime settings.

### ApplicationV2 Pattern

All apps and sheets use Foundry's **ApplicationV2 API** (not the deprecated AppV1):

- Actor sheets extend `LitmActorSheet` (`scripts/sheets/base-actor-sheet.js`), which extends `HandlebarsApplicationMixin(ActorSheetV2)`
- Item sheets extend `LitmItemSheet` (`scripts/sheets/base-item-sheet.js`)
- Standalone apps extend `HandlebarsApplicationMixin(ApplicationV2)` directly
- Each actor type also has a **landscape sheet variant** (e.g., `HeroSheetLandscape`) registered as a non-default alternative, defined in `scripts/sheets/landscape-sheets.js`

`LitmActorSheet` adds a `MODES` enum (`PLAY = 0`, `EDIT = 1`) and a `_mode` property. Sheets toggle between play and edit templates by overriding `_getEditModeTemplate()` and `_configureRenderParts()`.

`LitmActorSheet._updateEmbeddedFromForm(submitData)` parses `items.*` and `effects.*` keys from form data and performs embedded document updates. Used by hero and challenge sheet submit handlers.

Action handlers are **private static methods** on sheet classes (e.g., `HeroSheet.#onOpenRollDialog`), referenced by string key in `DEFAULT_OPTIONS.actions`. Despite being declared `static`, ApplicationV2 binds `this` to the **sheet instance** when calling them — so `this.document`, `this.actor`, etc. all work as expected inside these methods.

### Data Models

All data models extend `foundry.abstract.TypeDataModel` and define schemas using `foundry.data.fields`. The shared `TagData` embedded model (used in themes) is accessed via `game.litm.data.TagData` after init.

Actor types: `hero`, `journey`, `challenge`, `fellowship`
Item types: `theme`, `themebook`, `trope`, `backpack`, `story_theme`, `vignette`
ActiveEffect types: `story_tag`, `status_card`

### Template Paths

All Handlebars template paths are prefixed with `systems/litm/`:

```javascript
// Correct
template: "systems/litm/templates/actor/hero.html"
// In HTML partials
{{> "systems/litm/templates/partials/play-tag.html"}}
```

### Sockets & Multiplayer

`dispatch(data)` in `scripts/utils.js` emits on `"system.litm"`. Listeners are registered in `scripts/system/sockets.js` via `Sockets.registerListeners()`.

### Roll System

`LitmRollDialog` (ApplicationV2) collects tag selections and power. It calls `LitmRoll` (extends `Roll`), which uses the custom `DoubleSix` dice term (denomination `"ds"`). Roll formula and resolver can be overridden on `CONFIG.litm.roll`.

Roll dialog presence is tracked via actor flags (`actor.getFlag("litm", "rollDialogOwner")`) and displayed in the HUD overlay (`#litm-roll-dialog-hud`).

## Key Conventions

### Localization

Import and alias `localize` as `t`:

```javascript
import { localize as t } from "../utils.js";
// Usage
t("LITM.Ui.some_key");
```

All user-facing strings must use localization keys from `lang/en.json`. When adding new keys, add them to all language files (use `node diff.js` or `node check-keys.js` to find gaps).

### CSS Class Naming

System-specific classes use `litm--` prefix (BEM-inspired):

```html
<div class="litm litm--roll">
	<span class="litm--tag" draggable="true">tag name</span>
	<span class="litm--status">status-1</span>
</div>
```

Use Foundry's built-in utility classes for layout (`.flexrow`, `.flexcol`, `.flex1`, `.scrollable`, `.hidden`). Prefer Foundry CSS variables (`--color-text-primary`, `--border-radius`) over hardcoded values for theme compatibility. See `CSS_GUIDE.md` for the full reference of available variables and utility classes.

### Custom Elements

`SuperCheckbox` (`litm-super-checkbox`) cycles through states: `""` → `"negative"` → `"positive"` → `"scratched"`. The `states` attribute can override this list.

`SuperCheckbox` is registered before the `init` hook fires.

### Prefer Native Foundry Behaviour

**Always use Foundry's built-in APIs and UI patterns instead of hand-rolling custom solutions.** When Foundry provides a native mechanism, use it — even if a custom approach seems simpler at first. This applies to tabs, dialogs, forms, drag-and-drop, context menus, notifications, and any other UI or framework feature. A symlink to the current Foundry source is at `./foundry/` (client code under `public/`, CSS at `public/css/foundry2.css`). API docs: https://foundryvtt.com/api/v14/

Specific examples:

- **Dialogs:** Use `foundry.applications.api.DialogV2` (not legacy `Dialog`).
- **Template rendering:** Use `foundry.applications.handlebars.renderTemplate()` (not bare `renderTemplate` global).
- **Tabs:** Use Foundry's native ApplicationV2 tab system via `tabGroups`, `changeTab()`, and `data-action="tab"` attributes — never hand-roll tab switching JS. See the pattern below.
- **CSS:** Use Foundry's built-in utility classes (`.tabs`, `.tab`, `.item`, `.flexrow`, `.flexcol`, `.scrollable`, etc.) and CSS variables before writing custom styles.

#### Native Tabs Pattern (ApplicationV2)

For **static tabs** known at class definition time, use `static TABS`:

```javascript
static TABS = {
  group: {
    tabs: [{id: "tab1", icon: "fa-solid fa-book"}, {id: "tab2"}],
    initial: "tab1",
    labelPrefix: "LITM.Tabs"
  }
};
```

For **dynamic tabs** (e.g., generated from data at render time), manually manage `tabGroups` and set `cssClass` on each tab entry in `_prepareContext`:

```javascript
this.tabGroups["my-group"] ??= dynamicTabs[0]?.id;
for (const tab of dynamicTabs) {
  tab.cssClass = this.tabGroups["my-group"] === tab.id ? "active" : "";
}
```

Template markup — nav buttons use `data-action="tab"`, content sections use `class="tab"`:

```html
<nav class="tabs" data-group="my-group">
  {{#each tabs}}
  <button type="button" class="item {{cssClass}}" data-action="tab" data-group="my-group" data-tab="{{id}}">{{label}}</button>
  {{/each}}
</nav>
<section class="tab {{tab.cssClass}}" data-group="my-group" data-tab="tab1">...</section>
<section class="tab {{tab.cssClass}}" data-group="my-group" data-tab="tab2">...</section>
```

Foundry's `changeTab()` handles all switching, active-class toggling, and state persistence automatically. No custom JS event listeners needed.

**Gotcha:** `<button>` inside a `<form>` defaults to `type="submit"`. Always use `type="button"` for non-submit buttons in ApplicationV2 apps with `tag: "form"`.

### Hooks Organization

Hooks are registered via `LitmHooks.register()` in `scripts/system/hooks/index.js`, which delegates to domain-specific modules: `actor-hooks.js`, `chat-hooks.js`, `compat-hooks.js`, `fellowship-hooks.js`, `item-hooks.js`, `preloads.js`, `ready-hooks.js`, `ui-hooks.js`. Add new hooks to the appropriate domain file.

### Asset Preloads

New `.webp` assets must be added to the `preloads` array in `LitmConfig` (`scripts/system/config.js`). Preload logic lives in `scripts/system/hooks/preloads.js`. All images use `.webp` format. Icons use `.svg`.

### Utility Functions (`scripts/utils.js`)

- `queryItemsFromPacks({ type, filter, indexFields, map })` — queries world items and compendium pack indices by type, with optional filtering and mapping. Use this instead of manually iterating packs.
- `toPlainObject(obj)` — safely converts Foundry documents to plain objects via `.toObject()`.
- `toQuestionOptions(questions, skipFirst)` — maps question arrays to letter-indexed option objects (A, B, C…).

### Testing

E2E tests use Playwright in `tests/e2e/`. Specs are in `tests/e2e/specs/`, selectors in `tests/e2e/helpers/selectors.ts`.

### Hot Reload

The system supports hot reloading for `css`, `html`, `js`, and `json` files in `templates/`, `lang/`, `litm.css`, and `litm.js`. No build step is required; edit files directly.
