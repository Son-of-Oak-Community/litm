/**
 * @typedef {Object} Status - Status color
 * @property {string} SUCCESS - Success color
 * @property {string} INFO - Info color
 * @property {string} ERROR - Error color
 */
const Status = {
	SUCCESS: "hsl(135 40% 45%)",
	INFO: "hsl(210 30% 50%)",
	WARN: "hsl(30 75% 50%)",
	ERROR: "hsl(5 60% 45%)",
};

/**
 * @param {Status} status
 * @returns {function}
 */
function log(status) {
	/**
	 * @param  {...string} args
	 * @returns {void}
	 */
	return (...args) => {
		return console.log(
			`%cLegend in the Mist | %c${args.join("\n")}`,
			`font-weight: bold; color: ${status};`,
			"",
		);
	};
}

/**
 * @param  {...string} args
 * @returns {void}
 * @example
 * error("This is an error message");
 */
export function error(...args) {
	return log(Status.ERROR)(...args);
}

/**
 * @param  {...string} args
 * @returns {void}
 * @example
 * success("This is an error message");
 */
export function success(...args) {
	return log(Status.SUCCESS)(...args);
}

/**
 * @param  {...string} args
 * @returns {void}
 * @example
 * info("This is an info message");
 */
export function info(...args) {
	return log(Status.INFO)(...args);
}

/**
 * @param  {...string} args
 * @returns {void}
 * @example
 * warn("This is a warning message");
 */
export function warn(...args) {
	return log(Status.WARN)(...args);
}
