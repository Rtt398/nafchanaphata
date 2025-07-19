
export function makePincher(stage) {
	const getDist = (p1, p2) => Math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2)
	const getCenter = (p1, p2) => ({x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2})

	let lastCenter = null
	let lastDist = 0
	
	function pinchSetup(e) {
		stage.isPinching = (e.evt.touches.length > 1)
	}
	
	function pinching(e) {
		e.evt.preventDefault()
		const [touch1, touch2] = e.evt.touches

		// シングルタッチ：通常のドラッグ処理に戻す
		if (touch1 && !touch2 && !stage.isDragging() && stage.isPinching) {
			stage.startDrag()
			stage.isPinching = false
		}
		if(!touch1 || !touch2) return

		// マルチタッチ：拡縮処理を行う
		if (stage.isDragging()) {
			stage.stopDrag()
			stage.isPinching = true
//			console.log("Multi-Touch Dragging")
		}

		const p1 = {x: touch1.clientX, y: touch1.clientY}
		const p2 = {x: touch2.clientX, y: touch2.clientY}
		const center = getCenter(p1, p2)
		const dist = getDist(p1, p2)
		
		if(!lastCenter) {lastCenter ||= center; return}
		if(!lastDist) {lastDist ||= dist; return}

		const scale = stage.scaleX() * dist / lastDist

		stage.position({
			x: center.x - (center.x - stage.x()) * (dist / lastDist) + center.x - lastCenter.x,
			y: center.y - (center.y - stage.y()) * (dist / lastDist) + center.y - lastCenter.y
		})
		stage.scale({x: scale, y: scale})
		;[lastDist, lastCenter] = [dist, center]
		stage.fire('pinchmove')
	}
	function pinchEnd(e) {
		lastDist = 0
		lastCenter = null
		stage.isPinching = false
//		console.log("Pinch End")
	}
	stage.on('touchstart', pinchSetup)
	stage.on('touchmove', pinching)
	stage.on('touchend', pinchEnd)
}