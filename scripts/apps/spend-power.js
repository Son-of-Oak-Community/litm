import { localize as t } from "../utils.js";

export class SpendPowerApp extends foundry.applications.api.HandlebarsApplicationMixin(
	foundry.applications.api.ApplicationV2,
) {
	static DEFAULT_OPTIONS = {
		id: "litm-spend-power",
		classes: ["litm", "litm-spend-power"],
		tag: "form",
		window: {
			title: "LITM.Ui.spend_power_title",
			resizable: true,
		},
		position: {
			width: 600,
			height: 480,
		},
		form: {
			handler: SpendPowerApp.#onSubmit,
			closeOnSubmit: true,
		},
	};

	static PARTS = {
		form: {
			template: "systems/litm/templates/apps/spend-power.html",
		},
	};

	constructor(options = {}) {
		super(options);
		this.actorId = options.actorId;
		this.messageId = options.messageId;
		this.totalPower = options.power || 0;
		const message = this.messageId ? game.messages.get(this.messageId) : null;
		this.alreadySpent = message?.getFlag("litm", "spentPower") ?? 0;
		this.power = this.totalPower - this.alreadySpent;
		this.spendingOptions = [
			{
				id: "create_recover_tag",
				label: "LITM.Effects.create.action",
				cost: 2,
				description: "LITM.Effects.create.description",
				draggable: true,
			},
			{
				id: "scratch_tag",
				label: "LITM.Effects.scratch.action",
				cost: 2,
				description: "LITM.Effects.scratch.description",
				draggable: true,
			},
			{
				id: "inflict_status",
				label: "LITM.Effects.inflict.action",
				cost: 1,
				description: "LITM.Effects.inflict.description",
				hasTier: true,
				draggable: true,
			},
			{
				id: "reduce_status",
				label: "LITM.Effects.reduce.action",
				cost: 1,
				description: "LITM.Effects.reduce.description",
				hasTier: true,
				draggable: true,
			},
			{
				id: "discover_detail",
				label: "LITM.Effects.discover.action",
				cost: 1,
				description: "LITM.Effects.discover.description",
				hasCounter: true,
			},
			{
				id: "extra_feat",
				label: "LITM.Effects.extra_feat.action",
				cost: 1,
				description: "LITM.Effects.extra_feat.description",
			},
		];
	}

	async _prepareContext(_options) {
		const actor = game.actors.get(this.actorId);
		const scratchedTags = actor ? this.#getScratchedTags(actor) : [];
		const statusCards = actor ? this.#getStatusCards(actor) : [];

		const options = this.spendingOptions
			.filter((o) => o.id !== "scratch_tag" || scratchedTags.length > 0)
			.filter((o) => o.id !== "reduce_status" || statusCards.length > 0)
			.map((o) => {
				if (o.id === "scratch_tag") return { ...o, scratchedTags };
				if (o.id === "reduce_status") return { ...o, statusCards };
				return o;
			});

		return {
			actorId: this.actorId,
			power: this.power,
			options,
		};
	}

	#getScratchedTags(actor) {
		const tags = [];

		for (const item of actor.items) {
			if (item.type === "theme") {
				for (const tag of item.system.powerTags ?? []) {
					if (tag.isScratched) {
						tags.push({
							id: tag.id,
							name: tag.name,
							source: "item",
							itemId: item.id,
							field: "powerTags",
						});
					}
				}
			}
			if (item.type === "backpack") {
				for (const tag of item.system.contents ?? []) {
					if (tag.isScratched) {
						tags.push({
							id: tag.id,
							name: tag.name,
							source: "item",
							itemId: item.id,
							field: "contents",
						});
					}
				}
			}
		}

		for (const effect of actor.effects) {
			if (effect.type === "story_tag" && effect.system?.isScratched) {
				tags.push({ id: effect.id, name: effect.name, source: "effect" });
			}
		}

		return tags;
	}

	#getStatusCards(actor) {
		const statuses = [];
		for (const effect of actor.effects) {
			if (effect.type === "status_card") {
				const tier = effect.system?.currentTier ?? 0;
				if (tier > 0) {
					statuses.push({ id: effect.id, name: effect.name, tier });
				}
			}
		}
		return statuses;
	}

	_onFirstRender(context, options) {
		super._onFirstRender(context, options);

		const form = this.element;

		// Delegated: counter buttons (standalone counters and status picker counters)
		form.addEventListener("click", (event) => {
			const btn = event.target.closest(
				"[data-action='counter-inc'], [data-action='counter-dec']",
			);
			if (!btn) return;
			const container = btn.closest(
				".litm-spend-power__counter, .litm-spend-power__status-reduce",
			);
			const valueEl = container.querySelector(
				".litm-spend-power__counter-value",
			);
			const current = Number(valueEl.textContent);
			const statusItem = btn.closest(".litm-spend-power__status-item");
			const min = statusItem ? 0 : 1;
			const max = statusItem ? Number(statusItem.dataset.maxTier) : Infinity;
			const next =
				btn.dataset.action === "counter-inc"
					? Math.min(current + 1, max)
					: Math.max(min, current - 1);
			valueEl.textContent = next;
			this.#updatePower(form);
		});

		// Delegated: remove entry rows
		form.addEventListener("click", (event) => {
			const removeBtn = event.target.closest(".litm-spend-power__remove-entry");
			if (removeBtn) {
				removeBtn.closest(".litm-spend-power__entry").remove();
				this.#updatePower(form);
			}
		});

		// Delegated: scratched tag chip selection
		form.addEventListener("click", (event) => {
			const chip = event.target.closest(".litm-spend-power__tag-chip");
			if (chip) {
				chip.classList.toggle("is-selected");
				this.#updatePower(form);
			}
		});

		// Delegated: tier input changes
		form.addEventListener("input", (event) => {
			if (event.target.classList.contains("litm-spend-power__entry-tier")) {
				this.#updatePower(form);
			}
		});
	}

	_onRender(context, options) {
		super._onRender(context, options);

		const form = this.element;

		// Checkbox toggles — reveal/hide entry section
		// Also make the whole card clickable (excluding entries section)
		form.querySelectorAll(".litm-spend-power__option").forEach((li) => {
			const checkbox = li.querySelector("[data-option-check]");
			checkbox.addEventListener("change", () => {
				this.#toggleEntries(li);
				this.#updatePower(form);
			});

			li.addEventListener("click", (event) => {
				// Ignore clicks inside the entries section (inputs/buttons/chips there)
				if (event.target.closest(".litm-spend-power__entries")) return;
				// Ignore clicks on the label — it already toggles the checkbox natively
				if (event.target.closest("label")) return;

				checkbox.checked = !checkbox.checked;
				this.#toggleEntries(li);
				this.#updatePower(form);
			});
		});

		// Add-entry buttons
		form.querySelectorAll("[data-action='add-entry']").forEach((btn) => {
			btn.addEventListener("click", () => {
				const li = btn.closest(".litm-spend-power__option");
				this.#addEntry(li);
				this.#updatePower(form);
			});
		});
	}

	#toggleEntries(li) {
		const entriesSection = li.querySelector(".litm-spend-power__entries");
		if (!entriesSection) return;

		const checkbox = li.querySelector("[data-option-check]");
		const isPicker = "picker" in entriesSection.dataset;
		const isCounter = "counter" in entriesSection.dataset;
		const isStatusPicker = "statusPicker" in entriesSection.dataset;

		if (checkbox.checked) {
			entriesSection.classList.remove("is-hidden");
			if (!isPicker && !isCounter && !isStatusPicker) {
				const entryList = entriesSection.querySelector(
					".litm-spend-power__entry-list",
				);
				entryList.appendChild(
					this.#makeEntryRow(li.dataset.hasTier === "true"),
				);
			}
		} else {
			entriesSection.classList.add("is-hidden");
			if (isPicker) {
				// Deselect all chips when unchecking the option
				entriesSection
					.querySelectorAll(".litm-spend-power__tag-chip")
					.forEach((chip) => {
						chip.classList.remove("is-selected");
					});
			} else if (isStatusPicker) {
				// Reset all status counters to 0
				entriesSection
					.querySelectorAll(".litm-spend-power__counter-value")
					.forEach((el) => {
						el.textContent = "0";
					});
			} else if (isCounter) {
				// Reset counter to 1
				const valueEl = entriesSection.querySelector(
					".litm-spend-power__counter-value",
				);
				if (valueEl) valueEl.textContent = "1";
			} else {
				const entryList = entriesSection.querySelector(
					".litm-spend-power__entry-list",
				);
				entryList.innerHTML = "";
			}
		}
	}

	#addEntry(li) {
		const entryList = li.querySelector(".litm-spend-power__entry-list");
		entryList.appendChild(this.#makeEntryRow(li.dataset.hasTier === "true"));
	}

	#makeEntryRow(hasTier) {
		const li = document.createElement("li");
		li.classList.add("litm-spend-power__entry");

		const nameInput = document.createElement("input");
		nameInput.type = "text";
		nameInput.classList.add("litm-spend-power__entry-name");
		nameInput.placeholder = hasTier
			? t("LITM.Ui.status_name")
			: t("LITM.Ui.tag_name");
		li.appendChild(nameInput);

		if (hasTier) {
			const tierInput = document.createElement("input");
			tierInput.type = "number";
			tierInput.classList.add("litm-spend-power__entry-tier");
			tierInput.value = "1";
			tierInput.min = "1";
			tierInput.max = "6";
			li.appendChild(tierInput);
		}

		const removeBtn = document.createElement("button");
		removeBtn.type = "button";
		removeBtn.classList.add("litm-spend-power__remove-entry");
		removeBtn.setAttribute("aria-label", t("LITM.Ui.remove_tag"));
		removeBtn.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
		li.appendChild(removeBtn);

		return li;
	}

	#updatePower(form) {
		let spent = 0;

		form.querySelectorAll(".litm-spend-power__option").forEach((li) => {
			const checkbox = li.querySelector("[data-option-check]");
			if (!checkbox.checked) return;

			const cost = Number(li.dataset.cost);
			const hasTier = li.dataset.hasTier === "true";
			const entriesSection = li.querySelector(".litm-spend-power__entries");
			const isPicker = entriesSection && "picker" in entriesSection.dataset;
			const isCounter = entriesSection && "counter" in entriesSection.dataset;
			const isStatusPicker =
				entriesSection && "statusPicker" in entriesSection.dataset;

			if (isStatusPicker) {
				entriesSection
					.querySelectorAll(".litm-spend-power__status-item")
					.forEach((item) => {
						const count = Number(
							item.querySelector(".litm-spend-power__counter-value")
								?.textContent ?? 0,
						);
						spent += cost * count;
					});
			} else if (isCounter) {
				const count = Number(
					entriesSection.querySelector(".litm-spend-power__counter-value")
						?.textContent ?? 1,
				);
				spent += cost * count;
			} else if (isPicker) {
				const selected = entriesSection.querySelectorAll(
					".litm-spend-power__tag-chip.is-selected",
				);
				spent += cost * selected.length;
			} else if (hasTier) {
				const entries = li.querySelectorAll(".litm-spend-power__entry");
				if (entries.length === 0) {
					spent += cost;
				} else {
					entries.forEach((entry) => {
						const tier = Math.max(
							Number(
								entry.querySelector(".litm-spend-power__entry-tier")?.value ??
									1,
							),
							1,
						);
						spent += cost * tier;
					});
				}
			} else {
				const entries = li.querySelectorAll(".litm-spend-power__entry");
				spent += cost * Math.max(entries.length, 1);
			}
		});

		const remainingEl = form.querySelector(
			".litm-spend-power__power-remaining",
		);
		const remaining = this.power - spent;
		if (remainingEl) remainingEl.textContent = remaining;

		// Highlight if over budget and disable submit
		const overBudget = remaining < 0;
		remainingEl?.classList.toggle("is-over-budget", overBudget);
		const submitBtn = form.querySelector("[type='submit']");
		if (submitBtn) submitBtn.disabled = overBudget || spent === 0;
	}

	static #chatCard({ actor, action, body, power }) {
		const costLine = `${power} ${t("LITM.Tags.power")}`;
		return `<div class="litm litm-spend-chat">
			<header class="litm-spend-chat__header">
				<img src="${actor.img}" alt="${actor.name}" />
				<div>
					<span class="litm-spend-chat__name">${actor.name}</span>
					<span class="litm-spend-chat__action">${action}</span>
				</div>
			</header>
			<div class="litm-spend-chat__body">${body}</div>
			<footer class="litm-spend-chat__cost">${costLine}</footer>
		</div>`;
	}

	static async #onSubmit(_event, form, _formData) {
		const actor = game.actors.get(this.actorId);
		const speaker = ChatMessage.getSpeaker({ actor });

		const checkedOptions = [
			...form.querySelectorAll(".litm-spend-power__option"),
		].filter((li) => li.querySelector("[data-option-check]").checked);

		let totalSpent = 0;

		for (const li of checkedOptions) {
			const optionId = li.dataset.optionId;
			const option = this.spendingOptions.find((o) => o.id === optionId);
			if (!option) continue;

			const hasTier = li.dataset.hasTier === "true";
			const entriesSection = li.querySelector(".litm-spend-power__entries");
			const isPicker = entriesSection && "picker" in entriesSection.dataset;
			const isCounter = entriesSection && "counter" in entriesSection.dataset;
			const isStatusPicker =
				entriesSection && "statusPicker" in entriesSection.dataset;

			// Status picker (reduce status) — each status has its own tier counter
			if (isStatusPicker) {
				const reductions = [
					...entriesSection.querySelectorAll(".litm-spend-power__status-item"),
				]
					.map((item) => ({
						effectId: item.dataset.effectId,
						name: item.dataset.statusName,
						tiers: Number(
							item.querySelector(".litm-spend-power__counter-value")
								?.textContent ?? 0,
						),
					}))
					.filter(({ tiers }) => tiers > 0);
				if (reductions.length === 0) continue;

				const power = reductions.reduce(
					(sum, { tiers }) => sum + option.cost * tiers,
					0,
				);
				totalSpent += power;

				// Apply the reductions to the actual effects
				const bodyLines = [];
				for (const { effectId, name, tiers } of reductions) {
					const effect = actor.effects.get(effectId);
					if (!effect) continue;
					const oldTier = effect.system.currentTier;
					const newTiers = effect.system.calculateReduction(tiers);
					const newTier = newTiers.lastIndexOf(true) + 1;
					if (newTier <= 0) {
						await effect.delete();
					} else {
						await effect.update({ "system.tiers": newTiers });
					}
					const after =
						newTier > 0
							? `<strong>${name}-${newTier}</strong>`
							: `<em>${t("LITM.Ui.removed")}</em>`;
					bodyLines.push(`<span>${name}-${oldTier} &rarr; ${after}</span>`);
				}

				await ChatMessage.create({
					content: SpendPowerApp.#chatCard({
						actor,
						action: t(option.label),
						body: bodyLines.join(""),
						power,
					}),
					speaker,
				});
				continue;
			}

			// Counter options (e.g. discover detail) — just a count, no named entries
			if (isCounter) {
				const count = Number(
					entriesSection.querySelector(".litm-spend-power__counter-value")
						?.textContent ?? 1,
				);
				const power = option.cost * count;
				totalSpent += power;

				await ChatMessage.create({
					content: SpendPowerApp.#chatCard({
						actor,
						action: t(option.label),
						body: `<span>&times;${count}</span>`,
						power,
					}),
					speaker,
				});
				continue;
			}

			// Scratched tag picker — unscratch the selected tags
			if (isPicker) {
				const selectedChips = [
					...entriesSection.querySelectorAll(
						".litm-spend-power__tag-chip.is-selected",
					),
				];
				if (selectedChips.length === 0) continue;

				const power = option.cost * selectedChips.length;
				totalSpent += power;

				const names = [];
				for (const chip of selectedChips) {
					const { tagId, tagName, source, itemId, field } = chip.dataset;
					names.push(tagName);
					if (source === "effect") {
						const effect = actor.effects.get(tagId);
						if (effect) await effect.update({ "system.isScratched": false });
					} else if (source === "item" && itemId && field) {
						const item = actor.items.get(itemId);
						if (item) {
							const tags = [...(item.system[field] ?? [])];
							const idx = tags.findIndex((tag) => tag.id === tagId);
							if (idx !== -1) {
								tags[idx] = { ...tags[idx], isScratched: false };
								await item.update({ [`system.${field}`]: tags });
							}
						}
					}
				}

				await ChatMessage.create({
					content: SpendPowerApp.#chatCard({
						actor,
						action: t(option.label),
						body: names
							.map((n) => `<strong>${foundry.utils.escapeHTML(n)}</strong>`)
							.join(" "),
						power,
					}),
					speaker,
				});
				continue;
			}

			const entries = [...li.querySelectorAll(".litm-spend-power__entry")]
				.map((row) => ({
					name: row.querySelector(".litm-spend-power__entry-name").value.trim(),
					tier: hasTier
						? Number(
								row.querySelector(".litm-spend-power__entry-tier")?.value ?? 1,
							)
						: null,
				}))
				.filter(({ name }) => name !== "");

			// Build tag/status using enricher syntax ({tag} or {status-tier})
			let body = "";
			if (entries.length > 0) {
				const tags = entries.map(({ name, tier }) => {
					if (hasTier) return `{${name}-${Math.max(tier, 1)}}`;
					if (option.draggable) return `{${name}}`;
					return `<em>${foundry.utils.escapeHTML(name)}</em>`;
				});
				body = tags.join(" ");
			}

			// Calculate power cost
			let power;
			if (entries.length === 0) {
				power = option.cost;
			} else if (hasTier) {
				power = entries.reduce(
					(sum, { tier }) => sum + option.cost * Math.max(tier, 1),
					0,
				);
			} else {
				power = option.cost * entries.length;
			}

			totalSpent += power;

			await ChatMessage.create({
				content: SpendPowerApp.#chatCard({
					actor,
					action: t(option.label),
					body,
					power,
				}),
				speaker,
			});
		}

		// Persist spent power on the originating roll message
		if (this.messageId && totalSpent > 0) {
			const message = game.messages.get(this.messageId);
			await message?.setFlag(
				"litm",
				"spentPower",
				this.alreadySpent + totalSpent,
			);
		}
	}
}
