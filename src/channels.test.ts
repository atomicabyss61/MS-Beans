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
function channelsListWrapper(token: string): any {
  return requestHelper('GET', '/channels/list/v3', {}, token);
}
function channelsListAllWrapper(token: string): any {
  return requestHelper('GET', '/channels/listAll/v3', {}, token);
}

describe('Testing channelsCreateWrapper', () => {
  test('Error checking', () => {
    const token = authRegisterWrapper('user@ad.unsw.edu.au', 'password', 'firstName', 'lastName').token;
    expect(channelsCreateWrapper('1', 'public test', true)).toEqual(403);
    expect(channelsCreateWrapper(token, '', true)).toStrictEqual(400);
    expect(channelsCreateWrapper(token, 'public test that should result in an error', true)).toStrictEqual(400);
  });

  test('Creation of a single public channel', () => {
    const token = authRegisterWrapper('user@ad.unsw.edu.au', 'password', 'firstName', 'lastName').token;
    expect(channelsCreateWrapper(token, 'public test', true).channelId).toStrictEqual(expect.any(Number));
  });

  test('Creation of a multiple public channels to test id enumeration', () => {
    const token = authRegisterWrapper('user@ad.unsw.edu.au', 'password', 'firstName', 'lastName').token;
    expect(channelsCreateWrapper(token, 'public test 1', true).channelId).toStrictEqual(expect.any(Number));
    expect(channelsCreateWrapper(token, 'public test 2', true).channelId).toStrictEqual(expect.any(Number));
    expect(channelsCreateWrapper(token, 'public test 3', true).channelId).toStrictEqual(expect.any(Number));
    expect(channelsCreateWrapper(token, 'public test 4', true).channelId).toStrictEqual(expect.any(Number));
    expect(channelsCreateWrapper(token, 'public test 5', true).channelId).toStrictEqual(expect.any(Number));
  });
});

describe('Testing channelsListWrapper', () => {
  test('Error checking', () => {
    expect(channelsListWrapper('1')).toStrictEqual({ error: expect.any(String) });
  });

  test('Finding and listing no channels', () => {
    const token = authRegisterWrapper('user@ad.unsw.edu.au', 'password', 'firstName', 'lastName').token;
    expect(channelsListWrapper(token).channels.length).toStrictEqual(0);
  });

  test('Finding and listing multiple channels', () => {
    const token = authRegisterWrapper('user@ad.unsw.edu.au', 'password', 'firstName', 'lastName').token;
    const pag = authRegisterWrapper('pag@ad.unsw.edu.au', 'password', 'pag', 'pag').token;
    channelsCreateWrapper(token, 'private test 1', false);
    channelsCreateWrapper(token, 'public test 1', true);
    channelsCreateWrapper(token, 'private test 2', false);

    for (const channel of channelsListWrapper(token).channels) {
      expect(channel.channelId).toStrictEqual(expect.any(Number));
    }
    expect(channelsListWrapper(token).channels.length).toStrictEqual(3);
    expect(channelsListWrapper(pag).channels.length).toStrictEqual(0);
  });
});

describe('Testing channelsListAllWrapper', () => {
  test('Error checking', () => {
    expect(channelsListAllWrapper('1')).toStrictEqual({ error: expect.any(String) });
  });

  test('Finding and listing no channels', () => {
    const token = authRegisterWrapper('user@ad.unsw.edu.au', 'password', 'firstName', 'lastName').token;
    expect(channelsListAllWrapper(token).channels.length).toStrictEqual(0);
  });

  test('Finding and listing multiple channels', () => {
    const token = authRegisterWrapper('user@ad.unsw.edu.au', 'password', 'firstName', 'lastName').token;

    channelsCreateWrapper(token, 'private test 1', false);
    channelsCreateWrapper(token, 'public test 1', true);
    channelsCreateWrapper(token, 'private test 2', false);

    for (const channel of channelsListAllWrapper(token).channels) {
      expect(channel.channelId).toStrictEqual(expect.any(Number));
    }
    expect(channelsListAllWrapper(token).channels.length).toStrictEqual(3);
  });
});
