import { getElementsAndUpdateDbFunction, getPostsLikesAndUpdateDbFunction } from "./function";

export const functions = [
  getElementsAndUpdateDbFunction,
<<<<<<< HEAD
  getPostsLikesAndUpdateDbFunction(0), // elements  [0] ~ [18]
  getPostsLikesAndUpdateDbFunction(1), //          [19] ~ [37]
=======
  getPostsLikesAndUpdateDbFunction(0), // elements  [0] ~ [17]
  getPostsLikesAndUpdateDbFunction(1), //          [18] ~ [35]
>>>>>>> 5ec88fc (ポスト100いいね100をDB保存することは成功、しかし処理が悪く時間がかかるので要改善)
  getPostsLikesAndUpdateDbFunction(2), //              ...
  getPostsLikesAndUpdateDbFunction(3),
  getPostsLikesAndUpdateDbFunction(4),
  getPostsLikesAndUpdateDbFunction(5),
  getPostsLikesAndUpdateDbFunction(6),
  getPostsLikesAndUpdateDbFunction(7),
  getPostsLikesAndUpdateDbFunction(8),
  getPostsLikesAndUpdateDbFunction(9),
  getPostsLikesAndUpdateDbFunction(10),
  getPostsLikesAndUpdateDbFunction(11),
  getPostsLikesAndUpdateDbFunction(12),
  getPostsLikesAndUpdateDbFunction(13),
  getPostsLikesAndUpdateDbFunction(14),
];

export { inngest } from './inngest'
