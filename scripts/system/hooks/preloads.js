export function registerPreloads() {
	const { preloads } = CONFIG.litm.assets;

	for (const asset of preloads) {
		const type = asset.endsWith(".svg") ? "image/svg+xml" : "image/webp";
		const link = Object.assign(document.createElement("link"), {
			rel: "prefetch",
			href: asset,
			type,
		});
		document.head.appendChild(link);
	}
}
