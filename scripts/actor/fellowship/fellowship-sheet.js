import { LitmActorSheet } from "../../sheets/base-actor-sheet.js";
import { enrichHTML, queryItemsFromPacks, toPlainObject } from "../../utils.js";

/**
 * Fellowship sheet for Legend in the Mist
 * Represents a shared fellowship actor with a fellowship theme, story themes, and story tags
 */
export class FellowshipSheet extends LitmActorSheet {
	/** @override */
	static DEFAULT_OPTIONS = {
		classes: ["litm", "litm-fellowship-sheet"],
		tag: "form",
		actions: {
			editItem: LitmActorSheet._onEditItem,
			removeItem: LitmActorSheet._onRemoveItem,
			addStoryTheme: FellowshipSheet.#onAddStoryTheme,
			addStoryTag: LitmActorSheet._onAddStoryTag,
			removeEffect: LitmActorSheet._onRemoveEffect,
			toggleEffectVisibility: LitmActorSheet._onToggleEffectVisibility,
			toggleTagActive: FellowshipSheet.#onToggleTagActive,
			selectTag: FellowshipSheet.#onSelectTag,
			adjustProgress: FellowshipSheet.#onAdjustProgress,
			openThemeAdvancement: FellowshipSheet.#onOpenThemeAdvancement,
			browseThemes: FellowshipSheet.#onBrowseThemes,
		},
		form: {
			handler: LitmActorSheet._onSubmitActorForm,
			submitOnChange: true,
			closeOnSubmit: false,
		},
		window: {
			icon: "fa-solid fa-campground",
			resizable: true,
		},
		dragDrop: [{ dropSelector: null }],
	};

	/** @override */
	static PARTS = {
		form: {
			template: "systems/litm/templates/actor/fellowship.html",
			scrollable: [""],
		},
	};

	/** @override */
	static _getEditModeTemplate() {
		return "systems/litm/templates/actor/fellowship.html";
	}

	/** @override */
	static _getPlayModeTemplate() {
		return "systems/litm/templates/actor/fellowship-play.html";
	}

	/* -------------------------------------------- */
	/*  Rendering                                   */
	/* -------------------------------------------- */

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		const enrichedDescription = await enrichHTML(
			this.system.description,
			this.document,
		);

		// Prepare fellowship theme (single theme item with isFellowship)
		const themeItem = this.document.items.find(
			(i) => i.type === "theme" && i.system.isFellowship,
		);
		const theme = themeItem ? this._prepareThemeData(themeItem) : null;

		// Prepare story themes
		const storyThemes = this.document.items
			.filter((i) => i.type === "story_theme")
			.sort((a, b) => a.sort - b.sort)
			.map((i) => this._prepareThemeData(i));

		return {
			...context,
			isGM: game.user.isGM,
			isOwner: this.document.isOwner,
			isEditMode: this._isEditMode,
			enriched: {
				description: enrichedDescription,
			},
			theme,
			storyThemes,
			storyTags: this._prepareStoryTags(),
			tagTypeOptions: {
				tag: "LITM.Terms.tag",
				status: "LITM.Terms.status",
			},
		};
	}

	/* -------------------------------------------- */
	/*  Event Handlers & Actions                    */
	/* -------------------------------------------- */

	/**
	 * Add a new story theme
	 * @param {Event} event        The triggering event
	 * @param {HTMLElement} target The target element
	 * @private
	 */
	static async #onAddStoryTheme(_event, _target) {
		const [storyTheme] = await this.document.createEmbeddedDocuments("Item", [
			{
				name: game.i18n.localize("LITM.Ui.new_story_theme"),
				type: "story_theme",
			},
		]);
		storyTheme.sheet.render(true);
	}

	/**
	 * Toggle the active state of a tag in edit mode
	 * @private
	 */
	static async #onToggleTagActive(event, target) {
		const tagId = target.dataset.tagId;
		const tagType = target.dataset.tagType;
		if (!tagId) return;

		const burn = event.shiftKey;

		const itemEl = target.closest("[data-item-id]") ?? target.closest(".item");
		const itemId = itemEl?.dataset?.itemId ?? itemEl?.dataset?.id;
		if (!itemId) return;

		const item = this.document.items.get(itemId);
		if (!item) return;

		const tagArrayKey =
			tagType === "weaknessTag" ? "weaknessTags" : "powerTags";
		const systemPath =
			item.type === "story_theme"
				? `system.theme.${tagArrayKey}`
				: `system.${tagArrayKey}`;

		const tags = (item.system[tagArrayKey] ?? []).map((t) => toPlainObject(t));
		const tag = tags.find((t) => t.id === tagId);
		if (!tag) return;

		if (burn) tag.isScratched = !tag.isScratched;
		else tag.isActive = !tag.isActive;
		await item.update({ [systemPath]: tags });
	}

	/**
	 * Select a tag for rolling or scratch it with Alt+Click.
	 * Click delegates to the user's hero roll dialog.
	 * Alt+Click scratches the tag (except weakness tags).
	 * @private
	 */
	static #onSelectTag(event, target) {
		if (this._isEditMode) return;

		const tagType = target.dataset.tagType;
		const tagId = target.dataset.tagId;
		if (!tagType || !tagId) return;

		// Alt+Click: scratch (except weakness tags)
		if (event.altKey) {
			if (tagType === "weaknessTag") return;
			return FellowshipSheet.#scratchTag.call(this, tagType, tagId);
		}

		// Regular click: add to user's hero roll dialog
		const hero = game.user.character;
		if (!hero || hero.type !== "hero") return;
		const heroSheet = hero.sheet;
		if (!heroSheet) return;

		// Ensure fellowship tags are synced into the roll dialog
		const dialog = heroSheet.rollDialogInstance;
		const existingById = new Map(dialog.characterTags.map((t) => [t.id, t]));
		for (const tag of heroSheet._buildAllRollTags()) {
			if (!existingById.has(tag.id)) {
				dialog.characterTags.push(tag);
			}
		}

		// Find and toggle the tag in the roll dialog
		const tagRef = dialog.characterTags.find((t) => t.id === tagId);
		if (!tagRef) return;

		const isWeaknessTag = tagRef.type === "weaknessTag";
		const isScratched = tagRef.isScratched ?? false;
		const selected = !!tagRef.state;

		if (!selected && isScratched && !isWeaknessTag) return;

		if (selected) {
			dialog.setCharacterTagState(tagId, "");
		} else {
			const nextState = isWeaknessTag ? "negative" : "positive";
			dialog.setCharacterTagState(tagId, nextState);
		}

		if (!dialog.rendered) {
			heroSheet.renderRollDialog();
		} else {
			dialog.render();
		}
		heroSheet.render();
	}

	/**
	 * Toggle scratch state of a tag on this fellowship actor.
	 * @param {string} tagType  The tag type (powerTag, themeTag)
	 * @param {string} tagId    The tag ID
	 * @private
	 */
	static async #scratchTag(tagType, tagId) {
		if (tagType === "themeTag") {
			const theme = this.document.items.get(tagId);
			if (!theme) return;
			const isScratched = theme.system.isScratched ?? false;
			await this.document.updateEmbeddedDocuments("Item", [
				{ _id: theme.id, "system.isScratched": !isScratched },
			]);
			return;
		}

		const tagArrayKey =
			tagType === "weaknessTag" ? "weaknessTags" : "powerTags";

		const parentItem = this.document.items.find(
			(i) =>
				["theme", "story_theme"].includes(i.type) &&
				i.system[tagArrayKey]?.some((t) => t.id === tagId),
		);
		if (!parentItem) return;

		const systemPath =
			parentItem.type === "story_theme"
				? `system.theme.${tagArrayKey}`
				: `system.${tagArrayKey}`;

		const tags = (parentItem.system[tagArrayKey] ?? []).map((t) =>
			toPlainObject(t),
		);
		const tag = tags.find((t) => t.id === tagId);
		if (!tag || !tag.isActive) return;

		tag.isScratched = !tag.isScratched;
		await parentItem.update({ [systemPath]: tags });
	}

	/**
	 * Adjust a progress track
	 * @private
	 */
	static async #onAdjustProgress(_event, target) {
		const button = target.closest("button") ?? target;
		const boxIndex = parseInt(button.dataset.index, 10);
		if (Number.isNaN(boxIndex)) return;

		const container = button.closest(
			".progress-display, .progress-buttons, .progress-boxes",
		);
		if (!container) return;
		const attrib = container.dataset.id;
		if (!attrib) return;

		const itemElement = button.closest(".item");
		const item = itemElement
			? this.document.items.get(itemElement.dataset.id)
			: null;

		const doc = item || this.document;
		const currentValue = foundry.utils.getProperty(doc, attrib);
		const newValue = boxIndex < currentValue ? boxIndex : boxIndex + 1;

		const updateData = {};
		foundry.utils.setProperty(updateData, attrib, newValue);
		await doc.update(updateData);
	}

	/**
	 * Open theme advancement modal
	 * @private
	 */
	static #onOpenThemeAdvancement(_event, target) {
		const itemId = target.dataset.itemId;
		const item = this.document.items.get(itemId);
		if (!item) return;

		new game.litm.ThemeAdvancementApp({
			actorId: this.document.id,
			themeId: itemId,
		}).render(true);
	}

	/**
	 * Open a dialog to browse and pick a fellowship themebook or themekit
	 * @private
	 */
	static async #onBrowseThemes() {
		// Check if a fellowship theme already exists
		const numThemes = this.document.items.filter(
			(i) => i.type === "theme",
		).length;
		if (numThemes >= 1) {
			return ui.notifications.warn(
				game.i18n.localize("LITM.Ui.warn_fellowship_limit"),
			);
		}

		// Gather fellowship themebooks and themekits from all Item compendiums and world items
		const fellowshipMapper = (entry, { pack }) => {
			const uuid = pack
				? entry.uuid || `Compendium.${pack.collection}.${entry._id}`
				: entry.uuid;
			const img = entry.img || "icons/svg/book.svg";
			return { uuid, name: entry.name, img };
		};
		const isFellowship = (entry) => !!entry.system?.isFellowship;

		const themebooks = await queryItemsFromPacks({
			type: "themebook",
			filter: isFellowship,
			indexFields: [
				"img",
				"system.theme_level",
				"system.level",
				"system.isFellowship",
			],
			map: fellowshipMapper,
		});
		const themekits = await queryItemsFromPacks({
			type: "theme",
			filter: isFellowship,
			indexFields: [
				"img",
				"system.theme_level",
				"system.level",
				"system.isFellowship",
			],
			map: fellowshipMapper,
		});

		themebooks.sort((a, b) => a.name.localeCompare(b.name));
		themekits.sort((a, b) => a.name.localeCompare(b.name));

		// Mark the first themekit as default-checked only when no themebooks exist
		if (!themebooks.length && themekits.length) {
			themekits[0].firstKit = true;
		}

		const content = await foundry.applications.handlebars.renderTemplate(
			"systems/litm/templates/apps/fellowship-theme-picker.html",
			{
				themebooks,
				themekits,
				hasAny: themebooks.length || themekits.length,
			},
		);

		const result = await foundry.applications.api.DialogV2.prompt({
			window: {
				title: game.i18n.localize("LITM.Ui.fellowship_browse_title"),
			},
			content,
			ok: {
				icon: "fas fa-check",
				label: game.i18n.localize("LITM.Terms.select"),
				callback: (_event, button) => {
					const checked = button.form.querySelector(
						"input[name=choice]:checked",
					);
					if (!checked) return null;
					return { uuid: checked.value, type: checked.dataset.type };
				},
			},
		});

		if (!result) return;

		const doc = await fromUuid(result.uuid);
		if (!doc) return;

		if (result.type === "themebook") {
			const validLevels = Object.keys(CONFIG.litm.theme_levels);
			const level = validLevels.includes(doc.system.theme_level)
				? doc.system.theme_level
				: validLevels[0];
			const img = `systems/litm/assets/media/icons/${level}.svg`;
			const [theme] = await this.document.createEmbeddedDocuments("Item", [
				{
					name: doc.name,
					type: "theme",
					img,
					system: {
						themebook: doc.name,
						level,
						isFellowship: true,
					},
				},
			]);
			theme.sheet.render(true);
		} else {
			await this.document.createEmbeddedDocuments("Item", [doc.toObject()]);
		}
	}

	/* -------------------------------------------- */
	/*  Drag & Drop                                 */
	/* -------------------------------------------- */

	/** @override */
	async _onDropItem(event, item) {
		if (!["theme", "story_theme", "themebook"].includes(item.type)) return;

		// Handle sorting if the item is already on this actor
		if (this.actor.uuid === item.parent?.uuid) {
			return this._onSortItem(event, item);
		}

		// Themebook drop: create a new theme from the themebook
		if (item.type === "themebook") {
			if (!item.system.isFellowship) {
				return ui.notifications.warn(
					game.i18n.localize("LITM.Ui.warn_fellowship_not_fellowship"),
				);
			}

			const numThemes = this.document.items.filter(
				(i) => i.type === "theme",
			).length;
			if (numThemes >= 1) {
				return ui.notifications.warn(
					game.i18n.localize("LITM.Ui.warn_fellowship_limit"),
				);
			}

			const validLevels = Object.keys(CONFIG.litm.theme_levels);
			const level = validLevels.includes(item.system.theme_level)
				? item.system.theme_level
				: validLevels[0];
			const img = `systems/litm/assets/media/icons/${level}.svg`;
			const [theme] = await this.document.createEmbeddedDocuments("Item", [
				{
					name: item.name,
					type: "theme",
					img,
					system: {
						themebook: item.name,
						level,
						isFellowship: true,
					},
				},
			]);
			theme.sheet.render(true);
			return;
		}

		// Fellowship theme: only allow themes with isFellowship flag, limit 1
		if (item.type === "theme") {
			if (!item.system.isFellowship) {
				return ui.notifications.warn(
					game.i18n.localize("LITM.Ui.warn_fellowship_not_fellowship"),
				);
			}

			const numThemes = this.document.items.filter(
				(i) => i.type === "theme",
			).length;
			if (numThemes >= 1) {
				return ui.notifications.warn(
					game.i18n.localize("LITM.Ui.warn_fellowship_limit"),
				);
			}

			return this.document.createEmbeddedDocuments("Item", [item.toObject()]);
		}

		// Story themes: allow unlimited
		if (item.type === "story_theme") {
			return this.document.createEmbeddedDocuments("Item", [item.toObject()]);
		}
	}
}
