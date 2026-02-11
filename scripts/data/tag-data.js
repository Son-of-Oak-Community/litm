export class TagData extends foundry.abstract.DataModel {
	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			id: new fields.StringField({
				required: true,
				nullable: false,
				validate: (id) => foundry.data.validators.isValidId(id),
				initial: () => foundry.utils.randomID(),
			}),
			name: new fields.StringField({
				required: true,
				nullable: false,
				initial: "",
			}),
			question: new fields.StringField({
				required: false,
				nullable: true,
				initial: "",
			}),
			isActive: new fields.BooleanField({
				required: true,
				initial: false,
			}),
			isScratched: new fields.BooleanField({
				required: true,
				initial: false,
			}),
			type: new fields.StringField({
				required: true,
				choices: ["weaknessTag", "powerTag", "backpack", "themeTag"],
			}),
		};
	}

	static migrateData(source) {
		if (source.isScratched === undefined && source.isBurnt !== undefined) {
			source.isScratched = source.isBurnt;
		}
		return super.migrateData(source);
	}
}
