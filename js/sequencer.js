
import {makePincher} from './pincher.js'
import {Grid} from './grid.js'
import {RootNote} from './note.js'

export const stage = new Konva.Stage({
	container: 'sequencer',
	width: window.innerWidth,
	height: window.innerHeight,
	draggable: true
})
makePincher(stage)

export const grid = new Grid(stage)
export const rootlayer = new Konva.Layer()

stage.add(grid)
stage.add(rootlayer)

stage.on('pointerclick', e => {
	if (stage.isDragging() || stage.isPinching || e.evt.button != 0 || stage.isNoteDragging) return
	const pos = stage.getRelativePointerPosition()
	const root = new RootNote(stage, pos.x, pos.y, 48)
	rootlayer.add(root)
	root.playThis()
	rootlayer.draw()
})


stage.on('dragmove', e => grid.adjust())
stage.on('pinchmove', e => {
//	console.log('pinching')
	grid.drawScorelines()
	grid.drawBeatlines()
	grid.adjust()
})