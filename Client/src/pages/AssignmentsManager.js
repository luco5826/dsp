import React, { useEffect, useState } from "react";
import { Col } from "react-bootstrap";
import API from "../API";
import Assignments from "../components/Assignments";
import MiniOnlineList from "../components/MiniOnlineList";

const AssignmentsManager = ({ onlineList }) => {
  const [userList, setUserList] = useState([]);
  const [ownedTasks, setOwnedTasks] = useState([]);

  useEffect(() => {
    API.getUsers().then((users) => setUserList(users));
    API.getAllOwnedTasks().then((tasks) => setOwnedTasks(tasks));
  }, []);

  const assignTask = async (userId, taskIdList) => {
    taskIdList.forEach(async (tId) => {
      await API.assignTask(Number.parseInt(userId), tId);
    });
  };

  const removeAssignTask = async (userId, taskIdList) => {
    taskIdList.forEach(async (tId) => {
      await API.removeAssignTask(Number.parseInt(userId), tId);
    });
  };

  return (
    <>
      <Col sm={3} bg="light" id="left-sidebar">
        <MiniOnlineList onlineList={onlineList} />
      </Col>
      <Col
        sm={9}
        bg="light"
        id="left-sidebar"
        className="collapse d-sm-block below-nav"
      >
        <Assignments
          taskList={ownedTasks}
          userList={userList}
          addAssignment={assignTask}
          removeAssignment={removeAssignTask}
        />
      </Col>
    </>
  );
};

export default AssignmentsManager;
