import { getData, setData } from './dataStore';
import { findTokenUser, error } from './other';
import HTTPError from 'http-errors';

/**
 *
 *  Given a user by their uId, removes them from the Beans. This means they should be removed
 *  from all channels/DMs, and will not be included in the array of users returned by users/all.
 *  Beans owners can remove other Beans owners (including the original first owner). Once a user
 *  is removed, the contents of the messages they sent will be replaced by 'Removed user'. Their
 *  profile must still be retrievable with user/profile, however nameFirst should be 'Removed'
 *  and nameLast should be 'user'. The user's email and handle should be reusable.
 *
 * @param {number} uId
 * @returns {}
 */
function adminUserRemoveV1(token: string, uId: number): Record<string, never> | error {
  const data = getData();
  const admin = findTokenUser(token, data.users);
  if (admin === undefined) throw HTTPError(403, 'error caller doesnt exist');

  const user = data.users.find(element => element.authUserId === uId);
  if (user === undefined) {
    throw HTTPError(400, 'uId does not refer to a valid user');
  }

  if (admin.permissionId !== 1) {
    throw HTTPError(403, 'User is not an admin');
  }

  if (data.users.filter(user => user.permissionId === 1).length === 1) {
    if (user.permissionId === 1) {
      throw HTTPError(400, 'Cannot demote last admin');
    }
  }

  for (const channel of data.channels) {
    channel.allMembers = channel.allMembers.filter(user => user.uId !== uId);
    channel.ownerMembers = channel.ownerMembers.filter(user => user.uId !== uId);
    for (const msg of channel.messages) {
      if (msg.uId === uId) {
        msg.message = 'Removed user';
        msg.shareMsgStart = 12;
      }
    }
  }

  for (const dm of data.dms) {
    dm.allMembers = dm.allMembers.filter(user => user.uId !== uId);
    for (const msg of dm.messages) {
      if (msg.uId === uId) {
        msg.message = 'Removed user';
        msg.shareMsgStart = 12;
      }
    }
  }

  user.nameFirst = 'Remove';
  user.nameLast = 'user';
  user.email = '';
  user.handleStr = '';
  user.password = '';
  user.permissionId = 2;
  user.isDeleted = true;

  setData(data);
  return {};
}

/**
 *
 * Given a user by their uID, sets their permissions to new permissions described by permissionId.
 *
 * @param {number} uId
 * @returns {}
 */
function adminUserPermissionChangeV1(token: string, uId: number, permissionId: number): Record<string, never> | error {
  const data = getData();
  const admin = findTokenUser(token, data.users);
  if (admin === undefined) throw HTTPError(403, 'error caller doesnt exist');

  const user = data.users.find(element => element.authUserId === uId);
  if (user === undefined) {
    throw HTTPError(400, 'uId does not refer to a valid user');
  }

  if (permissionId !== 1 && permissionId !== 2) {
    throw HTTPError(400, 'Invalid permission level');
  }

  if (admin.permissionId !== 1) {
    throw HTTPError(403, 'User is not a global member');
  }

  if (user.permissionId === permissionId) {
    throw HTTPError(400, 'User already has that permission level');
  }

  if (data.users.filter(user => user.permissionId === 1).length === 1) {
    if (user.permissionId === 1 && permissionId === 2) {
      throw HTTPError(400, 'Cannot demote last admin');
    }
  }

  user.permissionId = permissionId;
  setData(data);
  return {};
}

export { adminUserRemoveV1, adminUserPermissionChangeV1 };
