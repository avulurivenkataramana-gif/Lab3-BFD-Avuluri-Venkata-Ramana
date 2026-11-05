
const express = require("express");
const db = require("./database");

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper function for database queries
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({
                lastID: this.lastID,
                changes: this.changes
            });
        });
    });
}

// 1. GET all books with search, sorting and filters
app.get("/books", async (req, res) => {
    try {
        const {
            search_q = "",
            order_by = "title",
            order = "ASC",
            limit = "10",
            offset = "0",
            min_price,
            max_price
        } = req.query;

        const allowedColumns = ["id", "title", "author", "price"];

        if (!allowedColumns.includes(order_by)) {
            return res.status(400).json({
                message: "Invalid order_by parameter"
            });
        }

        if (!["ASC", "DESC"].includes(order.toUpperCase())) {
            return res.status(400).json({
                message: "Order must be ASC or DESC"
            });
        }

        const pageLimit = Number(limit);
        const pageOffset = Number(offset);

        if (!Number.isInteger(pageLimit) || pageLimit < 1 ||
            !Number.isInteger(pageOffset) || pageOffset < 0) {
            return res.status(400).json({
                message: "Invalid limit or offset"
            });
        }

        if (min_price !== undefined &&
    (typeof min_price !== "string" ||
    min_price.trim() === "" ||
    !Number.isFinite(Number(min_price)))) {
    return res.status(400).json({
        message: "Invalid min_price"
    });
}

if (max_price !== undefined &&
    (typeof max_price !== "string" ||
    max_price.trim() === "" ||
    !Number.isFinite(Number(max_price)))) {
    return res.status(400).json({
        message: "Invalid max_price"
    });
}

if (min_price !== undefined && max_price !== undefined &&
    Number(min_price) > Number(max_price)) {
    return res.status(400).json({
        message: "min_price cannot be greater than max_price"
    });

        }

        let sql = "SELECT * FROM book WHERE title LIKE ?";
        let params = [`%${search_q}%`];

        if (min_price !== undefined) {
            sql += " AND price >= ?";
            params.push(Number(min_price));
        }

        if (max_price !== undefined) {
            sql += " AND price <= ?";
            params.push(Number(max_price));
        }

        sql += ` ORDER BY ${order_by} ${order.toUpperCase()} LIMIT ? OFFSET ?`;

        params.push(pageLimit, pageOffset);

        db.all(sql, params, (err, rows) => {
            if (err) {
                return res.status(500).json({
                    message: "Failed to retrieve books"
                });
            }

            res.status(200).json({
                message: "Books retrieved successfully",
                count: rows.length,
                books: rows
            });
        });

    } catch (error) {
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// 2. POST - Add a new book
app.post("/books", async (req, res) => {
    try {
        const { title, author, price } = req.body;

        if (typeof title !== "string" || !title.trim() ||
            typeof author !== "string" || !author.trim() ||
            typeof price !== "number" || !Number.isFinite(price) ||
            price < 0) {
            return res.status(400).json({
                message: "Valid title, author and numeric price are required"
            });
        }

        const result = await runQuery(
            "INSERT INTO book (title, author, price) VALUES (?, ?, ?)",
            [title.trim(), author.trim(), price]
        );

        res.status(201).json({
            message: "Book created successfully",
            id: result.lastID
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to create book"
        });
    }
});

// 3. PUT - Update a book
app.put("/books/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { title, author, price } = req.body;

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                message: "Invalid book ID"
            });
        }

        if (typeof title !== "string" || !title.trim() ||
            typeof author !== "string" || !author.trim() ||
            typeof price !== "number" || !Number.isFinite(price) ||
            price < 0) {
            return res.status(400).json({
                message: "Valid title, author and numeric price are required"
            });
        }

        const result = await runQuery(
            "UPDATE book SET title = ?, author = ?, price = ? WHERE id = ?",
            [title.trim(), author.trim(), price, id]
        );

        if (result.changes === 0) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        res.status(200).json({
            message: "Book updated successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to update book"
        });
    }
});

// 4. DELETE - Delete a book
app.delete("/books/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                message: "Invalid book ID"
            });
        }

        const result = await runQuery(
            "DELETE FROM book WHERE id = ?",
            [id]
        );

        if (result.changes === 0) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        res.status(200).json({
            message: "Book deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to delete book"
        });
    }
});

// Handle invalid JSON
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400) {
        return res.status(400).json({
            message: "Invalid JSON request body"
        });
    }

    res.status(500).json({
        message: "Internal server error"
    });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});