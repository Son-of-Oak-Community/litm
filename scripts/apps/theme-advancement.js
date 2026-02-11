import { findThemebookByName, toQuestionOptions } from "../utils.js";

export class ThemeAdvancementApp extends foundry.applications.api.HandlebarsApplicationMixin(
	foundry.applications.api.ApplicationV2,
) {
	static DEFAULT_OPTIONS = {
		id: "litm-theme-advancement",
		classes: ["litm", "litm-theme-advancement"],
		tag: "form",
		window: {
			title: "LITM.Ui.theme_advancement_title",
			resizable: true,
		},
		position: {
			width: 520,
			height: "auto",
		},
		actions: {
			addSpecialImprovement: ThemeAdvancementApp.#onAddSpecialImprovement,
			addPowerTag: ThemeAdvancementApp.#onAddPowerTag,
			addWeaknessTag: ThemeAdvancementApp.#onAddWeaknessTag,
			activatePowerTag: ThemeAdvancementApp.#onActivatePowerTag,
			activateWeaknessTag: ThemeAdvancementApp.#onActivateWeaknessTag,
		},
	};

	static PARTS = {
		form: {
			template: "systems/litm/templates/apps/theme-advancement.html",
			scrollable: [""],
		},
	};

	constructor(options = {}) {
		super(options);
		this.actorId = options.actorId;
		this.themeId = options.themeId;
		this._selectedThemebook = null;
	}

	async _prepareContext(_options) {
		const actor = game.actors.get(this.actorId);
		const theme = actor?.items.get(this.themeId);
		if (!actor || !theme) {
			return {
				actorId: this.actorId,
				themeId: this.themeId,
				theme: { name: "", img: "" },
				themebookName: "",
				specialImprovementOptions: [],
				specialImprovementDescriptions: {},
				inactivePowerTags: [],
				inactiveWeaknessTags: [],
				powerQuestionOptions: {},
				weaknessQuestionOptions: {},
				powerQuestionTexts: {},
				weaknessQuestionTexts: {},
				canSelect: false,
			};
		}

		const themebookName = theme.system?.themebook || "";
		const selectedThemebook = await findThemebookByName(themebookName);
		this._selectedThemebook = selectedThemebook;

		const existing = theme.system?.specialImprovements || [];
		const specialImprovementOptions =
			selectedThemebook?.system?.specialImprovements
				?.map((entry, index) => ({
					value: String(index),
					label: entry?.name || entry?.description || `#${index + 1}`,
					name: entry?.name || "",
					description: entry?.description || "",
				}))
				.filter(
					(entry) =>
						(entry.name || entry.description) &&
						!existing.some(
							(e) =>
								e.name === entry.name && e.description === entry.description,
						),
				) || [];

		const specialImprovementDescriptions = Object.fromEntries(
			specialImprovementOptions.map((opt) => [opt.value, opt.description]),
		);

		const inactivePowerTags = (theme.system?.powerTags || [])
			.map((tag, index) => ({
				value: String(index),
				label: tag.name || game.i18n.localize("LITM.Ui.name_power"),
			}))
			.filter((_, index) => !theme.system.powerTags[index].isActive);

		const inactiveWeaknessTags = (theme.system?.weaknessTags || [])
			.map((tag, index) => ({
				value: String(index),
				label: tag.name || game.i18n.localize("LITM.Ui.name_weakness"),
			}))
			.filter((_, index) => !theme.system.weaknessTags[index].isActive);

		const allPowerQuestions =
			selectedThemebook?.system?.powerTagQuestions || [];
		const allWeaknessQuestions =
			selectedThemebook?.system?.weaknessTagQuestions || [];

		const powerQuestionOptions = toQuestionOptions(allPowerQuestions, 1);
		const weaknessQuestionOptions = toQuestionOptions(allWeaknessQuestions, 0);

		const powerQuestionTexts = Object.fromEntries(
			allPowerQuestions
				.map((q, i) => [String(i), q])
				.filter(([i, q]) => Number(i) > 0 && `${q ?? ""}`.trim()),
		);
		const weaknessQuestionTexts = Object.fromEntries(
			allWeaknessQuestions
				.map((q, i) => [String(i), q])
				.filter(([, q]) => `${q ?? ""}`.trim()),
		);

		const improveValue = theme.system?.improve?.value || 0;

		return {
			actorId: this.actorId,
			themeId: this.themeId,
			theme,
			themebookName,
			specialImprovementOptions,
			specialImprovementDescriptions,
			inactivePowerTags,
			inactiveWeaknessTags,
			powerQuestionOptions,
			weaknessQuestionOptions,
			powerQuestionTexts,
			weaknessQuestionTexts,
			canSelect: improveValue >= 3,
		};
	}

	static #getTheme() {
		const actor = game.actors.get(this.actorId);
		return actor?.items.get(this.themeId) || null;
	}

	static #canSelect(theme) {
		return (theme?.system?.improve?.value || 0) >= 3;
	}

	static async #spendImprove(theme, updateData = {}) {
		if (ThemeAdvancementApp.#canSelect(theme)) {
			updateData["system.improve.value"] = 0;
		}
		await theme.update(updateData);
		Hooks.callAll("litm.themeAdvanced", theme.actor, theme, updateData);
	}

	static async #onAddSpecialImprovement(_event, target) {
		const theme = ThemeAdvancementApp.#getTheme.call(this);
		if (!theme || !ThemeAdvancementApp.#canSelect(theme)) return;

		const container = target.closest("fieldset");
		const select = container?.querySelector(
			"[data-role='special-improvement-select']",
		);
		const index = Number(select?.value ?? "");
		if (Number.isNaN(index)) return;

		const entries = this._selectedThemebook?.system?.specialImprovements || [];
		const entry = entries[index];
		if (!entry) return;

		const existing = theme.system?.specialImprovements || [];
		const alreadySelected = existing.some(
			(improvement) =>
				improvement.name === entry.name &&
				improvement.description === entry.description,
		);
		if (alreadySelected) return;

		const next = [
			...existing,
			{
				name: entry.name || "",
				description: entry.description || "",
			},
		];

		await ThemeAdvancementApp.#spendImprove(theme, {
			"system.specialImprovements": next,
		});
		this.close();
	}

	_onRender(context, options) {
		super._onRender(context, options);
		const html = this.element;

		for (const select of html.querySelectorAll(
			"[data-role='power-tag-question-select'], [data-role='weakness-tag-question-select']",
		)) {
			select.addEventListener("change", () => {
				const input = select
					.closest(".form-group")
					?.querySelector("input[type='text']");
				if (!input) return;
				const questions = JSON.parse(select.dataset.questions || "{}");
				input.placeholder = questions[select.value] || "";
			});
		}

		const improvementSelect = html.querySelector(
			"[data-role='special-improvement-select']",
		);
		const descriptionEl = html.querySelector(
			"[data-role='special-improvement-description']",
		);
		if (improvementSelect && descriptionEl) {
			const descriptions = JSON.parse(
				improvementSelect.dataset.descriptions || "{}",
			);
			improvementSelect.addEventListener("change", () => {
				const desc = descriptions[improvementSelect.value] || "";
				descriptionEl.textContent = desc;
				descriptionEl.hidden = !desc;
			});
		}
	}

	static async #onAddPowerTag(_event, target) {
		const theme = ThemeAdvancementApp.#getTheme.call(this);
		if (!theme || !ThemeAdvancementApp.#canSelect(theme)) return;
		const container = target.closest("fieldset");
		const select = container?.querySelector(
			"[data-role='power-tag-question-select']",
		);
		const input = container?.querySelector("input[type='text']");
		const question = select?.value || "";
		const name = input?.value?.trim() || "";
		if (!name) return;

		const powerTags = [...(theme.system?.powerTags || [])];
		powerTags.push({
			id: foundry.utils.randomID(),
			name,
			question,
			isActive: true,
			isScratched: false,
			type: "powerTag",
		});

		await ThemeAdvancementApp.#spendImprove(theme, {
			"system.powerTags": powerTags,
		});
		this.close();
	}

	static async #onAddWeaknessTag(_event, target) {
		const theme = ThemeAdvancementApp.#getTheme.call(this);
		if (!theme || !ThemeAdvancementApp.#canSelect(theme)) return;
		const container = target.closest("fieldset");
		const select = container?.querySelector(
			"[data-role='weakness-tag-question-select']",
		);
		const input = container?.querySelector("input[type='text']");
		const question = select?.value || "";
		const name = input?.value?.trim() || "";
		if (!name) return;

		const weaknessTags = [...(theme.system?.weaknessTags || [])];
		weaknessTags.push({
			id: foundry.utils.randomID(),
			name,
			question,
			isActive: true,
			isScratched: false,
			type: "weaknessTag",
		});

		await ThemeAdvancementApp.#spendImprove(theme, {
			"system.weaknessTags": weaknessTags,
		});
		this.close();
	}

	static async #onActivatePowerTag(_event, target) {
		const theme = ThemeAdvancementApp.#getTheme.call(this);
		if (!theme || !ThemeAdvancementApp.#canSelect(theme)) return;
		const container = target.closest("fieldset");
		const select = container?.querySelector(
			"[data-role='inactive-power-tag-select']",
		);
		const index = Number(select?.value ?? "");
		if (Number.isNaN(index)) return;

		const powerTags = [...(theme.system?.powerTags || [])];
		if (!powerTags[index]) return;
		powerTags[index] = { ...powerTags[index], isActive: true };

		await ThemeAdvancementApp.#spendImprove(theme, {
			"system.powerTags": powerTags,
		});
		this.close();
	}

	static async #onActivateWeaknessTag(_event, target) {
		const theme = ThemeAdvancementApp.#getTheme.call(this);
		if (!theme || !ThemeAdvancementApp.#canSelect(theme)) return;
		const container = target.closest("fieldset");
		const select = container?.querySelector(
			"[data-role='inactive-weakness-tag-select']",
		);
		const index = Number(select?.value ?? "");
		if (Number.isNaN(index)) return;

		const weaknessTags = [...(theme.system?.weaknessTags || [])];
		if (!weaknessTags[index]) return;
		weaknessTags[index] = { ...weaknessTags[index], isActive: true };

		await ThemeAdvancementApp.#spendImprove(theme, {
			"system.weaknessTags": weaknessTags,
		});
		this.close();
	}
}
