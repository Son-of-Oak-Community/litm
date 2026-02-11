export class ChallengeData extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			category: new fields.StringField({
				initial: "",
			}),
			rating: new fields.NumberField({
				required: true,
				initial: 1,
				min: 1,
				max: 5,
			}),
			description: new fields.HTMLField({ initial: "" }),
			might: new fields.ArrayField(
				new fields.SchemaField({
					level: new fields.StringField({
						initial: "origin",
						choices: ["origin", "adventure", "greatness"],
					}),
					description: new fields.StringField({ initial: "" }),
				}),
			),
			specialFeatures: new fields.HTMLField({ initial: "" }),
			limits: new fields.ArrayField(
				new fields.SchemaField({
					label: new fields.StringField({ initial: "" }),
					outcome: new fields.StringField({ initial: "" }),
					max: new fields.StringField({ initial: "3" }),
					value: new fields.NumberField({ initial: 0, min: 0, integer: true }),
				}),
			),
			tags: new fields.StringField({
				initial: "",
			}),
		};
	}

	get challenges() {
		return CONFIG.litm.challenge_types;
	}
}
