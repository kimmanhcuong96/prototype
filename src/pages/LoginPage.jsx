import React, { Component } from 'react';
import { Button, FormGroup, FormControl } from "react-bootstrap";
import './LoginPage.css'
import { Config } from '../config/appConfig';
// import axios from "axios";
import { axiosMintwas } from '../config/axiosConfig';
import Notification from '../ui/Notification'

class LoginPage extends Component {

    state = {
        notiMessageHeader: null,
        notiMessageBody: null,
        notiType: null,
        serviceId: "",
        password: "",
        show: false
    }

    validateForm() {
        return this.state.serviceId.length > 0 && this.state.password.length > 0;
    }

    handleChange = event => {
        this.setState({
            [event.target.id]: event.target.value
        });
    }


    handleHide = () => {
        this.setState({ show: false });
    }

    handleSubmit = event => {
        event.preventDefault();
        axiosMintwas.post('/tokens',
            {
                "knowledge_explorer": {
                    "service_id": this.state.serviceId,
                    "password": this.state.password
                },
                "expiry_sec": `${Config.TIME_EXPIRE}`
            }).then(tokenResponse => {
                localStorage.setItem("token", JSON.stringify(tokenResponse.data.token));
                this.setState({ notiType: "success" });
                this.setState({ show: true });
                this.setState({ notiMessageHeader: "Success" })
                this.setState({ notiMessageBody: "login success with token: " + tokenResponse.data.token });
            }).catch(err => {
                console.log("exception appear!", err.response);
                this.setState({ notiType: "danger" });
                this.setState({ show: true });
                if (err.response === undefined || err.response.data === undefined) {
                    this.setState({ notiMessageHeader: err + "" });
                    this.setState({ notiMessageBody: "" });
                } else {
                    this.setState({ notiMessageHeader: err.response.data.message });
                    this.setState({ notiMessageBody: err.response.data.more_info });
                }
            });
    }

    render() {
        return (
            <div className="Login">
                <p className="Title">Login Page</p>
                <form onSubmit={this.handleSubmit}>
                    <Notification notiType={this.state.notiType} show={this.state.show} notiMessageHeader={this.state.notiMessageHeader}
                        notiMessageBody={this.state.notiMessageBody} handleHide={this.handleHide}></Notification>
                    <FormGroup controlId="serviceId">
                        <label>Service ID</label>
                        <FormControl
                            autoFocus
                            type="serviceId"
                            value={this.state.serviceId}
                            onChange={this.handleChange}
                        />
                    </FormGroup>
                    <FormGroup controlId="password">
                        <label>Password</label>
                        <FormControl
                            value={this.state.password}
                            onChange={this.handleChange}
                            type="password"
                        />
                    </FormGroup>
                    <Button
                        block
                        disabled={!this.validateForm()}
                        type="submit"
                    >
                        Login
                    </Button>
                </form>
            </div>
        );
    }
}

export default LoginPage;