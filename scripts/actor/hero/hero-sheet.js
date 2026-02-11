import { LitmActorSheet } from "../../sheets/base-actor-sheet.js";
import { Sockets } from "../../system/sockets.js";
import { enrichHTML, toPlainObject } from "../../utils.js";

/**
 * Hero sheet for Legend in the Mist
 * Represents player characters with themes, tags, and progression
 */
export class HeroSheet extends LitmActorSheet {
	/** @override */
	static DEFAULT_OPTIONS = {
		classes: ["litm", "litm-hero-sheet"],
		tag: "form",
		actions: {
			openRollDialog: HeroSheet.#onOpenRollDialog,
			addStoryTag: LitmActorSheet._onAddStoryTag,
			addMomentOfFulfillment: HeroSheet.#onAddMomentOfFulfillment,
			removeMomentOfFulfillment: HeroSheet.#onRemoveMomentOfFulfillment,
			removeEffect: LitmActorSheet._onRemoveEffect,
			scratchTag: HeroSheet.#onScratchTag,
			selectTag: HeroSheet.#onSelectTag,
			toggleTagActive: HeroSheet.#onToggleTagActive,
			editItem: LitmActorSheet._onEditItem,
			removeItem: LitmActorSheet._onRemoveItem,
			viewActor: HeroSheet.#onViewActor,
			adjustProgress: HeroSheet.#onAdjustProgress,
			openThemeAdvancement: HeroSheet.#onOpenThemeAdvancement,
		},
		form: {
			handler: LitmActorSheet._onSubmitActorForm,
			submitOnChange: true,
			closeOnSubmit: false,
		},
		window: {
			icon: "fa-solid fa-user-shield",
			resizable: true,
		},
		dragDrop: [{ dropSelector: null }],
	};

	/** @override */
	static PARTS = {
		form: {
			template: "systems/litm/templates/actor/hero.html",
			scrollable: [""],
		},
	};

	/** @override */
	static _getEditModeTemplate() {
		return "systems/litm/templates/actor/hero.html";
	}

	/** @override */
	static _getPlayModeTemplate() {
		return "systems/litm/templates/actor/hero-play.html";
	}

	/** @override */
	_configureRenderOptions(options) {
		super._configureRenderOptions(options);
		options.parts = ["form"];
	}

	/**
	 * Roll dialog instance
	 * @type {LitmRollDialog}
	 * @private
	 */
	#rollDialog = null;

	/**
	 * Whether a roll dialog instance exists (without creating one)
	 * @type {boolean}
	 */
	get hasRollDialog() {
		return !!this.#rollDialog;
	}

	/**
	 * Get or create the roll dialog instance
	 * @returns {LitmRollDialog}
	 * @private
	 */
	get rollDialogInstance() {
		if (!this.#rollDialog) {
			this.#rollDialog = game.litm.LitmRollDialog.create({
				actorId: this.document.id,
				characterTags: this._buildAllRollTags(),
			});
		}
		return this.#rollDialog;
	}

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		// Enrich HTML description
		const enrichedDescription = await enrichHTML(
			this.system.description,
			this.document,
		);

		const momentsOfFulfillment = Array.isArray(this.system.mof)
			? this.system.mof
			: [];

		const momentOfFulfillmentEntries = await Promise.all(
			momentsOfFulfillment.map(async (moment) => {
				const description = moment.description ?? "";
				const enrichedDescription = await enrichHTML(
					description,
					this.document,
				);
				return {
					name: moment.name ?? "",
					description,
					enrichedDescription,
				};
			}),
		);
		const momentOfFulfillmentVisible = momentOfFulfillmentEntries.filter(
			(moment) =>
				(moment.name ?? "").trim() || (moment.description ?? "").trim(),
		);

		// Prepare regular themes (exclude fellowship themes owned by hero)
		const allThemes = this.document.items
			.filter((i) => i.type === "theme" && !i.system.isFellowship)
			.sort((a, b) => a.sort - b.sort);

		const themes = [];

		for (const i of allThemes) {
			themes.push(this._prepareThemeData(i));
		}

		// Prepare fellowship from linked fellowship actor
		let fellowship = {};
		const fellowshipActor = this.system.fellowshipActor;
		if (fellowshipActor) {
			const fellowshipTheme = fellowshipActor.system.theme;
			fellowship = {
				actorId: fellowshipActor.id,
				actorName: fellowshipActor.name,
				hasTheme: !!fellowshipTheme,
			};
			if (fellowshipTheme) {
				const data = this._prepareThemeData(fellowshipTheme);
				fellowship = {
					...fellowship,
					name: fellowshipTheme.name,
					_id: fellowshipTheme.id,
					id: fellowshipTheme.id,
					img: fellowshipTheme.img,
					themeTag: data.themeTag,
					system: data.system,
				};
			}
		}

		// Prepare story themes (hero's own + fellowship actor's)
		const ownStoryThemeItems = this.document.items
			.filter((i) => i.type === "story_theme")
			.sort((a, b) => a.sort - b.sort);
		const fellowshipStoryThemeItems = fellowshipActor
			? fellowshipActor.items
					.filter((i) => i.type === "story_theme")
					.sort((a, b) => a.sort - b.sort)
			: [];
		const allStoryThemeItems = [
			...ownStoryThemeItems,
			...fellowshipStoryThemeItems,
		];

		const fellowshipStoryThemeIds = new Set(
			fellowshipStoryThemeItems.map((i) => i.id),
		);
		const storyThemes = allStoryThemeItems.map((i) => {
			const data = this._prepareThemeData(i);
			data.isFellowship = fellowshipStoryThemeIds.has(data._id);
			return data;
		});

		// Enrich special improvements descriptions for all themes and fellowship
		const enrichImprovements = async (improvements = []) =>
			Promise.all(
				improvements.map(async (imp) => ({
					...imp,
					enrichedDescription: await enrichHTML(
						imp.description || "",
						this.document,
					),
				})),
			);
		for (const theme of themes) {
			theme.system.specialImprovements = await enrichImprovements(
				theme.system.specialImprovements,
			);
		}
		if (fellowship.hasTheme) {
			fellowship.system.specialImprovements = await enrichImprovements(
				fellowship.system.specialImprovements,
			);
		}

		// In play mode, only show active special improvements
		if (!this._isEditMode) {
			for (const theme of themes) {
				theme.system.specialImprovements =
					theme.system.specialImprovements.filter((imp) => imp.isActive);
			}
			if (fellowship.hasTheme) {
				fellowship.system.specialImprovements =
					fellowship.system.specialImprovements.filter((imp) => imp.isActive);
			}
		}

		// Prepare backpack
		const backpackItem = this.document.items.find((i) => i.type === "backpack");
		const backpack = backpackItem
			? {
					name: backpackItem.name,
					id: backpackItem.id,
					contents: this.system.backpack
						.sort((a, b) => a.name.localeCompare(b.name))
						.sort((a, b) =>
							a.isActive && b.isActive ? 0 : a.isActive ? -1 : 1,
						),
				}
			: null;

		// Get story tags and statuses
		const storyTags = this._prepareStoryTags();

		const relationshipEntries = this._prepareRelationshipEntries();
		const relationshipVisible = relationshipEntries.filter((entry) =>
			entry.tag.trim(),
		);

		// Get scratched tags for display (only if dialog already exists)
		const scratchedTags = this.#rollDialog
			? this.#rollDialog.characterTags.filter(
					(t) => t.isScratched || t.state === "scratched",
				)
			: [];

		// Prepare enriched fields for the editor helper
		const fields = this.document.schema.getField("system");

		// Tag type options for story tags/statuses dropdown
		const tagTypeOptions = [
			{ value: "tag", label: "LITM.Terms.tag" },
			{ value: "status", label: "LITM.Terms.status" },
		];

		return {
			...context,
			system: this.system,
			isOwner: this.document.isOwner,
			isEditMode: this._isEditMode,
			enriched: {
				description: enrichedDescription,
			},
			fields,
			themes,
			fellowship,
			fellowshipActorId: fellowshipActor?.id ?? null,
			storyThemes,
			backpack,
			storyTags,
			scratchedTags,
			relationshipEntries,
			relationshipVisible,
			momentsOfFulfillment,
			momentOfFulfillmentEntries,
			momentOfFulfillmentVisible,
			tagTypeOptions,

			rollTags: this.#rollDialog?.characterTags ?? this._buildAllRollTags(),
			limit: this.system.limit,
		};
	}

	/* -------------------------------------------- */
	/*  Event Handlers & Actions                    */
	/* -------------------------------------------- */

	/**
	 * Open the roll dialog
	 * @param {Event} event        The triggering event
	 * @param {HTMLElement} target The target element
	 * @static
	 * @protected
	 */
	static #onOpenRollDialog(_event, _target) {
		const existingById = new Map(
			this.rollDialogInstance.characterTags.map((tag) => [tag.id, tag]),
		);
		const allNewTags = this._buildAllRollTags().map((tag) => {
			const existing = existingById.get(tag.id);
			return {
				...tag,
				state: existing?.state ?? tag.state,
				contributorId: existing?.contributorId ?? null,
			};
		});
		this.rollDialogInstance.characterTags = allNewTags;
		this.renderRollDialog();
	}

	_prepareRelationshipEntries() {
		return this.system.relationshipEntries;
	}

	_buildRelationshipRollTags() {
		return this.system.relationshipTags;
	}

	_buildThemeRollTags() {
		const tags = [];

		const ownThemes = this.document.items
			.filter(
				(i) =>
					(i.type === "theme" && !i.system.isFellowship) ||
					i.type === "story_theme",
			)
			.sort((a, b) => a.sort - b.sort);

		const fellowshipActor = this.system.fellowshipActor;
		const fellowshipThemes = fellowshipActor
			? fellowshipActor.items.filter(
					(i) => i.type === "theme" || i.type === "story_theme",
				)
			: [];

		const allThemes = [...ownThemes, ...fellowshipThemes];

		for (const theme of allThemes) {
			const isFellowship = !!theme.system?.isFellowship;
			const fromFellowship = fellowshipThemes.includes(theme);
			const themeImg = theme.img;
			const themeTag = theme.system?.themeTag;
			if (themeTag?.name && themeTag?.isActive && !themeTag?.isScratched) {
				tags.push({
					id: theme.id,
					name: theme.name,
					displayName: theme.name,
					themeId: theme.id,
					themeName: theme.name,
					themeImg,
					type: "themeTag",
					isSingleUse: isFellowship,
					fromFellowship,
					state: "",
					states: ",positive",
				});
			}

			for (const tag of theme.system?.powerTags || []) {
				const tagData = toPlainObject(tag);
				if (tagData?.name && tagData?.isActive && !tagData?.isScratched) {
					tags.push({
						id: tagData.id,
						name: `${theme.name} - ${tagData.name}`,
						displayName: tagData.name,
						themeId: theme.id,
						themeName: theme.name,
						themeImg,
						type: tagData.type ?? "powerTag",
						isSingleUse: isFellowship,
						fromFellowship,
						state: "",
						states: isFellowship ? ",positive,negative" : ",positive,scratched",
					});
				}
			}

			for (const tag of theme.system?.weaknessTags || []) {
				const tagData = toPlainObject(tag);
				if (tagData?.name && tagData?.isActive && !tagData?.isScratched) {
					tags.push({
						id: tagData.id,
						name: `${theme.name} - ${tagData.name}`,
						displayName: tagData.name,
						themeId: theme.id,
						themeName: theme.name,
						themeImg,
						type: tagData.type ?? "weaknessTag",
						fromFellowship,
						state: "",
						states: ",negative,positive",
					});
				}
			}
		}

		return tags;
	}

	_buildBackpackRollTags() {
		const backpackItem = this.document.items.find((i) => i.type === "backpack");
		if (!backpackItem) return [];
		return (backpackItem.system.contents ?? [])
			.filter((item) => item.isActive && !item.isScratched)
			.map((item) => ({
				id: item.id,
				name: item.name,
				displayName: item.name,
				themeId: backpackItem.id,
				themeName: backpackItem.name,
				type: "backpack",
				state: "",
				states: ",positive,scratched",
			}));
	}

	_buildAllRollTags() {
		const relationshipTags = this._buildRelationshipRollTags();
		const themeTags = this._buildThemeRollTags();
		const backpackTags = this._buildBackpackRollTags();
		return [...relationshipTags, ...themeTags, ...backpackTags];
	}

	/**
	 * Add a moment of fulfillment entry
	 * @private
	 */
	static async #onAddMomentOfFulfillment() {
		const moments = foundry.utils.deepClone(this.system.mof ?? []);
		moments.push({ name: "", description: "" });
		await this.document.update({ "system.mof": moments });
	}

	/**
	 * Remove a moment of fulfillment entry
	 * @param {Event} _event        The triggering event
	 * @param {HTMLElement} target  The target element
	 * @private
	 */
	static async #onRemoveMomentOfFulfillment(_event, target) {
		const index = Number(target.dataset.index);
		if (!Number.isFinite(index)) return;
		const moments = foundry.utils.deepClone(this.system.mof ?? []);
		moments.splice(index, 1);
		await this.document.update({ "system.mof": moments });
	}

	/**
	 * Select/deselect a tag for rolling
	 * @param {Event} event        The triggering event
	 * @param {HTMLElement} target The target element
	 * @private
	 */
	static #onSelectTag(event, target) {
		// Prevent double clicks
		if (event.detail > 1) return;
		if (!this.document.isOwner) return;

		const actionTarget = target.closest?.("[data-tag-id]") ?? target;
		const tagId = actionTarget.dataset.tagId || actionTarget.dataset.id;
		if (!tagId) return;
		const tagType = actionTarget.dataset.tagType;
		const toScratch = event.shiftKey;
		const toScratchNoRoll = event.altKey;

		if (
			["powerTag", "weaknessTag", "themeTag", "relationshipTag"].includes(
				tagType,
			)
		) {
			const existingById = new Map(
				this.rollDialogInstance.characterTags.map((tag) => [tag.id, tag]),
			);
			for (const tag of this._buildAllRollTags()) {
				if (!existingById.has(tag.id)) {
					this.rollDialogInstance.characterTags.push(tag);
				}
			}
		}

		const tagFromSystem = this.system.allTags.find((t) => t.id === tagId);
		let existingTag = this.rollDialogInstance.characterTags.find(
			(t) => t.id === tagId,
		);
		if (!existingTag && tagFromSystem) {
			const tag = tagFromSystem.toObject();
			this.rollDialogInstance.characterTags.push(tag);
			existingTag = tag;
		}
		const tagRef = existingTag;
		const fallbackType = tagType || tagRef?.type || "powerTag";
		const isWeaknessTag = (tagRef?.type || fallbackType) === "weaknessTag";
		const isScratched = tagRef?.isScratched ?? false;
		const selected = !!existingTag?.state;

		// Scratch tag without rolling
		if (toScratchNoRoll) {
			if (isWeaknessTag) return;
			// Story tags are ActiveEffects, look them up directly
			if (tagType === "tag") {
				return this.toggleScratchTag({ id: tagId, type: tagType });
			}
			// Relationship tags are stored on the actor
			if (tagType === "relationshipTag") {
				return this.toggleScratchTag({ id: tagId, type: tagType });
			}
			if (!tagRef) return;
			return this.toggleScratchTag(tagRef);
		}

		// Can't select scratched tags, except weakness tags
		if (!selected && isScratched && !isWeaknessTag) return;

		// Add or remove the tag from the roll
		if (selected) {
			this.rollDialogInstance.setCharacterTagState(tagId, "");
		} else if (existingTag) {
			const nextState =
				existingTag.type === "weaknessTag"
					? toScratch
						? "positive"
						: "negative"
					: toScratch
						? "scratched"
						: "positive";
			this.rollDialogInstance.setCharacterTagState(tagId, nextState);
		} else if (tagRef) {
			if (!isWeaknessTag && isScratched) return;
			this.rollDialogInstance.addTag(tagRef, toScratch);
		}

		// Open the roll dialog if not already open, otherwise re-render it
		if (!this.rollDialogInstance.rendered) {
			this.renderRollDialog();
		} else {
			this.rollDialogInstance.render();
		}
		this.render();
	}

	/**
	 * Toggle scratch state of a play-mode tag
	 * @param {Event} event        The triggering event
	 * @param {HTMLElement} target The target element
	 * @private
	 */
	static #onScratchTag(event, target) {
		if (this._isEditMode) return;

		event.preventDefault();
		event.stopPropagation();

		const tagType = target.dataset.tagType;
		const tagId = target.dataset.tagId;
		if (!tagType || !tagId) return;

		switch (tagType) {
			case "powerTag": {
				const parentTheme = this.document.items.find(
					(i) =>
						["theme", "story_theme"].includes(i.type) &&
						i.system.powerTags?.some((t) => t.id === tagId),
				);
				if (!parentTheme) return;

				const tagToUpdate = parentTheme.system.powerTags.find(
					(t) => t.id === tagId,
				);
				if (!tagToUpdate) return;
				if (!tagToUpdate.isActive) return;

				return this.toggleScratchTag({
					id: tagToUpdate.id,
					type: "powerTag",
					isScratched: tagToUpdate.isScratched ?? false,
				});
			}
			case "themeTag": {
				const theme = this.document.items.get(tagId);
				if (!theme) return;

				return this.toggleScratchTag({
					id: theme.id,
					type: "themeTag",
					isScratched: theme.system.isScratched ?? false,
				});
			}
			case "backpack": {
				const backpack = this.document.items.find((i) => i.type === "backpack");
				if (!backpack) return;

				const tagToUpdate = backpack.system.contents?.find(
					(item) => item.id === tagId,
				);
				if (!tagToUpdate) return;
				if (!tagToUpdate.isActive) return;

				return this.toggleScratchTag({
					id: tagToUpdate.id,
					type: "backpack",
					isScratched: tagToUpdate.isScratched ?? false,
				});
			}
			default:
				return;
		}
	}

	/**
	 * Toggle the active state of a power or weakness tag in edit mode
	 * @param {Event} _event       The triggering event
	 * @param {HTMLElement} target The target element
	 * @private
	 */
	static async #onToggleTagActive(event, target) {
		const actionTarget = target.closest?.("[data-tag-id]") ?? target;
		const tagId = actionTarget.dataset.tagId || actionTarget.dataset.id;
		const tagName = actionTarget.dataset.text;
		const tagType = actionTarget.dataset.tagType;
		if (!tagId && !tagName) return;

		const scratch = !event.shiftKey;

		const item = this.resolveItem(target);
		if (!item) return;

		if (tagType === "themeTag") {
			await item.update({ "system.isScratched": !item.system.isScratched });
			return;
		}

		const findTag = (t) => (tagId && t.id === tagId) || t.name === tagName;

		if (tagType === "backpack") {
			const tags = (item.system.contents ?? []).map((t) => toPlainObject(t));
			const tag = tags.find(findTag);
			if (!tag) return;
			if (scratch) tag.isScratched = !tag.isScratched;
			else tag.isActive = !tag.isActive;
			await item.update({ "system.contents": tags });
			return;
		}

		const tagArrayKey =
			tagType === "weaknessTag" ? "weaknessTags" : "powerTags";
		const systemPath =
			item.type === "story_theme"
				? `system.theme.${tagArrayKey}`
				: `system.${tagArrayKey}`;

		const tags = (item.system[tagArrayKey] ?? []).map((t) => toPlainObject(t));
		const tag = tags.find(findTag);
		if (!tag) return;

		if (scratch) tag.isScratched = !tag.isScratched;
		else tag.isActive = !tag.isActive;
		await item.update({ [systemPath]: tags });
	}

	/**
	 * Toggle scratch state of a tag
	 * @param {object} tag The tag to toggle
	 * @private
	 */
	async toggleScratchTag(tag) {
		if (Hooks.call("litm.preTagScratched", this.document, tag) === false) {
			return;
		}
		const fellowshipActor = this.system.fellowshipActor;
		switch (tag.type) {
			case "powerTag": {
				const findTheme = (actor) =>
					actor?.items.find(
						(i) =>
							["theme", "story_theme"].includes(i.type) &&
							i.system.powerTags?.some((t) => t.id === tag.id),
					);
				const parentTheme =
					findTheme(this.document) ?? findTheme(fellowshipActor);
				if (!parentTheme) return;

				const isStoryTheme = parentTheme.type === "story_theme";
				const raw = parentTheme.system.toObject();
				const powerTags = isStoryTheme ? raw.theme.powerTags : raw.powerTags;
				const systemPath = isStoryTheme
					? "system.theme.powerTags"
					: "system.powerTags";
				const tagToUpdate = powerTags.find((t) => t.id === tag.id);
				if (tagToUpdate) {
					tagToUpdate.isScratched = !tagToUpdate.isScratched;
					await parentTheme.parent.updateEmbeddedDocuments("Item", [
						{ _id: parentTheme.id, [systemPath]: powerTags },
					]);
				}
				break;
			}
			case "themeTag": {
				const theme =
					this.document.items.get(tag.id) ?? fellowshipActor?.items.get(tag.id);
				if (!theme) return;
				const isScratched = theme.system.isScratched ?? false;
				await theme.parent.updateEmbeddedDocuments("Item", [
					{ _id: theme.id, "system.isScratched": !isScratched },
				]);
				break;
			}
			case "backpack": {
				const backpack = this.document.items.find((i) => i.type === "backpack");
				if (!backpack) return;

				const { contents } = backpack.system.toObject();
				const tagToUpdate = contents.find((i) => i.id === tag.id);
				if (tagToUpdate) {
					tagToUpdate.isScratched = !tagToUpdate.isScratched;
					await this.document.updateEmbeddedDocuments("Item", [
						{ _id: backpack.id, "system.contents": contents },
					]);
				}
				break;
			}
			case "tag": {
				const effect = this.document.effects.get(tag.id);
				if (!effect || effect.type !== "story_tag") return;
				const isScratched = effect.system.isScratched ?? false;
				await effect.update({ "system.isScratched": !isScratched });
				break;
			}
			case "relationshipTag": {
				const actorId = tag.id.replace("relationship-", "");
				const relationships = foundry.utils.deepClone(
					this.system.relationships ?? [],
				);
				const entry = relationships.find((r) => r.actorId === actorId);
				if (!entry) return;
				entry.isScratched = !entry.isScratched;
				await this.document.update({ "system.relationships": relationships });
				break;
			}
			default:
				return;
		}
		Hooks.callAll("litm.tagScratched", this.document, tag);
	}

	/**
	 * Gain improvement from using a weakness tag
	 * @param {object} tag The weakness tag
	 */
	async gainImprovement(tag) {
		const parentTheme = this.document.items.find(
			(i) =>
				["theme", "story_theme"].includes(i.type) &&
				i.system.weaknessTags?.some((t) => t.id === tag.id),
		);
		if (parentTheme) {
			await this.document.updateEmbeddedDocuments("Item", [
				{
					_id: parentTheme.id,
					"system.improve.value": parentTheme.system.improve.value + 1,
				},
			]);
		}
	}

	/**
	 * View an actor sheet
	 * @param {Event} event        The triggering event
	 * @param {HTMLElement} target The target element
	 * @private
	 */
	static #onViewActor(_event, target) {
		const actorId = target.dataset.actorId;
		if (!actorId) return;
		const actor = game.actors.get(actorId);
		actor?.sheet.render(true);
	}

	/**
	 * Open theme advancement modal for a theme
	 * @param {Event} event        The triggering event
	 * @param {HTMLElement} target The target element
	 * @private
	 */
	static #onOpenThemeAdvancement(_event, target) {
		const item = this.resolveItem(target);
		if (!item) return;

		const fellowshipEl = target.closest("[data-fellowship-actor-id]");
		const actorId =
			fellowshipEl?.dataset?.fellowshipActorId ?? this.document.id;

		new game.litm.ThemeAdvancementApp({
			actorId,
			themeId: item.id,
		}).render(true);
	}

	/**
	 * Resolve an item from the hero or a linked fellowship actor
	 * @param {HTMLElement} element An element inside the item container
	 * @returns {Item|null}
	 * @private
	 */
	resolveItem(element) {
		const itemEl =
			element.closest("[data-item-id]") ?? element.closest(".item");
		const itemId = itemEl?.dataset?.itemId ?? itemEl?.dataset?.id;
		if (!itemId) return null;

		const fellowshipEl = element.closest("[data-fellowship-actor-id]");
		if (fellowshipEl) {
			const actor = game.actors.get(fellowshipEl.dataset.fellowshipActorId);
			return actor?.items.get(itemId) ?? null;
		}

		return this.document.items.get(itemId) ?? null;
	}

	/**
	 * Adjust a progress track (promise or theme track)
	 * @param {Event} event        The triggering event
	 * @param {HTMLElement} target The target element
	 * @private
	 */
	static async #onAdjustProgress(_event, target) {
		const button = target.closest("button") ?? target;
		const boxIndex = parseInt(button.dataset.index, 10);
		if (Number.isNaN(boxIndex)) return;

		const container = button.closest(
			".progress-display, .promise-display, .progress-buttons, .progress-boxes",
		);
		if (!container) return;
		const attrib = container.dataset.id;
		if (!attrib) return;

		// Check if it's an effect (story tag/status)
		const effectId = button.dataset.effectId;

		if (effectId) {
			// Handle effect tiers (boolean array)
			const effect = this.document.effects.get(effectId);
			if (!effect) return;

			const currentTiers = foundry.utils.getProperty(effect, "system.tiers");
			if (!Array.isArray(currentTiers)) return;

			// Only use toggle logic for status effects; otherwise, use progress logic
			const isStatus = effect.type === "status_card";
			let newTiers;
			if (isStatus) {
				// Toggle only the clicked tier for statuses
				newTiers = currentTiers.map((v, idx) => (idx === boxIndex ? !v : v));
			} else {
				// Progress logic for everything else
				newTiers = currentTiers.map((_, idx) => idx <= boxIndex);
			}
			await effect.update({ "system.tiers": newTiers });
			return;
		}
		// Check if it's an item or the actor (including fellowship items)
		const item = this.resolveItem(button);

		const doc = item || this.document;
		const currentValue = foundry.utils.getProperty(doc, attrib);

		// Calculate new value:
		// If clicking a checked box, drop to that level (uncheck it and above).
		// Otherwise set to the clicked box's index + 1.
		const newValue = boxIndex < currentValue ? boxIndex : boxIndex + 1;

		const updateData = {};
		foundry.utils.setProperty(updateData, attrib, newValue);
		await doc.update(updateData);
	}

	/* -------------------------------------------- */
	/*  Drag & Drop                                 */
	/* -------------------------------------------- */

	/** @override */
	async _onDropItem(event, item) {
		if (!["backpack", "theme", "story_theme"].includes(item.type)) return;

		// Check if already owned (for sorting)
		if (this.actor.uuid === item.parent?.uuid) {
			return this._onSortItem(event, item);
		}

		const itemData = item.toObject();

		// Fellowship themes cannot be dropped onto heroes — use fellowship actors
		if (item.type === "theme" && item.system.isFellowship) {
			return ui.notifications.warn(
				game.i18n.localize("LITM.Ui.warn_fellowship_use_actor"),
			);
		}

		// Check theme limit (max 4)
		if (item.type === "theme") {
			const numThemes = this.document.items.filter(
				(i) => i.type === "theme" && !i.system.isFellowship,
			).length;
			if (numThemes >= 4) {
				return ui.notifications.warn(
					game.i18n.localize("LITM.Ui.warn_theme_limit"),
				);
			}
			return this.document.createEmbeddedDocuments("Item", [itemData]);
		}

		// Story themes have no limit - add directly
		if (item.type === "story_theme") {
			return this.document.createEmbeddedDocuments("Item", [itemData]);
		}

		// Check backpack limit (max 1)
		if (item.type === "backpack") {
			const numBackpacks = this.document.items.filter(
				(i) => i.type === "backpack",
			).length;
			if (numBackpacks >= 1) {
				return this.#handleLootDrop(item);
			}
			return this.document.createEmbeddedDocuments("Item", [itemData]);
		}

		return super._onDropItem(event, item);
	}

	/** @override */
	async _onDropActor(_event, _actor) {
		// Fellowship linking is automatic — no manual drops needed
	}

	/**
	 * Handle dropping a backpack when one already exists (loot transfer)
	 * @param {Item} item The backpack item being dropped
	 * @private
	 */
	async #handleLootDrop(item) {
		const { contents } = item.system;
		const content = await foundry.applications.handlebars.renderTemplate(
			"systems/litm/templates/apps/loot-dialog.html",
			{
				contents,
				cssClass: "litm--loot-dialog",
			},
		);
		const chosenLoot = await foundry.applications.api.DialogV2.prompt({
			window: { title: game.i18n.localize("LITM.Ui.item_transfer_title") },
			content,
			ok: {
				icon: "fas fa-check",
				label: game.i18n.localize("LITM.Terms.transfer"),
				callback: (_event, button) => {
					return Array.from(
						button.form.querySelectorAll("input[type=checkbox]:checked"),
					).map((el) => el.value);
				},
			},
		});

		if (!chosenLoot || !chosenLoot.length) return;

		const loot = contents.filter((i) => chosenLoot.includes(i.id));
		const backpack = this.document.items.find((i) => i.type === "backpack");

		if (!backpack) {
			throw new Error("LITM.Ui.error_no_backpack");
		}

		// Add the loot to the backpack
		await backpack.update({
			"system.contents": [...this.system.backpack, ...loot],
		});

		// Remove the loot from the source item
		await item.update({
			"system.contents": contents.filter((i) => !chosenLoot.includes(i.id)),
		});

		ui.notifications.info(
			game.i18n.format("LITM.Ui.item_transfer_success", {
				items: loot.map((i) => i.name).join(", "),
			}),
		);

		backpack.sheet.render(true);
	}

	/* -------------------------------------------- */
	/*  Helper Methods                              */
	/* -------------------------------------------- */

	/**
	 * Update the roll dialog with new data
	 * @param {object} data Data to update
	 */
	updateRollDialog(data) {
		this.#rollDialog?.receiveUpdate(data);
	}

	/**
	 * Render the roll dialog
	 * @param {object} options Render options
	 */
	renderRollDialog(options = {}) {
		const activeOwnerId =
			this.document.getFlag("litm", "rollDialogOwner")?.ownerId || null;
		const activeOwner = activeOwnerId ? game.users.get(activeOwnerId) : null;
		const hasActorPermission =
			game.user.isGM || this.document.testUserPermission(game.user, "OWNER");
		const canClaimOwnership =
			activeOwnerId === game.user.id ||
			(!activeOwnerId && hasActorPermission) ||
			(!activeOwner?.active && hasActorPermission);
		const isOwner = canClaimOwnership;

		if (options.toggle && this.rollDialogInstance.rendered) {
			this.rollDialogInstance.close();
			return;
		}

		if (isOwner) {
			this.rollDialogInstance.ownerId = game.user.id;
			const shouldBroadcast = activeOwnerId !== game.user.id;
			if (shouldBroadcast) this.rollDialogInstance.updatePresence(true);
		} else {
			this.rollDialogInstance.ownerId = activeOwnerId;
			Sockets.dispatch("requestRollDialogSync", {
				actorId: this.document.id,
			});
		}

		this.rollDialogInstance.render(true);
	}

	/**
	 * Reset the roll dialog
	 */
	resetRollDialog() {
		this.rollDialogInstance.reset();
		this.render();
	}
}
