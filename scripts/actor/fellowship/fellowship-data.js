export class FellowshipData extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			description: new fields.HTMLField({ initial: "" }),
		};
	}

	get theme() {
		return this.parent.items.find(
			(item) => item.type === "theme" && item.system.isFellowship,
		);
	}

	get storyThemes() {
		return this.parent.items.filter((item) => item.type === "story_theme");
	}

	get allTags() {
		const theme = this.theme;
		const themeTags = theme ? theme.system.allTags : [];
		const storyTags = this.storyThemes.flatMap((item) => item.system.allTags);
		return [...themeTags, ...storyTags];
	}
}
