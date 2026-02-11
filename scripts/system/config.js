export class LitmConfig {
	challenge_types = [
		"attacker",
		"barrier-hazard",
		"charge",
		"countdown",
		"mystery",
		"pursuer",
		"quarry",
		"temptation",
		"watcher",
	];

	vignette_types = ["block", "harm", "stress", "complication", "setback"];

	effects = {
		"LITM.Effects.category_target": {
			attack: {
				description: "LITM.Effects.attack.description",
				action: "LITM.Effects.attack.action",
				cost: "LITM.Effects.attack.cost",
				icon: "fas fa-swords",
			},
			disrupt: {
				description: "LITM.Effects.disrupt.description",
				action: "LITM.Effects.disrupt.action",
				cost: "LITM.Effects.disrupt.cost",
				icon: "fas fa-ban",
			},
			influence: {
				description: "LITM.Effects.influence.description",
				action: "LITM.Effects.influence.action",
				cost: "LITM.Effects.influence.cost",
				icon: "fas fa-hand-paper",
			},
			weaken: {
				description: "LITM.Effects.weaken.description",
				action: "LITM.Effects.weaken.action",
				cost: "LITM.Effects.weaken.cost",
				icon: "fas fa-dizzy",
			},
		},
		"LITM.Effects.category_ally": {
			bestow: {
				description: "LITM.Effects.bestow.description",
				action: "LITM.Effects.bestow.action",
				cost: "LITM.Effects.bestow.cost",
				icon: "fas fa-gift",
			},
			enhance: {
				description: "LITM.Effects.enhance.description",
				action: "LITM.Effects.enhance.action",
				cost: "LITM.Effects.enhance.cost",
				icon: "fas fa-bolt",
			},
			create: {
				description: "LITM.Effects.create.description",
				action: "LITM.Effects.create.action",
				cost: "LITM.Effects.create.cost",
				icon: "fas fa-tags",
			},
			restore: {
				description: "LITM.Effects.restore.description",
				action: "LITM.Effects.restore.action",
				cost: "LITM.Effects.restore.cost",
				icon: "fas fa-heart",
			},
		},
		"LITM.Effects.category_process": {
			advance: {
				description: "LITM.Effects.advance.description",
				action: "LITM.Effects.advance.action",
				cost: "LITM.Effects.advance.cost",
				icon: "fas fa-arrow-right",
			},
			set_back: {
				description: "LITM.Effects.set_back.description",
				action: "LITM.Effects.set_back.action",
				cost: "LITM.Effects.set_back.cost",
				icon: "fas fa-arrow-left",
			},
		},
		"LITM.Effects.category_other": {
			discover: {
				description: "LITM.Effects.discover.description",
				action: "LITM.Effects.discover.action",
				cost: "LITM.Effects.discover.cost",
				icon: "fas fa-search",
			},
			extra_feat: {
				description: "LITM.Effects.extra_feat.description",
				action: "LITM.Effects.extra_feat.action",
				cost: "LITM.Effects.extra_feat.cost",
				icon: "fas fa-plus",
			},
		},
	};

	/**
	 * You can use this to completely override the default effects.
	 * formula: ({ totalPower }) => `${1 + Math.max(Math.abs(totalPower))}d6${totalPower < 1 ? `kl1` : "kh1"}`,
	 * resolver: (roll) => {
	 *    if (roll.dice[0].results.every(d => d.active && d.result === 1)) return { label: "failure", description: "Litm.ui.roll-failure" };
	 * }
	 * @link scripts/apps/roll-dialog.js
	 * @link scripts/apps/roll.js
	 */
	roll = { formula: null, resolver: null };

	theme_levels = {
		origin: [
			"circumstance",
			"past",
			"devotion",
			"mystery",
			"people",
			"possessions",
			"personality",
			"trade-or-skill",
			"trait",
			"hedge-magic",
		],
		adventure: [
			"prodigious-skill",
			"duty",
			"relic",
			"uncanny-being",
			"thaumaturgy",
		],
		greatness: [
			"rulership",
			"destiny",
			"mastery",
			"monstrosity",
			"grand-thaumaturgy",
		],
	};

	static #TAG_STRING_RE_SOURCE =
		String.raw`(?!\b|\s)(?:\[|\{)([^^\d[\]{}]+?)(?:([-:])(\d+)?)?(?:\}|\])`;
	static #TAG_STRING_RE_FLAGS = "gi";

	get tagStringRe() {
		return new RegExp(
			LitmConfig.#TAG_STRING_RE_SOURCE,
			LitmConfig.#TAG_STRING_RE_FLAGS,
		);
	}

	sceneLinkRe = /@ActivateScene\[([^\]]+)\](?:\{([^}]+)\})?/gi;

	assets = {
		logo: "systems/litm/assets/media/logo.svg",
		splash: "systems/litm/assets/media/litm_splash.webp",
		marshal_crest: "systems/litm/assets/media/marshal-crest.webp",
		icons: {
			base: "systems/litm/assets/media/icons/",
			backpack: "backpack.svg",
			fellowship: "fellowship.svg",
			trope: "book.svg",
			vignette: "cracked-skull.svg",
			default: "icons/svg/item-bag.svg",
		},
		preloads: [],
	};
}
