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
