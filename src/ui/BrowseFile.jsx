import React, { Component } from 'react';
import { FormGroup } from "react-bootstrap";
import './BrowseFile.css'
import { Config } from '../config/appConfig';


class BrowseFile extends Component {

    fileInputRef = React.createRef();
    state = {
        uploadedFile: "no",
    }

    fileUpload = [];

    handleFileInputClick = () => {
        this.fileInputRef.current.click();
    }

    handleFileChange = () => {
        var uploadObject = this.fileInputRef.current.files;
        // console.log("...Selected file changed: ...", uploadObject);
        if (uploadObject.length > 0 && uploadObject.length <= Config.MAX_UPDATE_FILE) {
            this.fileUpload = [];
            for (let i = 0; i < uploadObject.length; i++) {
                this.fileUpload.push(uploadObject[i].name)
            }
            this.setState({ uploadedFile: "yes" });
            this.props.triggerFunction("none");
            // console.log("...file after processing: ", uploadObject);
            this.props.tranferFileData(uploadObject);

        } 
        // else {
            // this.setState({ uploadedFile: "no" });
            // this.props.triggerFunction(null);
            // this.fileUpload = "";
        // }
       
    }

    showUploadFileName = () => {
        if (this.fileUpload.length === 1) {
            return (
                <div id="file-upload-name">
                    {this.fileUpload[0]}
                </div>
            );
        } else {
            if (this.fileUpload.length <= Config.MAX_UPDATE_FILE && this.fileUpload.length > 0) {
                return (
                    <div id="file-upload-name">
                        {this.fileUpload.length + " files are chosen"}
                    </div>
                );
            } else {
                return (
                    <div id="file-upload-name"></div>
                );
            }
        }
    }

    render() {
        return (
            <div id="BrowseFile">
                <FormGroup action="upload.php" method="post" encType="multipart/form-data">
                    <input ref={this.fileInputRef} type="file" multiple={this.props.multipleFile === "true" ? true : false} name="fileToUpload"
                        style={{ display: 'none' }} onChange={this.handleFileChange} accept={this.props.fileFormat}></input>
                    <div className="custom-input-file">
                        {this.showUploadFileName()}
                        <button className="btn btn-primary browser-button" onClick={this.handleFileInputClick} >Browse</button>
                    </div>
                </FormGroup>
            </div>
        );
    }
}

export default BrowseFile;