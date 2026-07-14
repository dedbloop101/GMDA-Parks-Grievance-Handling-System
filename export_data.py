import sqlite3
import json

def export_table_to_json(table_name):
    conn = sqlite3.connect('gmda_portal.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    
    data = []
    for row in rows:
        row_dict = dict(row)
        # 🔥 THE FIX: Agar koi data bytes/BLOB hai (jaise password), toh use text mein convert karo
        for key, value in row_dict.items():
            if isinstance(value, bytes):
                row_dict[key] = value.decode('utf-8')  # Bytes ko string bana diya
        data.append(row_dict)
    
    with open(f'{table_name}_backup.json', 'w') as f:
        json.dump(data, f, indent=4)
        
    print(f"✅ {table_name} data exported successfully!")
    conn.close()

export_table_to_json('users')
export_table_to_json('complaints')