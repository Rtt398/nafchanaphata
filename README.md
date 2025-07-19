# Nafchanaphata
Shasavistic Music Sequencer on Web
### Available at [rtt398.github.io/nafchanaphata](https://rtt398.github.io/nafchanaphata/)

## About
[LΛMPLIGHT氏](https://lamplight0.sakura.ne.jp/a/) が公開している「シャサフ式音楽理論」に基づき、簡易的な音楽を作成できるWebシーケンサー。

音同士の音高差を視覚的に示す「和音図」を拡張した、ピアノロールのようなUI上で編集・再生が可能。

現在のバージョン：テスト版（testflight-2025-07-20） バグを含む可能性があります。

## Questions?
質問、要望、バグ報告などはこのページ上部の Issues から投稿するか、下記のTwitter、E-mail、マシュマロにお送りください。

## Todos
### 実装完了
- [x] Share
- [x] Shift (底音操作時に自身より後ろのノートが連動する)
- [x] Undo
### 優先度高 (実装中)
- [ ] 楽器の追加
### 中程度 (追加したい)
- [ ] 操作性・UI改善（ホイールでもズーム、当たり判定改善、キーバインド、2次元譜線、オートスクロールなど）
- [ ] 翻訳（英語、沙語）
- [ ] チュートリアル
### 低い (需要があれば検討)
- [ ] エクスポート(MIDI, オーディオ)
- [ ] テンポの途中変更
- [ ] 明背景テーマ
- [ ] マルチパート、ドラムパート
- [ ] リバーブ処理など

## Acknowledgements
- 和音図のデザイン・配色は LΛMPLIGHT氏 の資料に基づく（一部簡略化）
- 音源 [Salamander Piano](https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html) はAlexander Holm氏による
- 描画ライブラリとして [Konva.js](https://Konvajs.org) を使用
- 音声ライブラリとして [Tone.js](https://tonejs.github.io/) を使用
- UIライブラリとして [Beer.css](https://www.beercss.com/) を使用
- 圧縮ライブラリとして [JSONCrush](https://github.com/KilledByAPixel/JSONCrush) を使用
- フォントを作成するために [nanoemoji](https://github.com/googlefonts/nanoemoji) と [fonttools](https://github.com/fonttools/fonttools) を使用
- プログラミング等の補助として [ChatGPT](https://chatgpt.com) を使用

## Author
### Rtt
- [rtt398@twitter](https://x.com/rtt398)
- [rtt398@gmail.com](mailto:rtt398@gmail.com)
- [rtt398@マシュマロ](https://marshmallow-qa.com/rtt398)
- [rtt398.web.fc2.com](https://rtt398.web.fc2.com/)
