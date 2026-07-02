import {$} from './util.js'
import history from "./history.js"

export function bindKeys() {
	document.addEventListener('keydown', event => {
		if ($('#overlay').style.visibility == 'visible') return
		if (event.ctrlKey && event.key === 'z') {
			history.restore()
			event.preventDefault()
		}
	})
}
