const fs = require('fs');
const path = require('path');

module.exports.db = {
	_db: null,
	_pathFile: path.join(__dirname, 'db.json'),
	load() {
		this._db = JSON.parse(fs.readFileSync(this._pathFile));
	},

	get() {
		if (!this._db)
			this.load();
		return this._db;
	},
	save() {
		fs.writeFileSync(this._pathFile, JSON.stringify(this._db));
	}
}