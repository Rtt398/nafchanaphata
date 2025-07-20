import {$} from './util.js'

globalThis.Test = class {
	static addRootNote() {
		$('.konvajs-context').click()
	}
}