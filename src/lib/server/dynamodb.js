import AWS from "aws-sdk";

AWS.config.update({
  region: "us-east-1",
});
export const docClient = new AWS.DynamoDB.DocumentClient();

// elements
export const GET_ELEMENTS = (handle) => ({
  TableName: 'hirogaru-bluesky-db',
  Key: {
    key: handle
  },
})

export const UPDATE_ELEMENTS = (handle, elements) => ({
  TableName: 'hirogaru-bluesky-db',
  Key: {
    key: handle
  },
  UpdateExpression: 'SET elements = :newElements',
  ExpressionAttributeValues: {
    ':newElements': elements,
  },
});

// root_accessToken
export const GET_TOKENS = {
  TableName: 'hirogaru-bluesky-db',
  Key: { key: 'tokens' },
}

export const UPDATE_TOKENS = (accessJwt, refreshJwt) => ({
  TableName: 'hirogaru-bluesky-db',
  Key: {
    key: 'tokens',
  },
  UpdateExpression: 'SET userInfo = :userInfo',
  ExpressionAttributeValues: {
    ':userInfo': {
      accessJwt,
      refreshJwt,
    }
  },
});

// user_accessToken
export const GET_USER_USERINFO = (sessionId) => ({
  TableName: 'hirogaru-bluesky-db',
  Key: { key: `${sessionId}` },
});

export const UPDATE_USER_USERINFO = (handle, ivWithEncrypted, accessJwt, refreshJwt, sessionId, expirarion) => ({
  TableName: 'hirogaru-bluesky-db',
  Key: {
    key: sessionId,
  },
  UpdateExpression: `SET userInfo = :newToken`,
  ExpressionAttributeValues: {
    ':newToken': {
      handle: handle,
      ivWithEncrypted: ivWithEncrypted,
      accessJwt: accessJwt,
      refreshJwt: refreshJwt,
      expirarion: expirarion,
    },
  },
});

export const DELETE_USER_USERINFO = (sessionId) => ({
  TableName: 'hirogaru-bluesky-db',
  Key: {
    key: sessionId,
  },
  ConditionExpression: "attribute_exists(#k)",
  ExpressionAttributeNames: {
    '#k': 'key',
  },
  ReturnValues: 'ALL_OLD',
});
