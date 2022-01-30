"use strict";

var mqtt = require("mqtt");
var Assignments = require("../service/AssignmentsService");
var MQTTTaskMessage = require("./mqtt_message.js");

var host = "ws://127.0.0.1:8080";
var clientId = "mqttjs_" + Math.random().toString(16).substr(2, 8);
var options = {
  keepalive: 30,
  clientId: clientId,
  clean: true,
  reconnectPeriod: 60000,
  connectTimeout: 30 * 1000,
  will: {
    topic: "WillMsg",
    payload: "Connection Closed abnormally..!",
    qos: 0,
    retain: false,
  },
  rejectUnauthorized: false,
};
var mqtt_connection = mqtt.connect(host, options);

var taskMessageMap = new Map();

mqtt_connection.on("error", function (err) {
  console.log(err);
  mqtt_connection.end();
});

//When the connection with the MQTT broker is established, a retained message for each task is sent
mqtt_connection.on("connect", () => {
  console.log("client connected:", clientId);
  Assignments.getTaskSelections()
    .then((selections) => {
      selections.forEach((selection) => {
        const message = new MQTTTaskMessage(
          "UPDATE",
          selection.userId ? "active" : "inactive",
          selection.userId,
          selection.userName,
          selection.taskId
        );
        // taskMessageMap.set(selection.taskId, message);
        mqtt_connection.publish(
          `task_${selection.taskId}`,
          JSON.stringify(message),
          { qos: 2, retain: true }
        );
      });
    })
    .catch((error) => {
      console.error(error);
      mqtt_connection.end();
    });
});

mqtt_connection.on("close", function () {
  console.log(clientId + " disconnected");
});

module.exports.publishTaskMessage = function publishTaskMessage(
  topic,
  message,
  options
) {
  mqtt_connection.publish(`task_${topic}`, JSON.stringify(message), options);
};

module.exports.saveMessage = function saveMessage(taskId, message) {
  taskMessageMap.set(taskId, message);
  //console.log("MAP MQTT:", taskMessageMap)
};

module.exports.getMessage = function getMessage(taskId) {
  taskMessageMap.get(taskId);
};

module.exports.deleteMessage = function deleteMessage(taskId) {
  taskMessageMap.delete(taskId);
};
