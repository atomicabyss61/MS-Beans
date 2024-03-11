import { getData, setData } from './dataStore';
import nodemailer from 'nodemailer';
import validator from 'validator';
import HTTPError from 'http-errors';
import { doHash, generateToken, findTokenUser, User } from './other';
const SECRET = 'H15AAERO';
import { emailConfig } from './email-config.json';

/**
 *
 * Given a registered user's email and password, returns their authUserId value.
 *
 * @param {string} email
 * @param {string} password
 * @returns {{ authUserId: number }}
 */
function authLoginV3(email: string, password: string): { token: string, authUserId: number } {
  const data = getData();
  const user = data.users.find(element => element.email.toLowerCase() === email.toLowerCase() && element.password === doHash(password));
  if (user === undefined) throw HTTPError(400, 'Username or Password is Incorrect');

  const token = generateToken();
  user.sessions.push(token);
  setData(data);
  return { token: doHash(token + SECRET), authUserId: user.authUserId };
}

/**
 *
 * Given a user's first and last name, email address, and password,
 * creates a new account for them and returns a new authUserId.
 *
 * @param {string} email
 * @param {string} password
 * @param {string} nameFirst
 * @param {string} nameLast
 * @returns {{ authUserId: number }}
 */
function authRegisterV3(email: string, password: string, nameFirst: string, nameLast: string): { token: string, authUserId: number } {
  const data = getData();

  // Checking for valid nameFirst, nameLast, password and email.
  if (!validator.isEmail(email)) throw HTTPError(400, 'Invalid Email');
  if (password.length < 6) throw HTTPError(400, 'Password is too Short');
  if (nameFirst.length === 0 || nameFirst.length > 50) throw HTTPError(400, 'Invalid First Name');
  if (nameLast.length === 0 || nameLast.length > 50) throw HTTPError(400, 'Invalid Last Name');

  for (const person of data.users) {
    if (person.email.toLowerCase() === email.toLowerCase()) throw HTTPError(400, 'Account Alredy Exists');
  }

  let handle = nameFirst.toLowerCase() + nameLast.toLowerCase();

  handle = handle.replace(/[^a-z0-9]/gi, '');
  handle = handle.slice(0, 20);

  let validHandle = false; let place = 0;
  while (!validHandle) {
    // Checking if handle exists.
    validHandle = true;
    for (const person of data.users) {
      if (person.handleStr === handle) validHandle = false;
    }

    // Appending number to end of handle.
    if (validHandle === false) {
      if (place === 0) handle += '0';
      else {
        const digits = place.toString().length;
        handle = handle.slice(0, handle.length - digits);
        handle += place;
      }
      place++;
    }
  }

  const token = generateToken();

  // Creating user object.
  const newUser: User = {
    authUserId: data.users.length,
    nameFirst: nameFirst,
    nameLast: nameLast,
    email: email,
    handleStr: handle,
    password: doHash(password),
    permissionId: 2,
    sessions: [token],
    resetCodes: [],
    notification: {
      notifications: [],
      lastUpdate: 0,
    },
    isDeleted: false,
    msgSentTime: [],
  };

  // Checking if user is a global owner.
  if (data.users.length === 0) {
    newUser.permissionId = 1;
    data.firstUserTime = Math.floor((new Date()).getTime() / 1000);
  }

  data.users.push(newUser);

  setData(data);
  return { token: doHash(token + SECRET), authUserId: newUser.authUserId };
}

/**
 *
 * Given an active token, invalidates the token to log the user out.
 *
 * @param {string} token
 * @returns {{}}
 */
function authLogoutV2(token: string): Record<string, never> {
  const data = getData();
  const user = findTokenUser(token, data.users);
  if (user === undefined) throw HTTPError(403, 'Invalid Token');
  user.sessions = user.sessions.filter(element => doHash(element + SECRET) !== token);
  setData(data);
  return {};
}

/**
 *
 * Sends the user an email containing a password reset code.
 *
 * @param {string} email
 * @returns {{}}
 */
function authPasswordResetRequestV1(email: string): Record<string, never> {
  const code = generateResetCode(email);
  if (code === undefined) return {};
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: emailConfig.USERNAME,
      clientId: emailConfig.CLIENT_ID,
      clientSecret: emailConfig.CLIENT_SECRET,
      refreshToken: emailConfig.REFRESH_TOKEN
    }
  });
  const message = {
    from: `UNSW Beans <${emailConfig.USERNAME}>`,
    to: email,
    subject: 'Password Reset',
    html: `<p>Here is your code to reset:</p>
    <p>${code}</p>`,
  };
  transporter.sendMail(message).catch((e) => { console.log(e); });
  return {};
}

/**
 *
 * generates a reset code for the user and stores it in the database
 *
 * @param {string} email
 * @returns {string}
 */
function generateResetCode(email: string): string {
  const data = getData();
  const user = data.users.find(element => element.email.toLowerCase() === email.toLowerCase());
  if (user === undefined) return undefined;
  const code = Math.random().toString().slice(2, 8);

  user.resetCodes.push(code);
  setData(data);
  return code;
}

/**
 *
 * sets the user's password to the new password if the code is valid
 *
 * @param {string} resetCode
 * @param {string} newPassword
 * @returns {{}}
 */
function authPasswordResetResetV1(resetCode: string, newPassword: string): Record<string, never> {
  const data = getData();
  const user = findCodeUser(resetCode, data.users);
  if (user === undefined) throw HTTPError(400, 'Invalid Reset Code');
  if (newPassword.length < 6) throw HTTPError(400, 'New password is too short');
  user.password = doHash(newPassword);
  user.resetCodes = user.resetCodes.filter(c => c !== resetCode);
  setData(data);
  return {};
}

/**
 *
 * finds a user in the datastore with the corresponding reset code.
 *
 * @param {string} resetCode
 * @param {User[]} users
 * @returns {user}
 */
function findCodeUser(resetCode: string, users: User[]): undefined | User {
  for (const user of users) {
    const User = user.resetCodes.find(c => c === resetCode);
    if (User !== undefined) return user;
  }
  return undefined;
}

export { authLoginV3, authRegisterV3, authLogoutV2, authPasswordResetRequestV1, authPasswordResetResetV1, generateResetCode };
