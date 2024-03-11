import { authRegisterV3, authLoginV3 } from './auth';
import { channelsCreateV2, channelsListAllV2 } from './channels';

import { clearV1 } from './other';
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
  clearV1();
});

afterEach(() => {
  requestHelper('DELETE', '/clear/v1', {});
});

function authLoginWrapper(email: string, password: string): any {
  return authLoginV3(email, password);
}
function authRegisterWrapper(email: string, password: string, nameFirst: string, nameLast: string): any {
  return authRegisterV3(email, password, nameFirst, nameLast);
}
function channelsCreateWrapper(token: string, name: string, isPublic: boolean): any {
  return channelsCreateV2(token, name, isPublic);
}
function channelsListAllWrapper(token: string): any {
  return channelsListAllV2(token);
}

function authRegisterWrapperHTTP(email: string, password: string, nameFirst: string, nameLast: string): any {
  return requestHelper('POST', '/auth/register/v3', { email: email, password: password, nameFirst: nameFirst, nameLast: nameLast });
}
function dmCreateWrapperHTTP(token: string, uIds: number[]): any {
  return requestHelper('POST', '/dm/create/v2', { uIds: uIds }, token);
}
function messageSendDmWrapperHTTP(token: string, dmId: number, message: string):any {
  return requestHelper('POST', '/message/senddm/v2', { dmId: dmId, message: message }, token);
}
function channelsCreateWrapperHTTP(token: string, name: string, isPublic: boolean): any {
  return requestHelper('POST', '/channels/create/v3', { name: name, isPublic: isPublic }, token);
}
function dmMessagesWrapperHTTP(token: string, dmId: number, start: number):any {
  return requestHelper('GET', '/dm/messages/v2', { token: token, dmId: dmId, start: start }, token);
}
function channelMessagesWrapperHTTP(token: string, channelId: number, start: number): any {
  return requestHelper('GET', '/channel/messages/v3', { channelId: channelId, start: start }, token);
}
function searchWrapperHTTP(token: string, queryStr: string): any {
  return requestHelper('GET', '/search/v1', { queryStr: queryStr }, token);
}
function messageSendWrapperHTTP(token: string, channelId: number, message: string): any {
  return requestHelper('POST', '/message/send/v2', { channelId: channelId, message: message }, token);
}

describe('ClearV1 testing', () => {
  test('Creating 1 User', () => {
    const user = authRegisterWrapper('dutch@ad.unsw.edu.au', 'password', 'Brian', 'Brobbey').authUserId;
    expect(authLoginWrapper('dutch@ad.unsw.edu.au', 'password')).toStrictEqual({ token: expect.any(String), authUserId: user });
    clearV1();
    expect(() => authLoginWrapper('dutch@ad.unsw.edu.au', 'password')).toThrowError();
  });

  test('User in channel', () => {
    const token = authRegisterWrapper('dutch@ad.unsw.edu.au', 'password', 'Brian', 'Brobbey').token;
    const id = channelsCreateWrapper(token, 'example', true).channelId;
    expect(id).toStrictEqual(expect.any(Number));
    expect(channelsListAllWrapper(token)).toStrictEqual(
      {
        channels: [
          {
            channelId: id,
            name: 'example',
          },
        ],
      }
    );
    clearV1();
    expect(channelsListAllWrapper(token)).toStrictEqual({ error: expect.any(String) });
  });
});

describe('search/v1 testing', () => {
  test('searching channel', () => {
    const user = authRegisterWrapperHTTP('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const channelId = channelsCreateWrapperHTTP(user.token, 'COMP1531', true).channelId;
    messageSendWrapperHTTP(user.token, channelId, 'testing first message, hello');
    messageSendWrapperHTTP(user.token, channelId, 'testing second message, hello');
    messageSendWrapperHTTP(user.token, channelId, 'testing third message, hello');
    expect(searchWrapperHTTP(user.token, 'hello')).toStrictEqual({
      messages: channelMessagesWrapperHTTP(user.token, channelId, 0).messages
    });
    expect(searchWrapperHTTP(user.token, '')).toStrictEqual(400);
    expect(searchWrapperHTTP('h', 'h')).toStrictEqual(403);
  });

  test('searching dm', () => {
    const user = authRegisterWrapperHTTP('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const other = authRegisterWrapperHTTP('person@ad.unsw.edu.au', 'password', 'person', 'person');
    dmCreateWrapperHTTP(other.token, []);
    channelsCreateWrapperHTTP(other.token, 'jeff', true);
    const dm = dmCreateWrapperHTTP(user.token, []);
    messageSendDmWrapperHTTP(user.token, dm.dmId, 'testing first message, hello');
    messageSendDmWrapperHTTP(user.token, dm.dmId, 'testing second message, hello');
    messageSendDmWrapperHTTP(user.token, dm.dmId, 'testing third message, hello');
    expect(new Set((searchWrapperHTTP(user.token, 'hello')).messages)).toStrictEqual(new Set(dmMessagesWrapperHTTP(user.token, dm.dmId, 0).messages));
    expect(searchWrapperHTTP(user.token, 'hello everyone')).toStrictEqual({
      messages: [],
    });
  });

  test('searching dm and channel', () => {
    const user = authRegisterWrapperHTTP('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const dm = dmCreateWrapperHTTP(user.token, []);
    messageSendDmWrapperHTTP(user.token, dm.dmId, 'testing first message, hello');
    messageSendDmWrapperHTTP(user.token, dm.dmId, 'testing second message, hello');
    messageSendDmWrapperHTTP(user.token, dm.dmId, 'testing third message, hello');
    const channelId = channelsCreateWrapperHTTP(user.token, 'COMP1531', true).channelId;
    messageSendWrapperHTTP(user.token, channelId, 'testing first message, hello');
    messageSendWrapperHTTP(user.token, channelId, 'testing second message, hello');
    messageSendWrapperHTTP(user.token, channelId, 'testing third message, hello');
    expect(new Set(searchWrapperHTTP(user.token, 'hello').messages)).toStrictEqual(
      new Set([...(channelMessagesWrapperHTTP(user.token, channelId, 0).messages), ...(dmMessagesWrapperHTTP(user.token, dm.dmId, 0).messages)]));
    expect(searchWrapperHTTP(user.token, 'first')).toStrictEqual({
      messages: [
        {
          message: 'testing first message, hello',
          messageId: expect.any(Number),
          reacts: expect.any(Array),
          timeSent: expect.any(Number),
          uId: user.authUserId,
          isPinned: false,
        },
        {
          message: 'testing first message, hello',
          messageId: expect.any(Number),
          reacts: expect.any(Array),
          timeSent: expect.any(Number),
          uId: user.authUserId,
          isPinned: false,
        },
      ],
    });
  });
});
