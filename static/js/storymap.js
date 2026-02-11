class StoryMap {
    constructor(containerId, storyData) {
        this.containerId = containerId;
        this.storyData = storyData;
        this.width = document.getElementById(containerId).clientWidth;
        this.height = document.getElementById(containerId).clientHeight;
        this.simulation = null;
        this.svg = null;

        this.init();
    }

    init() {
        // Clear container
        d3.select(`#${this.containerId}`).html('');

        // Create SVG
        this.svg = d3.select(`#${this.containerId}`)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .append('g')
            .attr('transform', 'translate(0,0)');

        // Add zoom functionality
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.svg.attr('transform', event.transform);
            });

        d3.select(`#${this.containerId}`).select('svg')
            .call(zoom);

        this.render();
    }

    render() {
        const nodes = Object.values(this.storyData.nodes).map(node => ({
            id: node.id,
            content: node.content.substring(0, 30) + '...',
            isStart: node.id === this.storyData.starting_node
        }));

        const links = [];
        Object.values(this.storyData.nodes).forEach(node => {
            node.choices.forEach(choice => {
                links.push({
                    source: node.id,
                    target: choice.target,
                    label: choice.text.substring(0, 20)
                });
            });
        });

        this.simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-400))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collide', d3.forceCollide().radius(50));

        // Draw links
        const link = this.svg.append('g')
            .selectAll('line')
            .data(links)
            .enter()
            .append('line')
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrow)');

        // Draw link labels
        const linkLabels = this.svg.append('g')
            .selectAll('text')
            .data(links)
            .enter()
            .append('text')
            .text(d => d.label)
            .attr('font-size', 10)
            .attr('fill', '#666')
            .attr('text-anchor', 'middle');

        // Draw nodes
        const node = this.svg.append('g')
            .selectAll('g')
            .data(nodes)
            .enter()
            .append('g')
            .attr('cursor', 'pointer')
            .on('click', (event, d) => {
                this.onNodeClick(d.id);
            });

        // Node circles
        node.append('circle')
            .attr('r', 25)
            .attr('fill', d => d.isStart ? '#00cec9' : '#6c5ce7')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

        // Node labels
        node.append('text')
            .text(d => d.id)
            .attr('text-anchor', 'middle')
            .attr('dy', 35)
            .attr('fill', '#fff')
            .attr('font-size', 11)
            .attr('font-weight', 'bold');

        // Node content preview
        node.append('text')
            .text(d => d.content)
            .attr('text-anchor', 'middle')
            .attr('dy', 60)
            .attr('fill', '#fff')
            .attr('font-size', 9);

        // Add arrow marker
        this.svg.append('defs').append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 30)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#999');

        // Update positions on simulation tick
        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            linkLabels
                .attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2);

            node
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });
    }

    onNodeClick(nodeId) {
        // This will be overridden by main.js
        console.log('Node clicked:', nodeId);
    }

    updateData(storyData) {
        this.storyData = storyData;
        this.render();
    }

    resize() {
        this.width = document.getElementById(this.containerId).clientWidth;
        this.height = document.getElementById(this.containerId).clientHeight;

        d3.select(`#${this.containerId}`).select('svg')
            .attr('width', this.width)
            .attr('height', this.height);

        this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
        this.simulation.alpha(1).restart();
    }
}