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

# Route for climbing game (this can be your index page for climbing)
@app.route('/klatre-spil')
def climbing_game():
    return render_template('klatre-spil.html')  # Render the climbing game page

# Route for getting all climb data
@app.route('/get_all_climbs', methods=['GET'])
def get_all_climbs():
    conn = sqlite3.connect('climbing_game.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT day, count FROM climbs ORDER BY day")
    rows = cursor.fetchall()

    data = [{"day": row[0], "count": row[1]} for row in rows]
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
            INSERT INTO climbs (day, count) 
            VALUES (?, ?) 
            ON CONFLICT(day) DO UPDATE SET count = count + 1
        ''', (day, 1))
        conn.commit()

        # Get updated climb count
        row = conn.execute('SELECT SUM(count) as total_climbs FROM climbs WHERE day = ?', (day,)).fetchone()
        total_climbs = row['total_climbs'] if row['total_climbs'] is not None else 0
    
    return jsonify({'message': 'Climb count updated.', 'total_climbs': total_climbs}), 200

# Route for getting climb count and goal for a specific day
@app.route('/get_climb_and_goal', methods=['GET'])
def get_climb_and_goal():
    day = request.args.get('day', str(date.today()))  # Default to today if no day is provided
    
    with get_db_connection() as conn:
        row = conn.execute('SELECT SUM(count) as total_climbs, goal FROM climbs WHERE day = ?', (day,)).fetchone()

    total_climbs = row['total_climbs'] if row['total_climbs'] is not None else 0
    goal = row['goal'] if row['goal'] is not None else 20  # Default goal to 20 if not set
    
    return jsonify({'day': day, 'total_climbs': total_climbs, 'goal': goal}), 200
@app.route('/save_goal', methods=['POST'])
def save_goal():
    data = request.json
    day = data.get('day')
    goal = data.get('goal')

    if not day or goal is None:
        return jsonify({'error': 'Invalid data'}), 400

    try:
        with get_db_connection() as conn:
            # Check if the row already exists
            row = conn.execute('SELECT goal FROM climbs WHERE day = ?', (day,)).fetchone()
            
            if row:
                # Update the goal if the day already exists
                conn.execute('UPDATE climbs SET goal = ? WHERE day = ?', (goal, day))
            else:
                # Insert a new row if it doesn't exist
                conn.execute('INSERT INTO climbs (day, goal, count) VALUES (?, ?, 0)', (day, goal))
            
            conn.commit()

            print(f"Received day: {day}, goal: {goal}")
        
        return jsonify({'message': 'Goal saved successfully'}), 200
    except Exception as e:
        print(f"Error saving goal: {e}")  # Log the error
        return jsonify({'error': 'Failed to save goal'}), 500

@app.route('/reset_count', methods=['POST'])
def reset_count():
    data = request.json
    day = data.get('day')

    if not day:
        return jsonify({'error': 'Invalid data'}), 400

    try:
        with get_db_connection() as conn:
            # Set count to 0 for the specified day
            conn.execute('UPDATE climbs SET count = 0 WHERE day = ?', (day,))
            conn.commit()

            print(f"Recieved request to reset count for day: {day}")

        return jsonify({'message': 'Count reset successfully'}), 200
    except Exception as e:
        print(f"Error resetting count: {e}")  # Log the error
        
        return jsonify({'error': 'Failed to reset count'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
