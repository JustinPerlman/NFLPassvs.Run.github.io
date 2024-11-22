export class TeamPerformanceVis {
    constructor() {
        this.margin = {top: 40, right: 40, bottom: 40, left: 70};  
        this.width = 600 - this.margin.left - this.margin.right;
        this.height = 400 - this.margin.top - this.margin.bottom;
        this.colors = {
            primary: '#013369',
            accent: '#D50A0A'
        };
        // Add highlight colors
        this.highlightColors = {
            primary: '#1e56b0',
            accent: '#ff1f1f'
        };
        this.selectedTeams = new Set();  // Track selected teams
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
            team: d.posteam || ''  
        })).filter(d => d.team && d.play_type);

        // Add debugging
        console.log('Clean Data:', cleanData.slice(0, 5));

        // Calculate team statistics
        const teamStats = Array.from(d3.rollup(cleanData,
            v => ({
                avgRushYards: d3.mean(v.filter(d => d.play_type === 'run'), d => d.yards_gained) || 0,  
                avgPassYards: d3.mean(v.filter(d => d.play_type === 'pass'), d => d.yards_gained) || 0,
                totalRushYards: d3.sum(v.filter(d => d.play_type === 'run'), d => d.yards_gained) || 0,  
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

        const container = d3.select('#playTypeChart')
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);

        const svg = container
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Create scales
        const x = d3.scaleBand()
            .domain(data.map(d => d.team))
            .range([0, this.width])
            .padding(0.2);

        const maxYards = d3.max(data, d => Math.max(d.avgRushYards || 0, d.avgPassYards || 0));
        const y = d3.scaleLinear()
            .domain([0, maxYards * 1.1])
            .range([this.height, 0]);

        // Create grouped bars
        const subgroups = ['avgRushYards', 'avgPassYards'];
        const xSubgroup = d3.scaleBand()
            .domain(subgroups)
            .range([0, x.bandwidth()])
            .padding(0.05);

        // Add background rect for click-to-deselect
        svg.append('rect')
            .attr('class', 'background')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('fill', 'transparent')
            .on('click', () => {
                this.selectedTeams.clear();
                this.highlightTeams(this.selectedTeams);
            });

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
            .style('opacity', 1)
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();  // Prevent background click from triggering
                if (this.selectedTeams.has(d.team)) {
                    this.selectedTeams.delete(d.team);
                } else {
                    this.selectedTeams.add(d.team);
                }
                this.highlightTeams(this.selectedTeams);
            })
            .on('mouseover', (event, d) => {
                const type = d.key === 'avgRushYards' ? 'Rush' : 'Pass';
                this.showTooltip(event, `${d.team}: Avg ${type} Yards: ${d.value.toFixed(2)}`);
                this.tempHighlight(d.team, true);
            })
            .on('mouseout', (event, d) => {
                this.hideTooltip();
                this.tempHighlight(d.team, false);
            });

        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end')
            .attr('dx', '-0.8em')
            .attr('dy', '0.15em');

        svg.append('g')
            .call(d3.axisLeft(y).ticks(5));

        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -20)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('fill', this.colors.primary)
            .text('Average Yards per Play by Team');
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
            .domain([8000, maxRushYards * 1.1])
            .range([0, this.width]);

        const y = d3.scaleLinear()
            .domain([15000, maxPassYards * 1.1])
            .range([this.height, 0]);

        // Create brush for scatter plot
        const scatterBrush = d3.brush()
            .extent([[0, 0], [this.width, this.height]])
            .on('start brush end', (event) => {
                if (!event.selection) {
                    // If no selection, show all points normally
                    this.selectedTeams.clear();
                    this.highlightTeams(this.selectedTeams);
                    return;
                }

                // Get the selection bounds
                const [[x0, y0], [x1, y1]] = event.selection;

                // Find all points within the brush selection
                this.selectedTeams.clear();
                svg.selectAll('circle').each((d) => {
                    const cx = x(d.totalRushYards || 0);
                    const cy = y(d.totalPassYards || 0);
                    if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) {
                        this.selectedTeams.add(d.team);
                    }
                });

                // Highlight selected teams
                this.highlightTeams(this.selectedTeams);
            });

        // Add brush to scatter plot
        const scatterBrushGroup = svg.append('g')
            .attr('class', 'brush')
            .call(scatterBrush);

        // Add dots
        svg.selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.totalRushYards || 0))
            .attr('cy', d => y(d.totalPassYards || 0))
            .attr('r', 6)
            .style('fill', this.colors.primary)
            .style('opacity', 1)
            .on('mouseover', (event, d) => {
                this.showTooltip(event, 
                    `${d.team}\nRush Yards: ${(d.totalRushYards || 0).toFixed(0)}\nPass Yards: ${(d.totalPassYards || 0).toFixed(0)}`);
                this.tempHighlight(d.team, true);
            })
            .on('mouseout', (event, d) => {
                this.hideTooltip();
                this.tempHighlight(d.team, false);
            });

        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x).ticks(5));

        svg.append('g')
            .call(d3.axisLeft(y).ticks(5));

        // Add labels
        svg.append('text')
            .attr('transform', `translate(${this.width/2},${this.height + 40})`)
            .style('text-anchor', 'middle')
            .text('Total Rush Yards');

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -50)
            .attr('x', -this.height/2)
            .style('text-anchor', 'middle')
            .text('Total Pass Yards');

        // Add title
        svg.append('text')
            .attr('x', this.width/2)
            .attr('y', -20)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('fill', this.colors.primary)
            .text('Total Rush vs Pass Yards by Team');
    }

    // Temporary highlight for hover
    tempHighlight(team, highlight = true) {
        // If there's an active brush selection, only highlight if the team is selected
        if (this.selectedTeams.size > 0 && !this.selectedTeams.has(team)) return;

        if (highlight) {
            // Dim non-highlighted elements during hover
            d3.select('#playTypeChart')
                .selectAll('g.team')
                .selectAll('rect')
                .transition()
                .duration(100)
                .style('opacity', d => d.team === team ? 1 : 0.3);

            d3.select('#scatterChart')
                .selectAll('circle')
                .transition()
                .duration(100)
                .style('opacity', d => d.team === team ? 1 : 0.3)
                .attr('r', d => d.team === team ? 8 : 6);
        } else {
            // Restore full opacity when not hovering
            if (this.selectedTeams.size === 0) {
                d3.select('#playTypeChart')
                    .selectAll('g.team')
                    .selectAll('rect')
                    .transition()
                    .duration(100)
                    .style('opacity', 1);

                d3.select('#scatterChart')
                    .selectAll('circle')
                    .transition()
                    .duration(100)
                    .style('opacity', 1)
                    .attr('r', 6);
            } else {
                // If there's a brush selection, restore brush selection highlighting
                this.highlightTeams(this.selectedTeams);
            }
        }
    }

    // Brush selection highlight
    highlightTeams(teams) {
        this.selectedTeams = teams;
        
        if (teams.size === 0) {
            // If no selection, reset all elements to full opacity
            d3.select('#playTypeChart')
                .selectAll('g.team')
                .selectAll('rect')
                .transition()
                .duration(200)
                .style('opacity', 1);

            d3.select('#scatterChart')
                .selectAll('circle')
                .transition()
                .duration(200)
                .style('opacity', 1)
                .attr('r', 6);
        } else {
            // Dim non-selected elements
            d3.select('#playTypeChart')
                .selectAll('g.team')
                .selectAll('rect')
                .transition()
                .duration(200)
                .style('opacity', d => teams.has(d.team) ? 1 : 0.3);

            d3.select('#scatterChart')
                .selectAll('circle')
                .transition()
                .duration(200)
                .style('opacity', d => teams.has(d.team) ? 1 : 0.3)
                .attr('r', 6);
        }
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
