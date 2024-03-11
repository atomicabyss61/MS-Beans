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

function authRegisterWrapper(email: string, password: string, nameFirst: string, nameLast: string): any {
  return requestHelper('POST', '/auth/register/v3', { email: email, password: password, nameFirst: nameFirst, nameLast: nameLast });
}
function channelsCreateWrapper(token: string, name: string, isPublic: boolean): any {
  return requestHelper('POST', '/channels/create/v3', { name: name, isPublic: isPublic }, token);
}
function channelJoinWrapper(token: string, channelId: number): any {
  return requestHelper('POST', '/channel/join/v3', { channelId: channelId }, token);
}
// function channelInviteWrapper(token: string, channelId: number, uId: number): any {
//   return requestHelper('POST', '/channel/invite/v3', { channelId: channelId, uId: uId }, token);
// }
function messageSendWrapper(token: string, channelId: number, message: string): any {
  return requestHelper('POST', '/message/send/v2', { channelId: channelId, message: message }, token);
}
function notificationsGetV1(token: string): any {
  return requestHelper('GET', '/notifications/get/v1', {}, token);
}
function dmCreateWrapper(token: string, uIds: number[]): any {
  return requestHelper('POST', '/dm/create/v2', { uIds: uIds }, token);
}
function messageSendDmWrapper(token: string, dmId: number, message: string):any {
  return requestHelper('POST', '/message/senddm/v2', { dmId: dmId, message: message }, token);
}
function messageReactWrapper(token: string, messageId: number, reactId: number): any {
  return requestHelper('POST', '/message/react/v1', { messageId: messageId, reactId: reactId }, token);
}
// function messageUnreactWrapper(token: string, messageId: number, reactId: number): any {
//   return requestHelper('POST', '/message/unreact/v1', { messageId: messageId, reactId: reactId }, token);
// }

beforeEach(() => {
  requestHelper('DELETE', '/clear/v1', {});
});

afterEach(() => {
  requestHelper('DELETE', '/clear/v1', {});
});

describe('notifications/get/v1 testing', () => {
  test('Error checking', () => {
    expect(notificationsGetV1('error')).toBe(403);
  });

  test('tagging checking channels/dms', async () => {
    const user1 = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const user2 = authRegisterWrapper('dustin@ad.unsw.edu.au', 'password', 'Dustin', 'Poirier');
    const user3 = authRegisterWrapper('jeff@ad.unsw.edu.au', 'password', 'Jeff', 'Jones');
    const dm = dmCreateWrapper(user1.token, [user2.authUserId, user3.authUserId]);
    const c1 = channelsCreateWrapper(user1.token, 'channel 1', true);
    channelsCreateWrapper(user2.token, 'channel unknown', true);
    await new Promise((r) => setTimeout(r, 1000));
    messageSendDmWrapper(user1.token, dm.dmId, 'hello random person @jeffjones and @dustin!');
    await new Promise((r) => setTimeout(r, 1000));
    channelJoinWrapper(user2.token, c1.channelId);
    channelJoinWrapper(user3.token, c1.channelId);
    await new Promise((r) => setTimeout(r, 1000));
    messageSendWrapper(user1.token, c1.channelId, 'hello random person @jeffjones and @dustin!');
    await new Promise((r) => setTimeout(r, 1000));
    expect(notificationsGetV1(user3.token)).toStrictEqual({
      notifications: [
        {
          channelId: c1.channelId,
          dmId: -1,
          notificationMessage: 'charlesoliveira tagged you in channel 1: hello random person ',
        },
        {
          channelId: -1,
          dmId: dm.dmId,
          notificationMessage: 'charlesoliveira tagged you in charlesoliveira, dustinpoirier, jeffjones: hello random person ',
        },
        {
          channelId: -1,
          dmId: dm.dmId,
          notificationMessage: 'charlesoliveira added you to charlesoliveira, dustinpoirier, jeffjones',
        },
      ],
    });
  });

  test('reacting check dms', async () => {
    const user1 = authRegisterWrapper('charles@ad.unsw.edu.au', 'password', 'Charles', 'Oliveira');
    const user2 = authRegisterWrapper('dustin@ad.unsw.edu.au', 'password', 'Dustin', 'Poirier');
    const user3 = authRegisterWrapper('jeff@ad.unsw.edu.au', 'password', 'Jeff', 'Jones');
    await new Promise((r) => setTimeout(r, 1000));
    const dm = dmCreateWrapper(user1.token, [user2.authUserId, user3.authUserId]);
    await new Promise((r) => setTimeout(r, 1000));
    const msg = messageSendDmWrapper(user1.token, dm.dmId, 'hello random person');
    await new Promise((r) => setTimeout(r, 1000));
    messageReactWrapper(user2.token, msg.messageId, 1);
    await new Promise((r) => setTimeout(r, 1000));
    expect(notificationsGetV1(user1.token)).toStrictEqual({
      notifications: [
        {
          channelId: -1,
          dmId: dm.dmId,
          notificationMessage: 'dustinpoirier reacted to your message in charlesoliveira, dustinpoirier, jeffjones',
        },
      ],
    });
  });
});
