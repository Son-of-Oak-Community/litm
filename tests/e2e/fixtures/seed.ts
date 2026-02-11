import type { Page } from "@playwright/test";

/**
 * Seed test documents into the Foundry world via a GM page context.
 * Each document is created only if it does not already exist.
 */
export async function seedTestData(page: Page): Promise<void> {
	await page.evaluate(async () => {
		// Helper: create an actor if it doesn't exist
		async function ensureActor(name: string, type: string) {
			if (!game.actors.getName(name)) {
				await Actor.create({ name, type });
			}
		}

		// Helper: create an item if it doesn't exist
		async function ensureItem(name: string, type: string) {
			if (!game.items.getName(name)) {
				await Item.create({ name, type });
			}
		}

		// Create test actors
		await ensureActor("Hero", "hero");
		await ensureActor("Challenge", "challenge");
		await ensureActor("Journey", "journey");

		// Create test item
		await ensureItem("Theme", "theme");

		// Assign a theme to the hero if it has none
		const hero = game.actors.getName("Hero");
		if (hero && !hero.items.size) {
			await hero.createEmbeddedDocuments("Item", [
				{ name: "Theme", type: "theme" },
			]);
		}
	});
}

/**
 * Clean up test data by resetting names and removing extra embedded items.
 * Intended for use in afterAll blocks.
 */
export async function cleanupTestData(page: Page): Promise<void> {
	await page.evaluate(async () => {
		const testPrefix = "[Test] ";

		// Delete all test actors
		const testActors = game.actors.filter((a: { name: string }) =>
			a.name.startsWith(testPrefix),
		);
		for (const actor of testActors) {
			await actor.delete();
		}

		// Delete all test items
		const testItems = game.items.filter((i: { name: string }) =>
			i.name.startsWith(testPrefix),
		);
		for (const item of testItems) {
			await item.delete();
		}
	});
}
