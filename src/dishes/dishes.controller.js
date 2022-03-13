const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

/**  Validation Handlers **/

// compaires the dishId param to the dish id in the dishes array to find a match. Exports misc variables and 'found' object in locals for use in other middleware.
// otherwise it sends a 404 error to the error handler.
function findDish(req, res, next) {
  const { dishId } = req.params;
  res.locals.exports = {};
  const findDish = dishes.find((dish, index) => {
    if (dish.id === dishId) {
      res.locals.exports.preserveDishIndex = index;
      return dish;
    }
  });

  if (findDish) {
    res.locals.exports.preserveId = dishId;
    res.locals.reqDish = findDish;
    next();
  } else {
    next({
      status: 404,
      message: `Dish does not exist: ${dishId} and ${findDish}`,
    });
  }
}

// takes the request body object and runs each property through a battery of validation tests before placing the object into res.locals.
function validateDishes(req, res, next) {
  const { data } = req.body;
  const dishToValidate = data;
  res.locals.newDish = {};
  switch (true) {

    case !dishToValidate.name:
      next({ 
          status: 400, 
          message: "Dish must include a name" 
        });
      break;

    case !dishToValidate.description:
      next({ 
          status: 400, 
          message: "Dish must include a description" 
        });
      break;

    case !dishToValidate.image_url:
      next({ 
          status: 400,
           message: "Dish must include a image_url" 
        });
      break;

    case dishToValidate.price <= 0 || typeof dishToValidate.price !== "number":
      next({
        status: 400,
        message: "Dish must have a price that is an integer greater than 0",
      });
      break;

    case !dishToValidate.price:
      next({ 
         status: 400,
         message: "Dish must include a price" 
        });
      break;

    case dishToValidate.id && dishToValidate.id !== res.locals.reqDish.id:
      next({
        status: 400,
        message: `Dish id does not match route id. Dish: ${dishToValidate.id}, Route: ${res.locals.reqDish.id}`,
      });
      break;

    default:
      // assigns the validated dish to the locals.newDish object.
      res.locals.newDish = dishToValidate;
      break;
  }
  next();
}

/** Route Handlers **/

// sends a response that lists all dishes currently in the dishes array.
function list(_req, res, _next) {
  res.json({ data: dishes });
}

// sends a response that lists a single dish that was requested.
function read(_req, res, _next) {
  res.json({ data: res.locals.reqDish });
}

// takes a validated dish from locals, adds a new id, and then puts the newDish into the dishes array.
function create(_req, res, _next) {
  const { name, description, price, image_url } = res.locals.newDish;
  const newDish = {
    id: nextId(),
    name: name,
    description: description,
    price: price,
    image_url: image_url,
  };
  dishes.push(newDish);
  res.status(201).json({ data: newDish });
}

// takes the validated dish from locals, the array index number from dishes array, and the dish Id from params 
// then deletes the old dish from the dishes array before adding the newDish(updated order) into the array.
function update(_req, res, _next) {
  res.locals.newDish.id = res.locals.exports.preserveId;
  dishes.splice(res.locals.exports.preserveDishIndex, 1, res.locals.newDish);
  res.json({ data: res.locals.newDish });
}

module.exports = {
  list,
  read: [findDish, read],
  create: [validateDishes, create],
  update: [findDish, validateDishes, update],
};
