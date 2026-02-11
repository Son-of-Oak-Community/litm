export class TropeData extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			category: new fields.StringField({
				trim: true,
				initial: "",
			}),
			description: new fields.HTMLField({
				initial: "",
			}),
			themeKits: new fields.SchemaField({
				fixed: new fields.ArrayField(new fields.StringField({ trim: true }), {
					initial: () => Array(3).fill(""),
				}),
				optional: new fields.ArrayField(
					new fields.StringField({ trim: true }),
					{
						initial: () => Array(3).fill(""),
					},
				),
			}),
			backpackChoices: new fields.ArrayField(
				new fields.StringField({ trim: true }),
				{
					initial: () => Array(3).fill(""),
				},
			),
		};
	}
}
