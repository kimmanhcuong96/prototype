import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import Notification from "../ui/Notification";
import { Button, Form, Table, ListGroup, Pagination, Row, Col, InputGroup, FormControl } from "react-bootstrap";
import axios from "axios";
import { Config } from "../config/appConfig";
import { axiosEpisodeManager } from "../config/axiosConfig";
import "./KeywordSelectionPage.css";

class KeywordSelectionPage extends Component {
    state = {
        notiMessageHeader: null,
        notiMessageBody: null,
        notiType: null,
        show: false,
        databases: [],
        tagListOfEpisodeSet: [],
        selectedKey: {},
        selectedKeyId: 0,
        selectedTagList: new Map(),
        episodes: [],
        numberOfPages: 0,
        currentPage: 0,
        resultSearchExistence: false,
        searchArray: [],
        isDuplicateKey: []
    };

    NUMBER_LINE_EACH_PAGE = 5;

    databaseId = null;
    extractedTags = [];

    getdatabases = () => {
        return axiosEpisodeManager.get(`/databases`);
    };

    renderDataOptions = () => {
        if (this.state.databases instanceof Array) {
            return this.state.databases.map(db => {
                return (<option key={db.id}>{db.id}</option>);
            });
        }
    };

    getTagListOfEpisodeSet = (databaseId, taglist) => {
        // let keys = this.makeKeysUniqueFromTagList(taglist);
        let content = {};
        if ( taglist instanceof Array && taglist.length > 0) {
            content = {
                // "keys": keys,
                "query": {
                    "and": taglist
                }
            };
        }
        return axiosEpisodeManager.post(
            `/databases/${databaseId}/episodes/tags/search`,
            content
        );
    };

    renderKeyListOfEpisodeSet = (tagList, selectedKeyId) => {
        if (tagList instanceof Array) {
            return (
                <ListGroup as="ul">
                    {tagList.map((tag, tagIndex) => {
                        return (
                            <ListGroup.Item as="li" key={tag.key}
                                active={tagIndex === selectedKeyId}
                                onClick={() => this.handleClickKey(tagIndex)}>
                                {" "}
                                {tag.key}{" "}
                            </ListGroup.Item>
                        );
                    })}
                </ListGroup>
            );
        }
    };

    renderValueOfTagList = (selectedKey, keyId) => {
        if (selectedKey.values instanceof Array) {
            return selectedKey.values.map((item, itemIndex) => {
                return (
                    <Form.Group controlId={"key-" + keyId + "-value-" + itemIndex} 
                        key={"key-" + keyId + "-value-" + itemIndex}>
                        <Form.Check type="checkbox" label={item.value} checked={item.checkedFlag}
                            onChange={() => this.addToSelectedTagList({ key: selectedKey.key, value: item.value }, 
                                this.state.tagListOfEpisodeSet)}/>
                    </Form.Group>
                );
            });
        }
    };

    handleClickKey = (tagIndex) => {
        this.setState({
            selectedKey: this.state.tagListOfEpisodeSet[tagIndex],
            selectedKeyId: tagIndex
        });
    };

    selectDatabaseId = event => {
        this.databaseId = event.target.value;
        this.setState({ selectedTagList: new Map() });
        this.getTagListByDatabaseId();
    };

    checkBoxManagement = (tag, tagListOfEpisodeSet) => {
        let remarkTags = Object.assign([], tagListOfEpisodeSet);
        let keyIndex = this.findTagFromKey(tag.key, remarkTags);
        if (keyIndex !== -1) {
            let valueIndex = this.findValueIndexFromValueList(tag.value, remarkTags[keyIndex].values);
            if (valueIndex !== -1) {
                remarkTags[keyIndex].values[valueIndex].checkedFlag = !remarkTags[
                    keyIndex
                ].values[valueIndex].checkedFlag;
                this.setState({ tagListOfEpisodeSet: remarkTags });
            }
        }
    }

    checkTagExistInTagListOfEpisodeSet = (tag, tagListOfEpisodeSet) => {
        if (tagListOfEpisodeSet !== undefined && tagListOfEpisodeSet.length > 0) {
            for (let index = 0; index < tagListOfEpisodeSet.length; index++) {
                if (tag.key === tagListOfEpisodeSet[index].key) {
                    for(let valueIndex = 0; valueIndex < tagListOfEpisodeSet[index].values.length; valueIndex++){
                        if(tag.value === tagListOfEpisodeSet[index].values[valueIndex].value){
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    addToSelectedTagList = (tag, tagListOfEpisodeSet) => {
        if (this.checkTagExistInTagListOfEpisodeSet(tag, tagListOfEpisodeSet)) {
            this.checkBoxManagement(tag, tagListOfEpisodeSet);
            var clonedSelectedTags = new Map(this.state.selectedTagList);
            var key = tag.key;
            var value = tag.value;
            if (!clonedSelectedTags.has(key)) {
                clonedSelectedTags.set(key, [value]);
            } else {
                let values = clonedSelectedTags.get(key);
                if (values.includes(value)) {
                    let indexOfValue = values.indexOf(value);
                    if (indexOfValue > -1) {
                        values.splice(indexOfValue, 1);
                        if (values.length === 0) {
                            clonedSelectedTags.delete(key);
                        }
                    }
                } else {
                    values.push(value);
                    clonedSelectedTags.set(key, values);
                }
            }
            this.setState({ selectedTagList: clonedSelectedTags });
        }
    };

    findValueIndexFromValueList = (value, valueList) => {
        for (let index = 0; index < valueList.length; index++) {
            if (value === valueList[index].value) {
                return index;
            }
        }
        return -1;
    }

    addDataFromKeywordExtractionToSelectedTagList = extractedTags => {
        extractedTags.forEach(extractedTag => {
            this.addToSelectedTagList(extractedTag, this.state.tagListOfEpisodeSet);
        });
    };

    renderSelectedTagList = (selectedTagList) => {
        const html = [];
        if (selectedTagList !== undefined) {
            selectedTagList.forEach((values, key) => {
                html.push(
                    <div key={key}>
                        <div> {key}:</div>
                        <ul>
                            {values.map((val, index) => {
                                return <li key={index}>{val}</li>;
                            })}
                        </ul>
                    </div>
                );
            });
        }
        return html;
    };

    findTagFromKey = (key, tagList) => {
        for (let i = 0; i < tagList.length; i++) {
            if (tagList[i].key === key) {
                return i;
            }
        }
        return -1;
    };

    markCheckFlag = tagsInput => {
        let tags = tagsInput;
        if (tags.length > 0) {
            tags.forEach(tag => {
                tag.values.forEach(valueItem => {
                    valueItem.checkedFlag = false;
                });
            });
        }
        return tags;
    };

    getDbFromDbId = (dbId, listDb) => {
        var database = null;
        for (let index = 0; index < listDb.length; index++) {
            if (listDb[index].id === dbId) {
                database = listDb[index];
                break;
            }
        }
        return database;
    };

    checkKeyExistInTagList = (key, tags) => {
        if (tags.length > 0) {
            for (let index = 0; index < tags.length; index++) {
                if (tags[index].key === key) {
                    return true;
                }
            }
        }
        return false;
    }

    componentDidMount() {
        let searchItem = {
            key: '',
            value: ''
        };
        let searchItems = [];
        searchItems.push(searchItem);
        this.setState({searchArray: searchItems});
        let isDuplicate = [false];
        this.setState({isDuplicateKey: isDuplicate});

        if (
            this.props.location.state !== undefined &&
            this.props.location.state.transferFlag
        ) {
            let dataFromKeywordExtraction = localStorage.getItem("extractKeywordData");
            if (dataFromKeywordExtraction !== null) {
                try {
                    this.databaseId = JSON.parse(dataFromKeywordExtraction).databaseId;
                    this.extractedTags = JSON.parse(dataFromKeywordExtraction).extractedTag;
                } catch (err) {
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
                }
            }
        }
        this.getdatabases().then(databasesRes => {
            this.setState({ databases: databasesRes.data.databases });
            if (databasesRes.data.databases.length > 0) {
                let checkID = databasesRes.data.databases.filter(db => {
                    return db.id === this.databaseId;
                }).shift();
                if (!checkID) {
                    this.databaseId = databasesRes.data.databases[0].id;
                }                    
            }
            return this.getTagListOfEpisodeSet(
                this.databaseId,
                []
            );
        })
        .then(taglistRes => {
            let tags = taglistRes.data.tags;
            // get extracted tag in list tags
                let selectExtractedTags = [];
            if(tags !== undefined && tags.length > 0){
                
                this.extractedTags.forEach(item => {
                    if(this.checkTagExistInTagListOfEpisodeSet(item, tags)){
                        selectExtractedTags.push(item);
                    }
                })
            }
            return this.getTagListOfEpisodeSet(
                this.databaseId,
                selectExtractedTags
            );
        }).then(taglistRes => {
            let tags = taglistRes.data.tags;
            let newTags = this.markCheckFlag(tags);
            this.setState({ tagListOfEpisodeSet: newTags });
            if (newTags.length > 0) {
                this.setState({
                    selectedKey: newTags[0],
                    selectedKeyId: 0
                });
            } else {
                this.setState({
                    selectedKey: {},
                    selectedKeyId: -1
                });
            }
            this.addDataFromKeywordExtractionToSelectedTagList(
                this.extractedTags
            );               
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

    getTagListByDatabaseId = () => {
        this.getTagListOfEpisodeSet(this.databaseId, [] ).then(taglistRes => {
            let tags = taglistRes.data.tags;
            // get extracted tag in list tags
            let selectExtractedTags = [];
            if(tags !== undefined && tags.length > 0){
               
                this.extractedTags.forEach(item => {
                    if(this.checkTagExistInTagListOfEpisodeSet(item, tags)){
                        selectExtractedTags.push(item);
                    }
                })
            }
            return this.getTagListOfEpisodeSet(
                this.databaseId,
                selectExtractedTags
            );
        }).then(taglistRes => {
            let tags = taglistRes.data.tags;
            let newTags = this.markCheckFlag(tags);
            this.setState({ tagListOfEpisodeSet: newTags });
            if (newTags.length > 0) {
                this.setState({
                    selectedKey: newTags[0],
                    selectedKeyId: 0
                });
            } else {
                this.setState({
                    selectedKey: {},
                    selectedKeyId: -1
                });
            }
            this.addDataFromKeywordExtractionToSelectedTagList(
                this.extractedTags
            );               
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
    };

    startSearch = () => {
        let database = this.getDbFromDbId(this.databaseId, this.state.databases);
        if (this.state.selectedTagList.size > 0) {
            this.sendSearchRequests(
                this.databaseId,
                database.episode_count
            ).then(searchRes => {
                var episodeList = [];
                searchRes.forEach(item => {
                    item.data.episodes.forEach(episode => { episodeList.push(episode); })
                });
                if (episodeList.length > 0) {
                    let numberOfPages = Math.floor(episodeList.length / this.NUMBER_LINE_EACH_PAGE);
                    if (Math.floor(episodeList.length / this.NUMBER_LINE_EACH_PAGE) < 
                        (episodeList.length / this.NUMBER_LINE_EACH_PAGE)) {
                        numberOfPages += 1;
                    }
                    if (numberOfPages > 0) {
                        this.setState({ currentPage: 1 });
                    }
                    this.setState({
                        episodes: episodeList,
                        numberOfPages: numberOfPages,
                        show: false,
                        resultSearchExistence: true
                    });
                } else {
                    this.setState({
                        resultSearchExistence: false,
                        notiType: "success",
                        show: true,
                        notiMessageHeader: "Success",
                        notiMessageBody: "There is no matched result"
                    });
                }
                let requestTagList = this.buildTagListFromTagMap(this.state.selectedTagList);
                return this.getTagListOfEpisodeSet(this.databaseId, requestTagList)
            }).then(tagListEpisodeSetRes => {
                let tags = tagListEpisodeSetRes.data.tags;
                let newTags = this.markCheckFlag(tags);
                let tagList = this.buildTagListFromTagMap(this.state.selectedTagList);
                tagList.forEach(tag => {
                    this.checkBoxManagement(tag, newTags);
                });
                this.setState({ tagListOfEpisodeSet: newTags });
                if (newTags.length > 0) {
                    this.setState({
                        selectedKey: newTags[0],
                        selectedKeyId: 0
                    });
                } else {
                    this.setState({
                        selectedKey: {},
                        selectedKeyId: -1
                    });
                }
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
        } else {
            let requestTagList = this.buildTagListFromTagMap(this.state.selectedTagList);
            return this.getTagListOfEpisodeSet(this.databaseId, requestTagList).then(tagListEpisodeSetRes => {
                let tags = tagListEpisodeSetRes.data.tags;
                let newTags = this.markCheckFlag(tags);
                let tagList = this.buildTagListFromTagMap(this.state.selectedTagList);
                tagList.forEach(tag => {
                    this.checkBoxManagement(tag, newTags);
                });
                this.setState({
                    tagListOfEpisodeSet: newTags,
                    resultSearchExistence: false
                });
                if (newTags.length > 0) {
                    this.setState({
                        selectedKey: newTags[0],
                        selectedKeyId: 0
                    });
                } else {
                    this.setState({
                        selectedKey: {},
                        selectedKeyId: -1
                    });
                }
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
    };


    buildTagListFromTagMap = (tagMap) => {
        let tagList = [];
        if(tagMap !== undefined && tagMap.size > 0){
            tagMap.forEach((values, key) => {
                values.forEach(value => {
                    let tmpTag = {
                        key: key,
                        value: value
                    }
                    tagList.push(tmpTag);
                });
            });
        }
        return tagList;
    }

    renderSearchResult = () => {
        return (
            <div id="searchResult-container">
                <Row >
                    <Col className="paginate-selection ">
                        <Pagination id="pagination" >
                            <Pagination.Prev onClick={this.handlePaginatePrev} />
                            <Pagination.Item id="pagination-view" >{this.state.currentPage + "/" + this.state.numberOfPages}</Pagination.Item>
                            <Pagination.Next onClick={this.handlePaginateNext} />
                        </Pagination>
                    </Col>
                </Row>
                <div id="table-view">
                    <Table striped bordered hover >
                        <thead>
                            <tr>
                                <th>Episode ID</th>
                                <th>Line Number</th>
                            </tr>
                        </thead>
                        <tbody>
                            {this.renderDataTable(this.state.episodes, this.state.currentPage)}
                        </tbody>
                    </Table>
                </div>
            </div >
        )
    }

    sendSearchRequests = (db_id, numEpisodeInDatabase) => {
        var allRequests = [];
        var numberOfRequest =
            Math.floor(numEpisodeInDatabase / Config.KEYWORD_SELECTION_MAX_COUNT) + 1;
        for (let i = 0; i < numberOfRequest; i++) {
            allRequests.push(this.searchRequest(db_id, i));
        }
        return axios.all(allRequests);
    };

    searchRequest = (db_id, requestTh) => {
        var listTags = this.buildTagListFromTagMap(this.state.selectedTagList);
        var searchEpisode = {
            from: requestTh * Config.KEYWORD_SELECTION_MAX_COUNT,
            count: 1000,
            query: {
                and: listTags
            },
            context: {},
            expand_synonyms: Config.KEYWORD_SELECTION_EXPAND_SYNONYMS,
            query_weight: Config.KEYWORD_SELECTION_QUERY_WEIGHT,
            context_weight: Config.KEYWORD_SELECTION_CONTEXT_WEIGHT
        };

        this.state.searchArray.forEach((array) => {
            if (array.key.length > 0 && array.value.length > 0) {
                searchEpisode.context[array.key] = parseFloat(array.value);
            }            
        });
        
        return axiosEpisodeManager.post(
            `/databases/${db_id}/episodes/search`,
            searchEpisode
        );
    };
    
    renderDataTable = (data, currentPage) => {
        if (data instanceof Array) {
            var dataCurrentView = data.slice(((currentPage - 1) * this.NUMBER_LINE_EACH_PAGE), currentPage * this.NUMBER_LINE_EACH_PAGE);
            return (
                dataCurrentView.map((episode, index) => {
                    return (
                        <tr key={'episode-' + index}>
                            <td>{episode.id}</td>
                            <td>{episode.name}</td>
                        </tr>
                    )
                })
            )
        }
    }    

    addNewSearchItem = () => {
        let searchItems = this.state.searchArray.slice();
        let newItem = {
            key: '',
            value: ''
        };
        searchItems.push(newItem);
        this.setState({searchArray: searchItems});
    }

    deleteSearchItem = (index) => {
        let searchItems = this.state.searchArray.slice();
        searchItems.splice(index, 1);
        this.setState({searchArray: searchItems});
    }

    onChangeSearchValue = (event, index, isKey) => {
        let array = this.state.searchArray.slice();
        let newItem;        
        if (isKey) {
            newItem = {
                key: event.target.value,
                value: array[index].value
            }
            let arrayCheckDuplicate = this.state.isDuplicateKey.slice();
            let existKey = array.filter(item => item.key === event.target.value);
            if (existKey.length > 0) {
                arrayCheckDuplicate[index] = true;
            } else {
                arrayCheckDuplicate[index] = false;
            }
            this.setState({isDuplicateKey: arrayCheckDuplicate});
        } else {
            newItem = {
                key: array[index].key,
                value: event.target.value
            }
        }
        array[index] = newItem;
        this.setState({searchArray: array});
    }

    checkNewSearchItem = () => {
        if (this.state.searchArray.length < 1) {
            return false;
        } else {
            const item = this.state.searchArray[this.state.searchArray.length-1];
            if (item.key.length === 0 && item.value.length === 0) {
                return true;
            }
            return false;
        }
    }

    handlePaginatePrev = () => {
        let currentPage = this.state.currentPage - 1;
        if (currentPage > 0) {
            this.setState({ currentPage: currentPage });
        }
    }

    handlePaginateNext = () => {
        let currentPage = this.state.currentPage + 1;
        if (currentPage <= this.state.numberOfPages) {
            this.setState({ currentPage: currentPage });
        }
    }

    handleHide = () => {
        this.setState({ show: false });
    }

    renderSearchList = () => {
        let style = { borderRight:'none', borderBottom:'none', borderTop:'none' };
        return this.state.searchArray.map((item, index) => {
            return (
                <tr key={index}>
                    <td className="p-0" sm="5" md="5" lg="5" xl="5">
                        <InputGroup>
                            <FormControl className={this.state.isDuplicateKey[index] ? "alert-danger border-danger" : "input-content"} 
                                value={item.key} onChange={(event) => this.onChangeSearchValue(event, index, true)}/>
                        </InputGroup>
                    </td>
                    <td className="p-0" sm="5" md="5" lg="5" xl="5">
                        <InputGroup>
                            <FormControl type="number" step="0.1" className="input-content" value={item.value}
                                onChange={(event) => this.onChangeSearchValue(event, index, false)}/>
                        </InputGroup>
                    </td>
                    <td className="text-center" style={style}>
                        {index < 1 ? (
                            <Button variant="primary" className="btn-sm rounded-circle" onClick={this.addNewSearchItem} 
                                disabled={this.checkNewSearchItem()}>＋</Button>
                        ) : (
                            <Button variant="danger" className="btn-sm rounded-circle" onClick={() => this.deleteSearchItem(index)}>－</Button>
                        )}                        
                    </td>
                </tr> 
            )
        });
    }

    render() {
        return (
            <div id="keywordSelectionPage">
                <p className="Title">Keyword Selection Page</p>
                <Row className="d-flex justify-content-md-center">
                    <Col md="6" id="keyword-selection-container">
                        <Row>
                            <Col md="12">
                                <Notification
                                    notiType={this.state.notiType}
                                    show={this.state.show}
                                    notiMessageHeader={this.state.notiMessageHeader}
                                    notiMessageBody={this.state.notiMessageBody}
                                    handleHide={this.handleHide}
                                />
                            </Col>
                        </Row>
                        <Row className="justify-content-md-left">
                            <Col md="2" className="d-flex align-items-md-center">Database ID:</Col>
                            <Col md="4">
                                <Form.Group controlId="list-dbIds" className="mb-0">
                                    {!this.databaseId ? (
                                        <Form.Control as="select" onChange={this.selectDatabaseId}>
                                            {this.renderDataOptions()}
                                        </Form.Control>
                                    ) : (
                                        <Form.Control as="select" value={this.databaseId} onChange={this.selectDatabaseId}>
                                            {this.renderDataOptions()}
                                        </Form.Control>
                                    )}                                    
                                </Form.Group>
                            </Col>
                        </Row>
                        <div id="keyword-selection">
                            <div className="keyword-label"> Keyword selection:</div>
                            <div className="table-container">
                                <Table striped bordered hover id="outer-table">
                                    <thead>
                                        <tr>
                                            <th />
                                            <th>Selected keyword:</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>
                                                <Table striped bordered hover id="inner-table">
                                                    <thead />
                                                    <tbody>
                                                        <tr>
                                                            <td>
                                                                {this.renderKeyListOfEpisodeSet(this.state.tagListOfEpisodeSet, this.state.selectedKeyId)}
                                                            </td>
                                                            <td>
                                                                {this.renderValueOfTagList(this.state.selectedKey, this.state.selectedKeyId)}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </Table>
                                            </td>
                                            <td>
                                                {this.renderSelectedTagList(this.state.selectedTagList)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </Table>
                            </div>
                        </div>
                        <div id="search-key-area" className="my-3">
                            <div className="keyword-label"> Context:</div>
                            <div className="table-container">
                                <Table size="sm" id="search-item-table">
                                    <tbody>
                                        {this.renderSearchList()}
                                    </tbody>
                                </Table>
                            </div>
                        </div>
                        <Row>
                            <Col md={{ span: 3, offset: 9 }}>
                                <Button className="search-button" block type="submit" onClick={this.startSearch}
                                    disabled={this.state.isDuplicateKey.includes(true)}>
                                    Search
					            </Button>
                            </Col>
                        </Row>
                        <Row>
                            <Col md="12">
                                {this.state.resultSearchExistence === true ? this.renderSearchResult() : ""}
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </div>

        );
    }
}

export default withRouter(KeywordSelectionPage);
