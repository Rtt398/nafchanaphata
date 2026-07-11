/*
 * 网格图层模块 — 音高谱线、节拍线、循环箭头、播放指示器
 * グリッドレイヤーモジュール — ピッチスコアライン、ビートライン、ループ矢印、再生インジケーター
 * Grid layer module — pitch score-lines, beat lines, loop arrows, playback indicator
 */
import { $, range, hz2y, x2t, t2x, f2d, qh, OFFSET } from './util.js'
import { rootlayer } from './sequencer.js'

// 网格类：管理所有背景参考线、播放指示器和循环控制 / グリッドクラス：背景参照線、再生インジケーター、ループ制御を管理 / Grid class: manages background reference lines, playback indicator, and loop controls
export class Grid extends Konva.Layer {
	constructor(stage, tonic, beat) {
		super() // {listening: false})
		this.stage = stage
		// 从 localStorage 恢复（优先），否则从 DOM/参数读取 / localStorageから復元（優先）、なければDOM/引数から読み取り / Restore from localStorage (preferred), otherwise read from DOM/params
		const savedTonic = localStorage.getItem('naf_tonic')
		const savedBeat = localStorage.getItem('naf_beat')
		this._tonic = tonic || (savedTonic ? parseFloat(savedTonic) : null) || parseFloat($('#config-tonic').value) || 440
		this._beat = beat || (savedBeat ? parseFloat(savedBeat) : null) || parseFloat($('#config-beat').value) || 500
		// 同步到 DOM / DOMに同期 / Sync to DOM
		$('#config-tonic').value = this._tonic
		$('#config-beat').value = this._beat
		this.octave = f2d(1, 2)
		this._2dInterval = f2d(2, 3)   // 3/2 = 五度 / 完全五度 / perfect fifth
		this._3dInterval = f2d(4, 5)   // 5/4 = 大三度 / 長三度 / major third
		this._4dInterval = f2d(4, 7)   // 7/4 = 和声七度 / 和声的七度 / harmonic seventh
		
		this.scorelines = new Konva.Group()
		this.scorelines2 = new Konva.Group()
		this.scorelines3 = new Konva.Group()
		this.scorelines4 = new Konva.Group()
		this.beatlines = new Konva.Group()
		this.tonicline = new Konva.Line()
		
		this.indicator = new Konva.Line({
			strokeWidth: 1,
			stroke: "#aaaaaa"
		})
		this._pianoRollOffset = 0   // 用户在卷帘模式下手动拖动的偏移（内容坐标）/ ユーザーがピアノロールモードで手動ドラッグしたオフセット（コンテンツ座標） / Manual drag offset in piano roll mode (content coords)
		this._isUserDragging = false
		// 动画帧：每帧更新播放指示线位置 / アニメーションフレーム：毎フレーム再生インジケーター位置を更新 / Animation frame: update playback indicator position each frame
		this.anim = new Konva.Animation(frame => {
			const transportX = t2x(Tone.Transport.ticks - OFFSET)
			const sx = this.stage.scaleX()
			const sy = this.stage.scaleY()
			const playing = Tone.Transport.state === 'started'
			if (this._pianoRoll) {
				const FIXED_X = window.innerWidth * 0.25
				if (playing) {
					// 播放中：自动滚屏跟随transport（含用户手动偏移），用户拖动时不覆盖
					if (!this._isUserDragging) {
						this.stage.x(FIXED_X - (transportX + this._pianoRollOffset) * sx)
					}
				}
				// 始终固定在FIXED_X屏幕位置：播放/暂停/拖动都不变
				this.indicator.x((FIXED_X - this.stage.x()) / sx)
			} else {
				this.indicator.x(transportX)
			}
			this.indicator.y(-this.stage.y() / sy)
			this.indicator.points([0, 0, 0, window.innerHeight / sy])
			// 播放中每帧更新网格位置（拖动时dragmove已处理；暂停时不需要自动跟滚）
			if (this._pianoRoll && playing) this.adjust()
		})
		this._pianoRoll = true  // 默认开启 / デフォルトで有効 / enabled by default
		
		this.loopStart = new Konva.Group({
			x: 0,
			opacity: 0.5,
			draggable: true
		}).add(
			new Konva.RegularPolygon({
				sides: 4, radius: 14, fill: '#f27999', stroke: 'white', strokeWidth: 0.5
			}),
			new Konva.RegularPolygon({
				sides: 3, radius: 8, fill: 'white', rotation: 90
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
				sides: 4, radius: 14, fill: '#6cd985', stroke: 'white', strokeWidth: 0.5
			}),
			new Konva.RegularPolygon({
				sides: 3, radius: 8, fill: 'white', rotation: -90
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
		
		this.add(this.scorelines4, this.scorelines3, this.scorelines2, this.scorelines, this.beatlines, this.tonicline, this.indicator, this.loopEnd, this.loopStart)
		// 非交互元素禁用 hit 检测，减少大量网格线的碰撞计算 / 非インタラクティブ要素のヒット検出を無効化し、大量のグリッド線の衝突計算を削減 / Disable hit detection on non-interactive elements to reduce collision checks
		this.scorelines.listening(false)
		this.scorelines2.listening(false)
		this.scorelines3.listening(false)
		this.scorelines4.listening(false)
		this.beatlines.listening(false)
		this.tonicline.listening(false)
		this.indicator.listening(false)
		this.drawScorelines()
		this.drawBeatlines()
		this.adjust()

		// 卷帘模式下手动拖动：stage移动 → 更新内容偏移，播放线保持屏幕位置不变 / ピアノロールモードでの手動ドラッグ：stage移動→コンテンツオフセット更新、再生線は画面位置固定 / Manual drag in piano roll: stage moves → update content offset, playback line stays fixed on screen
		stage.on('dragstart.pianoroll', e => {
			if (this._pianoRoll && Tone.Transport.state === 'started') {
				this._isUserDragging = true
			}
		})
		stage.on('dragmove.pianoroll', e => {
			if (this._pianoRoll && this._isUserDragging) {
				const transportX = t2x(Tone.Transport.ticks - OFFSET)
				const FIXED_X = window.innerWidth * 0.25
				const sx = this.stage.scaleX()
				// stage.x = FIXED_X - (transportX + offset) * sx
				// → offset = (FIXED_X - stage.x()) / sx - transportX
				this._pianoRollOffset = (FIXED_X - this.stage.x()) / sx - transportX
				this.adjust()
			}
		})
		stage.on('dragend.pianoroll', e => {
			this._isUserDragging = false
		})
	}
	
	// 重置卷帘偏移 / ピアノロールオフセットをリセット / Reset piano roll offset
	resetPianoRollOffset() {
		this._pianoRollOffset = 0
	}

	// 返回播放线当前指向的内容坐标（stage坐标系）/ 再生線が現在指しているコンテンツ座標を返す（stage座標系）/ Return the content coordinate the playback line currently points to (stage coords)
	getIndicatorContentX() {
		const FIXED_X = window.innerWidth * 0.25
		return (FIXED_X - this.stage.x()) / this.stage.scaleX()
	}

	// 基频属性的getter/setter / 基音プロパティのgetter/setter / Tonic property getter/setter
	get tonic() {
		return this._tonic
	}
	set tonic(v) {
		this._tonic = v
		$('#config-tonic').value = v
		localStorage.setItem('naf_tonic', v)
		this.drawScorelines()
	}
	
	// 拍长属性的getter/setter / 拍長プロパティのgetter/setter / Beat property getter/setter
	get beat() {
		return this._beat
	}
	set beat(v) {
		this._beat = v
		$('#config-beat').value = v
		localStorage.setItem('naf_beat', v)
		this.drawBeatlines()
	}

	// 绘制音高谱线（1d~4d维度，根据复选框开关）/ ピッチスコアラインを描画（1d〜4d次元、チェックボックスで切替）/ Draw pitch score-lines (1d~4d dimensions, toggled by checkboxes)
	drawScorelines() {
		this.scorelines.destroyChildren()
		this.scorelines2.destroyChildren()
		this.scorelines3.destroyChildren()
		this.scorelines4.destroyChildren()
		if (!this.tonic) return
		
		if ($('#config-scoreline-1d').checked) {
			// 1D scorelines: tonic * 2^n（八度）
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
		}
		
		if ($('#config-scoreline-2d').checked) {
			// 2D scoreline: tonic * (3/2)^n（五度）
			const lineCount2 = Math.ceil(window.innerHeight / this.stage.scaleY() / this._2dInterval) + 1
			for (const i of range(lineCount2)) {
				this.scorelines2.add(new Konva.Line({
					x: 0,
					y: this._2dInterval * i,
					points: [0, 0, window.innerWidth / this.stage.scaleX(), 0],
					strokeWidth: 3,
					stroke: '#8c6f88'
				}))
			}
		}

		if ($('#config-scoreline-3d').checked) {
			// 3D scoreline: tonic * (5/4)^n（大三度）- 绿色
			const lineCount3 = Math.ceil(window.innerHeight / this.stage.scaleY() / this._3dInterval) + 1
			for (const i of range(lineCount3)) {
				this.scorelines3.add(new Konva.Line({
					x: 0,
					y: this._3dInterval * i,
					points: [0, 0, window.innerWidth / this.stage.scaleX(), 0],
					strokeWidth: 3,
					stroke: '#6cd985'
				}))
			}
		}

		if ($('#config-scoreline-4d').checked) {
			// 4D scoreline: tonic * (7/4)^n（和声七度）- 淡紫色
			const lineCount4 = Math.ceil(window.innerHeight / this.stage.scaleY() / this._4dInterval) + 1
			for (const i of range(lineCount4)) {
				this.scorelines4.add(new Konva.Line({
					x: 0,
					y: this._4dInterval * i,
					points: [0, 0, window.innerWidth / this.stage.scaleX(), 0],
					strokeWidth: 3,
					stroke: '#b598ee'
				}))
			}
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
	
	// 绘制节拍竖线 / ビート縦線を描画 / Draw beat vertical lines
	drawBeatlines() {
		this.beatlines.destroyChildren()
		if (!this.beat) return
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
		// 细分谱线
		this.drawSubdivisionLines()
		this.adjust()
		Tone.Transport.bpm.value = 60000 / ($('#config-beat').value || 500)
	}

	// 细分谱线：在拍之间插入更细更透明的竖线 / 分割線：拍の間に細く透明な縦線を挿入 / Subdivision lines: insert thinner, more transparent lines between beats
	drawSubdivisionLines() {
		try {
		const subEl = document.getElementById('config-subdivide-lines')
		if (!subEl?.checked) return
		const tickEl = document.getElementById('config-tick')
		const tick = tickEl ? (parseInt(tickEl.value) || 1) : 1
		if (tick <= 1) return  // 分辨率 >= 1 拍时不加
		const count = Math.ceil(window.innerWidth / this.stage.scaleX() / 48) + 1
		for (let i = 0; i < count; i++) {
			for (let j = 1; j < tick; j++) {
				this.beatlines.add(new Konva.Line({
					x: 48 * i + (48 / tick) * j,
					y: 0,
					points: [0, 0, 0, window.innerHeight / this.stage.scaleY()],
					strokeWidth: 0.5,
					stroke: '#7e7d93',
					opacity: 0.35
				}))
			}
		}
		} catch(err) { console.error('drawSubdivisionLines error:', err) }
	}
	// 仅更新位置（画布平移/缩放时调用） / 位置のみ更新（キャンバス移動・ズーム時に呼出） / Adjust positions only (called on canvas pan/zoom)
	adjust() {
		const tonicY = hz2y(this.tonic)
		const top = tonicY - Math.floor((tonicY + this.stage.y() / this.stage.scaleY()) / this.octave) * this.octave
		const top2 = tonicY - Math.floor((tonicY + this.stage.y() / this.stage.scaleY()) / this._2dInterval) * this._2dInterval
		const top3 = tonicY - Math.floor((tonicY + this.stage.y() / this.stage.scaleY()) / this._3dInterval) * this._3dInterval
		const top4 = tonicY - Math.floor((tonicY + this.stage.y() / this.stage.scaleY()) / this._4dInterval) * this._4dInterval
		this.scorelines.x(-this.stage.x() / this.stage.scaleX())
		this.scorelines2.x(-this.stage.x() / this.stage.scaleX())
		this.scorelines3.x(-this.stage.x() / this.stage.scaleX())
		this.scorelines4.x(-this.stage.x() / this.stage.scaleX())
		this.tonicline.x(-this.stage.x() / this.stage.scaleX())
		this.scorelines.y(top)
		this.scorelines2.y(top2)
		this.scorelines3.y(top3)
		this.scorelines4.y(top4)
		this.tonicline.y(tonicY)
		
		const left = Math.floor(-this.stage.x() / this.stage.scaleX() / 48) * 48
		this.beatlines.x(left)
		this.beatlines.y(-this.stage.y() / this.stage.scaleY())
		
		this.loopStart.y(-this.stage.y() / this.stage.scaleY() + 15)
		this.loopEnd.y(-this.stage.y() / this.stage.scaleY() + 15)
	}
	
	// 显示/隐藏播放指示器 / 再生インジケーターの表示・非表示 / Show/hide playback indicator
	showIndicator() {
		this.anim.start()
		this.indicator.show()
	}
	hideIndicator() {
		this.indicator.hide()
		this.anim.stop()
	}

	// 设置卷帘模式开关 / ピアノロールモードのオンオフ / Toggle piano roll mode
	setPianoRoll(v) {
		this._pianoRoll = v
		if (!v) this._pianoRollOffset = 0
	}
	
	// 将循环起止位置同步到 Tone.Transport / ループ開始・終了位置をTone.Transportに同期 / Sync loop start/end positions to Tone.Transport
	setLoop() {
		Tone.Transport.loopStart = x2t(this.loopStart.x()) + OFFSET + "i"
		Tone.Transport.loopEnd = x2t(this.loopEnd.x()) + OFFSET + "i"
	}

	// 自动将循环箭头分配到最左/最右音符
	// ループ矢印を最も左・最も右の音符に自動配置
	// Automatically position loop arrows at the leftmost/rightmost notes
	autoLoop() {
		const children = rootlayer.getChildren()
		if (children.length === 0) return

		let minX = Infinity, maxX = -Infinity
		for (const note of children) {
			const x = note.x()
			const len = note.len || 48
			if (x < minX) minX = x
			if (x + len > maxX) maxX = x + len
		}

		const pad = 48  // 1拍间距
		this.loopStart.x(minX - pad)
		this.loopEnd.x(maxX + pad)
		this.setLoop()
		this.batchDraw()
	}

	// 修复非等比缩放时红绿箭头和根音标记变形
	// 非等比拡大縮小時に赤緑矢印とルートマークの変形を修正
	// Fix distortion of red/green arrows and root mark under non-uniform scaling
	fixArrowScale() {
		const sx = this.stage.scaleX() || 1
		const sy = this.stage.scaleY() || 1
		const isx = 1 / sx, isy = 1 / sy
		// 循环箭头（外框菱形旋转0°→不交换；内三角旋转90°/-90°→需交换）
		for (const g of [this.loopStart, this.loopEnd]) {
			for (const child of g.children) {
				const rot = child.rotation()
				if (Math.abs(rot) === 90) {
					child.scaleX(isy)  // 交换
					child.scaleY(isx)
				} else {
					child.scaleX(isx)
					child.scaleY(isy)
				}
			}
		}
		// 根音标记 rotation:90 → 交换
		for (const n of rootlayer.getChildren()) {
			if (n.mark) { n.mark.scaleX(isy); n.mark.scaleY(isx) }
		}
		this.batchDraw()
	}
}
