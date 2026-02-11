import { LitmItemSheet } from "../../sheets/base-item-sheet.js";
import { queryItemsFromPacks } from "../../utils.js";

export class TropeSheet extends LitmItemSheet {
	static DEFAULT_OPTIONS = {
		classes: ["litm", "litm-trope-sheet"],
		tag: "form",
		position: {
			width: 650,
			height: "auto",
		},
		dragDrop: [{ dropSelector: "[data-theme-kit-drop]" }],
		actions: {
			removeEntry: TropeSheet.#onRemoveEntry,
		},
		form: {
			submitOnChange: true,
			closeOnSubmit: false,
		},
		window: {
			icon: "fa-solid fa-masks-theater",
			resizable: true,
			controls: [],
		},
	};

	static PARTS = {
		form: {
			template: "systems/litm/templates/item/trope.html",
			scrollable: [""],
		},
	};

	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		const enrichedDescription =
			await foundry.applications.ux.TextEditor.enrichHTML(
				this.system.description,
				{
					secrets: this.document.isOwner,
					relativeTo: this.document,
				},
			);
		const themeKitLookup = await this.#getThemeKitLookup();
		const fixedKits = this.#resolveKits(
			this.system.themeKits.fixed,
			themeKitLookup,
		);
		const optionalKits = this.#resolveKits(
			this.system.themeKits.optional,
			themeKitLookup,
		);

		return {
			...context,
			enriched: {
				description: enrichedDescription,
			},
			system: this.system,
			item: this.document,
			fixedKits,
			optionalKits,
		};
	}

	async #getThemeKitLookup() {
		const seen = new Set();
		const lookup = new Map();

		const entries = await queryItemsFromPacks({
			type: "theme",
			map: (entry, { pack }) => {
				const uuid = pack
					? entry.uuid ||
						`Compendium.${pack.collection}.${entry._id ?? entry.id}`
					: entry.uuid || entry.id;
				const sourceLabel = pack
					? `Compendium: ${pack.metadata?.label || pack.collection}`
					: "World";
				return { uuid, name: entry.name, sourceLabel };
			},
		});

		for (const { uuid, name, sourceLabel } of entries) {
			if (!uuid || !name || seen.has(uuid)) continue;
			seen.add(uuid);
			const displayLabel = sourceLabel ? `${name} (${sourceLabel})` : name;
			lookup.set(uuid, { name, sourceLabel, displayLabel });
		}

		return lookup;
	}

	#resolveKits(values = [], lookup) {
		return values.map((value) => {
			const entry = lookup.get(value);
			return {
				value,
				name: entry?.name || "",
				sourceLabel: entry?.sourceLabel || "",
				displayLabel: entry?.displayLabel || "",
			};
		});
	}

	static async #onRemoveEntry(_event, target) {
		const path = target.dataset.path;
		const index = Number(target.dataset.index);
		if (!path || Number.isNaN(index)) return;

		const values = foundry.utils.getProperty(this.document, path) || [];
		const next = [...values];
		next.splice(index, 1);
		await this.document.update({ [path]: next });
	}

	async _onDropDocument(event, data) {
		const dropZone = event.target.closest("[data-theme-kit-drop]");
		if (!dropZone) return super._onDropDocument?.(event, data);

		const path = dropZone.dataset.path;
		if (!path) return;

		const item = await Item.implementation.fromDropData(data);
		if (item.type !== "theme") return;

		const value = item.uuid || item.id || item.name;
		const values = foundry.utils.getProperty(this.document, path) || [];
		if (values.includes(value)) return;
		await this.document.update({ [path]: [...values, value] });
	}
}
