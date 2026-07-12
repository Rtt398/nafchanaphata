/*
 * 音序器主模块 — Konva 舞台初始化、音符创建、拖拽/捏合事件处理、播放交互
 * シーケンサーメインモジュール — Konvaステージ初期化、音符作成、ドラッグ・ピンチイベント処理、再生インタラクション
 * Sequencer main module — Konva stage initialization, note creation, drag/pinch event handling, playback interaction
 */

import {makePincher} from './pincher.js'
import {Grid} from './grid.js'
import {RootNote} from './note.js'
import history from './history.js'
import { x2t, qh, OFFSET } from './util.js'

// Konva 舞台设置：全屏可拖拽画布
// Konvaステージ設定：全画面ドラッグ可能キャンバス
// Konva stage setup: fullscreen draggable canvas
export const stage = new Konva.Stage({
	container: 'sequencer',
	width: window.innerWidth,
	height: window.innerHeight,
	draggable: true
})
makePincher(stage)

// 网格与根音符图层初始化
// グリッドとルート音符レイヤーの初期化
// Grid and root note layer initialization
export const grid = new Grid(stage)
export const rootlayer = new Konva.Layer()

stage.add(grid)
stage.add(rootlayer)

// 指针点击事件处理器：音符创建、播放线跳转、选区管理
// ポインタークリックイベントハンドラ：音符作成、再生線ジャンプ、選択管理
// Pointer click event handler: note creation, playback line jump, selection management
stage.on('pointerclick', e => {
	try {
	if (stage.isDragging() || stage.isPinching || e.evt.button != 0 || stage.isNoteDragging) return
	// selection 系统设置了 _preventClick → 跳过音符创建 / selectionシステムが_preventClickを設定→音符作成をスキップ / Selection system set _preventClick → skip note creation
	if (window._sel?._preventClick) return
	const pos = stage.getRelativePointerPosition()
	// 非卷帘模式：点击移动播放线（播放中则直接跳转继续播放）
	// 非ピアノロールモード：クリックで再生線を移動（再生中は直接ジャンプして続行）
	// Non-piano-roll mode: click moves playback line (during playback, jumps directly and continues)
	if (!grid._pianoRoll) {
		Tone.Transport.ticks = x2t(pos.x) + OFFSET
	}
	// 记录最后点击位置（供 Ctrl+V 粘贴使用）
	// 最後のクリック位置を記録（Ctrl+V貼り付け用）
	// Record last click position (for Ctrl+V paste)
	if (window._sel) { window._sel._lastClickX = pos.x; window._sel._lastClickY = pos.y }
	// 框选后或 Shift 松开 1s 内不创建音符
	// 範囲選択後またはShift解除後1秒以内は音符を作成しない
	// Don't create note within 1s after box selection or Shift release
	if (window._sel?._preventClick) return
	// Shift+点击空白不创建音符、不清除选区
	// Shift+空白クリックは音符を作成せず、選択もクリアしない
	// Shift+click on empty space: don't create note, don't clear selection
	if (e.evt.shiftKey) return
	// 点击空白清除选区
	// 空白クリックで選択をクリア
	// Click empty space to clear selection
	if (window._sel) window._sel.clear()
	history.snapshot()
	const tickEl = document.getElementById('config-tick')
	const tick = tickEl ? (parseInt(tickEl.value) || 1) : 1
	const fixLenEl = document.getElementById('config-fixed-note-len')
	const len = (fixLenEl?.checked && tick >= 1) ? 48 / tick : 48
	// 点击时用量化位置创建音符，之后音符不再受分辨率影响
	const root = new RootNote(stage, qh(pos.x), pos.y, len)
	rootlayer.add(root)
	stage.current = root
	root.playThis()
	rootlayer.draw()
	grid.autoLoop()
	} catch(err) { console.error('pointerclick error:', err) }
})

// 单个音符拖拽结束后自动更新循环箭头
// 単一音符ドラッグ終了後に自動でループ矢印を更新
// Auto-update loop arrows after single note drag ends
rootlayer.on('dragend', () => setTimeout(() => grid.autoLoop(), 0))

// 舞台拖拽移动事件：更新网格位置
// ステージドラッグ移動イベント：グリッド位置を更新
// Stage drag move event: update grid position
stage.on('dragmove', e => grid.adjust())
// 舞台捏合缩放事件：重绘谱线并修复箭头缩放
// ステージピンチズームイベント：スコアライン再描画と矢印スケール修正
// Stage pinch zoom event: redraw scorelines and fix arrow scale
stage.on('pinchmove', e => {
//	console.log('pinching')
	grid.drawScorelines()
	grid.drawBeatlines()
	grid.fixArrowScale()
	grid.adjust()
})
