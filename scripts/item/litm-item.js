/**
 * Custom Item document class for Legend in the Mist.
 * Handles data migrations that require access to top-level document fields.
 */
export class LitmItem extends Item {
	/** @inheritDoc */
	static migrateData(source) {
		if (source.type === "vignette" && source.system?.category) {
			source.name = source.system.category;
			delete source.system.category;
		}
		return super.migrateData(source);
	}
}
