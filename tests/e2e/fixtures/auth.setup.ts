import { expect, test as setup } from "@playwright/test";

const PROJECT_PROFILE_MAP: Record<string, { user: string; state: string }> = {
	"gm-setup": { user: "Gamemaster", state: ".auth/gm.json" },
	"player-setup": { user: "Owner", state: ".auth/player-owner.json" },
	"observer-setup": { user: "Observer", state: ".auth/player-observer.json" },
};

setup("authenticate", async ({ page, baseURL }, testInfo) => {
	const profile = PROJECT_PROFILE_MAP[testInfo.project.name];
	if (!profile) {
		throw new Error(`Unknown setup project: "${testInfo.project.name}"`);
	}

	await page.goto(`${baseURL}/join`);

	// Foundry v14 renders the join form asynchronously via module scripts.
	const userSelect = page.locator('select[name="userid"]');
	await userSelect.waitFor({ state: "visible", timeout: 30_000 });

	await userSelect.selectOption({ label: profile.user });
	await page.locator('button[name="join"]').click();

	await page.waitForURL("**/game");
	await expect(page.locator("#board")).toBeVisible({ timeout: 30_000 });

	await page.context().storageState({ path: profile.state });
});
