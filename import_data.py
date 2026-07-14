import psycopg2
import json

DB_URI = "postgresql://postgres:Chirag@localhost:5432/gmda_parks"

def import_data():
    try:
        conn = psycopg2.connect(DB_URI)
        cursor = conn.cursor()

     
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY, 
            full_name VARCHAR(255) NOT NULL, 
            mobile_number VARCHAR(20) UNIQUE, 
            email VARCHAR(255) UNIQUE,
            password VARCHAR(255), 
            role VARCHAR(50) DEFAULT 'citizen'
        )''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS complaints (
            id SERIAL PRIMARY KEY,
            citizen_name VARCHAR(255) NOT NULL,
            park_name VARCHAR(255) NOT NULL,
            sector_id VARCHAR(100) NOT NULL,
            category VARCHAR(100) NOT NULL,
            sub_category VARCHAR(100),
            remarks TEXT,
            status VARCHAR(50) DEFAULT 'Unresolved',
            priority VARCHAR(50) DEFAULT 'Medium',
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            before_image TEXT,
            after_image TEXT
        )''')
        
        # 2. Users ka data JSON se utha ke daalna
        with open('users_backup.json', 'r') as f:
            users = json.load(f)
            for u in users:
                cursor.execute("""
                    INSERT INTO users (id, full_name, mobile_number, email, password, role)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING;
                """, (u['id'], u['full_name'], u['mobile_number'], u['email'], u['password'], u['role']))
        
        # 3. Complaints ka data JSON se utha ke daalna
        with open('complaints_backup.json', 'r') as f:
            complaints = json.load(f)
            for c in complaints:
                cursor.execute("""
                    INSERT INTO complaints (id, citizen_name, park_name, sector_id, category, sub_category, remarks, status, priority, timestamp, before_image, after_image)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING;
                """, (c['id'], c['citizen_name'], c['park_name'], c['sector_id'], c['category'], c['sub_category'], c['remarks'], c['status'], c['priority'], c['timestamp'], c['before_image'], c['after_image']))

        # 4. ID Sequence reset karna (Kyunki humne purani IDs manual daali hain)
        cursor.execute("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));")
        cursor.execute("SELECT setval('complaints_id_seq', (SELECT MAX(id) FROM complaints));")

        conn.commit()
        print("✅ SUCCESS: Saara SQLite Data Postgres mein successfully import ho gaya hai!")
        conn.close()

    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == '__main__':
    import_data()