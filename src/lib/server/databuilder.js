import FileType from 'file-type';
import { base64DefaultAvatorImage } from '$lib/img/defaultavator.js';
const DEFFAULT_AVATOR = `url(${base64DefaultAvatorImage})`;

export async function getElements(allWithProf) {
  let elements = [];
  let n = 0;
  let sum = 0;
  let groupSizes = [];

  // グループサイズのリストを作成
  for (let i = 1;; i++) {
    const groupSize = 6 * i - 5; // 1, 6, 12, 18, 24, ...
    groupSizes.push(groupSize);
    sum += groupSize;
    if (sum >= allWithProf.length) break;
  }

  // 最後のグループが1になるように調整
  let lastGroupSize = groupSizes.pop();
  if (sum > allWithProf.length) {
    lastGroupSize -= (sum - allWithProf.length);
  }
  if (lastGroupSize > 0) {
    groupSizes.push(lastGroupSize);
  }

  let currentIndex = 0;
  for (let groupIndex = 0; groupIndex < groupSizes.length; groupIndex++) {
    n = groupSizes.length - groupIndex; // デクリメントされたnの値

    for (let i = 0; i < groupSizes[groupIndex]; i++) {
      if (currentIndex >= allWithProf.length) break;

      const friend = allWithProf[currentIndex];

      if (n > 0) {
        await pushActorToNodes(friend, elements, n);
      }

      // エッジの処理
      const engagement = friend.engagement ? friend.engagement : 0;
      const engagementExp = getEdgeEngagement(engagement);
      if (currentIndex != 0) {
        elements.push({
          data: {
            source: allWithProf[0].did,
            target: friend.did,
            engagement: engagementExp,
            rawEngagement: engagement,
          },
          group: 'edges'
        });
      };

      currentIndex++;
    }
  }

  return elements;
}

async function pushActorToNodes(actor, elements, level) {
  const MYSELF_RANK = 20;

  let img
  if (!actor.avatar) {
    img = DEFFAULT_AVATOR;
  } else {
    img = await imageUrlToBase64(actor.avatar);
  };
  // console.log(img)

  const rank = getRank(actor);

  elements.push({
    data: {
      id: actor.did,
      name: actor.displayName,
      img: img,
      handle: actor.handle,
      level: level, // 同心円の階層
      rank: rank, // アイコンサイズ
      engagement: actor.engagement||undefined,
      following: actor.following,
    },
    group: 'nodes',
  });
}

function getRank(actor) {
  const RANK_COEF = 30;
  const RANK_BIAS = 50;
  const RANK_LOWEST = 20;
  const RANK_HIGHEST = 60;

  const rank = Math.log10((actor.followersCount / actor.followsCount) * 1000) * RANK_COEF - RANK_BIAS;
  let correctedRank;
  if (RANK_HIGHEST < rank) {
    correctedRank = RANK_HIGHEST; // 影響力が高すぎる場合クリップ
  } else if (RANK_LOWEST > rank) {
    correctedRank = RANK_LOWEST; // 影響力が低すぎる場合もクリップ
  } else {
    correctedRank = rank;
  }
  return correctedRank;
}

function getEdgeEngagement(engaegement) {
    // 定数の設定
    const exponent = 0.5; // 指数関数の指数を調整する定数

    // 指数関数を適用して値を変換
    let result = Math.pow(engaegement, exponent);
    result = result > 25 ? 25 : result;

    return result;
}

export function removeInvalidLinks(elements) {
  const validEdges = []; // 有効なエッジを格納する配列
  const validNodes = []; // 有効なノードを格納する配列

  // 有効なエッジとノードを抽出する
  elements.forEach(element => {
    if (element.group === 'edges' && element.data && element.data.source && element.data.target) {
      const sourceExists = elements.some(node => node.group === 'nodes' && node.data.id === element.data.source);
      const targetExists = elements.some(node => node.group === 'nodes' && node.data.id === element.data.target);
      if (sourceExists && targetExists) {
        validEdges.push(element); // 有効なエッジを配列に追加
      }
    } else if (element.group === 'nodes') {
      validNodes.push(element); // 有効なノードを配列に追加
    }
  });

  // 元の配列を有効なエッジとノードの配列で置き換える
  elements.length = 0;
  elements.push(...validNodes, ...validEdges);
}

export function removeDuplicatesNodes(headElement, otherElements) {
  const elements = [headElement].concat(otherElements);

  const uniqueObjects = {};
  for (const obj of elements) {
    if (!(obj.did in uniqueObjects)) {
      uniqueObjects[obj.did] = obj;
    }
  }
  return Object.values(uniqueObjects);
}

async function imageUrlToBase64(imageUrl) {
  let base64StringWithMime;

  let response = await fetch(imageUrl);
  if (!response.ok) {
      // throw new Error('Failed to fetch image');
      console.error("[ERROR] failed to fetch image, so attach default image.")
      base64StringWithMime = DEFFAULT_AVATOR;
      return base64StringWithMime;
  }

  // 画像をBlobとして取得
  const imageBlob = await response.blob();
        
  // BlobをBufferに変換
  const buffer = await imageBlob.arrayBuffer();

  // バッファからファイルタイプを取得する
  const fileType = await FileType.fromBuffer(buffer);
  
  // BufferをBase64に変換
  const base64String = Buffer.from(buffer).toString('base64');

  base64StringWithMime = "url(data:" + fileType.mime + ";base64," + base64String + ")";
  // fs.writeFileSync('temp_image.jpg', base64StringWithMime);

  // console.log(base64StringWithMime);
  return base64StringWithMime;
}
