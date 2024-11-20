export class SituationalSuccessVis {
    constructor() {
        this.width = 600;
        this.height = 600;
        this.radius = Math.min(this.width, this.height) / 2;
        this.colors = {
            primary: '#013369',
            accent: '#D50A0A',
            success: '#2ecc71',
            neutral: '#95a5a6',
            failure: '#e74c3c'
        };
    }

    async create(data) {
        // Process data for sunburst
        const processedData = this.processData(data);
        
        // Create the sunburst chart
        // First clear the container
        d3.select('#yardsChart').selectAll('*').remove();
        
        // Then create new SVG
        const svg = d3.select('#yardsChart')
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .append('g')
            .attr('transform', `translate(${this.width / 2},${this.height / 2})`);

        // Create color scale
        const color = d3.scaleOrdinal()
            .domain(['pass', 'run'])
            .range([this.colors.primary, this.colors.accent]);

        const secondLevelColor = d3.scaleOrdinal()
            .domain(['success', 'neutral', 'failure'])
            .range([this.colors.success, this.colors.neutral, this.colors.failure]);

        // Create partition layout
        const partition = d3.partition()
            .size([2 * Math.PI, this.radius]);

        // Create arc generator
        const arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(this.radius / 2)
            .innerRadius(d => d.y0)
            .outerRadius(d => d.y1 - 1);

        // Prepare the data
        const root = d3.hierarchy(processedData)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);
        
        partition(root);

        // Create the arcs
        svg.selectAll('path')
            .data(root.descendants())
            .join('path')
            .attr('fill', d => {
                if (d.depth === 0) return 'white';
                if (d.depth === 1) return color(d.data.name);
                return secondLevelColor(d.data.name);
            })
            .attr('d', arc)
            .on('mouseover', (event, d) => {
                const percentage = (100 * d.value / root.value).toFixed(1);
                this.showTooltip(event, `${d.ancestors().map(d => d.data.name).reverse().join(' → ')}\n${d.value} plays (${percentage}%)`);
            })
            .on('mouseout', () => this.hideTooltip());

        // Add labels
        const textPositions = root.descendants().filter(d => d.depth > 0);
        
        svg.selectAll('text')
            .data(textPositions)
            .join('text')
            .attr('transform', function(d) {
                const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
                const y = (d.y0 + d.y1) / 2;
                return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
            })
            .attr('dy', '0.35em')
            .attr('text-anchor', d => {
                const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
                return x < 180 ? 'start' : 'end';
            })
            .text(d => {
                const percentage = (100 * d.value / root.value).toFixed(1);
                if (percentage < 3) return ''; // Don't show text for small segments
                return d.data.name;
            })
            .style('font-size', '12px')
            .style('fill', 'white');

        // Add title
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', -this.radius - 20)
            .style('font-size', '20px')
            .style('fill', this.colors.primary)
            .text('Play Outcomes Distribution');
    }

    processData(data) {
        // Create hierarchical structure
        const playOutcomes = {
            name: 'All Plays',
            children: []
        };

        // Process pass plays
        const passingPlays = data.filter(d => d.play_type === 'pass');
        const passNode = {
            name: 'pass',
            children: [
                {
                    name: 'success',
                    children: [
                        {name: 'touchdown', value: passingPlays.filter(d => d.touchdown === 1).length},
                        {name: 'first down', value: passingPlays.filter(d => d.first_down_pass === 1 && d.touchdown === 0).length},
                        {name: 'positive yards', value: passingPlays.filter(d => d.yards_gained > 0 && d.first_down_pass === 0 && d.touchdown === 0).length}
                    ]
                },
                {
                    name: 'neutral',
                    children: [
                        {name: 'no gain', value: passingPlays.filter(d => d.yards_gained === 0 && !d.incomplete_pass).length},
                        {name: 'incomplete', value: passingPlays.filter(d => d.incomplete_pass === 1).length}
                    ]
                },
                {
                    name: 'failure',
                    children: [
                        {name: 'interception', value: passingPlays.filter(d => d.interception === 1).length},
                        {name: 'sack', value: passingPlays.filter(d => d.sack === 1).length},
                        {name: 'loss yards', value: passingPlays.filter(d => d.yards_gained < 0 && d.sack === 0).length}
                    ]
                }
            ]
        };

        // Process run plays
        const runningPlays = data.filter(d => d.play_type === 'run');
        const runNode = {
            name: 'run',
            children: [
                {
                    name: 'success',
                    children: [
                        {name: 'touchdown', value: runningPlays.filter(d => d.touchdown === 1).length},
                        {name: 'first down', value: runningPlays.filter(d => d.first_down_rush === 1 && d.touchdown === 0).length},
                        {name: 'positive yards', value: runningPlays.filter(d => d.yards_gained > 0 && d.first_down_rush === 0 && d.touchdown === 0).length}
                    ]
                },
                {
                    name: 'neutral',
                    children: [
                        {name: 'no gain', value: runningPlays.filter(d => d.yards_gained === 0).length}
                    ]
                },
                {
                    name: 'failure',
                    children: [
                        {name: 'fumble', value: runningPlays.filter(d => d.fumble === 1).length},
                        {name: 'loss yards', value: runningPlays.filter(d => d.yards_gained < 0 && d.fumble === 0).length}
                    ]
                }
            ]
        };

        playOutcomes.children = [passNode, runNode];
        return playOutcomes;
    }

    showTooltip(event, text) {
        // Remove any existing tooltips first
        this.hideTooltip();
        
        // Create tooltip div if it doesn't exist
        let tooltip = d3.select('body').select('.tooltip');
        if (tooltip.empty()) {
            tooltip = d3.select('body').append('div')
                .attr('class', 'tooltip')
                .style('opacity', 0);
        }

        tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        
        tooltip.html(text.replace(/\\n/g, '<br/>'))
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }

    hideTooltip() {
        const tooltip = d3.select('.tooltip');
        if (!tooltip.empty()) {
            tooltip.transition()
                .duration(200)
                .style('opacity', 0)
                .remove();
        }
    }
}
