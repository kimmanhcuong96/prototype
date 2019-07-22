import React, { Component } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

export default class DatabaseCreationModal extends Component {
	state = {
		show: false,
		dbName: "",
		dbDescription: ""
	};
	handleClose = () => {
		this.props.onClose();
		console.log("Closing modal");
	};
	handleChangeDatabaseName = e => {
		this.setState({ dbName: e.target.value });
	};
	handleChangeDatabaseDescription = e => {
		this.setState({ dbDescription: e.target.value });
	};
	handleSubmit = () => {
		this.props.onSubmit({
			name: this.state.dbName,
			description: this.state.dbDescription
		});
	};
	componentWillReceiveProps(nextProps) {
		if (nextProps.show === false) {
			this.setState({ dbName: "", dbDescription: "" });
		}
		console.log("Next props: ", nextProps);
	}
	render() {
		return (
			<Modal show={this.props.show} onHide={this.handleClose}>
				<Modal.Header closeButton disabled={this.props.disabled}>
					<Modal.Title>Create database</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Form>
						<Form.Group controlId="exampleForm.ControlInput1">
							<Form.Label>Database name</Form.Label>
							<Form.Control
								type="text"
								placeholder="Database name"
								onChange={this.handleChangeDatabaseName}
								value={this.state.dbName}
								disabled={this.props.disabled}
							/>
						</Form.Group>
						<Form.Group controlId="exampleForm.ControlTextarea1">
							<Form.Label>Description (optional)</Form.Label>
							<Form.Control
								as="textarea"
								rows="3"
								placeholder="Description"
								onChange={this.handleChangeDatabaseDescription}
								value={this.state.dbDescription}
								disabled={this.props.disabled}
							/>
						</Form.Group>
					</Form>
				</Modal.Body>
				<Modal.Footer>
					{/* <Button variant="secondary" onClick={this.handleClose}>
						Close
					</Button> */}
					<Button variant="primary" onClick={this.handleSubmit} disabled={this.props.disabled}>
						Create
					</Button>
				</Modal.Footer>
			</Modal>
		);
	}
}
