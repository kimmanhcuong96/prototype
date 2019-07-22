import React, { Component } from 'react';
import { Button, Form, Modal, FormControl, Row, Col } from "react-bootstrap";
import './LearningPage.css'
import { Config } from '../config/appConfig';
import { axiosTextAnalyzer } from '../config/axiosConfig';
import axios from "axios";
import BrowseFile from '../ui/BrowseFile'
import Notification from '../ui/Notification'
import LoadingModal from '../ui/LoadingModal'

class LearningPage extends Component {
    state = {
        selectedFile: null,
        notiMessageHeader: null,
        notiMessageBody: null,
        notiType: null,
        show: false,
        models: [],
        modalShow: false,
        modalNameInputted: false,
        loadingShowModal: false,
        fileNameClear: false,
        selectedModelId: 0,
        deleteModelShow: false
    }

    numberAddTrainDataRequest = 0;
    dataLearnings = null;
    notiMessageHeader = null;
    notiMessageBody = null;
    modelId = null;

    modalModelName = "";
    modalModelDescription = "";
    selectedFileAction = false;
    learnData = [];

    componentDidMount() {
        this.getModels()
            .then((modelsRes) => {
                this.setState({ models: modelsRes.data.models });
                if (modelsRes.data.models.length > 0) {
                    this.modelId = modelsRes.data.models[0].id;
                    this.setState({ selectedModelId: parseInt(modelsRes.data.models[0].id, 10) });
                }
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

    getModels = () => {
        return axiosTextAnalyzer.get('/tag-extract-models');
    }

    selectModelId = (event) => {
        this.modelId = event.target.value;
        this.setState({ selectedModelId: parseInt(event.target.value, 10) });
    }

    EnableSubmitButton = (enabletrigger) => {
        this.setState({ selectedFile: enabletrigger });
    }

    handleHide = () => {
        this.setState({ show: false });
    }

    renderDataOptions = () => {
        if (this.state.models instanceof Array) {
            return this.state.models.map(model => {
                return <option key={model.id} value={parseInt(model.id, 10)}>{model.id}</option>
            })
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

    readFileAsText = (files, callbackOnFinish, callbackOnError) => {

        if (files.length > 0) {
            try {
                let reader = new FileReader();
                const currentFile = files.splice(0, 1);
                reader.onload = file => {
                    this.learnData.push(reader.result);
                    this.readFileAsText(files, callbackOnFinish, callbackOnError);

                }
                reader.readAsText(currentFile[0]);
            } catch (err) {
                callbackOnError(err);
            }

        } else {
            callbackOnFinish(this.learnData);
        }
    }

    getFileData = (data) => {
        if (data.length > Config.MAX_UPDATE_FILE) {
            this.setState({ notiType: "danger" });
            this.setState({ show: true });
            this.setState({ notiMessageHeader: "ERROR!" });
            this.setState({ notiMessageBody: "Maximum upload file is 10000 (You have uploaded " + data.length + ' files)' });
        } else {
            const allFiles = this.convertFilesToArray(data);
            this.learnData = [];
            this.readFileAsText(allFiles, this.readFilesCompletedWithSuccess, this.readFilesCompletedWithError);
        }
    }
    readFilesCompletedWithSuccess = allContent => {
        try {
            const learningData = [];
            allContent.forEach(content => {
                let trainData = JSON.parse(content);
                trainData.forEach(data => {
                    learningData.push(data);
                })
               
            });

            this.dataLearnings = [];
            let learningDataLSize = learningData.length;
            this.numberAddTrainDataRequest = Math.floor(learningDataLSize / Config.MAX_ADDITION_LEARNING_DATA);
            let remainder = learningDataLSize % Config.MAX_ADDITION_LEARNING_DATA;
            if (remainder > 0) {
                this.numberAddTrainDataRequest += 1;
            }
            for (let i = 0; i < this.numberAddTrainDataRequest; i++) {
                var tmpLearningData = learningData.filter((trainData, index) => index >= i * Config.MAX_ADDITION_LEARNING_DATA && index < (i + 1) * Config.MAX_ADDITION_LEARNING_DATA);
                this.dataLearnings[i] = { "train_data": tmpLearningData };
            }
        } catch (err) {
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

    checkLearningStatus = (modelId) => {
        return axiosTextAnalyzer.get(`/tag-extract-models/${modelId}`);
    }


    startLearning = () => {
        this.sendAddTrainDataRequests(this.modelId, this.dataLearnings)
            .then(axios.spread(() => {
                return this.trainModel(this.modelId);
            })).then(trainModelRes => {
                this.setState({ loadingShowModal: true });
                var interval = setInterval(() => {
                    this.checkLearningStatus(this.modelId)
                        .then(response => {
                            if (response.data.model.untrained_data_count === 0) {
                                clearInterval(interval);
                                this.setState({ loadingShowModal: false });
                                this.setState({ selectedFile: null });
                                this.setState({ notiType: "success" });
                                this.setState({ show: true });
                                this.setState({ notiMessageHeader: "Success" })
                                this.setState({ notiMessageBody: "Learning complete with learning model: " + trainModelRes.data.model.id });
                            }
                        })
                }, Config.INTERVAL_WAITING);
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

    tagExtractionModelMaker = (modelName, modelDescription) => {
        return axiosTextAnalyzer.post('/tag-extract-models',
            {
                "name": modelName,
                "description": modelDescription
            }
        );
    }

    trainModel = (modelId) => {
        return axiosTextAnalyzer.put(`/tag-extract-models/${modelId}/train`,
            {}
        );
    }

    sendAddTrainDataRequests = (modelId, dataLearning) => {
        const allRequests = [];
        for (let i = 0; i < this.numberAddTrainDataRequest; i++) {
            allRequests.push(this.learningDataAddition(modelId, dataLearning[i]))
        }
        return axios.all(allRequests);
    }


    learningDataAddition = (modelId, data) => {
        return axiosTextAnalyzer.post(`/tag-extract-models/${modelId}/train-data`,
            data
        );
    }

    addModel = () => {
        this.setState({ modalShow: true });
    }

    popUpDeleteModel = () => {
        this.setState({ deleteModelShow: true });
    }

    handleModalClose = () => {
        this.setState({ modalShow: false });
        this.setState({ modalNameInputted: false });
    }

    handleDeleteModalClose = () => {
        this.setState({ deleteModelShow: false });
    }

    handleModalInputName = (event) => {
        this.modalModelName = event.target.value;
        this.modalModelName.length > 0 ? this.setState({ "modalNameInputted": true }) : this.setState({ "modalNameInputted": false });
    }

    handleModalInputDescription = (event) => {
        this.modalModelDescription = event.target.value;
    }


    deleteModel = () => {
        this.deleteModelRequest(this.modelId)
            .then(delModelRes => {
                this.setState({ notiType: "success" });
                this.setState({ show: true });
                this.setState({ notiMessageHeader: "Success" })
                this.setState({ notiMessageBody: "Delete success with Model ID : " + this.modelId });
                let remainModels = [...this.state.models];
                let indexOfDeletedModel = remainModels.findIndex(item => item.id === this.modelId);
                if (indexOfDeletedModel !== -1) {
                    remainModels.splice(indexOfDeletedModel, 1);
                }
                if (remainModels.length === 0) {
                    this.modelId = null;
                    this.setState({ selectedModelId: 0 });
                } else {
                    this.modelId = remainModels[0].id;
                    this.setState({ selectedModelId: remainModels[0].id });
                }
                this.setState({ deleteModelShow: false });
                this.setState({ models: remainModels });
            }).catch(err => {
                console.log("exception appear!", err.response);
                this.setState({ notiType: "danger" });
                this.setState({ show: true });
                if (err === undefined || err.response === undefined || err.response.data === undefined) {
                    this.setState({ notiMessageHeader: err + "" });
                    this.setState({ notiMessageBody: "" });
                } else {
                    this.setState({ notiMessageHeader: err.response.data.message });
                    this.setState({ notiMessageBody: err.response.data.more_info });
                }
            });
    }

    deleteModelRequest = (modelId) => {
        return axiosTextAnalyzer.delete(`/tag-extract-models/${modelId}`);
    }

    saveModel = () => {
        this.tagExtractionModelMaker(this.modalModelName, this.modalModelDescription)
            .then((modelsRes) => {
                let newModels = this.state.models;
                newModels.push(modelsRes.data.model);
                this.setState({ models: newModels });

                this.setState({ notiType: "success" });
                this.setState({ show: true });
                this.setState({ notiMessageHeader: "Success" })
                this.setState({ notiMessageBody: "Create new model success with Model ID : " + modelsRes.data.model.id });
                this.setState({ modalNameInputted: false });
                this.modelId = modelsRes.data.model.id;
                this.setState({ selectedModelId: parseInt(modelsRes.data.model.id, 10) });
            }).catch(err => {
                console.log("exception appear!", err.response);
                this.setState({ notiType: "danger" });
                this.setState({ show: true });
                if (err === undefined || err.response === undefined || err.response.data === undefined) {
                    this.setState({ notiMessageHeader: err + "" });
                    this.setState({ notiMessageBody: "" });
                } else {
                    this.setState({ notiMessageHeader: err.response.data.message });
                    this.setState({ notiMessageBody: err.response.data.more_info });
                }
            });
        this.setState({ modalShow: false });
    }

    render() {
        return (
            <div id="learningPage">
                <p className="Title">Learning Page</p>
                <Row className="d-flex justify-content-md-center">
                    <Col md="6" id="learningContainer">
                        <Row>
                            <Col md="12">
                                <Notification notiType={this.state.notiType} show={this.state.show} notiMessageHeader={this.state.notiMessageHeader}
                                    notiMessageBody={this.state.notiMessageBody} handleHide={this.handleHide}></Notification>
                            </Col>
                        </Row>
                        <Row className="justify-content-md-left">
                            <Col md="2" className="d-flex align-items-md-center">Model ID:</Col>
                            <Col md="4" >
                                <Form.Group controlId="list-modelIds" className="mb-0">
                                    <Form.Control as="select" value={this.state.selectedModelId} onChange={this.selectModelId}>
                                        {this.renderDataOptions()}
                                    </Form.Control>
                                </Form.Group>
                            </Col>
                            <Col md="1.5" className="d-flex align-items-md-center">
                                <Button className="add-subtract-button" block onClick={this.addModel}> + </Button>
                            </Col>
                            <Col md="2" className="d-flex align-items-md-center">
                                <Button className="add-subtract-button" variant="danger" block onClick={this.popUpDeleteModel} disabled={!this.state.selectedModelId}> - </Button>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={{ span: 10, offset: 2 }}>
                                <BrowseFile fileFormat=".json" multipleFile="true" triggerFunction={this.EnableSubmitButton} tranferFileData={this.getFileData}></BrowseFile>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={{ span: 3, offset: 9 }}>
                                <Button className="learningButton" block type="submit" disabled={!this.state.selectedFile || this.state.selectedModelId === 0} onClick={this.startLearning}> Learning</Button>
                            </Col>
                        </Row>
                    </Col>

                    <Modal show={this.state.modalShow} onHide={this.handleModalClose}>
                        <Modal.Header closeButton>
                            <Modal.Title>Create Model</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Form.Group className="mb-3" id="input-text" onChange={this.handleModalInputName}>
                                <Form.Label>Model name </Form.Label>
                                <FormControl placeholder="model name" />
                            </Form.Group>
                            <Form.Group className="mb-3" id="input-text" onChange={this.handleModalInputDescription}>
                                <Form.Label>Description (optional) </Form.Label>
                                <FormControl placeholder="description" rows="3" as="textarea" />
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={this.handleModalClose}> Cancel </Button>
                            <Button variant="primary" onClick={this.saveModel} disabled={!this.state.modalNameInputted}> Save Model </Button>
                        </Modal.Footer>
                    </Modal>

                    <Modal show={this.state.deleteModelShow} onHide={this.handleDeleteModalClose}>
                        <Modal.Header closeButton>
                            <Modal.Title>Delete Model has ID {this.modelId}</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            Are you sure?
                    </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={this.handleDeleteModalClose}> No </Button>
                            <Button variant="primary" onClick={this.deleteModel}> Yes </Button>
                        </Modal.Footer>
                    </Modal>


                    <LoadingModal loadingShow={this.state.loadingShowModal}></LoadingModal>
                </Row>
            </div >
        );
    }
}

export default LearningPage;