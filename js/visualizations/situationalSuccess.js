export class SituationalSuccessVis {
    constructor() {
        this.width = 600;
        this.height = 600;
        this.radius = Math.min(this.width, this.height) / 2;
        this.colors = {
            primary: '#013369',    // NFL Blue
            accent: '#D50A0A',     // NFL Red
            success: '#2ecc71',    // Green
            neutral: '#95a5a6',    // Gray
            failure: '#e74c3c',    // Red
            // New specific outcome colors
            touchdown: '#27ae60',  // Darker green
            firstDown: '#2ecc71',  // Regular green
            positiveYards: '#82e0aa', // Light green
            noGain: '#bdc3c7',     // Light gray
            incomplete: '#7f8c8d',  // Dark gray
            interception: '#c0392b', // Dark red
            sack: '#e74c3c',       // Regular red
            lossYards: '#f1948a',  // Light red
            fumble: '#c0392b'      // Dark red
        };
        this.currentNode = null;  // Track current center node
    }

    async create(data) {
        // Process data for sunburst
        const processedData = this.processData(data);
        
        // Create the sunburst chart
        // First clear the container
        d3.select('#yardsChart').selectAll('*').remove();
        
        // Create container div for the back button
        const container = d3.select('#yardsChart')
            .append('div')
            .style('position', 'relative');

        // Add back button
        const backButton = container.append('button')
            .attr('class', 'back-button')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('left', '10px')
            .style('padding', '5px 10px')
            .style('background-color', this.colors.primary)
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '4px')
            .style('cursor', 'pointer')
            .style('display', 'none')
            .text('← Back');

        // Store colors reference for hover events
        const colors = this.colors;
        
        // Add hover effects
        backButton
            .on('mouseover', function() {
                d3.select(this)
                    .style('background-color', d3.color(colors.primary).darker(0.2));
            })
            .on('mouseout', function() {
                d3.select(this)
                    .style('background-color', colors.primary);
            });

        // Then create new SVG
        const svg = container.append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .append('g')
            .attr('transform', `translate(${this.width / 2},${this.height / 2})`);

        // Create partition layout
        const partition = d3.partition()
            .size([2 * Math.PI, this.radius]);

        // Create arc generator
        const arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(this.radius / 2)
            .innerRadius(d => d.y0)
            .outerRadius(d => d.y1 - 1);

        // Prepare the data
        const root = d3.hierarchy(processedData)
            .sum(d => d.value || 0)
            .sort((a, b) => b.value - a.value);
        
        this.currentNode = root;
        partition(root);

        // Function to handle click events
        const clicked = (event, p) => {
            // Don't zoom if clicking on the current center
            if (this.currentNode === p) return;

            // Update current node
            this.currentNode = p;

            // Show/hide back button
            backButton.style('display', p === root ? 'none' : 'block');

            // Filter visible nodes based on clicked segment
            root.each(d => {
                if (p === root) {
                    // When returning to root, calculate proper reset positions
                    d.target = {
                        x0: d.x0,
                        x1: d.x1,
                        y0: d.y0,
                        y1: d.y1
                    };
                    d.visible = true;
                } else {
                    // Check if this node is the clicked one or its descendant
                    const isDescendant = p.descendants().includes(d);
                    d.visible = isDescendant;
                    
                    if (isDescendant) {
                        // Calculate new positions relative to clicked segment
                        d.target = {
                            x0: (d.x0 - p.x0) / (p.x1 - p.x0) * 2 * Math.PI,
                            x1: (d.x1 - p.x0) / (p.x1 - p.x0) * 2 * Math.PI,
                            y0: d.y0 - p.y0,
                            y1: d.y1 - p.y0
                        };
                    } else {
                        // Hide non-descendants
                        d.target = {
                            x0: 0,
                            x1: 0,
                            y0: 0,
                            y1: 0
                        };
                    }
                }
            });

            // Transition to new view
            const t = svg.transition().duration(750);

            // Update paths with proper interpolation
            path.transition(t)
                .style('opacity', d => d.visible ? 1 : 0)
                .tween('data', d => {
                    // Ensure we have proper start and end states for interpolation
                    const startState = {
                        x0: d.current.x0,
                        x1: d.current.x1,
                        y0: d.current.y0,
                        y1: d.current.y1
                    };
                    
                    const endState = {
                        x0: d.target.x0,
                        x1: d.target.x1,
                        y0: d.target.y0,
                        y1: d.target.y1
                    };

                    const i = d3.interpolate(startState, endState);
                    
                    return t => {
                        d.current = i(t);
                        return d.current;
                    };
                })
                .attrTween('d', d => () => arc(d.current));

            // Update labels with proper transitions
            labels.transition(t)
                .style('opacity', d => {
                    if (!d.visible) return 0;
                    // Fade in labels gradually as they become visible
                    const angle = (d.target.x1 - d.target.x0) * 180 / Math.PI;
                    return angle > 8 ? 1 : 0;
                })
                .attrTween('transform', d => () => {
                    if (!d.visible) return 'scale(0)';
                    
                    // Check if this is the current center node
                    if (d === p) {
                        return 'translate(0,0)';
                    }
                    
                    const x = (d.target.x0 + d.target.x1) / 2 * 180 / Math.PI;
                    const y = (d.target.y0 + d.target.y1) / 2;
                    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
                });
        };

        // Handle back button click
        backButton.on('click', () => {
            clicked(null, this.currentNode.parent || root);
        });

        // Create the arcs
        const path = svg.selectAll('path')
            .data(root.descendants())
            .join('path')
            .attr('fill', d => {
                if (d.depth === 0) return 'white';
                if (d.depth === 1) return d.data.name === 'pass' ? this.colors.primary : this.colors.accent;
                if (d.depth === 2) {
                    switch(d.data.name) {
                        case 'success': return this.colors.success;
                        case 'neutral': return this.colors.neutral;
                        case 'failure': return this.colors.failure;
                        default: return '#ccc';
                    }
                }
                // Specific colors for outermost layer
                switch(d.data.name) {
                    case 'touchdown': return this.colors.touchdown;
                    case 'first down': return this.colors.firstDown;
                    case 'positive yards': return this.colors.positiveYards;
                    case 'no gain': return this.colors.noGain;
                    case 'incomplete': return this.colors.incomplete;
                    case 'interception': return this.colors.interception;
                    case 'sack': return this.colors.sack;
                    case 'loss yards': return this.colors.lossYards;
                    case 'fumble': return this.colors.fumble;
                    default: return '#ccc';
                }
            })
            .attr('d', arc)
            .on('mouseover', (event, d) => {
                const percentage = (100 * d.value / root.value).toFixed(1);
                this.showTooltip(event, `${d.ancestors().map(d => d.data.name).reverse().join(' → ')}\n${d.value} plays (${percentage}%)`);
            })
            .on('mouseout', () => this.hideTooltip())
            .style('cursor', 'pointer')
            .each(d => d.current = {
                x0: d.x0,
                x1: d.x1,
                y0: d.y0,
                y1: d.y1
            })
            .on('click', clicked);

        // Add labels
        const labels = svg.selectAll('text')
            .data(root.descendants().filter(d => {
                const angle = (d.x1 - d.x0) * 180 / Math.PI;
                const radius = (d.y1 - d.y0);
                return angle > 8 && radius > 20;
            }))
            .join('text')
            .attr('transform', d => {
                // Check if this is the root or current center node
                if (d.depth === 0 || d === this.currentNode) {
                    return `translate(0,0)`;
                }
                const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
                const y = (d.y0 + d.y1) / 2;
                const rotation = x - 90;
                return `rotate(${rotation}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
            })
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .text(d => {
                const percentage = (100 * d.value / root.value).toFixed(1);
                if (percentage < 3) return '';
                let text = d.data.name;
                if (text.length > 12) {
                    text = text.substring(0, 10) + '...';
                }
                return text;
            })
            .style('font-size', d => {
                const angle = (d.x1 - d.x0) * 180 / Math.PI;
                if (angle < 10) return '8px';
                if (angle < 15) return '10px';
                return '12px';
            })
            .style('fill', d => d.depth === 0 ? 'black' : 'white')
            .style('pointer-events', 'none');

        // Add title
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', -this.radius - 20)
            .style('font-size', '20px')
            .style('fill', this.colors.primary)
            .text('Play Outcomes Distribution');
    }

    processData(data) {
        console.log('Raw data:', data);
        // Create hierarchical structure
        const playOutcomes = {
            name: 'All Plays',
            children: []
        };

        // Convert numeric strings to numbers and normalize play types
        data = data.map(d => ({
            ...d,
            play_type: d.play_type.toLowerCase().trim(),
            yards_gained: +d.yards_gained || 0,
            touchdown: +d.touchdown || 0,
            first_down_pass: +d.first_down_pass || 0,
            first_down_rush: +d.first_down_rush || 0,
            incomplete_pass: +d.incomplete_pass || 0,
            interception: +d.interception || 0,
            sack: +d.sack || 0,
            fumble: +d.fumble || 0
        }));

        // Process pass plays
        const passingPlays = data.filter(d => d.play_type === 'pass');
        console.log('Passing plays:', passingPlays.length);
        const passNode = {
            name: 'pass',
            children: []
        };

        // Success category for pass plays
        const passSuccess = {
            name: 'success',
            children: [
                {
                    name: 'touchdown',
                    value: passingPlays.filter(d => d.touchdown === 1).length
                },
                {
                    name: 'first down',
                    value: passingPlays.filter(d => d.first_down_pass === 1 && d.touchdown === 0).length
                },
                {
                    name: 'positive yards',
                    value: passingPlays.filter(d => 
                        d.yards_gained > 0 && 
                        d.first_down_pass === 0 && 
                        d.touchdown === 0 && 
                        d.incomplete_pass === 0 && 
                        d.interception === 0 && 
                        d.sack === 0
                    ).length
                }
            ]
        };

        // Neutral category for pass plays
        const passNeutral = {
            name: 'neutral',
            children: [
                {
                    name: 'no gain',
                    value: passingPlays.filter(d => 
                        d.yards_gained === 0 && 
                        d.incomplete_pass === 0 && 
                        d.interception === 0 && 
                        d.sack === 0
                    ).length
                },
                {
                    name: 'incomplete',
                    value: passingPlays.filter(d => d.incomplete_pass === 1).length
                }
            ]
        };

        // Failure category for pass plays
        const passFailure = {
            name: 'failure',
            children: [
                {
                    name: 'interception',
                    value: passingPlays.filter(d => d.interception === 1).length
                },
                {
                    name: 'sack',
                    value: passingPlays.filter(d => d.sack === 1).length
                },
                {
                    name: 'loss yards',
                    value: passingPlays.filter(d => 
                        d.yards_gained < 0 && 
                        d.sack === 0 && 
                        d.interception === 0
                    ).length
                }
            ]
        };

        // Process run plays
        const runningPlays = data.filter(d => d.play_type === 'run');
        console.log('Running plays:', runningPlays.length);
        const runNode = {
            name: 'run',
            children: []
        };

        // Success category for run plays
        const runSuccess = {
            name: 'success',
            children: [
                {
                    name: 'touchdown',
                    value: runningPlays.filter(d => d.touchdown === 1).length
                },
                {
                    name: 'first down',
                    value: runningPlays.filter(d => 
                        d.first_down_rush === 1 && 
                        d.touchdown === 0 && 
                        d.fumble === 0
                    ).length
                },
                {
                    name: 'positive yards',
                    value: runningPlays.filter(d => 
                        d.yards_gained > 0 && 
                        d.first_down_rush === 0 && 
                        d.touchdown === 0 && 
                        d.fumble === 0
                    ).length
                }
            ]
        };

        // Neutral category for run plays
        const runNeutral = {
            name: 'neutral',
            children: [
                {
                    name: 'no gain',
                    value: runningPlays.filter(d => 
                        d.yards_gained === 0 && 
                        d.fumble === 0
                    ).length
                }
            ]
        };

        // Failure category for run plays
        const runFailure = {
            name: 'failure',
            children: [
                {
                    name: 'fumble',
                    value: runningPlays.filter(d => d.fumble === 1).length
                },
                {
                    name: 'loss yards',
                    value: runningPlays.filter(d => 
                        d.yards_gained < 0 && 
                        d.fumble === 0
                    ).length
                }
            ]
        };

        // Log category values before filtering
        console.log('Pass categories before filtering:', {
            success: passSuccess.children.map(d => ({ name: d.name, value: d.value })),
            neutral: passNeutral.children.map(d => ({ name: d.name, value: d.value })),
            failure: passFailure.children.map(d => ({ name: d.name, value: d.value }))
        });

        console.log('Run categories before filtering:', {
            success: runSuccess.children.map(d => ({ name: d.name, value: d.value })),
            neutral: runNeutral.children.map(d => ({ name: d.name, value: d.value })),
            failure: runFailure.children.map(d => ({ name: d.name, value: d.value }))
        });

        // Add categories to pass node if they have values
        if (passSuccess.children.some(d => d.value > 0)) passNode.children.push(passSuccess);
        if (passNeutral.children.some(d => d.value > 0)) passNode.children.push(passNeutral);
        if (passFailure.children.some(d => d.value > 0)) passNode.children.push(passFailure);

        // Add categories to run node if they have values
        if (runSuccess.children.some(d => d.value > 0)) runNode.children.push(runSuccess);
        if (runNeutral.children.some(d => d.value > 0)) runNode.children.push(runNeutral);
        if (runFailure.children.some(d => d.value > 0)) runNode.children.push(runFailure);

        // Add nodes to root if they have children
        if (passNode.children.length > 0) playOutcomes.children.push(passNode);
        if (runNode.children.length > 0) playOutcomes.children.push(runNode);

        console.log('Final processed data:', playOutcomes);
        return playOutcomes;
    }

    showTooltip(event, text) {
        // Remove any existing tooltips first
        this.hideTooltip();
        
        // Create tooltip div if it doesn't exist
        let tooltip = d3.select('body').select('.tooltip');
        if (tooltip.empty()) {
            tooltip = d3.select('body').append('div')
                .attr('class', 'tooltip')
                .style('opacity', 0);
        }

        tooltip.transition()
            .duration(200)
            .style('opacity', .9);
        
        tooltip.html(text.replace(/\\n/g, '<br/>'))
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }

    hideTooltip() {
        const tooltip = d3.select('.tooltip');
        if (!tooltip.empty()) {
            tooltip.transition()
                .duration(200)
                .style('opacity', 0)
                .remove();
        }
    }

    isColorDark(color) {
        // Default to white text if color is undefined
        if (!color) return true;
        
        // Convert hex to RGB
        let r, g, b;
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            r = parseInt(hex.substr(0, 2), 16);
            g = parseInt(hex.substr(2, 2), 16);
            b = parseInt(hex.substr(4, 2), 16);
        } else if (color.startsWith('rgb')) {
            const rgb = color.match(/\d+/g);
            r = parseInt(rgb[0]);
            g = parseInt(rgb[1]);
            b = parseInt(rgb[2]);
        } else {
            return true; // Default to white text
        }
        
        // Calculate relative luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.5;
    }
}
