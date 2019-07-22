import React, { Component } from 'react';
import { FormGroup } from "react-bootstrap";
import './BrowseFile.css';

export default class FileBrowser extends Component {
    state = {
        fileName: ''
    }
    fileInputRef = React.createRef();
    handleFileInputClick = () => {
        this.fileInputRef.current.click();
    }
    handleChange = e => {
        if (e.target.files.length > 0) {
            this.setState({ fileName: e.target.files[0].name });
            this.props.onChange(e);
        }
    }
    render() {
        return (
            <div id="BrowseFile">
                <FormGroup action="upload.php" method="post" encType="multipart/form-data">
                    <input ref={this.fileInputRef} type="file" name="fileToUpload" style={{ display: 'none' }} onChange={this.handleChange} accept={this.props.accept}></input>
                    <div className="custom-input-file">
                        <div id="file-upload-name">{this.state.fileName}</div>
                        <button className="btn btn-primary browser-button" onClick={this.handleFileInputClick} disabled={this.props.disabled}>Browse</button>
                    </div>
                </FormGroup>
            </div>
        );
    }
}
