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
                rush: v.filter(d => d.play_type === 'rush').length,
                total: v.length
            }),
            d => Math.min(Math.max(d.score_differential, -21), 21)
        );

        const svg = this.createBaseSVG('#scoringChart');
        this.createLineChart(svg, playsByScoreDiff);
    }

    createBaseSVG(selector) {
        return d3.select(selector)
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    }

    createLineChart(svg, data) {
        // Convert data to array format
        const chartData = Array.from(data, ([diff, counts]) => ({
            scoreDiff: +diff,
            passPercentage: (counts.pass / counts.total) * 100,
            rushPercentage: (counts.rush / counts.total) * 100
        })).sort((a, b) => a.scoreDiff - b.scoreDiff);

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
            .curve(d3.curveCatmullRom);

        const rushLine = d3.line()
            .x(d => x(d.scoreDiff))
            .y(d => y(d.rushPercentage))
            .curve(d3.curveCatmullRom);

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
            .attr('class', 'line rush')
            .attr('d', rushLine)
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
        this.createLabels(svg, 'Score Differential', 'Play Type Percentage');

        // Add legend
        this.createLegend(svg);

        // Add interactivity
        this.addInteractivity(svg, chartData, x, y);
    }

    createLabels(svg, xLabel, yLabel) {
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height + this.margin.bottom - 10)
            .attr('text-anchor', 'middle')
            .text(xLabel)
            .style('fill', this.colors.primary);

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.height / 2)
            .attr('y', -this.margin.left + 20)
            .attr('text-anchor', 'middle')
            .text(yLabel)
            .style('fill', this.colors.primary);
    }

    createLegend(svg) {
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width - 100}, 20)`);

        // Pass plays
        legend.append('line')
            .attr('x1', 0)
            .attr('x2', 20)
            .attr('y1', 10)
            .attr('y2', 10)
            .style('stroke', this.colors.primary)
            .style('stroke-width', 2);

        legend.append('text')
            .attr('x', 30)
            .attr('y', 15)
            .text('Pass Plays');

        // Rush plays
        legend.append('line')
            .attr('x1', 0)
            .attr('x2', 20)
            .attr('y1', 40)
            .attr('y2', 40)
            .style('stroke', this.colors.accent)
            .style('stroke-width', 2);

        legend.append('text')
            .attr('x', 30)
            .attr('y', 45)
            .text('Rush Plays');
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
                        Rush Plays: ${dataPoint.rushPercentage.toFixed(1)}%`);
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
