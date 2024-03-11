import { getData, setData } from './dataStore';
import { isValidId, findTokenUser, isMember, Member, invitesType, dms, dmDetails, Message, error, getCurrentTime, changeMsgType, doHash } from './other';
import { userProfileV2 } from './users';
import HTTPError from 'http-errors';
import fs from 'fs';
import { port, url } from './config.json';

const SERVER_URL = `${url}:${port}`;

/**
 *
 * creates a new dm making the caller the dm's owner.
 *
 * @param token
 * @param uIds
 * @returns dmId
 */
function dmCreateV1(token: string, uIds: number[]): error | { dmId: number } {
  const data = getData();
  const nameArray = [];
  const members = [];

  // Finding owner object and verifying token.
  const owner = findTokenUser(token, data.users);
  if (owner === undefined) throw HTTPError(403, 'token does not belong to a user.');
  nameArray.push(owner.handleStr);
  members.push((userProfileV2(token, owner.authUserId) as {user: Member}).user);

  // Checking if each uId is valid and no duplicate Id's.
  for (const Id of uIds) {
    if (!isValidId(Id, data.users)) throw HTTPError(400, 'uId is invalid');
    for (let i = uIds.indexOf(Id) + 1; i < uIds.length; i++) {
      if (uIds[i] === Id || Id === owner.authUserId) throw HTTPError(400, 'Duplicate uId given');
    }
    const user = data.users.find(u => u.authUserId === Id);
    nameArray.push(user.handleStr);
    members.push((userProfileV2(token, user.authUserId) as {user: Member}).user);
  }

  const invites: invitesType[] = [];
  for (const person of members) {
    if (person.uId === owner.authUserId) {
      invites.push({
        uId: person.uId,
        timeStamp: Math.floor((new Date()).getTime() / 1000),
        inviterId: -1,
      });
    } else {
      invites.push({
        uId: person.uId,
        timeStamp: Math.floor((new Date()).getTime() / 1000),
        inviterId: owner.authUserId,
      });
    }
  }

  // creating name of dm.
  const name = nameArray.sort((a, b) => (a < b) ? -1 : 1).join(', ');
  const Id = data.idCounter;
  data.idCounter++;
  data.dms.push({
    dmId: Id,
    name: name,
    allMembers: members,
    messages: [],
    ownerId: owner.authUserId,
    invites: invites,
  });

  setData(data);
  return { dmId: Id };
}

/**
 *
 * Returns the list of DMs that the user is a member of.
 *
 * @param token
 * @returns dms[]
 */
function dmListV1(token: string): error | { dms: dms[] } {
  const data = getData();
  const owner = findTokenUser(token, data.users);
  // Checking for invalid owner
  if (owner === undefined) throw HTTPError(403, 'token does not belong to a user.');
  const Id = owner.authUserId;
  const list: dms[] = [];

  // Checking for each dm that the caller is a member.
  for (const dm of data.dms) {
    if (isMember(Id, dm.allMembers)) list.push({ dmId: dm.dmId, name: dm.name });
  }
  setData(data);
  return { dms: list };
}

/**
 *
 * dm/remove/v1 removes all members from a dm if caller is the owner.
 *
 * @param token
 * @param dmId
 * @returns
 */
function dmRemoveV1(token: string, dmId: number): error | any {
  const data = getData();
  const owner = findTokenUser(token, data.users);
  const dm = data.dms.find(element => element.dmId === dmId);

  if (owner === undefined) throw HTTPError(403, 'token does not belong to a user.');
  if (dm === undefined) throw HTTPError(400, 'dmId does not refer to a valid dm.');
  if (owner.authUserId !== dm.ownerId) throw HTTPError(403, 'authorised user is not the owner.');

  data.dms = data.dms.filter(dmObj => dmObj.dmId !== dm.dmId);
  setData(data);
  return {};
}

/**
 *
 * returns the details of the dm
 *
 * @param token
 * @param dmId
 * @returns
 */
function dmDetailsV1(token: string, dmId: number): error | dmDetails {
  const data = getData();
  const owner = findTokenUser(token, data.users);
  const dm = data.dms.find(element => element.dmId === dmId);

  if (owner === undefined) throw HTTPError(403, 'token does not belong to a user.');
  if (dm === undefined) throw HTTPError(400, 'dmId does not refer to valid dm.');

  if (!isMember(owner.authUserId, dm.allMembers) && owner.authUserId !== dm.ownerId) {
    throw HTTPError(403, 'Authorised user is not apart of dm.');
  }
  dm.allMembers.forEach(user => {
    user.profileImgUrl = SERVER_URL + '/profile-photos/' + doHash(user.handleStr) + '.jpg';
    if (!fs.existsSync('profile-photos/' + doHash(user.handleStr) + '.jpg')) {
      user.profileImgUrl = SERVER_URL + '/profile-photos/default.jpg';
    }
  });
  setData(data);
  return {
    name: dm.name,
    members: dm.allMembers,
  };
}

/**
 *
 * given a token removes the user from the dm.
 *
 * @param token
 * @param dmId
 * @returns
 */
function dmLeaveV1(token: string, dmId: number): error | any {
  const data = getData();
  const owner = findTokenUser(token, data.users);
  let dm;

  // Checking for invalid token and invalid dmId.
  for (const dmItem of data.dms) if (dmItem.dmId === dmId) dm = dmItem;
  if (owner === undefined) throw HTTPError(403, 'token does not belong to a user.');
  if (dm === undefined) throw HTTPError(400, 'dmId does not refer to a valid dm.');
  if (!isMember(owner.authUserId, dm.allMembers) && owner.authUserId !== dm.ownerId) {
    throw HTTPError(403, 'authorised user is not a part of dm.');
  }

  // Removing individual caller
  if (owner.authUserId === dm.ownerId) dm.ownerId = -1;
  dm.allMembers = dm.allMembers.filter(user => user.uId !== owner.authUserId);
  setData(data);
  return {};
}

/**
 *
 * Given a DM with ID dmId that the authorised user is a member of,
 * return up to 50 messages between index "start" and "start + 50".
 *
 * @param token
 * @param dmId
 * @param start
 * @returns Message
 */
function dmMessagesV1(token: string, dmId: number, start: number): error | Message {
  const data = getData();
  const owner = findTokenUser(token, data.users);

  // Checking for invalid token and invalid dmId.
  const dm = data.dms.find(dm => dm.dmId === dmId);
  if (owner === undefined) throw HTTPError(403, 'token does not belong to a user.');
  if (dm === undefined) throw HTTPError(400, 'dmId does not refer to a valid dm.');
  if (!isMember(owner.authUserId, dm.allMembers)) {
    throw HTTPError(403, 'authorised user is not apart of dm.');
  }

  if (start > dm.messages.length) {
    throw HTTPError(400, 'Start is greater than total dm messages.');
  }
  dm.messages.sort((a, b) => b.timeSent - a.timeSent);
  // Checking if most recent messages will be returned for determining end index
  const currentTime = getCurrentTime();
  const allMessages = dm.messages.filter((message) => message.timeSent <= currentTime);
  // const allMessages = dm.messages;
  const lastMessageIndex = allMessages.length - 1;
  let end;
  start + 49 >= lastMessageIndex ? end = -1 : end = start + 50;

  let messages = [];
  // Adding messages to the empty array
  for (let i = start; i < start + 50 && i < allMessages.length; i++) {
    // Checking if user reacted with each react
    if (allMessages[i].reacts[0].uIds.find(u => u.uId === owner.authUserId)) {
      allMessages[i].reacts[0].isThisUserReacted = true;
    } else {
      allMessages[i].reacts[0].isThisUserReacted = false;
    }
    messages.push(allMessages[i]);
  }
  messages = messages.filter(msg => msg.timeSent <= Math.floor((new Date()).getTime() / 1000));
  messages = changeMsgType(messages);

  return {
    messages: messages,
    start: start,
    end: end,
  };
}

/**
 *
 * sends the message to a dm with the given dmId.
 *
 * @param token
 * @param dmId
 * @param message
 * @returns messageId
 */
function messageSendDmV1(token: string, dmId: number, message: string): error | { messageId: number } {
  const data = getData();
  const owner = findTokenUser(token, data.users);
  let dm;

  // Checking for invalid token and invalid dmId.
  for (const dmItem of data.dms) if (dmItem.dmId === dmId) dm = dmItem;
  if (owner === undefined) throw HTTPError(403, 'token does not belong to a user.');
  if (dm === undefined) throw HTTPError(400, 'dmId does not refer to a valid dm.');
  if (!isMember(owner.authUserId, dm.allMembers)) {
    throw HTTPError(403, 'authorised user is not apart of dm.');
  }

  if (message.length < 1 || message.length > 1000) throw HTTPError(400, 'message in incorrect format.');
  const Id = data.idCounter + 1;
  data.idCounter++;

  dm.messages.push({
    messageId: Id,
    uId: owner.authUserId,
    message: message,
    timeSent: getCurrentTime(),
    shareMsgStart: message.length,
    reacts: [{ reactId: 1, uIds: [], isThisUserReacted: false }],
    isPinned: false,
  });
  owner.msgSentTime.push(getCurrentTime());
  setData(data);

  return { messageId: Id };
}

/**
 *
 * Sends a message from the authorised user to the dm specified by dmId automatically at
 * a specified time in the future. The returned messageId will only be considered valid for other
 * actions (editing/deleting/reacting/etc) once it has been sent (i.e. after timeSent).
 *
 * @param {string} token
 * @param {number} dmId
 * @param {string} message
 * @param {number} timeSent
 * @returns {{messageId: number}}
 */
function messageSendDmLaterV1(token: string, dmId: number, message: string, timeSent: number): error | { messageId: number } {
  const data = getData();
  const owner = findTokenUser(token, data.users);
  let dm;

  // Checking for invalid token and invalid dmId.
  for (const dmItem of data.dms) if (dmItem.dmId === dmId) dm = dmItem;
  if (owner === undefined) throw HTTPError(403, 'token does not belong to a user.');
  if (dm === undefined) throw HTTPError(400, 'dmId does not refer to a vlid dm.');
  if (!isMember(owner.authUserId, dm.allMembers)) {
    throw HTTPError(403, 'authorised user is not apart of dm.');
  }
  if (timeSent < getCurrentTime()) throw HTTPError(400, 'Invalid Time');

  if (message.length < 1 || message.length > 1000) throw HTTPError(400, 'message in incorrect format.');
  const Id = data.idCounter + 1;
  data.idCounter++;

  dm.messages.push({
    messageId: Id,
    uId: owner.authUserId,
    message: message,
    timeSent: timeSent,
    shareMsgStart: message.length,
    reacts: [{ reactId: 1, uIds: [], isThisUserReacted: false }],
    isPinned: false,
  });
  owner.msgSentTime.push(timeSent);
  setData(data);

  return { messageId: Id };
}

export { dmCreateV1, dmListV1, dmRemoveV1, dmDetailsV1, dmLeaveV1, dmMessagesV1, messageSendDmV1, messageSendDmLaterV1 };
