export class ScoringDriveVis {
    constructor() {
        this.width = 800;
        this.height = 500;
        this.margin = { top: 20, right: 40, bottom: 80, left: 60 };
        this.data = null;
        this.colors = {
            pass: '#013369',  // NFL Blue
            run: '#D50A0A'    // NFL Red
        };
        this.minPlaysInDrive = 5; // Minimum plays required to consider a drive
    }

    async initialize(data) {
        this.data = data;
        this.setupSvg();
        this.processData();
        this.update();
    }

    setupSvg() {
        // Create SVG container
        this.svg = d3.select('#scoringChart')
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
    }

    processData() {
        // Group plays by drive_id and analyze scoring outcomes
        const driveStats = new Map();
        
        // Track current drive
        let currentDrive = {
            id: null,
            plays: [],
            scored: false,
            points: 0
        };

        // Process each play
        this.data.forEach(play => {
            const driveId = play.game_id + '-' + play.drive;
            
            // If new drive, process previous drive and start new one
            if (driveId !== currentDrive.id && currentDrive.id !== null) {
                this.processDrive(currentDrive, driveStats);
                currentDrive = {
                    id: driveId,
                    plays: [],
                    scored: false,
                    points: 0
                };
            }

            // Set current drive ID if first play
            if (currentDrive.id === null) {
                currentDrive.id = driveId;
            }

            // Add play to current drive
            currentDrive.plays.push(play);

            // Check if this play resulted in points
            if (play.touchdown === 1) {
                currentDrive.scored = true;
                currentDrive.points = 7; // Assuming PAT is good for simplicity
            } else if (play.field_goal_result === 'made') {
                currentDrive.scored = true;
                currentDrive.points = 3;
            }
        });

        // Process last drive
        if (currentDrive.id !== null) {
            this.processDrive(currentDrive, driveStats);
        }

        this.driveStats = driveStats;
    }

    processDrive(drive, driveStats) {
        // Count pass and rush plays
        const playCount = {
            pass: 0,
            run: 0,
            total: drive.plays.length
        };

        // Skip drives that are too short
        if (playCount.total < this.minPlaysInDrive) {
            return;
        }

        drive.plays.forEach(play => {
            if (play.play_type === 'pass') {
                playCount.pass++;
            } else if (play.play_type === 'run') {
                playCount.run++;
            }
        });

        // Calculate play type ratios
        const passRatio = playCount.pass / playCount.total;

        // Group drives by their pass/run ratio into bins
        const binSize = 0.05;
        const binIndex = Math.floor(passRatio / binSize);
        const binKey = binIndex * binSize;

        // Initialize bin if not exists
        if (!driveStats.has(binKey)) {
            driveStats.set(binKey, {
                passRatio: binKey,
                totalDrives: 0,
                scoringDrives: 0,
                totalPoints: 0,
                totalPlays: 0,
                averagePoints: 0
            });
        }

        // Update bin stats
        const binStats = driveStats.get(binKey);
        binStats.totalDrives++;
        binStats.totalPlays += playCount.total;
        if (drive.scored) {
            binStats.scoringDrives++;
            binStats.totalPoints += drive.points;
        }
        binStats.averagePoints = binStats.totalPoints / binStats.totalDrives;
    }

    update() {
        const chartWidth = this.width - this.margin.left - this.margin.right;
        const chartHeight = this.height - this.margin.top - this.margin.bottom;

        // Convert Map to rray for D3
        const data = Array.from(this.driveStats.values());

        // Create scales
        const x = d3.scaleLinear()
            .domain([0, 1])
            .range([0, chartWidth]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.averagePoints)])
            .range([chartHeight, 0]);

        const circleRadius = 9;

        // Create chart group
        const chart = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Add axes
        chart.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x).tickFormat(d => {
                const passPercent = d * 100;
                const runPercent = 100 - passPercent;
                return `${runPercent}R/${passPercent}P`;
            }))
            .selectAll("text")  
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");

        // Add x-axis label
        chart.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + 65)
            .attr('fill', 'black')
            .style('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Run/Pass Play Distribution (%)');

        chart.append('g')
            .call(d3.axisLeft(y))
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -40)
            .attr('x', -chartHeight / 2)
            .attr('fill', 'black')
            .style('text-anchor', 'middle')
            .style('font-size', '14px')
            .text('Average Points per Drive');

        // Add color legend
        const legend = chart.append('g')
            .attr('transform', `translate(${chartWidth - 100}, 20)`);

        legend.append('text')
            .attr('x', 50)
            .attr('y', -10)
            .style('text-anchor', 'middle')
            .style('font-size', '10px')
            .text('Play Type Balance');

        legend.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 100)
            .attr('height', 10)
            .style('fill', 'url(#gradient)');

        legend.append('text')
            .attr('x', 0)
            .attr('y', 25)
            .style('text-anchor', 'start')
            .style('font-size', '10px')
            .text('Run');

        legend.append('text')
            .attr('x', 100)
            .attr('y', 25)
            .style('text-anchor', 'end')
            .style('font-size', '10px')
            .text('Pass');

        // Create gradient for legend
        const gradient = this.svg.append('defs')
            .append('linearGradient')
            .attr('id', 'gradient')
            .attr('x1', '0%')
            .attr('x2', '100%')
            .attr('y1', '0%')
            .attr('y2', '0%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', this.colors.run);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', this.colors.pass);

        // Add circles for each bin
        chart.selectAll('circle')
            .data(data)
            .join('circle')
            .attr('cx', d => x(d.passRatio))
            .attr('cy', d => y(d.averagePoints))
            .attr('r', circleRadius)
            .attr('fill', d => {
                // Color based on pass ratio
                const passRatio = d.passRatio;
                return d3.interpolateRgb(this.colors.run, this.colors.pass)(passRatio);
            })
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .style('opacity', 0.8)
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget)
                    .attr('opacity', 1)
                    .attr('stroke', '#333')
                    .attr('stroke-width', 2);
                this.showTooltip(event, d);
            })
            .on('mouseout', (event) => {
                d3.select(event.currentTarget)
                    .attr('opacity', 0.8)
                    .attr('stroke', 'white');
                this.hideTooltip();
            });
    }

    showTooltip(event, d) {
        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        const passPercentage = (d.passRatio * 100).toFixed(0);
        const rushPercentage = (100 - passPercentage).toFixed(0);
        const scoringPercentage = ((d.scoringDrives / d.totalDrives) * 100).toFixed(1);
        const avgPlaysPerDrive = (d.totalPlays / d.totalDrives).toFixed(1);

        tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        
        tooltip.html(`
            <strong>Drive Breakdown</strong><br>
            Pass Plays: ${passPercentage}%<br>
            Rush Plays: ${rushPercentage}%<br>
            Total Drives: ${d.totalDrives}<br>
            Avg Plays per Drive: ${avgPlaysPerDrive}<br>
            Scoring Drives: ${d.scoringDrives} (${scoringPercentage}%)<br>
            Avg Points: ${d.averagePoints.toFixed(2)}<br>
            <em>*Only includes drives with ${this.minPlaysInDrive}+ plays</em>
        `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }

    hideTooltip() {
        d3.select('.tooltip').remove();
    }
}
