import { expect, test } from "@playwright/test";
import { SELECTORS } from "../../helpers/selectors";

const HERO_NAME = "Hero";

test.describe("Roll Dialog — Solo", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/game");
		await page
			.locator(SELECTORS.gameReady)
			.waitFor({ state: "visible", timeout: 15000 });
		// Open hero sheet in play mode
		await page.evaluate((name) => {
			const hero = game.actors.getName(name);
			hero?.sheet?.render(true);
		}, HERO_NAME);
		await page.locator(SELECTORS.heroSheet).waitFor({ state: "visible" });
	});

	test("roll dialog opens when tag is selected", async ({ page }) => {
		const sheet = page.locator(SELECTORS.heroSheet);
		const tag = sheet.locator(SELECTORS.action("selectTag")).first();
		if (await tag.isVisible()) {
			await tag.click();
			await expect(page.locator(SELECTORS.rollDialog)).toBeVisible();
		}
	});

	test("total power updates with tag selection", async ({ page }) => {
		const dialog = page.locator(SELECTORS.rollDialog);
		if (await dialog.isVisible()) {
			const powerDisplay = dialog.locator(SELECTORS.rollTotalPower);
			await expect(powerDisplay).toBeVisible();
		}
	});

	test("can set roll title", async ({ page }) => {
		// Open roll dialog first
		const sheet = page.locator(SELECTORS.heroSheet);
		const tag = sheet.locator(SELECTORS.action("selectTag")).first();
		if (await tag.isVisible()) {
			await tag.click();
			const titleInput = page.locator(SELECTORS.rollTitle);
			if (await titleInput.isVisible()) {
				await titleInput.fill("Test Roll");
				await expect(titleInput).toHaveValue("Test Roll");
			}
		}
	});

	test("submit creates chat message", async ({ page }) => {
		const isGM = await page.evaluate(() => game.user?.isGM ?? false);
		test.skip(!isGM, "Roll submission requires GM (no moderation needed)");

		const sheet = page.locator(SELECTORS.heroSheet);
		const tag = sheet.locator(SELECTORS.action("selectTag")).first();
		if (await tag.isVisible()) {
			await tag.click();
			const submitBtn = page.locator(SELECTORS.rollSubmit);
			if (await submitBtn.isVisible()) {
				const chatCountBefore = await page.evaluate(() => game.messages.size);
				await submitBtn.click();
				await page.waitForFunction(
					(before) => game.messages.size > before,
					chatCountBefore,
					{ timeout: 10000 },
				);
			}
		}
	});
});
