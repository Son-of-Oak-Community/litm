import { info } from "../logger.js";

const SAMPLE_HERO_JSON = "systems/litm/assets/sample-hero.json";

/**
 * Create a pre-built sample hero actor for tours and onboarding.
 * Imports from the bundled JSON export so the hero arrives fully
 * populated with themes, tags, and a backpack.
 * @returns {Promise<Actor|null>} The created actor, or null if one already exists
 */
export async function createSampleHero() {
	// Don't create if one already exists
	const existing = game.actors.find(
		(a) => a.type === "hero" && a.getFlag("litm", "isSampleHero"),
	);
	if (existing) return existing;

	info("Creating sample hero...");

	const response = await foundry.utils.fetchJsonWithTimeout(SAMPLE_HERO_JSON);
	// Ensure the sample hero is only visible to the GM
	response.ownership = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE };
	const actor = await Actor.create(response, {
		litm: { skipHeroWizard: true, skipAutoSetup: true },
	});

	if (!actor) return null;

	info("Sample hero created:", actor.name);
	return actor;
}
