import { expect } from "@playwright/test";
import { test } from "../../fixtures/foundry";
import { SELECTORS } from "../../helpers/selectors";

const HERO_NAME = "Hero";

test.describe("Roll Dialog — Multiplayer", () => {
	test.setTimeout(60_000);
	test("player roll shows in GM HUD", async ({ gmPage, playerPage }) => {
		// Player opens the hero sheet
		await playerPage.evaluate((name) => {
			game.actors.getName(name)?.sheet?.render(true);
		}, HERO_NAME);
		await playerPage
			.locator(SELECTORS.heroSheet)
			.waitFor({ state: "visible", timeout: 30_000 });

		// Player selects a tag to open roll dialog
		const tag = playerPage
			.locator(`${SELECTORS.heroSheet} ${SELECTORS.action("selectTag")}`)
			.first();
		await tag.click();
		await playerPage
			.locator(SELECTORS.rollDialog)
			.waitFor({ state: "visible", timeout: 15_000 });

		// GM should see the HUD update
		const hudItem = gmPage.locator(SELECTORS.hudItem).first();
		await expect(hudItem).toBeVisible({ timeout: 30_000 });
	});

	test("GM can open player roll dialog from HUD", async ({
		gmPage,
		playerPage,
	}) => {
		// Player opens roll dialog
		await playerPage.evaluate((name) => {
			game.actors.getName(name)?.sheet?.render(true);
		}, HERO_NAME);
		await playerPage
			.locator(SELECTORS.heroSheet)
			.waitFor({ state: "visible", timeout: 30_000 });

		const tag = playerPage
			.locator(`${SELECTORS.heroSheet} ${SELECTORS.action("selectTag")}`)
			.first();
		await tag.click();
		await playerPage
			.locator(SELECTORS.rollDialog)
			.waitFor({ state: "visible", timeout: 15_000 });

		// GM clicks HUD entry (re-query after waitFor to avoid detached DOM)
		await gmPage
			.locator(SELECTORS.hudItem)
			.first()
			.waitFor({ state: "visible", timeout: 30_000 });
		await gmPage.locator(SELECTORS.hudItem).first().click();

		// GM should see the roll dialog
		await expect(gmPage.locator(SELECTORS.rollDialog)).toBeVisible({
			timeout: 15_000,
		});
	});
});
