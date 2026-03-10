import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

DB_FILE = "geo_data.db"


def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS geo_download_info (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gse_id TEXT NOT NULL,
            gsm_id TEXT NOT NULL,
            sample_name TEXT,
            supplementary_http_series TEXT,
            supplementary_http_sample TEXT,
            raw_srr TEXT,
            reads_per_spot TEXT
        )
    """
    )
    conn.commit()
    conn.close()


@app.route("/api/save", methods=["POST"])
def save_data():
    try:
        data = request.json
        if not data or not isinstance(data, list):
            return jsonify({"error": "Invalid data format, expected JSON array"}), 400

        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()

        inserted_count = 0
        for item in data:
            gse_id = item.get("gse_id", "")
            gsm_id = item.get("gsm_id", "")
            sample_name = item.get("sample_name", "")
            supplementary_http_series = item.get("supplementaryHttpSeries") or ""
            supplementary_http_sample = item.get("supplementaryHttpSample") or ""
            raw_srr = item.get("rawSrr") or ""
            reads_per_spot = item.get("readsPerSpot") or ""

            if gse_id and gsm_id:
                c.execute(
                    "SELECT id FROM geo_download_info WHERE gse_id = ? AND gsm_id = ?",
                    (gse_id, gsm_id),
                )
                if not c.fetchone():
                    c.execute(
                        """INSERT INTO geo_download_info
                           (gse_id, gsm_id, sample_name, supplementary_http_series,
                            supplementary_http_sample, raw_srr, reads_per_spot)
                           VALUES (?, ?, ?, ?, ?, ?, ?)""",
                        (
                            gse_id,
                            gsm_id,
                            sample_name,
                            supplementary_http_series,
                            supplementary_http_sample,
                            raw_srr,
                            reads_per_spot,
                        ),
                    )
                    inserted_count += 1

        conn.commit()
        conn.close()

        return jsonify({"status": "success", "inserted": inserted_count})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/search", methods=["GET"])
def search_data():
    query = request.args.get("q", "")
    try:
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        if query:
            c.execute(
                """
                SELECT * FROM geo_download_info
                WHERE gse_id LIKE ? OR gsm_id LIKE ? OR sample_name LIKE ?
            """,
                (f"%{query}%", f"%{query}%", f"%{query}%"),
            )
        else:
            c.execute("SELECT * FROM geo_download_info ORDER BY id DESC LIMIT 50")

        rows = c.fetchall()
        conn.close()

        results = [dict(row) for row in rows]
        return jsonify({"status": "success", "data": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    init_db()
    print("Starting GEO SQLite Server on port 5000...")
    app.run(host="127.0.0.1", port=5000)
