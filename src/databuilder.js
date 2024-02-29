async function getNodesAndLinks(myself, follows, followers) {
  let elements = [];

  // nodes  
  elements.push({
    data: {
      id: myself.did,
      name: myself.displayName,
      img: myself.avatar,
      handle: myself.handle,
      level: 3,
      rank: getRank(myself),
    },
    group: 'nodes',
    // grabbable: false,
  });
  for (const follow of follows) {
    elements.push({
      data: {
        id: follow.did,
        name: follow.displayName,
        img: follow.avatar,
        handle: follow.handle,
        level: (follow.mutual ? 2 : 1),
        rank: getRank(follow),
      },
      group: 'nodes',
      // grabbable: false,
    });
  };
  for (const follower of followers) {
    elements.push({
      data: {
        id: follower.did,
        name: follower.displayName,
        img: follower.avatar,
        handle: follower.handle,
        level: (follower.mutual ? 2 : 1),
        rank: getRank(follower),
      },
      group: 'nodes',
      // grabbable: false,
    });
  };
  console.log("complete nodes");
  // links
  // * follow (myself -> follow)
  for (const follow of follows) {
    elements.push({
      data: {
        source: myself.did,
        target: follow.did,
      },
      group: 'edges'
    });
  };
  console.log("complete links: follow");
  // * followers (followers -> myself)
  for (const follower of followers) {
    elements.push({
      data: {
        source: follower.did,
        target: myself.did,
      },
      group: 'edges'
    });
  }
  console.log("complete links: follower");

  return elements;

  function getRank(actor) {
    const rank = Math.log10(actor.postsCount * actor.followersCount)
    const correctedRank = (rank === -Infinity) ? 0 : rank;
    return ((1+follows.length+followers.length) * correctedRank);
  }
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
  elements.push(...validEdges, ...validNodes);
}

function removeDuplicateAndLimitNodes(elements, NODE_LIMIT) {
  const nodeCounts = {}; // ノードの出現回数を管理するオブジェクト
  let totalNodeCount = 0; // 全ノードの累計数

  // ノードの重複を削除
  const filteredNodes = elements.filter(element => {
    if (element.group === 'nodes') {
      const nodeId = element.data.id;
      if (!nodeCounts[nodeId]) {
        nodeCounts[nodeId] = 0;
      }
      nodeCounts[nodeId]++;
      totalNodeCount++;
      return nodeCounts[nodeId] === 1; // 重複していないノードのみを残す
    }
    return true; // エッジの場合はフィルタしない
  });

  // 全ノードの累計がNODE_LIMITを超えた場合は超過分を削除する
  if (totalNodeCount > NODE_LIMIT) {
    const excess = totalNodeCount - NODE_LIMIT; // 超過分の数
    let removedCount = 0; // 削除したノードの数
    for (let i = filteredNodes.length - 1; i >= 0; i--) {
      if (filteredNodes[i].group === 'nodes') {
        filteredNodes.splice(i, 1);
        removedCount++;
        if (removedCount === excess) {
          break; // 超過分をすべて削除したらループを終了
        }
      }
    }
  }

  return filteredNodes;
}

// const testData = {
//   nodes: [
//     { id: 1 },
//     { id: 2 },
//     { id: 3 }
//   ],
//   links: [
//     { source: 1, target: 2 }, // 有効なリンク
//     { source: 2, target: 4 }, // 無効なリンク (targetが存在しない)
//     { source: 3, target: 2 }, // 無効なリンク (sourceが存在しない)
//     { source: 1, target: 3 }  // 有効なリンク
//   ]
// };
// // テストケース
// console.log("テストケース1:");
// console.log("削除前:", testData.links);
// removeInvalidLinks(testData);
// console.log("削除後:", testData.links);

module.exports.getNodesAndLinks = getNodesAndLinks;
module.exports.removeInvalidLinks = removeInvalidLinks;
module.exports.removeDuplicateAndLimitNodes = removeDuplicateAndLimitNodes;