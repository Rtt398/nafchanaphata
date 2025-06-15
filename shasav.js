
Konva.hitOnDragEnabled = true
scrollTo(0, 0)

const stage = new Konva.Stage({
	container: 'sequencer',
	width: window.innerWidth,
	height: window.innerHeight,
	draggable: true
})
makePincher(stage)
window.addEventListener('resize', e => {
	stage.size({
		width: window.innerWidth,
		height: window.innerHeight
	})
})

const grid = new Grid()
const rootlayer = new Konva.Layer()

stage.on('pointerclick', e => {
	if (stage.isDragging() || stage.isPinching || e.evt.button != 0 || stage.isNoteDragging) return
	const pos = stage.getRelativePointerPosition()
	const root = new RootNote(pos.x, pos.y, 48)
	rootlayer.add(root)
	rootlayer.draw()
})

stage.add(grid)
stage.add(rootlayer)

if (location.search !== '') {
	Serializer.deserialize(location.search.slice(1))
}

stage.on('dragmove', e => grid.adjust())
stage.on('pinchmove', e => {
//	console.log('pinching')
	grid.drawScorelines()
	grid.drawBeatlines()
	grid.adjust()
})

$('#overlay').addEventListener('pointerdown', e => {
	stage.current?.root.buildPart()
	$('#overlay').style.visibility = ''
	for (const i of $$('.pop-up')) i.style.top = ''
})

$('#config-btn').addEventListener('click', e => {
	$(`#overlay`).style.visibility = "visible"
	$('#config').style.top = '1.5rem'
	$('#tone-caption').innerText
})

$('#config-beat').addEventListener('change', e => {
	grid.beat = $('#config-beat').value
})
$('#config-tonic').addEventListener('change', e => {
	grid.tonic = $('#config-tonic').value
})

$('#play-btn').addEventListener('click', e => {
	rootlayer.children.map(n => n.buildPart())
	Tone.Transport.seconds = Tone.Transport.loopStart
	Tone.Transport.start()
	grid.showIndicator()
})

$('#stop-btn').addEventListener('click', e => {
	Tone.Transport.stop()
	grid.hideIndicator()
})

$('#repeat-btn').addEventListener('change', e => {
	Tone.Transport.loop = $('#repeat-btn').checked
})

$('#share-btn').addEventListener('click', async e => {
	const d = await Serializer.serialize()
	const url = location.origin + location.pathname + '?' + d
	await navigator.clipboard.writeText(url)
	$('#snackbar-text').innerText = "コピー完了"
	ui('#snackbar', 3000)
})

