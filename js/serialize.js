
import {$, t2x, x2t, hz2y, pitchIntervals} from './util.js'
import {RootNote, SubNote} from './note.js'
import JSONCrush from 'https://unpkg.com/jsoncrush'
import {stage, grid, rootlayer} from './sequencer.js'

export class Serializer {
	static serialize(savegrid) {
		const s = savegrid ? {
			b: grid.beat,
			t: grid.tonic,
			s: x2t(grid.loopStart.x()),
			e: x2t(grid.loopEnd.x()),
			i: $('#config-tone').value
		} : false
		const n = rootlayer.children.map(x => this.root2json(x))
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
			v: note.volume - 50,
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
			v: note.volume - 50,
			s: note.childNotes.children.map(x => this.sub2json(x))
		}
	}

	static deserialize(d) {
		const u = JSON.parse(JSONCrush.uncrush(decodeURIComponent(d)))
		
		if (u.s) {
			grid.beat = u.s.b
			grid.tonic = u.s.t
			grid.loopStart.x(t2x(u.s.s || 0))
			grid.loopEnd.x(t2x(u.s.e) || 0)
			grid.setLoop()
			$(`#config-tone>option[value='${u.s.i || "salamander-piano"}']`).selected = true
			$('#config-tone').dispatchEvent(new Event('change'))
		}
		
		for (const n of u.n) {
			const p = new RootNote(stage, n.x / 4 || 0, hz2y(n.h / 16), n.l / 4)
			p.mute = n.m || false
			p.volume = 50 + (n.v || 0)
			rootlayer.add(p)
			for (const m of n.s || []) {
				this.json2sub(p, m)
			}
		}
	}

	static json2sub(p, m) {
		const q = p.addNote(m.l / 4, pitchIntervals[m.i + "d"], m.d / 4 || 0)
		q.mute = m.m || false
		q.volume = 50 + (m.v || 0)
		q.hz = m.h / 16
		for (const l of m.s || []) {
			this.json2sub(q, l)
		}
	}
}
