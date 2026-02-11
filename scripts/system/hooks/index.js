import { info } from "../../logger.js";
import { registerActorHooks } from "./actor-hooks.js";
import { registerChatHooks } from "./chat-hooks.js";
import { registerCompatHooks } from "./compat-hooks.js";
import { registerFellowshipHooks } from "./fellowship-hooks.js";
import { registerItemHooks } from "./item-hooks.js";
import { registerPreloads } from "./preloads.js";
import { registerReadyHooks } from "./ready-hooks.js";
import { registerUiHooks } from "./ui-hooks.js";

export class LitmHooks {
	static register() {
		info("Registering Hooks...");
		registerCompatHooks();
		registerPreloads();
		registerUiHooks();
		registerItemHooks();
		registerChatHooks();
		registerActorHooks();
		registerFellowshipHooks();
		registerReadyHooks();
	}
}
