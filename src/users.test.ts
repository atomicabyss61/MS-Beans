import request, { HttpVerb } from 'sync-request';
import { port, url } from './config.json';
import { getCurrentTime } from './other';

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
function userProfileWrapper(token: string, uId: number): any {
  return requestHelper('GET', '/user/profile/v3', { uId: uId }, token);
}
function userProfileSetNameWrapper(token: string, nameFirst: string, nameLast: string): any {
  return requestHelper('PUT', '/user/profile/setname/v2', { nameFirst: nameFirst, nameLast: nameLast }, token);
}
function userProfileSetEmailWrapper(token: string, email: string): any {
  return requestHelper('PUT', '/user/profile/setemail/v2', { email: email }, token);
}
function userProfileSetHandleWrapper(token: string, handleStr: string): any {
  return requestHelper('PUT', '/user/profile/sethandle/v2', { handleStr: handleStr }, token);
}
function usersAllWrapper(token: string): any {
  return requestHelper('GET', '/users/all/v2', {}, token);
}
function userProfileUploadphotoWrapper(token: string, imgUrl: string, xStart: number, yStart: number, xEnd: number, yEnd: number): any {
  return requestHelper('POST', '/user/profile/uploadphoto/v1', { imgUrl, xStart, yStart, xEnd, yEnd }, token);
}
function userStatsWrapper(token: string): any {
  return requestHelper('GET', '/user/Stats/v1', {}, token);
}
function usersStatsWrapper(token: string): any {
  return requestHelper('GET', '/users/Stats/v1', {}, token);
}
function channelsCreateWrapper(token: string, name: string, isPublic: boolean): any {
  return requestHelper('POST', '/channels/create/v3', { name: name, isPublic: isPublic }, token);
}
function messageSendWrapper(token: string, channelId: number, message: string): any {
  return requestHelper('POST', '/message/send/v2', { channelId: channelId, message: message }, token);
}
function dmCreateWrapper(token: string, uIds: number[]): any {
  return requestHelper('POST', '/dm/create/v2', { uIds: uIds }, token);
}
function messageSendLaterWrapper(token: string, channelId: number, message: string, timeSent: number): any {
  return requestHelper('POST', '/message/sendlater/v1', { channelId: channelId, message: message, timeSent: timeSent }, token);
}
function messageSendDmWrapper(token: string, dmId: number, message: string):any {
  return requestHelper('POST', '/message/senddm/v2', { dmId: dmId, message: message }, token);
}
function messageSendDmLaterWrapper(token: string, dmId: number, message: string, timeSent: number):any {
  return requestHelper('POST', '/message/sendlaterdm/v1', { dmId: dmId, message: message, timeSent: timeSent }, token);
}

describe('Testing authLoginV1', () => {
  test('Checking error cases', () => {
    expect(userProfileWrapper('1', 1)).toStrictEqual(403);
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    expect(userProfileWrapper(user.token, user.authUserId + 1)).toBe(400);
    expect(userProfileWrapper(user.token + 1, user.authUserId)).toBe(403);
  });
  test('Testing a user checking themselves', () => {
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    expect(userProfileWrapper(user.token, user.authUserId)).toStrictEqual({
      user: {
        uId: user.authUserId,
        email: 'dan@unsw.com',
        nameFirst: 'Dan',
        nameLast: 'Field',
        handleStr: 'danfield',
        profileImgUrl: expect.any(String),
      }
    });
  });
  test('Testing a user checking another user', () => {
    const viewer = authRegisterWrapper('john@unsw.com', 'mypassword', 'John', 'Smith');
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    expect(userProfileWrapper(viewer.token, user.authUserId)).toStrictEqual({
      user: {
        uId: user.authUserId,
        email: 'dan@unsw.com',
        nameFirst: 'Dan',
        nameLast: 'Field',
        handleStr: 'danfield',
        profileImgUrl: expect.any(String),
      }
    });
    expect(userProfileWrapper(viewer.token, user.authUserId).user.email).toStrictEqual('dan@unsw.com');
  });
});

describe('Testing userProfileSetNameV1', () => {
  test('Error checking', () => {
    const user = authRegisterWrapper('user@ad.unsw.edu.au', 'password', 'firstName', 'lastName');
    const token = user.token;
    expect(userProfileSetNameWrapper(token, '', 'newLastName')).toStrictEqual(400);
    expect(userProfileSetNameWrapper(token, 'this is an invalid name as it is over 50 characters long', 'newLastName')).toStrictEqual(400);
    expect(userProfileSetNameWrapper(token, 'newFirstName', '')).toStrictEqual(400);
    expect(userProfileSetNameWrapper(token, 'firstName', 'this is an invalid name as it is over 50 characters long')).toStrictEqual(400);
    expect(userProfileSetNameWrapper('1', 'firstName', 'lastName')).toStrictEqual(403);
  });
  test('Updating first and last name', () => {
    const user = authRegisterWrapper('user@ad.unsw.edu.au', 'password', 'firstName', 'lastName');
    const token = user.token;
    expect(userProfileSetNameWrapper(token, 'newFirstName', 'newLastName')).toStrictEqual({});
    const id = user.authUserId;
    expect(userProfileWrapper(token, id).user.nameFirst).toStrictEqual('newFirstName');
    expect(userProfileWrapper(token, id).user.nameLast).toStrictEqual('newLastName');
  });
});

describe('Testing userProfileSetEmailV1', () => {
  test('Error checking', () => {
    const user = authRegisterWrapper('user@ad.unsw.edu.au', 'password', 'firstName', 'lastName');
    const token = user.token;
    expect(userProfileSetEmailWrapper(token, 'invalid email')).toStrictEqual(400);
    authRegisterWrapper('takenEmail@ad.unsw.edu.au', 'password', 'firstName', 'lastName');
    expect(userProfileSetEmailWrapper(token, 'takenEmail@ad.unsw.edu.au')).toStrictEqual(400);
    expect(userProfileSetEmailWrapper('1', 'newEmail@gmail.com')).toStrictEqual(403);
  });
  test('Updating email', () => {
    const user = authRegisterWrapper('user@ad.unsw.edu.au', 'password', 'firstName', 'lastName');
    const token = user.token;
    expect(userProfileSetEmailWrapper(token, 'newEmail@unsw.com')).toStrictEqual({});
    const id = user.authUserId;
    expect(userProfileWrapper(token, id).user.email).toStrictEqual('newEmail@unsw.com');
  });
});

describe('Testing userProfileSetHandleV1', () => {
  test('Error checking', () => {
    const user = authRegisterWrapper('user@ad.unsw.edu.au', 'password', 'firstName', 'lastName');
    const token = user.token;
    expect(userProfileSetHandleWrapper(token, '')).toStrictEqual(400);
    expect(userProfileSetHandleWrapper(token, 'invalidhandleover20characterslong')).toStrictEqual(400);
    expect(userProfileSetHandleWrapper(token, 'inv@l!d h@nd!e')).toStrictEqual(400);
    userProfileSetHandleWrapper(token, 'takenHandle');
    const anotherUser = authRegisterWrapper('anotherUser@ad.unsw.edu.au', 'password', 'firstName', 'lastName');
    expect(userProfileSetHandleWrapper(anotherUser.token, 'takenHandle')).toStrictEqual(400);
    expect(userProfileSetHandleWrapper('1', 'validHandle')).toStrictEqual(403);
  });
  test('Updating handle', () => {
    const user = authRegisterWrapper('user@ad.unsw.edu.au', 'password', 'firstName', 'lastName');
    const token = user.token;
    expect(userProfileSetHandleWrapper(token, 'validHandle')).toStrictEqual({});
    const id = user.authUserId;
    expect(userProfileWrapper(token, id).user.handleStr).toStrictEqual('validHandle');
  });
});

describe('Testing UserAllV1', () => {
  test('Checking error cases', () => {
    expect(userProfileWrapper('1', 1)).toStrictEqual(403);
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    expect(usersAllWrapper(user.token + 1)).toStrictEqual(403);
  });
  test('Testing a user checking themselves', () => {
    const user1 = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    authRegisterWrapper('dan1@unsw.com', 'mypassword', 'Dan1', 'Field1');
    authRegisterWrapper('dan2@unsw.com', 'mypassword', 'Dan2', 'Field2');
    expect(usersAllWrapper(user1.token).users).toStrictEqual([
      {
        uId: expect.any(Number),
        email: 'dan@unsw.com',
        nameFirst: 'Dan',
        nameLast: 'Field',
        handleStr: 'danfield',
        profileImgUrl: expect.any(String),
      },
      {
        uId: expect.any(Number),
        email: 'dan1@unsw.com',
        nameFirst: 'Dan1',
        nameLast: 'Field1',
        handleStr: 'dan1field1',
        profileImgUrl: expect.any(String),
      },
      {
        uId: expect.any(Number),
        email: 'dan2@unsw.com',
        nameFirst: 'Dan2',
        nameLast: 'Field2',
        handleStr: 'dan2field2',
        profileImgUrl: expect.any(String),
      },
    ]);
  });
});

describe('Testing user/profile/uploadphoto/v1', () => {
  test('Error checking', () => {
    expect(userProfileUploadphotoWrapper('u', 'http://upload.wikimedia.org/wikipedia/en/5/58/Instagram_potato.jpg', 50, 50, 170, 170)).toStrictEqual(403);
    const user = authRegisterWrapper('test@gmail.com', 'password', 'test', 'user');
    expect(userProfileUploadphotoWrapper(user.token, 'http://upload.wikimedia.org/wikipedia/en/5/58/Instagram_potato.jpg', 50, 50, 170, 170)).toStrictEqual(400);
    expect(userProfileUploadphotoWrapper(user.token, 'http://upload.wikimedia.org/wikipedia/en/5/58/Instagram_egg.jpg', -1, 50, 170, 170)).toStrictEqual(400);
    expect(userProfileUploadphotoWrapper(user.token, 'http://upload.wikimedia.org/wikipedia/en/5/58/Instagram_egg.jpg', 50, -1, 170, 170)).toStrictEqual(400);
    expect(userProfileUploadphotoWrapper(user.token, 'http://upload.wikimedia.org/wikipedia/en/5/58/Instagram_egg.jpg', 50, 50, 1000, 170)).toStrictEqual(400);
    expect(userProfileUploadphotoWrapper(user.token, 'http://upload.wikimedia.org/wikipedia/en/5/58/Instagram_egg.jpg', 50, 50, 170, 1000)).toStrictEqual(400);
    expect(userProfileUploadphotoWrapper(user.token, 'http://upload.wikimedia.org/wikipedia/en/5/58/Instagram_egg.jpg', 170, 50, 50, 170)).toStrictEqual(400);
    expect(userProfileUploadphotoWrapper(user.token, 'http://upload.wikimedia.org/wikipedia/en/5/58/Instagram_egg.jpg', 50, 170, 170, 50)).toStrictEqual(400);
    expect(userProfileUploadphotoWrapper(user.token, 'http://www.pngmart.com/files/11/Instagram-Egg-PNG-Photos.png', 50, 50, 170, 170)).toStrictEqual(400);
  });

  test('Successful crop and set', () => {
    const user = authRegisterWrapper('test@gmail.com', 'password', 'test', 'user');
    expect(userProfileUploadphotoWrapper(user.token, 'http://upload.wikimedia.org/wikipedia/en/5/58/Instagram_egg.jpg', 50, 50, 170, 170)).toStrictEqual({});
  });
});

describe('Testing UserStatsV1', () => {
  test('Checking error cases', () => {
    expect(userStatsWrapper('1')).toStrictEqual(403);
  });
  test('Checking error cases 2', () => {
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    expect(userStatsWrapper(user.token + 1)).toStrictEqual(403);
  });
  test('Returning stats for a new user with no stats', () => {
    const person = authRegisterWrapper('NarutoSasuke@gmail.com', 'LeafPassword', 'Naruto', 'Uzumaki');
    expect(userStatsWrapper(person.token).userStats).toStrictEqual({
      channelsJoined: [{ numChannelsJoined: 0, timeStamp: expect.any(Number) }],
      dmsJoined: [{ numDmsJoined: 0, timeStamp: expect.any(Number) }],
      messagesSent: [{ numMessagesSent: 0, timeStamp: expect.any(Number) }],
      involvementRate: 0
    });
  });
  test('Returning stats for user with 1 channel joined', () => {
    const person = authRegisterWrapper('NarutoSasuke@gmail.com', 'LeafPassword', 'Naruto', 'Uzumaki');
    channelsCreateWrapper(person.token, 'ChannelName', true);
    expect(userStatsWrapper(person.token).userStats).toStrictEqual({
      channelsJoined: [
        { numChannelsJoined: 0, timeStamp: expect.any(Number) },
        { numChannelsJoined: 1, timeStamp: expect.any(Number) }
      ],
      dmsJoined: [{ numDmsJoined: 0, timeStamp: expect.any(Number) }],
      messagesSent: [{ numMessagesSent: 0, timeStamp: expect.any(Number) }],
      involvementRate: 1
    });
  });
  test('Returning stats for user with 1 dm joined', () => {
    const person = authRegisterWrapper('NarutoSasuke@gmail.com', 'LeafPassword', 'Naruto', 'Uzumaki');
    authRegisterWrapper('Grimaldo@gmail.com', 'Password777', 'Grimaldo', 'King');
    dmCreateWrapper(person.token, []);
    expect(userStatsWrapper(person.token).userStats).toStrictEqual({
      channelsJoined: [{ numChannelsJoined: 0, timeStamp: expect.any(Number) }],
      dmsJoined: [
        { numDmsJoined: 0, timeStamp: expect.any(Number) },
        { numDmsJoined: 1, timeStamp: expect.any(Number) }
      ],
      messagesSent: [{ numMessagesSent: 0, timeStamp: expect.any(Number) }],
      involvementRate: 1
    });
  });
  test('Returning stats for user with 1 message sent', () => {
    const person = authRegisterWrapper('NarutoSasuke@gmail.com', 'LeafPassword', 'Naruto', 'Uzumaki');
    const random = authRegisterWrapper('Grimaldo@gmail.com', 'Password777', 'Grimaldo', 'King');
    dmCreateWrapper(random.token, []);
    const channel = channelsCreateWrapper(person.token, 'ChannelName', true);
    messageSendWrapper(person.token, channel.channelId, 'Hello mate!');
    messageSendLaterWrapper(person.token, channel.channelId, 'hello', getCurrentTime() + 3);
    expect(userStatsWrapper(person.token).userStats).toStrictEqual({
      channelsJoined: [
        { numChannelsJoined: 0, timeStamp: expect.any(Number) },
        { numChannelsJoined: 1, timeStamp: expect.any(Number) }
      ],
      dmsJoined: [{ numDmsJoined: 0, timeStamp: expect.any(Number) }],
      messagesSent: [
        { numMessagesSent: 0, timeStamp: expect.any(Number) },
        { numMessagesSent: 1, timeStamp: expect.any(Number) }
      ],
      involvementRate: 2 / 3,
    });
  });
  test('Returning stats with workspace with high use', () => {
    const person = authRegisterWrapper('NarutoSasuke@gmail.com', 'LeafPassword', 'Naruto', 'Uzumaki');
    authRegisterWrapper('Grimaldo@gmail.com', 'Password777', 'Grimaldo', 'King');
    const person2 = authRegisterWrapper('hellow@gmail.com', 'Password777', 'nope', 'cause');
    const channel = channelsCreateWrapper(person.token, 'ChannelName', true);
    channelsCreateWrapper(person2.token, 'ChannelName', true);
    messageSendWrapper(person.token, channel.channelId, 'Hello mate!');
    expect(userStatsWrapper(person.token).userStats).toStrictEqual({
      channelsJoined: [
        { numChannelsJoined: 0, timeStamp: expect.any(Number) },
        { numChannelsJoined: 1, timeStamp: expect.any(Number) }
      ],
      dmsJoined: [{ numDmsJoined: 0, timeStamp: expect.any(Number) }],
      messagesSent: [
        { numMessagesSent: 0, timeStamp: expect.any(Number) },
        { numMessagesSent: 1, timeStamp: expect.any(Number) }
      ],
      involvementRate: 0.6666666666666666
    });
  });
});

describe('Testing UsersStatsV1', () => {
  test('Checking error cases', () => {
    expect(usersStatsWrapper('1')).toStrictEqual(403);
  });
  test('Checking error cases 2', () => {
    const user = authRegisterWrapper('dan@unsw.com', 'mypassword', 'Dan', 'Field');
    expect(usersStatsWrapper(user.token + 1)).toStrictEqual(403);
  });
  test('Returning stats for a new user with no stats', () => {
    const person = authRegisterWrapper('NarutoSasuke@gmail.com', 'LeafPassword', 'Naruto', 'Uzumaki');
    expect(usersStatsWrapper(person.token).workspaceStats).toStrictEqual({
      channelsExist: [{ numChannelsExist: 0, timeStamp: expect.any(Number) }],
      dmsExist: [{ numDmsExist: 0, timeStamp: expect.any(Number) }],
      messagesExist: [{ numMessagesExist: 0, timeStamp: expect.any(Number) }],
      utilizationRate: 0
    });
  });
  test('Returning stats for a user with 1 channel existing', () => {
    const person = authRegisterWrapper('NarutoSasuke@gmail.com', 'LeafPassword', 'Naruto', 'Uzumaki');
    channelsCreateWrapper(person.token, 'ChannelName', true);
    expect(usersStatsWrapper(person.token).workspaceStats).toStrictEqual({
      channelsExist: [
        { numChannelsExist: 0, timeStamp: expect.any(Number) },
        { numChannelsExist: 1, timeStamp: expect.any(Number) }
      ],
      dmsExist: [{ numDmsExist: 0, timeStamp: expect.any(Number) }],
      messagesExist: [{ numMessagesExist: 0, timeStamp: expect.any(Number) }],
      utilizationRate: 1
    });
  });
  test('Returning stats for user with 1 dm exisitng', () => {
    const person = authRegisterWrapper('NarutoSasuke@gmail.com', 'LeafPassword', 'Naruto', 'Uzumaki');
    const random = authRegisterWrapper('Grimaldo@gmail.com', 'Password777', 'Grimaldo', 'King');
    dmCreateWrapper(random.token, []);
    const dm = dmCreateWrapper(person.token, [person.authUserId]);
    messageSendDmWrapper(person.token, dm.dmId, 'Hello mate!');
    messageSendDmLaterWrapper(person.token, dm.dmId, 'hello', getCurrentTime() + 3);
    expect(usersStatsWrapper(person.token).workspaceStats).toStrictEqual({
      channelsExist: [{ numChannelsExist: 0, timeStamp: expect.any(Number) }],
      dmsExist: [
        { numDmsExist: 0, timeStamp: expect.any(Number) },
        { numDmsExist: 1, timeStamp: expect.any(Number) },
        { numDmsExist: 2, timeStamp: expect.any(Number) },
      ],
      messagesExist: [
        { numMessagesExist: 0, timeStamp: expect.any(Number) },
        { numMessagesExist: 1, timeStamp: expect.any(Number) },
      ],
      utilizationRate: 1,
    });
  });
  test('Returning stats for user with 1 message existing', () => {
    const person = authRegisterWrapper('NarutoSasuke@gmail.com', 'LeafPassword', 'Naruto', 'Uzumaki');
    authRegisterWrapper('Grimaldo@gmail.com', 'Password777', 'Grimaldo', 'King');
    const channel = channelsCreateWrapper(person.token, 'ChannelName', true);
    messageSendWrapper(person.token, channel.channelId, 'Hello mate!');
    messageSendLaterWrapper(person.token, channel.channelId, 'hello', getCurrentTime() + 3);
    expect(usersStatsWrapper(person.token).workspaceStats).toStrictEqual({
      channelsExist: [
        { numChannelsExist: 0, timeStamp: expect.any(Number) },
        { numChannelsExist: 1, timeStamp: expect.any(Number) }
      ],
      dmsExist: [{ numDmsExist: 0, timeStamp: expect.any(Number) }],
      messagesExist: [
        { numMessagesExist: 0, timeStamp: expect.any(Number) },
        { numMessagesExist: 1, timeStamp: expect.any(Number) }
      ],
      utilizationRate: 0.5
    });
  });
});
