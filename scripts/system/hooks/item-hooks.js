import { error } from "../../logger.js";

export function registerItemHooks() {
	_prepareThemeOnCreate();
	_syncThemeImageOnLevelChange();
	_safeUpdateItemSheet();
}

function _prepareThemeOnCreate() {
	Hooks.on("preCreateItem", (item, data) => {
		if (item.img !== "icons/svg/item-bag.svg") return;

		const { icons } = CONFIG.litm.assets;
		const { base } = icons;
		let img = base;
		switch (data.type) {
			case "theme": {
				const level =
					data.system?.level ?? Object.keys(CONFIG.litm.theme_levels)[0];
				img = `systems/litm/assets/media/icons/${level}.svg`;
				break;
			}
			case "themebook": {
				const tbLevel = data.system?.theme_level ?? "origin";
				img = `systems/litm/assets/media/icons/${tbLevel}.svg`;
				break;
			}
			case "vignette":
				img += icons.vignette;
				break;
			case "backpack":
				img += icons.backpack;
				break;
			case "trope":
				img = "icons/svg/target.svg";
				break;
			default:
				img = icons.default;
		}
		item.updateSource({ img });
	});
}

function _syncThemeImageOnLevelChange() {
	Hooks.on("preUpdateItem", (item, data) => {
		if (item.type === "theme") {
			const newLevel = data.system?.level ?? data["system.level"];
			if (newLevel) {
				data.img = `systems/litm/assets/media/icons/${newLevel}.svg`;
			}
		} else if (item.type === "themebook") {
			const newLevel = data.system?.theme_level ?? data["system.theme_level"];
			if (newLevel) {
				data.img = `systems/litm/assets/media/icons/${newLevel}.svg`;
			}
		}
	});
}

function _safeUpdateItemSheet() {
	Hooks.on("preUpdateItem", (_, data) => {
		function getArray(data) {
			return Array.isArray(data) ? data : Object.values(data);
		}

		const { schema: tagSchema } = game.litm.data.TagData;
		const { system = {} } = data;

		const { powerTags = [], weaknessTags = [], contents = [] } = system;
		const toValidate = [
			...getArray(powerTags),
			...getArray(weaknessTags),
			...getArray(contents),
		];
		if (!toValidate.length) return;

		const validationErrors = toValidate
			.map((item) => tagSchema.validate(item, { strict: true, partial: false }))
			.filter(Boolean);

		if (validationErrors.length) {
			error("Validation errors", validationErrors);
			ui.notifications.error("LITM.Ui.error_validating_item", {
				localize: true,
			});
			return false;
		}
	});
}
