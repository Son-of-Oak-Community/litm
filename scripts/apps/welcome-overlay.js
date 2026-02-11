import { createSampleHero } from "../system/sample-hero.js";
import { LitmSettings } from "../system/settings.js";
import { registerTours } from "../system/tours.js";
import { sleep, localize as t } from "../utils.js";

const THEME_SLOTS = 4;
const MODULE_ID = "legend-in-the-mist";

const HERO_NAMES = [
	"Willow",
	"Bear",
	"Heath",
	"Zephyr",
	"Solace",
	"Brave",
	"Felicity",
	"Rowan",
	"Yarrow",
	"Onyx",
	"Bayleaf",
	"Rust",
	"Marrow",
	"Daisy",
	"Bait",
	"Aster",
	"Bramble",
	"Clement",
	"Steadfast",
	"Peregrine",
	"Mila",
	"Tidin",
	"Kahira",
	"Fondo",
	"Thedea",
	"Neilem",
	"Kelda",
	"Nona",
	"Bolb",
	"Eerik",
	"Gofer",
	"Thelma",
	"Jaro",
	"Koral",
	"Noxen",
	"Emille",
	"Hela",
	"Veles",
	"Berglitz",
	"Gilla",
	"Elswith",
	"Laurantadeara",
	"Aleonora",
	"Belladonna",
	"Chrysanthemum",
	"Amalthea",
	"Yelizaveta",
	"Rosamund",
	"Milorada",
	"Azeria",
	"Silverata",
	"Shozauka",
	"Sepheera",
	"Gerrick",
	"Hythalmun",
	"Leyla Tanner",
	"Aurora Beaks",
	"Colin Stillwater",
	"Emeralda Fogley",
	"Karis Hillfell",
	"Arsinia Hawthorne",
	"Eerik Kallop",
	"Hela Grange",
	"Radym Desimir",
	"Veles Hayes",
	"Valen Bertrand",
	"Nessie Tarnfolk",
	"Heather Bellrose",
	"Samuil Flagstone",
	"Killian Farstride",
	"Lance Tubroot",
	"Thedor Cloudborne",
	"Fleece Oakenfoot",
	"Jarko Cooper",
	"Yule the Wood Whisperer",
	"Ridge of Ravenhome",
	"Tarn of Milkrest",
	"Froll the Replenisher",
	"Kurri Blackcurrant",
	"Riyori of the Kawa",
	"Nochika",
	"Gild",
	"Maol of the Boar",
	"Ferika of the Vulture",
	"Ethain of the Bear",
	"Thrad Pine-Splitter",
	"Tillis Nebelclaw",
	"Igraine Demerand",
	"Demetria Rosethorne",
	"Dythara Lowtower",
	"Justine Tanner",
	"Ferrox the Flamer",
	"Liliwen Clipped-Wing",
	"Maxin the Laughing One",
	"Worel of Stormhelm",
	"Sidurg the Crafty",
	"Muddy Med",
	"Old Dinger",
	"Stares-to-Horizon",
	"Ear-to-Ground",
];

const GENERAL_STORE = {
	armor: [
		"buff coat",
		"leather armor",
		"chainmail",
		"buckler",
		"wooden shield",
	],
	weapons: [
		"axe",
		"hunting bow",
		"dirk",
		"shortsword",
		"quarterstaff",
		"slingshot",
	],
	supplies: [
		"bedroll",
		"carving knife",
		"cloth tent",
		"frying pan",
		"repair kit",
		"waterskin",
	],
	clothing: [
		"bracers",
		"cape",
		"gloves",
		"sturdy boots",
		"travel cloak",
		"oilskins",
	],
	medicinal: [
		"antidote",
		"bandages",
		"healing brew",
		"foot ointment",
		"soothing salves",
	],
	personal: [
		"family signet",
		"grandmother's shawl",
		"pipe & tobacco",
		"parchment & ink",
	],
	notes: [
		"funny anecdote",
		"leftover meal recipe",
		"little prayer",
		"strong comeback",
	],
	trinkets: ["good luck charm", "prayer beads", "religious icon", "talisman"],
};

const SLIDE_TEMPLATES = {
	welcome: "systems/litm/templates/apps/welcome-overlay/welcome.html",
	modeSelect: "systems/litm/templates/apps/welcome-overlay/mode-select.html",
	tropeSelect: "systems/litm/templates/apps/welcome-overlay/trope-select.html",
	tropeThemes: "systems/litm/templates/apps/welcome-overlay/trope-themes.html",
	customThemes:
		"systems/litm/templates/apps/welcome-overlay/custom-themes.html",
	review: "systems/litm/templates/apps/welcome-overlay/review.html",
	heroCreated: "systems/litm/templates/apps/welcome-overlay/hero-created.html",
};

export class WelcomeOverlay {
	/** @type {WelcomeOverlay|null} */
	static #instance = null;

	/** @type {HTMLElement|null} */
	#el = null;

	/** @type {Function|null} */
	#onKeyDown = null;

	/** @type {number} */
	#currentSlideIndex = 0;

	/** @type {string[]} */
	#slideFlow = ["welcome"];

	/** @type {boolean} */
	#isAnimating = false;

	/** @type {boolean} */
	#reducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;

	/** @type {string|null} */
	#assignToUser = null;

	_appState = {
		mode: "",
		actorName: "",
		search: { tropes: "", themekits: "", themebooks: "" },
		trope: {
			selectedUuid: "",
			optionalUuid: "",
			backpackChoice: "",
			themes: { index: 0, kitUuids: [], choices: [] },
		},
		custom: {
			themeIndex: 0,
			themes: Array(THEME_SLOTS)
				.fill(null)
				.map(() => ({
					method: "",
					themekitUuid: "",
					themebookUuid: "",
					level: "",
					name: "",
					powerTags: ["", ""],
					powerQuestions: ["", ""],
					weaknessTag: "",
					weaknessQuestion: "",
					quest: "",
					powerTagOptions: [],
					weaknessTagOptions: [],
					selectedPowerTags: [],
					selectedWeaknessTag: "",
					powerTagQuestions: [],
					weaknessTagQuestions: [],
				})),
			backpackTags: ["", "", ""],
			activeStoreCategory: "",
		},
	};

	_cache = {
		loaded: false,
		tropes: [],
		themekits: [],
		themebooks: [],
		tropeDocs: new Map(),
		themeDocs: new Map(),
		themebookDocs: new Map(),
	};

	constructor({ assignToUser = null } = {}) {
		this.#assignToUser = assignToUser;
	}

	// ---------------------------------------------------------------------------
	// Public API
	// ---------------------------------------------------------------------------

	get currentSlideKey() {
		return this.#slideFlow[this.#currentSlideIndex] ?? "welcome";
	}

	/**
	 * Create the overlay DOM, render the initial slide, and animate in.
	 */
	async show() {
		if (this.#el) return;

		// Singleton guard — dismiss any previous instance
		if (WelcomeOverlay.#instance) {
			await WelcomeOverlay.#instance.dismiss();
		}
		WelcomeOverlay.#instance = this;

		// Preload slide templates
		await foundry.applications.handlebars.loadTemplates(
			Object.values(SLIDE_TEMPLATES),
		);

		this.#el = document.createElement("div");
		this.#el.id = "litm-welcome-overlay";
		this.#el.classList.add("litm", "litm--welcome-overlay");
		this.#el.style.opacity = "0";

		// Background scrim
		const bg = document.createElement("div");
		bg.classList.add("litm--welcome-overlay__bg");
		this.#el.appendChild(bg);

		// Slides container
		const slides = document.createElement("div");
		slides.classList.add("litm--welcome-overlay__slides");
		this.#el.appendChild(slides);

		document.body.appendChild(this.#el);

		// Keydown handler for Escape dismiss and Tab focus trap
		this.#onKeyDown = (event) => {
			if (event.key === "Escape") {
				event.preventDefault();
				this.dismiss();
				return;
			}
			if (event.key === "Tab") {
				const focusable = [
					...this.#el.querySelectorAll(
						'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
					),
				].filter((el) => !el.disabled && el.offsetParent !== null);
				if (!focusable.length) return;
				const first = focusable[0];
				const last = focusable[focusable.length - 1];
				if (event.shiftKey && document.activeElement === first) {
					event.preventDefault();
					last.focus();
				} else if (!event.shiftKey && document.activeElement === last) {
					event.preventDefault();
					first.focus();
				}
			}
		};
		document.addEventListener("keydown", this.#onKeyDown);

		await this.#renderCurrentSlide();
		await this.#animateEnter();
	}

	/**
	 * Animate the overlay out and remove it from the DOM.
	 */
	async dismiss({ skipSampleHero = false } = {}) {
		if (!this.#el || this.#isAnimating) return;

		// Remove keydown listener
		if (this.#onKeyDown) {
			document.removeEventListener("keydown", this.#onKeyDown);
			this.#onKeyDown = null;
		}

		// GM auto-creates sample hero on plain dismiss (not tour start)
		if (!skipSampleHero && game.user.isGM) {
			createSampleHero().catch(() => {});
		}

		await this.#animateExit();
		this.#el.remove();
		this.#el = null;
		WelcomeOverlay.#instance = null;
	}

	/**
	 * Advance to the next slide in the flow.
	 */
	async next() {
		if (this.#isAnimating) return;
		if (this.#currentSlideIndex >= this.#slideFlow.length - 1) return;
		this.#currentSlideIndex++;
		await this.#transitionSlide("forward");
	}

	/**
	 * Go back to the previous slide.
	 */
	async back() {
		if (this.#isAnimating) return;
		if (this.#currentSlideIndex <= 0) return;
		this.#currentSlideIndex--;
		await this.#transitionSlide("backward");
	}

	/**
	 * Jump to a specific slide by key.
	 * @param {string} slideKey
	 */
	async goToSlide(slideKey) {
		if (this.#isAnimating) return;
		const index = this.#slideFlow.indexOf(slideKey);
		if (index === -1) return;
		const direction = index > this.#currentSlideIndex ? "forward" : "backward";
		this.#currentSlideIndex = index;
		await this.#transitionSlide(direction);
	}

	// ---------------------------------------------------------------------------
	// Slide flow
	// ---------------------------------------------------------------------------

	/**
	 * Build the ordered array of slide keys based on the selected mode.
	 * @param {string} [fromSlide="welcome"] - The starting slide key.
	 * @returns {string[]}
	 */
	#buildSlideFlow(fromSlide = "welcome") {
		// Welcome is always the first slide
		const flow = ["welcome"];

		if (fromSlide === "welcome") return flow;

		// Mode select is always next
		flow.push("modeSelect");
		if (fromSlide === "modeSelect") return flow;

		// Branch based on mode
		const mode = this._appState.mode;
		if (mode === "trope") {
			const tropeSlides = [
				"tropeSelect",
				"tropeThemes",
				"review",
				"heroCreated",
			];
			for (const slide of tropeSlides) {
				flow.push(slide);
				if (slide === fromSlide) break;
			}
		} else if (mode === "custom") {
			const customSlides = ["customThemes", "review", "heroCreated"];
			for (const slide of customSlides) {
				flow.push(slide);
				if (slide === fromSlide) break;
			}
		} else {
			// No mode selected yet — just include up to the requested slide
			const heroSlides = [
				"tropeSelect",
				"tropeThemes",
				"customThemes",
				"review",
				"heroCreated",
			];
			for (const slide of heroSlides) {
				flow.push(slide);
				if (slide === fromSlide) break;
			}
		}

		return flow;
	}

	// ---------------------------------------------------------------------------
	// Rendering
	// ---------------------------------------------------------------------------

	/**
	 * Render the current slide template into the slides container.
	 */
	async #renderCurrentSlide() {
		if (!this.#el) return;

		const slideKey = this.currentSlideKey;
		const templatePath = SLIDE_TEMPLATES[slideKey];
		if (!templatePath) {
			console.warn(
				`litm | WelcomeOverlay: No template for slide "${slideKey}"`,
			);
			return;
		}

		const context = await this.#prepareSlideContext(slideKey);
		const html = await foundry.applications.handlebars.renderTemplate(
			templatePath,
			context,
		);

		const container = this.#el.querySelector(".litm--welcome-overlay__slides");
		if (!container) return;

		container.innerHTML = html;

		const slideEl = container.firstElementChild;
		if (slideEl) this.#bindSlideListeners(slideEl);
	}

	/**
	 * Prepare the template context for the given slide.
	 * @param {string} slideKey
	 * @returns {Promise<object>}
	 */
	async #prepareSlideContext(slideKey) {
		switch (slideKey) {
			case "welcome":
				return this.#prepareWelcomeContext();
			case "modeSelect":
				return this.#prepareModeSelectContext();
			case "tropeSelect":
				return this.#prepareTropeSelectContext();
			case "tropeThemes":
				return this.#prepareTropeThemesContext();
			case "customThemes":
				return this.#prepareCustomBuildContext();
			case "review":
				return this.#prepareReviewContext();
			case "heroCreated":
				return this.#prepareHeroCreatedContext();
			default:
				return {};
		}
	}

	/**
	 * Build context for the welcome slide.
	 * @returns {object}
	 */
	#prepareWelcomeContext() {
		const permissions = game.settings.get("core", "permissions");
		const playerCanCreate =
			permissions.ACTOR_CREATE?.includes(CONST.USER_ROLES.PLAYER) ?? false;

		const canCreateHero = game.user.can("ACTOR_CREATE");

		const tours = [];
		for (const [id, tour] of game.tours.entries()) {
			if (!id.startsWith("litm.")) continue;
			tours.push({
				id,
				title: game.i18n.localize(tour.title),
				description: game.i18n.localize(tour.description),
			});
		}

		return {
			logo: CONFIG.litm.assets.logo,
			isGM: game.user.isGM,
			playerCanCreate,
			canCreateHero,
			tours,
			customDiceEnabled: LitmSettings.customDice,
			popoutTagsEnabled: LitmSettings.popoutTagsSidebar,
		};
	}

	/**
	 * Build context for the mode select slide.
	 * @returns {object}
	 */
	#prepareModeSelectContext() {
		return {
			mode: this._appState.mode,
		};
	}

	/**
	 * Build context for the trope select slide.
	 * @returns {Promise<object>}
	 */
	async #prepareTropeSelectContext() {
		await this.ensureIndexes();

		const themeKitLookup = this.buildLookup(this._cache.themekits);
		const tropes = this.filterBySearch(
			this._cache.tropes,
			this._appState.search.tropes,
		);
		const tropesByCategory = this.groupByCategory(tropes);
		const selectedTrope = await this.getTropeDetails(
			this._appState.trope.selectedUuid,
			themeKitLookup,
		);

		// Auto-select first optional themekit if none selected
		if (
			selectedTrope &&
			selectedTrope.optional?.length > 0 &&
			!this._appState.trope.optionalUuid
		) {
			this._appState.trope.optionalUuid = selectedTrope.optional[0].uuid;
		}

		return {
			mode: this._appState.mode,
			state: this._appState,
			search: this._appState.search,
			hasTropes: this._cache.tropes.length > 0,
			tropesByCategory,
			selectedTrope,
			selectedTropeUuid: this._appState.trope.selectedUuid,
		};
	}

	/**
	 * Build context for the trope themes slide.
	 * @returns {Promise<object>}
	 */
	async #prepareTropeThemesContext() {
		await this.ensureIndexes();

		const themeKitLookup = this.buildLookup(this._cache.themekits);
		const selectedTrope = await this.getTropeDetails(
			this._appState.trope.selectedUuid,
			themeKitLookup,
		);

		await this.syncTropeThemes(selectedTrope);

		const choices = this._appState.trope.themes.choices;
		for (const choice of choices) {
			const powerCount = (choice.powerTags || []).filter(Boolean).length;
			const hasWeakness = Boolean(choice.weaknessTag);
			choice.powerTagCount = powerCount;
			choice.hasWeakness = hasWeakness;
			choice.isComplete = powerCount >= 2 && hasWeakness;
		}

		return {
			mode: this._appState.mode,
			state: this._appState,
			tropeThemeChoices: choices,
		};
	}

	/**
	 * Build context for the custom themes slide.
	 * @returns {Promise<object>}
	 */
	async #prepareCustomBuildContext() {
		await this.ensureIndexes();

		const themeKitLookup = this.buildLookup(this._cache.themekits);
		const themebookLookup = this.buildLookup(this._cache.themebooks);
		const currentTheme =
			this._appState.custom.themes[this._appState.custom.themeIndex];

		const customThemeLabels = this._appState.custom.themes.map((theme) => {
			const kitName = themeKitLookup.get(theme.themekitUuid)?.name || "";
			const bookName = themebookLookup.get(theme.themebookUuid)?.name || "";
			return theme.name || kitName || bookName || "";
		});

		const selectedThemebook = await this.getThemebookDoc(
			currentTheme.themebookUuid,
		);

		const isVariableLevel =
			selectedThemebook?.system?.theme_level === "variable";
		if (isVariableLevel && !currentTheme.level) {
			currentTheme.level = Object.keys(CONFIG.litm.theme_levels)[0];
		}
		const levelOptions = isVariableLevel
			? Object.keys(CONFIG.litm.theme_levels).map((key) => ({
					value: key,
					label: t(`LITM.Terms.${key}`),
					selected: currentTheme.level === key,
				}))
			: [];

		const allPowerQs = (selectedThemebook?.system?.powerTagQuestions || []).map(
			(q) => `${q ?? ""}`.trim(),
		);
		const powerTagQuestionOptions = this.toQuestionOptions(allPowerQs.slice(1));
		const weaknessQuestionOptions = this.toQuestionOptions(
			selectedThemebook?.system?.weaknessTagQuestions,
		);

		const customThemeQuestions = await Promise.all(
			this._appState.custom.themes.map(async (theme) => {
				const book = await this.getThemebookDoc(theme.themebookUuid);
				const allPQs = (book?.system?.powerTagQuestions || []).map((q) =>
					`${q ?? ""}`.trim(),
				);
				const nameQuestion = allPQs[0] || "";
				return { nameQuestion };
			}),
		);

		const questIdeas =
			selectedThemebook?.system?.questIdeas?.filter(Boolean) || [];

		const activeCategory = this._appState.custom.activeStoreCategory;
		const generalStore = Object.entries(GENERAL_STORE).map(([key, items]) => ({
			key,
			label: t(`LITM.Ui.hero_creation_store_${key}`),
			items,
			active: activeCategory === key,
		}));

		return {
			mode: this._appState.mode,
			state: this._appState,
			custom: this._appState.custom,
			themeIndex: this._appState.custom.themeIndex,
			currentTheme,
			customThemeLabels,
			customThemeQuestions,
			hasThemekits: this._cache.themekits.length > 0,
			themekits: this.filterBySearch(
				this._cache.themekits,
				this._appState.search.themekits,
			),
			themebooks: this.filterBySearch(
				this._cache.themebooks,
				this._appState.search.themebooks,
			),
			powerTagQuestionOptions,
			weaknessQuestionOptions,
			isVariableLevel,
			levelOptions,
			backpackTags: this._appState.custom.backpackTags,
			questIdeas,
			generalStore,
		};
	}

	// ---------------------------------------------------------------------------
	// Listener binding
	// ---------------------------------------------------------------------------

	/**
	 * Attach click handlers for [data-action] and input handlers for [data-bind].
	 * @param {HTMLElement} slideEl
	 */
	#bindSlideListeners(slideEl) {
		// Action buttons — delegate clicks via checkbox-aware handler
		slideEl.addEventListener("click", async (event) => {
			const target = event.target.closest("[data-action]");
			if (!target) return;

			// For checkboxes, the click fires after the checked state changes,
			// so we can read target.checked directly in the handler.
			const action = target.dataset.action;
			if (action) {
				try {
					await this.#handleAction(action, target, event);
				} catch (err) {
					console.error("litm | Welcome overlay action failed:", err);
					ui.notifications.error(
						"Something went wrong. Check the console for details.",
					);
				}
			}
		});

		// Data-bind inputs
		slideEl.querySelectorAll("[data-bind]").forEach((input) => {
			const eventName = input.tagName === "SELECT" ? "change" : "input";
			input.addEventListener(eventName, () => {
				const path = input.dataset.bind;
				if (!path) return;
				const value =
					input.type === "number" ? Number(input.value) : input.value;
				foundry.utils.setProperty(this._appState, path, value);
				if (input.dataset.render === "true") {
					this.#renderCurrentSlide();
				}
			});
		});

		// Radio inputs for tropeOptional
		slideEl.querySelectorAll('input[name="tropeOptional"]').forEach((input) => {
			input.addEventListener("change", () => {
				if (!input.checked) return;
				this._appState.trope.optionalUuid = input.value || "";
				this._appState.trope.themes.index = 0;
				this.#renderCurrentSlide();
			});
		});
	}

	// ---------------------------------------------------------------------------
	// Action handling
	// ---------------------------------------------------------------------------

	/**
	 * Dispatch an action by name.
	 * @param {string} action
	 * @param {HTMLElement} target
	 * @param {Event} event
	 */
	async #handleAction(action, target, _event) {
		if (this.#isAnimating) return;
		switch (action) {
			// Welcome slide actions
			case "createHero":
				this.#slideFlow = this.#buildSlideFlow("modeSelect");
				this.#currentSlideIndex = 0;
				await this.next();
				break;
			case "dismiss":
				LitmSettings.setWelcomed(true);
				await this.dismiss();
				break;
			case "dismissHeroCreated":
				LitmSettings.setWelcomed(true);
				await this.dismiss({ skipSampleHero: true });
				break;
			case "enablePlayerCreation":
				await this.#enablePlayerCreation();
				break;
			case "toggleCustomDice":
				await game.settings.set(
					"litm",
					"custom_dice",
					!LitmSettings.customDice,
				);
				target
					.querySelector(".litm--welcome-overlay__switch")
					?.classList.toggle("active", LitmSettings.customDice);
				break;
			case "togglePopoutTags":
				await game.settings.set(
					"litm",
					"popout_tags_sidebar",
					!LitmSettings.popoutTagsSidebar,
				);
				target
					.querySelector(".litm--welcome-overlay__switch")
					?.classList.toggle("active", LitmSettings.popoutTagsSidebar);
				break;
			case "startTour":
				await this.#startTour(target.dataset.tourId);
				break;

			// Mode select
			case "selectMode": {
				const mode = target.dataset.mode || "";
				if (!mode) break;
				this._appState.mode = mode;
				if (mode === "trope") {
					this.#slideFlow = [
						"welcome",
						"modeSelect",
						"tropeSelect",
						"tropeThemes",
						"review",
					];
				} else if (mode === "custom") {
					this.#slideFlow = ["welcome", "modeSelect", "customThemes", "review"];
				}
				await this.next();
				break;
			}

			// Trope selection
			case "selectTrope": {
				this._appState.trope.selectedUuid = target.dataset.uuid || "";
				this._appState.trope.optionalUuid = "";
				this._appState.trope.backpackChoice = "";
				this._appState.trope.themes.index = 0;
				await this.#renderCurrentSlide();
				break;
			}

			case "selectTropeOptional":
				this._appState.trope.optionalUuid = target.dataset.uuid || "";
				this._appState.trope.themes.index = 0;
				await this.#renderCurrentSlide();
				break;

			case "selectTropeBackpack":
				this._appState.trope.backpackChoice = target.dataset.value || "";
				await this.#renderCurrentSlide();
				break;

			// Trope theme tag toggling
			case "toggleTropePowerTag": {
				const index = Number(target.dataset.index || 0);
				const choice = this._appState.trope.themes.choices[index];
				if (!choice) break;
				const value = target.value;
				const selected = new Set(choice.powerTags.filter(Boolean));
				if (target.checked) {
					if (selected.has(value)) break;
					if (selected.size >= 2) {
						target.checked = false;
						ui.notifications.warn("LITM.Ui.hero_creation_max_power_tags", {
							localize: true,
						});
						break;
					}
					selected.add(value);
				} else {
					selected.delete(value);
				}
				choice.powerTags = Array.from(selected);
				choice.powerTagsMap = this.toLookupMap(choice.powerTags);
				choice.powerTagOptions.forEach((tagOpt) => {
					tagOpt.checked = selected.has(tagOpt.name);
				});
				await this.#renderCurrentSlide();
				break;
			}

			case "toggleTropeWeaknessTag": {
				const index = Number(target.dataset.index || 0);
				const choice = this._appState.trope.themes.choices[index];
				if (!choice) break;
				const value = target.value;
				if (target.checked) {
					choice.weaknessTag = value;
				} else if (choice.weaknessTag === value) {
					choice.weaknessTag = "";
				}
				choice.weaknessTagOptions.forEach((tagOpt) => {
					tagOpt.checked = tagOpt.name === choice.weaknessTag;
				});
				await this.#renderCurrentSlide();
				break;
			}

			// Custom theme actions
			case "selectCustomTheme":
				this._appState.custom.themeIndex = Number(target.dataset.index);
				await this.#renderCurrentSlide();
				break;
			case "selectThemeMethod": {
				const method = target.dataset.method || "";
				const idx = Number(
					target.dataset.index ?? this._appState.custom.themeIndex,
				);
				const theme = this._appState.custom.themes[idx];
				if (!theme) break;
				theme.method = method;
				theme.themekitUuid = "";
				theme.themebookUuid = "";
				theme.powerTagOptions = [];
				theme.weaknessTagOptions = [];
				theme.selectedPowerTags = [];
				theme.selectedWeaknessTag = "";
				await this.#renderCurrentSlide();
				break;
			}
			case "selectThemeKit": {
				const idx = Number(
					target.dataset.index ?? this._appState.custom.themeIndex,
				);
				const theme = this._appState.custom.themes[idx];
				if (!theme) break;
				const uuid =
					target.tagName === "SELECT"
						? target.value
						: target.dataset.uuid || "";
				theme.method = "themekit";
				theme.themekitUuid = uuid;
				// Populate tag options from the themekit
				if (uuid) {
					const themeDoc = await this.getThemeDoc(uuid);
					const tagOptions = this.getThemeTagOptions(themeDoc);
					theme.powerTagOptions = tagOptions.powerTags.map((name) => ({
						name,
						checked: false,
					}));
					theme.weaknessTagOptions = tagOptions.weaknessTags.map((name) => ({
						name,
						checked: false,
					}));
					theme.selectedPowerTags = [];
					theme.selectedWeaknessTag = "";
					// Resolve parent themebook questions
					const themebookName = themeDoc?.system?.themebook || "";
					const parentBook = await this.getThemebookByName(themebookName);
					const allPQs = (parentBook?.system?.powerTagQuestions || [])
						.map((q) => `${q ?? ""}`.trim())
						.filter(Boolean);
					theme.powerTagQuestions = allPQs.slice(1);
					theme.weaknessTagQuestions = (
						parentBook?.system?.weaknessTagQuestions || []
					)
						.map((q) => `${q ?? ""}`.trim())
						.filter(Boolean);
				} else {
					theme.powerTagOptions = [];
					theme.weaknessTagOptions = [];
					theme.selectedPowerTags = [];
					theme.selectedWeaknessTag = "";
					theme.powerTagQuestions = [];
					theme.weaknessTagQuestions = [];
				}
				await this.#renderCurrentSlide();
				break;
			}
			case "selectThemebook": {
				const idx = Number(
					target.dataset.index ?? this._appState.custom.themeIndex,
				);
				const theme = this._appState.custom.themes[idx];
				if (!theme) break;
				const uuid =
					target.tagName === "SELECT"
						? target.value
						: target.dataset.uuid || "";
				theme.method = "themebook";
				theme.themebookUuid = uuid;
				await this.#renderCurrentSlide();
				break;
			}

			// Custom themekit tag toggling
			case "toggleCustomPowerTag": {
				const idx = Number(
					target.dataset.index ?? this._appState.custom.themeIndex,
				);
				const theme = this._appState.custom.themes[idx];
				if (!theme) break;
				const value = target.value;
				const selected = new Set(theme.selectedPowerTags.filter(Boolean));
				if (target.checked) {
					if (selected.has(value)) break;
					if (selected.size >= 2) {
						target.checked = false;
						ui.notifications.warn("LITM.Ui.hero_creation_max_power_tags", {
							localize: true,
						});
						break;
					}
					selected.add(value);
				} else {
					selected.delete(value);
				}
				theme.selectedPowerTags = Array.from(selected);
				theme.powerTagOptions.forEach((tagOpt) => {
					tagOpt.checked = selected.has(tagOpt.name);
				});
				await this.#renderCurrentSlide();
				break;
			}

			case "toggleCustomWeaknessTag": {
				const idx = Number(
					target.dataset.index ?? this._appState.custom.themeIndex,
				);
				const theme = this._appState.custom.themes[idx];
				if (!theme) break;
				const value = target.value;
				if (target.checked) {
					theme.selectedWeaknessTag = value;
				} else if (theme.selectedWeaknessTag === value) {
					theme.selectedWeaknessTag = "";
				}
				theme.weaknessTagOptions.forEach((tagOpt) => {
					tagOpt.checked = tagOpt.name === theme.selectedWeaknessTag;
				});
				await this.#renderCurrentSlide();
				break;
			}

			// Quest idea (Feature B)
			case "applyQuestIdea": {
				const idea = target.dataset.value;
				const idx = this._appState.custom.themeIndex;
				this._appState.custom.themes[idx].quest = idea;
				await this.#renderCurrentSlide();
				break;
			}

			// Backpack suggestions (Feature C)
			case "toggleStoreCategory": {
				const cat = target.dataset.value || "";
				this._appState.custom.activeStoreCategory =
					this._appState.custom.activeStoreCategory === cat ? "" : cat;
				await this.#renderCurrentSlide();
				break;
			}
			case "fillBackpackSuggestion": {
				const tag = target.dataset.value || "";
				const tags = this._appState.custom.backpackTags;
				const emptyIdx = tags.findIndex((t) => !t);
				if (emptyIdx !== -1) {
					tags[emptyIdx] = tag;
				}
				await this.#renderCurrentSlide();
				break;
			}

			// Navigation
			case "back":
				await this.back();
				break;
			case "next":
				await this.#onWizardNext();
				break;

			case "create":
				await this.#createHero();
				break;

			// Review slide
			case "suggestHeroName": {
				const name = HERO_NAMES[Math.floor(Math.random() * HERO_NAMES.length)];
				this._appState.actorName = name;
				await this.#renderCurrentSlide();
				break;
			}

			case "cancel":
				await this.dismiss();
				break;
			default:
				console.warn(`litm | WelcomeOverlay: Unknown action "${action}"`);
		}
	}

	/**
	 * Validate the current slide before advancing to the next.
	 */
	async #onWizardNext() {
		const slideKey = this.currentSlideKey;

		switch (slideKey) {
			case "modeSelect":
				if (!this._appState.mode) {
					ui.notifications.warn("LITM.Ui.hero_creation_select_mode", {
						localize: true,
					});
					return;
				}
				await this.next();
				break;

			case "tropeSelect":
				if (!this._appState.trope.selectedUuid) {
					ui.notifications.warn("LITM.Ui.hero_creation_select_trope", {
						localize: true,
					});
					return;
				}
				await this.next();
				break;

			case "tropeThemes":
				// Trope themes validation is lenient — always allow advancing
				await this.next();
				break;

			case "customThemes": {
				const valid = await this.validateAllCustomThemes();
				if (!valid) return;
				await this.next();
				break;
			}

			default:
				await this.next();
				break;
		}
	}

	// ---------------------------------------------------------------------------
	// Welcome-specific actions
	// ---------------------------------------------------------------------------

	/**
	 * Grant Player role the ACTOR_CREATE permission.
	 */
	async #enablePlayerCreation() {
		const permissions = game.settings.get("core", "permissions");
		const roles = permissions.ACTOR_CREATE || [];
		if (!roles.includes(CONST.USER_ROLES.PLAYER)) {
			roles.push(CONST.USER_ROLES.PLAYER);
			permissions.ACTOR_CREATE = roles;
			await game.settings.set("core", "permissions", permissions);
			ui.notifications.info("LITM.Ui.gm_welcome_creation_granted", {
				localize: true,
			});
		}
		await this.#renderCurrentSlide();
	}

	/**
	 * Dismiss the overlay and start a guided tour.
	 * For GM, ensures the sample hero exists first.
	 * @param {string} tourId
	 */
	async #startTour(tourId) {
		if (!tourId) return;
		const tour = game.tours.get(tourId);
		if (!tour) return;

		if (this._createdActor) {
			tour.targetActor = this._createdActor;
		} else if (game.user.isGM) {
			await createSampleHero();
			tour.targetActor ??= game.actors.find(
				(a) => a.type === "hero" && a.getFlag("litm", "isSampleHero"),
			);
		} else {
			tour.targetActor ??= game.user.character ?? null;
		}

		await this.dismiss({ skipSampleHero: true });
		await tour.reset();
		tour.start();
	}

	// ---------------------------------------------------------------------------
	// Review + Hero Created contexts
	// ---------------------------------------------------------------------------

	/**
	 * Build context for the review slide.
	 * @returns {Promise<object>}
	 */
	async #prepareReviewContext() {
		await this.ensureIndexes();

		const themeKitLookup = this.buildLookup(this._cache.themekits);
		const themebookLookup = this.buildLookup(this._cache.themebooks);
		const selectedTrope = await this.getTropeDetails(
			this._appState.trope.selectedUuid,
			themeKitLookup,
		);

		const reviewThemes = await this.buildReviewThemes(
			selectedTrope,
			themeKitLookup,
			themebookLookup,
		);

		const reviewBackpackChoices =
			this._appState.mode === "trope"
				? selectedTrope?.backpackChoices || []
				: this._appState.custom.backpackTags.filter(Boolean);
		const reviewBackpackSelection =
			this._appState.mode === "trope"
				? this._appState.trope.backpackChoice || reviewBackpackChoices[0]
				: null;

		return {
			logo: CONFIG.litm.assets.logo,
			actorName: this._appState.actorName,
			mode: this._appState.mode,
			tropeName: selectedTrope?.name || "",
			reviewThemes,
			reviewBackpackChoices,
			reviewBackpackSelection,
		};
	}

	/**
	 * Build context for the hero-created slide.
	 * @returns {object}
	 */
	#prepareHeroCreatedContext() {
		const tours = [];
		for (const [id, tour] of game.tours.entries()) {
			if (!id.startsWith("litm.")) continue;
			tours.push({
				id,
				title: game.i18n.localize(tour.title),
				description: game.i18n.localize(tour.description),
			});
		}

		return {
			logo: CONFIG.litm.assets.logo,
			heroName: this._appState.actorName || t("LITM.Ui.hero_name"),
			tours,
		};
	}

	// ---------------------------------------------------------------------------
	// Review theme builder (ported from HeroCreationApp)
	// ---------------------------------------------------------------------------

	/**
	 * Build an array of review theme objects for display.
	 * @param {object|null} selectedTrope
	 * @param {Map} themeKitLookup
	 * @param {Map} themebookLookup
	 * @returns {Promise<object[]>}
	 */
	async buildReviewThemes(selectedTrope, themeKitLookup, themebookLookup) {
		if (!this._appState.mode) return [];

		if (this._appState.mode === "trope") {
			const fixed = selectedTrope?.fixed || [];
			const optionalUuid = this._appState.trope.optionalUuid;
			const optional = optionalUuid
				? this.resolveKitLabels([optionalUuid], themeKitLookup)
				: [];
			const allKits = [...fixed, ...optional];
			const selections = this._appState.trope.themes.choices;

			const themes = [];
			for (let index = 0; index < allKits.length; index++) {
				const kit = allKits[index];
				const choice = selections[index];
				const themeDoc = await this.getThemeDoc(kit.uuid);
				const level = themeDoc?.system?.level || "origin";
				themes.push({
					level,
					levelLabel: t(`LITM.Terms.${level}`),
					themebook: themeDoc?.system?.themebook || "",
					name: kit.name || kit.displayLabel,
					powerTags: choice?.powerTags || [],
					weaknessTag: choice?.weaknessTag || "",
					method: "themekit",
				});
			}
			return themes;
		}

		const themes = [];
		for (const theme of this._appState.custom.themes) {
			if (theme.method === "themekit") {
				const entry = themeKitLookup.get(theme.themekitUuid);
				const themeDoc = await this.getThemeDoc(theme.themekitUuid);
				const level = themeDoc?.system?.level || "origin";
				themes.push({
					level,
					levelLabel: t(`LITM.Terms.${level}`),
					themebook: themeDoc?.system?.themebook || "",
					name: entry?.name || theme.themekitUuid,
					powerTags: theme.selectedPowerTags || [],
					weaknessTag: theme.selectedWeaknessTag || "",
					method: "themekit",
				});
			} else if (theme.method === "manual") {
				themes.push({
					level: "origin",
					levelLabel: t("LITM.Terms.origin"),
					themebook: "",
					name: theme.name || t("LITM.Ui.theme_title"),
					powerTags: theme.powerTags?.filter(Boolean) || [],
					weaknessTag: theme.weaknessTag || "",
					quest: theme.quest || "",
					method: "manual",
				});
			} else if (theme.method === "themebook") {
				const themebook = themebookLookup.get(theme.themebookUuid);
				const bookLevel = themebook?.themeLevel || "origin";
				const level =
					bookLevel === "variable" ? theme.level || "origin" : bookLevel;
				themes.push({
					level,
					levelLabel: t(`LITM.Terms.${level}`),
					themebook: themebook?.name || "",
					name: theme.name || themebook?.name || theme.themebookUuid,
					powerTags: theme.powerTags?.filter(Boolean) || [],
					weaknessTag: theme.weaknessTag || "",
					quest: theme.quest || "",
					method: "themebook",
				});
			}
		}
		return themes;
	}

	// ---------------------------------------------------------------------------
	// Hero creation
	// ---------------------------------------------------------------------------

	/**
	 * Create the hero actor from the wizard state, show the heroCreated slide,
	 * then auto-start the tour and dismiss the overlay.
	 */
	async #createHero() {
		const name = this._appState.actorName || t("LITM.Ui.hero_name");
		const items = [];

		const trope =
			this._appState.mode === "trope"
				? await this.getTropeDoc(this._appState.trope.selectedUuid)
				: null;

		if (this._appState.mode === "trope") {
			const fixed = trope?.system?.themeKits?.fixed || [];
			const optional = this._appState.trope.optionalUuid
				? [this._appState.trope.optionalUuid]
				: [];
			const themeUuids = [...fixed, ...optional];
			const selections = this._appState.trope.themes.choices;

			for (let index = 0; index < themeUuids.length; index += 1) {
				const uuid = themeUuids[index];
				const themeDoc = await this.getThemeDoc(uuid);
				if (!themeDoc) continue;
				const data = themeDoc.toObject();
				delete data._id;
				delete data._stats;
				const choice = selections[index];
				const hasPowerSelection = choice?.powerTags?.some(Boolean);
				const hasWeaknessSelection = Boolean(choice?.weaknessTag);
				if (choice && (hasPowerSelection || hasWeaknessSelection)) {
					data.system = data.system || {};
					if (hasPowerSelection) {
						const selectedPowerTags = new Set(choice.powerTags.filter(Boolean));
						data.system.powerTags = (data.system.powerTags || []).map(
							(tag) => ({
								...tag,
								id: tag.id || foundry.utils.randomID(),
								isActive: selectedPowerTags.has(tag.name),
								isScratched: false,
							}),
						);
					}
					if (hasWeaknessSelection) {
						data.system.weaknessTags = (data.system.weaknessTags || []).map(
							(tag) => ({
								...tag,
								id: tag.id || foundry.utils.randomID(),
								isActive: tag.name === choice.weaknessTag,
								isScratched: false,
							}),
						);
					}
				}
				items.push(data);
			}
		} else {
			for (const themeState of this._appState.custom.themes) {
				if (!themeState.method) continue;

				if (themeState.method === "themekit") {
					const themeDoc = await this.getThemeDoc(themeState.themekitUuid);
					if (!themeDoc) continue;
					const data = themeDoc.toObject();
					delete data._id;
					delete data._stats;
					// Apply tag selections if the user made any
					const hasPowerSelection = themeState.selectedPowerTags?.some(Boolean);
					const hasWeaknessSelection = Boolean(themeState.selectedWeaknessTag);
					if (hasPowerSelection || hasWeaknessSelection) {
						data.system = data.system || {};
						if (hasPowerSelection) {
							const selectedPower = new Set(
								themeState.selectedPowerTags.filter(Boolean),
							);
							data.system.powerTags = (data.system.powerTags || []).map(
								(tag) => ({
									...tag,
									id: tag.id || foundry.utils.randomID(),
									isActive: selectedPower.has(tag.name),
									isScratched: false,
								}),
							);
						}
						if (hasWeaknessSelection) {
							data.system.weaknessTags = (data.system.weaknessTags || []).map(
								(tag) => ({
									...tag,
									id: tag.id || foundry.utils.randomID(),
									isActive: tag.name === themeState.selectedWeaknessTag,
									isScratched: false,
								}),
							);
						}
					}
					items.push(data);
					continue;
				}

				if (themeState.method === "manual") {
					items.push({
						name: themeState.name || t("LITM.Ui.theme_title"),
						type: "theme",
						system: {
							themebook: "",
							level: "origin",
							isScratched: false,
							powerTags: [
								{
									id: foundry.utils.randomID(),
									name: "",
									type: "powerTag",
									question: "",
									isActive: true,
									isScratched: false,
								},
								{
									id: foundry.utils.randomID(),
									name: "",
									type: "powerTag",
									question: "",
									isActive: false,
									isScratched: false,
								},
							],
							weaknessTags: [
								{
									id: foundry.utils.randomID(),
									name: "",
									type: "weaknessTag",
									question: "",
									isActive: true,
									isScratched: false,
								},
							],
							quest: {
								description: themeState.quest || t("LITM.Ui.name_quest"),
								tracks: {
									abandon: { value: 0 },
									milestone: { value: 0 },
								},
							},
							specialImprovements: [],
							improve: { value: 0 },
						},
					});
					continue;
				}

				// themebook method
				const themebookDoc = await this.getThemebookDoc(
					themeState.themebookUuid,
				);
				const themebookName = themebookDoc?.name || "";
				const bookLevel = themebookDoc?.system?.theme_level || "origin";
				const level =
					bookLevel === "variable" ? themeState.level || "origin" : bookLevel;
				const nameValue =
					themeState.name || themebookName || t("LITM.Ui.theme_title");

				const powerTags = themeState.powerTags.map((tagName, index) => ({
					id: foundry.utils.randomID(),
					name: tagName,
					type: "powerTag",
					question: themeState.powerQuestions[index] || "",
					isActive: true,
					isScratched: false,
				}));
				const weaknessTags = [
					{
						id: foundry.utils.randomID(),
						name: themeState.weaknessTag,
						type: "weaknessTag",
						question: themeState.weaknessQuestion || "",
						isActive: true,
						isScratched: false,
					},
				];

				items.push({
					name: nameValue,
					type: "theme",
					system: {
						themebook: themebookName,
						level,
						isScratched: false,
						powerTags,
						weaknessTags,
						quest: {
							description: themeState.quest || t("LITM.Ui.name_quest"),
							tracks: {
								abandon: { value: 0 },
								milestone: { value: 0 },
							},
						},
						specialImprovements: [],
						improve: { value: 0 },
					},
				});
			}
		}

		// Backpack item
		const backpackTags =
			this._appState.mode === "trope"
				? (trope?.system?.backpackChoices || []).filter(Boolean)
				: this._appState.custom.backpackTags.filter(Boolean);
		const selectedBackpackTag =
			this._appState.trope.backpackChoice || backpackTags[0];

		items.push({
			name: t("TYPES.Item.backpack"),
			type: "backpack",
			system: {
				contents: backpackTags.map((tag) => ({
					id: foundry.utils.randomID(),
					name: tag,
					type: "backpack",
					isActive:
						this._appState.mode === "trope"
							? tag === selectedBackpackTag
							: true,
					isScratched: false,
				})),
			},
		});

		const actorData = {
			name,
			type: "hero",
			system: {},
			items,
		};
		const actor = await Actor.create(actorData, {
			renderSheet: false,
			fromSidebar: false,
			litm: {
				skipHeroWizard: true,
				skipAutoSetup: true,
			},
		});

		if (!actor) return;

		// Auto-assign the hero to the target user
		if (this.#assignToUser) {
			const user = game.users.get(this.#assignToUser);
			if (user && !user.character) {
				await user.update({ character: actor.id });
			}
		}

		// Open the actor's sheet
		actor.sheet.render(true);

		// Store the created actor so tours can reference it
		this._createdActor = actor;

		// Navigate to the heroCreated slide
		if (!this.#slideFlow.includes("heroCreated")) {
			this.#slideFlow.push("heroCreated");
		}
		await this.goToSlide("heroCreated");
	}

	// ---------------------------------------------------------------------------
	// Data methods (ported from HeroCreationApp)
	// ---------------------------------------------------------------------------

	async ensureIndexes() {
		if (this._cache.loaded) return;

		this._cache.tropes = await this.loadPackIndex("Tropes", [
			"name",
			"img",
			"type",
			"system.category",
		]);
		this._cache.themekits = await this.loadPackIndex("Themekits", [
			"name",
			"img",
			"type",
			"system.level",
			"system.powerTags",
			"system.weaknessTags",
		]);
		this._cache.themebooks = await this.loadPackIndex("Themebooks", [
			"name",
			"img",
			"type",
			"system.theme_level",
		]);

		this._cache.loaded = true;
	}

	async loadPackIndex(prefix, fields) {
		const packs = this.getModulePacks(prefix);
		const results = [];
		const type = this.typeForPrefix(prefix);

		for (const pack of packs) {
			await pack.getIndex({ fields });
			for (const entry of pack.index?.contents || []) {
				if (entry.type !== type) continue;
				const id = entry._id ?? entry.id;
				const uuid =
					entry.uuid || (id ? `Compendium.${pack.collection}.${id}` : "");
				if (!uuid) continue;
				const level = entry.system?.theme_level || entry.system?.level || "";
				results.push({
					uuid,
					name: entry.name || "",
					img: entry.img || "",
					category: entry.system?.category || "",
					themeLevel: level,
					themeLevelIcon: this.#levelIcon(level),
					sourceLabel: pack.metadata?.label || pack.collection,
					tagTooltip: this.#buildTagTooltip(entry.system),
				});
			}
		}

		for (const item of game.items) {
			if (item.type !== type) continue;
			const lvl = item.system?.theme_level || item.system?.level || "";
			results.push({
				uuid: item.uuid || item.id,
				name: item.name,
				img: item.img || "",
				category: item.system?.category || "",
				themeLevel: lvl,
				themeLevelIcon: this.#levelIcon(lvl),
				sourceLabel: "World",
				tagTooltip: this.#buildTagTooltip(item.system),
			});
		}

		return results.sort((a, b) => a.name.localeCompare(b.name));
	}

	typeForPrefix(prefix) {
		switch (prefix.toLowerCase()) {
			case "tropes":
				return "trope";
			case "themekits":
				return "theme";
			case "themebooks":
				return "themebook";
			default:
				return "";
		}
	}

	getModulePacks(prefix) {
		const normalized = prefix.toLowerCase();
		const packs = game.packs.filter(
			(pack) =>
				pack.documentName === "Item" &&
				pack.metadata?.packageName === MODULE_ID,
		);

		const matching = packs.filter((pack) =>
			(pack.metadata?.label || "").toLowerCase().startsWith(normalized),
		);
		if (matching.length) return matching;

		return packs.filter((pack) =>
			(pack.metadata?.label || "").toLowerCase().includes(normalized),
		);
	}

	buildLookup(entries) {
		const lookup = new Map();
		for (const entry of entries) {
			lookup.set(entry.uuid, {
				name: entry.name,
				img: entry.img || "",
				sourceLabel: entry.sourceLabel,
				displayLabel: entry.name,
				themeLevel: entry.themeLevel || "",
				themeLevelIcon: entry.themeLevelIcon || "",
				tagTooltip: entry.tagTooltip || "",
			});
		}
		return lookup;
	}

	groupByCategory(entries) {
		const grouped = new Map();
		for (const entry of entries) {
			const category =
				entry.category || t("LITM.Ui.hero_creation_uncategorized");
			if (!grouped.has(category)) grouped.set(category, []);
			grouped.get(category).push(entry);
		}
		return Array.from(grouped.entries()).map(([name, items]) => ({
			name,
			items,
		}));
	}

	filterBySearch(entries, searchTerm) {
		const term = (searchTerm || "").trim().toLowerCase();
		if (!term) return entries;
		return entries.filter((entry) => entry.name.toLowerCase().includes(term));
	}

	async getTropeDetails(uuid, themeKitLookup) {
		if (!uuid) return null;
		const doc = await this.getTropeDoc(uuid);
		if (!doc) return null;

		const fixed = this.resolveKitLabels(
			doc.system?.themeKits?.fixed || [],
			themeKitLookup,
		);
		const optional = this.resolveKitLabels(
			doc.system?.themeKits?.optional || [],
			themeKitLookup,
		);

		return {
			uuid: doc.uuid,
			name: doc.name,
			img: doc.img,
			category: doc.system?.category || "",
			description: doc.system?.description || "",
			fixed,
			optional,
			backpackChoices: doc.system?.backpackChoices || [],
		};
	}

	resolveKitLabels(uuids, lookup) {
		return uuids.map((uuid) => {
			const entry = lookup.get(uuid);
			return {
				uuid,
				name: entry?.name || "",
				img: entry?.img || "",
				sourceLabel: entry?.sourceLabel || "",
				displayLabel: entry?.displayLabel || uuid,
				themeLevel: entry?.themeLevel || "",
				themeLevelIcon: entry?.themeLevelIcon || "",
				tagTooltip: entry?.tagTooltip || "",
			};
		});
	}

	async syncTropeThemes(selectedTrope) {
		const fixed = selectedTrope?.fixed?.map((entry) => entry.uuid) || [];
		const optional = this._appState.trope.optionalUuid
			? [this._appState.trope.optionalUuid]
			: [];
		const kitUuids = [...fixed, ...optional].filter(Boolean);
		const state = this._appState.trope.themes;
		const same =
			kitUuids.length === state.kitUuids.length &&
			kitUuids.every((uuid, index) => uuid === state.kitUuids[index]);
		if (same) {
			// Update tag options for existing choices
			for (const choice of state.choices) {
				if (!choice.kitName) {
					const themeDoc = await this.getThemeDoc(choice.kitUuid);
					const tagOptions = this.getThemeTagOptions(themeDoc);
					const selectedPowerTags = new Set(choice.powerTags || []);
					choice.kitName = themeDoc?.name || "";
					choice.kitLevel = themeDoc?.system?.level || "origin";
					choice.kitThemebook = themeDoc?.system?.themebook || "";
					choice.powerTagOptions = tagOptions.powerTags.map((tag) => ({
						name: tag,
						checked: selectedPowerTags.has(tag),
					}));
					choice.weaknessTagOptions = tagOptions.weaknessTags.map((tag) => ({
						name: tag,
						checked: tag === choice.weaknessTag,
					}));
					choice.powerTagsMap = this.toLookupMap(choice.powerTags || []);
					// Resolve parent themebook questions
					const themebookName = themeDoc?.system?.themebook || "";
					const parentBook = await this.getThemebookByName(themebookName);
					const allPQs = (parentBook?.system?.powerTagQuestions || [])
						.map((q) => `${q ?? ""}`.trim())
						.filter(Boolean);
					choice.powerTagQuestions = allPQs.slice(1);
					choice.weaknessTagQuestions = (
						parentBook?.system?.weaknessTagQuestions || []
					)
						.map((q) => `${q ?? ""}`.trim())
						.filter(Boolean);
				}
			}
			return;
		}
		state.kitUuids = kitUuids;
		state.index = 0;
		state.choices = [];
		for (const uuid of kitUuids) {
			const themeDoc = await this.getThemeDoc(uuid);
			const tagOptions = this.getThemeTagOptions(themeDoc);
			// Resolve parent themebook questions
			const themebookName = themeDoc?.system?.themebook || "";
			const parentBook = await this.getThemebookByName(themebookName);
			const allPQs = (parentBook?.system?.powerTagQuestions || [])
				.map((q) => `${q ?? ""}`.trim())
				.filter(Boolean);
			state.choices.push({
				kitUuid: uuid,
				kitName: themeDoc?.name || "",
				kitLevel: themeDoc?.system?.level || "origin",
				kitThemebook: themeDoc?.system?.themebook || "",
				powerTags: [],
				weaknessTag: "",
				powerTagOptions: tagOptions.powerTags.map((tag) => ({
					name: tag,
					checked: false,
				})),
				weaknessTagOptions: tagOptions.weaknessTags.map((tag) => ({
					name: tag,
					checked: false,
				})),
				powerTagsMap: {},
				powerTagQuestions: allPQs.slice(1),
				weaknessTagQuestions: (parentBook?.system?.weaknessTagQuestions || [])
					.map((q) => `${q ?? ""}`.trim())
					.filter(Boolean),
			});
		}
	}

	getThemeTagOptions(themeDoc) {
		const powerTags = (themeDoc?.system?.powerTags || [])
			.map((tag) => tag?.name || "")
			.filter((name) => name.length > 0);
		const weaknessTags = (themeDoc?.system?.weaknessTags || [])
			.map((tag) => tag?.name || "")
			.filter((name) => name.length > 0);
		return {
			powerTags,
			weaknessTags,
		};
	}

	static #LEVEL_ICONS = new Set([
		"origin",
		"adventure",
		"greatness",
		"variable",
	]);

	#levelIcon(level) {
		return WelcomeOverlay.#LEVEL_ICONS.has(level) ? level : "";
	}

	#buildTagTooltip(system) {
		const power = (system?.powerTags || [])
			.map((t) => t?.name || "")
			.filter(Boolean);
		const weakness = (system?.weaknessTags || [])
			.map((t) => t?.name || "")
			.filter(Boolean);
		if (!power.length && !weakness.length) return "";
		const sections = [];
		if (power.length) {
			sections.push(
				`<div class="tag-tooltip-group"><label>${t(
					"LITM.Tags.power_tags",
				)}</label>${power
					.map(
						(n) => `<span class="litm-powerTag" data-text="${n}">${n}</span>`,
					)
					.join(" ")}</div>`,
			);
		}
		if (weakness.length) {
			sections.push(
				`<div class="tag-tooltip-group"><label>${t(
					"LITM.Tags.weakness_tags",
				)}</label>${weakness
					.map(
						(n) =>
							`<span class="litm-weaknessTag" data-text="${n}">${n}</span>`,
					)
					.join(" ")}</div>`,
			);
		}
		return `<div class="litm tag-tooltip-content">${sections.join("")}</div>`;
	}

	toLookupMap(values) {
		return (values || []).reduce((acc, value) => {
			if (value) acc[value] = true;
			return acc;
		}, {});
	}

	async #getCachedDoc(cacheKey, uuid) {
		if (!uuid) return null;
		const cache = this._cache[cacheKey];
		if (cache.has(uuid)) return cache.get(uuid);
		const doc = await fromUuid(uuid);
		if (doc) cache.set(uuid, doc);
		return doc;
	}

	async getTropeDoc(uuid) {
		return this.#getCachedDoc("tropeDocs", uuid);
	}

	async getThemeDoc(uuid) {
		return this.#getCachedDoc("themeDocs", uuid);
	}

	async getThemebookDoc(uuid) {
		return this.#getCachedDoc("themebookDocs", uuid);
	}

	async getThemebookByName(name) {
		if (!name) return null;
		for (const entry of this._cache.themebooks) {
			if (entry.name === name) {
				return this.getThemebookDoc(entry.uuid);
			}
		}
		return null;
	}

	toQuestionOptions(questions = []) {
		return (questions || [])
			.map((question) => `${question ?? ""}`.trim())
			.filter((question) => question.length > 0)
			.map((question) => ({
				value: question,
				label: question,
			}));
	}

	isCustomReady() {
		const themes = this._appState.custom.themes;
		const configured = themes.filter((theme) => theme.method);
		if (!configured.length) return false;
		return configured.every((theme) => {
			if (theme.method === "themekit") return Boolean(theme.themekitUuid);
			if (theme.method === "manual") return Boolean(theme.name);
			if (theme.method === "themebook") return Boolean(theme.themebookUuid);
			return false;
		});
	}

	async validateAllCustomThemes() {
		const themes = this._appState.custom.themes;
		const configured = themes.filter((theme) => theme.method);

		if (!configured.length) {
			ui.notifications.warn("LITM.Ui.hero_creation_all_themes_required", {
				localize: true,
			});
			return false;
		}

		for (let i = 0; i < THEME_SLOTS; i++) {
			const theme = themes[i];
			if (!theme.method) continue;

			if (theme.method === "themekit" && !theme.themekitUuid) {
				ui.notifications.warn(
					`${game.i18n.localize("TYPES.Item.theme")} ${i + 1}: ${game.i18n.localize(
						"LITM.Ui.hero_creation_select_themekit",
					)}`,
				);
				return false;
			}

			if (theme.method === "manual" && !theme.name) {
				ui.notifications.warn(
					`${game.i18n.localize("TYPES.Item.theme")} ${i + 1}: ${game.i18n.localize(
						"LITM.Ui.hero_creation_manual_name_required",
					)}`,
				);
				return false;
			}

			if (theme.method === "themebook") {
				if (!theme.themebookUuid) {
					ui.notifications.warn(
						`${game.i18n.localize("TYPES.Item.theme")} ${i + 1}: ${game.i18n.localize(
							"LITM.Ui.hero_creation_select_themebook",
						)}`,
					);
					return false;
				}
			}
		}

		return true;
	}

	// ---------------------------------------------------------------------------
	// Animations (Web Animations API)
	// ---------------------------------------------------------------------------

	/**
	 * Helper: animate an element and return a promise that resolves on finish.
	 * @param {Element} el
	 * @param {Keyframe[]} keyframes
	 * @param {KeyframeAnimationOptions} options
	 * @returns {Promise<void>}
	 */
	static #animate(el, keyframes, options) {
		return new Promise((resolve) => {
			const anim = el.animate(keyframes, {
				fill: "forwards",
				...options,
			});
			anim.onfinish = () => resolve();
		});
	}

	/**
	 * Animate the overlay entrance.
	 */
	async #animateEnter() {
		if (!this.#el) return;

		const bg = this.#el.querySelector(".litm--welcome-overlay__bg");
		const logo = this.#el.querySelector(".litm--welcome-overlay__logo");
		const content = this.#el.querySelector(".litm--welcome-overlay__content");

		if (this.#reducedMotion) {
			this.#el.style.opacity = "1";
			return;
		}

		this.#isAnimating = true;

		// Hide children before revealing the container to prevent flash
		if (bg) bg.style.opacity = "0";
		if (logo) logo.style.opacity = "0";
		if (content) {
			for (const child of content.children) child.style.opacity = "0";
		}

		// Now reveal the container — children are hidden so no flash
		this.#el.style.opacity = "1";

		// Run all animations simultaneously
		const animations = [];

		// Background fades in
		if (bg) {
			animations.push(
				WelcomeOverlay.#animate(bg, [{ opacity: 0 }, { opacity: 1 }], {
					duration: 500,
				}),
			);
		}

		// Logo scales in alongside background
		if (logo) {
			animations.push(
				WelcomeOverlay.#animate(
					logo,
					[
						{ opacity: 0, transform: "scale(0.9)" },
						{ opacity: 1, transform: "scale(1)" },
					],
					{ duration: 400, delay: 200, easing: "ease-out" },
				),
			);
		}

		// Content children stagger in alongside background
		if (content?.children.length) {
			for (let i = 0; i < content.children.length; i++) {
				animations.push(
					WelcomeOverlay.#animate(
						content.children[i],
						[
							{
								opacity: 0,
								transform: "translateY(20px)",
							},
							{ opacity: 1, transform: "translateY(0)" },
						],
						{
							duration: 300,
							delay: 300 + i * 150,
							easing: "ease-out",
						},
					),
				);
			}
		}

		await Promise.all(animations);
		this.#isAnimating = false;
	}

	/**
	 * Animate the overlay exit. Returns a promise that resolves when done.
	 * @returns {Promise<void>}
	 */
	async #animateExit() {
		const el = this.#el;
		if (!el) return;

		if (this.#reducedMotion) {
			el.style.opacity = "0";
			return;
		}

		this.#isAnimating = true;

		const slide = el.querySelector(".litm--welcome-overlay__slides");
		const bg = el.querySelector(".litm--welcome-overlay__bg");

		// Slide fades + slides down
		if (slide) {
			await WelcomeOverlay.#animate(
				slide,
				[
					{
						opacity: 1,
						transform: "translateY(0)",
					},
					{ opacity: 0, transform: "translateY(30px)" },
				],
				{
					duration: 400,
					easing: "ease-in",
				},
			);
		}

		// Background dissolves
		if (bg) {
			await WelcomeOverlay.#animate(bg, [{ opacity: 1 }, { opacity: 0 }], {
				duration: 400,
				easing: "ease-in",
			});
		}

		this.#isAnimating = false;
	}

	/**
	 * Transition between slides with directional animation.
	 * @param {"forward"|"backward"} direction
	 */
	async #transitionSlide(direction) {
		if (!this.#el) return;

		const container = this.#el.querySelector(".litm--welcome-overlay__slides");
		if (!container) return;

		const oldSlide = container.firstElementChild;

		this.#isAnimating = true;

		if (this.#reducedMotion) {
			if (oldSlide) oldSlide.style.opacity = "0";
			await this.#renderCurrentSlide();
			const newSlide = container.firstElementChild;
			if (newSlide) {
				await WelcomeOverlay.#animate(
					newSlide,
					[
						{ opacity: 0 },
						{
							opacity: 1,
						},
					],
					{ duration: 200 },
				);
			}
			this.#isAnimating = false;
			return;
		}

		const exitX = direction === "forward" ? -100 : 100;
		const enterX = direction === "forward" ? 100 : -100;
		const easing = "cubic-bezier(0.7, 0, 0.3, 1)";

		// Exit old slide
		if (oldSlide) {
			await WelcomeOverlay.#animate(
				oldSlide,
				[
					{ opacity: 1, transform: "translateX(0)" },
					{ opacity: 0, transform: `translateX(${exitX}px)` },
				],
				{ duration: 400, easing },
			);
		}

		// Render new slide
		await this.#renderCurrentSlide();
		const newSlide = container.firstElementChild;

		// Enter new slide
		if (newSlide) {
			await WelcomeOverlay.#animate(
				newSlide,
				[
					{ opacity: 0, transform: `translateX(${enterX}px)` },
					{ opacity: 1, transform: "translateX(0)" },
				],
				{ duration: 400, easing },
			);
		}

		this.#isAnimating = false;
	}

	// ---------------------------------------------------------------------------
	// Static entry points
	// ---------------------------------------------------------------------------

	/**
	 * Called from the ready hook. Delegates to GM setup or player welcome.
	 */
	static async showOnReady() {
		await registerTours();
		if (game.user.isGM) {
			await WelcomeOverlay.#gmSetupAndShow();
		} else {
			WelcomeOverlay.#playerShowIfNeeded();
		}
	}

	/**
	 * First-time GM world setup: create scene, sample hero, rename narrator, then show overlay.
	 */
	static async #gmSetupAndShow() {
		if (LitmSettings.welcomed) return;
		if (!game.user.isGM) return;

		const sceneName = game.i18n.localize("LITM.Name");
		const existingScene = game.scenes.getName(sceneName);
		if (existingScene) {
			await existingScene.activate();
			await createSampleHero();
			const overlay = new WelcomeOverlay();
			await overlay.show();
			return;
		}

		const levelId = foundry.documents.BaseScene.metadata.defaultLevelId;
		const scene = await Scene.create({
			name: sceneName,
			ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
			navigation: true,
			width: 1920,
			height: 1080,
			initial: { x: 1669, y: 853, scale: 0.7 },
			grid: { type: 0 },
			tokenVision: false,
			fog: { mode: CONST.FOG_EXPLORATION_MODES.DISABLED },
			environment: { globalLight: { enabled: true } },
			levels: [
				{
					_id: levelId,
					name: sceneName,
					background: {
						src: CONFIG.litm.assets.splash,
						color: "#000000",
					},
				},
			],
			initialLevel: levelId,
		});

		const { thumb } = await scene.createThumbnail();
		await scene.update({ thumb });

		await sleep(300);
		await scene.activate();
		await sleep(300);

		await createSampleHero();

		// Set the GM's display name to "Narrator" (thematic default)
		if (game.user.name !== t("LITM.Terms.narrator")) {
			await game.user.update({ name: t("LITM.Terms.narrator") });
		}

		const overlay = new WelcomeOverlay();
		await overlay.show();
	}

	/**
	 * Show the overlay for players without a character.
	 */
	static #playerShowIfNeeded() {
		if (game.user.isGM) return;
		if (game.user.character) return;

		const overlay = new WelcomeOverlay({ assignToUser: game.user.id });
		overlay.show();
	}

	/**
	 * Show the overlay from a chat command or other programmatic trigger.
	 * @param {string} [startSlide="welcome"] - The slide to start on.
	 * @returns {WelcomeOverlay}
	 */
	static showFromCommand(startSlide = "welcome") {
		const overlay = new WelcomeOverlay({ assignToUser: game.user.id });
		overlay.#slideFlow = overlay.#buildSlideFlow(startSlide);
		const index = overlay.#slideFlow.indexOf(startSlide);
		if (index !== -1) overlay.#currentSlideIndex = index;
		overlay.show();
		return overlay;
	}
}
