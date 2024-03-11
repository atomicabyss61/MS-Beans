import { getData, setData } from './dataStore';
import HTTPError from 'http-errors';
import { error, MessageType, dataStore, User, findTokenUser, getCurrentTime, MessageStore, reactUid, Reaction, checkMsgTag } from './other';

/**
 *
 * Send a message from the authorised user to the channel specified by channelId
 *
 * @param token
 * @param channelId
 * @param message
 * @returns { messageId }
 */
function messageSendV1(token: string, channelId: number, message: string): { messageId: number } {
  const data = getData();
  const user = findTokenUser(token, data.users);
  if (user === undefined) throw HTTPError(403, 'Invalid Token');

  if (message.length < 1 || message.length > 1000) throw HTTPError(400, 'Bad Message');

  const channel = data.channels.find(channel => channel.channelId === channelId);
  if (channel === undefined) throw HTTPError(400, 'Invalid Channel');
  if (channel.allMembers.find(element => element.uId === user.authUserId) === undefined) {
    throw HTTPError(403, 'User is not a member of the channel.');
  }
  const messageId = data.idCounter;
  const uIds: reactUid[] = [];
  const reacts: Reaction[] = [{ reactId: 1, uIds: uIds, isThisUserReacted: false }];
  data.idCounter++;

  channel.messages.unshift({
    messageId: messageId,
    uId: user.authUserId,
    message: message,
    timeSent: getCurrentTime(),
    shareMsgStart: message.length,
    reacts: reacts,
    isPinned: false,
  });
  user.msgSentTime.push(getCurrentTime());

  setData(data);
  return { messageId: messageId };
}

/**
 *
 * Given a message, update its text with new text. If the new message is an empty string, the message is deleted.
 *
 * @param token
 * @param messageId
 * @param message
 * @returns {}
 */
function messageEditV1(token: string, messageId: number, message: string): error | Record<string, never> {
  const data = getData();
  const user = findTokenUser(token, data.users);
  if (user === undefined) throw HTTPError(403, 'Invalid Token');

  if (message.length > 1000) throw HTTPError(400, 'Bad Message');
  if (message === '') return messageRemoveV1(token, messageId);

  const channel = data.channels.find(channel => channel.messages.some(message => message.messageId === messageId));
  const dm = data.dms.find(dm => dm.messages.some(message => message.messageId === messageId));
  let messageObj: MessageStore; let channelId = -1; let dmId = -1; let name;

  if (channel !== undefined) {
    messageObj = channel.messages.find(message => message.messageId === messageId);
    channelId = channel.channelId;
    name = channel.name;
  } else if (dm !== undefined) {
    messageObj = dm.messages.find(message => message.messageId === messageId);
    dmId = dm.dmId;
    name = dm.name;
  } else {
    throw HTTPError(400, 'Invalid message');
  }

  // if (messageObj.uId !== user.authUserId && !(user.permissionId === 1)) {
  //   throw HTTPError(403, 'User is not a member of the channel.');
  // }
  if (messageObj.uId !== user.authUserId) {
    throw HTTPError(403, 'User is not a member of the dm.');
  }
  if (messageObj.timeSent > Math.floor((new Date()).getTime() / 1000)) {
    throw HTTPError(400, 'Invalid message');
  }
  messageObj.message = message;
  messageObj.shareMsgStart = message.length;
  checkMsgTag(data, messageObj, channelId, dmId, name);
  setData(data);
  return {};
}

/**
 *
 * Given a messageId for a message, this message is removed from the channel/DM
 *
 * @param token
 * @param messageId
 * @returns {}
 */
function messageRemoveV1(token: string, messageId: number): Record<string, never> {
  const data = getData();
  const user = findTokenUser(token, data.users);
  if (user === undefined) throw HTTPError(403, 'Invalid Token');

  const channel = data.channels.find(channel => channel.messages.some(message => message.messageId === messageId));
  const dm = data.dms.find(dm => dm.messages.some(message => message.messageId === messageId));
  let messageObj: MessageStore;
  if (channel !== undefined) {
    messageObj = channel.messages.find(message => message.messageId === messageId);
  } else if (dm !== undefined) {
    messageObj = dm.messages.find(message => message.messageId === messageId);
  } else {
    throw HTTPError(400, 'Invalid Message');
  }

  if (messageObj.uId !== user.authUserId && !(user.permissionId === 1)) {
    throw HTTPError(403, 'User is not a member of the channel.');
  }
  // if (messageObj.uId !== user.authUserId) {
  //   throw HTTPError(403, 'User is not a member of the dm.');
  // }
  if (messageObj.timeSent > Math.floor((new Date()).getTime() / 1000)) {
    throw HTTPError(400, 'Invalid message');
  }

  if (channel !== undefined) {
    channel.messages = channel.messages.filter(element => element !== messageObj);
  } else {
    dm.messages = dm.messages.filter(element => element !== messageObj);
  }

  setData(data);
  return {};
}

/**
 *
 * Sends a message from the authorised user to the channel specified by channelId automatically at
 * a specified time in the future. The returned messageId will only be considered valid for other
 * actions (editing/deleting/reacting/etc) once it has been sent (i.e. after timeSent).
 *
 * @param {string} token
 * @param {number} channelId
 * @param {string} message
 * @param {number} timeSent
 * @returns {{messageId: number}}
 */
function messageSendLaterV1(token: string, channelId: number, message: string, timeSent: number): { messageId: number } {
  const data = getData();
  const user = findTokenUser(token, data.users);
  if (user === undefined) throw HTTPError(403, 'Invalid Token');
  const channel = data.channels.find(channel => channel.channelId === channelId);
  if (channel === undefined) throw HTTPError(400, 'Invalid Channel');

  if (channel.allMembers.find(element => element.uId === user.authUserId) === undefined) {
    throw HTTPError(403, 'Forbidden.');
  }
  if (message.length < 1 || message.length > 1000) throw HTTPError(400, 'Bad Message');
  if (timeSent < getCurrentTime()) throw HTTPError(400, 'Invalid Time');

  const messageId = data.idCounter;
  data.idCounter++;
  channel.messages.unshift({
    messageId: messageId,
    uId: user.authUserId,
    message: message,
    timeSent: timeSent,
    shareMsgStart: message.length,
    reacts: [{ reactId: 1, uIds: [], isThisUserReacted: false }],
    isPinned: false,
  });
  user.msgSentTime.push(timeSent);
  setData(data);
  return { messageId: messageId };
}

/**
 *
 * A new message containing the contents of both the original message and the optional message
 * should be sent to the channel/DM identified by the channelId/dmId.
 *
 * @param {string} token
 * @param {number} ogMessageId
 * @param {string} message
 * @param {number} channelId
 * @param {number} dmId
 * @returns {{messageId: number}}
 */
function messageShareV1(token: string, ogMessageId: number, message: string, channelId: number, dmId: number): any {
  const data = getData();

  const owner = findTokenUser(token, data.users);
  if (owner === undefined) throw HTTPError(403, 'token does not belong to a user.');

  if (message.length < 1 || message.length > 1000) throw HTTPError(400, 'message in incorrect format.');
  if (channelId !== -1 && dmId !== -1) throw HTTPError(400, 'only 1 channel/dm required.');

  let searchArray: any = data.channels.filter(element => {
    return element.allMembers.find(user => user.uId === owner.authUserId) !== undefined ? 1 : 0;
  });
  searchArray = searchArray.concat(data.dms.filter(element => {
    return element.allMembers.find(user => user.uId === owner.authUserId) !== undefined ? 1 : 0;
  }));

  let targetMessage: MessageStore;
  for (const obj of searchArray) {
    const temp = obj.messages.find((msg: MessageType) => msg.messageId === ogMessageId);
    if (temp !== undefined) targetMessage = temp;
  }

  if (targetMessage === undefined) throw HTTPError(400, 'ogMessageId does not refer to a valid message.');

  const targetObj = searchArray.find((object: any) => object.channelId === channelId || object.dmId === dmId);
  if (targetObj === undefined) {
    throw HTTPError(403, 'authorised user is not apart of channel/dm.');
  }

  if (targetMessage.timeSent > Math.floor((new Date()).getTime() / 1000)) {
    throw HTTPError(400, 'Invalid message');
  }
  const uIds: reactUid[] = [];

  const copyMessage = {
    messageId: data.idCounter,
    uId: owner.authUserId,
    message: message + targetMessage.message,
    timeSent: getCurrentTime(),
    shareMsgStart: message.length,
    reacts: [{ reactId: 1, uIds: uIds, isThisUserReacted: false }],
    isPinned: false,
  };
  data.idCounter++;
  targetObj.messages.push(copyMessage);
  owner.msgSentTime.push(getCurrentTime());

  setData(data);

  return { sharedMessageId: copyMessage.messageId };
}

/**
 *
 * Given a message within a channel or DM the authorised user is part of, adds a
 * "react" to that particular message.
 *
 * @param {string} token
 * @param {number} messageId
 * @param {number} reactId
 * @returns {{}}
 */
function messageReactV1(token: string, messageId: number, reactId: number): Record<string, never> {
  const data = getData();
  const reactingUser = findTokenUser(token, data.users);

  if (reactingUser === undefined) throw HTTPError(403, 'token does not belong to a user.');

  const targetMessage = getTargetMessage(data, reactingUser, messageId).message;

  // error checking
  if (targetMessage === undefined) {
    throw HTTPError(400, 'messageId is not a valid message within a channel or DM that the authorised user is part of.');
  }
  if (targetMessage.timeSent > Math.floor((new Date()).getTime() / 1000)) {
    throw HTTPError(400, 'Invalid message');
  }

  const targetReact: Reaction = targetMessage.reacts.find(element => element.reactId === reactId);
  if (targetReact === undefined) {
    throw HTTPError(400, 'reactId is not a valid react ID - currently, the only valid react ID the frontend has is 1.');
  }

  if (targetReact.uIds.find(user => user.uId === reactingUser.authUserId) !== undefined) {
    throw HTTPError(400, 'The message already contains a react with ID reactId from the authorised user.');
  }

  targetReact.uIds.push({
    uId: reactingUser.authUserId,
    timeStamp: Math.floor((new Date()).getTime() / 1000),
  });

  setData(data);

  return {};
}

/**
 *
 * Given a message within a channel or DM the authorised user is part of, removes a
 * "react" to that particular message.
 *
 * @param {string} token
 * @param {number} messageId
 * @param {number} reactId
 * @returns {{}}
 */
function messageUnreactV1(token: string, messageId: number, reactId: number): Record<string, never> {
  const data = getData();
  const reactingUser = findTokenUser(token, data.users);

  if (reactingUser === undefined) throw HTTPError(403, 'token does not belong to a user.');

  const targetMessage = getTargetMessage(data, reactingUser, messageId).message;

  // error checking
  if (targetMessage === undefined) {
    throw HTTPError(400, 'messageId is not a valid message within a channel or DM that the authorised user is part of.');
  }
  const targetReact = targetMessage.reacts.find(element => element.reactId === reactId);
  if (targetReact === undefined) {
    throw HTTPError(400, 'reactId is not a valid react ID.');
  }
  if (targetReact.uIds.find(u => u.uId === reactingUser.authUserId) === undefined) {
    throw HTTPError(400, 'The message does not contain a react with ID reactId from the authorised user.');
  }

  targetReact.uIds = targetReact.uIds.filter(id => id.uId !== reactingUser.authUserId);

  setData(data);
  console.log('unreact called!');
  return {};
}

/**
 *
 * Given a message within a channel or DM, marks it as "pinned".
 *
 * @param {string} token
 * @param {number} messageId
 * @returns {{}}
 */
function messagePinV1(token: string, messageId: number): Record<string, never> {
  const data = getData();
  const pinningUser = findTokenUser(token, data.users);
  const targetMessage = getTargetMessage(data, pinningUser, messageId);

  // error checking
  if (targetMessage.message === undefined) {
    throw HTTPError(400, 'messageId is not a valid message within a channel or DM that the authorised user is part of.');
  }

  if (targetMessage.message.timeSent > Math.floor((new Date()).getTime() / 1000)) {
    throw HTTPError(400, 'Invalid message');
  }

  if (targetMessage.message.isPinned) {
    throw HTTPError(400, 'The message is already pinned.');
  }
  if (!targetMessage.isOwner) {
    throw HTTPError(403, 'messageId refers to a valid message in a joined channel/DM and the authorised user does not have owner permissions in the channel/DM.');
  }

  targetMessage.message.isPinned = true;
  setData(data);

  return {};
}

/**
 *
 * Given a message within a channel or DM, removes its mark as "pinned".
 *
 * @param {string} token
 * @param {number} messageId
 * @returns {{}}
 */
function messageUnpinV1(token: string, messageId: number): Record<string, never> {
  const data = getData();
  const pinningUser = findTokenUser(token, data.users);
  const targetMessage = getTargetMessage(data, pinningUser, messageId);

  // error checking
  if (targetMessage.message === undefined) {
    throw HTTPError(400, 'messageId is not a valid message within a channel or DM that the authorised user is part of.');
  }
  if (!targetMessage.message.isPinned) {
    throw HTTPError(400, 'The message is not already pinned.');
  }
  if (!targetMessage.isOwner) {
    throw HTTPError(403, 'messageId refers to a valid message in a joined channel/DM and the authorised user does not have owner permissions in the channel/DM.');
  }

  targetMessage.message.isPinned = false;
  setData(data);

  return {};
}

function getTargetMessage(data: dataStore, user: User, messageId: number): { message: MessageStore, isOwner: boolean} {
  for (const channel of data.channels) {
    const targetMessage = channel.messages.find(message => message.messageId === messageId);
    if (targetMessage !== undefined && channel.allMembers.find(member => member.uId === user.authUserId) !== undefined) {
      return channel.ownerMembers.find(member => member.uId === user.authUserId) !== undefined ? { message: targetMessage, isOwner: true } : { message: targetMessage, isOwner: false };
    }
  }

  for (const dm of data.dms) {
    const targetMessage = dm.messages.find(message => message.messageId === messageId);
    if (targetMessage !== undefined && dm.allMembers.find(member => member.uId === user.authUserId) !== undefined) {
      return dm.ownerId === user.authUserId ? { message: targetMessage, isOwner: true } : { message: targetMessage, isOwner: false };
    }
  }

  return { message: undefined, isOwner: undefined };
}

export {
  messageSendV1,
  messageEditV1,
  messageRemoveV1,
  messageShareV1,
  messageReactV1,
  messageUnreactV1,
  messageSendLaterV1,
  messagePinV1,
  messageUnpinV1
};
