const express 		= require('express'),
  expressSession  = require('express-session'),
  bodyParser 			= require('body-parser'),
  mongoose 				= require('mongoose'),
  cors						= require('cors'),
  _               = require('lodash'),
  nodeMailer      = require('nodemailer'),
  path            = require('path');

const {
  User,
  Order,
  ShopOrder,
  Part,
  General,
  Costs
} = require('./models');

const {
  randomGenerator,
  sendResponse,
  isLoggedIn,
  isDefined,
  encrypt,
  decrypt,
  hash,
  emailRegex,
  cellRegex,
  sendEmail,
  handleDBQuery,
  generatePassword
} = require('./src/helper');

const {
  createJWT,
  checkJWT
} = require('./src/jwt');

const app = express();
mongoose.connect("mongodb://localhost/auto_repairshop");

app.set("view engine", "ejs");
app.set('views', path.join(__dirname, '/views'));
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json())
app.use(express.static("assets"));
app.use(cors());

app.get('/share/:id', async (req, res) => {
  let order = await Order.find({order_id: req.params.id});
  let data = await General.find({});

  data = {
    name: data[0].shop_name,
    phone: data[0].shop_phone,
    address: data[0].shop_address
  }

  if (order.length === 0) return res.status(404).render('./notFound');

  res.render('./shareOrder', {order: order[0], data: data})
})

app.get('/auth', async (req, res) => {
  let accessToken = req.headers.accesstoken;

  const result = await checkJWT(accessToken);

  if (result == 'error') return res.status(401).send({
    message: 'not_logged_in'
  });

  const user = await User.find({user_id: result.data})

  if (result != 'error') return sendResponse(res, 200, 'logged_in', {role: user[0].role, username: user[0].username, name: user[0].name}, null);
})

app.post('/login', async (req, res) => {
  let generalSettings = await General.find();

  if (!generalSettings[0]) await General.create({
    tax_rate: '8.3',
    state: 'California',
    shop_name: 'AZ Auto repair and body',
    shop_address: '1017 S 30th Ave Phoenix, AZ 85009',
    shop_phone: '(480)584-2208'
  })

  let user = await User.find({ username: req.body.username.toLowerCase() });

  if (user.length == 0) return sendResponse(res, 400, 'user_not_exist', null, 'user_does_not_exist');

  user = user[0];

  const password = hash(decrypt(req.body.password, 'client'));
  const uPassword = decrypt(user.password, 'api');

  if (password != uPassword) return sendResponse(res, 400, 'wrong_password', null, 'wrong_password');

  if (user.status == 'inactive') return sendResponse(res, 401, 'user_inactive', null, 'user_inactive');

  const accessToken = createJWT({data: user.user_id, role: user.role}, '2h');

  return sendResponse(res, 200, 'logged_in', {accessToken, role: user.role, username: user.username, name: user.name}, null);
})

app.get('/orders', isLoggedIn, async (req, res) => {
  const orders = await Order.find({});
  const shopOrders = await ShopOrder.find({})

  const payload = orders.map(order => ({
    order_id: order.order_id,
    order,
    shopOrder: shopOrders[shopOrders.findIndex(shOrder => shOrder.order_num === order.order_num)]
  }))

  return sendResponse(res, 200, 'getting_orders', payload, null);
})

app.post('/order/new', isLoggedIn, async (req, res) => {
  const orderData = {
    ...req.body.order,
    order_id: randomGenerator(8)
  }

  const shopOrderData = {
    ...req.body.shoporder,
    order_id: randomGenerator(8)
  }

  await Order.create(orderData);
  await ShopOrder.create(shopOrderData);

  return sendResponse(res, 200, 'order_saved', {orderId: orderData.order_id}, null)
})

app.put('/order', isLoggedIn, async (req, res) => {
  await Order.updateOne(
    { order_num: req.body.order.order_num },
    { $set: { ...req.body.order } }
  )

  await ShopOrder.updateOne(
    { order_num: req.body.order.order_num },
    { $set: { ...req.body.shoporder } }
  )

  let order = await Order.find({order_num: req.body.order.order_num});

  return sendResponse(res, 200, 'order_updated', {orderId: order[0].order_id}, null)
})

app.delete('/order/:orderid', isLoggedIn, async (req, res) => {
  let order = await Order.find({order_id: req.params.orderid})
  await ShopOrder.deleteOne({order_num: order[0].order_num});
  await Order.deleteOne({order_id: req.params.orderid});

  return sendResponse(res, 200, 'order_deleted', null, null);
})

app.get('/users', isLoggedIn, async (req, res) => {
  let users = await User.find({});

  users = users.map(user => ({
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status
  }))

  return sendResponse(res, 200, 'getting_users', users, null);
})

app.post('/user/new', isLoggedIn, async (req, res) => {
  let authToken = await checkJWT(req.headers.accesstoken);

  if (authToken == 'error' || authToken.role != 'admin') return sendResponse(res, 400, 'invalid_request', null, 'token_invalid');

  const password = decrypt(req.body.user.password, 'client');

  const encPassword = await encrypt(hash(password), 'api');

  const userData = {
    user_id: randomGenerator(6),
    role: req.body.user.role || 'admin',
    signup_date: new Date(),
    email: req.body.user.email || '',
  	username: req.body.user.username.toLowerCase() || '',
    name: req.body.user.name || '',
    status: req.body.user.status || 'active',
    password: encPassword
  };

  const newUser = await User.create(userData);

  sendEmail(userData.email, 'newUser', {username: userData.username, password});

  return sendResponse(res, 200, 'logged_in', {userId: userData.user_id}, null);
})

app.put('/user', isLoggedIn, async (req, res) => {
  let authToken = await checkJWT(req.headers.accesstoken);

  if (authToken == 'error' || authToken.role != 'admin') return sendResponse(res, 400, 'invalid_request', null, 'token_invalid');

  await User.updateOne(
    { user_id: req.body.userid },
    { $set: { ...req.body.userdata } }
  )

  return sendResponse(res, 200, 'user_updated', {userId: req.body.userid}, null)
})

app.delete('/user/:userid', isLoggedIn, async (req, res) => {
  let authToken = await checkJWT(req.headers.accesstoken);

  if (authToken == 'error' || authToken.role != 'admin') return sendResponse(res, 400, 'invalid_request', null, 'token_invalid');

  await User.deleteOne({ user_id: req.params.userid });

  return sendResponse(res, 200, 'user_deleted', null, null)
})

app.get('/password/forgot/link', async (req, res) => {
  let userMail = req.headers.usermail;

  let user = await User.find({email: userMail});

  if (!user || user.length == 0) return sendResponse(res, 400, 'user_not_exist', null, 'user_does_not_exist');

  if (user[0].status == 'inactive') return sendResponse(res, 401, 'user_inactive', null, 'user_inactive');

  let fpToken = await createJWT({userid: user[0].user_id}, '2h');

  try {
    await sendEmail(user[0].email, 'fp', fpToken);
  } catch (err) {
    return sendResponse(res, 500, 'send_mail_failed', null, 'send_mail_failed');
  }

  return sendResponse(res, 200, 'reset_link_sent', null, null);
})

app.get('/password/forgot', async (req, res) => {
  let token = req.headers.forgottoken;

  token = await checkJWT(token)

  if (token == 'error') return sendResponse(res, 400, 'invalid_token', null, 'invalid_forgot_token');

  let newToken = await createJWT({userid: token.userid, key: 'forgotpassword'}, '2h');

  return sendResponse(res, 200, 'token_generated', newToken, null);
})

app.post('/password/forgot', async (req, res) => {
  let token = req.headers.forgottoken;

  token = await checkJWT(token)

  if (token == 'error' || token.key !== 'forgotpassword') return sendResponse(res, 400, 'invalid_token', null, 'invalid_forgot_token');

  let user = await User.find({user_id: token.userid})
  user = user[0];

  let newPassword = await encrypt(hash(decrypt(req.body.newpassword, 'client')), 'api');
  user.password = newPassword;

  user.save();

  let accessToken = await createJWT({data: user.user_id, role: user.role}, '2h');

  return sendResponse(res, 200, 'password_reset', {accessToken, role: user.role, username: user.username, name: user.name}, null)
})

app.put('/password', isLoggedIn, async (req, res) => {

  let token = await checkJWT(req.headers.accesstoken)

  let user = await User.find({user_id: token.data});
  user = user[0];

  let newPassword = await encrypt(hash(decrypt(req.body.newpassword, 'client')), 'api');
  user.password = newPassword;

  user.save();

  return sendResponse(res, 200, 'password_changed', null, null);
})

app.get('/settings', isLoggedIn, async (req, res) => {
  let settings = await General.find();
  settings = settings[0];

  return sendResponse(res, 200, 'get_settings', settings, null)
})

app.put('/settings', isLoggedIn, async (req, res) => {
  let token = await checkJWT(req.headers.accesstoken)

  if (token.role != 'admin') return sendResponse(res, 400, 'invalid_request', null, 'user_not_admin');

  let settings = await General.find();
  settings = settings[0];

  let {
    tax_rate,
    state,
    shop_name,
    shop_address,
    shop_phone
  } = req.body.data;

  settings.tax_rate = tax_rate;
  settings.state = state;
  settings.shop_name = shop_name;
  settings.shop_address = shop_address;
  settings.shop_phone = shop_phone;

  settings.save();

  return sendResponse(res, 200, 'settings_saved', null, null);
})

app.get('/costs', isLoggedIn, async (req, res) => {
  let costs = await Costs.find();

  return sendResponse(res, 200, 'get_costs', costs, null)
})

app.post('/costs/new', isLoggedIn, async (req, res) => {
  const costsData = {
    ...req.body,
    costs_id: randomGenerator(8)
  };

  await Costs.create(costsData);

  return sendResponse(res, 200, 'costs_saved', { costsId: costsData.costs_id }, null);
})

app.put('/costs', isLoggedIn, async (req, res) => {
  await Costs.updateOne(
    { costs_id: req.body.costsid },
    { $set: { ...req.body.costsdata } }
  )

  return sendResponse(res, 200, 'costs_updated', null, null)
})

app.delete('/costs/:costsid', isLoggedIn, async (req, res) => {
  await Costs.deleteOne({costs_id: req.params.costsid});

  return sendResponse(res, 200, 'costs_deleted', null, null);
})

app.post('/part/new', isLoggedIn, (req, res) => {
  //add new part
})

app.put('/part', isLoggedIn, (req, res) => {
  //edit part
})

app.delete('/part', isLoggedIn, (req, res) => {
  //delete part
})

app.get('/parts', isLoggedIn, (req, res) => {
  //get all parts
})

app.put('/parts', isLoggedIn, (req, res) => {
  //update parts
})

const port = process.env.PORT || 4050;

app.listen(port, async () => {
	console.log("Server is listening on port: ", port);

  // const newOrderData = {
  //     "received_date_time": "2021-08-06T19:30:00.000Z",
  //     "promised_date_time": "2021-08-06T19:30:00.000Z",
  //     "customer_info": {
  //         "name": "فواد سلمانیان",
  //         "address": "خیابان فردوسی، فرعی ۲۰ غربی، پلاک ۳۵",
  //         "phone": "09361446386",
  //         "second_auth": {
  //             "name": "فواد سلمانیان",
  //             "phone": "09361446386"
  //         }
  //     },
  //     "car_info": {
  //         "year": "1",
  //         "make": "1",
  //         "vin": "1",
  //         "license": "1",
  //         "odometer": "1",
  //         "motor": "1"
  //     },
  //     "parts": [
  //         {
  //             "qty": "1",
  //             "num": "1",
  //             "name": "1",
  //             "price": "1",
  //             "warranty": false
  //         },
  //         {
  //             "qty": "2",
  //             "num": "2",
  //             "name": "2",
  //             "price": "2",
  //             "warranty": true
  //         }
  //     ],
  //     "labore": [
  //         {
  //             "qty": "0",
  //             "num": "",
  //             "name": "1",
  //             "price": "22",
  //             "warranty": false
  //         },
  //         {
  //             "qty": "0",
  //             "num": "",
  //             "name": "2",
  //             "price": "333",
  //             "warranty": false
  //         }
  //     ],
  //     "gas_oil_grease": "1",
  //     "misc_merch": "2",
  //     "sublet_repairs": "3",
  //     "storage_fee": "4",
  //     "tax": 30.71,
  //     "labore_only": 355,
  //     "parts_fee": 5,
  //     "cancel_fee": "33",
  //     "written_estimate_choice": "limited",
  //     "written_estimate_limit": "1",
  //     "cost_profit_representation": true,
  //     "law_charge_fee": "22",
  //     "state": "california",
  //     "total_fee": 400.71,
  //     "law_charge": true,
  //     "order_id": randomGenerator(8),
  //     "submission_date": '8/7/2021',
  //     "authorized_by": 'Admin dude',
  //     "order_num": '7820211'
  // }
  //
  // const newNOrder = await Order.create(newOrderData)
  // console.log(newOrderData.order_id);
  // const newNOrder = await Order.remove({order_id: "41853121"});
  // let newNOrder = await Order.find({order_id: "86309049"}, (err, result) => handleDBQuery(err, result));

  // newNOrder = newNOrder[0];

  // newNOrder = {
  //   ...newNOrder
  // }

  // console.log('here');
  // console.log(newNOrder);
  // let order = {...newNOrder[0]};
  // console.log('order');
  // console.log(order);
  // newNOrder.save();

  // console.log('order created');
  // console.log(newNOrder);
  // const password = await encrypt(hash('12346578'), 'api');
  // const userData = {
  //   user_id: randomGenerator(6),
  //   role: 'admin',
  //   signup_date: new Date(),
  //   email: 'vrsadmin95@gmail.com',
  // 	username: 'admin',
  //   name: '',
  //   status: 'active',
  //   password
  // };
  // sendEmail('salmanian.foad2@gmail.com', 'fp', 'THISISATOKENYOUFREAKINGIDIOT');
  // console.log('email sent');

  // const newUser = await User.create(userData);
  // console.log('USER CREATED');
})

// function handleCurrency(number) {
//   const numStr = number.toString();
//   const repeat = Math.floor(numStr.length / 3) - 1;
//   let left = (numStr.length % 3);
//   let numList = [];
//   let res = "";
//   let counter = 1;
//
//   if (repeat == 0) {
//     counter = 0;
//   }
//
//   for (i = 1; i <= numStr.length; i++) {
//     numList.push(numStr[i-1]);
//
//     if (left > 0 && i == left) {
//       numList.push(",");
//     }
//
//     if (counter > 0 && counter * 3 + left == i && counter <= repeat) {
//       numList.push(",");
//       counter++;
//     }
//   }
//
//   for (i = 0; i < numList.length; i++) {
//     res += numList[i];
//   }
//
//   return res;
// }

// app.post("/send_validation", async (req, res) => {
// 	console.log("SIGN UP POST CALLED");
//
// 	let userExists = false;
// 	let validationExists = false;
// 	let newValidationCode = randomGenerator(6);
//
// 	await User.find({
// 		username: req.headers.cellnumber
// 	}, (err, user) => {
// 		if (err) {
// 			handleRequestError(err, res, 'USER FIND ERROR');
// 			return;
// 		};
//
// 		if (user.length != 0) {
// 			userExists = true;
// 		}
// 	});
//
// 	if (userExists) {
// 		handleRequestError('user_exists', res, 'USER EXISTS')
// 		return;
// 	};
//
// 	await ValidationCode.find({
// 		cell_number: req.headers.cellnumber
// 	}, (err, code) => {
// 		if (err) {
// 			handleRequestError('server_error', res, 'CHECKING VALIDATION EXISTANCE ERROR')
// 			return;
// 		}
//
// 		if (code.length == 0) {
// 			validationExists = false;
// 		} else {
// 			validationExists = true;
// 		}
// 	});
//
// 	if (validationExists) {
// 		ValidationCode.updateOne({
// 			cell_number: req.headers.cellnumber
// 		},
// 		{
// 			$set: {
// 				validation_code: {
// 					code: newValidationCode,
// 					valid_until: new Date().setHours(new Date().getHours() + 1)
// 				}
// 			}
// 		},
// 		(err, code) => {
// 			if (err) {
// 				handleRequestError('server_error', res, 'VALIDATION CREATION ERROR');
// 				return;
// 			}
//
// 			sendSMS(req.headers.cellnumber, "validation", {validation_code: newValidationCode});
//
// 	    res.status(200).send({
// 	    	status: "success",
// 	    	message: "code_sent"
// 	    });
// 		})
// 	} else {
// 		ValidationCode.create({
// 			cell_number: req.headers.cellnumber,
// 			validation_code: {
// 				code: newValidationCode,
// 				valid_until: new Date().setHours(new Date().getHours() + 1)
// 			}
// 		}, (err, code) => {
// 			if (err) {
// 				handleRequestError('server_error', res, 'VALIDATION CREATION ERROR');
// 				return;
// 			}
//
// 			sendSMS(code["cell_number"], "validation", {validation_code: code["validation_code"]["code"]});
//
// 	    res.status(200).send({
// 	    	status: "success",
// 	    	message: "code_sent"
// 	    });
// 		})
// 	}
// }) //REFACTORED
