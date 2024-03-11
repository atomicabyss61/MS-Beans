import { getData, setData } from './dataStore';
import {
  Message,
  error,
  channelDetails,
  findTokenUser,
  isMember,
  Member,
  getCurrentTime,
  changeMsgType,
  transferStandupMsgs,
  doHash,
} from './other';
import { userProfileV2 } from './users';
import { standupActiveV1 } from './standup';
import fs from 'fs';
import HTTPError from 'http-errors';
import { port, url } from './config.json';

const SERVER_URL = `${url}:${port}`;

/**
 *
 * Given a channelId of a channel that the authorised user
 * can join, adds them to that channel.
 *
 * @param {string} token
 * @param {number} channelId
 * @returns {{}}
 */
function channelJoinV2(token: string, channelId: number): error | Record<string, never> {
  const data = getData();

  // Checking for valid user.
  const owner = findTokenUser(token, data.users);

  // Checking if channel exists.
  const channelObj = data.channels.find(element => element.channelId === channelId);

  if (channelObj === undefined) throw HTTPError(400, 'Invalid channel!');
  if (owner === undefined) throw HTTPError(403, 'Invalid token!');

  // Members format of user.
  const newUser = (userProfileV2(token, owner.authUserId) as {user: Member}).user;

  const invites = {
    uId: owner.authUserId,
    timeStamp: Math.floor((new Date()).getTime() / 1000),
    inviterId: -1,
  };

  if (isMember(owner.authUserId, channelObj.allMembers)) throw HTTPError(403, 'User already in the channel');

  if (channelObj.isPublic === true || owner.permissionId === 1) {
    channelObj.allMembers.push(newUser);
    channelObj.invites.push(invites);
  } else {
    throw HTTPError(403, 'error');
  }

  setData(data);
  return {};
}

/**
 *
 * Given a channel with ID channelId that the authorised user is a member of,
 * returns up to 50 messages between index "start" and "start + 50".
 * If there are no more earlier messages to return, the index end is -1.
 * Otherwise, end is "start + 50".
 *
 * @param {string} token a string that corresponds to a session of a user
 * @param {number} channelId ID of the channel whose messages will be seen
 * @param {number} start the starting index of where messages will be read from
 * @returns {{ messages: array, start: number, end: number}}
 */
function channelMessagesV2(token: string, channelId: number, start: number): error | Message {
  const data = getData();

  // Checking if channelId is valid
  const channel = data.channels.find(channel => channel.channelId === channelId);
  if (channel === undefined) {
    throw HTTPError(400, 'Channel ID does not refer to a valid channel');
  }

  // Checking if token corresponds to a member in channel
  const user = findTokenUser(token, data.users);
  if (user === undefined) {
    throw HTTPError(403, 'Token is invalid');
  }
  if (!isMember(user.authUserId, channel.allMembers)) {
    throw HTTPError(403, 'User is not a member of the channel');
  }

  // Checking if start is valid
  const currentTime = getCurrentTime();

  // If standup is not active and standup messages are pending
  if (!standupActiveV1(token, channelId).isActive) {
    transferStandupMsgs(data, channelId);
  }
  channel.messages.sort((a, b) => b.timeSent - a.timeSent);
  const allMessages = channel.messages.filter((message) => message.timeSent <= currentTime);
  if (start > allMessages.length) {
    throw HTTPError(400, 'start is greater than the total number of messages');
  }

  // Checking if most recent messages will be returned for determining end index
  const lastMessageIndex = allMessages.length - 1;
  let end;
  start + 49 >= lastMessageIndex ? end = -1 : end = start + 50;

  let messages = [];
  // Adding messages to the empty array
  for (let i = start; i < start + 50 && i < allMessages.length; i++) {
    // Checking if user reacted with each react
    if (allMessages[i].reacts[0].uIds.find(u => u.uId === user.authUserId)) {
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
  * Invites a user with token token to join a channel with ID channelId.
  * The user immediately joins the channel.
  *
  * @param {string} token - the token of the person using the function
  * @param {number} channelId - the ID of the channel that the person will join
  * @param {number} uId - the ID of the person who has been invited to the channel
  *
  * @returns {{}} - does not return anything
*/
function channelInviteV2(token: string, channelId: number, uId: number): error | Record<string, never> {
  const data = getData();

  // Getting channel with corresponding channelId
  const channel = data.channels.find(channel => channel.channelId === channelId);
  if (channel === undefined) {
    throw HTTPError(400, 'Channel ID does not refer to a valid channel');
  }

  // Getting user with corresponding uId
  const invitedUser = data.users.find(user => user.authUserId === uId);
  if (invitedUser === undefined) {
    throw HTTPError(400, 'ID of invited user does not refer to a valid user');
  }

  // Getting user with corresponding token
  const authUser = findTokenUser(token, data.users);
  if (authUser === undefined) {
    throw HTTPError(403, 'Token of authorised user does not refer to a valid user');
  }

  if (isMember(uId, channel.allMembers)) {
    throw HTTPError(400, 'uId refers to existing member of channel');
  } else if (!isMember(authUser.authUserId, channel.allMembers)) {
    throw HTTPError(403, 'Authorised user is not member of valid channel');
  }

  const newInvitedUser = (userProfileV2(token, uId) as {user: Member}).user;

  const invites = {
    uId: invitedUser.authUserId,
    timeStamp: Math.floor((new Date()).getTime() / 1000),
    inviterId: authUser.authUserId,
  };
  channel.allMembers.push(newInvitedUser);
  channel.invites.push(invites);

  setData(data);

  return {};
}

/**
  * Given a channel with ID channelId that the authorised user
  * is a member of, removes them as a member of the channel.
  *
  * @param {string} token
  * @param {number} channelId
  * @returns {{}}
*/
function channelLeaveV1(token: string, channelId: number): error | Record<string, never> {
  const data = getData();

  // Check if channel is valid
  const channel = data.channels.find(channel => channel.channelId === channelId);
  if (channel === undefined) {
    throw HTTPError(400, 'channelId does not refer to a valid channel');
  }

  // Check if token is valid
  const user = findTokenUser(token, data.users);
  if (user === undefined) {
    throw HTTPError(403, 'Token is invalid');
  }

  // Check if authorised user is a member of the channel
  const memberObj = channel.allMembers.find(member => member.uId === user.authUserId);
  if (memberObj === undefined) {
    throw HTTPError(403, 'Authorised user is not member of channel');
  }

  // Check if authorised user started current active standup
  if (standupActiveV1(token, channelId).isActive && channel.standup.starter === user.authUserId) {
    throw HTTPError(400, 'Authorised user is starter of active standup');
  }

  // Check if authorised user is an owner of the channel
  const ownerMemberObj = channel.ownerMembers.find(member => member.uId === user.authUserId);
  // Removing user from ownerMembers
  const ownerIndex = channel.ownerMembers.indexOf(ownerMemberObj);
  if (ownerIndex > -1) {
    channel.ownerMembers.splice(ownerIndex, 1);
  }

  // Removing user from allMembers
  const allMembersIndex = channel.allMembers.indexOf(memberObj);
  // if (allMembersIndex > -1) {
  channel.allMembers.splice(allMembersIndex, 1);
  // }

  setData(data);
  return {};
}

/**
 *
 * Given a channel with ID channelId that the authorised user
 * is a member of, provides basic details about the channel.
 *
 * @param {string} token
 * @param {number} channelId
 * @returns {{ name: string }}
 * @returns {{ isPublic: boolean }}
 * @returns {{ ownerMembers: Array<{uId: number, email: string, nameFirst: string, nameFirst: string, handleStr: string, profileImgUrl: string}>}}
 * @returns {{ allMembers: Array<{uId: number, email: string, nameFirst: string, nameFirst: string, handleStr: string, profileImgUrl: string}> }}
*/
function channelDetailsV2(token: string, channelId: number): error | channelDetails {
  const data = getData();

  // Checking if channel exists.
  const owner = findTokenUser(token, data.users);
  if (owner === undefined) throw HTTPError(403, 'Invalid User!');
  const channelObj = data.channels.find(element => element.channelId === channelId);

  if (channelObj === undefined) throw HTTPError(400, 'Invalid channel!');

  if (!isMember(owner.authUserId, channelObj.allMembers)) {
    throw HTTPError(403, 'Caller is not a part of channel!');
  }
  channelObj.ownerMembers.forEach(user => {
    user.profileImgUrl = SERVER_URL + '/profile-photos/' + doHash(user.handleStr) + '.jpg';
    if (!fs.existsSync('profile-photos/' + doHash(user.handleStr) + '.jpg')) {
      user.profileImgUrl = SERVER_URL + '/profile-photos/default.jpg';
    }
  });
  channelObj.allMembers.forEach(user => {
    user.profileImgUrl = SERVER_URL + '/profile-photos/' + doHash(user.handleStr) + '.jpg';
    if (!fs.existsSync('profile-photos/' + doHash(user.handleStr) + '.jpg')) {
      user.profileImgUrl = SERVER_URL + '/profile-photos/default.jpg';
    }
  });
  const channel = {
    name: channelObj.name,
    isPublic: channelObj.isPublic,
    ownerMembers: channelObj.ownerMembers,
    allMembers: channelObj.allMembers,
  };

  return channel;
}

/**
  * Makes a member with user id uId an owner of the channel.
  *
  * @param {string} token
  * @param {number} channelId
  * @param {number} uId
  * @returns {{}}
*/
function channelAddOwnerV1(token: string, channelId: number, uId: number): error | Record<string, never> {
  const data = getData();

  // Getting channel with corresponding channelId
  const channel = data.channels.find(channel => channel.channelId === channelId);
  if (channel === undefined) {
    throw HTTPError(400, 'Channel ID does not refer to a valid channel');
  }

  // Getting user with corresponding uId
  const chosenUser = data.users.find(user => user.authUserId === uId);
  if (chosenUser === undefined) {
    throw HTTPError(400, 'uId does not refer to a valid user');
  }

  // Getting user with corresponding token
  const authUser = findTokenUser(token, data.users);
  if (authUser === undefined) {
    throw HTTPError(403, 'Token of authorised user does not refer to a valid user');
  }

  if (!isMember(uId, channel.allMembers)) {
    throw HTTPError(400, 'uId refers to user who is not member of channel');
  } else if (isMember(uId, channel.ownerMembers)) {
    throw HTTPError(400, 'uId refers to existing owner of channel');
  } else if (!isMember(authUser.authUserId, channel.ownerMembers) && authUser.permissionId === 2) {
    throw HTTPError(403, 'Authorised user does not have owner permissions in channel');
  }

  const memberObj = (userProfileV2(token, uId) as {user: Member}).user;
  channel.ownerMembers.push(memberObj);

  setData(data);
  return {};
}

/**
  * Removes a user with user id uId as an owner of the channel
  *
  * @param {string} token
  * @param {number} channelId
  * @param {number} uId
  * @returns {{}}
*/
function channelRemoveOwnerV1(token: string, channelId: number, uId: number): error | Record<string, never> {
  const data = getData();

  // Getting channel with corresponding channelId
  const channel = data.channels.find(channel => channel.channelId === channelId);
  if (channel === undefined) {
    throw HTTPError(400, 'Channel ID does not refer to a valid channel');
  }

  // Getting user with corresponding uId
  const chosenUser = data.users.find(user => user.authUserId === uId);
  if (chosenUser === undefined) {
    throw HTTPError(400, 'uId does not refer to a valid user');
  }

  // Getting user with corresponding token
  const authUser = findTokenUser(token, data.users);
  if (authUser === undefined) {
    throw HTTPError(403, 'Token of authorised user does not refer to a valid user');
  } else if (!isMember(authUser.authUserId, channel.allMembers)) {
    throw HTTPError(403, 'Authorised user is not a member of the channel');
  } else if (!(isMember(authUser.authUserId, channel.ownerMembers) || authUser.permissionId === 1)) {
    throw HTTPError(403, 'Authorised user does not have owner permissions');
  }

  if (!isMember(uId, channel.ownerMembers)) {
    throw HTTPError(400, 'uId refers to user who is not channel owner');
  } else if (channel.ownerMembers.length === 1) {
    throw HTTPError(400, 'uId refers to only owner of channel');
  }

  // Getting object of chosen owner from ownerMembers array
  const chosenOwnerObj = channel.ownerMembers.find(owner => owner.uId === uId);

  // Removing that object from that array
  const chosenIndex = channel.ownerMembers.indexOf(chosenOwnerObj);
  channel.ownerMembers.splice(chosenIndex, 1);

  setData(data);
  return {};
}

export {
  channelJoinV2,
  channelMessagesV2,
  channelInviteV2,
  channelDetailsV2,
  channelLeaveV1,
  channelAddOwnerV1,
  channelRemoveOwnerV1,
};
