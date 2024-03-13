const FileType  = require('file-type');
const fs = require('fs');
const defaultImageUrl = "https://knsoza1.com/wp-content/uploads/2020/07/70b3dd52350bf605f1bb4078ef79c9b9.png";

async function getElements(allWithProf) {
  let elements = [];

  // nodes
  for (const [i, friend] of allWithProf.entries()) {
    // console.log(followandfollower.handle+","+i)
    let n = 0;
    if (i == 0) {
      n = 5;
    } else if (i >= 1 && i < 7) {
      n = 4;
    } else if (i >= 7 && i < 19) {
      n = 3;
    } else if (i >= 19 && i < 37) {
      n = 2;
    }
    // } else {
    //   n = 1;
    // }
    if (n > 0) {
      await pushActorToNodes(friend, elements, n);
    }
  };
  // // edges
  // // * follow (myself -> follow)
  // for (const friend of friends) {
  //   elements.push({
  //     data: {
  //       source: myself.did,
  //       target: friend.did,
  //     },
  //     group: 'edges'
  //   });
  // };
  // console.log("complete links: follows");
  // console.log("complete links: follows of Followss");

  // nodes (rank)
  // const totalNodes = elements.filter(element => element.group === "nodes").length;
  
  return elements;
}

async function pushActorToNodes(actor, elements, level) {
  if (!actor.avatar) {
    actor.avatar = defaultImageUrl;
  };
  const img = await imageUrlToBase64(actor.avatar);
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
  const RANK_BIAS = 60;

  const rank = Math.log10((actor.followersCount / actor.followsCount) * 1000) * RANK_COEF - RANK_BIAS;
  const correctedRank = (rank < 10) ? 10 : rank;
  return correctedRank;
}

function removeInvalidLinks(elements) {
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

function removeDuplicatesNodes(headElement, otherElements) {
  const elements = [headElement].concat(otherElements);

  const uniqueObjects = {};
  for (const obj of elements) {
    uniqueObjects[obj.did] = obj;
  }
  return Object.values(uniqueObjects);
}

async function imageUrlToBase64(imageUrl) {
  let response = await fetch(imageUrl);
  if (!response.ok) {
      // throw new Error('Failed to fetch image');
      console.error("[ERROR] failed to fetch image, so attach default image.")
      response = await fetch(defaultImageUrl);
  }

  // 画像をBlobとして取得
  const imageBlob = await response.blob();
        
  // BlobをBufferに変換
  const buffer = await imageBlob.arrayBuffer();

  // バッファからファイルタイプを取得する
  const fileType = await FileType.fromBuffer(buffer);
  
  // BufferをBase64に変換
  const base64String = Buffer.from(buffer).toString('base64');

  const base64StringWithMime = "url(data:" + fileType.mime + ";base64," + base64String + ")";
  // fs.writeFileSync('temp_image.jpg', base64StringWithMime);

  // console.log(base64StringWithMime);
  return base64StringWithMime;
}

module.exports.getElements = getElements;
module.exports.removeInvalidLinks = removeInvalidLinks;
module.exports.removeDuplicatesNodes = removeDuplicatesNodes;