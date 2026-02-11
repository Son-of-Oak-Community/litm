import { LitmActorSheet } from "../sheets/base-actor-sheet.js";
import { localize as t } from "../utils.js";

export class KeyBindings {
	static register() {
		game.keybindings.register("litm", "toggleEditMode", {
			name: t("LITM.Ui.toggle_edit_mode"),
			hint: t("LITM.Ui.toggle_edit_mode_hint"),
			editable: [
				{
					key: "KeyE",
				},
			],
			onDown: () => {
				let topSheet = null;
				let topZ = -1;
				for (const app of foundry.applications.instances.values()) {
					if (!(app instanceof LitmActorSheet)) continue;
					if (!app.rendered) continue;
					const z = Number.parseInt(app.element?.style.zIndex ?? 0, 10);
					if (z > topZ) {
						topZ = z;
						topSheet = app;
					}
				}
				if (!topSheet) return;
				return topSheet._onChangeSheetMode(new Event("keydown"));
			},
			onUp: () => {},
			restricted: false,
			precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
		});

		game.keybindings.register("litm", "wrapTagMarkup", {
			name: t("LITM.Ui.wrap_tag_markup"),
			hint: t("LITM.Ui.wrap_tag_markup_hint"),
			editable: [
				{
					key: "KeyT",
					modifiers: ["Alt"],
				},
			],
			onDown: () => {
				const el = document.activeElement;
				if (
					!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
				) {
					return;
				}
				const { selectionStart: start, selectionEnd: end, value } = el;
				if (start === null || end === null) return;

				const selected = value.slice(start, end);
				const replacement = selected ? `[${selected}]` : "[]";
				el.setRangeText(replacement, start, end, "end");
				// Place cursor between brackets when no selection
				if (!selected) el.setSelectionRange(start + 1, start + 1);
				el.dispatchEvent(new Event("input", { bubbles: true }));
			},
			onUp: () => {},
			restricted: false,
			precedence: CONST.KEYBINDING_PRECEDENCE.PRIORITY,
		});

		game.keybindings.register("litm", "toggleTagsSidebar", {
			name: t("LITM.Ui.toggle_tags_sidebar"),
			hint: t("LITM.Ui.toggle_tags_sidebar_hint"),
			editable: [
				{
					key: "KeyT",
				},
			],
			onDown: () => {
				if (ui.combat?.popout?.rendered) ui.combat.popout.close();
				else ui.combat?.renderPopout();
			},
			onUp: () => {},
			restricted: false,
			precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
		});

		game.keybindings.register("litm", "openDiceRoller", {
			name: t("LITM.Ui.dice_roller"),
			hint: t("LITM.Ui.dice_roller_hint"),
			editable: [
				{
					key: "KeyR",
				},
			],
			onDown: () => {
				const sheet = game.user.character?.sheet;
				if (!sheet) {
					return ui.notifications.warn("LITM.Ui.warn_no_character", {
						localize: true,
					});
				}
				return sheet.renderRollDialog({ toggle: true });
			},
			onUp: () => {},
			restricted: false,
			precedence: CONST.KEYBINDING_PRECEDENCE.PRIORITY,
		});
	}
}
