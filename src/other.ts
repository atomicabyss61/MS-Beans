import { getData, setData } from './dataStore';
import crypto from 'crypto';
import HTTPError from 'http-errors';

const SECRET = 'H15AAERO';

interface notifications {
  channelId: number,
  dmId: number,
  notificationMessage: string,
}

interface notificationsStore {
  channelId: number,
  dmId: number,
  notificationMessage: string,
  timeStamp: number,
}

interface notificationType {
  notifications: notificationsStore[],
  lastUpdate: number
}

interface User {
  authUserId: number,
  nameFirst: string,
  nameLast: string,
  email: string,
  handleStr: string,
  password: string,
  permissionId: number,
  sessions: string[],
  resetCodes: string[],
  notification: notificationType,
  isDeleted: boolean,
  msgSentTime: number[],
}

interface Member {
  uId: number,
  email: string,
  nameFirst: string,
  nameLast: string,
  handleStr: string,
  profileImgUrl: string,
}

interface React {
  reactId: number,
  uIds: number[],
  isThisUserReacted: boolean,
}

interface reactUid {
  uId: number,
  timeStamp: number,
}

interface Reaction {
  reactId: number,
  uIds: reactUid[],
  isThisUserReacted: boolean,
}

interface MessageType {
  messageId: number,
  uId: number,
  message: string,
  timeSent: number,
  reacts: React[],
  isPinned: boolean
}

interface MessageStore {
  messageId: number,
  uId: number,
  message: string,
  timeSent: number,
  reacts: Reaction[],
  shareMsgStart: number,
  isPinned: boolean
}

interface Standup {
  starter: number,
  timeFinish: number,
  messages: string[],
  isActive: boolean,
}

interface invitesType {
  uId: number,
  timeStamp: number,
  inviterId: number,
}

interface Channel {
  channelId: number,
  name: string,
  isPublic: boolean,
  ownerMembers: Member[],
  allMembers: Member[],
  messages: MessageStore[],
  invites: invitesType[],
  standup: Standup
}

interface Channels {
  channelId: number,
  name: string,
}

interface Message {
  messages: MessageType[],
  start: number,
  end: number,
}

interface channelDetails {
  name: string,
  isPublic: boolean,
  ownerMembers: Member[],
  allMembers: Member[],
}

interface Dms {
  dmId: number,
  name: string,
  allMembers: Member[],
  messages: MessageStore[],
  ownerId: number,
  invites: invitesType[],
}

interface ChannelsJoined {
  numChannelsJoined: number,
  timeStamp: number,
}

interface DmsJoined {
  numDmsJoined: number,
  timeStamp: number,
}

interface MessagesSent {
  numMessagesSent: number,
  timeStamp: number,
}

interface channelsExist {
  numChannelsExist: number,
  timeStamp: number,
}

interface dmsExist {
  numDmsExist: number,
  timeStamp: number,
}

interface messagesExist {
  numMessagesExist: number,
  timeStamp: number,
}

interface userStats {
  channelsJoined: ChannelsJoined[],
  dmsJoined: DmsJoined [],
  messagesSent: MessagesSent[],
  involvementRate: number
}

interface workspaceStats {
  channelsExist: channelsExist[],
  dmsExist: dmsExist[],
  messagesExist: messagesExist[],
  utilizationRate: number
}

interface dms {
  dmId: number,
  name: string,
}

interface dmDetails {
  name: string,
  members: Member[],
}

interface dataStore {
  users: User[],
  channels: Channel[],
  dms: Dms[],
  idCounter: number,
  firstUserTime: number,
}

interface error {
  error: string,
}

function clearV1(): Record<string, never> {
  let data = getData();
  data = {
    users: [],
    channels: [],
    dms: [],
    idCounter: 0,
    firstUserTime: 0,
  };
  setData(data);
  return {};
}

// Helper functions for channels
/*
/**
  * Checks if a given authUserId refers to an existing user
  *
  * @param {number} authUserId - authenticated user id
  *
  * @returns {boolean} true for an invalid user (undefined), or false for a valid user

function invalid(authUserId: number | undefined): boolean {
  const isValidId = getData().users.find(element => element.authUserId === authUserId);
  return isValidId === undefined;
}
*/

/**
  * Pushes a given channel to a given list in a display format
  *
  * @param {Channels[]} channelsList - the list of channels to be pushed to
  * @param {Channels} channel - the channel to be pushed to the list
  *
  * @returns {}
*/
function channelsPush(channelsList: Channels[], channel: Channels): void {
  const currChannel = {
    channelId: channel.channelId,
    name: channel.name,
  };
  channelsList.push(currChannel);
}

// Helper functions for dm

/**
 *
 * Checks if Id refers to a valid User's authUserId.
 *
 * @param {number} Id
 * @param {User[]} listId
 * @returns {boolean}
 */
function isValidId(Id: number, listId: User[]): boolean {
  for (const item of listId) if (item.authUserId === Id) return true;
  return false;
}

/**
*
* Checks if token refers to a token in a User's token array and returns that User.
*
* @param {string} token
* @param {User[]} users
* @returns {undefined | User}
*/
function findTokenUser(token: string, users: User[]): undefined | User {
  for (const user of users) {
    const User = user.sessions.find(t => doHash(t + SECRET) === token);
    if (User !== undefined) return user;
  }
  return undefined;
}

/**
 *
 * Checks if certain id is apart of a member's list.
 *
 * @param {number} Id
 * @param {Member[]} memberList
 * @returns {boolean}
 */
function isMember(Id: number, memberList: Member[]): boolean {
  for (const item of memberList) if (item.uId === Id) return true;
  return false;
}

/**
 *
 * Hashes a string.
 *
 * @param {string} text
 * @returns {string}
 */
function doHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 *
 * generates a random string.
 *
 * @returns {string}
 */
function generateToken(): string {
  return Math.random().toString().slice(2);
}

/**
 *
 * generates a the current time.
 *
 * @returns {number}
 */
function getCurrentTime(): number {
  return Math.floor((new Date()).getTime() / 1000);
}
// Gets channels/dms that the user is apart of.
function getChannelsAndDms(Id: number): any[] {
  const data = getData();
  const channel = data.channels.filter(element => {
    return element.allMembers.find(user => user.uId === Id) !== undefined ? 1 : 0;
  });
  const dms = data.dms.filter(element => {
    return element.allMembers.find(user => user.uId === Id) !== undefined ? 1 : 0;
  });
  return [...channel, ...dms];
}

function getUserHandle(Id: number): string {
  const data = getData();
  for (const user of data.users) if (user.authUserId === Id) return user.handleStr;
}

function changeMsgType(messages: MessageStore[]): MessageType[] {
  const newMessages = [];
  for (const msg of messages) {
    const uIds: number[] = [];
    const newReacts = [
      {
        reactId: 1,
        uIds: uIds,
        isThisUserReacted: msg.reacts[0].isThisUserReacted,
      },
    ];

    for (const react of msg.reacts[0].uIds) {
      newReacts[0].uIds.push(react.uId);
    }

    newMessages.push({
      messageId: msg.messageId,
      uId: msg.uId,
      message: msg.message,
      timeSent: msg.timeSent,
      reacts: newReacts,
      isPinned: msg.isPinned
    });
  }
  return newMessages;
}

/*

*/
function searchV1(token: string, queryStr: string): { messages: MessageType[] } {
  const data = getData();

  if (queryStr.length < 1 || queryStr.length > 1000) throw HTTPError(400, 'query string not correct length');

  const owner = findTokenUser(token, data.users);
  if (owner === undefined) throw HTTPError(403, 'token does not belong to a user.');

  // Array with Dm/Channel objects that the user is apart of.
  const searchChannels = data.channels.filter(element => {
    return element.allMembers.find(user => user.uId === owner.authUserId) !== undefined ? 1 : 0;
  });
  const searchDms = data.dms.filter(element => {
    return element.allMembers.find(user => user.uId === owner.authUserId) !== undefined ? 1 : 0;
  });
  const searchArray = [...searchChannels, ...searchDms];

  // Finding all messages that contain substring queryStr.
  let search = [];
  for (const obj of searchArray) {
    const stream = obj.messages.filter(element => element.message.toLowerCase().includes(queryStr.toLowerCase()));
    for (const msg of stream) {
      search.push(msg);
    }
  }
  search = search.filter(msg => msg.timeSent <= Math.floor((new Date()).getTime() / 1000));
  search = changeMsgType(search);

  return { messages: search };
}

function transferStandupMsgs(data: dataStore, channelId: number): void {
  // Find channel corresponding to channelId
  const channel = data.channels.find(channel => channel.channelId === channelId);

  // Exit function if no buffered standup messages
  if (channel.standup.messages.length === 0) return;

  // Pack messages together
  const packagedMsg = channel.standup.messages.join('\r\n');

  // Create id of message
  const messageId = data.idCounter;
  data.idCounter++;

  // Add to messages array
  channel.messages.unshift({
    messageId: messageId,
    uId: channel.standup.starter,
    message: packagedMsg,
    timeSent: channel.standup.timeFinish,
    shareMsgStart: 0,
    reacts: [{ reactId: 1, uIds: [], isThisUserReacted: false }],
    isPinned: false,
  });

  // Push time of message to msgSentTime of sender
  const user = data.users.find(user => user.authUserId === channel.standup.starter);
  user.msgSentTime.push(channel.standup.timeFinish);

  // Reset standup properties
  channel.standup = {
    starter: null,
    timeFinish: null,
    messages: [],
    isActive: false,
  };

  setData(data);
}

// MAKE THIS RETURN VOID
function checkMsgTag(data: dataStore, msg: MessageStore, channelId: number, dmId: number, name: string): any {
  for (const user of data.users) {
    const handleTag = '@' + user.handleStr;
    console.log(handleTag);
    if (msg.message.slice(0, msg.shareMsgStart).includes(handleTag)) {
      user.notification.notifications.push({
        channelId: channelId,
        dmId: dmId,
        notificationMessage: `${getUserHandle(msg.uId)} tagged you in ${name}: ${msg.message.slice(0, 20)}`,
        timeStamp: getCurrentTime(),
      });
      console.log('in if');
    }
  }
}

export {
  clearV1,
  User,
  Channels,
  Member,
  error,
  Channel,
  dataStore,
  channelDetails,
  Message,
  MessageType,
  dmDetails,
  dms,
  ChannelsJoined,
  DmsJoined,
  MessagesSent,
  channelsExist,
  dmsExist,
  messagesExist,
  userStats,
  workspaceStats,
  channelsPush,
  isValidId,
  findTokenUser,
  isMember,
  generateToken,
  doHash,
  getCurrentTime,
  searchV1,
  getChannelsAndDms,
  notifications,
  getUserHandle,
  changeMsgType,
  transferStandupMsgs,
  invitesType,
  MessageStore,
  reactUid,
  Reaction,
  notificationType,
  notificationsStore,
  Dms,
  checkMsgTag,
};
