import { expect, test } from "@playwright/test";
import { SELECTORS } from "../../helpers/selectors";

const HERO_NAME = "Hero";

test.describe("SuperCheckbox", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/game");
		await page
			.locator(SELECTORS.gameReady)
			.waitFor({ state: "visible", timeout: 15000 });
		await page.evaluate(
			(name) => game.actors.getName(name)?.sheet?.render(true),
			HERO_NAME,
		);
		await page.locator(SELECTORS.heroSheet).waitFor({ state: "visible" });
	});

	test("cycles through all states on click", async ({ page }) => {
		const checkbox = page.locator(SELECTORS.superCheckbox).first();
		if (await checkbox.isVisible()) {
			const states = ["", "negative", "positive", "scratched"];
			const initial = (await checkbox.getAttribute("value")) || "";
			const startIdx = states.indexOf(initial);

			for (let i = 1; i <= 4; i++) {
				await checkbox.click();
				const expected = states[(startIdx + i) % states.length];
				await expect(checkbox).toHaveAttribute("value", expected);
			}
		}
	});

	test("responds to keyboard Enter", async ({ page }) => {
		const checkbox = page.locator(SELECTORS.superCheckbox).first();
		if (await checkbox.isVisible()) {
			const before = await checkbox.getAttribute("value");
			await checkbox.focus();
			await page.keyboard.press("Enter");
			const after = await checkbox.getAttribute("value");
			expect(after).not.toBe(before);
		}
	});
});
