import { LitmItemSheet } from "../../sheets/base-item-sheet.js";

export class StoryThemeSheet extends LitmItemSheet {
	static DEFAULT_OPTIONS = {
		classes: ["litm", "litm-story-theme-sheet"],
		tag: "form",
		position: {
			width: 600,
			height: "auto",
		},
		actions: {
			addPowerTag: StoryThemeSheet.#onAddTag,
			removePowerTag: StoryThemeSheet.#onRemoveTag,
		},
		form: {
			submitOnChange: true,
			closeOnSubmit: false,
		},
		window: {
			icon: "fa-solid fa-book-open",
			resizable: true,
			controls: [],
		},
	};

	static PARTS = {
		form: {
			template: "systems/litm/templates/item/story-theme.html",
			scrollable: [""],
		},
	};

	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		// Enrich HTML fields
		const enrichedDescription =
			await foundry.applications.ux.TextEditor.enrichHTML(
				this.system.description,
				{
					secrets: this.document.isOwner,
					relativeTo: this.document,
				},
			);
		return {
			...context,
			enriched: {
				description: enrichedDescription,
			},
			system: this.system,
			item: this.document,
		};
	}

	/**
	 * Add a new tag to the story theme
	 * @param {Event} event        The triggering event
	 * @param {HTMLElement} target The target element
	 * @private
	 */
	static async #onAddTag(_event, target) {
		const type = target.dataset.type;
		const path =
			type === "powerTag"
				? "system.theme.powerTags"
				: "system.theme.weaknessTags";
		const tags = foundry.utils.getProperty(this.document, path);
		const newTag = {
			id: foundry.utils.randomID(),
			name: "",
			type,
			isActive: true,
			isScratched: false,
		};
		await this.document.update({ [path]: [...tags, newTag] });
	}

	/**
	 * Remove a tag from the story theme
	 * @param {Event} event        The triggering event
	 * @param {HTMLElement} target The target element
	 * @private
	 */
	static async #onRemoveTag(_event, target) {
		const index = Number(target.dataset.index);
		const type = target.dataset.type;
		const path =
			type === "powerTag"
				? "system.theme.powerTags"
				: "system.theme.weaknessTags";
		const tags = foundry.utils.getProperty(this.document, path);

		const newTags = [...tags];
		newTags.splice(index, 1);

		await this.document.update({ [path]: newTags });
	}
}
