export const $ = q => document.querySelector(q)
export const $$ = q => document.querySelectorAll(q)
export const range = n => Array(n).keys()

export const gcd = (a, b) => {
	return (b === 0) ? a : gcd(b, a % b)
}
export const pitchIntervals = {
	'0d': {id: 0, n: 1, d:  1, c: '#aaaaaa', w: 1, b: 0.5, t: 0.5},
	'1d': {id: 1, n: 2, d:  1, c: '#aaaaaa', w: 3, b: 0.5, t: 0.5},
	'2d': {id: 2, n: 3, d:  2, c: '#f27999', w: 7, b: 0, t: 0},
	'3d': {id: 3, n: 5, d:  4, c: '#6cd985', w: 7, b: 1, t: 1},
	'4d': {id: 4, n: 7, d:  4, c: '#b598ee', w: 7, b: 0, t: 1},
	'5d': {id: 5, n: 11, d: 4, c: '#ffc247', w: 7, b: 1, t: 0},
	'6d': {id: 6, n: 13, d: 4, c: '#b5b500', w: 7, b: 0.5, t: 0.5},
	'-0d': {id: 0, n: 1, d:  1, c: '#aaaaaa', w: 1, b: 0.5, t: 0.5},
	'-1d': {id: -1, n: 1, d:  2, c: '#aaaaaa', w: 3, b: 0.5, t: 0.5},
	'-2d': {id: -2, n: 2, d:  3, c: '#f27999', w: 7, b: 0, t: 0},
	'-3d': {id: -3, n: 4, d:  5, c: '#6cd985', w: 7, b: 1, t: 1},
	'-4d': {id: -4, n: 4, d:  7, c: '#b598ee', w: 7, b: 1, t: 0},
	'-5d': {id: -5, n: 4, d: 11, c: '#ffc247', w: 7, b: 0, t: 1},
	'-6d': {id: -6, n: 4, d: 13, c: '#b5b500', w: 7, b: 0.5, t: 0.5}
}
export const hz2y = hz => (Math.log2(20000) - Math.log2(hz)) * 100 || undefined
export const y2hz = y => 20000 / 2**(y/100) || undefined
export const x2t = x => Math.round(x/48*192)
export const t2x = t => t*48/192
export const f2d = (n, d) => (Math.log2(d) - Math.log2(n)) * 100 || undefined
export const tav = (n, d) => {
	;[n, d] = [n, d].map(x => x / gcd(n, d))
	if (n == 1 && d == 1) return '0d'
	let res = ""
	for (const [i, v, u] of [[6,13,4],[5,11,4],[4,7,4],[3,5,4],[2,3,2],[1,2,1]]) {
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
	if (n > 1 || d > 1) console.log(`警告：7次元以上の残余: ${n}/${d}`)
	return res
}
export const qb = hz => {
	const edo = $('#config-edo').value
	const tonic = $('#config-tonic').value
	const base = $('#config-quantize-base').checked
	if (!edo || !tonic || !base) return hz
	const step = Math.round(Math.log2(hz / tonic) * edo)
	return tonic * 2 ** (step / edo)
}
export const qs = hz => {
	const edo = $('#config-edo').value
	const tonic = $('#config-tonic').value
	const sub = $('#config-quantize-sub').checked
	if (!edo || !tonic || !sub) return hz
	const step = Math.round(Math.log2(hz / tonic) * edo)
	return tonic * 2 ** (step / edo)
}
export const qh = x => {
	// 1 beat = 48 tick
	const tick = $('#config-tick').value
	const head = $('#config-quantize-head').checked
	if (!tick || !head) return x
	return Math.round(x * tick / 48) * 48 / tick
}
export const qt = x => {
	// 1 beat = 48 tick
	const tick = $('#config-tick').value
	const tail = $('#config-quantize-tail').checked
	if (!tick || !tail) return x
	return Math.round(x * tick / 48) * 48 / tick
}
export const OFFSET = 192000

