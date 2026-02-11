const sheetCache = new WeakMap();

export function AdoptedStyleSheetMixin(Base) {
	return class extends Base {
		static css = "";

		constructor() {
			super();
			const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });

			if (!sheetCache.has(root.ownerDocument)) {
				sheetCache.set(root.ownerDocument, new Map());
			}
			const cache = sheetCache.get(root.ownerDocument);

			if (!cache.has(this.constructor)) {
				const sheet = new CSSStyleSheet();
				sheet.replaceSync(this.constructor.css);
				cache.set(this.constructor, sheet);
			}

			root.adoptedStyleSheets = [cache.get(this.constructor)];
		}
	};
}
