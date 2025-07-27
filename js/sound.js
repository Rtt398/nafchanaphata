
export let sampler = tones('salamander-piano').toDestination()

function tones(tone) {
	switch (tone) {
		case 'salamander-piano':
			return new Tone.Sampler({
				baseUrl: 'sound/salamander/',
				urls: {
					A0: 'A0.mp3',A1: 'A1.mp3',A2: 'A2.mp3',A3: 'A3.mp3',A4: 'A4.mp3',A5: 'A5.mp3',A6: 'A6.mp3',A7: 'A7.mp3',
					'D#1': 'Ds1.mp3','D#2': 'Ds2.mp3','D#3': 'Ds3.mp3','D#4': 'Ds4.mp3','D#5': 'Ds5.mp3','D#6': 'Ds6.mp3','D#7': 'Ds7.mp3',
					C1: 'C1.mp3',C2: 'C2.mp3',C3: 'C3.mp3',C4: 'C4.mp3',C5: 'C5.mp3',C6: 'C6.mp3',C7: 'C7.mp3',C8: 'C8.mp3',
					'F#1': 'Fs1.mp3','F#2': 'Fs2.mp3','F#3': 'Fs3.mp3','F#4': 'Fs4.mp3','F#5': 'Fs5.mp3','F#6': 'Fs6.mp3','F#7': 'Fs7.mp3'
				},
				release: 1.25
			})
		case 'vcsl-strumstick':
			return new Tone.Sampler({
				baseUrl: 'sound/strumstick/',
				urls: {
					'A2': 'A2.ogg','A3': 'A3.ogg','A4': 'A4.ogg','B2': 'B2.ogg','B3': 'B3.ogg','C#3': 'Cs3.ogg','C#4': 'Cs4.ogg','D2': 'D2.ogg',
					'D3': 'D3.ogg','D4': 'D4.ogg','E2': 'E2.ogg','E3': 'E3.ogg','E4': 'E4.ogg','F#2': 'Fs2.ogg','F#3': 'Fs3.ogg','F#4': 'Fs4.ogg',
					'G2': 'G2.ogg','G3': 'G3.ogg','G4': 'G4.ogg'
				},
				release: 1.25
			})
		case 'vcsl-vibraphone':
			return new Tone.Sampler({
				baseUrl: 'sound/vibraphone/',
				urls: {
					'A2':'A2.ogg','A4':'A4.ogg','B3':'B3.ogg','C3':'C3.ogg','C5':'C5.ogg','D4':'D4.ogg',
					'E3':'E3.ogg','E5':'E5.ogg','F2':'F2.ogg','F4':'F4.ogg','G3':'G3.ogg'
				},
				release: 1.25
			})
	}
}

export function switchTones(tone) {
	sampler?.dispose()
	console.log('switch tone:', tone)
	sampler = tones(tone).toDestination()
}

export function playNotes(notes) {
	if (!sampler.loaded) return
	for (const note of notes) {
		//console.log('play', note)
		sampler.triggerAttackRelease(
			note.hz,
			note.len, 
			'+' + note.time,
			note.vol
		)
	}
}