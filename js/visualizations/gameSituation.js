export class GameSituationVis {
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
        // Process data for game situation analysis
        const situations = data.map(d => ({
            time_remaining: +d.time_remaining,
            field_position: +d.field_position,
            play_type: d.play_type,
            success: d.yards_gained >= d.yards_to_go
        }));

        const svg = this.createBaseSVG('#situationChart');
        this.createHeatmap(svg, situations);
    }

    createBaseSVG(selector) {
        // Clear any existing SVG
        d3.select(selector).selectAll('*').remove();
        
        return d3.select(selector)
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    }

    createHeatmap(svg, data) {
        // Create scales
        const xScale = d3.scaleLinear()
            .domain([0, 60]) // Game time in minutes
            .range([0, this.width]);

        const yScale = d3.scaleLinear()
            .domain([0, 100]) // Field position
            .range([this.height, 0]);

        // Create bins for the heatmap
        const timeBins = 12; // 5-minute intervals
        const fieldBins = 10; // 10-yard intervals

        // Calculate pass percentage for each bin
        const binData = this.calculateBins(data, timeBins, fieldBins);

        // Create color scale
        const colorScale = d3.scaleSequential()
            .domain([0, 1])
            .interpolator(d3.interpolate(this.colors.accent, this.colors.primary));

        // Draw heatmap cells
        const cellWidth = this.width / timeBins;
        const cellHeight = this.height / fieldBins;

        svg.selectAll('rect')
            .data(binData)
            .enter()
            .append('rect')
            .attr('x', d => xScale(d.timeStart))
            .attr('y', d => yScale(d.fieldStart + 10))
            .attr('width', cellWidth)
            .attr('height', cellHeight)
            .attr('fill', d => d.total > 0 ? colorScale(d.passPercentage) : '#eee')
            .on('mouseover', (event, d) => {
                this.showTooltip(event, d);
            })
            .on('mouseout', () => {
                this.hideTooltip();
            });

        // Add axes
        this.addAxes(svg, xScale, yScale);
        
        // Add legend
        this.addLegend(svg, colorScale);
    }

    calculateBins(data, timeBins, fieldBins) {
        const bins = [];
        const timeInterval = 60 / timeBins;
        const fieldInterval = 100 / fieldBins;

        for (let t = 0; t < timeBins; t++) {
            for (let f = 0; f < fieldBins; f++) {
                const timeStart = t * timeInterval;
                const timeEnd = (t + 1) * timeInterval;
                const fieldStart = f * fieldInterval;
                const fieldEnd = (f + 1) * fieldInterval;

                const binPlays = data.filter(d => 
                    d.time_remaining >= timeStart &&
                    d.time_remaining < timeEnd &&
                    d.field_position >= fieldStart &&
                    d.field_position < fieldEnd
                );

                const passes = binPlays.filter(d => d.play_type === 'pass').length;
                const total = binPlays.length;

                bins.push({
                    timeStart,
                    timeEnd,
                    fieldStart,
                    fieldEnd,
                    passPercentage: total > 0 ? passes / total : 0,
                    total,
                    passes
                });
            }
        }

        return bins;
    }

    addAxes(svg, xScale, yScale) {
        // Add X axis
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(xScale)
                .tickFormat(d => `${d}:00`)
                .ticks(6));

        // Add Y axis
        svg.append('g')
            .call(d3.axisLeft(yScale)
                .tickFormat(d => `${d}`)
                .ticks(10));

        // Add labels
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height + this.margin.bottom - 10)
            .attr('text-anchor', 'middle')
            .text('Time Remaining (MM:SS)')
            .style('fill', this.colors.primary);

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.height / 2)
            .attr('y', -this.margin.left + 20)
            .attr('text-anchor', 'middle')
            .text('Field Position (Yards)')
            .style('fill', this.colors.primary);
    }

    addLegend(svg, colorScale) {
        const legendWidth = 200;
        const legendHeight = 20;

        const legendScale = d3.scaleLinear()
            .domain([0, 100])
            .range([0, legendWidth]);

        const legendAxis = d3.axisBottom(legendScale)
            .tickFormat(d => d + '%')
            .ticks(5);

        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width - legendWidth - 20},${-20})`);

        // Create gradient
        const defs = svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'passPercentageGradient')
            .attr('x1', '0%')
            .attr('x2', '100%')
            .attr('y1', '0%')
            .attr('y2', '0%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', this.colors.accent);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', this.colors.primary);

        // Add gradient rectangle
        legend.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#passPercentageGradient)');

        // Add axis
        legend.append('g')
            .attr('transform', `translate(0,${legendHeight})`)
            .call(legendAxis);

        // Add title
        legend.append('text')
            .attr('x', legendWidth / 2)
            .attr('y', -5)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Pass Play Percentage');
    }

    showTooltip(event, d) {
        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        
        tooltip.html(`
            Time: ${Math.floor(d.timeStart)}:00 - ${Math.floor(d.timeEnd)}:00<br/>
            Field Position: ${Math.floor(d.fieldStart)}-${Math.floor(d.fieldEnd)} yards<br/>
            Pass Percentage: ${(d.passPercentage * 100).toFixed(1)}%<br/>
            Total Plays: ${d.total}
        `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }

    hideTooltip() {
        d3.select('.tooltip').remove();
    }
}
