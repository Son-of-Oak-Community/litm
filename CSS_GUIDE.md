# Foundry VTT CSS Guide (Framework Version)

This document outlines the core utility classes, structural styles, and variables available in the current CSS framework. Utilizing these ensures a native look and feel while maintaining consistency across the application.

## 1. Layout & Structure

The framework utilizes a modular layout system based on CSS Cascade Layers (`reset`, `variables`, `elements`, `blocks`, etc.).

### Flexbox Utilities

| Class      | Description                                                                                                 |
| :--------- | :---------------------------------------------------------------------------------------------------------- |
| `.flexrow` | `display: flex; flex-direction: row; flex-wrap: wrap; align-items: center;`. Children default to `flex: 1`. |
| `.flexcol` | `display: flex; flex-direction: column; flex-wrap: nowrap;`. Children default to `flex: none`.              |
| `.flex0`   | `flex: 0` (No growth).                                                                                      |
| `.flex1`   | `flex: 1` (Grow to fill available space).                                                                   |
| `.flex2`   | `flex: 2` (Grow twice as much).                                                                             |
| `.flex3`   | `flex: 3` (Grow three times as much).                                                                       |
| `.noflex`  | `flex: none`.                                                                                               |

### Utility Classes

| Class         | Description                                                        |
| :------------ | :----------------------------------------------------------------- |
| `.scrollable` | `overflow: hidden auto` with `scrollbar-gutter: stable`.           |
| `.hidden`     | `display: none !important`.                                        |
| `.disabled`   | `cursor: default; pointer-events: none;`.                          |
| `.ellipsis`   | `white-space: nowrap; text-overflow: ellipsis; overflow: hidden;`. |

---

## 2. Forms (`.standard-form`)

Wrap forms in `.standard-form` to utilize the standardized layout and spacing.

| Class                 | Description                                                                    |
| :-------------------- | :----------------------------------------------------------------------------- |
| `.standard-form`      | Top-level container. Uses `flexcol` with `gap: 1rem`.                          |
| `.form-group`         | Container for label and input. Label is `flex: 1`, input/fields are `flex: 2`. |
| `.form-group.stacked` | Children take up 100% width (`flex: 0 0 100%`).                                |
| `.form-group.inline`  | Uses `justify-content: space-between`.                                         |
| `.form-group.slim`    | Reduced spacing for compact layouts.                                           |
| `.form-fields`        | Flex container for grouping multiple inputs (e.g., Current/Max).               |
| `.form-footer`        | Container for action buttons with specialized sizing.                          |
| `.hint`               | Small text for descriptions (`var(--font-size-14)`).                           |

### Fieldsets & Grids

| Class                     | Description                                                            |
| :------------------------ | :--------------------------------------------------------------------- |
| `fieldset`                | Standard padding and rounded borders (`var(--color-fieldset-border)`). |
| `fieldset.input-grid`     | CSS Grid layout. Default `--grid-cols: 2`.                             |
| `fieldset legend`         | Bold, `var(--font-size-15)`.                                           |
| `fieldset legend.control` | Flex layout for adding icons/buttons to legends.                       |

---

## 3. Typography

The framework provides a tiered heading system and specialized text decorators.

| Class            | Description                                                          |
| :--------------- | :------------------------------------------------------------------- |
| `h1`             | `var(--font-h1)` (Modesto Condensed), size `var(--font-h1-size)`.    |
| `h2`             | `var(--font-h2)` (Amiri), size `var(--font-h2-size)`.                |
| `h3`             | `var(--font-h3)` (Signika), size `var(--font-h3-size)`.              |
| `h*.border`      | Decorative borders using a gradient mask.                            |
| `h*.divider`     | Centered text with decorative lines on either side.                  |
| `h*.noborder`    | Removes inherited borders.                                           |
| `span.highlight` | Text in `var(--color-text-accent)`.                                  |
| `span.reference` | Small boxed text for UI instructions.                                |
| `blockquote`     | Italic text with a `var(--color-border-light-tertiary)` left border. |

---

## 4. Buttons

Buttons are styled globally and can be modified using CSS variables.

| Class                 | Description                                                          |
| :-------------------- | :------------------------------------------------------------------- |
| `button` / `a.button` | Standard flex-based button with `0.5s` transitions.                  |
| `.bright`             | Uppercase, high-contrast action button.                              |
| `.active`             | Button with an focus/active state outline.                           |
| `.icon`               | Fixed-width button sized for icons (`flex: 0 0 var(--button-size)`). |
| `.plain`              | Transparent background and borders.                                  |
| `.ui-control`         | Small fixed-size control button (32px).                              |

### Example

```html
<button type="button" class="bright"><i class="fas fa-check"></i> Confirm</button>
```

---

## 5. Tabs

Built-in tab navigation handles layout; state is managed by the application.

| Class                        | Description                                                             |
| :--------------------------- | :---------------------------------------------------------------------- |
| `nav.tabs`                   | Container using `space-evenly`. Bordered by `var(--color-tabs-border)`. |
| `nav.tabs.vertical`          | Column-based layout for sidebars.                                       |
| `nav.tabs [data-tab]`        | Individual tab link.                                                    |
| `nav.tabs [data-tab].active` | Highlighted active tab.                                                 |
| `.tab[data-tab]`             | Content container. Hidden unless `.active`.                             |

---

## 6. Sheet Structure

Standardized classes for Actor and Item sheets.

| Class             | Description                                                    |
| :---------------- | :------------------------------------------------------------- |
| `.app`            | Base application class with backdrop blur and rounded corners. |
| `.window-app`     | Pop-out window structure.                                      |
| `.window-header`  | Header containing title and window controls.                   |
| `.window-content` | Scrollable main content area.                                  |
| `.sheet.app`      | Specialized application style for document sheets.             |
| `.sheet-header`   | Flexrow header for profile image and name.                     |
| `.sheet-tabs`     | Specialized tab navigation for sheets.                         |
| `.sheet-footer`   | Bottom action area (32px high).                                |

---

## 7. CSS Variables

Foundry V14 provides extensive CSS variables for theming. Only variables listed here are guaranteed to be available in this framework.

```css
:root {
	/* ======================== */
	/* Core Color Palette       */
	/* ======================== */

	--color-light-1: #ffffff;
	--color-light-2: #f0f0f0;
	--color-light-3: #d9d9d9;
	--color-light-4: #bfbfbf;
	--color-light-5: #a6a6a6;
	--color-light-6: #8c8c8c;

	--color-dark-1: #000000;
	--color-dark-2: #1a1a1a;
	--color-dark-3: #333333;
	--color-dark-4: #4d4d4d;
	--color-dark-5: #666666;
	--color-dark-6: #808080;

	--color-warm-1: #fdf3e6;
	--color-warm-2: #f7d9b7;
	--color-warm-3: #f2c28c;

	--color-cool-1: #e6f0ff;
	--color-cool-2: #c2d9ff;
	--color-cool-3: #8cb3ff;
	--color-cool-4: #5c8cff;
	--color-cool-5: #3366ff;

	--color-cool-5-50: rgba(51, 102, 255, 0.5);
	--color-cool-5-90: rgba(51, 102, 255, 0.9);

	/* ======================== */
	/* Typography               */
	/* ======================== */

	--font-primary: "Signika", sans-serif;
	--font-monospace: "Courier New", monospace;

	--font-size-11: 0.6875rem;
	--font-size-12: 0.75rem;
	--font-size-13: 0.8125rem;
	--font-size-14: 0.875rem;
	--font-size-16: 1rem;
	--font-size-18: 1.125rem;
	--font-size-20: 1.25rem;
	--font-size-24: 1.5rem;

	/* ======================== */
	/* Layout / Spacing         */
	/* ======================== */

	--border-radius: 4px;
	--padding-xs: 2px;
	--padding-sm: 4px;
	--padding-md: 8px;
	--padding-lg: 12px;
	--padding-xl: 16px;

	--z-index-tooltip: 1000;
	--z-index-modal: 1100;
	--z-index-overlay: 1200;
}

/* ======================================== */
/* Light Theme – Normalized (Root + App)   */
/* ======================================== */

/* Root-level theme variables */
body,
.themed,
.mixin-theme-variables {
	color-scheme: light;

	--color-scheme: light;

	--color-text-emphatic: var(--color-dark-1);
	--color-text-primary: var(--color-dark-2);
	--color-text-secondary: var(--color-dark-3);
	--color-text-subtle: var(--color-dark-5);

	--color-text-selection: var(--color-light-1);
	--color-text-selection-bg: var(--color-warm-2);

	--hr-border: 0;
	--hr-gradient: linear-gradient(90deg, transparent 0%, #000000 50%, transparent 100%);

	--table-background-color: var(--color-light-1);
	--table-header-bg-color: var(--color-light-2);
	--table-header-border-color: var(--color-light-3);
	--table-header-text-color: inherit;
	--table-row-color-even: rgba(0, 0, 0, 0.05);
	--table-row-color-odd: transparent;
	--table-row-color-highlight: var(--color-warm-2);

	--content-link-background: var(--color-light-2);
	--content-link-border-color: var(--color-dark-6);
	--content-link-icon-color: var(--color-dark-4);
	--content-link-text-color: var(--color-dark-2);

	--sidebar-background: var(--color-light-1);
	--sidebar-separator: 1px solid var(--color-light-3);
	--sidebar-entry-hover-bg: rgba(0, 0, 0, 0.05);
	--sidebar-folder-color: var(--color-dark-2);
}

/* Application-level overrides */
body .application,
.themed .application,
.mixin-theme-variables .application {
	--background: var(--color-light-1);
	--color-header-background: rgba(255, 255, 255, 0.8);
	--color-border: var(--color-light-3);
	--color-tabs-border: var(--color-dark-5);
	--color-fieldset-border: var(--color-dark-6);

	--color-form-hint: var(--color-dark-5);
	--color-form-hint-hover: var(--color-dark-3);
	--color-form-label: var(--color-dark-3);
	--color-form-label-hover: var(--color-dark-1);

	--color-select-option-bg: transparent;

	--color-data-border: var(--color-warm-3);
	--color-data-background: var(--color-light-2);
}

/* ======================================== */
/* Dark Theme – Normalized (Root + App)    */
/* ======================================== */

/* Root-level theme overrides */
body.theme-dark,
.themed.theme-dark,
.mixin-theme-dark-variables {
	color-scheme: dark;

	--color-scheme: dark;

	--color-text-emphatic: var(--color-light-1);
	--color-text-primary: var(--color-light-2);
	--color-text-secondary: var(--color-light-3);
	--color-text-subtle: var(--color-light-5);

	--color-text-selection: var(--color-light-1);
	--color-text-selection-bg: var(--color-cool-3);

	--hr-border: 0;
	--hr-gradient: linear-gradient(90deg, transparent 0%, #e7d1b1 50%, transparent 100%);

	--table-background-color: var(--color-cool-5-50);
	--table-header-bg-color: var(--color-cool-4);
	--table-header-border-color: var(--color-cool-4);
	--table-header-text-color: inherit;
	--table-row-color-even: rgba(255, 255, 255, 0.1);
	--table-row-color-odd: transparent;
	--table-row-color-highlight: var(--color-cool-3);

	--content-link-background: var(--color-cool-5-90);
	--content-link-border-color: var(--color-light-6);
	--content-link-icon-color: var(--color-light-4);
	--content-link-text-color: var(--color-light-2);

	--sidebar-background: var(--color-cool-5-90);
	--sidebar-separator: 1px solid var(--color-cool-4);
	--sidebar-entry-hover-bg: rgba(255, 255, 255, 0.1);
	--sidebar-folder-color: var(--color-dark-1);
}

/* Application-level overrides */
body.theme-dark .application,
.themed.theme-dark .application,
.mixin-theme-dark-variables .application {
	--background: var(--color-cool-5-90);
	--color-header-background: rgba(0, 0, 0, 0.5);
	--color-border: var(--color-cool-4);
	--color-tabs-border: var(--color-light-5);
	--color-fieldset-border: var(--color-light-6);

	--color-form-hint: var(--color-light-5);
	--color-form-hint-hover: var(--color-light-4);
	--color-form-label: var(--color-light-4);
	--color-form-label-hover: var(--color-light-2);

	--color-select-option-bg: transparent;

	--color-data-border: var(--color-cool-3);
	--color-data-background: var(--color-cool-4);
}
```

## 8. Best Practices

1. **Prefer Variables**: Use `--color-text-primary` instead of `#191813` to ensure theme compatibility.
2. **Semantic Headers**: Use `h1` through `h6` sequentially to maintain accessibility.
3. **Standardized Forms**: Use `.standard-form` and `.form-group` to benefit from automatic spacing and alignment.
4. **Interactive States**: Always include `:hover` and `:focus` states using the provided `--button-hover` variables.
5. **Flexbox Hierarchy**: Use `.flexrow` for horizontal layouts and `.noflex` for fixed-width icons or badges within them.
6. **Localize Examples**: Use `{{localize "KEY"}}` in templates, but keep CSS agnostic of content.

## 9. Common Patterns

### Image with Name (Header)

```html
<header class="sheet-header img-name flexrow">
	<img src="{{actor.img}}" data-edit="img" height="64" width="64" />
	<h1 class="charname">
		<input name="name" type="text" value="{{actor.name}}" placeholder="Name" />
	</h1>
</header>
```

### Grid-based Stats

```html
<fieldset class="input-grid" style="--grid-cols: 3;">
	<div class="form-group stacked">
		<label>Might</label>
		<input type="number" name="system.might" value="{{system.might}}" />
	</div>
	<!-- ... -->
</fieldset>
```
