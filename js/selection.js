/*
 * 选区模块：管理音符多选、框选、复制/剪切/粘贴、选区组拖拽等功能
 * 選択モジュール：音符の複数選択、範囲選択、コピー/カット/ペースト、選択グループのドラッグなどを管理
 * Selection module: manages multi-note selection, marquee selection, copy/cut/paste, selection group drag, etc.
 */

import { stage, grid, rootlayer } from './sequencer.js'
import { RootNote, SubNote } from './note.js'
import { t2x, x2t, y2hz, pitchIntervals, f2d } from './util.js'
import history from './history.js'

// Select 对象：集中管理所有选区状态和操作
// Select オブジェクト：すべての選択状態と操作を集中的に管理
// Select object: centralized management of all selection state and operations
export const Select = {
	selected: new Set(),
	clipboard: [],

	_rect: null,
	_layer: null,
	_origin: null,
	_dragging: false,
	_preventClick: false,

	// 挂载：创建选区专用图层并绑定事件
	// マウント：選択専用レイヤーを作成しイベントをバインド
	// Mount: create selection-dedicated layer and bind events
	mount() {
		this._layer = new Konva.Layer()
		stage.add(this._layer)
		this._bind()
	},

	// 绑定框选事件：Shift+拖拽绘制矩形选区
	// 範囲選択イベントをバインド：Shift+ドラッグで矩形選択を描画
	// Bind marquee selection events: Shift+drag to draw rectangular selection
	_bind() {
		// Shift + drag → 框选
		stage.on('pointerdown.select', e => {
			if (!e.evt.shiftKey || e.evt.button !== 0) return
			if (stage.isDragging() || stage.isNoteDragging) return
			// Shift+pointerdown → 立即阻止后续 click 创建音符
			this._preventClick = true
			// 临时禁止 stage 平移
			this._wasDraggable = stage.draggable()
			stage.draggable(false)
			e.evt.stopPropagation()
			const pos = stage.getRelativePointerPosition()
			this._origin = { x: pos.x, y: pos.y }
			this._dragging = true
			this._rect = new Konva.Rect({
				x: pos.x, y: pos.y, width: 0, height: 0,
				fill: 'rgba(100,160,255,0.12)',
				stroke: 'rgba(100,160,255,0.5)',
				strokeWidth: 1, dash: [4, 4]
			})
			this._layer.add(this._rect)
		})

		// 框选移动：实时更新矩形大小 // 範囲選択移動：矩形のサイズをリアルタイム更新 // Marquee move: update rectangle size in real time
		stage.on('pointermove.select', e => {
			if (!this._dragging || !this._rect || !this._origin) return
			const pos = stage.getRelativePointerPosition()
			const x = Math.min(this._origin.x, pos.x)
			const y = Math.min(this._origin.y, pos.y)
			this._rect.setAttrs({ x, y,
				width: Math.abs(pos.x - this._origin.x),
				height: Math.abs(pos.y - this._origin.y)
			})
			this._layer.draw()
		})

		// 松手 → 完成框选
		// マウスアップ → 範囲選択を完了 // Mouse up → complete marquee selection
		stage.on('pointerup.select', e => {
			// 恢复 stage 平移
			if (this._wasDraggable !== undefined) {
				stage.draggable(this._wasDraggable)
				this._wasDraggable = undefined
			}
			if (!this._dragging) return
			this._dragging = false
			if (!this._rect || !this._origin) return

			const r = this._rect.getClientRect()
			this._layer.destroyChildren()
			this._layer.draw()
			this._rect = null
			this._origin = null

			// 矩形太小（< 5px）视为点击，不处理框选（避免与Shift+点击切换冲突）
			if (Math.abs(r.width) < 5 && Math.abs(r.height) < 5) {
				clearTimeout(this._preventTimer)
				this._preventTimer = setTimeout(() => { this._preventClick = false }, 300)
				return
			}

			// 找框内音符
			this.clear()
			for (const root of rootlayer.getChildren()) {
				if (this._hitNote(root, r)) this.selected.add(root)
				for (const sub of root.childNotes.getChildren()) {
					if (this._hitNote(sub, r)) this.selected.add(sub)
				}
			}
			this._highlight()
			clearTimeout(this._preventTimer)
			// 框选到音符：延长禁止创建；空框：短时间禁止
			const delay = this.selected.size > 0 ? 1200 : 600
			this._preventClick = true
			this._preventTimer = setTimeout(() => { this._preventClick = false }, delay)
		})
	},

	// 碰撞检测：判断音符是否与矩形选区相交
	// 衝突判定：音符が矩形選択範囲と交差するかを判定
	// Hit test: check if a note intersects with the selection rectangle
	_hitNote(note, rect) {
		const abs = note.pitchline.absolutePosition()
		return (
			abs.x < rect.x + rect.width &&
			abs.x + note.len > rect.x &&
			abs.y < rect.y + rect.height &&
			abs.y + 10 > rect.y
		)
	},

	// 高亮渲染：为所有选中音符绘制蓝色高亮覆盖层
	// ハイライト描画：選択されたすべての音符に青色のハイライトオーバーレイを描画
	// Highlight rendering: draw blue highlight overlay on all selected notes
	_highlight() {
		for (const n of rootlayer.getChildren()) {
			n._highlightRect?.destroy(); n._highlightRect = null
			for (const s of n.childNotes.getChildren()) {
				s._highlightRect?.destroy(); s._highlightRect = null
			}
		}
		// 为选中组建立拖动同步
		for (const note of this.selected) {
			if (!note.pitchline) continue
			const h = new Konva.Rect({
				x: 0, y: note.pitchline.y() - 4,
				width: note.len, height: 12,
				fill: 'rgba(100,160,255,0.2)',
				stroke: 'rgba(100,160,255,0.6)',
				strokeWidth: 1, listening: false, name: 'highlight'
			})
			note.add(h)
			note._highlightRect = h
		}
		rootlayer.batchDraw()
	},

	// 切换单个音符的选中状态 // 単一音符の選択状態を切り替え // Toggle selection state of a single note
	toggleNote(note) {
		if (this.selected.has(note)) {
			this.selected.delete(note)
			note._highlightRect?.destroy()
			note._highlightRect = null
		} else {
			this.selected.add(note)
		}
		this._highlight()
	},

	// 全选：选中所有根音和子音符 // すべて選択：すべてのルート音と子音符を選択 // Select all: select every root and sub note
	selectAll() {
		this.clear()
		for (const root of rootlayer.getChildren()) {
			this.selected.add(root)
			for (const sub of root.childNotes.getChildren()) {
				this.selected.add(sub)
			}
		}
		this._highlight()
	},

	// 选区组拖拽开始：记录所有 RootNote 的初始位置
	// 選択グループドラッグ開始：すべての RootNote の初期位置を記録
	// Selection group drag start: record initial positions of all RootNotes
	_startGroupDrag() {
		this._groupRef = new Map()
		for (const n of this.selected) {
			// 只跟踪RootNote；SubNote作为Konva子节点会随父音符自动移动
			if (n instanceof RootNote) {
				this._groupRef.set(n, { x: n.x(), y: n.y() })
			}
		}
	},
	// 选区组同步移动：根据拖拽音的位置偏移同步移动其他选中音符
	// 選択グループ同期移動：ドラッグ中の音符の位置オフセットに基づいて他の選択音符を同期移動
	// Selection group sync move: move other selected notes based on dragged note's position offset
	_syncGroupMove(dragged, cx, cy) {
		if (!this._groupRef) return
		const ref = this._groupRef.get(dragged)
		if (!ref) return
		const dx = cx - ref.x
		const dy = cy - ref.y
		for (const [n, r] of this._groupRef) {
			if (n === dragged) continue
			n.position({ x: r.x + dx, y: r.y + dy })
			// 临时更新_hz使拖动过程中颜色能实时变化
			n._hz = y2hz(r.y + dy)
			n.updateColor()
		}
	},
	// 选区组拖拽结束：根据最终位置更新 Hz 并重建 Part
	// 選択グループドラッグ終了：最終位置に基づいて Hz を更新し Part を再構築
	// Selection group drag end: update Hz based on final position and rebuild Parts
	_endGroupDrag() {
		if (!this._groupRef) return
		for (const [n, r] of this._groupRef) {
			// n是RootNote：根据最终Y位置更新Hz（内部会调用quantize和updateColor）
			n.hz = y2hz(n.y())
			n.buildPart()
		}
		this._groupRef = null
	},

	// 清除选区：移除所有高亮并清空选中集合
	// 選択解除：すべてのハイライトを削除し選択セットをクリア
	// Clear selection: remove all highlights and empty the selection set
	clear() {
		for (const note of this.selected) {
			note._highlightRect?.destroy()
			note._highlightRect = null
		}
		this.selected.clear()
		this._groupRef = null
		grid.autoLoop()
		rootlayer.batchDraw()
	},

	// 删除选中音符：销毁所有选中音符并记录历史
	// 選択音符を削除：選択されたすべての音符を破棄し履歴を記録
	// Delete selected notes: destroy all selected notes and record history
	deleteSelected() {
		if (this.selected.size === 0) return
		history.snapshot()
		for (const note of this.selected) note.destroy()
		this.selected.clear()
		grid.autoLoop()
		rootlayer.batchDraw()
	},

	// 剪切：复制后删除 // カット：コピーしてから削除 // Cut: copy then delete
	cut() {
		if (this.selected.size === 0) return
		this.copy()
		this.deleteSelected()
	},

	// 复制：将选中音符序列化为剪贴板 JSON 数组
	// コピー：選択音符をクリップボード JSON 配列にシリアライズ
	// Copy: serialize selected notes into clipboard JSON array
	copy() {
		if (this.selected.size === 0) return
		this.clipboard = []
		for (const note of this.selected) {
			const j = this._noteToJson(note)
			if (j) this.clipboard.push(j)
		}
	},

	// 粘贴到指定位置：将剪贴板中的音符粘贴到给定舞台坐标
	// 指定位置に貼り付け：クリップボードの音符を指定されたステージ座標に貼り付け
	// Paste at position: paste clipboard notes at the given stage coordinates
	pasteAt(stageX, stageY) {
		if (this.clipboard.length === 0) return
		// 防止短时间内重复粘贴（按键重复、双重事件等）
		const now = performance.now()
		if (now - (this._lastPasteTime || 0) < 200) return
		this._lastPasteTime = now
		history.snapshot()
		const roots = this.clipboard.filter(j => j._isRoot)
		const first = roots.length ? roots[0] : this.clipboard[0]
		let dx = stageX - first.x
		let dy = stageY - first.y
		// 确保粘贴结果在可见区域内
		const sx = stage.scaleX(), sy = stage.scaleY()
		const visX = -stage.x() / sx
		const visY = -stage.y() / sy
		const visW = stage.width() / sx
		const visH = stage.height() / sy
		const targetX = first.x + dx
		const targetY = first.y + dy
		if (targetX < visX - 50 || targetX > visX + visW + 50 ||
			targetY < visY - 50 || targetY > visY + visH + 50) {
			// 目标位置不可见 → 贴到屏幕中心
			dx = (visX + visW * 0.3) - first.x
			dy = (visY + visH * 0.4) - first.y
		}
		// 如果粘贴位置和原位太近，偏移避免重叠
		const ox = (Math.abs(dx) < 10 && Math.abs(dy) < 10) ? 48 : dx
		const oy = (Math.abs(dx) < 10 && Math.abs(dy) < 10) ? 20 : dy

		const pasted = []
		for (const j of this.clipboard) {
			if (j._isRoot) {
				const n = this._jsonToRoot(j, ox, oy)
				if (n) pasted.push(n)
			}
		}
		this.clear()
		for (const n of pasted) this.selected.add(n)
		this._highlight()
		grid.autoLoop()
	},

	// 音符序列化为 JSON：递归保存音符的所有属性
	// 音符を JSON にシリアライズ：音符のすべての属性を再帰的に保存
	// Serialize note to JSON: recursively save all note properties
	_noteToJson(note) {
		if (!note.pitchline) return null
		return {
			x: note.x(), y: note.y(), len: note.len,
			hz: note.hz, mute: note.mute || false,
			hidden: note.hidden || false,
			vol: note.volume || 50,
			pitchThick: note._pitchThick,
			linkThick: note._linkThick,
			linkOpacity: note._linkOpacity,
			noteOpacity: note._noteOpacity,
			tick: note._tick,
			_isRoot: note instanceof RootNote,
			intId: note._interval?.id,
			delay: note.delay || 0,
			_hz: note._hz,
			children: note.childNotes?.children?.map(c => this._noteToJson(c)).filter(Boolean) || []
		}
	},

	// JSON 还原为 RootNote：包含完整和弦树
	// JSON から RootNote を復元：完全なコードツリーを含む
	// Restore RootNote from JSON: including the full chord tree
	_jsonToRoot(json, ox, oy) {
		const note = new RootNote(stage, json.x + ox, json.y + oy, json.len, null, null, json.tick)
		rootlayer.add(note)
		note.mute = json.mute
		note.hidden = json.hidden || false
		note.volume = json.vol
		if (json.pitchThick) note._pitchThick = json.pitchThick
		if (json.linkThick) note._linkThick = json.linkThick
		if (json.linkOpacity) note._linkOpacity = json.linkOpacity
		if (json.noteOpacity != null) note._noteOpacity = json.noteOpacity
		if (json.tick) note._tick = json.tick
		note.pitchline.strokeWidth(note._pitchThick)
		note.pitchline.opacity(note._noteOpacity)
		if (note.mark) note.mark.opacity(note._noteOpacity)
		// 恢复子音符
		for (const cj of json.children || []) {
			this._jsonToSub(note, cj, 0, 0)
		}
		return note
	},

	// JSON 还原 SubNote：递归添加子音符及其子后代
	// JSON から SubNote を復元：子音符とその子孫を再帰的に追加
	// Restore SubNote from JSON: recursively add child notes and their descendants
	_jsonToSub(parent, json, ox, oy) {
		const id = json.intId || 0
		// 自定义维度 id ≥ 100：查找 "cN" 键
		let key
		if (id >= 100) key = 'c' + (id - 100)
		else if (id <= -100) key = '-c' + (-id - 100)
		else key = id + 'd'
		const interval = pitchIntervals[key] || pitchIntervals['1d']
		const sub = parent.addNote(json.len, interval, json.delay + ox)
		sub.mute = json.mute
		sub.hidden = json.hidden || false
		sub.volume = json.vol
		// 注意：不设置 sub.hz，因为构造函数已基于父音当前（偏移后）位置正确计算
		// 若用原始 json.hz/json._hz 覆盖，会抵消父音偏移，导致子音偏移丢失
		if (json.pitchThick) sub._pitchThick = json.pitchThick
		if (json.linkThick) sub._linkThick = json.linkThick
		if (json.linkOpacity) sub._linkOpacity = json.linkOpacity
		if (json.noteOpacity != null) sub._noteOpacity = json.noteOpacity
		if (json.tick) sub._tick = json.tick
		sub.pitchline.strokeWidth(sub._pitchThick)
		sub.pitchline.opacity(sub._noteOpacity)
		if (sub.linkLine) sub.linkLine.opacity(sub._linkOpacity)
		for (const cj of json.children || []) {
			this._jsonToSub(sub, cj, 0, 0)
		}
	}
}
