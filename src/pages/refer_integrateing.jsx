import React, { Component } from 'react';
import BrowseFile from '../ui/BrowseFile'
import Notification from '../ui/Notification'
import { Button, Form } from 'react-bootstrap';
import axios from "axios";
import { Config } from '../config/Config';
import './knowledgeIntegratingPage.css'

class Refer extends Component {

    state = {
        selectedFile: null,
        notiMessageHeader: null,
        notiMessageBody: null,
        notiType: null,
        show: false,
        databases: []
    }

    BREAK_LINE = "\n";
    COMMA = ",";

    ONE_RESPONSE_DYMMY_DATA;

    titleName = [];
    modelIds = [];
    contentExtractors = [];

    numberOfModels = 0;
    positionOfTagType1 = [];
    tagObjListTypeOne = [];
    tagObjListTypeTwo = [];
    tagObjListTypeThree = [];
    relationObjList = [];
    tagObjList = [];

    xToken = null;
    dataExtraction = null;
    notiMessageHeader = null;
    notiMessageBody = null;

    componentDidMount() {

        //read dummy file data
        axios.get('./data/dummyData.json')
            .then(response => {
                this.ONE_RESPONSE_DYMMY_DATA = response.data;
                console.log("----------", this.ONE_RESPONSE_DYMMY_DATA);
            })

        this.getToken()
            .then(tokenRes => {
                this.xToken = tokenRes.data.token;
                console.log("got token successfully " + this.xToken);
                return this.getdatabases(this.xToken);
            }).then((databasesRes) => {
                if (databasesRes.data.databases.length > 0) {
                    this.setState({ databases: databasesRes.data.databases });
                } else {
                    this.createDatabase(this.xToken).then((response) => {
                        this.setState({ databases: [response.data.database] });
                    }).catch(err => {
                        this.setState({ notiType: "danger" });
                        this.setState({ show: true });
                        if (err.Heading === undefined && err.body === undefined) {
                            this.setState({ notiMessageHeader: err + "" });
                            this.setState({ notiMessageBody: "" });
                        } else {
                            this.setState({ notiMessageHeader: err.Heading });
                            this.setState({ notiMessageBody: err.body });
                        }
                    });
                }
            }).catch(err => {
                console.log("----------> exception appear!", err);
                this.setState({ notiType: "danger" });
                this.setState({ show: true });
                if (err.Heading === undefined && err.body === undefined) {
                    this.setState({ notiMessageHeader: err + "" });
                    this.setState({ notiMessageBody: "" });
                } else {
                    this.setState({ notiMessageHeader: err.Heading });
                    this.setState({ notiMessageBody: err.body });
                }
            });
    }

    EnableSubmitButton = (enabletrigger) => {
        this.setState({ selectedFile: enabletrigger });
    }

    handleHide = () => {
        this.setState({ show: false });
    }

    getToken = () => {
        return axios.post(`${Config.SERVER_URL}`,
            {
                "url": `${Config.MINTWAS_URL}`,
                "method": "POST",
                "body": {
                    "knowledge_explorer": {
                        "service_id": `${Config.SERVICE_ID}`,
                        "password": `${Config.SERVICE_PASSWORD}`
                    },
                    "expiry_sec": `${Config.TIME_EXPIRE}`
                }
            });
    }


    getdatabases = (token) => {
        return axios.post(`${Config.SERVER_URL}`,
            {
                "url": `${Config.EM_URL}/databases`,
                "method": "GET",
                "token": token,
                "body": {}
            });
    }

    createDatabase = (token) => {
        return axios.post(`${Config.SERVER_URL}`,
            {
                "url": `${Config.EM_URL}/databases`,
                "method": "POST",
                "token": token,
                "body": {
                    "name": Config.DATABASE_NAME,
                    "description": Config.DESCRIPTION_DB_NAME
                }
            });
    }

    renderDataOptions = () => {
        if (this.state.databases instanceof Array) {
            return this.state.databases.map(db => {
                return <option key={db.id}>{db.id}</option>
            })
        }
    }

    getFileData = (data) => {
        var contents = [];
        var breakLineIndex = data.indexOf(this.BREAK_LINE);
        var titleLine = data.slice(0, breakLineIndex);
        data = data.slice(breakLineIndex + 1);
        breakLineIndex = data.indexOf(this.BREAK_LINE);
        let modelIdLine = data.slice(0, breakLineIndex);
        data = data.slice(breakLineIndex + 1);
        while (breakLineIndex !== -1) {
            breakLineIndex = data.indexOf(this.BREAK_LINE);
            if (breakLineIndex !== -1) {
                contents.push(data.slice(0, breakLineIndex));
            } else {
                contents.push(data.slice(0));
            }
            data = data.slice(breakLineIndex + 1);
        }

        //convert string line to array
        //model_id array
        var commaIndex = 0;
        while (commaIndex !== -1) {
            commaIndex = modelIdLine.indexOf(this.COMMA);
            if (commaIndex !== -1) {
                this.modelIds.push(modelIdLine.slice(0, commaIndex).trim());
            } else {
                this.modelIds.push(modelIdLine.slice(0).trim());
            }
            modelIdLine = modelIdLine.slice(commaIndex + 1);
        }
        console.log("model ids: ", this.modelIds);

        //convert string line to array
        //titleLine array
        commaIndex = 0;
        while (commaIndex !== -1) {
            commaIndex = titleLine.indexOf(this.COMMA);
            if (commaIndex !== -1) {
                this.titleName.push(titleLine.slice(0, commaIndex).trim());
            } else {
                this.titleName.push(titleLine.slice(0).trim());
            }
            titleLine = titleLine.slice(commaIndex + 1);
        }
        console.log("titleName", this.titleName);

        //content_extractor array
        for (let i = 0; i < contents.length; i++) {
            commaIndex = 0;
            var contentArrayOfLine = []
            while (commaIndex !== -1) {
                commaIndex = contents[i].indexOf(this.COMMA);
                if (commaIndex !== -1) {
                    contentArrayOfLine.push(contents[i].slice(0, commaIndex).trim());
                } else {
                    contentArrayOfLine.push(contents[i].slice(0).trim());
                }
                contents[i] = contents[i].slice(commaIndex + 1);
            }
            this.contentExtractors.push(contentArrayOfLine);
        }
        console.log("contentExtractors: ", this.contentExtractors);
    }

    tagExtraction = (token, modelId, data) => {
        var content = { "content": data };
        return axios.post(`${Config.SERVER_URL}`,
            {
                "url": `${Config.TA_URL}/tag-extract-models/${modelId}/extract`,
                "method": "POST",
                "token": token,
                "body": content
            }
        );
    }

    tagExtractionCombination = (token, modelIds, listData, ) => {
        var allRequests = [];
        var numberOfColumns = modelIds.length;
        var numberOfContentRows = listData.length;
        var count = 0;
        for (var row = 0; row < numberOfContentRows; row++) {
            for (var col = 0; col < numberOfColumns; col++) {
                if (modelIds[col] !== "") {
                    allRequests.push(this.tagExtraction(token, modelIds[col], listData[row][col]));
                }
            }
        }
        this.positionOfTagType1 = [];
        for (var i = 0; i < numberOfColumns; i++) {
            if (modelIds[i] !== "") {
                count++;
            } else {
                this.positionOfTagType1.push(i);
            }
        }
        this.numberOfModels = count;
        return axios.all(allRequests);
    }

    buildTagId = (primaryContentId, contentId, columnId, expressionIndex, start, end) => {
        return "primary_content_id-" + primaryContentId + "content_id-" + contentId + "-column_id" + columnId
            + "-ex-" + expressionIndex + "-start" + start + "-end" + end;
    }

    buildSourceRange = (start, end) => {
        if (start === end && start < 0) {
            return "";
        } else {
            return start + "-" + end;
        }

    }

    buildTagRequest = (primaryContentId, contentId, columnId, index, key, value, sourceId, start, end) => {
        let tagId = this.buildTagId(primaryContentId, contentId, columnId, index, start, end);
        let sourceRange = this.buildSourceRange(start, end);
        let tag = {
            'tmpid': tagId,
            'key': key,
            'value': value,
            'source_tmpid': sourceId,
            'source_range': sourceRange
        }
        return tag;
    }

    buildListTagTypeOne = (tagTypeOnePostions, titleName, contentExtraction, listTagTypeOne) => {
        var primaryContentIdMock = "primaryContentId";
        var numberOfContentRows = contentExtraction.length;
        for (var row = 0; row < numberOfContentRows; row++) {
            var listTagTypeOneEachEpisode = [];
            for (var index in tagTypeOnePostions) {
                let primaryContentId = primaryContentIdMock;
                let contentId = contentExtraction[row][0];
                let columnId = "col" + tagTypeOnePostions[index];
                let indexPara = 0;
                let key = titleName[tagTypeOnePostions[index]];
                let value = contentExtraction[row][tagTypeOnePostions[index]];
                let sourceId = contentId;
                let start = 0;
                let end = value.length;
                var tag = this.buildTagRequest(primaryContentId, contentId, columnId, indexPara, key, value, sourceId, start, end);
                listTagTypeOneEachEpisode.push(tag);
            }
            listTagTypeOne.push(listTagTypeOneEachEpisode);
        }
        return listTagTypeOne;
    }


    buildTagFromExpressionList = (primaryContentId, contentId, columnId, expressionList, listTagTypeTwo) => {
        var index = 0;
        for (let expresion in expressionList) {
            var leftTag = this.buildTagFromExpression(primaryContentId, contentId, columnId, index, expressionList[expresion]);
            listTagTypeTwo.push(leftTag);
            index++
        }
        return index;

    }

    buildTagFromExpression = (primaryContentId, contentId, columnId, index, expression) => {
        let key = expression.key;
        let value = expression.surface;
        let start = expression.start;
        let end = expression.end;
        let sourceId = contentId;
        return this.buildTagRequest(primaryContentId, contentId, columnId, index, key, value, sourceId, start, end);
    }

    buildRelationList = (primaryContentId, contentId, columnId, relationList, relationObjList, tagList, listTagTypeTwo, listTagTypeThree, index) => {
        for (var relation in relationList) {
            var leftStart = relationList[relation].start_left;
            var leftEnd = relationList[relation].end_left;
            var sourceId = contentId;
            var key = relationList[relation].key;
            var rightValue = relationList[relation].surface_right;
            var leftValue = relationList[relation].surface_left;
            var rightStart = relationList[relation].start_right;
            var rightEnd = relationList[relation].end_right;

            // Check if tag in relaion exist in tag list
            var rightTag = this.findTagInTags(tagList, rightValue, rightStart, rightEnd);
            var checkFlag = false;
            if (rightTag !== false) {
                var newListTagTypeTwo = [];
                for (var tmp in listTagTypeTwo) {
                    if (tmp.value !== rightTag.value || tmp.sourceRange !== rightTag.sourceRange) {
                        newListTagTypeTwo.push(tmp);
                    } else {
                        checkFlag = true;
                    }
                }

                listTagTypeTwo = [];
                listTagTypeTwo = [...newListTagTypeTwo];

                if (checkFlag) {
                    listTagTypeThree.push(rightTag);
                }

            } else {
                rightTag = this.buildTagRequest(primaryContentId, contentId, columnId, index, key, rightValue, sourceId, rightStart, rightEnd);
                listTagTypeThree.push(rightTag);
            }

            // Tag in none, then create new tag and add to tagList
            var leftTag = this.findTagInTags(tagList, leftValue, leftStart, leftEnd);
            checkFlag = false;
            if (leftTag !== false) {
                newListTagTypeTwo = [];
                for (var temp in listTagTypeTwo) {
                    if (temp.value !== leftTag.value || temp.sourceRange !== leftTag.sourceRange) {
                        newListTagTypeTwo.push(temp);
                    } else {
                        checkFlag = true;
                    }
                }
                listTagTypeTwo = [];
                listTagTypeTwo = [...newListTagTypeTwo];
                if (checkFlag) {
                    listTagTypeThree.push(leftTag);
                }
            } else {
                leftTag = this.buildTagRequest(primaryContentId, contentId, columnId, index, key, leftValue, sourceId, leftStart, leftEnd);
                listTagTypeThree.push(leftTag);
            }

            let relationObject = this.buildRelation(rightTag.tmpid, leftTag.tmpid, key);
            relationObjList.push(relationObject);
            index++;
        }
    }

    buildRelation = (rightTagId, leftTagId, key) => {
        let rightRelationtag = {
            "tmpid": rightTagId,
            "role": key
        };
        let leftRelationTag = {
            "tmpid": leftTagId,
            "role": key
        };
        let relationTagList = [rightRelationtag, leftRelationTag];
        let relation = {
            "tags": relationTagList
        };
        return relation;

    }


    findTagInTags = (tagList, value, start, end) => {
        for (var tag in tagList) {
            var sourceRange = this.buildSourceRange(start, end);
            if (tag.value === value && tag.sourceRange === sourceRange) {
                return tag;
            }
        }
        return false;
    }

    buildTagFromExpressionAndRelation = (extractionResults, contentExtraction, listTagTypeOne, listTagTypeTwo, listTagTypeThree, relationObjList, numberOfModel) => {
        var primaryContentIdMock = "primaryContentId";
        var extractResultIndex = 0;
        var numberElementsOneEpisode = contentExtraction.length;
        for (var episodeIndex = 0; episodeIndex < numberElementsOneEpisode; episodeIndex++) {
            var listTagTypeOneEachEpisode = listTagTypeOne[episodeIndex];
            var listTagTypeTwoEachEpisode = [];
            var listTagTypeThreeEachEpisode = [];
            var relationObjListOneEpisode = [];
            for (extractResultIndex; extractResultIndex < numberOfModel * (episodeIndex + 1); extractResultIndex++) {
                var primaryContentId = primaryContentIdMock;
                var contentId = contentExtraction[episodeIndex][0];
                var columnId = "extractIndex" + extractResultIndex;
                var listTagTypeTwoPara = listTagTypeTwoEachEpisode;
                var listTagTypeThreePara = listTagTypeThreeEachEpisode;
                if (extractionResults[extractResultIndex].data.hasOwnProperty('expressions')) {
                    let expressionList = extractionResults[extractResultIndex].data.expressions;
                    var indexInExpression = this.buildTagFromExpressionList(primaryContentId, contentId, columnId, expressionList, listTagTypeTwoPara);
                }

                if (extractionResults[extractResultIndex].data.hasOwnProperty('relations')) {
                    var tagList = listTagTypeOneEachEpisode.concat(listTagTypeTwoEachEpisode.concat(listTagTypeThreeEachEpisode));
                    let relationList = extractionResults[extractResultIndex].data.relations;
                    this.buildRelationList(primaryContentId, contentId, columnId, relationList, relationObjListOneEpisode, tagList,
                        listTagTypeTwoPara, listTagTypeThreePara, indexInExpression);
                }
            }
            listTagTypeTwo.push(listTagTypeTwoEachEpisode);
            listTagTypeThree.push(listTagTypeThreeEachEpisode);
            relationObjList.push(relationObjListOneEpisode);
        }
    }

    buildTagList = (tagListTypeOne, tagListTypeTwo, tagListTypeThree) => {
        var numberOfEpisode = tagListTypeOne.length;
        var tagList = [];
        for (var index = 0; index < numberOfEpisode; index++) {
            let tmp = tagListTypeOne[index].concat(tagListTypeTwo[index].concat(tagListTypeThree[index]));
            tagList.push(tmp);
        }
        return tagList;
    }
    integratingStart = () => {
        console.log("starting");
        this.getToken()
            .then(tokenRes => {
                this.xToken = tokenRes.data.token;
                console.log("got token successfully " + this.xToken);
                return this.tagExtractionCombination(this.xToken, this.modelIds, this.contentExtractors);
            }).then(allTagExtractionRes => {
                console.log("allTagExtractionRes", allTagExtractionRes);
                var ex = this.ONE_RESPONSE_DYMMY_DATA.expressions;
                var re = this.ONE_RESPONSE_DYMMY_DATA.relations;
                var item = {
                    "data": {
                        "expressions": ex,
                        "relations": re
                    }
                };
                var extractionResults = [item, item, item, item, item, item];

                console.log("contentExtractor, ", this.contentExtractors);
                this.buildListTagTypeOne(this.positionOfTagType1, this.titleName, this.contentExtractors, this.tagObjListTypeOne);
                console.log("contentExtractor, ", this.contentExtractors);
                this.buildTagFromExpressionAndRelation(extractionResults, this.contentExtractors, this.tagObjListTypeOne, this.tagObjListTypeTwo,
                    this.tagObjListTypeThree, this.relationObjList, this.numberOfModels);
                console.log(" -----------------\n after build tag: tag type one ", this.tagObjListTypeOne);
                console.log(" -----------------\n after build tag: tag type two ", this.tagObjListTypeTwo);
                console.log(" -----------------\n after build tag: tag type three ", this.tagObjListTypeThree);
                console.log(" -----------------\n after build tag: relationObjList ", this.relationObjList);

                this.tagObjList = [];
                this.tagObjList = this.buildTagList(this.tagObjListTypeOne, this.tagObjListTypeTwo, this.tagObjListTypeThree);
                console.log("tag list: ", this.tagObjList);

            }).catch(err => {
                console.log("----------> exception appear!", err);
                this.setState({ notiType: "danger" });
                this.setState({ show: true });
                if (err.Heading === undefined && err.body === undefined) {
                    this.setState({ notiMessageHeader: err + "" });
                    this.setState({ notiMessageBody: "" });
                } else {
                    this.setState({ notiMessageHeader: err.Heading });
                    this.setState({ notiMessageBody: err.body });
                }
            });
    }


    render() {
        return (
            <div id="integratingPage">
                <p className="Title">Integrating Page</p>
                <div id="integratingContainer">
                    <Notification notiType={this.state.notiType} show={this.state.show} notiMessageHeader={this.state.notiMessageHeader}
                        notiMessageBody={this.state.notiMessageBody} handleHide={this.handleHide}></Notification>
                    <div id="databaseId-selection">
                        <div id="select-label">Database ID:</div>
                        <Form.Group controlId="list-dbIds" className="selection">
                            <Form.Control as="select">
                                {this.renderDataOptions()}
                            </Form.Control>
                        </Form.Group>
                    </div>
                    <BrowseFile fileFormat=".csv" triggerFunction={this.EnableSubmitButton} tranferFileData={this.getFileData}></BrowseFile>
                    <Button className="learningButton" block type="submit" disabled={!this.state.selectedFile} onClick={this.integratingStart}> Integrating</Button>
                </div>
            </div>
        );
    }
}

export default Refer;