import { ListGroup } from "react-bootstrap/";

const Filters = ({ items, defaultActiveKey, onSelect }) => {
  return (
    <ListGroup as="div" variant="flush" defaultActiveKey={defaultActiveKey}>
      <h3>Available filters</h3>
      {Object.keys(items).map((key) => (
        <ListGroup.Item
          key={key}
          action
          active={key === defaultActiveKey}
          onClick={() => onSelect(key)}
        >
          {items[key].label}
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
};

export default Filters;
