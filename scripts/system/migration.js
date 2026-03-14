import { info, warn } from "../logger.js";
import { LitmSettings } from "./settings.js";

/**
 * Migration runner for Legend in the Mist.
 *
 * To add a migration, push an entry to the `migrations` array below.
 * Each entry must have:
 *   - `version`  : the system version this migration targets (Number)
 *   - `label`    : a human-readable description of what it does
 *   - `migrate`  : an async function that performs the migration
 *
 * Migrations run in order. Only migrations whose `version` is greater than
 * the world's stored `systemMigrationVersion` will execute.
 */

/** @type {{ version: number, label: string, migrate: () => Promise<void> }[]} */
const migrations = [
	// Example migration — uncomment and adapt when needed:
	// {
	// 	version: 31,
	// 	label: "Example: migrate actor data for v31",
	// 	migrate: async () => {
	// 		for (const actor of game.actors) {
	// 			// ... transform actor data ...
	// 		}
	// 	},
	// },
];

/**
 * Run all pending migrations for the current world.
 * Should be called from a `Hooks.once("ready")` callback, GM-only.
 */
export async function runMigrations() {
	if (!game.user.isGM) return;

	const currentVersion = Number(game.system.version);
	const migrationVersion = LitmSettings.systemMigrationVersion;

	const pending = migrations.filter((m) => m.version > migrationVersion);
	if (!pending.length) {
		// No migrations needed — just stamp the current version
		if (migrationVersion < currentVersion) {
			await LitmSettings.setSystemMigrationVersion(currentVersion);
		}
		return;
	}

	info(`Running ${pending.length} migration(s)...`);
	ui.notifications.info(
		`Legend in the Mist | Running ${pending.length} data migration(s). Please do not close the application.`,
		{ permanent: true },
	);

	for (const { version, label, migrate } of pending) {
		try {
			info(`Migration v${version}: ${label}`);
			await migrate();
			await LitmSettings.setSystemMigrationVersion(version);
			info(`Migration v${version} complete.`);
		} catch (err) {
			warn(`Migration v${version} failed!`, err);
			ui.notifications.error(
				`Legend in the Mist | Migration to v${version} failed. See the console (F12) for details.`,
				{ permanent: true },
			);
			return; // Stop running further migrations
		}
	}

	// Stamp final version
	if (migrationVersion < currentVersion) {
		await LitmSettings.setSystemMigrationVersion(currentVersion);
	}

	ui.notifications.info("Legend in the Mist | All migrations complete.", {
		permanent: false,
	});
}
