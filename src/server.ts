import express, { json, Request, Response } from 'express';
import { echo } from './echo';
import morgan from 'morgan';
import config from './config.json';
import cors from 'cors';
import errorHandler from 'middleware-http-errors';
import {
  messageEditV1,
  messageRemoveV1,
  messageSendLaterV1,
  messageSendV1,
  messageShareV1,
  messageReactV1,
  messageUnreactV1,
  messagePinV1,
  messageUnpinV1
} from './message';
import {
  dmCreateV1,
  dmListV1,
  dmRemoveV1,
  dmDetailsV1,
  dmLeaveV1,
  dmMessagesV1,
  messageSendDmV1,
  messageSendDmLaterV1
} from './dm';
import {
  authLoginV3,
  authRegisterV3,
  authLogoutV2,
  authPasswordResetRequestV1,
  authPasswordResetResetV1
} from './auth';
import {
  channelInviteV2,
  channelMessagesV2,
  channelDetailsV2,
  channelJoinV2,
  channelLeaveV1,
  channelAddOwnerV1,
  channelRemoveOwnerV1
} from './channel';
import { clearV1, searchV1 } from './other';
import { channelsCreateV2, channelsListV2, channelsListAllV2 } from './channels';
import {
  userProfileSetNameV1,
  userProfileSetEmailV1,
  userProfileSetHandleV1,
  userProfileV2,
  usersAllV1,
  userProfileUploadphotoV1,
  userProfileUploadphotoV1ErrorChecking,
  userStatsV1,
  usersStatsV1
} from './users';
import { standupStartV1, standupActiveV1, standupSendV1 } from './standup';
import { notificationsGetV1 } from './notification';
import { adminUserRemoveV1, adminUserPermissionChangeV1 } from './admin';

// Set up web app
const app = express();
// Use middleware that allows us to access the JSON body of requests
app.use(json());
// Use middleware that allows for access from other domains
app.use(cors());

app.use(errorHandler());

app.use('/profile-photos', express.static('profile-photos'));

const PORT: number = parseInt(process.env.PORT || config.port);
const HOST: string = process.env.IP || 'localhost';

// Example get request
app.get('/echo', (req: Request, res: Response, next) => {
  try {
    const data = req.query.echo as string;
    return res.json(echo(data));
  } catch (err) {
    next(err);
  }
});

// Auth Routes
app.post('/auth/login/v3', (req: Request, res: Response) => {
  const { email, password } = req.body;
  res.json(authLoginV3(email, password));
});
app.post('/auth/register/v3', (req: Request, res: Response) => {
  const { email, password, nameFirst, nameLast } = req.body;
  res.json(authRegisterV3(email, password, nameFirst, nameLast));
});
app.post('/auth/logout/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  res.json(authLogoutV2(token));
});
app.post('/auth/passwordreset/request/v1', (req: Request, res: Response) => {
  const { email } = req.body;
  res.json(authPasswordResetRequestV1(email));
});
app.post('/auth/passwordreset/reset/v1', (req: Request, res: Response) => {
  const { resetCode, newPassword } = req.body;
  res.json(authPasswordResetResetV1(resetCode, newPassword));
});

// Message Routes
app.post('/message/send/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { channelId, message } = req.body;
  res.json(messageSendV1(token, channelId, message));
});
app.post('/message/sendlater/v1', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { channelId, message, timeSent } = req.body;
  res.json(messageSendLaterV1(token, channelId, message, parseInt(timeSent)));
});
app.post('/message/senddm/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { dmId, message } = req.body;
  res.json(messageSendDmV1(token, parseInt(dmId), message));
});
app.post('/message/sendlaterdm/v1', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { dmId, message, timeSent } = req.body;
  res.json(messageSendDmLaterV1(token, parseInt(dmId), message, parseInt(timeSent)));
});
app.put('/message/edit/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { messageId, message } = req.body;
  res.json(messageEditV1(token, messageId, message));
});
app.delete('/message/remove/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const messageId = parseInt(req.query.messageId as string);
  res.json(messageRemoveV1(token, messageId));
});
app.post('/message/share/v1', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { ogMessageId, message, channelId, dmId } = req.body;
  res.json(messageShareV1(token, ogMessageId, message, channelId, dmId));
});
app.post('/message/react/v1', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { messageId, reactId } = req.body;
  res.json(messageReactV1(token, messageId, reactId));
});
app.post('/message/unreact/v1', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { messageId, reactId } = req.body;
  res.json(messageUnreactV1(token, messageId, reactId));
});
app.post('/message/pin/v1', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { messageId } = req.body;
  res.json(messagePinV1(token, messageId));
});
app.post('/message/unpin/v1', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { messageId } = req.body;
  res.json(messageUnpinV1(token, messageId));
});

// DM Routes
app.post('/dm/create/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { uIds } = req.body;
  res.json(dmCreateV1(token, uIds));
});
app.get('/dm/list/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  res.json(dmListV1(token));
});
app.get('/dm/details/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const dmId = req.query.dmId as string;
  res.json(dmDetailsV1(token, parseInt(dmId)));
});
app.get('/dm/messages/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const dmId = req.query.dmId as string;
  const start = req.query.start as string;
  res.json(dmMessagesV1(token, parseInt(dmId), parseInt(start)));
});
app.post('/dm/leave/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { dmId } = req.body;
  res.json(dmLeaveV1(token, parseInt(dmId)));
});
app.delete('/dm/remove/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const dmId = req.query.dmId as string;
  res.json(dmRemoveV1(token, parseInt(dmId)));
});

// Channels Routes
app.post('/channels/create/v3', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { name, isPublic } = req.body;
  res.json(channelsCreateV2(token, name, isPublic));
});
app.get('/channels/list/v3', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  res.json(channelsListV2(token));
});
app.get('/channels/listAll/v3', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  res.json(channelsListAllV2(token));
});

// Channel Routes
app.get('/channel/details/v3', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const channelId = req.query.channelId as string;
  res.json(channelDetailsV2(token, parseInt(channelId)));
});
app.post('/channel/join/v3', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { channelId } = req.body;
  res.json(channelJoinV2(token, parseInt(channelId)));
});

app.post('/channel/invite/v3', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { channelId, uId } = req.body;
  res.json(channelInviteV2(token, channelId, uId));
});
app.get('/channel/messages/v3', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const channelId = parseInt(req.query.channelId as string);
  const start = parseInt(req.query.start as string);
  res.json(channelMessagesV2(token, channelId, start));
});
app.post('/channel/leave/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { channelId } = req.body;
  res.json(channelLeaveV1(token, channelId));
});
app.post('/channel/addowner/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { channelId, uId } = req.body;
  res.json(channelAddOwnerV1(token, channelId, uId));
});
app.post('/channel/removeowner/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { channelId, uId } = req.body;
  res.json(channelRemoveOwnerV1(token, channelId, uId));
});

// User Routes
app.put('/user/profile/setname/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { nameFirst, nameLast } = req.body;
  res.json(userProfileSetNameV1(token, nameFirst, nameLast));
});
app.put('/user/profile/setemail/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { email } = req.body;
  res.json(userProfileSetEmailV1(token, email));
});
app.put('/user/profile/sethandle/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { handleStr } = req.body;
  res.json(userProfileSetHandleV1(token, handleStr));
});
app.get('/user/profile/v3', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const uId = parseInt(req.query.uId as string);
  res.json(userProfileV2(token, uId));
});
app.get('/users/all/v2', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  res.json(usersAllV1(token));
});
app.post('/user/profile/uploadphoto/v1', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { imgUrl, xStart, yStart, xEnd, yEnd } = req.body;
  if (userProfileUploadphotoV1ErrorChecking(token, imgUrl, xStart, yStart, xEnd, yEnd).error === false) {
    res.json(userProfileUploadphotoV1(token, imgUrl, xStart, yStart, xEnd, yEnd));
  }
});
app.get('/user/stats/v1', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  res.json(userStatsV1(token));
});
app.get('/users/stats/v1', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  res.json(usersStatsV1(token));
});

// admin Routes
app.delete('/admin/user/remove/v1', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const uId = parseInt(req.query.uId as string);
  res.json(adminUserRemoveV1(token, uId));
});
app.post('/admin/userpermission/change/v1', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { uId, permissionId } = req.body;
  res.json(adminUserPermissionChangeV1(token, uId, permissionId));
});

// Standup Routes
app.post('/standup/start/v1', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { channelId, length } = req.body;
  res.json(standupStartV1(token, channelId, length));
});
app.get('/standup/active/v1', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const channelId = parseInt(req.query.channelId as string);
  res.json(standupActiveV1(token, channelId));
});
app.post('/standup/send/v1', (req: Request, res: Response) => {
  const token = req.get('token') as string;
  const { channelId, message } = req.body;
  res.json(standupSendV1(token, channelId, message));
});

// Other Routes
app.delete('/clear/v1', (req: Request, res: Response) => {
  res.json(clearV1());
});

app.get('/search/v1', (req: Request, res: Response) => {
  const token = req.header('token') as string;
  const queryStr = req.query.queryStr as string;
  res.json(searchV1(token, queryStr));
});

app.get('/notifications/get/v1', (req: Request, res: Response) => {
  const token = req.header('token') as string;
  res.json(notificationsGetV1(token));
});

// for logging errors (print to terminal)
app.use(morgan('dev'));

app.use(errorHandler());

// start server
const server = app.listen(PORT, HOST, () => {
  // DO NOT CHANGE THIS LINE
  console.log(`⚡️ Server listening on port ${PORT} at ${HOST}`);
});

// For coverage, handle Ctrl+C gracefully
process.on('SIGINT', () => {
  server.close(() => console.log('Shutting down server gracefully.'));
});
