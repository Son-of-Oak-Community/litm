const fs = require("fs");
const path = require("path");

// Load en.json and flatten keys
const en = JSON.parse(fs.readFileSync("lang/en.json", "utf8"));
const flatten = (obj, prefix = "") => {
	return Object.entries(obj).flatMap(([k, v]) => {
		const key = prefix ? `${prefix}.${k}` : k;
		return v && typeof v === "object" && !Array.isArray(v)
			? flatten(v, key)
			: [key];
	});
};
const enKeys = new Set(flatten(en));

// Scan all JS and HTML files
const files = [];
const walk = (dir) => {
	fs.readdirSync(dir, { withFileTypes: true }).forEach((ent) => {
		if (ent.name.startsWith(".")) return;
		const full = path.join(dir, ent.name);
		if (ent.isDirectory()) {
			if (["packs", "foundry", "node_modules"].includes(ent.name)) return;
			walk(full);
		} else if ([".js", ".html"].includes(path.extname(ent.name))) {
			files.push(full);
		}
	});
};
walk(".");

// Extract localization keys from files with locations
const keyUsage = new Map(); // key -> [{file, line}]
const hardcodedPlaceholders = []; // {file, line, value}
files.forEach((file) => {
	const txt = fs.readFileSync(file, "utf8");
	const lines = txt.split("\n");

	lines.forEach((line, idx) => {
		// Match various localization patterns
		const patterns = [
			// JS: localize("KEY") or game.i18n.localize("KEY")
			/localize\s*\(\s*["']([^"']+)["']/g,
			/i18n\.localize\s*\(\s*["']([^"']+)["']/g,
			// Handlebars: {{localize "KEY"}}
			/\{\{localize\s+["']([^"']+)["']/g,
			// Template literals and concatenation: `LITM.${...}` or "LITM." + ...
			/["'`](LITM\.[A-Za-z_]+\.[A-Za-z_]+)["'`]/g,
		];

		patterns.forEach((pattern) => {
			const matches = [...line.matchAll(pattern)];
			matches.forEach((m) => {
				const key = m[1];
				if (!keyUsage.has(key)) keyUsage.set(key, []);
				keyUsage
					.get(key)
					.push({ file: file.replace(process.cwd() + "/", ""), line: idx + 1 });
			});
		});

		// Flag hardcoded placeholder attributes in templates
		const placeholderPatterns = [
			/placeholder\s*=\s*"([^"]*)"/g,
			/placeholder\s*=\s*'([^']*)'/g,
		];
		placeholderPatterns.forEach((pattern) => {
			const placeholderMatches = [...line.matchAll(pattern)];
			placeholderMatches.forEach((m) => {
				const value = m[1].trim();
				if (value.includes("{{")) return;
				hardcodedPlaceholders.push({
					file: file.replace(process.cwd() + "/", ""),
					line: idx + 1,
					value,
				});
			});
		});

		// Also track dynamic key prefixes for heuristics
		// e.g., {{localize (concat "LITM.Challenges." ...)}} or t(`LITM.Effects.${...}`)
		const dynamicPatterns = [
			/\{\{localize\s+\(concat\s+["']([^"']+)/g, // {{localize (concat "PREFIX." ...)}}
			/localize\s*\(\s*`([^`$]+)\$\{/g, // localize(`PREFIX.${...}`)
			/i18n\.localize\s*\(\s*`([^`$]+)\$\{/g, // i18n.localize(`PREFIX.${...}`)
		];

		dynamicPatterns.forEach((pattern) => {
			const matches = [...line.matchAll(pattern)];
			matches.forEach((m) => {
				const prefix = m[1];
				if (!keyUsage.has(prefix)) keyUsage.set(prefix, []);
				keyUsage.get(prefix).push({
					file: file.replace(process.cwd() + "/", ""),
					line: idx + 1,
					dynamic: true,
				});
			});
		});
	});
});

// Find missing keys
const allReferencedKeys = [...keyUsage.keys()]
	.filter((k) => k !== "KEY") // Ignore placeholder
	.filter((k) => k !== "PREFIX.") // Ignore regex pattern example
	.filter((k) => !k.endsWith("_")) // Ignore incomplete dynamic keys
	.filter((k) => !(k.endsWith(".") && k.startsWith("LITM."))); // Ignore dynamic prefixes

const missing = allReferencedKeys.filter((k) => !enKeys.has(k)).sort();

// Find superfluous keys (in en.json but not used)
const usedKeys = new Set(allReferencedKeys);

// Collect dynamic prefixes from all detected keys (including the filtered-out ones)
const allDetectedKeys = [...keyUsage.keys()];
const dynamicPrefixes = allDetectedKeys
	.filter((k) => k.endsWith(".") && k.startsWith("LITM."))
	.concat(
		allDetectedKeys
			.filter((k) => keyUsage.get(k)?.some((u) => u.dynamic))
			.map((k) => (k.endsWith(".") ? k : k + ".")),
	);

// Add keys that are used dynamically based on patterns
enKeys.forEach((key) => {
	// TYPES.* are used by Foundry core
	if (key.startsWith("TYPES.")) {
		usedKeys.add(key);
		return;
	}

	// Check if this key matches any dynamic prefix
	for (const prefix of dynamicPrefixes) {
		if (key.startsWith(prefix)) {
			usedKeys.add(key);
			return;
		}
	}

	// Legacy heuristics for common patterns
	if (
		key.startsWith("LITM.Themes.") &&
		allReferencedKeys.some((k) => k.startsWith("LITM.Themes."))
	) {
		usedKeys.add(key);
	} else if (
		key.startsWith("LITM.Challenges.") &&
		allReferencedKeys.some((k) => k.startsWith("LITM.Challenges."))
	) {
		usedKeys.add(key);
	} else if (
		key.startsWith("LITM.Effects.") &&
		allReferencedKeys.some((k) => k.startsWith("LITM.Effects."))
	) {
		usedKeys.add(key);
	}
});

const superfluous = [...enKeys].filter((k) => !usedKeys.has(k)).sort();

console.log(`\n=== Localization Key Validation ===`);
console.log(`Total keys in en.json: ${enKeys.size}`);
console.log(`Total keys referenced: ${allReferencedKeys.length}`);
console.log(`Missing keys: ${missing.length}`);
console.log(`Superfluous keys: ${superfluous.length}\n`);

if (hardcodedPlaceholders.length > 0) {
	console.log("⚠️  Hardcoded placeholder strings found:\n");
	hardcodedPlaceholders.forEach((entry) => {
		console.log(`  ${entry.file}:${entry.line} -> ${entry.value}`);
	});
	console.log("");
}

if (missing.length > 0) {
	console.log("❌ Keys referenced in code but not found in en.json:\n");
	missing.forEach((k) => {
		console.log(`  ${k}`);
		const locations = keyUsage.get(k) || [];
		locations.forEach((loc) => console.log(`    ${loc.file}:${loc.line}`));
	});
	console.log("");
}

if (superfluous.length > 0) {
	console.log("⚠️  Keys in en.json but not used anywhere:\n");
	superfluous.forEach((k) => console.log(`  - ${k}`));
	console.log("");
}

if (
	missing.length === 0 &&
	superfluous.length === 0 &&
	hardcodedPlaceholders.length === 0
) {
	console.log("✓ All localization keys are valid and used");
} else if (missing.length === 0) {
	console.log("✓ All referenced keys are present in en.json");
}

if (
	missing.length > 0 ||
	hardcodedPlaceholders.length > 0 ||
	superfluous.length > 0
) {
	process.exitCode = 1;
}
