/*
 * 工程文件序列化与反序列化模块 — 支持 JSON/JSONCrush 压缩、版本兼容、历史快照与分享
 * プロジェクトファイルのシリアライズ・デシリアライズモジュール — JSON/JSONCrush圧縮、バージョン互換、履歴スナップショットと共有をサポート
 * Project file serialization/deserialization module — supports JSON/JSONCrush compression, version compatibility, history snapshots, and sharing
 */

import {$, t2x, x2t, hz2y, pitchIntervals} from './util.js'
import {RootNote, SubNote} from './note.js'
import JSONCrush from 'https://unpkg.com/jsoncrush'
import {stage, grid, rootlayer} from './sequencer.js'

// Hz精度倍率（v1=16, v2=256），低音区误差从 5¢ 降到 0.03¢
// Hz精度乗数（v1=16, v2=256）、低音域の誤差を5¢から0.03¢に低減
const HZ_MUL = 256           // Hz precision multiplier (v1=16, v2=256), reduces low-frequency error from 5¢ to 0.03¢

// 序列化器类：将音符工程数据与 JSON 之间相互转换
// シリアライザークラス：音符プロジェクトデータとJSONの相互変換を行う
// Serializer class: converts note project data to/from JSON
export class Serializer {
	// 序列化主入口：将当前工程序列化为 JSON 字符串（可选 crush 压缩）
	// シリアライズメインエントリ：現在のプロジェクトをJSON文字列にシリアライズ（オプションでcrush圧縮）
	// Main serialize entry: serializes current project to JSON string (optional crush compression)
	static serialize(savegrid, crush = true) {
		const s = savegrid ? {
			v: 2,
			b: grid.beat,
			t: grid.tonic,
			s: x2t(grid.loopStart.x()),
			e: x2t(grid.loopEnd.x()),
			i: $('#config-tone').value
		} : { v: 2 }   // 历史快照也带版本标记，避免反序列化时 hzDiv 回退到 16 / 履歴スナップショットにもバージョンタグを付与、デシリアライズ時のhzDiv後退を防止 / History snapshots also carry version tag to prevent hzDiv fallback to 16
		const n = rootlayer.children.map(x => this.root2json(x))
		const json = JSON.stringify(
			{s: s, n: n}, 
			(k, v) => (!v || v.length == 0) ? undefined : v
		)
		// 分享/保存用 crush 压缩 URL；历史快照用纯 JSON 避免 CPU 开销
		// 共有・保存用にcrush圧縮URL；履歴スナップショットは純粋なJSONでCPUオーバーヘッドを回避
		// Crush-compressed URL for sharing/saving; plain JSON for history snapshots to avoid CPU overhead
		return crush ? encodeURIComponent(JSONCrush.crush(json)) : json
	}

	// 将根音符序列化为 JSON 对象
	// ルート音符をJSONオブジェクトにシリアライズ
	// Serialize a root note to a JSON object
	static root2json(note) {
		return {
			x: Math.round(note.x() * 4),
			l: Math.round(note.len * 4),
			h: Math.round(note.hz * HZ_MUL),
			m: note.mute,
			v: note.volume - 50,
			hd: note.hidden ? 1 : 0,
			pt: note._pitchThick,
			lt: note._linkThick,
			lo: note._linkOpacity,
			no: note._noteOpacity,
			tk: note._tick,
			s: note.childNotes.children.map(x => this.sub2json(x))
		}
	}
	// 将子音符序列化为 JSON 对象（递归）
	// サブ音符をJSONオブジェクトにシリアライズ（再帰的）
	// Serialize a sub-note to a JSON object (recursive)
	static sub2json(note) {
		return {
			i: note.interval.id,
			d: Math.round(note.delay * 4),
			l: Math.round(note.len * 4),
			h: Math.round(note._hz * HZ_MUL),
			m: note.mute,
			v: note.volume - 50,
			hd: note.hidden ? 1 : 0,
			pt: note._pitchThick,
			lt: note._linkThick,
			lo: note._linkOpacity,
			no: note._noteOpacity,
			tk: note._tick,
			s: note.childNotes.children.map(x => this.sub2json(x))
		}
	}

	// 从 JSON 反序列化根音符字符串重建工程（自动检测纯 JSON 或 crush 压缩格式）
	// デシリアライズ：JSON文字列からプロジェクトを再構築（純粋JSONまたはcrush圧縮形式を自動検出）
	// Deserialize from JSON string: rebuild project (auto-detect plain JSON or crush-compressed format)
	static deserialize(d) {
		let u
		// 先尝试纯 JSON（历史快照），失败则尝试 URL解码+JSONCrush解压（分享/文件）
		// まず純粋JSON（履歴スナップショット）を試行、失敗時はURLデコード+JSONCrush解凍（共有/ファイル）
		// Try plain JSON first (history snapshots); on failure, try URL-decode + JSONCrush decompress (sharing/file)
		try { u = JSON.parse(d) }
		catch { u = JSON.parse(JSONCrush.uncrush(decodeURIComponent(d))) }
		// 版本感知：v2 用 HZ_MUL=256，旧文件用 16
		// バージョン認識：v2はHZ_MUL=256、旧ファイルは16を使用
		// Version-aware: v2 uses HZ_MUL=256, old files use 16
		const hzDiv = (u.s && u.s.v >= 2) ? HZ_MUL : 16
		
		if (u.s && u.s.b != null) {   // 仅当包含实际工程设置（beat/tonic）而非仅版本标记 / 実際のプロジェクト設定（beat/tonic）を含む場合のみ、バージョンタグだけではない / Only when containing actual project settings (beat/tonic), not just version marker
			grid.beat = u.s.b
			grid.tonic = u.s.t
			grid.loopStart.x(t2x(u.s.s || 0))
			grid.loopEnd.x(t2x(u.s.e) || 0)
			grid.setLoop()
			$(`#config-tone>option[value='${u.s.i || "salamander-piano"}']`).selected = true
			$('#config-tone').dispatchEvent(new Event('change'))
		}
		if (!u.n) return
		for (const n of u.n) {
			const p = new RootNote(stage, n.x / 4 || 0, hz2y(n.h / hzDiv), n.l / 4, null, null, n.tk)
			p.mute = n.m || false
			p.volume = 50 + (n.v || 0)
			p.hidden = !!(n.hd)  // 恢复隐藏状态 / 非表示状態を復元 / Restore hidden state
			// 恢复外观属性 / 外観属性を復元 / Restore visual properties
			p._pitchThick = n.pt || p._pitchThick
			p._linkThick = n.lt || p._linkThick
			p._linkOpacity = n.lo || p._linkOpacity
			p._noteOpacity = n.no ?? p._noteOpacity
			p._tick = n.tk || p._tick
			p.pitchline.strokeWidth(p._pitchThick)
			p.pitchline.opacity(p._noteOpacity)
			if (p.mark) p.mark.opacity(p._noteOpacity)
			if (p._linkThick !== 1 || p._linkOpacity !== 1) p.applyLinkStyle()
			rootlayer.add(p)
			for (const m of n.s || []) {
				this.json2sub(p, m, hzDiv)
			}
		}
	}

	// 从 JSON 递归重建子音符
	// JSONからサブ音符を再帰的に再構築
	// Recursively rebuild sub-notes from JSON
	static json2sub(p, m, hzDiv = 16) {
		const id = m.i || 0
		// 音程键算法：将整数 ID 映射到音程字典的字符串键
		//   id ≥ 100 → "c(id-100)"（正向自定义） / 正方向カスタム / positive custom
		//   id ≤ -100 → "-c(-id-100)"（反向自定义） / 逆方向カスタム / negative custom  
		//   否则 → "id d"（标准维度）
		// 音程キーアルゴリズム：整数IDを音程辞書の文字列キーにマッピング
		// Interval key algorithm: maps integer ID to string key in the interval dictionary
		let key
		if (id >= 100) key = 'c' + (id - 100)
		else if (id <= -100) key = '-c' + (-id - 100)
		else key = id + 'd'
		const interval = pitchIntervals[key]
		if (!interval) return
		const q = p.addNote(m.l / 4, interval, m.d / 4 || 0)
		q.mute = m.m || false
		q.volume = 50 + (m.v || 0)
		q.hidden = !!(m.hd)  // 恢复隐藏状态 / 非表示状態を復元 / Restore hidden state
		if (m.h) q.hz = m.h / hzDiv
		// 恢复外观属性 / 外観属性を復元 / Restore visual properties
		q._pitchThick = m.pt || q._pitchThick
		q._linkThick = m.lt || q._linkThick
		q._linkOpacity = m.lo || q._linkOpacity
		q._noteOpacity = m.no ?? q._noteOpacity
		q._tick = m.tk || q._tick
		q.pitchline.strokeWidth(q._pitchThick)
		q.pitchline.opacity(q._noteOpacity)
		if (q.linkLine) q.linkLine.opacity(q._linkOpacity)
		for (const l of m.s || []) {
			this.json2sub(q, l, hzDiv)
		}
	}
}
