import React from "react";
import ListGroup from "react-bootstrap/ListGroup";
import world from "../images/world.png";

const MiniOnlineList = ({ onlineList }) => {
  return (
    <ListGroup variant="flush" className="mt-3">
      <h3>
        Online Users
        <img
          src={world}
          alt={"Eagle"}
          width="16"
          height="16"
          className="mx-3"
        />
      </h3>
      {onlineList.map((user) => (
        <ListGroup.Item
          key={user.userId}
        >{`${user.userId} - ${user.userName}`}</ListGroup.Item>
      ))}
    </ListGroup>
  );
};

export default MiniOnlineList;
