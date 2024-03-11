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
function userProfileWrapper(token: string, uId: number): any {
  return requestHelper('GET', '/user/profile/v3', { uId: uId }, token);
}
function channelsCreateWrapper(token: string, name: string, isPublic: boolean): any {
  return requestHelper('POST', '/channels/create/v3', { name: name, isPublic: isPublic }, token);
}
function channelDetailsWrapper(token: string, channelId: number): any {
  return requestHelper('GET', '/channel/details/v3', { channelId: channelId }, token);
}
function channelJoinWrapper(token: string, channelId: number): any {
  return requestHelper('POST', '/channel/join/v3', { channelId: channelId }, token);
}
function channelInviteWrapper(token: string, channelId: number, uId: number): any {
  return requestHelper('POST', '/channel/invite/v3', { channelId: channelId, uId: uId }, token);
}
function channelMessagesWrapper(token: string, channelId: number, start: number): any {
  return requestHelper('GET', '/channel/messages/v3', { channelId: channelId, start: start }, token);
}
function messageSendWrapper(token: string, channelId: number, message: string): any {
  return requestHelper('POST', '/message/send/v2', { channelId: channelId, message: message }, token);
}
function channelLeaveWrapper(token: string, channelId: number): any {
  return requestHelper('POST', '/channel/leave/v2', { channelId: channelId }, token);
}
function channelAddOwnerWrapper(token: string, channelId: number, uId: number): any {
  return requestHelper('POST', '/channel/addowner/v2', { channelId: channelId, uId: uId }, token);
}
function channelRemoveOwnerWrapper(token: string, channelId: number, uId: number): any {
  return requestHelper('POST', '/channel/removeowner/v2', { channelId: channelId, uId: uId }, token);
}
function standupStartWrapper(token: string, channelId: number, length: number): any {
  return requestHelper('POST', '/standup/start/v1', { channelId: channelId, length: length }, token);
}

/*
 * Tests for channelJoinWrapper.
 */

describe('Invalid argument in channelJoinWrapper', () => {
  test('invalid authUserId', () => {
    const userId1 = authRegisterWrapper('the@email.com', 'password', 'jeff', 'bob');
    authRegisterWrapper('the1@email.com', 'password', 'jeff', 'bob');
    const channelId = channelsCreateWrapper(userId1.token, 'COMP1531', true).channelId;
    expect(channelJoinWrapper('1', channelId)).toStrictEqual(403);
  });

  test('authuserId does not exist', () => {
    const userId1 = authRegisterWrapper('the@email.com', 'password', 'jeff', 'bob');
    authRegisterWrapper('the1@email.com', 'password', 'jeff', 'bob');
    const channelId = channelsCreateWrapper(userId1.token, 'COMP1531', true).channelId;
    expect(channelJoinWrapper(userId1.token + 1, channelId)).toBe(403);
  });

  test('invalid channelId', () => {
    const userId1 = authRegisterWrapper('the@email.com', 'password', 'jeff', 'bob');
    const userId2 = authRegisterWrapper('the1@email.com', 'password', 'jeff', 'bob');
    channelsCreateWrapper(userId1.token, 'COMP1531', true);
    expect(channelJoinWrapper(userId2.token, 99)).toBe(400);
  });

  test('channelId does not exist', () => {
    const userId1 = authRegisterWrapper('the@email.com', 'password', 'jeff', 'bob');
    const userId2 = authRegisterWrapper('the1@email.com', 'password', 'jeff', 'bob');
    const channelId = channelsCreateWrapper(userId1.token, 'COMP1531', true).channelId;
    expect(channelJoinWrapper(userId2.token, channelId + 1)).toBe(400);
  });

  test('authuserId is already a member of the channel', () => {
    const userId1 = authRegisterWrapper('the@email.com', 'password', 'jeff', 'bob');
    authRegisterWrapper('the1@email.com', 'password', 'jeff', 'bob');
    const channelId = channelsCreateWrapper(userId1.token, 'COMP1531', true).channelId;
    expect(channelJoinWrapper(userId1.token, channelId)).toBe(403);
  });

  test('channelId is private, authUserId not channel member and is not a global owner', () => {
    const userId1 = authRegisterWrapper('the@email.com', 'password', 'jeff', 'bob');
    const userId2 = authRegisterWrapper('the1@email.com', 'password', 'jeff1', 'bob1');
    const channelId = channelsCreateWrapper(userId1.token, 'COMP1531', false).channelId;
    // console.log(userId2.token, channelId)
    expect(channelJoinWrapper(userId2.token, channelId)).toBe(403);
  });
});

/*
 * Tests for channelDetailsWrapper.
 */

describe('Invalid argument in channelDetailsWrapper', () => {
  test('invalid authUserId', () => {
    const userId1 = authRegisterWrapper('the@email.com', 'password', 'jeff', 'bob');
    const userId2 = authRegisterWrapper('lol@email.com', 'password', 'lol', 'lol');
    const channelId = channelsCreateWrapper(userId1.token, 'COMP1531', true).channelId;
    expect(channelDetailsWrapper('1', channelId)).toBe(403);
    expect(channelDetailsWrapper(userId2.token, channelId)).toBe(403);
  });

  test('authuserId does not exist', () => {
    const userId1 = authRegisterWrapper('the@email.com', 'password', 'jeff', 'bob');
    const channelId = channelsCreateWrapper(userId1.token, 'COMP1531', true).channelId;
    expect(channelDetailsWrapper('1', channelId)).toBe(403);
  });

  test('invalid channelId', () => {
    const userId1 = authRegisterWrapper('the@email.com', 'password', 'jeff', 'bob');
    channelsCreateWrapper(userId1.token, 'COMP1531', true);
    expect(channelDetailsWrapper(userId1.token, 99)).toBe(400);
  });

  test('channelId does not exist', () => {
    const userId1 = authRegisterWrapper('the@email.com', 'password', 'jeff', 'bob');
    const channelId = channelsCreateWrapper(userId1.token, 'COMP1531', true).channelId;
    expect(channelDetailsWrapper(userId1.token, channelId + 1)).toBe(400);
  });

  // test('channelId is valid and the authorised user is not a member of the channel', () => {
  //   const userId1 = authRegisterWrapper('the@email.com', 'password', 'jeff', 'bob');
  //   const userId2 = authRegisterWrapper('the1@email', 'password', 'jeff', 'bob');
  //   const channelId = channelsCreateWrapper(userId1.token, 'COMP1531', true).channelId;
  //   expect(channelDetailsWrapper(userId2.token, channelId)).toBe(403);
  // });
});

describe('basic valid arguments in channelJoinWrapper and channelDetailV1', () => {
  test('case 1', () => {
    const userId1 = authRegisterWrapper('the@email.com', 'password', 'jeff', 'bob');
    const userId2 = authRegisterWrapper('the1@email.com', 'password', 'jeff', 'bob');
    const channelId = channelsCreateWrapper(userId1.token, 'COMP1531', true);
    expect(channelJoinWrapper(userId2.token, channelId.channelId)).toStrictEqual({});
  });

  test('case 2', () => {
    const userId1 = authRegisterWrapper('the@email.com', 'password', 'jeff', 'bob');
    const channelId = channelsCreateWrapper(userId1.token, 'COMP1531', true);
    expect(channelDetailsWrapper(userId1.token, channelId.channelId)).toStrictEqual({
      name: 'COMP1531',
      isPublic: true,
      ownerMembers: [
        {
          uId: userId1.authUserId,
          email: 'the@email.com',
          nameFirst: 'jeff',
          nameLast: 'bob',
          handleStr: 'jeffbob',
          profileImgUrl: expect.any(String)
        }
      ],
      allMembers: [
        {
          uId: userId1.authUserId,
          email: 'the@email.com',
          nameFirst: 'jeff',
          nameLast: 'bob',
          handleStr: 'jeffbob',
          profileImgUrl: expect.any(String)
        }
      ],
    });
  });
});

describe('channelDetailsWrapper and channelJoinWrapper final testing', () => {
  test('2 users add', () => {
    const auth1 = authRegisterWrapper('lab@ad.unsw.edu.au', 'password', 'jeff', 'smith');
    const auth2 = authRegisterWrapper('proj@ad.unsw.edu.au', 'password', 'jeff', 'smith');
    const channel = channelsCreateWrapper(auth1.token, 'COMP1531', true);
    channelJoinWrapper(auth2.token, channel.channelId);
    expect(channelDetailsWrapper(auth1.token, channel.channelId)).toStrictEqual(
      {
        name: 'COMP1531',
        isPublic: true,
        ownerMembers: [
          userProfileWrapper(auth1.token, auth1.authUserId).user,
        ],
        allMembers: [
          userProfileWrapper(auth1.token, auth1.authUserId).user,
          userProfileWrapper(auth1.token, auth2.authUserId).user,
        ]
      }
    );
  });
});

/*
 * Tests for channel/invite/v2 route
 */

describe('Checking invalid arguments', () => {
  test('channelId does not refer to valid channel (no channels made)', () => {
    const user1 = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const user2 = authRegisterWrapper('secondguy@gmail.com', '123456', 'Second', 'Dude');
    expect(channelInviteWrapper(user1.token, 2, user2.authUserId)).toStrictEqual(400);
  });

  test('channelId does not refer to valid channel (one channel made)', () => {
    const user1 = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const user2 = authRegisterWrapper('secondguy@gmail.com', '123456', 'Second', 'Dude');

    const channel = channelsCreateWrapper(user1.token, 'General', true);
    const invalidCId = channel.channelId + 1;
    expect(channelInviteWrapper(user1.token, invalidCId, user2.authUserId)).toStrictEqual(400);
  });

  test('uId does not refer to valid user', () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const invalidUId = user.authUserId + 1;
    const channel = channelsCreateWrapper(user.token, 'General', true);
    expect(channelInviteWrapper(user.token, channel.channelId, invalidUId)).toStrictEqual(400);
  });

  test('uId refers to existing member of public and private channel', () => {
    const user1 = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const user2 = authRegisterWrapper('guy2@email.com', '123456', 'Guy', 'Two');

    const publicChannel = channelsCreateWrapper(user1.token, 'Channel', true);
    channelInviteWrapper(user1.token, publicChannel.channelId, user2.authUserId);
    expect(channelInviteWrapper(user1.token, publicChannel.channelId, user2.authUserId)).toStrictEqual(400);
  });

  test('Authorised user is not a member of public and private channel', () => {
    const user1 = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One');
    const user2 = authRegisterWrapper('notin@email.com', '123456', 'The', 'Inviter');
    const user3 = authRegisterWrapper('another@email.com', '2342124', 'Not', 'In');

    const channel = channelsCreateWrapper(user1.token, 'Channel', true);
    expect(channelInviteWrapper(user2.token, channel.channelId, user3.authUserId)).toStrictEqual(403);
  });

  test('Token refers to invalid authorised user', () => {
    const user1 = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One');
    const user2 = authRegisterWrapper('notin@email.com', '123456', 'Ash', 'Ketchum');
    const secret = channelsCreateWrapper(user1.token, 'Secret Place', false);
    expect(channelInviteWrapper('1', secret.channelId, user2.authUserId)).toStrictEqual(403);
  });
});

describe('Valid arguments', () => {
  test('Inviting a user to multiple channels', () => {
    const user1 = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One');
    const user2 = authRegisterWrapper('notin@email.com', '123456', 'Ash', 'Ketchum');
    const user3 = authRegisterWrapper('another@email.com', '2342124', 'Richard', 'Third');

    const channel1 = channelsCreateWrapper(user1.token, 'Da One Channel', true);
    expect(channelInviteWrapper(user1.token, channel1.channelId, user2.authUserId)).toStrictEqual({});
    const channel3 = channelsCreateWrapper(user3.token, 'More Awesomer', !true);
    expect(channelInviteWrapper(user3.token, channel3.channelId, user2.authUserId)).toStrictEqual({});

    expect(channelDetailsWrapper(user1.token, channel1.channelId).ownerMembers).toStrictEqual([
      userProfileWrapper(user1.token, user1.authUserId).user,
    ]);

    expect(new Set(channelDetailsWrapper(user1.token, channel1.channelId).allMembers)).toStrictEqual(
      new Set([
        userProfileWrapper(user1.token, user2.authUserId).user,
        userProfileWrapper(user1.token, user1.authUserId).user,
      ])
    );

    expect(channelDetailsWrapper(user3.token, channel3.channelId).ownerMembers).toStrictEqual([
      userProfileWrapper(user1.token, user3.authUserId).user,
    ]);

    expect(new Set(channelDetailsWrapper(user3.token, channel3.channelId).allMembers)).toStrictEqual(
      new Set([
        userProfileWrapper(user1.token, user3.authUserId).user,
        userProfileWrapper(user1.token, user2.authUserId).user,
      ])
    );
  });
});

/*
 * Tests for channel/messages/v2 route
 */

describe('Testing invalid arguments', () => {
  test('channelId does not refer to valid channel', () => {
    const token = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One').token;
    expect(channelMessagesWrapper(token, 1, 0)).toBe(400);
  });

  test('start is greater than number of messages in channel', () => {
    const token = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One').token;
    const cId = channelsCreateWrapper(token, 'Channel', true).channelId;
    expect(channelMessagesWrapper(token, cId, 1)).toBe(400);
  });

  test('authorised user is not member of channel', () => {
    const token1 = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One').token;
    const token2 = authRegisterWrapper('notin@email.com', '123456', 'Ash', 'Ketchum').token;
    const cId = channelsCreateWrapper(token1, 'Channel', true).channelId;
    expect(channelMessagesWrapper(token2, cId, 0)).toBe(403);
  });

  test('token is invalid', () => {
    const token = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One').token;
    const cId = channelsCreateWrapper(token, 'Channel', true).channelId;
    expect(channelMessagesWrapper('1', cId, 0)).toBe(403);
  });
});

describe('Valid arguments', () => {
  test('Successful return type with no messages in channel', () => {
    const token = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One').token;
    const cId = channelsCreateWrapper(token, 'Channel', true).channelId;
    expect(channelMessagesWrapper(token, cId, 0)).toStrictEqual(
      {
        messages: [],
        start: 0,
        end: -1,
      }
    );
  });

  test('Successful return type with one message in channel', () => {
    const userObj = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One');
    const token = userObj.token;
    const uId = userObj.authUserId;
    const cId = channelsCreateWrapper(token, 'Channel', true).channelId;

    const expectedTimeSent = Math.floor(Date.now() / 1000);
    messageSendWrapper(token, cId, 'Hello there');

    const channelMessagesObj = channelMessagesWrapper(token, cId, 0);
    expect(channelMessagesObj.messages.length).toStrictEqual(1);

    const messageObj = channelMessagesObj.messages[0];

    expect(messageObj.messageId).toStrictEqual(expect.any(Number));
    expect(messageObj.uId).toStrictEqual(uId);
    expect(messageObj.message).toStrictEqual('Hello there');
    expect(messageObj.timeSent).toBeGreaterThanOrEqual(expectedTimeSent);
    expect(messageObj.timeSent).toBeLessThanOrEqual(expectedTimeSent + 2);

    expect(channelMessagesObj.start).toStrictEqual(0);
    expect(channelMessagesObj.end).toStrictEqual(-1);

    expect(channelMessagesWrapper(token, cId, 1)).toStrictEqual(
      {
        messages: [],
        start: 1,
        end: -1,
      }
    );
  });

  test('Return type with 51 messages in channel', () => {
    const userObj = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One');
    const token = userObj.token;
    const cId = channelsCreateWrapper(token, 'Channel', true).channelId;

    for (let i = 1; i <= 51; i++) {
      messageSendWrapper(token, cId, `${i}`);
    }
    let channelMessagesObj = channelMessagesWrapper(token, cId, 0);
    expect(channelMessagesObj.messages.length).toStrictEqual(50);

    for (let i = 0; i < 50; i++) {
      expect(channelMessagesObj.messages[i].message).toStrictEqual(`${51 - i}`);
    }
    expect(channelMessagesObj.start).toStrictEqual(0);
    expect(channelMessagesObj.end).toStrictEqual(50);

    // Checking at start index 1
    channelMessagesObj = channelMessagesWrapper(token, cId, 1);
    expect(channelMessagesObj.messages.length).toStrictEqual(50);
    for (let i = 0; i < 50; i++) {
      expect(channelMessagesObj.messages[i].message).toStrictEqual(`${50 - i}`);
    }
    expect(channelMessagesObj.start).toStrictEqual(1);
    expect(channelMessagesObj.end).toStrictEqual(-1);

    // Checking at start index 50
    channelMessagesObj = channelMessagesWrapper(token, cId, 50);
    expect(channelMessagesObj.messages.length).toStrictEqual(1);
    expect(channelMessagesObj.messages[0].message).toStrictEqual('1');
    expect(channelMessagesObj.start).toStrictEqual(50);
    expect(channelMessagesObj.end).toStrictEqual(-1);
  });

  test('Messages from channel owner still remain after channel owner leaves', () => {
    const user1Obj = authRegisterWrapper('person1@gmail.com', 'password', 'Global', 'Owner');
    const token1 = user1Obj.token;
    const id1 = user1Obj.authUserId;
    const user2Obj = authRegisterWrapper('inviteduser@email.com', '123456', 'Invited', 'User');
    const token2 = user2Obj.token;
    const id2 = user2Obj.authUserId;

    // First user creates channel
    const channelId = channelsCreateWrapper(token1, 'Secret', false).channelId;
    // First user invited second user to the channel
    channelInviteWrapper(token1, channelId, id2);

    // Channel owner sends 50 messages
    for (let i = 1; i <= 50; i++) {
      messageSendWrapper(token1, channelId, `${i}`);
    }

    // Channel owner leaves
    channelLeaveWrapper(token1, channelId);

    // Checking channel/messages still shows messages from channel owner
    const channelMessagesObj = channelMessagesWrapper(token2, channelId, 0);
    expect(channelMessagesObj.messages.length).toStrictEqual(50);
    for (let i = 0; i < 50; i++) {
      expect(channelMessagesObj.messages[i].message).toStrictEqual(`${50 - i}`);
      expect(channelMessagesObj.messages[i].uId).toStrictEqual(id1);
    }
  });
});

/*
 * Tests for channel/leave/v1 route
 */

describe('Invalid arguments', () => {
  test('Error when channelId does not refer to valid channel (no channels made)', () => {
    const token = authRegisterWrapper('person1@gmail.com', 'password', 'Global', 'Owner').token;
    expect(channelLeaveWrapper(token, 1)).toStrictEqual(400);
  });

  test('Error when channelId is valid and token belongs to non-member of channel', () => {
    const token = authRegisterWrapper('person1@gmail.com', 'password', 'Global', 'Owner').token;
    const channelId = channelsCreateWrapper(token, 'General', true).channelId;

    const invalidToken = authRegisterWrapper('excluded@gmail.com', 'invalid', 'Non', 'Member').token;
    expect(channelLeaveWrapper(invalidToken, channelId)).toStrictEqual(403);
  });

  test('Error when channel member tries to leave channel twice without joining back', () => {
    const token = authRegisterWrapper('person1@gmail.com', 'password', 'Global', 'Owner').token;
    const channelId = channelsCreateWrapper(token, 'General', true).channelId;

    // Checking member successfully left channel
    expect(channelLeaveWrapper(token, channelId)).toStrictEqual({});
    // Checking error when token belongs to member that does not belong to channel anymore
    expect(channelLeaveWrapper(token, channelId)).toStrictEqual(403);
  });

  test('Error when authorised user is starter of active standup', () => {
    const token = authRegisterWrapper('person1@gmail.com', 'password', 'Global', 'Owner').token;
    const channelId = channelsCreateWrapper(token, 'General', true).channelId;

    standupStartWrapper(token, channelId, 2);
    expect(channelLeaveWrapper(token, channelId)).toStrictEqual(400);
  });

  test('Error when token is invalid', () => {
    const token = authRegisterWrapper('person1@gmail.com', 'password', 'Global', 'Owner').token;
    const channelId = channelsCreateWrapper(token, 'General', true).channelId;

    expect(channelLeaveWrapper(token + 1, channelId)).toStrictEqual(403);
  });
});

describe('Valid arguments', () => {
  test('One member of channel leaves (owner)', () => {
    const token1 = authRegisterWrapper('person1@gmail.com', 'password', 'Global', 'Owner').token;
    const user2Obj = authRegisterWrapper('inviteduser@email.com', '123456', 'Invited', 'User');
    const token2 = user2Obj.token;
    const uId = user2Obj.authUserId;

    // First user creates channel
    const channelId = channelsCreateWrapper(token1, 'General', true).channelId;
    // First user invited second user to the channel
    channelInviteWrapper(token1, channelId, uId);

    // Checking no error when channel owner leaves
    expect(channelLeaveWrapper(token1, channelId)).toStrictEqual({});

    // Checking owners list is empty
    expect(channelDetailsWrapper(token2, channelId).ownerMembers).toStrictEqual([]);
    // Checking only second user is in channel
    expect(channelDetailsWrapper(token2, channelId).allMembers).toStrictEqual([
      userProfileWrapper(token2, uId).user,
    ]);
  });

  test('One member of channel leaves (not owner)', () => {
    const user1Obj = authRegisterWrapper('person1@gmail.com', 'password', 'Global', 'Owner');
    const token1 = user1Obj.token;
    const id1 = user1Obj.authUserId;
    const user2Obj = authRegisterWrapper('inviteduser@email.com', '123456', 'Invited', 'User');
    const token2 = user2Obj.token;
    const id2 = user2Obj.authUserId;

    // First user creates channel
    const channelId = channelsCreateWrapper(token1, 'General', true).channelId;
    // First user invited second user to the channel
    channelInviteWrapper(token1, channelId, id2);

    // Checking no error when channel member leaves
    expect(channelLeaveWrapper(token2, channelId)).toStrictEqual({});

    // Checking owners list is not empty
    expect(channelDetailsWrapper(token1, channelId).ownerMembers).toStrictEqual([
      userProfileWrapper(token1, id1).user,
    ]);
    // Checking only first user is in channel
    expect(channelDetailsWrapper(token1, channelId).allMembers).toStrictEqual([
      userProfileWrapper(token2, id1).user,
    ]);
  });
});

/*
 * Tests for channel/addowner/v1 route
 */

describe('Testing invalid arguments', () => {
  test('Error when channelId does not refer to valid channel (no channels made)', () => {
    const user1 = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const user2 = authRegisterWrapper('secondguy@gmail.com', '123456', 'Second', 'Dude');
    expect(channelAddOwnerWrapper(user1.token, 1, user2.token)).toStrictEqual(400);
  });

  test('Error when uId does not refer to valid user', () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const invalidUId = user.authUserId + 1;
    const channel = channelsCreateWrapper(user.token, 'General', true);
    expect(channelAddOwnerWrapper(user.token, channel.channelId, invalidUId)).toStrictEqual(400);
  });

  test('uId refers to user who is not member of channel', () => {
    const user1 = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const user2 = authRegisterWrapper('guy2@email.com', '123456', 'Guy', 'Two');

    const channel = channelsCreateWrapper(user1.token, 'Channel', true);
    expect(channelAddOwnerWrapper(user1.token, channel.channelId, user2.authUserId)).toStrictEqual(400);
  });

  test('uId refers to user that is already owner of channel', () => {
    const user1 = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const user2 = authRegisterWrapper('guy2@email.com', '123456', 'Guy', 'Two');

    const channel = channelsCreateWrapper(user1.token, 'Channel', true);
    channelInviteWrapper(user1.token, channel.channelId, user2.authUserId);
    expect(channelAddOwnerWrapper(user1.token, channel.channelId, user2.authUserId)).toStrictEqual({});
    expect(channelAddOwnerWrapper(user1.token, channel.channelId, user2.authUserId)).toStrictEqual(400);
  });

  test('Authorised user does not have owner permissions in channel', () => {
    const user1 = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One');
    const user2 = authRegisterWrapper('notin@email.com', '123456', 'The', 'Inviter');
    const user3 = authRegisterWrapper('another@email.com', '2342124', 'Third', 'User');

    const channel = channelsCreateWrapper(user1.token, 'Channel', true);

    channelInviteWrapper(user1.token, channel.channelId, user2.authUserId);
    channelInviteWrapper(user1.token, channel.channelId, user3.authUserId);
    expect(channelAddOwnerWrapper(user2.token, channel.channelId, user3.authUserId)).toStrictEqual(403);
  });

  test('Token refers to invalid authorised user', () => {
    const user1 = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One');
    const user2 = authRegisterWrapper('notin@email.com', '123456', 'Ash', 'Ketchum');
    const secret = channelsCreateWrapper(user1.token, 'Secret Place', false);
    channelInviteWrapper(user1.token, secret.channelId, user2.authUserId);
    expect(channelAddOwnerWrapper('1', secret.channelId, user2.authUserId)).toStrictEqual(403);
  });
});

describe('Valid arguments', () => {
  test('Makes one member an owner of the channel', () => {
    const user1 = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One');
    const user2 = authRegisterWrapper('notin@email.com', '123456', 'Ash', 'Ketchum');

    const channel = channelsCreateWrapper(user1.token, 'Channel', true);

    channelInviteWrapper(user1.token, channel.channelId, user2.authUserId);
    expect(channelAddOwnerWrapper(user1.token, channel.channelId, user2.authUserId)).toStrictEqual({});

    expect(channelDetailsWrapper(user1.token, channel.channelId).ownerMembers).toStrictEqual([
      userProfileWrapper(user1.token, user1.authUserId).user,
      userProfileWrapper(user1.token, user2.authUserId).user,
    ]);

    expect(new Set(channelDetailsWrapper(user2.token, channel.channelId).allMembers)).toStrictEqual(
      new Set([
        userProfileWrapper(user2.token, user1.authUserId).user,
        userProfileWrapper(user2.token, user2.authUserId).user,
      ])
    );
  });

  test('Global owner who is not channel owner can add owner', () => {
    const globalOwner = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One');
    const channelOwner = authRegisterWrapper('notin@email.com', '123456', 'Ash', 'Ketchum');

    const channel = channelsCreateWrapper(channelOwner.token, 'Channel', true);

    channelInviteWrapper(channelOwner.token, channel.channelId, globalOwner.authUserId);

    const newMember = authRegisterWrapper('yetanotherperson@email.com', '49302123', 'Second', 'Person');
    channelInviteWrapper(globalOwner.token, channel.channelId, newMember.authUserId);

    expect(channelAddOwnerWrapper(globalOwner.token, channel.channelId, newMember.authUserId)).toStrictEqual({});

    expect(new Set(channelDetailsWrapper(globalOwner.token, channel.channelId).ownerMembers)).toStrictEqual(
      new Set([
        userProfileWrapper(newMember.token, newMember.authUserId).user,
        userProfileWrapper(channelOwner.token, channelOwner.authUserId).user,
      ])
    );

    expect(new Set(channelDetailsWrapper(newMember.token, channel.channelId).allMembers)).toStrictEqual(
      new Set([
        userProfileWrapper(globalOwner.token, newMember.authUserId).user,
        userProfileWrapper(newMember.token, channelOwner.authUserId).user,
        userProfileWrapper(channelOwner.token, globalOwner.authUserId).user,
      ])
    );
  });
});

/*
 * Tests for channel/removeowner/v1 route
 */

describe('Invalid arguments', () => {
  test('Error when channelId does not refer to channel (no channels made)', () => {
    const user1 = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const user2 = authRegisterWrapper('secondguy@gmail.com', '123456', 'Second', 'Dude');
    expect(channelRemoveOwnerWrapper(user1.token, 1, user2.authUserId)).toStrictEqual(400);
  });

  test('Error when channelId does not refer to channel (one channel made)', () => {
    const user1 = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const user2 = authRegisterWrapper('secondguy@gmail.com', '123456', 'Second', 'Dude');

    const channel = channelsCreateWrapper(user1.token, 'General', true);
    const invalidCId = channel.channelId + 1;
    expect(channelRemoveOwnerWrapper(user1.token, invalidCId, user2.authUserId)).toStrictEqual(400);
  });

  test('uId does not refer to a valid user', () => {
    const user = authRegisterWrapper('person1@gmail.com', 'password', 'Person', 'One');
    const invalidUId = user.authUserId + 1;
    const channel = channelsCreateWrapper(user.token, 'General', true);
    expect(channelRemoveOwnerWrapper(user.token, channel.channelId, invalidUId)).toStrictEqual(400);
  });

  test('Global owner is not member of channel', () => {
    // Global Owner
    const user1 = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One');
    // Channel Owner
    const user2 = authRegisterWrapper('notin@email.com', '123456', 'The', 'Inviter');

    const channel = channelsCreateWrapper(user2.token, 'Channel', true);

    // Other owner
    const user3 = authRegisterWrapper('yetanotherperson@email.com', '49302123', 'Third', 'Person');

    channelInviteWrapper(user2.token, channel.channelId, user3.authUserId);
    channelAddOwnerWrapper(user2.token, channel.channelId, user3.authUserId);

    expect(channelRemoveOwnerWrapper(user1.token, channel.channelId, user3.authUserId)).toStrictEqual(403);
  });

  test('uId refers to user who is not owner of channel', () => {
    const user1 = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One');
    const user2 = authRegisterWrapper('notin@email.com', '123456', 'The', 'Inviter');

    const channel = channelsCreateWrapper(user1.token, 'Channel', true);

    channelInviteWrapper(user1.token, channel.channelId, user2.authUserId);
    expect(channelRemoveOwnerWrapper(user1.token, channel.channelId, user2.authUserId)).toStrictEqual(400);
  });

  test('uId refers to only channel owner', () => {
    const globalOwner = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One');
    const channelOwner = authRegisterWrapper('notin@email.com', '123456', 'Ash', 'Ketchum');

    const channel = channelsCreateWrapper(channelOwner.token, 'Channel', true);

    channelInviteWrapper(channelOwner.token, channel.channelId, globalOwner.authUserId);

    const newMember = authRegisterWrapper('yetanotherperson@email.com', '49302123', 'Second', 'Person');
    channelInviteWrapper(globalOwner.token, channel.channelId, newMember.authUserId);
    expect(channelRemoveOwnerWrapper(globalOwner.token, channel.channelId, channelOwner.authUserId)).toStrictEqual(400);
  });

  test('Valid channelId, authorised user does not have owner permissions', () => {
    const user1 = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One');
    const user2 = authRegisterWrapper('notin@email.com', '123456', 'The', 'Inviter');

    const channel = channelsCreateWrapper(user1.token, 'Channel', true);

    channelInviteWrapper(user1.token, channel.channelId, user2.authUserId);

    const user3 = authRegisterWrapper('yetanotherperson@email.com', '49302123', 'Third', 'Person');

    channelInviteWrapper(user2.token, channel.channelId, user3.authUserId);

    channelAddOwnerWrapper(user1.token, channel.channelId, user2.authUserId);
    expect(channelRemoveOwnerWrapper(user3.token, channel.channelId, user1.authUserId)).toStrictEqual(403);
    expect(channelRemoveOwnerWrapper(user3.token, channel.channelId, user2.authUserId)).toStrictEqual(403);
  });

  test('Token refers to invalid user', () => {
    const user1 = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One');
    const user2 = authRegisterWrapper('notin@email.com', '123456', 'Ash', 'Ketchum');
    const channel = channelsCreateWrapper(user1.token, 'Secret Place', false);
    channelInviteWrapper(user1.token, channel.channelId, user2.authUserId);
    channelAddOwnerWrapper(user1.token, channel.channelId, user2.authUserId);
    expect(channelRemoveOwnerWrapper('1', channel.channelId, user2.authUserId)).toStrictEqual(403);
  });
});

describe('Valid arguments', () => {
  test('Channel owner successfully removes another channel owner', () => {
    const globalOwner = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One');
    const channelOwner1 = authRegisterWrapper('notin@email.com', '123456', 'Ash', 'Ketchum');

    const channel = channelsCreateWrapper(channelOwner1.token, 'Channel', true);

    channelInviteWrapper(channelOwner1.token, channel.channelId, globalOwner.authUserId);

    const channelOwner2 = authRegisterWrapper('yetanotherperson@email.com', '49302123', 'Second', 'Person');

    // channelOwner1 removes channelOwner2 as an owner
    channelInviteWrapper(globalOwner.token, channel.channelId, channelOwner2.authUserId);
    channelAddOwnerWrapper(channelOwner1.token, channel.channelId, channelOwner2.authUserId);
    expect(channelRemoveOwnerWrapper(channelOwner1.token, channel.channelId, channelOwner2.authUserId)).toStrictEqual({});

    expect(channelDetailsWrapper(globalOwner.token, channel.channelId).ownerMembers).toStrictEqual(
      [
        userProfileWrapper(channelOwner1.token, channelOwner1.authUserId).user
      ]
    );

    expect(new Set(channelDetailsWrapper(channelOwner1.token, channel.channelId).allMembers)).toStrictEqual(
      new Set([
        userProfileWrapper(globalOwner.token, channelOwner2.authUserId).user,
        userProfileWrapper(channelOwner2.token, channelOwner1.authUserId).user,
        userProfileWrapper(channelOwner1.token, globalOwner.authUserId).user,
      ])
    );
  });

  test('Global owner successfully removes another channel owner', () => {
    const globalOwner = authRegisterWrapper('person1@email.com', 'password', 'Da', 'One');
    const channelOwner1 = authRegisterWrapper('notin@email.com', '123456', 'Ash', 'Ketchum');

    const channel = channelsCreateWrapper(channelOwner1.token, 'Channel', true);

    channelInviteWrapper(channelOwner1.token, channel.channelId, globalOwner.authUserId);

    const channelOwner2 = authRegisterWrapper('yetanotherperson@email.com', '49302123', 'Second', 'Person');

    // globalOwner removes channelOwner2 as an owner
    channelInviteWrapper(globalOwner.token, channel.channelId, channelOwner2.authUserId);
    channelAddOwnerWrapper(channelOwner1.token, channel.channelId, channelOwner2.authUserId);
    expect(channelRemoveOwnerWrapper(globalOwner.token, channel.channelId, channelOwner2.authUserId)).toStrictEqual({});

    expect(channelDetailsWrapper(globalOwner.token, channel.channelId).ownerMembers).toStrictEqual(
      [
        userProfileWrapper(channelOwner1.token, channelOwner1.authUserId).user
      ]
    );

    expect(new Set(channelDetailsWrapper(channelOwner1.token, channel.channelId).allMembers)).toStrictEqual(
      new Set([
        userProfileWrapper(globalOwner.token, channelOwner2.authUserId).user,
        userProfileWrapper(channelOwner2.token, channelOwner1.authUserId).user,
        userProfileWrapper(channelOwner1.token, globalOwner.authUserId).user,
      ])
    );
  });
});
