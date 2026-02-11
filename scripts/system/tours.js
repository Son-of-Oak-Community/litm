import { info } from "../logger.js";
import { createSampleHero } from "./sample-hero.js";

const { Tour } = foundry.nue;

/**
 * Wait for a DOM element matching `selector` to appear, polling every 100ms.
 * Rejects on timeout so the tour can handle a missing element gracefully.
 * @param {string} selector
 * @param {number} [timeout=3000]
 * @returns {Promise<Element>}
 */
function waitForElement(selector, timeout = 3000) {
	return new Promise((resolve, reject) => {
		const el = document.querySelector(selector);
		if (el) return resolve(el);

		const start = Date.now();
		const interval = setInterval(() => {
			const found = document.querySelector(selector);
			if (found) {
				clearInterval(interval);
				resolve(found);
			} else if (Date.now() - start > timeout) {
				clearInterval(interval);
				reject(new Error(`Tour element not found: "${selector}" (timed out)`));
			}
		}, 100);
	});
}

/**
 * Custom Tour subclass for Legend in the Mist.
 * Handles custom step actions like opening the sample hero sheet
 * or activating sidebar tabs before a step is shown.
 */
export class LitmTour extends Tour {
	/**
	 * Optional actor to use as the tour target instead of searching
	 * for the sample hero by flag. Set externally before starting the tour.
	 * @type {Actor|null}
	 */
	targetActor = null;

	/** @override */
	async _postStep() {
		await super._postStep();

		if (!this.hasNext) {
			const hero =
				this.targetActor ??
				game.actors.find(
					(a) => a.type === "hero" && a.getFlag("litm", "isSampleHero"),
				);
			if (hero?.sheet?.rendered) await hero.sheet.close();

			const fellowship = game.litm?.fellowship;
			if (fellowship?.sheet?.rendered) await fellowship.sheet.close();
		}
	}

	/** @override */
	async _preStep() {
		await super._preStep();
		const action = this.currentStep?.action;
		if (!action) return;

		if (action === "openSampleHero") await this.#openSampleHero();
		else if (action === "switchToPlayMode") await this.#switchToPlayMode();
		else if (action === "openFellowshipSheet") {
			await this.#openFellowshipSheet();
		} else if (action === "ensureSampleTags") {
			await this.#ensureSampleTags();
		} else if (action.startsWith("activateSidebar:")) {
			const tab = action.split(":")[1];
			await ui[tab]?.activate();
		}

		// If this step has a selector, wait for it to appear in the DOM
		const selector = this.currentStep?.selector;
		if (selector) {
			try {
				await waitForElement(selector);
			} catch (err) {
				console.warn(`litm | ${err.message} — skipping step`);
				if (this.hasNext) return this.next();
			}
		}
	}

	/**
	 * Get the hero actor for this tour.
	 * @returns {Actor|null}
	 */
	async #getOrCreateHero() {
		// Validate targetActor still exists in the collection
		if (this.targetActor && !game.actors.has(this.targetActor.id)) {
			this.targetActor = null;
		}
		if (this.targetActor) return this.targetActor;

		const existing = game.actors.find(
			(a) => a.type === "hero" && a.getFlag("litm", "isSampleHero"),
		);
		if (existing) return existing;

		// Fall back to creating the sample hero
		const hero = await createSampleHero();
		if (hero) this.targetActor = hero;
		return hero ?? null;
	}

	/**
	 * Find the target hero actor and open its sheet.
	 */
	async #openSampleHero() {
		const hero = await this.#getOrCreateHero();
		if (!hero) return;

		if (!hero.sheet.rendered) {
			await hero.sheet.render(true);
		}
	}

	/**
	 * Open the singleton fellowship sheet.
	 */
	async #openFellowshipSheet() {
		const fellowship = game.litm?.fellowship;
		if (!fellowship) return;
		await fellowship.sheet.render(true);
	}

	/**
	 * If the target hero sheet is in edit mode, switch it to play mode.
	 */
	async #switchToPlayMode() {
		await this.#openSampleHero();

		const hero = await this.#getOrCreateHero();
		if (!hero?.sheet?.rendered) return;

		const sheet = hero.sheet;
		if (sheet._isEditMode) {
			sheet._mode = 0; // MODES.PLAY
			await sheet.render(true);
		}
	}

	/**
	 * Ensure the story tag sidebar has at least one tag and one status
	 * so tour selectors have something to point at.
	 */
	async #ensureSampleTags() {
		const sidebar = ui.combat;
		if (!sidebar || typeof sidebar.addTag !== "function") return;

		await sidebar.activate();
		const tags = sidebar.tags ?? [];
		const hasTag = tags.some((t) => t.type === "tag");
		const hasStatus = tags.some((t) => t.type === "status");

		if (!hasTag) await sidebar.addTag("story", "tag");
		if (!hasStatus) await sidebar.addTag("story", "status");
	}
}

/**
 * Register all Legend in the Mist tours.
 */
let _toursPromise = null;
export function registerTours() {
	if (!_toursPromise) _toursPromise = _doRegisterTours();
	return _toursPromise;
}
async function _doRegisterTours() {
	info("Registering Tours...");
	const tours = [
		["heroSheetBasics", "tours/hero-sheet-basics.json"],
		["fellowship", "tours/fellowship.json"],
		["storyTagSidebar", "tours/story-tag-sidebar.json"],
	];

	for (const [id, path] of tours) {
		try {
			const tour = await LitmTour.fromJSON(`systems/litm/${path}`);
			game.tours.register("litm", id, tour);
		} catch (err) {
			console.error(`litm | Failed to register tour "${id}"`, err);
		}
	}
}
