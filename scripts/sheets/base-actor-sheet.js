import { Sockets } from "../system/sockets.js";
import { confirmDelete, enrichHTML, toPlainObject } from "../utils.js";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Base actor sheet class for Legend in the Mist
 * Provides common functionality for all actor sheet types
 */
export class LitmActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
	/**
	 * Available sheet modes
	 * @static
	 * @enum {number}
	 */
	static MODES = Object.freeze({
		PLAY: 0,
		EDIT: 1,
	});

	static PORTRAIT_WIDTH = 450;
	static LANDSCAPE_WIDTH = 800;

	static DEFAULT_OPTIONS = {
		position: {
			width: 450,
			height: "auto",
		},
		window: {
			controls: [
				{
					icon: "fa-solid fa-passport",
					action: "copyUuid",
					label: "APPLICATION.ACTIONS.CopyUuid",
				},
			],
		},
	};

	/**
	 * Current sheet mode
	 * @type {number}
	 */
	_mode = null;

	/**
	 * Get the current edit mode state
	 * @type {boolean}
	 * @protected
	 */
	get _isEditMode() {
		return this._mode === LitmActorSheet.MODES.EDIT;
	}

	/**
	 * Convenient reference to the actor's system data
	 * @type {TypeDataModel}
	 * @protected
	 */
	get system() {
		return this.document.system;
	}

	/** @override */
	_configureRenderParts(options) {
		const parts = super._configureRenderParts(options);

		// Dynamically set the template based on edit mode
		const editTemplate = this.constructor._getEditModeTemplate();
		const playTemplate = this.constructor._getPlayModeTemplate();

		if (editTemplate && playTemplate && parts.form) {
			const template = this._isEditMode ? editTemplate : playTemplate;
			parts.form.template = template;
		}

		return parts;
	}

	/** @override */
	_configureRenderOptions(options) {
		super._configureRenderOptions(options);

		// Non-owners are always locked to play mode
		if (!this.document.isOwner) {
			this._mode = this.constructor.MODES.PLAY;
			return options;
		}

		// Set initial mode - use passed mode, or fall back to existing, or default to PLAY
		const { mode } = options;
		this._mode = mode ?? this._mode ?? this.constructor.MODES.PLAY;

		return options;
	}

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.hasCustomImage = this.document.img !== "icons/svg/mystery-man.svg";
		return context;
	}

	/** @override */
	async _onRender(context, options) {
		await super._onRender(context, options);
		this._renderModeToggle();
		this.element.classList.toggle(
			"editable",
			this._isEditMode && this.options.editable,
		);
	}

	/**
	 * Render the mode toggle button state
	 * @protected
	 */
	_renderModeToggle() {
		// Non-owners don't get the edit/play toggle
		if (!this.document.isOwner) return;

		const { element } = this;

		const label = game.i18n.localize(
			`LITM.Ui.${
				this._isEditMode ? "switch_to_play_mode" : "switch_to_edit_mode"
			}`,
		);

		const toReplace =
			element.querySelector("[data-action='changeMode']") ??
			element.querySelector(".window-header [data-action='copyUuid']");

		const toggleButton = Object.assign(document.createElement("button"), {
			ariaLabel: label,
			type: "button",
			className: `header-control icon fa-solid ${
				this._isEditMode ? "fa-dice-d20" : "fa-pen-to-square"
			}`,
			onclick: (event) => this._onChangeSheetMode(event, toggleButton),
		});
		toggleButton.dataset.action = "changeMode";
		toggleButton.dataset.tooltip = label;
		toggleButton.dataset.tour = "edit-mode-toggle";

		if (toReplace) toReplace.replaceWith(toggleButton);
		else {
			this.element.querySelector(".window-header").appendChild(toggleButton);
		}
	}

	/**
	 * Get the edit mode template path
	 * Override in subclasses
	 * @returns {string|null}
	 * @protected
	 */
	static _getEditModeTemplate() {
		return null;
	}

	/**
	 * Get the play mode template path
	 * Override in subclasses
	 * @returns {string|null}
	 * @protected
	 */
	static _getPlayModeTemplate() {
		return null;
	}

	/**
	 * Parse embedded item and effect updates from form submit data.
	 * Extracts keys prefixed with "items." and "effects." into separate maps,
	 * normalizes effect data, and performs the embedded document updates.
	 * @param {object} submitData  The form data object (mutated: embedded keys are removed)
	 * @returns {Promise<void>}
	 * @protected
	 */
	async _updateEmbeddedFromForm(submitData) {
		const itemMap = {};
		const effectMap = {};

		for (const [key, value] of Object.entries(submitData)) {
			if (key.startsWith("items.")) {
				delete submitData[key];
				const [_, _id, subkey, ...rest] = key.split(".");
				itemMap[_id] ??= {};
				itemMap[_id][subkey] ??= {};
				if (rest.length === 0) itemMap[_id][subkey] = value;
				else itemMap[_id][subkey][rest.join(".")] = value;
			}

			if (key.startsWith("effects.")) {
				delete submitData[key];
				const [_, _id, subkey, ...rest] = key.split(".");
				effectMap[_id] ??= {};
				effectMap[_id][subkey] ??= {};
				if (rest.length === 0) effectMap[_id][subkey] = value;
				else effectMap[_id][subkey][rest.join(".")] = value;
			}
		}

		const ownItems = [];
		const foreignItems = [];
		for (const [id, data] of Object.entries(itemMap)) {
			const entry = { _id: id, ...data };
			if (this.document.items.has(id)) ownItems.push(entry);
			else foreignItems.push(entry);
		}
		if (ownItems.length) {
			await this.document.updateEmbeddedDocuments("Item", ownItems);
		}
		if (foreignItems.length) {
			const fellowshipActor = this.document.system.fellowshipActor;
			if (fellowshipActor) {
				await fellowshipActor.updateEmbeddedDocuments("Item", foreignItems);
			}
		}

		const effectsToUpdate = Object.entries(effectMap).map(([id, data]) => ({
			_id: id,
			...data,
		}));
		for (const effect of effectsToUpdate) {
			const system = effect.system;
			if (system && system.tierValue !== undefined) {
				const raw = Number(system.tierValue);
				const value = Number.isFinite(raw) ? Math.max(0, Math.min(6, raw)) : 0;
				system.tiers = Array(6)
					.fill(false)
					.map((_, index) => index < value);
				delete system.tierValue;
			}
			const existingEffect = this.document.effects.get(effect._id);
			const effectType = existingEffect?.type;
			if (effectType === "story_tag") {
				effect.system ??= {};
				if (effect.system.isSingleUse === undefined) {
					effect.system.isSingleUse = false;
				}
				effect.system.isScratched ??= false;
			}
			if (effectType === "status_card") {
				effect.system ??= {};
				if (!Array.isArray(effect.system.tiers)) {
					effect.system.tiers = new Array(6).fill(false);
				}
			}
		}
		if (effectsToUpdate.length) {
			await this.document.updateEmbeddedDocuments(
				"ActiveEffect",
				effectsToUpdate,
			);
		}
	}

	/**
	 * Handle toggling secret reveal in both edit and play mode.
	 * In edit mode, Foundry handles this natively via prose-mirror.
	 * In play mode, we find the secret by index within the raw content
	 * to avoid issues with Foundry's id-based regex when multiple
	 * secrets share a field.
	 * @param {Event} event
	 * @protected
	 */
	_onRevealSecret(event) {
		const editor = event.target.closest("prose-mirror");
		if (editor?.name) return super._onRevealSecret(event);

		const container = event.target.closest("[data-field]");
		if (!container) return;

		const field = container.dataset.field;
		const content = foundry.utils.getProperty(this.document, field);
		if (!content) return;

		// Find which secret-block was clicked by index within the container
		const allBlocks = [...container.querySelectorAll("secret-block")];
		const clickedBlock = event.target.closest("secret-block");
		const index = allBlocks.indexOf(clickedBlock);
		if (index === -1) return;

		// Toggle the nth <section...class="secret"...> in the raw content.
		// Attributes may appear in any order (id before class, etc.)
		let current = 0;
		const modified = content.replace(
			/<section([^>]*)\bclass="secret(\s+revealed)?"([^>]*)>/g,
			(match, before, revealed, after) => {
				if (current++ !== index) return match;
				const newClass = revealed ? "secret" : "secret revealed";
				return `<section${before}class="${newClass}"${after}>`;
			},
		);
		this.document.update({ [field]: modified });
	}

	/**
	 * Prepare vignette items with enriched HTML and group by type.
	 * @param {object} [options]
	 * @param {string} [options.excludeId]  Vignette ID to exclude from grouping
	 * @returns {Promise<{vignettes: object[], vignettesByType: object[], excluded: object|null}>}
	 * @protected
	 */
	async _prepareVignettes({ excludeId } = {}) {
		const vignettes = await Promise.all(
			this.document.items
				.filter((i) => i.type === "vignette")
				.sort((a, b) => a.sort - b.sort)
				.map(async (i) => {
					const itemData = i.toObject();
					itemData.system.threat = await enrichHTML(
						itemData.system.threat,
						this.document,
					);
					itemData.system.consequences = await Promise.all(
						itemData.system.consequences.map((c) =>
							enrichHTML(c, this.document),
						),
					);
					return itemData;
				}),
		);

		const excluded = excludeId
			? (vignettes.find((v) => v._id === excludeId) ?? null)
			: null;

		const toGroup = excludeId
			? vignettes.filter((v) => v._id !== excludeId)
			: vignettes;

		const grouped = toGroup.reduce((acc, vignette) => {
			const type = vignette.name || "";
			if (!acc[type]) acc[type] = [];
			acc[type].push(vignette);
			return acc;
		}, {});

		const sortedTypes = Object.keys(grouped).sort((a, b) => {
			if (!a && b) return 1;
			if (a && !b) return -1;
			return a.localeCompare(b);
		});

		const vignettesByType = sortedTypes.map((type) => ({
			type: type || "",
			vignettes: grouped[type],
		}));

		return { vignettes, vignettesByType, excluded };
	}

	/**
	 * Prepare a theme or story theme item for template rendering.
	 * Converts embedded TagData models to plain objects and attaches a themeTag.
	 * @param {Item} item A theme or story_theme item document
	 * @returns {object} Plain object ready for Handlebars
	 * @protected
	 */
	_prepareThemeData(item) {
		const data = item.toObject();
		for (const key of ["powerTags", "weaknessTags"]) {
			if (Array.isArray(item.system[key])) {
				data.system[key] = item.system[key].map((tag) => {
					const obj = toPlainObject(tag);
					// Use derived value for isScratched (e.g. weakness tags can't be scratched)
					if (tag.isScratched !== undefined) obj.isScratched = tag.isScratched;
					return obj;
				});
			}
		}
		data.themeTag = {
			id: data._id,
			name: data.name,
			type: "themeTag",
			isScratched: data.system.isScratched,
		};
		return data;
	}

	/**
	 * Prepare story tags and status cards from the actor's applied effects.
	 * Filters by type and visibility, then maps to a uniform shape for templates.
	 * @returns {object[]}
	 * @protected
	 */
	_prepareStoryTags() {
		const effects = this.document.effects ?? [];
		return effects
			.filter((e) => e.type === "story_tag" || e.type === "status_card")
			.filter((e) => game.user.isGM || !(e.system?.isHidden ?? false))
			.map((e) => {
				const isStatus = e.type === "status_card";
				return {
					id: e.id,
					name: e.name,
					type: isStatus ? "status" : "tag",
					effectType: e.type,
					value: isStatus ? (e.system?.currentTier ?? 0) : 1,
					isScratched: e.system?.isScratched ?? false,
					hidden: e.system?.isHidden ?? false,
					system: e.system,
				};
			});
	}

	/**
	 * Handle drop events, intercepting custom tag/status types before
	 * standard Foundry document routing.
	 * @override
	 */
	async _onDrop(event) {
		const data =
			foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
		if (data.type === "tag" || data.type === "status") {
			return this._onDropTagOrStatus(event, data);
		}
		return super._onDrop(event);
	}

	/**
	 * Handle dropping a custom tag or status onto this actor sheet.
	 * Creates a story_tag or status_card ActiveEffect on the actor.
	 * @param {DragEvent} event   The drop event
	 * @param {object} data       The parsed drag data
	 * @returns {Promise<void>}
	 * @protected
	 */
	async _onDropTagOrStatus(_event, data) {
		if (!this.document.isOwner || !this.isEditable) return;

		// Ignore drops from the same actor (intra-sheet drag is for sorting, not adding)
		if (data.sourceActorId && data.sourceActorId === this.document.id) return;

		const isStatus = data.type === "status";
		const droppedName = data.name;

		// For statuses, check if one with the same name already exists and stack
		if (isStatus && droppedName) {
			const existing = this.document.effects.find(
				(e) =>
					e.type === "status_card" &&
					e.name.toLowerCase() === droppedName.toLowerCase(),
			);
			if (existing) {
				const droppedTier = Number.parseInt(data.value, 10) || 1;
				const newTiers = existing.system.calculateMark(droppedTier);
				await existing.update({ "system.tiers": newTiers });
				this._notifyStoryTags();
				return;
			}
		}

		const tiers = Array.isArray(data.values)
			? data.values.map(
					(value) => value !== null && value !== false && value !== "",
				)
			: new Array(6).fill(false);
		const isScratched = data.isScratched ?? false;
		const localizedName = isStatus
			? game.i18n.localize("LITM.Terms.status")
			: game.i18n.localize("LITM.Terms.tag");
		const effectData = {
			name: data.name ?? localizedName,
			type: isStatus ? "status_card" : "story_tag",
			system: isStatus ? { tiers } : { isScratched },
		};

		await this.document.createEmbeddedDocuments("ActiveEffect", [effectData]);
		this._notifyStoryTags();
	}

	/**
	 * Notify the story tags app and other clients that story tags changed.
	 * @protected
	 */
	_notifyStoryTags() {
		game.litm.storyTags?.render();
		Sockets.dispatch("storyTagsRender");
	}

	/**
	 * Add a new story tag or status card to this actor.
	 * @param {Event} _event
	 * @param {HTMLElement} target
	 * @protected
	 */
	static async _onAddStoryTag(_event, target) {
		const tagType = target.dataset.tagType || "tag";
		const isStatus = tagType === "status";

		const localizedName = isStatus
			? game.i18n.localize("LITM.Terms.status")
			: game.i18n.localize("LITM.Terms.tag");
		await this.document.createEmbeddedDocuments("ActiveEffect", [
			{
				name: localizedName,
				type: isStatus ? "status_card" : "story_tag",
				system: isStatus
					? { tiers: [false, false, false, false, false, false] }
					: { isSingleUse: false, isScratched: false },
			},
		]);

		this._notifyStoryTags();
	}

	/**
	 * Common form submit handler: process embedded updates, notify story tags, update document.
	 * @param {Event} _event
	 * @param {HTMLFormElement} _form
	 * @param {FormDataExtended} formData
	 * @protected
	 */
	static async _onSubmitActorForm(_event, _form, formData) {
		const submitData = formData.object;
		await this._updateEmbeddedFromForm(submitData);
		this._notifyStoryTags();
		await this.document.update(submitData);
	}

	/**
	 * Remove an active effect from this actor.
	 * @param {Event} _event
	 * @param {HTMLElement} target
	 * @protected
	 */
	static async _onRemoveEffect(_event, target) {
		const effectId = target.dataset.id;
		const effect = this.document.effects.get(effectId);
		await effect?.delete();

		this._notifyStoryTags();
	}

	/**
	 * Toggle the hidden state of a story tag / status card effect.
	 * @param {Event} _event
	 * @param {HTMLElement} target
	 * @protected
	 */
	static async _onToggleEffectVisibility(_event, target) {
		const effectId = target.dataset.id;
		const effect = this.document.effects.get(effectId);
		if (!effect) return;
		await effect.update({ "system.isHidden": !effect.system.isHidden });
		this._notifyStoryTags();
	}

	/**
	 * Open an embedded item's sheet for editing.
	 * @param {Event} _event
	 * @param {HTMLElement} target
	 * @protected
	 */
	static _onEditItem(_event, target) {
		const actionTarget = target.closest?.("[data-item-id]") ?? target;
		const itemId = actionTarget?.dataset?.itemId;
		if (!itemId) return;
		const item = this.document.items.get(itemId);
		item?.sheet.render(true);
	}

	/**
	 * Delete an embedded item after user confirmation.
	 * @param {Event} _event
	 * @param {HTMLElement} target
	 * @protected
	 */
	static async _onRemoveItem(_event, target) {
		const itemId = target.dataset.itemId;
		const item = this.document.items.get(itemId);
		if (!item) return;

		if (!(await confirmDelete(`TYPES.Item.${item.type}`))) return;
		await item.delete();
	}

	/**
	 * Handle the user changing the sheet mode
	 * @param {Event} event         Triggering click event
	 * @param {HTMLElement} target  Button that was clicked
	 * @protected
	 */
	async _onChangeSheetMode(event, _target = event.currentTarget) {
		// Submit with current mode, then toggle
		await this.submit();
		this._mode = this._isEditMode
			? LitmActorSheet.MODES.PLAY
			: LitmActorSheet.MODES.EDIT;
		return this.render(true);
	}
}
