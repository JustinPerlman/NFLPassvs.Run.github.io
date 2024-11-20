export class PlayDistributionVis {
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
        const playTypes = d3.rollup(data,
            v => v.length,
            d => d.play_type
        );

        const svg = this.createBaseSVG('#playTypeChart');
        const {x, y} = this.createScales();
        
        const playTypeData = Array.from(playTypes, ([type, count]) => ({type, count}));

        x.domain(playTypeData.map(d => d.type));
        y.domain([0, d3.max(playTypeData, d => d.count)]);

        this.createBars(svg, playTypeData, x, y);
        this.createAxes(svg, x, y);
        this.createLabels(svg, 'Play Type', 'Number of Plays');
    }

    createBaseSVG(selector) {
        return d3.select(selector)
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    }

    createScales() {
        const x = d3.scaleBand()
            .range([0, this.width])
            .padding(0.2);

        const y = d3.scaleLinear()
            .range([this.height, 0]);

        return {x, y};
    }

    createBars(svg, data, x, y) {
        svg.selectAll('.bar')
            .data(data)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.type))
            .attr('width', x.bandwidth())
            .attr('y', d => y(d.count))
            .attr('height', d => this.height - y(d.count))
            .attr('fill', this.colors.primary)
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .attr('fill', this.colors.accent);

                // Show tooltip
                this.showTooltip(event, d);
            })
            .on('mouseout', (event, d) => {
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .attr('fill', this.colors.primary);

                // Hide tooltip
                this.hideTooltip();
            });
    }

    createAxes(svg, x, y) {
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .style('font-size', '12px');

        svg.append('g')
            .call(d3.axisLeft(y))
            .selectAll('text')
            .style('font-size', '12px');
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

    showTooltip(event, d) {
        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        
        tooltip.html(`${d.type}<br/>${d.count.toLocaleString()} plays`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }

    hideTooltip() {
        d3.select('.tooltip').remove();
    }
}
