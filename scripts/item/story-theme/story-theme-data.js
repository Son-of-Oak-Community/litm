import { titleCase } from "../../utils.js";

export class StoryThemeData extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const fields = foundry.data.fields;
		const abstract = game.litm.data;
		return {
			isScratched: new fields.BooleanField(),
			description: new fields.HTMLField({
				initial: "",
			}),
			theme: new fields.SchemaField({
				level: new fields.StringField({
					trim: true,
					initial: "story", // Default level
				}),
				powerTags: new fields.ArrayField(
					new fields.EmbeddedDataField(abstract.TagData),
					{
						initial: () => [
							{
								id: foundry.utils.randomID(),
								name: "",
								type: "powerTag",
								isActive: true,
								isScratched: false,
							},
							{
								id: foundry.utils.randomID(),
								name: "",
								type: "powerTag",
								isActive: true,
								isScratched: false,
							},
						],
					},
				),
				weaknessTags: new fields.ArrayField(
					new fields.EmbeddedDataField(abstract.TagData),
					{
						initial: () => [
							{
								id: foundry.utils.randomID(),
								name: "",
								type: "weaknessTag",
								isActive: true,
								isScratched: false,
							},
						],
					},
				),
			}),
		};
	}

	prepareDerivedData() {
		for (const tag of this.theme.weaknessTags) {
			tag.isScratched = false;
		}
	}

	get themeTag() {
		const item = {
			id: this.parent._id,
			name: titleCase(this.parent.name),
			isActive: true,
			isScratched: this.isScratched ?? false,
			type: "themeTag",
		};
		return game.litm.data.TagData.fromSource(item);
	}

	get powerTags() {
		return this.theme.powerTags;
	}

	get weaknessTags() {
		return this.theme.weaknessTags;
	}

	get weakness() {
		return this.weaknessTags;
	}

	get allTags() {
		return [...this.weaknessTags, ...this.powerTags, this.themeTag];
	}

	get availablePowerTags() {
		return [...this.powerTags, this.themeTag].filter(
			(tag) => tag.isActive && !tag.isScratched,
		);
	}
}
