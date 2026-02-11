import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: ".",
	outputDir: "../../.playwright/results",
	timeout: 30_000,
	expect: { timeout: 5_000 },
	fullyParallel: false,
	workers: 3,
	retries: 0,
	reporter: [["html", { outputFolder: "../../.playwright/report" }]],
	use: {
		baseURL: process.env.FOUNDRY_URL || "http://localhost:30001",
		// Foundry VTT requires WebGL for its PIXI canvas, even on the join page.
		launchOptions: {
			args: ["--use-gl=angle", "--use-angle=swiftshader"],
		},
		viewport: { width: 1920, height: 1080 },
	},
	projects: [
		// --- Setup projects (authenticate each profile) ---
		{
			name: "gm-setup",
			testDir: "./fixtures",
			testMatch: "auth.setup.ts",
			use: { storageState: undefined },
		},
		{
			name: "player-setup",
			testDir: "./fixtures",
			testMatch: "auth.setup.ts",
			use: { storageState: undefined },
		},
		{
			name: "observer-setup",
			testDir: "./fixtures",
			testMatch: "auth.setup.ts",
			use: { storageState: undefined },
		},

		// --- Test projects ---
		{
			name: "gm",
			testDir: "./specs",
			testIgnore: ["**/roll-multiplayer*"],
			dependencies: ["gm-setup"],
			use: { storageState: ".auth/gm.json" },
		},
		{
			name: "player-owner",
			testDir: "./specs",
			testIgnore: ["**/hero-sheet-gm*", "**/roll-multiplayer*"],
			dependencies: ["player-setup"],
			use: { storageState: ".auth/player-owner.json" },
		},
		{
			name: "player-observer",
			testDir: "./specs",
			testIgnore: ["**/hero-sheet-gm*", "**/roll-multiplayer*"],
			dependencies: ["observer-setup"],
			use: { storageState: ".auth/player-observer.json" },
		},

		// --- Multiplayer (runs after single-user projects to avoid session conflicts) ---
		{
			name: "multiplayer",
			testDir: "./specs",
			testMatch: ["**/roll-multiplayer*"],
			retries: 1,
			dependencies: ["gm", "player-owner", "player-observer"],
			use: { storageState: ".auth/gm.json" },
		},
	],
});
