export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function localize(...key) {
	if (key.length === 1) return game.i18n.localize(key[0]);
	return key.map((k) => game.i18n.localize(k)).join(" ");
}

export function sortByName(a, b) {
	return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
}

export function sortTags(tags) {
	return tags.sort(sortByName);
}

export function titleCase(str) {
	return (
		str.charAt(0).toUpperCase() +
		str
			.toLowerCase()
			.replace(/\b\w+/g, (l) => {
				if (["and", "the", "of", "or", "a", "an"].includes(l)) return l;
				return l.charAt(0).toUpperCase() + l.substr(1);
			})
			.slice(1)
	);
}

export async function findThemebookByName(name) {
	if (!name) return null;

	const worldMatch = game.items.find(
		(item) => item.type === "themebook" && item.name === name,
	);
	if (worldMatch) return worldMatch;

	const compendiumPacks = game.packs.filter(
		(pack) =>
			pack.documentName === "Item" && pack.metadata?.label === "Themebooks",
	);

	for (const pack of compendiumPacks) {
		const docs = await pack.getDocuments();
		const match = docs.find(
			(item) => item.type === "themebook" && item.name === name,
		);
		if (match) return match;
	}

	return null;
}

/**
 * Enrich HTML text with Foundry enrichers.
 * @param {string} text          The HTML text to enrich
 * @param {Document} document    The document context for enrichment
 * @returns {Promise<string>}
 */
export async function enrichHTML(text, document) {
	if (!text) return "";
	const TextEditor = foundry.applications.ux.TextEditor;
	return (
		(await TextEditor.enrichHTML(text, {
			secrets: document.isOwner,
			relativeTo: document,
		})) || ""
	);
}

export function toQuestionOptions(questions = [], skipFirst = 0) {
	const options = {};
	let displayIndex = skipFirst;

	(questions || []).forEach((question, idx) => {
		if (idx < skipFirst) return;
		if (!question || `${question}`.trim().length === 0) return;

		options[String(idx)] = String.fromCharCode(65 + displayIndex);
		displayIndex++;
	});

	return options;
}

export function toPlainObject(obj) {
	return obj?.toObject ? obj.toObject() : { ...obj };
}

/**
 * Query items from world items and compendium packs.
 * Iterates world items and compendium pack indices, filtering by type
 * and an optional predicate, and returns deduplicated results.
 * @param {object} options
 * @param {string} options.type                Item type to filter by (e.g. "themebook", "theme")
 * @param {Function} [options.filter]          Optional predicate receiving each item/index entry
 * @param {string[]} [options.indexFields=[]]  Extra fields to request via pack.getIndex
 * @param {Function} [options.map]             Optional mapper; receives (entry, {pack}) and returns
 *                                             the value to include. If omitted, entries are returned as-is.
 * @returns {Promise<any[]>}
 */
export async function queryItemsFromPacks({
	type,
	filter,
	indexFields = [],
	map,
} = {}) {
	const results = [];

	// World items
	for (const item of game.items.filter((it) => it.type === type)) {
		if (filter && !filter(item)) continue;
		results.push(map ? map(item, { pack: null }) : item);
	}

	// Compendium packs
	const packs = game.packs.filter((pack) => pack.documentName === "Item");
	for (const pack of packs) {
		await pack.getIndex({ fields: ["type", "name", ...indexFields] });
		for (const entry of pack.index?.contents || []) {
			if (entry.type !== type) continue;
			if (filter && !filter(entry)) continue;
			results.push(map ? map(entry, { pack }) : entry);
		}
	}

	return results;
}

export async function confirmDelete(string = "Item") {
	const thing = game.i18n.localize(string);
	return foundry.applications.api.DialogV2.confirm({
		window: {
			title: game.i18n.format("LITM.Ui.confirm_delete_title", { thing }),
		},
		content: game.i18n.format("LITM.Ui.confirm_delete_content", { thing }),
		no: { default: true },
		classes: ["litm", "litm--confirm-delete"],
	});
}
