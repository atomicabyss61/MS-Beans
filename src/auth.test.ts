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

function authLoginWrapper(email: string, password: string): any {
  return requestHelper('POST', '/auth/login/v3', { email: email, password: password });
}
function authRegisterWrapper(email: string, password: string, nameFirst: string, nameLast: string): any {
  return requestHelper('POST', '/auth/register/v3', { email: email, password: password, nameFirst: nameFirst, nameLast: nameLast });
}
function authLogoutWrapper(token: string): any {
  return requestHelper('POST', '/auth/logout/v2', {}, token);
}
function userProfileWrapper(token: string, uId: number): any {
  return requestHelper('GET', '/user/profile/v3', { uId: uId }, token);
}
function channelsCreateWrapper(token: string, name: string, isPublic: boolean): any {
  return requestHelper('POST', '/channels/create/v3', { name: name, isPublic: isPublic }, token);
}
function authPasswordResetRequestWrapper(email: string): any {
  return requestHelper('POST', '/auth/passwordreset/request/v1', { email: email });
}
function authPasswordResetReseetWrapper(resetCode: string, newPassword: string): any {
  return requestHelper('POST', '/auth/passwordreset/reset/v1', { resetCode: resetCode, newPassword: newPassword });
}

/**
 * Tests for authLoginV1
 */
describe('Testing auth/login/v2', () => {
  test('Checking error cases', () => {
    expect(authLoginWrapper('dan@unsw.com', 'mypassword')).toEqual(400);
    authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    expect(authLoginWrapper('dan@unsw.com', 'NOTmypassword')).toEqual(400);
  });
  test('Testing case sensitivity', () => {
    expect(authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field').authUserId).toStrictEqual(authLoginWrapper('DAN@unsw.com', 'mypassword').authUserId);
  });
  test('Testing no error cases', () => {
    authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    const user = authLoginWrapper('dan@unsw.com', 'mypassword');
    expect(userProfileWrapper(user.token, user.authUserId).user.email).toStrictEqual('dan@unsw.com');
    expect(userProfileWrapper(user.token, user.authUserId).user.nameFirst).toStrictEqual('Dan');
    expect(userProfileWrapper(user.token, user.authUserId).user.nameLast).toStrictEqual('Field');
    expect(userProfileWrapper(user.token, user.authUserId).user.uId).toStrictEqual(user.authUserId);
  });
});

/**
 * Tests for authRegisterWrapper
 */
describe('Invalid argument', () => {
  test('invalid email', () => {
    expect(authRegisterWrapper('theemail', 'password', 'jeff', 'bob')).toEqual(400);
  });

  test('email already used', () => {
    authRegisterWrapper('bob@ad.unsw.edu.au', 'password', 'jeff', 'bob');
    expect(authRegisterWrapper('bob@ad.unsw.edu.au', 'password', 'jeff', 'bob')).toEqual(400);
  });

  test('invalid password', () => {
    expect(authRegisterWrapper('bob@ad.unsw.edu.au', 'fail', 'jeff', 'bob')).toEqual(400);
  });

  test('invalid firstName', () => {
    expect(authRegisterWrapper('bob@ad.unsw.edu.au', 'password', '', 'bob')).toEqual(400);
  });

  test('invalid lastName', () => {
    expect(authRegisterWrapper('bob@ad.unsw.edu.au', 'password', 'bob', '')).toEqual(400);
  });
});

describe('basic valid arguments', () => {
  test('case 1', () => {
    expect(authRegisterWrapper('bob@ad.unsw.edu.au', 'password', 'jeff', 'bob')).toStrictEqual({ token: expect.any(String), authUserId: expect.any(Number) });
  });

  test('case 2', () => {
    expect(authRegisterWrapper('jeff@ad.unsw.edu.au', 'password', 'jeff', 'bob')).toStrictEqual({ token: expect.any(String), authUserId: expect.any(Number) });
  });

  test('case 3', () => {
    expect(authRegisterWrapper('lad@ad.unsw.edu.au', 'password', 'tobi', 'bob')).toStrictEqual({ token: expect.any(String), authUserId: expect.any(Number) });
  });
});

describe('handle creation testing', () => {
  test('basic handle', () => {
    authRegisterWrapper('lab@ad.unsw.edu.au', 'password', 'jeff', 'smith');
    const auth = authRegisterWrapper('proj@ad.unsw.edu.au', 'password', 'jeff', 'smith');
    const person1 = userProfileWrapper(auth.token, auth.authUserId).user;
    expect(person1.handleStr).toStrictEqual('jeffsmith0');
  });

  test('double same handle', () => {
    authRegisterWrapper('lab@ad.unsw.edu.au', 'password', 'jeff', 'smith');
    const auth1 = authRegisterWrapper('proj@ad.unsw.edu.au', 'password', 'jeff', 'smith');
    const person1 = userProfileWrapper(auth1.token, auth1.authUserId).user;
    expect(person1.handleStr).toStrictEqual('jeffsmith0');
  });

  test('multiple same handles', () => {
    authRegisterWrapper('lab@ad.unsw.edu.au', 'password', 'jeff', 'smith');
    authRegisterWrapper('proj@ad.unsw.edu.au', 'password', 'jeff', 'smith');
    authRegisterWrapper('comp@ad.unsw.edu.au', 'password', 'jeff', 'smith');
    authRegisterWrapper('math@ad.unsw.edu.au', 'password', 'jeff', 'smith');
    authRegisterWrapper('law@ad.unsw.edu.au', 'password', 'jeff', 'smith');
    authRegisterWrapper('med@ad.unsw.edu.au', 'password', 'jeff', 'smith');
    authRegisterWrapper('eng@ad.unsw.edu.au', 'password', 'jeff', 'smith');
    const auth1 = authRegisterWrapper('school@ad.unsw.edu.au', 'password', 'jeff', 'smith');
    const person1 = userProfileWrapper(auth1.token, auth1.authUserId).user;
    expect(person1.handleStr).toStrictEqual('jeffsmith6');
  });

  test('long multiple handles', () => {
    authRegisterWrapper('lab@ad.unsw.edu.au', 'password', 'jefffffffffffffffffffffffffffff', 'smith');
    authRegisterWrapper('math@ad.unsw.edu.au', 'password', 'jefffffffffffffffffffffffffffff', 'smith');
    authRegisterWrapper('eng@ad.unsw.edu.au', 'password', 'jefffffffffffffffffffffffffffff', 'smith');
    const auth = authRegisterWrapper('proj@ad.unsw.edu.au', 'password', 'jefffffffffffffffffffffffffffff', 'smith');
    const person1 = userProfileWrapper(auth.token, auth.authUserId).user;
    expect(person1.handleStr).toStrictEqual('jeffffffffffffffffff2');
  });
});

/**
 * AuthLogoutV1 tests.
 */
describe('Testing auth/LOGOUT/v1', () => {
  test('Checking error cases', () => {
    expect(authLogoutWrapper('0')).toEqual(403);
  });
  test('Main tests', () => {
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    authLogoutWrapper(user.token);
    expect(authLogoutWrapper(user.token)).toEqual(403);
    expect(channelsCreateWrapper(user.token, 'abc', true)).toEqual(403);
  });
});

/**
 * Tests for the password reset.
 */
describe('Testing password reset', () => {
  test('Checking error cases for request', () => {
    expect(authPasswordResetRequestWrapper('bob@gmail.com')).toStrictEqual({});
  });
  test('Checking error cases for reset', () => {
    expect(authPasswordResetReseetWrapper('wrong code', 'cool password')).toBe(400);
  });
  test('Main tests', () => {
    authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    expect(authPasswordResetRequestWrapper('dan@unsw.com')).toStrictEqual({});
  });
});

// describe('Testing the password resets', () => {
//   test('Checking normal behaviour', () => {
//     authRegisterV3('email@email.com', 'password', 'D', 'F');
//     expect(authLoginV3('email@email.com', 'password')).toStrictEqual({ token: expect.any(String), authUserId: expect.any(Number) });
//     expect(() => authLoginV3('email@email.com', 'different password')).toThrow(Error);
//     const code = generateResetCode('email@email.com');
//     authPasswordResetResetV1(code, 'different password');
//     expect(() => authLoginV3('email@email.com', 'password')).toThrow(Error);
//     expect(authLoginV3('email@email.com', 'different password')).toStrictEqual({ token: expect.any(String), authUserId: expect.any(Number) });
//   });
//   test('Incorrect code', () => {
//     authRegisterV3('email@email.com', 'password', 'D', 'F');
//     expect(() => authPasswordResetResetV1('bad code', 'different password')).toThrow(Error);
//   });
//   test('password is too short', () => {
//     authRegisterV3('email@email.com', 'password', 'D', 'F');
//     const code = generateResetCode('email@email.com');
//     expect(() => authPasswordResetResetV1(code, 'short')).toThrow(Error);
//   });
// });
