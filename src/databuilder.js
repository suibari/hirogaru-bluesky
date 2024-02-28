function getNodesAndLinks(myself, follows, followers) {
  let data = {};

  // nodes
  let nodes = [];
  const personArray = [myself].concat(follows, followers);
  for (const person of personArray) {
    nodes.push({
      id: person.did,
      name: person.displayName,
      img: person.avatar
    });
  };
  console.log("complete nodes");
  data.nodes = nodes;
  // links
  // * follow (myself -> follow)
  let links = [];
  for (const follow of follows) {
    links.push({
      source: myself.did,
      target: follow.did
    });
  };
  console.log("complete links: follow");
  // * followers (followers -> myself)
  for (const follower of followers) {
    links.push({
      source: follower.did,
      target: myself.did
    })
  }
  data.links = links;
  console.log("complete links: follower");

  return data;
}

function removeInvalidLinks(data) {
  const validLinks = data.links.filter(link => {
    const sourceExists = data.nodes.some(node => node.id === link.source);
    const targetExists = data.nodes.some(node => node.id === link.target);
    return sourceExists && targetExists;
  });
  data.links = validLinks;
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