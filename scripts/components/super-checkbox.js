import { AdoptedStyleSheetMixin } from "./adopted-stylesheet-mixin.js";

export class SuperCheckbox extends AdoptedStyleSheetMixin(HTMLElement) {
	static formAssociated = true;
	static observedAttributes = ["value", "disabled"];

	static css = `
		#multistate-checkbox {
			-webkit-appearance: none;
			flex: none;
			appearance: none;
			background-color: transparent;
			margin: 0;
			font: inherit;
			color: currentColor;
			height: 0.7em;
			width: 0.7em;
			border: 0.1em solid currentColor;
			border-radius: 0.25em;
			transform: translateY(0.025em);
			display: grid;
			place-items: center;
			grid-template-areas: "content";
			rotate: 45deg;

			&:is([role="checkbox"]) {
				cursor: pointer;
			}

			&:disabled {
				cursor: auto;
			}

			&::after {
				grid-area: content;
				content: "";
				width: 0.36em;
				height: 0.36em;
				scale: 0;
				transition: scale 120ms ease-in-out, rotate 120ms ease-in-out;
				box-shadow: inset 1em 1em var(--litm-color-accent);
			}

			&::before {
				grid-area: content;
				content: "";
				width: 0.36em;
				height: 0.36em;
				scale: 0;
				transition: scale 120ms ease-in-out;
				box-shadow: inset 1em 1em var(--litm-color-accent);
			}

			&[aria-checked="true"] {
				background-color: currentColor;

				&::after {
					scale: 1;
				}
			}

			&[data-state="negative"] {
				background-color: transparent;
				&::after {
					width: 0.62em;
					height: 0;
					border-radius: 0;
					border-top: 0.12em solid currentColor;
					background-color: transparent;
					box-shadow: none;
					rotate: -45deg;
					scale: 1;
				}
			}

			&[data-state="positive"] {
				background-color: transparent;
				&::before {
					content: "";
					width: 0.65em;
					height: 0;
					border-radius: 0;
					border-top: 0.12em solid currentColor;
					background-color: transparent;
					box-shadow: none;
					rotate: -45deg;
					scale: 1;
				}
				&::after {
					content: "";
					width: 0.65em;
					height: 0;
					border-radius: 0;
					border-top: 0.12em solid currentColor;
					background-color: transparent;
					box-shadow: none;
					rotate: 45deg;
					scale: 1;
				}
			}

			&[data-state="scratched"] {
				background-color: transparent;
				&::after {
					position: relative;
					top: -0.035em;
					left: -0.045em;
					background: url(systems/litm/assets/media/icons/scratch.svg);
					box-shadow: none;
					background-size: cover;
					background-position: center;
					font-size: 2.6em;
					rotate: -45deg;
					filter: var(--litm-scratch-filter, none);
				}
			}
		}
	`;

	static Register() {
		customElements.define("litm-super-checkbox", SuperCheckbox);
	}

	#checkbox;
	#states = ["", "positive", "negative", "scratched"];
	#state = 0;
	#value = this.#states[this.#state];
	#internals = this.attachInternals();

	constructor() {
		super();
		this.shadowRoot.innerHTML = `<div id="multistate-checkbox" role="checkbox" aria-checked="false" tabindex="0"></div>`;
		this.#checkbox = this.shadowRoot.querySelector("#multistate-checkbox");
		this.addEventListener("click", this._onClick.bind(this));
		this.#checkbox.addEventListener("keydown", (event) => {
			if (event.key === "Enter" || event.key === " ") {
				this._onClick();
			}
		});
	}

	get disabled() {
		return this.hasAttribute("disabled");
	}

	get checked() {
		return this.#state > 0;
	}

	get value() {
		return this.#value;
	}

	set value(value) {
		this.#value = value;
		this.#internals.setFormValue(value);
		this.setAttribute("value", this.value);
	}

	get form() {
		return this.#internals.form;
	}

	get name() {
		return this.getAttribute("name");
	}

	get type() {
		return "checkbox";
	}

	connectedCallback() {
		this.#states = this.getAttribute("states")?.split(",") || this.#states;
		this.#state = this.#states.indexOf(this.getAttribute("value"));
		this.#updateState();
		this.#syncDisabledState();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) return;
		if (name === "value") {
			this.#state = this.#states.indexOf(newValue);
			this.#updateState();
		}
		if (name === "disabled") {
			this.#syncDisabledState();
		}
	}

	_onClick() {
		if (this.disabled) return;
		this.#state = (this.#state + 1) % this.#states.length;
		this.#updateState();
		this.dispatchEvent(new Event("change"));
	}

	#syncDisabledState() {
		this.#checkbox.toggleAttribute("disabled", this.disabled);
		this.#checkbox.tabIndex = this.disabled ? -1 : 0;
		this.#checkbox.setAttribute(
			"aria-disabled",
			this.disabled ? "true" : "false",
		);
	}

	#updateState() {
		this.value = this.#states[this.#state];
		this.#checkbox.setAttribute("aria-checked", this.#state > 0);
		this.#checkbox.ariaLabel = this.#states[this.#state];
		this.#checkbox.dataset.state = this.#states[this.#state];
	}
}
