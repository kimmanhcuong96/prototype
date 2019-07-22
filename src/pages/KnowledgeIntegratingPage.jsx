import React, { Component } from "react";
import Notification from "../ui/Notification";
import { Button, Form, Modal, Row, Col } from "react-bootstrap";
import axios from "axios";
import "./KnowledgeIntegratingPage.css";
import Papa from "papaparse";
import FileBrowser from "../ui/FileBrowser";
import ParsedCsv from "../model/create-episode/ParsedCsv";
import { axiosEpisodeManager, axiosTextAnalyzer } from "../config/axiosConfig";
import Episode from "../model/create-episode/Episode";
import Tag from "../model/create-episode/Tag";
import Source from "../model/create-episode/Source";
import Relation from "../model/create-episode/Relation";
import RelationTag from "../model/create-episode/RelationTag";
import Context from "../model/create-episode/Context";
import DatabaseCreationModal from "./DatabaseCreationModal";
import LoadingModal from "../ui/LoadingModal";

class KnowlegdeIntegratingPage extends Component {
	state = {
		integrateButtonDisabled: true,
		isIntegrating: false,
		notiMessageHeader: null,
		notiMessageBody: null,
		notiType: null,
		showNotification: false,
		databases: [],
		selectedDatabaseId: 0,
		showDatabaseCreationModal: false,
		creatingDatabase: false,
		deleteModelShow: false
	};

	selectedFile = null;
	config = {
		concurrentIntegatedEpisodes: 1
	};
	counterForTagTempId = 0;
	counterForSourceTempId = 0;
	postEpisodeErrors = [];

	getIncrementedCounterForSourceTempId = () => {
		this.counterForSourceTempId++;
		return this.counterForSourceTempId;
	};
	resetAllCounters = () => {
		this.counterForSourceTempId = 0;
		this.counterForTagTempId = 0;
	};

	componentDidMount() {
		this.getDatabases()
			.then(databasesRes => {
				const databases = databasesRes.data.databases;
				this.setState({
					databases,
					selectedDatabaseId: databases.length
						? parseInt(databases[0].id, 10)
						: 0
				});
			})
			.catch(err => {
				this.setState({ notiType: "danger" });
				this.setState({ showNotification: true });
				if (err.Heading === undefined && err.body === undefined) {
					this.setState({ notiMessageHeader: err + "" });
					this.setState({ notiMessageBody: "" });
				} else {
					this.setState({ notiMessageHeader: err.Heading });
					this.setState({ notiMessageBody: err.body });
				}
			});
	}

	EnableSubmitButton = enabletrigger => {
		this.setState({ selectedFile: enabletrigger });
	};

	handleHide = () => {
		this.setState({ showNotification: false });
	};

	selectDatabaseId = event => {
		this.setState({ selectedDatabaseId: parseInt(event.target.value, 10) });
	};

	getDatabases = () => {
		return axiosEpisodeManager.get("/databases");
	};

	createDatabase = (name, description) => {
		return axiosEpisodeManager.post("/databases", {
			name,
			description
		});
	};

	selectFile = e => {
		this.selectedFile = e.target.files[0];
		// console.log('File selected: ', this.selectedFile);
		this.setState({ integrateButtonDisabled: false });
	};

	parseCsv = file => {
		if (file && file instanceof File) {
			const option = {
				delimiter: ",", // auto-detect
				newline: "\r\n", // auto-detect
				quoteChar: '"',
				escapeChar: '"',
				header: false,
				encoding: "UTF-8",
				comments: false,
				skipEmptyLines: true,
				delimitersToGuess: [
					",",
					"\t",
					"|",
					";",
					Papa.RECORD_SEP,
					Papa.UNIT_SEP
				]
			};
			return new Promise((complete, error) => {
				Papa.parse(file, { complete, error, ...option });
			});
		} else {
			throw new Error("Not a file.");
		}
	};
	startIntegrating = () => {
		this.resetAllCounters();
		this.postEpisodeErrors = [];
		this.setState({
			showNotification: false,
			notiType: "",
			notiMessageHeader: "",
			notiMessageBody: ""
		});

		this.parseCsv(this.selectedFile)
			.then(result => {
				const rows = result.data;
				this.validateCsv(rows);
				// Extract headers, meta, content rows
				const parsedCsv = new ParsedCsv();
				parsedCsv.headers = rows[0];
				parsedCsv.meta = rows[1];
				rows.splice(0, 2); // Delete rows of headers and meta. Remaining are content rows.
				parsedCsv.content = rows;
				this.integrate(
					parsedCsv,
					this.config.concurrentIntegatedEpisodes
				);
			})
			.catch(err => {
				console.log("exception appear!", err.response);
				this.setState({ notiType: "danger" });
				this.setState({ showNotification: true });
				if (
					err.response === undefined ||
					err.response.data === undefined
				) {
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

	integrate = async (parsedCsv, concurrentProcessingRows) => {
		if (!(parsedCsv instanceof ParsedCsv)) {
			throw new Error("Invalid args: not of type ParsedCsv.");
		}
		if (!this.state.isIntegrating) {
			this.setState({ isIntegrating: true });
		}
		const { content } = parsedCsv;
		if (content instanceof Array && content.length > 0) {
			// console.log("=======Start integrating episode chunk=========");
			if (concurrentProcessingRows > content.length) {
				concurrentProcessingRows = content.length;
			}
			const rowsToIntegrate = content.splice(0, concurrentProcessingRows);
			const episodes = await this.buildMultipleEpisodes(
				parsedCsv,
				rowsToIntegrate
			);
			this.postMultipleEpisodes(episodes)
				.then(res => {
					// console.log(
					// 	"========Finish integrating episode chunk======="
					// );
					this.integrate(parsedCsv, concurrentProcessingRows);
				})
				.catch(err => {
					this.handlePostMultipleEpisodesError(err);
					this.integrate(parsedCsv, concurrentProcessingRows);
				});
		} else {
			this.finishIntegrating();
		}
	};

	buildMultipleEpisodes = async (parsedCsv, contentRows) => {
		if (parsedCsv instanceof ParsedCsv) {
			const episodes = [];
			for (let i = 0; i < contentRows.length; i++) {
				const episode = await this.buildEpisode(
					parsedCsv,
					contentRows[i]
				);
				episodes.push(episode);
			}
			// console.log(">>>>> All episodes chunk built: >>>>", episodes);
			return await episodes;
		}
	};
	buildEpisode = async (parsedCsv, row) => {
		// console.log("Building episode from row: ", row);
		if (parsedCsv instanceof ParsedCsv) {
			// Step 1: build basic info of the episode
			const episode = this.buildInitialEpisode(parsedCsv, row);
			// Step 2: build sources
			const sources = this.buildEpisodeSources(parsedCsv, row);
			// Step 3: build context
			const context = this.buildEpisodeContext(parsedCsv, row);
			// Step 4: build tag type 1
			const tagsTypeOne = this.buildEpisodeTagsTypeOne(
				parsedCsv,
				row,
				sources
			);
			// Step 5: Get extracted results (expressions & relations) of all columns in the row which have Model ID.
			const extractionResultsAxiosResponse = await this.extractEntireRow(
				parsedCsv,
				row
			);
			const extractionResults = extractionResultsAxiosResponse.map(
				res => res.data
			);
			// console.log(
			// 	"Build episode -> Extract all columns:",
			// 	extractionResults
			// );
			// Step 6: Build tags type 2 & 3 from extracted results.
			let tagsTypeTwo = [];
			let tagsTypeThree = [];

			extractionResults.forEach((result, index) => {
				const columnIndex = parsedCsv.modelIdColumnIndexes[index];
				tagsTypeTwo = tagsTypeTwo.concat(
					this.buildEpisodeTagsTypeTwo(
						result,
						columnIndex,
						sources[0].tmpid
					)
				);
				tagsTypeThree = tagsTypeThree.concat(
					this.buildEpisodeTagsTypeThree(
						result,
						columnIndex,
						sources[0].tmpid
					)
				);
			});
			// console.log("ALL TAGS TYPE 2 OF ROW: ", tagsTypeTwo);
			// console.log("ALL TAGS TYPE 3 OF ROW: ", tagsTypeThree);

			// Step 7: Build relations
			// Step 7.1: Build base relations
			let baseRelations = [];
			extractionResults.forEach((result, index) => {
				const columnIndex = parsedCsv.modelIdColumnIndexes[index];
				baseRelations = baseRelations.concat(
					this.buildBaseRelations(result, columnIndex)
				);
			});
			// console.log("ALL BASE RELATIONS:", baseRelations);

			// Step 7.2: Build common relations
			const commonRelation = this.buildCommonRelation(
				tagsTypeOne,
				tagsTypeTwo
			);
			// console.log("COMMON RELATIONS:", commonRelation);

			// Step 7.3: Build expanded base relations
			const expandedBaseRelations = this.buildExpandedBaseRelations(
				baseRelations,
				commonRelation
			);
			// console.log("EXPANDED RELATIONS: ", expandedBaseRelations);

			// Step 7.4: Build extra relations
			const extraRelations = this.buildExtraRelations(baseRelations);
			// console.log("EXTRA RELATIONS:", extraRelations);

			// Step 7.5: Merge expanded base & extra relations
			episode.relations = expandedBaseRelations.concat(extraRelations);

			// Don't use episode.context = context.
			// Since context is a Map, need to loop through it and write key - value into a form of object.
			// Otherwise episode.context = {} when posting to Server.
			context.forEach((value, key) => {
				episode.context[key] = value;
			});
			episode.sources = sources;
			episode.tags = tagsTypeOne
				.concat(tagsTypeTwo)
				.concat(tagsTypeThree);
			return episode;
		}
	};
	buildInitialEpisode = (parsedCsv, row) => {
		const episode = new Episode();
		episode.name = row[0]; // name = id
		episode.description = row[0];
		// console.log("Build episode -> Build initial episode:", episode);
		return episode;
	};

	/**
	 * Build array of sources for episode.
	 * @return Source[]
	 */
	buildEpisodeSources = (parsedCsv, row) => {
		const source = new Source();
		source.content_id = row[0];
		source.content_type = "plain/text";
		source.date = this.formatDate(new Date());
		source.description = source.content_id;
		source.name = source.content_id;
		source.tmpid = "s" + this.getIncrementedCounterForSourceTempId();
		// console.log("Build episode -> Build sources: ", [source]);
		return [source];
	};

	/**
	 * Format date to String in format: "2018-05-08T09:12:05Z"
	 * @return string value of date.
	 * @throw Error if not a date.
	 */
	formatDate = date => {
		if (date instanceof Date) {
			const hour =
				date.getHours() < 10
					? "0" + date.getHours()
					: "" + date.getHours();
			const minute =
				date.getMinutes() < 10
					? "0" + date.getMinutes()
					: "" + date.getMinutes();
			const second =
				date.getSeconds() < 10
					? "0" + date.getSeconds()
					: "" + date.getSeconds();
			const year = date.getFullYear();
			const month =
				date.getMonth() + 1 < 10
					? "0" + (date.getMonth() + 1)
					: "" + (date.getMonth() + 1);
			const day =
				date.getDate() < 10
					? "0" + date.getDate()
					: "" + date.getDate();
			return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
		} else {
			throw new Error("Not a date.");
		}
	};
	buildEpisodeContext = (parsedCsv, row) => {
		if (parsedCsv instanceof ParsedCsv) {
			const { contextColumnIndexes } = parsedCsv;
			const context = new Context();
			contextColumnIndexes.forEach(colIndex => {
				const contextHeader = parsedCsv.headers[colIndex];
				context.set(contextHeader, row[colIndex]);
			});
			// console.log("Build episode -> Build context:", context);
			return context;
		} else {
			throw new Error("Invalid args");
		}
	};
	buildEpisodeTagsTypeOne = (parsedCsv, row, sources) => {
		if (
			parsedCsv instanceof ParsedCsv &&
			sources instanceof Array &&
			sources.length > 0
		) {
			const { tagTypeOneColumnIndexes } = parsedCsv;
			const tagsTypeOne = [];
			tagTypeOneColumnIndexes.forEach(colIndex => {
				const columnContent = row[colIndex];
				if (columnContent.trim() !== "") {
					const tag = new Tag();
					tag.tmpid = "t" + this.getIncrementedCounterForTagTempId();
					tag.key = parsedCsv.headers[colIndex];
					tag.value = row[colIndex];
					tag.source_range = this.buildSourceRange(
						0,
						tag.value.length
					);
					// console.log('Building tag type 1, source tmpid = ' + sources[0].tmpid);
					tag.source_tmpid = sources[0].tmpid;
					tagsTypeOne.push(tag);
				}
			});
			// console.log("Build episode -> Build tags type 1:", tagsTypeOne);
			return tagsTypeOne;
		} else {
			throw new Error("Invalid args.");
		}
	};
	buildEpisodeTagsTypeTwo = (extractionResult, columnIndex, sourceTempId) => {
		const tagsTypeTwo = [];
		if (
			extractionResult.expressions &&
			extractionResult.expressions instanceof Array &&
			extractionResult.expressions.length > 0
		) {
			extractionResult.expressions.forEach(exp => {
				if (
					this.findExpressionIndexInRelations(
						extractionResult.relations,
						exp
					) === -1
				) {
					tagsTypeTwo.push(
						this.convertExtractioneExpressionToEpisodeTag(
							exp,
							sourceTempId,
							columnIndex
						)
					);
				}
			});
		}
		// console.log("Build episode -> Build tags type 2:", tagsTypeTwo);
		return tagsTypeTwo;
	};
	buildEpisodeTagsTypeThree = (
		extractionResult,
		columnIndex,
		sourceTempId
	) => {
		const tagsTypeThree = [];
		if (
			extractionResult.expressions &&
			extractionResult.expressions instanceof Array &&
			extractionResult.expressions.length > 0
		) {
			extractionResult.expressions.forEach(exp => {
				if (
					this.findExpressionIndexInRelations(
						extractionResult.relations,
						exp
					) > -1
				) {
					tagsTypeThree.push(
						this.convertExtractioneExpressionToEpisodeTag(
							exp,
							sourceTempId,
							columnIndex
						)
					);
				}
			});
			// TODO: find tags type 3 in relations
			extractionResult.relations.forEach(rel => {
				if (this.findRelationIndexInExpressions(extractionResult.expressions, rel.start_left, rel.end_left) === -1) {
					tagsTypeThree.push(
						this.convertExtractionRelationToEpisodeTag(rel.key,
							rel.surface_left, 
							rel.start_left, 
							rel.end_left, 
							sourceTempId, 
							columnIndex)
					);
				}
				if (this.findRelationIndexInExpressions(extractionResult.expressions, rel.start_right, rel.end_right) === -1) {
					tagsTypeThree.push(
						this.convertExtractionRelationToEpisodeTag(rel.key,
							rel.surface_right, 
							rel.start_right, 
							rel.end_right, 
							sourceTempId, 
							columnIndex)
					);
				}
			})
		}
		// console.log("Build episode -> build tags type 3:", tagsTypeThree);
		return tagsTypeThree;
	};
	findExpressionIndexInRelations = (relations = [], expression = {}) => {
		for (let i = 0; i < relations.length; i++) {
			const relation = relations[i];
			if (
				relation["start_left"] === expression["start"] &&
				relation["end_left"] === expression["end"]
			) {
				return i;
			} else if (
				relation["start_right"] === expression["start"] &&
				relation["end_right"] === expression["end"]
			) {
				return i;
			}
		}
		return -1;
	};

	findRelationIndexInExpressions = (expressions, start, end) => {
		for (let i = 0; i < expressions.length; i++) {
			const currentExpression = expressions[i];
			if (
				currentExpression.start === start &&
				currentExpression.end === end
			) {
				return i;
			}
		}
		// console.log("NOT FOUND: ", start, end);
		return -1;
	};

	convertExtractioneExpressionToEpisodeTag = (
		expression,
		sourceTempId,
		columnIndex
	) => {
		const tag = new Tag();
		tag.key = expression["key"];
		tag.source_tmpid = sourceTempId;
		tag.value = expression["surface"];
		tag.tmpid = this.buildTagTempIdFromExtractionResult(
			columnIndex,
			expression.start,
			expression.end
		);
		tag.source_range = this.buildSourceRange(
			expression["start"],
			expression["end"]
		);
		return tag;
	};

	convertExtractionRelationToEpisodeTag = (key, value, start, end , sourceTempId, columnIndex) => {
		const tag = new Tag();
		tag.key = key;
		tag.source_tmpid = sourceTempId;
		tag.value = value;
		tag.tmpid = this.buildTagTempIdFromExtractionResult(
			columnIndex,
			start,
			end
		);
		tag.source_range = this.buildSourceRange(
			start,
			end
		);
		return tag;
	}
	buildTagTempIdFromExtractionResult = (columnIndex, start, end) => {
		return `tag-${columnIndex}-${start}-${end}`;
	};
	buildSourceRange = (startIndex = 0, endIndex = 0) => {
		return `${startIndex}-${endIndex}`;
	};

	buildBaseRelations = (extractionResult, columnIndex) => {
		const extractionRelations = extractionResult.relations;
		const extractionExpressions = extractionResult.expressions;
		const baseRelations = [];
		extractionRelations.forEach(r => {
			const relation = new Relation();
			const relationTagLeft = new RelationTag();
			const relationTagRight = new RelationTag();
			const foundLeftExpressionIndex = this.findRelationIndexInExpressions(
				extractionExpressions,
				r["start_left"],
				r["end_left"]
			);
			const foundRightExpressionIndex = this.findRelationIndexInExpressions(
				extractionExpressions,
				r["start_right"],
				r["end_right"]
			);
			if(foundLeftExpressionIndex >= 0){
				relationTagLeft.role =
				extractionExpressions[foundLeftExpressionIndex].key;
			} else {
				relationTagLeft.role = r["key"];
			}
		
			relationTagLeft.tmpid = this.buildTagTempIdFromExtractionResult(
				columnIndex,
				r["start_left"],
				r["end_left"]
			);
			if(foundRightExpressionIndex >= 0){
				relationTagRight.role =
				extractionExpressions[foundRightExpressionIndex].key;
			} else {
				relationTagRight.role = r["key"];
			}
			
			relationTagRight.tmpid = this.buildTagTempIdFromExtractionResult(
				columnIndex,
				r["start_right"],
				r["end_right"]
			);
			relation.tags = [relationTagLeft, relationTagRight];
			baseRelations.push(relation);
		});
		return baseRelations;
	};

	buildCommonRelation = (tagsTypeOne, tagsTypeTwo) => {
		if (tagsTypeOne instanceof Array && tagsTypeTwo instanceof Array) {
			const relation = new Relation();
			const allTags = tagsTypeOne.concat(tagsTypeTwo);
			allTags.forEach(tag => {
				if (tag instanceof Tag) {
					const relationTag = new RelationTag();
					relationTag.role = "co-occur";
					relationTag.tmpid = tag.tmpid;
					relation.tags.push(relationTag);
				}
			});
			return relation;
		} else {
			throw new Error("Invalid args.");
		}
	};

	buildExpandedBaseRelations = (baseRelations, commonRelation) => {
		if (
			baseRelations instanceof Array &&
			commonRelation instanceof Relation
		) {
			const expandedRelations = [];
			baseRelations.forEach(base => {
				const relation = new Relation();
				const expandedRelationTag = base.tags.concat(
					commonRelation.tags
				);
				relation.tags = expandedRelationTag;
				expandedRelations.push(relation);
			});
			return expandedRelations;
		} else {
			throw new Error("Invalid args");
		}
	};

	buildExtraRelations = baseRelations => {
		if (baseRelations instanceof Array) {
			let extraRelations = [];
			for (let i = 0; i < baseRelations.length - 1; i++) {
				for (let j = i + 1; j < baseRelations.length; j++) {
					const pre = baseRelations[i];
					const post = baseRelations[j];
					const preRelationTags = pre.tags;
					const postRelationTags = post.tags;
					if (
						preRelationTags instanceof Array &&
						postRelationTags instanceof Array
					) {
						postRelationTags.forEach(postRelTag => {
							if (
								!this.checkRoleExistence(
									preRelationTags,
									postRelTag.role
								)
							) {
								const extraRel = preRelationTags.map(preRel => {
									const newRelation = new Relation();
									newRelation.tags = [preRel, postRelTag];
									return newRelation;
								});
								extraRelations = [...extraRel];
							}
						});
					}
				}
			}
			return extraRelations;
		}
	};
	checkRoleExistence = (relationTags, role) => {
		if (relationTags instanceof Array && typeof role === "string") {
			for (let i = 0; i < relationTags.length; i++) {
				if (relationTags[i].role === role) {
					return true;
				}
			}
		}
		return false;
	};

	postMultipleEpisodes = episodes => {
		const allRequests = episodes.map(episode => {
			return axiosEpisodeManager.post(
				`/databases/${this.state.selectedDatabaseId}/episodes`,
				episode
			);
		});
		return axios.all(allRequests);
	};

	extractEntireRow = async (parsedCsv, row) => {
		if (parsedCsv instanceof ParsedCsv) {
			const allExtractionRequests = parsedCsv.modelIdColumnIndexes.map(
				colIndex => {
					const modelId = parsedCsv.meta[colIndex];
					const content = row[colIndex];
					return this.extractTag(modelId, content);
				}
			);
			return new Promise((resolve, reject) => {
				axios
					.all(allExtractionRequests)
					.then(res => {
						resolve(res);
					})
					.catch(async err => {
						resolve([
							{ data: { expressions: [], relations: [] } }
						]);
					});
			});
		} else {
			return Promise.resolve([{ data: { expressions: [], relations: [] } }]);
		}
	};

	handlePostMultipleEpisodesError = err => {
		this.postEpisodeErrors.push(err);
	};

	finishIntegrating = () => {
		this.setState({ isIntegrating: false });
		// console.log(
		// 	"================Errors===========",
		// 	this.postEpisodeErrors
		// );
		if (this.postEpisodeErrors.length > 0) {
			const errorMessage = this.postEpisodeErrors.map(err => {
				if (err.response && err.response.data) {
					return (
						JSON.stringify(err.response.data.message) +
						": " +
						JSON.stringify(err.response.data.more_info) +
						"\n"
					);
				} else {
					return err.toString();
				}
			});
			this.setState({
				showNotification: true,
				notiType: "danger",
				notiMessageHeader: "Completed with errors",
				notiMessageBody: errorMessage
			});
		} else {
			this.setState({
				showNotification: true,
				notiType: "success",
				notiMessageHeader: "Completed.",
				notiMessageBody:
					"Successfully integrated for database ID " +
					this.state.selectedDatabaseId
			});
		}
	};

	validateCsv = rows => {
		if (rows && rows instanceof Array) {
			const minRows = 3;
			if (rows.length < minRows) {
				const error = "Invalid CSV format. Rows less than " + minRows;
				throw new Error(error);
			}
		} else {
			const error = "Invalid CSV format.";
			throw new Error(error);
		}
	};

	extractTag = (modelId, content) => {
		return axiosTextAnalyzer.post(
			`/tag-extract-models/${modelId}/extract`,
			{
				content
			}
		);
	};

	getIncrementedCounterForTagTempId = () => {
		this.counterForTagTempId++;
		return this.counterForTagTempId;
	};
	showDatabaseCreationModal = () => {
		this.setState({ showDatabaseCreationModal: true });
	};
	handleCloseDatabaseCreationModal = () => {
		this.setState({ showDatabaseCreationModal: false });
	};
	handleSubmitDatabaseCreationModal = data => {
		this.createDatabase(data.name, data.description)
			.then(res => {
				if (res && res.status === 201) {
					const currentDatabases = Object.assign(
						[],
						this.state.databases
					);
					currentDatabases.push(res.data.database);
					this.setState({
						databases: currentDatabases,
						selectedDatabaseId: parseInt(res.data.database.id, 10),
						showDatabaseCreationModal: false,
						createDatabase: false,
						notiType: "success",
						notiMessageHeader: "Database created",
						notiMessageBody:
							"Success create database with ID " +
							res.data.database.id,
						showNotification: true
					});
				}
			})
			.catch(err => {
				console.log("exception appear!", err.response);
				this.setState({ notiType: "danger" });
				this.setState({ showNotification: true });
				if (
					err.response === undefined ||
					err.response.data === undefined
				) {
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
				this.setState({
					creatingDatabase: false,
					showDatabaseCreationModal: false
				});
			});
	};

	renderDatabaseOptions = () => {
		if (this.state.databases instanceof Array) {
			return this.state.databases.map(db => {
				return (
					<option key={db.id} value={db.id}>
						{db.id}
					</option>
				);
			});
		}
	};

	popUpDeleteDatabase = () => {
		this.setState({ deleteModelShow: true });
	}

	handleDeleteModalClose = () => {
		this.setState({ deleteModelShow: false });
	}

	deleteDatabase = () => {
		this.setState({ deleteModelShow: false });
		this.deleteDatabaseRequest(this.state.selectedDatabaseId)
			.then(delRequest => {
				let deletedDatabase = this.state.selectedDatabaseId;
				const currentDatabases = Object.assign(
					[],
					this.state.databases
				);
				console.log('currentDatabases: ', currentDatabases);
				let indexOfDeletedDatabase = currentDatabases.findIndex(item => parseInt(item.id, 10) === this.state.selectedDatabaseId);
				if (indexOfDeletedDatabase !== -1) {
					currentDatabases.splice(indexOfDeletedDatabase, 1);
				}
				if (currentDatabases.length === 0) {
					this.setState({ selectedDatabaseId: 0 }); 
				} else {
					this.setState({ selectedDatabaseId: parseInt(currentDatabases[0].id, 10) });
				}
				this.setState({
					databases: currentDatabases,
					notiType: "success",
					notiMessageHeader: "Database deleted",
					notiMessageBody:
						"Success deleted database with ID " +
						deletedDatabase,
					showNotification: true
				});
			}).catch(err => {
				console.log("exception appear!", err.response);
				this.setState({ notiType: "danger" });
				this.setState({ showNotification: true });
				if (err.response === undefined || err.response.data === undefined) {
					this.setState({ notiMessageHeader: err + "" });
					this.setState({ notiMessageBody: "" });
				} else {
					this.setState({ notiMessageHeader: err.response.data.message });
					this.setState({ notiMessageBody: err.response.data.more_info });
				}
				this.setState({
					creatingDatabase: false,
					showDatabaseCreationModal: false
				});
			});
	}

	deleteDatabaseRequest = (databaseId) => {
		return axiosEpisodeManager.delete(`/databases/${databaseId}`);
	}

	render() {
		return (
			<div id="integratingPage">
				<p className="Title">Integrating Page</p>
				<Row className="d-flex justify-content-md-center">
					<Col md="6" id="integratingContainer">
						<Row>
							<Col md="12">
								<Notification
									notiType={this.state.notiType}
									show={this.state.showNotification}
									notiMessageHeader={this.state.notiMessageHeader}
									notiMessageBody={this.state.notiMessageBody}
									handleHide={this.handleHide}
								/>
							</Col>
						</Row>
						<Row className="justify-content-md-left">
							<Col md="2" className="d-flex align-items-md-center">Database ID:</Col>
							<Col md="4">
								<Form.Group
									controlId="list-dbIds"
									className="mb-0"
								>
									<Form.Control
										as="select"
										value={this.state.selectedDatabaseId}
										onChange={this.selectDatabaseId}
									>
										{this.renderDatabaseOptions()}
									</Form.Control>
								</Form.Group>
							</Col>
							<Col md="1.5" >
								<Button
									className="add-subtract-button"
									onClick={this.showDatabaseCreationModal}
								>
									+
								</Button>
							</Col>
							<Col md="2" >
								<Button
									className="add-subtract-button"
									variant="danger"
									block
									onClick={this.popUpDeleteDatabase}
									disabled={!this.state.selectedDatabaseId}
								>
									-
								</Button>
							</Col>
						</Row>
						<Row>
							<Col md={{ span: 10, offset: 2 }}>
								<FileBrowser
									accept=".csv"
									onChange={this.selectFile}
									disabled={
										this.state.isIntegrating ||
										this.state.selectedDatabaseId === 0
									}
								/>
							</Col>
						</Row>
						<Row>
							<Col md={{ span: 3, offset: 9 }}>
								<Button
									className="learningButton"
									block
									type="submit"
									disabled={
										this.state.integrateButtonDisabled ||
										this.state.selectedDatabaseId === 0
									}
									onClick={this.startIntegrating}
								>
									Integrating
								</Button>
							</Col>
						</Row>
					</Col>
				</Row>
				<DatabaseCreationModal
					show={this.state.showDatabaseCreationModal}
					onClose={this.handleCloseDatabaseCreationModal}
					onSubmit={this.handleSubmitDatabaseCreationModal}
					disabled={this.state.creatingDatabase}
				/>
				<LoadingModal loadingShow={this.state.isIntegrating} />

				<Modal show={this.state.deleteModelShow} onHide={this.handleDeleteModalClose}>
					<Modal.Header closeButton>
						<Modal.Title>Delete Database has ID {this.state.selectedDatabaseId}</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						Are you sure?
                    </Modal.Body>
					<Modal.Footer>
						<Button variant="secondary" onClick={this.handleDeleteModalClose}> No </Button>
						<Button variant="primary" onClick={this.deleteDatabase}> Yes </Button>
					</Modal.Footer>
				</Modal>


				<LoadingModal loadingShow={this.state.loadingShowModal}></LoadingModal>
			</div>
		);
	}
}

export default KnowlegdeIntegratingPage;
