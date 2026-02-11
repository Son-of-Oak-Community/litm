import { test as base, type Page } from "@playwright/test";

/**
 * Wait for Foundry VTT to be fully loaded by checking for the canvas board element.
 */
export async function waitForFoundryReady(page: Page): Promise<void> {
	await page.locator("#sidebar").waitFor({ state: "visible", timeout: 30_000 });
}

/**
 * Open an actor sheet by name using Foundry's API.
 */
export async function openActorSheet(
	page: Page,
	actorName: string,
): Promise<void> {
	await page.evaluate(
		(name) => game.actors.getName(name)?.sheet?.render(true),
		actorName,
	);
	await page
		.locator(".app.sheet")
		.waitFor({ state: "visible", timeout: 10_000 });
}

type FoundryFixtures = {
	gmPage: Page;
	playerPage: Page;
	observerPage: Page;
};

export const test = base.extend<FoundryFixtures>({
	gmPage: async ({ browser, baseURL }, use) => {
		const context = await browser.newContext({
			storageState: ".auth/gm.json",
		});
		const page = await context.newPage();
		await page.goto(`${baseURL}/game`);
		await waitForFoundryReady(page);
		await use(page);
		await context.close();
	},

	playerPage: async ({ browser, baseURL }, use) => {
		const context = await browser.newContext({
			storageState: ".auth/player-owner.json",
		});
		const page = await context.newPage();
		await page.goto(`${baseURL}/game`);
		await waitForFoundryReady(page);
		await use(page);
		await context.close();
	},

	observerPage: async ({ browser, baseURL }, use) => {
		const context = await browser.newContext({
			storageState: ".auth/player-observer.json",
		});
		const page = await context.newPage();
		await page.goto(`${baseURL}/game`);
		await waitForFoundryReady(page);
		await use(page);
		await context.close();
	},
});

export { expect } from "@playwright/test";
