import { Navbar, Nav, Form, Button } from "react-bootstrap/";
import { CheckAll } from "react-bootstrap-icons";
import { LogoutButton } from "./Login";
import { Link, NavLink } from "react-router-dom";

const Navigation = (props) => {
  const { onLogOut, loggedIn, user } = props;

  return (
    <Navbar bg="success" variant="dark" className="w-100 mb-3">
      <Navbar.Toggle aria-controls="left-sidebar" />
      <Navbar.Brand href="/">
        <CheckAll className="mr-1" size="30" />
        ToDo Manager
      </Navbar.Brand>

      {/* prettier-ignore */}
      <Nav className="mr-auto">
        <Nav.Link as={NavLink} to="/list">My Tasks</Nav.Link>
        <Nav.Link as={NavLink} to="/online">Online</Nav.Link>
        <Nav.Link as={NavLink} to="/assignment">Assignment</Nav.Link>
      </Nav>

      <Nav className="justify-content-end">
        <Navbar.Text className="mx-2">
          {user && user.name && `Welcome, ${user?.name}!`}
        </Navbar.Text>
        <Form inline className="mx-2">
          {loggedIn ? <LogoutButton logout={onLogOut} /> :
            <NavLink to="/login">Login</NavLink>
          }
        </Form>
      </Nav>
    </Navbar>
  );
};

export default Navigation;
