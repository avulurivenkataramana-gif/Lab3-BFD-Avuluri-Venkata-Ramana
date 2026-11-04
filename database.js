
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database.db", (err) => {
    if (err) {
        console.log("Database Connection Failed:", err.message);
    } else {
        console.log("Database Connected Successfully");
    }
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS book (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            price REAL NOT NULL
        )
    `, (err) => {
        if (err) {
            console.log("Table Creation Failed:", err.message);
        } else {
            console.log("Book Table Created Successfully");
        }
    });
});

module.exports = db;
