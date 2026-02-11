import { LitmItemSheet } from "../../sheets/base-item-sheet.js";
import {
	findThemebookByName,
	queryItemsFromPacks,
	toQuestionOptions,
} from "../../utils.js";

/**
 * Theme sheet for Legend in the Mist
 * Represents a character's Origin, Adventure, or Greatness theme
 */
export class ThemeSheet extends LitmItemSheet {
	/** @override */
	static DEFAULT_OPTIONS = {
		classes: ["litm", "litm-theme-sheet"],
		tag: "form",
		position: {
			width: 600,
			height: "auto",
		},
		actions: {
			addTag: ThemeSheet.#onAddTag,
			removeTag: ThemeSheet.#onRemoveTag,
			adjustProgress: ThemeSheet.#onAdjustProgress,
			addSpecialImprovement: ThemeSheet.#onAddSpecialImprovement,
			removeSpecialImprovement: ThemeSheet.#onRemoveSpecialImprovement,
		},
		form: {
			submitOnChange: true,
			closeOnSubmit: false,
		},
		window: {
			icon: "fa-solid fa-book",
			resizable: true,
		},
	};

	/** @override */
	static PARTS = {
		form: {
			template: "systems/litm/templates/item/theme.html",
			scrollable: [""],
		},
	};

	/* -------------------------------------------- */
	/*  Rendering                                   */
	/* -------------------------------------------- */

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		// Computed properties
		const levels = CONFIG.litm.theme_levels
			? Object.keys(CONFIG.litm.theme_levels).reduce((acc, level) => {
					acc[level] = game.i18n.localize(`LITM.Terms.${level}`);
					return acc;
				}, {})
			: {};

		const themebooks = await this.#getThemebookOptions();
		const selectedThemebook = await findThemebookByName(this.system.themebook);
		const allPowerQuestions =
			selectedThemebook?.system?.powerTagQuestions || [];
		const allWeaknessQuestions =
			selectedThemebook?.system?.weaknessTagQuestions || [];
		const powerQuestionOptions = toQuestionOptions(
			allPowerQuestions,
			1, // Skip first question (reserved for theme tag)
		);
		const weaknessQuestionOptions = toQuestionOptions(
			allWeaknessQuestions,
			0, // Start from first question
		);

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

		// Enrich HTML note
		const enrichedNote =
			(await foundry.applications.ux.TextEditor.enrichHTML(this.system.note, {
				secrets: this.document.isOwner,
				relativeTo: this.document,
			})) || "";

		// Enrich HTML description
		const enrichedDescription =
			(await foundry.applications.ux.TextEditor.enrichHTML(
				this.system.description,
				{
					secrets: this.document.isOwner,
					relativeTo: this.document,
				},
			)) || "";

		// Theme tag question (Question A) for placeholder
		const themeTagQuestion = `${allPowerQuestions[0] ?? ""}`.trim();

		return {
			...context,
			enriched: {
				note: enrichedNote,
				description: enrichedDescription,
			},
			// Document data
			item: this.document,
			system: this.system,

			// Computed properties
			weakness: this.system.weakness,
			levels,
			themebooks,
			powerQuestionOptions,
			weaknessQuestionOptions,
			powerQuestionTexts,
			weaknessQuestionTexts,
			themeTagQuestion,

			// Display data
			title: this.document.name,
		};
	}

	/* -------------------------------------------- */
	/*  Form Handling                               */
	/* -------------------------------------------- */

	async #getThemebookOptions() {
		const entries = await queryItemsFromPacks({
			type: "themebook",
			indexFields: ["system.theme_level", "system.isFellowship"],
			map: (item) => ({
				name: item.name,
				level: item.system?.theme_level,
				isFellowship: item.system?.isFellowship ?? false,
			}),
		});

		// Filter by level (with fallback to all if no level match)
		const matchingLevel = entries.filter(
			(item) =>
				!item.level ||
				item.level === "variable" ||
				item.level === this.system.level,
		);
		const byLevel = matchingLevel.length ? matchingLevel : entries;

		// Filter by fellowship status (strict - no fallback)
		const finalSource = byLevel.filter(
			(item) => item.isFellowship === this.system.isFellowship,
		);

		const seen = new Set();
		const options = [];
		for (const item of finalSource) {
			if (!item.name || seen.has(item.name)) continue;
			seen.add(item.name);
			options.push({
				value: item.name,
				label: item.name,
			});
		}

		if (
			this.system.themebook &&
			!options.some((option) => option.value === this.system.themebook)
		) {
			options.unshift({
				value: this.system.themebook,
				label: this.system.themebook,
			});
		}

		return options;
	}

	/* -------------------------------------------- */
	/*  Event Handlers & Actions                    */
	/* -------------------------------------------- */

	/**
	 * Add a new tag to the theme
	 * @param {Event} event        The triggering event
	 * @param {HTMLElement} target The target element
	 * @private
	 */
	static async #onAddTag(_event, target) {
		const type = target.dataset.type;
		const themebook = await findThemebookByName(this.system.themebook);

		if (type === "weaknessTag") {
			const weaknessTags = [...this.system.weaknessTags];
			const usedQuestions = new Set(
				weaknessTags.map((t) => t.question).filter(Boolean),
			);
			const allWeaknessQs = themebook?.system?.weaknessTagQuestions || [];
			const nextQuestion =
				allWeaknessQs
					.map((q, i) => ({ q, i }))
					.filter(
						({ q, i }) => `${q ?? ""}`.trim() && !usedQuestions.has(String(i)),
					)
					.map(({ i }) => String(i))[0] ?? "";
			weaknessTags.push({
				id: foundry.utils.randomID(),
				name: "",
				question: nextQuestion,
				isActive: true,
				isScratched: false,
				type: "weaknessTag",
			});
			await this.document.update({ "system.weaknessTags": weaknessTags });
		} else if (type === "powerTag") {
			const powerTags = [...this.system.powerTags];
			const usedQuestions = new Set(
				powerTags.map((t) => t.question).filter(Boolean),
			);
			const allPowerQs = themebook?.system?.powerTagQuestions || [];
			const nextQuestion =
				allPowerQs
					.map((q, i) => ({ q, i }))
					.filter(
						({ q, i }) =>
							i > 0 && `${q ?? ""}`.trim() && !usedQuestions.has(String(i)),
					)
					.map(({ i }) => String(i))[0] ?? "";
			powerTags.push({
				id: foundry.utils.randomID(),
				name: "",
				question: nextQuestion,
				isActive: true,
				isScratched: false,
				type: "powerTag",
			});
			await this.document.update({ "system.powerTags": powerTags });
		}
	}

	/**
	 * Remove a tag from the theme
	 * @param {Event} event        The triggering event
	 * @param {HTMLElement} target The target element
	 * @private
	 */
	static async #onRemoveTag(_event, target) {
		const index = parseInt(target.dataset.index, 10);
		const type = target.dataset.type;

		if (type === "weaknessTag") {
			const weaknessTags = [...this.system.weaknessTags];
			weaknessTags.splice(index, 1);
			await this.document.update({ "system.weaknessTags": weaknessTags });
		} else if (type === "powerTag") {
			const powerTags = [...this.system.powerTags];
			powerTags.splice(index, 1);
			await this.document.update({ "system.powerTags": powerTags });
		}
	}

	/**
	 * Add a special improvement to the theme
	 * @param {Event} event        The triggering event
	 * @param {HTMLElement} target The target element
	 * @private
	 */
	static async #onAddSpecialImprovement(_event, _target) {
		const specialImprovements = [...(this.system.specialImprovements || [])];
		specialImprovements.push({
			name: "",
			description: "",
			isActive: false,
		});
		await this.document.update({
			"system.specialImprovements": specialImprovements,
		});
	}

	/**
	 * Remove a special improvement from the theme
	 * @param {Event} event        The triggering event
	 * @param {HTMLElement} target The target element
	 * @private
	 */
	static async #onRemoveSpecialImprovement(_event, target) {
		const index = parseInt(target.dataset.index, 10);
		if (Number.isNaN(index)) return;
		const specialImprovements = [...(this.system.specialImprovements || [])];
		specialImprovements.splice(index, 1);
		await this.document.update({
			"system.specialImprovements": specialImprovements,
		});
	}

	/**
	 * Adjust a progress track
	 * @param {Event} event        The triggering event
	 * @param {HTMLElement} target The target element
	 * @private
	 */
	static async #onAdjustProgress(event, target) {
		event.preventDefault();
		event.stopPropagation();

		const button = target.closest("button");
		if (!button) return;

		const boxIndex = parseInt(button.dataset.index, 10);
		if (Number.isNaN(boxIndex)) return;

		const container = button.closest(".progress-buttons");
		if (!container) return;

		const field = container.dataset.id;
		if (!field) return;

		const currentValue = foundry.utils.getProperty(this.document, field);

		let newValue;
		if (currentValue === boxIndex + 1) {
			newValue = boxIndex;
		} else {
			newValue = boxIndex + 1;
		}

		try {
			await this.document.update({ [field]: newValue });
		} catch (error) {
			console.error("Error updating progress track:", error);
		}
	}
}
