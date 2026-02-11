export const SELECTORS = {
	// Foundry
	joinPage: "#join-game-form",
	loginSelect: 'select[name="userid"]',
	joinButton: 'button[name="join"]',
	gameReady: "#sidebar",

	// Actor Sheets
	heroSheet: ".litm-hero-sheet",
	challengeSheet: ".litm-challenge-sheet",
	journeySheet: ".litm-journey-sheet",
	modeToggle: '[data-action="changeMode"]',

	// Actions
	action: (name: string) => `[data-action="${name}"]`,
	actionWithId: (name: string, id: string) =>
		`[data-action="${name}"][data-item-id="${id}"]`,

	// Roll Dialog
	rollDialog: ".litm--roll",
	rollTitle: 'input[name="title"]',
	rollMight: 'select[name="might"]',
	rollModifier: 'input[name="modifier"]',
	rollSubmit: 'button[type="submit"]',
	rollTotalPower: ".litm--roll-dialog-total-power-value",

	// HUD
	hud: "#litm-roll-dialog-hud",
	hudItem: ".litm-roll-dialog-hud__item",

	// Custom Elements
	superCheckbox: "litm-super-checkbox",

	// Tags
	tag: ".litm--tag",
	storyTag: ".litm--story-tag",
	status: ".litm--status",
} as const;
