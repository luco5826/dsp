import { Form, ListGroup, Button } from "react-bootstrap";
import { PersonSquare, PencilSquare, Trash } from "react-bootstrap-icons";
import Pagination from "react-js-pagination";

const formatDeadline = (d) => {
  if (!d) return "--o--";
  else if (d.isToday()) {
    return d.format("[Today at] HH:mm");
  } else if (d.isTomorrow()) {
    return d.format("[Tomorrow at] HH:mm");
  } else if (d.isYesterday()) {
    return d.format("[Yesterday at] HH:mm");
  } else {
    return d.format("dddd DD MMMM YYYY [at] HH:mm");
  }
};

const TaskRowData = ({ task, onCheck, filter, owner }) => {
  const labelClasses = [
    task.important ? "important" : "",
    task.completed ? "completed" : "",
  ];

  return (
    <div className="d-flex flex-fill justify-content-between align-items-center">
      <Form.Check type="checkbox">
        {filter === "assigned" && (
          <Form.Check.Input
            type="radio"
            checked={task.active || false}
            onChange={(ev) => onCheck(ev.target.checked)}
          />
        )}
        <Form.Check.Label className={labelClasses.join(" ")}>
          {task.description}
        </Form.Check.Label>
        <p>{owner}</p>
      </Form.Check>
      <PersonSquare className={task.private ? "d-none" : ""} />
      <small>{formatDeadline(task.deadline)}</small>
    </div>
  );
};

const TaskRowControl = ({ task, onDelete, onEdit, onComplete, filter }) => {
  let buttons = null;
  switch (filter) {
    case "owned":
      buttons = (
        <>
          <Button className="py-0" variant="link" onClick={onEdit}>
            <PencilSquare />
          </Button>
          <Button className="py-0" variant="link" onClick={onDelete}>
            <Trash />
          </Button>
        </>
      );
      break;
    case "assigned":
      buttons = (
        <Button
          className="py-0"
          variant="success"
          disabled={task.completed}
          onClick={onComplete}
        >
          Complete
        </Button>
      );
      break;
    default:
      break;
  }

  return buttons;
};

const ContentList = ({
  tasks,
  pageInfo,
  onDelete,
  onEdit,
  onCheck,
  onComplete,
  filter,
  onPageChange,
  assignedTaskList,
}) => {
  const handlePageChange = (page) => {
    onPageChange(filter, page);
  };

  return (
    <>
      <ListGroup>
        {tasks.map((task, index) => (
          <ListGroup.Item
            key={index}
            className="d-flex justify-content-between align-items-center"
          >
            <TaskRowData
              task={task}
              onCheck={(flag) => {
                onCheck(task, flag);
                console.log("Selected task:" + task);
              }}
              filter={filter}
              owner={
                filter === "assigned"
                  ? assignedTaskList.filter(
                      (t) => String(t.taskId) === String(task.id)
                    )[0]?.userName
                  : ""
              }
            />
            <TaskRowControl
              task={task}
              onDelete={() => onDelete(task)}
              onEdit={() => onEdit(task)}
              onComplete={() => onComplete(task)}
              filter={filter}
            />
          </ListGroup.Item>
        ))}
      </ListGroup>
      <div className="d-flex justify-content-center m-3">
        <Pagination
          itemClass="page-item" // add it for bootstrap 4
          linkClass="page-link" // add it for bootstrap 4
          activePage={pageInfo.currentPage}
          itemsCountPerPage={10}
          totalItemsCount={pageInfo.totalItems}
          pageRangeDisplayed={10}
          onChange={handlePageChange}
          pageSize={pageInfo.totalPages}
        />
      </div>
    </>
  );
};

export default ContentList;
