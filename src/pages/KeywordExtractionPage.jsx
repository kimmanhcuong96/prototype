import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import Notification from '../ui/Notification';
import { Button, Form, InputGroup, FormControl, Row, Col } from 'react-bootstrap';
import { axiosTextAnalyzer, axiosEpisodeManager } from '../config/axiosConfig';
import './KeywordExtractionPage.css';

class KeywordExtractionPage extends Component {
    state = {
        databases: [],
        inputted: null,
        notiMessageHeader: null,
        notiMessageBody: null,
        notiType: null,
        show: false,
        models: [],
        listExpressions: [],
        listGroupExpressions: [],
        listRelations: []
    }

    tempValueInputted = null;
    valueInputted = null;
    modelId = null;
    databaseId = null;

    defaultColorList = ["red", "green", "blue", "black", "orange", "purple", "olive", "teal", 
        "tomato", "navy", "gray", "peru", "indigo", "cyan", "violet"];

    renderModelOptions = () => {
        if (this.state.models instanceof Array) {
            return this.state.models.map(model => {
                return (<option key={model.id}>{model.id}</option>);
            })
        }
    }

    renderDatabaseOptions = () => {
        if (this.state.databases instanceof Array) {
            return this.state.databases.map(db => {
                return (<option key={db.id}>{db.id}</option>);
            });
        }
    };

    getModels = () => {
        return axiosTextAnalyzer.get('/tag-extract-models');
    }

    getDatabases = () => {
        return axiosEpisodeManager.get(`/databases`);
    };

    EnableSubmitButton = (enabletrigger) => {
        this.setState({ selectedFile: enabletrigger });
    }

    handleHide = () => {
        this.setState({ show: false });
    }

    selectModelId = (event) => {
        this.modelId = event.target.value;
    }

    selectDatabaseId = (event) => {
        this.databaseId = event.target.value;
    }

    handleKeyPress = (event) => {
        this.tempValueInputted = event.target.value;
        this.tempValueInputted.length > 0 ? this.setState({ "inputted": true }) : this.setState({ "inputted": false });
    }

    componentDidMount() {
        this.getModels()
            .then((modelsRes) => {
                this.setState({ models: modelsRes.data.models });
                this.modelId = modelsRes.data.models[0].id;
            }).catch(err => {
                console.log("exception appear!", err.response);
                this.setState({
                    notiType: "danger",
                    show: true
                });
                if (err.response === undefined || err.response.data === undefined) {
                    this.setState({
                        notiMessageHeader: err + "",
                        notiMessageBody: ""
                    });
                } else {
                    this.setState({
                        notiMessageHeader: err.response.data.message,
                        notiMessageBody: err.response.data.more_info
                    });
                }
            });

        this.getDatabases()
            .then(databasesRes => {
                if (databasesRes.data.databases.length > 0) {
                    this.databaseId = databasesRes.data.databases[0].id;                 
                }
                this.setState({ databases: databasesRes.data.databases });
            }).catch(err => {
                console.log("exception appear!", err.response);
                this.setState({
                    notiType: "danger",
                    show: true
                });
                this.setState({  });
                if (err.response === undefined || err.response.data === undefined) {
                    this.setState({
                        notiMessageHeader: err + "",
                        notiMessageBody: ""
                    });
                } else {
                    this.setState({
                        notiMessageHeader: err.response.data.message,
                        notiMessageBody: err.response.data.more_info
                    });
                }
            });
    }

    getListExpressions(expressions) {
        let list = [];
        expressions.forEach(expression => {
            let item = {
                start: expression.start,
                end: expression.end,
                key: expression.key,
                surface: expression.surface
            }
            list.push(item);
        });
        return list;
    }

    extractKeyword = () => {
        this.valueInputted = this.tempValueInputted.slice();
        let listExpressions = [];
        let listGroupExpressions = [];
        
        this.sendExtractKeywordRequest(this.modelId, this.valueInputted).then(tagExtractionRes => {
            listExpressions = this.getListExpressions(tagExtractionRes.data.expressions);
            let listRelations = tagExtractionRes.data.relations;
            if (listExpressions.length > 0 || listRelations.length > 0) {
                // check expressions exist relations in but not in list of expressions
                if (listRelations && listRelations.length > 0) {
                    listRelations.forEach(relation => {
                        // check if left side of relation is exist in expressions list
                        let left_relation = listExpressions.filter(expression => {
                            return relation.surface_left === expression.surface;
                        }).shift();
                        if (!left_relation) {
                            // add into expressions list if not exist
                            let newExpressions = {
                                start: relation.start_left,
                                end: relation.end_left,
                                key: relation.key,
                                surface: relation.surface_left
                            };
                            listExpressions.push(newExpressions);
                        }

                        // check if right side of relation is exist in expressions list
                        let right_relation = listExpressions.filter(expression => {
                            return relation.surface_right === expression.surface;
                        }).shift();
                        if (!right_relation) {
                            let newExpressions = {
                                // add into expressions list if not exist
                                start: relation.start_right,
                                end: relation.end_right,
                                key: relation.key,
                                surface: relation.surface_right
                            };
                            listExpressions.push(newExpressions);
                        }
                    });
                }

                // set order (in list) & color for expression
                listExpressions.sort((a,b) => (a.start > b.start) ? 1 : ((b.start > a.start) ? -1 : 0));
                const lengthOfListDefaultColor = this.defaultColorList.length;
                for (let i = 0; i < listExpressions.length; i++) {
                    if (i >= lengthOfListDefaultColor) {
                        this.defaultColorList.push(this.defaultColorList[i % lengthOfListDefaultColor]);
                    }
                    listExpressions[i].order = i + 1;
                    listExpressions[i].color = this.defaultColorList[i];
                }

                let firstItemGroupExpressions = [];
                firstItemGroupExpressions.push(listExpressions[0]);
                listGroupExpressions.push(firstItemGroupExpressions)

                // check if range of expression is match with range of any expression then group them
                for (let i = 1; i < listExpressions.length; i++) {
                    let group = this.checkExpressionsInAnyGroup(listExpressions[i], listGroupExpressions);
                    if (group != null) {
                        group.push(listExpressions[i]);
                    } else {
                        let newGroup = [];
                        newGroup.push(listExpressions[i]);
                        listGroupExpressions.push(newGroup);
                    }
                }
            }
            
            this.setState({
                // list of all expressions
                listExpressions: listExpressions,
                // list of group expressions that each member is relate with others.
                listGroupExpressions: listGroupExpressions,
                // list of relations without duplicate
                listRelations: listRelations
            });

        }).catch(err => {
            console.log("exception appear!", err.response);
            this.setState({ 
                notiType: "danger",
                show: true
            });
            if (err.response === undefined || err.response.data === undefined) {
                this.setState({
                    notiMessageHeader: err + "",
                    notiMessageBody: ""
                });
            } else {
                this.setState({
                    notiMessageHeader: err.response.data.message,
                    notiMessageBody: err.response.data.more_info
                });
            }
        });
    }

    goToKeywordSelection = () => {
        // remove duplicate expression in list
        let extractedTag = [];
        let expressions = this.state.listExpressions.slice();
        for (let i = 0; i < expressions.length; i++) {
            // check expression was be push or not?
            let checkExist = extractedTag.filter(tag => {
                return (expressions[i].key === tag.key && expressions[i].surface === tag.value);
            }).shift();
            if (!checkExist) {
                let newTag = {
                    'key': expressions[i].key,
                    'value': expressions[i].surface
                }
                extractedTag.push(newTag);
            }
        }

        // put id of selected database & list of extracted tag
        let data = {
            extractedTag: extractedTag,
            databaseId: this.databaseId
        }
        localStorage.setItem("extractKeywordData", JSON.stringify(data));
        this.props.history.push({
            pathname: '/keyword-selection',
            state: {
                transferFlag: true
            }
        });
    }

    checkExpressionsInAnyGroup(expression, listGroup) {
        let foundItem = null;
        for (let i = 0; i < listGroup.length; i++) {
            // set start point & end point for each group
            let group = listGroup[i];
            // get start point & end point of group
            let position = this.getStartEndPointOfGroup(group);

            if (position && (
                // start point & end point of expression in range of group
                (expression.start >= position.start && expression.end <= position.end) || 
                // start point & end point of group in range of expression
                (expression.start <= position.start && expression.end >= position.end) ||
                // start point of expression is out of range but end point in range of group
                (expression.start <= position.start && expression.end >= position.start && expression.end <= position.end) ||
                // start point of expression is in range but end point out of range of group
                (expression.start >= position.start && expression.start <= position.end && expression.end >= position.end))) {
                foundItem = group;
                break;
            }
        }
        return foundItem;
    }

    getStartEndPointOfGroup(group) {
        if (!group || group.length < 1) {
            return null;
        }
        let startPoint = group[0].start;
        let endPoint = group[0].end;
        for (let i = 0; i < group.length; i++) {
            if (group[i].start < startPoint) {
                startPoint = group[i].start;
            }
            if (group[i].end > endPoint) {
                endPoint = group[i].end;
            }
        }
        let position = {
            start: startPoint,
            end: endPoint
        }
        return position;
    }

    sendExtractKeywordRequest = (modelId, data) => {
        var content = { "content": data };
        return axiosTextAnalyzer.post(`/tag-extract-models/${modelId}/extract`,
            content
        );
    }

    renderExtractedResult = () => {
        if (this.valueInputted && this.valueInputted.length > 0) {
            // split input text by start point & end of each group
            let inputText = this.valueInputted.slice();
            let positionList = [];
            
            let listGroupExpressions = this.state.listGroupExpressions.slice();
            for (let i = 0; i < listGroupExpressions.length; i++) {
                let position = this.getStartEndPointOfGroup(listGroupExpressions[i]);
                position.indexInList = i;
                positionList.push(position);
            }
            
            let temp = positionList.slice();
            let startPoint = 0;
            let endPoint = 0;
            for (let i = 0; i < inputText.length; i++) {
                if (temp.length > 0) {
                    if (i <= temp[0].start) {
                        endPoint = i;
                    } else {
                        if (endPoint > startPoint) {
                            let newItem = {
                                start: startPoint,
                                end: endPoint
                            }
                            positionList.push(newItem);
                        }
                        startPoint = temp[0].end;
                        endPoint = temp[0].end;
                        temp.shift();
                    }
                } else {
                    let newItem = {
                        start: startPoint,
                        end: inputText.length
                    }
                    positionList.push(newItem);
                    break;
                }
            }
            positionList.sort((a,b) => (a.start > b.start) ? 1 : ((b.start > a.start) ? -1 : 0));
            // result is a list part of input text split by position of all group of expressions
            
            return positionList.map((item, index) => {
                if (item.indexInList >= 0) {
                    // content with expression
                    return (<span key={index}>{this.renderGroupExpressions(inputText, item.indexInList)}
                        </span>);
                } else {
                    // content without expression
                    return (<span key={index}>{inputText.substring(item.start, item.end)}</span>);
                }
            });
        }
    }

    renderGroupExpressions = (str, indexInList) => {
        let groupExpressions = this.state.listGroupExpressions[indexInList];
        let listPartsOfTag = [];
        let positionListWithDuplicateAndNoSort = [];
        
        for (let i = 0; i < groupExpressions.length; i++) {
            positionListWithDuplicateAndNoSort.push(groupExpressions[i].start);
            positionListWithDuplicateAndNoSort.push(groupExpressions[i].end);
        }
        
        // delete duplicate position and sort
        let positionList = [...new Set(positionListWithDuplicateAndNoSort)];
        positionList.sort((a, b) => (a > b) ? 1 : ((b > a) ? -1 : 0));

        let tempEndPoint = positionList[0];
        let listExpressions;
        let listColor;
        
        // split the content by start point & end point of each expression
        for (let i = 0; i < positionList.length; i++) {
            let endPoint = positionList[i];
            let startPoint = tempEndPoint;

            let tempListExpressions = [];
            let tempListColor = [];
            let startOfExpressions = [];

            // check character in range (start point & end point) of expression
            for (let j = 0; j < groupExpressions.length; j++) {
                // add order (in list expressions) & color of expression
                if (endPoint >= groupExpressions[j].start && endPoint < groupExpressions[j].end) {
                    tempListExpressions.push(j);
                    tempListColor.push(groupExpressions[j].color);
                }                
                if (endPoint === groupExpressions[j].start || endPoint === groupExpressions[j].end) {
                    tempEndPoint = endPoint;
                }
                // check part of content is contain start point of expression or not? (will add note when render)
                if (startPoint === groupExpressions[j].start) {
                    startOfExpressions.push(groupExpressions[j].order);
                }
            }

            if (startPoint < endPoint) {
                let partsOfTag = {
                    start: startPoint,
                    end: endPoint,
                    listExpressions: listExpressions,
                    listColor: listColor,
                    startOfExpressions: startOfExpressions
                };
                listPartsOfTag.push(partsOfTag);
            }
            listExpressions = tempListExpressions.slice();
            listColor = tempListColor.slice();
        }
        listPartsOfTag.sort((a,b) => (a.start > b.start) ? 1 : ((b.start > a.start) ? -1 : 0));

        return listPartsOfTag.map((item, index) => {
            return this.renderExpression(str.substring(item.start, item.end), item, index);
        });
    }

    renderExpression = (str, groupExpressions, index) => {
        let listExpressions = groupExpressions.listExpressions;
        let listColors = groupExpressions.listColor;
        let listNotes = groupExpressions.startOfExpressions

        let renderNote = this.renderNotes(listNotes);
        let renderContent = str;
        for (let i = 0; i < listExpressions.length; i++) {
            // add underline for content
            renderContent = this.renderUnderline(renderContent, listExpressions[i], listColors[i], index + '-content');
            // add underline for note that not at beginning of expression
            for (let j = 0; j < listNotes.length; j++) {
                let colorOfNote = this.defaultColorList[listNotes[j]-1];
                if (colorOfNote !== listColors[i] && index > 0) {
                    renderNote = this.renderUnderline(renderNote, listExpressions[i], listColors[i], index + 'note');
                }
            }
        }
        return ( <span key={index}>{renderNote}{renderContent}</span> );
        
    }

    renderNotes = (listNotes) => {
        return listNotes.map((item, index) => {
            let style = {
                color: this.defaultColorList[item - 1]
            };
            return ( <sup key={index} style={style}>({item})</sup> );
        });
    }

    renderUnderline = (content, i, color, index) => {
        let lineHeight = 20 + i*4;
        let paddingBottom = 0 + i*4;
        let style = {
            lineHeight: lineHeight + 'px',
            paddingBottom: paddingBottom + 'px',
            background: 'linear-gradient(0deg,' + color +' 1px, white 1px, transparent 1px)'
        };
        return ( <span key={i + '-' + index} style={style}>{content}</span> );
    }

    // getUnique = (arr, pros) => {
    //     const unique = arr.map(e => e[pros])
    //         .map((e, i, final) => final.indexOf(e) === i && i)
    //         .filter(e => arr[e]).map(e => arr[e]);
    //     return unique;
    // }

    renderTagList = () => {
        if (this.state.listExpressions.length > 0) {
            // const listExpressionsUnique = this.getUnique(this.state.listExpressions, "order");
            return this.state.listExpressions.map(item => {
                return (
                    <dd key={item.order}>({item.order}) {item.key}</dd>
                );
            });
        }
    }

    renderRelationList = () => {
        if (this.state.listRelations.length > 0 && this.state.listExpressions.length > 1) {
            return this.state.listRelations.map((item, index) => {
                // find left side of relation in expressions list to get key and order of it in list
                let leftExpression = this.state.listExpressions.filter(expression => {
                    return ((expression.start === item.start_left) && (expression.end === item.end_left));
                }).shift();
                // find right side of relation in expressions list to get key and order of it in list
                let rightExpression = this.state.listExpressions.filter(expression => {
                    return ((expression.start === item.start_right) && (expression.end === item.end_right));
                }).shift();

                if (leftExpression && rightExpression) {
                    return (
                        <dd key={index}>
                            ({leftExpression.order}) - ({rightExpression.order}) : {item.key}
                        </dd>
                    );
                }
            });
        }
    }

    render() {
        return (
            <div id="keywordExtractionPage">
                <p className="Title">KeyWord Extraction Page</p>
                <Row className="d-flex justify-content-md-center">
                    <Col md="6" id="keywordExtraction-container">
                        <Row>
                            <Col md="12">
                                <Notification notiType={this.state.notiType} show={this.state.show} notiMessageHeader={this.state.notiMessageHeader}
                                    notiMessageBody={this.state.notiMessageBody} handleHide={this.handleHide}></Notification>
                            </Col>
                        </Row>
                        <Row className="justify-content-md-left">
                            <Col md="3" className="d-flex align-items-md-center">Model ID:</Col>
                            <Col>
                                <Form.Group controlId="list-modelIds" className="mb-0" onChange={this.selectModelId}>
                                    <Form.Control as="select">
                                        {this.renderModelOptions()}
                                    </Form.Control>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={{ span: 9, offset: 3 }} className="input-form">
                                <InputGroup className="mb-3" id="input-text" onChange={this.handleKeyPress}>
                                    <FormControl as="textarea" rows="3" className="input-content" />
                                </InputGroup>
                            </Col>
                        </Row>
                        <Row >
                            <Col md={{ span: 4, offset: 8 }}>
                                <Button className="keyword-extraction-button" block type="submit" disabled={!this.tempValueInputted} 
                                    onClick={this.extractKeyword}>Keyword Extraction</Button>
                            </Col>
                        </Row>
                        <Row className="my-3 justify-content-md-left">
                            <Col>Extracted Result: </Col>
                            <Col sm="9" md="9" lg="9" xl="9">
                                <pre>{this.renderExtractedResult()}</pre>
                            </Col>
                        </Row>
                        <Row className="my-3 justify-content-md-left">
                            <Col>Key of Tag: </Col>
                            <Col sm="9" md="9" lg="9" xl="9">
                                <dl className="dl-horizontal">
                                    {this.renderTagList()}
                                </dl>
                            </Col>
                        </Row>
                        <Row className="my-3 justify-content-md-left">
                            <Col>Relation: </Col>
                            <Col sm="9" md="9" lg="9" xl="9">
                                <dl className="dl-horizontal">
                                    {this.renderRelationList()}
                                </dl>
                            </Col>
                        </Row>
                        <Row className="justify-content-md-left">
                            <Col className="d-flex align-items-md-center">Database ID:</Col>
                            <Col sm="9" md="9" lg="9" xl="9">
                                <Form.Group controlId="list-dbIds" className="mb-0" onChange={this.selectDatabaseId}>
                                    <Form.Control as="select">
                                        {this.renderDatabaseOptions()}
                                    </Form.Control>
                                </Form.Group>
                            </Col>
                        </Row>
                        
                        <Row className="my-3 justify-content-md-left">
                            <Col md={{ span: 5, offset: 7 }}>
                            <Button className="keyword-extraction-button" block type="submit"
                                    onClick={this.goToKeywordSelection}>Go To  Keyword Selection</Button>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </div >
        );
    }
}

export default withRouter(KeywordExtractionPage);