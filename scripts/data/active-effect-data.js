export class StoryTagData extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			isSingleUse: new fields.BooleanField({ initial: false }),
			isScratched: new fields.BooleanField({ initial: false }),
			isHidden: new fields.BooleanField({ initial: false }),
			changes: new fields.ArrayField(
				new fields.SchemaField({
					type: new fields.StringField({
						required: true,
						blank: false,
					}),
					phase: new fields.StringField({
						required: true,
						blank: false,
					}),
					key: new fields.StringField({
						required: true,
						blank: false,
					}),
					value: new fields.StringField({
						required: true,
						blank: false,
					}),
					mode: new fields.NumberField({ integer: true, initial: 2 }),
					priority: new fields.NumberField(),
				}),
				{ initial: [] },
			),
		};
	}

	static migrateData(source) {
		if (source.isScratched === undefined && source.isBurnt !== undefined) {
			source.isScratched = source.isBurnt;
		}
		return super.migrateData(source);
	}
}

export class StatusCardData extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			isHidden: new fields.BooleanField({ initial: false }),
			tiers: new fields.ArrayField(new fields.BooleanField(), {
				initial: [false, false, false, false, false, false],
				validate: (tiers) => tiers.length === 6,
			}),
			changes: new fields.ArrayField(
				new fields.SchemaField({
					type: new fields.StringField({
						required: true,
						blank: false,
					}),
					phase: new fields.StringField({
						required: true,
						blank: false,
					}),
					key: new fields.StringField({
						required: true,
						blank: false,
					}),
					value: new fields.StringField({
						required: true,
						blank: false,
					}),
					mode: new fields.NumberField({ integer: true, initial: 2 }),
					priority: new fields.NumberField(),
				}),
				{ initial: [] },
			),
		};
	}

	static migrateData(source) {
		if (source.tiers && source.tiers.length !== 6) {
			source.tiers = Array.from({ length: 6 }, (_, i) => !!source.tiers[i]);
		}
		return super.migrateData(source);
	}

	get currentTier() {
		// Find the index of the highest marked box (0-indexed) + 1.
		// If no boxes are marked, return 0.
		// Logic: 6 - (index of first true from the end?) or just findLastIndex
		const lastIndex = this.tiers.lastIndexOf(true);
		return lastIndex === -1 ? 0 : lastIndex + 1;
	}

	get value() {
		return this.currentTier;
	}

	/**
	 * Mark a specific tier (box).
	 * Implements the stacking rule: If box N is already marked, mark box N+1.
	 * @param {number} tier - The tier to mark (1-6)
	 * @returns {boolean[]} New tiers array
	 */
	calculateMark(tier) {
		const index = tier - 1;
		if (index < 0 || index >= 6) return this.tiers;

		const newTiers = [...this.tiers];
		if (!newTiers[index]) {
			newTiers[index] = true;
		} else {
			// Find next empty slot
			let nextEmpty = -1;
			for (let i = index + 1; i < 6; i++) {
				if (!newTiers[i]) {
					nextEmpty = i;
					break;
				}
			}
			if (nextEmpty !== -1) {
				newTiers[nextEmpty] = true;
			}
		}
		return newTiers;
	}

	/**
	 * Reduce the status by shifting marks left.
	 * @param {number} amount - Amount to reduce
	 * @returns {boolean[]} New tiers array
	 */
	calculateReduction(amount) {
		// Shift all marks left by amount
		// e.g. [T, F, T, F, F, F] reduce 1 -> [F, T, F, F, F, F] -> [T, F, F, F, F, F] (shifted left)
		// Wait, "Shift left" usually means moving indices 1->0, 2->1.
		// So [T, F, T] reduce 1 -> [F, T, F] (index 1 moves to 0, index 2 moves to 1)
		// Let's implement this: indices i become i-amount. If i-amount < 0, it drops off.

		const newTiers = Array(6).fill(false);
		for (let i = 0; i < 6; i++) {
			if (this.tiers[i]) {
				const newIndex = i - amount;
				if (newIndex >= 0) {
					newTiers[newIndex] = true;
				}
			}
		}
		return newTiers;
	}
}
