"use strict";

const path = require("path");
const http = require("http");
const fs = require("fs");
const passport = require("passport");
const {
  Validator,
  ValidationError,
} = require("express-json-validator-middleware");

const oas3Tools = require("oas3-tools");
const SERVER_PORT = process.env.PORT || 3001;

const { jwtSecret } = require("./secrets");

const TaskController = require("./controllers/Tasks");
const UserController = require("./controllers/Users");
const AssignmentController = require("./controllers/Assignments");

const expressAppConfig = oas3Tools.expressAppConfig("api/openapi.yaml", {
  controllers: path.join(__dirname, "./controllers"),
});
expressAppConfig.addValidator();
const app = expressAppConfig.getApp();

// Set validator middleware
const taskSchema = JSON.parse(
  fs.readFileSync("json_schemas/task_schema.json").toString()
);
const userSchema = JSON.parse(
  fs.readFileSync("json_schemas/user_schema.json").toString()
);
const validator = new Validator({
  allErrors: true,
  schemas: [userSchema, taskSchema],
});

//Set authentication middleware
app.use(passport.initialize());

const JwtStrategy = require("passport-jwt").Strategy;
const strategyOptions = {
  jwtFromRequest: (req) => (req && req.cookies ? req.cookies["jwt"] : null),
  secretOrKey: jwtSecret,
};
passport.use(
  new JwtStrategy(strategyOptions, (jwt_payload, done) =>
    done(null, jwt_payload.user)
  )
);

//route methods
app.post("/api/users/authenticator", UserController.authenticateUser);
app.get(
  "/api/users/authenticator",
  passport.authenticate("jwt", { session: false }),
  UserController.isUserAuthenticated
);
app.get(
  "/api/users/authenticator/logout",
  passport.authenticate("jwt", { session: false }),
  UserController.logoutUser
);
app.get("/api/tasks/public", TaskController.getPublicTasks);
app.post(
  "/api/tasks",
  passport.authenticate("jwt", { session: false }),
  validator.validate({ body: taskSchema }),
  TaskController.addTask
);
app.get(
  "/api/tasks/:taskId",
  passport.authenticate("jwt", { session: false }),
  TaskController.getSingleTask
);
app.delete(
  "/api/tasks/:taskId",
  passport.authenticate("jwt", { session: false }),
  TaskController.deleteTask
);
app.put(
  "/api/tasks/:taskId",
  passport.authenticate("jwt", { session: false }),
  validator.validate({ body: taskSchema }),
  TaskController.updateSingleTask
);
app.put(
  "/api/tasks/:taskId/completion",
  passport.authenticate("jwt", { session: false }),
  TaskController.completeTask
);
app.post(
  "/api/tasks/:taskId/assignees",
  passport.authenticate("jwt", { session: false }),
  AssignmentController.assignTaskToUser
);
app.get(
  "/api/tasks/:taskId/assignees",
  passport.authenticate("jwt", { session: false }),
  AssignmentController.getUsersAssigned
);
app.delete(
  "/api/tasks/:taskId/assignees/:userId",
  passport.authenticate("jwt", { session: false }),
  AssignmentController.removeUser
);
app.post(
  "/api/tasks/assignments",
  passport.authenticate("jwt", { session: false }),
  AssignmentController.assignAutomatically
);
app.get(
  "/api/users",
  passport.authenticate("jwt", { session: false }),
  UserController.getUsers
);
app.get(
  "/api/users/:userId",
  passport.authenticate("jwt", { session: false }),
  UserController.getSingleUser
);
app.get(
  "/api/users/:userId/tasks/created",
  passport.authenticate("jwt", { session: false }),
  TaskController.getOwnedTasks
);
app.get(
  "/api/users/:userId/tasks/assigned",
  passport.authenticate("jwt", { session: false }),
  TaskController.getAssignedTasks
);
app.put(
  "/api/users/:userId/selection",
  passport.authenticate("jwt", { session: false }),
  AssignmentController.selectTask
);

// Error handlers for validation and authentication errors

app.use(function (err, req, res, next) {
  if (err instanceof ValidationError) {
    res.status(400).send(err);
  } else next(err);
});

app.use(function (err, req, res, next) {
  if (err.name === "UnauthorizedError") {
    res.status(401).json({
      errors: [{ param: "Server", msg: "Authorization error" }],
    });
  } else next(err);
});

// Initialize the Swagger middleware
http.createServer(app).listen(SERVER_PORT, function () {
  console.log(
    "Your server is listening on port %d (http://localhost:%d)",
    SERVER_PORT,
    SERVER_PORT
  );
  console.log(
    "Swagger-ui is available on http://localhost:%d/docs",
    SERVER_PORT
  );
});
