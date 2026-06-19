const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

const db = new sqlite3.Database("./lost_found.db", (err) => {
  if (err) {
    console.error("Database error:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

db.run(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    found_date TEXT NOT NULL,
    description TEXT,
    keywords TEXT,
    image_path TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.get("/", (req, res) => {
  res.send("Campus Lost and Found API is running");
});

// Public board: only show available items
app.get("/api/items", (req, res) => {
  db.all(
    "SELECT * FROM items WHERE status = 'available' ORDER BY id DESC",
    [],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json(rows);
    }
  );
});

// Admin: show all items
app.get("/api/admin/items", (req, res) => {
  db.all("SELECT * FROM items ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    res.json(rows);
  });
});

// Student submit item
app.post("/api/items", upload.single("image"), (req, res) => {
  const { name, location, found_date, description } = req.body;

  const image_path = req.file ? `/uploads/${req.file.filename}` : "";

  db.run(
    `
    INSERT INTO items
    (name, location, found_date, description, keywords, image_path, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      name,
      location,
      found_date,
      description,
      "",
      image_path,
      "pending"
    ],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({
        message: "Item submitted successfully",
        id: this.lastID
      });
    }
  );
});

// Admin edit item
app.put("/api/items/:id", (req, res) => {
  const {
    name,
    location,
    found_date,
    description,
    keywords,
    status
  } = req.body;

  db.run(
    `
    UPDATE items
    SET name = ?, location = ?, found_date = ?,
        description = ?, keywords = ?, status = ?
    WHERE id = ?
    `,
    [
      name,
      location,
      found_date,
      description,
      keywords,
      status,
      req.params.id
    ],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({ message: "Item updated successfully" });
    }
  );
});

// Admin approve item
app.put("/api/items/:id/approve", (req, res) => {
  db.run(
    "UPDATE items SET status = ? WHERE id = ?",
    ["available", req.params.id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({ message: "Item approved successfully" });
    }
  );
});

// Admin mark item as returned
app.put("/api/items/:id/returned", (req, res) => {
  db.run(
    "UPDATE items SET status = ? WHERE id = ?",
    ["returned", req.params.id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({ message: "Item marked as returned" });
    }
  );
});

// Admin delete item
app.delete("/api/items/:id", (req, res) => {
  db.run("DELETE FROM items WHERE id = ?", [req.params.id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    res.json({ message: "Item deleted successfully" });
  });
});

// Serve Vue build
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
