export default class Source {
    constructor(tmpId = '', name = '', description = '', date = '', contentId = '', contentType = '') {
        this.tmpid = tmpId;
        this.name = name;
        this.description = description;
        this.date = date;
        this.content_id = contentId;
        this.content_type = contentType;
    }
}