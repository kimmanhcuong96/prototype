import React, { Component } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import BrowseFile from '../ui/BrowseFile';
import Notification from '../ui/Notification';
import { axiosEpisodeManager } from "../config/axiosConfig";
import './TagSynonyms.css'

class TagSynonyms extends Component {
    state = {
        selectedFile: null,
        notiMessageHeader: null,
        notiMessageBody: null,
        notiType: null,
        show: false,
        databases: [],
        selectedDatabaseId: 0,
        synonymData: []
    }

    synonymData = [];

    getDatabases = () => {
        return axiosEpisodeManager.get("/databases");
    };

    selectDatabaseId = (e) => {
        this.setState({ selectedDatabaseId: parseInt(e.target.value, 10) });
    }

    componentDidMount() {
        this.getDatabases()
            .then(databasesRes => {
                this.setState({ databases: databasesRes.data.databases });
                if (databasesRes.data.databases.length > 0) {
                    this.setState({ selectedDatabaseId: parseInt(databasesRes.data.databases[0].id, 10) });
                }
            }).catch(err => {
                console.log("exception appear!", err.response);
                this.setState({ notiType: "danger" });
                this.setState({ show: true });
                if (err.response === undefined || err.response.data === undefined) {
                    this.setState({ notiMessageHeader: err + "" });
                    this.setState({ notiMessageBody: "" });
                } else {
                    this.setState({
                        notiMessageHeader: err.response.data.message
                    });
                    this.setState({
                        notiMessageBody: err.response.data.more_info
                    });
                }
            });
    }

    renderDataOptions = () => {
        if (this.state.databases instanceof Array) {
            return this.state.databases.map(database => {
                return <option key={database.id} value={parseInt(database.id, 10)}>{database.id}</option>
            })
        }
    }

    getFileData = (data) => {
        const allFiles = this.convertFilesToArray(data);
        console.log("getFileData, data", allFiles);
        this.learnData = [];
        this.synonymData = [];
        this.readFileAsText(allFiles, this.readFilesCompletedWithSuccess, this.readFilesCompletedWithError);
    }

    readFileAsText = (files, callbackOnFinish, callbackOnError) => {

        if (files.length > 0) {
            try {
                let reader = new FileReader();
                const currentFile = files.splice(0, 1);
                reader.onload = () => {
                    this.synonymData.push(reader.result);
                    this.readFileAsText(files, callbackOnFinish, callbackOnError);

                }
                reader.readAsText(currentFile[0]);
            } catch (err) {
                callbackOnError(err);
            }

        } else {
            callbackOnFinish(this.synonymData);
        }
    }

    readFilesCompletedWithSuccess = allContent => {
        try {
            console.log('all content: ', allContent);
            const synonymDataList = JSON.parse(allContent);
            console.log('all content: ', synonymDataList);
            this.setState({ synonymData: synonymDataList })

        } catch (err) {
            console.log("exception appear!", err.response);
            this.EnableSubmitButton(null);
            this.setState({ notiType: "danger" });
            this.setState({ show: true });
            if (err.response === undefined || err.response.data === undefined) {
                this.setState({ notiMessageHeader: err + "" });
                this.setState({ notiMessageBody: "" });
            } else {
                this.setState({ notiMessageHeader: err.response.data.message });
                this.setState({ notiMessageBody: err.response.data.more_info });
            }
        }
    }

    readFilesCompletedWithError = err => {
        console.log("exception appear!", err);
        this.setState({ notiType: "danger" });
        this.setState({ show: true });
        if (err.Heading === undefined && err.body === undefined) {
            this.setState({ notiMessageHeader: err + "" });
            this.setState({ notiMessageBody: "" });
        } else {
            this.setState({ notiMessageHeader: err.Heading });
            this.setState({ notiMessageBody: err.body });
        }
    }


    convertFilesToArray = files => {
        const arr = [];
        if (files instanceof FileList) {
            for (let i = 0; i < files.length; i++) {
                arr.push(files[i]);
            }
        }
        return arr;
    }

    EnableSubmitButton = (enabletrigger) => {
        this.setState({ selectedFile: enabletrigger });
        console.log('enabletrigger', enabletrigger);
    }

    createSynonymsRequest = (data, databaseId) => {
        let content = { "tag_synonyms": data };
        return axiosEpisodeManager.put(`/databases/${databaseId}/tags/synonyms`,
            content
        );
    }

    startCreateTagSynonym = () => {
        console.log('synom ', this.state.synonymData);
        this.createSynonymsRequest(this.state.synonymData, this.state.selectedDatabaseId)
            .then(response => {
                console.log('response: ', response);
                this.setState({ notiType: "success" });
                this.setState({ show: true });
                this.setState({ notiMessageHeader: "Success" })
                this.setState({ notiMessageBody: "Created tag synonyms with database ID: " + this.state.selectedDatabaseId });
                this.setState({ selectedFile: null });
                this.setState({ synonymData: [] });
            }).catch(err => {
                this.EnableSubmitButton(null);
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

    handleHide = () => {
        this.setState({ show: false });
    }

    render() {
        return (
            <div id="tagSynonymPage">
                <p className="Title">Synonym tag creation</p>
                <Row className="d-flex justify-content-md-center">
                    <Col md="6" id="tag-synonym-container">
                        <Row>
                            <Col md="12">
                                <Notification notiType={this.state.notiType} show={this.state.show} notiMessageHeader={this.state.notiMessageHeader}
                                    notiMessageBody={this.state.notiMessageBody} handleHide={this.handleHide}></Notification>
                            </Col>
                        </Row>
                        <Row className="justify-content-md-left">
                            <Col md="2" className="d-flex align-items-md-center">Database ID:</Col>
                            <Col md="4">
                                <Form.Group controlId="list-database-ids" className="mb-0">
                                    <Form.Control as="select" value={this.state.selectedDatabaseId} onChange={this.selectDatabaseId}>
                                        {this.renderDataOptions()}
                                    </Form.Control>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={{ span: 10, offset: 2 }}>
                                <BrowseFile
                                    fileFormat=".json"
                                    triggerFunction={this.EnableSubmitButton}
                                    tranferFileData={this.getFileData}
                                    multipleFile="false"
                                >
                                </BrowseFile>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={{ span: 4, offset: 8 }}>
                                <Button
                                    className="tag-synonym-creation-button"
                                    block
                                    type="submit"
                                    disabled={!this.state.selectedFile || this.state.selectedDatabaseId === 0}
                                    onClick={this.startCreateTagSynonym}
                                >
                                    Create Synonyms
                                 </Button>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </div >
        );
    }
}

export default TagSynonyms;