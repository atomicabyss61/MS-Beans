import { getCurrentTime } from './other';
import request, { HttpVerb } from 'sync-request';
import { port, url } from './config.json';

const SERVER_URL = `${url}:${port}`;

function requestHelper(method: HttpVerb, path: string, payload: object, token?: string) {
  let qs = {};
  let json = {};
  let headers = {};
  if (['GET', 'DELETE'].includes(method)) {
    qs = payload;
  } else {
    // PUT/POST
    json = payload;
  }
  if (token) headers = { token: token };
  const res = request(method, SERVER_URL + path, { qs, json, headers });

  if (res.statusCode !== 200) {
    return res.statusCode;
  }
  try {
    return JSON.parse(res.getBody() as string);
  } catch (e) {}
}

beforeEach(() => {
  requestHelper('DELETE', '/clear/v1', {});
});

afterEach(() => {
  requestHelper('DELETE', '/clear/v1', {});
});

function authRegisterWrapper(email: string, password: string, nameFirst: string, nameLast: string): any {
  return requestHelper('POST', '/auth/register/v3', { email: email, password: password, nameFirst: nameFirst, nameLast: nameLast });
}
function channelMessagesWrapper(token: string, channelId: number, start: number): any {
  return requestHelper('GET', '/channel/messages/v3', { channelId: channelId, start: start }, token);
}
function channelJoinWrapper(token: string, channelId: number): any {
  return requestHelper('POST', '/channel/join/v3', { channelId: channelId }, token);
}
function channelsCreateWrapper(token: string, name: string, isPublic: boolean): any {
  return requestHelper('POST', '/channels/create/v3', { name: name, isPublic: isPublic }, token);
}
function messageSendWrapper(token: string, channelId: number, message: string): any {
  return requestHelper('POST', '/message/send/v2', { channelId: channelId, message: message }, token);
}
function messageSendLaterWrapper(token: string, channelId: number, message: string, timeSent: number): any {
  return requestHelper('POST', '/message/sendlater/v1', { channelId: channelId, message: message, timeSent: timeSent }, token);
}
function messageEditWrapper(token: string, messageId: number, message: string): any {
  return requestHelper('PUT', '/message/edit/v2', { messageId: messageId, message: message }, token);
}
function messageRemoveWrapper(token: string, messageId: number): any {
  return requestHelper('DELETE', '/message/remove/v2', { messageId: messageId }, token);
}
function dmCreateWrapper(token: string, uIds: number[]): any {
  return requestHelper('POST', '/dm/create/v2', { uIds: uIds }, token);
}
function messageSendDmWrapper(token: string, dmId: number, message: string): any {
  return requestHelper('POST', '/message/senddm/v2', { dmId: dmId, message: message }, token);
}
function dmMessagesWrapper(token: string, dmId: number, start: number): any {
  return requestHelper('GET', '/dm/messages/v2', { dmId: dmId, start: start }, token);
}
function messageShareWrapper(token: string, ogMessageId: number, message: string, channelId:number, dmId: number): any {
  return requestHelper('POST', '/message/share/v1', { ogMessageId: ogMessageId, message: message, channelId: channelId, dmId: dmId }, token);
}
function messageReactWrapper(token: string, messageId: number, reactId: number): any {
  return requestHelper('POST', '/message/react/v1', { messageId: messageId, reactId: reactId }, token);
}
function messageUnreactWrapper(token: string, messageId: number, reactId: number): any {
  return requestHelper('POST', '/message/unreact/v1', { messageId: messageId, reactId: reactId }, token);
}
function messagePinWrapper(token: string, messageId: number): any {
  return requestHelper('POST', '/message/pin/v1', { messageId: messageId }, token);
}
function messageUnpinWrapper(token: string, messageId: number): any {
  return requestHelper('POST', '/message/unpin/v1', { messageId: messageId }, token);
}

const longString = 'A'.repeat(1001);

/**
 * testing message/send/v1
 */
describe('Testing send', () => {
  test('testing errors', () => {
    expect(messageSendWrapper('1', 0, 'a')).toEqual(403);
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    const user2 = authRegisterWrapper('Hayden@unsw.com', 'mypassword', 'Hayden', 'Smith');
    expect(messageSendWrapper(user.token, 20, 'hello')).toEqual(400);
    const channel = channelsCreateWrapper(user.token, 'channel1', true);
    expect(messageSendWrapper(user.token, channel.channelId, '')).toEqual(400);
    expect(messageSendWrapper(user.token, channel.channelId, longString)).toEqual(400);
    expect(messageSendWrapper(user2.token, channel.channelId, 'hello')).toEqual(403);
  });
  // test('error long string', () => {
  //   const longString = 'A'.repeat(1001);
  //   const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
  //   const channel = channelsCreateWrapper(user.token, 'channel1', true);
  //   expect(messageSendWrapper(user.token, channel.channelId, longString)).toEqual(400);
  // });
  // test('error channel doesn\'t exist', () => {
  //   const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
  //   expect(messageSendWrapper(user.token, 20, 'hello')).toEqual(400);
  // });
  // test('user is not a member of the channel', () => {
  //   const user1 = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
  //   const user2 = authRegisterWrapper('Hayden@unsw.com', 'mypassword', 'Hayden', 'Smith');
  //   const channel = channelsCreateWrapper(user1.token, 'channel1', true);
  //   expect(messageSendWrapper(user2.token, channel.channelId, 'hello')).toEqual(403);
  // });
  test('Main Tests', () => {
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    const channel = channelsCreateWrapper(user.token, 'channel1', true);
    const messageIdArray = [];
    messageIdArray.unshift(messageSendWrapper(user.token, channel.channelId, 'abcd').messageId);
    let messages = channelMessagesWrapper(user.token, channel.channelId, 0).messages;
    expect(messages[0].message).toStrictEqual('abcd');
    expect(messages[0].uId).toStrictEqual(user.authUserId);
    expect(messages[0].messageId).toStrictEqual(messageIdArray[0]);
    messageIdArray.unshift(messageSendWrapper(user.token, channel.channelId, 'efgh').messageId);
    messages = channelMessagesWrapper(user.token, channel.channelId, 0).messages;
    expect(messages[0].message).toStrictEqual('efgh');
    expect(messages[0].uId).toStrictEqual(user.authUserId);
    expect(messages[0].messageId).toStrictEqual(messageIdArray[0]);
    expect(messages[1].message).toStrictEqual('abcd');
    expect(messages[1].uId).toStrictEqual(user.authUserId);
    expect(messages[1].messageId).toStrictEqual(messageIdArray[1]);
  });
});

/**
 * testing message/edit/v1
 */
describe('Testing edit', () => {
  test('testing errors', () => {
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    const userOut = authRegisterWrapper('ronnyg@unsw.com', 'mypassword', 'ronny', 'g');
    const channel = channelsCreateWrapper(user.token, 'channel1', true);
    const messageId = messageSendWrapper(user.token, channel.channelId, 'abcd').messageId;
    expect(messageEditWrapper('1', messageId, 'a')).toEqual(403);
    expect(messageEditWrapper(userOut.token, messageId, 'a')).toEqual(403);
    expect(messageEditWrapper(user.token, 99, 'a')).toEqual(400);
    expect(messageEditWrapper(user.token, messageId, longString)).toEqual(400);
    channelJoinWrapper(userOut.token, channel.channelId);
    expect(messageEditWrapper(userOut.token, messageId, 'hey')).toEqual(403);
  });
  // test('error long string', () => {
  //   const longString = 'A'.repeat(1001);
  //   const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
  //   const channel = channelsCreateWrapper(user.token, 'channel1', true);
  //   const message = messageSendWrapper(user.token, channel.channelId, 'hello');
  //   expect(messageEditWrapper(user.token, message.messageId, longString)).toEqual(400);
  // });
  // test('user is not a member of the channel', () => {
  //   const user1 = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
  //   const user2 = authRegisterWrapper('Hayden@unsw.com', 'mypassword', 'Hayden', 'Smith');
  //   const channel = channelsCreateWrapper(user1.token, 'channel1', true);
  //   const message = messageSendWrapper(user1.token, channel.channelId, 'hello');
  //   expect(messageEditWrapper(user2.token, message.messageId, 'hey')).toEqual(403);
  //   channelJoinWrapper(user2.token, channel.channelId);
  //   expect(messageEditWrapper(user2.token, message.messageId, 'hey')).toEqual(403);
  // });
  test('time sent is in the past', () => {
    const user1 = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    const channel = channelsCreateWrapper(user1.token, 'channel1', true);
    const message = messageSendLaterWrapper(user1.token, channel.channelId, 'hello', getCurrentTime() + 1000);
    expect(messageEditWrapper(user1.token, message.messageId, 'hey')).toEqual(400);
  });
  test('Main Tests', () => {
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    const channel = channelsCreateWrapper(user.token, 'channel1', true);
    const messageIdArray = [];
    messageIdArray.push(messageSendWrapper(user.token, channel.channelId, 'good message').messageId);
    let messages = channelMessagesWrapper(user.token, channel.channelId, 0).messages;
    expect(messages[0].message).toStrictEqual('good message');
    expect(messages[0].uId).toStrictEqual(user.authUserId);
    expect(messages[0].messageId).toStrictEqual(messageIdArray[0]);
    messageEditWrapper(user.token, messageIdArray[0], 'even better message');
    messages = channelMessagesWrapper(user.token, channel.channelId, 0).messages;
    expect(messages[0].message).toStrictEqual('even better message');
    expect(messages[0].uId).toStrictEqual(user.authUserId);
    expect(messages[0].messageId).toStrictEqual(messageIdArray[0]);
    messageEditWrapper(user.token, messageIdArray[0], '');
    expect(channelMessagesWrapper(user.token, channel.channelId, 0).messages.length).toEqual(0);
  });
  test('Testing editing in a dm', () => {
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    const dm = dmCreateWrapper(user.token, []);
    const messageIdArray = [];
    messageIdArray.push(messageSendDmWrapper(user.token, dm.dmId, 'good message').messageId);
    let messages = dmMessagesWrapper(user.token, dm.dmId, 0).messages;
    expect(messages[0].message).toStrictEqual('good message');
    expect(messages[0].uId).toStrictEqual(user.authUserId);
    expect(messages[0].messageId).toStrictEqual(messageIdArray[0]);

    messageEditWrapper(user.token, messageIdArray[0], 'even better message @danfield');
    messages = dmMessagesWrapper(user.token, dm.dmId, 0).messages;
    expect(messages[0].message).toStrictEqual('even better message @danfield');
    expect(messages[0].uId).toStrictEqual(user.authUserId);
    expect(messages[0].messageId).toStrictEqual(messageIdArray[0]);
    messageEditWrapper(user.token, messageIdArray[0], '');
    expect(dmMessagesWrapper(user.token, dm.dmId, 0).messages).toStrictEqual([]);
  });
});

/**
 * testing message/remove/v1
 */
describe('Testing remove', () => {
  test('testing errors', () => {
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    const userOut = authRegisterWrapper('ronnyg@unsw.com', 'mypassword', 'ronny', 'g');
    const channel = channelsCreateWrapper(user.token, 'channel1', true);
    const messageId = messageSendWrapper(user.token, channel.channelId, 'abcd').messageId;
    expect(messageRemoveWrapper('1', messageId)).toEqual(403);
    expect(messageRemoveWrapper(user.token, 99)).toEqual(400);
    expect(messageRemoveWrapper(userOut.token, messageId)).toEqual(403);
  });
  // test('user is not a member of the channel', () => {
  //   const user1 = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
  //   const user2 = authRegisterWrapper('Hayden@unsw.com', 'mypassword', 'Hayden', 'Smith');
  //   const channel = channelsCreateWrapper(user1.token, 'channel1', true);
  //   const message = messageSendWrapper(user1.token, channel.channelId, 'hello');
  //   expect(messageRemoveWrapper(user2.token, message.messageId)).toEqual(403);
  // });
  test('time sent is in the past', () => {
    const user1 = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    const channel = channelsCreateWrapper(user1.token, 'channel1', true);
    const message = messageSendLaterWrapper(user1.token, channel.channelId, 'hello', getCurrentTime() + 1000);
    expect(messageRemoveWrapper(user1.token, message.messageId)).toEqual(400);
  });
  test('Main Tests', () => {
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    const channel = channelsCreateWrapper(user.token, 'channel1', true);
    const messageIdArray = [];
    messageIdArray.push(messageSendWrapper(user.token, channel.channelId, 'abcd').messageId);
    const messages = channelMessagesWrapper(user.token, channel.channelId, 0).messages;
    expect(messages[0].message).toStrictEqual('abcd');
    expect(messages[0].uId).toStrictEqual(user.authUserId);
    expect(messages[0].messageId).toStrictEqual(messageIdArray[0]);
    messageRemoveWrapper(user.token, messageIdArray[0]);
    expect(channelMessagesWrapper(user.token, channel.channelId, 0).messages.length).toEqual(0);
  });
});

/**
 * Testing sendLater
 */
describe('Testing sendLater', () => {
  test('testing errors', () => {
    expect(messageSendLaterWrapper('1', 0, 'a', getCurrentTime())).toEqual(403);
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    const user2 = authRegisterWrapper('Hayden@unsw.com', 'mypassword', 'Hayden', 'Smith');
    const channel = channelsCreateWrapper(user.token, 'channel1', true);
    expect(messageSendLaterWrapper(user.token, channel.channelId, '', getCurrentTime())).toEqual(400);
    expect(messageSendLaterWrapper(user.token, channel.channelId, longString, getCurrentTime())).toEqual(400);
    expect(messageSendLaterWrapper(user.token, 20, 'hello', getCurrentTime())).toEqual(400);
    expect(messageSendLaterWrapper(user2.token, channel.channelId, 'hello', getCurrentTime())).toEqual(403);
  });
  // test('error long string', () => {
  //   const longString = 'A'.repeat(1001);
  //   const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
  //   const channel = channelsCreateWrapper(user.token, 'channel1', true);
  //   expect(messageSendLaterWrapper(user.token, channel.channelId, longString, getCurrentTime())).toEqual(400);
  // });
  // test('error channel doesn\'t exist', () => {
  //   const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
  //   expect(messageSendLaterWrapper(user.token, 20, 'hello', getCurrentTime())).toEqual(400);
  // });
  // test('user is not a member of the channel', () => {
  //   const user1 = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
  //   const user2 = authRegisterWrapper('Hayden@unsw.com', 'mypassword', 'Hayden', 'Smith');
  //   const channel = channelsCreateWrapper(user1.token, 'channel1', true);
  //   expect(messageSendLaterWrapper(user2.token, channel.channelId, 'hello', getCurrentTime())).toEqual(403);
  // });
  test('time sent is in the past', () => {
    const user1 = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    const channel = channelsCreateWrapper(user1.token, 'channel1', true);
    expect(messageSendLaterWrapper(user1.token, channel.channelId, 'hello', getCurrentTime() - 10)).toEqual(400);
  });
  test('Main Tests', async () => {
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    const channel = channelsCreateWrapper(user.token, 'channel1', true);
    const messageId = messageSendLaterWrapper(user.token, channel.channelId, 'abcd', getCurrentTime() + 3).messageId;
    expect(messageShareWrapper(user.token, messageId, 'share success!', channel.channelId, -1)).toBe(400);
    expect(channelMessagesWrapper(user.token, channel.channelId, 0).messages.length).toBe(0);
    await new Promise((r) => setTimeout(r, 3000));
    const messages = channelMessagesWrapper(user.token, channel.channelId, 0).messages;
    expect(messages[0].message).toStrictEqual('abcd');
    expect(messages[0].uId).toStrictEqual(user.authUserId);
    expect(messages[0].messageId).toStrictEqual(messageId);
  });
});
/**
 * testing message/share/v1
 */
describe('Testing share', () => {
  test('testing channel error', () => {
    expect(messageShareWrapper('yooo', 1, 'share success!', -1, -1)).toBe(403);
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    expect(messageShareWrapper(user.token, 1, 'share success!', -1, -1)).toBe(400);
    expect(messageShareWrapper(user.token, 1, 'share success!', -1, 1000)).toBe(400);
    const other = authRegisterWrapper('other@unsw.com', 'mypassword', 'other', 'other');
    const channel1 = channelsCreateWrapper(user.token, 'channel1', true);
    const channel2 = channelsCreateWrapper(user.token, 'channel2', true);
    const messageId = messageSendWrapper(user.token, channel1.channelId, 'abcd').messageId;
    // let message = 'Hello';
    // for (let i = 0; i <= 200; i++) {
    //   message = message.concat('Hello');
    // }
    expect(messageShareWrapper(user.token, messageId + 50, 'share success!', channel2.channelId, -1)).toBe(400);
    expect(messageShareWrapper(user.token, messageId, 'share success!', 100000, -1)).toBe(403);
    expect(messageShareWrapper(user.token, messageId, longString, channel2.channelId, -1)).toBe(400);
    expect(messageShareWrapper(other.token, messageId, 'share success!', channel2.channelId, -1)).toBe(400);
  });

  test('testing channel share', () => {
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    const channel1 = channelsCreateWrapper(user.token, 'channel1', true);
    const channel2 = channelsCreateWrapper(user.token, 'channel2', true);
    const messageId = messageSendWrapper(user.token, channel1.channelId, 'abcd').messageId;
    expect(messageShareWrapper(user.token, messageId, 'share success!', channel2.channelId, -1)).toStrictEqual({
      sharedMessageId: expect.any(Number),
    });
    expect(channelMessagesWrapper(user.token, channel2.channelId, 0).messages[0].message.includes('share success!')).toStrictEqual(true);
  });

  test('testing dm share', () => {
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    const rand = authRegisterWrapper('rand@unsw.com', 'mypassword', 'rand', 'rand');
    const dm1 = dmCreateWrapper(user.token, []);
    const dm2 = dmCreateWrapper(user.token, []);
    dmCreateWrapper(rand.token, []);
    const messageId = messageSendDmWrapper(user.token, dm1.dmId, 'hello').messageId;
    expect(messageShareWrapper(user.token, messageId, 'share success!', -1, dm2.dmId)).toStrictEqual({
      sharedMessageId: expect.any(Number),
    });
    const msg = dmMessagesWrapper(user.token, dm2.dmId, 0);
    expect(msg.messages[0].message.includes('share success!')).toStrictEqual(true);
  });

  test('testing dm and channel share', () => {
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    const dm1 = dmCreateWrapper(user.token, []);
    const channel1 = channelsCreateWrapper(user.token, 'channel1', true);
    const messageId = messageSendWrapper(user.token, channel1.channelId, 'abcd').messageId;
    expect(messageShareWrapper(user.token, messageId, 'share success!', -1, dm1.dmId)).toStrictEqual({
      sharedMessageId: expect.any(Number),
    });
    expect(channelMessagesWrapper(user.token, channel1.channelId, 0).messages[0].message.includes('share success!')).toStrictEqual(false);
  });
});

describe('Testing message/react/v1', () => {
  test('Error checking', () => {
    expect(messageReactWrapper('tranny', 1, 1)).toStrictEqual(403);
    const user = authRegisterWrapper('test@gmail.com', 'password', 'test', 'user');
    const channel = channelsCreateWrapper(user.token, 'channel', true);
    const messageId = messageSendWrapper(user.token, channel.channelId, 'message that has no reacts on initialise').messageId;
    const messageLater = messageSendLaterWrapper(user.token, channel.channelId, 'hello', getCurrentTime() + 1000);
    expect(messageReactWrapper(user.token, -1, 1)).toStrictEqual(400);
    expect(messageReactWrapper(user.token, messageLater.messageId, 1)).toStrictEqual(400);
    expect(messageReactWrapper(user.token, messageId, -1)).toStrictEqual(400);
    messageReactWrapper(user.token, messageId, 1);
    expect(messageReactWrapper(user.token, messageId, 1)).toStrictEqual(400);
  });

  test('Checking that a channel message has no reacts on initialise', () => {
    const user = authRegisterWrapper('test@gmail.com', 'password', 'test', 'user');
    const channel = channelsCreateWrapper(user.token, 'channel', true);
    messageSendWrapper(user.token, channel.channelId, 'message that has no reacts on initialise');
    const message = channelMessagesWrapper(user.token, channel.channelId, 0).messages[0];
    expect(message.reacts).toStrictEqual([{ reactId: 1, uIds: [], isThisUserReacted: false }]);
  });

  test('Checking that a dm has no reacts on initialise', () => {
    const user = authRegisterWrapper('test@gmail.com', 'password', 'test', 'user');
    const dummyUser = authRegisterWrapper('dummy@gmail.com', 'password', 'dummy', 'user');
    const dm = dmCreateWrapper(user.token, [dummyUser.authUserId]);
    messageSendDmWrapper(user.token, dm.dmId, 'dm that has no reacts on initialise');
    const message = dmMessagesWrapper(user.token, dm.dmId, 0).messages[0];
    expect(message.reacts).toStrictEqual([{ reactId: 1, uIds: [], isThisUserReacted: false }]);
  });

  test('Checking that a channel message can be reacted to, and stores reacts', () => {
    const user = authRegisterWrapper('test@gmail.com', 'password', 'test', 'user');
    const channel = channelsCreateWrapper(user.token, 'channel', true);
    const messageId = messageSendWrapper(user.token, channel.channelId, 'message to be reacted to').messageId;
    let message = channelMessagesWrapper(user.token, channel.channelId, 0).messages[0];
    expect(message.reacts).toStrictEqual([{ reactId: 1, uIds: [], isThisUserReacted: false }]);
    expect(messageReactWrapper(user.token, messageId, 1)).toStrictEqual({});
    message = channelMessagesWrapper(user.token, channel.channelId, 0).messages[0];
    expect(message.reacts).toStrictEqual([{ reactId: 1, uIds: [user.authUserId], isThisUserReacted: true }]);
  });

  test('Checking that a dm can be reacted to, and stores reacts', () => {
    const user = authRegisterWrapper('test@gmail.com', 'password', 'test', 'user');
    const dummyUser = authRegisterWrapper('dummy@gmail.com', 'password', 'dummy', 'user');
    const dm = dmCreateWrapper(user.token, [dummyUser.authUserId]);
    messageSendDmWrapper(user.token, dm.dmId, 'dm to be reacted to');
    let message = dmMessagesWrapper(user.token, dm.dmId, 0).messages[0];
    expect(message.reacts).toStrictEqual([{ reactId: 1, uIds: [], isThisUserReacted: false }]);
    expect(messageReactWrapper(user.token, message.messageId, 1)).toStrictEqual({});
    message = dmMessagesWrapper(user.token, dm.dmId, 0).messages[0];
    expect(message.reacts).toStrictEqual([{ reactId: 1, uIds: [user.authUserId], isThisUserReacted: true }]);
  });
});

describe('Testing message/unreact/v1', () => {
  test('Error checking', () => {
    expect(messageUnreactWrapper('tranny', 1, 1)).toStrictEqual(403);
    const user = authRegisterWrapper('test@gmail.com', 'password', 'test', 'user');
    const channel = channelsCreateWrapper(user.token, 'channel', true);
    const messageId = messageSendWrapper(user.token, channel.channelId, 'message that has no reacts on initialise').messageId;
    messageReactWrapper(user.token, messageId, 1);
    expect(messageUnreactWrapper(user.token, -1, 1)).toStrictEqual(400);
    expect(messageUnreactWrapper(user.token, messageId, -1)).toStrictEqual(400);
    messageUnreactWrapper(user.token, messageId, 1);
    expect(messageUnreactWrapper(user.token, messageId, 1)).toStrictEqual(400);
  });

  test('Unreacting from a channel message', () => {
    const user = authRegisterWrapper('test@gmail.com', 'password', 'test', 'user');
    const channel = channelsCreateWrapper(user.token, 'channel', true);
    const messageId = messageSendWrapper(user.token, channel.channelId, 'message that has no reacts on initialise').messageId;
    let message = channelMessagesWrapper(user.token, channel.channelId, 0).messages[0];
    expect(message.reacts).toStrictEqual([{ reactId: 1, uIds: [], isThisUserReacted: false }]);
    messageReactWrapper(user.token, messageId, 1);
    message = channelMessagesWrapper(user.token, channel.channelId, 0).messages[0];
    expect(message.reacts).toStrictEqual([{ reactId: 1, uIds: [user.authUserId], isThisUserReacted: true }]);
    expect(messageUnreactWrapper(user.token, messageId, 1)).toStrictEqual({});
    message = channelMessagesWrapper(user.token, channel.channelId, 0).messages[0];
    expect(message.reacts).toStrictEqual([{ reactId: 1, uIds: [], isThisUserReacted: false }]);
  });

  test('Unreacting from a dm', () => {
    const user = authRegisterWrapper('test@gmail.com', 'password', 'test', 'user');
    const dummyUser = authRegisterWrapper('dummy@gmail.com', 'password', 'dummy', 'user');
    const dm = dmCreateWrapper(user.token, [dummyUser.authUserId]);
    const messageId = messageSendDmWrapper(user.token, dm.dmId, 'dm to be reacted to').messageId;
    let message = dmMessagesWrapper(user.token, dm.dmId, 0).messages[0];
    expect(message.reacts).toStrictEqual([{ reactId: 1, uIds: [], isThisUserReacted: false }]);
    messageReactWrapper(user.token, messageId, 1);
    message = dmMessagesWrapper(user.token, dm.dmId, 0).messages[0];
    expect(message.reacts).toStrictEqual([{ reactId: 1, uIds: [user.authUserId], isThisUserReacted: true }]);
    expect(messageUnreactWrapper(user.token, messageId, 1)).toStrictEqual({});
    message = dmMessagesWrapper(user.token, dm.dmId, 0).messages[0];
    expect(message.reacts).toStrictEqual([{ reactId: 1, uIds: [], isThisUserReacted: false }]);
  });
});

describe('Testing message/pin/v1', () => {
  test('Error checking', () => {
    const user = authRegisterWrapper('test@gmail.com', 'password', 'test', 'user');
    const channel = channelsCreateWrapper(user.token, 'channel', true);
    const messageId = messageSendWrapper(user.token, channel.channelId, 'message that should be pinned').messageId;
    const messageLater = messageSendLaterWrapper(user.token, channel.channelId, 'hello', getCurrentTime() + 1000).messageId;
    expect(messagePinWrapper(user.token, -1)).toStrictEqual(400);
    expect(messagePinWrapper(user.token, messageLater)).toStrictEqual(400);
    messagePinWrapper(user.token, messageId);
    expect(messagePinWrapper(user.token, messageId)).toStrictEqual(400);
    const nottheowner = authRegisterWrapper('nottheowner@gmail.com', 'password', 'not', 'owner');
    channelJoinWrapper(nottheowner.token, channel.channelId);
    const newMessageId = messageSendWrapper(nottheowner.token, channel.channelId, 'message that should be pinned').messageId;
    expect(messagePinWrapper(nottheowner.token, newMessageId)).toStrictEqual(403);
  });

  test('Pinning a channel message', () => {
    const user = authRegisterWrapper('test@gmail.com', 'password', 'test', 'user');
    const channel = channelsCreateWrapper(user.token, 'channel', true);
    const messageId = messageSendWrapper(user.token, channel.channelId, 'message that should be pinned').messageId;
    let message = channelMessagesWrapper(user.token, channel.channelId, 0).messages[0];
    expect(message.isPinned).toStrictEqual(false);
    expect(messagePinWrapper(user.token, messageId)).toStrictEqual({});
    message = channelMessagesWrapper(user.token, channel.channelId, 0).messages[0];
    expect(message.isPinned).toStrictEqual(true);
  });

  test('Pinning a dm', () => {
    const user = authRegisterWrapper('test@gmail.com', 'password', 'test', 'user');
    const dummyUser = authRegisterWrapper('dummy@gmail.com', 'password', 'dummy', 'user');
    const dm = dmCreateWrapper(user.token, [dummyUser.authUserId]);
    const messageId = messageSendDmWrapper(user.token, dm.dmId, 'dm that should be pinned').messageId;
    let message = dmMessagesWrapper(user.token, dm.dmId, 0).messages[0];
    expect(message.isPinned).toStrictEqual(false);
    expect(messagePinWrapper(user.token, messageId)).toStrictEqual({});
    message = dmMessagesWrapper(user.token, dm.dmId, 0).messages[0];
    expect(message.isPinned).toStrictEqual(true);
  });
});

describe('Testing message/unpin/v1', () => {
  test('Error checking', () => {
    const user = authRegisterWrapper('test@gmail.com', 'password', 'test', 'user');
    const channel = channelsCreateWrapper(user.token, 'channel', true);
    expect(messageUnpinWrapper(user.token, -1)).toStrictEqual(400);
    const messageId = messageSendWrapper(user.token, channel.channelId, 'message that is pinned').messageId;
    expect(messageUnpinWrapper(user.token, messageId)).toStrictEqual(400);
    messagePinWrapper(user.token, messageId);
    const nottheowner = authRegisterWrapper('nottheowner@gmail.com', 'password', 'not', 'owner');
    channelJoinWrapper(nottheowner.token, channel.channelId);
    expect(messageUnpinWrapper(nottheowner.token, messageId)).toStrictEqual(403);
  });

  test('Unpinning a channel message', () => {
    const user = authRegisterWrapper('test@gmail.com', 'password', 'test', 'user');
    const channel = channelsCreateWrapper(user.token, 'channel', true);
    const messageId = messageSendWrapper(user.token, channel.channelId, 'message that should be pinned').messageId;
    let message = channelMessagesWrapper(user.token, channel.channelId, 0).messages[0];
    expect(message.isPinned).toStrictEqual(false);
    messagePinWrapper(user.token, messageId);
    message = channelMessagesWrapper(user.token, channel.channelId, 0).messages[0];
    expect(message.isPinned).toStrictEqual(true);
    expect(messageUnpinWrapper(user.token, messageId)).toStrictEqual({});
    message = channelMessagesWrapper(user.token, channel.channelId, 0).messages[0];
    expect(message.isPinned).toStrictEqual(false);
  });

  test('Unpinning a dm', () => {
    const user = authRegisterWrapper('test@gmail.com', 'password', 'test', 'user');
    const dummyUser = authRegisterWrapper('dummy@gmail.com', 'password', 'dummy', 'user');
    const dm = dmCreateWrapper(user.token, [dummyUser.authUserId]);
    const messageId = messageSendDmWrapper(user.token, dm.dmId, 'dm that should be pinned').messageId;
    let message = dmMessagesWrapper(user.token, dm.dmId, 0).messages[0];
    expect(message.isPinned).toStrictEqual(false);
    messagePinWrapper(user.token, messageId);
    message = dmMessagesWrapper(user.token, dm.dmId, 0).messages[0];
    expect(message.isPinned).toStrictEqual(true);
    expect(messageUnpinWrapper(user.token, messageId)).toStrictEqual({});
    message = dmMessagesWrapper(user.token, dm.dmId, 0).messages[0];
    expect(message.isPinned).toStrictEqual(false);
  });
});
