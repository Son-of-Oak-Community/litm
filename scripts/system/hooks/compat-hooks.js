import { LitmSettings } from "../settings.js";

export function registerCompatHooks() {
	_patchUserIdleProperty();
	_customizeDiceSoNice();
}

/**
 * Workaround for Foundry V14 bug: #onModifyDocument sets user.idle = false,
 * but the property is read-only on User instances during socket events.
 */
function _patchUserIdle(user) {
	const desc = Object.getOwnPropertyDescriptor(user, "idle");
	if (desc && !desc.writable && !desc.set) {
		Object.defineProperty(user, "idle", {
			value: desc.value,
			writable: true,
			enumerable: desc.enumerable,
			configurable: true,
		});
	}
}

function _patchUserIdleProperty() {
	Hooks.once("setup", () => {
		for (const user of game.users) {
			_patchUserIdle(user);
		}
	});
	Hooks.on("userConnected", (user) => {
		_patchUserIdle(user);
	});
}

function _customizeDiceSoNice() {
	if (!LitmSettings.customDice) return;
	Hooks.on("diceSoNiceReady", (dice3d) => {
		dice3d.addSystem(
			{ id: "litm", name: game.i18n.localize("LITM.Name") },
			"preferred",
		);
		dice3d.addDicePreset(
			{
				type: "d6",
				labels: ["1", "2", "3", "4", "5", "F", "1", "2", "3", "4", "5", "F"],
				font: "LitM Dice",
				system: "litm",
			},
			"d12",
		);

		dice3d.addColorset(
			{
				name: "litm",
				description: `${game.i18n.localize("LITM.Name")} Default`,
				category: game.i18n.localize("LITM.Name"),
				foreground: ["#c9c9c9", "#c9c9c9", "#433a28", "#433a28", "#433a28"],
				background: ["#877376", "#446674", "#708768", "#A8A7A3", "#ac9e77"],
				outline: ["#433a28", "#433a28", undefined, undefined, undefined],
				texture: "stone",
				material: "stone",
				font: "Georgia",
				visibility: "visible",
			},
			"preferred",
		);
	});
}
