from flask import Flask, request, jsonify, render_template
import sqlite3
from datetime import date

app = Flask(__name__)

# Database connection
def get_db_connection():
    conn = sqlite3.connect('climbing_game.db')
    conn.row_factory = sqlite3.Row
    return conn

# Landing page route
@app.route('/')
def landing():
    return render_template('index.html')

# Route for climbing game
@app.route('/data')
def climbing_game():
    return render_template('data.html')

# Route for getting all climb data
@app.route('/get_all_climbs', methods=['GET'])
def get_all_climbs():
    conn = sqlite3.connect('climbing_game.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT day, count, points FROM climbs ORDER BY day")
    rows = cursor.fetchall()

    data = [{"day": row[0], "count": row[1], "points": row[2]} for row in rows]
    conn.close()

    return jsonify(data)

# Route for updating climb count
@app.route('/climb', methods=['POST'])
def climb():
    data = request.json
    day = data['day']
    
    with get_db_connection() as conn:
        # Insert climb count or update if the day already exists
        conn.execute('''
            INSERT INTO climbs (day, count, points) 
            VALUES (?, 1, 1) 
            ON CONFLICT(day) DO UPDATE SET count = count + 1
        ''', (day,))
        conn.commit()

        # Get updated climb count
        row = conn.execute('SELECT SUM(count) as total_climbs FROM climbs WHERE day = ?', (day,)).fetchone()
        total_climbs = row['total_climbs'] if row['total_climbs'] is not None else 0
    
    return jsonify({'message': 'Climb count updated.', 'total_climbs': total_climbs}), 200

# Route for redeeming points
@app.route('/redeem_points', methods=['POST'])
def redeem_points():
    with get_db_connection() as conn:
        # Reset total climbs to 0
        conn.execute('UPDATE climbs SET count = 0')  # Reset all climbs to 0
        # Reset points to 0
        conn.execute('UPDATE climbs SET points = 0')  # Reset all points to 0
        conn.commit()
    
    return jsonify({'message': 'Points redeemed and total climbs reset to 0.'}), 200

# Route for getting total climbs and points
@app.route('/get_total_climbs', methods=['GET'])
def get_total_climbs():
    with get_db_connection() as conn:
        row = conn.execute('SELECT SUM(count) as total_climbs, SUM(points) as total_points FROM climbs').fetchone()

    total_climbs = row['total_climbs'] if row['total_climbs'] is not None else 0
    total_points = row['total_points'] if row['total_points'] is not None else 0
    
    return jsonify({'total_climbs': total_climbs, 'total_points': total_points}), 200

@app.route('/get_climb_and_goal', methods=['GET'])
def get_climb_and_goal():
    day = request.args.get('day')  # Henter 'day' fra query string
    
    with get_db_connection() as conn:
        row = conn.execute('SELECT count, goal FROM climbs WHERE day = ?', (day,)).fetchone()

    if row:
        count = row['count']
        goal = row['goal']
    else:
        count = 0
        goal = 0
    
    return jsonify({'count': count, 'goal': goal}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')

