/**
 * All the API calls
 */

import dayjs from "dayjs";
import Task from "./model/Task";
import User from "./model/User";

const BASEURL = "/api";

function getJson(httpResponsePromise) {
  return new Promise((resolve, reject) => {
    httpResponsePromise
      .then((response) => {
        if (response.ok) {
          // always return {} from server, never null or non json, otherwise it will fail
          response
            .json()
            .then((json) => resolve(json))
            .catch((err) =>
              reject({ error: "Cannot parse server response", err })
            );
        } else {
          // analyze the cause of error
          response
            .json()
            .then((obj) => reject(obj)) // error msg in the response body
            .catch((err) =>
              reject({ error: "Cannot parse server response", err })
            ); // something else
        }
      })
      .catch((err) => reject({ error: "Cannot communicate" })); // connection error
  });
}

const getTasks = async (filter, page, user) => {
  let url = BASEURL + "/tasks/public";
  if (filter === "owned") {
    url = `${BASEURL}/users/${user?.id || 0}/tasks/created`;
  } else if (filter === "assigned") {
    url = url = `${BASEURL}/users/${user?.id || 0}/tasks/assigned`;
  }

  if (page) {
    url += "?pageNo=" + page;
  }
  const response = await fetch(url);
  if (response.status !== 200) return response.status;

  const json = await response.json();
  return {
    pageInfo: {
      totalItems: Number.parseInt(json.totalItems),
      totalPages: Number.parseInt(json.totalPages),
      currentPage: Number.parseInt(json.currentPage),
    },
    tasks: json.tasks.map((task) =>
      Object.assign({}, task, {
        deadline: task.deadline && dayjs(task.deadline),
      })
    ),
  };
};

async function getAllOwnedTasks(userId) {
  let url = `${BASEURL}/users/${userId}/tasks/created`;
  let allTasks = [];
  let finished = false;

  while (!finished) {
    const response = await fetch(url);
    const responseJson = await response.json();
    const tasksJson = responseJson.tasks;

    if (response.ok) {
      tasksJson.forEach((t) => {
        let task = new Task(
          t.id,
          t.description,
          t.important,
          t.privateTask,
          t.deadline,
          t.project,
          t.completed
        );
        allTasks.push(task);
      });
      if (responseJson.next === undefined) {
        finished = true;
      } else {
        url = responseJson.next;
      }
    } else {
      let err = { status: response.status, errObj: tasksJson };
      throw err; // An object with the error coming from the server
    }
  }

  return allTasks;
}

function addTask(task) {
  return getJson(
    fetch(BASEURL + "/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...task, completed: false }),
    })
  );
}

function updateTask(task) {
  return fetch(BASEURL + "/tasks/" + task.id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(task),
  });
}

async function deleteTask(task) {
  const response = await fetch(BASEURL + "/tasks/" + task.id, {
    method: "DELETE",
  });
  if (!response.ok) {
    let err = { status: response.status, errObj: response.json };
    throw err;
  }
}

async function completeTask(task) {
  const response = await fetch(BASEURL + "/tasks/" + task.id + "/completion", {
    method: "PUT",
  });
  if (!response.ok) {
    let err = { status: response.status, errObj: response.json };
    throw err;
  }
}

async function selectTask(task, userId) {
  const response = await fetch(`${BASEURL}/users/${userId}/selection`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!response.ok) {
    let err = { status: response.status, errObj: response.json };
    throw err;
  }
}

async function logIn(credentials) {
  const response = await fetch("/api/users/authenticator", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });
  if (response.ok) {
    return await response.json();
  } else {
    try {
      const errDetail = await response.json();
      throw errDetail.message;
    } catch (err) {
      throw err;
    }
  }
}

async function logOut() {
  await fetch("/api/users/authenticator/logout");
}

async function getUserInfo() {
  const result = await fetch("/api/users/authenticator");
  if (result.status === 401) return undefined;

  return result.json();
}

async function getUsers() {
  let url = "/users";

  const response = await fetch(BASEURL + url);
  const responseJson = await response.json();
  if (response.ok) {
    return responseJson.map((u) => new User(u.id, u.name, u.email));
  } else {
    let err = { status: response.status, errObj: responseJson };
    throw err; // An object with the error coming from the server
  }
}

async function assignTask(userId, taskId) {
  return new Promise((resolve, reject) => {
    fetch(BASEURL + "/tasks/" + taskId + "/assignees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: userId }),
    })
      .then((response) => {
        if (response.ok) {
          resolve(null);
        } else {
          // analyze the cause of error
          response
            .json()
            .then((obj) => {
              reject(obj);
            }) // error msg in the response body
            .catch((err) => {
              reject({
                errors: [
                  { param: "Application", msg: "Cannot parse server response" },
                ],
              });
            }); // something else
        }
      })
      .catch((err) => {
        reject({ errors: [{ param: "Server", msg: "Cannot communicate" }] });
      }); // connection errors
  });
}

async function removeAssignTask(userId, taskId) {
  return new Promise((resolve, reject) => {
    fetch(BASEURL + "/tasks/" + taskId + "/assignees/" + userId, {
      method: "DELETE",
    })
      .then((response) => {
        if (response.ok) {
          resolve(null);
        } else {
          // analyze the cause of error
          response
            .json()
            .then((obj) => {
              reject(obj);
            }) // error msg in the response body
            .catch((err) => {
              reject({
                errors: [
                  { param: "Application", msg: "Cannot parse server response" },
                ],
              });
            }); // something else
        }
      })
      .catch((err) => {
        reject({ errors: [{ param: "Server", msg: "Cannot communicate" }] });
      }); // connection errors
  });
}

const API = {
  addTask,
  getTasks,
  getAllOwnedTasks,
  updateTask,
  deleteTask,
  selectTask,
  logIn,
  logOut,
  getUserInfo,
  getUsers,
  assignTask,
  removeAssignTask,
  completeTask,
};
export default API;
