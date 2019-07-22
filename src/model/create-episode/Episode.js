export default class Episode {
    constructor(name = '', description = '', date = '', sources = [], tags = [], relations = [], context = {}) {
        this.name = name;
        this.description = description;
        this.sources = sources;
        this.tags = tags;
        this.relations = relations;
        this.context = context;
    }
}
