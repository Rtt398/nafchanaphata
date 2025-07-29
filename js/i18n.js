import {$$} from './util.js'

export function i18n(lang) {
	const d = tr[lang]
	if (!d) return console.log('Lang', lang, 'not supported')
	for (const elm of $$('[data-i18n]')) {
		elm.innerText = d[elm.dataset.i18n]
	}
}

const tr = {
	'ja': {
		"prog": "［進行］",
		"ext": "［拡張］",
		"trans": "［転写］",
		"config": "設定",
		"lang": "言語",
		"beat-length": "1拍の長さ",
		"tonic": "基準音高",
		"time-quantize": "時刻の量子化",
		"head": "先頭",
		"tail": "末尾",
		"quantize": "　分解能",
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
		"tonic": "Tonic Pitch",
		"time-quantize": "Quantize Time",
		"head": "Head",
		"tail": "Tail",
		"quantize": "　Resolution",
		"beat": "beat",
		"time-randomize": "Randamize Time",
		"pitch-quantize": "Quantize Pitch",
		"base-note": "Base",
		"other-note": "Other",
		"tone": "Instrument",
		"copy-finish": "Copied"
	},
	'sf': {
		"prog": "[Clyftach]",
		"ext": "[Tacclechäzc]",
		"trans": "[Blanascäzc]",
		"config": "Ftutzc",
		"lang": "Kytcyk",
		"beat-length": "Pyt Matia",
		"tonic": "Atphaclava",
		"time-quantize": "Tarcfanäzc Spus",
		"head": "Yuna",
		"tail": "Canol",
		"quantize": "　Clycertnakyx",
		"beat": "pyt",
		"time-randomize": "Choschta Spus",
		"pitch-quantize": "Tarcfanäzc Clava",
		"base-note": "Lystalipa",
		"other-note": "Fynäska",
		"tone": "Vlesyvo",
		"copy-finish": "Chlocle"
	},
}