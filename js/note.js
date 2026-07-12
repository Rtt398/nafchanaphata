/*
 * 音符模块：定义 Note、RootNote、SubNote 类，管理音高线、和弦树、拖拽交互和颜色映射
 * 音符モジュール：Note、RootNote、SubNote クラスを定義し、ピッチライン、コードツリー、ドラッグ操作、カラーマッピングを管理
 * Note module: defines Note, RootNote, SubNote classes managing pitch lines, chord trees, drag interaction and color mapping
 */

import { hz2y, y2hz, x2t, f2d, qb, qs, qh, qt, tav, pitchIntervals, $, $$, OFFSET } from './util.js';
import { playNotes, sampler } from './sound.js';
import history from './history.js'

// ===== Hz → 音符颜色 =====
// 三种模式（Config 中互斥选择）：
//   1. 波长：纯光谱色 (wavelengthToRgb)
//   2. HSI增强：全色相环 HSL 映射 (当前)
//   3. 白色：统一白色

// 频率转波长 // 周波数を波長に変換 // Convert frequency to wavelength
function hzToWavelength(hz) {
	let wl = hz
	while (wl > 750) wl /= 2
	while (wl < 380) wl *= 2
	return wl
}

// 模式1：纯光谱波长 → RGB
// 模式1：純粋なスペクトル波長 → RGB 変換 // Mode 1: pure spectral wavelength → RGB conversion
function wavelengthToRgb(wl) {
	let r = 0, g = 0, b = 0
	if (wl >= 380 && wl < 440) {
		r = -(wl - 440) / 60; g = 0; b = 1
	} else if (wl >= 440 && wl < 490) {
		r = 0; g = (wl - 440) / 50; b = 1
	} else if (wl >= 490 && wl < 510) {
		r = 0; g = 1; b = -(wl - 510) / 20
	} else if (wl >= 510 && wl < 580) {
		r = (wl - 510) / 70; g = 1; b = 0
	} else if (wl >= 580 && wl < 645) {
		r = 1; g = -(wl - 645) / 65; b = 0
	} else if (wl >= 645 && wl <= 750) {
		r = 1; g = 0; b = 0
	}
	let factor = 1
	if (wl < 420) factor = 0.3 + 0.7 * (wl - 380) / 40
	else if (wl > 700) factor = 0.3 + 0.7 * (750 - wl) / 50
	r = Math.round(r * factor * 255)
	g = Math.round(g * factor * 255)
	b = Math.round(b * factor * 255)
	return { r, g, b }
}

// 模式2：全色相环 HSL
// 模式2：フル色相環 HSL // Mode 2: full hue circle HSL
function wavelengthToHue(wl) {
	return 300 - (wl - 380) / (750 - 380) * 300
}

// HSL → RGB 转换 // HSL → RGB 変換 // Convert HSL to RGB
function hslToRgb(h, s, l) {
	const c = (1 - Math.abs(2 * l - 1)) * s
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
	const m = l - c / 2
	let r = 0, g = 0, b = 0
	if      (h < 60)  { r = c; g = x }
	else if (h < 120) { r = x; g = c }
	else if (h < 180) { g = c; b = x }
	else if (h < 240) { g = x; b = c }
	else if (h < 300) { r = x; b = c }
	else              { r = c; b = x }
	return {
		r: Math.round((r + m) * 255),
		g: Math.round((g + m) * 255),
		b: Math.round((b + m) * 255)
	}
}

// 获取当前颜色模式 // 現在のカラーモードを取得 // Get current color mode
function _getColorMode() {
	if ($('#config-color-wavelength')?.checked) return 'wavelength'
	if ($('#config-color-hsl')?.checked) return 'hsl'
	return 'white'
}

// 频率 → RGB 字符串：根据配置的颜色模式将 Hz 转换为 CSS 颜色字符串
// 周波数 → RGB 文字列：設定されたカラーモードに基づいて Hz を CSS カラー文字列に変換
// Frequency → RGB string: converts Hz to a CSS color string based on the configured color mode
function hzToRgbString(hz) {
	if (!hz || hz <= 0) return 'white'
	const mode = _getColorMode()
	if (mode === 'white') return 'white'
	const wl = hzToWavelength(hz)
	if (mode === 'wavelength') {
		const { r, g, b } = wavelengthToRgb(wl)
		return `rgb(${r},${g},${b})`
	}
	// mode === 'hsl'
	const hue = wavelengthToHue(wl)
	const { r, g, b } = hslToRgb(hue, 0.85, 0.55)
	return `rgb(${r},${g},${b})`
}

// Note 基类：所有音符的公共抽象，包含音高线、子音符树、播放/静音/隐藏等核心功能
// Note 基底クラス：すべての音符の共通抽象、ピッチライン、子音符ツリー、再生/ミュート/非表示などのコア機能を含む
// Note base class: common abstraction for all notes, includes pitch line, child note tree, play/mute/hide core functionality
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
		this._hidden = false

		// 每音独立的外观属性（从全局滑块读取默认值）
		// 音符ごとの独立した外観属性（グローバルスライダーからデフォルト値を読み取り）
		// Per-note appearance properties (read defaults from global sliders)
		this._pitchThick = parseFloat($('#config-note-thickness')?.value) || 3
		this._linkThick = parseFloat($('#config-link-thickness')?.value) || 1
		this._linkOpacity = 1
		this._noteOpacity = 1
		
		// 音符点击处理器：选中、播放、弹出菜单 // 音符クリックハンドラ：選択、再生、ポップアップメニュー // Note click handler: select, play, popup menu
		this.pitchline.on('pointerclick', e => {
			if (this.stage.isDragging() || this.stage.isPinching || e.evt.button != 0 || this.stage.isNoteDragging) return
			// 隐藏状态：仅 Ctrl+点击可选中
			if (this._hidden && !e.evt.ctrlKey) return
			e.cancelBubble = true
			// Shift+点击：切换选中状态
			if (e.evt.shiftKey && window._sel) {
				window._sel.toggleNote(this)
				return
			}
			this.stage.current = this
			// 非卷帘模式：点击音符也移动播放线
			if (!$('#config-pianoroll')?.checked) {
				Tone.Transport.ticks = x2t(this.root.x()) + OFFSET
			}
			$(`#${this.type}hz`).innerText = (this._hz || this.hz).toFixed(1)
			$(`#${this.type}tav`).innerText = this.tav
			$(`#${this.type}volume`).value = this.volume
			$(`#${this.type}mute`).checked = this.isMuted
			// 每音外观滑块（兼容 root(type='root') 和 sub(type='') 两种前缀模式）
			const p = this.type ? this.type + '-' : ''
			const ntSlider = $(`#${p}note-thick`)
			const ltSlider = $(`#${p}link-thick`)
			const loSlider = $(`#${p}link-opacity`)
			const noSlider = $(`#${p}note-opacity`)
			if (ntSlider) ntSlider.value = this._pitchThick
			if (ltSlider) ltSlider.value = this._linkThick
			if (loSlider) loSlider.value = this._linkOpacity
			if (noSlider) noSlider.value = (this._noteOpacity || 1) * 100
			$(`#overlay`).style.visibility = "visible"
			window._renderExtShortcuts?.(this.type ? this.type + '-' : '')
			const menu = $(`#${this.type}menu`)
			const absY = this.pitchline.absolutePosition().y
			const menuH = menu.clientHeight
			const menuW = menu.clientWidth
			// 弹窗放在音符右侧，上下不超出屏幕
			const top = Math.max(10, Math.min(absY - menuH / 2, window.innerHeight - menuH - 10))
			let left = this.pitchline.absolutePosition().x + 60
			if (left + menuW > window.innerWidth - 10) left = this.pitchline.absolutePosition().x - menuW - 10
			menu.style.top = top + "px"
			menu.style.left = left + "px"
			ui()
			this.playThis()
		})
		
		this.add(this.pitchline)
		this.childNotes = new Konva.Group()
		this.childLinks = new Konva.Group()
		this.add(this.childNotes)
	}

	// 根据当前 Hz 更新音高线颜色（八度不变性：2^n 倍频率同色）
	// 三种模式由 Config 面板「音符颜色」互斥选择
	// 現在の Hz に基づいてピッチラインの色を更新（オクターブ不変性：2^n 倍の周波数は同色）
	// Update pitch line color based on current Hz (octave invariance: 2^n × frequency = same color)
	updateColor() {
		this.pitchline.stroke(hzToRgbString(this.hz))
	}

	// 递归更新所有后代音符的颜色 // すべての子孫音符の色を再帰的に更新 // Recursively update color for all descendant notes
	updateColorRecursive() {
		this.updateColor()
		for (const c of this.childNotes.getChildren()) c.updateColorRecursive()
	}

	// 外观 getter/setter
	// 外観のゲッター/セッター // Appearance getters/setters
	get pitchThick()  { return this._pitchThick }
	set pitchThick(v) {
		this._pitchThick = v
		this.pitchline.strokeWidth(v)
	}
	setPitchThickRecursive(v) {
		this.pitchThick = v
		for (const c of this.childNotes.getChildren()) c.setPitchThickRecursive(v)
	}
	get noteOpacity() { return this._noteOpacity }
	set noteOpacity(v) {
		this._noteOpacity = v
		this.pitchline.opacity(v)
		if (this.mark) this.mark.opacity(v)
	}
	setNoteOpacityRecursive(v) {
		this.noteOpacity = v
		for (const c of this.childNotes.getChildren()) c.setNoteOpacityRecursive(v)
	}
	get linkThick()   { return this._linkThick }
	set linkThick(v)  { this._linkThick = v }
	get linkOpacity() { return this._linkOpacity }
	set linkOpacity(v) { this._linkOpacity = v }

	// 递归设置连线透明度 // リンクの不透明度を再帰的に設定 // Recursively set link opacity
	setLinkOpacityRecursive(v) {
		this._linkOpacity = v
		for (const c of this.childNotes.getChildren()) c.setLinkOpacityRecursive(v)
	}

	// 递归更新所有子音符的连线外观
	// すべての子音符のリンク外観を再帰的に更新 // Recursively update link appearance for all child notes
	applyLinkStyle() {
		for (const child of this.childNotes.getChildren()) {
			if (child.linkLine) {
				child.linkLine.opacity(this._linkOpacity)
				child.linkLine.setAttrs(child.lineConfig)
			}
			child.applyLinkStyle()
		}
	}

	// 添加子音符：创建具有指定音程关系的子音符 // 子音符を追加：指定された音程関係を持つ子音符を作成 // Add child note: create a child note with the specified interval
	addNote(len, interval, delay = 0) {
		const child = new SubNote(this.stage, delay || this.delay || 0, len, interval, this)
		this.childNotes.add(child)
		this.childLinks.add(child.link)
		if (this.root) this.root._needsBuild = true
		return child
	}

	// 收集音符树所有后代（包括自身），用于 Ctrl+拖拽批量操作
	// 音符ツリーのすべての子孫（自身を含む）を収集、Ctrl+ドラッグ一括操作用
	// Collect all descendants of the note tree (including self), for Ctrl+drag batch operations
	getDescendants() {
		const result = [this]
		for (const child of this.childNotes.getChildren()) {
			result.push(...child.getDescendants())
		}
		return result
	}
	
	// 音符长度 getter/setter // 音符の長さのゲッター/セッター // Note length getter/setter
	get len() {
		return this._len
	}
	set len(l) {
		this._len = l
		this.pitchline.points([0, 0, l, 0])
		if (this.root) this.root._needsBuild = true
	}
	// 音符数据对象：供 Tone.js 播放使用 // 音符データオブジェクト：Tone.js 再生用 // Note data object: for Tone.js playback
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
	// 静音 getter/setter // ミュートのゲッター/セッター // Mute getter/setter
	get mute() {
		return this.isMuted
	}
	set mute(b) {
		this.isMuted = b
		this.pitchline.dash(b ? [10, 7] : [])
		if (this.root) this.root._needsBuild = true
	}
	// 隐藏 getter/setter：设置音符及其所有后代的透明度
	// 非表示のゲッター/セッター：音符とそのすべての子孫の不透明度を設定
	// Hidden getter/setter: sets opacity for the note and all its descendants
	get hidden() { return this._hidden }
	set hidden(v) {
		this._hidden = v
		const opacity = v ? 0.25 : this._noteOpacity
		_setHiddenRecursive(this, v, opacity)
		// 确保立即重绘
		this.pitchline.getLayer()?.batchDraw()
	}
	// 播放：触发整个音符树的声音 // 再生：音符ツリー全体の音をトリガー // Play: trigger sound for the entire note tree
	play() {
		playNotes(this.notes)
	}
	// 仅播放当前音符（不含子音符）// 現在の音符のみ再生（子音符を含まない）// Play only the current note (excluding children)
	playThis() {
		if (!this.mute) playNotes([{...this.note, time:"0i"}])
	}
	del() {
		this.destroy()
	}
	destroy() {
		if (this.root && this.root !== this) this.root._needsBuild = true
		this._part?.dispose()
		this.link?.destroy()
		super.destroy()
	}
}

// RootNote 类：根音，和弦树的顶层节点，支持拖拽（移动/拉伸头部/拉伸尾部）和 Shift 模式
// RootNote クラス：ルート音、コードツリーの最上位ノード、ドラッグ（移動/先頭伸縮/末尾伸縮）と Shift モードをサポート
// RootNote class: root note, top-level node of the chord tree, supports drag (move/stretch head/stretch tail) and Shift mode
export class RootNote extends Note {
	constructor(stage, x, y, len, hz, interval) {
		super(stage, {
			x: qh(x),
			y: hz2y(qb(y2hz(y))),
			draggable: true
		}, len, 0, interval)
		this.type = 'root'
		this._hz = hz || qb(y2hz(y))
		this._needsBuild = true   // 延迟构建，避免每次添加子音都重建

		// 拖拽开始处理器：记录初始状态、检测拖拽模式（头部/尾部/整体）、启动选区组拖拽
		// ドラッグ開始ハンドラ：初期状態を記録、ドラッグモード（先頭/末尾/全体）を検出、選択グループのドラッグを開始
		// Drag start handler: record initial state, detect drag mode (head/tail/body), start selection group drag
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
			// 选中组拖动开始
			if (window._sel?.selected?.size > 1 && window._sel.selected.has(this)) {
				window._sel._startGroupDrag()
			}
			// Ctrl+拖拽：记录整个和弦树状态
			this._ctrlChordDrag = e.evt.ctrlKey
			if (this._ctrlChordDrag) {
				this._ctrlSubs = this.root.getDescendants().slice(1).map(n => ({
					note: n, origLen: n.len, origDelay: n.delay || 0
				}))
			}
		})
		// 拖拽移动处理器：根据模式实时更新位置/长度，支持 Ctrl 和弦联动和 Shift 连锁
		// ドラッグ移動ハンドラ：モードに応じて位置/長さをリアルタイム更新、Ctrl コード連動と Shift チェーンをサポート
		// Drag move handler: update position/length in real time per mode, supports Ctrl chord sync and Shift chaining
		.on('dragmove', e => {
			switch (this.stage.dragMode) {
				case 'head':
					this.len = Math.max(10, this.origTailX - qh(this.x()))
					this.x(qh(this.x()))
					this.y(this.origY)
					// Ctrl：头部拖动时所有子音符等量缩短
					if (this._ctrlChordDrag && this._ctrlSubs) {
						const d = qh(this.x()) - qh(this.origX)
						for (const s of this._ctrlSubs) {
							s.note.len = Math.max(10, s.origLen - d)
						}
					}
					break
				case 'tail':
					this.len = Math.max(10, qt(this.stage.getRelativePointerPosition().x) - this.origX)
					this.x(this.origX)
					this.y(this.origY)
					if (this._ctrlChordDrag && this._ctrlSubs) {
						// Ctrl：尾部拖动时所有子音符等比缩放
						const ratio = this.len / (this.origLen || 1)
						for (const s of this._ctrlSubs) {
							s.note.len = Math.max(10, Math.round(s.origLen * ratio))
						}
					} else if (this.stage.isShiftMode) {
						for (const n of this.getLayer().getChildren(e => e.x() > this.x())) {
							n.shift(this.len - this.origLen)
						}
					}
					break
				case 'body':
					this.x(qh(this.x()))
					this.y(this.y())
					this.quantize()
					// Ctrl 模式下 body 拖拽根音：子音自动跟随（它们相对根音定位），无需额外处理
					if (this.stage.isShiftMode && !this._ctrlChordDrag) {
						for (const n of this.getLayer().getChildren(e => e.x() > this.x())) {
							n.shift(this.x() - this.origX, this.y() - this.origY)
						}
					}
					// 选中组整体拖动
					if (window._sel?._groupRef) {
						window._sel._syncGroupMove(this, this.x(), this.y())
					}
					break
			}
		})
		// 拖拽结束处理器：更新 Hz、重建播放 Part、结束选区组拖拽
		// ドラッグ終了ハンドラ：Hz を更新、再生 Part を再構築、選択グループドラッグを終了
		// Drag end handler: update Hz, rebuild playback Part, end selection group drag
		.on('dragend', e => {
			this.stage.isNoteDragging = false
			this.hz = y2hz(this.y())
			this.root.buildPart()
			if (this._ctrlChordDrag) {
				this._ctrlChordDrag = false
				this._ctrlSubs = null
			} else if (this.stage.isShiftMode) {
				for (const n of this.getLayer().getChildren(e => e.x() > this.x())) {
					n.hz = y2hz(n.y())
					n.buildPart()
				}
			}
			// 选中组拖动结束
			if (window._sel?._groupRef) {
				window._sel._endGroupDrag()
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
		// 防止非等比缩放时箭头变形（mark rotation:90 → scaleX↔scaleY 需交换）
		// 非等比拡大縮小時の矢印変形を防止（mark rotation:90 → scaleX↔scaleY を交換）
		// Prevent arrow distortion during non-uniform scaling (mark rotation:90 → swap scaleX↔scaleY)
		this.mark.scaleX(1 / (this.stage.scaleY() || 1))
		this.mark.scaleY(1 / (this.stage.scaleX() || 1))
		// 根据 Config 设置决定根音箭头是否显示
		// Config 設定に応じてルート音の矢印表示を決定 // Show/hide root arrow based on Config setting
		this.mark.visible(localStorage.getItem('naf_root_mark') !== '0')
		this.add(this.childLinks)
		this.updateColor()
	}
	// TAV 表示 // TAV 表記 // TAV notation
	get tav() {
		return this.interval?.n ? `{${tav(this.interval.n, this.interval.d)}}` : ''
	}
	get qhz() {
		return qb(this._hz)
	}
	// 频率 getter // 周波数ゲッター // Frequency getter
	get hz() {
		return this._hz
	}
	// 频率 setter：更新 Hz 并同步 Y 坐标、颜色和子音符
	// 周波数セッター：Hz を更新し Y 座標、色、子音符を同期
	// Frequency setter: update Hz and sync Y coordinate, color, and child notes
	set hz(p) {
		this._hz = p
		this.y(hz2y(p))
		this._interval = undefined
		this._needsBuild = true
		this.quantize()
		this.updateColor()
	}
	// 量化：将 Y 坐标吸附到最近的允许频率 // 量子化：Y 座標を最も近い許可周波数にスナップ // Quantize: snap Y coordinate to the nearest allowed frequency
	quantize() {
		this._hz = qb(y2hz(this.y()))
		this.y(hz2y(this._hz))
		for (const n of this.childNotes.children) n.quantize()
		this.updateColor()
	}
	// 更新颜色（含箭头颜色）// 色を更新（矢印の色を含む）// Update color (including arrow color)
	updateColor() {
		super.updateColor()
		const enabled = $('#config-wavecolor')?.checked
		if (this.mark) {
			const color = hzToRgbString(this.hz)
			this.mark.fill(enabled ? color : '#676681')
			this.mark.stroke(enabled ? color : 'white')
		}
	}
	// 音程 getter/setter // 音程ゲッター/セッター // Interval getter/setter
	get interval() {
		return this._interval
	}
	set interval(i) {
		const prevNotes = this.parent.getChildren(n => n.x() < this.x())
		if (prevNotes.length == 0) {
			if (i.n !== 1 || i.d !== 1) this.hz = this.hz / (this.interval?.n / this.interval?.d || 1) * i.n / i.d
			this._interval = null
		} else {
			const prev = prevNotes.reduce((a, c) => a.x() > c.x() ? a : c)
			this.hz = prev.hz * i.n / i.d
			this._interval = i
		}
		this.quantize()
	}
	// 锚定：记录当前位置用于 Shift 连锁 // アンカー：Shift チェーン用に現在位置を記録 // Anchor: record current position for Shift chaining
	anchor() {
		this.origX = this.x()
		this.origY = this.y()
	}
	// 偏移：应用到锚定位置 // シフト：アンカー位置に適用 // Shift: apply offset to anchored position
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
	// 构建 Tone.Part：将音符数据注册到 Tone.js 传输引擎
	// Tone.Part を構築：音符データを Tone.js トランスポートエンジンに登録
	// Build Tone.Part: register note data to the Tone.js transport engine
	buildPart() {
		if (this._part && !this._needsBuild) return this._part
		this._needsBuild = false
		this._part?.dispose()
		this._part = new Tone.Part((time, note) => {
			if (!sampler.loaded) return
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

// SubNote 类：子音符，通过音程关系连接到父音符，支持独立拖拽和 Ctrl 和弦联动
// SubNote クラス：子音符、音程関係で親音符に接続、独立ドラッグと Ctrl コード連動をサポート
// SubNote class: child note connected to parent via interval, supports independent drag and Ctrl chord sync
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
		this.root._needsBuild = true   // 标记需要重建，但不立即执行

		// 子音符拖拽开始：检测拖拽模式，支持 Ctrl 和弦联动重定向到根音
		// 子音符ドラッグ開始：ドラッグモードを検出、Ctrl コード連動でルート音にリダイレクト
		// Child note drag start: detect drag mode, supports Ctrl chord sync redirecting to root
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
			// 选中组拖动开始
			if (window._sel?.selected?.size > 1 && window._sel.selected.has(this)) {
				window._sel._startGroupDrag()
			}
			// Ctrl+拖拽子音：重定向到根音，记录整个和弦树状态
			this._ctrlChordDrag = e.evt.ctrlKey
			if (this._ctrlChordDrag) {
				this._ctrlStartPtrX = this.stage.getRelativePointerPosition().x
				this._ctrlOrigRootX = this.root.x()
				this._ctrlOrigRootLen = this.root.len
				this._ctrlSubs = this.root.getDescendants().slice(1).map(n => ({
					note: n, origLen: n.len, origDelay: n.delay || 0
				}))
			}
		})
		// 子音符拖拽移动：根据模式更新位置，Ctrl 模式下重定向到根音
		// 子音符ドラッグ移動：モードに応じて位置を更新、Ctrl モードではルート音にリダイレクト
		// Child note drag move: update position per mode, redirect to root under Ctrl mode
		.on('dragmove', e => {
			e.cancelBubble = true
			if (this._ctrlChordDrag) {
				const ptr = this.stage.getRelativePointerPosition()
				const deltaX = ptr.x - this._ctrlStartPtrX
				switch (this.stage.dragMode) {
					case 'body':
						// 整体平移：移动根音
						this.root.x(qh(this._ctrlOrigRootX + deltaX))
						this.pitchline.x(this.origX)
						this.pitchline.y(0)
						break
					case 'head': {
						const d = qh(deltaX)
						this.root.x(qh(this._ctrlOrigRootX + d))
						this.root.len = Math.max(10, this._ctrlOrigRootLen - d)
						this.pitchline.x(this.origX)
						this.pitchline.y(0)
						for (const s of this._ctrlSubs) {
							s.note.len = Math.max(10, s.origLen - d)
						}
						break
					}
					case 'tail': {
						const subLen = Math.max(10, qt(this.link.getRelativePointerPosition().x) - this.origX)
						const ratio = subLen / (this.origLen || 1)
						this.root.len = Math.max(10, Math.round(this._ctrlOrigRootLen * ratio))
						this.pitchline.x(this.origX)
						this.pitchline.y(0)
						for (const s of this._ctrlSubs) {
							s.note.len = Math.max(10, Math.round(s.origLen * ratio))
						}
						break
					}
				}
			} else {
				switch (this.stage.dragMode) {
					case 'head':
						this.len = Math.max(10, this.origTailX - qh(this.pitchline.x()))
						this.pitchline.x(qh(this.pitchline.x()))
						this.pitchline.y(0)
						break
					case 'tail':
						this.len = Math.max(10, qt(this.link.getRelativePointerPosition().x) - this.origX)
						this.pitchline.x(this.origX)
						this.pitchline.y(0)
						break
					case 'body':
						this.pitchline.x(qh(this.pitchline.x()))
						this.pitchline.y(0)
						this.quantize()
						// 选中组整体拖动
						if (window._sel?._groupRef) {
							window._sel._syncGroupMove(this, this.x(), this.y())
						}
						break
				}
			}
			this.delay = this.pitchline.x() - this.link.x()
			this.linkLine.setAttrs(this.lineConfig)
			this.linkContainer.clip(this.clip)
		})
		// 子音符拖拽结束：重建 Part、结束 Ctrl 和弦联动和选区组拖拽
		// 子音符ドラッグ終了：Part を再構築、Ctrl コード連動と選択グループドラッグを終了
		// Child note drag end: rebuild Part, end Ctrl chord sync and selection group drag
		.on('dragend', e => {
			this.root.buildPart()
			if (this._ctrlChordDrag) {
				this._ctrlChordDrag = false
				this._ctrlSubs = null
			}
			// 选中组拖动结束
			if (window._sel?._groupRef) {
				window._sel._endGroupDrag()
			}
		})

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
	// 子音符频率 = 父音符频率 × 音程比 // 子音符の周波数 = 親音符の周波数 × 音程比 // Child note frequency = parent frequency × interval ratio
	get hz() {
		return this.parentNote.hz * this.interval.n / this.interval.d
	}
	set hz(v) {
		this._hz = v
		this.y(hz2y(this._hz) - this.parentNote.getAbsolutePosition(this.stage).y)
		this.root._needsBuild = true
		this.updateColor()
	}
	// 子音符量化：四舍五入到最近的允许频率 // 子音符量子化：最も近い許可周波数に四捨五入 // Child note quantization: round to nearest allowed frequency
	quantize() {
		this._hz = qs(this.hz)
		this.y(hz2y(this._hz) - this.parentNote.getAbsolutePosition(this.stage).y)
		for (const n of this.childNotes.children) n.quantize()
		this.updateColor()
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
		this.root._needsBuild = true
		this.updateColor()
	}
	resolute(n = 1, d = 1) {
		return this.parentNote.resolute(n * this.interval.n, d * this.interval.d)
	}
	get root() {
		return this.parentNote.root
	}
	// 连线裁剪区域 // リンクのクリップ領域 // Link clipping region
	get clip() {
		return {
			x: this.delay + this.interval.m,
			y: this.interval.n > this.interval.d ? -1.5 : 1.5,
			width: this.len + Math.abs(this.interval.m) * 2,
			height: f2d(this.interval.d, this.interval.n) + (this.interval.n > this.interval.d ? 3 : -3)
		}
	}
	// 连线配置 // リンク設定 // Link configuration
	get lineConfig() {
		return {
			x: this.len * this.interval.t + this.delay,
			y: 0,
			points: [
				Math.sign(this.interval.t - 0.5) * - this.interval.w / 2,
				0,
				(this.len * (this.interval.b - this.interval.t) + (Math.sign(this.interval.t - 0.5) + Math.sign(this.interval.b - 0.5)) * - this.interval.w / 2) / 2 + this.interval.m,
				f2d(this.interval.d, this.interval.n) / 2,
				this.len * (this.interval.b - this.interval.t) + Math.sign(this.interval.b - 0.5) * - this.interval.w / 2,
				f2d(this.interval.d, this.interval.n)
			],
			lineCap: 'square',
			tension: 0.5,
			stroke: this.interval.c,
			strokeWidth: this.interval.w * (this.root?._linkThick || 1),
			listening: false
		}
	}

	// 提升子音符为根音：整个和弦树重新以当前音符为根
	// 子音符をルート音に昇格：コードツリー全体を現在の音符をルートとして再構築
	// Promote child note to root: rebuild the entire chord tree with this note as the new root
	promoteToRoot() {
		const oldRoot = this.root
		if (oldRoot === this) return  // 已经是根音了
		const stage = oldRoot.stage
		const layer = oldRoot.getLayer()
		if (!layer) return

		// 1. 计算提升音符的内容坐标（绝对位置，不含 stage 平移）
		const newHz = this.hz
		const newLen = this.len
		const newVolume = this.volume
		const newMute = this.isMuted
		const newHidden = this._hidden
		const newPitchThick = this._pitchThick
		const newLinkThick = this._linkThick
		const newLinkOpacity = this._linkOpacity

		// 从旧根沿路径累加 delay，得到提升音符的内容 X
		let contentX = oldRoot.x()
		const delaysToPromoted = []
		let w = this
		while (w !== oldRoot) {
			delaysToPromoted.unshift(w.delay || 0)
			w = w.parentNote
		}
		for (const d of delaysToPromoted) contentX += d
		const contentY = hz2y(newHz)

		// 2. 标记从旧根到提升音符路径上的所有节点
		const pathNodes = new Set()
		let walk = this
		while (walk && walk !== oldRoot) {
			pathNodes.add(walk)
			walk = walk.parentNote
		}
		pathNodes.add(oldRoot)

		// 3. 保存整个树的结构（全部用内容坐标，不含 stage 平移）
		const promoted = this
		const rootAbsX = oldRoot.x()
		function saveTree(note, parentAbsDelay) {
			const myAbsDelay = parentAbsDelay + (note.delay || 0)
			return {
				onPath: pathNodes.has(note),
				isPromoted: note === promoted,
				absX: rootAbsX + myAbsDelay,
				delay: note.delay || 0,
				interval: note._interval,
				hz: note.hz,
				len: note.len,
				vol: note.volume,
				mute: note.isMuted,
				hidden: note._hidden,
				pt: note._pitchThick,
				lt: note._linkThick,
				lo: note._linkOpacity,
				kids: note.childNotes.getChildren().map(c => saveTree(c, myAbsDelay))
			}
		}
		const fullTree = saveTree(oldRoot, 0)

		// 4. 摧毁旧根
		oldRoot.destroy()

		// 5. 创建新根（提升的音符），用内容坐标
		const newRoot = new RootNote(stage, contentX, contentY, newLen, newHz)
		newRoot.volume = newVolume
		newRoot.mute = newMute
		newRoot.hidden = newHidden
		newRoot._pitchThick = newPitchThick
		newRoot._linkThick = newLinkThick
		newRoot._linkOpacity = newLinkOpacity
		newRoot.pitchline.strokeWidth(newPitchThick)
		layer.add(newRoot)

		// 6. 在树结构中找到提升节点和从旧根到提升节点的路径
		function findPromoted(tree) {
			if (tree.isPromoted) return tree
			for (const c of tree.kids) {
				const f = findPromoted(c)
				if (f) return f
			}
			return null
		}
		const promotedTree = findPromoted(fullTree)

		function findPath(tree, path) {
			path.push(tree)
			if (tree.isPromoted) return path
			for (const c of tree.kids) {
				const r = findPath(c, [...path])
				if (r) return r
			}
			return null
		}
		const path = findPath(fullTree, [])

		// 7. 辅助：区间取逆
		const findInvInterval = (interval) => {
			if (!interval) return null
			const negId = -interval.id
			for (const [, pi] of Object.entries(pitchIntervals)) {
				if (pi.id === negId) return pi
			}
			return { ...interval, id: negId, n: interval.d, d: interval.n, b: 1 - interval.b, t: 1 - interval.t, m: -interval.m }
		}

		// 8. 递归还原子树
		const addSubtree = (parent, tree, parentAbsX) => {
			const interval = tree.onPath ? findInvInterval(tree.interval) : tree.interval
			if (!interval) return
			const delay = tree.absX - parentAbsX
			const child = parent.addNote(tree.len, interval, delay)
			child.volume = tree.vol
			child.mute = tree.mute
			child.hidden = tree.hidden
			child._pitchThick = tree.pt
			child._linkThick = tree.lt
			child._linkOpacity = tree.lo
			child.pitchline.strokeWidth(tree.pt)
			if (child.linkLine) child.linkLine.opacity(tree.lo)
			for (const k of tree.kids) {
				addSubtree(child, k, tree.absX)
			}
		}

		// 9. 先添加提升音符的直接子音
		let parentAbsX = contentX
		for (const k of promotedTree.kids) {
			if (!k.onPath) {
				addSubtree(newRoot, k, parentAbsX)
			}
		}

		// 10. 逆序构建路径：将旧根→提升反转为提升→旧根
		let attachTo = newRoot
		for (let i = path.length - 2; i >= 0; i--) {
			const pathNode = path[i]
			const childOnPath = path[i + 1]
			const invInterval = findInvInterval(childOnPath.interval)
			if (!invInterval) continue
			const delay = pathNode.absX - parentAbsX
			const sub = attachTo.addNote(pathNode.len, invInterval, delay)
			sub.volume = pathNode.vol
			sub.mute = pathNode.mute
			sub.hidden = pathNode.hidden
			sub._pitchThick = pathNode.pt
			sub._linkThick = pathNode.lt
			sub._linkOpacity = pathNode.lo
			sub.pitchline.strokeWidth(pathNode.pt)
			if (sub.linkLine) sub.linkLine.opacity(pathNode.lo)
			// 添加 pathNode 的非路径子音
			for (const k of pathNode.kids) {
				if (!k.onPath) {
					addSubtree(sub, k, pathNode.absX)
				}
			}
			parentAbsX = pathNode.absX
			attachTo = sub
		}

		layer.batchDraw()
		return newRoot
	}
}

// 深度递归设置音符及其所有后代（子、孙、曾孙…）的隐藏状态
// 音符とそのすべての子孫（子、孫、ひ孫…）の非表示状態を深さ優先で再帰的に設定
// Depth-first recursive set hidden state for a note and all its descendants (children, grandchildren, etc.)
function _setHiddenRecursive(note, hidden, opacity) {
	note._hidden = hidden
	note.pitchline.opacity(opacity)
	if (note.mark) note.mark.opacity(opacity)
	for (const child of note.childNotes.getChildren()) {
		_setHiddenRecursive(child, hidden, opacity)
	}
}
