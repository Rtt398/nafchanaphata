/*
 * 主应用模块：初始化、键盘绑定、Config 面板、自定义维度系统、扩展快捷键、导入/导出和缩放控制
 * メインアプリケーションモジュール：初期化、キーバインド、Config パネル、カスタム次元システム、拡張ショートカット、インポート/エクスポート、ズーム制御
 * Main application module: initialization, keyboard bindings, Config panel, custom dimension system, ext shortcuts, import/export and zoom control
 */

import { $, $$, pitchIntervals, x2t, OFFSET } from './util.js';
import { Serializer } from './serialize.js';
import history from './history.js';
import { switchTones } from './sound.js';
import { stage, grid, rootlayer } from './sequencer.js';
import { i18n, t } from './i18n.js';
import { bindKeys } from './keybinds.js';
import { exportMidi, exportMidi12TET, exportMidiMicrotonal, exportMidiCustomEDO, exportWav, importMidi, importMidiMicrotonal } from './midi.js';
import { Select } from './selection.js';

// 初始化键盘绑定和选区模块 // キーバインドと選択モジュールを初期化 // Initialize keyboard bindings and selection module
bindKeys()
Select.mount()
window._sel = Select  // 供内联脚本 Ctrl+C/V/X/D 使用
let _stopEventId = null  // 自动停止调度ID
scrollTo(0, 0)
if (location.hostname == 'localhost') {
	import('./test.js')
}

// 语言优先级：localStorage > 浏览器语言 > HTML 默认值
// 言語優先順位：localStorage > ブラウザ言語 > HTML デフォルト値
// Language priority: localStorage > browser language > HTML default
{
	const savedLang = localStorage.getItem('naf_lang')
	const browserLang = navigator.language?.split('-')[0]
	const defaultLang = savedLang || (['ja','zh','sf'].includes(browserLang) ? browserLang : 'en')
	i18n(defaultLang)
	$('#config-lang').value = defaultLang
}

// Konva 拖拽命中检测 // Konva ドラッグヒット検出 // Konva drag hit detection
Konva.hitOnDragEnabled = true
scrollTo(0, 0)

// 窗口大小调整：同步 Konva Stage // ウィンドウリサイズ：Konva Stage を同期 // Window resize: sync Konva Stage
window.addEventListener('resize', e => {
	stage.size({
		width: window.innerWidth,
		height: window.innerHeight
	})
	scrollTo(0, 0)
})

// 关闭弹窗：点击遮罩层 // ポップアップを閉じる：オーバーレイクリック // Close popup: click overlay
$('#overlay').addEventListener('pointerdown', function(e) {
	stage.current?.root.buildPart()
	this.style.visibility = ''
	for (const i of $$('.pop-up')) { i.style.top = ''; i.style.visibility = '' }
	scrollTo(0, 0)
})

// ========== Config 面板按钮 ==========
// ========== Config パネルボタン ==========
// ========== Config panel buttons ==========

// 打开 Config // Config を開く // Open Config
$('#config-btn').addEventListener('click', e => {
	$(`#overlay`).style.visibility = "visible"
	$('#config').style.top = '1.5rem'
	$('#tone-caption').innerText
})

// 打开帮助 // ヘルプを開く // Open Help
$('#help-btn').addEventListener('click', e => {
	$('#overlay').style.visibility = 'visible'
	$('#help').style.top = '1.5rem'
	$('#help').style.visibility = 'visible'
})

// 语言切换 // 言語切り替え // Language switch
$('#config-lang').addEventListener('change', function(e) {
	i18n(this.value)
	localStorage.setItem('naf_lang', this.value)
})

// ========== Config 绑定：全局参数变更处理 ==========
// ========== Config バインド：グローバルパラメータ変更ハンドラ ==========
// ========== Config bindings: global parameter change handlers ==========

// 节拍速度 // 拍子速度 // Beat tempo
$('#config-beat').addEventListener('change', function(e) {
	grid.beat = this.value
})
// 细分线 // 分割線 // Subdivision lines
$('#config-subdivide-lines').addEventListener('change', function(e) {
	grid.drawBeatlines()
})
// Tick // Tick
$('#config-tick').addEventListener('change', function(e) {
	if ($('#config-subdivide-lines')?.checked) grid.drawBeatlines()
})
// 主音频率 // 主音周波数 // Tonic frequency
$('#config-tonic').addEventListener('change', function(e) {
	grid.tonic = this.value
})
// 乐谱线（1d-4d）// スコアライン（1d-4d）// Score lines (1d-4d)
$('#config-scoreline-1d').addEventListener('change', function(e) {
	grid.drawScorelines()
})
$('#config-scoreline-2d').addEventListener('change', function(e) {
	grid.drawScorelines()
})
$('#config-scoreline-3d').addEventListener('change', function(e) {
	grid.drawScorelines()
})
$('#config-scoreline-4d').addEventListener('change', function(e) {
	grid.drawScorelines()
})
// 启用 6d/7d 维度 // 6d/7d 次元を有効化 // Enable 6d/7d dimensions
$('#config-enable-6d').addEventListener('change', function(e) {
	for (const i of $$('.btn-6d')) {
		i.style.display = this.checked ? "unset" : ""
	}
})
$('#config-enable-7d').addEventListener('change', function(e) {
	for (const i of $$('.btn-7d')) {
		i.style.display = this.checked ? "unset" : ""
	}
})
// 音符颜色：三选项互斥
// 音符の色：3 オプション排他選択 // Note color: 3 mutually exclusive options
$('#config-color-wavelength').addEventListener('change', function(e) {
	if (!this.checked) { this.checked = true; return }
	$('#config-color-hsl').checked = false
	$('#config-color-white').checked = false
	for (const n of rootlayer.getChildren()) n.updateColorRecursive()
	rootlayer.batchDraw()
})
$('#config-color-hsl').addEventListener('change', function(e) {
	if (!this.checked) { this.checked = true; return }
	$('#config-color-wavelength').checked = false
	$('#config-color-white').checked = false
	for (const n of rootlayer.getChildren()) n.updateColorRecursive()
	rootlayer.batchDraw()
})
$('#config-color-white').addEventListener('change', function(e) {
	if (!this.checked) { this.checked = true; return }
	$('#config-color-wavelength').checked = false
	$('#config-color-hsl').checked = false
	for (const n of rootlayer.getChildren()) n.updateColorRecursive()
	rootlayer.batchDraw()
})

// 全局：音符横线粗细
// グローバル：音符の横線の太さ // Global: note pitch line thickness
$('#config-note-thickness').addEventListener('input', function(e) {
	const v = parseFloat(this.value)
	for (const n of rootlayer.getChildren()) n.setPitchThickRecursive(v)
	rootlayer.batchDraw()
})

// 全局：音符透明度 — 使用 layer 级 opacity 避免每帧 N 次 GPU 合成
// グローバル：音符の不透明度 — layerレベルで一度だけ合成 // Global: note opacity — layer-level to avoid per-frame N GPU blends
$('#config-note-opacity').addEventListener('input', function(e) {
	const v = parseInt(this.value) / 100
	rootlayer.opacity(v)  // layer 级：所有音符一次 GPU 合成，而非逐个 shape 做 alpha blending
	for (const n of rootlayer.getChildren()) n._noteOpacity = v  // 记录值供弹窗读取
	rootlayer.batchDraw()
})

// 全局：维度连线粗细
// グローバル：次元リンクの太さ // Global: dimension link thickness
$('#config-link-thickness').addEventListener('input', function(e) {
	const v = parseFloat(this.value)
	for (const n of rootlayer.getChildren()) {
		n.linkThick = v
		n.applyLinkStyle()
	}
	rootlayer.batchDraw()
})

// 全局：维度连线透明度
// グローバル：次元リンクの不透明度 // Global: dimension link opacity
$('#config-link-opacity').addEventListener('input', function(e) {
	const v = parseInt(this.value) / 100
	for (const n of rootlayer.getChildren()) {
		n.setLinkOpacityRecursive(v)
		n.applyLinkStyle()
	}
	rootlayer.batchDraw()
})

// 根音箭头显示开关 // ルート音矢印表示切替 // Root arrow display toggle
$('#config-root-mark').addEventListener('change', function(e) {
	const show = this.checked
	localStorage.setItem('naf_root_mark', show ? '1' : '0')
	for (const n of rootlayer.getChildren()) {
		if (n.mark) n.mark.visible(show)
	}
	rootlayer.batchDraw()
})

// ========== 背景自定义：颜色 / 透明度 / 图片 ==========
// ========== 背景カスタマイズ：色 / 透明度 / 画像 ==========
// ========== Background customization: color / opacity / image ==========

// 应用背景设置到 #sequencer // 背景設定を #sequencer に適用 // Apply background settings to #sequencer
function applyBackground() {
	const seq = $('#sequencer')
	const color = $('#config-bg-color').value
	const opacity = parseInt($('#config-bg-opacity').value) / 100
	const image = localStorage.getItem('naf_bg_image') || ''

	// 同步颜色条显示 // カラーバーを同期 // Sync color bar
	$('#config-bg-color-bar').style.background = color

	// 将 hex 转为 rgba // hex を rgba に変換 // Convert hex to rgba
	const r = parseInt(color.slice(1, 3), 16)
	const g = parseInt(color.slice(3, 5), 16)
	const b = parseInt(color.slice(5, 7), 16)
	const rgba = `rgba(${r},${g},${b},${opacity})`

	if (image) {
		// 有图片：用 linear-gradient 做半透明颜色叠加
		seq.style.background = `linear-gradient(${rgba}, ${rgba}), url(${image})`
		seq.style.backgroundSize = 'auto, cover'
		seq.style.backgroundPosition = 'center'
		seq.style.backgroundRepeat = 'no-repeat'
		seq.style.backgroundColor = ''
	} else {
		seq.style.background = ''
		seq.style.backgroundColor = rgba
	}

	// 持久化 // 永続化 // Persist
	localStorage.setItem('naf_bg_color', color)
	localStorage.setItem('naf_bg_opacity', $('#config-bg-opacity').value)
}

// 颜色选择 // 色選択 // Color picker
$('#config-bg-color').addEventListener('input', applyBackground)

// 透明度滑块 // 透明度スライダー // Opacity slider
$('#config-bg-opacity').addEventListener('input', applyBackground)

// URL 输入 // URL 入力 // URL input
$('#config-bg-image-url').addEventListener('change', function(e) {
	const url = this.value.trim()
	if (url) {
		localStorage.setItem('naf_bg_image', url)
		$('#config-bg-image-clear').style.display = ''
	} else {
		localStorage.removeItem('naf_bg_image')
		$('#config-bg-image-clear').style.display = 'none'
	}
	applyBackground()
})

// 选择本地文件 // ローカルファイル選択 // Choose local file
$('#config-bg-image-choose').addEventListener('click', function(e) {
	$('#config-bg-image-file').click()
})

// 文件读取 // ファイル読み込み // File reader
$('#config-bg-image-file').addEventListener('change', function(e) {
	const file = this.files[0]
	if (!file) return
	const reader = new FileReader()
	reader.onload = function(ev) {
		const dataUrl = ev.target.result
		localStorage.setItem('naf_bg_image', dataUrl)
		$('#config-bg-image-clear').style.display = ''
		$('#config-bg-image-url').value = ''
		applyBackground()
	}
	reader.readAsDataURL(file)
})

// 清除背景图片 // 背景画像をクリア // Clear background image
$('#config-bg-image-clear').addEventListener('click', function(e) {
	localStorage.removeItem('naf_bg_image')
	$('#config-bg-image-url').value = ''
	$('#config-bg-image-file').value = ''
	this.style.display = 'none'
	applyBackground()
})

// 初始化：从 localStorage 恢复背景设置 // 初期化：localStorage から背景設定を復元 // Init: restore background from localStorage
{
	const savedColor = localStorage.getItem('naf_bg_color')
	const savedOpacity = localStorage.getItem('naf_bg_opacity')
	const savedImage = localStorage.getItem('naf_bg_image')
	if (savedColor) $('#config-bg-color').value = savedColor
	if (savedOpacity) $('#config-bg-opacity').value = savedOpacity
	if (savedImage) {
		$('#config-bg-image-clear').style.display = ''
	}
	applyBackground()
}

// 卷帘模式切换 // ピアノロールモード切替 // Piano roll mode toggle
$('#config-pianoroll').addEventListener('change', function(e) {
	grid.setPianoRoll(this.checked)
})



// 音色切换 // 音色切り替え // Tone switch
$('#config-tone').addEventListener('change', function(e) {
	switchTones(this.value)
	$('#tone-caption').innerText = "　" + this.selectedOptions[0].dataset.caption
})

// Shift 模式 // Shift モード // Shift mode
$('#shift-mode-btn').addEventListener('change', e => {
	stage.isShiftMode = $('#shift-mode-btn').checked
})

// 撤销 // 元に戻す // Undo
$('#undo-btn').addEventListener('click', e => {
	history.restore()
})

// 清除所有音符 // すべての音符をクリア // Clear all notes
$('#clear-btn').addEventListener('click', e => {
	history.snapshot()
	rootlayer.destroyChildren()
	rootlayer.draw()
	grid.autoLoop()
})

// 播放/暂停：控制 Tone.js Transport
// 再生/一時停止：Tone.js Transport を制御 // Play/Pause: control Tone.js Transport
$('#play-pause-btn').addEventListener('click', e => {
	if (Tone.Transport.state === 'started') {
		Tone.Transport.pause()
		$('#play-pause-btn i').textContent = 'play_arrow'
	} else {
		rootlayer.children.map(n => n.buildPart())
		if (Tone.Transport.state === 'stopped') {
			Tone.Transport.seconds = Tone.Transport.loopStart
		} else if (Tone.Transport.state === 'paused') {
			// 卷帘模式：暂停后用户可能拖动了画面，需根据播放线屏幕位置重算
			if (grid._pianoRoll) {
				const contentX = grid.getIndicatorContentX()
				Tone.Transport.ticks = x2t(contentX) + OFFSET
				grid.resetPianoRollOffset()
			}
			// 非卷帘模式：Tone.Transport.ticks 已通过点击 seek 正确设置，不动它
		}
		// 清除上一次的自动停止调度
		Tone.Transport.clear(_stopEventId)
		// 在loopEnd处自动停止（不依赖loop开关）
		_stopEventId = Tone.Transport.schedule((time) => {
			Tone.Transport.stop()
			Tone.Transport.seconds = Tone.Transport.loopStart
			$('#play-pause-btn i').textContent = 'play_arrow'
			grid.hideIndicator()
		}, Tone.Transport.loopEnd)
		Tone.Transport.start()
		$('#play-pause-btn i').textContent = 'pause'
		grid.showIndicator()
	}
})

// 停止并回到开头 // 停止して先頭に戻る // Stop and return to beginning
$('#skip-btn').addEventListener('click', e => {
	Tone.Transport.stop()
	Tone.Transport.clear(_stopEventId)
	Tone.Transport.seconds = Tone.Transport.loopStart
	$('#play-pause-btn i').textContent = 'play_arrow'
	grid.hideIndicator()
	grid.resetPianoRollOffset()
})

// 循环播放 // ループ再生 // Loop playback
$('#repeat-btn').addEventListener('change', function(e) {
	Tone.Transport.loop = this.checked
})

// 分享：序列化工程到 URL 并复制到剪贴板
// 共有：プロジェクトを URL にシリアライズしてクリップボードにコピー
// Share: serialize project to URL and copy to clipboard
$('#share-btn').addEventListener('click', async e => {
	const d = await Serializer.serialize(true)
	const url = location.origin + location.pathname + '?' + d
	await navigator.clipboard.writeText(url)
	ui('#snackbar', 3000)
})

// ========== 导出处理 ==========
// ========== エクスポート処理 ==========
// ========== Export handlers ==========

// 导出：根据选择的格式调用相应的导出函数
// エクスポート：選択された形式に応じて対応するエクスポート関数を呼び出す
// Export: call the corresponding export function based on selected format
$('#export-btn').addEventListener('click', e => {
	const format = $('#export-format').value
	switch (format) {
		case 'midi-microtonal': exportMidiMicrotonal(rootlayer); break
		case 'midi-12tet':     exportMidi12TET(rootlayer); break
		case 'midi-custom-edo': {
			const edo = parseInt($('#export-edo').value) || 31
			exportMidiCustomEDO(rootlayer, edo)
			break
		}
		case 'wav':            exportWav(rootlayer); break
	}
})

// EDO 输入框显示/隐藏
// EDO 入力欄の表示/非表示 // EDO input show/hide
$('#export-format').addEventListener('change', function() {
	$('#export-edo').style.display = this.value === 'midi-custom-edo' ? '' : 'none'
})

// ========== 导入处理 ==========
// ========== インポート処理 ==========
// ========== Import handlers ==========

// 导入 MIDI 文件 // MIDI ファイルをインポート // Import MIDI file
$('#import-btn').addEventListener('click', e => {
	const format = $('#import-format').value
	if (format === 'midi') importMidi()
	if (format === 'midi-microtonal') importMidiMicrotonal()
})

// 工程保存到文件
// プロジェクトをファイルに保存 // Save project to file
$('#save-project-btn').addEventListener('click', async e => {
	const d = await Serializer.serialize(true)
	if (window.showSaveFilePicker) {
		try {
			const handle = await window.showSaveFilePicker({
				suggestedName: 'project.naf',
				types: [{
					description: 'Nafchan Project',
					accept: { 'text/plain': ['.naf', '.txt'] }
				}]
			})
			const writable = await handle.createWritable()
			await writable.write(d)
			await writable.close()
			return
		} catch (err) {
			if (err.name === 'AbortError') return // 用户取消
		}
	}
	// 回退：浏览器不支持 showSaveFilePicker
	const blob = new Blob([d], { type: 'text/plain' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url; a.download = 'project.naf'
	document.body.appendChild(a); a.click(); document.body.removeChild(a)
	URL.revokeObjectURL(url)
})

// 从文件加载工程
// ファイルからプロジェクトを読み込み // Load project from file
$('#load-project-btn').addEventListener('click', e => {
	const input = document.createElement('input')
	input.type = 'file'; input.accept = '.naf,.txt'
	input.onchange = async () => {
		const file = input.files[0]
		if (!file) return
		const text = await file.text()
		history.snapshot()
		rootlayer.destroyChildren()
		Tone.Transport.cancel()
		await Serializer.deserialize(text.trim())
		rootlayer.draw()
		grid.autoLoop()
	}
	input.click()
})

// ========== 音符操作按钮：删除、隐藏、提升 ==========
// ========== 音符操作ボタン：削除、非表示、昇格 ==========
// ========== Note operation buttons: delete, hide, promote ==========

// 删除根音 // ルート音を削除 // Delete root note
$('#rootdelete').addEventListener('click', e => {
	if (stage.current) {
		history.snapshot()
		stage.current.del()
		stage.current = undefined
	}
	$('#overlay').style.visibility = ''
	$('#rootmenu').style.top = ''
})

// 隐藏/显示根音（有选区时批量切换选中音符）// ルート音を非表示/表示（選択時は一括切替）// Hide/show root note (batch toggle when selection exists)
$('#roothide').addEventListener('pointerdown', e => {
	e.stopPropagation()
	e.preventDefault()
	history.snapshot()
	rootlayer.opacity(1)  // 清除 layer 级 opacity，改用 per-shape
	// 有选区时批量切换所有选中音符 // 選択がある場合は全選択音符を一括切替 // Batch toggle all selected notes
	if (window._sel?.selected?.size > 0) {
		const roots = new Set()
		for (const note of window._sel.selected) {
			roots.add(note.root || note)
		}
		// 根据第一个选中的状态决定全部切换为相反状态 // 最初の選択状態に基づいて全音符を逆の状態に // Toggle all to opposite of first
		const firstRoot = [...roots][0]
		const newHidden = !firstRoot.hidden
		for (const r of roots) {
			r.hidden = newHidden
		}
	} else {
		if (!stage.current) return
		const target = stage.current.root || stage.current
		target.hidden = !target.hidden
	}
	rootlayer.batchDraw()
})

// 隐藏/显示子音符（有选区时批量切换选中音符）// 子音符を非表示/表示（選択時は一括切替）// Hide/show child note (batch toggle when selection exists)
$('#hide').addEventListener('pointerdown', e => {
	e.stopPropagation()
	e.preventDefault()
	history.snapshot()
	rootlayer.opacity(1)  // 清除 layer 级 opacity，改用 per-shape
	// 有选区时批量切换所有选中音符 // 選択がある場合は全選択音符を一括切替 // Batch toggle all selected notes
	if (window._sel?.selected?.size > 0) {
		const roots = new Set()
		for (const note of window._sel.selected) {
			roots.add(note.root || note)
		}
		const firstRoot = [...roots][0]
		const newHidden = !firstRoot.hidden
		for (const r of roots) {
			r.hidden = newHidden
		}
	} else {
		if (!stage.current) return
		const target = stage.current.root || stage.current
		target.hidden = !target.hidden
	}
	rootlayer.batchDraw()
})

// 提升子音符为根音 // 子音符をルート音に昇格 // Promote child note to root
$('#promote').addEventListener('click', e => {
	if (!stage.current) return
	const cur = stage.current
	// 仅子音符可以提升（RootNote 的 mark 属性为 Konva 对象）
	if (!cur.mark && cur.root && cur.root !== cur) {
		history.snapshot()
		const newRoot = cur.promoteToRoot()
		if (newRoot) {
			stage.current = newRoot
			grid.autoLoop()
		}
	}
	$('#overlay').style.visibility = ''
	$('#menu').style.top = ''
})

// 删除子音符 // 子音符を削除 // Delete child note
$('#delete').addEventListener('click', e => {
	if (stage.current) {
		history.snapshot()
		stage.current.del()
		stage.current.root.buildPart()
		stage.current = undefined
	}
	$('#overlay').style.visibility = ''
	$('#menu').style.top = ''
})

// 根音频率输入 // ルート音周波数入力 // Root frequency input
$('#roothz').addEventListener('blur', e => {
	const hz = e.target.innerText.replace(/[^0-9.]/g, '')
	if (hz == '' || hz < 20 || hz > 20000) return e.target.innerText = stage.current.hz.toFixed(1)
	history.snapshot()
	e.target.innerText = hz
	stage.current.hz = hz
	if ($('#rootmenu').style.top == '') return
	$('#rootmenu').style.top = stage.current.absolutePosition().y + "px"
})

// 根音音量 // ルート音量 // Root volume
$('#rootvolume').addEventListener('change', e => {
	history.snapshot()
	$('#rootmute').checked = false
	stage.current.mute = false
	stage.current.volume = e.target.value
})

// 子音符音量 // 子音符の音量 // Child note volume
$('#volume').addEventListener('change', e => {
	history.snapshot()
	$('#mute').checked = false
	stage.current.mute = false
	stage.current.volume = e.target.value
})

// 辅助函数：获取选中的根音集合（有选区时返回去重的根音列表，否则返回当前音符的根）
// ヘルパー関数：選択されたルート音のセットを取得（選択時は重複除去したリスト、なければ現在の音符のルート）
// Helper: get selected root notes (deduplicated roots if selection exists, else current note's root)
function _selectedRoots(current) {
	if (window._sel?.selected?.size > 0) {
		const roots = new Set()
		for (const note of window._sel.selected) {
			roots.add(note.root || note)
		}
		return [...roots]
	}
	return current ? [current.root || current] : []
}
// 辅助函数：获取选中的音符列表（有选区时返回所有选中音符，否则返回当前音符）
// ヘルパー関数：選択された音符のリストを取得（選択時は全選択音符、なければ現在の音符）
// Helper: get selected notes (all selected notes if selection exists, else current note)
function _selectedNotes(current) {
	if (window._sel?.selected?.size > 0) {
		return [...window._sel.selected]
	}
	return current ? [current] : []
}

// 每音：横线粗细 (root) — 有选区时批量应用
// 音符ごと：横線の太さ（ルート）— 選択時は一括適用
// Per-note: pitch line thickness (root) — batch apply when selection exists
$('#root-note-thick').addEventListener('input', e => {
	history.snapshot()
	const v = parseFloat(e.target.value)
	const nodes = _selectedRoots(stage.current)
	for (const n of nodes) n.setPitchThickRecursive(v)
	rootlayer.batchDraw()
})
// 每音：音符透明度 (root) — 有选区时批量应用，重置 layer 级 opacity
$('#root-note-opacity').addEventListener('input', e => {
	history.snapshot()
	rootlayer.opacity(1)  // 清除 layer 级 opacity，改用 per-shape opacity
	const v = parseInt(e.target.value) / 100
	const nodes = _selectedRoots(stage.current)
	for (const n of nodes) n.setNoteOpacityRecursive(v)
	rootlayer.batchDraw()
})
// 每音：连线粗细 (root) — 有选区时批量应用
// 音符ごと：リンクの太さ（ルート）— 選択時は一括適用
// Per-note: link thickness (root) — batch apply when selection exists
$('#root-link-thick').addEventListener('input', e => {
	history.snapshot()
	const v = parseFloat(e.target.value)
	const nodes = _selectedRoots(stage.current)
	for (const n of nodes) {
		n.linkThick = v
		n.applyLinkStyle()
	}
	rootlayer.batchDraw()
})
// 每音：连线透明度 (root) — 有选区时批量应用
// 音符ごと：リンク不透明度（ルート）— 選択時は一括適用
// Per-note: link opacity (root) — batch apply when selection exists
$('#root-link-opacity').addEventListener('input', e => {
	history.snapshot()
	const v = parseInt(e.target.value) / 100
	const nodes = _selectedRoots(stage.current)
	for (const n of nodes) {
		n.setLinkOpacityRecursive(v)
		n.applyLinkStyle()
	}
	rootlayer.batchDraw()
})

// 每音：横线粗细 (sub) — 有选区时批量应用
// 音符ごと：横線の太さ（サブ）— 選択時は一括適用
// Per-note: pitch line thickness (sub) — batch apply when selection exists
$('#note-thick').addEventListener('input', e => {
	history.snapshot()
	const v = parseFloat(e.target.value)
	const nodes = _selectedNotes(stage.current)
	for (const n of nodes) n.pitchThick = v
	rootlayer.batchDraw()
})
// 每音：音符透明度 (sub) — 有选区时批量应用，重置 layer 级 opacity
$('#note-opacity').addEventListener('input', e => {
	history.snapshot()
	rootlayer.opacity(1)  // 清除 layer 级 opacity
	const v = parseInt(e.target.value) / 100
	const nodes = _selectedNotes(stage.current)
	for (const n of nodes) n.noteOpacity = v
	rootlayer.batchDraw()
})
// 每音：连线粗细 (sub) — 有选区时批量应用，仅影响该子音自己的维度连线
// 音符ごと：リンクの太さ（サブ）— 選択時は一括適用、その子音自身の次元リンクのみ
// Per-note: link thickness (sub) — batch apply, only affects that child note's own dimension link
$('#link-thick').addEventListener('input', e => {
	history.snapshot()
	const v = parseFloat(e.target.value)
	const nodes = _selectedNotes(stage.current)
	for (const n of nodes) {
		n.linkThick = v
		if (n.linkLine) n.linkLine.setAttrs(n.lineConfig)
	}
	rootlayer.batchDraw()
})
// 每音：连线透明度 (sub) — 有选区时批量应用，仅影响该子音自己的维度连线
// 音符ごと：リンク不透明度（サブ）— 選択時は一括適用、その子音自身の次元リンクのみ
// Per-note: link opacity (sub) — batch apply, only affects that child note's own dimension link
$('#link-opacity').addEventListener('input', e => {
	history.snapshot()
	const v = parseInt(e.target.value) / 100
	const nodes = _selectedNotes(stage.current)
	for (const n of nodes) {
		n.linkOpacity = v
		if (n.linkLine) n.linkLine.opacity(v)
	}
	rootlayer.batchDraw()
})
// 静音按钮（有选区时批量切换）// ミュートボタン（選択時は一括切替）// Mute buttons (batch toggle when selection exists)
for (const el of $$('.mute-btn')) {
	el.addEventListener('change', function(e) {
		history.snapshot()
		const nodes = _selectedNotes(stage.current)
		const v = this.checked
		for (const n of nodes) n.mute = v
		rootlayer.batchDraw()
	})
}

// ==================== 自定义维度系统 ====================
// ==================== カスタム次元システム ====================
// ==================== Custom dimension system ====================

// 波长(nm) → RGB 转换
// 波長(nm) → RGB 変換 // Wavelength(nm) → RGB conversion
function wavelengthToRGB(w) {
	let r = 0, g = 0, b = 0
	if (w >= 380 && w < 440) { r = -(w - 440) / 60; b = 1 }
	else if (w >= 440 && w < 490) { g = (w - 440) / 50; b = 1 }
	else if (w >= 490 && w < 510) { g = 1; b = -(w - 510) / 20 }
	else if (w >= 510 && w < 580) { r = (w - 510) / 70; g = 1 }
	else if (w >= 580 && w < 645) { r = 1; g = -(w - 645) / 65 }
	else if (w >= 645 && w <= 750) { r = 1 }
	let factor = 1
	if (w < 420) factor = 0.3 + 0.7 * (w - 380) / 40
	else if (w > 700) factor = 0.3 + 0.7 * (750 - w) / 50
	const toHex = v => Math.round(255 * Math.min(1, Math.max(0, v * factor))).toString(16).padStart(2, '0')
	return '#' + toHex(r) + toHex(g) + toHex(b)
}

// 波长归一化到可见光谱 // 波長を可視スペクトルに正規化 // Normalize wavelength to visible spectrum
function normalizeWavelength(wl) {
	while (wl > 750) wl /= 2
	while (wl < 380) wl *= 2
	return wl
}

// 自定义维度数据管理
// カスタム次元データ管理 // Custom dimension data management
const CUSTOM_DIM_KEY = 'naf_custom_dims'
let customDimList = []
try { customDimList = JSON.parse(localStorage.getItem(CUSTOM_DIM_KEY) || '[]') } catch(e) {}

// 保存到 localStorage // localStorage に保存 // Save to localStorage
function saveCustomDims() {
	localStorage.setItem(CUSTOM_DIM_KEY, JSON.stringify(customDimList))
}

// 重建所有菜单按钮和 Config 复选框
// すべてのメニューボタンと Config チェックボックスを再構築
// Rebuild all menu buttons and Config checkboxes
function rebuildCustomDimUI() {
	// 清除旧按钮和复选框
	for (const el of document.querySelectorAll('.btn-cd')) el.remove()
	for (const el of document.querySelectorAll('.custom-dim-check')) el.remove()

	// 清除旧的 pitchIntervals 自定义键（避免残留）
	for (const k of Object.keys(pitchIntervals)) {
		if (k.startsWith('c') || k.startsWith('-c')) delete pitchIntervals[k]
	}

	if (customDimList.length === 0) {
		$('#custom-dim-checks').style.display = 'none'
		$('#custom-dim-list').innerHTML = '<p style="font-size:11px;color:#888;" data-i18n="no-custom-dim">暂无自定义维度</p>'
		return
	}
	$('#custom-dim-checks').style.display = ''

	// 找到四个带按钮的nav
	const allNavs = document.querySelectorAll('nav.no-margin, nav.no-space')
	const progNav = Array.from(allNavs).find(n => n.querySelector('.prog-btn'))
	const rootExtNav = Array.from(allNavs).find(n => n.querySelector('.root-ext-btn'))
	const transNav = Array.from(allNavs).find(n => n.querySelector('.trans-btn'))
	const extNav = Array.from(allNavs).find(n => n.querySelector('.ext-btn'))

	customDimList.forEach((dim, idx) => {
		const nn = parseInt(dim.n) || 0, dd = parseInt(dim.d) || 1
		if (nn <= dd || dd < 1) return  // 跳过无效条目

		const key = 'c' + idx, negKey = '-' + key
		const pos = (nn / dd) % 1
		const wl = normalizeWavelength(440 * nn / dd)
		const color = wavelengthToRGB(wl)

		// 注册到 pitchIntervals
		pitchIntervals[key]   = { id: 100 + idx, n: nn, d: dd, c: color, w: 7, b: pos, t: pos, m: 0 }
		pitchIntervals[negKey] = { id: -(100 + idx), n: dd, d: nn, c: color, w: 7, b: pos, t: pos, m: 0 }

		// 从 pitchIntervals 回读作为唯一真相源
		const pi = pitchIntervals[key]
		const label = pi.n + '/' + pi.d

		// 在四个菜单中插入按钮 // 4 つのメニューにボタンを挿入 // Insert buttons into four menus
		for (const [cls, nav] of [['prog-btn', progNav], ['root-ext-btn', rootExtNav], ['trans-btn', transNav], ['ext-btn', extNav]]) {
			if (!nav) continue
			const btn = document.createElement('button')
			btn.className = cls + ' btn-cd transparent'
			btn.textContent = label
			btn.dataset.dim = key
			btn.dataset.n = pi.n
			btn.dataset.d = pi.d
			btn.style.setProperty('color', color, 'important')
			btn.style.setProperty('font-family', 'sans-serif', 'important')
			btn.style.setProperty('font-size', label.length > 4 ? '9px' : '11px', 'important')
			btn.style.setProperty('min-width', '28px', 'important')
			btn.style.setProperty('height', '28px', 'important')
			btn.style.setProperty('border-radius', '14px', 'important')
			btn.style.setProperty('padding', '0 6px', 'important')
			btn.style.setProperty('line-height', '28px', 'important')
			btn.style.setProperty('overflow', 'visible', 'important')
			btn.style.setProperty('white-space', 'nowrap', 'important')
			btn.title = label
			const dirCheck = nav.querySelector('label.checkbox')
			if (dirCheck) nav.insertBefore(btn, dirCheck)
			else nav.appendChild(btn)
		}

		// 在 Config 创建复选框 // Config にチェックボックスを作成 // Create checkbox in Config
		const checkNav = $('#custom-dim-checks')
		const labelEl = document.createElement('label')
		labelEl.className = 'checkbox custom-dim-check'
		const input = document.createElement('input')
		input.type = 'checkbox'
		input.id = 'config-cd-' + idx
		input.checked = dim.enabled !== false
		input.addEventListener('change', function() {
			for (const b of document.querySelectorAll('.btn-cd')) {
				if (b.dataset.dim === key) b.style.display = this.checked ? '' : 'none'
			}
			dim.enabled = this.checked
			saveCustomDims()
		})
		const span = document.createElement('span')
		span.textContent = label
		span.style.color = color
		span.style.fontSize = '10px'
		labelEl.appendChild(input)
		labelEl.appendChild(span)
		checkNav.appendChild(labelEl)

		// 初始显示状态 // 初期表示状態 // Initial display state
		if (dim.enabled === false) {
			for (const b of document.querySelectorAll('.btn-cd')) {
				if (b.dataset.dim === key) b.style.display = 'none'
			}
		}
	})

	// 为按钮绑定事件
	bindCustomDimHandlers()
}

// 为自定义维度按钮绑定处理函数
// カスタム次元ボタンにハンドラをバインド // Bind handlers to custom dimension buttons
function bindCustomDimHandlers() {
	// prog：推移根音 // prog：ルート音を推移 // prog: shift root pitch
	for (const el of document.querySelectorAll('.prog-btn.btn-cd')) {
		el.addEventListener('click', function(e) {
			if (!stage.current) return
			history.snapshot()
			const key = this.dataset.dim
			const shift = pitchIntervals[($('#root-prog-dir').checked ? '-' : '') + key]
			const interval = stage.current.interval || { n: 1, d: 1 }
			stage.current.interval = { n: interval.n * shift.n, d: interval.d * shift.d }
			stage.current.quantize()
			stage.current.updateColor()
			rootlayer.batchDraw()
			grid.autoLoop()
		})
	}
	// root-ext：从根音扩展 // root-ext：ルート音から拡張 // root-ext: extend from root
	for (const el of document.querySelectorAll('.root-ext-btn.btn-cd')) {
		el.addEventListener('click', function(e) {
			if (!stage.current) return
			history.snapshot()
			const key = this.dataset.dim
			const n = stage.current.addNote(stage.current.len, pitchIntervals[($('#root-ext-dir').checked ? '-' : '') + key])
			n.playThis()
			rootlayer.batchDraw()
			grid.autoLoop()
		})
	}
	// trans：变换子音符 // trans：子音符を変換 // trans: transform child note
	for (const el of document.querySelectorAll('.trans-btn.btn-cd')) {
		el.addEventListener('click', function(e) {
			if (!stage.current) return
			history.snapshot()
			const key = this.dataset.dim
			stage.current.interval = pitchIntervals[($('#trans-dir').checked ? '-' : '') + key]
			stage.current.quantize()
			stage.current.updateColor()
			rootlayer.batchDraw()
			grid.autoLoop()
		})
	}
	// ext：扩展子音符 // ext：子音符を拡張 // ext: extend child note
	for (const el of document.querySelectorAll('.ext-btn.btn-cd')) {
		el.addEventListener('click', function(e) {
			if (!stage.current) return
			history.snapshot()
			const key = this.dataset.dim
			const n = stage.current.addNote(stage.current.len, pitchIntervals[($('#ext-dir').checked ? '-' : '') + key])
			n.playThis()
			rootlayer.batchDraw()
			grid.autoLoop()
		})
	}
}

// 更新弹窗预览
// ポップアッププレビューを更新 // Update popup preview
function updateCustomDimPreview() {
	const n = parseInt($('#custom-dim-n').value) || 5
	const d = parseInt($('#custom-dim-d').value) || 3
	const ratio = n / d
	$('#custom-dim-preview-ratio').textContent = '≈ ' + ratio.toFixed(3)
	const pos = ratio - Math.floor(ratio)
	$('#custom-dim-pos-preview').textContent = ratio + ' → ' + pos.toFixed(3) + ' (即 ' + (pos * 100).toFixed(0) + '% 处)'
	const wl = normalizeWavelength(440 * ratio)
	const color = wavelengthToRGB(wl)
	$('#custom-dim-color-preview').style.background = color
	$('#custom-dim-wavelength').textContent = wl.toFixed(0) + 'nm'
}

// 渲染弹窗已保存列表
// 保存済みリストをポップアップにレンダリング // Render saved list in popup
function renderCustomDimList() {
	$('#custom-dim-list').innerHTML = customDimList.length === 0
		? '<p style="font-size:11px;color:#888;" data-i18n="no-custom-dim">暂无自定义维度</p>'
		: customDimList.map((dim, idx) => {
			const n = parseInt(dim.n) || 0, d = parseInt(dim.d) || 1
			const label = n + '/' + d
			const pos = (n / d) % 1
			const wl = normalizeWavelength(440 * n / d)
			const color = wavelengthToRGB(wl)
			return `<div class="dim-item">
				<div class="dim-row">
					<div class="dim-color" style="background:${color}"></div>
					<span>${label}</span>
					<span class="dim-pos">${pos.toFixed(3)}</span>
				</div>
				<button class="dim-delete-btn" data-idx="${idx}">×</button>
			</div>`
		}).join('')
	// 绑定删除按钮 // 削除ボタンをバインド // Bind delete buttons
	for (const btn of document.querySelectorAll('#custom-dim-list .dim-delete-btn')) {
		btn.addEventListener('click', function() {
			const idx = parseInt(this.dataset.idx)
			customDimList.splice(idx, 1)
			saveCustomDims()
			renderCustomDimList()
			rebuildCustomDimUI()
		})
	}
}

// 弹窗事件：打开管理维度弹窗
// ポップアップイベント：次元管理ポップアップを開く // Popup events: open manage dimensions popup
$('#custom-dim-btn').addEventListener('click', () => {
	renderCustomDimList()
	updateCustomDimPreview()
	$('#custom-dim-modal').style.display = 'flex'
})

// 关闭弹窗 // ポップアップを閉じる // Close popup
$('#custom-dim-close-btn').addEventListener('click', () => {
	$('#custom-dim-modal').style.display = 'none'
})

// 点击遮罩层关闭 // オーバーレイクリックで閉じる // Close on overlay click
$('#custom-dim-modal').addEventListener('click', function(e) {
	if (e.target === this) this.style.display = 'none'
})

// 分子/分母输入时更新预览 // 分子/分母入力時にプレビューを更新 // Update preview on n/d input
$('#custom-dim-n').addEventListener('input', updateCustomDimPreview)
$('#custom-dim-d').addEventListener('input', updateCustomDimPreview)

// 保存自定义维度 // カスタム次元を保存 // Save custom dimension
$('#custom-dim-save-btn').addEventListener('click', () => {
	const n = parseInt($('#custom-dim-n').value)
	const d = parseInt($('#custom-dim-d').value)
	if (!n || !d || n <= d) return // 必须 n > d > 0
	customDimList.push({ n: n, d: d, enabled: true })
	saveCustomDims()
	renderCustomDimList()
	rebuildCustomDimUI()
})

// 初始化自定义维度 UI // カスタム次元 UI を初期化 // Initialize custom dimension UI
rebuildCustomDimUI()

// ============================================================
// ============================================================

// === 扩展快捷键系统 ===
// === 拡張ショートカットシステム ===
// === Extended shortcut system ===
// 每个维度 key → { up: combo, down: combo }；combo 可自定义
// 各次元 key → { up: combo, down: combo }；combo はカスタマイズ可能
// Each dimension key → { up: combo, down: combo }; combo is customizable

const EXT_SC_KEY = 'naf_ext_sc'
const DEFAULT_SC = {}
// 默认：0d→Digit0, 1d→Digit1, ..., 7d→Digit7, c0→Digit8, c1→Digit9
const builtinDims = ['0d','1d','2d','3d','4d','5d','6d','7d']
for (let i = 0; i < builtinDims.length; i++) {
	DEFAULT_SC[builtinDims[i]] = { up: 'Digit' + i, down: 'Alt+Digit' + i }
}
// 自定义维度默认：c0→Digit8, c1→Digit9（其余无默认→显示"自定义"）
// カスタム次元デフォルト：c0→Digit8, c1→Digit9（残りはデフォルトなし→"カスタム"と表示）
// Custom dimension defaults: c0→Digit8, c1→Digit9 (rest have no default → show "custom")
function buildDefaultShortcuts() {
	const sc = { ...DEFAULT_SC }
	for (let i = 0; i < customDimList.length; i++) {
		const key = 'c' + i
		if (i <= 1) sc[key] = { up: 'Digit' + (8 + i), down: 'Alt+Digit' + (8 + i) }
		else sc[key] = { up: '', down: '' }  // 无默认→显示"自定义"
	}
	return sc
}

let extShortcuts = {}
try { extShortcuts = JSON.parse(localStorage.getItem(EXT_SC_KEY) || '{}') } catch(e) {}
// 补全缺失：合并默认值
// 欠落を補完：デフォルト値をマージ // Fill gaps: merge defaults
{
	const defs = buildDefaultShortcuts()
	for (const k of [...builtinDims, ...customDimList.map((_, i) => 'c' + i)]) {
		if (!extShortcuts[k]) extShortcuts[k] = defs[k] || { up: '', down: '' }
	}
}

// 保存扩展快捷键到 localStorage // 拡張ショートカットを localStorage に保存 // Save extended shortcuts to localStorage
function saveExtShortcuts() { localStorage.setItem(EXT_SC_KEY, JSON.stringify(extShortcuts)) }

// 根据槽位号获取维度键 // スロット番号から次元キーを取得 // Get dimension key from slot number
function getExtShortcut(slot) {  // slot: 0-7→0d-7d, 8+→custom
	const builtin = { 0: '0d', 1: '1d', 2: '2d', 3: '3d', 4: '4d', 5: '5d', 6: '6d', 7: '7d' }
	if (slot in builtin) return builtin[slot]
	const idx = slot - 8
	if (idx >= 0 && idx < customDimList.length) return 'c' + idx
	return null
}

// combo 可读形式 // combo 読みやすい形式 // Human-readable combo form
function comboLabel(raw) {
	return (raw || '').replace(/Digit/g, '').replace(/Key/g, '').replace(/Numpad/g, 'Num')
}

// 从事件构建 combo 字符串 // イベントから combo 文字列を構築 // Build combo string from event
function comboFromEvent(e) {
	const parts = []
	if (e.altKey) parts.push('Alt')
	if (e.ctrlKey) parts.push('Ctrl')
	if (e.shiftKey) parts.push('Shift')
	parts.push(e.code)
	return parts.join('+')
}

// 构建 combo→{dimKey,alt} 查找表
// combo→{dimKey,alt} ルックアップテーブルを構築 // Build combo→{dimKey,alt} lookup table
function buildShortcutMap() {
	const map = {}
	for (const dimKey in extShortcuts) {
		const sc = extShortcuts[dimKey]
		if (sc.up) map[sc.up] = { dimKey, alt: false }
		if (sc.down) map[sc.down] = { dimKey, alt: true }
	}
	return map
}
let _extMap = {}
function rebuildExtMap() { _extMap = buildShortcutMap() }
rebuildExtMap()

// 键盘监听：扩展快捷键触发
// キーリスナー：拡張ショートカット発動 // Keyboard listener: extended shortcut trigger
window.addEventListener('keydown', (e) => {
	const el = document.activeElement
	const tag = el?.tagName
	if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return
	if (!stage.current) return
	if (e.ctrlKey && !e.altKey && !e.shiftKey) return  // Ctrl+Z 等交给 keybinds
	let combo = comboFromEvent(e)
	let match = _extMap[combo]
	let shiftFocus = false
	// Shift+快捷键：如果无精确匹配，去掉 Shift 再匹配（链式扩展模式）
	if (!match && e.shiftKey) {
		const mods = []
		if (e.altKey) mods.push('Alt')
		if (e.ctrlKey) mods.push('Ctrl')
		combo = mods.concat(e.code).join('+')
		match = _extMap[combo]
		if (match) shiftFocus = true
	}
	if (!match) return
	const key = match.dimKey
	if (!key) return
	const intervalKey = match.alt ? '-' + key : key
	const interval = pitchIntervals[intervalKey]
	if (!interval) return
	e.preventDefault(); e.stopPropagation()
	history.snapshot()
	const n = stage.current.addNote(stage.current.len, interval)
	n.playThis()
	if (shiftFocus) {
		stage.current = n
	}
	rootlayer.batchDraw()
	grid.autoLoop()
}, true)

// 渲染弹窗中的扩展快捷键显示（按维度枚举，而非固定0-9）
// ポップアップ内の拡張ショートカット表示をレンダリング（固定 0-9 ではなく次元ごとに列挙）
// Render extended shortcut display in popup (enumerate by dimension, not fixed 0-9)
function renderExtShortcuts(prefix) {
	const upRow = document.getElementById(prefix + 'ext-shortcuts-up')
	const downRow = document.getElementById(prefix + 'ext-shortcuts-down')
	if (!upRow || !downRow) return
	// 收集所有需要展示的维度
	const dims = []  // [{ key, label, color }]
	const builtin = ['0d','1d','2d','3d','4d','5d','6d','7d']
	for (const k of builtin) {
		if (pitchIntervals[k]) dims.push({ key: k, label: k, color: pitchIntervals[k].c })
	}
	for (let i = 0; i < customDimList.length; i++) {
		const pi = pitchIntervals['c' + i]
		if (pi) dims.push({ key: 'c' + i, label: pi.n + '/' + pi.d, color: pi.c })
	}
	let upHTML = '', downHTML = ''
	for (const d of dims) {
		const sc = extShortcuts[d.key] || { up: '', down: '' }
		const upShow = sc.up ? comboLabel(sc.up) : t('custom')
		const downShow = sc.down ? comboLabel(sc.down) : t('custom')
		upHTML += `<span class="sc-item" data-dim="${d.key}" data-dir="up" title="${d.label} ↑ ${sc.up || '无'}" style="color:${d.color};font-size:11px;margin:0 3px;cursor:pointer;display:inline-block;padding:1px 4px;border-radius:3px;">${upShow}</span>`
		downHTML += `<span class="sc-item" data-dim="${d.key}" data-dir="down" title="${d.label} ↓ ${sc.down || '无'}" style="color:${d.color};font-size:11px;margin:0 3px;cursor:pointer;display:inline-block;padding:1px 4px;border-radius:3px;">${downShow}</span>`
	}
	upRow.innerHTML = '<span style="color:#888;font-size:10px;">↑ </span>' + upHTML
	downRow.innerHTML = '<span style="color:#888;font-size:10px;">↓ </span>' + downHTML
	for (const el of document.querySelectorAll('.sc-item')) {
		el.onclick = function() { openShortcutCapture(this.dataset.dim, this.dataset.dir) }
	}
}
window._renderExtShortcuts = renderExtShortcuts

// 快捷键捕获弹窗
// ショートカットキャプチャポップアップ // Shortcut capture popup
let scCaptureDim = null, scCaptureDir = null, scCapturedKeys = []

// 打开快捷键捕获弹窗 // ショートカットキャプチャポップアップを開く // Open shortcut capture popup
function openShortcutCapture(dimKey, dir) {
	const titleEl = document.getElementById('sc-modal-title')
	const keysEl = document.getElementById('sc-modal-keys')
	const modal = document.getElementById('sc-modal')
	if (!titleEl || !keysEl || !modal) return
	scCaptureDim = dimKey; scCaptureDir = dir; scCapturedKeys = []
	const pi = pitchIntervals[dimKey] || {}
	const label = dimKey.startsWith('c') ? (pi.n ? pi.n + '/' + pi.d : dimKey) : dimKey
	titleEl.textContent = t('ext-shortcut') + ' ' + label + ' ' + (dir === 'up' ? '↑' : '↓')
	keysEl.textContent = t('sc-prompt')
	modal.style.display = 'flex'
}

// 捕获按键 // キーをキャプチャ // Capture key press
function captureKeyDown(e) {
	const modal = document.getElementById('sc-modal')
	if (!modal || modal.style.display !== 'flex') return
	e.preventDefault(); e.stopPropagation()
	const code = e.code
	if (['AltLeft','AltRight','ControlLeft','ControlRight','ShiftLeft','ShiftRight','MetaLeft','MetaRight','Tab','Escape'].includes(code)) return
	if (scCapturedKeys.length < 2 && !scCapturedKeys.includes(code)) {
		scCapturedKeys.push(code)
	}
	const mods = []
	if (e.altKey) mods.push('Alt')
	if (e.ctrlKey) mods.push('Ctrl')
	if (e.shiftKey) mods.push('Shift')
	const display = [...mods, ...scCapturedKeys].map(k => k.replace(/Digit|Key|Numpad/g, '')).join('+')
	document.getElementById('sc-modal-keys').textContent = display || '...'
}
window.addEventListener('keydown', captureKeyDown, true)

// 保存快捷键 // ショートカットを保存 // Save shortcut
const scModalSave = document.getElementById('sc-modal-save')
if (scModalSave) scModalSave.addEventListener('click', () => {
	if (scCaptureDim === null) return
	const keysEl = document.getElementById('sc-modal-keys')
	const saved = keysEl ? keysEl.textContent : ''
	if (saved && saved !== '...' && saved !== t('sc-prompt')) {
		const parts = saved.split('+').map(p => p.trim())
		const codes = parts.map(p => {
			if (p === 'Alt' || p === 'Ctrl' || p === 'Shift') return p
			if (/^\d$/.test(p)) return 'Digit' + p
			if (p.startsWith('Num')) return 'Numpad' + p.slice(3)
			return 'Key' + p.toUpperCase()
		})
		const combo = codes.join('+')
		if (!extShortcuts[scCaptureDim]) extShortcuts[scCaptureDim] = { up: '', down: '' }
		extShortcuts[scCaptureDim][scCaptureDir] = combo
		saveExtShortcuts()
		rebuildExtMap()
		renderExtShortcuts('root-')
		renderExtShortcuts('')
	}
	const modal = document.getElementById('sc-modal')
	if (modal) modal.style.display = 'none'
	scCaptureDim = null
})

// 清除快捷键 // ショートカットをクリア // Clear shortcut
const scModalClear = document.getElementById('sc-modal-clear')
if (scModalClear) scModalClear.addEventListener('click', () => {
	if (scCaptureDim === null) return
	extShortcuts[scCaptureDim][scCaptureDir] = ''
	saveExtShortcuts()
	rebuildExtMap()
	renderExtShortcuts('root-')
	renderExtShortcuts('')
	const modal = document.getElementById('sc-modal')
	if (modal) modal.style.display = 'none'
	scCaptureDim = null
})

// 关闭弹窗 // ポップアップを閉じる // Close popup
const scModalClose = document.getElementById('sc-modal-close')
if (scModalClose) scModalClose.addEventListener('click', () => {
	const modal = document.getElementById('sc-modal')
	if (modal) modal.style.display = 'none'
	scCaptureDim = null
})
const scModal = document.getElementById('sc-modal')
if (scModal) scModal.addEventListener('click', function(e) {
	if (e.target === this) { this.style.display = 'none'; scCaptureDim = null }
})

// ============================================================
// ============================================================

// ========== 维度按钮：prog、trans、root-ext、ext ==========
// ========== 次元ボタン：prog、trans、root-ext、ext ==========
// ========== Dimension buttons: prog, trans, root-ext, ext ==========

// prog 按钮：推移根音的音高（累积式，0d 除外）
// prog ボタン：ルート音の音高を推移（累積式、0d 以外）
// prog button: shift root pitch (cumulative, except 0d)
for (const el of $$('.prog-btn')) {
	el.addEventListener('click', function(e) {
		// rootの音高を移動させる操作 (0d以外は累積)
		if (!stage.current) return
		history.snapshot()
		const shift = pitchIntervals[($('#root-prog-dir').checked ? '-' : '') + this.innerText]
		const interval = this.innerText == '0d' ? { n: 1, d: 1 } : stage.current.interval || { n: 1, d: 1 }
		stage.current.interval = { n: interval.n * shift.n, d: interval.d * shift.d }
		$('#rootmenu').style.top = stage.current.pitchline.absolutePosition().y + "px"
		$(`#roothz`).innerText = stage.current.hz.toFixed(1)
		$(`#roottav`).innerText = stage.current.tav
		rootlayer.batchDraw()
	})
}
// trans 按钮：变换子音符的音程（覆盖式）
// trans ボタン：子音符の音程を変換（上書き式）
// trans button: transform child note interval (overwrite)
for (const el of $$('.trans-btn')) {
	el.addEventListener('click', function(e) {
		// 自身の音高差を変更する操作 (上書き)
		if (!stage.current) return
		history.snapshot()
		stage.current.interval = pitchIntervals[($('#trans-dir').checked ? '-' : '') + this.innerText]
		$('#menu').style.top = stage.current.pitchline.absolutePosition().y + "px"
		$(`#hz`).innerText = stage.current.hz.toFixed(1)
		$(`#tav`).innerText = stage.current.tav
		rootlayer.batchDraw()
	})
}
// root-ext 按钮：从根音扩展指定音程的子音符
// root-ext ボタン：ルート音から指定音程の子音符を拡張
// root-ext button: extend child note with specified interval from root
for (const el of $$('.root-ext-btn')) {
	el.addEventListener('click', function(e) {
		// 自身と所定の音高差を持つnoteを追加する操作
		if (!stage.current) return
		history.snapshot()
		const n = stage.current.addNote(stage.current.len, pitchIntervals[($('#root-ext-dir').checked ? '-' : '') + this.innerText])
		n.playThis()
		rootlayer.batchDraw()
	})
}
// ext 按钮：从当前音符扩展指定音程的子音符
// ext ボタン：現在の音符から指定音程の子音符を拡張
// ext button: extend child note with specified interval from current note
for (const el of $$('.ext-btn')) {
	el.addEventListener('click', function(e) {
		// 自身と所定の音高差を持つnoteを追加する操作
		if (!stage.current) return
		history.snapshot()
		const n = stage.current.addNote(stage.current.len, pitchIntervals[($('#ext-dir').checked ? '-' : '') + this.innerText])
		n.playThis()
		rootlayer.batchDraw()
	})
}

// 播放选中音符 // 選択中の音符を再生 // Play selected note
for (const el of $$('.play-this-btn')) {
	el.addEventListener('click', function(e) {
		stage.current.root.play()
	})
}

// 从 URL 参数反序列化工程 // URL パラメータからプロジェクトをデシリアライズ // Deserialize project from URL parameters
if (location.search !== '') {
	Serializer.deserialize(location.search.slice(1))
	grid.autoLoop()
}

// === 根音箭头初始状态：从 localStorage 恢复 ===
// === ルート音矢印の初期状態：localStorage から復元 ===
// === Root arrow initial state: restore from localStorage ===
if (localStorage.getItem('naf_root_mark') === '0') {
	$('#config-root-mark').checked = false
	for (const n of rootlayer.getChildren()) {
		if (n.mark) n.mark.visible(false)
	}
}

// === Ctrl+滚轮缩放（取代浏览器缩放，保证网格正常渲染） ===
// === Ctrl+ホイールズーム（ブラウザズームを置き換え、グリッドの正常レンダリングを保証） ===
// === Ctrl+scroll wheel zoom (replaces browser zoom, ensures grid renders correctly) ===
document.addEventListener('wheel', (e) => {
	if (!e.ctrlKey) return
	e.preventDefault()

	const delta = e.deltaY > 0 ? 0.92 : 1.08
	const mouse = { x: e.clientX, y: e.clientY }
	const oldScaleX = stage.scaleX()
	const oldScaleY = stage.scaleY()

	if (e.shiftKey) {
		// Ctrl+Shift+滚轮 → 纵向缩放
		// Ctrl+Shift+ホイール → 縦方向ズーム // Ctrl+Shift+wheel → vertical zoom
		const newScaleY = oldScaleY * delta
		stage.scaleY(newScaleY)
		stage.y(mouse.y - (mouse.y - stage.y()) * (newScaleY / oldScaleY))
	} else if (e.altKey) {
		// Ctrl+Alt+滚轮 → 横向缩放
		// Ctrl+Alt+ホイール → 横方向ズーム // Ctrl+Alt+wheel → horizontal zoom
		const newScaleX = oldScaleX * delta
		stage.scaleX(newScaleX)
		stage.x(mouse.x - (mouse.x - stage.x()) * (newScaleX / oldScaleX))
	} else {
		// Ctrl+滚轮 → 等比缩放
		// Ctrl+ホイール → 等比ズーム // Ctrl+wheel → uniform zoom
		stage.scaleX(oldScaleX * delta)
		stage.scaleY(oldScaleY * delta)
		stage.position({
			x: mouse.x - (mouse.x - stage.x()) * delta,
			y: mouse.y - (mouse.y - stage.y()) * delta
		})
	}
	grid.drawScorelines()
	grid.drawBeatlines()
	grid.fixArrowScale()
	grid.adjust()
}, { capture: true, passive: false })
