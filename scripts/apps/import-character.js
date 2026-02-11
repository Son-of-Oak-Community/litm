import { localize as t } from "../utils.js";

function createTag(data, type) {
	const normalized = data
		? { ...data }
		: { name: "", isScratched: false, isActive: false };
	if (
		normalized.isScratched === undefined &&
		normalized.isBurnt !== undefined
	) {
		normalized.isScratched = normalized.isBurnt;
	}
	return {
		...normalized,
		type,
		id: foundry.utils.randomID(),
	};
}

function createStatus(data) {
	if (typeof data === "string") {
		return {
			name: data,
			type: "ActiveEffect",
			flags: {
				litm: {
					type: "tag",
					values: Array(6).fill(null),
					value: "",
					isScratched: false,
				},
			},
		};
	}

	const values =
		data.level?.map((level, i) => (level ? (i + 1).toString() : null)) ||
		Array(6).fill(null);
	const value = values.findLast((level) => level) || "";
	const type = value ? "status" : "tag";

	return {
		name: data.name || t("LITM.Terms.unnamed"),
		type: "ActiveEffect",
		flags: {
			litm: {
				type,
				values,
				value,
				isScratched: false,
			},
		},
	};
}

export async function importCharacter(data) {
	if (data.compatibility && !["litm", "empty"].includes(data.compatibility)) {
		return ui.notifications.warn("LITM.Ui.warn_incompatible_data", {
			localize: true,
		});
	}

	const themeData = Object.entries(data)
		.filter(
			([key, theme]) =>
				key.startsWith("theme") &&
				typeof theme === "object" &&
				!Array.isArray(theme) &&
				!theme.isEmpty,
		)
		.map(([_, theme]) => ({
			name:
				theme.content.mainTag.name ||
				t("LITM.Terms.unnamed", "TYPES.Item.theme"),
			type: "theme",
			system: {
				themebook: theme.content.themebook,
				level: theme.content.level?.toLowerCase(),
				isScratched:
					theme.content.mainTag.isScratched ??
					theme.content.mainTag.isBurnt ??
					false,
				powerTags: Array(5)
					.fill()
					.map((_, i) => createTag(theme.content.powerTags[i], "powerTag")),
				weaknessTags: [
					createTag(
						{
							name: theme.content.weaknessTags[0] || "",
							isScratched: false,
							isActive: true,
						},
						"weaknessTag",
					),
				],
				quest: {
					description:
						theme.content.bio.title?.replace(
							/['\u201c\u201d\u201f"""]/gm,
							"",
						) || "",
				},
				note: theme.content.bio.body,
			},
		}));

	const backpack = {
		name: t("TYPES.Item.backpack"),
		type: "backpack",
		system: {
			contents: data.backpack.map((item) => createTag(item, "backpack")),
		},
	};

	const statuses = data.statuses.map((status) => createStatus(status));

	const tags = Object.values(data.miscCard?.content || {})
		.flat()
		.map((tag) => createStatus(tag));

	const actorData = {
		name: data.name,
		type: "hero",
		system: {
			note: "",
		},
		effects: [...tags, ...statuses],
		items: [...themeData, backpack],
	};
	const created = await Actor.create(actorData);
	if (created) {
		const formatted = game.i18n.format("LITM.Ui.info_imported_character", {
			name: created.name,
		});
		ui.notifications.info(formatted);
		created.sheet.render(true);
	}
}
