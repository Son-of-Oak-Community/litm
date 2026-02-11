import { localize as t } from "../../utils.js";
import { LitmSettings } from "../settings.js";

export function registerFellowshipHooks() {
	_ensureFellowshipSingleton();
	_blockDuplicateFellowship();
	_blockFellowshipDeletion();
	_hideFromCreateDialog();
	_autoLinkNewHeroes();
	_rerenderHeroSheetsOnFellowshipChange();
}

/**
 * On ready, ensure exactly one fellowship actor exists and its ID is stored.
 * Then auto-link all heroes to it. GM-only.
 *
 * NOTE: Foundry does NOT await async hook callbacks, so the hero-linking
 * logic lives here (after the awaits) rather than in a separate ready hook.
 */
function _ensureFellowshipSingleton() {
	Hooks.once("ready", async () => {
		if (!game.user.isGM) return;

		const storedId = LitmSettings.fellowshipId;
		const storedActor = storedId ? game.actors.get(storedId) : null;

		let fellowshipId;

		if (storedActor?.type === "fellowship") {
			// Stored ID is valid — nothing to create
			fellowshipId = storedId;
		} else {
			// Find existing fellowship actors (pick first match)
			const existing = game.actors.find((a) => a.type === "fellowship");

			if (existing) {
				fellowshipId = existing.id;
				await LitmSettings.setFellowshipId(fellowshipId);
			} else {
				// No fellowship exists — create one
				const actor = await Actor.create(
					{
						name: t("LITM.Terms.fellowship"),
						type: "fellowship",
						ownership: {
							default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
						},
					},
					{ litm: { skipSingletonCheck: true } },
				);
				fellowshipId = actor.id;
				await LitmSettings.setFellowshipId(fellowshipId);
			}
		}

		// Auto-link all heroes with stale/missing fellowship links
		await _linkAllHeroes(fellowshipId);
	});
}

/**
 * Update all hero actors whose fellowshipId doesn't match the singleton.
 * @param {string} fellowshipId  The singleton fellowship actor ID
 */
async function _linkAllHeroes(fellowshipId) {
	if (!fellowshipId) return;

	const updates = game.actors
		.filter((a) => a.type === "hero" && a.system.fellowshipId !== fellowshipId)
		.map((a) => ({
			_id: a.id,
			"system.fellowshipId": fellowshipId,
		}));

	if (updates.length > 0) {
		await Actor.updateDocuments(updates);
	}
}

/**
 * Block creation of duplicate fellowship actors via any path (API, macro, etc.)
 */
function _blockDuplicateFellowship() {
	Hooks.on("preCreateActor", (actor, _data, options) => {
		if (actor.type !== "fellowship") return;
		if (options?.litm?.skipSingletonCheck) return;

		const existingId = LitmSettings.fellowshipId;
		const existing = existingId ? game.actors.get(existingId) : null;

		if (existing) {
			ui.notifications.warn(t("LITM.Ui.warn_fellowship_singleton"));
			return false;
		}
	});
}

/**
 * Prevent deletion of the singleton fellowship actor.
 * Pass option `{ litm: { forceDelete: true } }` to bypass.
 */
function _blockFellowshipDeletion() {
	Hooks.on("preDeleteActor", (actor, options) => {
		if (actor.type !== "fellowship") return;
		if (options?.litm?.forceDelete) return;

		const singletonId = LitmSettings.fellowshipId;
		if (actor.id === singletonId) {
			ui.notifications.warn(t("LITM.Ui.warn_fellowship_no_delete"));
			return false;
		}
	});
}

/**
 * Filter fellowship out of the Actor creation dialog type dropdown.
 */
function _hideFromCreateDialog() {
	Hooks.once("ready", () => {
		const original = Actor.createDialog;
		Actor.createDialog = function (data, options, dialogOptions = {}) {
			dialogOptions.types ??= Actor.TYPES.filter(
				(type) => type !== "fellowship",
			);
			return original.call(this, data, options, dialogOptions);
		};
	});
}

/**
 * Re-render open hero sheets when the fellowship actor or its items change.
 * Without this, hero sheets display stale fellowship data until manually refreshed.
 */
function _rerenderHeroSheetsOnFellowshipChange() {
	const rerenderLinkedHeroes = (actorOrItem) => {
		const fellowshipId = LitmSettings.fellowshipId;
		if (!fellowshipId) return;

		// Determine if this change is on the fellowship actor or its items
		const actorId = actorOrItem.parent?.id ?? actorOrItem.id;
		if (actorId !== fellowshipId) return;

		for (const actor of game.actors) {
			if (actor.type !== "hero") continue;
			if (actor.system.fellowshipId !== fellowshipId) continue;
			if (actor.sheet?.rendered) actor.sheet.render();
		}
	};

	Hooks.on("updateActor", rerenderLinkedHeroes);
	Hooks.on("updateItem", rerenderLinkedHeroes);
	Hooks.on("createItem", rerenderLinkedHeroes);
	Hooks.on("deleteItem", rerenderLinkedHeroes);
	Hooks.on("updateActiveEffect", rerenderLinkedHeroes);
	Hooks.on("createActiveEffect", rerenderLinkedHeroes);
	Hooks.on("deleteActiveEffect", rerenderLinkedHeroes);
}

/**
 * Auto-link newly created heroes to the singleton fellowship.
 */
function _autoLinkNewHeroes() {
	Hooks.on("createActor", async (actor) => {
		if (actor.type !== "hero") return;
		if (!game.user.isGM) return;

		const fellowshipId = LitmSettings.fellowshipId;
		if (!fellowshipId) return;
		if (actor.system.fellowshipId === fellowshipId) return;

		await actor.update({ "system.fellowshipId": fellowshipId });
	});
}
