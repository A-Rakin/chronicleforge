from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
import json
import os
import uuid
from datetime import datetime
import markdown
import io

app = Flask(__name__)
CORS(app)

# Data storage
DATA_FILE = 'stories.json'

def load_stories():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_stories(stories):
    with open(DATA_FILE, 'w') as f:
        json.dump(stories, f, indent=2)

@app.route('/')
def index():
    stories = load_stories()
    return render_template('index.html', stories=stories)

@app.route('/editor/<story_id>')
def editor(story_id):
    stories = load_stories()
    story = stories.get(story_id, {})
    return render_template('editor.html', story=story, story_id=story_id)


@app.route('/view/<story_id>')
def view_story(story_id):
    stories = load_stories()
    story = stories.get(story_id, {})
    return render_template('view.html', story=story, story_id=story_id)


@app.route('/api/stories', methods=['GET'])
def get_stories():
    stories = load_stories()
    return jsonify(stories)


@app.route('/api/stories', methods=['POST'])
def create_story():
    stories = load_stories()
    story_id = str(uuid.uuid4())[:8]

    # Create default starting node
    start_node = {
        'id': 'start',
        'content': 'Your story begins here...',
        'choices': []
    }

    story = {
        'id': story_id,
        'title': request.json.get('title', 'Untitled Story'),
        'created': datetime.now().isoformat(),
        'modified': datetime.now().isoformat(),
        'nodes': {'start': start_node},
        'starting_node': 'start'
    }

    stories[story_id] = story
    save_stories(stories)
    return jsonify({'success': True, 'story_id': story_id})


@app.route('/api/stories/<story_id>', methods=['GET'])
def get_story(story_id):
    stories = load_stories()
    story = stories.get(story_id)
    if story:
        return jsonify(story)
    return jsonify({'error': 'Story not found'}), 404


@app.route('/api/stories/<story_id>', methods=['PUT'])
def update_story(story_id):
    stories = load_stories()
    if story_id in stories:
        story_data = request.json
        story_data['modified'] = datetime.now().isoformat()
        stories[story_id] = story_data
        save_stories(stories)
        return jsonify({'success': True})
    return jsonify({'error': 'Story not found'}), 404


@app.route('/api/stories/<story_id>/node', methods=['POST'])
def add_node(story_id):
    stories = load_stories()
    if story_id in stories:
        node_id = request.json.get('node_id', str(uuid.uuid4())[:6])
        node = {
            'id': node_id,
            'content': request.json.get('content', 'New node'),
            'choices': []
        }
        stories[story_id]['nodes'][node_id] = node
        save_stories(stories)
        return jsonify({'success': True, 'node_id': node_id})
    return jsonify({'error': 'Story not found'}), 404
