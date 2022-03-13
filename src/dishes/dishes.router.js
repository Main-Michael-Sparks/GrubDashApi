const router = require("express").Router();
const controller = require("./dishes.controller");
const methodNotAllowed = require("../errors/methodNotAllowed");

/* Route Handler for /dishes/:dishId */
router.route("/:dishId")
    .get(controller.read)
    .put(controller.update)
    .all(methodNotAllowed);

/* Route Handler for /dishes */
router.route("/")
    .get(controller.list)
    .post(controller.create)
    .all(methodNotAllowed);

module.exports = router;
