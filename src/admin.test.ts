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

function authRegisterWrapper(email: string, password: string, nameFirst: string, nameLast: string): any {
  return requestHelper('POST', '/auth/register/v3', { email: email, password: password, nameFirst: nameFirst, nameLast: nameLast });
}
function channelsCreateWrapper(token: string, name: string, isPublic: boolean): any {
  return requestHelper('POST', '/channels/create/v3', { name: name, isPublic: isPublic }, token);
}
function dmCreateWrapper(token: string, uIds: number[]): any {
  return requestHelper('POST', '/dm/create/v2', { uIds: uIds }, token);
}
function messageSendWrapper(token: string, channelId: number, message: string): any {
  return requestHelper('POST', '/message/send/v2', { channelId: channelId, message: message }, token);
}
function messageSendDmWrapper(token: string, dmId: number, message: string):any {
  return requestHelper('POST', '/message/senddm/v2', { dmId: dmId, message: message }, token);
}
function adminUserRemoveWrapper(token: string, uId: string):any {
  return requestHelper('DELETE', '/admin/user/remove/v1', { uId: uId }, token);
}
function adminUserPermissionChangeWrapper(token: string, uId: string, permissionId: number): any {
  return requestHelper('POST', '/admin/userpermission/change/v1', { uId: uId, permissionId: permissionId }, token);
}
function usersAllWrapper(token: string): any {
  return requestHelper('GET', '/users/all/v2', {}, token);
}

describe('Testing admin User Remove', () => {
  test('Testing valid user remove as global owner', () => {
    const adminRegister = authRegisterWrapper('lakshaya@unsw.edu.au', 'password123', 'lakshaya', 'Kaushik');
    const userRegister = authRegisterWrapper('matthew@unsw.edu.au', 'password123', 'Matthew', 'Wai');
    const remove = adminUserRemoveWrapper(adminRegister.token, userRegister.authUserId);
    expect(remove).toStrictEqual({});
    expect(usersAllWrapper(adminRegister.token)).toStrictEqual({
      users: [
        {
          email: 'lakshaya@unsw.edu.au',
          uId: adminRegister.authUserId,
          handleStr: 'lakshayakaushik',
          nameFirst: 'lakshaya',
          nameLast: 'Kaushik',
          profileImgUrl: expect.any(String),
        },
      ]
    });
  });

  test('Testing valid remove as global owner removing another owner', () => {
    const adminRegister = authRegisterWrapper('lakshaya@unsw.edu.au', 'password123', 'lakshaya', 'Kaushik');
    const adminRegister2 = authRegisterWrapper('matthew@unsw.edu.au', 'password123', 'Matthew', 'Wai');
    const permissionChange = adminUserPermissionChangeWrapper(adminRegister.token, adminRegister2.authUserId, 1);
    expect(permissionChange).toStrictEqual({});
    const dm = dmCreateWrapper(adminRegister.token, adminRegister.authUserId);
    const channel = channelsCreateWrapper(adminRegister.token, 'ChannelName', true);
    messageSendWrapper(adminRegister.token, channel.channelId, 'Hello mate!');
    messageSendDmWrapper(adminRegister.token, dm.dmId, 'hello');
    adminUserRemoveWrapper(adminRegister2.token, adminRegister.authUserId);
    expect(usersAllWrapper(adminRegister2.token)).toStrictEqual({
      users: [
        {
          uId: 1,
          email: 'matthew@unsw.edu.au',
          nameFirst: 'Matthew',
          nameLast: 'Wai',
          handleStr: 'matthewwai',
          profileImgUrl: expect.any(String),
        }
      ]
    });
  });

  test('Testing invalid user remove as non global owner', () => {
    const adminRegister = authRegisterWrapper('lakshaya@unsw.edu.au', 'password123', 'lakshaya', 'Kaushik');
    const userRegister = authRegisterWrapper('ronny@unsw.edu.au', 'password123', 'ronny', 'G');
    const remove = adminUserRemoveWrapper(userRegister.token, adminRegister.authUserId);
    expect(remove).toBe(403);
  });

  test('Testing invalid user remove as global owner with invalid user id', () => {
    const adminRegister = authRegisterWrapper('lakshaya@unsw.edu.au', 'password123', 'lakshaya', 'Kaushik');
    const userRegister = authRegisterWrapper('matthew@unsw.edu.au', 'password123', 'Matthew', 'Wai');
    const remove = adminUserRemoveWrapper(adminRegister.token, userRegister.authUserId + 1);
    expect(remove).toBe(400);
  });

  test('Testing invalid user remove as global owner with invalid token', () => {
    authRegisterWrapper('lakshaya@unsw.edu.au', 'password123', 'lakshaya', 'Kaushik');
    const userRegister = authRegisterWrapper('matthew@unsw.edu.au', 'password123', 'Matthew', 'Wai');
    const remove = adminUserRemoveWrapper('invalid token', userRegister.authUserId);
    expect(remove).toBe(403);
  });

  test('Testing invalid user remove as global owner with invalid user id and invalid token', () => {
    authRegisterWrapper('lakshaya@unsw.edu.au', 'password123', 'lakshaya', 'Kaushik');
    const userRegister = authRegisterWrapper('matthew@unsw.edu.au', 'password123', 'Matthew', 'Wai');
    const remove = adminUserRemoveWrapper('invalid token', userRegister.authUserId + 1);
    expect(remove).toBe(403);
  });

  test('Testing invalid remove as global owner removing last owner', () => {
    const adminRegister = authRegisterWrapper('lakshaya@unsw.edu.au', 'password123', 'lakshaya', 'Kaushik');
    const remove = adminUserRemoveWrapper(adminRegister.token, adminRegister.authUserId);
    expect(remove).toBe(400);
  });
});

describe('Testing admin User Permission Change', () => {
  test('Testing valid user permission change as global owner promoting a user', () => {
    const adminRegister = authRegisterWrapper('lakshaya@unsw.edu.au', 'password123', 'lakshaya', 'Kaushik');
    const userRegister = authRegisterWrapper('ronny@unsw.edu.au', 'password123', 'ronny', 'G');
    const permissionChange = adminUserPermissionChangeWrapper(adminRegister.token, userRegister.authUserId, 1);
    const remove = adminUserRemoveWrapper(userRegister.token, adminRegister.authUserId);
    expect(permissionChange).toStrictEqual({});
    expect(remove).toStrictEqual({});
  });

  test('Testing valid user permission change as global owner demoting another global owner', () => {
    const adminRegister = authRegisterWrapper('lakshaya@unsw.edu.au', 'password123', 'lakshaya', 'Kaushik');
    const userRegister = authRegisterWrapper('ronny@unsw.edu.au', 'password123', 'ronny', 'G');
    const permissionChange = adminUserPermissionChangeWrapper(adminRegister.token, userRegister.authUserId, 1);
    const permissionChange2 = adminUserPermissionChangeWrapper(userRegister.token, adminRegister.authUserId, 2);
    const remove = adminUserRemoveWrapper(adminRegister.token, userRegister.authUserId);
    expect(remove).toBe(403);
    expect(permissionChange).toStrictEqual({});
    expect(permissionChange2).toStrictEqual({});
  });

  test('Testing invalid user permission change as global owner, user already has permission id of 2', () => {
    const adminRegister = authRegisterWrapper('lakshaya@unsw.edu.au', 'password123', 'lakshaya', 'Kaushik');
    const userRegister = authRegisterWrapper('ronny@unsw.edu.au', 'password123', 'ronny', 'G');
    const permissionChange = adminUserPermissionChangeWrapper(adminRegister.token, userRegister.authUserId, 2);
    expect(permissionChange).toBe(400);
  });

  test('Testing invalid user permission change as global owner with invalid permission level of 3', () => {
    const adminRegister = authRegisterWrapper('lakshaya@unsw.edu.au', 'password123', 'lakshaya', 'Kaushik');
    const userRegister = authRegisterWrapper('ronny@unsw.edu.au', 'password123', 'ronny', 'G');
    const permissionChange = adminUserPermissionChangeWrapper(adminRegister.token, userRegister.authUserId, 3);
    expect(permissionChange).toBe(400);
  });

  test('Testing invalid user permission change as global owner with invalid user id', () => {
    const adminRegister = authRegisterWrapper('lakshaya@unsw.edu.au', 'password123', 'lakshaya', 'Kaushik');
    const userRegister = authRegisterWrapper('ronny@unsw.edu.au', 'password123', 'ronny', 'G');
    const permissionChange = adminUserPermissionChangeWrapper(adminRegister.token, userRegister.authUserId + 1, 1);
    expect(permissionChange).toBe(400);
  });

  test('Testing invalid user permission change as non global owner', () => {
    const adminRegister = authRegisterWrapper('lakshaya@unsw.edu.au', 'password123', 'lakshaya', 'Kaushik');
    const userRegister = authRegisterWrapper('ronny@unsw.edu.au', 'password123', 'ronny', 'G');
    const permissionChange = adminUserPermissionChangeWrapper(userRegister.token, adminRegister.authUserId, 2);
    expect(permissionChange).toBe(403);
  });

  test('Testing invalid token for user permission change', () => {
    authRegisterWrapper('lakshaya@unsw.edu.au', 'password123', 'lakshaya', 'Kaushik');
    const userRegister = authRegisterWrapper('ronny@unsw.edu.au', 'password123', 'ronny', 'G');
    const permissionChange = adminUserPermissionChangeWrapper('invalid token', userRegister.authUserId, 1);
    expect(permissionChange).toBe(403);
  });

  test('Testing demoting the last admin in the system', () => {
    const adminRegister = authRegisterWrapper('lakshaya@unsw.edu.au', 'password123', 'lakshaya', 'Kaushik');
    const permissionChange = adminUserPermissionChangeWrapper(adminRegister.token, adminRegister.authUserId, 2);
    expect(permissionChange).toBe(400);
  });

  test('Testing invalid user permission change as global owner with invalid permission level of 0', () => {
    const adminRegister = authRegisterWrapper('lakshaya@unsw.edu.au', 'password123', 'lakshaya', 'Kaushik');
    const userRegister = authRegisterWrapper('ronny@unsw.edu.au', 'password123', 'ronny', 'G');
    const permissionChange = adminUserPermissionChangeWrapper(adminRegister.token, userRegister.authUserId, 0);
    expect(permissionChange).toBe(400);
  });
});
