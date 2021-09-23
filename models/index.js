const customer = require('./customer'),
  order = require('./order'),
  shopOrder = require('./shopOrder'),
  part = require('./part'),
  general = require('./general'),
  user = require('./user'),
  costs = require('./costs');

module.exports = {
  General: general,
  Order: order,
  ShopOrder: shopOrder,
  Part: part,
  User: user,
  Customer: customer,
  Costs: costs
}
