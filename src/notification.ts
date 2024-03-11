import { getData, setData } from './dataStore';
import HTTPError from 'http-errors';
import { findTokenUser, notifications, getUserHandle, getChannelsAndDms, error, notificationsStore } from './other';

function notificationsGetV1(token: string): error | { notifications: notifications[] } {
  const data = getData();
  const owner = findTokenUser(token, data.users);
  if (owner === undefined) throw HTTPError(403, 'Invalid token!');

  const searchArray = getChannelsAndDms(owner.authUserId);
  const channelNums = data.channels.filter(element => {
    return element.allMembers.find(user => user.uId === owner.authUserId) !== undefined ? 1 : 0;
  }).length;

  // Finding @ for caller.
  const handleTag = '@' + owner.handleStr;
  let notifications: notificationsStore[] = []; let dmId; let channelId;
  for (const object of searchArray) {
    if (searchArray.indexOf(object) < channelNums) {
      dmId = -1;
      channelId = object.channelId;
    } else {
      dmId = object.dmId;
      channelId = -1;
    }
    // Checking if user has been invited to any channels/dms.
    let invited;
    for (const inv of object.invites) if (inv.uId === owner.authUserId) invited = inv;
    if (invited.inviterId !== -1) {
      notifications.push({
        channelId: channelId,
        dmId: dmId,
        notificationMessage: `${getUserHandle(invited.inviterId)} added you to ${object.name}`,
        timeStamp: invited.timeStamp,
      });
    }
    for (const msg of object.messages) {
      // Checking if any messages have @'ed the user.
      if (msg.message.slice(0, msg.shareMsgStart).includes(handleTag) && msg.messageId >= 0) {
        notifications.push({
          channelId: channelId,
          dmId: dmId,
          notificationMessage: `${getUserHandle(msg.uId)} tagged you in ${object.name}: ${msg.message.slice(0, 20)}`,
          timeStamp: msg.timeSent,
        });
      }
      // assuming only 1 react type.
      if (msg.uId === owner.authUserId && msg.reacts[0].uIds.length > 0) {
        for (const reactor of msg.reacts[0].uIds) {
          notifications.push({
            channelId: channelId,
            dmId: dmId,
            notificationMessage: `${getUserHandle(reactor.uId)} reacted to your message in ${object.name}`,
            timeStamp: reactor.timeStamp,
          });
        }
      }
    }
  }

  notifications = notifications.filter(n => n.timeStamp > owner.notification.lastUpdate && n.timeStamp <= Math.floor((new Date()).getTime() / 1000));
  for (const noti of notifications) owner.notification.notifications.push(noti);
  owner.notification.lastUpdate = Math.floor((new Date()).getTime() / 1000);
  notifications = owner.notification.notifications.sort((b, a) => a.timeStamp - b.timeStamp);
  notifications = notifications.slice(0, 20);
  const notiRet = [];
  for (const note of notifications) {
    notiRet.push({
      channelId: note.channelId,
      dmId: note.dmId,
      notificationMessage: note.notificationMessage,
    });
  }
  setData(data);
  return { notifications: notiRet };
}

export { notificationsGetV1 };
