export class LitmSettings {
	static get popoutTagsSidebar() {
		return game.settings.get("litm", "popout_tags_sidebar");
	}

	static get welcomed() {
		return game.settings.get("litm", "welcomed");
	}

	static setWelcomed(v) {
		return game.settings.set("litm", "welcomed", v);
	}

	static get storyTags() {
		return game.settings.get("litm", "storytags");
	}

	static setStoryTags(v) {
		return game.settings.set("litm", "storytags", v);
	}

	static get customDice() {
		return game.settings.get("litm", "custom_dice");
	}

	static get systemMigrationVersion() {
		return game.settings.get("litm", "systemMigrationVersion");
	}

	static setSystemMigrationVersion(v) {
		return game.settings.set("litm", "systemMigrationVersion", v);
	}

	static get fellowshipId() {
		return game.settings.get("litm", "fellowshipId");
	}

	static setFellowshipId(v) {
		return game.settings.set("litm", "fellowshipId", v);
	}

	static register() {
		game.settings.register("litm", "welcomed", {
			name: "LITM.Settings.welcome_screen",
			hint: "Welcome Scene, Message, and Journal Entry has been created and displayed.",
			scope: "world",
			config: false,
			type: Boolean,
			default: false,
		});

		game.settings.register("litm", "storytags", {
			name: "LITM.Settings.story_tags",
			hint: "Tags that are shared between all users.",
			scope: "world",
			config: false,
			type: Object,
			default: {
				tags: [],
				actors: [],
			},
		});
		game.settings.register("litm", "systemMigrationVersion", {
			name: "System Migration Version",
			scope: "world",
			config: false,
			type: Number,
			default: -1,
		});
		game.settings.register("litm", "fellowshipId", {
			name: "Fellowship Actor ID",
			scope: "world",
			config: false,
			type: String,
			default: "",
		});
		game.settings.register("litm", "custom_dice", {
			name: "LITM.Settings.custom_dice",
			hint: "LITM.Settings.custom_dice_hint",
			scope: "client",
			config: true,
			type: Boolean,
			default: true,
			requiresReload: true,
		});
		game.settings.register("litm", "popout_tags_sidebar", {
			name: "LITM.Settings.popout_tags_sidebar",
			hint: "LITM.Settings.popout_tags_sidebar_hint",
			scope: "client",
			config: true,
			type: Boolean,
			default: false,
		});
	}
}
