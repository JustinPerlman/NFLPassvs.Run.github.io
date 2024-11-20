export class PlayOutcomeVis {
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
        // Process data for yards gained distribution
        const binWidth = 5;
        const maxYards = 30;
        const minYards = -10;

        // Create bins for pass and rush plays
        const passPlays = data.filter(d => d.play_type === 'pass')
            .map(d => Math.min(Math.max(d.yards_gained, minYards), maxYards));
        const rushPlays = data.filter(d => d.play_type === 'rush')
            .map(d => Math.min(Math.max(d.yards_gained, minYards), maxYards));

        const svg = this.createBaseSVG('#outcomeChart');
        this.createDensityPlot(svg, passPlays, rushPlays, minYards, maxYards);
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

    createDensityPlot(svg, passPlays, rushPlays, minYards, maxYards) {
        // Check if we have data
        if (passPlays.length === 0 || rushPlays.length === 0) {
            svg.append('text')
                .attr('x', this.width / 2)
                .attr('y', this.height / 2)
                .attr('text-anchor', 'middle')
                .text('No data available for selected filters')
                .style('fill', this.colors.primary);
            return;
        }

        // Create scales
        const x = d3.scaleLinear()
            .domain([minYards, maxYards])
            .range([0, this.width]);

        // Generate kernel density estimates
        const kde = this.kernelDensityEstimator(this.kernelEpanechnikov(7), x.ticks(40));
        const passData = kde(passPlays);
        const rushData = kde(rushPlays);

        // Find max density for y scale
        const maxDensity = Math.max(
            d3.max(passData, d => d[1]),
            d3.max(rushData, d => d[1])
        );

        const y = d3.scaleLinear()
            .domain([0, maxDensity])
            .range([this.height, 0]);

        // Add the area for pass plays
        svg.append('path')
            .datum(passData)
            .attr('fill', this.colors.primary)
            .attr('opacity', .5)
            .attr('stroke', this.colors.primary)
            .attr('stroke-width', 1)
            .attr('stroke-linejoin', 'round')
            .attr('d', d3.area()
                .curve(d3.curveBasis)
                .x(d => x(d[0]))
                .y0(this.height)
                .y1(d => y(d[1]))
            );

        // Add the area for rush plays
        svg.append('path')
            .datum(rushData)
            .attr('fill', this.colors.accent)
            .attr('opacity', .5)
            .attr('stroke', this.colors.accent)
            .attr('stroke-width', 1)
            .attr('stroke-linejoin', 'round')
            .attr('d', d3.area()
                .curve(d3.curveBasis)
                .x(d => x(d[0]))
                .y0(this.height)
                .y1(d => y(d[1]))
            );

        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x));

        svg.append('g')
            .call(d3.axisLeft(y).ticks(5));

        // Add labels
        this.createLabels(svg, 'Yards Gained', 'Density');

        // Add legend
        this.createLegend(svg);

        // Add mean lines
        this.addMeanLines(svg, x, passPlays, rushPlays);

        // Add interactivity
        this.addInteractivity(svg, x, y, passData, rushData);
    }

    kernelDensityEstimator(kernel, X) {
        return function(V) {
            return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
        };
    }

    kernelEpanechnikov(k) {
        return function(v) {
            return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
        };
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
        legend.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 20)
            .attr('height', 10)
            .style('fill', this.colors.primary)
            .style('opacity', 0.5);

        legend.append('text')
            .attr('x', 30)
            .attr('y', 10)
            .text('Pass Plays');

        // Rush plays
        legend.append('rect')
            .attr('x', 0)
            .attr('y', 30)
            .attr('width', 20)
            .attr('height', 10)
            .style('fill', this.colors.accent)
            .style('opacity', 0.5);

        legend.append('text')
            .attr('x', 30)
            .attr('y', 40)
            .text('Rush Plays');
    }

    addMeanLines(svg, x, passPlays, rushPlays) {
        const passMean = d3.mean(passPlays);
        const rushMean = d3.mean(rushPlays);

        // Add mean line for pass plays
        svg.append('line')
            .attr('x1', x(passMean))
            .attr('x2', x(passMean))
            .attr('y1', 0)
            .attr('y2', this.height)
            .style('stroke', this.colors.primary)
            .style('stroke-width', 2)
            .style('stroke-dasharray', '5,5');

        // Add mean line for rush plays
        svg.append('line')
            .attr('x1', x(rushMean))
            .attr('x2', x(rushMean))
            .attr('y1', 0)
            .attr('y2', this.height)
            .style('stroke', this.colors.accent)
            .style('stroke-width', 2)
            .style('stroke-dasharray', '5,5');
    }

    addInteractivity(svg, x, y, passData, rushData) {
        // Add overlay for mouse interaction
        const bisect = d3.bisector(d => d[0]).left;

        svg.append('rect')
            .attr('class', 'overlay')
            .attr('width', this.width)
            .attr('height', this.height)
            .style('opacity', 0)
            .on('mousemove', (event) => {
                const [mouseX] = d3.pointer(event);
                const x0 = x.invert(mouseX);
                
                const passIndex = bisect(passData, x0);
                const rushIndex = bisect(rushData, x0);

                if (passIndex < passData.length && rushIndex < rushData.length) {
                    const passValue = passData[passIndex];
                    const rushValue = rushData[rushIndex];

                    this.showTooltip(event, `Yards Gained: ${Math.round(x0)}
                        Pass Density: ${passValue[1].toFixed(3)}
                        Rush Density: ${rushValue[1].toFixed(3)}`);
                }
            })
            .on('mouseout', () => {
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
