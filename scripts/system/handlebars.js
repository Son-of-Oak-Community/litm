import { info } from "../logger.js";

export class HandlebarsHelpers {
	static register() {
		info("Registering Handlebars Helpers...");

		Handlebars.registerHelper("add", (...args) => {
			args.pop();
			return args.reduce((acc, val) => acc + val, 0);
		});

		Handlebars.registerHelper(
			"progress-buttons",
			function (current, max, block) {
				let acc = "";
				const data = Handlebars.createFrame(block.data);
				for (let i = 0; i < max; ++i) {
					data.index = i;
					data.checked = i < current;
					acc += block.fn(this, { data });
				}
				return acc;
			},
		);

		Handlebars.registerHelper("toJSON", (obj) => JSON.stringify(obj ?? {}));
	}
}

export class HandlebarsPartials {
	static partials = [
		"systems/litm/templates/apps/loot-dialog.html",
		"systems/litm/templates/chat/message.html",
		"systems/litm/templates/chat/message-tooltip.html",
		"systems/litm/templates/chat/moderation.html",
		"systems/litm/templates/partials/play-tag.html",
		"systems/litm/templates/partials/play-theme-tags.html",
		"systems/litm/templates/partials/play-theme-tracks.html",
		"systems/litm/templates/partials/edit-theme-tags.html",
		"systems/litm/templates/partials/edit-theme-tags-activatable.html",
		"systems/litm/templates/partials/edit-theme-tracks.html",
		"systems/litm/templates/partials/theme-special-improvements.html",
	];

	static register() {
		info("Registering Handlebars Partials...");
		foundry.applications.handlebars.loadTemplates(HandlebarsPartials.partials);
	}
}
