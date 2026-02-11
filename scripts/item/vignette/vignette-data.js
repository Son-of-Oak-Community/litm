export class VignetteData extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			threat: new fields.StringField({
				initial: "",
			}),
			consequences: new fields.ArrayField(
				new fields.StringField({ required: false, nullable: false }),
				{
					initial: () => [],
				},
			),
			isConsequenceOnly: new fields.BooleanField({
				initial: false,
			}),
		};
	}
}
