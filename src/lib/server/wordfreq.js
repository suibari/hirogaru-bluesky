import { NODE_ENV } from '$env/static/private';
import kuromoji from 'kuromoji';
import path from 'path';
import prodDictPath from '$static/dict?raw';

// Kuromoji tokenizerのビルダー
const dicPath = (NODE_ENV === 'development') ? "node_modules/kuromoji/dict" : prodDictPath ;
const tokenizerBuilder = kuromoji.builder({ dicPath: dicPath });

/**
 * テキストの配列から名詞の頻出数をカウントする関数
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
          token.surface_form.length !== 1 // 1文字のみの単語を除外
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
