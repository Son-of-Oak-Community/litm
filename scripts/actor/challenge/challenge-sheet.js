import { LitmActorSheet } from "../../sheets/base-actor-sheet.js";
import { confirmDelete, enrichHTML } from "../../utils.js";

/**
 * Challenge sheet for Legend in the Mist
 * Represents NPCs, obstacles, and challenges for heroes to overcome
 */
export class ChallengeSheet extends LitmActorSheet {
	/** @override */
	static DEFAULT_OPTIONS = {
		classes: ["litm", "litm-challenge-sheet"],
		tag: "form",
		actions: {
			addLimit: ChallengeSheet.#onAddLimit,
			removeLimit: ChallengeSheet.#onRemoveLimit,
			increaseLimit: ChallengeSheet.#onIncreaseLimit,
			decreaseLimit: ChallengeSheet.#onDecreaseLimit,
			addVignette: ChallengeSheet.#onAddVignette,
			removeVignette: ChallengeSheet.#onRemoveVignette,
			editVignette: ChallengeSheet.#onEditVignette,
			adjustRating: ChallengeSheet.#onAdjustRating,
			addMight: ChallengeSheet.#onAddMight,
			removeMight: ChallengeSheet.#onRemoveMight,
		},
		form: {
			handler: ChallengeSheet.#onSubmitChallengeForm,
			submitOnChange: true,
			closeOnSubmit: false,
		},
		window: {
			icon: "fa-solid fa-dragon",
			resizable: true,
			controls: [],
		},
		dragDrop: [{ dropSelector: null }],
	};

	/** @override */
	static PARTS = {
		form: {
			template: "systems/litm/templates/actor/challenge.html",
			scrollable: [""],
		},
	};

	/** @override */
	static _getEditModeTemplate() {
		return "systems/litm/templates/actor/challenge.html";
	}

	/** @override */
	static _getPlayModeTemplate() {
		return "systems/litm/templates/actor/challenge-play.html";
	}

	/**
	 * Flag to prevent hook feedback loops during effect sync.
	 * @type {boolean}
	 */
	_syncing = false;

	/* -------------------------------------------- */
	/*  Rendering                                   */
	/* -------------------------------------------- */

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		// Enrich HTML fields for display (but not for editing)
		const enrichedSpecialFeatures = await enrichHTML(
			this.system.specialFeatures,
			this.document,
		);
		const enrichedDescription = await enrichHTML(
			this.system.description,
			this.document,
		);

		// Enrich the tags string for play mode display
		const enrichedTags = await enrichHTML(
			this.system.tags || "",
			this.document,
		);

		// Prepare vignette items
		const { vignettes, vignettesByType } = await this._prepareVignettes();

		return {
			...context,
			isGM: game.user.isGM,
			isOwner: this.document.isOwner,
			isEditMode: this._isEditMode,
			enriched: {
				description: enrichedDescription,
				specialFeatures: enrichedSpecialFeatures,
				tags: enrichedTags,
			},
			tagsString: this.system.tags || "",
			tagTypeOptions: { tag: "LITM.Terms.tag", status: "LITM.Terms.status" },
			vignettes,
			vignettesByType,
			displayVignettes: vignettes,
			challenges: this.system.challenges,
			limits: await Promise.all(
				(this.system.limits || []).map(async (limit) => ({
					...limit,
					isImpossible: limit.max === "~",
					enrichedOutcome: await enrichHTML(limit.outcome, this.document),
				})),
			),
			rating: this.system.rating,
			might: await Promise.all(
				(this.system.might || []).map(async (entry) => ({
					...entry,
					enrichedDescription: await enrichHTML(
						entry.description,
						this.document,
					),
				})),
			),
			mightOptions: {
				origin: "LITM.Terms.origin",
				adventure: "LITM.Terms.adventure",
				greatness: "LITM.Terms.greatness",
			},
		};
	}

	/* -------------------------------------------- */
	/*  Tag String ↔ Effects                        */
	/* -------------------------------------------- */

	#effectsToTagString() {
		const effects = this.document.effects.filter(
			(e) => e.type === "story_tag" || e.type === "status_card",
		);
		return effects
			.map((e) => {
				if (e.type === "status_card") {
					const tier = e.system?.currentTier ?? 0;
					return `[${e.name}-${tier}]`;
				}
				return `[${e.name}]`;
			})
			.join(" ");
	}

	async #syncEffectsFromString(tagsString) {
		const matches = Array.from(tagsString.matchAll(CONFIG.litm.tagStringRe));
		const parsed = matches.map(([_, name, separator, value]) => ({
			name,
			isStatus: separator === "-",
			tier: Number.parseInt(value, 10) || 0,
		}));

		const toDelete = this.document.effects
			.filter((e) => e.type === "story_tag" || e.type === "status_card")
			.map((e) => e.id);

		if (toDelete.length) {
			await this.document.deleteEmbeddedDocuments("ActiveEffect", toDelete);
		}

		if (parsed.length) {
			await this.document.createEmbeddedDocuments(
				"ActiveEffect",
				parsed.map((t) => ({
					name: t.name,
					type: t.isStatus ? "status_card" : "story_tag",
					system: t.isStatus
						? {
								tiers: Array(6)
									.fill(false)
									.map((_, i) => i + 1 === t.tier),
							}
						: { isScratched: false, isSingleUse: false },
				})),
			);
		}

		this._notifyStoryTags();
	}

	/* -------------------------------------------- */
	/*  External Effect Hooks                       */
	/* -------------------------------------------- */

	/**
	 * One-time migration: sync tags string and effects on first render.
	 * @private
	 */
	async #migrateTagsAndEffects() {
		// Ensure system.tags is populated from effects if empty (reverse migration)
		if (!this.system.tags) {
			const tagString = this.#effectsToTagString();
			if (tagString) {
				await this.document.update({ "system.tags": tagString });
			}
		}

		// Ensure effects exist from string (forward migration)
		if (this.system.tags?.length && !this._syncing) {
			const hasEffects = this.document.effects.some(
				(e) => e.type === "story_tag" || e.type === "status_card",
			);
			if (!hasEffects) {
				this._syncing = true;
				await this.#syncEffectsFromString(this.system.tags);
				this._syncing = false;
			}
		}
	}

	/** @override */
	_onFirstRender(context, options) {
		super._onFirstRender(context, options);
		if (this.document.isOwner) {
			this.#migrateTagsAndEffects().catch((err) =>
				console.error("litm | Failed to migrate challenge tags/effects", err),
			);
		}
		this._hookIds = {
			create: Hooks.on("createActiveEffect", (effect) => {
				if (effect.parent !== this.document) return;
				if (this._syncing) return;
				if (!this.document.isOwner) return;
				if (effect.type !== "story_tag" && effect.type !== "status_card")
					return;
				const tag =
					effect.type === "status_card"
						? `[${effect.name}-${effect.system?.currentTier ?? 1}]`
						: `[${effect.name}]`;
				const current = this.system.tags || "";
				const separator = current.length ? " " : "";
				this.document.update({
					"system.tags": current + separator + tag,
				});
			}),
			update: Hooks.on("updateActiveEffect", (effect) => {
				if (effect.parent !== this.document) return;
				if (this._syncing) return;
				if (!this.document.isOwner) return;
				if (effect.type !== "status_card") return;
				const name = effect.name;
				const newTier = effect.system?.currentTier ?? 0;
				let tags = this.system.tags || "";
				const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
				const re = new RegExp(`([\\[{]${escaped})[\\s\\-:](\\d+)([\\]}])`, "i");
				if (re.test(tags)) {
					tags = tags.replace(re, `$1-${newTier}$3`);
					this.document.update({ "system.tags": tags });
				}
			}),
			delete: Hooks.on("deleteActiveEffect", (effect) => {
				if (effect.parent !== this.document) return;
				if (this._syncing) return;
				if (!this.document.isOwner) return;
				if (effect.type !== "story_tag" && effect.type !== "status_card")
					return;
				const name = effect.name;
				const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
				let tags = this.system.tags || "";
				// Remove [name], {name}, [name-N], {name-N}
				const re = new RegExp(`[\\[{]${escaped}(?:[\\s\\-:]\\d+)?[\\]}]`, "gi");
				tags = tags.replace(re, "").trim();
				// Clean up orphaned separators
				tags = tags
					.replace(/,\s*,/g, ",")
					.replace(/^\s*,|,\s*$/g, "")
					.trim();
				this.document.update({ "system.tags": tags });
			}),
		};
	}

	/** @override */
	_onClose(options) {
		if (this._hookIds) {
			Hooks.off("createActiveEffect", this._hookIds.create);
			Hooks.off("updateActiveEffect", this._hookIds.update);
			Hooks.off("deleteActiveEffect", this._hookIds.delete);
		}
		return super._onClose(options);
	}

	/* -------------------------------------------- */
	/*  Mode Switching                              */
	/* -------------------------------------------- */

	/** @override */
	async _onChangeSheetMode(_event, _target) {
		const wasEditMode = this._isEditMode;
		if (wasEditMode) {
			// Submit the edit form to persist system.tags
			await this.submit();
			// Sync effects from the persisted string
			this._syncing = true;
			await this.#syncEffectsFromString(this.system.tags ?? "");
			this._syncing = false;
		}
		// Toggle mode and re-render
		this._mode = this._isEditMode
			? this.constructor.MODES.PLAY
			: this.constructor.MODES.EDIT;
		return this.render(true);
	}

	/* -------------------------------------------- */
	/*  Event Handlers & Actions                    */
	/* -------------------------------------------- */

	static async #onSubmitChallengeForm(_event, _form, formData) {
		const submitData = formData.object;

		await this._updateEmbeddedFromForm(submitData);

		// Notify story tags of effect changes
		this._notifyStoryTags();

		const limits = foundry.utils.getProperty(submitData, "system.limits");
		if (Array.isArray(limits)) {
			limits.forEach((limit) => {
				if (limit.max === "~") {
					limit.value = Number(limit.value || 0);
				} else {
					limit.max = String(Math.max(1, Number(limit.max || 1)));
					limit.value = Math.min(Number(limit.value || 0), Number(limit.max));
				}
			});
		}

		// Normalize might entries if they exist
		const might = foundry.utils.getProperty(submitData, "system.might");
		if (Array.isArray(might)) {
			submitData["system.might"] = might.map((entry) => ({
				level: entry.level || "origin",
				description: entry.description || "",
			}));
		}

		await this.document.update(submitData);
	}

	static async #onAddLimit(_event, _target) {
		const limits = [
			...this.system.limits,
			{
				label: game.i18n.localize("LITM.Ui.new_limit"),
				outcome: "",
				max: "3",
				value: 0,
			},
		];
		await this.document.update({ "system.limits": limits });
	}

	static async #onAddVignette(_event, _target) {
		const [vignette] = await this.document.createEmbeddedDocuments("Item", [
			{
				name: game.i18n.localize("LITM.Ui.new_vignette"),
				type: "vignette",
			},
		]);
		vignette.sheet.render(true);
	}

	static async #onRemoveLimit(_event, target) {
		if (!(await confirmDelete("LITM.Terms.limit"))) return;

		const index = Number(target.dataset.index);
		const limits = this.system.limits.filter((_, i) => i !== index);
		await this.document.update({ "system.limits": limits });
	}

	static async #onIncreaseLimit(_event, target) {
		const index = Number(target.dataset.index);
		const limit = this.system.limits[index];
		if (!limit || limit.max === "~") return;

		const limits = [...this.system.limits];
		limits[index] = {
			...limit,
			value: Math.min(limit.value + 1, Number(limit.max)),
		};
		await this.document.update({ "system.limits": limits });
	}

	static async #onDecreaseLimit(_event, target) {
		const index = Number(target.dataset.index);
		const limit = this.system.limits[index];
		if (!limit || limit.max === "~") return;

		const limits = [...this.system.limits];
		limits[index] = { ...limit, value: Math.max(limit.value - 1, 0) };
		await this.document.update({ "system.limits": limits });
	}

	static async #onRemoveVignette(_event, target) {
		if (!(await confirmDelete("TYPES.Item.vignette"))) return;

		const itemId = target.dataset.itemId;
		const item = this.document.items.get(itemId);
		await item?.delete();
	}

	static #onEditVignette(_event, target) {
		const itemId = target.dataset.itemId;
		const item = this.document.items.get(itemId);
		item?.sheet.render(true);
	}

	static async #onAdjustRating(event, target) {
		event.preventDefault();
		event.stopPropagation();

		const button = target.closest("button");
		if (!button) return;

		const boxIndex = parseInt(button.dataset.index, 10);
		if (Number.isNaN(boxIndex)) return;

		const current = this.system.rating;
		const candidate = current === boxIndex + 1 ? boxIndex : boxIndex + 1;
		const next = Math.max(1, Math.min(5, candidate));
		await this.document.update({ "system.rating": next });
	}

	static async #onAddMight(_event, _target) {
		const might = [
			...(this.system.might || []),
			{ level: "origin", description: "" },
		];
		await this.document.update({ "system.might": might });
	}

	static async #onRemoveMight(_event, target) {
		const index = Number(target.dataset.index);
		const might = (this.system.might || []).filter((_, i) => i !== index);
		await this.document.update({ "system.might": might });
	}

	/* -------------------------------------------- */
	/*  Drag & Drop                                 */
	/* -------------------------------------------- */

	/** @override */
	async _onDropItem(event, item) {
		if (item.type !== "vignette") return;
		return super._onDropItem(event, item);
	}
}
