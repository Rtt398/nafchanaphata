
class Note extends Konva.Group {
	constructor(opt, len, delay = 0, interval = null) {
		super(opt)
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
			if (stage.isDragging() || stage.isPinching || e.evt.button != 0 || stage.isNoteDragging) return
			e.cancelBubble = true
			stage.current = this
			$(`#${this.type}hz`).innerText = Math.round(this._hz || this.hz)
			$(`#${this.type}tav`).innerText = this.tav
			$(`#${this.type}volume`).value = this.volume
			$(`#${this.type}mute`).checked = this.isMuted
			$(`#overlay`).style.visibility = "visible"
			$(`#${this.type}menu`).style.top = this.pitchline.absolutePosition().y + "px"
			$(`#${this.type}menu`).style.left = e.evt.clientX - $(`#${this.type}menu`).clientWidth / 2 + "px"
			ui()
			if (!this.mute) playNotes([{...this.note, time:"0i"}])
		})
		
		this.add(this.pitchline)
		this.childNotes = new Konva.Group()
		this.childLinks = new Konva.Group()
		this.add(this.childNotes)
	}
	addNote(len, interval) {
		const child = new SubNote(this.delay || 0, len, interval, this)
		this.childNotes.add(child)
		this.childLinks.add(child.link)
		this.root.buildPart()
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
		return this._part
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
	del() {
		this._part?.dispose()
		this.link?.destroy()
		this.destroy()
	}
}

class RootNote extends Note {
	constructor(x, y, len, hz, prev, interval) {
		super({
			x: qh(x),
			y: hz2y(qb(y2hz(y))), // || hz2y(hz || prev.hz * interval.n / interval.d),
			draggable: true
		}, len, 0, interval)
		this.type = 'root'
		this._hz = hz || qb(y2hz(y))
		this.prev = prev
		playNotes([{...this.note, time:"0i"}])

		this.on('dragstart', e => {
			const offsetX = this.getRelativePointerPosition().x
			if (offsetX <= 10 && offsetX <= this.len / 3) {
				stage.dragMode = 'head'
			} else if (offsetX >= this.len - 10 && offsetX >= 2 * this.len / 3) {
				stage.dragMode = 'tail'
			} else {
				stage.dragMode = 'body'
			}
			this.origX = this.x()
			this.origY = this.y()
			this.origLen = this.len
			this.origTailX = this.x() + this.len
			stage.isNoteDragging = true
		})
		.on('dragmove', e => {
			switch (stage.dragMode) {
				case 'head':
					// rootの場合、全体が移動・伸縮する
					this.len = Math.max(10, this.origTailX - qh(this.x()))
					this.x(qh(this.x()))
					this.y(this.origY)
					break
				case 'tail':
					// rootのみ伸縮する
					this.len = Math.max(10, qt(stage.getRelativePointerPosition().x) - this.origX)
					this.x(this.origX)
					this.y(this.origY)
					break
				case 'body':
					this.x(qh(this.x()))
					this.y(this.y())
					this.quantize()
			}
		})
		.on('dragend', e => {
			stage.isNoteDragging = false
			this.hz = y2hz(this.y())
			this.root.buildPart()
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
	}
	resolute(n, d) {
		return [n, d]
	}
	get root() {
		return this
	}
}

class SubNote extends Note {
	constructor(delay, len, interval, parent) {
		super({
			x: 0,
			y: f2d(interval.n, interval.d)
		}, len, delay, interval)
		this.type = ''
		this.parentNote = parent
		this.pitchline.draggable(true)
		this.quantize()
		playNotes([{...this.note, time:"0i"}])

		this.pitchline.on('dragstart', e => {
			e.cancelBubble = true
			const offsetX = this.pitchline.getRelativePointerPosition().x
			if (offsetX <= 10 && offsetX <= this.len / 3) {
				stage.dragMode = 'head'
			} else if (offsetX >= this.len - 10 && offsetX >= this.len * 2 / 3) {
				stage.dragMode = 'tail'
			} else {
				stage.dragMode = 'body'
			}
			this.origX = this.pitchline.x()
			this.origY = this.pitchline.y()
			this.origLen = this.len
			this.origTailX = this.pitchline.x() + this.len
			stage.isNoteDragging = true
		})
		.on('dragmove', e => {
			e.cancelBubble = true
			switch (stage.dragMode) {
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
		return this.parentNote.hz * this.interval.n / this.interval.d
	}
	quantize() {
		this._hz = qs(this.hz)
		this.y(hz2y(this._hz) - this.parentNote.getAbsolutePosition(stage).y)
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

$('#rootdelete').addEventListener('click', e => {
	if (stage.current) {
		stage.current.del()
		stage.current = undefined
	}
	$('#overlay').style.visibility = ''
	$('#rootmenu').style.top = ''
})

$('#delete').addEventListener('click', e => {
	if (stage.current) {
		stage.current.del()
		stage.current = undefined
	}
	$('#overlay').style.visibility = ''
	$('#menu').style.top = ''
})

$('#roothz').addEventListener('blur', e => {
	const hz = e.target.innerText.replace(/[^0-9.]/g, '')
	if (hz == '' || hz < 20 || hz > 20000) return e.target.innerText = Math.round(stage.current.hz)
	e.target.innerText = hz
	stage.current.hz = hz
	if ($('#rootmenu').style.top == '') return
	$('#rootmenu').style.top = stage.current.absolutePosition().y + "px"
})

$('#rootvolume').addEventListener('change', e => {
	$('#rootmute').checked = false
	stage.current.mute = false
	stage.current.volume = e.target.value
})

$('#volume').addEventListener('change', e => {
	$('#mute').checked = false
	stage.current.mute = false
	stage.current.volume = e.target.value
})

for (const el of $$('.mute-btn')) {
	el.addEventListener('change', function(e) {
		if (stage.current) {
			stage.current.mute = this.checked
			rootlayer.draw()
		}
	})
}

for (const el of $$('.prog-btn')) {
	el.addEventListener('click', function(e) {
		// rootの音高を移動させる操作 (0d以外は累積)
		if (!stage.current) return
		const shift = pitchIntervals[($('#root-prog-dir').checked ? '-' : '+') + this.innerText]
		const interval = this.innerText == '0d' ? {n: 1, d: 1} : stage.current.interval || {n: 1, d: 1}
		stage.current.interval = {n: interval.n * shift.n, d: interval.d * shift.d}
		$('#rootmenu').style.top = stage.current.pitchline.absolutePosition().y + "px"
		$(`#roothz`).innerText = Math.round(stage.current.hz)
		$(`#roottav`).innerText = stage.current.tav
	})
}
for (const el of $$('.trans-btn')) {
	el.addEventListener('click', function(e) {
		// 自身の音高差を変更する操作 (上書き)
		stage.current.interval = pitchIntervals[($('#trans-dir').checked ? '-' : '+') + this.innerText]
		$('#menu').style.top = stage.current.pitchline.absolutePosition().y + "px"
		$(`#hz`).innerText = Math.round(stage.current.hz)
		$(`#tav`).innerText = stage.current.tav
	})
}
for (const el of $$('.root-exp-btn')) {
	el.addEventListener('click', function(e) {
		// 自身と所定の音高差を持つnoteを追加する操作
		stage.current.addNote(stage.current.len, pitchIntervals[($('#root-exp-dir').checked ? '-' : '+') + this.innerText])
	})
}
for (const el of $$('.exp-btn')) {
	el.addEventListener('click', function(e) {
		// 自身と所定の音高差を持つnoteを追加する操作
		stage.current.addNote(stage.current.len, pitchIntervals[($('#exp-dir').checked ? '-' : '+') + this.innerText])
	})
}

for (const el of $$('.play-this-btn')) {
	el.addEventListener('click', function(e) {
		stage.current.root.play()
	})
}