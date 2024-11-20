export class SituationalSuccessVis {
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
        // Calculate success rate by down and play type
        const successByDown = d3.rollup(data,
            v => {
                const successful = v.filter(d => d.yards_gained >= d.yards_to_go).length;
                return (successful / v.length) * 100;
            },
            d => d.down,
            d => d.play_type
        );

        const svg = this.createBaseSVG('#situationalChart');
        this.createGroupedBarChart(svg, successByDown);
    }

    createBaseSVG(selector) {
        return d3.select(selector)
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    }

    createGroupedBarChart(svg, data) {
        const downs = Array.from(data.keys()).sort();
        const playTypes = Array.from(data.get(downs[0]).keys());

        // Create scales
        const x0 = d3.scaleBand()
            .domain(downs)
            .rangeRound([0, this.width])
            .paddingInner(0.1);

        const x1 = d3.scaleBand()
            .domain(playTypes)
            .rangeRound([0, x0.bandwidth()])
            .padding(0.05);

        const y = d3.scaleLinear()
            .domain([0, 100])
            .range([this.height, 0]);

        // Create bars
        downs.forEach(down => {
            const downGroup = svg.append('g')
                .attr('transform', `translate(${x0(down)},0)`);

            playTypes.forEach(type => {
                const successRate = data.get(down).get(type);
                
                downGroup.append('rect')
                    .attr('x', x1(type))
                    .attr('y', y(successRate))
                    .attr('width', x1.bandwidth())
                    .attr('height', this.height - y(successRate))
                    .attr('fill', type === 'pass' ? this.colors.primary : this.colors.accent)
                    .on('mouseover', (event) => this.showTooltip(event, `${type} on ${down} down: ${successRate.toFixed(1)}% success`))
                    .on('mouseout', () => this.hideTooltip());
            });
        });

        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x0));

        svg.append('g')
            .call(d3.axisLeft(y).tickFormat(d => d + '%'));

        // Add labels
        this.createLabels(svg, 'Down', 'Success Rate (%)');

        // Add legend
        this.createLegend(svg, playTypes);
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

    createLegend(svg, playTypes) {
        const legend = svg.append('g')
            .attr('font-family', 'sans-serif')
            .attr('font-size', 10)
            .attr('text-anchor', 'start')
            .selectAll('g')
            .data(playTypes)
            .enter().append('g')
            .attr('transform', (d, i) => `translate(0,${i * 20 - 30})`);

        legend.append('rect')
            .attr('x', this.width - 19)
            .attr('width', 19)
            .attr('height', 19)
            .attr('fill', d => d === 'pass' ? this.colors.primary : this.colors.accent);

        legend.append('text')
            .attr('x', this.width - 24)
            .attr('y', 9.5)
            .attr('dy', '0.32em')
            .text(d => d);
    }

    showTooltip(event, text) {
        const tooltip = d3.select('body').append('div')
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
