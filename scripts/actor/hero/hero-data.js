export class HeroData extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			description: new fields.HTMLField({ initial: "" }),
			relationships: new fields.ArrayField(
				new fields.SchemaField({
					actorId: new fields.StringField({ initial: "" }),
					name: new fields.StringField({ initial: "" }),
					tag: new fields.StringField({ initial: "" }),
					isScratched: new fields.BooleanField({ initial: false }),
				}),
				{
					initial: [],
				},
			),
			promise: new fields.NumberField({
				initial: 0,
				min: 0,
				max: 5,
				integer: true,
			}),
			mof: new fields.ArrayField(
				new fields.SchemaField({
					name: new fields.StringField({ initial: "" }),
					description: new fields.HTMLField({ initial: "" }),
				}),
				{ initial: [] },
			),
			fellowshipId: new fields.StringField({ initial: "" }),
			limit: new fields.SchemaField({
				value: new fields.NumberField({ initial: 6, integer: true }),
				max: new fields.NumberField({ initial: 6, integer: true }),
			}),
		};
	}

	static getTrackableAttributes() {
		return {
			bar: ["limit"],
			value: [],
		};
	}

	get fellowshipActor() {
		if (this.fellowshipId) {
			const actor = game.actors.get(this.fellowshipId);
			if (actor) return actor;
		}
		// Fallback to the global singleton
		return game.litm?.fellowship ?? null;
	}

	get backpack() {
		const backpack = this.parent.items.find((item) => item.type === "backpack");
		if (!backpack) return [];
		return backpack.system.contents;
	}

	get #themeItems() {
		const ownThemes = this.parent.items.filter(
			(item) => item.type === "theme" || item.type === "story_theme",
		);
		const fellowship = this.fellowshipActor;
		if (!fellowship) return ownThemes;
		const fellowshipThemes = fellowship.items.filter(
			(item) => item.type === "theme" || item.type === "story_theme",
		);
		return [...ownThemes, ...fellowshipThemes];
	}

	get allTags() {
		const backpack = this.backpack;
		const themeTags = this.#themeItems.flatMap((item) => item.system.allTags);
		return [...backpack, ...themeTags];
	}

	get powerTags() {
		return this.allTags.filter(
			(tag) =>
				tag.type === "powerTag" ||
				tag.type === "themeTag" ||
				tag.type === "backpack",
		);
	}

	get weaknessTags() {
		return this.#themeItems.flatMap((item) => item.system.weakness);
	}

	get availablePowerTags() {
		const backpack = this.backpack.filter(
			(tag) => tag.isActive && !tag.isScratched,
		);
		const themeTags = this.#themeItems.flatMap(
			(item) => item.system.availablePowerTags,
		);
		return [...backpack, ...themeTags];
	}

	get relationshipEntries() {
		const heroActors = (game.actors ?? []).filter(
			(actor) => actor.type === "hero" && actor.id !== this.parent.id,
		);
		const existing = Array.isArray(this.relationships)
			? this.relationships
			: [];
		return heroActors
			.map((actor) => {
				const existingEntry =
					existing.find((entry) => entry.actorId === actor.id) ||
					existing.find(
						(entry) =>
							!entry.actorId &&
							(entry.name ?? "").toLowerCase() === actor.name.toLowerCase(),
					);
				return {
					actorId: actor.id,
					name: actor.name,
					img: actor.img,
					tag: existingEntry?.tag ?? "",
					isScratched: existingEntry?.isScratched ?? false,
				};
			})
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	get relationshipTags() {
		return this.relationshipEntries
			.map((entry) => {
				const tag = (entry?.tag ?? "").trim();
				if (!tag) return null;
				return {
					id: `relationship-${entry.actorId}`,
					name: `${entry.name} - ${tag}`,
					displayName: tag,
					themeId: `__relationship_${entry.actorId}`,
					themeName: entry.name,
					actorImg: entry.img,
					type: "relationshipTag",
					isSingleUse: true,
					isScratched: entry.isScratched,
					state: "",
					states: ",positive",
				};
			})
			.filter(Boolean);
	}

	get statuses() {
		return (this.parent.effects ?? [])
			.filter(
				(effect) => effect.system instanceof game.litm.data.StatusCardData,
			)
			.filter((effect) => game.user.isGM || !effect.system?.isHidden)
			.map((effect) => {
				return {
					id: effect._id,
					name: effect.name,
					type: "status",
					value: effect.system.currentTier,
				};
			});
	}

	get storyTags() {
		return (this.parent.effects ?? [])
			.filter((effect) => effect.system instanceof game.litm.data.StoryTagData)
			.filter((effect) => game.user.isGM || !effect.system?.isHidden)
			.map((effect) => {
				return {
					id: effect._id,
					name: effect.name,
					type: "tag",
					isSingleUse: effect.system?.isSingleUse ?? false,
					value: 1, // Story tags are just 1
				};
			});
	}

	prepareDerivedData() {
		const highestStatus =
			this.statuses.sort((a, b) => b.value - a.value)[0]?.value || 0;
		this.limit.value = 6 - highestStatus;
		this.limit.max = 6;
	}
}
