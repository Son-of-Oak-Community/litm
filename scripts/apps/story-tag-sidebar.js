import { LitmSettings } from "../system/settings.js";
import { Sockets } from "../system/sockets.js";
import { confirmDelete, localize as t } from "../utils.js";

const AbstractSidebarTab = foundry.applications.sidebar.AbstractSidebarTab;

export class StoryTagSidebar extends foundry.applications.api.HandlebarsApplicationMixin(
	AbstractSidebarTab,
) {
	#dragDrop = null;

	get _dragDrop() {
		this.#dragDrop ??= new foundry.applications.ux.DragDrop.implementation({
			dragSelector: "[data-tag-item]",
			permissions: {
				dragstart: () => true,
				drop: this._canDragDrop.bind(this),
			},
			callbacks: {
				dragstart: this._onDragStart.bind(this),
				drop: this._onDrop.bind(this),
			},
		});
		return this.#dragDrop;
	}

	static tabName = "combat";

	static DEFAULT_OPTIONS = {
		classes: ["litm", "litm--story-tags"],
		window: {
			title: "LITM.Ui.manage_tags",
		},
		actions: {
			"add-tag": StoryTagSidebar.#onAddTag,
			"add-status": StoryTagSidebar.#onAddStatus,
			"open-sheet": StoryTagSidebar.#onOpenSheet,
			"toggle-visibility": StoryTagSidebar.#onToggleVisibility,
			"toggle-effect-visibility": StoryTagSidebar.#onToggleEffectVisibility,
			"add-actor": StoryTagSidebar.#onAddActor,
			"remove-tag": StoryTagSidebar.#onRemoveTag,
		},
	};

	static PARTS = {
		form: {
			template: "systems/litm/templates/apps/story-tags.html",
			scrollable: [""],
		},
	};

	/* -------------------------------------------- */
	/*  Safety getters for modules expecting        */
	/*  CombatTracker API on ui.combat              */
	/* -------------------------------------------- */

	get viewed() {
		return null;
	}

	get combats() {
		return [];
	}

	/* -------------------------------------------- */
	/*  Data Accessors                              */
	/* -------------------------------------------- */

	get config() {
		const config = LitmSettings.storyTags;
		if (!config || foundry.utils.isEmpty(config)) {
			return { actors: [], tags: [] };
		}
		return config;
	}

	get actors() {
		// Merge stored actors with user-assigned characters so PCs always appear
		const storedIds = this.config.actors ?? [];
		const userCharacterIds = new Set(
			game.users.filter((u) => u.character).map((u) => u.character._id),
		);
		const mergedIds = [...new Set([...userCharacterIds, ...storedIds])];
		return (
			mergedIds
				.map((id) => game.actors.get(id))
				.filter(Boolean)
				.map((actor) => ({
					name: actor.name,
					type: actor.type,
					img: actor.prototypeToken.texture.src || actor.img,
					id: actor._id,
					isOwner: actor.isOwner,
					isUserCharacter: userCharacterIds.has(actor._id),
					hidden: (this.config.hiddenActors ?? []).includes(actor._id),
					tags: [...actor.effects]
						.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
						.filter((e) => e.type === "story_tag" || e.type === "status_card")
						.filter((e) => game.user.isGM || !(e.system?.isHidden ?? false))
						.map((e) => {
							const isStatus = e.type === "status_card";
							return {
								id: e._id,
								name: e.name,
								type: isStatus ? "status" : "tag",
								isScratched: e.system?.isScratched ?? false,
								isSingleUse: isStatus
									? false
									: (e.system?.isSingleUse ?? false),
								value: isStatus ? (e.system?.currentTier ?? 0) : 1,
								values: isStatus
									? (e.system?.tiers ?? new Array(6).fill(false))
									: new Array(6).fill(false),
								hidden: e.system?.isHidden ?? false,
							};
						}),
				}))
				.filter((actor) => game.user.isGM || !actor.hidden) || []
		);
	}

	get tags() {
		return this.config.tags
			.map((tag) => ({
				...tag,
				isScratched: tag.isScratched ?? false,
				isSingleUse: tag.isSingleUse ?? false,
				hidden: tag.hidden ?? false,
			}))
			.filter((tag) => game.user.isGM || !tag.hidden);
	}

	/* -------------------------------------------- */
	/*  Public API                                  */
	/* -------------------------------------------- */

	async setActors(actors) {
		await LitmSettings.setStoryTags({
			...this.config,
			actors,
		});
		return this.#broadcastRender();
	}

	async setTags(tags) {
		await LitmSettings.setStoryTags({ ...this.config, tags });
		return this.#broadcastRender();
	}

	async addTag(target, type = "tag") {
		const isStatus = type === "status";
		const tag = {
			name: t(isStatus ? "LITM.Ui.name_status" : "LITM.Ui.name_tag"),
			values: isStatus
				? [true, false, false, false, false, false]
				: Array(6)
						.fill()
						.map(() => null),
			type,
			isScratched: false,
			isSingleUse: false,
			id: foundry.utils.randomID(),
		};

		if (target === "story") {
			if (game.user.isGM) return this.setTags([...this.tags, tag]);
			return this.#broadcastUpdate("tags", [...this.tags, tag]);
		}

		return this.#addTagToActor({ id: target, tag });
	}

	/* -------------------------------------------- */
	/*  Rendering                                   */
	/* -------------------------------------------- */

	async _prepareContext(_options) {
		const context = await super._prepareContext(_options);
		context.isGM = game.user.isGM;
		context.actors = this.actors.sort((a, b) => {
			// User characters first
			if (a.isUserCharacter !== b.isUserCharacter)
				return a.isUserCharacter ? -1 : 1;
			// Then non-challenges before challenges
			if ((a.type === "challenge") !== (b.type === "challenge"))
				return a.type === "challenge" ? 1 : -1;
			// Alphabetical within each group
			return a.name.localeCompare(b.name);
		});
		context.tags = this.tags || [];
		return context;
	}

	async _onFirstRender(context, options) {
		await super._onFirstRender(context, options);

		// One-time contextmenu listener on the persistent outer element
		this.element.addEventListener("contextmenu", this._onContext.bind(this));
	}

	async _onRender(context, options) {
		await super._onRender(context, options);
		this._dragDrop.bind(this.element);

		// Submit on change — the form is replaced on each render
		const form = this.element.querySelector("form");
		if (form) {
			form.addEventListener("change", () => {
				const formData = new foundry.applications.ux.FormDataExtended(form);
				this.onSubmit(null, form, formData);
			});
			form.addEventListener("submit", (event) => event.preventDefault());
		}

		// Focus select
		this.element.querySelectorAll("[data-focus]").forEach((el) => {
			el.addEventListener("focus", (event) => event.currentTarget.select());
		});
	}

	_onClose(options) {
		return super._onClose(options);
	}

	/* -------------------------------------------- */
	/*  Drag and Drop                               */
	/* -------------------------------------------- */

	_canDragDrop() {
		return true;
	}

	_onDragStart(event) {
		const target = event.currentTarget.closest("[data-tag-item]");
		if (!target) return;

		const text = target.dataset.text;
		if (!text) return;

		const matches = `{${text}}`.matchAll(CONFIG.litm.tagStringRe);
		const match = [...matches][0];
		if (!match) return;

		const [, name, separator, value] = match;
		const isStatus = separator === "-";
		const data = {
			id: foundry.utils.randomID(),
			name,
			type: isStatus ? "status" : "tag",
			values: Array(6)
				.fill(null)
				.map((_, i) => (Number.parseInt(value, 10) === i + 1 ? value : null)),
			isScratched: false,
			value,
			sourceId: target.dataset.id,
			sourceContainer: target.dataset.type,
		};
		event.dataTransfer.setData("text/plain", JSON.stringify(data));
	}

	async _onDrop(dragEvent) {
		let data;
		try {
			const dragData = dragEvent.dataTransfer.getData("text/plain");
			data = JSON.parse(dragData);
		} catch {
			return;
		}

		if (!["Actor", "tag", "status"].includes(data.type)) return;
		const id = data.uuid?.split(".").pop() || data.id;

		// Add tags and statuses to the story / Actor
		if (data.type === "tag" || data.type === "status") {
			const dropTarget = dragEvent.target.closest("[data-tag-item]");
			// Resolve the target container: use data-type on the tag item (actor ID
			// or "story"), or fall back to the nearest [data-id] ancestor (actor header).
			const dropContainer =
				dropTarget?.dataset.type ||
				dragEvent.target.closest("[data-id]")?.dataset.id;

			// Same-container drop → sort instead of duplicate
			if (data.sourceContainer && data.sourceId) {
				const isSameContainer =
					data.sourceContainer === dropContainer ||
					(!dropContainer && data.sourceContainer === "story");

				if (isSameContainer) {
					return this.#sortTag(data, dropTarget);
				}
			}

			// Resolve actor ID for cross-container drops
			const actorTarget =
				dropContainer && dropContainer !== "story" ? dropContainer : null;
			if (actorTarget) {
				await this.#addTagToActor({
					id: actorTarget,
					tag: data,
				});
				return this.#removeFromSource(data);
			}

			if (game.user.isGM) await this.setTags([...this.tags, data]);
			else await this.#broadcastUpdate("tags", [...this.tags, data]);
			return this.#removeFromSource(data);
		}

		if (this.config.actors.includes(id)) return;

		// Add current tags and statuses from a challenge
		const actor = game.actors.get(id);
		if (
			(actor.type === "challenge" || actor.type === "journey") &&
			actor.effects.size === 0 &&
			actor.system.tags.length
		) {
			const tags = actor.system.tags.matchAll(CONFIG.litm.tagStringRe);
			await actor.createEmbeddedDocuments(
				"ActiveEffect",
				Array.from(tags).map(([_, name, separator, value]) => {
					const isStatus = separator === "-";
					const tier = Number.parseInt(value, 10);
					return {
						name,
						type: isStatus ? "status_card" : "story_tag",
						system: isStatus
							? {
									tiers: Array(6)
										.fill(false)
										.map((_, i) => i + 1 === tier),
								}
							: { isScratched: false, isSingleUse: false },
					};
				}),
			);
		}

		const hiddenActors = [...(this.config.hiddenActors ?? []), id];
		await LitmSettings.setStoryTags({
			...this.config,
			actors: [...this.config.actors, id],
			hiddenActors,
		});
		return this.#broadcastRender();
	}

	/* -------------------------------------------- */
	/*  Form Handling                               */
	/* -------------------------------------------- */

	async onSubmit(_event, _form, formData) {
		const data = foundry.utils.expandObject(formData.object);
		if (foundry.utils.isEmpty(data)) return;

		const { story, ...actors } = data;

		const toTiers = (values = []) => {
			if (!Array.isArray(values)) return new Array(6).fill(false);
			if (
				values.length === 6 &&
				values.some((v) => v === null || v === false)
			) {
				return values.map((v) => v !== null && v !== false && v !== "");
			}
			const tiers = new Array(6).fill(false);
			for (const value of values) {
				const index = Number.parseInt(value, 10) - 1;
				if (Number.isFinite(index) && index >= 0 && index < 6) {
					tiers[index] = true;
				}
			}
			return tiers;
		};

		await Promise.all(
			Object.entries(actors).map(([id, tags]) => {
				return this.#updateTagsOnActor({
					id,
					tags: Object.entries(tags).map(([tagId, data]) => {
						const isStatus = data.tagType === "status";
						const rawValues = Array.isArray(data.values)
							? data.values
							: data.values != null
								? [data.values]
								: [];
						return {
							_id: tagId,
							name: data.name,
							system: isStatus
								? { tiers: toTiers(rawValues) }
								: {
										isScratched: data.isScratched ?? false,
										isSingleUse: data.isSingleUse ?? false,
									},
						};
					}),
				});
			}),
		);

		const storyTags = Object.entries(story || {}).map(([tagId, data]) => {
			const existing = this.config.tags.find((t) => t.id === tagId);
			const isStatus = existing?.type === "status";
			const rawValues = Array.isArray(data.values)
				? data.values
				: data.values != null
					? [data.values]
					: [];
			const tiers = toTiers(rawValues);
			return {
				id: tagId,
				name: data.name,
				values: isStatus ? tiers : new Array(6).fill(false),
				isScratched: isStatus ? false : (data.isScratched ?? false),
				isSingleUse: isStatus ? false : (data.isSingleUse ?? false),
				type: existing?.type ?? "tag",
				value: isStatus ? tiers.lastIndexOf(true) + 1 : null,
			};
		});

		if (game.user.isGM) await this.setTags(storyTags);
		else {
			this.#broadcastUpdate("tags", storyTags);
		}
	}

	/* -------------------------------------------- */
	/*  Action Handlers                             */
	/* -------------------------------------------- */

	static #onAddTag(_event, target) {
		const id = target.dataset.id;
		this.addTag(id, "tag");
	}

	static #onAddStatus(_event, target) {
		const id = target.dataset.id;
		this.addTag(id, "status");
	}

	static #onOpenSheet(_event, target) {
		const id = target.dataset.id;
		const actor = game.actors.get(id);
		if (!actor) return;
		actor.sheet.render(true);
	}

	static async #onToggleVisibility(_event, target) {
		const { id, type } = target.dataset;
		if (type === "actor") return this._toggleActorVisibility(id);
		if (type === "tag") return this._toggleTagVisibility(id);
	}

	static async #onToggleEffectVisibility(_event, target) {
		const { id, actorId } = target.dataset;
		return this._toggleEffectVisibility(id, actorId);
	}

	static #onAddActor(_event, _target) {
		ui.actors.renderPopout();
	}

	static #onRemoveTag(_event, target) {
		const li = target.closest("[data-tag-item]");
		if (!li) return;
		this.removeTag(li);
	}

	/* -------------------------------------------- */
	/*  Visibility Toggles                          */
	/* -------------------------------------------- */

	async _toggleEffectVisibility(effectId, actorId) {
		const actor = game.actors.get(actorId);
		const effect = actor?.effects.get(effectId);
		if (!effect) return;
		await effect.update({ "system.isHidden": !effect.system.isHidden });
		return this.#broadcastRender();
	}

	async _toggleActorVisibility(id) {
		const hidden = new Set(this.config.hiddenActors ?? []);
		if (hidden.has(id)) hidden.delete(id);
		else hidden.add(id);
		await LitmSettings.setStoryTags({
			...this.config,
			hiddenActors: [...hidden],
		});
		return this.#broadcastRender();
	}

	async _toggleTagVisibility(id) {
		const tags = this.config.tags.map((tag) =>
			tag.id === id ? { ...tag, hidden: !tag.hidden } : tag,
		);
		if (game.user.isGM) await this.setTags(tags);
		else this.#broadcastUpdate("tags", tags);
	}

	/* -------------------------------------------- */
	/*  Context Menu                                */
	/* -------------------------------------------- */

	_onContext(event) {
		const target = event.target.closest("[data-context]");
		if (!target) return;

		const action = target.dataset.context;
		const id = target.dataset.id;

		switch (action) {
			case "remove-all-tags":
				event.preventDefault();
				event.stopPropagation();
				this.#removeAllTags();
				break;
			case "remove-actor":
				event.preventDefault();
				event.stopPropagation();
				this.#removeActor(id);
				break;
		}
	}

	/* -------------------------------------------- */
	/*  Tag CRUD (Private)                          */
	/* -------------------------------------------- */

	async #removeFromSource(data) {
		if (!data.sourceContainer || !data.sourceId) return;

		if (data.sourceContainer === "story") {
			const tags = this.config.tags.filter((t) => t.id !== data.sourceId);
			if (game.user.isGM) return this.setTags(tags);
			return this.#broadcastUpdate("tags", tags);
		}

		const actor = game.actors.get(data.sourceContainer);
		if (!actor?.isOwner) return;
		if (!actor.effects.has(data.sourceId)) return;
		await actor.deleteEmbeddedDocuments("ActiveEffect", [data.sourceId]);
		return this.#broadcastRender();
	}

	async #sortTag(data, dropTarget) {
		const sourceId = data.sourceId;
		const container = data.sourceContainer;

		// Sort within an actor's effects
		if (container !== "story") {
			const actor = game.actors.get(container);
			if (!actor?.isOwner) return;

			const source = actor.effects.get(sourceId);
			if (!source) return;

			// Determine the target sibling from the drop position
			const target = dropTarget
				? actor.effects.get(dropTarget.dataset.id)
				: null;

			const siblings = actor.effects
				.filter(
					(e) =>
						e.id !== sourceId &&
						(e.type === "story_tag" || e.type === "status_card"),
				)
				.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

			const sortUpdates = SortingHelpers.performIntegerSort(source, {
				target,
				siblings,
			});
			const updates = sortUpdates.map(({ target, update }) => ({
				_id: target.id,
				sort: update.sort,
			}));
			await actor.updateEmbeddedDocuments("ActiveEffect", updates);
			return this.#broadcastRender();
		}

		// Sort within story tags
		const tags = [...this.config.tags];
		const sourceIndex = tags.findIndex((t) => t.id === sourceId);
		if (sourceIndex === -1) return;

		const [moved] = tags.splice(sourceIndex, 1);
		const targetId = dropTarget?.dataset.id;
		const targetIndex = targetId
			? tags.findIndex((t) => t.id === targetId)
			: tags.length;
		tags.splice(targetIndex === -1 ? tags.length : targetIndex, 0, moved);

		if (game.user.isGM) return this.setTags(tags);
		return this.#broadcastUpdate("tags", tags);
	}

	async removeTag(target) {
		const id = target.dataset.id;
		const type = target.dataset.type;

		if (type === "story") {
			if (game.user.isGM) {
				return this.setTags(this.config.tags.filter((t) => t.id !== id));
			}
			return this.#broadcastUpdate(
				"tags",
				this.config.tags.filter((t) => t.id !== id),
			);
		}
		return this.#removeTagFromActor({ actorId: type, id });
	}

	async #removeAllTags() {
		if (!this.config.tags.length || !(await confirmDelete())) return;
		if (game.user.isGM) return this.setTags([]);
		return this.#broadcastUpdate("tags", []);
	}

	async #addTagToActor({ id, tag }) {
		const actor = game.actors.get(id);
		if (!actor) {
			return ui.notifications.error("LITM.Ui.error_no_actor", {
				localize: true,
			});
		}
		if (!actor.isOwner) {
			return ui.notifications.error("LITM.Ui.warn_not_owner", {
				localize: true,
			});
		}

		const hasValues = Array.isArray(tag.values)
			? tag.values.some((v) => v !== null && v !== false && v !== "")
			: false;
		const type = tag.type === "status" || hasValues ? "status" : "tag";
		const tiers = Array.isArray(tag.values)
			? tag.values.map(
					(value) => value !== null && value !== false && value !== "",
				)
			: new Array(6).fill(false);

		const maxSort = Math.max(0, ...actor.effects.map((e) => e.sort ?? 0));
		await actor.createEmbeddedDocuments("ActiveEffect", [
			{
				name: tag.name,
				type: type === "status" ? "status_card" : "story_tag",
				sort: maxSort + 1000,
				system:
					type === "status"
						? { tiers }
						: {
								isScratched: tag.isScratched ?? false,
								isSingleUse: false,
							},
			},
		]);
		return this.#broadcastRender();
	}

	async #updateTagsOnActor({ id, tags }) {
		const actor = game.actors.get(id);
		if (!actor?.isOwner) return;
		return actor.updateEmbeddedDocuments("ActiveEffect", tags);
	}

	async #removeTagFromActor({ actorId, id }) {
		const actor = game.actors.get(actorId);

		if (!actor) {
			return ui.notifications.error("LITM.Ui.error_no_actor", {
				localize: true,
			});
		}
		if (!actor.isOwner) return;

		await actor.deleteEmbeddedDocuments("ActiveEffect", [id]);
		return this.#broadcastRender();
	}

	async #removeActor(id) {
		if (!game.user.isGM) return;

		// User-assigned characters can't be removed from the sidebar
		const userCharacterIds = new Set(
			game.users.filter((u) => u.character).map((u) => u.character._id),
		);
		if (userCharacterIds.has(id)) {
			return ui.notifications.warn("LITM.Ui.warn_user_character", {
				localize: true,
			});
		}

		if (!(await confirmDelete("Actor"))) return;

		await this.setActors(this.config.actors.filter((a) => a !== id));
		this.#broadcastRender();
	}

	/* -------------------------------------------- */
	/*  Socket Methods                              */
	/* -------------------------------------------- */

	#broadcastUpdate(component, data) {
		Sockets.dispatch("storyTagsUpdate", { component, data });
	}

	#broadcastRender() {
		Sockets.dispatch("storyTagsRender");
		// Always render the sidebar instance — its render() propagates to the popout.
		// If "this" IS the popout, we also need to tell the sidebar to render.
		const sidebar = ui.combat;
		if (sidebar && sidebar !== this) {
			sidebar.render();
		} else {
			this.render();
		}
		this.refreshRollDialogs();
	}

	refreshRollDialogs() {
		game.actors.forEach((actor) => {
			if (!actor.sheet?.hasRollDialog) return;
			const dialog = actor.sheet.rollDialogInstance;
			if (dialog?.rendered) dialog.render();
		});
	}

	async doUpdate(component, data) {
		if (!game.user.isGM) return;
		if (component === "tags") return this.setTags(data);
	}
}
