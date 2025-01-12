const AWS = require("aws-sdk");
require("aws-sdk/lib/maintenance_mode_message").suppress = true;

// Configuration
AWS.config.update({
  region: "eu-central-1",
  accessKeyId: "AKIAXTORPSM2M7LTQAVL",
  secretAccessKey: "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",
});

// Create DynamoDB instance
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const fetchItem = (tableName, key) => {
  return dynamoDB
    .get({ TableName: tableName, Key: key })
    .promise()
    .then((result) => result.Item);
};

const fetchItemsByAttributeValue = (
  tableName,
  attributeName,
  attributeValue
) => {
  return dynamoDB
    .scan({
      TableName: tableName,
      FilterExpression: "#attr = :value",
      ExpressionAttributeNames: {
        "#attr": attributeName,
      },
      ExpressionAttributeValues: {
        ":value": attributeValue,
      },
    })
    .promise()
    .then((result) => result.Items);
};

const fetchAllItems = (tableName) => {
  return dynamoDB
    .scan({ TableName: tableName })
    .promise()
    .then((result) => result.Items);
};

const addItem = (tableName, item) => {
  return dynamoDB.put({ TableName: tableName, Item: item }).promise();
};

const removeItem = (tableName, key) => {
  return dynamoDB
    .delete({ TableName: tableName, Key: key, ReturnValues: "ALL_OLD" })
    .promise()
    .then((result) => result.Attributes);
};

const setItemAttribute = (tableName, key, attribute, value) => {
  return dynamoDB
    .update({
      TableName: tableName,
      Key: key,
      UpdateExpression: "set #attribute = :value",
      ExpressionAttributeNames: {
        "#attribute": attribute,
      },
      ExpressionAttributeValues: { ":value": value },
      ReturnValues: "ALL_NEW",
    })
    .promise()
    .then((result) => result.Attributes);
};

const removeItemAttribute = (tableName, key, attribute) => {
  return dynamoDB
    .update({
      TableName: tableName,
      Key: key,
      UpdateExpression: "remove #attribute",
      ExpressionAttributeNames: {
        "#attribute": attribute,
      },
      ReturnValues: "ALL_NEW",
    })
    .promise()
    .then((result) => result.Attributes);
};

module.exports = {
  fetchItem,
  fetchItemsByAttributeValue,
  fetchAllItems,
  addItem,
  removeItem,
  setItemAttribute,
  removeItemAttribute,
};
