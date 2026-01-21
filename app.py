from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)

def get_db():
    return sqlite3.connect("/data/shop.db")

# Create table
with get_db() as db:
    db.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        rack TEXT,
        row INTEGER,
        qty INTEGER,
        UNIQUE(name, rack, row)
    )
    """)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/products")
def get_products():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT name, rack, row, qty FROM products")
    return jsonify(cur.fetchall())

@app.route("/add", methods=["POST"])
def add_product():
    d = request.json
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "SELECT qty FROM products WHERE name=? AND rack=? AND row=?",
        (d["name"], d["rack"], d["row"])
    )
    old = cur.fetchone()
    if old:
        db.execute(
            "UPDATE products SET qty=? WHERE name=? AND rack=? AND row=?",
            (old[0]+d["qty"], d["name"], d["rack"], d["row"])
        )
    else:
        db.execute(
            "INSERT INTO products (name, rack, row, qty) VALUES (?, ?, ?, ?)",
            (d["name"], d["rack"], d["row"], d["qty"])
        )
    db.commit()
    return {"status":"saved"}

@app.route("/search/<name>")
def search(name):
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "SELECT name, rack, row, qty FROM products WHERE LOWER(name)=?",
        (name.lower(),)
    )
    rows = cur.fetchall()
    return jsonify(rows)

@app.route("/delete/<name>/<rack>/<int:row>", methods=["DELETE"])
def delete_product(name, rack, row):
    db = get_db()
    db.execute(
        "DELETE FROM products WHERE name=? AND rack=? AND row=?",
        (name, rack, row)
    )
    db.commit()
    return {"status":"deleted"}

@app.route("/update", methods=["POST"])
def update_product():
    d = request.json
    db = get_db()
    db.execute("""
        UPDATE products 
        SET rack=?, row=?, qty=?
        WHERE name=? AND rack=? AND row=?
    """,(d["newRack"], d["newRow"], d["newQty"],
         d["name"], d["oldRack"], d["oldRow"]))
    db.commit()
    return {"status":"updated"}

if __name__ == "__main__":
    app.run(debug=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
