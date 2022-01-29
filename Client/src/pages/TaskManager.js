import { useEffect, useState } from "react";
import { Button, Col } from "react-bootstrap";
import { useHistory, useParams } from "react-router";
import API from "../API";
import ContentList from "../components/ContentList";
import Filters from "../components/Filters";
import MiniOnlineList from "../components/MiniOnlineList";
import ModalForm from "../components/ModalForm";
import dayjs from "dayjs";

var mqtt = require("mqtt");
var clientId = "mqttjs_" + Math.random().toString(16).substr(2, 8);
var options = {
  keepalive: 30,
  clientId: clientId,
  clean: true,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
  will: {
    topic: "WillMsg",
    payload: "Connection Closed abnormally..!",
    qos: 0,
    retain: false,
  },
  rejectUnauthorized: false,
};
var host = "ws://127.0.0.1:8080";
var client = mqtt.connect(host, options);
const filters = {
  owned: { label: "Owned Tasks", id: "owned" },
  assigned: { label: "Assigned Tasks", id: "assigned" },
  public: { label: "Public Tasks", id: "public" },
};
const EventEmitter = require("events");
const handler = new EventEmitter();

const TaskManager = ({ onCheck, onlineList, loggedIn }) => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(undefined);
  const [pageInfo, setPageInfo] = useState({
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
  });
  const [refetchTasks, setRefetchTasks] = useState(false);
  const [assignedTaskList, setAssignedTaskList] = useState([]);
  const [ownedTaskList, setOwnedTaskList] = useState([]);
  const [publicTask, setPublicTask] = useState([]);
  const [newMessage, setNewMessage] = useState(false);
  const [parsedMessage, setParsedMessage] = useState(undefined);
  const [topic, setTopic] = useState("");
  const history = useHistory();
  const { filter } = useParams();

  useEffect(() => {
    if (newMessage && parsedMessage !== undefined) {
      switch (parsedMessage.operation) {
        case "CREATE":
          if (history.location.pathname.includes("public")) {
            if (tasks.length === 10) {
              setPageInfo((oldInfos) => {
                oldInfos.totalItems += 1;
                return { ...oldInfos };
              });
            } else {
              const task = Object.assign({}, parsedMessage.payload, {
                deadline:
                  parsedMessage.payload.deadline &&
                  dayjs(parsedMessage.payload.deadline),
              });
              setTasks((oldList) => [...tasks, task]);
            }
          }
          // Subscribe to receive update of the newer task
          console.log("Subscribing to ", String(parsedMessage.taskId));
          client.subscribe(String(parsedMessage.taskId), { qos: 2 });
          break;
        case "DELETE":
          console.log("Unsubscribing to ", topic);
          client.unsubscribe(topic);
          setTasks((oldList) => {
            if (history.location.pathname.includes("public")) {
              var tempList = oldList.filter(
                (t) => t.id !== parseInt(parsedMessage.taskId)
              );
              console.log(
                "Old task list:",
                oldList,
                " new Task List:",
                tempList,
                " filter:",
                history.location.pathname
              );
              return tempList;
            } else return oldList;
          });

          break;
        case "UPDATE":
          if (
            parsedMessage.status === "active" ||
            parsedMessage.status === "inactive"
          ) {
            // Selection/Deselection of task
            var index = tasks.findIndex((x) => x.taskId === parseInt(topic));
            let objectStatus = {
              taskId: parseInt(topic),
              userName: parsedMessage.userName,
              status: parsedMessage.status,
            };
            var temp = tasks;
            index === -1
              ? temp.push(objectStatus)
              : (temp[index] = objectStatus);

            setAssignedTaskList(temp);
          } else if (parsedMessage.status === "public") {
            // Task has been changed to public
            // setTasks(tempList);
            // setPublicTask(tempList);
            setTasks((oldList) => {
              if (history.location.pathname.includes("public")) {
                console.log(
                  "Task ",
                  String(parsedMessage.taskId),
                  " now is public"
                );
                const task = Object.assign({}, parsedMessage.payload, {
                  deadline:
                    parsedMessage.payload.deadline &&
                    dayjs(parsedMessage.payload.deadline),
                });
                var tempList = oldList.filter(
                  (t) => t.id !== parseInt(task.id)
                );
                tempList.push(task);
                console.log(
                  "Old task list:",
                  oldList,
                  " new Task List:",
                  tempList,
                  " filter:",
                  history.location.pathname
                );
                return tempList;
              } else return oldList;
            });

            console.log(
              "Subscribing to task public ",
              String(parsedMessage.taskId)
            );
            client.subscribe(String(parsedMessage.taskId), { qos: 2 });
          } else if (
            parsedMessage.status === "private" &&
            history.location.pathname.includes("public")
          ) {
            // Task has been changed to private
            setTasks((oldList) => {
              if (history.location.pathname.includes("public")) {
                console.log("Task ", topic, " now is private");
                var tempList = oldList.filter(
                  (t) => t.id !== parseInt(parsedMessage.taskId)
                );
                console.log(
                  "Old task list:",
                  oldList,
                  " new Task List:",
                  tempList,
                  " filter:",
                  history.location.pathname
                );

                return tempList;
              } else return oldList;
            });
            console.log("Unsubscribing from private task ", topic);
            client.unsubscribe(String(topic));
            // setTasks(tempList);
          } else {
            // Other update operation

            // Check if the task is public
            if (
              !parsedMessage.payload.private &&
              history.location.pathname.includes("public")
            ) {
              console.log("Task ", topic, " has been updated");

              setTasks((oldList) => {
                if (history.location.pathname.includes("public")) {
                  const task = Object.assign({}, parsedMessage.payload, {
                    deadline:
                      parsedMessage.payload.deadline &&
                      dayjs(parsedMessage.payload.deadline),
                  });
                  var tempList = oldList.filter(
                    (t) => t.id !== parseInt(task.id)
                  );
                  console.log(tempList);
                  //Insert updated task
                  tempList.push(task);
                  console.log(
                    "Old task list:",
                    oldList,
                    " new Task List:",
                    tempList,
                    " filter:",
                    history.location.pathname
                  );
                  return tempList;
                } else return oldList;
              });
            }
          }
          break;
        default:
          break;
      }
      setNewMessage(false);
      setParsedMessage(undefined);
      setTopic("");
    }
  }, [newMessage, parsedMessage]);

  useEffect(() => {
    onPageChange(filter, 1);
  }, [filter]);

  useEffect(() => {
    // MQTT
    client.on("error", (err) => {
      console.log(err);
      client.end();
    });

    client.on("connect", () => {
      console.log("Client connected " + clientId);
      console.log("Subscribing to publicTasks");
      client.subscribe("publicTasks", { qos: 2, retain: true });
    });

    client.on("message", (topic, message, packet) => {
      try {
        // console.log("MQTT message: " + message.toString() + " from topic: " + topic);
        const payload = JSON.parse(message);
        setNewMessage(true);
        setParsedMessage(payload);
        setTopic(topic);
        // displayTaskUpdating(topic, parsedMessage);
      } catch (err) {
        console.log("Message that caused error: " + message.toString());
        console.log(err);
      }
    });

    client.on("close", () => {
      console.log(`Client ${clientId} disconnected `);
    });
  }, []);

  useEffect(() => {
    if (refetchTasks) {
      API.getTasks(filter).then((payload) => {
        setTasks(payload.tasks);
        setPageInfo(payload.pageInfo);
        setRefetchTasks(false);
      });
    }
  }, [filter, refetchTasks]);

  const updateCorrectTaskList = (filter, tasks) => {
    switch (filter) {
      case "owned":
        setOwnedTaskList(tasks);
        break;

      case "public":
        setPublicTask(tasks);
        break;
      default:
        break;
    }
  };

  const onPageChange = (filter, page) => {
    API.getTasks(filter, page).then((payload) => {
      setTasks(payload.tasks);
      //updateCorrectTaskList(filter, payload.tasks);
      setPageInfo(payload.pageInfo);

      if (history.location.pathname.includes("public")) {
        for (var i = 0; i < payload.tasks.length; i++) {
          client.subscribe(String(payload.tasks[i].id), { qos: 2 });
          console.log("Subscribing to public task " + payload.tasks[i].id);
        }
      }
      if (filter === "assigned") {
        for (var i = 0; i < payload.tasks.length; i++) {
          client.subscribe(String(payload.tasks[i].id), {
            qos: 0,
            retain: true,
          });
          console.log("Subscribing to assigned " + payload.tasks[i].id);
        }
      }
    });
  };

  const onTaskDelete = (task) => {
    API.deleteTask(task)
      .then(() => setRefetchTasks(true))
      .catch((e) => console.log(e));
  };

  const onTaskComplete = (task) => {
    API.completeTask(task)
      .then(() => setRefetchTasks(true))
      .catch((e) => console.log(e));
  };
  const onTaskEdit = (task) => {
    setSelectedTask(task);
  };

  const onTaskCheck = (task) => {
    API.selectTask(task)
      .then(() => setRefetchTasks(true))
      .catch((e) => {
        alert("Task is already selected by another user!");
        console.log(e);
      });
  };
  const onSaveOrUpdate = (task) => {
    // if the task has an id it is an update
    if (task.id) {
      API.updateTask(task).then((response) => {
        if (response.ok) {
          API.getTasks(filter, pageInfo.currentPage).then((payload) => {
            updateCorrectTaskList(filter, payload.tasks);
            setTasks(payload.tasks);
            setPageInfo(payload.pageInfo);
          });
        }
      });

      // otherwise it is a new task to add
    } else {
      API.addTask(task).then(() => setRefetchTasks(true));
    }
    setSelectedTask(undefined);
  };

  const onFilterSelect = (filter) => history.push("/list/" + filter);

  return (
    <>
      {/* Available filters sidebar */}
      <Col sm={3} id="left-sidebar">
        <Filters
          items={filters}
          defaultActiveKey={filter}
          onSelect={onFilterSelect}
        />
        <MiniOnlineList onlineList={onlineList} />
      </Col>
      <Col sm={9}>
        <h1>
          Filter: <span className="text-muted">{filter}</span>
        </h1>
        <ContentList
          tasks={tasks}
          pageInfo={pageInfo}
          onDelete={onTaskDelete}
          onEdit={onTaskEdit}
          onCheck={onTaskCheck}
          onComplete={onTaskComplete}
          filter={filter}
          onPageChange={onPageChange}
          assignedTaskList={assignedTaskList}
        />
      </Col>
      <Button
        variant="success"
        size="lg"
        className="fixed-right-bottom"
        onClick={() => setSelectedTask({})}
        disabled={!loggedIn}
      >
        +
      </Button>

      {selectedTask !== undefined && (
        <ModalForm
          show={true}
          task={selectedTask}
          onSave={onSaveOrUpdate}
          onClose={() => setSelectedTask(undefined)}
        />
      )}
    </>
  );
};

export default TaskManager;
