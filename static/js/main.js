// Global state
let currentStoryMap = null;
let selectedNodeId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Home page: load stories
    if (document.getElementById('storiesGrid')) {
        loadStories();
    }

    // Editor page: initialize story map
    if (document.getElementById('storyGraph') && window.storyData) {
        initializeEditor();
    }

    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Create new story button
    const createBtn = document.getElementById('createStoryBtn');
    if (createBtn) {
        createBtn.addEventListener('click', createNewStory);
    }

    // Save story button
    const saveBtn = document.getElementById('saveStoryBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveStory);
    }

    // Add node button
    const addNodeBtn = document.getElementById('addNodeBtn');
    if (addNodeBtn) {
        addNodeBtn.addEventListener('click', addNewNode);
    }

    // Export buttons
    document.querySelectorAll('.dropdown-content a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const format = this.dataset.format;
            exportStory(format);
        });
    });
}

// Load and display all stories
function loadStories() {
    fetch('/api/stories')
        .then(response => response.json())
        .then(stories => {
            const grid = document.getElementById('storiesGrid');
            grid.innerHTML = '';

            Object.values(stories).forEach(story => {
                const card = createStoryCard(story);
                grid.appendChild(card);
            });
        });
}

// Create story card element
function createStoryCard(story) {
    const card = document.createElement('div');
    card.className = 'story-card';

    const date = new Date(story.created);
    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    card.innerHTML = `
        <h3>${story.title}</h3>
        <div class="story-meta">
            Created: ${formattedDate}<br>
            Nodes: ${Object.keys(story.nodes).length}
        </div>
        <div class="story-actions">
            <a href="/editor/${story.id}" class="btn btn-small">Edit</a>
            <a href="/view/${story.id}" class="btn btn-small" target="_blank">Read</a>
            <button onclick="deleteStory('${story.id}')" class="btn btn-small btn-danger">Delete</button>
        </div>
    `;

    return card;
}

// Create new story
function createNewStory() {
    const title = prompt('Enter your story title:', 'My Adventure');
    if (title) {
        fetch('/api/stories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: title })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = `/editor/${data.story_id}`;
            }
        });
    }
}

// Initialize editor
function initializeEditor() {
    // Setup story map
    currentStoryMap = new StoryMap('storyGraph', window.storyData);
    currentStoryMap.onNodeClick = (nodeId) => {
        selectNode(nodeId);
    };

    // Load nodes list
    loadNodesList();

    // Select start node by default
    selectNode(window.storyData.starting_node || 'start');

    // Handle window resize
    window.addEventListener('resize', () => {
        if (currentStoryMap) {
            currentStoryMap.resize();
        }
    });
}

// Load nodes list in sidebar
function loadNodesList() {
    const nodesList = document.getElementById('nodesList');
    nodesList.innerHTML = '<h3>Story Nodes</h3>';

    Object.values(window.storyData.nodes).forEach(node => {
        const nodeItem = document.createElement('div');
        nodeItem.className = 'node-item';
        nodeItem.innerHTML = `
            <span class="node-id">${node.id}</span>
            ${node.id === window.storyData.starting_node ? '🌟' : ''}
        `;
        nodeItem.onclick = () => selectNode(node.id);
        nodesList.appendChild(nodeItem);
    });
}

// Select and edit a node
function selectNode(nodeId) {
    selectedNodeId = nodeId;
    const node = window.storyData.nodes[nodeId];

    if (!node) return;

    const editor = document.getElementById('nodeEditor');
    editor.innerHTML = `
        <h3>Editing Node: ${nodeId}</h3>
        ${nodeId === window.storyData.starting_node ?
            '<span class="start-badge">Starting Node 🌟</span>' : ''}

        <textarea id="nodeContent" class="node-content"
            placeholder="Write your story content here...">${node.content}</textarea>

        <div class="choices-section">
            <h4>Choices</h4>
            <div id="choicesList" class="choices-list">
                ${renderChoicesList(node.choices)}
            </div>

            <div class="add-choice">
                <h4>Add Choice</h4>
                <input type="text" id="choiceText" placeholder="Choice text" class="choice-input">
                <select id="choiceTarget" class="choice-select">
                    <option value="">Select target node...</option>
                    ${Object.keys(window.storyData.nodes).map(id =>
                        `<option value="${id}">${id}</option>`
                    ).join('')}
                </select>
                <button onclick="addChoice('${nodeId}')" class="btn btn-small">Add Choice</button>
            </div>
        </div>
    `;
}

// Render choices list HTML
function renderChoicesList(choices) {
    if (!choices || choices.length === 0) {
        return '<p class="no-choices">No choices yet. Add one below!</p>';
    }

    return choices.map(choice => `
        <div class="choice-item">
            <div>
                <strong>${choice.text}</strong><br>
                <small>→ ${choice.target}</small>
            </div>
            <button onclick="removeChoice('${choice.id}')" class="btn-small btn-danger">✕</button>
        </div>
    `).join('');
}

// Add new node
function addNewNode() {
    const nodeName = prompt('Enter node ID (no spaces):', `node_${Date.now()}`);
    if (nodeName) {
        fetch(`/api/stories/${window.storyId}/node`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                node_id: nodeName,
                content: 'New story node...'
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            }
        });
    }
}

// Add choice to node
function addChoice(fromNode) {
    const text = document.getElementById('choiceText').value;
    const target = document.getElementById('choiceTarget').value;

    if (!text || !target) {
        alert('Please fill in both fields');
        return;
    }

    fetch(`/api/stories/${window.storyId}/choice`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from_node: fromNode,
            to_node: target,
            choice_text: text
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            location.reload();
        }
    });
}

// Save story
function saveStory() {
    // Update current node content if editing
    if (selectedNodeId) {
        const content = document.getElementById('nodeContent');
        if (content) {
            window.storyData.nodes[selectedNodeId].content = content.value;
        }
    }

    fetch(`/api/stories/${window.storyId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(window.storyData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Story saved successfully!');
        }
    });
}

// Export story
function exportStory(format) {
    window.open(`/api/stories/${window.storyId}/export/${format}`, '_blank');
}

// Delete story
function deleteStory(storyId) {
    if (confirm('Are you sure you want to delete this story?')) {
        fetch(`/api/stories/${storyId}`, {
            method: 'DELETE'
        })
        .then(() => {
            location.reload();
        });
    }
}

