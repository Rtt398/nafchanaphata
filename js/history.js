
import {Serializer} from './serialize.js'
import {rootlayer} from './sequencer.js'

class History {
	constructor() {
		this.history = []
	}
	snapshot() {
		const d = Serializer.serialize(false)
		if (this.history.at(-1) == d) return
		this.history.push(d)
//		console.log('snapshot:', d)
		if (this.history.length > 100) this.history.shift()
	}
	restore() {
		if (this.history.length == 0) return
//		console.log(rootlayer.children)
		rootlayer.destroyChildren()
		Tone.Transport.cancel()
		Serializer.deserialize(this.history.pop())
		rootlayer.draw()
	}
}

export default new History()