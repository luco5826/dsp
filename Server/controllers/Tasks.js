"use strict";

const utils = require("../utils/writer.js");
const constants = require("../utils/constants.js");
const Tasks = require("../service/TasksService.js");

module.exports.addTask = function addTask(req, res, next) {
  const task = req.body;
  const owner = req.user;
  Tasks.addTask(task, owner)
    .then(function (response) {
      utils.writeJson(res, response, 201);
    })
    .catch(function (response) {
      utils.writeJson(
        res,
        { errors: [{ param: "Server", msg: response }] },
        500
      );
    });
};

module.exports.deleteTask = function deleteTask(req, res, next) {
  Tasks.deleteTask(req.params.taskId, req.user)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      if (response == 403) {
        utils.writeJson(
          res,
          {
            errors: [
              { param: "Server", msg: "The user is not the owner of the task" },
            ],
          },
          403
        );
      } else if (response == 404) {
        utils.writeJson(
          res,
          { errors: [{ param: "Server", msg: "The task does not exist." }] },
          404
        );
      } else {
        utils.writeJson(
          res,
          { errors: [{ param: "Server", msg: response }] },
          500
        );
      }
    });
};

module.exports.updateSingleTask = function updateSingleTask(req, res, next) {
  Tasks.updateSingleTask(req.body, req.params.taskId, req.user)
    .then(function (response) {
      utils.writeJson(res, response, 204);
    })
    .catch(function (response) {
      if (response == 403) {
        utils.writeJson(
          res,
          {
            errors: [
              { param: "Server", msg: "The user is not the owner of the task" },
            ],
          },
          403
        );
      } else if (response == 404) {
        utils.writeJson(
          res,
          { errors: [{ param: "Server", msg: "The task does not exist." }] },
          404
        );
      } else {
        utils.writeJson(
          res,
          { errors: [{ param: "Server", msg: response }] },
          500
        );
      }
    });
};

module.exports.getSingleTask = function getSingleTask(req, res, next) {
  Tasks.getSingleTask(req.params.taskId, req.user)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      if (response == 403) {
        utils.writeJson(
          res,
          {
            errors: [
              {
                param: "Server",
                msg: "The user is not the owner or an assignee of the task",
              },
            ],
          },
          403
        );
      } else if (response == 404) {
        utils.writeJson(
          res,
          { errors: [{ param: "Server", msg: "The task does not exist." }] },
          404
        );
      } else {
        utils.writeJson(
          res,
          { errors: [{ param: "Server", msg: response }] },
          500
        );
      }
    });
};

module.exports.getPublicTasks = async function getPublicTasks(req, res, next) {
  const numOfTasks = await Tasks.getPublicTasksTotal();

  Tasks.getPublicTasks(req)
    .then(function (response) {
      const pageNo =
        req.query.pageNo == null ? 1 : Number.parseInt(req.query.pageNo);
      const totalPage = Math.ceil(numOfTasks / constants.OFFSET);
      const next = Number(pageNo) + 1;

      if (pageNo > totalPage) {
        utils.writeJson(
          res,
          { errors: [{ param: "Server", msg: "The page does not exist." }] },
          404
        );
      } else if (pageNo == totalPage) {
        utils.writeJson(res, {
          totalPages: totalPage,
          currentPage: pageNo,
          totalItems: numOfTasks,
          tasks: response,
        });
      } else {
        utils.writeJson(res, {
          totalPages: totalPage,
          currentPage: pageNo,
          totalItems: numOfTasks,
          tasks: response,
          next: "/api/tasks/public?pageNo=" + next,
        });
      }
    })
    .catch(function (response) {
      utils.writeJson(
        res,
        { errors: [{ param: "Server", msg: response }] },
        500
      );
    });
};

module.exports.getOwnedTasks = async function getUserTasks(req, res, next) {
  if (req.user != req.params.userId) {
    utils.writeJson(
      res,
      {
        errors: [
          {
            param: "Server",
            msg: "The user is not characterized by the specified userId.",
          },
        ],
      },
      403
    );
    return;
  }

  const numOfTasks = await Tasks.getOwnedTasksTotal(req);

  Tasks.getOwnedTasks(req).then(function (response) {
    const pageNo =
      req.query.pageNo == null ? 1 : Number.parseInt(req.query.pageNo);
    const totalPage = Math.ceil(numOfTasks / constants.OFFSET);

    const next = pageNo + 1;

    if (pageNo > totalPage) {
      utils.writeJson(
        res,
        { errors: [{ param: "Server", msg: "The page does not exist." }] },
        404
      );
    } else if (pageNo == totalPage) {
      utils.writeJson(res, {
        totalPages: totalPage,
        currentPage: pageNo,
        totalItems: numOfTasks,
        tasks: response,
      });
    } else {
      var nextLink =
        "/api/users/" + req.params.userId + "/tasks/created?pageNo=" + next;
      utils.writeJson(res, {
        totalPages: totalPage,
        currentPage: pageNo,
        totalItems: numOfTasks,
        tasks: response,
        next: nextLink,
      });
    }
  });
};

module.exports.getAssignedTasks = async function getAssignedTasks(
  req,
  res,
  next
) {
  if (req.user != req.params.userId) {
    utils.writeJson(
      res,
      {
        errors: [
          {
            param: "Server",
            msg: "The user is not characterized by the specified userId.",
          },
        ],
      },
      403
    );
    return;
  }

  const numOfTasks = await Tasks.getAssignedTasksTotal(req);

  Tasks.getAssignedTasks(req).then(function (response) {
    const pageNo =
      req.query.pageNo == null ? 1 : Number.parseInt(req.query.pageNo);

    const totalPages = Math.ceil(numOfTasks / constants.OFFSET);
    const next = pageNo + 1;

    if (pageNo > totalPages) {
      utils.writeJson(
        res,
        { errors: [{ param: "Server", msg: "The page does not exist." }] },
        404
      );
    } else if (pageNo === totalPages) {
      utils.writeJson(res, {
        totalPages,
        currentPage: pageNo,
        totalItems: numOfTasks,
        tasks: response,
      });
    } else {
      var nextLink =
        "/api/users/" + req.params.userId + "/tasks/assigned?pageNo=" + next;
      utils.writeJson(res, {
        totalPages,
        currentPage: pageNo,
        totalItems: numOfTasks,
        tasks: response,
        next: nextLink,
      });
    }
  });
};

module.exports.completeTask = function completeTask(req, res, next) {
  Tasks.completeTask(req.params.taskId, req.user)
    .then((response) => utils.writeJson(res, response, 204))
    .catch(function (response) {
      if (response == 403) {
        utils.writeJson(
          res,
          {
            errors: [
              {
                param: "Server",
                msg: "The user is not an assignee of the task",
              },
            ],
          },
          403
        );
      } else if (response == 404) {
        utils.writeJson(
          res,
          { errors: [{ param: "Server", msg: "The task does not exist." }] },
          404
        );
      } else {
        utils.writeJson(
          res,
          { errors: [{ param: "Server", msg: response }] },
          500
        );
      }
    });
};
