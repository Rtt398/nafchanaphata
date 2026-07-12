/*
 * 音频采样器与播放模块：管理乐器音源（Salamander 钢琴、Strumstick、Vibraphone），支持音色切换与音符触发播放
 * オーディオサンプラーと再生モジュール：楽器音源（サラマンダーピアノ、ストラムスティック、ビブラフォン）を管理し、音色切替とノートトリガー再生をサポート
 * Audio sampler and playback module: manages instrument sound sources (Salamander Piano, Strumstick, Vibraphone), supports tone switching and note trigger playback
 */

// 默认采样器：Salamander 钢琴音源，输出到主音频总线 // デフォルトサンプラー：サラマンダーピアノ音源、メイン出力に接続 // Default sampler: Salamander Piano sound source, routed to main output
export let sampler = tones('salamander-piano').toDestination()

// 根据音色名称创建对应的 Tone.Sampler 实例 // 音色名に基づいて対応する Tone.Sampler インスタンスを生成 // Create the corresponding Tone.Sampler instance based on tone name
function tones(tone) {
	switch (tone) {
		// Salamander 钢琴音源：多八度采样，含 A/D#/C/F# 各音高 // サラマンダーピアノ音源：複数オクターブサンプリング、A/D#/C/F# 各音高を含む // Salamander Piano: multi-octave samples covering A/D#/C/F# pitches
		case 'salamander-piano':
			return new Tone.Sampler({
				baseUrl: 'asset/sound/salamander/',
				urls: {
					A0: 'A0.mp3',A1: 'A1.mp3',A2: 'A2.mp3',A3: 'A3.mp3',A4: 'A4.mp3',A5: 'A5.mp3',A6: 'A6.mp3',A7: 'A7.mp3',
					'D#1': 'Ds1.mp3','D#2': 'Ds2.mp3','D#3': 'Ds3.mp3','D#4': 'Ds4.mp3','D#5': 'Ds5.mp3','D#6': 'Ds6.mp3','D#7': 'Ds7.mp3',
					C1: 'C1.mp3',C2: 'C2.mp3',C3: 'C3.mp3',C4: 'C4.mp3',C5: 'C5.mp3',C6: 'C6.mp3',C7: 'C7.mp3',C8: 'C8.mp3',
					'F#1': 'Fs1.mp3','F#2': 'Fs2.mp3','F#3': 'Fs3.mp3','F#4': 'Fs4.mp3','F#5': 'Fs5.mp3','F#6': 'Fs6.mp3','F#7': 'Fs7.mp3'
				},
				release: 1.25
			})
		// VCSL Strumstick 拨弦乐器音源 // VCSL ストラムスティック撥弦楽器音源 // VCSL Strumstick plucked string instrument
		case 'vcsl-strumstick':
			return new Tone.Sampler({
				baseUrl: 'asset/sound/strumstick/',
				urls: {
					'A2': 'A2.ogg','A3': 'A3.ogg','A4': 'A4.ogg','B2': 'B2.ogg','B3': 'B3.ogg','C#3': 'Cs3.ogg','C#4': 'Cs4.ogg','D2': 'D2.ogg',
					'D3': 'D3.ogg','D4': 'D4.ogg','E2': 'E2.ogg','E3': 'E3.ogg','E4': 'E4.ogg','F#2': 'Fs2.ogg','F#3': 'Fs3.ogg','F#4': 'Fs4.ogg',
					'G2': 'G2.ogg','G3': 'G3.ogg','G4': 'G4.ogg'
				},
				release: 1.25
			})
		// VCSL Vibraphone 颤音琴音源 // VCSL ビブラフォン音源 // VCSL Vibraphone sound source
		case 'vcsl-vibraphone':
			return new Tone.Sampler({
				baseUrl: 'asset/sound/vibraphone/',
				urls: {
					'A2':'A2.ogg','A4':'A4.ogg','B3':'B3.ogg','C3':'C3.ogg','C5':'C5.ogg','D4':'D4.ogg',
					'E3':'E3.ogg','E5':'E5.ogg','F2':'F2.ogg','F4':'F4.ogg','G3':'G3.ogg'
				},
				release: 1.25
			})
		// VCSL Concert Harp 竖琴音源 // VCSL コンサートハープ音源 // VCSL Concert Harp sound source
		case 'vcsl-ksharp':
			return new Tone.Sampler({
				baseUrl: 'asset/sound/ksharp/',
				urls: {
					'A4':'A4.ogg','B1':'B1.ogg','B5':'B5.ogg','B6':'B6.ogg','C3':'C3.ogg','D4':'D4.ogg',
					'E5':'E5.ogg','F2':'F2.ogg','F6':'F6.ogg','G3':'G3.ogg'
				},
				release: 1.25
			})
		// VCSL Pipe Organ 管风琴音源 // VCSL パイプオルガン音源 // VCSL Pipe Organ sound source
		case 'vcsl-pipeorgan-rode':
			return new Tone.Sampler({
				baseUrl: 'asset/sound/pipeorgan/',
				urls: {
					'C1':'C1.ogg','C2':'C2.ogg','C3':'C3.ogg','C4':'C4.ogg','C5':'C5.ogg','C6':'C6.ogg',
					'F#1': 'Fs1.ogg','F#2': 'Fs2.ogg','F#3': 'Fs3.ogg','F#4': 'Fs4.ogg','F#5': 'Fs5.ogg'
				},
				release: 1.25
			})
	}
}

// 切换音色：先释放当前采样器，再创建新的并输出到主总线 // 音色切替：現在のサンプラーを解放し、新しいサンプラーを作成してメイン出力に接続 // Switch tone: dispose current sampler, create new one and route to main output
export function switchTones(tone) {
	sampler?.dispose()
	console.log('switch tone:', tone)
	sampler = tones(tone).toDestination()
}

// 播放音符列表：遍历每个音符并用采样器触发 Attack-Release 包络 // ノートリストを再生：各ノートを巡回し、サンプラーで Attack-Release エンベロープをトリガー // Play note list: iterate each note and trigger Attack-Release envelope via sampler
export function playNotes(notes) {
	if (!sampler.loaded) return
	for (const note of notes) {
		//console.log('play', note)
		// triggerAttackRelease: 频率, 时长, 延迟时间, 音量 // triggerAttackRelease: 周波数, 長さ, 遅延時間, 音量 // triggerAttackRelease: frequency, duration, delay time, volume
		sampler.triggerAttackRelease(
			note.hz,
			note.len, 
			'+' + note.time,
			note.vol
		)
	}
}
