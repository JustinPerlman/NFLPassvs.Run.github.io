export class PlayDistributionVis {
    constructor() {
        this.margin = {top: 40, right: 40, bottom: 120, left: 60};
        this.width = 500 - this.margin.left - this.margin.right;
        this.height = 400 - this.margin.top - this.margin.bottom;
        this.colors = {
            primary: '#013369',
            accent: '#D50A0A'
        };
    }

    async create(data) {
        if (!data || data.length === 0) {
            console.error('No data provided to PlayDistributionVis');
            return;
        }

        // Ensure numeric conversion and filter out invalid entries
        const cleanData = data.map(d => ({
            ...d,
            yards_gained: +d.yards_gained || 0,
            play_type: d.play_type || '',
            team: d.posteam || ''  // Changed from team to posteam
        })).filter(d => d.team && d.play_type);

        // Add debugging
        console.log('Clean Data:', cleanData.slice(0, 5));

        // Calculate team statistics
        const teamStats = Array.from(d3.rollup(cleanData,
            v => ({
                avgRushYards: d3.mean(v.filter(d => d.play_type === 'run'), d => d.yards_gained) || 0,  // Changed from rush to run
                avgPassYards: d3.mean(v.filter(d => d.play_type === 'pass'), d => d.yards_gained) || 0,
                totalRushYards: d3.sum(v.filter(d => d.play_type === 'run'), d => d.yards_gained) || 0,  // Changed from rush to run
                totalPassYards: d3.sum(v.filter(d => d.play_type === 'pass'), d => d.yards_gained) || 0
            }),
            d => d.team
        ), ([team, stats]) => ({team, ...stats}))
        .filter(d => d.team && (d.avgRushYards > 0 || d.avgPassYards > 0));

        // Add debugging
        console.log('Team Stats:', teamStats);

        // Sort teams by total yards
        teamStats.sort((a, b) => 
            (b.totalRushYards + b.totalPassYards) - (a.totalRushYards + a.totalPassYards)
        );

        if (teamStats.length === 0) {
            console.error('No valid team statistics calculated');
            return;
        }

        this.createBarChart(teamStats);
        this.createScatterPlot(teamStats);
    }

    createBarChart(data) {
        // Clear existing content
        d3.select('#playTypeChart').selectAll('*').remove();

        const svg = d3.select('#playTypeChart')
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Create scales
        const x = d3.scaleBand()
            .domain(data.map(d => d.team))
            .range([0, this.width])
            .padding(0.1);

        const maxYards = d3.max(data, d => Math.max(d.avgRushYards || 0, d.avgPassYards || 0));
        const y = d3.scaleLinear()
            .domain([0, maxYards * 1.1]) // Add 10% padding
            .range([this.height, 0]);

        // Create grouped bars
        const subgroups = ['avgRushYards', 'avgPassYards'];
        const xSubgroup = d3.scaleBand()
            .domain(subgroups)
            .range([0, x.bandwidth()])
            .padding(0.05);

        // Add bars
        const groups = svg.selectAll('g.team')
            .data(data)
            .enter()
            .append('g')
            .attr('class', 'team')
            .attr('transform', d => `translate(${x(d.team)},0)`);

        groups.selectAll('rect')
            .data(d => subgroups.map(key => ({key, value: d[key] || 0, team: d.team})))
            .enter()
            .append('rect')
            .attr('x', d => xSubgroup(d.key))
            .attr('y', d => y(d.value))
            .attr('width', xSubgroup.bandwidth())
            .attr('height', d => Math.max(0, this.height - y(d.value)))
            .attr('fill', d => d.key === 'avgRushYards' ? this.colors.accent : this.colors.primary)
            .on('mouseover', (event, d) => {
                const type = d.key === 'avgRushYards' ? 'Rush' : 'Pass';
                this.showTooltip(event, `${d.team}: Avg ${type} Yards: ${d.value.toFixed(2)}`);
            })
            .on('mouseout', () => this.hideTooltip());

        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');

        svg.append('g')
            .call(d3.axisLeft(y).ticks(5));

        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('fill', this.colors.primary)
            .text('Average Yards per Play by Team');

        // Add legend
        const legend = svg.append('g')
            .attr('transform', `translate(${this.width - 100}, -30)`);

        const legendData = [
            {label: 'Rush', color: this.colors.accent},
            {label: 'Pass', color: this.colors.primary}
        ];

        legend.selectAll('rect')
            .data(legendData)
            .enter()
            .append('rect')
            .attr('x', (d, i) => i * 50)
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', d => d.color);

        legend.selectAll('text')
            .data(legendData)
            .enter()
            .append('text')
            .attr('x', (d, i) => i * 50 + 20)
            .attr('y', 12)
            .text(d => d.label)
            .style('font-size', '12px');
    }

    createScatterPlot(data) {
        // Clear existing content
        d3.select('#scatterChart').selectAll('*').remove();

        const svg = d3.select('#scatterChart')
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Create scales with padding
        const maxRushYards = d3.max(data, d => d.totalRushYards || 0);
        const maxPassYards = d3.max(data, d => d.totalPassYards || 0);

        const x = d3.scaleLinear()
            .domain([0, maxRushYards * 1.1])
            .range([0, this.width]);

        const y = d3.scaleLinear()
            .domain([0, maxPassYards * 1.1])
            .range([this.height, 0]);

        // Add dots
        svg.selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.totalRushYards || 0))
            .attr('cy', d => y(d.totalPassYards || 0))
            .attr('r', 6)
            .style('fill', this.colors.primary)
            .style('opacity', 0.6)
            .on('mouseover', (event, d) => {
                this.showTooltip(event, 
                    `${d.team}\nRush Yards: ${(d.totalRushYards || 0).toFixed(0)}\nPass Yards: ${(d.totalPassYards || 0).toFixed(0)}`);
                d3.select(event.target)
                    .style('opacity', 1)
                    .attr('r', 8);
            })
            .on('mouseout', (event) => {
                this.hideTooltip();
                d3.select(event.target)
                    .style('opacity', 0.6)
                    .attr('r', 6);
            });

        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x)
                .tickFormat(d => d3.format('.0f')(d)));

        svg.append('g')
            .call(d3.axisLeft(y)
                .tickFormat(d => d3.format('.0f')(d)));

        // Add labels
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height + 40)
            .attr('text-anchor', 'middle')
            .style('fill', this.colors.primary)
            .text('Total Rush Yards');

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.height / 2)
            .attr('y', -40)
            .attr('text-anchor', 'middle')
            .style('fill', this.colors.primary)
            .text('Total Pass Yards');

        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('fill', this.colors.primary)
            .text('Total Rush vs Pass Yards by Team');
    }

    showTooltip(event, text) {
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        tooltip.transition()
            .duration(200)
            .style('opacity', .9);
            
        tooltip.html(text)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }

    hideTooltip() {
        d3.select('.tooltip').remove();
    }
}
