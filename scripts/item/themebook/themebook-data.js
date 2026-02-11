export class ThemebookData extends foundry.abstract.TypeDataModel {
	get levelIcon() {
		return `systems/litm/assets/media/icons/${this.theme_level}.svg`;
	}

	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			theme_level: new fields.StringField({
				trim: true,
				initial: "origin",
				validate: (level) =>
					["origin", "adventure", "greatness", "variable"].includes(level),
			}),
			isFellowship: new fields.BooleanField({
				initial: false,
			}),
			description: new fields.HTMLField({
				initial: "",
			}),
			envisioningTags: new fields.ArrayField(
				new fields.StringField({ trim: true }),
				{
					initial: () => Array(3).fill(""),
				},
			),
			powerTagQuestions: new fields.ArrayField(
				new fields.StringField({ trim: true }),
				{
					initial: () => Array(10).fill(""),
				},
			),
			weaknessTagQuestions: new fields.ArrayField(
				new fields.StringField({ trim: true }),
				{
					initial: () => Array(4).fill(""),
				},
			),
			questIdeas: new fields.ArrayField(
				new fields.StringField({ trim: true }),
				{
					initial: () => [],
				},
			),
			specialImprovements: new fields.ArrayField(
				new fields.SchemaField({
					name: new fields.StringField({
						trim: true,
						initial: "",
					}),
					description: new fields.StringField({
						trim: true,
						initial: "",
					}),
				}),
				{
					initial: () =>
						Array(3)
							.fill()
							.map(() => ({ name: "", description: "" })),
				},
			),
		};
	}
}
