import history from "./history.js";

export function bindKeys() {
	document.addEventListener('keydown', (event) => {
		if (event.ctrlKey && event.key === 'z') {
			history.restore()
		}
	})
}
