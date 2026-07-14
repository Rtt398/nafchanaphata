/*
 * 键盘快捷键绑定模块：处理全局快捷键（Ctrl+Z 撤销、Tab 分辨率输入），防止在输入框内误触发
 * キーボードショートカットバインドモジュール：グローバルショートカット（Ctrl+Z アンドゥ、Tab 解像度入力）を処理し、入力欄内での誤発動を防止
 * Keyboard shortcut binding module: handles global shortcuts (Ctrl+Z undo, Tab resolution input), prevents accidental triggers inside input fields
 */

import history from "./history.js";

// 绑定所有全局键盘快捷键 // すべてのグローバルキーボードショートカットをバインド // Bind all global keyboard shortcuts
export function bindKeys() {
	// Ctrl+Z 撤销 // Ctrl+Z アンドゥ // Ctrl+Z undo
	// 仅当焦点不在输入框/文本域/可编辑元素时才触发 // フォーカスが入力欄/テキストエリア/編集可能要素にない場合のみ発動 // Only trigger when focus is not in input/textarea/contentEditable
	document.addEventListener('keydown', (event) => {
		if (event.ctrlKey && event.key === 'z') {
			const el = document.activeElement
			const tag = el?.tagName
			if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return
			event.preventDefault()
			history.restore()
		}
	}, true)

	// Tab → 进入分辨率输入模式（800ms 内按数字累积，超时自动提交） // Tab → 解像度入力モードに入る（800ms以内に数字を累積、タイムアウトで自動コミット） // Tab → Enter resolution input mode (accumulate digits within 800ms, auto-commit on timeout)
	let tabTimer = null, tabDigits = ''

	// 提交累积的数字作为分辨率值 // 累積された数字を解像度値としてコミット // Commit accumulated digits as resolution value
	function commitTabDigits() {
		if (tabDigits.length > 0) {
			const tick = parseInt(tabDigits)
			if (tick > 0) {
				const el = document.getElementById('config-tick')
				if (el) { el.value = tick; el.dispatchEvent(new Event('change', {bubbles: true})) }
			}
		}
		tabDigits = ''
		tabTimer = null
	}

	// Tab 分辨率处理逻辑：首次 Tab 进入模式，再次 Tab 或超时提交 // Tab 解像度処理ロジック：初回 Tab でモード入り、再度 Tab かタイムアウトでコミット // Tab resolution handling logic: first Tab enters mode, second Tab or timeout commits
	window.addEventListener('keydown', (event) => {
		if (event.code === 'Tab') {
			const el = document.activeElement
			const tag = el?.tagName
			if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return
			// 第一次 Tab 进入模式，第二次 Tab 提交（不阻止默认 focus，让 Tab 正常工作） // 初回 Tab でモードに入り、2回目 Tab でコミット（デフォルトのフォーカス移動は許可） // First Tab enters mode, second Tab commits (don't block default focus for normal Tab usage)
			if (tabTimer) { commitTabDigits(); return }
			event.preventDefault()
			event.stopPropagation()
			tabDigits = ''
			tabTimer = setTimeout(commitTabDigits, 800)  // 800ms 超时自动提交 // 800ms タイムアウトで自動コミット // 800ms timeout auto-commit
			return
		}
		// 在 Tab 输入模式下捕获数字键（0 除外） // Tab 入力モード中に数字キーをキャプチャ（0 を除く） // Capture digit keys during Tab input mode (excluding 0)
		if (!tabTimer) return
		const m = event.code.match(/^(Digit|Numpad)(\d)$/)
		if (m) {
			event.preventDefault()
			event.stopPropagation()
			if (m[2] !== '0') {
				tabDigits += m[2]
				// 每次输入数字后重置超时 // 数字入力のたびにタイムアウトをリセット // Reset timeout after each digit input
				clearTimeout(tabTimer)
				tabTimer = setTimeout(commitTabDigits, 800)
			}
		}
	}, true)
}
