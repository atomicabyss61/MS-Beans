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

function dmCreateWrapper(token: string, uIds: number[]): any {
  return requestHelper('POST', '/dm/create/v2', { uIds: uIds }, token);
}

function dmListWrapper(token: string): any {
  return requestHelper('GET', '/dm/list/v2', { }, token);
}

function dmRemoveWrapper(token: string, dmId: string):any {
  return requestHelper('DELETE', '/dm/remove/v2', { dmId: dmId }, token);
}

function dmDetailsWrapper(token: string, dmId: string):any {
  return requestHelper('GET', '/dm/details/v2', { dmId: dmId }, token);
}

function dmLeaveWrapper(token: string, dmId: string):any {
  return requestHelper('POST', '/dm/leave/v2', { dmId: dmId }, token);
}

function dmMessagesWrapper(token: string, dmId: number, start: number):any {
  return requestHelper('GET', '/dm/messages/v2', { token: token, dmId: dmId, start: start }, token);
}

function messageSendDmWrapper(token: string, dmId: number, message: string):any {
  return requestHelper('POST', '/message/senddm/v2', { dmId: dmId, message: message }, token);
}

function messageSendDmLaterWrapper(token: string, dmId: number, message: string, timeSent: number):any {
  return requestHelper('POST', '/message/sendlaterdm/v1', { dmId: dmId, message: message, timeSent: timeSent }, token);
}

function authRegisterWrapper(email: string, password: string, nameFirst: string, nameLast: string): any {
  return requestHelper('POST', '/auth/register/v3', { email: email, password: password, nameFirst: nameFirst, nameLast: nameLast });
}

describe('dm/create/V1 tests', () => {
  test('Invalid uId', () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    expect(dmCreateWrapper(user.token, [user.authUserId + 1])).toBe(400);
  });

  test('Invalid token', () => {
    expect(dmCreateWrapper('1', [])).toBe(403);
  });

  test('duplicate arguments', () => {
    const user1 = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const user2 = authRegisterWrapper('dustin@ad.unsw.edu.au', 'password', 'Dustin', 'Poirier');
    const user3 = authRegisterWrapper('jeff@ad.unsw.edu.au', 'password', 'Jeff', 'Jones');
    expect(dmCreateWrapper(user1.token, [user2.authUserId, user3.authUserId, user2.authUserId])).toBe(400);
  });

  test('invalid uIds', () => {
    const user1 = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const user2 = authRegisterWrapper('dustin@ad.unsw.edu.au', 'password', 'Dustin', 'Poirier');
    const user3 = authRegisterWrapper('jeff@ad.unsw.edu.au', 'password', 'Jeff', 'Jones');
    expect(dmCreateWrapper(user1.token, [user3.authUserId, user2.authUserId + 1])).toBe(400);
  });

  test('valid arguments', () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    expect(dmCreateWrapper(user.token, [])).toStrictEqual({ dmId: expect.any(Number) });
  });
});

describe('dm/list/V1 tests', () => {
  test('invalid arguments', () => {
    expect(dmListWrapper('1')).toBe(403);
  });

  test('no dms made', () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    expect(dmListWrapper(user.token)).toStrictEqual({ dms: [] });
  });

  test('multiple dms, only 1 member of', () => {
    const user1 = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    authRegisterWrapper('dustin@ad.unsw.edu.au', 'password', 'Dustin', 'Poirier');
    authRegisterWrapper('jeff@ad.unsw.edu.au', 'password', 'Jeff', 'Jones');
    const dm = dmCreateWrapper(user1.token, []);
    expect(dmListWrapper(user1.token)).toStrictEqual({
      dms: [
        {
          dmId: dm.dmId,
          name: 'charlesoliveira',
        },
      ]
    });
  });

  test('multiple users 1 dm', () => {
    const user1 = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const user2 = authRegisterWrapper('dustin@ad.unsw.edu.au', 'password', 'Dustin', 'Poirier');
    const user3 = authRegisterWrapper('jeff@ad.unsw.edu.au', 'password', 'Jeff', 'Jones');
    const dm = dmCreateWrapper(user1.token, [user2.authUserId, user3.authUserId]);
    dmCreateWrapper(user2.token, []);
    expect(dmListWrapper(user1.token)).toStrictEqual({
      dms: [
        {
          dmId: dm.dmId,
          name: 'charlesoliveira, dustinpoirier, jeffjones',
        },
      ]
    });
  });
});

describe('dm/remove/V1 tests', () => {
  test('Invalid token', () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const dm = dmCreateWrapper(user.token, []);
    expect(dmRemoveWrapper('1', dm.dmId)).toBe(403);
  });

  test('Invalid dmId', () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const dm = dmCreateWrapper(user.token, []);
    expect(dmRemoveWrapper(user.token, dm.dmId + 1)).toBe(400);
  });

  test('Remove by member error', () => {
    const user1 = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const user2 = authRegisterWrapper('dustin@ad.unsw.edu.au', 'password', 'Dustin', 'Poirier');
    const dm = dmCreateWrapper(user1.token, [user2.authUserId]);
    expect(dmRemoveWrapper(user2.token, dm.dmId)).toBe(403);
    expect(dmDetailsWrapper(user1.token, dm.dmId)).toStrictEqual({
      name: expect.any(String),
      members: [
        {
          uId: user1.authUserId,
          email: 'charles@ad.unsw.edu.au',
          nameFirst: 'Charles',
          nameLast: 'Oliveira',
          handleStr: 'charlesoliveira',
          profileImgUrl: expect.any(String),
        },
        {
          uId: user2.authUserId,
          email: 'dustin@ad.unsw.edu.au',
          nameFirst: 'Dustin',
          nameLast: 'Poirier',
          handleStr: 'dustinpoirier',
          profileImgUrl: expect.any(String),
        },
      ],
    });
  });

  test('Remove by owner', () => {
    const user1 = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const user2 = authRegisterWrapper('dustin@ad.unsw.edu.au', 'password', 'Dustin', 'Poirier');
    const dm = dmCreateWrapper(user1.token, [user2.authUserId]);
    expect(dmRemoveWrapper(user1.token, dm.dmId)).toStrictEqual({});
    expect(dmDetailsWrapper(user1.token, dm.dmId)).toBe(400);
  });
});

describe('dm/details/V1 tests', () => {
  test('Invalid dmId', () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const dm = dmCreateWrapper(user.token, []);
    expect(dmDetailsWrapper(user.token, dm.dmId + 1)).toBe(400);
  });

  test('Invalid token', () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const dm = dmCreateWrapper(user.token, []);
    expect(dmDetailsWrapper('1', dm.dmId)).toBe(403);
  });

  test('Valid uId', () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const dm = dmCreateWrapper(user.token, []);
    expect(dmDetailsWrapper(user.token, dm.dmId)).toStrictEqual({
      name: 'charlesoliveira',
      members: [
        {
          uId: expect.any(Number),
          email: 'charles@ad.unsw.edu.au',
          nameFirst: 'Charles',
          nameLast: 'Oliveira',
          handleStr: 'charlesoliveira',
          profileImgUrl: expect.any(String),
        },
      ],
    });
  });

  test('Multiple valid uIds', () => {
    const user1 = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const user2 = authRegisterWrapper('dustin@ad.unsw.edu.au', 'password', 'Dustin', 'Poirier');
    const user3 = authRegisterWrapper('jeff@ad.unsw.edu.au', 'password', 'Jeff', 'Jones');
    const dm = dmCreateWrapper(user1.token, [user2.authUserId, user3.authUserId]);
    expect(dmDetailsWrapper(user1.token, dm.dmId)).toStrictEqual({
      name: 'charlesoliveira, dustinpoirier, jeffjones',
      members: [
        {
          uId: expect.any(Number),
          email: 'charles@ad.unsw.edu.au',
          nameFirst: 'Charles',
          nameLast: 'Oliveira',
          handleStr: 'charlesoliveira',
          profileImgUrl: expect.any(String),
        },
        {
          uId: expect.any(Number),
          email: 'dustin@ad.unsw.edu.au',
          nameFirst: 'Dustin',
          nameLast: 'Poirier',
          handleStr: 'dustinpoirier',
          profileImgUrl: expect.any(String),
        },
        {
          uId: expect.any(Number),
          email: 'jeff@ad.unsw.edu.au',
          nameFirst: 'Jeff',
          nameLast: 'Jones',
          handleStr: 'jeffjones',
          profileImgUrl: expect.any(String),
        },
      ],
    });
  });
});

describe('dm/leave/V1 tests', () => {
  test('Invalid token', () => {
    const user1 = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const user2 = authRegisterWrapper('dustin@ad.unsw.edu.au', 'password', 'Dustin', 'Poirier');
    const dm = dmCreateWrapper(user1.token, []);
    expect(dmLeaveWrapper('1', dm.dmId)).toBe(403);
    expect(dmLeaveWrapper(user2.token, dm.dmId)).toBe(403);
  });

  test('Invalid dmId', () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const dm = dmCreateWrapper(user.token, []);
    expect(dmLeaveWrapper(user.token, dm.dmId + 1)).toBe(400);
  });

  test('caller is member', () => {
    const user1 = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const user2 = authRegisterWrapper('dustin@ad.unsw.edu.au', 'password', 'Dustin', 'Poirier');
    const dm = dmCreateWrapper(user1.token, [user2.authUserId]);
    expect(dmLeaveWrapper(user2.token, dm.dmId)).toStrictEqual({});
    expect(dmDetailsWrapper(user1.token, dm.dmId)).toStrictEqual({
      name: 'charlesoliveira, dustinpoirier',
      members: [
        {
          uId: expect.any(Number),
          email: 'charles@ad.unsw.edu.au',
          nameFirst: 'Charles',
          nameLast: 'Oliveira',
          handleStr: 'charlesoliveira',
          profileImgUrl: expect.any(String),
        },
      ],
    });
  });

  test('caller is owner', () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const dm = dmCreateWrapper(user.token, []);
    expect(dmLeaveWrapper(user.token, dm.dmId)).toStrictEqual({});
    expect(dmDetailsWrapper(user.token, dm.dmId)).toBe(403);
  });
});

describe('dm/messages/V1 tests', () => {
  test('Invalid length', () => {
    expect(dmMessagesWrapper('hello', 1, 0)).toBe(403);
    const user1 = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    expect(dmMessagesWrapper(user1.token, 1000, 0)).toBe(400);
    const user2 = authRegisterWrapper('dustin@ad.unsw.edu.au', 'password', 'Dustin', 'Poirier');
    const dm = dmCreateWrapper(user1.token, []);
    expect(dmMessagesWrapper(user1.token, dm.dmId, 0)).toStrictEqual({ end: -1, messages: [], start: 0 });
    expect(dmMessagesWrapper(user2.token, dm.dmId, 0)).toBe(403);
  });

  test('multiple messages', () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const dm = dmCreateWrapper(user.token, []);
    const msg1 = messageSendDmWrapper(user.token, dm.dmId, 'example message 1');
    const msg2 = messageSendDmWrapper(user.token, dm.dmId, 'example message 2');
    expect(dmMessagesWrapper(user.token, dm.dmId, 0)).toStrictEqual({
      messages: [
        {
          messageId: msg1.messageId,
          uId: user.authUserId,
          message: 'example message 1',
          timeSent: expect.any(Number),
          reacts: expect.any(Array),
          isPinned: false,
        },
        {
          messageId: msg2.messageId,
          uId: user.authUserId,
          message: 'example message 2',
          timeSent: expect.any(Number),
          reacts: expect.any(Array),
          isPinned: false,
        },
      ],
      start: 0,
      end: -1,
    });
    expect(dmMessagesWrapper(user.token, dm.dmId, 5)).toBe(400);
    for (let i = 0; i < 60; i++) messageSendDmWrapper(user.token, dm.dmId, `example message ${i}`);
    expect(dmMessagesWrapper(user.token, dm.dmId, 0).messages.length).toBe(50);
  });
});

describe('message/senddm/V1', () => {
  test('Invalid token', () => {
    const user1 = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    expect(messageSendDmWrapper(user1.token, 1, 'hello')).toBe(400);
    const user2 = authRegisterWrapper('jon@ad.unsw.edu.au', 'password', 'jon', 'jones');
    const dm = dmCreateWrapper(user1.token, []);
    expect(messageSendDmWrapper(user1.token, dm.dmId, '')).toBe(400);
    expect(messageSendDmWrapper(user2.token, dm.dmId, 'hello')).toBe(403);
  });

  test('Invalid token', () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const dm = dmCreateWrapper(user.token, []);
    expect(messageSendDmWrapper('1', dm.dmId, 'example message 1')).toBe(403);
  });

  test('valid arguments', () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const dm = dmCreateWrapper(user.token, []);
    expect(messageSendDmWrapper(user.token, dm.dmId, 'example message 1')).toStrictEqual({ messageId: expect.any(Number) });
  });
});

describe('message/senddmLater/V1', () => {
  test('Invalid string', () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const dm = dmCreateWrapper(user.token, []);
    expect(messageSendDmLaterWrapper(user.token, dm.dmId, '', getCurrentTime())).toBe(400);
    expect(messageSendDmLaterWrapper(user.token, 1000, 'yooo', getCurrentTime())).toBe(400);
    expect(messageSendDmLaterWrapper(user.token, dm.dmId, 'yooo', 1)).toBe(400);
  });

  test('Invalid token', () => {
    const user1 = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const user2 = authRegisterWrapper('jon@ad.unsw.edu.au', 'password', 'jon', 'jones');
    const dm = dmCreateWrapper(user1.token, []);
    expect(messageSendDmLaterWrapper('1', dm.dmId, 'example message 1', getCurrentTime())).toBe(403);
    expect(messageSendDmLaterWrapper(user2.token, dm.dmId, 'example message 1', getCurrentTime())).toBe(403);
  });
  test('Invalid dm', () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    expect(messageSendDmLaterWrapper(user.token, 999, 'hello my friend', getCurrentTime())).toBe(400);
  });
  test('time sent is in the past', () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const dm = dmCreateWrapper(user.token, []);
    expect(messageSendDmLaterWrapper(user.token, dm.dmId, 'example message 1', getCurrentTime() - 10)).toBe(400);
  });

  test('valid arguments', async () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const dm = dmCreateWrapper(user.token, []);
    const messageId = messageSendDmLaterWrapper(user.token, dm.dmId, 'example message 1', getCurrentTime() + 3).messageId;
    expect(dmMessagesWrapper(user.token, dm.dmId, 0).messages.length).toBe(0);
    await new Promise((r) => setTimeout(r, 3000));
    const messages = dmMessagesWrapper(user.token, dm.dmId, 0).messages;
    expect(messages[0].message).toStrictEqual('example message 1');
    expect(messages[0].uId).toStrictEqual(user.authUserId);
    expect(messages[0].messageId).toStrictEqual(messageId);
  });

  test('valid arguments', async () => {
    const user = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const dm = dmCreateWrapper(user.token, []);
    const messageId = messageSendDmLaterWrapper(user.token, dm.dmId, 'example message 1', getCurrentTime() + 3).messageId;
    expect(dmMessagesWrapper(user.token, dm.dmId, 0).messages.length).toBe(0);
    await new Promise((r) => setTimeout(r, 3000));
    const messages = dmMessagesWrapper(user.token, dm.dmId, 0).messages;
    expect(messages[0].message).toStrictEqual('example message 1');
    expect(messages[0].uId).toStrictEqual(user.authUserId);
    expect(messages[0].messageId).toStrictEqual(messageId);
  });
});
