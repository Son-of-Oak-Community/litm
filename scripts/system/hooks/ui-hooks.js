import { error } from "../../logger.js";
import { localize as t } from "../../utils.js";

export function registerUiHooks() {
	_iconOnlyHeaderButtons();
	_addImportToActorSidebar();
	_replaceLoadSpinner();
	_listenToContentLinks();
}

function _iconOnlyHeaderButtons() {
	// Abstracted function to replace header buttons
	const replaceHeaderButton = (html, action, icon, label) => {
		const element = html[0] ?? html;
		const button = element.querySelector(`.${action}`);
		if (!button) return;

		const newButton = document.createElement("a");
		newButton.classList.add("header-button", "control", action);
		newButton.ariaLabel = label;
		newButton.dataset.tooltip = label;
		newButton.innerHTML = `<i class="${icon}" aria-hidden="true"></i>`;

		button.replaceWith(newButton);
	};

	const buttons = [
		{
			action: "configure-sheet",
			icon: "fas fa-cog",
			label: t("Configure"),
		},
		{
			action: "configure-token",
			icon: "fas fa-user-circle",
			label: t("TOKEN.Title"),
		},
		{
			action: "share-image",
			icon: "fas fa-eye",
			label: t("JOURNAL.ActionShow"),
		},
		{ action: "close", icon: "fas fa-times", label: t("Close") },
	];

	for (const hook of [
		"renderItemSheetV2",
		"renderActorSheetV2",
		"renderJournalSheet",
		"renderApplication",
	]) {
		Hooks.on(hook, (_app, html) => {
			for (const { action, icon, label } of buttons) {
				replaceHeaderButton(html, action, icon, label);
			}

			// Add the document ID link to the header if it's not already there
			if (hook === "renderActorSheetV2" || hook === "renderItemSheetV2") {
				const element = html[0] ?? html;
				const link = element.querySelector(".window-title>.document-id-link");
				const header = element.querySelector(".window-header");
				if (link && header) header.prepend(link);
			}
		});
	}
}

function _addImportToActorSidebar() {
	Hooks.on("renderActorDirectory", (_app, html) => {
		const button = document.createElement("button");
		button.classList.add("litm--import-actor");
		button.dataset.tooltip = t("LITM.Ui.import_actor");
		button.ariaLabel = t("LITM.Ui.import_actor");
		button.innerHTML = '<i class="fas fa-file-import"></i>';

		button.addEventListener("click", () => {
			const input = document.createElement("input");
			input.type = "file";
			input.accept = ".json";
			input.onchange = async (event) => {
				const file = event.target.files[0];
				try {
					const data = await file.text();
					const actorData = JSON.parse(data);
					await game.litm.importCharacter(actorData);
				} catch (err) {
					error("Failed to import actor", err.message);
					ui.notifications.error("LITM.Ui.import_actor_failed", {
						localize: true,
					});
				}
			};
			input.click();
		});

		const element = html[0] ?? html;
		element.querySelector(".directory-footer").appendChild(button);
	});
}

function _replaceLoadSpinner() {
	Hooks.on("renderPause", (_, html) => {
		const img = html[0].querySelector("img");
		if (!img) return;
		img.src = CONFIG.litm.assets.marshal_crest;
		img.removeAttribute("class");
	});
	Hooks.on("renderGamePause", (_, html) => {
		const img = html.querySelector("img");
		if (!img) return;
		img.src = CONFIG.litm.assets.marshal_crest;
		img.classList.remove("fa-spin");
	});
}

function _listenToContentLinks() {
	Hooks.on("renderJournalSheet", (_app, html) => {
		const element = html[0] ?? html;
		element.addEventListener("click", (event) => {
			const target = event.target.closest(".content-link");
			if (!target) return;

			const { id, type } = target.dataset;
			if (type !== "ActivateScene") return;

			event.preventDefault();
			event.stopPropagation();

			const scene = game.scenes.get(id);
			if (!scene) return;
			scene.view();
		});
	});
}
