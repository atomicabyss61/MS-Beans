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
function channelsCreateWrapper(token: string, name: string, isPublic: boolean): any {
  return requestHelper('POST', '/channels/create/v3', { name: name, isPublic: isPublic }, token);
}
function channelInviteWrapper(token: string, channelId: number, uId: number): any {
  return requestHelper('POST', '/channel/invite/v3', { channelId: channelId, uId: uId }, token);
}
function standupStartWrapper(token: string, channelId: number, length: number): any {
  return requestHelper('POST', '/standup/start/v1', { channelId: channelId, length: length }, token);
}
function standupActiveWrapper(token: string, channelId: number): any {
  return requestHelper('GET', '/standup/active/v1', { channelId: channelId }, token);
}
function standupSendWrapper(token: string, channelId: number, message: string): any {
  return requestHelper('POST', '/standup/send/v1', { channelId: channelId, message: message }, token);
}
function channelMessagesWrapper(token: string, channelId: number, start: number): any {
  return requestHelper('GET', '/channel/messages/v3', { channelId: channelId, start: start }, token);
}
function messageShareWrapper(token: string, ogMessageId: number, message: string, channelId:number, dmId: number): any {
  return requestHelper('POST', '/message/share/v1', { ogMessageId: ogMessageId, message: message, channelId: channelId, dmId: dmId }, token);
}

// Function to delay
const wait = async (ms: number) => await new Promise(res => setTimeout(res, ms));

/*
 * Tests for standupStartWrapper
 */

describe('Invalid inputs - error cases', () => {
  test('channelId does not refer to valid channel', () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const channel = channelsCreateWrapper(user.token, 'General', true);
    expect(standupStartWrapper(user.token, channel.channelId + 1, 2)).toBe(400);
  });

  test('length is a negative integer', () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const channel = channelsCreateWrapper(user.token, 'General', true);
    expect(standupStartWrapper(user.token, channel.channelId, -1)).toBe(400);
    expect(standupStartWrapper(user.token, channel.channelId, -9999)).toBe(400);
  });

  test('An active standup is currently running in the channel', () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const channel = channelsCreateWrapper(user.token, 'General', true);
    expect(standupStartWrapper(user.token, channel.channelId, 2).timeFinish).toStrictEqual(expect.any(Number));
    // Starting standup immediately after starting 2 second standup
    expect(standupStartWrapper(user.token, channel.channelId, 2)).toBe(400);
  });

  test('Authorised user is not memeber of valid channel', () => {
    const user1 = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const user2 = authRegisterWrapper('secondguy@gmail.com', '123456', 'Second', 'Dude');
    const channel = channelsCreateWrapper(user1.token, 'General', true);
    expect(standupStartWrapper(user2.token, channel.channelId, 2)).toStrictEqual(403);
  });

  test('Invalid token', () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const channel = channelsCreateWrapper(user.token, 'General', true);
    expect(standupStartWrapper(user.token + 1, channel.channelId, 2)).toStrictEqual(403);
  });
});

describe('Valid inputs', () => {
  test('One user successfully made a standup multiple times', async () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const channel = channelsCreateWrapper(user.token, 'General', true);

    let expectedTimeFinish = Math.floor((new Date()).getTime() / 1000) + 1;
    let timeFinish = standupStartWrapper(user.token, channel.channelId, 1).timeFinish;
    expect(timeFinish).toBeGreaterThanOrEqual(expectedTimeFinish);
    expect(timeFinish).toBeLessThanOrEqual(expectedTimeFinish + 2);

    // Wait at least 1 second before making another standup
    await wait(1000);
    expectedTimeFinish = Math.floor((new Date()).getTime() / 1000) + 1;
    timeFinish = standupStartWrapper(user.token, channel.channelId, 1).timeFinish;
    expect(timeFinish).toBeGreaterThanOrEqual(expectedTimeFinish);
    expect(timeFinish).toBeLessThanOrEqual(expectedTimeFinish + 2);
  });

  test('Multiple people successfully made a standup in the same channel', async () => {
    const user1 = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const user2 = authRegisterWrapper('secondguy@gmail.com', '123456', 'Second', 'Dude');
    const channel = channelsCreateWrapper(user1.token, 'General', true);
    channelInviteWrapper(user1.token, channel.channelId, user2.authUserId);

    // User 1 creates a standup
    let expectedTimeFinish = Math.floor((new Date()).getTime() / 1000) + 1;
    let timeFinish = standupStartWrapper(user1.token, channel.channelId, 1).timeFinish;
    expect(timeFinish).toBeGreaterThanOrEqual(expectedTimeFinish);
    expect(timeFinish).toBeLessThanOrEqual(expectedTimeFinish + 2);

    // Wait at least 1 second
    await wait(1000);

    // User 2 creates another standup
    expectedTimeFinish = Math.floor((new Date()).getTime() / 1000) + 1;
    timeFinish = standupStartWrapper(user2.token, channel.channelId, 1).timeFinish;
    expect(timeFinish).toBeGreaterThanOrEqual(expectedTimeFinish);
    expect(timeFinish).toBeLessThanOrEqual(expectedTimeFinish + 2);
  });
});

/*
 * Tests for standup/active/v1
 */

describe('Invalid inputs - error cases', () => {
  test('channelId does not refer to a valid channel', () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    expect(standupActiveWrapper(user.token, 1)).toBe(400);
  });

  test('Authorised user is not memeber of valid channel', () => {
    const user1 = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const user2 = authRegisterWrapper('secondguy@gmail.com', '123456', 'Second', 'Dude');
    const channel = channelsCreateWrapper(user1.token, 'General', true);
    expect(standupActiveWrapper(user2.token, channel.channelId)).toStrictEqual(403);
  });

  test('Invalid token', () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const channel = channelsCreateWrapper(user.token, 'General', true);
    expect(standupActiveWrapper(user.token + 1, channel.channelId)).toStrictEqual(403);
  });
});

describe('Valid inputs', () => {
  test('standup is not active', () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const channel = channelsCreateWrapper(user.token, 'General', true);

    expect(standupActiveWrapper(user.token, channel.channelId)).toStrictEqual(
      {
        isActive: false,
        timeFinish: null,
      }
    );
  });

  test('standup is active', () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const channel = channelsCreateWrapper(user.token, 'General', true);

    const expectedTimeFinish = Math.floor((new Date()).getTime() / 1000) + 2;
    standupStartWrapper(user.token, channel.channelId, 2);

    // Checking properties of returned object of standup/active/v1
    const standupActiveObject = standupActiveWrapper(user.token, channel.channelId);
    expect(standupActiveObject.isActive).toStrictEqual(true);
    expect(standupActiveObject.timeFinish).toBeGreaterThanOrEqual(expectedTimeFinish);
    expect(standupActiveObject.timeFinish).toBeLessThanOrEqual(expectedTimeFinish + 2);
  });
});

/*
 * Tests for standup/send/v1
 */

describe('Invalid arguments -> error', () => {
  test('Invalid channelId', () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const channel = channelsCreateWrapper(user.token, 'General', true);
    standupStartWrapper(user.token, channel.channelId, 1);

    expect(standupSendWrapper(user.token, channel.channelId + 1, 'This is my message')).toStrictEqual(400);
  });

  test('Length of message is over 1000 characters', () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const channel = channelsCreateWrapper(user.token, 'General', true);

    let message = 'Hello';
    for (let i = 0; i <= 200; i++) {
      message = message.concat('Hello');
    }
    standupStartWrapper(user.token, channel.channelId, 1);
    expect(standupSendWrapper(user.token, channel.channelId, message)).toStrictEqual(400);
  });

  test('Active standup is not running in the channel', () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const channel = channelsCreateWrapper(user.token, 'General', true);
    expect(standupSendWrapper(user.token, channel.channelId, 'This is my message')).toStrictEqual(400);
  });

  describe('Authorised user is not member of channel', () => {
    const user1 = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const user2 = authRegisterWrapper('secondguy@gmail.com', '123456', 'Second', 'Dude');
    const channel = channelsCreateWrapper(user2.token, 'General', true);
    standupStartWrapper(user2.token, channel.channelId, 1);
    expect(standupSendWrapper(user1.token, channel.channelId, 'This is my message')).toStrictEqual(403);
  });

  test('Invalid token', () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const channel = channelsCreateWrapper(user.token, 'General', true);
    standupStartWrapper(user.token, channel.channelId, 1);
    expect(standupSendWrapper(user.token + 1, channel.channelId, 'This is my message')).toStrictEqual(403);
  });
});

describe('Valid arguments', () => {
  test('Successfully sent a standup message', async () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const channel = channelsCreateWrapper(user.token, 'General', true);
    standupStartWrapper(user.token, channel.channelId, 2);

    const timeFinish = standupActiveWrapper(user.token, channel.channelId).timeFinish;
    // await wait(1000);
    // Expecting no error
    expect(standupSendWrapper(user.token, channel.channelId, 'This is my message')).toStrictEqual({});
    // Expecting message is buffered, no message sent yet
    expect(channelMessagesWrapper(user.token, channel.channelId, 0)).toStrictEqual({
      messages: [],
      start: 0,
      end: -1,
    });

    await wait(2000);
    // Expecting message is buffered, no message sent yet
    expect(channelMessagesWrapper(user.token, channel.channelId, 0)).toStrictEqual({
      messages: [{
        messageId: expect.any(Number),
        uId: user.authUserId,
        message: 'personone: This is my message',
        timeSent: timeFinish,
        reacts: [{ reactId: 1, uIds: [], isThisUserReacted: false }],
        isPinned: false
      }],
      start: 0,
      end: -1,
    });
  });

  test('Standup message can be shared', async () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const channel = channelsCreateWrapper(user.token, 'General', true);
    standupStartWrapper(user.token, channel.channelId, 2);

    expect(standupSendWrapper(user.token, channel.channelId, 'This is my message')).toStrictEqual({});
    await wait(2000);

    const ogMsgObj = channelMessagesWrapper(user.token, channel.channelId, 0).messages[0];
    expect(messageShareWrapper(user.token, ogMsgObj.messageId, 'Shared', channel.channelId, -1)).toStrictEqual({
      sharedMessageId: expect.any(Number)
    });

    expect(channelMessagesWrapper(user.token, channel.channelId, 0).messages.length).toStrictEqual(2);
  });
});
