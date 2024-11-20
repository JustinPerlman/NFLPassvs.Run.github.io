export class ScoringSituationVis {
    constructor() {
        this.margin = {top: 40, right: 40, bottom: 60, left: 60};
        this.width = 700 - this.margin.left - this.margin.right;
        this.height = 400 - this.margin.top - this.margin.bottom;
        this.colors = {
            primary: '#013369',
            accent: '#D50A0A'
        };
    }

    async create(data) {
        // Process data by score differential
        const playsByScoreDiff = d3.rollup(data,
            v => ({
                pass: v.filter(d => d.play_type === 'pass').length,
                run: v.filter(d => d.play_type === 'run').length,
                total: v.length
            }),
            d => Math.min(Math.max(d.score_differential, -21), 21)
        );

        const svg = this.createBaseSVG('#scoringChart');
        this.createLineChart(svg, playsByScoreDiff);
    }

    createBaseSVG(selector) {
        // Clear any existing SVG first
        d3.select(selector).selectAll('*').remove();
        
        return d3.select(selector)
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    }

    createLineChart(svg, data) {
        // Convert data to array format and ensure valid numbers
        const chartData = Array.from(data, ([diff, counts]) => {
            const total = counts.total || 1; // Prevent division by zero
            return {
                scoreDiff: +diff,
                passPercentage: (counts.pass / total) * 100,
                runPercentage: (counts.run / total) * 100
            };
        }).sort((a, b) => a.scoreDiff - b.scoreDiff);

        // Create scales
        const x = d3.scaleLinear()
            .domain([-21, 21])
            .range([0, this.width]);

        const y = d3.scaleLinear()
            .domain([0, 100])
            .range([this.height, 0]);

        // Create line generators
        const passLine = d3.line()
            .x(d => x(d.scoreDiff))
            .y(d => y(d.passPercentage))
            .curve(d3.curveCatmullRom)
            .defined(d => !isNaN(d.passPercentage)); // Skip NaN values

        const runLine = d3.line()
            .x(d => x(d.scoreDiff))
            .y(d => y(d.runPercentage))
            .curve(d3.curveCatmullRom)
            .defined(d => !isNaN(d.runPercentage)); // Skip NaN values

        // Add lines
        svg.append('path')
            .datum(chartData)
            .attr('class', 'line pass')
            .attr('d', passLine)
            .style('fill', 'none')
            .style('stroke', this.colors.primary)
            .style('stroke-width', 2);

        svg.append('path')
            .datum(chartData)
            .attr('class', 'line run')
            .attr('d', runLine)
            .style('fill', 'none')
            .style('stroke', this.colors.accent)
            .style('stroke-width', 2);

        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x).tickFormat(d => (d > 0 ? '+' : '') + d));

        svg.append('g')
            .call(d3.axisLeft(y).tickFormat(d => d + '%'));

        // Add labels
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height + 40)
            .attr('text-anchor', 'middle')
            .style('fill', this.colors.primary)
            .text('Score Differential');

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.height / 2)
            .attr('y', -40)
            .attr('text-anchor', 'middle')
            .style('fill', this.colors.primary)
            .text('Play Type Percentage');

        // Add legend
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width - 100}, 0)`);

        // Pass plays legend item
        legend.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', 20)
            .attr('y2', 0)
            .style('stroke', this.colors.primary)
            .style('stroke-width', 2);

        legend.append('text')
            .attr('x', 25)
            .attr('y', 4)
            .text('Pass Plays')
            .style('font-size', '12px');

        // Run plays legend item
        legend.append('line')
            .attr('x1', 0)
            .attr('y1', 20)
            .attr('x2', 20)
            .attr('y2', 20)
            .style('stroke', this.colors.accent)
            .style('stroke-width', 2);

        legend.append('text')
            .attr('x', 25)
            .attr('y', 24)
            .text('Run Plays')
            .style('font-size', '12px');
    }

    addInteractivity(svg, data, x, y) {
        // Add a vertical line for hover interaction
        const verticalLine = svg.append('line')
            .attr('class', 'hover-line')
            .style('stroke', '#000')
            .style('stroke-width', 1)
            .style('opacity', 0);

        // Add overlay for mouse interaction
        svg.append('rect')
            .attr('class', 'overlay')
            .attr('width', this.width)
            .attr('height', this.height)
            .style('opacity', 0)
            .on('mousemove', (event) => {
                const [mouseX] = d3.pointer(event);
                const scoreDiff = Math.round(x.invert(mouseX));
                const dataPoint = data.find(d => d.scoreDiff === scoreDiff);

                if (dataPoint) {
                    // Update vertical line
                    verticalLine
                        .attr('x1', x(scoreDiff))
                        .attr('x2', x(scoreDiff))
                        .attr('y1', 0)
                        .attr('y2', this.height)
                        .style('opacity', 1);

                    // Show tooltip
                    this.showTooltip(event, `Score Differential: ${scoreDiff > 0 ? '+' : ''}${scoreDiff}
                        Pass Plays: ${dataPoint.passPercentage.toFixed(1)}%
                        Run Plays: ${dataPoint.runPercentage.toFixed(1)}%`);
                }
            })
            .on('mouseout', () => {
                verticalLine.style('opacity', 0);
                this.hideTooltip();
            });
    }

    showTooltip(event, text) {
        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        
        tooltip.html(text.replace(/\n/g, '<br/>'))
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }

    hideTooltip() {
        d3.select('.tooltip').remove();
    }
}
