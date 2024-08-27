import { createCanvas, loadImage, registerFont } from 'canvas';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FONT_PATH_ABS = path.join(__dirname, '../fonts/mgenplus-1c-medium.ttf') // server側に置いたフォントファイルを読み出す手段がこれしかない？

export async function addTextToImage(imageData) {
  const fontSize = 18;

  try {
    // フォントの読み込み
    registerFont(FONT_PATH_ABS, { family: 'myFont' });

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
    const margin = 10;
    ctx.fillText(text, margin, image.height - margin);

    // CanvasをBase64 URIに変換
    const base64URI = canvas.toDataURL('image/png');
    return base64URI;
  
  } catch (e) {
    console.error(e);
  }
}