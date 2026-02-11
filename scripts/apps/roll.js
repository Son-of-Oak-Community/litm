import { localize as t } from "../utils.js";

export class LitmRoll extends Roll {
	static CHAT_TEMPLATE = "systems/litm/templates/chat/message.html";
	static TOOLTIP_TEMPLATE = "systems/litm/templates/chat/message-tooltip.html";

	get litm() {
		return this.options || {};
	}

	get actor() {
		return game.actors.get(this.litm.actorId);
	}

	get speaker() {
		const actor = this.actor;
		return { alias: actor?.name || "Unknown" };
	}

	get flavor() {
		switch (this.litm.type) {
			case "mitigate":
				return t("LITM.Ui.roll_mitigate");
			case "sacrifice":
				return t("LITM.Ui.roll_sacrifice");
			case "tracked":
				return t("LITM.Ui.roll_tracked");
			default:
				return t("LITM.Ui.roll_quick");
		}
	}

	get effect() {
		if (this.litm.type !== "mitigate") return null;
		return {
			action: "LITM.Effects.mitigate.action",
			description: "LITM.Effects.mitigate.description",
			cost: "LITM.Effects.mitigate.cost",
		};
	}

	get power() {
		const { label: outcome } = this.outcome;

		// Quick outcomes don't need to track power
		if (this.litm.type === "quick") return null;
		// Sacrifice outcomes don't generate power
		if (this.litm.type === "sacrifice") return 0;

		if (outcome === "consequences") return 0;

		// Minimum of 1 power
		let totalPower = Math.max(this.litm.totalPower, 1);

		// If it's not a strong success, return the total power
		// if (outcome === "consequence") return totalPower; // Removed optimization to be clearer

		// Mitigate outcomes add 1 power on a strong success
		if (this.litm.type === "mitigate" && outcome === "success") {
			totalPower += 1;
		}

		// Pushing adds 1 power in exchange for accepting consequences
		if (this.litm.pushed) {
			totalPower += 1;
		}

		return totalPower;
	}

	get outcome() {
		const { resolver } = CONFIG.litm.roll;

		if (typeof resolver === "function") return resolver(this);

		if (this.litm.type === "sacrifice") {
			if (this.total >= 10) {
				return {
					label: "success",
					description: "LITM.Ui.roll_sacrifice_success",
				};
			}
			if (this.total >= 7) {
				return {
					label: "snc",
					description: "LITM.Ui.roll_sacrifice_mixed",
				};
			}
			return {
				label: "consequences",
				description: "LITM.Ui.roll_sacrifice_failure",
			};
		}

		const diceTotal = this.dice.reduce((sum, die) => sum + die.total, 0);

		if (diceTotal === 2) {
			return {
				label: "consequences",
				description: "LITM.Ui.roll_failure",
			};
		}

		if (diceTotal === 12 || this.total > 9) {
			if (this.litm.pushed) {
				return {
					label: "snc",
					description: "LITM.Ui.roll_consequence",
				};
			}
			return {
				label: "success",
				description: "LITM.Ui.roll_success",
			};
		}

		if (this.total > 6) {
			return {
				label: "snc",
				description: "LITM.Ui.roll_consequence",
			};
		}

		return {
			label: "consequences",
			description: "LITM.Ui.roll_failure",
		};
	}

	get modifier() {
		return this.options.modifier || 0;
	}

	async render({
		template = this.constructor.CHAT_TEMPLATE,
		isPrivate = false,
	} = {}) {
		if (!this._evaluated) await this.evaluate();

		const chatData = {
			actor: this.actor,
			formula: isPrivate ? "???" : this._formula.replace(/\s\+0/, ""),
			flavor: isPrivate ? null : this.flavor,
			outcome: isPrivate ? "???" : this.outcome,
			power: isPrivate ? "???" : this.power,
			result: isPrivate ? "???" : this.result,
			title: this.litm.title,
			tooltip: isPrivate ? "" : await this.getTooltip(),
			total: isPrivate ? "" : Math.round(this.total * 100) / 100,
			type: this.litm.type,
			effect: this.effect,
			modifier: isPrivate ? "???" : this.modifier,
			user: game.user.id,
			isOwner: game.user.isGM || this.actor?.isOwner,
			canSpendPower:
				this.litm.type === "tracked" &&
				(this.outcome.label === "success" ||
					this.outcome.label === "snc" ||
					this.outcome.label === "consequences") &&
				this.power > 0,
		};

		return foundry.applications.handlebars.renderTemplate(template, chatData);
	}

	async getTooltip() {
		const parts = this.dice.map((d) => d.getTooltipData());
		const data = this.getTooltipData();
		return foundry.applications.handlebars.renderTemplate(
			LitmRoll.TOOLTIP_TEMPLATE,
			{ data, parts },
		);
	}

	getTooltipData() {
		const { label: outcome } = this.outcome;
		return {
			mitigate: this.litm.type === "mitigate" && outcome === "success",
			scratchedTags: this.litm.scratchedTags ?? this.litm.burnedTags ?? [],
			powerTags: this.litm.powerTags,
			weaknessTags: this.litm.weaknessTags,
			positiveStatuses: this.litm.positiveStatuses,
			negativeStatuses: this.litm.negativeStatuses,
			modifier: this.modifier,
		};
	}
}
