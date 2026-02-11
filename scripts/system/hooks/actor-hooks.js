import { localize as t } from "../../utils.js";

export function registerActorHooks() {
	_prepareCharacterOnCreate();
	_validateFellowshipThemes();
	_enforceHeroItemLimits();
}

function _prepareCharacterOnCreate() {
	Hooks.on("preCreateActor", (actor, data, _options, _userId) => {
		const isHero = data.type === "hero";

		const prototypeToken = isHero
			? {
					sight: { enabled: true },
					actorLink: true,
					disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
					texture: {
						src: actor.prototypeToken?.texture?.src || actor.img,
					},
				}
			: null;
		actor.updateSource({ prototypeToken });

		// Fellowship actors default to OWNER permission for all players
		if (data.type === "fellowship") {
			actor.updateSource({
				ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
			});
			if (actor.img === "icons/svg/mystery-man.svg") {
				actor.updateSource({
					img: "systems/litm/assets/media/icons/fellowship.svg",
				});
			}
		}
	});

	Hooks.on("createActor", (actor, options) => {
		(async () => {
			if (actor.type === "hero") {
				if (options?.litm?.skipAutoSetup) return;
				const missingThemes = Math.max(
					4 - actor.items.filter((it) => it.type === "theme").length,
					0,
				);

				if (missingThemes > 0) {
					const themeItems = Array(missingThemes)
						.fill()
						.map((_, i) => ({
							name: `${t("TYPES.Item.theme")} ${i + 1}`,
							type: "theme",
						}));
					await actor.createEmbeddedDocuments("Item", themeItems);
				}
				const backpack = actor.items.find((it) => it.type === "backpack");
				if (!backpack) {
					await actor.createEmbeddedDocuments("Item", [
						{
							name: t("TYPES.Item.backpack"),
							type: "backpack",
						},
					]);
				}
				return;
			}

			if (actor.type !== "journey") return;

			if (!actor.system.generalConsequences) {
				const [vignette] = await actor.createEmbeddedDocuments("Item", [
					{
						name: t("LITM.Terms.general_consequences"),
						type: "vignette",
						"system.isConsequenceOnly": true,
					},
				]);
				await actor.update({
					"system.generalConsequences": vignette?.id || "",
				});
			}
		})().catch((err) => console.error("litm | Failed to setup actor", err));
	});
}

/**
 * Validate and enforce fellowship theme limits (max 1 per hero)
 */
function _validateFellowshipThemes() {
	// Enforce fellowship theme limits on fellowship actors (max 1)
	Hooks.on("preUpdateItem", (item, data, _options, _userId) => {
		const expanded = foundry.utils.expandObject(data);
		if (item.type !== "theme" || !expanded.system?.isFellowship) return;
		if (item.system.isFellowship) return;

		const actor = item.actor;
		if (!actor || actor.type !== "fellowship") return;

		const existingFellowship = actor.items.find(
			(i) => i.type === "theme" && i.system.isFellowship && i.id !== item.id,
		);

		if (existingFellowship) {
			ui.notifications.warn(
				game.i18n.localize("LITM.Ui.warn_fellowship_limit"),
			);
			return false;
		}
	});

	Hooks.on("preCreateItem", (item, data, _options, _userId) => {
		if (item.type !== "theme" || !data.system?.isFellowship) return;

		const actor = item.parent;
		if (!actor || actor.type !== "fellowship") return;

		const existingFellowship = actor.items.find(
			(i) => i.type === "theme" && i.system.isFellowship,
		);

		if (existingFellowship) {
			ui.notifications.warn(
				game.i18n.localize("LITM.Ui.warn_fellowship_limit"),
			);
			return false;
		}
	});
}

/**
 * Prevent excess themes and backpacks on hero actors
 */
function _enforceHeroItemLimits() {
	Hooks.on("preCreateItem", (item, _data, _options, _userId) => {
		const actor = item.parent;
		if (!actor || actor.type !== "hero") return;

		if (item.type === "theme" && !item.system?.isFellowship) {
			const regularThemes = actor.items.filter(
				(i) => i.type === "theme" && !i.system.isFellowship,
			);
			if (regularThemes.length >= 4) {
				ui.notifications.warn(game.i18n.localize("LITM.Ui.warn_theme_limit"));
				return false;
			}
		}

		if (item.type === "backpack") {
			const backpacks = actor.items.filter((i) => i.type === "backpack");
			if (backpacks.length >= 1) {
				ui.notifications.warn(
					game.i18n.localize("LITM.Ui.warn_backpack_limit"),
				);
				return false;
			}
		}
	});
}
