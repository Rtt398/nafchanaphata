/*
 * 工具函数模块 — DOM操作、音高计算、量化辅助
 * ユーティリティ関数 — DOM操作、ピッチ計算、クオンタイズ補助
 * Utility functions — DOM helpers, pitch math, quantization aids
 */
export const $ = q => document.querySelector(q)
export const $$ = q => document.querySelectorAll(q)
export const range = n => Array(n).keys()

// 最大公约数 / 最大公約数 / Greatest Common Divisor
export const gcd = (a, b) => {
	return (b === 0) ? a : gcd(b, a % b)
}
// 纯律音程定义表（正/负维度） / 純正律音程テーブル（正・負次元） / Just intonation interval table (positive/negative dimensions)
export const pitchIntervals = {
	// pitch: n/d, linestyle: {color, width}, position: {bottom, top}, curve: {middle}
	'0d':  {id:  0, n:  1, d:  1, c: '#aaaaaa', w: 1, b: 0.5, t: 0.5, m:   0},
	'1d':  {id:  1, n:  2, d:  1, c: '#aaaaaa', w: 3, b: 0.5, t: 0.5, m:   0},
	'2d':  {id:  2, n:  3, d:  2, c: '#f27992', w: 7, b: 0  , t: 0  , m:   0},
	'3d':  {id:  3, n:  5, d:  4, c: '#6cd985', w: 7, b: 1  , t: 1  , m:   0},
	'4d':  {id:  4, n:  7, d:  4, c: '#b598ee', w: 7, b: 0  , t: 1  , m:   0},
	'5d':  {id:  5, n: 11, d:  4, c: '#ffc247', w: 7, b: 1  , t: 0  , m:   0},
	'6d':  {id:  6, n: 13, d:  4, c: '#b5b500', w: 7, b: 0  , t: 0  , m: -16},
	'7d':  {id:  7, n: 17, d:  4, c: '#ed9877', w: 7, b: 1  , t: 1  , m:  16},
	'-0d': {id:  0, n:  1, d:  1, c: '#aaaaaa', w: 1, b: 0.5, t: 0.5, m:   0},
	'-1d': {id: -1, n:  1, d:  2, c: '#aaaaaa', w: 3, b: 0.5, t: 0.5, m:   0},
	'-2d': {id: -2, n:  2, d:  3, c: '#f27992', w: 7, b: 0  , t: 0  , m:   0},
	'-3d': {id: -3, n:  4, d:  5, c: '#6cd985', w: 7, b: 1  , t: 1  , m:   0},
	'-4d': {id: -4, n:  4, d:  7, c: '#b598ee', w: 7, b: 1  , t: 0  , m:   0},
	'-5d': {id: -5, n:  4, d: 11, c: '#ffc247', w: 7, b: 0  , t: 1  , m:   0},
	'-6d': {id: -6, n:  4, d: 13, c: '#b5b500', w: 7, b: 0  , t: 0  , m: -16},
	'-7d': {id: -7, n:  4, d: 17, c: '#ed9877', w: 7, b: 1  , t: 1  , m:  16}
}
// 频率→Y坐标转换 / 周波数→Y座標変換 / Frequency to Y-coordinate conversion
export const hz2y = hz => (Math.log2(20000) - Math.log2(hz)) * 100 || undefined
// Y坐标→频率转换 / Y座標→周波数変換 / Y-coordinate to frequency conversion
export const y2hz = y => 20000 / 2**(y/100) || undefined
// X坐标→Ticks（1拍=48px=192ticks） / X座標→Ticks（1拍=48px=192ticks） / X-coordinate to Ticks conversion
export const x2t = x => Math.round(x/48*192)
// Ticks→X坐标 / Ticks→X座標 / Ticks to X-coordinate conversion
export const t2x = t => t*48/192
// 频率比→像素距离（n/d 音程的Y轴间距） / 周波数比→ピクセル距離（n/d音程のY軸間隔） / Frequency ratio to pixel distance (Y-axis spacing for n/d interval)
export const f2d = (n, d) => (Math.log2(d) - Math.log2(n)) * 100 || undefined
// 频率比→维度名（纯律分析：分解为1d~7d的组合） / 周波数比→次元名（純正律分析：1d〜7dの組み合わせに分解） / Frequency ratio to dimension name (just intonation decomposition into 1d~7d)
export const tav = (n, d) => {
	;[n, d] = [n, d].map(x => x / gcd(n, d))
	if (n == 1 && d == 1) return '0d'
	let res = ""
	for (const [i, v, u] of [[7,17,4],[6,13,4],[5,11,4],[4,7,4],[3,5,4],[2,3,2],[1,2,1]]) {
		let t = -1
		while (n % v**(++t+1) == 0) {}
		if (t) res = `${i}d${'↑'.repeat(t)}${res}`
		n /= v**t / u**t
		;[n, d] = [n, d].map(x => x / gcd(n, d))
		t = -1
		while (d % v**(++t+1) == 0) {}
		if (t) res = `${i}d${'↓'.repeat(t)}${res}`
		d /= v**t / u**t
		;[n, d] = [n, d].map(x => x / gcd(n, d))
	}
	if (n > 1 || d > 1) console.log(`警告：8次元以上の残余: ${n}/${d}`)
	return res
}
// 基频量化（EDO等分律） / 基音クオンタイズ（EDO平均律） / Base frequency quantization (EDO equal division)
export const qb = hz => {
	const edo = $('#config-edo').value
	const tonic = $('#config-tonic').value
	const base = $('#config-quantize-base').checked
	if (!edo || !tonic || !base) return hz
	const step = Math.round(Math.log2(hz / tonic) * edo)
	return tonic * 2 ** (step / edo)
}
// 泛音量化（EDO等分律） / 倍音クオンタイズ（EDO平均律） / Sub-frequency quantization (EDO equal division)
export const qs = hz => {
	const edo = $('#config-edo').value
	const tonic = $('#config-tonic').value
	const sub = $('#config-quantize-sub').checked
	if (!edo || !tonic || !sub) return hz
	const step = Math.round(Math.log2(hz / tonic) * edo)
	return tonic * 2 ** (step / edo)
}
// 起始位置量化（吸附到网格） / 開始位置クオンタイズ（グリッドスナップ） / Head position quantization (snap to grid)
export const qh = x => {
	// 1 beat = 48 tick
	const tick = $('#config-tick').value
	const head = $('#config-quantize-head').checked
	if (!tick || !head) return x
	return Math.round(x * tick / 48) * 48 / tick
}
// 结束位置量化（吸附到网格） / 終了位置クオンタイズ（グリッドスナップ） / Tail position quantization (snap to grid)
export const qt = x => {
	// 1 beat = 48 tick
	const tick = $('#config-tick').value
	const tail = $('#config-quantize-tail').checked
	if (!tick || !tail) return x
	return Math.round(x * tick / 48) * 48 / tick
}
// 全局时间偏移（防止负Ticks） / グローバル時間オフセット（負Ticks防止） / Global time offset (prevents negative Ticks)
export const OFFSET = 192000

