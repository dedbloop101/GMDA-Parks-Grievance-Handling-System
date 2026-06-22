from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import bcrypt
import os

app = Flask(__name__)
CORS(app) 
app.secret_key = os.urandom(24)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'gmda_portal.db') 

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  
    return conn

def init_db():
    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.cursor()
        cursor.execute('''CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            full_name TEXT NOT NULL, 
            mobile_number TEXT UNIQUE NOT NULL, 
            password BLOB NOT NULL, 
            role TEXT DEFAULT 'citizen'
        )''')
        cursor.execute('''CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            citizen_name TEXT NOT NULL,
            park_name TEXT NOT NULL,
            sector_id TEXT NOT NULL,
            category TEXT NOT NULL,
            sub_category TEXT,
            remarks TEXT,
            status TEXT DEFAULT 'Unresolved',
            priority TEXT DEFAULT 'Medium',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        conn.commit()
    finally:
        conn.close()

init_db()

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.json
    full_name = data.get('fullName')
    mobile_number = data.get('mobile')
    password = data.get('password')

    if not full_name or not mobile_number or not password:
        return jsonify({'status': 'error', 'message': 'All fields are required.'}), 400

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (full_name, mobile_number, password) VALUES (?, ?, ?)",
                       (full_name, mobile_number, hashed_password))
        conn.commit()
        
        # Grab the database ID of the newly created user
        new_user_id = cursor.lastrowid
        
        return jsonify({
            'status': 'success', 
            'message': 'Account created successfully.',
            'user': {
                'id': new_user_id,
                'fullName': full_name,
                'mobile': mobile_number
            }
        }), 201
    except sqlite3.IntegrityError:
        return jsonify({'status': 'error', 'message': 'Mobile number is already registered!'}), 409
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        conn.close() # 🔥 Guarantees the data is flushed to the file immediately

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    mobile_number = data.get('mobile')
    password = data.get('password')

    if not mobile_number or not password:
        return jsonify({'status': 'error', 'message': 'Mobile number and password are required.'}), 400

    conn = get_db_connection()
    try:
        user = conn.execute("SELECT * FROM users WHERE mobile_number = ?", (mobile_number,)).fetchone()
        if user and bcrypt.checkpw(password.encode('utf-8'), user['password']):
            return jsonify({
                'status': 'success', 
                'message': 'Login successful.',
                'user': {'id': user['id'], 'fullName': user['full_name'], 'mobile': user['mobile_number']}
            }), 200
        else:
            return jsonify({'status': 'error', 'message': 'Invalid mobile number or password.'}), 401
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/change-password', methods=['POST'])
def api_change_password():
    data = request.json
    mobile_number = data.get('mobile')
    old_password = data.get('oldPassword')
    new_password = data.get('newPassword')

    if not mobile_number or not old_password or not new_password:
        return jsonify({'status': 'error', 'message': 'All fields are required.'}), 400

    conn = get_db_connection()
    try:
        user = conn.execute("SELECT * FROM users WHERE mobile_number = ?", (mobile_number,)).fetchone()

        if user and bcrypt.checkpw(old_password.encode('utf-8'), user['password']):
            new_hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
            conn.execute("UPDATE users SET password = ? WHERE mobile_number = ?", (new_hashed, mobile_number))
            conn.commit()
            return jsonify({'status': 'success', 'message': 'Security credentials updated successfully.'}), 200
        else:
            return jsonify({'status': 'error', 'message': 'Incorrect current password.'}), 401
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/complaints', methods=['GET', 'POST'])
def api_complaints():
    conn = get_db_connection()
    try:
        if request.method == 'POST':
            data = request.json
            citizen_name = data.get('citizenName', 'Unknown Citizen')
            park_name = data.get('parkName')
            sector_id = data.get('sectorId')
            category = data.get('category')
            sub_category = data.get('subCategory', '')
            remarks = data.get('remarks', '')

            # Updated basic logic engine to auto-assign priority based on the hazard level
            priority = 'Medium'
            if category in ['Streetlights Not Working', 'Play Area Issues', 'Waterlogging', 'Stray Animal Menace']:
                priority = 'High'
            elif category in ['Damaged Benches', 'Broken Gym Equipment', 'Garbage Accumulation', 'Walking Track Issues', 'Public Amenities']:
                priority = 'Medium'
            else:
                # "Other" and "Overgrown Vegetation" will safely fall into Low Priority here
                priority = 'Low'

            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO complaints 
                (citizen_name, park_name, sector_id, category, sub_category, remarks, priority) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (citizen_name, park_name, sector_id, category, sub_category, remarks, priority))
            conn.commit()
            return jsonify({'status': 'success', 'message': 'Grievance officially logged in the system.'}), 201

        elif request.method == 'GET':
            db_complaints = conn.execute("SELECT * FROM complaints ORDER BY timestamp ASC").fetchall()
            
            resolved_count = conn.execute("SELECT COUNT(*) FROM complaints WHERE status = 'Resolved'").fetchone()[0]
            active_count = conn.execute("SELECT COUNT(*) FROM complaints WHERE status != 'Resolved'").fetchone()[0]
            
            active_staff = 4 + (active_count // 2)
            
            complaints_list = []
            for row in db_complaints:
                complaints_list.append({
                    'id': f"{row['id']:03d}",
                    'parkName': row['park_name'],
                    'sector': row['sector_id'],
                    'issue': f"{row['category']}: {row['sub_category']}" if row['sub_category'] else row['category'],
                    'priority': row['priority'],
                    'status': row['status'],
                    'remarks': row['remarks']
                })

            return jsonify({
                'status': 'success',
                'kpis': {
                    'resolvedIssues': resolved_count,
                    'pendingGrievances': active_count,
                    'activeFieldStaff': active_staff
                },
                'complaints': complaints_list
            }), 200
            
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=8000)