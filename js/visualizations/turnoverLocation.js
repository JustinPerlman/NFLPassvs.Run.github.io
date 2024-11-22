export class TurnoverLocationVis {
    constructor() {
        this.width = 800; // Reduced from 960
        this.height = 900;
        this.margin = { top: 40, right: 40, bottom: 40, left: 40 };
        this.fieldHeight = 400;
        this.endzoneWidth = 60; // Reduced from 80
        this.data = null;
        this.colors = {
            pass: '#013369',  // NFL Blue
            run: '#D50A0A'    // NFL Red
        };
    }

    async initialize(data) {
        this.data = data;
        this.setupSvg();
        this.processData();
        this.createFields();
        this.update();
    }

    setupSvg() {
        // Create SVG container
        this.svg = d3.select('#turnoverChart')
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
            
        // Add titles for each field
        this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', 25)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text('Pass Play Turnovers (Interceptions)');
            
        this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.fieldHeight + 65)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text('Run Play Turnovers (Fumbles)');
    }

    processData() {
        // Process data for both pass and run plays
        this.turnoverData = {
            pass: this.processTurnoversByLocation('pass'),
            run: this.processTurnoversByLocation('run')
        };
    }

    processTurnoversByLocation(playType) {
        const locationCounts = new Map();
        const turnoverCounts = new Map();

        // Filter for the specific play type
        const relevantPlays = this.data.filter(d => d.play_type === playType);

        // Count total plays and turnovers for each location
        relevantPlays.forEach(play => {
            const location = playType === 'pass' ? play.pass_location : play.run_location;
            if (!location || location === 'NA' || location === 'null' || location === '') return;
            
            const yardline = +play.yardline_100;
            const key = `${location}-${Math.floor(yardline/10)*10}`;

            locationCounts.set(key, (locationCounts.get(key) || 0) + 1);
            
            // Check for turnovers based on play type
            const isTurnover = playType === 'pass' ? 
                play.interception === '1' : 
                play.fumble === '1';
                
            if (isTurnover) {
                turnoverCounts.set(key, (turnoverCounts.get(key) || 0) + 1);
            }
        });

        // Calculate turnover rates and store counts
        const turnoverData = new Map();
        locationCounts.forEach((totalPlays, key) => {
            const turnovers = turnoverCounts.get(key) || 0;
            const rate = turnovers / totalPlays;
            turnoverData.set(key, {
                rate: rate,
                turnovers: turnovers,
                totalPlays: totalPlays
            });
        });

        return turnoverData;
    }

    createFields() {
        // Create football field backgrounds
        this.createField('pass', 0); // Pass field at the top
        this.createField('run', this.fieldHeight + 40); // Run field below with spacing
    }

    createField(playType, yOffset) {
        const fieldGroup = this.svg.append('g')
            .attr('class', `field-${playType}`)
            .attr('transform', `translate(${this.margin.left},${this.margin.top + yOffset})`);

        const fieldWidth = this.width - this.margin.left - this.margin.right;
        const fieldHeight = this.fieldHeight - this.margin.top - this.margin.bottom;
        const playingFieldWidth = fieldWidth - (2 * this.endzoneWidth);

        // Draw own endzone
        fieldGroup.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', this.endzoneWidth)
            .attr('height', fieldHeight)
            .attr('fill', this.colors[playType])
            .attr('stroke', 'white');

        // Add "OWN" text to own endzone
        fieldGroup.append('text')
            .attr('x', this.endzoneWidth / 2)
            .attr('y', fieldHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '24px')
            .attr('font-weight', 'bold')
            .attr('transform', `rotate(-90, ${this.endzoneWidth / 2}, ${fieldHeight / 2})`)
            .text('OWN');

        // Draw playing field
        fieldGroup.append('rect')
            .attr('x', this.endzoneWidth)
            .attr('y', 0)
            .attr('width', playingFieldWidth)
            .attr('height', fieldHeight)
            .attr('fill', '#458B00')
            .attr('stroke', 'white');

        // Draw opponent endzone
        fieldGroup.append('rect')
            .attr('x', this.endzoneWidth + playingFieldWidth)
            .attr('y', 0)
            .attr('width', this.endzoneWidth)
            .attr('height', fieldHeight)
            .attr('fill', this.colors[playType])
            .attr('stroke', 'white');

        // Add "OPP" text to opponent endzone
        fieldGroup.append('text')
            .attr('x', this.endzoneWidth + playingFieldWidth + (this.endzoneWidth / 2))
            .attr('y', fieldHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', 'white')
            .attr('font-size', '24px')
            .attr('font-weight', 'bold')
            .attr('transform', `rotate(90, ${this.endzoneWidth + playingFieldWidth + (this.endzoneWidth / 2)}, ${fieldHeight / 2})`)
            .text('OPP');

        // Draw yard lines and labels
        const yardWidth = playingFieldWidth / 100;
        for (let i = 0; i <= 100; i += 10) {
            // Draw vertical lines
            fieldGroup.append('line')
                .attr('x1', this.endzoneWidth + (i * yardWidth))
                .attr('y1', 0)
                .attr('x2', this.endzoneWidth + (i * yardWidth))
                .attr('y2', fieldHeight)
                .attr('stroke', 'white')
                .attr('stroke-width', i % 50 === 0 ? 2 : 1);

            // Add yard line labels
            let label;
            if (i < 50) {
                label = `Own ${i}`;
            } else if (i === 50) {
                label = '50';
            } else {
                label = `Opp ${100-i}`;
            }

            fieldGroup.append('text')
                .attr('x', this.endzoneWidth + (i * yardWidth))
                .attr('y', fieldHeight + 20)
                .attr('text-anchor', 'middle')
                .attr('fill', 'black')
                .attr('font-size', '10px')
                .text(label);
        }
    }

    formatYardRange(yard) {
        // yard is in yardline100 format (0-100)
        const start = yard;
        const end = yard + 10;
        
        if (start < 50) {
            if (end < 50) {
                return `Own ${start}-Own ${end}`;
            } else if (end === 50) {
                return `Own ${start}-50`;
            } else {
                return `Own ${start}-Opp ${100-end}`;
            }
        } else if (start === 50) {
            return `50-Opp ${100-end}`;
        } else {
            return `Opp ${100-start}-Opp ${100-end}`;
        }
    }

    showTooltip(event, d, playType) {
        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        const [location, yard] = d[0].split('-');
        const stats = d[1];
        const percentage = (stats.rate * 100).toFixed(1);
        const turnoverType = playType === 'pass' ? 'Interceptions' : 'Fumbles';
        const yardRange = this.formatYardRange(parseInt(yard));

        tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        
        tooltip.html(`
            <strong>${playType.charAt(0).toUpperCase() + playType.slice(1)} Plays</strong><br>
            Location: ${location}<br>
            Yard Line: ${yardRange}<br>
            ${turnoverType}: ${stats.turnovers}/${stats.totalPlays}<br>
            Turnover Rate: ${percentage}%
        `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }

    hideTooltip() {
        d3.select('.tooltip').remove();
    }

    update() {
        // Create a single color scale using max rate from both play types
        const maxPassRate = d3.max(Array.from(this.turnoverData.pass.values(), d => d.rate));
        const maxRunRate = d3.max(Array.from(this.turnoverData.run.values(), d => d.rate));
        const maxRate = Math.max(maxPassRate, maxRunRate);

        const colorScale = d3.scaleSequential()
            .domain([0, maxRate])
            .interpolator(t => d3.interpolateRdYlGn(1 - t));

        this.updateField('pass', 0, colorScale);
        this.updateField('run', this.fieldHeight + 40, colorScale);
    }

    updateField(playType, yOffset, colorScale) {
        const turnoverRates = this.turnoverData[playType];
        const fieldWidth = this.width - this.margin.left - this.margin.right - (2 * this.endzoneWidth);
        const fieldHeight = this.fieldHeight - this.margin.top - this.margin.bottom;

        // Update field sections
        const sections = this.svg.select(`.field-${playType}`).selectAll('.field-section')
            .data(Array.from(turnoverRates.entries()));

        // Enter + Update
        sections.enter()
            .append('rect')
            .attr('class', 'field-section')
            .merge(sections)
            .attr('x', d => {
                const yard = parseInt(d[0].split('-')[1]);
                return this.endzoneWidth + (yard * fieldWidth / 100);
            })
            .attr('y', d => {
                const location = d[0].split('-')[0];
                const yPos = location === 'left' ? 0 : 
                            location === 'middle' ? fieldHeight/3 :
                            2*fieldHeight/3;
                return yPos;
            })
            .attr('width', fieldWidth / 10)
            .attr('height', fieldHeight / 3)
            .attr('fill', d => colorScale(d[1].rate))
            .attr('opacity', 0.7)
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget)
                    .attr('opacity', 1)
                    .attr('stroke', '#013369')
                    .attr('stroke-width', 2);
                this.showTooltip(event, d, playType);
            })
            .on('mouseout', (event) => {
                d3.select(event.currentTarget)
                    .attr('opacity', 0.7)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 0.5);
                this.hideTooltip();
            });

        sections.exit().remove();
    }
}
