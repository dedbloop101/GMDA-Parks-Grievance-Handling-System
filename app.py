from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import bcrypt
import os
import random
import smtplib
from email.mime.text import MIMEText 
from werkzeug.utils import secure_filename
from flask import send_from_directory
import jwt
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__)
CORS(app) 
app.config['SECRET_KEY'] = 'gmda_super_secret_key_2026'

DB_URI = "postgresql://postgres:Chirag@localhost:5432/gmda_parks"

OTP_STORE = {}

def get_db_connection():

    conn = psycopg2.connect(DB_URI, cursor_factory=RealDictCursor)
    return conn

# Security Lock (JWT)
def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(" ")[1]
            
        if not token:
            return jsonify({'message': 'Token missing! Examiner route bypass fail.'}), 401
            
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            if data.get('role') != 'admin':
                return jsonify({'message': 'Admin privileges required!'}), 403
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired, please login again.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401
            
        return f(*args, **kwargs)
    return decorated

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/static/uploads/<filename>')
def serve_uploaded_image(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({"message": "No image file provided"}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({"message": "Empty file provided"}), 400
    if file:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        image_url = f"http://127.0.0.1:8000/static/uploads/{filename}"
        return jsonify({"message": "Upload successful", "imageUrl": image_url}), 200
    
@app.route('/api/complaints/update', methods=['POST'])
@admin_required
def update_complaint_status():
    data = request.json
    raw_id = str(data.get('id')).replace('GMDA-', '')
    new_status = data.get('status')
    admin_notes = data.get('adminNotes')
    after_image_url = data.get('afterImageUrl') 

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE complaints 
            SET status = %s, remarks = %s
            WHERE id = %s
        ''', (new_status, admin_notes, raw_id))
        
        if after_image_url:
            cursor.execute('''
                UPDATE complaints 
                SET after_image = %s
                WHERE id = %s
            ''', (after_image_url, raw_id))
            
        conn.commit()
        conn.close()
        return jsonify({"message": "Status updated successfully"}), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@app.route('/api/send-otp', methods=['POST'])
def send_otp():
    data = request.json
    email = data.get('email')
    if not email: return jsonify({'status': 'error', 'message': 'Email is required.'}), 400
        
    otp = str(random.randint(100000, 999999))
    OTP_STORE[email] = otp
    SENDER_EMAIL = os.environ.get('GMDA_SMTP_EMAIL', 'parks.gmda@gmail.com')
    SENDER_PASSWORD = os.environ.get('GMDA_SMTP_PASSWORD', 'uzeywjzznratnlzf')

    if not SENDER_PASSWORD: return jsonify({'status': 'error', 'message': 'Email service is not configured on the server.'}), 503
    try:
        msg = MIMEText(f"Hello,\n\nYour secure GMDA Portal verification code is: {otp}\n\nDo not share this code with anyone. It will expire shortly.\n\n- System Admin")
        msg['Subject'] = 'GMDA Portal - Security OTP'
        msg['From'] = SENDER_EMAIL
        msg['To'] = email

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
        return jsonify({'status': 'success', 'message': 'OTP sent successfully!'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': 'Failed to send OTP via email.'}), 500

def generate_token(user_id, role):
    return jwt.encode({'user_id': user_id, 'role': role, 'exp': datetime.utcnow() + timedelta(hours=24)}, app.config['SECRET_KEY'], algorithm="HS256")

@app.route('/api/verify-login-otp', methods=['POST'])
def verify_login_otp():
    data = request.json
    email = data.get('email')
    otp = data.get('otp')
    
    if OTP_STORE.get(email) != otp: return jsonify({'status': 'error', 'message': 'Invalid or expired OTP.'}), 401
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    conn.close()
        
    if user:
        del OTP_STORE[email] 
        token = generate_token(user['id'], user['role'])
        return jsonify({
            'status': 'success', 
            'token': token,
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
    
    if OTP_STORE.get(email) != otp: return jsonify({'status': 'error', 'message': 'Invalid or expired OTP.'}), 401
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (full_name, email) VALUES (%s, %s) RETURNING id", (full_name, email))
        new_user_id = cursor.fetchone()['id']
        conn.commit()
        conn.close()
        del OTP_STORE[email]
        token = generate_token(new_user_id, 'citizen')
        return jsonify({
            'status': 'success', 
            'token': token,
            'user': {'id': new_user_id, 'fullName': full_name, 'mobile': None, 'email': email, 'role': 'citizen'}
        }), 201
    except psycopg2.IntegrityError:
        return jsonify({'status': 'error', 'message': 'Email is already registered!'}), 409

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.json
    full_name = data.get('fullName')
    mobile_number = data.get('mobile')
    password = data.get('password')

    if not full_name or not mobile_number or not password: return jsonify({'status': 'error', 'message': 'All fields are required.'}), 400
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (full_name, mobile_number, password) VALUES (%s, %s, %s) RETURNING id",
                       (full_name, mobile_number, hashed_password))
        new_user_id = cursor.fetchone()['id']
        conn.commit()
        conn.close()
        token = generate_token(new_user_id, 'citizen')
        return jsonify({
            'status': 'success', 'token': token,
            'user': {'id': new_user_id, 'fullName': full_name, 'mobile': mobile_number, 'email': None, 'role': 'citizen'}
        }), 201
    except psycopg2.IntegrityError:
        return jsonify({'status': 'error', 'message': 'Mobile number is already registered!'}), 409

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    mobile_number = data.get('mobile')
    password = data.get('password')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE mobile_number = %s", (mobile_number,))
    user = cursor.fetchone()
    conn.close()
        
    if user and user['password']:
        stored_password = user['password']
        if isinstance(stored_password, str):
            stored_password = stored_password.encode('utf-8')
            
        if bcrypt.checkpw(password.encode('utf-8'), stored_password):
            token = generate_token(user['id'], user['role'])
            return jsonify({
                'status': 'success', 'token': token,
                'user': {'id': user['id'], 'fullName': user['full_name'], 'mobile': user['mobile_number'], 'email': user['email'], 'role': user['role']}
            }), 200
            
    return jsonify({'status': 'error', 'message': 'Invalid mobile number or password.'}), 401

@app.route('/api/change-password', methods=['POST'])
def api_change_password():
    data = request.json
    mobile_number = data.get('mobile')
    old_password = data.get('oldPassword')
    new_password = data.get('newPassword')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE mobile_number = %s", (mobile_number,))
    user = cursor.fetchone()
    if user and user['password']:
        stored_password = user['password'].encode('utf-8') if isinstance(user['password'], str) else user['password']
        if bcrypt.checkpw(old_password.encode('utf-8'), stored_password):
            new_hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            cursor.execute("UPDATE users SET password = %s WHERE mobile_number = %s", (new_hashed, mobile_number))
            conn.commit()
            conn.close()
            return jsonify({'status': 'success', 'message': 'Security credentials updated successfully.'}), 200
    conn.close()
    return jsonify({'status': 'error', 'message': 'Verification failed.'}), 401

@app.route('/api/complaints', methods=['GET', 'POST'])
def api_complaints():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if request.method == 'POST':
            data = request.json
            citizen_name = data.get('citizenName', 'Unknown Citizen')
            park_name = data.get('parkName')
            sector_id = data.get('sectorId')
            category = data.get('category')
            sub_category = data.get('subCategory', '')
            remarks = data.get('remarks', '')
            before_image = data.get('beforeImageUrl')

            priority = 'Medium'
            if category in ['Streetlights Not Working', 'Play Area Issues', 'Waterlogging', 'Stray Animal Danger']:
                priority = 'High'
            elif category in ['Damaged Benches', 'Broken Gym Equipment', 'Garbage Accumulation', 'Walking Track Issues', 'Public Amenities']:
                priority = 'Medium'
            else: priority = 'Low'

            cursor.execute("""
                INSERT INTO complaints 
                (citizen_name, park_name, sector_id, category, sub_category, remarks, priority, before_image) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (citizen_name, park_name, sector_id, category, sub_category, remarks, priority, before_image))
            conn.commit()
            return jsonify({'status': 'success'}), 201

        elif request.method == 'GET':
            citizen_name = request.args.get('citizenName')

            if citizen_name:
                cursor.execute("SELECT * FROM complaints WHERE citizen_name = %s ORDER BY timestamp ASC", (citizen_name,))
                db_complaints = cursor.fetchall()
                cursor.execute("SELECT COUNT(*) as count FROM complaints WHERE status = 'Resolved' AND citizen_name = %s", (citizen_name,))
                resolved_count = cursor.fetchone()['count']
                cursor.execute("SELECT COUNT(*) as count FROM complaints WHERE status != 'Resolved' AND citizen_name = %s", (citizen_name,))
                active_count = cursor.fetchone()['count']
            else:
                cursor.execute("SELECT * FROM complaints ORDER BY timestamp ASC")
                db_complaints = cursor.fetchall()
                cursor.execute("SELECT COUNT(*) as count FROM complaints WHERE status = 'Resolved'")
                resolved_count = cursor.fetchone()['count']
                cursor.execute("SELECT COUNT(*) as count FROM complaints WHERE status != 'Resolved'")
                active_count = cursor.fetchone()['count']
            
            complaints_list = []
            for row in db_complaints:
                complaints_list.append({
                    'id': f"{row['id']:03d}",
                    'parkName': row['park_name'],
                    'sector': row['sector_id'],
                    'issue': f"{row['category']}: {row['sub_category']}" if row['sub_category'] else row['category'],
                    'priority': row['priority'],
                    'status': row['status'],
                    'remarks': row['remarks'],
                    'beforeImageUrl': row.get('before_image'),
                    'afterImageUrl': row.get('after_image')
                })

            return jsonify({
                'status': 'success',
                'kpis': {'resolvedIssues': resolved_count, 'pendingGrievances': active_count, 'activeFieldStaff': 4 + (active_count // 2)},
                'complaints': complaints_list
            }), 200
            
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=8000)