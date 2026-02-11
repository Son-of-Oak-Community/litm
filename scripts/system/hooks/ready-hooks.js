import { WelcomeOverlay } from "../../apps/welcome-overlay.js";
import { localize as t } from "../../utils.js";
import { LitmSettings } from "../settings.js";
import { registerTours } from "../tours.js";

export function registerReadyHooks() {
	_setupRollDialogHud();
	_renderWelcomeScreen();
	_listenToTagDragTransfer();
	_popoutTagsSidebar();
	Hooks.once("ready", registerTours);
}

function _setupRollDialogHud() {
	Hooks.once("ready", async () => {
		game.litm.rollDialogHud = {
			update: () => _ensureHudContainer(),
		};

		// Clean up own stale roll dialog flags before rendering HUD.
		// No dialog is open on a fresh page load, so clear own flags.
		// Stale flags from other disconnected users are harmless — the HUD
		// shows them and renderRollDialog lets anyone with permission claim.
		for (const actor of game.actors) {
			const flag = actor.getFlag("litm", "rollDialogOwner");
			if (flag?.ownerId === game.user.id) {
				await actor.unsetFlag("litm", "rollDialogOwner");
			}
		}

		game.litm.rollDialogHud.update();
	});

	// Re-inject HUD after Players app re-renders (user connect/disconnect)
	Hooks.on("renderPlayers", () => {
		game.litm.rollDialogHud?.update?.();
	});

	// Re-render HUD whenever an actor's flags change
	Hooks.on("updateActor", (_actor) => {
		if (_actor.type !== "hero") return;
		game.litm.rollDialogHud?.update?.();
	});
}

function _ensureHudContainer() {
	const parent = document.getElementById("players");
	if (!parent) return;

	let container = parent.querySelector("#litm-roll-dialog-hud");
	if (!container) {
		container = document.createElement("div");
		container.id = "litm-roll-dialog-hud";
		container.classList.add("litm-roll-dialog-hud", "is-hidden");
		container.addEventListener("click", (event) => {
			const target = event.target.closest("[data-actor-id]");
			if (!target) return;
			const actorId = target.dataset.actorId;
			const actor = game.actors.get(actorId);
			if (!actor?.sheet) return;
			actor.sheet.renderRollDialog();
		});
		parent.prepend(container);
	}

	_renderRollDialogHud(container);
}

function _renderRollDialogHud(container) {
	const entries =
		game.actors
			?.filter((a) => {
				const flag = a.getFlag("litm", "rollDialogOwner");
				return flag && flag.ownerId !== game.user.id;
			})
			.map((a) => ({
				actorId: a.id,
				ownerId: a.getFlag("litm", "rollDialogOwner").ownerId,
			})) || [];

	if (!entries.length) {
		container.innerHTML = "";
		container.classList.add("is-hidden");
		return;
	}

	const escapeHTML = foundry.utils.escapeHTML;
	const rows = entries
		.map(({ actorId, ownerId }) => {
			const actor = game.actors.get(actorId);
			const owner = game.users.get(ownerId);
			const actorName = escapeHTML(actor?.name || t("LITM.Ui.unknown_hero"));
			const ownerName = escapeHTML(owner?.name || t("LITM.Ui.unknown_user"));
			const img = escapeHTML(actor?.img || "icons/svg/mystery-man.svg");
			return `
				<button type="button" class="litm-roll-dialog-hud__item" data-actor-id="${actorId}">
					<img class="litm-roll-dialog-hud__img" src="${img}" alt="" />
					<span class="litm-roll-dialog-hud__text">
						<span class="litm-roll-dialog-hud__title">${actorName}</span>
						<span class="litm-roll-dialog-hud__meta">${game.i18n.format(
							"LITM.Ui.opened_by",
							{ name: ownerName },
						)}</span>
					</span>
				</button>
			`;
		})
		.join("");

	container.innerHTML = rows;
	container.classList.remove("is-hidden");
}

function _listenToTagDragTransfer() {
	Hooks.on("ready", () => {
		document.addEventListener("dragstart", (event) => {
			const target = event.target.closest(
				".litm--tag, .litm--status, .litm-tag, .litm-status",
			);
			if (!target) return;

			const text = target.dataset.text || target.textContent;
			const matches = `{${text}}`.matchAll(CONFIG.litm.tagStringRe);
			const match = [...matches][0];
			if (!match) return;

			const [, name, separator, value] = match;
			const isStatus = separator === "-";
			const isLimit = separator === ":" || name.startsWith("-");
			const cleanName = name.replace(/^-/, "");
			const appEl = target.closest(".sheet");
			const app = appEl ? foundry.applications.instances.get(appEl.id) : null;
			const sourceActorId = app?.document?.id ?? null;
			const data = {
				id: foundry.utils.randomID(),
				name: isLimit ? cleanName : name,
				type: isStatus ? "status" : isLimit ? "limit" : "tag",
				values: Array(6)
					.fill(null)
					.map((_, i) => (Number.parseInt(value, 10) === i + 1 ? value : null)),
				isScratched: false,
				value: value,
				sourceActorId,
			};
			event.dataTransfer.setData("text/plain", JSON.stringify(data));
		});
	});
}

function _popoutTagsSidebar() {
	Hooks.once("ready", () => {
		if (LitmSettings.popoutTagsSidebar) ui.combat.renderPopout();
	});
}

function _renderWelcomeScreen() {
	Hooks.once("ready", () => {
		WelcomeOverlay.showOnReady().catch((err) =>
			console.error("litm | Failed to show welcome overlay", err),
		);
	});

	Hooks.on("importAdventure", () => {
		(async () => {
			const updates = await Promise.all(
				game.scenes
					.filter((s) => /litm\/assets/.test(s.thumb))
					.map(async (s) => {
						const { thumb } = await s.createThumbnail();
						return { _id: s.id, thumb };
					}),
			);
			await Scene.updateDocuments(updates);
			game.journal.getName("Tinderbox Demo Rules")?.sheet?.render(true);
		})().catch((err) =>
			console.error("litm | Failed to process adventure import", err),
		);
	});
}
