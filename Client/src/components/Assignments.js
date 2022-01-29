import React, { useState } from "react";
import { Dropdown } from "semantic-ui-react";
import Button from "react-bootstrap/Button";

const Assignments = ({
  taskList,
  userList,
  addAssignment,
  removeAssignment,
}) => {
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [selectedUser, setSelectedUser] = useState(-1);

  return (
    <div>
      <h1>Assign and Remove Tasks</h1>
      <Dropdown
        placeholder="Available users"
        fluid
        clearable
        selection
        options={userList.map((user) => ({
          key: user.userId,
          text: user.userName,
          value: user.userId,
        }))}
        onChange={(e, { value }) => setSelectedUser(value)}
      />
      <Dropdown
        placeholder="Available tasks"
        fluid
        multiple
        clearable
        selection
        options={taskList.map((task) => ({
          key: task.id,
          text: task.description,
          value: task.id,
        }))}
        onChange={(e, { value }) => setSelectedTasks(value)}
      />
      <div className="d-flex justify-content-between mt-2">
        <Button
          onClick={() => addAssignment(selectedUser, selectedTasks)}
          variant="success"
        >
          Assign tasks to the user
        </Button>
        <Button
          onClick={() => removeAssignment(selectedUser, selectedTasks)}
          variant="success"
        >
          Remove tasks from the user
        </Button>
      </div>
    </div>
  );
};

const styleLink = document.createElement("link");
styleLink.rel = "stylesheet";
styleLink.href =
  "https://cdn.jsdelivr.net/npm/semantic-ui/dist/semantic.min.css";
document.head.appendChild(styleLink);

export default Assignments;
