
import { hz2y, y2hz, x2t, f2d, qb, qs, qh, qt, tav, pitchIntervals, $, $$, OFFSET } from './util.js';
import { playNotes, sampler } from './sound.js';
import history from './history.js'

export class Note extends Konva.Group {
	constructor(stage, opt, len, delay = null, interval = null) {
		super(opt)
		this.stage = stage
		this.pitchline = new Konva.Line({
			x: delay,
			y: 0,
			points: [0, 0, len, 0],
			strokeWidth: 3,
			hitStrokeWidth: 20,
			stroke: 'white'
		})
		this.delay = delay
		this._len = len
		this._interval = interval
		this.volume = 50
		this.isMuted = false
		
		this.pitchline.on('pointerclick', e => {
			if (this.stage.isDragging() || this.stage.isPinching || e.evt.button != 0 || this.stage.isNoteDragging) return
			e.cancelBubble = true
			this.stage.current = this
			$(`#${this.type}hz`).innerText = Math.round(this._hz || this.hz)
			$(`#${this.type}tav`).innerText = this.tav
			$(`#${this.type}volume`).value = this.volume
			$(`#${this.type}mute`).checked = this.isMuted
			$(`#overlay`).style.visibility = "visible"
			$(`#${this.type}menu`).style.top = this.pitchline.absolutePosition().y + "px"
			$(`#${this.type}menu`).style.left = e.evt.clientX - $(`#${this.type}menu`).clientWidth / 2 + "px"
			ui()
			this.playThis()
		})
		
		this.add(this.pitchline)
		this.childNotes = new Konva.Group()
		this.childLinks = new Konva.Group()
		this.add(this.childNotes)
	}
	addNote(len, interval, delay = 0) {
		const child = new SubNote(this.stage, delay || this.delay || 0, len, interval, this)
		this.childNotes.add(child)
		this.childLinks.add(child.link)
		return child
	}
	
	get len() {
		return this._len
	}
	set len(l) {
		this._len = l
		this.pitchline.points([0, 0, l, 0])
	}
	get note() {
		return {
			time: x2t(this.delay) + "i",
			_time: x2t(this.delay),
			hz: this._hz || this.hz,
			len: x2t(this.len) + "i",
			_len: x2t(this.len),
			vol: this.volume/100
		}
	}
	get notes() {
		return this.childNotes.getChildren().map(x => x.notes).flat().concat(this.mute ? [] : this.note)
	}
	get noteHead() {
		return x2t(this.x()) + OFFSET
	}
	get startTime() {
		return Math.min(...this.notes.map(x => this.noteHead + x._time))
	}
	get endTime() {
		return Math.max(...this.notes.map(x => this.noteHead + x._time + x._len))
	}
	get mute() {
		return this.isMuted
	}
	set mute(b) {
		this.isMuted = b
		this.pitchline.dash(b ? [10, 7] : [])
	}
	play() {
		playNotes(this.notes)
	}
	playThis() {
		if (!this.mute) playNotes([{...this.note, time:"0i"}])
	}
	del() {
		this._part?.dispose()
		this.link?.destroy()
		this.destroy()
	}
}

export class RootNote extends Note {
	constructor(stage, x, y, len, hz, interval) {
		super(stage, {
			x: qh(x),
			y: hz2y(qb(y2hz(y))), // || hz2y(hz || prev.hz * interval.n / interval.d),
			draggable: true
		}, len, 0, interval)
		this.type = 'root'
		this._hz = hz || qb(y2hz(y))
		this.root.buildPart()

		this.on('dragstart', e => {
			history.snapshot()
			const offsetX = this.getRelativePointerPosition().x
			if (offsetX <= 10 && offsetX <= this.len / 3) {
				this.stage.dragMode = 'head'
			} else if (offsetX >= this.len - 10 && offsetX >= 2 * this.len / 3) {
				this.stage.dragMode = 'tail'
			} else {
				this.stage.dragMode = 'body'
			}
			this.origX = this.x()
			this.origY = this.y()
			this.origLen = this.len
			this.origTailX = this.x() + this.len
			this.stage.isNoteDragging = true
			if (this.stage.isShiftMode) {
				for (const n of this.getLayer().getChildren(e => e.x() > this.x())) {
					n.anchor()
				}
			}
		})
		.on('dragmove', e => {
			switch (this.stage.dragMode) {
				case 'head':
					// rootの場合、subも移動する
					this.len = Math.max(10, this.origTailX - qh(this.x()))
					this.x(qh(this.x()))
					this.y(this.origY)
					break
				case 'tail':
					// rootのみ伸縮する
					this.len = Math.max(10, qt(this.stage.getRelativePointerPosition().x) - this.origX)
					this.x(this.origX)
					this.y(this.origY)
					if (this.stage.isShiftMode) {
						for (const n of this.getLayer().getChildren(e => e.x() > this.x())) {
							n.shift(this.len - this.origLen)
						}
					}
					break
				case 'body':
					// 全体移動
					this.x(qh(this.x()))
					this.y(this.y())
					this.quantize()
					if (this.stage.isShiftMode) {
						for (const n of this.getLayer().getChildren(e => e.x() > this.x())) {
							n.shift(this.x() - this.origX, this.y() - this.origY)
						}
					}
			}
		})
		.on('dragend', e => {
			this.stage.isNoteDragging = false
			this.hz = y2hz(this.y())
			this.root.buildPart()
			if (this.stage.isShiftMode) {
				for (const n of this.getLayer().getChildren(e => e.x() > this.x())) {
					n.hz = y2hz(n.y())
					n.buildPart()
				}
			}
		})

		this.mark = new Konva.RegularPolygon({
			x: -10,
			y: 0,
			sides: 3,
			radius: 5,
			stroke: 'white',
			strokeWidth: 2,
			fill: '#676681',
			rotation: 90
		})
		this.add(this.mark)
		this.add(this.childLinks)
	}
	get tav() {
		return this.interval?.n ? `{${tav(this.interval.n, this.interval.d)}}` : ''
	}
	get qhz() {
		return qb(this._hz)
	}
	get hz() {
		return this._hz // || this.prev.hz * this.interval.n / this.interval.d
	}
	set hz(p) {
		// absolute Hz
		this._hz = p
		this.y(hz2y(p))
		this._interval = undefined
		this.quantize()
	}
	quantize() {
		this._hz = qb(y2hz(this.y()))
		this.y(hz2y(this._hz))
		for (const n of this.childNotes.children) n.quantize()
	}
	get interval() {
		return this._interval
	}
	set interval(i) {
		// RootNoteの場合、前のノートとの音高差
		// Todo: shiftモードのとき自身より後ろのノートは連動する
		// prev探索 自分より前のRootNoteのうち最も後ろのもの
		const prevNotes = this.parent.getChildren(n => n.x() < this.x())
		if (prevNotes.length == 0) {
			// 先頭のノード
			if (i.n !== 1 || i.d !== 1) this.hz = this.hz / (this.interval?.n / this.interval?.d || 1) * i.n / i.d
			this._interval = null
		} else {
			const prev = prevNotes.reduce((a, c) => a.x() > c.x() ? a : c)
			this.hz = prev.hz * i.n / i.d
			this._interval = i
		}
		this.quantize()
	}
	anchor() {
		this.origX = this.x()
		this.origY = this.y()
	}
	shift (x, y = 0) {
		this.x(this.origX + x)
		this.y(this.origY + y)
	}
	resolute(n, d) {
		return [n, d]
	}
	get root() {
		return this
	}
	buildPart() {
		this._part?.dispose()
		this._part = new Tone.Part((time, note) => {
			sampler.triggerAttackRelease(
				note.hz,
				note.len,
				time,
				note.vol
			)
		}, this.notes).start(this.noteHead + "i")
		this._part.humanize = ($('#config-humanize').value || 0) / 1000
		return this._part
	}
}

export class SubNote extends Note {
	constructor(stage, delay, len, interval, parent) {
		super(stage, {
			x: 0,
			y: f2d(interval.n, interval.d)
		}, len, delay, interval)
		this.type = ''
		this.parentNote = parent
		this.pitchline.draggable(true)
		this.quantize()
		this.root.buildPart()

		this.pitchline.on('dragstart', e => {
			e.cancelBubble = true
			history.snapshot()
			const offsetX = this.pitchline.getRelativePointerPosition().x
			if (offsetX <= 10 && offsetX <= this.len / 3) {
				this.stage.dragMode = 'head'
			} else if (offsetX >= this.len - 10 && offsetX >= this.len * 2 / 3) {
				this.stage.dragMode = 'tail'
			} else {
				this.stage.dragMode = 'body'
			}
			this.origX = this.pitchline.x()
			this.origY = this.pitchline.y()
			this.origLen = this.len
			this.origTailX = this.pitchline.x() + this.len
			this.stage.isNoteDragging = true
		})
		.on('dragmove', e => {
			e.cancelBubble = true
			switch (this.stage.dragMode) {
				case 'head':
					// delayの変更(tail固定)
					this.len = Math.max(10, this.origTailX - qh(this.pitchline.x()))
					this.pitchline.x(qh(this.pitchline.x()))
					this.pitchline.y(0)
					break
				case 'tail':
					// lenの変更
					this.len = Math.max(10, qh(this.link.getRelativePointerPosition().x) - this.origX)
					this.pitchline.x(this.origX)
					this.pitchline.y(0)
					break
				case 'body':
					// delayの変更(len固定)
					this.pitchline.x(qh(this.pitchline.x()))
					this.pitchline.y(0)
					this.quantize()
					break
			}
			this.delay = this.pitchline.x() - this.link.x()
			this.linkLine.setAttrs(this.lineConfig)
			this.linkContainer.clip(this.clip)
		})
		.on('dragend', e => {
			this.root.buildPart()
		})

		// delay は常に root から数える
		this.link = new Konva.Group({
			x: 0,
			y: f2d(interval.n, interval.d)
		})
		this.linkContainer = new Konva.Group({
			clip: this.clip
		})
		this.linkLine = new Konva.Line(this.lineConfig)
		this.link.add(this.linkContainer.add(this.linkLine))
		this.link.add(this.childLinks)
	}
	get tav() {
		return `{${tav(...this.resolute())}}`
	}
	get hz() {
		// 量子化されていない真のhz
		return this.parentNote.hz * this.interval.n / this.interval.d
	}
	set hz(v) {
		// 量子化されたhz
		this._hz = v
		this.y(hz2y(this._hz) - this.parentNote.getAbsolutePosition(this.stage).y)
	}
	quantize() {
		this._hz = qs(this.hz)
		this.y(hz2y(this._hz) - this.parentNote.getAbsolutePosition(this.stage).y)
		for (const n of this.childNotes.children) n.quantize()
	}
	get interval() {
		return this._interval
	}
	set interval(i) {
		this._hz = null
		this._interval = i
		this.y(f2d(i.n, i.d))
		this.link.y(f2d(i.n, i.d))
		this.linkContainer.clip(this.clip)
		this.linkLine.setAttrs(this.lineConfig)
	}
	resolute(n = 1, d = 1) {
		return this.parentNote.resolute(n * this.interval.n, d * this.interval.d)
	}
	get root() {
		return this.parentNote.root
	}
	get clip() {
		return {
			x: this.delay,
			y: this.interval.n > this.interval.d ? -1.5 : 1.5,
			width: this.len,
			height: f2d(this.interval.d, this.interval.n) + (this.interval.n > this.interval.d ? 3 : -3)
		}
	}
	get lineConfig() {
		return {
			x: this.len * this.interval.t + this.delay,
			y: 0,
			points: [
				Math.sign(this.interval.t - 0.5) * - this.interval.w / 2,
				0,
				this.len * (this.interval.b - this.interval.t) + Math.sign(this.interval.b - 0.5) * - this.interval.w / 2,
				f2d(this.interval.d, this.interval.n)
			],
			lineCap: 'square',
			stroke: this.interval.c,
			strokeWidth: this.interval.w,
			listening: false
		}
	}
}
