/*
 * MIDI/音频模块：处理 MIDI 导入导出（12TET、微分音、自定义 EDO）、WAV 音频渲染和采样管理
 * MIDI/オーディオモジュール：MIDI インポート/エクスポート（12TET、微分音、カスタムEDO）、WAV オーディオレンダリング、サンプル管理
 * MIDI/audio module: handles MIDI import/export (12TET, microtonal, custom EDO), WAV audio rendering, and sample management
 */

import { $, x2t, t2x, hz2y, OFFSET } from './util.js'
import { RootNote } from './note.js'
import history from './history.js'
import { stage, grid, rootlayer } from './sequencer.js'

// ========== 常量 ==========
// ========== 定数 ==========
// ========== Constants ==========
const PPQN = 480
const PROJ_TICKS_PER_BEAT = 192  // 项目内部: 192 ticks/beat
const PB_RANGE_SEMIS = 2  // Pitch Bend 范围: ±2 半音
const PB_CENTER = 8192     // Pitch Bend 中心值 (0x2000)

// ========== 工具函数 ==========
// ========== ユーティリティ関数 ==========
// ========== Utility functions ==========

// 频率 → MIDI 音符号（12TET，四舍五入）
// 周波数 → MIDI ノート番号（12TET、四捨五入）
// Frequency → MIDI note number (12TET, rounded)
function hzToMidi12TET(hz) {
	if (!hz || hz <= 0) return 60
	return Math.max(0, Math.min(127, Math.round(12 * Math.log2(hz / 440) + 69)))
}
// 频率 → MIDI 音符号（12TET，向下取整用于 Pitch Bend）
// 周波数 → MIDI ノート番号（12TET、切り捨て、ピッチベンド用）
// Frequency → MIDI note number (12TET, floored for Pitch Bend)
function hzToMidiFloor(hz) {
	if (!hz || hz <= 0) return 60
	return Math.max(0, Math.min(126, Math.floor(12 * Math.log2(hz / 440) + 69)))
}
// 计算 Pitch Bend 值：将实际频率与量化 MIDI 音的偏差映射到 ±2 半音范围
// ピッチベンド値を計算：実際の周波数と量子化 MIDI 音の偏差を ±2 半音範囲にマッピング
// Calculate Pitch Bend: map deviation between actual Hz and quantized MIDI note to ±2 semitone range
function calcPitchBend(hz, midiNote) {
	const exactNote = 12 * Math.log2(hz / 440) + 69
	const cents = (exactNote - midiNote) * 100
	const pb = Math.round(cents / (PB_RANGE_SEMIS * 100) * PB_CENTER + PB_CENTER)
	return Math.max(0, Math.min(16383, pb))
}
// 项目 tick → MIDI tick 转换 // プロジェクト tick → MIDI tick 変換 // Project tick → MIDI tick conversion
function projTickToMidi(tick) { return Math.round(tick / PROJ_TICKS_PER_BEAT * PPQN) }
// MIDI 可变长度编码 // MIDI 可変長エンコーディング // MIDI variable-length encoding
function varLength(value) {
	const bytes = []; let v = value >>> 0
	do { bytes.unshift(v & 0x7F); v >>>= 7 } while (v > 0)
	for (let i = 0; i < bytes.length - 1; i++) bytes[i] |= 0x80
	return bytes
}
// 写入 16 位大端整数 // 16 ビットビッグエンディアン整数書き込み // Write 16-bit big-endian integer
function write16BE(v) { return [(v >> 8) & 0xFF, v & 0xFF] }
// 写入 32 位大端整数 // 32 ビットビッグエンディアン整数書き込み // Write 32-bit big-endian integer
function write32BE(v) { return [(v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF] }
// 下载 Blob 文件 // Blob ファイルをダウンロード // Download blob as file
function downloadBlob(blob, filename) {
	const url = URL.createObjectURL(blob); const a = document.createElement('a')
	a.href = url; a.download = filename; document.body.appendChild(a)
	a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}

// ========== 音符收集 ==========
// ========== 音符収集 ==========
// ========== Note collection ==========

// 收集所有音符：遍历所有 RootNote 并将树展平为时间排序列表
// すべての音符を収集：全 RootNote を走査しツリーを時間順リストにフラット化
// Collect all notes: traverse all RootNotes and flatten the tree into a time-ordered list
function collectAllNotes(rootlayer) {
	const result = []
	for (const root of rootlayer.getChildren()) {
		const rootStart = x2t(root.x())
		flattenNotes(root, rootStart, result)
	}
	result.sort((a, b) => a.absStart - b.absStart)
	return result
}
// 递归展平音符树（跳过静音音符）// 音符ツリーを再帰的にフラット化（ミュート音符をスキップ）// Recursively flatten note tree (skip muted notes)
function flattenNotes(note, absTime, out) {
	if (!note.mute) {
		const nd = note.note
		out.push({ hz: nd.hz, absStart: absTime + (nd._time || 0), duration: nd._len || 0, vol: nd.vol || 0.5 })
	}
	for (const child of note.childNotes.getChildren()) flattenNotes(child, absTime, out)
}

// ========== MIDI Header / Track ==========
// ========== MIDI ヘッダー / トラック ==========
// ========== MIDI Header / Track ==========

// 构建 MIDI 文件头：类型 0，单轨，PPQN 时间分割
// MIDI ファイルヘッダーを構築：タイプ 0、単一トラック、PPQN タイムディビジョン
// Build MIDI file header: type 0, single track, PPQN time division
function buildMidiHeader() {
	return [0x4D,0x54,0x68,0x64, 0,0,0,6, 0,0, 0,1, ...write16BE(PPQN)]
}
// 构建 MIDI 轨道：包含速度、轨道名、Pitch Bend 范围、音符事件
// MIDI トラックを構築：テンポ、トラック名、ピッチベンド範囲、音符イベントを含む
// Build MIDI track: includes tempo, track name, pitch bend range, note events
function buildMidiTrack(events, tempo, trackName = 'Nafc') {
	const td = []
	td.push(0, 0xFF,0x51,0x03, (tempo>>16)&0xFF,(tempo>>8)&0xFF,tempo&0xFF)
	// 轨道名（含 EDO 信息，供导入时自动检测）
	const nameBytes = [...new TextEncoder().encode(trackName)]
	td.push(0, 0xFF,0x03, nameBytes.length, ...nameBytes)
	// Pitch Bend Range: ±2 semitones
	if (events.length > 0 && events[0].pb !== undefined) {
		td.push(0, 0xB0,0x65,0, 0, 0xB0,0x64,0, 0, 0xB0,0x06,PB_RANGE_SEMIS, 0, 0xB0,0x26,0)
	}
	let lt = 0
	for (const e of events) {
		const d = projTickToMidi(e.tick - lt); lt = e.tick
		td.push(...varLength(d))
		if (e.type === 'pb') { td.push(0xE0, e.pb&0x7F, (e.pb>>7)&0x7F) }
		else if (e.type === 'noteOn') { td.push(0x90, e.note, e.vel) }
		else { td.push(0x80, e.note, 0) }
	}
	td.push(...varLength(0), 0xFF,0x2F,0)
	return [0x4D,0x54,0x72,0x6B, ...write32BE(td.length), ...td]
}

// ========== 导出: 微分音 MIDI ==========
// ========== エクスポート: 微分音 MIDI ==========
// ========== Export: microtonal MIDI ==========

// 导出微分音 MIDI：使用 Pitch Bend 实现非 12TET 音高
// 微分音 MIDI をエクスポート：ピッチベンドを使用して非 12TET 音高を実現
// Export microtonal MIDI: use Pitch Bend to achieve non-12TET pitches
export function exportMidiMicrotonal(rootlayer) {
	const all = collectAllNotes(rootlayer); if (!all.length) return
	const beatMs = parseInt($('#config-beat').value) || 500
	const events = []
	for (const n of all) {
		const midi = hzToMidiFloor(n.hz); const pb = calcPitchBend(n.hz, midi)
		const vel = Math.max(1, Math.min(127, Math.round(n.vol * 127)))
		events.push({ tick: n.absStart, type: 'pb', pb }, { tick: n.absStart, type: 'noteOn', note: midi, vel }, { tick: n.absStart + n.duration, type: 'noteOff', note: midi })
	}
	events.sort((a, b) => a.tick - b.tick)
	const blob = new Blob([new Uint8Array([...buildMidiHeader(), ...buildMidiTrack(events, beatMs*1000)])], { type: 'audio/midi' })
	downloadBlob(blob, 'nafchanaphata_microtonal.mid')
}

// ========== 导出: 自定义律制 MIDI（xenprog 格式） ==========
// MIDI 音符编号直接表示 EDO 步数（69 = A4 = tonic），不含 pitch bend
// EDO 值以轨道名形式保存，供 importMidiMicrotonal 自动检测

// 导出自定义 EDO MIDI：MIDI 音符编号直接映射到 EDO 步数
// カスタム EDO MIDI をエクスポート：MIDI ノート番号を EDO ステップに直接マッピング
// Export custom EDO MIDI: MIDI note numbers directly map to EDO steps
export function exportMidiCustomEDO(rootlayer, edo) {
	const all = collectAllNotes(rootlayer); if (!all.length) return
	const beatMs = parseInt($('#config-beat').value) || 500
	const tonic = parseFloat($('#config-tonic').value) || 440
	const TONIC_MIDI = 69  // A4 = MIDI note 69 = tonic Hz
	const events = []
	for (const n of all) {
		// hz → EDO 步数（量化到最近步）
		const exactStep = TONIC_MIDI + edo * Math.log2(n.hz / tonic)
		const midiNote = Math.round(exactStep)
		// 限制在 MIDI 范围 (0-127)
		if (midiNote < 0 || midiNote > 127) continue
		const vel = Math.max(1, Math.min(127, Math.round(n.vol * 127)))
		events.push(
			{ tick: n.absStart, type: 'noteOn', note: midiNote, vel },
			{ tick: n.absStart + n.duration, type: 'noteOff', note: midiNote }
		)
	}
	events.sort((a, b) => a.tick - b.tick)
	const blob = new Blob([new Uint8Array([...buildMidiHeader(), ...buildMidiTrack(events, beatMs*1000, `nafchan ${edo}edo`)])], { type: 'audio/midi' })
	downloadBlob(blob, `nafchanaphata_${edo}edo.mid`)
}

// ========== 导出: 12-TET MIDI ==========
// ========== エクスポート: 12-TET MIDI ==========
// ========== Export: 12-TET MIDI ==========

// 导出 12TET MIDI：将频率四舍五入到最近的半音
// 12TET MIDI をエクスポート：周波数を最も近い半音に四捨五入
// Export 12TET MIDI: round frequencies to the nearest semitone
export function exportMidi12TET(rootlayer) {
	const all = collectAllNotes(rootlayer); if (!all.length) return
	const beatMs = parseInt($('#config-beat').value) || 500
	const events = []
	for (const n of all) {
		const vel = Math.max(1, Math.min(127, Math.round(n.vol * 127)))
		events.push({ tick: n.absStart, type: 'noteOn', note: hzToMidi12TET(n.hz), vel }, { tick: n.absStart + n.duration, type: 'noteOff', note: hzToMidi12TET(n.hz) })
	}
	events.sort((a, b) => a.tick - b.tick)
	const blob = new Blob([new Uint8Array([...buildMidiHeader(), ...buildMidiTrack(events, beatMs*1000)])], { type: 'audio/midi' })
	downloadBlob(blob, 'nafchanaphata_12tet.mid')
}

// 默认 MIDI 导出：使用微分音模式 // デフォルト MIDI エクスポート：微分音モードを使用 // Default MIDI export: use microtonal mode
export function exportMidi(rootlayer) { exportMidiMicrotonal(rootlayer) }

// ========== 音频渲染（OfflineAudioContext，秒级导出） ==========
// ========== オーディオレンダリング（OfflineAudioContext、高速エクスポート） ==========
// ========== Audio rendering (OfflineAudioContext, fast export) ==========

// 各乐器的采样映射: { 音名 → [文件URL, MIDI基准音高] }
// 各楽器のサンプルマッピング: { 音名 → [ファイルURL, MIDI基準音高] }
// Sample mapping per instrument: { note name → [file URL, MIDI reference pitch] }
const SAMPLE_DEFS = {
	'salamander-piano': {
		baseUrl: 'sound/salamander/',
		ext: '.mp3',
		notes: { A0:21,A1:33,A2:45,A3:57,A4:69,A5:81,A6:93,A7:105, C1:24,C2:36,C3:48,C4:60,C5:72,C6:84,C7:96,C8:108, 'D#1':27,'D#2':39,'D#3':51,'D#4':63,'D#5':75,'D#6':87,'D#7':99, 'F#1':30,'F#2':42,'F#3':54,'F#4':66,'F#5':78,'F#6':90,'F#7':102 }
	},
	'vcsl-strumstick': {
		baseUrl: 'sound/strumstick/',
		ext: '.ogg',
		notes: { A2:45,A3:57,A4:69, B2:47,B3:59, 'C#3':49,'C#4':61, D2:38,D3:50,D4:62, E2:40,E3:52,E4:64, 'F#2':42,'F#3':54,'F#4':66, G2:43,G3:55,G4:67 }
	},
	'vcsl-vibraphone': {
		baseUrl: 'sound/vibraphone/',
		ext: '.ogg',
		notes: { A2:45,A4:69, B3:59, C3:48,C5:72, D4:62, E3:52,E5:76, F2:41,F4:65, G3:55 }
	}
}

// 采样缓存: { tone: { url: AudioBuffer } }
// サンプルキャッシュ: { tone: { url: AudioBuffer } }
// Sample cache: { tone: { noteName: { buf, midi } } }
const bufferCache = {}

// 加载音频文件并解码为 AudioBuffer // オーディオファイルを読み込み AudioBuffer にデコード // Load audio file and decode to AudioBuffer
async function loadAudioBuffer(url) {
	const res = await fetch(url)
	if (!res.ok) throw new Error(`Failed to load ${url}`)
	const ctx = new AudioContext()
	const buf = await ctx.decodeAudioData(await res.arrayBuffer())
	await ctx.close()
	return buf
}

// 获取指定音色的所有采样缓冲区（并行加载）// 指定音色のすべてのサンプルバッファを取得（並列ロード）// Get all sample buffers for a given tone (parallel loading)
async function getSampleBuffers(tone) {
	if (bufferCache[tone]) return bufferCache[tone]
	const def = SAMPLE_DEFS[tone]
	if (!def) return null
	const buffers = {}
	// 并行加载所有采样
	const entries = []
	for (const [name, midi] of Object.entries(def.notes)) {
		const fname = name.replace('#', 's') + def.ext
		const url = def.baseUrl + fname
		entries.push({ name, midi, url })
	}
	const results = await Promise.all(entries.map(async e => {
		try {
			const buf = await loadAudioBuffer(e.url)
			return { name: e.name, midi: e.midi, buf }
		} catch (err) {
			console.warn('Sample load failed:', e.url, err)
			return null
		}
	}))
	for (const r of results) {
		if (r) buffers[r.name] = { buf: r.buf, midi: r.midi }
	}
	bufferCache[tone] = buffers
	return buffers
}

// 为给定 Hz 找到最合适的采样和播放速率
// 指定 Hz に最も適したサンプルと再生速度を見つける
// Find the best matching sample and playback rate for a given Hz
function findSampleMatch(buffers, hz) {
	let best = null; let bestDist = Infinity
	const midiExact = 12 * Math.log2(hz / 440) + 69
	for (const [name, { buf, midi }] of Object.entries(buffers)) {
		if (midi <= midiExact && midiExact - midi < bestDist) {
			bestDist = midiExact - midi; best = { buf, midi }
		}
	}
	if (!best) {
		// 找不到更低的采样，取最接近的
		for (const [name, { buf, midi }] of Object.entries(buffers)) {
			const d = Math.abs(midiExact - midi)
			if (d < bestDist) { bestDist = d; best = { buf, midi } }
		}
	}
	return best ? { buffer: best.buf, rate: Math.pow(2, (midiExact - best.midi) / 12) } : null
}

// 离线渲染音频 → AudioBuffer（秒级完成，不等实际时长）
// オフラインレンダリング Audio → AudioBuffer（高速、実時間を待たない）
// Offline render audio → AudioBuffer (fast, does not wait for real time)
async function renderOffline(rootlayer) {
	const tone = $('#config-tone').value || 'salamander-piano'
	const buffers = await getSampleBuffers(tone)
	if (!buffers || !Object.keys(buffers).length) return null

	const allNotes = collectAllNotes(rootlayer)
	if (!allNotes.length) return null

	const beatMs = parseInt($('#config-beat').value) || 500
	const secPerTick = beatMs / 1000 / PROJ_TICKS_PER_BEAT
	const baseTick = Math.min(...allNotes.map(n => n.absStart))
	const totalDuration = (Math.max(...allNotes.map(n => n.absStart + n.duration)) - baseTick) * secPerTick + 2

	const sampleRate = 44100
	const ctx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate)

	for (const n of allNotes) {
		const match = findSampleMatch(buffers, n.hz)
		if (!match) continue

		const startTime = (n.absStart - baseTick) * secPerTick
		const duration = Math.max(0.01, n.duration * secPerTick)

		const src = ctx.createBufferSource()
		src.buffer = match.buffer
		src.playbackRate.value = match.rate
		const gain = ctx.createGain()
		gain.gain.value = Math.min(1, n.vol)
		src.connect(gain)
		gain.connect(ctx.destination)
		src.start(startTime, 0, duration + 1.25)  // +release tail
		// 淡出避免 click
		gain.gain.setValueAtTime(gain.gain.value, startTime + duration - 0.05)
		gain.gain.linearRampToValueAtTime(0, startTime + duration + 0.1)
	}

	return await ctx.startRendering()
}

// ========== 导出: WAV ==========
// ========== エクスポート: WAV ==========
// ========== Export: WAV ==========

// AudioBuffer → WAV Blob：编码为 16-bit PCM 立体声 WAV
// AudioBuffer → WAV Blob：16 ビット PCM ステレオ WAV にエンコード
// AudioBuffer → WAV Blob: encode as 16-bit PCM stereo WAV
function audioBufferToWav(buffer) {
	const numCh = buffer.numberOfChannels, sr = buffer.sampleRate, len = buffer.length
	const blockAlign = numCh * 2, dataSize = len * blockAlign
	const buf = new ArrayBuffer(44 + dataSize), view = new DataView(buf)
	writeStr(view, 0, 'RIFF'); view.setUint32(4, 36+dataSize, true); writeStr(view, 8, 'WAVE')
	writeStr(view, 12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
	view.setUint16(22, numCh, true); view.setUint32(24, sr, true)
	view.setUint32(28, sr*blockAlign, true); view.setUint16(32, blockAlign, true); view.setUint16(34, 16, true)
	writeStr(view, 36, 'data'); view.setUint32(40, dataSize, true)
	const chData = []; for (let c = 0; c < numCh; c++) chData.push(buffer.getChannelData(c))
	let off = 44
	for (let i = 0; i < len; i++) {
		for (let c = 0; c < numCh; c++) {
			let s = Math.max(-1, Math.min(1, chData[c][i]))
			view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2
		}
	}
	return new Blob([buf], { type: 'audio/wav' })
}
// WAV 字符串写入辅助 // WAV 文字列書き込みヘルパー // WAV string write helper
function writeStr(view, off, str) { for (let i = 0; i < str.length; i++) view.setUint8(off+i, str.charCodeAt(i)) }

// 导出 WAV：离线渲染并下载 // WAV をエクスポート：オフラインレンダリングしてダウンロード // Export WAV: offline render and download
export async function exportWav(rootlayer) {
	const buffer = await renderOffline(rootlayer)
	if (!buffer) return
	downloadBlob(audioBufferToWav(buffer), 'nafchanaphata.wav')
}

// ========== MIDI 导入 ==========
// ========== MIDI インポート ==========
// ========== MIDI import ==========

// 读取可变长度值 // 可変長の値を読み取り // Read variable-length value
function readVarLen(data, off) {
	let value = 0, byte
	do { byte = data[off++]; value = (value << 7) | (byte & 0x7F) } while (byte & 0x80)
	return { value, offset: off }
}
// 读取 16 位大端整数 // 16 ビットビッグエンディアン整数を読み取り // Read 16-bit big-endian integer
function readUint16BE(data, off) {
	return { value: (data[off] << 8) | data[off + 1], offset: off + 2 }
}
// 读取 32 位大端整数 // 32 ビットビッグエンディアン整数を読み取り // Read 32-bit big-endian integer
function readUint32BE(data, off) {
	return { value: (data[off] << 24) | (data[off + 1] << 16) | (data[off + 2] << 8) | data[off + 3], offset: off + 4 }
}

// 解析 MIDI 文件：提取所有音符事件及元数据
// MIDI ファイルを解析：すべての音符イベントとメタデータを抽出
// Parse MIDI file: extract all note events and metadata
function parseMidi(arrayBuffer) {
	const data = new Uint8Array(arrayBuffer)
	let off = 0

	// 解析头块
	const hdr = String.fromCharCode(data[0], data[1], data[2], data[3])
	if (hdr !== 'MThd') throw new Error('不是有效的 MIDI 文件')
	off += 4
	const hl = readUint32BE(data, off); off = hl.offset
	const fmt = readUint16BE(data, off); off = fmt.offset
	const ntrks = readUint16BE(data, off); off = ntrks.offset
	const div = readUint16BE(data, off); off = div.offset

	if (div.value & 0x8000) throw new Error('不支持 SMPTE 时间码格式')
	const ppqn = div.value

	// 收集音符事件: { note, startTick, duration, velocity, channel, pb }
	const notes = []
	const trackNames = []
	const active = new Map()  // "ch:note" → { note, startTick, velocity, pb }
	const channelPb = {}      // ch → 当前 pitch bend 值

	for (let t = 0; t < ntrks.value; t++) {
		const th = String.fromCharCode(data[off], data[off+1], data[off+2], data[off+3])
		if (th !== 'MTrk') throw new Error('无效的轨道头')
		off += 4
		const tl = readUint32BE(data, off); off = tl.offset
		const end = off + tl.value

		let absTick = 0, running = 0

		while (off < end) {
			const dt = readVarLen(data, off); off = dt.offset
			absTick += dt.value

			let status = data[off]
			if (status < 0x80) { status = running } else { running = status; off++ }

			if (status === 0xFF) {
				const type = data[off++]
				const ml = readVarLen(data, off); off = ml.offset
				if (type === 0x03 && ml.value > 0) {
					// 提取轨道名（用于检测 EDO 等微分音信息）
					let name = ''
					for (let i = 0; i < ml.value; i++) name += String.fromCharCode(data[off + i])
					trackNames.push(name)
				}
				off += ml.value
				if (type === 0x2F) break
				continue
			}
			if (status === 0xF0 || status === 0xF7) {
				const sl = readVarLen(data, off); off = sl.offset + sl.value
				running = 0; continue
			}

			const msg = status & 0xF0, ch = status & 0x0F
			if (msg === 0x80 || msg === 0x90) {
				const noteNum = data[off++], vel = data[off++]
				const key = `${ch}:${noteNum}`

				if (msg === 0x90 && vel > 0) {
					// Note On
					if (active.has(key)) {
						const p = active.get(key)
						notes.push({ note: p.note, startTick: p.startTick, duration: absTick - p.startTick, velocity: p.velocity, channel: ch, pb: p.pb })
					}
					active.set(key, { note: noteNum, startTick: absTick, velocity: vel, pb: channelPb[ch] ?? 8192 })
				} else {
					// Note Off (或 Note On vel=0)
					if (active.has(key)) {
						const p = active.get(key)
						notes.push({ note: p.note, startTick: p.startTick, duration: absTick - p.startTick, velocity: p.velocity, channel: ch, pb: p.pb })
						active.delete(key)
					}
				}
			} else if (msg === 0xE0) {
				// Pitch Bend
				const lsb = data[off++], msb = data[off++]
				channelPb[ch] = (msb << 7) | lsb
			} else {
				off += (msg === 0xC0 || msg === 0xD0) ? 1 : 2
			}
		}
	}

	// 未关闭的音符：给默认时长
	for (const [key, p] of active) {
		notes.push({ note: p.note, startTick: p.startTick, duration: ppqn, velocity: p.velocity, channel: 0, pb: p.pb })
	}

	notes.sort((a, b) => a.startTick - b.startTick)
	return { notes, ppqn, trackNames }
}

// MIDI 音符号 → Hz：包含 Pitch Bend 微调
// MIDI ノート番号 → Hz：ピッチベンド微調整を含む
// MIDI note number → Hz: includes Pitch Bend fine-tuning
function midiNoteToHz(note, pb = 8192) {
	// pb: 14-bit pitch bend (0-16383, center=8192), ±2 semitone range
	const semitoneOffset = (pb - 8192) / 8192 * PB_RANGE_SEMIS
	return 440 * Math.pow(2, (note - 69 + semitoneOffset) / 12)
}

// 导入标准 MIDI 文件（12TET + Pitch Bend）
// 標準 MIDI ファイルをインポート（12TET + ピッチベンド）
// Import standard MIDI file (12TET + Pitch Bend)
export function importMidi() {
	const input = document.createElement('input')
	input.type = 'file'
	input.accept = '.mid,.midi'
	input.onchange = async () => {
		const file = input.files[0]
		if (!file) return
		try {
			const ab = await file.arrayBuffer()
			const { notes, ppqn } = parseMidi(ab)

			if (notes.length === 0) {
				alert('MIDI 文件中未找到音符')
				return
			}

			history.snapshot()

			if (window._sel) window._sel.clear()

			const created = []
			for (const n of notes) {
				// MIDI ticks → 节拍 → 像素
				const x = (n.startTick / ppqn) * 48
				const len = Math.max(10, (n.duration / ppqn) * 48)
				const hz = midiNoteToHz(n.note, n.pb || 8192)
				const y = hz2y(hz)

				const root = new RootNote(stage, x, y, len)
				rootlayer.add(root)
				root.volume = Math.max(1, Math.round(n.velocity / 127 * 100))
				created.push(root)
			}

			if (window._sel) {
				for (const n of created) window._sel.selected.add(n)
				window._sel._highlight()
			}

			rootlayer.batchDraw()
			grid.autoLoop()
		} catch (err) {
			console.error('MIDI import failed:', err)
			alert('MIDI 导入失败: ' + err.message)
		}
	}
	input.click()
}

// ========== 微分音 MIDI 导入 (EDO 映射) ==========
// ========== 微分音 MIDI インポート (EDO マッピング) ==========
// ========== Microtonal MIDI import (EDO mapping) ==========

// 从轨道名检测 EDO 值 // トラック名から EDO 値を検出 // Detect EDO value from track name
function detectEdo(trackNames) {
	for (const name of trackNames) {
		const m = name.match(/(\d+)\s*edo/i)
		if (m) return parseInt(m[1])
	}
	return null
}

// 导入微分音 MIDI：将 MIDI 音符映射到用户指定的 EDO 律制
// 微分音 MIDI をインポート：MIDI 音符をユーザー指定の EDO 音律にマッピング
// Import microtonal MIDI: map MIDI notes to user-specified EDO tuning
export function importMidiMicrotonal() {
	// 解析轨道名检测 EDO
	const detectAndPrompt = (trackNames, callback) => {
		const detected = detectEdo(trackNames)
		const hint = detected ? `\n（从轨道名检测到: ${detected}edo）` : ''
		const input = prompt(`请输入微分音的 EDO 值（一个八度等分为多少步）${hint}`, detected || '41')
		if (input === null) return
		const edo = parseInt(input)
		if (isNaN(edo) || edo < 2 || edo > 10000) {
			alert('请输入有效的 EDO 值（2-10000）')
			return
		}
		callback(edo)
	}

	const input = document.createElement('input')
	input.type = 'file'
	input.accept = '.mid,.midi'
	input.onchange = async () => {
		const file = input.files[0]
		if (!file) return
		try {
			const ab = await file.arrayBuffer()
			const { notes, ppqn, trackNames } = parseMidi(ab)

			detectAndPrompt(trackNames, (edo) => {
				if (notes.length === 0) {
					alert('MIDI 文件中未找到音符')
					return
				}

				const tonic = parseFloat($('#config-tonic').value) || 440

				history.snapshot()
				if (window._sel) window._sel.clear()

				const created = []
				for (const n of notes) {
					const x = (n.startTick / ppqn) * 48
					const len = Math.max(10, (n.duration / ppqn) * 48)
					// EDO 映射: MIDI note 69 (A4) → tonic, 每步 = 1/edo 八度
					const hz = tonic * Math.pow(2, (n.note - 69) / edo)
					const y = hz2y(hz)

					const root = new RootNote(stage, x, y, len)
					rootlayer.add(root)
					root.volume = Math.max(1, Math.round(n.velocity / 127 * 100))
					created.push(root)
				}

				if (window._sel) {
					for (const n of created) window._sel.selected.add(n)
					window._sel._highlight()
				}

				rootlayer.batchDraw()
				grid.autoLoop()
			})
		} catch (err) {
			console.error('MIDI microtonal import failed:', err)
			alert('微分音 MIDI 导入失败: ' + err.message)
		}
	}
	input.click()
}
