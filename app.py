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


@app.route('/api/stories/<story_id>/choice', methods=['POST'])
def add_choice(story_id):
    stories = load_stories()
    if story_id in stories:
        from_node = request.json.get('from_node')
        to_node = request.json.get('to_node')
        choice_text = request.json.get('choice_text', 'Continue...')

        choice_id = str(uuid.uuid4())[:6]
        choice = {
            'id': choice_id,
            'text': choice_text,
            'target': to_node
        }

        if from_node in stories[story_id]['nodes']:
            stories[story_id]['nodes'][from_node]['choices'].append(choice)
            save_stories(stories)
            return jsonify({'success': True, 'choice_id': choice_id})

    return jsonify({'error': 'Failed to add choice'}), 400


@app.route('/api/stories/<story_id>/export/<format>', methods=['GET'])
def export_story(story_id, format):
    stories = load_stories()
    story = stories.get(story_id)

    if not story:
        return jsonify({'error': 'Story not found'}), 404

    if format == 'json':
        return jsonify(story)

    elif format == 'markdown':
        md_content = f"# {story['title']}\n\n"
        for node_id, node in story['nodes'].items():
            md_content += f"## Node: {node_id}\n"
            md_content += f"{node['content']}\n\n"
            if node['choices']:
                md_content += "Choices:\n"
                for choice in node['choices']:
                    md_content += f"- {choice['text']} → {choice['target']}\n"
            md_content += "\n---\n\n"

        return md_content, 200, {'Content-Type': 'text/markdown'}

    elif format == 'html':
        html_content = f"<h1>{story['title']}</h1>\n"
        for node_id, node in story['nodes'].items():
            html_content += f"<h2>Node: {node_id}</h2>\n"
            html_content += f"<p>{node['content']}</p>\n"
            if node['choices']:
                html_content += "<ul>\n"
                for choice in node['choices']:
                    html_content += f"<li>{choice['text']} → {choice['target']}</li>\n"
                html_content += "</ul>\n"
            html_content += "<hr>\n"

        return html_content, 200, {'Content-Type': 'text/html'}


if __name__ == '__main__':
    app.run(debug=True, port=5000)