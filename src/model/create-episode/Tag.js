export default class Tag {
    constructor(tmpId = '', key = '', value = '', sourceTempId = '', sourceRange = '') {
        this.tmpid = tmpId;
        this.key = key;
        this.value = value;
        this.source_tmpid = sourceTempId;
        this.source_range = sourceRange;
    }
}