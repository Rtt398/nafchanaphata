/*
 * 多点触控缩放模块：处理触摸屏双指捏合缩放与平移手势，兼容单击切换回拖拽模式
 * マルチタッチピンチズームモジュール：タッチスクリーンの二本指ピンチズームとパンジェスチャーを処理、シングルタッチでドラッグモードに切替可能
 * Multi-touch pinch zoom module: handles two-finger pinch zoom and pan gestures on touch screens, compatible with single-touch fallback to drag mode
 */

// 创建捏合缩放控制器并绑定到指定 stage // ピンチズームコントローラーを作成し、指定 stage にバインド // Create pinch zoom controller and bind to specified stage
export function makePincher(stage) {
	const getDist = (p1, p2) => Math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2)
	const getCenter = (p1, p2) => ({x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2})

	let lastCenter = null
	let lastDist = 0
	
	// touchstart 阶段：检测是否为多点触控（双指） // touchstart 段階：マルチタッチ（二本指）かどうかを検出 // touchstart phase: detect if multi-touch (two fingers)
	function pinchSetup(e) {
		stage.isPinching = (e.evt.touches.length > 1)
	}
	
	// touchmove 阶段：计算双指距离变化，执行缩放与平移 // touchmove 段階：二本指の距離変化を計算し、ズームとパンを実行 // touchmove phase: calculate two-finger distance change, perform zoom and pan
	function pinching(e) {
		e.evt.preventDefault()
		const [touch1, touch2] = e.evt.touches

		// シングルタッチ：通常のドラッグ処理に戻す // 单点触控：回退到正常拖拽处理 // Single touch: fall back to normal drag handling
		if (touch1 && !touch2 && !stage.isDragging() && stage.isPinching) {
			stage.startDrag()
			stage.isPinching = false
		}
		if(!touch1 || !touch2) return

		// マルチタッチ：拡縮処理を行う // 多点触控：执行缩放处理 // Multi-touch: perform zoom processing
		if (stage.isDragging()) {
			stage.stopDrag()
			stage.isPinching = true
//			console.log("Multi-Touch Dragging")
		}

		// 获取两个触控点的位置 // 2つのタッチポイントの位置を取得 // Get positions of both touch points
		const p1 = {x: touch1.clientX, y: touch1.clientY}
		const p2 = {x: touch2.clientX, y: touch2.clientY}
		const center = getCenter(p1, p2)
		const dist = getDist(p1, p2)
		
		if(!lastCenter) {lastCenter ||= center; return}
		if(!lastDist) {lastDist ||= dist; return}

		// 计算缩放比例 // スケール比率を計算 // Calculate scale ratio
		const scale = stage.scaleX() * dist / lastDist

		// 以双指中心为锚点进行缩放与平移 // 二本指の中心をアンカーとしてズームとパンを実行 // Zoom and pan with two-finger center as anchor
		stage.position({
			x: center.x - (center.x - stage.x()) * (dist / lastDist) + center.x - lastCenter.x,
			y: center.y - (center.y - stage.y()) * (dist / lastDist) + center.y - lastCenter.y
		})
		stage.scale({x: scale, y: scale})
		;[lastDist, lastCenter] = [dist, center]
		stage.fire('pinchmove')
	}
	// touchend 阶段：重置捏合状态，结束缩放 // touchend 段階：ピンチ状態をリセットし、ズーム終了 // touchend phase: reset pinch state, end zoom
	function pinchEnd(e) {
		lastDist = 0
		lastCenter = null
		stage.isPinching = false
//		console.log("Pinch End")
	}
	// 绑定触控事件到 stage // タッチイベントを stage にバインド // Bind touch events to stage
	stage.on('touchstart', pinchSetup)
	stage.on('touchmove', pinching)
	stage.on('touchend', pinchEnd)
}
