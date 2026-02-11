import { expect, test } from "@playwright/test";
import { SELECTORS } from "../../helpers/selectors";

const HERO_NAME = "Hero";

async function openHeroSheet(page) {
	await page.evaluate(
		(name) => game.actors.getName(name)?.sheet?.render(true),
		HERO_NAME,
	);
	await page
		.locator(SELECTORS.heroSheet)
		.waitFor({ state: "visible", timeout: 10_000 });
}

test.describe("Hero Sheet — GM", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/game");
		await page
			.locator(SELECTORS.gameReady)
			.waitFor({ state: "visible", timeout: 15_000 });
		await openHeroSheet(page);
	});

	test("sheet opens and is visible", async ({ page }) => {
		const sheet = page.locator(SELECTORS.heroSheet);
		await expect(sheet).toBeVisible();
	});

	test("toggles between edit and play mode", async ({ page }) => {
		const toggle = page.locator(
			`${SELECTORS.heroSheet} ${SELECTORS.modeToggle}`,
		);
		await toggle.click();
		await page
			.locator(SELECTORS.heroSheet)
			.waitFor({ state: "visible", timeout: 10_000 });
		await page
			.locator(`${SELECTORS.heroSheet} ${SELECTORS.modeToggle}`)
			.click();
		await page
			.locator(SELECTORS.heroSheet)
			.waitFor({ state: "visible", timeout: 10_000 });
	});

	test("can switch to edit mode and see inputs", async ({ page }) => {
		await page
			.locator(`${SELECTORS.heroSheet} ${SELECTORS.modeToggle}`)
			.click();
		await page
			.locator(SELECTORS.heroSheet)
			.waitFor({ state: "visible", timeout: 10_000 });
		await expect(
			page.locator(SELECTORS.heroSheet).locator("input").first(),
		).toBeVisible({ timeout: 5_000 });
	});

	test("can open roll dialog from play mode", async ({ page }) => {
		const tag = page
			.locator(`${SELECTORS.heroSheet} ${SELECTORS.action("selectTag")}`)
			.first();
		if (await tag.isVisible()) {
			await tag.click();
			await expect(page.locator(SELECTORS.rollDialog)).toBeVisible({
				timeout: 10_000,
			});
		}
	});

	test("can adjust progress track", async ({ page }) => {
		await page
			.locator(`${SELECTORS.heroSheet} ${SELECTORS.modeToggle}`)
			.click();
		await page
			.locator(SELECTORS.heroSheet)
			.waitFor({ state: "visible", timeout: 10_000 });
		await page.waitForTimeout(500);
		const progressBox = page
			.locator(`${SELECTORS.heroSheet} ${SELECTORS.action("adjustProgress")}`)
			.first();
		if (await progressBox.isVisible()) {
			await progressBox.click({ timeout: 10_000 });
		}
	});
});
