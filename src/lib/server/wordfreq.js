import { NODE_ENV } from '$env/static/private';
import kuromoji from 'kuromoji';
import path, { resolve } from 'path';
import { fileURLToPath } from 'url';

const EXCLUDE_WORDS = ["こと", "これ", "さん", "ちゃん", "くん", "自分", "おれ", "よう"];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Kuromoji tokenizerのビルダー
const dicPath = (NODE_ENV === 'development') ? "node_modules/kuromoji/dict" : resolve(__dirname, '../../../../node_modules/kuromoji/dict') ;
const tokenizerBuilder = kuromoji.builder({ dicPath: dicPath });

/**
 * テキストの配列から名詞の頻出TOP3を返す関数
 */
export async function getNounFrequencies(posts, sliceNum) {
  return new Promise((resolve, reject) => {
    tokenizerBuilder.build((err, tokenizer) => {
      if (err) {
        return reject(err);
      }

      const freqMap = {};

      posts.forEach(post => {
        const text = post.value.text;
        const tokens = tokenizer.tokenize(text);
        const nouns = tokens.filter(token => 
          token.pos === '名詞' &&
          !/^[\d]+$/.test(token.surface_form) && // 数値の除外
          !/^[^\p{L}]+$/u.test(token.surface_form) && // 記号の除外
          !/^[ぁ-ん]{1}$/.test(token.surface_form) && // ひらがな一文字の除外
          token.surface_form.length !== 1 && // 1文字のみの単語を除外
          !EXCLUDE_WORDS.includes(token.surface_form) // EXCLUDE_WORDSに含まれていない
        );
        nouns.forEach(noun => {
          const surfaceForm = noun.surface_form;
          freqMap[surfaceForm] = (freqMap[surfaceForm] || 0) + 1;
        });
      });

      const sortedNouns = Object.entries(freqMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, sliceNum)
        .map(([noun]) => noun);

      resolve(sortedNouns);
    });
  });
}
