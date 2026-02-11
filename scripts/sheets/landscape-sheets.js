import { ChallengeSheet } from "../actor/challenge/challenge-sheet.js";
import { FellowshipSheet } from "../actor/fellowship/fellowship-sheet.js";
import { HeroSheet } from "../actor/hero/hero-sheet.js";
import { JourneySheet } from "../actor/journey/journey-sheet.js";
import { LitmActorSheet } from "./base-actor-sheet.js";

const LANDSCAPE_OPTIONS = {
	classes: ["litm-landscape"],
	position: {
		width: LitmActorSheet.LANDSCAPE_WIDTH,
	},
};

export class HeroSheetLandscape extends HeroSheet {
	static DEFAULT_OPTIONS = LANDSCAPE_OPTIONS;
}

export class ChallengeSheetLandscape extends ChallengeSheet {
	static DEFAULT_OPTIONS = LANDSCAPE_OPTIONS;
}

export class JourneySheetLandscape extends JourneySheet {
	static DEFAULT_OPTIONS = LANDSCAPE_OPTIONS;
}

export class FellowshipSheetLandscape extends FellowshipSheet {
	static DEFAULT_OPTIONS = LANDSCAPE_OPTIONS;
}
