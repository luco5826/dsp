import React from "react";
import { Card } from "semantic-ui-react";

const OnlineUserCard = ({ id, name, selectedInfo }) => {
  return (
    <Card>
      <Card.Content header={name} />
      <Card.Content description={"UserID: " + id} />
      <Card.Content extra>
        {selectedInfo.taskId !== undefined
          ? "Task selected: " +
            selectedInfo.taskId +
            " " +
            selectedInfo.taskName
          : "Task not selected"}
      </Card.Content>
    </Card>
  );
};

const styleLink = document.createElement("link");
styleLink.rel = "stylesheet";
styleLink.href =
  "https://cdn.jsdelivr.net/npm/semantic-ui/dist/semantic.min.css";
document.head.appendChild(styleLink);

export default OnlineUserCard;
