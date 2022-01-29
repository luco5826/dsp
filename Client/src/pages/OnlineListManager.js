import React from "react";
import { Col } from "react-bootstrap";
import MiniOnlineList from "../components/MiniOnlineList";
import OnlineUserCard from "../components/OnlineUserCard";

const OnlineListManager = ({ userList }) => {
  return (
    <>
      <Col sm={3} bg="light" id="left-sidebar">
        <MiniOnlineList onlineList={userList} />
      </Col>
      <Col sm={9}>
        <h1>Online Users</h1>
        {userList.map((user) => (
          <OnlineUserCard
            key={user.userId}
            selectedInfo={user}
            id={user.userId}
            name={user.userName}
          />
        ))}
      </Col>
    </>
  );
};

export default OnlineListManager;
