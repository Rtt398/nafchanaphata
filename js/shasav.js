
import {$, $$, pitchIntervals} from './util.js';
import {Serializer} from './serialize.js'
import history from './history.js'
import {switchTones} from './sound.js'
import {stage, grid, rootlayer} from './sequencer.js'
import {i18n} from './i18n.js'
if(location.hostname == 'localhost') {
	import('./test.js')
}

i18n(navigator.language == 'ja' ? 'ja' : 'en') 

Konva.hitOnDragEnabled = true
scrollTo(0, 0)

window.addEventListener('resize', e => {
	stage.size({
		width: window.innerWidth,
		height: window.innerHeight
	})
	scrollTo(0, 0)
})

$('#overlay').addEventListener('pointerdown', function(e) {
	stage.current?.root.buildPart()
	this.style.visibility = ''
	for (const i of $$('.pop-up')) i.style.top = ''
	scrollTo(0, 0)
})

$('#config-btn').addEventListener('click', e => {
	$(`#overlay`).style.visibility = "visible"
	$('#config').style.top = '1.5rem'
	$('#tone-caption').innerText
})

$('#config-lang').addEventListener('change', function(e) {
	i18n(this.value)
})

$('#config-beat').addEventListener('change', function(e) {
	grid.beat = this.value
})
$('#config-tonic').addEventListener('change', function(e) {
	grid.tonic = this.value
})

$('#config-tone').addEventListener('change', function(e) {
	switchTones(this.value)
	$('#tone-caption').innerText = this.selectedOptions[0].dataset.caption
})

$('#shift-mode-btn').addEventListener('change', e => {
	stage.isShiftMode = $('#shift-mode-btn').checked
})

$('#undo-btn').addEventListener('click', e => {
	history.restore()
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

$('#repeat-btn').addEventListener('change', function(e) {
	Tone.Transport.loop = this.checked
})

$('#share-btn').addEventListener('click', async e => {
	const d = await Serializer.serialize(true)
	const url = location.origin + location.pathname + '?' + d
	await navigator.clipboard.writeText(url)
	ui('#snackbar', 3000)
})


$('#rootdelete').addEventListener('click', e => {
	if (stage.current) {
		history.snapshot()
		stage.current.del()
		stage.current = undefined
	}
	$('#overlay').style.visibility = ''
	$('#rootmenu').style.top = ''
})

$('#delete').addEventListener('click', e => {
	if (stage.current) {
		history.snapshot()
		stage.current.del()
		stage.current.root.buildPart()
		stage.current = undefined
	}
	$('#overlay').style.visibility = ''
	$('#menu').style.top = ''
})

$('#roothz').addEventListener('blur', e => {
	const hz = e.target.innerText.replace(/[^0-9.]/g, '')
	if (hz == '' || hz < 20 || hz > 20000) return e.target.innerText = Math.round(stage.current.hz)
	history.snapshot()
	e.target.innerText = hz
	stage.current.hz = hz
	if ($('#rootmenu').style.top == '') return
	$('#rootmenu').style.top = stage.current.absolutePosition().y + "px"
})

$('#rootvolume').addEventListener('change', e => {
	history.snapshot()
	$('#rootmute').checked = false
	stage.current.mute = false
	stage.current.volume = e.target.value
})

$('#volume').addEventListener('change', e => {
	history.snapshot()
	$('#mute').checked = false
	stage.current.mute = false
	stage.current.volume = e.target.value
})

for (const el of $$('.mute-btn')) {
	el.addEventListener('change', function(e) {
		if (stage.current) {
			history.snapshot()
			stage.current.mute = this.checked
			rootlayer.draw()
		}
	})
}

for (const el of $$('.prog-btn')) {
	el.addEventListener('click', function(e) {
		// rootの音高を移動させる操作 (0d以外は累積)
		if (!stage.current) return
		history.snapshot()
		const shift = pitchIntervals[($('#root-prog-dir').checked ? '-' : '') + this.innerText]
		const interval = this.innerText == '0d' ? {n: 1, d: 1} : stage.current.interval || {n: 1, d: 1}
		stage.current.interval = {n: interval.n * shift.n, d: interval.d * shift.d}
		$('#rootmenu').style.top = stage.current.pitchline.absolutePosition().y + "px"
		$(`#roothz`).innerText = Math.round(stage.current.hz)
		$(`#roottav`).innerText = stage.current.tav
	})
}
for (const el of $$('.trans-btn')) {
	el.addEventListener('click', function(e) {
		// 自身の音高差を変更する操作 (上書き)
		history.snapshot()
		stage.current.interval = pitchIntervals[($('#trans-dir').checked ? '-' : '') + this.innerText]
		$('#menu').style.top = stage.current.pitchline.absolutePosition().y + "px"
		$(`#hz`).innerText = Math.round(stage.current.hz)
		$(`#tav`).innerText = stage.current.tav
	})
}
for (const el of $$('.root-ext-btn')) {
	el.addEventListener('click', function(e) {
		// 自身と所定の音高差を持つnoteを追加する操作
		history.snapshot()
		const n = stage.current.addNote(stage.current.len, pitchIntervals[($('#root-ext-dir').checked ? '-' : '') + this.innerText])
		n.playThis()
	})
}
for (const el of $$('.ext-btn')) {
	el.addEventListener('click', function(e) {
		// 自身と所定の音高差を持つnoteを追加する操作
		history.snapshot()
		const n = stage.current.addNote(stage.current.len, pitchIntervals[($('#ext-dir').checked ? '-' : '') + this.innerText])
		n.playThis()
	})
}

for (const el of $$('.play-this-btn')) {
	el.addEventListener('click', function(e) {
		stage.current.root.play()
	})
}

if (location.search !== '') {
	Serializer.deserialize(location.search.slice(1))
}