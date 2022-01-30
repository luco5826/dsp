"use strict";

const Task = require("../components/task");
const db = require("../components/db");
var constants = require("../utils/constants.js");
const { recurringQueries } = require("./utils");
var mqtt = require("../components/mqtt.js");
var MQTTMessage = require("../components/mqtt_message.js");
const { getSingleTask } = require("../controllers/Tasks");
/**
 * Create a new task
 *
 * Input:
 * - task: the task object that needs to be created
 * - owner: ID of the user who is creating the task
 * Output:
 * - the created task
 **/
exports.addTask = function (task, owner) {
  return new Promise((resolve, reject) => {
    const sql =
      "INSERT INTO tasks(description, important, private, project, deadline, completed, owner) VALUES(?,?,?,?,?,?, ?)";
    db.run(
      sql,
      [
        task.description,
        task.important,
        task.private,
        task.project,
        task.deadline,
        task.completed,
        owner,
      ],
      function (err) {
        if (err) return reject(err);
        else {
          //Creation of a new MQTT message for the created task

          // var message = new MQTTMessage("inactive", null, null);

          var createdTask = new Task(
            this.lastID,
            task.description,
            task.important,
            task.private,
            task.deadline,
            task.project,
            task.completed,
            task.active
          );
          if (!task.private) {
            var message = new MQTTMessage(
              "CREATE",
              task.private ? "private" : "public",
              owner,
              null,
              this.lastID,
              createdTask
            );
            mqtt.saveMessage(this.lastID, message);
            mqtt.publishTaskMessage("public", message);
            mqtt.publishTaskMessage(String(this.lastID), message);
          }
          resolve(createdTask);
        }
      }
    );
  });
};

/**
 * Delete a task having taskId as ID
 *
 * Input:
 * - taskId: the ID of the task that needs to be deleted
 * - owner: ID of the user who is creating the task
 * Output:
 * - no response expected for this operation
 **/
// exports.deleteTask = function (taskId, owner) {
//   return new Promise((resolve, reject) => {
//     db.all(recurringQueries.GET_OWNER_BY_TASK_ID, [taskId], (err, rows) => {
//       if (err) return reject(err);
//       if (rows.length === 0) return reject(404);
//       if (owner != rows[0].owner) return reject(403);

//       const sql2 = "DELETE FROM assignments WHERE task = ?";
//       db.run(sql2, [taskId], (err) => {
//         if (err) return reject(err);

//         const sql3 = "DELETE FROM tasks WHERE id = ?";
//         db.run(sql3, [taskId], (err) => {
//           if (err) return reject(err);
//           resolve(null);
//         });
//       });
//     });
//   });
// };
exports.deleteTask = function (taskId, owner) {
  return new Promise((resolve, reject) => {
    const sql1 = "SELECT owner FROM tasks t WHERE t.id = ?";
    db.all(sql1, [taskId], (err, rows) => {
      if (err) reject(err);
      else if (rows.length === 0) reject(404);
      else if (owner != rows[0].owner) {
        reject(403);
      } else {
        const sql2 = "DELETE FROM assignments WHERE task = ?";
        db.run(sql2, [taskId], (err) => {
          if (err) reject(err);
          else {
            const sql3 = "DELETE FROM tasks WHERE id = ?";
            db.run(sql3, [taskId], (err) => {
              if (err) reject(err);
              else {
                //Delete the corresponding MQTT message
                var message = new MQTTMessage(
                  "DELETE",
                  null,
                  owner,
                  null,
                  taskId,
                  null
                );
                mqtt.publishTaskMessage(String(taskId), message);
                //mqtt.publishTaskMessage(taskId, null); //uncomment if we want to clear the last retained message
                mqtt.deleteMessage(taskId);
                resolve(null);
              }
            });
          }
        });
      }
    });
  });
};

/**
 * Retrieve the public tasks
 *
 * Input:
 * - req: the request of the user
 * Output:
 * - list of the public tasks
 *
 **/
exports.getPublicTasks = function (req) {
  return new Promise((resolve, reject) => {
    var sql = `
      SELECT t.id as tid, t.*
      FROM tasks t
      WHERE t.private = 0`;
    var limits = getPagination(req);
    if (limits.length != 0) sql += " LIMIT ?,?";
    db.all(sql, limits, (err, rows) => {
      if (err) return reject(err);

      resolve(rows.map((row) => createTask(row)));
    });
  });
};

/**
 * Retrieve the number of public tasks
 *
 * Input:
 * - none
 * Output:
 * - total number of public tasks
 *
 **/
exports.getPublicTasksTotal = function () {
  return new Promise((resolve, reject) => {
    const sqlNumOfTasks = `
      SELECT count(*) AS total 
      FROM tasks t
      WHERE t.private = 0`;
    db.get(sqlNumOfTasks, [], (err, row) => {
      if (err) return reject(err);

      resolve(row.total);
    });
  });
};

/**
 * Retrieve the task having taskId as ID
 *
 * Input:
 * - taskId: the ID of the task that needs to be retrieved
 * - owner: ID of the user who is retrieving the task
 * Output:
 * - the requested task
 *
 **/
exports.getSingleTask = function (taskId, owner) {
  return new Promise((resolve, reject) => {
    const sql1 = `
      SELECT t.id as tid, t.*
      FROM tasks t
      WHERE t.id = ?`;

    db.all(sql1, [taskId], (err, rows) => {
      if (err) return reject(err);
      if (rows.length === 0) return reject(404);
      if (rows[0].owner == owner) return resolve(createTask(rows[0]));

      const sql2 = `
        SELECT t.id AS total 
        FROM tasks as t, assignments as a 
        WHERE t.id = a.task 
        AND t.id = ? 
        AND a.user = ?`;
      db.all(sql2, [taskId, owner], (err, rows2) => {
        if (err) return reject(err);
        if (rows2.length === 0) return reject(403);

        resolve(createTask(rows[0]));
      });
    });
  });
};

/**
 * Retreve the tasks created by the user
 *
 * Input:
 * -req: the request of the user
 * Output:
 * - the list of owned tasks
 *
 **/
exports.getOwnedTasks = function (req) {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT t.id as tid, t.*
      FROM tasks as t 
      WHERE t.owner = ?`;
    const limits = getPagination(req);
    if (limits.length != 0) sql = sql + " LIMIT ?,?";

    db.all(sql, [req.user, ...limits], (err, rows) => {
      if (err) return reject(err);

      resolve(rows.map((row) => createTask(row)));
    });
  });
};

/**
 * Retreve the tasks assigned to the user
 *
 * Input:
 * - req: the request of the user
 * Output:
 * - the list of assigned tasks
 *
 **/
exports.getAssignedTasks = function (req) {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT t.id as tid, t.* , a.active, u.id as uid, u.*
      FROM tasks as t, users as u, assignments as a 
      WHERE t.id = a.task 
      AND a.user = u.id 
      AND u.id = ?`;
    const limits = getPagination(req);
    if (limits.length != 0) sql = sql + " LIMIT ?,?";

    db.all(sql, [req.user, ...limits], (err, rows) => {
      if (err) return reject(err);

      resolve(rows.map((row) => createTask(row)));
    });
  });
};

/**
 * Retrieve the number of owned tasks
 *
 * Input:
 * - req: the request of the user
 * Output:
 * - total number of owned tasks
 *
 **/
exports.getOwnedTasksTotal = function (req) {
  return new Promise((resolve, reject) => {
    const sqlNumOfTasks = `
      SELECT count(*) AS total 
      FROM tasks AS t 
      WHERE t.owner = ?`;
    db.get(sqlNumOfTasks, [req.user], (err, row) => {
      if (err) return reject(err);

      resolve(row.total);
    });
  });
};

/**
 * Retrieve the number of assigned tasks
 *
 * Input:
 * - req: the request of the user
 * Output:
 * - total number of assigned tasks
 *
 **/
exports.getAssignedTasksTotal = function (req) {
  return new Promise((resolve, reject) => {
    const sqlNumOfTasks = `
      SELECT count(*) AS total 
      FROM assignments as a 
      WHERE a.user = ?`;

    db.get(sqlNumOfTasks, [req.user], (err, row) => {
      if (err) return reject(err);

      resolve(row.total);
    });
  });
};

/**
 * Update a task
 *
 * Input:
 * - task: new task object
 * - taskID: the ID of the task to be updated
 * - owner: the ID of the user who wants to update the task
 * Output:
 * - no response expected for this operation
 *
 **/
exports.updateSingleTask = function (task, taskId, owner) {
  return new Promise((resolve, reject) => {
    let status = "other";
    let operation = "UPDATE";
    db.all(
      recurringQueries.GET_OWNER_BY_TASK_ID,
      [taskId],
      async (err, rows) => {
        if (err) return reject(err);
        if (rows.length === 0) return reject(404);
        if (owner != rows[0].owner) return reject(403);

        const task2 = await exports.getSingleTask(taskId, owner);
        if (task2.private === task.private) task.private = undefined;

        const sql2 = "DELETE FROM assignments WHERE task = ?";
        db.run(sql2, [taskId], (err) => {
          if (err) return reject(err);

          var sql3 = "UPDATE tasks SET description = ?";
          var parameters = [task.description];
          if (task.important != undefined) {
            sql3 = sql3.concat(", important = ?");
            parameters.push(task.important);
          }
          if (task.private != undefined) {
            sql3 = sql3.concat(", private = ?");
            parameters.push(task.private);
            status = task.private ? "private" : "public";
            operation = task.private ? "DELETE" : "CREATE";
          }
          if (task.project != undefined) {
            sql3 = sql3.concat(", project = ?");
            parameters.push(task.project);
          }
          if (task.deadline != undefined) {
            sql3 = sql3.concat(", deadline = ?");
            parameters.push(task.deadline);
          }
          sql3 = sql3.concat(" WHERE id = ?");
          parameters.push(task.id);

          db.run(sql3, parameters, (err) => {
            if (err) return reject(err);

            const message = new MQTTMessage(
              operation,
              status,
              owner,
              null,
              task.id,
              task
            );

            mqtt.publishTaskMessage(
              status === "public" ? "public" : String(task.id),
              message
            );

            resolve(null);
          });
        });
      }
    );
  });
};

/**
 * Complete a task
 *
 * Input:
 * - taskID: the ID of the task to be completed
 * - assignee: the ID of the user who wants to complete the task
 * Output:
 * - no response expected for this operation
 *
 **/
exports.completeTask = function (taskId, assignee) {
  return new Promise((resolve, reject) => {
    const sql1 = `
      SELECT * 
      FROM assignments a 
      WHERE a.user = ? AND a.task = ?`;
    db.all(sql1, [assignee, taskId], (err, rows2) => {
      if (err) return reject(err);
      if (rows2.length === 0) return reject(404);

      const sql2 = "UPDATE tasks SET completed = 1 WHERE id = ?";
      db.run(sql2, [taskId], function (err) {
        if (err) return reject(err);

        const message = new MQTTMessage(
          "UPDATE",
          "completed",
          null,
          null,
          taskId
        );

        mqtt.publishTaskMessage(String(taskId), message);

        resolve(null);
      });
    });
  });
};

/**
 * Utility functions
 */
const getPagination = function (req) {
  const pageNo = req.query.pageNo ? Number.parseInt(req.query.pageNo) : 1;

  return [constants.OFFSET * (pageNo - 1), constants.OFFSET];
};

const createTask = function (row) {
  return new Task(
    row.tid,
    row.description,
    row.important === 1 ? true : false,
    row.private === 1 ? true : false,
    row.deadline,
    row.project,
    row.completed === 1 ? true : false,
    row.active
  );
};
