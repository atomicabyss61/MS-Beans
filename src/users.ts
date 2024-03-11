import { getData, setData } from './dataStore';
import { findTokenUser, Member, error, doHash, userStats, workspaceStats, getChannelsAndDms, getCurrentTime } from './other';
import validator from 'validator';
import HTTPError from 'http-errors';
import request from 'sync-request';
import Jimp from 'jimp';
import { port, url } from './config.json';

const SERVER_URL = `${url}:${port}`;

/**
  * Updates the authorised user's first and last name.
  *
  * @param {string} token - user token
  * @param {string} nameFirst - user's new first name
  * @param {string} nameLast - user's new last name
  *
  * @returns {} empty return
*/
function userProfileSetNameV1(token: string, nameFirst: string, nameLast: string): Record<string, never> | error {
  const dataStore = getData();
  const user = findTokenUser(token, dataStore.users);

  // Error checking
  if (user === undefined) {
    throw HTTPError(403, 'Invalid token!');
  }
  // HTTP errors
  if (nameFirst.length < 1) {
    throw HTTPError(400, 'Length of first name is less than 1 character');
  }
  if (nameFirst.length > 50) {
    throw HTTPError(400, 'Length of first name is more than 50 characters');
  }
  if (nameLast.length < 1) {
    throw HTTPError(400, 'Length of last name is less than 1 character');
  }
  if (nameLast.length > 50) {
    throw HTTPError(400, 'Length of last name is more than 50 characters');
  }

  user.nameFirst = nameFirst;
  user.nameLast = nameLast;

  setData(dataStore);

  return {};
}

/**
  * Update the authorised user's email address.
  *
  * @param {string} token - user token
  * @param {string} email - user's new email
  *
  * @returns {} empty return
*/
function userProfileSetEmailV1(token: string, email: string): Record<string, never> | error {
  const dataStore = getData();
  const user = findTokenUser(token, dataStore.users);

  // Error checking
  if (user === undefined) {
    throw HTTPError(403, 'Invalid token!');
  }
  // HTTP errors
  if (!validator.isEmail(email)) {
    throw HTTPError(400, 'Email entered is not a valid email');
  }
  for (const someUser of dataStore.users) {
    if (someUser.email === email) {
      throw HTTPError(400, 'Email is already being used by another user');
    }
  }

  user.email = email;

  setData(dataStore);

  return {};
}

/**
  * Update the authorised user's handle (i.e. display name).
  *
  * @param {string} token - user token
  * @param {string} handle - user's new handle
  *
  * @returns {} empty return
*/
function userProfileSetHandleV1(token: string, handle: string): Record<string, never> | error {
  const dataStore = getData();
  const user = findTokenUser(token, dataStore.users);

  // Error checking
  if (user === undefined) {
    throw HTTPError(403, 'Invalid token!');
  }
  // HTTP errors
  if (handle.length < 3) {
    throw HTTPError(400, 'Length of handle is less than 3 characters');
  }
  if (handle.length > 20) {
    throw HTTPError(400, 'Length of handle is longer than 20 characters');
  }
  if (!validator.isAlphanumeric(handle)) {
    throw HTTPError(400, 'Handle contains non-alphanumeric characters');
  }
  for (const someUser of dataStore.users) {
    if (someUser.handleStr === handle) {
      throw HTTPError(400, 'Handle is already used by another user');
    }
  }

  user.handleStr = handle;

  setData(dataStore);

  return {};
}

/**
 *
 * For a valid user, returns information about their user ID, email, first name, last name, and handle
 *
 * @param { }
 * @param {number} uId
 * @returns {{ user: { uId: number, email: string, nameFirst: string, nameLast: string, handleStr: string } }}
 */
function userProfileV2(token: string, uId: number): { user: Member } | error {
  const userList = getData().users;
  const viewer = findTokenUser(token, userList);

  if (viewer === undefined) {
    throw HTTPError(403, 'Invalid token!');
  }
  const user = userList.find(element => element.authUserId === uId);
  if (user === undefined) {
    throw HTTPError(400, 'uId does not refer to a valid user');
  }

  const fs = require('fs');
  let profileImgUrl = SERVER_URL + '/profile-photos/' + doHash(user.handleStr) + '.jpg';
  if (!fs.existsSync(profileImgUrl)) {
    profileImgUrl = SERVER_URL + '/profile-photos/default.jpg';
  }

  return {
    user: {
      uId: user.authUserId,
      email: user.email,
      nameFirst: user.nameFirst,
      nameLast: user.nameLast,
      handleStr: user.handleStr,
      profileImgUrl: profileImgUrl,
    }
  };
}

/**
 *
 * Returns a list of all users and their associated details.
 *
 * @param {string} token
 * @returns { users: Member[] }
 */
function usersAllV1(token: string): error | { users: Member[] } {
  const data = getData();
  const owner = findTokenUser(token, data.users);
  if (owner === undefined) throw HTTPError(403, 'error caller doesnt exist');

  const usersAll = [];
  for (const user of data.users) {
    if (!user.isDeleted) {
      usersAll.push((userProfileV2(token, user.authUserId) as {user: Member}).user);
    }
  }
  return { users: usersAll };
}

/**
 *
 * Given a URL of an image on the internet, crops the image within bounds (xStart, yStart) and (xEnd, yEnd). Position (0,0) is the top left.
 *
 * @param {string} token - user token
 * @param {string} imgUrl - image url
 * @param {string} xStart - starting x bound for crop
 * @param {string} yStart - starting y bound for crop
 * @param {string} xEnd - ending x bound for crop
 * @param {string} yEnd - ending y bound for crop
 * @returns {} empty return
 */
async function userProfileUploadphotoV1(token: string, imgUrl: string, xStart: number, yStart: number, xEnd: number, yEnd: number) {
  const data = getData();
  const user = findTokenUser(token, data.users);

  const image = await Jimp.read(imgUrl);
  image.crop(xStart, yStart, xEnd - xStart, yEnd - yStart).write('profile-photos/' + doHash(user.handleStr) + '.jpg');

  return {};
}

/**
 *
 * Synchronous error checking for userProfileUploadphotoV1.
 *
 * @param {string} token - user token
 * @param {string} imgUrl - image url
 * @param {string} xStart - starting x bound for crop
 * @param {string} yStart - starting y bound for crop
 * @param {string} xEnd - ending x bound for crop
 * @param {string} yEnd - ending y bound for crop
 * @returns {{ error: false }} false error flag when no error is encountered
 */
function userProfileUploadphotoV1ErrorChecking(token: string, imgUrl: string, xStart: number, yStart: number, xEnd: number, yEnd: number): { error: false } {
  const data = getData();
  const user = findTokenUser(token, data.users);

  if (user === undefined) throw HTTPError(403, 'Caller does not exist.');

  if (xEnd <= xStart || yEnd <= yStart || xStart < 0 || yStart < 0) throw HTTPError(400, 'Invalid dimensions for crop.');

  const res = request('GET', imgUrl);
  if (res.statusCode !== 200) {
    throw HTTPError(400, 'Invalid image url.');
  }
  if (res.headers['content-type'] !== 'image/jpeg') {
    throw HTTPError(400, 'Invalid file format (not jpeg).');
  }

  const sizeOf = require('buffer-image-size');
  const dimensions = sizeOf(res.body);
  if (dimensions.width < xEnd - xStart || dimensions.height < yEnd - yStart) {
    throw HTTPError(400, 'Crop is not possible with those dimensions.');
  }

  return { error: false };
}

/**
 *
 * Fetches the required statistics about this user's use of UNSW Beans.
 *
 * @param {string} token
 * @returns { userStats }
 */
function userStatsV1(token: string): error | { userStats: userStats } {
  const data = getData();
  const owner = findTokenUser(token, data.users);
  if (owner === undefined) throw HTTPError(403, 'error caller doesnt exist');

  const ChannelsJoined = [];
  const channelsList = data.channels.filter(element => {
    return element.allMembers.find(user => user.uId === owner.authUserId) !== undefined ? 1 : 0;
  });
  ChannelsJoined.push({
    numChannelsJoined: 0,
    timeStamp: data.firstUserTime,
  });
  let countChannelJoined = 1;
  for (const channel of channelsList) {
    const time = channel.invites.find(user => user.uId === owner.authUserId);
    ChannelsJoined.push({
      numChannelsJoined: countChannelJoined,
      timeStamp: time.timeStamp,
    });
    countChannelJoined++;
  }

  const DmsJoined = [];
  const DmsList = data.dms.filter(element => {
    return element.allMembers.find(user => user.uId === owner.authUserId) !== undefined ? 1 : 0;
  });
  DmsJoined.push({
    numDmsJoined: 0,
    timeStamp: data.firstUserTime,
  });
  let countDmsJoined = 1;
  for (const Dm of DmsList) {
    const time = Dm.invites.find(user => user.uId === owner.authUserId);
    DmsJoined.push({
      numDmsJoined: countDmsJoined,
      timeStamp: time.timeStamp,
    });
    countDmsJoined++;
  }

  let messagesSent = [];
  messagesSent.push({
    numMessagesSent: 0,
    timeStamp: data.firstUserTime,
  });
  let numMessagesSent = 1;
  for (const msg of owner.msgSentTime) {
    if (msg > getCurrentTime()) continue;
    messagesSent.push({
      numMessagesSent: numMessagesSent++,
      timeStamp: msg,
    });
  }

  messagesSent = messagesSent.sort((a, b) => a.timeStamp - b.timeStamp);

  let numMessages = 0;

  for (const channel of data.channels) {
    numMessages = numMessages + channel.messages.filter(msg => msg.timeSent <= getCurrentTime()).length;
  }

  for (const dms of data.dms) {
    numMessages = numMessages + dms.messages.filter(msg => msg.timeSent <= getCurrentTime()).length;
  }
  let involvement;
  if (data.channels.length + data.dms.length + numMessages === 0) {
    involvement = 0;
  } else {
    involvement = (countChannelJoined - 1 + countDmsJoined - 1 + numMessagesSent - 1) / (data.channels.length + data.dms.length + numMessages);
  }

  return {
    userStats: {
      channelsJoined: ChannelsJoined,
      dmsJoined: DmsJoined,
      messagesSent: messagesSent,
      involvementRate: involvement,
    }
  };
}

/**
 *
 * Fetches the required statistics about the workspace's use of UNSW Beans.
 *
 * @param {string} token
 * @returns { workspaceStats[] }
 */
function usersStatsV1(token: string): error | { workspaceStats: workspaceStats } {
  const data = getData();
  const owner = findTokenUser(token, data.users);
  if (owner === undefined) throw HTTPError(403, 'error caller doesnt exist');

  const channelsExist = [];
  channelsExist.push(
    {
      numChannelsExist: 0,
      timeStamp: data.firstUserTime,
    }
  );
  let numChannelsExist = 1;
  for (const channel of data.channels) {
    const time = channel.invites.reduce((a, b) => a.timeStamp < b.timeStamp ? a : b).timeStamp;
    channelsExist.push(
      {
        numChannelsExist: numChannelsExist,
        timeStamp: time,
      }
    );
    numChannelsExist++;
  }

  const DmsExist = [];
  DmsExist.push(
    {
      numDmsExist: 0,
      timeStamp: data.firstUserTime,
    }
  );
  let numDmsExist = 1;
  for (const Dm of data.dms) {
    const time = Dm.invites.reduce((a, b) => a.timeStamp < b.timeStamp ? a : b).timeStamp;
    DmsExist.push(
      {
        numDmsExist: numDmsExist,
        timeStamp: time,
      }
    );
    numDmsExist++;
  }

  let messagesExist = [];
  messagesExist.push({
    numMessagesExist: 0,
    timeStamp: data.firstUserTime,
  });
  let numMessagesExist = 1;
  for (const channel of data.channels) {
    for (const message of channel.messages) {
      if (message.timeSent <= getCurrentTime()) {
        messagesExist.push({
          numMessagesExist: numMessagesExist,
          timeStamp: message.timeSent,
        });
      }
      numMessagesExist++;
    }
  }

  for (const Dm of data.dms) {
    for (const message of Dm.messages) {
      if (message.timeSent <= getCurrentTime()) {
        messagesExist.push({
          numMessagesExist: numMessagesExist,
          timeStamp: message.timeSent,
        });
      }
      numMessagesExist++;
    }
  }
  messagesExist = messagesExist.sort((a, b) => a.timeStamp - b.timeStamp);
  numMessagesExist = 0;
  for (const message of messagesExist) {
    message.numMessagesExist = numMessagesExist;
    numMessagesExist++;
  }

  let oneChannelJoiners = 0;

  for (const user of data.users) {
    if (getChannelsAndDms(user.authUserId).length > 0) {
      oneChannelJoiners++;
    }
  }

  const utilizationRate = oneChannelJoiners / data.users.filter(user => !user.isDeleted).length;
  return {
    workspaceStats: {
      channelsExist: channelsExist,
      dmsExist: DmsExist,
      messagesExist: messagesExist,
      utilizationRate: utilizationRate,
    }
  };
}

export {
  userProfileSetNameV1,
  userProfileSetEmailV1,
  userProfileSetHandleV1,
  userProfileV2,
  usersAllV1,
  userProfileUploadphotoV1,
  userProfileUploadphotoV1ErrorChecking,
  userStatsV1,
  usersStatsV1
};
