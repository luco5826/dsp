"use strict";

const User = require("../components/user");
const db = require("../components/db");
const bcrypt = require("bcrypt");

/**
 * Retrieve a user by her email
 *
 * Input:
 * - email: email of the user
 * Output:
 * - the user having the specified email
 *
 */
exports.getUserByEmail = function (email) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM users WHERE email = ?";
    db.all(sql, [email], (err, rows) => {
      if (err) reject(err);
      if (rows.length === 0) return resolve(undefined);

      resolve(createUser(rows[0]));
    });
  });
};

/**
 * Retrieve a user by her ID
 *
 * Input:
 * - id: ID of the user
 * Output:
 * - the user having the specified ID
 *
 */
exports.getUserById = function (id) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT id, name, email FROM users WHERE id = ?";
    db.all(sql, [id], (err, rows) => {
      if (err) return reject(err);
      if (rows.length === 0) return resolve(undefined);

      resolve(createUser(rows[0]));
    });
  });
};

/**
 * Retrieve all the users
 *
 * Input:
 * - none
 * Output:
 * - the list of all the users
 *
 */
exports.getUsers = function () {
  return new Promise((resolve, reject) => {
    const sql = "SELECT id, name, email FROM users";
    db.all(sql, [], (err, rows) => {
      if (err) return reject(err);
      if (rows.length === 0) return resolve(undefined);

      resolve(rows.map((row) => createUser(row)));
    });
  });
};

/**
 * Retrieve the active task of the user
 *
 * Input:
 * - userId of the user
 * Output:
 * - the active task for the user with ID userId
 *
 */
exports.getActiveTaskUser = function (userId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT t.id, t.description 
      FROM tasks as t, assignments as a 
      WHERE a.user = ? 
      AND a.task = t.id 
      AND a.active = 1`;
    db.all(sql, [userId], (err, rows) => {
      if (err) return reject(err);
      if (rows.length === 0) return resolve(undefined);

      resolve(rows[0]);
    });
  });
};

/**
 * Utility functions
 */
const createUser = (row) => new User(row.id, row.name, row.email, row.hash);

exports.checkPassword = function (user, password) {
  return bcrypt.compareSync(password, user.hash);
};
