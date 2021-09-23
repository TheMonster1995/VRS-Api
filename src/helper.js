const cryptoJs = require('crypto-js'),
  nodeMailer   = require('nodemailer');

const {
  checkJWT
} = require('./jwt');

const {
  clientSecret,
  apiSecret,
  hashSecret
} = require('../config.json');

const isDefined = obj => {
  if (typeof obj == "undefined") return false;

  if (!obj) return false;

  return obj != null;
}

module.exports = {
  cellRegex: new RegExp(/^0?[\+98]?[0-9]{10,12}$/),

  emailRegex: new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/),

  randomGenerator: digits => {
  	let num = parseInt(digits);
  	let result = Math.round(Math.random() * (10 ** num));

  	if (result.toString().length < num) {
  		result = result * 10;
  	}

  	return result;
  },

  isLoggedIn: async (req, res, next) => {
    let accessToken = req.headers.accesstoken;

    const result = await checkJWT(accessToken);

    if (result != 'error') return next();

    return res.status(401).send({
      message: 'not_logged_in'
    });
  },

  sendResponse: (res, resCode, resMessage, resPayload, resLog) => {
    if (isDefined(resLog)) {
      console.log('-----------------------------------------');
      console.log('Res Log - ', new Date().toString());
      console.log(resMessage);
      console.log(resLog);
      console.log('-----------------------------------------');
    }

    return res.status(resCode).send({
      message: resMessage,
      payload: resPayload
    })
  },

  isDefined: obj => {
    if (typeof obj == "undefined") return false;

    if (!obj) return false;

    if (obj == 'null') return false;

    return obj != null;
  },

  /**
   * This function encrypts the given string using cryptoJS and an encryption phrase
   * @param  {String} string Input string
   * @return {String}        Encrypted string
   */
  encrypt: string => {
    return cryptoJs.AES.encrypt(string, apiSecret).toString();
  },

  /**
   * This function decrypts the string using cryptoJS and an encryption phrase
   * @param  {String} string Input encrypted phrase
   * @return {String}        decrypted phrase
   */
  decrypt: (string, mode) => {
    let secretPhrase = clientSecret;

    if (mode == 'api') secretPhrase = apiSecret;

    return cryptoJs.AES.decrypt(string, secretPhrase).toString(
      cryptoJs.enc.Utf8
    );
  },

  /**
   * This function returns the hash of the given string using cryptoJS and a hash phrase
   * @param  {String} string input stirng
   * @return {String}        hashed input string
   */
  hash: string => {
    return cryptoJs.SHA256(hashSecret + string).toString();
  },

  sendEmail: async (receiver, type, token) => {
    const transporter = nodeMailer.createTransport({
      service: "yahoo",
      auth: {
        user: "salmanian.foad289@yahoo.com",
        pass: "wisyrfawwqzsxpdt"
      }
    });

    let text, subject;

    switch (type) {
      case 'fp':
        text = `Use the following link to reset your password:

        http://51.75.182.106:3000/forgotpassword/${token}`;
        subject = "Reset password";
        break;

      case 'newUser':
        text = `You have been added to the VRS system. Here are your username and password:

        username: ${token.username}
        password: ${token.password}`
        subject = "Welcome"
        break;
      default:
        console.log('nothing?');
    }

    const mailOptions = {
      from: "salmanian.foad289@yahoo.com",
      to: receiver,
      subject,
      text
    };

    return await transporter.sendMail(
      mailOptions,
      (err, info) => {
        if (err) return ['error', err];

        return ['success'];
      }
    );
  },

  handleDBQuery: (err, result) => {
    if (err) return ['error', err];

    if (Array.isArray(result)) return result;

    return [result];
  },

  handleRequestError: (err, res, errText) => {
  	console.log(errText);
  	console.log(err);
  	res.status(200).send({
  		status: 'error',
  		message: err
  	})
  },

  generatePassword: () => {
    let length = 8,
      charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  }
}
