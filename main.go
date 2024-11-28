package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	_ "github.com/mattn/go-sqlite3"
)

// DB is our global database connection
var db *sql.DB

// Item represents a rule, combat, condition, or homebrew item
type Item struct {
    ID       int64    `json:"id"`
    Title    string   `json:"title"`
    Contents string   `json:"contents"`
    Source   string   `json:"source"`
    Tags     []string `json:"tags"`
}

// initDB initializes the database
func initDB() error {
    var err error
    db, err = sql.Open("sqlite3", "./gamedata.db")
    if err != nil {
        return err
    }

    // Create tables if they don't exist
    createTablesSQL := `
    CREATE TABLE IF NOT EXISTS rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        contents TEXT NOT NULL,
        source TEXT NOT NULL,
        tags TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS combat (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        contents TEXT NOT NULL,
        source TEXT NOT NULL,
        tags TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS conditions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        contents TEXT NOT NULL,
        source TEXT NOT NULL,
        tags TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS homebrew (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        contents TEXT NOT NULL,
        source TEXT NOT NULL,
        tags TEXT NOT NULL
    );`

    _, err = db.Exec(createTablesSQL)
    return err
}

// handleCreateItem handles POST requests to create a new item
func handleCreateItem(w http.ResponseWriter, r *http.Request, category string) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var item Item
    if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Convert tags array to comma-separated string for storage
    tagsStr := strings.Join(item.Tags, ",")

    // Insert item into database
    result, err := db.Exec(
        "INSERT INTO "+category+" (title, contents, source, tags) VALUES (?, ?, ?, ?)",
        item.Title,
        item.Contents,
        item.Source,
        tagsStr,
    )
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Get the ID of the inserted item
    id, _ := result.LastInsertId()
    item.ID = id

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(item)
}

// handleGetItems handles GET requests to list items from a category
func handleGetItems(w http.ResponseWriter, r *http.Request, category string) {
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var query string

    if category == "all" {
        tables := []string{"rules", "combat", "conditions", "homebrew"} 
        query = "SELECT * FROM " + tables[0] + " "

        for _, table := range tables[1:] { // Tables start at 1
            query += "UNION ALL"
            query += " SELECT * FROM " + table + " "
        }
    fmt.Println(query)
    } else {
        // Query a specific category
        query = "SELECT * FROM " + category
    }

    rows, err := db.Query(query)
    fmt.Println(rows)

    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    var items []Item
    for rows.Next() {
        var item Item
        var tagsStr string
        err := rows.Scan(&item.ID, &item.Title, &item.Contents, &item.Source, &tagsStr)
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        // Convert comma-separated tags string back to array
        item.Tags = strings.Split(tagsStr, ",")
        items = append(items, item)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(items)
}

func main() {
    // Initialize database
    if err := initDB(); err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Static file server
    fs := http.FileServer(http.Dir("./static"))
    http.Handle("/", fs)

    // API endpoints for each category
    http.HandleFunc("/api/rules", func(w http.ResponseWriter, r *http.Request) {
        handleGetItems(w, r, "rules")
    })
    http.HandleFunc("/api/combat", func(w http.ResponseWriter, r *http.Request) {
        handleGetItems(w, r, "combat")
    })
    http.HandleFunc("/api/conditions", func(w http.ResponseWriter, r *http.Request) {
        handleGetItems(w, r, "conditions")
    })
    http.HandleFunc("/api/homebrew", func(w http.ResponseWriter, r *http.Request) {
        handleGetItems(w, r, "homebrew")
    })
    http.HandleFunc("/api/all", func(w http.ResponseWriter, r *http.Request) {
        handleGetItems(w, r, "all")
    })

    // Create endpoints
    http.HandleFunc("/api/rules/create", func(w http.ResponseWriter, r *http.Request) {
        handleCreateItem(w, r, "rules")
    })
    http.HandleFunc("/api/combat/create", func(w http.ResponseWriter, r *http.Request) {
        handleCreateItem(w, r, "combat")
    })
    http.HandleFunc("/api/conditions/create", func(w http.ResponseWriter, r *http.Request) {
        handleCreateItem(w, r, "conditions")
    })
    http.HandleFunc("/api/homebrew/create", func(w http.ResponseWriter, r *http.Request) {
        handleCreateItem(w, r, "homebrew")
    })

    log.Print("Server starting on :8000...")
    err := http.ListenAndServe(":8000", nil)
    if err != nil {
        log.Fatal(err)
    }
}
