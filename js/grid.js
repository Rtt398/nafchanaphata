
import { $, range, hz2y, x2t, t2x, f2d, qh, OFFSET } from './util.js'

export class Grid extends Konva.Layer {
	constructor(stage, tonic, beat) {
		super() // {listening: false})
		this.stage = stage
		this._tonic = tonic
		this._beat = beat
		this.octave = f2d(1, 2)
		
		this.scorelines = new Konva.Group()
		this.beatlines = new Konva.Group()
		this.tonicline = new Konva.Line()
		
		this.indicator = new Konva.Line({
			strokeWidth: 1,
			stroke: "#aaaaaa"
		})
		this.anim = new Konva.Animation(frame => {
			this.indicator.x(t2x(Tone.Transport.ticks - OFFSET))
			this.indicator.y(-this.stage.y() / this.stage.scaleY())
			this.indicator.points([0, 0, 0, window.innerHeight / this.stage.scaleY()])
		})
		
		this.loopStart = new Konva.Group({
			x: 0,
			opacity: 0.5,
			draggable: true
		}).add(
			new Konva.RegularPolygon({
				sides: 4, radius: 10, fill: '#f27999', stroke: 'white', strokeWidth: 0.5
			}),
			new Konva.RegularPolygon({
				sides: 3, radius: 5, fill: 'white', rotation: 90
			})
		).on('dragstart', e => {
			this.stage.isNoteDragging = true
		}).on('dragmove', e => {
			this.loopStart.x(qh(this.loopStart.x()))
			this.loopStart.y(-this.stage.y() / this.stage.scaleY() + 15)
		}).on('dragend', e => {
			this.stage.isNoteDragging = false
			this.setLoop()
		})
		this.loopEnd = new Konva.Group({
			x: 480,
			opacity: 0.5,
			draggable: true
		}).add(
			new Konva.RegularPolygon({
				sides: 4, radius: 10, fill: '#6cd985', stroke: 'white', strokeWidth: 0.5
			}),
			new Konva.RegularPolygon({
				sides: 3, radius: 5, fill: 'white', rotation: -90
			})
		).on('dragstart', e => {
			this.stage.isNoteDragging = true
		}).on('dragmove', e => {
			this.loopEnd.x(qh(this.loopEnd.x()))
			this.loopEnd.y(-this.stage.y() / this.stage.scaleY() + 15)
		}).on('dragend', e => {
			this.stage.isNoteDragging = false
			this.setLoop()
		})
		this.setLoop()
		
		this.add(this.scorelines, this.beatlines, this.tonicline, this.indicator, this.loopEnd, this.loopStart)
		this.drawScorelines()
		this.drawBeatlines()
		this.adjust()
	}
	
	get beat() {
		return this._beat
	}
	set beat(v) {
		this._beat = v
		$('#config-beat').value = v
		this.drawBeatlines()
	}
	
	get tonic() {
		return this._tonic
	}
	set tonic(v) {
		this._tonic = v
		$('#config-tonic').value = v
		this.drawScorelines()
	}
	
	drawScorelines() {
		this.scorelines.destroyChildren()
		if (!this.tonic) return
		// 1D scorelines: tonic^2n
		const lineCount = Math.ceil(window.innerHeight / this.stage.scaleY() / this.octave) + 1
		
		for (const i of range(lineCount)) {
			this.scorelines.add(new Konva.Line({
				x: 0,
				y: this.octave * i,
				points: [0, 0, window.innerWidth / this.stage.scaleX(), 0],
				strokeWidth: 3,
				stroke: '#7e7d93'
			}))
		}
		this.tonicline.setAttrs({
			x: 0,
			y: 0,
			points: [0, 0, window.innerWidth / this.stage.scaleX(), 0],
			strokeWidth: 3,
			stroke: '#b5b4c2'
		})
		this.adjust()
	}
	
	drawBeatlines() {
		this.beatlines.destroyChildren()
		if (!this.beat) return
		// beatlines: beat*n
		// beatlineは常に48間隔で表示（x-scaling機能が入らない限りは）
		const lineCount = Math.ceil(window.innerWidth / this.stage.scaleX() / 48) + 1
		
		for (const i of range(lineCount)) {
			this.beatlines.add(new Konva.Line({
				x: 48 * i,
				y: 0,
				points: [0, 0, 0, window.innerHeight / this.stage.scaleY()],
				strokeWidth: 1,
				stroke: '#7e7d93'
			}))
			
		}
		this.adjust()
		Tone.Transport.bpm.value = 60000 / ($('#config-beat').value || 500)
	}
	//位置のみ変更
	adjust() {
		const tonicY = hz2y(this.tonic)
		const top = tonicY - Math.floor((tonicY + this.stage.y() / this.stage.scaleY()) / this.octave) * this.octave
		this.scorelines.x(-this.stage.x() / this.stage.scaleX())
		this.tonicline.x(-this.stage.x() / this.stage.scaleX())
		this.scorelines.y(top)
		this.tonicline.y(tonicY)
		
		const left = Math.floor(-this.stage.x() / this.stage.scaleX() / 48) * 48
		this.beatlines.x(left)
		this.beatlines.y(-this.stage.y() / this.stage.scaleY())
		
		this.loopStart.y(-this.stage.y() / this.stage.scaleY() + 15)
		this.loopEnd.y(-this.stage.y() / this.stage.scaleY() + 15)
	}
	
	showIndicator() {
		this.anim.start()
		this.indicator.show()
	}
	hideIndicator() {
		this.indicator.hide()
		this.anim.stop()
	}
	
	setLoop() {
		Tone.Transport.loopStart = x2t(this.loopStart.x()) + OFFSET + "i"
		Tone.Transport.loopEnd = x2t(this.loopEnd.x()) + OFFSET + "i"
	}
}