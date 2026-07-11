/*
 * 撤销历史模块：保存工程快照，支持 Ctrl+Z 撤销到之前状态，并自动恢复当前选中的音符上下文
 * アンドゥ履歴モジュール：プロジェクトスナップショットを保存し、Ctrl+Zで以前の状態に復元、現在選択中のノートコンテキストを自動復帰
 * Undo history module: saves project snapshots, supports Ctrl+Z to restore previous state, and auto-restores the currently selected note context
 */

import {Serializer} from './serialize.js'
import {stage, grid, rootlayer} from './sequencer.js'

// 递归查找匹配的子音符（按 interval id 和 delay） // 再帰的に一致する子ノートを検索（interval id と delay で照合） // Recursively find matching sub-note by interval id and delay
function findSubNote(note, intId, delay) {
	if (!note.childNotes) return null
	for (const c of note.childNotes.getChildren()) {
		if (c._interval?.id === intId && Math.abs((c.delay || 0) - delay) < 2) return c
		const found = findSubNote(c, intId, delay)
		if (found) return found
	}
	return null
}

// 历史记录管理类：维护快照栈（最多100条），提供 snapshot/restore 操作 // 履歴管理クラス：スナップショットスタック（最大100件）を維持し、snapshot/restore 操作を提供 // History management class: maintains a snapshot stack (max 100), provides snapshot/restore operations
class History {
	constructor() {
		this.history = []
	}
	// 保存当前工程快照（纯 JSON，跳过压缩以避免重复存储） // 現在のプロジェクトスナップショットを保存（純粋JSON、圧縮スキップで重複保存を回避） // Save current project snapshot (pure JSON, skip compression to avoid duplicate storage)
	snapshot() {
		const d = Serializer.serialize(false, false)  // 纯 JSON，跳过压缩以提升大工程性能 // 純粋JSON、圧縮をスキップして大規模プロジェクトのパフォーマンスを向上 // Pure JSON, skip compression for better performance on large projects
		if (this.history.at(-1) == d) return
		this.history.push(d)
		if (this.history.length > 100) this.history.shift()
	}
	// 从历史栈弹出最近快照并还原工程状态 // 履歴スタックから最新スナップショットをポップし、プロジェクト状態を復元 // Pop the latest snapshot from history stack and restore project state
	restore() {
		if (this.history.length == 0) return
//		console.log('restore:', rootlayer.children)
		// 保存当前选中音符的标识信息（撤销重建后恢复引用） // 現在選択中のノート識別情報を保存（アンドゥ再構築後に参照を復元） // Save identifier info of currently selected note (restore reference after undo rebuild)
		const cur = stage.current
		const curX = cur ? cur.root.x() : NaN
		const curY = cur ? cur.root.y() : NaN
		const curIsSub = cur && !cur.mark  // SubNote 没有 mark 属性 // SubNote には mark プロパティがない // SubNote has no mark property
		const curIntId = curIsSub ? (cur._interval?.id ?? null) : null
		const curDelay = curIsSub ? (cur.delay || 0) : 0
		rootlayer.destroyChildren()
		stage.current = null
		Tone.Transport.cancel()
		Serializer.deserialize(this.history.pop())
		// 恢复 stage.current // stage.current を復元 // Restore stage.current
		if (!isNaN(curX)) {
			for (const n of rootlayer.getChildren()) {
				if (Math.abs(n.x() - curX) < 2 && Math.abs(n.y() - curY) < 2) {
					if (curIsSub && curIntId != null) {
						// 尝试找到匹配的子音符 // 一致する子ノートを検索試行 // Try to find matching sub-note
						const sub = findSubNote(n, curIntId, curDelay)
						stage.current = sub || n
					} else {
						stage.current = n
					}
					break
				}
			}
		}
		rootlayer.batchDraw()
		grid.autoLoop()
	}
}

// 导出单例 History 实例 // シングルトン History インスタンスをエクスポート // Export singleton History instance
export default new History()
