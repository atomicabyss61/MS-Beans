import { getData, setData } from './dataStore';
import { userProfileV2 } from './users';
import { error, Channels, Member, findTokenUser, channelsPush } from './other';
import HTTPError from 'http-errors';

/**
  * Creates a new channel with the given name, that is either a public or private channel. The user who created it automatically joins the channel.
  *
  * @param {number} authUserId - authenticated user id
  * @param {string} name - name of the channel
  * @param {boolean} isPublic - if the channel is public (true) or private (false)
  *
  * @returns { channelId: number } channelId - enumerated id of the channel
*/
function channelsCreateV2(token: string, name: string, isPublic: boolean): error | { channelId: number } {
  const dataStore = getData();
  const user = findTokenUser(token, dataStore.users);
  if (user === undefined) throw HTTPError(403, 'Invalid Token');

  const authUserId = user.authUserId;

  // HTTP errors
  if (name.length < 1) {
    throw HTTPError(400, 'Length of channel name is less than 1 character');
  }
  if (name.length > 20) {
    throw HTTPError(400, 'Length of channel name is more than 20 characters');
  }

  // enumerate channel id
  const channelId = dataStore.idCounter;
  dataStore.idCounter++;
  // get owner object
  const owner = (userProfileV2(token, authUserId) as {user: Member}).user;

  dataStore.channels.push({
    channelId: channelId,
    name: name,
    isPublic: isPublic,
    ownerMembers: [
      owner,
    ],
    allMembers: [
      owner,
    ],
    messages: [],
    invites: [
      {
        uId: user.authUserId,
        timeStamp: Math.floor((new Date()).getTime() / 1000),
        inviterId: -1,
      },
    ],

    standup: {
      starter: null,
      timeFinish: null,
      messages: [],
      isActive: false,
    },
  });

  setData(dataStore);

  return {
    channelId: channelId,
  };
}

/**
  * Provides an array of all channels (and their associated details) that the authorised user is part of.
  *
  * @param {number} authUserId - authenticated user id
  *
  * @returns { channelsList: [ channel objects ] } channelsList - list of relevant channel objects
*/
function channelsListV2(token: string): error | {channels: Channels[]} {
  const dataStore = getData();
  const channelsList: Channels[] = [];
  const user = findTokenUser(token, dataStore.users);

  if (user === undefined) {
    return { error: 'error' };
  }

  const authUserId = user.authUserId;

  for (const channel of dataStore.channels) {
    for (const member of channel.allMembers) {
      if (member.uId === authUserId) {
        channelsPush(channelsList, channel);
      }
    }
  }

  return {
    channels: channelsList,
  };
}

/**
  * Provides an array of all channels, including private channels (and their associated details).
  *
  * @param {number} authUserId - authenticated user id
  *
  * @returns { channelsList: [ channel objects ] } channelsList - list of relevant channel objects
*/
function channelsListAllV2(token: string): error | {channels: Channels[]} {
  const dataStore = getData();
  const channelsList: Channels[] = [];
  const user = findTokenUser(token, dataStore.users);

  if (user === undefined) {
    return { error: 'error' };
  }

  for (const channel of dataStore.channels) {
    channelsPush(channelsList, channel);
  }

  return {
    channels: channelsList,
  };
}

export {
  channelsCreateV2,
  channelsListV2,
  channelsListAllV2
};
