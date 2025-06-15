
class Serializer {
	static async serialize() {
		const s = {
			b: $('#config-beat').value,
			t: $('#config-tonic').value,
			s: x2t(grid.loopStart.x()),
			e: x2t(grid.loopEnd.x())
		}
		const n = rootlayer.children.map(x => this.root2json(x))
		const JSONCrush = (await import("https://unpkg.com/jsoncrush")).default
		const c = JSONCrush.crush(JSON.stringify(
			{s: s, n: n}, 
			(k, v) => (v.length == 0 || !v) ? undefined : v
		))
		return encodeURIComponent(c)
	}

	static root2json(note) {
		return {
			x: Math.round(note.x() * 4),
			l: Math.round(note.len * 4),
			h: Math.round(note.hz * 16),
			m: note.mute,
			s: note.childNotes.children.map(x => this.sub2json(x))
		}
	}
	static sub2json(note) {
		return {
			i: note.interval.id,
			d: Math.round(note.delay * 4),
			l: Math.round(note.len * 4),
			h: Math.round(note._hz * 16),
			m: note.mute,
			s: note.childNotes.children.map(x => this.sub2json(x))
		}
	}

	static async deserialize(d) {
		const JSONCrush = (await import("https://unpkg.com/jsoncrush")).default
		const u = JSON.parse(JSONCrush.uncrush(decodeURIComponent(d)))
		
		grid.beat = u.s.b
		grid.tonic = u.s.t
		grid.loopStart.x(t2x(u.s.s || 0))
		grid.loopEnd.x(t2x(u.s.e) || 0)
		grid.setLoop()
		
		for (const n of u.n) {
			this.json2root(n)
		}
	}

	static json2root(n) {
		const p = new RootNote(n.x / 4 || 0, hz2y(n.h / 16), n.l / 4)
		p.mute = n.m || false
		rootlayer.add(p)
		for (const m of n.s || []) {
			this.json2sub(p, m)
		}
	}

	static json2sub(p, m) {
		const q = p.addNote(m.l / 4, pitchIntervals[m.i + "d"], m.d / 4 || 0)
		q.mute = m.m || false
		q.hz = m.h / 16
		for (const l of m.s || []) {
			this.json2sub(q, l)
		}
	}
}
