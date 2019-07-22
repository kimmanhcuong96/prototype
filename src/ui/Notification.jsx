import React, { Component } from 'react';
import { Alert } from "react-bootstrap";

class Notification extends Component {

    render() {
        return (<div className="notification">
            <Alert dismissible variant={this.props.notiType} show={this.props.show} onClose={() => { this.props.handleHide(); }}>
                <Alert.Heading>{this.props.notiMessageHeader}</Alert.Heading>
                <p>{this.props.notiMessageBody}</p>
            </Alert>
        </div>)
    }
}

export default Notification;