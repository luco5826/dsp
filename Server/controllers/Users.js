"use strict";

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const utils = require("../utils/writer.js");
const Users = require("../service/UsersService");
const WebSocket = require("../components/websocket");
const WSMessage = require("../components/ws_message.js");
const jsonwebtoken = require("jsonwebtoken");
const { jwtSecret } = require("../secrets");

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    function (username, password, done) {
      Users.getUserByEmail(username)
        .then((user) => {
          if (user === undefined) {
            return done(null, false, { message: "Incorrect e-mail." });
          } else {
            if (!Users.checkPassword(user, password)) {
              return done(null, false, { message: "Wrong password." });
            } else {
              return done(null, user);
            }
          }
        })
        .catch((err) => done(err));
    }
  )
);

module.exports.logoutUser = function logoutUser(req, res, next) {
  const userId = req.user;
  Users.getUserById(userId).then((user) => {
    // notify all clients that a user has logged out from the service
    const logoutMessage = new WSMessage("logout", user.id, user.name);
    WebSocket.sendAllClients(logoutMessage);
    WebSocket.deleteMessage(user.id);
    //clear the cookie
    req.logout();
    res.clearCookie("jwt").end();
  });
};

module.exports.authenticateUser = function authenticateUser(req, res, next) {
  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      // display wrong login messages
      return res.status(401).json(info);
    }
    // success, perform the login
    req.login(user, { session: false }, (err) => {
      if (err) return next(err);

      //notify all the clients that a user has logged in the service
      Users.getActiveTaskUser(user.id).then((task) => {
        const loginMessage = new WSMessage(
          "login",
          user.id,
          user.name,
          task ? task.id : undefined,
          task ? task.description : undefined
        );
        WebSocket.sendAllClients(loginMessage);
        WebSocket.saveMessage(user.id, loginMessage);

        res.cookie("jwt", jsonwebtoken.sign({ user: user.id }, jwtSecret), {
          httpOnly: true,
          sameSite: true,
        });
        return res.json({ id: user.id, name: user.name });
      });
    });
  })(req, res, next);
};

module.exports.isUserAuthenticated = function isUserAuthenticated(req, res) {
  Users.getUserById(req.user).then((user) => utils.writeJson(res, user));
};

module.exports.getUsers = function getUsers(req, res, next) {
  Users.getUsers()
    .then((response) =>
      utils.writeJson(res, response, response ? undefined : 404)
    )
    .catch(function (response) {
      utils.writeJson(
        res,
        { errors: [{ param: "Server", msg: response }] },
        500
      );
    });
};

module.exports.getSingleUser = function getSingleUser(req, res, next) {
  Users.getUserById(req.params.userId)
    .then((response) =>
      utils.writeJson(res, response, response ? undefined : 404)
    )
    .catch(function (response) {
      utils.writeJson(
        res,
        { errors: [{ param: "Server", msg: response }] },
        500
      );
    });
};
