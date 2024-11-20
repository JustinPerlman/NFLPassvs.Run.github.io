export class GameContextVis {
    constructor() {
        this.margin = { top: 40, right: 20, bottom: 40, left: 60 };
        this.colors = {
            primary: '#013369',    // NFL Blue
            accent: '#D50A0A',     // NFL Red
            pass: '#1e56b0',       // Light Blue for passing plays
            run: '#ff1f1f',        // Light Red for running plays
            grid: '#eee'           // Light gray for grid lines
        };
        this.data = null;
        this.fieldSvg = null;
    }

    async initialize() {
        try {
            // Load and process the data
            const data = await d3.csv('datamini.csv');
            this.data = this.processData(data);
            
            // Initialize field position chart
            this.initializeFieldPositionChart();
            
            // Set initial down button
            d3.select('.down-button[data-down="1"]').classed('active', true);
            
            // Set up event listeners for controls
            this.setupControls();

            // Populate team dropdowns
            this.populateTeamDropdowns();
            
            // Initial render
            this.updateVisualization();
        } catch (error) {
            console.error('Error initializing visualization:', error);
        }
    }

    processData(data) {
        return data.map(d => ({
            ...d,
            yardline_100: +d.yardline_100,
            score_differential: parseFloat(d.score_differential),
            down: +d.down,
            quarter: +d.qtr,
            ydstogo: +d.ydstogo,
            isPass: d.play_type === 'pass',
            isRun: d.play_type === 'run'
        })).filter(d => d.isPass || d.isRun); // Only keep pass and run plays
    }

    initializeFieldPositionChart() {
        const container = d3.select('#fieldPositionChart');
        const width = container.node().getBoundingClientRect().width - this.margin.left - this.margin.right;
        const height = container.node().getBoundingClientRect().height - this.margin.top - this.margin.bottom;

        this.fieldSvg = container.append('svg')
            .attr('width', width + this.margin.left + this.margin.right)
            .attr('height', height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Create scales
        this.xScale = d3.scaleLinear()
            .domain([0, 100])
            .range([0, width]);

        this.yScale = d3.scaleLinear()
            .domain([0, 1])
            .range([height, 0]);

        // Add axes
        this.fieldSvg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(this.xScale)
                .tickValues([0, 20, 40, 60, 80, 100])
                .tickFormat(d => d === 50 ? '50' : d < 50 ? `Own ${d}` : `Opp ${100-d}`));

        this.fieldSvg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(this.yScale)
                .tickFormat(d => d3.format('.0%')(d)));

        // Add grid lines
        this.fieldSvg.append('g')
            .attr('class', 'grid-lines')
            .selectAll('line')
            .data(this.xScale.ticks())
            .enter()
            .append('line')
            .attr('x1', d => this.xScale(d))
            .attr('x2', d => this.xScale(d))
            .attr('y1', 0)
            .attr('y2', height)
            .attr('stroke', this.colors.grid)
            .attr('stroke-dasharray', '2,2');

        // Add labels
        this.fieldSvg.append('text')
            .attr('class', 'x-label')
            .attr('text-anchor', 'middle')
            .attr('x', width / 2)
            .attr('y', height + 35)
            .text('Field Position');

        this.fieldSvg.append('text')
            .attr('class', 'y-label')
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -40)
            .text('Play Type Percentage');
    }

    setupControls() {
        // Down buttons - ensure only one is active
        d3.selectAll('.down-button').each(function() {
            const button = d3.select(this);
            if (button.attr('data-down') === '') {
                button.classed('active', true);
            } else {
                button.classed('active', false);
            }
        });

        d3.selectAll('.down-button').on('click', (event) => {
            d3.selectAll('.down-button').classed('active', false);
            const button = event.currentTarget;
            d3.select(button).classed('active', true);
            this.updateVisualization();
        });

        // Quarter selector
        d3.select('#quarterSelect').on('change', () => {
            this.updateVisualization();
        });

        // Team selector
        d3.select('#teamSelect').on('change', () => {
            this.updateVisualization();
        });

        // Score differential selector
        d3.select('#scoreDiff').on('change', () => {
            this.updateVisualization();
        });

        // Yards to go range slider
        const ydsToGoSlider = document.getElementById('ydsToGoSlider');
        const ydsToGoValue = document.getElementById('ydsToGoValue');

        noUiSlider.create(ydsToGoSlider, {
            start: [1, 20],
            connect: true,
            range: {
                'min': 1,
                '25%': 5,
                '50%': 10,
                '75%': 15,
                'max': 20
            },
            step: 1,
            tooltips: false,
            format: {
                to: value => Math.round(value),
                from: value => Math.round(value)
            }
        });

        ydsToGoSlider.noUiSlider.on('update', (values) => {
            const [min, max] = values.map(v => parseInt(v));
            const displayMax = max === 20 ? '20+' : max;
            ydsToGoValue.textContent = `${min} - ${displayMax} yards`;
        });

        ydsToGoSlider.noUiSlider.on('change', () => {
            this.updateVisualization();
        });
    }

    populateTeamDropdowns() {
        // Get unique teams from the data
        const teams = [...new Set(this.data.map(d => d.posteam))].sort();
        
        // Populate the team dropdown
        const teamSelect = d3.select('#teamSelect');
        teamSelect
            .selectAll('option:not(:first-child)')
            .data(teams)
            .enter()
            .append('option')
            .attr('value', d => d)
            .text(d => d);
    }

    updateVisualization() {
        try {
            const filteredData = this.filterData();
            
            if (filteredData.length === 0) {
                this.showNoDataMessage();
                return;
            }
            
            this.clearNoDataMessage();
            this.updateFieldPositionChart(filteredData);
        } catch (error) {
            console.error('Error updating visualization:', error);
        }
    }

    filterData() {
        const selectedDown = d3.select('.down-button.active').attr('data-down');
        const selectedQuarter = d3.select('#quarterSelect').property('value');
        const selectedTeam = d3.select('#teamSelect').property('value');
        const selectedScoreDiff = d3.select('#scoreDiff').property('value');
        
        const ydsToGoRange = document.getElementById('ydsToGoSlider').noUiSlider.get();
        const [ydsToGoMin, ydsToGoMax] = ydsToGoRange.map(v => parseInt(v));

        console.log('Selected filters:', {
            down: selectedDown,
            quarter: selectedQuarter,
            team: selectedTeam,
            scoreDiff: selectedScoreDiff,
            ydsToGoRange: [ydsToGoMin, ydsToGoMax]
        });

        const filteredData = this.data.filter(d => {
            const downMatch = !selectedDown || d.down === parseInt(selectedDown);
            const quarterMatch = !selectedQuarter || d.quarter === parseInt(selectedQuarter);
            const teamMatch = !selectedTeam || d.posteam === selectedTeam;
            
            let scoreDiffMatch = true;
            if (selectedScoreDiff && selectedScoreDiff !== 'all') {
                const diff = d.score_differential;
                if (selectedScoreDiff === 'leading') {
                    scoreDiffMatch = diff > 7;
                } else if (selectedScoreDiff === 'close') {
                    scoreDiffMatch = Math.abs(diff) <= 7;
                } else if (selectedScoreDiff === 'trailing') {
                    scoreDiffMatch = diff < -7;
                }
            }

            // For yards to go range, if max is 20, include all plays with 20+ yards
            const ydsToGoMatch = ydsToGoMax === 20 ?
                (d.ydstogo >= ydsToGoMin) :
                (d.ydstogo >= ydsToGoMin && d.ydstogo <= ydsToGoMax);

            return downMatch && quarterMatch && teamMatch && scoreDiffMatch && ydsToGoMatch;
        });

        console.log('Filtered data length:', filteredData.length);
        return filteredData;
    }

    showNoDataMessage() {
        // Clear existing visualizations
        this.fieldSvg.selectAll('.line').remove();
        this.fieldSvg.selectAll('.area').remove();

        // Add message to field position chart
        const fieldWidth = this.fieldSvg.node().getBoundingClientRect().width;
        const fieldHeight = this.fieldSvg.node().getBoundingClientRect().height;

        this.fieldSvg.append('text')
            .attr('class', 'no-data-message')
            .attr('x', fieldWidth / 2)
            .attr('y', fieldHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('font-size', '14px')
            .style('fill', '#666')
            .text('No plays match the current filters. Try adjusting your selection.');
    }

    clearNoDataMessage() {
        this.fieldSvg.selectAll('.no-data-message').remove();
    }

    updateFieldPositionChart(filteredData) {
        // Group data by field position
        const binWidth = 5; // 5-yard bins
        const bins = d3.range(0, 101, binWidth);
        
        const binnedData = bins.map(bin => {
            const playsInBin = filteredData.filter(d => 
                d.yardline_100 >= bin && d.yardline_100 < bin + binWidth
            );
            const totalPlays = playsInBin.length;
            const passPlays = playsInBin.filter(d => d.isPass).length;
            const runPlays = playsInBin.filter(d => d.isRun).length;
            
            return {
                fieldPosition: bin + binWidth/2,
                passPercentage: totalPlays ? passPlays / totalPlays : 0,
                runPercentage: totalPlays ? runPlays / totalPlays : 0
            };
        });

        // Create line generators
        const passLine = d3.line()
            .x(d => this.xScale(d.fieldPosition))
            .y(d => this.yScale(d.passPercentage))
            .curve(d3.curveCatmullRom);

        const runLine = d3.line()
            .x(d => this.xScale(d.fieldPosition))
            .y(d => this.yScale(d.runPercentage))
            .curve(d3.curveCatmullRom);

        // Update pass line with transition
        const passPath = this.fieldSvg.selectAll('.pass-line').data([binnedData]);
        
        // Handle enter selection
        const passEnter = passPath.enter()
            .append('path')
            .attr('class', 'line pass-line')
            .attr('d', passLine)
            .style('fill', 'none')
            .style('stroke', this.colors.pass)
            .style('stroke-width', 3)
            .style('opacity', 0);

        // Handle update selection
        const passMerge = passPath.merge(passEnter)
            .transition()
            .duration(750)
            .style('opacity', 1)
            .attr('d', passLine);

        // Handle exit selection
        passPath.exit()
            .transition()
            .duration(750)
            .style('opacity', 0)
            .remove();

        // Update run line with transition
        const runPath = this.fieldSvg.selectAll('.run-line').data([binnedData]);
        
        // Handle enter selection
        const runEnter = runPath.enter()
            .append('path')
            .attr('class', 'line run-line')
            .attr('d', runLine)
            .style('fill', 'none')
            .style('stroke', this.colors.run)
            .style('stroke-width', 3)
            .style('opacity', 0);

        // Handle update selection
        const runMerge = runPath.merge(runEnter)
            .transition()
            .duration(750)
            .style('opacity', 1)
            .attr('d', runLine);

        // Handle exit selection
        runPath.exit()
            .transition()
            .duration(750)
            .style('opacity', 0)
            .remove();
    }
}
