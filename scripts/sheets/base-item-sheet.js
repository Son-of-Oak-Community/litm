import { enrichHTML } from "../utils.js";

const { ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Base item sheet class for Legend in the Mist
 * Provides common functionality for all item sheet types
 */
export class LitmItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
	/**
	 * Convenient reference to the item's system data
	 * @type {TypeDataModel}
	 * @protected
	 */
	get system() {
		return this.document.system;
	}

	/**
	 * Enrich HTML field for display
	 * @param {string} text          The HTML text to enrich
	 * @param {Document} document    The document context for enrichment
	 * @returns {Promise<string>}
	 * @protected
	 */
	static async _enrichHTML(text, document) {
		return enrichHTML(text, document);
	}

	/**
	 * Enrich multiple HTML fields at once
	 * @param {Object<string, string>} fields   Object mapping field names to text
	 * @param {Document} document               The document context for enrichment
	 * @returns {Promise<Object<string, string>>}
	 * @protected
	 */
	static async _enrichHTMLFields(fields, document) {
		const enriched = {};
		for (const [key, value] of Object.entries(fields)) {
			enriched[key] = await this._enrichHTML(value, document);
		}
		return enriched;
	}
}
