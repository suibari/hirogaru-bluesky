async function getElements(myself, follows, followsOfFollows) {
  let elements = [];

  // nodes  
  pushActorToNodes(myself, elements, 5);
  // follow
  for (const follow of follows) {
    if (follow.mutual) {
      pushActorToNodes(follow, elements, 4);
    } else {
      pushActorToNodes(follow, elements, 3);
    }
    // follow of follows
    if (followsOfFollows[follow.did].length > 0) {
      for (const followOfFollows of followsOfFollows[follow.did]) {
        if (follow.mutual) {
          pushActorToNodes(followOfFollows, elements, 2);
        } else {
          pushActorToNodes(followOfFollows, elements, 1);
        };
      };
    };
  };
  // edges
  // * follow (myself -> follow)
  for (const follow of follows) {
    elements.push({
      data: {
        source: myself.did,
        target: follow.did,
      },
      group: 'edges'
    });
    // * follow of follows (follows -> followsOfFollows)
    if (followsOfFollows[follow.did].length > 0) {
      for (const followOfFollows of followsOfFollows[follow.did]) {
        elements.push({
          data: {
            source: follow.did,
            target: followOfFollows.did,
          },
          group: 'edges'
        });
      };
    };
  };
  // console.log("complete links: follows");
  // console.log("complete links: follows of Followss");

  // nodes (rank)
  // const totalNodes = elements.filter(element => element.group === "nodes").length;
  
  return elements;
}

function pushActorToNodes(actor, elements, level) {
  elements.push({
    data: {
      id: actor.did,
      name: actor.displayName,
      img: actor.avatar,
      handle: actor.handle,
      level: level,
      rank: getRank(actor), 
    },
    group: 'nodes',
    // grabbable: false,
  });
}

function getRank(actor) {
  const rank = Math.log10(actor.postsCount * actor.followersCount)
  const correctedRank = (rank === -Infinity) ? 0 : rank;
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

function removeDuplicateNodes(elements) {
  const nodeMap = {}; // ノードの情報を格納するマップ

  // ノードの情報をマップに格納
  elements.forEach(element => {
    if (element.group === 'nodes') {
      const nodeId = element.data.id;
      const nodeLevel = element.data.level;

      // すでに同じIDのノードが存在する場合、レベルを比較して高い方を残す
      if (nodeMap[nodeId]) {
        const existingLevel = nodeMap[nodeId].data.level;
        if (nodeLevel > existingLevel) {
          // 既存のノードよりもレベルが高い場合、要素を置き換える
          nodeMap[nodeId] = element;
        }
      } else {
        // まだ同じIDのノードが存在しない場合、そのまま追加
        nodeMap[nodeId] = element;
      }
    }
  });

  // 新しい要素配列を構築
  const newElements = [];
  elements.forEach(element => {
    // グループがノードの場合、マップに含まれている要素のみを追加
    if (element.group === 'nodes' && nodeMap[element.data.id]) {
      newElements.push(nodeMap[element.data.id]);
    } else if (element.group === 'edges') {
      // グループがエッジの場合、そのまま追加
      newElements.push(element);
    }
  });

  return newElements;
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

module.exports.getElements = getElements;
module.exports.removeInvalidLinks = removeInvalidLinks;
module.exports.removeDuplicateNodes = removeDuplicateNodes;