const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

/** Validation Handlers **/

// Takes the order params and loops through the orders array to find an orders.id that matches the params
// Stores the matching object, the object's parent array index number and the order params into various res.locals objects.
function findOrder(req, res, next) {
  const { orderId } = req.params;
  res.locals.orderArr = {};

  const locateOrder = orders.find((order, index) => {
    if (order.id === orderId) {
      res.locals.orderArr.index = index;
      return order;
    }
  });

  if (locateOrder) {
    res.locals.paramsOrder = {};
    res.locals.paramsOrder.id = orderId;
    res.locals.existingOrder = locateOrder;
    next();
  } else {
    next({ 
        status: 404, 
        message: `Order does not exist: ${orderId}` 
    });
  };
};

// Takes the request body object and runs a battery of validation tests on each property within the object before storing it into res.locals.order object.
function validateOrders(req, res, next) {
  res.locals.order = {};
  const { data } = req.body;
  const orderToValidate = data;
  switch (true) {
    case !orderToValidate.deliverTo:
      next({ 
          status: 400, 
          message: "Order must include a deliverTo" 
        });
      break;

    case !orderToValidate.mobileNumber:
      next({ 
          status: 400, 
          message: "Order must include a mobileNumber" 
        });
      break;

    case !orderToValidate.dishes:
      next({ 
          status: 400, 
          message: "Order must include a dish" 
        });
      break;

    case !Array.isArray(orderToValidate.dishes):
      next({ 
          status: 400, 
          message: "Order must include at least one dish" 
        });
      break;

    case !orderToValidate.dishes.length:
      next({ 
          status: 400, 
          message: "Order must include at least one dish" 
        });
      break;

    default:
      // Assign the validated object to res.locals.order object
      res.locals.order = orderToValidate;
      break;
  };
  next();
};

// takes the res.locals.order.dishes array and validates the quantity property value.
// kicks the request to the error handler if validation fails. 
function validateOrdersDishes(_req, res, next) {
  res.locals.rejectedDish = {};
  const quantityReject = res.locals.order.dishes.find((dish, index) => {
    if (!dish.quantity || typeof dish.quantity !== "number" || dish.quantity <= 0) {
      res.locals.rejectedDish.arrIndex = index;
      return dish;
    };
  });

  if (quantityReject !== undefined) {
    next({
      status: 400,
      message: `Dish ${res.locals.rejectedDish.arrIndex} must have a quantity that is an integer greater than 0`,
    });
  } else {
    next();
  };
};

// takes the res.locals.order.status property value and loops an array of acceptable (valid) statuses  against it. (find was used to limit loop iterations) 
// if an invalid status is found the request is kicked over to the error handler with the reason why it was invalid.
function validateOrderStatus(_req, res, next) {
  if (res.locals.order.status) {
    res.locals.acceptableStatus = ["pending","preparing","out-for-delivery","delivered",];
    const orderStatus = res.locals.acceptableStatus.find((status) => status === res.locals.order.status);
    if (orderStatus === "delivered") {
      next({ 
          status: 400, 
          message: "A delivered order cannot be changed" 
        });
    } else if (orderStatus === undefined) {
      next({
        status: 400,
        message: "Order must have a status of pending, preparing, out-for-delivery, delivered",
      });
    } else {
      next();
    }
  } else {
    next({
      status: 400,
      message: "Order must have a status of pending, preparing, out-for-delivery, delivered",
    });
  };
};

// checks for an ID property within the body (after previous validation middleware applied)
// if the property "id" is found, make sure it matches the provided url param other wise kick an error to the error handler.
function validateOrderId(_req, res, next) {
  if (res.locals.order.id) {
    if (res.locals.order.id !== res.locals.existingOrder.id) {
      next({
        status: 400,
        message: `Order id does not match route id. Order: ${res.locals.order.id}, Route: ${res.locals.existingOrder.id}`,
      });
    } else {
      next();
    }
  } else {
    next();
  };
};

// takes the res.locals.existingOrder.status property and makes sure it matches the requirements for a DELETE METHOD request
// in otherwords, if an order does not have a status of pending then the request is sent to the error handler. 
function validateDeleteRequest(_req, res, next) {
  if (res.locals.existingOrder.status === "pending") {
    next();
  } else if (res.locals.existingOrder.status) {
    next({
      status: 400,
      message: "An order cannot be deleted unless it is pending",
    });
  }
}

/** Route Handlers **/

// sends a response that lists all orders currently in the orders array.
function list(_req, res, _next) {
  res.json({ data: orders });
}

// sends a response that lists a single order that was requested. 
function read(_req, res, _next) {
  res.json({ data: res.locals.existingOrder });
}

// takes a validated order, assignes a new id to it then puts the newOrder into the orders array.
function create(_req, res, _next) {
  const { deliverTo, mobileNumber, status, dishes } = res.locals.order;
  const newOrder = {
    id: nextId(),
    deliverTo: deliverTo,
    mobileNumber: mobileNumber,
    status: status,
    dishes: dishes,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

// takes the validated order from locals, the array index number from orders array, and the order Id from params 
// then deletes the old order from the orders array before adding the new order(updated order) into the array.
// "matched orders" "carry over" the order ID from what is already stored in the orders array. In otherwords, the orginial ID is never changed.
function update(_req, res, _next) {
  res.locals.order.id = res.locals.paramsOrder.id;
  orders.splice(res.locals.orderArr.index, 1, res.locals.order);
  res.json({ data: res.locals.order });
}

// takes the order array index number of the delete request and removes the element from the array. 
// the correct index and order object is determed by findOrder middleware. 
function destroy(_req, res, _next) {
  orders.splice(res.locals.orderArr.index, 1);
  res.sendStatus(204);
}

module.exports = {
  list,
  read: [findOrder, read],
  create: [validateOrders, validateOrdersDishes, create],
  update: [findOrder,validateOrders,validateOrdersDishes,validateOrderStatus,validateOrderId,update],
  delete: [findOrder, validateDeleteRequest, destroy],
};
