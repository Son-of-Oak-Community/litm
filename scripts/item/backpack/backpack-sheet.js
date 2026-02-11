import { LitmItemSheet } from "../../sheets/base-item-sheet.js";
import { confirmDelete, localize as t } from "../../utils.js";

/**
 * Backpack sheet for Legend in the Mist
 * Container for story tags and temporary items
 */
export class BackpackSheet extends LitmItemSheet {
	/** @override */
	static DEFAULT_OPTIONS = {
		classes: ["litm", "litm-backpack-sheet"],
		tag: "form",
		position: {
			width: 500,
			height: "auto",
		},
		actions: {
			addTag: BackpackSheet.#onAddTag,
			removeTag: BackpackSheet.#onRemoveTag,
			toggleActive: BackpackSheet.#onToggleActive,
		},
		form: {
			submitOnChange: true,
			closeOnSubmit: false,
		},
		window: {
			icon: "fa-solid fa-bag-shopping",
			resizable: true,
		},
	};

	/** @override */
	static PARTS = {
		form: {
			template: "systems/litm/templates/item/backpack.html",
			scrollable: [""],
		},
	};

	/* -------------------------------------------- */
	/*  Rendering                                   */
	/* -------------------------------------------- */

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		return foundry.utils.mergeObject(context, {
			backpack: this.system.contents,
			name: this.document.name,
		});
	}

	/* -------------------------------------------- */
	/*  Event Handlers & Actions                    */
	/* -------------------------------------------- */

	/**
	 * Add a new tag to the backpack
	 * @param {Event} event        The triggering event
	 * @param {HTMLElement} target The target element
	 * @private
	 */
	static async #onAddTag(_event, _target) {
		const item = {
			name: t("LITM.Ui.name_tag"),
			isActive: true,
			isScratched: false,
			type: "backpack",
			id: foundry.utils.randomID(),
		};

		const contents = [...this.system.contents, item];
		await this.document.update({ "system.contents": contents });
	}

	/**
	 * Remove a tag from the backpack
	 * @param {Event} event        The triggering event
	 * @param {HTMLElement} target The target element
	 * @private
	 */
	static async #onRemoveTag(_event, target) {
		if (!(await confirmDelete("LITM.Terms.tag"))) return;

		const index = Number(target.dataset.index);
		const contents = this.system.contents.filter((_, i) => i !== index);
		await this.document.update({ "system.contents": contents });
	}

	/**
	 * Toggle a tag's active state
	 * @param {Event} event        The triggering event
	 * @param {HTMLElement} target The target element
	 * @private
	 */
	static async #onToggleActive(_event, target) {
		const index = Number(target.dataset.index);
		const contents = [...this.system.contents];
		contents[index].isActive = !contents[index].isActive;
		await this.document.update({ "system.contents": contents });
	}
}
