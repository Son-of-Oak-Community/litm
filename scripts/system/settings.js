export class LitmSettings {
	static get systemMigrationVersion() {
		return game.settings.get("litm", "systemMigrationVersion");
	}

	static async setSystemMigrationVersion(version) {
		await game.settings.set("litm", "systemMigrationVersion", version);
	}

	static get welcomed() {
		return game.settings.get("litm", "welcomed");
	}

	static get deprecationAcknowledged() {
		return game.settings.get("litm", "deprecationAcknowledged");
	}

	static async setDeprecationAcknowledged(value) {
		await game.settings.set("litm", "deprecationAcknowledged", value);
	}

	static register() {
		game.settings.register("litm", "systemMigrationVersion", {
			name: "System Migration Version",
			hint: "Records the last migration version applied to this world.",
			scope: "world",
			config: false,
			type: Number,
			default: -1,
		});

		game.settings.register("litm", "deprecationAcknowledged", {
			name: "Deprecation Notice Acknowledged",
			hint: "Whether the GM has acknowledged the deprecation notice.",
			scope: "world",
			config: false,
			type: Boolean,
			default: false,
		});

		game.settings.register("litm", "welcomed", {
			name: "Welcome Screen",
			hint: "Welcome Scene, Message, and Journal Entry has been created and displayed.",
			scope: "world",
			config: false,
			type: Boolean,
			default: false,
		});

		game.settings.register("litm", "storytags", {
			name: "Story Tags",
			hint: "Tags that are shared between all users.",
			scope: "world",
			config: false,
			type: Object,
			default: {
				tags: [],
				actors: [],
			},
		});
		game.settings.register("litm", "show_tag_window_on_load", {
			name: "Litm.ui.show-tag-window-on-load",
			hint: "Litm.ui.show-tag-window-on-load-hint",
			scope: "client",
			config: true,
			type: Boolean,
			default: true,
		});
		game.settings.register("litm", "skip_roll_moderation", {
			name: "Litm.settings.skip-roll-moderation",
			hint: "Litm.settings.skip-roll-moderation-hint",
			scope: "client",
			config: true,
			type: Boolean,
			default: false,
		});
	}
}
