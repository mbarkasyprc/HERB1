-- Create the entries table for herb payment and pickup tracking
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('phyto', 'tcm', 'access')),
  status TEXT NOT NULL CHECK (status IN ('unpaid', 'paid', 'returned')),
  method TEXT NOT NULL CHECK (method IN ('pickup', 'shipping')),
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on category for faster queries
CREATE INDEX IF NOT EXISTS idx_entries_category ON entries(category);

-- Create an index on date for faster sorting
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date); 