import Config from '../../config/appConfig';

export default class ParsedCsv {
    constructor(headers = [], meta = [], content = []) {
        this._headers = headers;
        this._meta = meta;
        this._content = content;
        this._contextColumnIndexes = [];
        this._modelIdColumnIndexes = [];
        this._tagTypeOneColumnIndexes = [];
        this._extractMeta(meta);
    }
    get headers() {
        return this._headers;
    }
    set headers(headers) {
        this._headers = headers;
    }
    get meta() {
        return this._meta;
    }
    set meta(meta) {
        this._meta = meta;
        this._extractMeta(meta);
    }
    get content() {
        return this._content;
    }
    set content(content) {
        this._content = content;
    }
    get contextColumnIndexes() {
        return this._contextColumnIndexes;
    }
    get tagTypeOneColumnIndexes() {
        return this._tagTypeOneColumnIndexes;
    }
    get modelIdColumnIndexes() {
        return this._modelIdColumnIndexes;
    }

    _extractMeta(meta) {
        for (var i = 0; i < meta.length; i++) {
            const currentField = meta[i];
            if (currentField.toLowerCase() === Config.CSV_META_LABEL_TAG) {
                this.tagTypeOneColumnIndexes.push(i);
            }
            if (currentField.toLowerCase() === Config.CSV_META_LABEL_CONTEXT) {
                this.contextColumnIndexes.push(i);
            }
            if (!isNaN(currentField) && currentField.trim() !== "") {
                this.modelIdColumnIndexes.push(i);
            }
        }
    }

}
