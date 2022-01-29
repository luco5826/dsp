import { useEffect, useState, useContext } from "react";
import { Button, Col } from "react-bootstrap";
import { useHistory, useParams } from "react-router";
import API from "../API";
import ContentList from "../components/ContentList";
import Filters from "../components/Filters";
import MiniOnlineList from "../components/MiniOnlineList";
import ModalForm from "../components/ModalForm";
import UserContext from "../contexts/UserContext";
import dayjs from "dayjs";
import mqtt from "mqtt";

const host = "ws://127.0.0.1:8080";

const clientId = "mqttjs_" + Math.random().toString(16).substring(2, 8);
const options = {
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

const client = mqtt.connect(host, options);
const filters = {
  owned: { label: "Owned Tasks", id: "owned" },
  assigned: { label: "Assigned Tasks", id: "assigned" },
  public: { label: "Public Tasks", id: "public" },
};

const TaskManager = ({ onlineList, loggedIn }) => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(undefined);
  const [pageInfo, setPageInfo] = useState({
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
  });
  const [parsedMessage, setParsedMessage] = useState(undefined);

  const history = useHistory();
  const { filter } = useParams();

  const user = useContext(UserContext);

  useEffect(() => {
    if (parsedMessage === undefined) return;

    const { topic } = parsedMessage;

    switch (parsedMessage.operation) {
      case "CREATE":
        if (filter === "public") {
          if (tasks.length === 10) {
            // Cannot display the task in the current page, update just the pagination
            setPageInfo((oldInfos) => {
              return { ...oldInfos, totalItems: oldInfos.totalItems + 1 };
            });
          } else {
            setTasks([...tasks, parsedMessage.payload]);
          }
        }

        // Subscribe to receive update of the newer task
        console.log("TASK CREATED::Subscribing to task:", parsedMessage.taskId);
        client.subscribe(parsedMessage.taskId.toString(), { qos: 2 });
        break;
      case "DELETE":
        console.log("TASK DELETED::Unsubscribing from:", topic);
        client.unsubscribe(topic);
        if (filter === "public") {
          setTasks(
            tasks.filter((t) => t.id !== Number.parseInt(parsedMessage.taskId))
          );
        }
        break;
      case "UPDATE":
        console.log("TASK UPDATED::", parsedMessage.taskId);
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
          index === -1 ? temp.push(objectStatus) : (temp[index] = objectStatus);

          setTasks(temp);
        } else {
          // Check if the task is public
          // prettier-ignore
          if (filter === "public") {
            const updatedTask = parsedMessage.payload;

            // Update the task in place so that the list does not get rerendered
            const targetTask = tasks.find((t) => t.id === Number.parseInt(updatedTask.id));
            for (const key in targetTask) {
              targetTask[key] = updatedTask[key];
            }
            setTasks([...tasks]);
          }
        }
        break;
      default:
        break;
    }
    setParsedMessage(undefined);
  }, [parsedMessage, filter, tasks]);

  useEffect(() => {
    onPageChange(filter, 1);
    // eslint-disable-next-line
  }, [filter, user]);

  /**
   * MQTT setup phase
   */
  useEffect(() => {
    client.on("error", (err) => {
      console.error(err);
      client.end();
    });

    client.on("connect", () => {
      console.log("Client connected with ID:", clientId);
      console.log("Subscribing to publicTasks");
      client.subscribe("publicTasks", { qos: 2, retain: true });
    });

    client.on("message", (topic, message) => {
      const result = JSON.parse(message);
      result.topic = topic;
      if (result.payload)
        result.payload.deadline = result.payload.deadline
          ? dayjs(result.payload.deadline)
          : undefined;

      setParsedMessage(result);
    });

    client.on("close", () => console.log(`Client ${clientId} disconnected `));

    return () => client.unsubscribe("publicTasks");
  }, []);

  const onPageChange = (filter, page) => {
    if (filter !== "public" && !user) return;

    API.getTasks(filter, page, user).then((payload) => {
      if (payload === 401) {
        history.push("/list/public");
        return;
      }

      setTasks(payload.tasks);
      setPageInfo(payload.pageInfo);

      if (client.connected) {
        if (tasks.length !== 0) {
          for (const { id } of tasks) {
            client.unsubscribe(String(id));
            console.log(`Unsubscribing to ${filter} task: ${id}`);
          }
        }

        for (const { id } of payload.tasks) {
          client.subscribe(String(id), { qos: 2 });
          console.log(`Subscribing to ${filter} task: ${id}`);
        }
      }
    });
  };

  const onTaskDelete = (task) => {
    API.deleteTask(task)
      .then(() => onPageChange(filter, pageInfo.currentPage))
      .catch((e) => console.log(e));
  };

  const onTaskComplete = (task) => {
    API.completeTask(task)
      .then(() => onPageChange(filter, pageInfo.currentPage))
      .catch((e) => console.log(e));
  };
  const onTaskEdit = (task) => {
    setSelectedTask(task);
  };

  const onTaskCheck = (task) => {
    API.selectTask(task, user.id)
      .then(() => onPageChange(filter, pageInfo.currentPage))
      .catch(() => alert("Task is already selected by another user!"));
  };

  const onSaveOrUpdate = (task) => {
    // if the task has an id it is an update
    if (task.id) {
      API.updateTask(task).then((response) => {
        // prettier-ignore
        if (response.ok) {
          // Update the task in place so that the list does not get rerendered
          const targetTask = tasks.find((t) => t.id === Number.parseInt(task.id));
          for (const key in targetTask) {
            targetTask[key] = task[key];
          }
          setTasks([...tasks]);
        }
      });

      // otherwise it is a new task to add
    } else {
      API.addTask(task).then(() => onPageChange(filter, pageInfo.currentPage));
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
        />
      </Col>
      {loggedIn && (
        <Button
          variant="success"
          size="lg"
          className="fixed-right-bottom"
          onClick={() => setSelectedTask({})}
        >
          +
        </Button>
      )}

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
