import { expect, test } from "@playwright/test";
import { SELECTORS } from "../../helpers/selectors";

const HERO_NAME = "Hero";

test.describe("Hero Sheet — Player Owner", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/game");
		await page
			.locator(SELECTORS.gameReady)
			.waitFor({ state: "visible", timeout: 15_000 });
		await page.evaluate(
			(name) => game.actors.getName(name)?.sheet?.render(true),
			HERO_NAME,
		);
		await page
			.locator(SELECTORS.heroSheet)
			.waitFor({ state: "visible", timeout: 10_000 });
	});

	test("sheet is visible", async ({ page }) => {
		const sheet = page.locator(SELECTORS.heroSheet);
		await expect(sheet).toBeVisible();
	});

	test("can select tag for roll", async ({ page }) => {
		const sheet = page.locator(SELECTORS.heroSheet);
		const tag = sheet.locator(SELECTORS.action("selectTag")).first();
		if (await tag.isVisible()) {
			await tag.click();
			await expect(page.locator(SELECTORS.rollDialog)).toBeVisible({
				timeout: 10_000,
			});
		}
	});

	test("super checkbox cycles states", async ({ page }) => {
		const sheet = page.locator(SELECTORS.heroSheet);
		const checkbox = sheet.locator(SELECTORS.superCheckbox).first();
		if (await checkbox.isVisible()) {
			const initial = await checkbox.getAttribute("value");
			await checkbox.click();
			const after = await checkbox.getAttribute("value");
			expect(after).not.toBe(initial);
		}
	});
});
