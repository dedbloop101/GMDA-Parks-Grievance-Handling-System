from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import bcrypt
import os
import random
import smtplib
from email.mime.text import MIMEText # 🔥 NEW: Email crafting library

app = Flask(__name__)
CORS(app) 
app.secret_key = os.urandom(24)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'gmda_portal.db') 

OTP_STORE = {}

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
            mobile_number TEXT UNIQUE, 
            email TEXT UNIQUE,
            password BLOB, 
            role TEXT DEFAULT 'citizen'
        )''')
        
        admin_pass = bcrypt.hashpw('admin1234'.encode('utf-8'), bcrypt.gensalt())
        cursor.execute('''
        INSERT OR IGNORE INTO users (full_name, mobile_number, password, role)
        VALUES (?, ?, ?, ?)
        ''', ('System Admin', '0000000000', admin_pass, 'admin'))
        
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

# ==========================================
# 🔥 LIVE SMTP EMAIL ENGINE
# ==========================================
@app.route('/api/send-otp', methods=['POST'])
def send_otp():
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({'status': 'error', 'message': 'Email is required.'}), 400
        
    otp = str(random.randint(100000, 999999))
    OTP_STORE[email] = otp
    
    SENDER_EMAIL = os.environ.get('GMDA_SMTP_EMAIL', 'parks.gmda@gmail.com')
    SENDER_PASSWORD = os.environ.get('GMDA_SMTP_PASSWORD', 'uzeywjzznratnlzf')

    if not SENDER_PASSWORD:
        return jsonify({'status': 'error', 'message': 'Email service is not configured on the server.'}), 503
    
    try:
        # Build the payload
        msg = MIMEText(f"Hello,\n\nYour secure GMDA Portal verification code is: {otp}\n\nDo not share this code with anyone. It will expire shortly.\n\n- System Admin")
        msg['Subject'] = 'GMDA Portal - Security OTP'
        msg['From'] = SENDER_EMAIL
        msg['To'] = email

        # Establish a secure SSL connection to Google's servers
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
            
        print(f"✅ SUCCESS: Live OTP dispatched to {email}")
        return jsonify({'status': 'success', 'message': 'OTP sent successfully!'})
        
    except Exception as e:
        print(f"❌ CRITICAL FAILURE sending email to {email}: {e}")
        return jsonify({'status': 'error', 'message': 'Failed to send OTP via email. Check backend terminal.'}), 500

@app.route('/api/verify-login-otp', methods=['POST'])
def verify_login_otp():
    data = request.json
    email = data.get('email')
    otp = data.get('otp')
    
    if OTP_STORE.get(email) != otp:
        return jsonify({'status': 'error', 'message': 'Invalid or expired OTP.'}), 401
        
    with get_db_connection() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        
    if user:
        del OTP_STORE[email] 
        return jsonify({
            'status': 'success', 
            'user': {'id': user['id'], 'fullName': user['full_name'], 'mobile': user['mobile_number'], 'email': user['email'], 'role': user['role']}
        }), 200
    else:
        return jsonify({'status': 'error', 'message': 'Account not found. Please register first.'}), 404

@app.route('/api/verify-register-otp', methods=['POST'])
def verify_register_otp():
    data = request.json
    full_name = data.get('fullName')
    email = data.get('email')
    otp = data.get('otp')
    
    if OTP_STORE.get(email) != otp:
        return jsonify({'status': 'error', 'message': 'Invalid or expired OTP.'}), 401
        
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO users (full_name, email) VALUES (?, ?)", (full_name, email))
            conn.commit()
            new_user_id = cursor.lastrowid
            
        del OTP_STORE[email]
        return jsonify({
            'status': 'success', 
            'user': {'id': new_user_id, 'fullName': full_name, 'mobile': None, 'email': email, 'role': 'citizen'}
        }), 201
    except sqlite3.IntegrityError:
        return jsonify({'status': 'error', 'message': 'Email is already registered!'}), 409

# ==========================================
# STANDARD MOBILE ROUTES
# ==========================================
@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.json
    full_name = data.get('fullName')
    mobile_number = data.get('mobile')
    password = data.get('password')

    if not full_name or not mobile_number or not password:
        return jsonify({'status': 'error', 'message': 'All fields are required.'}), 400

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO users (full_name, mobile_number, password) VALUES (?, ?, ?)",
                           (full_name, mobile_number, hashed_password))
            conn.commit()
            return jsonify({
                'status': 'success', 
                'user': {'id': cursor.lastrowid, 'fullName': full_name, 'mobile': mobile_number, 'email': None, 'role': 'citizen'}
            }), 201
    except sqlite3.IntegrityError:
        return jsonify({'status': 'error', 'message': 'Mobile number is already registered!'}), 409

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    mobile_number = data.get('mobile')
    password = data.get('password')

    with get_db_connection() as conn:
        user = conn.execute("SELECT * FROM users WHERE mobile_number = ?", (mobile_number,)).fetchone()
        
        if user and user['password']:
            stored_password = user['password']
            if isinstance(stored_password, str):
                stored_password = stored_password.encode('utf-8')
                
            if bcrypt.checkpw(password.encode('utf-8'), stored_password):
                return jsonify({
                    'status': 'success', 
                    'user': {'id': user['id'], 'fullName': user['full_name'], 'mobile': user['mobile_number'], 'email': user['email'], 'role': user['role']}
                }), 200
            
    return jsonify({'status': 'error', 'message': 'Invalid mobile number or password.'}), 401

@app.route('/api/change-password', methods=['POST'])
def api_change_password():
    data = request.json
    mobile_number = data.get('mobile')
    old_password = data.get('oldPassword')
    new_password = data.get('newPassword')

    with get_db_connection() as conn:
        user = conn.execute("SELECT * FROM users WHERE mobile_number = ?", (mobile_number,)).fetchone()
        if user and user['password']:
            stored_password = user['password']
            if isinstance(stored_password, str):
                stored_password = stored_password.encode('utf-8')

            if bcrypt.checkpw(old_password.encode('utf-8'), stored_password):
                new_hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
                conn.execute("UPDATE users SET password = ? WHERE mobile_number = ?", (new_hashed, mobile_number))
                conn.commit()
                return jsonify({'status': 'success', 'message': 'Security credentials updated successfully.'}), 200
                
    return jsonify({'status': 'error', 'message': 'Verification failed.'}), 401

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

            priority = 'Medium'
            if category in ['Streetlights Not Working', 'Play Area Issues', 'Waterlogging', 'Stray Animal Danger']:
                priority = 'High'
            elif category in ['Damaged Benches', 'Broken Gym Equipment', 'Garbage Accumulation', 'Walking Track Issues', 'Public Amenities']:
                priority = 'Medium'
            else:
                priority = 'Low'

            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO complaints 
                (citizen_name, park_name, sector_id, category, sub_category, remarks, priority) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (citizen_name, park_name, sector_id, category, sub_category, remarks, priority))
            conn.commit()
            return jsonify({'status': 'success'}), 201

        elif request.method == 'GET':
            citizen_name = request.args.get('citizenName')

            if citizen_name:
                db_complaints = conn.execute("SELECT * FROM complaints WHERE citizen_name = ? ORDER BY timestamp ASC", (citizen_name,)).fetchall()
                resolved_count = conn.execute("SELECT COUNT(*) FROM complaints WHERE status = 'Resolved' AND citizen_name = ?", (citizen_name,)).fetchone()[0]
                active_count = conn.execute("SELECT COUNT(*) FROM complaints WHERE status != 'Resolved' AND citizen_name = ?", (citizen_name,)).fetchone()[0]
            else:
                db_complaints = conn.execute("SELECT * FROM complaints ORDER BY timestamp DESC").fetchall()
                resolved_count = conn.execute("SELECT COUNT(*) FROM complaints WHERE status = 'Resolved'").fetchone()[0]
                active_count = conn.execute("SELECT COUNT(*) FROM complaints WHERE status != 'Resolved'").fetchone()[0]
            
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
                'kpis': {'resolvedIssues': resolved_count, 'pendingGrievances': active_count, 'activeFieldStaff': 4 + (active_count // 2)},
                'complaints': complaints_list
            }), 200
            
    finally:
        conn.close()
        
@app.route('/api/complaints/update', methods=['POST'])
def update_complaint_status():
    data = request.json
    raw_id = int(str(data.get('id')).replace('GMDA-', ''))
    with get_db_connection() as conn:
        conn.execute("UPDATE complaints SET status = ?, remarks = ? WHERE id = ?", (data.get('status'), data.get('adminNotes', ''), raw_id))
        conn.commit()
    return jsonify({'status': 'success'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=8000)