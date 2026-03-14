import { error, info } from "../logger.js";
import { sleep, localize as t } from "../utils.js";
import { runMigrations } from "./migration.js";
import { LitmSettings } from "./settings.js";
import { Sockets } from "./sockets.js";

export class LitmHooks {
	static register() {
		info("Registering Hooks...");
		LitmHooks.#addLinkPreloadsToHead();
		LitmHooks.#addImportToActorSidebar();
		LitmHooks.#iconOnlyHeaderButtons();
		LitmHooks.#safeUpdateItemSheet();
		LitmHooks.#replaceLoadSpinner();
		LitmHooks.#attachChatMessageListeners();
		LitmHooks.#attachContextMenuToRollMessage();
		LitmHooks.#attachGMIndicatorToMessage();
		LitmHooks.#prepareCharacterOnCreate();
		LitmHooks.#prepareThemeOnCreate();
		LitmHooks.#listenToContentLinks();
		LitmHooks.#listenToTagDragTransfer();
		LitmHooks.#customizeDiceSoNice();
		LitmHooks.#renderStoryTagApp();
		LitmHooks.#addStoryTagsToControls();
		LitmHooks.#popOutCompatiblity();
		LitmHooks.#rendeWelcomeScreen();
		LitmHooks.#showDeprecationNotice();
		LitmHooks.#runMigrations();
	}

	static #addLinkPreloadsToHead() {
		const assets = [
			"systems/litm/assets/media/adventure-theme-alt-bg-top.webp",
			"systems/litm/assets/media/adventure-theme-bg-bottom.webp",
			"systems/litm/assets/media/adventure-theme-border-bottom.webp",
			"systems/litm/assets/media/adventure-theme-border-top.webp",
			"systems/litm/assets/media/background-frame.webp",
			"systems/litm/assets/media/background.webp",
			"systems/litm/assets/media/backpack-top-bg.webp",
			"systems/litm/assets/media/backpack.webp",
			"systems/litm/assets/media/bg-alt.webp",
			"systems/litm/assets/media/birb.webp",
			"systems/litm/assets/media/bottom-branch.webp",
			"systems/litm/assets/media/bottom-frame-branches.webp",
			"systems/litm/assets/media/button-bg.webp",
			"systems/litm/assets/media/button-border.webp",
			"systems/litm/assets/media/challenge-bg.webp",
			"systems/litm/assets/media/challenge-border.webp",
			"systems/litm/assets/media/character-bg.webp",
			"systems/litm/assets/media/connector.webp",
			"systems/litm/assets/media/dice.webp",
			"systems/litm/assets/media/effects.webp",
			"systems/litm/assets/media/feather.webp",
			"systems/litm/assets/media/flowers-top.webp",
			"systems/litm/assets/media/greatness-theme-alt-bg-top.webp",
			"systems/litm/assets/media/greatness-theme-bg-bottom.webp",
			"systems/litm/assets/media/greatness-theme-border-bottom.webp",
			"systems/litm/assets/media/greatness-theme-border-top.webp",
			"systems/litm/assets/media/green-leaf.webp",
			"systems/litm/assets/media/header-bg.webp",
			"systems/litm/assets/media/item-divider.webp",
			"systems/litm/assets/media/left-div.webp",
			"systems/litm/assets/media/limit-bg.webp",
			"systems/litm/assets/media/limit-label.webp",
			"systems/litm/assets/media/limit-value.webp",
			"systems/litm/assets/media/litm_splash.webp",
			"systems/litm/assets/media/logo-b.webp",
			"systems/litm/assets/media/logo.webp",
			"systems/litm/assets/media/marshal-crest.webp",
			"systems/litm/assets/media/middle-branches.webp",
			"systems/litm/assets/media/necklace.webp",
			"systems/litm/assets/media/note.webp",
			"systems/litm/assets/media/origin-theme-alt-bg-top.webp",
			"systems/litm/assets/media/origin-theme-bg-bottom.webp",
			"systems/litm/assets/media/origin-theme-border-bottom.webp",
			"systems/litm/assets/media/origin-theme-border-top.webp",
			"systems/litm/assets/media/progress-bg.webp",
			"systems/litm/assets/media/raven.webp",
			"systems/litm/assets/media/right-div.webp",
			"systems/litm/assets/media/scroll-background.webp",
			"systems/litm/assets/media/scroll-border.webp",
			"systems/litm/assets/media/section-bg.webp",
			"systems/litm/assets/media/separator.webp",
			"systems/litm/assets/media/single-flower.webp",
			"systems/litm/assets/media/skull.webp",
			"systems/litm/assets/media/story-tag-bg.webp",
			"systems/litm/assets/media/tabs-bg.webp",
			"systems/litm/assets/media/tabs-collapse.webp",
			"systems/litm/assets/media/tag-divider.webp",
			"systems/litm/assets/media/theme-bg-top.webp",
			"systems/litm/assets/media/top-frame-branches.webp",
			"systems/litm/assets/media/yellow-leaf.webp",
		];

		for (const asset of assets) {
			const link = Object.assign(document.createElement("link"), {
				rel: "preload",
				href: asset,
				as: "image",
				type: "image/webp",
			});
			document.head.appendChild(link);
		}
	}

	static #iconOnlyHeaderButtons() {
		// Abstracted function to replace header buttons
		const replaceHeaderButton = (html, action, icon, label) =>
			html.find(`.${action}`)?.replaceWith(`
				<a class="header-button control ${action}" aria-label="${label}" data-tooltip="${label}">
				<i class="${icon}"></i></a>
				`);

		const buttons = [
			{ action: "configure-sheet", icon: "fas fa-cog", label: t("Configure") },
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
			"renderItemSheet",
			"renderActorSheet",
			"renderJournalSheet",
			"renderApplication",
		]) {
			Hooks.on(hook, (_app, html) => {
				for (const { action, icon, label } of buttons)
					replaceHeaderButton(html, action, icon, label);

				// Add the document ID link to the header if it's not already there
				if (hook === "renderActorSheet" || hook === "renderItemSheet") {
					html
						.find(".window-title>.document-id-link")
						.prependTo(html.find(".window-header"));
				}
			});
		}
	}

	static #safeUpdateItemSheet() {
		Hooks.on("preUpdateItem", (_, data) => {
			function getArray(data) {
				return Array.isArray(data) ? data : Object.values(data);
			}

			const { schema: tagSchema } = game.litm.data.TagData;
			const { system = {} } = data;

			const { powerTags = [], weaknessTags = [], contents = [] } = system;
			const toValidate = [
				...getArray(powerTags),
				...getArray(weaknessTags),
				...getArray(contents),
			];
			if (!toValidate.length) return;

			const validationErrors = toValidate
				.map((item) =>
					tagSchema.validate(item, { strict: true, partial: false }),
				)
				.filter(Boolean);

			if (validationErrors.length) {
				error("Validation errors", validationErrors);
				ui.notifications.error("Litm.ui.error-validating-item", {
					localize: true,
				});
				return false;
			}
		});
	}

	static #addImportToActorSidebar() {
		Hooks.on("renderSidebarTab", (app, html) => {
			if (app.id !== "actors") return;
			const button = $(
				`<button class="litm--import-actor" data-tooltip="${t(
					"Litm.ui.import-actor",
				)}" aria-label="${t(
					"Litm.ui.import-actor",
				)}"><i class="fas fa-file-import"></i></button>`,
			);
			button.on("click", () => {
				const input = document.createElement("input");
				input.type = "file";
				input.accept = ".json";
				input.onchange = async (event) => {
					const file = event.target.files[0];
					const data = await file.text();
					const actorData = JSON.parse(data);
					await game.litm.importCharacter(actorData);
				};
				input.click();
			});
			html.find(".directory-footer").append(button);
		});
	}

	static #replaceLoadSpinner() {
		Hooks.on("renderPause", (_, html) => {
			html
				.find("img")
				.attr("src", "systems/litm/assets/media/marshal-crest.webp")
				.removeAttr("class");
		});
		Hooks.on("renderGamePause", (_, html) => {
			const img = html.querySelector("img");
			if (!img) return;
			img.src = "systems/litm/assets/media/marshal-crest.webp";
			img.classList.remove("fa-spin");
		});
	}

	static #attachChatMessageListeners() {
		Hooks.on("renderChatMessage", (app, html) => {
			html.find("[data-click]").on("click", async (event) => {
				const target = event.currentTarget;
				const { click } = target.dataset;

				switch (click) {
					case "burn-tags": {
						event.stopPropagation();
						event.preventDefault();

						const roll = app.rolls[0];
						const actor = game.actors.get(roll?.litm?.actorId);
						if (!roll || !actor) return;

						for (const tag of roll.litm.burnedTags)
							await actor.sheet.toggleBurnTag(tag);
						roll.options.isBurnt = true;
						app.update({ rolls: [roll] });
						break;
					}
					case "gain-experience": {
						event.stopPropagation();
						event.preventDefault();

						const roll = app.rolls[0];
						const actor = game.actors.get(roll?.litm?.actorId);
						if (!roll || !actor) return;

						for (const tag of roll.litm.weaknessTags.filter(
							(t) => t.type === "weaknessTag",
						))
							await actor.sheet.gainExperience(tag);
						roll.options.gainedExp = true;
						app.update({ rolls: [roll] });
						break;
					}
					// biome-ignore lint/suspicious/noFallthroughSwitchClause: Intentional fallthrough
					case "skip-moderation":
						Sockets.dispatch("skipModeration", {
							name: game.user.name,
						});
					case "approve-moderation": {
						const data = await app.getFlag("litm", "data");
						const userId = await app.getFlag("litm", "userId");

						// Delete Message
						app.delete();

						// Roll
						if (userId === game.userId) game.litm.LitmRollDialog.roll(data);
						else
							Sockets.dispatch("rollDice", {
								userId,
								data,
							});

						// Dispatch order to reset Roll Dialog
						Sockets.dispatch("resetRollDialog", {
							actorId: data.actorId,
						});
						break;
					}
					case "reject-moderation": {
						const data = await app.getFlag("litm", "data");
						// Delete Message
						app.delete();
						// Reopen Roll Dialog
						const actor = game.actors.get(data.actorId);
						actor.sheet.renderRollDialog();
						ui.notifications.warn(
							game.i18n.format("Litm.ui.roll-rejected", { name: t("You") }),
						);
						// Dispatch order to reopen
						Sockets.dispatch("rejectRoll", {
							name: game.user.name,
							actorId: data.actorId,
						});
						break;
					}
				}
			});
		});
	}

	static #attachGMIndicatorToMessage() {
		Hooks.on("renderChatMessage", (_, html) => {
			html.attr("data-user", game.user.isGM ? "gm" : "player");
		});
	}

	static #attachContextMenuToRollMessage() {
		const callback = (_, options) => {
			// Add context menu options to tracked rolls
			const createEffect = ([key, effect], category) => ({
				name: `${t(category)}: ${t(`Litm.effects.${key}.key`)}`,
				icon: `<i class="${effect.icon}"></i>`,
				condition: (li) => {
					if (typeof li.find === "function")
						return li.find("[data-type='tracked']:not([data-result='failure'])")
							.length;
					return !!li.querySelector(
						"[data-type='tracked']:not([data-result='failure'])",
					);
				},
				callback: () => {
					ChatMessage.create({
						content: `<div class="litm dice-roll">
							<div class="dice-flavor">${t(`Litm.effects.${key}.key`)}</div>
							<div class="dice-effect">
								<p><em>${t(effect.description)}</em></p>
								<p>${t(effect.action)}</p>
								<p><strong>${t("Litm.other.cost")}:</strong> ${t(effect.cost)}</p>
							</div>
						</div>
						`,
					});
				},
			});

			const createGroup = (category, effects) =>
				effects.map((effect) => createEffect(effect, category));

			// Add context menu option to change roll types
			const createTypeChange = (type) => ({
				name: `${t("Litm.ui.change-roll-type")}: ${t(`Litm.ui.roll-${type}`)}`,
				icon: '<i class="fas fa-dice"></i>',
				condition: (li) => {
					if (typeof li.find === "function")
						return (
							li.find(".litm.dice-roll[data-type]").length &&
							!li.find(`[data-type='${type}']`).length
						);
					return (
						!!li.querySelector(".litm.dice-roll[data-type]") &&
						!li.querySelector(`[data-type='${type}']`)
					);
				},
				callback: (li) => {
					const data =
						typeof li.data === "function"
							? li.data("message-id")
							: li.dataset.messageId;
					const message = game.messages.get(data);
					const roll = message.rolls[0];
					roll.options.type = type;
					message.update({ rolls: [roll] });
				},
			});

			options.unshift(
				...["quick", "tracked", "mitigate"].map(createTypeChange),
				...Object.entries(CONFIG.litm.effects).flatMap(([category, effects]) =>
					createGroup(category, Object.entries(effects)),
				),
			);
		};
		Hooks.on("getChatLogEntryContext", callback);
		Hooks.on("getChatMessageContextOptions", callback);
	}

	static #prepareCharacterOnCreate() {
		Hooks.on("preCreateActor", (actor, data) => {
			const isCharacter = data.type === "character";
			const hasImage = actor.img !== "icons/svg/mystery-man.svg";

			const base = "icons/svg/";
			let img = base;
			switch (true) {
				case hasImage:
					img = actor.img;
					break;
				case !hasImage && isCharacter:
					img += "target.svg";
					break;
				case !hasImage && data.type === "challenge":
					img += "skull.svg";
					break;
				default:
					img = "icons/svg/mystery-man.svg";
			}

			const tokenImg = actor.prototypeToken?.texture?.src;
			const prototypeToken = isCharacter
				? {
						sight: { enabled: true },
						actorLink: true,
						disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
						texture: { src: tokenImg || img },
					}
				: null;
			actor.updateSource({ prototypeToken, img });
		});

		Hooks.on("createActor", async (actor) => {
			if (actor.type !== "character") return;

			const missingThemes =
				4 - actor.items.filter((it) => it.type === "theme").length;

			await Promise.all(
				Array(missingThemes)
					.fill()
					.map(async (_, i) => {
						await actor.createEmbeddedDocuments("Item", [
							{
								name: `${t("TYPES.Item.theme")} ${i + 1}`,
								type: "theme",
							},
						]);
					}),
			);
			const backpack = actor.items.find((it) => it.type === "backpack");
			if (!backpack) {
				await actor.createEmbeddedDocuments("Item", [
					{
						name: t("TYPES.Item.backpack"),
						type: "backpack",
					},
				]);
			}
		});
	}

	static #prepareThemeOnCreate() {
		Hooks.on("preCreateItem", (item, data) => {
			if (item.img !== "icons/svg/item-bag.svg") return;

			const base = "systems/litm/assets/media/icons/";
			let img = base;
			switch (data.type) {
				case "theme":
					img += "unfurled-scroll.svg";
					break;
				case "threat":
					img += "cracked-skull.svg";
					break;
				case "backpack":
					img += "backpack.svg";
					break;
				default:
					img = "icons/svg/item-bag.svg";
			}
			item.updateSource({ img });
		});
	}

	static #renderStoryTagApp() {
		const app = new game.litm.StoryTagApp();
		game.litm.storyTags = app;

		Hooks.once("ready", async (_app, html) => {
			if (game.settings.get("litm", "show_tag_window_on_load")) {
				app.render(true);
			}
		});
	}

	static #listenToContentLinks() {
		Hooks.on("renderJournalSheet", (_app, html) => {
			html.on("click", ".content-link", (event) => {
				const { id, type } = event.currentTarget.dataset;
				if (type !== "ActivateScene") return;

				event.preventDefault();
				event.stopPropagation();

				const scene = game.scenes.get(id);
				if (!scene) return;
				scene.view();
			});
		});
	}

	static #listenToTagDragTransfer() {
		Hooks.on("ready", () => {
			$(document).on("dragstart", [".litm--tag", ".litm--status"], (event) => {
				const text = event.target.textContent;
				const matches = `{${text}}`.matchAll(CONFIG.litm.tagStringRe);
				const match = [...matches][0];
				if (!match) return;
				const [, tag, status] = match;
				const data = {
					id: foundry.utils.randomID(),
					name: tag,
					type: status ? "status" : "tag",
					values: Array(6)
						.fill(null)
						.map((_, i) => (Number.parseInt(status) === i + 1 ? status : null)),
					isBurnt: false,
					value: status,
				};
				event.originalEvent.dataTransfer.setData(
					"text/plain",
					JSON.stringify(data),
				);
			});
		});
	}

	static #customizeDiceSoNice() {
		Hooks.on("diceSoNiceReady", (dice3d) => {
			dice3d.addSystem({ id: "litm", name: "Legend in the Mist" }, "preferred");
			dice3d.addDicePreset(
				{
					type: "d6",
					labels: ["1", "2", "3", "4", "5", "F", "1", "2", "3", "4", "5", "F"],
					font: "LitM Dice",
					system: "litm",
				},
				"d12",
			);

			dice3d.addColorset(
				{
					name: "litm",
					description: "Legend in the Mist Default",
					category: "Legend in the Mist",
					foreground: ["#c9c9c9", "#c9c9c9", "#433a28", "#433a28", "#433a28"],
					background: ["#877376", "#446674", "#708768", "#A8A7A3", "#ac9e77"],
					outline: ["#433a28", "#433a28", undefined, undefined, undefined],
					texture: "stone",
					material: "stone",
					font: "Georgia",
					visibility: "visible",
				},
				"preferred",
			);
		});
	}

	static #addStoryTagsToControls() {
		Hooks.on("getSceneControlButtons", (controls) => {
			const tokenControls = Array.isArray(controls)
				? controls.find((c) => c.name === "token")
				: controls.tokens;

			if (!tokenControls) return;

			if (Array.isArray(tokenControls.tools)) {
				if (tokenControls.tools.find((t) => t.name === "story-tags")) return;
				tokenControls.tools.push({
					name: "story-tags",
					title: t("Litm.tags.story", "Litm.other.tags"),
					icon: "fas fa-tags",
					button: true,
					onClick: () => {
						if (game.litm.storyTags) {
							if (!game.litm.storyTags.rendered)
								game.litm.storyTags.render(true);
							else game.litm.storyTags.close();
						}
					},
				});
			} else if (!tokenControls.tools["story-tags"])
				tokenControls.tools["story-tags"] = {
					name: "story-tags",
					title: t("Litm.tags.story", "Litm.other.tags"),
					icon: "fas fa-tags",
					button: true,
					onClick: () => {
						if (game.litm.storyTags) {
							if (!game.litm.storyTags.rendered)
								game.litm.storyTags.render(true);
							else game.litm.storyTags.close();
						}
					},
				};
		});
	}

	static #popOutCompatiblity() {
		Hooks.on("PopOut:loaded", (app) => {
			app._element.addClass("litm--popout");
		});

		Hooks.on("PopOut:popin", (app) => {
			app._element.removeClass("litm--popout");
		});
	}

	static #rendeWelcomeScreen() {
		Hooks.once("ready", async () => {
			if (game.settings.get("litm", "welcomed")) return;
			if (!game.user.isGM) return;

			const scene = await Scene.create({
				name: "Legend in the Mist",
				permission: { default: 2 },
				navigation: true,
				background: {
					src: "systems/litm/assets/media/litm_splash.webp",
				},
				width: 1920,
				height: 1080,
				initial: {
					x: 1669,
					y: 853,
					scale: 0.7,
				},
				backgroundColor: "#000000",
				grid: {
					type: 0,
				},
				tokenVision: false,
				fogExploration: false,
				globalLight: false,
			});

			const { thumb } = await scene.createThumbnail();
			await scene.update({ thumb });

			const entry = await JournalEntry.create({
				name: "Legend in the Mist",
				permission: { default: 2 },
				pages: [
					{
						name: "Welcome!",
						text: {
							content: /* html */ `
					<p style="text-align: center"><em>I am thrilled to have you try out this system</em></p>
					<p></p>
					<blockquote style="padding:0.5em 10px;background:var(--litm-color-primary-bg);color:var(--litm-color-weakness)">
						<p><em><strong>P</strong>lease be aware that both the system—and game—is under heavy development. And that there might be breaking bugs or major changes down the road.</em></p>
						<p><em><strong><br>PLEASE MAKE FREQUENT BACKUPS</strong></em></p>
					</blockquote>
					<p></p>
					<h2>What to expect</h2>
					<p>At the moment <strong>Themes</strong>, <strong>Threats</strong>,<strong> Challenges</strong> and <strong>Characters</strong> are implemented. These are all the things you need to play the Tinderbox demo <a href="https://drive.google.com/drive/folders/1jS1dO4rz2uLxOZfdsShOTLjzsJeJqJ6H" title="Legend in the Mist demo playkit">Tinderbox Demo</a>.</p>
					<h3>To-be implemented</h3>
					<p>The system is under active development and you can expect frequent updates as the year progresses. Following is a list of coming feature improvements in no particular order:</p>
					<ul>
						<li>
							<p><strong>Improved handling of Statuses/Tags:</strong> Many small improvements to the tag/status systems, like dragging an actor onto the canvas, or hiding select actors/tags/statuses until relevant, or allowing players greater freedom in creating, editing and removing tags.</p>
						</li>
						<li>
							<p><strong>Crew Theme </strong>and<strong> Theme Improvements:</strong> The Crew theme and theme improvements are yet to be revealed by <a href="https://cityofmist.co/blogs/news/son-of-oaks-new-game-engine">Son of Oak</a>. When the details on these are released work will commence on implementing them in the system.</p>
						</li>
					</ul>
					<h2>How play</h2>
					<p>Beyond the <em>Tinderbox demo</em> linked above, there are few ins-and-outs of the system, yet. Some interactions to be aware of:</p>
					<ul>
						<li>
							<p><span style="font-family: Modesto Condensed"><strong>Right-clicking</strong></span> in general will prompt you to delete/edit whatever you are right clicking. This includes (<strong>Themes</strong>, <strong>Consequences</strong>, <strong>Threats</strong>, <strong>Backpack</strong>, and <strong>Tags</strong> in <strong>Backpack</strong>).</p>
						</li>
						<li>
							<p><strong>Tags</strong> can be written as <code>[tag]</code> <code>[status-4]</code> and <code>[-limit:4]</code>, and are recognized and highlighted in <strong>Journal Entries</strong>, and <strong>Textareas</strong> on <strong>Sheets</strong>.</p>
						</li>
						<li>
							<p>If your <strong>Character</strong><em><strong> </strong></em>is missing <strong>Themes</strong> you can create an empty one in the <em>Item Sidebar</em> <em>(or ask the one with GM permissions to do it)</em>, and <span style="font-family: Modesto Condensed"><strong>drag</strong></span> it onto the sheet.</p>
						</li>
						<li>
							<p><strong>Themes</strong> can also be <span style="font-family: Modesto Condensed"><strong>rearranged</strong></span> on a sheet. <strong>Tags</strong> in the <strong>Backpack</strong> and on <strong>Themes</strong> cannot.</p>
						</li>
						<li>
							<p>If you see a title, it may be <span style="font-family: Modesto Condensed"><strong>editable</strong></span>. This goes for the title on the <strong>Character</strong>-sheet<strong>, Theme</strong>-sheet, and <strong>Roll</strong>-dialog.</p>
						</li>
						<li>
							<p><span style="font-family: Modesto Condensed"><strong>Right-clicking</strong></span> the <em>Chat Card</em> of a <strong>Tracked roll</strong> opens a context menu that lets you post extra effects to chat for reference.</p>
						</li>
					</ul>
					<h3>Keyboard Shortcuts</h3>
					<p>Foundry features a number of keyboard shortcuts, you can find these in the <strong>Game Settings</strong>-tab. In addition <em>Legend in the Mist</em> implements a shortcut for opening the <strong>Roll Dialog</strong>.</p>
					<ul>
						<li>
							<p><span class="litm--kbd">c</span> to open your assigned character's <strong>Sheet</strong>.</p>
						</li>
						<li>
							<p><span class="litm--kbd">r</span> to open your assigned character's <strong>Roll Dialog</strong>.</p>
						</li>
					</ul>
					<h2>Special Thanks</h2>
					<p>This project already has some contributors, help and good vibes!</p>
					<ul>
						<li>
							<p>Thanks to <strong>@Daegony</strong> for contributing graphics, designs, UX advice and help with rules and the game in general.</p>
						</li>
						<li>
							<p>Thanks to <strong>@CussaMitre</strong> for contributing code and squashing bugs.</p>
						</li>
						<li>
							<p>Thanks to <strong>@Metamancer</strong> for being a rubber duck, and giving advice on both the game and development.</p>
						</li>
						<li>
							<p>Thanks to <strong>@Altervayne </strong>for creating the online character creator and setting up a Discord community for us.</p>
						</li>
						<li>
							<p>Thanks to @<strong>erizocosmico</strong> (Spanish), @<strong>imiri78</strong> (German), and @<strong>0rac1e404</strong> (Chinese) for our first localisation efforts.</p>
						</li>
						<li>
							<p>Thanks to the <em><strong>City of Mist </strong>Discord </em>for contributing feedback, bug reports and generally being awesome about me barging in the door like I did.</p>
						</li>
					</ul>
					<p><em>If you feel like you could contribute something don't hesitate with contacting me <strong>@aMediocreDad</strong>.</em></p>
					<p></p>
					<blockquote>
						<p><strong>See you in the mist…</strong></p>
					</blockquote>
				`,
						},
					},
				],
			});

			const { uuid, id } = entry.pages.contents[0];

			// Create a "welcome" chat message
			ChatMessage.create({
				title: "Welcome to Legend in the Mist!",
				content: /* html */ `
				<p><strong>Welcome to Legend in the Mist</strong></p>
				<p>Before you start playing, you should want to read the <a class="content-link" draggable="true" data-link data-uuid="${
					uuid
				}" data-id="${id}" data-type="JournalEntryPage" data-tooltip="${t("Litm.ui.user-manual")}"><i class="fas fa-file-lines"></i>Legend in the Mist</a> journal entry. It contains some important information about the system, and what to expect.</p>
				<p>Once you've read the journal entry, you can click the button below to import all the rules and content required to play the Tinderbox Demo.</p>
				<button type="button" id="litm--import-adventure" style="background: var(--litm-color-status-bg);"><strong>${t(
					"Litm.ui.import-adventure",
				)}</strong></button>
				<p style="text-align:center;">Good luck, and have fun!</p>
			`,
			});

			await sleep(300);
			await scene.activate();
			await sleep(300);
			entry.sheet.render(true, {
				collapsed: true,
				width: 500,
				height: 600,
			});

			// We're done!
			game.settings.set("litm", "welcomed", true);
		});

		Hooks.on("renderChatMessage", (_app, html) => {
			html.find("#litm--import-adventure").on("click", async () => {
				const adventure = await game.packs
					.get("litm.tinderbox-demo")
					.getDocuments();
				adventure?.[0]?.sheet.render(true);
			});
		});

		Hooks.on("importAdventure", async () => {
			const updates = await Promise.all(
				game.scenes
					.filter((s) => /litm\/assets/.test(s.thumb))
					.map(async (s) => {
						const { thumb } = await s.createThumbnail();
						return { _id: s.id, thumb };
					}),
			);
			await Scene.updateDocuments(updates);
			game.journal.getName("Tinderbox Demo Rules").sheet.render(true);
		});
	}

	static #showDeprecationNotice() {
		Hooks.once("ready", async () => {
			// Show a permanent notification for all users
			ui.notifications.warn(
				game.i18n.localize("Litm.ui.deprecated-notice-short"),
				{ permanent: true },
			);

			// Show a full dialog for GMs only, once
			if (!game.user.isGM) return;
			if (LitmSettings.deprecationAcknowledged) return;

			const content = game.i18n.localize("Litm.ui.deprecated-notice");
			new Dialog(
				{
					title: game.i18n.localize("Litm.ui.deprecated-title"),
					content: /* html */ `
					<div class="litm--deprecation-notice">
						${content}
					</div>
				`,
					buttons: {
						ok: {
							icon: '<i class="fas fa-check"></i>',
							label: game.i18n.localize("Litm.ui.deprecated-acknowledge"),
							callback: () => LitmSettings.setDeprecationAcknowledged(true),
						},
					},
					default: "ok",
				},
				{
					width: 520,
					classes: ["litm", "litm--deprecation-dialog"],
				},
			).render(true);
		});
	}

	static #runMigrations() {
		Hooks.once("ready", runMigrations);
	}
}
