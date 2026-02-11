import { Sockets } from "../system/sockets.js";
import { localize as t } from "../utils.js";

const sortByTypeThenName = (tags, typeOrder) =>
	[...tags].sort((a, b) => {
		const typeA = typeOrder[a.type] ?? 99;
		const typeB = typeOrder[b.type] ?? 99;
		if (typeA !== typeB) return typeA - typeB;
		return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
	});

export class LitmRollDialog extends foundry.applications.api.HandlebarsApplicationMixin(
	foundry.applications.api.ApplicationV2,
) {
	static DEFAULT_OPTIONS = {
		id: "litm-roll-dialog",
		classes: ["litm", "litm--roll"],
		tag: "form",
		window: {
			title: "LITM.Ui.roll_title",
			resizable: true,
		},
		position: {
			width: 600,
			height: 550,
		},
		form: {
			handler: LitmRollDialog.#onSubmit,
			closeOnSubmit: true,
		},
		actions: {
			sendToNarrator: LitmRollDialog.#onSendToNarrator,
		},
	};

	static PARTS = {
		form: {
			template: "systems/litm/templates/apps/roll-dialog.html",
			scrollable: [".litm--roll-dialog-content"],
		},
	};

	static create(options) {
		return new LitmRollDialog(options);
	}

	static roll({
		actorId,
		tags,
		title,
		type,
		speaker,
		modifier = 0,
		might = "equal",
	}) {
		// Separate tags
		const {
			scratchedTags,
			burnedTags,
			powerTags,
			weaknessTags,
			positiveStatuses,
			negativeStatuses,
		} = LitmRollDialog.#filterTags(tags);

		// Values
		const {
			scratchedValue,
			burnedValue,
			powerValue,
			weaknessValue,
			positiveStatusValue,
			negativeStatusValue,
			totalPower,
			mightOffset,
		} = game.litm.methods.calculatePower({
			scratchedTags,
			burnedTags,
			powerTags,
			weaknessTags,
			positiveStatuses,
			negativeStatuses,
			modifier: Number(modifier) || 0,
			might,
		});

		const formula =
			typeof CONFIG.litm.roll.formula === "function"
				? CONFIG.litm.roll.formula({
						scratchedTags,
						burnedTags,
						powerTags,
						weaknessTags,
						positiveStatuses,
						negativeStatuses,
						scratchedValue,
						burnedValue,
						powerValue,
						weaknessValue,
						positiveStatusValue,
						negativeStatusValue,
						totalPower,
						actorId,
						type,
						title,
						modifier,
						might,
						mightOffset,
					})
				: CONFIG.litm.roll.formula ||
					"2d6 + (@scratchedValue + @powerValue + @positiveStatusValue - @weaknessValue - @negativeStatusValue + @modifier + @mightOffset)";

		// Allow modules to cancel or modify the roll
		const actor = game.actors.get(actorId);
		if (
			Hooks.call("litm.preRoll", {
				tags,
				formula,
				modifier,
				power: totalPower,
				actor,
			}) === false
		) {
			return;
		}

		// Roll
		const roll = new game.litm.LitmRoll(
			formula,
			{
				scratchedValue,
				burnedValue,
				powerValue,
				positiveStatusValue,
				weaknessValue,
				negativeStatusValue,
				modifier: Number(modifier) || 0,
				mightOffset,
			},
			{
				actorId,
				title,
				type,
				scratchedTags,
				burnedTags,
				powerTags,
				weaknessTags,
				positiveStatuses,
				negativeStatuses,
				speaker,
				totalPower,
				modifier,
				might,
				mightOffset,
			},
		);

		return roll
			.toMessage({
				speaker,
				flavor: title,
			})
			.then(async (res) => {
				Hooks.callAll("litm.roll", roll, res);

				// Auto-scratch tags used in "scratched" state + single-use tags
				const actor = game.actors.get(actorId);
				if (actor?.sheet) {
					for (const tag of scratchedTags) {
						await actor.sheet.toggleScratchTag(tag);
					}
					const allUsedTags = [...powerTags, ...weaknessTags];
					for (const tag of allUsedTags) {
						if (tag.isSingleUse) {
							await actor.sheet.toggleScratchTag(tag);
						}
					}
					roll.options.isScratched = true;

					// Auto-gain improvement for weakness tags
					const realWeaknessTags = weaknessTags.filter(
						(t) => t.type === "weaknessTag",
					);
					for (const tag of realWeaknessTags) {
						await actor.sheet.gainImprovement(tag);
					}
					roll.options.gainedExp = true;

					if (scratchedTags.length > 0 || realWeaknessTags.length > 0) {
						await res.update({ rolls: [roll] });
					}
				}

				// Reset roll dialog
				res.rolls[0]?.actor?.sheet.resetRollDialog();
				Sockets.dispatch("resetRollDialog", { actorId });
				return res;
			});
	}

	static calculatePower(tags) {
		const scratchedTags = tags.scratchedTags ?? tags.burnedTags ?? [];
		const scratchedValue = scratchedTags.length * 3;

		const powerValue = tags.powerTags.length;

		const weaknessValue = tags.weaknessTags.length;

		const positiveStatusValue = tags.positiveStatuses.reduce(
			(max, t) => Math.max(max, Number.parseInt(t.value, 10) || 0),
			0,
		);

		const negativeStatusValue = tags.negativeStatuses.reduce(
			(max, t) => Math.max(max, Number.parseInt(t.value, 10) || 0),
			0,
		);

		const modifier = Number(tags.modifier) || 0;

		const mightOffsets = {
			equal: 0,
			favored: 3,
			extremely_favored: 6,
			imperiled: -3,
			extremely_imperiled: -6,
		};
		const mightOffset = mightOffsets[tags.might] || 0;

		const totalPower =
			scratchedValue +
			powerValue +
			positiveStatusValue -
			weaknessValue -
			negativeStatusValue +
			modifier +
			mightOffset;

		return {
			scratchedValue,
			burnedValue: scratchedValue,
			scratchedTags,
			burnedTags: scratchedTags,
			powerValue,
			weaknessValue,
			positiveStatusValue,
			negativeStatusValue,
			totalPower,
			modifier,
			mightOffset,
		};
	}

	static #filterTags(tags) {
		const scratchedTags = tags.filter(
			(t) => t.state === "scratched" || t.state === "burned",
		);
		const powerTags = tags.filter(
			(t) => t.type !== "status" && t.state === "positive",
		);
		const weaknessTags = tags.filter(
			(t) => t.type !== "status" && t.state === "negative",
		);
		const positiveStatuses = tags.filter(
			(t) => t.type === "status" && t.state === "positive",
		);
		const negativeStatuses = tags.filter(
			(t) => t.type === "status" && t.state === "negative",
		);

		return {
			scratchedTags,
			burnedTags: scratchedTags,
			powerTags,
			weaknessTags,
			positiveStatuses,
			negativeStatuses,
		};
	}

	static async #onSubmit(_event, _form, formData) {
		return await this._onSubmit(_event, _form, formData);
	}

	async _onSubmit(_event, _form, formData) {
		if (!this.isOwner) return;
		return LitmRollDialog.roll(this.extractRollData(formData));
	}

	static async #onSendToNarrator(_event, _target) {
		if (!this.isOwner) return;
		const formData = new foundry.applications.ux.FormDataExtended(this.element);
		const rollData = this.extractRollData(formData);
		await this._createModerationRequest(rollData);
		this.close();
	}

	extractRollData(formData) {
		const data = foundry.utils.expandObject(formData.object);
		const { actorId, title, type, modifier, might, ...rest } = data;
		const tags = this.getFilteredArrayFromFormData(rest);
		return {
			actorId,
			type,
			tags,
			title,
			speaker: this.speaker,
			modifier,
			might,
		};
	}

	get title() {
		const base = game.i18n.localize("LITM.Ui.roll_title");
		const name = this.actor?.name;
		return name ? `${name} — ${base}` : base;
	}

	#modifier = 0;
	#might = "equal";
	#ownerId = null;

	constructor(options = {}) {
		if (options.actorId) options.id = `litm-roll-dialog-${options.actorId}`;
		super(options);

		this.tagState = options.tagState || [];
		this.#modifier = options.modifier || 0;
		this.#might = options.might || "equal";
		this.#ownerId = options.ownerId || null;

		this.actorId = options.actorId;
		this.characterTags = options.characterTags || [];
		this.speaker =
			options.speaker || ChatMessage.getSpeaker({ actor: this.actor });
		this.rollName = options.title || game.i18n.localize("LITM.Ui.roll_title");
		this.type = options.type || "tracked";
	}

	get ownerId() {
		return this.#ownerId;
	}

	set ownerId(value) {
		this.#ownerId = value;
	}

	get isOwner() {
		return this.#ownerId === game.user.id;
	}

	get actor() {
		return game.actors.get(this.actorId);
	}

	#tagStateMap() {
		return new Map(this.tagState.map((t) => [t.id, t]));
	}

	get statuses() {
		if (!this.actor) return [];
		const { tags } = game.litm.storyTags ?? ui.combat ?? { tags: [] };
		const actorImg = this.actor.prototypeToken?.texture?.src || this.actor.img;
		const sceneStatuses = tags
			.filter((tag) => tag.values.some((v) => !!v))
			.map((tag) => ({ ...tag, actorName: null, actorImg: null }));
		const actorStatuses = this.actor.system.statuses.map((tag) => ({
			...tag,
			actorName: this.actor.name,
			actorImg,
		}));
		const stateMap = this.#tagStateMap();
		return [...sceneStatuses, ...actorStatuses].map((tag) => {
			const ts = stateMap.get(tag.id);
			return {
				...tag,
				state: ts?.state || "",
				contributorId: ts?.contributorId || null,
				states: ",positive,negative",
			};
		});
	}

	get tags() {
		if (!this.actor) return [];
		const { tags } = game.litm.storyTags ?? ui.combat ?? { tags: [] };
		const actorImg = this.actor.prototypeToken?.texture?.src || this.actor.img;
		const sceneTags = tags
			.filter((tag) => tag.values.every((v) => !v))
			.map((tag) => ({ ...tag, actorName: null, actorImg: null }));
		const actorTags = this.actor.system.storyTags.map((tag) => ({
			...tag,
			actorName: this.actor.name,
			actorImg,
		}));
		const stateMap = this.#tagStateMap();
		return [...sceneTags, ...actorTags].map((tag) => {
			const ts = stateMap.get(tag.id);
			const state = ts?.state || "";
			return {
				...tag,
				state: state === "burned" ? "scratched" : state,
				contributorId: ts?.contributorId || null,
				states: tag.isSingleUse
					? ",positive,negative"
					: ",positive,negative,scratched",
			};
		});
	}

	get gmTags() {
		if (!game.user.isGM) return [];

		const storyTags = game.litm.storyTags ?? ui.combat;
		if (!storyTags) return [];
		const { actors } = storyTags;
		const tags = actors
			.filter((actor) => actor.id !== this.actorId)
			.flatMap((actor) =>
				actor.tags.map((tag) => ({
					...tag,
					actorName: actor.name,
					actorImg: actor.img,
					actorType: actor.type,
				})),
			);
		const stateMap = this.#tagStateMap();
		return tags.map((tag) => {
			const ts = stateMap.get(tag.id);
			const state = ts?.state || "";
			return {
				...tag,
				state: state === "burned" ? "scratched" : state,
				contributorId: ts?.contributorId || null,
				states:
					tag.type === "tag" && !tag.isSingleUse
						? ",positive,negative,scratched"
						: ",positive,negative",
			};
		});
	}

	get totalPower() {
		const state = [...this.tagState, ...this.characterTags];
		const tags = LitmRollDialog.#filterTags(state);
		const { totalPower } = LitmRollDialog.calculatePower({
			...tags,
			modifier: this.#modifier,
			might: this.#might,
		});
		return totalPower;
	}

	async _prepareContext(_options) {
		const isOwner = this.isOwner;
		const isGMViewer = game.user.isGM && !isOwner;
		const currentUserId = game.user.id;
		const tagTypeOrder = {
			themeTag: 1,
			powerTag: 2,
			weaknessTag: 3,
			relationshipTag: 4,
			backpack: 5,
			tag: 6,
			status: 7,
		};
		const decorateTag = (tag) => {
			const contributorId = tag.contributorId || null;
			const noBurn = tag.isSingleUse;
			const isOpposition =
				tag.actorType === "challenge" || tag.actorType === "journey";
			return {
				...tag,
				contributorId,
				displayName: tag.displayName || tag.name,
				locked: !isOwner && contributorId && contributorId !== currentUserId,
				states:
					tag.type === "weaknessTag"
						? ",negative,positive"
						: isOpposition
							? ",negative,positive"
							: tag.type === "status"
								? ",positive,negative"
								: noBurn
									? ",positive,negative"
									: ",positive,negative,scratched",
			};
		};
		const gmTagsFlat = sortByTypeThenName(
			this.gmTags.map(decorateTag),
			tagTypeOrder,
		);
		const gmTagGroupMap = new Map();
		for (const tag of gmTagsFlat) {
			const key = tag.actorName || "";
			if (!gmTagGroupMap.has(key)) {
				gmTagGroupMap.set(key, {
					actorName: tag.actorName,
					actorImg: tag.actorImg,
					tags: [],
				});
			}
			gmTagGroupMap.get(key).tags.push(tag);
		}
		const gmTagGroups = [...gmTagGroupMap.values()];

		// Separate story items by source: scene stays below, actor items join character groups
		const allStoryItems = [
			...sortByTypeThenName(this.statuses.map(decorateTag), tagTypeOrder),
			...sortByTypeThenName(this.tags.map(decorateTag), tagTypeOrder),
		];
		const sceneStoryItems = allStoryItems.filter(
			(tag) => tag.actorName === null,
		);
		const actorStoryItems = allStoryItems
			.filter((tag) => tag.actorName !== null)
			.filter((tag) => isOwner || game.user.isGM || !!tag.state);

		const storyTagGroups = sceneStoryItems.length
			? [{ actorName: null, actorImg: null, tags: sceneStoryItems }]
			: [];

		// Group character tags by theme, preserving insertion order
		const characterTagGroupMap = new Map();
		const fellowshipTagGroupMap = new Map();
		// GM viewer builds per-actor tabs from the story tag app
		const gmViewerTabs = [];
		if (isGMViewer) {
			const storyTagActorIds = game.litm.storyTags?.config?.actors ?? [];
			for (const actorId of storyTagActorIds) {
				const actor = game.actors.get(actorId);
				if (!actor?.sheet?._buildAllRollTags) continue;
				const actorImg = actor.prototypeToken?.texture?.src || actor.img;
				const actorTags = actor.sheet._buildAllRollTags();
				// Group tags by theme within each actor
				const themeMap = new Map();
				for (const rawTag of actorTags) {
					const existing = this.characterTags.find((t) => t.id === rawTag.id);
					const tag = decorateTag(existing || rawTag);
					const groupKey = rawTag.themeId ?? `__${rawTag.type}`;
					const groupLabel = rawTag.themeName ?? rawTag.type;
					if (!themeMap.has(groupKey)) {
						themeMap.set(groupKey, {
							themeName: groupLabel,
							tags: [],
						});
					}
					themeMap.get(groupKey).tags.push(tag);
				}
				// Add actor story items to this tab
				const actorStory = allStoryItems
					.filter((tag) => tag.actorName === actor.name)
					.filter((tag) => isOwner || game.user.isGM || !!tag.state);
				if (actorStory.length) {
					themeMap.set("__actor_story", {
						themeName: t("LITM.Tags.story"),
						tags: sortByTypeThenName(actorStory, tagTypeOrder),
					});
				}
				const groups = [...themeMap.values()].map((g) => ({
					...g,
					tags: sortByTypeThenName(g.tags, tagTypeOrder),
				}));
				if (groups.length) {
					gmViewerTabs.push({
						id: actorId,
						label: actor.name,
						actorImg,
						groups,
					});
				}
			}
			// "Story" tab for scene-level story tags
			const storyTab = sceneStoryItems.length
				? {
						id: "__scene_story",
						label: t("LITM.Tags.story"),
						icon: "fa-solid fa-tags",
						groups: [{ themeName: null, tags: sceneStoryItems }],
					}
				: null;
			// Sort: rolling actor first, then Story, then the rest
			const rollingActorTab = gmViewerTabs.find((t) => t.id === this.actorId);
			const otherTabs = gmViewerTabs.filter((t) => t.id !== this.actorId);
			gmViewerTabs.length = 0;
			if (rollingActorTab) gmViewerTabs.push(rollingActorTab);
			if (storyTab) gmViewerTabs.push(storyTab);
			gmViewerTabs.push(...otherTabs);
			// Initialize native tab group tracking
			const initialTab = gmViewerTabs[0]?.id;
			this.tabGroups["gm-viewer"] ??= initialTab;
			for (const tab of gmViewerTabs) {
				tab.cssClass = this.tabGroups["gm-viewer"] === tab.id ? "active" : "";
			}
		} else {
			// Owner sees all own tags; non-owners only see checked tags
			const visibleCharacterTags = isOwner
				? this.characterTags.filter((t) => !t.contributorActorId)
				: this.characterTags.filter((t) => !!t.state && !t.contributorActorId);
			for (const rawTag of visibleCharacterTags) {
				const tag = decorateTag(rawTag);
				const groupKey = rawTag.themeId ?? `__${rawTag.type}`;
				const groupLabel = rawTag.themeName ?? rawTag.type;
				const targetMap = rawTag.fromFellowship
					? fellowshipTagGroupMap
					: characterTagGroupMap;
				if (!targetMap.has(groupKey)) {
					targetMap.set(groupKey, {
						themeName: groupLabel,
						themeImg: rawTag.themeImg ?? null,
						actorImg: rawTag.actorImg ?? null,
						tags: [],
					});
				}
				targetMap.get(groupKey).tags.push(tag);
			}
		}
		// Contributed tags from other characters, grouped by contributor
		// Each contributor entry has { actorName, actorImg, themeGroups: [{themeName, tags}] }
		const contributedActorMap = new Map();
		const contributedTags = this.characterTags.filter(
			(t) => t.contributorActorId,
		);
		if (isOwner) {
			for (const rawTag of contributedTags) {
				const tag = decorateTag(rawTag);
				const actorKey = rawTag.contributorActorId;
				if (!contributedActorMap.has(actorKey)) {
					contributedActorMap.set(actorKey, {
						actorName: rawTag.contributorActorName,
						actorImg: rawTag.contributorActorImg,
						themeMap: new Map(),
					});
				}
				const themeMap = contributedActorMap.get(actorKey).themeMap;
				const themeKey = rawTag.themeId ?? `__${rawTag.type}`;
				const themeLabel = rawTag.themeName ?? rawTag.type;
				if (!themeMap.has(themeKey)) {
					themeMap.set(themeKey, { themeName: themeLabel, tags: [] });
				}
				themeMap.get(themeKey).tags.push(tag);
			}
		}
		// Non-owners see their own character's tags for contribution
		if (!isOwner && !game.user.isGM) {
			const ownCharacter = game.user.character;
			if (
				ownCharacter &&
				ownCharacter.id !== this.actorId &&
				ownCharacter.sheet?._buildAllRollTags
			) {
				const ownTags = ownCharacter.sheet._buildAllRollTags();
				const actorKey = ownCharacter.id;
				const actorImg =
					ownCharacter.prototypeToken?.texture?.src || ownCharacter.img;
				if (!contributedActorMap.has(actorKey)) {
					contributedActorMap.set(actorKey, {
						actorName: ownCharacter.name,
						actorImg,
						themeMap: new Map(),
					});
				}
				const themeMap = contributedActorMap.get(actorKey).themeMap;
				for (const rawTag of ownTags) {
					const existing = this.characterTags.find((t) => t.id === rawTag.id);
					const tag = decorateTag(existing || rawTag);
					const themeKey = rawTag.themeId ?? `__${rawTag.type}`;
					const themeLabel = rawTag.themeName ?? rawTag.type;
					if (!themeMap.has(themeKey)) {
						themeMap.set(themeKey, {
							themeName: themeLabel,
							tags: [],
						});
					}
					themeMap.get(themeKey).tags.push(tag);
				}
			}
		}
		const contributedTagGroups = [...contributedActorMap.values()].map(
			(entry) => ({
				actorName: entry.actorName,
				actorImg: entry.actorImg,
				themeGroups: [...entry.themeMap.values()].map((g) => ({
					...g,
					tags: sortByTypeThenName(g.tags, tagTypeOrder),
				})),
			}),
		);
		// Actor story tags/statuses (non-GM only)
		if (!isGMViewer && actorStoryItems.length > 0) {
			characterTagGroupMap.set("__actor_story", {
				themeName: t("LITM.Tags.story"),
				tags: actorStoryItems,
			});
		}
		const characterTagGroups = [...characterTagGroupMap.values()].map(
			(group) => ({
				...group,
				tags: sortByTypeThenName(group.tags, tagTypeOrder),
			}),
		);
		const fellowshipTagGroups = [...fellowshipTagGroupMap.values()].map(
			(group) => ({
				...group,
				tags: sortByTypeThenName(group.tags, tagTypeOrder),
			}),
		);

		return {
			actorId: this.actorId,
			characterTagGroups,
			fellowshipTagGroups,
			contributedTagGroups,
			rollTypes: {
				quick: "LITM.Ui.roll_quick",
				tracked: "LITM.Ui.roll_tracked",
				mitigate: "LITM.Ui.roll_mitigate",
				sacrifice: "LITM.Ui.roll_sacrifice",
			},
			storyTagGroups,
			gmTagGroups,
			isGM: game.user.isGM,
			isGMViewer,
			gmViewerTabs,
			isOwner,
			title: this.rollName,
			type: this.type,
			totalPower: this.totalPower,
			modifier: this.#modifier,
			might: this.#might,
			mightOptions: {
				equal: "LITM.Ui.might_equal",
				favored: "LITM.Ui.might_favored",
				extremely_favored: "LITM.Ui.might_extremely_favored",
				imperiled: "LITM.Ui.might_imperiled",
				extremely_imperiled: "LITM.Ui.might_extremely_imperiled",
			},
		};
	}

	_onRender(context, options) {
		super._onRender(context, options);
		Hooks.callAll("litm.rollDialogRendered", this.actor, this);

		// Setup modifier change listener
		this.element
			.querySelector("[data-update='modifier']")
			?.addEventListener("change", this.#handleModifierChange.bind(this));

		// Setup might change listener
		this.element
			.querySelector("[data-update='might']")
			?.addEventListener("change", this.#handleMightChange.bind(this));

		// Setup checkbox change listener
		this.element.querySelectorAll("litm-super-checkbox").forEach((checkbox) => {
			checkbox.addEventListener("change", this._onTagChange.bind(this));
		});

		// Setup label click listener (for better UX)
		this.element
			.querySelectorAll("label.litm--roll-dialog-tag")
			.forEach((label) => {
				label.addEventListener("click", (event) => {
					if (event.target.tagName !== "LITM-SUPER-CHECKBOX") {
						event.preventDefault();
						const checkbox = label.querySelector("litm-super-checkbox");
						if (!checkbox) return;

						if (event.shiftKey && !checkbox.disabled) {
							const tagType = label.dataset.tagType;
							const canScratch = !["weaknessTag", "status"].includes(tagType);
							if (canScratch) {
								const newValue =
									checkbox.value === "scratched" ? "" : "scratched";
								checkbox.value = newValue;
								checkbox.dispatchEvent(new Event("change"));
								return;
							}
						}
						checkbox.click();
					}
				});
			});

		if (!this.isOwner) {
			this.#applyReadOnlyState();
		}
	}

	#applyReadOnlyState() {
		this.element.querySelectorAll("input[name='type']").forEach((input) => {
			input.disabled = true;
			input.setAttribute("aria-disabled", "true");
		});
	}

	#canModifyTag(tag) {
		if (this.isOwner) return true;
		if (!tag) return false;
		const contributorId = tag.contributorId || null;
		return !contributorId || contributorId === game.user.id;
	}

	#assignContributor(tag, value) {
		if (!tag) return;
		if (!value) {
			tag.contributorId = null;
			return;
		}
		tag.contributorId = game.user.id;
	}

	#mergeTags(local, incoming) {
		const localById = new Map(local.map((t) => [t.id, t]));
		const incomingById = new Map(incoming.map((t) => [t.id, t]));

		// For tags in both: prefer local if current user set state on it
		const merged = incoming.map((t) => {
			const localTag = localById.get(t.id);
			if (localTag?.contributorId === game.user.id && localTag.state) {
				return localTag;
			}
			return t;
		});

		// Add locally-contributed tags not present in incoming (race condition)
		for (const t of local) {
			if (
				t.contributorId === game.user.id &&
				t.state &&
				!incomingById.has(t.id)
			) {
				merged.push(t);
			}
		}

		return merged;
	}

	#normalizeContributors(ownerId) {
		if (!ownerId) return;
		const normalize = (tag) => {
			if (!tag) return;
			if (tag.state && !tag.contributorId) {
				tag.contributorId = ownerId;
			}
		};
		this.characterTags.forEach(normalize);
		this.tagState.forEach(normalize);
	}

	#revertTagChange(target, currentValue) {
		if (!target) return;
		target.value = currentValue || "";
	}

	_onTagChange(event) {
		const target = event.currentTarget;
		const { name: id, value } = target;
		const { type } = target.dataset;
		const isCharacterTag = [
			"powerTag",
			"themeTag",
			"backpack",
			"weaknessTag",
			"relationshipTag",
		].includes(type);
		// Ensure non-owner's character tags are tracked in characterTags
		let existingCharacterTag = isCharacterTag
			? this.characterTags.find((t) => t.id === id)
			: null;
		if (!existingCharacterTag && isCharacterTag && !this.isOwner) {
			// GM viewer: look up from any actor in the story tag app
			if (game.user.isGM) {
				const storyTagActorIds = game.litm.storyTags?.config?.actors ?? [];
				for (const actorId of storyTagActorIds) {
					if (actorId === this.actorId) continue;
					const actor = game.actors.get(actorId);
					const allTags = actor?.sheet?._buildAllRollTags?.() || [];
					const found = allTags.find((t) => t.id === id);
					if (found) {
						existingCharacterTag = {
							...found,
							state: "",
							contributorId: null,
							contributorActorId: actor.id,
							contributorActorName: actor.name,
							contributorActorImg:
								actor.prototypeToken?.texture?.src || actor.img,
						};
						this.characterTags.push(existingCharacterTag);
						break;
					}
				}
			}
			// Non-owner player: look up from own character
			if (!existingCharacterTag) {
				const ownCharacter = game.user.character;
				if (ownCharacter) {
					const ownTags = ownCharacter.sheet?._buildAllRollTags?.() || [];
					const ownTag = ownTags.find((t) => t.id === id);
					if (ownTag) {
						existingCharacterTag = {
							...ownTag,
							state: "",
							contributorId: null,
							contributorActorId: ownCharacter.id,
							contributorActorName: ownCharacter.name,
							contributorActorImg:
								ownCharacter.prototypeToken?.texture?.src || ownCharacter.img,
						};
						this.characterTags.push(existingCharacterTag);
					}
				}
			}
		}
		const existingStateTag = this.tagState.find((t) => t.id === id);
		const lookupTag =
			existingCharacterTag ||
			existingStateTag ||
			[...this.tags, ...this.statuses, ...this.gmTags].find((t) => t.id === id);
		if (!this.#canModifyTag(lookupTag)) {
			this.#revertTagChange(target, lookupTag?.state);
			return;
		}

		switch (type) {
			case "powerTag":
			case "themeTag":
			case "backpack":
			case "weaknessTag":
			case "relationshipTag": {
				const tag = this.characterTags.find((t) => t.id === id);
				if (tag) {
					tag.state = value;
					this.#assignContributor(tag, value);
				}
				break;
			}
			default: {
				const existingTag = this.tagState.find((t) => t.id === id);
				if (existingTag) {
					existingTag.state = value;
					this.#assignContributor(existingTag, value);
				} else {
					const tag = [...this.tags, ...this.statuses, ...this.gmTags].find(
						(t) => t.id === id,
					);
					if (tag) {
						this.tagState.push({
							...tag,
							state: value,
							contributorId: value ? game.user.id : null,
						});
					}
				}
			}
		}

		this.#updateTotalPower();
		this.#dispatchUpdate();
	}

	addTag(tag, toScratch) {
		tag.state =
			tag.type === "weaknessTag"
				? "negative"
				: toScratch
					? "scratched"
					: "positive";
		tag.states =
			tag.type === "weaknessTag" ? ",negative,positive" : ",positive,scratched";
		this.characterTags.push(tag);
	}

	removeTag(tag) {
		this.characterTags = this.characterTags.filter((t) => t.id !== tag.id);
		this.#updateTotalPower();
		this.#dispatchUpdate();
	}

	setCharacterTagState(tagId, state) {
		const tag = this.characterTags.find((t) => t.id === tagId);
		if (!tag) return;
		tag.state = state || "";
		tag.contributorId = state ? game.user.id : null;
		this.#updateTotalPower();
		this.#dispatchUpdate();
	}

	getFilteredArrayFromFormData(formData) {
		const allTags = [...this.tagState, ...this.characterTags];
		return Object.entries(formData)
			.filter(([_, v]) => !!v)
			.map(([key]) => allTags.find((t) => t.id === key))
			.filter(Boolean);
	}

	reset() {
		this.characterTags = [];
		this.tagState = [];
		this.#modifier = 0;
		this.#might = "equal";
		if (this.actor?.sheet?.rendered) this.actor.sheet.render(true);
	}

	async updatePresence(isOpen) {
		if (!this.isOwner) return;
		if (isOpen) {
			this.#normalizeContributors(this.ownerId);
			await this.actor?.setFlag("litm", "rollDialogOwner", {
				ownerId: this.ownerId,
				openedAt: Date.now(),
			});
		} else {
			await this.actor?.unsetFlag("litm", "rollDialogOwner");
		}
	}

	async close(options) {
		const wasRendered = this.rendered;
		const shouldClosePresence = this.isOwner;
		const result = await super.close(options);
		if (shouldClosePresence) {
			this.updatePresence(false);
		}
		if (wasRendered) Hooks.callAll("litm.rollDialogClosed", this.actor);
		return result;
	}

	#handleModifierChange(event) {
		const input = event.currentTarget;
		this.#modifier = Number(input.value) || 0;
		this.#updateTotalPower();
		this.#dispatchUpdate();
	}

	#handleMightChange(event) {
		const select = event.currentTarget;
		this.#might = select.value;
		this.#updateTotalPower();
		this.#dispatchUpdate();
	}

	#updateTotalPower() {
		if (!this.element) return;
		const totalPowerElement = this.element.querySelector(
			"[data-update='totalPower']",
		);
		if (totalPowerElement) {
			totalPowerElement.textContent = this.totalPower;
		}
	}

	async _createModerationRequest(data) {
		const id = foundry.utils.randomID();
		const userId = game.user.id;
		const tags = LitmRollDialog.#filterTags(data.tags);
		const { totalPower } = game.litm.methods.calculatePower({
			...tags,
			modifier: data.modifier,
			might: data.might,
		});
		const recipients = Object.entries(this.actor.ownership)
			.filter((u) => u[1] === 3 && u[0] !== "default")
			.map((u) => u[0]);

		await ChatMessage.create({
			content: await foundry.applications.handlebars.renderTemplate(
				"systems/litm/templates/chat/moderation.html",
				{
					title: t("LITM.Ui.roll_moderation"),
					id: this.actor.id,
					rollId: id,
					type: data.type,
					name: this.actor.name,
					hasTooltipData:
						tags.scratchedTags.length > 0 ||
						tags.powerTags.length > 0 ||
						tags.weaknessTags.length > 0 ||
						tags.positiveStatuses.length > 0 ||
						tags.negativeStatuses.length > 0 ||
						!!data.modifier,
					tooltipData: {
						...tags,
						modifier: data.modifier,
						might: data.might,
					},
					totalPower,
				},
			),
			whisper: recipients,
			flags: { litm: { id, userId, data } },
		});
	}

	#dispatchUpdate() {
		Sockets.dispatch("updateRollDialog", {
			actorId: this.actorId,
			characterTags: this.characterTags,
			tagState: this.tagState,
			modifier: this.#modifier,
			might: this.#might,
			ownerId: this.ownerId,
		});
	}

	dispatchSync() {
		this.#dispatchUpdate();
	}

	async receiveUpdate({
		characterTags,
		tagState,
		actorId,
		modifier,
		might,
		ownerId,
	}) {
		if (actorId !== this.actorId) return;

		if (characterTags) {
			this.characterTags = this.#mergeTags(this.characterTags, characterTags);
		}
		if (tagState) this.tagState = this.#mergeTags(this.tagState, tagState);
		if (modifier !== undefined) this.#modifier = modifier;
		if (might !== undefined) this.#might = might;
		if (ownerId !== undefined) this.ownerId = ownerId;
		this.#normalizeContributors(this.ownerId);

		if (this.actor?.sheet?.rendered) this.actor.sheet.render();
		if (this.rendered) this.render();
	}
}
