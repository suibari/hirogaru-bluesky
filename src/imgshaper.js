const { createCanvas, loadImage, registerFont } = require('canvas');

async function addTextToImage(imageData) {
  const fontPath = "./src/fonts/mgenplus-1c-medium.ttf";
  const fontSize = 18;

  // フォントの読み込み
  registerFont(fontPath, { family: 'myFont' });

  // 画像の読み込み
  const image = await loadImage(imageData);

  // 画像と同じサイズのCanvasを作成
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  // 画像をCanvasに描画
  ctx.drawImage(image, 0, 0, image.width, image.height);

  // テキストの描画
  ctx.font = `${fontSize}px myFont`;
  ctx.fillStyle = 'white';
  const text = '#ひろがるBluesky!';
  const textWidth = ctx.measureText(text).width;
  const textHeight = fontSize;
  const margin = 10;
  ctx.fillText(text, image.width - textWidth - margin, image.height - margin);

  // CanvasをBase64 URIに変換
  const base64URI = canvas.toDataURL('image/png');
  return base64URI;
}

module.exports.addTextToImage = addTextToImage;