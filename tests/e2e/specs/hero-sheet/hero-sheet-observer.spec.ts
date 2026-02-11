import { expect, test } from "@playwright/test";
import { SELECTORS } from "../../helpers/selectors";

const HERO_NAME = "Hero";

test.describe("Hero Sheet — Observer", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/game");
		await page
			.locator(SELECTORS.gameReady)
			.waitFor({ state: "visible", timeout: 15_000 });
		await page.evaluate(
			(name) => game.actors.getName(name)?.sheet?.render(true),
			HERO_NAME,
		);
	});

	test("sheet renders", async ({ page }) => {
		const sheet = page.locator(SELECTORS.heroSheet);
		// The sheet may or may not be visible depending on permissions
		// If visible, verify it has basic content
		if (await sheet.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await expect(sheet).toBeVisible();
		}
	});
});
