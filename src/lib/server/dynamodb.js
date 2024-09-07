import AWS from "aws-sdk";

AWS.config.update({
  region: "us-east-1",
});
export const docClient = new AWS.DynamoDB.DocumentClient();

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

export const GET_ACCESSJWT = {
  TableName: 'hirogaru-bluesky-db',
  Key: { key: 'accessJwt' },
}

export const GET_REFRESHJWT = {
  TableName: 'hirogaru-bluesky-db',
  Key: { key: 'refreshJwt' },

}

export const UPDATE_ACCESSJWT = (accessJwt) => ({
  TableName: 'hirogaru-bluesky-db',
  Key: {
    key: 'accessJwt',
  },
  UpdateExpression: 'SET tokens = :newToken',
  ExpressionAttributeValues: {
    ':newToken': accessJwt,
  },
});

export const UPDATE_REFRESHJWT = (refreshJwt) => ({
  TableName: 'hirogaru-bluesky-db',
  Key: {
    key: 'refreshJwt',
  },
  UpdateExpression: 'SET tokens = :newToken',
  ExpressionAttributeValues: {
    ':newToken': refreshJwt,
  },
});
