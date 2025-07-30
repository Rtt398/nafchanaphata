import {$, $$} from './util.js'

export function i18n(lang) {
	const d = tr[lang]
	if (!d) return console.log('Lang', lang, 'not supported')
	for (const elm of $$('[data-i18n]')) {
		elm.innerText = d[elm.dataset.i18n]
	}
	$('html').lang = lang
}

const tr = {
	'ja': {
		"prog": "［進行］",
		"ext": "［拡張］",
		"trans": "［転写］",
		"config": "設定",
		"lang": "言語",
		"beat-length": "1拍の長さ",
		"tonic": "主音",
		"time-quantize": "時刻の量子化",
		"head": "先頭",
		"tail": "末尾",
		"resolution": "　分解能",
		"beat": "拍",
		"time-randomize": "時刻のランダム化",
		"pitch-quantize": "音高の量子化",
		"base-note": "底音",
		"other-note": "その他",
		"tone": "音色",
		"copy-finish": "コピー完了"
	},
	'en': {
		"prog": "[Progress]",
		"ext": "[Extend]",
		"trans": "[Translate]",
		"config": "Config",
		"lang": "Language",
		"beat-length": "Beat Length",
		"tonic": "Tonic",
		"time-quantize": "Quantize Timing",
		"head": "Head",
		"tail": "Tail",
		"resolution": "　Resolution",
		"beat": "beat",
		"time-randomize": "Randamize Timing",
		"pitch-quantize": "Quantize Pitch",
		"base-note": "Base Notes",
		"other-note": "Others",
		"tone": "Instrument",
		"copy-finish": "Copied"
	},
	'sf': {
		"prog": "[Clyftach]",
		"ext": "[Tacclechäzc]",
		"trans": "[Blanascäzc]",
		"config": "Ftutzc",
		"lang": "Kytcyk",
		"beat-length": "Pytrå smot",
		"tonic": "Mysalipa",
		"time-quantize": "Xernå tarcfanäzc",
		"head": "Yunam",
		"tail": "Tainam",
		"resolution": "　Clycertnakyx",
		"beat": "pyt’",
		"time-randomize": "Xernå chaschlaväzc",
		"pitch-quantize": "Clavany tarcfanäzc",
		"base-note": "Lystalipam",
		"other-note": "Fynächam",
		"tone": "Vlesyvom",
		"copy-finish": "Na chlacrapham"
	},
}