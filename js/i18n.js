/*
 * 国际化（i18n）模块：根据当前语言切换界面文本，支持 data-i18n / data-i18n-html / data-i18n-title 属性绑定，内置日/英/中/虚构语言翻译表
 * 国際化（i18n）モジュール：現在の言語に応じてUIテキストを切替、data-i18n / data-i18n-html / data-i18n-title 属性バインディング対応、日/英/中/架空言語の翻訳テーブル内蔵
 * Internationalization (i18n) module: switches UI text based on current language, supports data-i18n / data-i18n-html / data-i18n-title attribute bindings, built-in JP/EN/ZH/fictional language translation tables
 */

import {$, $$} from './util.js'

export function i18n(lang) {
	const d = tr[lang]
	if (!d) return console.log('Lang', lang, 'not supported')
	for (const elm of $$('[data-i18n]')) {
		elm.innerText = d[elm.dataset.i18n]
	}
	for (const elm of $$('[data-i18n-html]')) {
		const key = elm.getAttribute('data-i18n-html')
		if (d[key]) elm.innerHTML = d[key]
	}
	for (const elm of $$('[data-i18n-title]')) {
		const key = elm.getAttribute('data-i18n-title')
		if (d[key]) elm.title = d[key]
	}
	$('html').lang = lang
}

// 查找当前语言的翻译文本 // 現在の言語の翻訳テキストを検索 // Lookup translation text for current language
export function t(key) {
	const lang = $('html').lang || 'en'
	return (tr[lang] && tr[lang][key]) || tr['en'][key] || key
}

const tr = {
	'ja': {
		"prog": "［進行］",
		"ext": "［拡張］",
		"ext-shortcut": "拡張短縮",
		"trans": "［転写］",
		"config": "設定",
		"lang": "言語",
		"beat-length": "1拍の長さ",
		"tonic": "主音",
		"scoreline": "譜線",
		"higherdim": "高次元",
		"time-quantize": "時刻の量子化",
		"head": "先頭",
		"tail": "末尾",
		"resolution": "　分解能",
		"subdivide-lines": "分割譜線",
		"fixed-note-len": "音価固定",
		"beat": "拍",
		"time-randomize": "時刻のランダム化",
		"pitch-quantize": "音高の量子化",
		"base-note": "底音",
		"other-note": "その他",
		"tone": "音色",
		"copy-finish": "コピー完了",
		"export": "出力",
		"import": "インポート",
		"custom-dim": "自定义次元",
		"custom-dim-title": "自定义次元管理",
		"ratio": "比率",
		"ratio-hint": "比率は1より大きい必要があります（n > d）",
		"line-color": "線の色",
		"mark-pos": "縦線位置",
		"no-custom-dim": "カスタム次元はまだありません",
		"close": "閉じる",
		"add": "追加",
		"delete": "削除",
		"clear": "全削除",
		"skip": "先頭に戻る",
		"notecolor": "音色",
		"wavelength": "波長",
		"hsl": "HSI拡張",
		"color-white": "白色",
		"pianoroll": "自動スクロール",
		"help": "ヘルプ",
		"shortcuts": "ショートカット",
		"wavecolor": "波長着色",
		"note-thickness": "音符太さ",
		"link-thickness": "線太さ",
		"link-opacity": "線透明度",
		"root-mark": "根音矢印",
		"project": "プロジェクト",
		"save": "保存",
		"load": "読み込み",
		"sc-prompt": "ショートカットキーを押してください...",
		"sc-hint": "2キーの同時押し対応（例: A+B、Alt+Q）",
		"sc-clear": "クリア",
		"sc-cancel": "キャンセル",
		"custom": "カスタム",
		"add-dim": "+ 追加",
		"promote": "ルートに昇格",
		"help-content": `<h4>再生</h4>
<p><kbd>Space</kbd> — 再生 / 停止</p>
<p><kbd>Skip</kbd> ボタン — 先頭に戻る</p>
<p>下部ループ切替 — ループ再生</p>
<h4>音符操作</h4>
<p>グリッド空白をクリック — ルートノート作成</p>
<p>音符をクリック — 編集ポップアップを開く</p>
<p>音符左端をドラッグ — 始点変更</p>
<p>音符右端をドラッグ — 長さ変更</p>
<p>音符中央をドラッグ — 音高変更</p>
<p><kbd>Ctrl</kbd> + ドラッグ — コード全体のタイミングを同期（頭/尾/体）</p>
<p>ポップアップ <i>delete</i> ボタン — 音符削除</p>
<p>ポップアップ <i>visibility</i> ボタン — 非表示/表示（Ctrl+クリックで選択可能）</p>
<p>ポップアップ <i>arrow_upward</i> ボタン — サブ音をルートに昇格（コード自動再構成）</p>
<p>Extend — 倍音ノートを追加</p>
<p>Trans — 現在の音符を別次元に転写</p>
<p>Prog — ルート音高を累進移動</p>
<p>ポップアップ Hz 欄で直接周波数編集</p>
<p>ポップアップ内で音量・ミュート・太さ・透明度を調整</p>
<h4>拡張ショートカット</h4>
<p>ポップアップ下部に各次元のショートカットを表示</p>
<p>ショートカットラベルをクリックでカスタマイズ（A+B等の2キー対応）</p>
<p>未割当の次元は「カスタム」と表示、クリックで設定可能</p>
<p><kbd>Shift</kbd> + ショートカット — 新音が現在選択になり、連続ネスト可能（例: 3→2→4 深く）</p>
<h4>矩形選択と一括操作</h4>
<p><kbd>Shift</kbd> + ドラッグ — 矩形選択</p>
<p>選択音符をドラッグ — グループ移動</p>
<p>空白クリック — 選択解除</p>
<p><kbd>Ctrl</kbd> + <kbd>C</kbd> — コピー</p>
<p><kbd>Ctrl</kbd> + <kbd>V</kbd> — 貼り付け（近すぎる場合自動オフセット）</p>
<p><kbd>Ctrl</kbd> + <kbd>X</kbd> — カット</p>
<p><kbd>Ctrl</kbd> + <kbd>A</kbd> — 全選択</p>
<p><kbd>Ctrl</kbd> + <kbd>D</kbd> — 選択削除</p>
<h4>カスタム次元（Config）</h4>
<p>Config → カスタム次元 → レンチアイコン — 管理ウィンドウを開く</p>
<p>分子/分母（例: 7/6）を入力、線の色と縦線位置をプレビュー</p>
<p>追加後、拡張/進行/転写メニューに対応ボタンが出現</p>
<p>任意の有理数比率に対応（n > d > 0）</p>
<p>チェックボックスで各次元を個別に有効/無効切替</p>
<h4>Config パネル</h4>
<p>拍長（ms）/ 音高 / 分解能 / 譜線次元 / 高次元</p>
<p>分割譜線 — 分解能に応じて拍内に細い譜線を追加</p>
<p>音価固定 — 新規ノートの長さを分解能に自動一致</p>
<p>自動スクロール — MIDI スタイルのスクロール</p>
<p>音符色 — 波長 / HSI拡張 / 白色</p>
<p>太さ / 線の太さ / 線の透明度 — 全体または単音で調整</p>
<h4>表示拡縮</h4>
<p><kbd>Ctrl</kbd> + ホイール — 等倍ズーム</p>
<p><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + ホイール — 縦伸縮</p>
<p><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + ホイール — 横伸縮</p>
<h4>分解能</h4>
<p><kbd>Tab</kbd> + 数字 — 分解能切替（例: Tab+4 → 1/4, Tab+12 → 1/12）</p>
<p>2桁対応、800ms タイムアウトで自動確定</p>
<p>0 は無視、再度 Tab で即時確定</p>
<h4>編集補助</h4>
<p><kbd>Ctrl</kbd> + <kbd>Z</kbd> — 元に戻す</p>
<p><kbd>H</kbd> — このヘルプを開く</p>
<p>左下 Shift スイッチ — 連動編集モード</p>
<p>左下ゴミ箱 — 全削除</p>
<h4>エクスポート</h4>
<p>MIDI（微分音） — フル微分音 MIDI（pitch bend 付き）</p>
<p>MIDI（12平均律） — 12-TET に量子化</p>
<p>MIDI（カスタム律制） — EDO値を入力、xenprog 形式</p>
<p>WAV / MP3 — オーディオレンダリング</p>
<h4>インポート</h4>
<p>MIDI（12平均律） — pitch bend 周波数復元</p>
<p>MIDI（微分音EDO） — EDO マッピング、トラック名から自動検出</p>
<p>プロジェクトファイル — .naf ファイル読込</p>
<h4>プロジェクト</h4>
<p>.naf ファイル保存/読込</p>
<p>URL 共有 — 全音符と設定をシリアライズ</p>
<p>保存時にパスとファイル名を選択可能</p>`
	},
	'en': {
		"prog": "[Progress]",
		"ext": "[Extend]",
		"ext-shortcut": "Ext Shortcut",
		"trans": "[Translate]",
		"config": "Config",
		"lang": "Language",
		"beat-length": "Beat Duration",
		"tonic": "Tonic",
		"scoreline": "Scorelines",
		"higherdim": "Higher Dimensions",
		"time-quantize": "Quantize Timing",
		"head": "Head",
		"tail": "Tail",
		"resolution": "　Resolution",
		"subdivide-lines": "Subdivide Lines",
		"fixed-note-len": "Fixed Note Len.",
		"beat": "beat",
		"time-randomize": "Randamize Timing",
		"pitch-quantize": "Quantize Pitch",
		"base-note": "Base Notes",
		"other-note": "Others",
		"tone": "Instrument",
		"copy-finish": "Copied",
		"export": "Export",
		"import": "Import",
		"custom-dim": "Custom Dim.",
		"custom-dim-title": "Custom Dimensions",
		"ratio": "Ratio",
		"ratio-hint": "Ratio must be > 1 (n > d)",
		"line-color": "Line Color",
		"mark-pos": "Mark Position",
		"no-custom-dim": "No custom dimensions",
		"close": "Close",
		"add": "Add",
		"delete": "Delete",
		"clear": "Clear",
		"skip": "Skip to Start",
		"notecolor": "Note Color",
		"wavelength": "Wavelength",
		"hsl": "HSI Enhanced",
		"color-white": "White",
		"pianoroll": "Piano Roll",
		"help": "Help",
		"shortcuts": "Shortcuts",
		"wavecolor": "Wavelength Color",
		"note-thickness": "Note Thick",
		"link-thickness": "Link Thick",
		"link-opacity": "Link Opacity",
		"root-mark": "Root Mark",
		"project": "Project",
		"save": "Save",
		"load": "Load",
		"sc-prompt": "Press shortcut keys...",
		"sc-hint": "Supports 2-key combos, e.g. A+B, Alt+Q",
		"sc-clear": "Clear",
		"sc-cancel": "Cancel",
		"custom": "Custom",
		"add-dim": "+ Add",
		"promote": "Promote to Root",
		"help-content": `<h4>Playback</h4>
<p><kbd>Space</kbd> — Play / Pause</p>
<p><kbd>Skip</kbd> button — Skip to start</p>
<p>Loop toggle (bottom bar) — Loop playback</p>
<h4>Note Editing</h4>
<p>Click empty grid — Create root note</p>
<p>Click note — Open edit popup</p>
<p>Drag left edge — Change start</p>
<p>Drag right edge — Change length</p>
<p>Drag middle — Change pitch</p>
<p><kbd>Ctrl</kbd> + drag note — Sync all chord notes' timing (head/tail/body)</p>
<p>Popup <i>delete</i> button — Delete note</p>
<p>Popup <i>visibility</i> button — Hide/Show (Ctrl+click to select hidden)</p>
<p>Popup <i>arrow_upward</i> button — Promote sub-note to root (auto-restructures chord)</p>
<p>Extend — Add harmonic sub-note</p>
<p>Trans — Transcribe note to another dimension</p>
<p>Prog — Progressively shift root pitch</p>
<p>Popup Hz field — Edit frequency directly</p>
<p>Popup controls — Volume, Mute, Thickness, Opacity</p>
<h4>Extension Shortcuts</h4>
<p>Popup bottom shows shortcut key per dimension</p>
<p>Click shortcut label to customize (supports 2-key combos like A+B)</p>
<p>Unassigned dimensions show "Custom" — click to configure</p>
<p><kbd>Shift</kbd> + shortcut — New note becomes current, enabling chain nesting (e.g. 3→2→4 deep)</p>
<h4>Selection & Bulking</h4>
<p><kbd>Shift</kbd> + drag — Box select</p>
<p>Drag any selected note — Move group</p>
<p>Click empty — Deselect</p>
<p><kbd>Ctrl</kbd> + <kbd>C</kbd> — Copy</p>
<p><kbd>Ctrl</kbd> + <kbd>V</kbd> — Paste (auto-offset if too close)</p>
<p><kbd>Ctrl</kbd> + <kbd>X</kbd> — Cut</p>
<p><kbd>Ctrl</kbd> + <kbd>A</kbd> — Select all</p>
<p><kbd>Ctrl</kbd> + <kbd>D</kbd> — Delete selected</p>
<h4>Custom Dimensions (Config)</h4>
<p>Config → Custom Dim. → wrench icon — Open manager</p>
<p>Enter numerator/denominator (e.g. 7/6), preview color & mark position</p>
<p>After adding, buttons appear in Extend/Prog/Trans menus</p>
<p>Supports arbitrary rational ratios (n > d > 0)</p>
<p>Checkbox toggle per dimension to enable/disable</p>
<h4>Config Panel</h4>
<p>Beat length (ms) / Tonic / Resolution / Scoreline dims / Higher dims</p>
<p>Subdivide Lines — Insert finer lines per resolution</p>
<p>Fixed Note Len. — New notes auto-match resolution</p>
<p>Piano Roll — MIDI-style scrolling</p>
<p>Note Color — Wavelength / HSI Enhanced / White</p>
<p>Thickness / Link Thickness / Link Opacity — Global or per-note</p>
<h4>View Zoom</h4>
<p><kbd>Ctrl</kbd> + Wheel — Zoom</p>
<p><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + Wheel — Stretch Y</p>
<p><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + Wheel — Stretch X</p>
<h4>Time Resolution</h4>
<p><kbd>Tab</kbd> + digit — Switch resolution (e.g. Tab+4 → 1/4, Tab+12 → 1/12)</p>
<p>Two-digit support, 800ms timeout auto-commit</p>
<p>Press 0 to skip, Tab again to commit</p>
<h4>Editing Aids</h4>
<p><kbd>Ctrl</kbd> + <kbd>Z</kbd> — Undo</p>
<p><kbd>H</kbd> — Open this help</p>
<p>Bottom-left Shift switch — Linked editing mode</p>
<p>Bottom-left trash — Clear all</p>
<h4>Export</h4>
<p>MIDI (Microtonal) — Full microtonal with pitch bend</p>
<p>MIDI (12TET) — Quantized to 12-TET</p>
<p>MIDI (Custom EDO) — Input EDO value, xenprog format</p>
<p>WAV / MP3 — Audio rendering</p>
<h4>Import</h4>
<p>MIDI (12TET) — Includes pitch bend frequency reconstruction</p>
<p>MIDI (Microtonal EDO) — EDO mapping, auto-detect from track name</p>
<p>Project file — Load .naf file</p>
<h4>Project</h4>
<p>Save / Load .naf files</p>
<p>URL sharing — Serializes all notes and settings</p>
<p>Choose save path and filename</p>`
	},
	'zh': {
		"prog": "［进行］",
		"ext": "［扩展］",
		"ext-shortcut": "扩展快捷键",
		"trans": "［转写］",
		"config": "设置",
		"lang": "语言",
		"beat-length": "1拍长度",
		"tonic": "基准音高",
		"scoreline": "谱线",
		"higherdim": "高维度",
		"time-quantize": "时间量化",
		"head": "开头",
		"tail": "末尾",
		"resolution": "　分辨率",
		"subdivide-lines": "分割谱线",
		"fixed-note-len": "时值相同",
		"beat": "拍",
		"time-randomize": "时间随机化",
		"pitch-quantize": "音高量化",
		"base-note": "底音",
		"other-note": "其他",
		"tone": "音色",
		"copy-finish": "复制完成",
		"export": "导出",
		"import": "导入",
		"custom-dim": "自定义维度",
		"custom-dim-title": "自定义维度管理",
		"ratio": "比例",
		"ratio-hint": "比例必须大于1（n > d）",
		"line-color": "连线颜色",
		"mark-pos": "竖线位置",
		"no-custom-dim": "暂无自定义维度",
		"close": "关闭",
		"add": "添加",
		"delete": "删除",
		"clear": "清屏",
		"skip": "回开头",
		"notecolor": "音符颜色",
		"wavelength": "波长",
		"hsl": "HSI增强",
		"color-white": "白色",
		"pianoroll": "卷帘式播放",
		"help": "帮助",
		"shortcuts": "快捷键",
		"wavecolor": "波长着色",
		"note-thickness": "音符粗细",
		"link-thickness": "连线粗细",
		"link-opacity": "连线透明",
		"root-mark": "根音箭头",
		"project": "工程",
		"save": "保存",
		"load": "加载",
		"sc-prompt": "按下快捷键...",
		"sc-hint": "支持同时按两键，如 A+B、Alt+Q",
		"sc-clear": "清除",
		"sc-cancel": "取消",
		"custom": "自定义",
		"add-dim": "+ 添加",
		"promote": "提升为根音",
		"help-content": `<h4>播放</h4>
<p><kbd>Space</kbd> — 播放 / 暂停</p>
<p><kbd>Skip</kbd> 按钮 — 跳回开头</p>
<p>底部循环开关 — 循环播放</p>
<h4>音符操作</h4>
<p>点击网格空白 — 创建根音符</p>
<p>点击音符 — 打开编辑弹窗</p>
<p>拖拽音符左端 — 改变起始位置</p>
<p>拖拽音符右端 — 改变长度</p>
<p>拖拽音符中部 — 改变音高</p>
<p><kbd>Ctrl</kbd> + 拖拽音符 — 同步拖动整个和弦所有音的时值（头/尾/体）</p>
<p>弹窗 <i>delete</i> 按钮 — 删除音符</p>
<p>弹窗 <i>visibility</i> 按钮 — 隐藏/显示音符（Ctrl+点击仍可选中）</p>
<p>弹窗 <i>arrow_upward</i> 按钮 — 提升子音符为根音（和弦自动重组）</p>
<p>Extend — 向当前音符添加泛音子音符</p>
<p>Trans — 将当前音符转写到另一维度</p>
<p>Prog — 累进移动根音音高</p>
<p>弹窗 Hz 栏可直接编辑频率</p>
<p>弹窗内可调音量、静音、粗细、透明度</p>
<h4>扩展快捷键</h4>
<p>弹窗底部显示各维度的快捷按键</p>
<p>点击快捷键标签可自定义键位（支持双键组合如 A+B）</p>
<p>未设置快捷键的维度显示"自定义"，点击即可设置</p>
<p><kbd>Shift</kbd> + 快捷键 — 新音成为当前选中，可连续嵌套（如 3→2→4 层层深入）</p>
<h4>框选与批量操作</h4>
<p><kbd>Shift</kbd> + 拖拽空白 — 矩形框选</p>
<p>拖拽任一选中音符 — 整体移动组</p>
<p>点击空白 — 取消选区</p>
<p><kbd>Ctrl</kbd> + <kbd>C</kbd> — 复制选中</p>
<p><kbd>Ctrl</kbd> + <kbd>V</kbd> — 粘贴（原位过近自动偏移）</p>
<p><kbd>Ctrl</kbd> + <kbd>X</kbd> — 剪切</p>
<p><kbd>Ctrl</kbd> + <kbd>A</kbd> — 全选</p>
<p><kbd>Ctrl</kbd> + <kbd>D</kbd> — 删除选中</p>
<h4>自定义维度（Config）</h4>
<p>Config → 自定义维度 → 扳手图标 — 打开管理弹窗</p>
<p>输入分子/分母（如 7/6），预览连线颜色和竖线位置</p>
<p>添加后在扩展/进行/转写菜单中出现对应按钮</p>
<p>支持任意有理数比率（n > d > 0）</p>
<p>自定义维度可通过勾选框独立启用/禁用</p>
<h4>Config 面板</h4>
<p>拍长（ms）/ 音高 / 分辨率 / 谱线维度 / 高维度</p>
<p>分割谱线 — 按分辨率细分拍内谱线</p>
<p>时值相同 — 点击创建音符时值自动匹配分辨率</p>
<p>卷帘式播放 — MIDI 风格滚屏</p>
<p>音符颜色 — 波长 / HSI增强 / 白色</p>
<p>粗细 / 连线粗细 / 连线透明度 — 全局或单音调节</p>
<h4>视图缩放</h4>
<p><kbd>Ctrl</kbd> + 滚轮 — 等比缩放</p>
<p><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + 滚轮 — 纵向拉伸</p>
<p><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + 滚轮 — 横向拉伸</p>
<h4>时值分辨率</h4>
<p><kbd>Tab</kbd> + 数字 — 切换分辨率（如 Tab+4 → 1/4，Tab+12 → 1/12）</p>
<p>支持两位数（Tab 后连续输入，800ms 超时自动提交）</p>
<p>按 0 忽略，再次按 Tab 立即提交</p>
<h4>编辑辅助</h4>
<p><kbd>Ctrl</kbd> + <kbd>Z</kbd> — 撤销</p>
<p><kbd>H</kbd> — 打开此帮助</p>
<p>左下角 Shift 开关 — 连带编辑模式</p>
<p>左下角垃圾桶 — 一键清屏</p>
<h4>导出</h4>
<p>MIDI（微分音） — 全微分音 MIDI 导出（含 pitch bend）</p>
<p>MIDI（12平均律） — 量化到 12-TET</p>
<p>MIDI（自定义律制） — 输入 EDO 值，导出为对应律制</p>
<p>WAV / MP3 — 音频渲染导出</p>
<h4>导入</h4>
<p>MIDI（12平均律） — 含 pitch bend 还原</p>
<p>MIDI（微分音EDO） — 按指定 EDO 映射，自动检测轨道名</p>
<p>工程文件 — 加载 .naf 文件</p>
<h4>工程管理</h4>
<p>保存 / 加载 .naf 工程文件</p>
<p>URL 分享 — 序列化所有音符和设置</p>
<p>保存时可选路径和文件名</p>`
	},
	'sf': {
		"prog": "[Clyftach]",
		"ext": "[Tacclechäzc]",
		"ext-shortcut": "Ext Sypanch",
		"trans": "[Blanascäzc]",
		"config": "Ftutzc",
		"lang": "Kytcyk",
		"beat-length": "Pytrå smot",
		"tonic": "Mysalipa",
		"scoreline": "Tymnaschafa",
		"higherdim": "Vracalycas",
		"time-quantize": "Xernå tarcfanäzc",
		"head": "Yunam",
		"tail": "Tainam",
		"resolution": "Recutalsyxa",
		"subdivide-lines": "Xub Taccle",
		"fixed-note-len": "Fyxac Lyn.",
		"beat": "pyt'",
		"time-randomize": "Xernå chaschlaväzc",
		"pitch-quantize": "Clavany tarcfanäzc",
		"base-note": "Lystalipam",
		"other-note": "Fynächam",
		"tone": "Vlesyvom",
		"copy-finish": "Na chlacrapham",
		"export": "Raplyc",
		"import": "Implyc",
		"custom-dim": "Cux Tym",
		"custom-dim-title": "Cux Tym Manyzal",
		"ratio": "Rac",
		"ratio-hint": "Rac > 1 (n > d)",
		"line-color": "Taccle Culyr",
		"mark-pos": "Marc Poxyx",
		"no-custom-dim": "Nyca ra cux tym",
		"close": "Zlyx",
		"add": "Addyna",
		"delete": "Delete",
		"clear": "Vanyc",
		"skip": "Ylypa Lyt",
		"notecolor": "Nota Claplyc",
		"wavelength": "Lynan",
		"hsl": "HSI Xynfyncyd",
		"color-white": "Plychtyn",
		"pianoroll": "Pyanapy Llyll",
		"help": "Hyllp",
		"shortcuts": "Sypanchyc",
		"wavecolor": "Lynan Claplyc",
		"note-thickness": "Nota Pychtyx",
		"link-thickness": "Taccle Pychtyx",
		"link-opacity": "Taccle Xlanytyx",
		"root-mark": "Nafcha Marc",
		"project": "Clypmelyt",
		"save": "Plych",
		"load": "Tatcha",
		"sc-prompt": "Prych sypanchyc...",
		"sc-hint": "Xuplytc 2-kyc cymbyc, lysa A+B, Alt+Q",
		"sc-clear": "Vanyc",
		"sc-cancel": "Cancyl",
		"custom": "Cux",
		"add-dim": "+ Addyna",
		"promote": "Plymyta ta Clypt",
		"help-content": `<h4>Plychbac</h4>
<p><kbd>Space</kbd> — Plych / Pausa</p>
<p><kbd>Skyp</kbd> byttyn — Skyp ta clypt</p>
<p>Llyp tyggly (byttym bal) — Llyp plychbac</p>
<h4>Nyta Edytyn</h4>
<p>Clyc ympty glyd — Clyfta nyta</p>
<p>Clyc nyta — Xan edyt typ</p>
<p>Dlyg lyft ydga — Chanfa clypt</p>
<p>Dlyg lyt ydga — Chanfa lyn</p>
<p>Dlyg myddyl — Chanfa pych</p>
<p><kbd>Ctrlyc</kbd> + dlyg nyta — Cync yll chlyd nytac tymyn (hyd/tayl/bydy)</p>
<p>Typ <i>delyta</i> byttyn — Delyta nyta</p>
<p>Typ <i>vycybylyt</i> byttyn — Hyda/Xan (Ctrlyc ta cylyct hyddan)</p>
<p>Typ <i>arrow_upward</i> byttyn — Plymyta xub-nyta ta clypt (yta-lyctlyctyl chlyd)</p>
<p>Extynd — Addyna pylanyc</p>
<p>Tlyns — Tlynsclyba ta anythal tym</p>
<p>Plyg — Plyglyccyva chyft pych</p>
<p>Typ Hz fyld — Edyt flyqyncy dlyctly</p>
<p>Typ cyntlyc — Vlym, Myta, Pychtyx, Xlanytyx</p>
<h4>Ext Sypanchyc</h4>
<p>Typ byttym chan sypanch ka pal tym</p>
<p>Clyc sypanch lybyl ta cuxmyza (2-kyc cymbyc lysa A+B)</p>
<p>Unacycnad tym chy "Cux" — clyc ta cynfyg</p>
<p><kbd>Chyft</kbd> + sypanch — Ny nyta bycymac cylynt, anablyn chayn nyctyn (lysa 3→2→4 dap)</p>
<h4>Sylctyna & Bylkyn</h4>
<p><kbd>Chyft</kbd> + dlyg — Byx cylct</p>
<p>Dlyg sylctad nyta — Myva glyp</p>
<p>Clyc ympty — Dysylct</p>
<p><kbd>Ctrlyc</kbd> + <kbd>C</kbd> — Clypy</p>
<p><kbd>Ctrlyc</kbd> + <kbd>V</kbd> — Plyca</p>
<p><kbd>Ctrlyc</kbd> + <kbd>X</kbd> — Cyt</p>
<p><kbd>Ctrlyc</kbd> + <kbd>A</kbd> — Clyct yll</p>
<p><kbd>Ctrlyc</kbd> + <kbd>D</kbd> — Delyta cylctad</p>
<h4>Cux Tym (Ftytzc)</h4>
<p>Ftytzc → Cux Tym → lynch ycyn → Xan manyzal</p>
<p>Ental nym/dyn (lysa 7/6), plevyan culyr & malc pxyx</p>
<p>Aftal addyna, byttync appal yn Ext/Plyg/Tlyns</p>
<p>Xyplytc rymalc lysac (n > d > 0)</p>
<p>Chacbyx tyggyl pal tym ta anabyl/dycybly</p>
<h4>Ftytzc Panyl</h4>
<p>Pyt lyn (mc) / Tynyc / Racytalsyxa / Tymna xyn / Hych taym</p>
<p>Xub Taccle — Incalt fynal lynac pal racytalsyxa</p>
<p>Fyxac Lyn. — Ny nytyc yta-mych racytalsyxa</p>
<p>Pyanapy Llyll — MIDI-cylyl clyll</p>
<p>Nyta Clyplyc — Lynan / HCI / Plychtyn</p>
<p>Pychtyx / Taccle Pychtyx / Taccle Xlanytyx — Glybyl al pal-nyta</p>
<h4>Vyan Zym</h4>
<p><kbd>Ctrlyc</kbd> + Whyl — Zym</p>
<p><kbd>Ctrlyc</kbd> + <kbd>Chyft</kbd> + Whyl — Clytch Y</p>
<p><kbd>Ctrlyc</kbd> + <kbd>Alt</kbd> + Whyl — Clytch X</p>
<h4>Xaln Racytalsyxa</h4>
<p><kbd>Tab</kbd> + dygyt — Chytch racytalsyxa (lysa Tab+4 → 1/4)</p>
<p>Ty-dygyt xyplytc, 800mc tymytycy yta-cymmyt</p>
<p>Plyc 0 ta clyp, Tab agyn ta cymmyt</p>
<h4>Edytalg Aydc</h4>
<p><kbd>Ctrlyc</kbd> + <kbd>Z</kbd> — Yndy</p>
<p><kbd>H</kbd> — Xan thys hyllp</p>
<p>Byttym-lyft Chyft cytch — Lyncyd edytyn</p>
<p>Byttym-lyft tlych — Clyal yll</p>
<h4>Explyt</h4>
<p>MIDI (Myclytynyl) — Fyll myclytynyl (pych bynd)</p>
<p>MIDI (12TET) — Qyntyzad ta 12-TET</p>
<p>MIDI (Cux EDO) — Ental EDO, xanplyg fylmyt</p>
<p>WAV / MP3 — Adyala ncyn</p>
<h4>Implyt</h4>
<p>MIDI (12TET) — Pych bynd flyqyncy lacynctlyc</p>
<p>MIDI (Myclytynyl EDO) — EDO myppyn, yta-dytact flym tlyc nyma</p>
<p>Plyjact fyla — Lyd .naf fyla</p>
<h4>Plyjact</h4>
<p>Plych / Tatcha .naf fylyc</p>
<p>URL chalyn — Calylyza yll nytyc ynd cyttyn</p>
<p>Chyca plych pyth ynd fylynyma</p>`
	},
}
