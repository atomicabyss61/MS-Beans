import { getData, setData } from './dataStore';
import {
  findTokenUser,
  isMember,
  getCurrentTime,
} from './other';

import HTTPError from 'http-errors';

/**
  * For a given channel, starts a standup period for length seconds
  *
  * @param {string} token
  * @param {number} channelId
  * @param {number} length
  * @returns {{timeFinish: number}}
 */
function standupStartV1(token: string, channelId: number, length: number): {timeFinish: number} {
  const data = getData();

  // Find channel corresponding to channelId
  const channel = data.channels.find(channel => channel.channelId === channelId);
  if (channel === undefined) {
    throw HTTPError(400, 'channelId does not refer to a valid channel');
  }
  // check if length is valid (should not be negative)
  if (length < 0) {
    throw HTTPError(400, 'length is a negative integer');
  }

  // Find user corresponding to token
  const user = findTokenUser(token, data.users);
  if (user === undefined) {
    throw HTTPError(403, 'token is invalid');
  }

  // Check if user is member of channel
  if (!isMember(user.authUserId, channel.allMembers)) {
    throw HTTPError(403, 'authorised user is not member of valid channel');
  }

  // Check if there is an active standup in the channel
  if (standupActiveV1(token, channelId).isActive) {
    throw HTTPError(400, 'an active standup is currently running in the channel');
  }

  channel.standup = {
    starter: user.authUserId,
    timeFinish: getCurrentTime() + length,
    messages: [],
    isActive: true,
  };

  setData(data);

  return {
    timeFinish: channel.standup.timeFinish
  };
}

/**
 * Returns whether a standup is active in a given channel and what time the
 * standup finishes. The time is null if no standup is active.
 *
 * @param {string} token
 * @param {number} channelId
 * @returns {{isActive: boolean, timeFinish: number}}
 */
function standupActiveV1(token: string, channelId: number): {isActive: boolean, timeFinish: number} {
  const data = getData();

  // Find channel corresponding to channelId
  const channel = data.channels.find(channel => channel.channelId === channelId);
  if (channel === undefined) {
    throw HTTPError(400, 'channelId does not refer to a valid channel');
  }

  // Find user corresponding to token
  const user = findTokenUser(token, data.users);
  if (user === undefined) {
    throw HTTPError(403, 'token is invalid');
  }

  // Check if user is member of channel
  if (!isMember(user.authUserId, channel.allMembers)) {
    throw HTTPError(403, 'authorised user is not member of valid channel');
  }

  // Check if there should be an active standup in the channel
  if (channel.standup.isActive === true &&
      getCurrentTime() < channel.standup.timeFinish) {
    // Standup is active
    return {
      isActive: true,
      timeFinish: channel.standup.timeFinish,
    };
  }

  return {
    isActive: false,
    timeFinish: null,
  };
}

function standupSendV1(token: string, channelId: number, message: string): Record<string, never> {
  const data = getData();

  // Find channel corresponding to channelId
  const channel = data.channels.find(channel => channel.channelId === channelId);
  if (channel === undefined) {
    throw HTTPError(400, 'channelId does not refer to a valid channel');
  }
  // Error if message is over 1000 characters
  if (message.length > 1000) {
    throw HTTPError(400, 'length of message is over 1000 characters');
  }
  // Find user corresponding to token
  const user = findTokenUser(token, data.users);
  if (user === undefined) {
    throw HTTPError(403, 'token is invalid');
  }
  // Check if user is member of channel
  if (!isMember(user.authUserId, channel.allMembers)) {
    throw HTTPError(403, 'authorised user is not member of valid channel');
  }
  // Check if there is an active standup in the channel
  if (!standupActiveV1(token, channelId).isActive) {
    throw HTTPError(400, 'an active standup is not currently running in the channel');
  }

  // Putting message in buffer
  const standupMsg = `${user.handleStr}: ${message}`;
  channel.standup.messages.push(standupMsg);

  setData(data);
  return {};
}

export { standupStartV1, standupActiveV1, standupSendV1 };
