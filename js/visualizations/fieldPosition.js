export class FieldPositionVis {
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
        // Process data by field position (yard line)
        const playsByYardLine = d3.rollup(data,
            v => ({
                pass: v.filter(d => d.play_type === 'pass').length,
                rush: v.filter(d => d.play_type === 'rush').length
            }),
            d => d.yard_line
        );

        const svg = this.createBaseSVG('#fieldPositionChart');
        this.createStackedAreaChart(svg, playsByYardLine);
    }

    createBaseSVG(selector) {
        return d3.select(selector)
            .append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
    }

    createStackedAreaChart(svg, data) {
        // Convert data to array format
        const chartData = Array.from(data, ([yardLine, counts]) => ({
            yardLine: +yardLine,
            pass: counts.pass,
            rush: counts.rush
        })).sort((a, b) => a.yardLine - b.yardLine);

        // Create scales
        const x = d3.scaleLinear()
            .domain([0, 100])
            .range([0, this.width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(chartData, d => d.pass + d.rush)])
            .range([this.height, 0]);

        // Create area generators
        const areaPass = d3.area()
            .x(d => x(d.yardLine))
            .y0(this.height)
            .y1(d => y(d.pass));

        const areaRush = d3.area()
            .x(d => x(d.yardLine))
            .y0(d => y(d.pass))
            .y1(d => y(d.pass + d.rush));

        // Add areas
        svg.append('path')
            .datum(chartData)
            .attr('class', 'area pass')
            .attr('d', areaPass)
            .attr('fill', this.colors.primary)
            .style('opacity', 0.7);

        svg.append('path')
            .datum(chartData)
            .attr('class', 'area rush')
            .attr('d', areaRush)
            .attr('fill', this.colors.accent)
            .style('opacity', 0.7);

        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x).tickFormat(d => d + ' yd'));

        svg.append('g')
            .call(d3.axisLeft(y));

        // Add labels
        this.createLabels(svg, 'Field Position (Yard Line)', 'Number of Plays');

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
        legend.append('rect')
            .attr('x', 0)
            .attr('width', 20)
            .attr('height', 20)
            .attr('fill', this.colors.primary)
            .style('opacity', 0.7);

        legend.append('text')
            .attr('x', 30)
            .attr('y', 15)
            .text('Pass Plays');

        // Rush plays
        legend.append('rect')
            .attr('x', 0)
            .attr('y', 30)
            .attr('width', 20)
            .attr('height', 20)
            .attr('fill', this.colors.accent)
            .style('opacity', 0.7);

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
                const yardLine = Math.round(x.invert(mouseX));
                const dataPoint = data.find(d => d.yardLine === yardLine);

                if (dataPoint) {
                    // Update vertical line
                    verticalLine
                        .attr('x1', x(yardLine))
                        .attr('x2', x(yardLine))
                        .attr('y1', 0)
                        .attr('y2', this.height)
                        .style('opacity', 1);

                    // Show tooltip
                    this.showTooltip(event, `Yard Line: ${yardLine}
                        Pass Plays: ${dataPoint.pass}
                        Rush Plays: ${dataPoint.rush}`);
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
